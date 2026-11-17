/**
 * GET /api/google/media?u=<googleusercontent url>&size=logo|cover
 *
 * Shows Business Profile photos (logo, cover) through our server: Google
 * serves the originals full size and rate-limits pages that load them
 * directly. Only Google image hosts are allowed, for signed-in users.
 */
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const SIZES = { logo: "=s256-c", cover: "=w1600-h640-c" } as const

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse(null, { status: 401 })

  let src: URL
  try {
    src = new URL(request.nextUrl.searchParams.get("u") ?? "")
  } catch {
    return new NextResponse(null, { status: 400 })
  }
  if (src.protocol !== "https:" || !/^lh\d\.googleusercontent\.com$/.test(src.hostname)) return new NextResponse(null, { status: 400 })

  const size = SIZES[(request.nextUrl.searchParams.get("size") as keyof typeof SIZES) ?? "cover"] ?? SIZES.cover
  // Replace Google's size suffix (e.g. "=s0") with the one we need
  const path = src.pathname.replace(/=[^/]*$/, "") + size
  const res = await fetch(`https://${src.hostname}${path}`).catch(() => null)
  const type = res?.headers.get("content-type") ?? ""
  if (!res?.ok || !type.startsWith("image/")) return new NextResponse(null, { status: 404 })
  return new NextResponse(await res.arrayBuffer(), {
    headers: { "Content-Type": type, "Cache-Control": "private, max-age=86400" },
  })
}
