/**
 * Address / business typeahead for the "Your business" step.
 *
 * GET /api/google/places-autocomplete?q=910 17th st&session=<uuid>
 *   -> { suggestions: [{ placeId, main, secondary }] }
 * GET /api/google/places-autocomplete?placeId=ChIJ...&session=<uuid>
 *   -> { place: { placeId, name, address, lat, lng } }
 *
 * Runs on the server so the Google key stays private. A session token ties
 * the typing and the final pick together (Google bills it as one lookup).
 */
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  const key = process.env.GOOGLE_PLACES_API_KEY
  if (!key) return NextResponse.json({ suggestions: [] })
  const sp = request.nextUrl.searchParams
  const session = (sp.get("session") ?? "").replace(/[^A-Za-z0-9-]/g, "").slice(0, 64)

  const placeId = sp.get("placeId")
  if (placeId) {
    const url = new URL("https://maps.googleapis.com/maps/api/place/details/json")
    url.searchParams.set("place_id", placeId)
    url.searchParams.set("fields", "place_id,name,formatted_address,geometry")
    if (session) url.searchParams.set("sessiontoken", session)
    url.searchParams.set("key", key)
    const d = await (await fetch(url)).json().catch(() => null)
    const r = d?.result
    if (d?.status !== "OK" || !r?.geometry?.location) return NextResponse.json({ error: "Couldn't load that place." }, { status: 404 })
    return NextResponse.json({
      place: { placeId: r.place_id, name: r.name ?? null, address: r.formatted_address ?? "", lat: r.geometry.location.lat, lng: r.geometry.location.lng },
    })
  }

  const q = (sp.get("q") ?? "").trim().slice(0, 200)
  if (q.length < 3) return NextResponse.json({ suggestions: [] })
  const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json")
  url.searchParams.set("input", q)
  if (session) url.searchParams.set("sessiontoken", session)
  const near = sp.get("near")
  if (near && /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(near)) {
    url.searchParams.set("location", near)
    url.searchParams.set("radius", "50000")
  }
  url.searchParams.set("key", key)
  const d = await (await fetch(url)).json().catch(() => null)
  const suggestions = (d?.predictions ?? []).slice(0, 6).map((p: { place_id: string; description: string; structured_formatting?: { main_text?: string; secondary_text?: string } }) => ({
    placeId: p.place_id,
    main: p.structured_formatting?.main_text ?? p.description,
    secondary: p.structured_formatting?.secondary_text ?? "",
  }))
  return NextResponse.json({ suggestions })
}
