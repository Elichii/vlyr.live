import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }
  
  const { data: merchant } = await supabase
    .from("merchants")
    .select(`
      google_email,
      google_connected,
      google_ownership_verified,
      google_managed_businesses,
      google_access_token,
      google_token_expires_at,
      google_debug_info
    `)
    .eq("id", user.id)
    .single()
  
  if (!merchant) {
    return NextResponse.json({ error: "Merchant not found" }, { status: 404 })
  }
  
  // Test the API directly with the stored access token
  let apiTest = null
  if (merchant.google_access_token) {
    try {
      // Test Account Management API
      const accountsRes = await fetch(
        "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
        { headers: { Authorization: `Bearer ${merchant.google_access_token}` } }
      )
      const accountsText = await accountsRes.text()
      
      // Test Wildcard Locations API
      const locationsRes = await fetch(
        "https://mybusinessbusinessinformation.googleapis.com/v1/accounts/-/locations?readMask=name,title",
        { headers: { Authorization: `Bearer ${merchant.google_access_token}` } }
      )
      const locationsText = await locationsRes.text()
      
      apiTest = {
        accounts: {
          status: accountsRes.status,
          response: accountsText.substring(0, 1000)
        },
        locations: {
          status: locationsRes.status,
          response: locationsText.substring(0, 1000)
        }
      }
    } catch (e) {
      apiTest = { error: String(e) }
    }
  }
  
  return NextResponse.json({
    googleEmail: merchant.google_email,
    connected: merchant.google_connected,
    verified: merchant.google_ownership_verified,
    managedBusinesses: merchant.google_managed_businesses,
    tokenExpires: merchant.google_token_expires_at,
    hasAccessToken: !!merchant.google_access_token,
    oauthDebugInfo: merchant.google_debug_info,
    apiTest
  })
}
