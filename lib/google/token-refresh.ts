/**
 * Google OAuth Token Refresh Utility
 * 
 * Handles automatic refresh of Google OAuth access tokens using refresh tokens.
 * Access tokens expire after ~1 hour, so we need to refresh them before making API calls.
 */

import { createClient } from "@/lib/supabase/server"

interface TokenRefreshResult {
  success: boolean
  accessToken?: string
  error?: string
  expiresAt?: string
}

interface GoogleTokenResponse {
  access_token: string
  expires_in: number
  token_type: string
  scope: string
  error?: string
  error_description?: string
}

/**
 * Refresh the Google OAuth access token for a merchant
 * 
 * @param merchantId - The merchant's UUID
 * @returns TokenRefreshResult with the new access token or error
 */
export async function refreshGoogleToken(merchantId: string): Promise<TokenRefreshResult> {
  const supabase = await createClient()
  
  // Get merchant's refresh token
  const { data: merchant, error: fetchError } = await supabase
    .from("merchants")
    .select("google_refresh_token, google_access_token, google_token_expires_at")
    .eq("id", merchantId)
    .single()
  
  if (fetchError || !merchant) {
    return { success: false, error: "Merchant not found" }
  }
  
  if (!merchant.google_refresh_token) {
    return { success: false, error: "No refresh token available. User needs to re-authenticate with Google." }
  }
  
  // Check if current token is still valid (with 5 minute buffer)
  if (merchant.google_token_expires_at) {
    const expiresAt = new Date(merchant.google_token_expires_at)
    const bufferTime = 5 * 60 * 1000 // 5 minutes
    if (expiresAt.getTime() - bufferTime > Date.now()) {
      // Token is still valid
      return { 
        success: true, 
        accessToken: merchant.google_access_token,
        expiresAt: merchant.google_token_expires_at
      }
    }
  }
  
  // Token is expired or about to expire - refresh it
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  
  if (!clientId || !clientSecret) {
    return { success: false, error: "Google OAuth credentials not configured" }
  }
  
  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: merchant.google_refresh_token,
        grant_type: "refresh_token",
      }),
    })
    
    const data: GoogleTokenResponse = await response.json()
    
    if (data.error) {
      // If refresh token is invalid, user needs to re-authenticate
      if (data.error === "invalid_grant") {
        await supabase.from("merchants").update({
          google_refresh_token: null,
          google_access_token: null,
          google_token_expires_at: null,
        }).eq("id", merchantId)
        
        return { 
          success: false, 
          error: "Google authorization expired. User needs to re-connect their Google account." 
        }
      }
      return { success: false, error: data.error_description || data.error }
    }
    
    // Calculate new expiration time
    const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString()
    
    // Store new access token
    await supabase.from("merchants").update({
      google_access_token: data.access_token,
      google_token_expires_at: expiresAt,
    }).eq("id", merchantId)
    
    return { 
      success: true, 
      accessToken: data.access_token,
      expiresAt
    }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to refresh token" 
    }
  }
}

/**
 * Get a valid Google access token for a merchant
 * Automatically refreshes if expired
 * 
 * @param merchantId - The merchant's UUID
 * @returns The valid access token or null if unavailable
 */
export async function getValidGoogleToken(merchantId: string): Promise<string | null> {
  const result = await refreshGoogleToken(merchantId)
  return result.success ? result.accessToken || null : null
}
