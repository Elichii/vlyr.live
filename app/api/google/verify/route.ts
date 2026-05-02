import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * POST /api/google/verify
 * Verifies a Google Business Profile URL and extracts full business details
 * Returns: placeId, businessName, address, phone, category, lat, lng, website, etc.
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
      return NextResponse.json(
        { success: false, error: "URL is required" },
        { status: 400 }
      )
    }

    if (!businessName || !businessName.trim()) {
      return NextResponse.json(
        { success: false, error: "Business name is required" },
        { status: 400 }
      )
    }

    let placeId: string | null = null

    // Step 1: Try to extract ChIJ Place ID directly from URL
    const chiJMatch = url.match(/ChIJ[A-Za-z0-9_-]+/)
    if (chiJMatch) {
      placeId = chiJMatch[0]
    }

    // Step 2: If no Place ID, search by business name from URL or provided name
    if (!placeId) {
      let searchQuery = ""
      
      // Extract from /place/Business+Name/
      const placeMatch = url.match(/\/place\/([^\/\?@]+)/i)
      if (placeMatch) {
        searchQuery = decodeURIComponent(placeMatch[1].replace(/\+/g, " "))
      }
      
      // Extract from /maps/search/Business+Name
      if (!searchQuery) {
        const searchMatch = url.match(/\/maps\/search\/([^\/\?@]+)/i)
        if (searchMatch) {
          searchQuery = decodeURIComponent(searchMatch[1].replace(/\+/g, " "))
        }
      }

      // Extract from ?q=Business+Name
      if (!searchQuery) {
        const qMatch = url.match(/[?&]q=([^&]+)/i)
        if (qMatch) {
          searchQuery = decodeURIComponent(qMatch[1].replace(/\+/g, " "))
        }
      }

      // Use provided businessName as fallback
      if (!searchQuery && businessName) {
        searchQuery = businessName
      }

      if (!searchQuery) {
        return NextResponse.json({
          success: false,
          error: "needsBusinessName",
          message: "Please enter your business name to complete verification."
        })
      }

      // Search for the business
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
        // Try Text Search as backup
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
      return NextResponse.json({
        success: false,
        error: "Could not find your business on Google Maps. Please check your business listing exists."
      })
    }

    // Step 3: Fetch full business details from Google Places API
    const detailsUrl = new URL("https://maps.googleapis.com/maps/api/place/details/json")
    detailsUrl.searchParams.set("place_id", placeId)
    detailsUrl.searchParams.set("fields", [
      "place_id",
      "name",
      "formatted_address",
      "formatted_phone_number",
      "international_phone_number",
      "geometry",
      "types",
      "website",
      "url",
      "rating",
      "user_ratings_total",
      "photos",
      "opening_hours",
      "address_components",
      "reviews"
    ].join(","))
    detailsUrl.searchParams.set("key", GOOGLE_PLACES_API_KEY)

    const detailsRes = await fetch(detailsUrl.toString())
    const detailsData = await detailsRes.json()

    if (detailsData.status !== "OK" || !detailsData.result) {
      return NextResponse.json({
        success: false,
        error: "Could not fetch business details from Google."
      })
    }

    const place = detailsData.result

    // Map Google types to our business categories
    const categoryMap: Record<string, string> = {
      restaurant: "Restaurant / Cafe",
      cafe: "Restaurant / Cafe",
      food: "Restaurant / Cafe",
      bar: "Restaurant / Cafe",
      bakery: "Restaurant / Cafe",
      lodging: "Hotel / Hospitality",
      hotel: "Hotel / Hospitality",
      store: "Retail Store",
      shopping_mall: "Retail Store",
      clothing_store: "Retail Store",
      shoe_store: "Retail Store",
      jewelry_store: "Retail Store",
      beauty_salon: "Salon / Spa",
      hair_care: "Salon / Spa",
      spa: "Salon / Spa",
      gym: "Fitness / Gym",
      health: "Healthcare",
      hospital: "Healthcare",
      doctor: "Healthcare",
      dentist: "Healthcare",
      pharmacy: "Healthcare",
      car_dealer: "Auto Services",
      car_repair: "Auto Services",
      car_wash: "Auto Services",
      real_estate_agency: "Real Estate",
      lawyer: "Professional Services",
      accounting: "Professional Services",
      insurance_agency: "Professional Services",
      bank: "Professional Services",
      finance: "Professional Services",
      laundry: "Laundry / Dry Cleaning",
      dry_cleaner: "Laundry / Dry Cleaning",
    }

    let businessCategory = "Other"
    if (place.types && place.types.length > 0) {
      for (const type of place.types) {
        if (categoryMap[type]) {
          businessCategory = categoryMap[type]
          break
        }
      }
    }

    // Build logo URL from first photo if available
    let logoUrl = null
    if (place.photos && place.photos.length > 0) {
      const photoRef = place.photos[0].photo_reference
      logoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${photoRef}&key=${GOOGLE_PLACES_API_KEY}`
    }

    // Build the review URL
    const reviewUrl = `https://search.google.com/local/writereview?placeid=${placeId}`

    // Extract structured address components
    let city = ""
    let state = ""
    let country = ""
    let postalCode = ""
    if (place.address_components) {
      for (const component of place.address_components) {
        if (component.types.includes("locality")) {
          city = component.long_name
        } else if (component.types.includes("administrative_area_level_1")) {
          state = component.short_name
        } else if (component.types.includes("country")) {
          country = component.long_name
        } else if (component.types.includes("postal_code")) {
          postalCode = component.long_name
        }
      }
    }

    // Save to database if user is authenticated
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      await supabase.from("merchants").update({
        google_connected: true,
        google_location_id: placeId,
        google_account_name: place.name,
        // Also update business info if not already set
        business_name: place.name,
        business_category: businessCategory,
      }).eq("id", user.id)

      // Add Google review link to review_links table
      const { data: existingLink } = await supabase
        .from("review_links")
        .select("id")
        .eq("merchant_id", user.id)
        .eq("platform", "google")
        .single()

      if (!existingLink) {
        await supabase.from("review_links").insert({
          merchant_id: user.id,
          platform: "google",
          url: reviewUrl,
          label: "Google Reviews"
        })
      }
    }

    // Format reviews for the response
    const reviews = (place.reviews || []).map((review: {
      author_name?: string
      rating?: number
      text?: string
      time?: number
      relative_time_description?: string
      profile_photo_url?: string
    }) => ({
      author: review.author_name || "Anonymous",
      rating: review.rating || 0,
      text: review.text || "",
      time: review.time || 0,
      relativeTime: review.relative_time_description || "",
      authorPhoto: review.profile_photo_url || null,
    }))

    return NextResponse.json({
      success: true,
      placeId,
      businessName: place.name,
      address: place.formatted_address,
      phone: place.formatted_phone_number || place.international_phone_number || null,
      category: businessCategory,
      lat: place.geometry?.location?.lat || null,
      lng: place.geometry?.location?.lng || null,
      website: place.website || null,
      googleMapsUrl: place.url || null,
      reviewUrl,
      rating: place.rating || null,
      totalReviews: place.user_ratings_total || 0,
      logoUrl,
      city,
      state,
      country,
      postalCode,
      openingHours: place.opening_hours?.weekday_text || null,
      reviews,
    })

  } catch (error) {
    console.error("[Google Verify] Error:", error)
    return NextResponse.json(
      { success: false, error: "Verification failed. Please try again." },
      { status: 500 }
    )
  }
}
