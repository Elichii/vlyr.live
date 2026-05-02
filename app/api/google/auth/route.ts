import { NextRequest, NextResponse } from "next/server"

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
  const state = isRedirectMode ? `redirect_${Date.now()}` : (searchParams.get("state") || `profile_${Date.now()}`)
  
  // Build redirect URI - use Vercel production URL (allowed by Google)
  // TODO: Update this domain when deploying to custom domain
  const baseUrl = "https://v0-vlyr-product-engine.vercel.app"
  const redirectUri = `${baseUrl}/api/google/callback`

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

  return NextResponse.redirect(authUrl.toString())
}
