import { NextRequest, NextResponse } from "next/server"

const BROWSER_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"

async function followGoogleShortUrl(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: {
        "User-Agent": BROWSER_UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    })

    // If fetch followed HTTP redirects to a real Maps URL, use it
    if (res.url && res.url !== url && res.url.includes("google.com/maps")) {
      return res.url
    }

    // Otherwise parse the HTML for the real destination
    const html = await res.text()

    // meta refresh: content="0; url=https://..."
    const metaRefresh = html.match(/content=["']?\d+;\s*url=([^"'\s>]+)/i)
    if (metaRefresh) return decodeURIComponent(metaRefresh[1].replace(/&amp;/g, "&"))

    // canonical link tag
    const canonical = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)
    if (canonical) return canonical[1]

    // og:url meta tag
    const ogUrl = html.match(/<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)["']/i)
    if (ogUrl) return ogUrl[1]

    // window.location = "..." in inline script
    const jsLocation = html.match(/window\.location(?:\.href)?\s*=\s*["']([^"']+)["']/)
    if (jsLocation) return jsLocation[1]

    return res.url || url
  } catch {
    return url
  }
}

function extractPlaceId(url: string): string | null {
  // place_id=XXX query param
  const qpMatch = url.match(/[?&]place_id=([A-Za-z0-9_-]+)/)
  if (qpMatch) return qpMatch[1]

  // data= segment: !1sChIJxxx (standard Place ID)
  const dataMatch = url.match(/[!&]1s(Ch[A-Za-z0-9_-]{10,})/)
  if (dataMatch) return dataMatch[1]

  // !1s followed by any alphanumeric (catches non-Ch prefixes)
  const data2 = url.match(/data=.*?!1s([A-Za-z0-9_-]{10,})/)
  if (data2 && !data2[1].match(/^\d+$/)) return data2[1]

  // ftid=0x... — hexadecimal feature ID → convert to decimal CID
  const ftidMatch = url.match(/ftid=0x([0-9a-fA-F]+)/)
  if (ftidMatch) {
    try {
      const cid = BigInt(`0x${ftidMatch[1]}`).toString()
      return `cid:${cid}`
    } catch {
      // BigInt failed, skip
    }
  }

  // cid=NNNN numeric
  const cidMatch = url.match(/[?&]cid=(\d+)/)
  if (cidMatch) return `cid:${cidMatch[1]}`

  return null
}

function extractBusinessName(url: string): string | null {
  const match = url.match(/\/place\/([^/@?#]+)/)
  if (!match) return null
  try {
    return decodeURIComponent(match[1].replace(/\+/g, " "))
  } catch {
    return match[1].replace(/\+/g, " ")
  }
}

// Resolve a Google Maps URL to a Place ID
export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    let resolvedUrl = url.trim()

    // Follow short-URL redirects (maps.app.goo.gl, goo.gl, g.co)
    if (
      resolvedUrl.includes("goo.gl") ||
      resolvedUrl.includes("g.co") ||
      resolvedUrl.includes("maps.app")
    ) {
      resolvedUrl = await followGoogleShortUrl(resolvedUrl)
    }

    let placeId = extractPlaceId(resolvedUrl)
    let businessName = extractBusinessName(resolvedUrl)
    let address: string | null = null

    // Enrich with Places API if we have a real Place ID (not CID)
    if (placeId && !placeId.startsWith("cid:") && process.env.GOOGLE_PLACES_API_KEY) {
      try {
        const detailsRes = await fetch(
          `https://places.googleapis.com/v1/places/${placeId}?fields=displayName,formattedAddress`,
          {
            headers: {
              "X-Goog-Api-Key": process.env.GOOGLE_PLACES_API_KEY,
              "X-Goog-FieldMask": "displayName,formattedAddress",
            },
          }
        )
        if (detailsRes.ok) {
          const details = await detailsRes.json()
          businessName = details.displayName?.text || businessName
          address = details.formattedAddress || null
        }
      } catch {
        // silent
      }
    }

    // Last resort: text search by business name extracted from the URL
    if (!placeId && businessName && process.env.GOOGLE_PLACES_API_KEY) {
      try {
        const searchRes = await fetch("https://places.googleapis.com/v1/places:searchText", {
          method: "POST",
          headers: {
            "X-Goog-Api-Key": process.env.GOOGLE_PLACES_API_KEY,
            "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ textQuery: businessName, maxResultCount: 1 }),
        })
        if (searchRes.ok) {
          const searchData = await searchRes.json()
          const first = searchData.places?.[0]
          if (first) {
            placeId = first.id
            businessName = first.displayName?.text || businessName
            address = first.formattedAddress || null
          }
        }
      } catch {
        // silent
      }
    }

    if (!placeId) {
      return NextResponse.json(
        {
          error: "Could not extract Place ID from URL. Please use a Google Maps share link.",
          hint: "Open Google Maps → search your business → tap Share → copy the link.",
          resolvedUrl,
        },
        { status: 400 }
      )
    }

    return NextResponse.json({ placeId, businessName, address, resolvedUrl })
  } catch (error) {
    console.error("[v0] Error resolving place URL:", error)
    return NextResponse.json({ error: "Failed to resolve URL" }, { status: 500 })
  }
}
