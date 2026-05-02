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

    // Get merchant's Google data
    const { data: merchant } = await supabase
      .from("merchants")
      .select("google_location_id, google_connected, google_account_name, business_name")
      .eq("id", user.id)
      .single()

    if (!merchant?.google_connected || !merchant?.google_location_id) {
      return NextResponse.json({ error: "Google not connected", reviews: [] }, { status: 200 })
    }

    let placeId = merchant.google_location_id
    const businessName = merchant.google_account_name || merchant.business_name || ""

    // Valid Place IDs start with "ChIJ"
    const isValidPlaceId = placeId.startsWith("ChIJ")

    // If not a valid Place ID, try to find the business by name
    if (!isValidPlaceId) {
      if (!businessName || businessName === "Your Business") {
        return NextResponse.json({
          error: "Please re-verify your business from the Profile page to fetch reviews.",
          reviews: []
        }, { status: 200 })
      }

      // Use Find Place API to get a valid Place ID
      const findUrl = new URL("https://maps.googleapis.com/maps/api/place/findplacefromtext/json")
      findUrl.searchParams.set("input", businessName)
      findUrl.searchParams.set("inputtype", "textquery")
      findUrl.searchParams.set("fields", "place_id,name")
      findUrl.searchParams.set("key", GOOGLE_PLACES_API_KEY)

      const findResponse = await fetch(findUrl.toString())
      const findData = await findResponse.json()

      if (findData.status === "OK" && findData.candidates?.length > 0) {
        placeId = findData.candidates[0].place_id

        // Update the merchant record with the correct Place ID
        await supabase.from("merchants").update({
          google_location_id: placeId
        }).eq("id", user.id)
      } else {
        return NextResponse.json({
          error: "Could not find your business on Google. Try re-verifying with a Google Maps share link.",
          reviews: []
        }, { status: 200 })
      }
    }

    // Final validation
    if (!placeId.startsWith("ChIJ")) {
      return NextResponse.json({
        error: "Invalid Place ID. Please re-verify your business from the Profile page.",
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
