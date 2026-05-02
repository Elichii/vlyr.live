import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * Google OAuth Callback Handler
 * 
 * 1. Exchanges auth code for tokens
 * 2. Fetches user's Google profile (email, name)
 * 3. Fetches managed businesses from Google Business Profile API
 * 4. Stores Google account info and marks as google_signed_in
 * 5. Redirects to business URL verification step
 */

interface DebugInfo {
  tokenExchange: "success" | "failed"
  profileFetch: "success" | "failed"
  scopesGranted: string[]
  hasBusinessManageScope: boolean
  accountsApiStatus: number | null
  accountsApiResponse: unknown
  accountsApiRawResponse?: string
  accountsData?: { accounts?: Array<{ name: string; type?: string }> }
  accountsCount: number
  accountsApiError?: { status: number; message: string }
  locationsApiResponses: Array<{
    accountName: string
    status: number
    response: unknown
  }>
  totalLocationsFound: number
  errors: string[]
  scopeCheck?: {
    hasBusinessScope: boolean
    grantedScopes: string[]
  }
}

export async function GET(request: NextRequest) {
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET

  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const error = searchParams.get("error")

  // Determine redirect destination based on state prefix
  const isOnboarding = state?.startsWith("onboarding_")
  const baseRedirect = isOnboarding ? "/onboarding" : "/dashboard/profile"

  // Use the same base URL for all redirects
  const baseUrl = "https://v0-vlyr-product-engine.vercel.app"

  // Initialize debug info
  const debugInfo: DebugInfo = {
    tokenExchange: "failed",
    profileFetch: "failed",
    scopesGranted: [],
    hasBusinessManageScope: false,
    accountsApiStatus: null,
    accountsApiResponse: null,
    accountsCount: 0,
    locationsApiResponses: [],
    totalLocationsFound: 0,
    errors: []
  }

  // Redirect errors to success page (which handles both success and error)
  const errorRedirect = (errMsg: string) => {
    const errorUrl = new URL("/auth/google/success", baseUrl)
    errorUrl.searchParams.set("error", errMsg)
    errorUrl.searchParams.set("debugInfo", JSON.stringify(debugInfo))
    return NextResponse.redirect(errorUrl.toString())
  }

  if (error) {
    debugInfo.errors.push(`OAuth error: ${error}`)
    return errorRedirect(error)
  }

  if (!code) {
    debugInfo.errors.push("Missing auth code")
    return errorRedirect("missing_auth_code")
  }

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    debugInfo.errors.push("Google credentials not configured")
    return errorRedirect("Google_credentials_not_configured")
  }

  try {
    // Build redirect URI (must match the one used in /api/google/auth)
    const redirectUri = `${baseUrl}/api/google/callback`

    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    })

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text()
      console.error("[v0] Token exchange failed:", errText)
      debugInfo.errors.push(`Token exchange failed: ${errText}`)
      return errorRedirect("token_exchange_failed")
    }

    const tokens = await tokenResponse.json()
    const { access_token, refresh_token, scope, expires_in } = tokens
    debugInfo.tokenExchange = "success"
    
    // Log token info (refresh_token only comes on first consent)
    console.log("[v0] Token exchange success - has refresh_token:", !!refresh_token, "expires_in:", expires_in)

    // Parse and check scopes
    const grantedScopes = scope ? scope.split(" ") : []
    debugInfo.scopesGranted = grantedScopes
    debugInfo.hasBusinessManageScope = grantedScopes.some((s: string) => 
      s.includes("business.manage") || s.includes("business")
    )

    console.log("[v0] Granted scopes:", grantedScopes)
    console.log("[v0] Has business.manage scope:", debugInfo.hasBusinessManageScope)
    
    // Store scope check for later verification
    debugInfo.scopeCheck = {
      hasBusinessScope: debugInfo.hasBusinessManageScope,
      grantedScopes: grantedScopes
    }

    // Fetch user's Google profile
    const profileResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      { headers: { Authorization: `Bearer ${access_token}` } }
    )

    if (!profileResponse.ok) {
      debugInfo.errors.push("Failed to get profile")
      return errorRedirect("failed_to_get_profile")
    }

    const profile = await profileResponse.json()
    const googleEmail = profile.email
    const googleName = profile.name || profile.given_name || ""
    const googleId = profile.id
    debugInfo.profileFetch = "success"

    // Fetch user's managed business accounts from Google Business Profile API
    let managedBusinesses: Array<{ 
      locationId: string; 
      placeId: string | null; 
      businessName: string; 
      address: string | null;
      postalCode?: string | null;
      accountType: string;
      accountName: string;
    }> = []
    
    try {
      console.log("[v0] Fetching Google Business Profile locations...")
      
      // APPROACH 1: Try the Account Management API first to get accounts
      const accountsUrl = "https://mybusinessaccountmanagement.googleapis.com/v1/accounts"
      console.log("[v0] Calling accounts API:", accountsUrl)
      
      const accountsResponse = await fetch(accountsUrl, {
        headers: { Authorization: `Bearer ${access_token}` }
      })
      
      const accountsRawText = await accountsResponse.text()
      console.log("[v0] Accounts API Status:", accountsResponse.status)
      console.log("[v0] Accounts API Raw Response:", accountsRawText.substring(0, 500))
      
      debugInfo.accountsApiStatus = accountsResponse.status
      debugInfo.accountsApiRawResponse = accountsRawText.substring(0, 1000)
      debugInfo.accountsApiError = accountsResponse.ok ? null : accountsRawText
      
      let accounts: Array<{ name: string; type?: string; accountName?: string }> = []
      
      if (accountsResponse.ok) {
        try {
          const accountsData = JSON.parse(accountsRawText)
          accounts = accountsData.accounts || []
          debugInfo.accountsData = accountsData
          debugInfo.accountsCount = accounts.length
          console.log("[v0] Found", accounts.length, "account(s)")
        } catch (e) {
          console.log("[v0] Failed to parse accounts response:", e)
        }
      }
      
      // APPROACH 2: For each account, fetch locations
      for (const account of accounts) {
        const accountName = account.name // e.g., "accounts/123456789"
        const locationsUrl = `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name,title,metadata,storefrontAddress`
        
        console.log("[v0] Fetching locations for account:", accountName)
        
        const locResponse = await fetch(locationsUrl, {
          headers: { Authorization: `Bearer ${access_token}` }
        })
        
        const locRawText = await locResponse.text()
        console.log("[v0] Locations for", accountName, "- Status:", locResponse.status, "Response:", locRawText.substring(0, 300))
        
        debugInfo.locationsApiResponses.push({
          accountName,
          status: locResponse.status,
          response: locRawText.substring(0, 300)
        })
        
        if (locResponse.ok) {
          try {
            const locData = JSON.parse(locRawText)
            if (locData.locations) {
              for (const location of locData.locations) {
                const placeId = location.metadata?.placeId || null
                const address = location.storefrontAddress?.addressLines?.join(", ") || null
                const postalCode = location.storefrontAddress?.postalCode || null
                
                managedBusinesses.push({
                  locationId: location.name || "",
                  placeId,
                  businessName: location.title || "Unknown Business",
                  address,
                  postalCode,
                  accountType: account.type || "PERSONAL",
                  accountName: accountName
                })
                console.log("[v0] Added business:", location.title, "PlaceID:", placeId)
              }
            }
          } catch (e) {
            console.log("[v0] Failed to parse locations:", e)
          }
        }
      }
      
      // APPROACH 3: Also try wildcard query as fallback for Modern Experience businesses
      const wildcardUrl = "https://mybusinessbusinessinformation.googleapis.com/v1/accounts/-/locations?readMask=name,title,metadata.placeId,storefrontAddress"
      
      console.log("[v0] Calling wildcard locations API:", wildcardUrl)
      
      const wildcardResponse = await fetch(wildcardUrl, { 
        headers: { Authorization: `Bearer ${access_token}` } 
      })
      
      const wildcardRawText = await wildcardResponse.text()
      console.log("[v0] Wildcard API Status:", wildcardResponse.status)
      console.log("[v0] Wildcard API Raw Response:", wildcardRawText.substring(0, 1000))
      
      // Store response in debug info
      debugInfo.locationsApiResponses.push({
        accountName: "wildcard",
        status: wildcardResponse.status,
        response: wildcardRawText.substring(0, 500) // Truncate for storage
      })
      
      // Handle rate limiting
      if (wildcardResponse.status === 429) {
        debugInfo.errors.push("Rate limit exceeded. Please wait a minute and try again.")
      }
      
      if (wildcardResponse.ok) {
        try {
          const wildcardData = JSON.parse(wildcardRawText)
          console.log("[v0] Parsed wildcard data:", JSON.stringify(wildcardData, null, 2))
          
          if (wildcardData.locations && wildcardData.locations.length > 0) {
            console.log("[v0] SUCCESS: Found", wildcardData.locations.length, "location(s) via wildcard!")
            
            for (const location of wildcardData.locations) {
              // Check if we already have this location from the accounts approach
              const locationId = location.name || ""
              const alreadyExists = managedBusinesses.some(b => b.locationId === locationId)
              
              if (alreadyExists) {
                console.log("[v0] Skipping duplicate location:", location.title)
                continue
              }
              
              // Extract Place ID from metadata
              let placeId: string | null = location.metadata?.placeId || null
              
              console.log("[v0] Processing location:", location.title, "metadata:", JSON.stringify(location.metadata))
              
              if (!placeId && location.metadata?.mapsUri) {
                const mapsUri = location.metadata.mapsUri
                const cidMatch = mapsUri.match(/cid=(\d+)/)
                if (cidMatch) placeId = `cid:${cidMatch[1]}`
                const placeIdMatch = mapsUri.match(/place_id[=:]([^&\s]+)/)
                if (placeIdMatch) placeId = placeIdMatch[1]
              }
              
              const address = location.storefrontAddress?.addressLines?.join(", ") || null
              const postalCode = location.storefrontAddress?.postalCode || null
              
              managedBusinesses.push({
                locationId: locationId,
                placeId: placeId,
                businessName: location.title || "Unknown Business",
                address: address,
                postalCode: postalCode,
                accountType: "WILDCARD_MODERN",
                accountName: location.name?.split('/')[1] || "unknown"
              })
              
              console.log("[v0] Added via wildcard:", location.title, "PlaceID:", placeId, "Address:", address)
            }
            
            debugInfo.totalLocationsFound = managedBusinesses.length
          } else {
            console.log("[v0] Wildcard returned OK but no locations in response")
            debugInfo.errors.push("Wildcard query OK but no locations found")
          }
        } catch (parseErr) {
          console.error("[v0] Failed to parse wildcard response:", parseErr)
          debugInfo.errors.push(`Failed to parse wildcard: ${String(parseErr)}`)
        }
      } else {
        // Handle different error codes
        if (wildcardResponse.status === 429) {
          debugInfo.errors.push("Rate limit exceeded. Please wait 1-2 minutes and try again.")
        } else if (wildcardResponse.status === 403) {
          debugInfo.errors.push("API access denied. Make sure Google Business Profile API is enabled.")
        } else if (wildcardResponse.status === 401) {
          debugInfo.errors.push("Authentication failed. Please sign in again.")
        } else {
          debugInfo.errors.push(`API error ${wildcardResponse.status}: ${wildcardRawText.substring(0, 200)}`)
        }
      }
    } catch (bizErr) {
      console.error("[v0] Error in business profile fetch:", bizErr)
      debugInfo.errors.push(`Business profile fetch error: ${String(bizErr)}`)
    }

    debugInfo.totalLocationsFound = managedBusinesses.length

    // Try to get current user and store data, but don't fail if not authenticated
    // The popup window may not have access to the same session cookies
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      // Store Google account info, tokens, managed businesses, and debug info
      const updateData: Record<string, unknown> = {
        google_email: googleEmail,
        google_account_name: googleName,
        google_managed_businesses: managedBusinesses.length > 0 ? managedBusinesses : null,
        google_debug_info: debugInfo,
        google_access_token: access_token,
        google_token_expires_at: expires_in ? new Date(Date.now() + expires_in * 1000).toISOString() : null,
      }
      
      // Only update refresh_token if we received one (first consent only)
      // This prevents overwriting existing refresh_token with null on subsequent logins
      if (refresh_token) {
        updateData.google_refresh_token = refresh_token
        console.log("[v0] Storing new refresh_token for user:", user.id)
      }
      
      await supabase.from("merchants").update(updateData).eq("id", user.id)
    } else {
      // User not authenticated in popup - that's okay, we'll pass data via URL params
      // The parent window will handle storing the data
      console.log("[v0] No Supabase user in popup - will pass data to parent window")
    }

    // Check if this is redirect mode (state starts with "redirect_")
    const isRedirectMode = state?.startsWith("redirect_")
    
    if (isRedirectMode) {
      // Redirect mode: go directly back to onboarding page
      // Data is already stored in database, page will fetch it
      if (user) {
        await supabase.from("merchants").update({
          google_connected: true
        }).eq("id", user.id)
      }
      
      // Always redirect back to onboarding in redirect mode with step param
      const returnUrl = new URL("/onboarding", baseUrl)
      returnUrl.searchParams.set("step", "google-connect")
      returnUrl.searchParams.set("oauth_complete", "true")
      return NextResponse.redirect(returnUrl)
    }
    
    // Popup mode: Redirect to success page (which will post message to parent window)
    const successUrl = new URL("/auth/google/success", baseUrl)
    successUrl.searchParams.set("success", "true")
    successUrl.searchParams.set("email", googleEmail)
    successUrl.searchParams.set("name", googleName)
    successUrl.searchParams.set("googleId", googleId || "")
    successUrl.searchParams.set("businessCount", String(managedBusinesses.length))
    successUrl.searchParams.set("managedBusinesses", JSON.stringify(managedBusinesses))
    successUrl.searchParams.set("debugInfo", JSON.stringify(debugInfo))
    successUrl.searchParams.set("accessToken", access_token)
    if (refresh_token) {
      successUrl.searchParams.set("refreshToken", refresh_token)
    }

    return NextResponse.redirect(successUrl.toString())

  } catch (err) {
    console.error("[v0] Callback error:", err)
    debugInfo.errors.push(`Callback error: ${String(err)}`)
    return errorRedirect("callback_failed")
  }
}
