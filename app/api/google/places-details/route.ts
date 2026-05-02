import { NextRequest, NextResponse } from "next/server"

// Fetch business details from Google Places API for baseline analytics
export async function GET(request: NextRequest) {
  const placeId = request.nextUrl.searchParams.get("placeId")
  
  if (!placeId) {
    return NextResponse.json({ error: "Missing placeId" }, { status: 400 })
  }
  
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    // Return empty baseline if no API key
    return NextResponse.json({
      rating: null,
      reviewCount: null,
      address: null,
      phone: null,
      website: null
    })
  }
  
  try {
    const url = `https://places.googleapis.com/v1/places/${placeId}?fields=rating,userRatingCount,formattedAddress,internationalPhoneNumber,websiteUri`
    const response = await fetch(url, {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "rating,userRatingCount,formattedAddress,internationalPhoneNumber,websiteUri"
      }
    })
    
    if (!response.ok) {
      return NextResponse.json({
        rating: null,
        reviewCount: null,
        address: null,
        phone: null,
        website: null
      })
    }
    
    const data = await response.json()
    return NextResponse.json({
      rating: data.rating || null,
      reviewCount: data.userRatingCount || null,
      address: data.formattedAddress || null,
      phone: data.internationalPhoneNumber || null,
      website: data.websiteUri || null
    })
  } catch {
    return NextResponse.json({
      rating: null,
      reviewCount: null,
      address: null,
      phone: null,
      website: null
    })
  }
}
