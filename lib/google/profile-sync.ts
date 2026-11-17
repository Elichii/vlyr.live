/**
 * Fill a merchant's Business Profile from their verified Google business
 * (server-only).
 *
 * Copies address, business phone, website, map location, category and the
 * Google rating. Fields the merchant already filled in are never overwritten
 * unless `overwrite` is set (the "Refresh from Google" button).
 */
import { createAdminClient } from "@/lib/supabase/admin"
import { categoryFromTypes } from "@/lib/google/categories"


interface PlaceDetails {
  name?: string
  formatted_address?: string
  formatted_phone_number?: string
  international_phone_number?: string
  website?: string
  geometry?: { location?: { lat: number; lng: number } }
  types?: string[]
  rating?: number
  user_ratings_total?: number
  photos?: { photo_reference: string }[]
}

async function fetchPlace(placeId: string): Promise<PlaceDetails | null> {
  const key = process.env.GOOGLE_PLACES_API_KEY
  if (!key || !placeId || placeId.startsWith("cid:")) return null
  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json")
  url.searchParams.set("place_id", placeId)
  url.searchParams.set(
    "fields",
    "name,formatted_address,formatted_phone_number,international_phone_number,website,geometry,types,rating,user_ratings_total,photos",
  )
  url.searchParams.set("key", key)
  const res = await fetch(url, { cache: "no-store" })
  const data = await res.json().catch(() => null)
  return data?.status === "OK" ? (data.result as PlaceDetails) : null
}

export interface SyncResult {
  updated: string[]
  skipped?: string
}

export async function syncProfileFromGoogle(merchantId: string, opts: { overwrite?: boolean } = {}): Promise<SyncResult> {
  const admin = createAdminClient()
  const { data: m } = await admin
    .from("merchants")
    .select("google_ownership_verified, google_verified_place_id, google_place_id, business_name, business_category, address, logo_url, lat, lng, google_phone, google_website")
    .eq("id", merchantId)
    .maybeSingle()
  if (!m?.google_ownership_verified) return { updated: [], skipped: "Business not verified with Google" }

  const placeId = (m.google_verified_place_id || m.google_place_id) as string | null
  const place = placeId ? await fetchPlace(placeId) : null
  if (!place) return { updated: [], skipped: "Couldn't load the business from Google" }

  const fill = (current: unknown) => opts.overwrite || current === null || current === undefined || current === ""
  const update: Record<string, unknown> = {}
  const phone = place.formatted_phone_number || place.international_phone_number

  if (place.name && fill(m.business_name)) update.business_name = place.name
  if (place.formatted_address) {
    update.google_address = place.formatted_address
    if (fill(m.address)) update.address = place.formatted_address
  }
  if (phone && fill(m.google_phone)) update.google_phone = phone
  if (place.website && fill(m.google_website)) update.google_website = place.website
  if (place.geometry?.location && (fill(m.lat) || fill(m.lng))) {
    update.lat = place.geometry.location.lat
    update.lng = place.geometry.location.lng
  }
  const category = categoryFromTypes(place.types)
  if (category && fill(m.business_category)) update.business_category = category
  if (typeof place.rating === "number") update.google_rating = place.rating
  if (typeof place.user_ratings_total === "number") update.google_review_count = place.user_ratings_total
  // The logo comes only from the owner's Business Profile logo (see
  // /api/google/claim). A random Google photo would look wrong on stickers.

  if (Object.keys(update).length) {
    const { error } = await admin.from("merchants").update(update).eq("id", merchantId)
    if (error) throw new Error(error.message)
  }

  // Make sure happy customers have a Google review page to go to
  if (placeId && !placeId.startsWith("cid:")) {
    const { count } = await admin.from("review_links").select("id", { count: "exact", head: true }).eq("merchant_id", merchantId).eq("platform", "google")
    if (!count) {
      const { count: any } = await admin.from("review_links").select("id", { count: "exact", head: true }).eq("merchant_id", merchantId)
      await admin.from("review_links").insert({
        merchant_id: merchantId,
        platform: "google",
        label: "Google Reviews",
        url: `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`,
        is_primary: !any,
        sort_order: 0,
      })
      update.review_link = true
    }
  }

  return { updated: Object.keys(update) }
}
