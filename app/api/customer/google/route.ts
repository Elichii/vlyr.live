/**
 * GET /api/customer/google?c=V-XXXXXXXX
 *
 * Starts "Sign in with Google" for a customer who scanned a sticker.
 * Only basic profile scopes (no Google approval needed). Google returns to
 * the shared /api/google/callback, which finishes the sign-in.
 */
import { NextRequest, NextResponse } from "next/server"
import { CUSTOMER_NONCE_COOKIE, encodeCustomerState } from "@/lib/customer-session"
import { isLabelCode } from "@/lib/pulse"
import { publicOrigin, publicUrl } from "@/lib/public-origin"

export async function GET(request: NextRequest) {
  const code = (request.nextUrl.searchParams.get("c") ?? "").trim().toUpperCase()
  if (!isLabelCode(code)) return NextResponse.redirect(publicUrl(request, "/fallback"))

  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) return NextResponse.redirect(publicUrl(request, `/pulse?c=${code}&error=google_not_configured`))

  const origin = publicOrigin(request)
  const nonce = crypto.randomUUID()
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth")
  authUrl.searchParams.set("client_id", clientId)
  authUrl.searchParams.set("redirect_uri", `${origin}/api/google/callback`)
  authUrl.searchParams.set("response_type", "code")
  authUrl.searchParams.set("scope", "openid email profile")
  authUrl.searchParams.set("prompt", "select_account")
  authUrl.searchParams.set("state", encodeCustomerState(code, nonce))

  const res = NextResponse.redirect(authUrl)
  res.cookies.set(CUSTOMER_NONCE_COOKIE, nonce, {
    httpOnly: true,
    sameSite: "lax",
    secure: origin.startsWith("https://"),
    path: "/api/google",
    maxAge: 60 * 15,
  })
  return res
}
