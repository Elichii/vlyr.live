/**
 * GET /api/google/business-preview?locationId=locations/123
 *
 * Full details for one of the businesses Google says the signed-in user
 * manages: rating, contact details, hours, recent reviews, logo and cover.
 * Only locations from the user's own Google list are accepted.
 */
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getValidGoogleToken } from "@/lib/google/token-refresh"
import { fetchPlace, fetchProfileMedia, fetchProfileReviews, shapePreview } from "@/lib/google/business-profile"

interface Managed { locationId: string; placeId: string | null; businessName: string; address: string | null; accountName?: string }

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  const locationId = request.nextUrl.searchParams.get("locationId") ?? ""
  const { data: m } = await createAdminClient().from("merchants").select("google_managed_businesses").eq("id", user.id).maybeSingle()
  const raw = m?.google_managed_businesses
  const list: Managed[] = Array.isArray(raw) ? raw : typeof raw === "string" ? JSON.parse(raw) : []
  const base = list.find((b) => b.locationId === locationId)
  if (!base) return NextResponse.json({ error: "That business isn't on your Google account." }, { status: 404 })

  const token = await getValidGoogleToken(user.id)
  const [place, media, reviews] = await Promise.all([
    base.placeId ? fetchPlace(base.placeId) : Promise.resolve(null),
    token ? fetchProfileMedia(token, base.accountName, base.locationId).catch(() => ({ logoUrl: null, coverUrl: null })) : Promise.resolve({ logoUrl: null, coverUrl: null }),
    token ? fetchProfileReviews(token, base.accountName, base.locationId).catch(() => null) : Promise.resolve(null),
  ])
  return NextResponse.json({ business: shapePreview(base, place, media, reviews) })
}
