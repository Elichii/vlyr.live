import { NextRequest, NextResponse } from "next/server"

// Resolve a Google Maps URL to a Place ID
export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()
    
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }
    
    let resolvedUrl = url.trim()
    let placeId: string | null = null
    let businessName: string | null = null
    let address: string | null = null
    
    // Handle shortened URLs (maps.app.goo.gl, g.co/kgs, etc.)
    if (resolvedUrl.includes("goo.gl") || resolvedUrl.includes("g.co")) {
      try {
        const response = await fetch(resolvedUrl, { redirect: "follow" })
        resolvedUrl = response.url
      } catch {
        // Continue with original URL
      }
    }
    
    // Extract Place ID from various URL formats
    // Format: place_id=XXX or !1s followed by hex
    const placeIdMatch = resolvedUrl.match(/place_id[=:]([A-Za-z0-9_-]+)/)
    if (placeIdMatch) {
      placeId = placeIdMatch[1]
    }
    
    // Format: /place/Business+Name/@lat,lng,zoom/data=...!1sChXXX
    const dataMatch = resolvedUrl.match(/data=.*!1s(Ch[A-Za-z0-9_-]+)/)
    if (!placeId && dataMatch) {
      placeId = dataMatch[1]
    }
    
    // Format: CID in URL
    const cidMatch = resolvedUrl.match(/cid[=:](\d+)/)
    if (!placeId && cidMatch) {
      placeId = `cid:${cidMatch[1]}`
    }
    
    // Extract business name from URL if possible
    const placeNameMatch = resolvedUrl.match(/\/place\/([^/@]+)/)
    if (placeNameMatch) {
      businessName = decodeURIComponent(placeNameMatch[1].replace(/\+/g, " "))
    }
    
    // If we have a Place ID, try to get more details
    if (placeId && !placeId.startsWith("cid:") && process.env.GOOGLE_PLACES_API_KEY) {
      try {
        const detailsUrl = `https://places.googleapis.com/v1/places/${placeId}?fields=displayName,formattedAddress`
        const detailsRes = await fetch(detailsUrl, {
          headers: {
            "X-Goog-Api-Key": process.env.GOOGLE_PLACES_API_KEY,
            "X-Goog-FieldMask": "displayName,formattedAddress"
          }
        })
        
        if (detailsRes.ok) {
          const details = await detailsRes.json()
          businessName = details.displayName?.text || businessName
          address = details.formattedAddress || null
        }
      } catch {
        // Silent fail, use what we have
      }
    }
    
    if (!placeId) {
      return NextResponse.json({ 
        error: "Could not extract Place ID from URL. Please use a Google Maps share link.",
        hint: "Go to Google Maps, search for your business, click Share, and copy the link."
      }, { status: 400 })
    }
    
    return NextResponse.json({
      placeId,
      businessName,
      address,
      resolvedUrl
    })
    
  } catch (error) {
    console.error("[v0] Error resolving place URL:", error)
    return NextResponse.json({ 
      error: "Failed to resolve URL" 
    }, { status: 500 })
  }
}
