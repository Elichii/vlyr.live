import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * GET /api/google/reviews
 * Fetches real Google reviews for the authenticated merchant's verified business
 */
export async function GET(request: NextRequest) {
  const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY

  if (!GOOGLE_PLACES_API_KEY) {
    return NextResponse.json({
      error: "Add GOOGLE_PLACES_API_KEY in Settings → Vars to display reviews",
      reviews: []
    }, { status: 200 })
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Not authenticated", reviews: [] }, { status: 401 })
    }

    // Reviews come only from the business Google confirmed they own
    const { data: merchant } = await supabase
      .from("merchants")
      .select("google_ownership_verified, google_verified_place_id, google_location_id, google_place_id")
      .eq("id", user.id)
      .single()

    if (!merchant?.google_ownership_verified) {
      return NextResponse.json({ error: "Google not connected", reviews: [] }, { status: 200 })
    }

    const placeId = [merchant.google_verified_place_id, merchant.google_location_id, merchant.google_place_id]
      .find((id): id is string => typeof id === "string" && id.startsWith("ChIJ"))
    if (!placeId) {
      return NextResponse.json({
        error: "Please re-verify your business from the Profile page to fetch reviews.",
        reviews: []
      }, { status: 200 })
    }

    // Fetch place details including reviews from Google Places API
    const url = new URL("https://maps.googleapis.com/maps/api/place/details/json")
    url.searchParams.set("place_id", placeId)
    url.searchParams.set("fields", "name,rating,user_ratings_total,reviews,url")
    url.searchParams.set("key", GOOGLE_PLACES_API_KEY)

    const response = await fetch(url.toString())
    const data = await response.json()

    if (data.status !== "OK") {
      return NextResponse.json({
        error: data.error_message || `Google API error: ${data.status}`,
        reviews: []
      }, { status: 200 })
    }

    const result = data.result || {}
    const reviews = (result.reviews || []).map((review: {
      author_name: string
      rating: number
      text: string
      time: number
      relative_time_description: string
      profile_photo_url?: string
    }) => ({
      author: review.author_name,
      rating: review.rating,
      text: review.text,
      time: review.time,
      relativeTime: review.relative_time_description,
      authorPhoto: review.profile_photo_url || null,
    }))

    return NextResponse.json({
      success: true,
      businessName: result.name,
      rating: result.rating,
      totalReviews: result.user_ratings_total,
      googleUrl: result.url,
      reviews: reviews.slice(0, 5),
    })

  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch reviews", reviews: [] }, { status: 500 })
  }
}
