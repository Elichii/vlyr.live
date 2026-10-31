/**
 * Business ownership rules (server-only).
 *
 * A merchant may use VLYR once they have a business name AND Google has
 * confirmed they manage that business. Each Google business can belong to
 * one VLYR account only.
 *
 * Ownership fields are written with the service-role client: the database
 * ignores browser attempts to set them (scripts/007_protect_merchant_fields.sql).
 */
import { createAdminClient } from "@/lib/supabase/admin"

export interface SetupState {
  businessName: string | null
  verified: boolean
}

export function isSetupComplete(s: SetupState) {
  return !!s.businessName?.trim() && s.verified
}

export async function getSetupState(merchantId: string): Promise<SetupState> {
  const { data } = await createAdminClient()
    .from("merchants")
    .select("business_name, google_ownership_verified")
    .eq("id", merchantId)
    .maybeSingle()
  return { businessName: (data?.business_name as string | null) ?? null, verified: data?.google_ownership_verified === true }
}

/** Is this Google business already verified by a different VLYR account? */
export async function claimedByOther(merchantId: string, placeId: string | null, locationId?: string | null) {
  const admin = createAdminClient()
  const checks: Promise<{ count: number | null }>[] = []
  if (placeId) {
    checks.push(
      admin
        .from("merchants")
        .select("id", { count: "exact", head: true })
        .eq("google_ownership_verified", true)
        .eq("google_verified_place_id", placeId)
        .neq("id", merchantId) as unknown as Promise<{ count: number | null }>,
    )
  }
  if (locationId) {
    checks.push(
      admin
        .from("merchants")
        .select("id", { count: "exact", head: true })
        .eq("google_ownership_verified", true)
        .eq("google_verified_location_id", locationId)
        .neq("id", merchantId) as unknown as Promise<{ count: number | null }>,
    )
  }
  const results = await Promise.all(checks)
  return results.some((r) => (r.count ?? 0) > 0)
}

export const ALREADY_CLAIMED_MESSAGE =
  "This business is already registered to another VLYR account. If it's yours, contact hello@vlyr.app and we'll sort it out."

/** Record a confirmed ownership (server-side only). */
export async function markVerified(
  merchantId: string,
  v: { placeId: string | null; locationId: string | null; matchType: string; extra?: Record<string, unknown> },
) {
  const { error } = await createAdminClient()
    .from("merchants")
    .update({
      google_connected: true,
      google_ownership_verified: true,
      google_ownership_verified_at: new Date().toISOString(),
      google_verified_place_id: v.placeId,
      google_verified_location_id: v.locationId,
      google_location_id: v.locationId || v.placeId,
      google_match_type: v.matchType,
      ...(v.extra ?? {}),
    })
    .eq("id", merchantId)
  if (error) throw new Error(error.message)
}
