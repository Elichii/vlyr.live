/**
 * Everything we show about a Google business during setup (server-only):
 * details from Google Places (rating, phone, hours, recent reviews...) and
 * the owner's own logo / cover photo from the Business Profile media API.
 *
 * Images from the Business Profile come as public googleusercontent URLs.
 * Places photos need our API key, so they're served through
 * /api/google/place-photo instead of being linked directly.
 */
import { categoryFromTypes } from "@/lib/google/categories"

export interface BusinessPreview {
  locationId: string
  placeId: string | null
  name: string
  category: string | null
  address: string | null
  phone: string | null
  website: string | null
  mapsUrl: string | null
  rating: number | null
  totalReviews: number
  lat: number | null
  lng: number | null
  openNow: boolean | null
  hours: string[]
  reviews: { author: string; rating: number; text: string; relativeTime: string; authorPhoto: string | null }[]
  logoUrl: string | null
  coverUrl: string | null
}

interface PlaceResult {
  name?: string
  formatted_address?: string
  formatted_phone_number?: string
  international_phone_number?: string
  website?: string
  url?: string
  geometry?: { location?: { lat: number; lng: number } }
  types?: string[]
  rating?: number
  user_ratings_total?: number
  photos?: { photo_reference: string }[]
  opening_hours?: { open_now?: boolean; weekday_text?: string[] }
  reviews?: { author_name?: string; rating?: number; text?: string; relative_time_description?: string; profile_photo_url?: string }[]
}

export async function fetchPlace(placeId: string): Promise<PlaceResult | null> {
  const key = process.env.GOOGLE_PLACES_API_KEY
  if (!key || !placeId || placeId.startsWith("cid:")) return null
  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json")
  url.searchParams.set("place_id", placeId)
  url.searchParams.set(
    "fields",
    "name,formatted_address,formatted_phone_number,international_phone_number,website,url,geometry,types,rating,user_ratings_total,photos,opening_hours,reviews",
  )
  url.searchParams.set("reviews_sort", "newest")
  url.searchParams.set("key", key)
  const res = await fetch(url, { cache: "no-store" }).catch(() => null)
  const data = await res?.json().catch(() => null)
  return data?.status === "OK" ? (data.result as PlaceResult) : null
}

interface MediaItem {
  googleUrl?: string
  thumbnailUrl?: string
  mediaFormat?: string
  locationAssociation?: { category?: string }
}

/** The owner's logo and cover photo from their Business Profile (v4 media API). */
export async function fetchProfileMedia(accessToken: string, accountName: string | null | undefined, locationId: string) {
  const empty = { logoUrl: null as string | null, coverUrl: null as string | null }
  const accounts: string[] = []
  if (accountName && /^accounts\/\d+$/.test(accountName)) accounts.push(accountName)
  else {
    const r = await fetch("https://mybusinessaccountmanagement.googleapis.com/v1/accounts", { headers: { Authorization: `Bearer ${accessToken}` } }).catch(() => null)
    const j = r?.ok ? await r.json() : {}
    for (const a of (j.accounts ?? []) as { name: string }[]) accounts.push(a.name)
  }
  for (const account of accounts) {
    const r = await fetch(`https://mybusiness.googleapis.com/v4/${account}/${locationId}/media?pageSize=100`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }).catch(() => null)
    if (!r?.ok) continue
    const items: MediaItem[] = ((await r.json()).mediaItems ?? []).filter((m: MediaItem) => m.mediaFormat !== "VIDEO" && m.googleUrl)
    const pick = (...cats: string[]) => {
      for (const c of cats) {
        const m = items.find((i) => i.locationAssociation?.category === c)
        if (m) return m.googleUrl!
      }
      return null
    }
    return {
      logoUrl: pick("LOGO", "PROFILE"),
      coverUrl: pick("COVER", "EXTERIOR", "INTERIOR", "AT_WORK", "ADDITIONAL") ?? items[0]?.googleUrl ?? null,
    }
  }
  return empty
}

type Review = BusinessPreview["reviews"][number]

const STARS: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 }

function timeAgo(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days < 1) return "today"
  if (days < 7) return days === 1 ? "yesterday" : `${days} days ago`
  if (days < 30) { const w = Math.floor(days / 7); return w === 1 ? "a week ago" : `${w} weeks ago` }
  if (days < 365) { const m = Math.floor(days / 30); return m === 1 ? "a month ago" : `${m} months ago` }
  const y = Math.floor(days / 365); return y === 1 ? "a year ago" : `${y} years ago`
}

/** The newest reviews from the owner's Business Profile (v4 API, up to 50). */
export async function fetchProfileReviews(accessToken: string, accountName: string | null | undefined, locationId: string, max = 20): Promise<Review[] | null> {
  const accounts: string[] = []
  if (accountName && /^accounts\/\d+$/.test(accountName)) accounts.push(accountName)
  else {
    const r = await fetch("https://mybusinessaccountmanagement.googleapis.com/v1/accounts", { headers: { Authorization: `Bearer ${accessToken}` } }).catch(() => null)
    const j = r?.ok ? await r.json() : {}
    for (const a of (j.accounts ?? []) as { name: string }[]) accounts.push(a.name)
  }
  for (const account of accounts) {
    const r = await fetch(`https://mybusiness.googleapis.com/v4/${account}/${locationId}/reviews?pageSize=${max}&orderBy=${encodeURIComponent("updateTime desc")}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }).catch(() => null)
    if (!r?.ok) continue
    const list = ((await r.json()).reviews ?? []) as { reviewer?: { displayName?: string; profilePhotoUrl?: string }; starRating?: string; comment?: string; createTime?: string }[]
    return list.map((v) => ({
      author: v.reviewer?.displayName || "A customer",
      rating: STARS[v.starRating ?? ""] ?? 0,
      // Google appends a translation block to some comments
      text: (v.comment ?? "").split("\n\n(Translated by Google)")[0].replace(/^\(Translated by Google\)\s*/, ""),
      relativeTime: v.createTime ? timeAgo(v.createTime) : "",
      authorPhoto: v.reviewer?.profilePhotoUrl ?? null,
    }))
  }
  return null
}

const placePhotoUrl = (ref: string) => `/api/google/place-photo?ref=${encodeURIComponent(ref)}`
const profileImageUrl = (url: string, size: "logo" | "cover") => `/api/google/media?size=${size}&u=${encodeURIComponent(url)}`

export function shapePreview(
  base: { locationId: string; placeId: string | null; businessName: string; address: string | null },
  place: PlaceResult | null,
  media: { logoUrl: string | null; coverUrl: string | null },
  profileReviews: Review[] | null = null,
): BusinessPreview {
  const photoRef = place?.photos?.[0]?.photo_reference
  return {
    locationId: base.locationId,
    placeId: base.placeId,
    name: place?.name || base.businessName,
    category: categoryFromTypes(place?.types),
    address: place?.formatted_address || base.address,
    phone: place?.formatted_phone_number || place?.international_phone_number || null,
    website: place?.website || null,
    mapsUrl: place?.url || null,
    rating: typeof place?.rating === "number" ? place.rating : null,
    totalReviews: place?.user_ratings_total ?? 0,
    lat: place?.geometry?.location?.lat ?? null,
    lng: place?.geometry?.location?.lng ?? null,
    openNow: typeof place?.opening_hours?.open_now === "boolean" ? place.opening_hours.open_now : null,
    hours: place?.opening_hours?.weekday_text ?? [],
    reviews: profileReviews?.length ? profileReviews : (place?.reviews ?? []).map((r) => ({
      author: r.author_name ?? "A customer",
      rating: r.rating ?? 0,
      text: r.text ?? "",
      relativeTime: r.relative_time_description ?? "",
      authorPhoto: r.profile_photo_url ?? null,
    })),
    // No logo on this Business Profile: try the logo on the business's own website
    logoUrl: media.logoUrl
      ? profileImageUrl(media.logoUrl, "logo")
      : place?.website ? `/api/google/site-logo?site=${encodeURIComponent(place.website)}` : null,
    coverUrl: media.coverUrl ? profileImageUrl(media.coverUrl, "cover") : photoRef ? placePhotoUrl(photoRef) : null,
  }
}

/** Store PNG/JPEG bytes as the merchant's logo in our bucket. */
export async function storeLogoBytes(
  admin: ReturnType<typeof import("@/lib/supabase/admin").createAdminClient>,
  merchantId: string,
  bytes: Uint8Array,
  type: string,
): Promise<string | null> {
  if (!/^image\/(png|jpe?g)$/.test(type) || bytes.length > 5_000_000) return null
  const path = `${merchantId}/site-logo-${Date.now()}.${type.includes("png") ? "png" : "jpg"}`
  const { error } = await admin.storage.from("logos").upload(path, bytes, { upsert: true, contentType: type })
  if (error) return null
  return admin.storage.from("logos").getPublicUrl(path).data.publicUrl
}

/** Download an image and store it as the merchant's logo in our bucket. */
export async function storeLogoFromUrl(
  admin: ReturnType<typeof import("@/lib/supabase/admin").createAdminClient>,
  merchantId: string,
  sourceUrl: string,
): Promise<string | null> {
  // Ask Google for a sensible size (googleusercontent URLs accept =s<size>)
  const url = /googleusercontent\.com/.test(sourceUrl) ? sourceUrl.replace(/=[^/]*$/, "") + "=s512" : sourceUrl
  const res = await fetch(url).catch(() => null)
  const type = res?.headers.get("content-type") ?? ""
  // Sticker printing reads PNG or JPEG only
  if (!res?.ok || !/^image\/(png|jpe?g)/.test(type)) return null
  const bytes = new Uint8Array(await res.arrayBuffer())
  if (bytes.length > 5_000_000) return null
  const ext = type.includes("png") ? "png" : "jpg"
  const path = `${merchantId}/google-logo-${Date.now()}.${ext}`
  const { error } = await admin.storage.from("logos").upload(path, bytes, { upsert: true, contentType: type })
  if (error) return null
  return admin.storage.from("logos").getPublicUrl(path).data.publicUrl
}
