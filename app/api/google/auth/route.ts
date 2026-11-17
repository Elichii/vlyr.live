import { NextRequest, NextResponse } from "next/server"
import { PLAN_NOT_CHOSEN, SIGNUP_NONCE_COOKIE, encodeSignupState } from "@/lib/google-signup"
import { publicOrigin } from "@/lib/public-origin"

/**
 * GET /api/google/auth
 * Initiates Google OAuth flow for Business Profile access
 * 
 * Required env vars:
 * - GOOGLE_CLIENT_ID: OAuth client ID from Google Cloud Console
 * - GOOGLE_CLIENT_SECRET: OAuth client secret
 */
export async function GET(request: NextRequest) {
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
  
  // Check if credentials are configured
  if (!GOOGLE_CLIENT_ID) {
    const referer = request.headers.get("referer") || ""
    const isOnboarding = referer.includes("onboarding")
    const redirectPath = isOnboarding ? "/onboarding" : "/dashboard/profile"
    return NextResponse.redirect(
      new URL(`${redirectPath}?google_error=Google_credentials_not_configured`, request.url)
    )
  }

  const { searchParams } = new URL(request.url)
  const isRedirectMode = searchParams.get("redirect") === "true"
  const isSignup = searchParams.get("mode") === "signup"

  // Sign up / sign in with Google: remember the chosen plan and invite code,
  // plus a one-time nonce (also stored in a cookie) that the callback checks.
  const nonce = crypto.randomUUID()
  const state = isSignup
    ? encodeSignupState({
        plan: searchParams.get("plan") || PLAN_NOT_CHOSEN,
        cycle: searchParams.get("cycle") === "annual" ? "annual" : "monthly",
        ref: (searchParams.get("ref") || "").slice(0, 64),
        nonce,
      })
    : isRedirectMode
      ? `redirect_${Date.now()}`
      : (searchParams.get("state") || `profile_${Date.now()}`)

  // Derive base URL from the incoming request so this works on localhost AND production
  const origin = publicOrigin(request)
  const redirectUri = `${origin}/api/google/callback`

  // Scopes for Google Sign-In + Business Profile API
  // Note: business.manage requires Google approval for production use
  const scopes = [
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/business.manage",
  ].join(" ")

  // Build the Google OAuth URL
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth")
  authUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID)
  authUrl.searchParams.set("redirect_uri", redirectUri)
  authUrl.searchParams.set("response_type", "code")
  authUrl.searchParams.set("scope", scopes)
  authUrl.searchParams.set("access_type", "offline")
  authUrl.searchParams.set("prompt", "consent")
  authUrl.searchParams.set("state", state)

  const response = NextResponse.redirect(authUrl.toString())
  if (isSignup) {
    response.cookies.set(SIGNUP_NONCE_COOKIE, nonce, {
      httpOnly: true,
      sameSite: "lax",
      secure: origin.startsWith("https://"),
      path: "/api/google",
      maxAge: 60 * 15,
    })
  }
  return response
}
