/**
 * POST /api/google/claim { locationId, placeId }
 *
 * The merchant picked one of the businesses Google says they manage.
 * We only accept it if it's really in the list Google returned to our
 * server at sign-in, and nobody else has claimed it.
 */
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { ALREADY_CLAIMED_MESSAGE, claimedByOther, markVerified } from "@/lib/ownership"
import { syncProfileFromGoogle } from "@/lib/google/profile-sync"

interface ManagedBusiness {
  locationId: string
  placeId: string | null
  businessName: string
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: "Please sign in again." }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const locationId = typeof body.locationId === "string" ? body.locationId : ""
  if (!locationId) return NextResponse.json({ success: false, error: "Choose a business." }, { status: 400 })

  const { data: merchant } = await createAdminClient()
    .from("merchants")
    .select("google_managed_businesses")
    .eq("id", user.id)
    .maybeSingle()
  const raw = merchant?.google_managed_businesses
  const managed: ManagedBusiness[] = Array.isArray(raw) ? raw : typeof raw === "string" ? JSON.parse(raw) : []
  const match = managed.find((b) => b.locationId === locationId)
  if (!match) {
    return NextResponse.json(
      { success: false, code: "NOT_AUTHORIZED", error: "That business isn't managed by the Google account you signed in with." },
      { status: 403 },
    )
  }

  if (await claimedByOther(user.id, match.placeId, match.locationId)) {
    return NextResponse.json({ success: false, code: "ALREADY_CLAIMED", error: ALREADY_CLAIMED_MESSAGE }, { status: 409 })
  }

  await markVerified(user.id, { placeId: match.placeId, locationId: match.locationId, matchType: "STRICT_API_SELECTION" })
  // Bring in address, phone, photo, etc. from Google (never overwrites what they typed)
  await syncProfileFromGoogle(user.id).catch((e) => console.error("[claim] profile sync failed:", e))
  return NextResponse.json({ success: true, placeId: match.placeId, locationId: match.locationId, businessName: match.businessName })
}
