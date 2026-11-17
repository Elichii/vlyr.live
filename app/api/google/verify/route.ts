import { NextRequest, NextResponse } from "next/server"
import { categoryFromTypes } from "@/lib/google/categories"


interface PlaceReview {
  author_name?: string
  rating?: number
  text?: string
  time?: number
  relative_time_description?: string
  profile_photo_url?: string
}

interface PlaceResult {
  place_id?: string
  name?: string
  formatted_address?: string
  formatted_phone_number?: string
  international_phone_number?: string
  geometry?: { location?: { lat?: number; lng?: number } }
  types?: string[]
  website?: string
  url?: string
  rating?: number
  user_ratings_total?: number
  photos?: { photo_reference: string }[]
  opening_hours?: { weekday_text?: string[] }
  address_components?: { types: string[]; long_name: string; short_name: string }[]
  reviews?: PlaceReview[]
}

async function fetchFullPlaceDetails(placeId: string, apiKey: string) {
  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json")
  url.searchParams.set("place_id", placeId)
  url.searchParams.set("fields", [
    "place_id", "name", "formatted_address", "formatted_phone_number",
    "international_phone_number", "geometry", "types", "website", "url",
    "rating", "user_ratings_total", "photos", "opening_hours",
    "address_components", "reviews",
  ].join(","))
  url.searchParams.set("key", apiKey)

  const res = await fetch(url.toString())
  const data = await res.json()

  if (data.status !== "OK" || !data.result) return null
  return data.result as PlaceResult
}

function shapePlaceResult(place: PlaceResult, apiKey: string) {
  const businessCategory = categoryFromTypes(place.types) ?? "Other"

  // The photo is downloaded and stored server-side after verification
  // (lib/google/profile-sync.ts). Never build a photo URL here: it would
  // contain the Google API key and be sent to the browser.
  void apiKey
  const logoUrl: string | null = null

  let city = "", state = "", country = "", postalCode = ""
  for (const c of place.address_components ?? []) {
    if (c.types.includes("locality")) city = c.long_name
    else if (c.types.includes("administrative_area_level_1")) state = c.short_name
    else if (c.types.includes("country")) country = c.long_name
    else if (c.types.includes("postal_code")) postalCode = c.long_name
  }

  const placeId = place.place_id ?? ""
  const reviewUrl = `https://search.google.com/local/writereview?placeid=${placeId}`

  const reviews = (place.reviews ?? []).map((r) => ({
    author: r.author_name ?? "Anonymous",
    rating: r.rating ?? 0,
    text: r.text ?? "",
    time: r.time ?? 0,
    relativeTime: r.relative_time_description ?? "",
    authorPhoto: r.profile_photo_url ?? null,
  }))

  return {
    success: true,
    placeId,
    businessName: place.name ?? "",
    address: place.formatted_address ?? "",
    phone: place.formatted_phone_number ?? place.international_phone_number ?? null,
    category: businessCategory,
    lat: place.geometry?.location?.lat ?? null,
    lng: place.geometry?.location?.lng ?? null,
    website: place.website ?? null,
    googleMapsUrl: place.url ?? null,
    reviewUrl,
    rating: place.rating ?? null,
    totalReviews: place.user_ratings_total ?? 0,
    logoUrl,
    city,
    state,
    country,
    postalCode,
    openingHours: place.opening_hours?.weekday_text ?? null,
    reviews,
  }
}

/**
 * GET /api/google/verify?placeId=XXX
 * Fetches full place details (rating, reviews, hours, etc.) for a known Place ID.
 * Read-only — does not write to the database.
 */
export async function GET(request: NextRequest) {
  const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY
  const placeId = request.nextUrl.searchParams.get("placeId")

  if (!placeId) {
    return NextResponse.json({ success: false, error: "Missing placeId" }, { status: 400 })
  }
  if (!GOOGLE_PLACES_API_KEY) {
    return NextResponse.json({ success: false, error: "Google Places API not configured" })
  }

  try {
    const place = await fetchFullPlaceDetails(placeId, GOOGLE_PLACES_API_KEY)
    if (!place) {
      return NextResponse.json({ success: false, error: "Could not fetch business details from Google." })
    }
    return NextResponse.json(shapePlaceResult(place, GOOGLE_PLACES_API_KEY))
  } catch (error) {
    console.error("[Google Verify GET] Error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch business details." }, { status: 500 })
  }
}

/**
 * POST /api/google/verify
 * Resolves a Google Maps URL → Place ID → full business details.
 * Saves basic fields to the merchants table and adds a review_link row.
 */
export async function POST(request: NextRequest) {
  const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY

  if (!GOOGLE_PLACES_API_KEY) {
    return NextResponse.json(
      { success: false, error: "Google Places API not configured. Please add GOOGLE_PLACES_API_KEY." },
      { status: 200 }
    )
  }

  try {
    const { url, businessName } = await request.json()

    if (!url) {
      return NextResponse.json({ success: false, error: "URL is required" }, { status: 400 })
    }
    if (!businessName?.trim()) {
      return NextResponse.json({ success: false, error: "Business name is required" }, { status: 400 })
    }

    let placeId: string | null = null

    // Step 1: Try to extract ChIJ Place ID directly from URL
    const chiJMatch = url.match(/ChIJ[A-Za-z0-9_-]+/)
    if (chiJMatch) placeId = chiJMatch[0]

    // Step 2: If no Place ID, search by business name
    if (!placeId) {
      let searchQuery = ""

      const placeMatch = url.match(/\/place\/([^/\?@]+)/i)
      if (placeMatch) searchQuery = decodeURIComponent(placeMatch[1].replace(/\+/g, " "))

      if (!searchQuery) {
        const searchMatch = url.match(/\/maps\/search\/([^/\?@]+)/i)
        if (searchMatch) searchQuery = decodeURIComponent(searchMatch[1].replace(/\+/g, " "))
      }
      if (!searchQuery) {
        const qMatch = url.match(/[?&]q=([^&]+)/i)
        if (qMatch) searchQuery = decodeURIComponent(qMatch[1].replace(/\+/g, " "))
      }
      if (!searchQuery) searchQuery = businessName

      if (!searchQuery) {
        return NextResponse.json({ success: false, error: "needsBusinessName", message: "Please enter your business name." })
      }

      // Find Place by text
      const findUrl = new URL("https://maps.googleapis.com/maps/api/place/findplacefromtext/json")
      findUrl.searchParams.set("input", searchQuery)
      findUrl.searchParams.set("inputtype", "textquery")
      findUrl.searchParams.set("fields", "place_id")
      findUrl.searchParams.set("key", GOOGLE_PLACES_API_KEY)

      const findRes = await fetch(findUrl.toString())
      const findData = await findRes.json()

      if (findData.status === "OK" && findData.candidates?.length > 0) {
        placeId = findData.candidates[0].place_id
      } else {
        // Text Search fallback
        const textUrl = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json")
        textUrl.searchParams.set("query", searchQuery)
        textUrl.searchParams.set("key", GOOGLE_PLACES_API_KEY)

        const textRes = await fetch(textUrl.toString())
        const textData = await textRes.json()

        if (textData.status === "OK" && textData.results?.length > 0) {
          placeId = textData.results[0].place_id
        }
      }
    }

    if (!placeId) {
      return NextResponse.json({ success: false, error: "Could not find your business on Google Maps." })
    }

    // Step 3: Fetch full details
    const place = await fetchFullPlaceDetails(placeId, GOOGLE_PLACES_API_KEY)
    if (!place) {
      return NextResponse.json({ success: false, error: "Could not fetch business details from Google." })
    }

    const result = shapePlaceResult(place, GOOGLE_PLACES_API_KEY)

    // Look-up only: nothing is saved here. A business is connected only after
    // Google confirms the signed-in account manages it (/api/google/claim).


    return NextResponse.json(result)
  } catch (error) {
    console.error("[Google Verify POST] Error:", error)
    return NextResponse.json({ success: false, error: "Verification failed. Please try again." }, { status: 500 })
  }
}
