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
import { getValidGoogleToken } from "@/lib/google/token-refresh"
import { fetchProfileMedia, storeLogoBytes, storeLogoFromUrl } from "@/lib/google/business-profile"
import { fetchSiteLogo } from "@/lib/google/site-logo"

interface ManagedBusiness {
  locationId: string
  placeId: string | null
  businessName: string
  accountName?: string
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

  const admin = createAdminClient()

  // Switching to a different business: forget everything from the old one
  const { data: before } = await admin.from("merchants").select("google_verified_location_id").eq("id", user.id).maybeSingle()
  if (before?.google_verified_location_id && before.google_verified_location_id !== match.locationId) {
    await admin.from("merchants").update({
      business_name: null, business_category: null, logo_url: null, address: null, lat: null, lng: null,
      google_address: null, google_phone: null, google_website: null, google_rating: null, google_review_count: null,
      last_review_fetch_at: null, last_review_id: null,
    }).eq("id", user.id)
    await admin.from("google_reviews").delete().eq("merchant_id", user.id)
    await admin.from("review_links").delete().eq("merchant_id", user.id).eq("platform", "google")
  }

  await markVerified(user.id, { placeId: match.placeId, locationId: match.locationId, matchType: "STRICT_API_SELECTION" })

  // Use the logo the owner uploaded to their Google Business Profile
  const { data: current } = await admin.from("merchants").select("logo_url").eq("id", user.id).maybeSingle()
  if (!current?.logo_url) {
    try {
      const token = await getValidGoogleToken(user.id)
      const media = token ? await fetchProfileMedia(token, match.accountName, match.locationId) : null
      const stored = media?.logoUrl ? await storeLogoFromUrl(admin, user.id, media.logoUrl) : null
      if (stored) await admin.from("merchants").update({ logo_url: stored }).eq("id", user.id)
    } catch (e) {
      console.error("[claim] logo import failed:", e)
    }
  }
  // Bring in address, phone, category, etc. from Google (never overwrites what they typed)
  await syncProfileFromGoogle(user.id).catch((e) => console.error("[claim] profile sync failed:", e))
  // Still no logo (none on the Business Profile): use the one on the business's website
  const { data: afterSync } = await admin.from("merchants").select("logo_url, google_website").eq("id", user.id).maybeSingle()
  if (!afterSync?.logo_url && afterSync?.google_website) {
    try {
      const site = await fetchSiteLogo(afterSync.google_website)
      const stored = site ? await storeLogoBytes(admin, user.id, site.bytes, site.type) : null
      if (stored) await admin.from("merchants").update({ logo_url: stored }).eq("id", user.id)
    } catch (e) {
      console.error("[claim] website logo import failed:", e)
    }
  }
  // Businesses without a public Google listing: use the Business Profile's own name
  await admin.from("merchants").update({ business_name: match.businessName }).eq("id", user.id).is("business_name", null)

  // Everything the next setup screen needs, so it opens filled in
  const { data: m } = await admin
    .from("merchants")
    .select("business_name, business_category, logo_url, address, google_address, google_phone, google_website, lat, lng, google_rating, google_review_count")
    .eq("id", user.id)
    .maybeSingle()
  return NextResponse.json({
    success: true,
    placeId: match.placeId,
    locationId: match.locationId,
    businessName: m?.business_name || match.businessName,
    business: {
      businessName: m?.business_name || match.businessName,
      businessCategory: m?.business_category ?? null,
      logoUrl: m?.logo_url ?? null,
      address: m?.google_address || m?.address || null,
      phone: m?.google_phone ?? null,
      website: m?.google_website ?? null,
      lat: m?.lat ?? null,
      lng: m?.lng ?? null,
      rating: m?.google_rating ?? null,
      totalReviews: m?.google_review_count ?? null,
    },
  })
}
