/**
 * GET /api/google/site-logo?site=<business website>
 *
 * The logo from a business's own website, shown when its Google Business
 * Profile has no logo. Signed-in users only; see lib/google/site-logo.ts.
 */
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { fetchSiteLogo } from "@/lib/google/site-logo"

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse(null, { status: 401 })

  const logo = await fetchSiteLogo(request.nextUrl.searchParams.get("site")).catch(() => null)
  if (!logo) return new NextResponse(null, { status: 404 })
  return new NextResponse(Buffer.from(logo.bytes), {
    headers: { "Content-Type": logo.type, "Cache-Control": "private, max-age=86400" },
  })
}
