import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { publicOrigin } from "@/lib/public-origin"

/**
 * Supabase email links (password reset, confirmations) land here with a
 * one-time code. We exchange it for a session, then go to `next`.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const origin = publicOrigin(request)
  const code = searchParams.get("code")
  const rawNext = searchParams.get("next") ?? "/dashboard"
  // Only allow paths on this site
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard"

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Expired or already-used reset links: send them to ask for a new one
  if (next === "/auth/reset-password") {
    return NextResponse.redirect(`${origin}/auth/forgot-password?expired=1`)
  }
  return NextResponse.redirect(`${origin}/auth/error`)
}
