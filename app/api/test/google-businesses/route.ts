import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * Simple test endpoint to fetch businesses from Google Business Profile API
 * This isolates the API call to debug what Google returns
 * 
 * Visit: /api/test/google-businesses
 */
export async function GET() {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }
  
  // Get stored access token
  const { data: merchant } = await supabase
    .from("merchants")
    .select("google_access_token, google_email")
    .eq("id", user.id)
    .single()
  
  if (!merchant?.google_access_token) {
    return NextResponse.json({ 
      error: "No Google access token found",
      hint: "Complete Google OAuth first"
    }, { status: 400 })
  }
  
  const accessToken = merchant.google_access_token
  const results: Record<string, unknown> = {
    googleEmail: merchant.google_email,
    timestamp: new Date().toISOString()
  }
  
  // TEST 1: Fetch accounts
  console.log("[v0] Testing Google Business API - Fetching accounts...")
  const accountsUrl = "https://mybusinessaccountmanagement.googleapis.com/v1/accounts"
  
  try {
    const accountsRes = await fetch(accountsUrl, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
    const accountsText = await accountsRes.text()
    
    results.accountsApi = {
      status: accountsRes.status,
      statusText: accountsRes.statusText,
      response: accountsText
    }
    
    console.log("[v0] Accounts API Status:", accountsRes.status)
    console.log("[v0] Accounts API Response:", accountsText)
    
    // If we got accounts, try fetching locations for each
    if (accountsRes.ok) {
      try {
        const accountsData = JSON.parse(accountsText)
        results.accountsParsed = accountsData
        
        if (accountsData.accounts && accountsData.accounts.length > 0) {
          results.locations = []
          
          for (const account of accountsData.accounts) {
            const locUrl = `https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations?readMask=name,title,storefrontAddress`
            
            const locRes = await fetch(locUrl, {
              headers: { Authorization: `Bearer ${accessToken}` }
            })
            const locText = await locRes.text()
            
            ;(results.locations as Array<unknown>).push({
              accountName: account.name,
              status: locRes.status,
              response: locText
            })
          }
        }
      } catch (parseErr) {
        results.parseError = String(parseErr)
      }
    }
  } catch (fetchErr) {
    results.accountsError = String(fetchErr)
  }
  
  // TEST 2: Try wildcard query (for Modern Experience businesses)
  console.log("[v0] Testing wildcard locations API...")
  const wildcardUrl = "https://mybusinessbusinessinformation.googleapis.com/v1/accounts/-/locations?readMask=name,title,storefrontAddress,metadata"
  
  try {
    const wildcardRes = await fetch(wildcardUrl, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
    const wildcardText = await wildcardRes.text()
    
    results.wildcardApi = {
      status: wildcardRes.status,
      statusText: wildcardRes.statusText,
      response: wildcardText
    }
    
    console.log("[v0] Wildcard API Status:", wildcardRes.status)
    console.log("[v0] Wildcard API Response:", wildcardText)
  } catch (wildcardErr) {
    results.wildcardError = String(wildcardErr)
  }
  
  return NextResponse.json(results, { status: 200 })
}
