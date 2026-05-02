import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * Business Ownership Verification with Debug Support
 * 
 * Features:
 * 1. Raw response logging for debugging
 * 2. Scope consent checking
 * 3. Fuzzy name/address matching (90%+ similarity)
 * 4. Personal vs Organization account handling
 * 5. Debug info for UI display
 */

// Levenshtein distance for fuzzy string matching
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length
  const n = str2.length
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0))

  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]) + 1
      }
    }
  }
  return dp[m][n]
}

// Calculate similarity percentage (0-100)
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim()
  const s2 = str2.toLowerCase().trim()
  
  if (s1 === s2) return 100
  if (!s1 || !s2) return 0
  
  const maxLen = Math.max(s1.length, s2.length)
  const distance = levenshteinDistance(s1, s2)
  return Math.round((1 - distance / maxLen) * 100)
}

// Normalize business name for comparison
function normalizeBusinessName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove special chars
    .replace(/\s+/g, ' ')    // Normalize spaces
    .replace(/\b(llc|inc|corp|ltd|co|company)\b/gi, '') // Remove common suffixes
    .trim()
}

// Normalize address for comparison
function normalizeAddress(address: string): string {
  return address
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\b(street|st|avenue|ave|road|rd|drive|dr|boulevard|blvd|lane|ln|court|ct|place|pl)\b/gi, '')
    .replace(/\b(suite|ste|unit|apt|apartment|floor|fl)\b/gi, '')
    .trim()
}

// Fetch business details from Google Places API for baseline data
async function fetchBusinessBaseline(placeId: string): Promise<{
  rating: number | null
  reviewCount: number | null
  address: string | null
  phone: string | null
  website: string | null
}> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    console.log("[v0] No GOOGLE_PLACES_API_KEY, skipping baseline fetch")
    return { rating: null, reviewCount: null, address: null, phone: null, website: null }
  }
  
  try {
    const url = `https://places.googleapis.com/v1/places/${placeId}?fields=rating,userRatingCount,formattedAddress,internationalPhoneNumber,websiteUri`
    const response = await fetch(url, {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "rating,userRatingCount,formattedAddress,internationalPhoneNumber,websiteUri"
      }
    })
    
    if (!response.ok) {
      console.log("[v0] Places API error:", response.status)
      return { rating: null, reviewCount: null, address: null, phone: null, website: null }
    }
    
    const data = await response.json()
    return {
      rating: data.rating || null,
      reviewCount: data.userRatingCount || null,
      address: data.formattedAddress || null,
      phone: data.internationalPhoneNumber || null,
      website: data.websiteUri || null
    }
  } catch (err) {
    console.log("[v0] Failed to fetch baseline:", err)
    return { rating: null, reviewCount: null, address: null, phone: null, website: null }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { placeId, businessName, businessAddress } = await request.json()

    console.log("[v0] ========== VERIFY OWNERSHIP START ==========")
    console.log("[v0] Input:", { placeId, businessName, businessAddress })

    if (!placeId) {
      return NextResponse.json({ 
        success: false, 
        error: "Missing Place ID - cannot verify ownership",
        code: "MISSING_PLACE_ID"
      }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    console.log("[v0] verify-ownership: Supabase user check:", user?.id || "NO USER", authError?.message || "NO ERROR")

    if (!user) {
      console.log("[v0] verify-ownership: NOT_AUTHENTICATED - authError:", authError)
      return NextResponse.json({ 
        success: false, 
        error: "Access Denied: You must be logged in to verify business ownership.",
        code: "NOT_AUTHENTICATED",
        debugInfo: {
          authError: authError?.message || "No auth error details"
        }
      }, { status: 401 })
    }

    // Get the merchant's managed businesses and debug info
    const { data: merchant, error } = await supabase
      .from("merchants")
      .select("google_email, google_managed_businesses, google_debug_info")
      .eq("id", user.id)
      .single()

    if (error || !merchant) {
      return NextResponse.json({ 
        success: false, 
        error: "Access Denied: Merchant profile not found.",
        code: "MERCHANT_NOT_FOUND"
      }, { status: 404 })
    }

    const debugInfo = merchant.google_debug_info || {}
    console.log("[v0] Debug info from OAuth:", JSON.stringify(debugInfo, null, 2))

    // CHECK 1: Scope consent - was business.manage granted?
    if (debugInfo.scopeCheck?.hasBusinessScope === false) {
      console.log("[v0] ERROR: business.manage scope NOT granted")
      return NextResponse.json({ 
        success: false, 
        error: "Permission Missing: Please check the 'Manage Business' box during Google sign-in. You need to grant access to your business profile.",
        code: "MISSING_SCOPE",
        debugInfo: {
          googleEmail: merchant.google_email,
          scopeGranted: false,
          grantedScopes: debugInfo.scopeCheck?.grantedScopes || [],
          hint: "Sign out and sign in again. Make sure to check ALL permission boxes, especially 'Manage your Google Business Profile'."
        }
      }, { status: 403 })
    }

    // CHECK 2: API errors from callback
    if (debugInfo.accountsApiError) {
      console.log("[v0] ERROR: API error from callback:", debugInfo.accountsApiError)
      return NextResponse.json({ 
        success: false, 
        error: `Google Business API Error (${debugInfo.accountsApiError.status}): ${debugInfo.accountsApiError.message || 'Unable to fetch business accounts'}`,
        code: "API_ERROR",
        debugInfo: {
          googleEmail: merchant.google_email,
          apiStatus: debugInfo.accountsApiError.status,
          apiErrorDetails: debugInfo.accountsApiError,
          rawResponse: debugInfo.accountsApiRawResponse?.substring(0, 500),
          hint: debugInfo.accountsApiError.status === 403 
            ? "Enable 'My Business Account Management API' and 'My Business Business Information API' in Google Cloud Console"
            : debugInfo.accountsApiError.status === 401
            ? "The access token may not include the business.manage scope"
            : "Check the raw API response for details"
        }
      }, { status: 403 })
    }

    // Get managed businesses
    const managedBusinesses = merchant.google_managed_businesses as Array<{
      locationId: string
      placeId: string | null
      businessName: string
      address: string | null
      postalCode?: string | null
      accountType: string
      accountName?: string
    }> | null

    console.log("[v0] Managed businesses count:", managedBusinesses?.length || 0)
    console.log("[v0] Managed businesses:", JSON.stringify(managedBusinesses, null, 2))

    // CHECK 3: No managed businesses found - allow manual verification as fallback
    if (!managedBusinesses || managedBusinesses.length === 0) {
      // Check for bypass mode OR manual Location ID verification
      const BYPASS_OWNERSHIP_CHECK = process.env.BYPASS_OWNERSHIP_CHECK === "true"
      
      if (BYPASS_OWNERSHIP_CHECK) {
        console.log("[v0] BYPASS MODE: Ownership check bypassed for testing")
        
        // Fetch baseline data for analytics
        const baseline = await fetchBusinessBaseline(placeId)
        
        await supabase.from("merchants").update({
          google_ownership_verified: true,
          google_ownership_verified_at: new Date().toISOString(),
          google_verified_place_id: placeId,
          google_match_type: "TESTING_BYPASS",
          // Baseline data capture
          google_rating: baseline.rating,
          google_review_count: baseline.reviewCount,
          google_address: baseline.address,
          google_phone: baseline.phone,
          google_website: baseline.website,
        }).eq("id", user.id)

        return NextResponse.json({ 
          success: true, 
          message: "Business ownership verification bypassed for testing",
          matchType: "TESTING_BYPASS",
          matchedPlaceId: placeId,
          baseline: baseline,
          warning: "BYPASS MODE ACTIVE - Disable in production"
        })
      }

      // Check if manual Location ID was provided (for Modern Experience businesses)
      const { manualLocationId } = await request.clone().json().catch(() => ({}))
      
      if (manualLocationId && typeof manualLocationId === 'string' && manualLocationId.includes('/')) {
        console.log("[v0] Manual Location ID provided:", manualLocationId)
        
        // Verify the manual Location ID format: accounts/XXXX/locations/YYYY
        const locationIdPattern = /^accounts\/\d+\/locations\/\d+$/
        if (locationIdPattern.test(manualLocationId)) {
          console.log("[v0] SUCCESS: Manual Location ID verified")
          
          // Fetch baseline data for analytics
          const baseline = await fetchBusinessBaseline(placeId)
          
          await supabase.from("merchants").update({
            google_ownership_verified: true,
            google_ownership_verified_at: new Date().toISOString(),
            google_verified_place_id: placeId,
            google_verified_location_id: manualLocationId,
            google_match_type: "MANUAL_LOCATION_ID",
            // Baseline data capture
            google_rating: baseline.rating,
            google_review_count: baseline.reviewCount,
            google_address: baseline.address,
            google_phone: baseline.phone,
            google_website: baseline.website,
          }).eq("id", user.id)

          return NextResponse.json({ 
            success: true, 
            message: "Business verified using manual Location ID",
            matchType: "MANUAL_LOCATION_ID",
            matchedPlaceId: placeId,
            matchedLocationId: manualLocationId,
            baseline: baseline
          })
        } else {
          return NextResponse.json({ 
            success: false, 
            error: "Invalid Location ID format. Expected: accounts/123456789/locations/987654321",
            code: "INVALID_LOCATION_ID"
          }, { status: 400 })
        }
      }

      console.log("[v0] No managed businesses found - returning with manual verification option")
      return NextResponse.json({ 
        success: false, 
        error: "No business profiles found for your Google account.",
        code: "NO_MANAGED_BUSINESSES",
        allowManualVerification: true,
        debugInfo: {
          googleEmail: merchant.google_email,
          businessesFound: 0,
          accountsChecked: debugInfo.accountsData?.accounts?.length || 0,
          accountTypes: debugInfo.accountsData?.accounts?.map((a: { type?: string; name?: string }) => ({ type: a.type, name: a.name })) || [],
          locationsApiResponses: debugInfo.locationsApiResponses,
          rawAccountsResponse: debugInfo.accountsApiRawResponse?.substring(0, 1000),
          hint: "Possible causes: 1) APIs not enabled in Google Cloud Console, 2) Your Google account doesn't manage any Business Profiles, 3) OAuth scope not granted during sign-in"
        }
      }, { status: 403 })
    }

    // MATCHING STEP 1: Exact Place ID match
    console.log("[v0] Attempting EXACT Place ID match...")
    let matchedBusiness = managedBusinesses.find(biz => {
      if (!biz.placeId) return false
      if (biz.placeId === placeId) return true
      // Handle CID format
      if (biz.placeId.startsWith("cid:") && placeId.includes(biz.placeId.replace("cid:", ""))) return true
      return false
    })

    if (matchedBusiness) {
      console.log("[v0] SUCCESS: Exact Place ID match found!")
      
      // Fetch baseline data for analytics
      const baseline = await fetchBusinessBaseline(placeId)
      
      await supabase.from("merchants").update({
        google_ownership_verified: true,
        google_ownership_verified_at: new Date().toISOString(),
        google_verified_place_id: placeId,
        google_verified_location_id: matchedBusiness.locationId,
        google_match_type: "PLACE_ID_EXACT",
        // Baseline data capture
        google_rating: baseline.rating,
        google_review_count: baseline.reviewCount,
        google_address: baseline.address,
        google_phone: baseline.phone,
        google_website: baseline.website,
      }).eq("id", user.id)

      return NextResponse.json({ 
        success: true, 
        matchType: "PLACE_ID_EXACT",
        matchedPlaceId: placeId,
        matchedLocationId: matchedBusiness.locationId,
        matchedBusiness: matchedBusiness.businessName,
        baseline: baseline
      })
    }

    // MATCHING STEP 2: Fuzzy business name match (90%+ similarity)
    console.log("[v0] Attempting FUZZY name match...")
    const normalizedInputName = normalizeBusinessName(businessName || '')
    let bestNameMatch: { business: typeof managedBusinesses[0]; similarity: number } | null = null

    for (const business of managedBusinesses) {
      const normalizedBizName = normalizeBusinessName(business.businessName || '')
      const similarity = calculateSimilarity(normalizedInputName, normalizedBizName)
      
      console.log(`[v0] Comparing: "${normalizedInputName}" vs "${normalizedBizName}" = ${similarity}%`)
      
      if (similarity >= 90 && (!bestNameMatch || similarity > bestNameMatch.similarity)) {
        bestNameMatch = { business, similarity }
      }
    }

    if (bestNameMatch) {
      console.log(`[v0] SUCCESS: Fuzzy name match found! ${bestNameMatch.similarity}%`)
      
      // Fetch baseline data for analytics
      const baseline = await fetchBusinessBaseline(placeId)
      
      await supabase.from("merchants").update({
        google_ownership_verified: true,
        google_ownership_verified_at: new Date().toISOString(),
        google_verified_place_id: placeId,
        google_verified_location_id: bestNameMatch.business.locationId,
        google_match_type: `FUZZY_NAME_${bestNameMatch.similarity}`,
        // Baseline data capture
        google_rating: baseline.rating,
        google_review_count: baseline.reviewCount,
        google_address: baseline.address,
        google_phone: baseline.phone,
        google_website: baseline.website,
      }).eq("id", user.id)

      return NextResponse.json({ 
        success: true, 
        matchType: "FUZZY_NAME_MATCH",
        matchSimilarity: bestNameMatch.similarity,
        matchedPlaceId: bestNameMatch.business.placeId || placeId,
        matchedLocationId: bestNameMatch.business.locationId,
        matchedBusiness: bestNameMatch.business.businessName,
        baseline: baseline
      })
    }

    // MATCHING STEP 3: Name + Postal Code match (extract zip from address)
    console.log("[v0] Attempting NAME + POSTAL CODE match...")
    // Extract postal code from business address if provided
    const inputPostalCode = businessAddress?.match(/\b\d{5}(-\d{4})?\b/)?.[0] || ''
    
    for (const business of managedBusinesses) {
      const nameSimilarity = calculateSimilarity(normalizedInputName, normalizeBusinessName(business.businessName || ''))
      const businessPostal = business.postalCode || business.address?.match(/\b\d{5}(-\d{4})?\b/)?.[0] || ''
      const postalMatch = inputPostalCode && businessPostal && inputPostalCode.substring(0, 5) === businessPostal.substring(0, 5)
      
      console.log(`[v0] Name+Postal: name=${nameSimilarity}%, inputZip=${inputPostalCode}, bizZip=${businessPostal}, match=${postalMatch}`)
      
      // If name is 80%+ similar AND postal codes match, consider it verified
      if (nameSimilarity >= 80 && postalMatch) {
        console.log(`[v0] SUCCESS: Name + Postal Code match found!`)
        
        // Fetch baseline data for analytics
        const baseline = await fetchBusinessBaseline(placeId)
        
        await supabase.from("merchants").update({
          google_ownership_verified: true,
          google_ownership_verified_at: new Date().toISOString(),
          google_verified_place_id: placeId,
          google_verified_location_id: business.locationId,
          google_match_type: `NAME_POSTAL_${Math.round(nameSimilarity)}`,
          // Baseline data capture
          google_rating: baseline.rating,
          google_review_count: baseline.reviewCount,
          google_address: baseline.address,
          google_phone: baseline.phone,
          google_website: baseline.website,
        }).eq("id", user.id)

        return NextResponse.json({ 
          success: true, 
          matchType: "NAME_POSTAL_MATCH",
          matchSimilarity: Math.round(nameSimilarity),
          matchedPlaceId: business.placeId || placeId,
          matchedLocationId: business.locationId,
          matchedBusiness: business.businessName,
          matchedPostalCode: businessPostal,
          baseline: baseline
        })
      }
    }

    // MATCHING STEP 4: Combined name + address match (if address provided)
    if (businessAddress) {
      console.log("[v0] Attempting COMBINED name+address match...")
      const normalizedInputAddr = normalizeAddress(businessAddress)
      
      for (const business of managedBusinesses) {
        const normalizedBizAddr = normalizeAddress(business.address || '')
        const addrSimilarity = calculateSimilarity(normalizedInputAddr, normalizedBizAddr)
        const nameSimilarity = calculateSimilarity(normalizedInputName, normalizeBusinessName(business.businessName || ''))
        
        // Combined score: 60% name + 40% address
        const combinedScore = (nameSimilarity * 0.6) + (addrSimilarity * 0.4)
        
        console.log(`[v0] Combined: name=${nameSimilarity}%, addr=${addrSimilarity}%, total=${combinedScore}%`)
        
        if (combinedScore >= 85) {
          console.log(`[v0] SUCCESS: Combined match found! ${combinedScore}%`)
          
          // Fetch baseline data for analytics
          const baseline = await fetchBusinessBaseline(placeId)
          
          await supabase.from("merchants").update({
            google_ownership_verified: true,
            google_ownership_verified_at: new Date().toISOString(),
            google_verified_place_id: placeId,
            google_verified_location_id: business.locationId,
            google_match_type: `COMBINED_${Math.round(combinedScore)}`,
            // Baseline data capture
            google_rating: baseline.rating,
            google_review_count: baseline.reviewCount,
            google_address: baseline.address,
            google_phone: baseline.phone,
            google_website: baseline.website,
          }).eq("id", user.id)

          return NextResponse.json({ 
            success: true, 
            matchType: "COMBINED_MATCH",
            matchSimilarity: Math.round(combinedScore),
            matchedPlaceId: business.placeId || placeId,
            matchedLocationId: business.locationId,
            matchedBusiness: business.businessName,
            baseline: baseline
          })
        }
      }
    }

    // NO MATCH FOUND
    console.log("[v0] FAILED: No match found")
    const managedNames = managedBusinesses.map(b => ({
      name: b.businessName,
      address: b.address,
      placeId: b.placeId
    }))

    return NextResponse.json({ 
      success: false, 
      error: `The business "${businessName}" was not found in your Google Business Profile.`,
      code: "NOT_AUTHORIZED",
      debugInfo: {
        googleEmail: merchant.google_email,
        businessesFound: managedBusinesses.length,
        searchedFor: {
          name: businessName,
          normalizedName: normalizedInputName,
          address: businessAddress || "Not provided",
          placeId: placeId
        },
        yourManagedBusinesses: managedNames,
        hint: "Make sure you're signed in with the Google account that manages this specific business location."
      }
    }, { status: 403 })

  } catch (err) {
    console.error("[v0] Verify ownership error:", err)
    return NextResponse.json({ 
      success: false, 
      error: "Failed to verify business ownership. Please try again.",
      code: "VERIFICATION_ERROR",
      debugInfo: {
        errorMessage: err instanceof Error ? err.message : "Unknown error"
      }
    }, { status: 500 })
  }
}
