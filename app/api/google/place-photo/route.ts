/**
 * GET /api/google/place-photo?ref=<photo_reference>
 *
 * Serves a Google Places photo without putting our API key in the page.
 * Signed-in users only, so it can't be used as an open proxy.
 */
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse(null, { status: 401 })

  const ref = request.nextUrl.searchParams.get("ref") ?? ""
  const key = process.env.GOOGLE_PLACES_API_KEY
  if (!key || !/^[A-Za-z0-9_-]{20,1000}$/.test(ref)) return new NextResponse(null, { status: 400 })

  const res = await fetch(`https://maps.googleapis.com/maps/api/place/photo?maxwidth=1200&photo_reference=${ref}&key=${key}`).catch(() => null)
  const type = res?.headers.get("content-type") ?? ""
  if (!res?.ok || !type.startsWith("image/")) return new NextResponse(null, { status: 404 })
  return new NextResponse(await res.arrayBuffer(), {
    headers: { "Content-Type": type, "Cache-Control": "private, max-age=86400" },
  })
}
