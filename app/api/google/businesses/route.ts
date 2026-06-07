import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getValidGoogleToken } from "@/lib/google/token-refresh"

type ManagedBusiness = {
  locationId: string
  placeId: string | null
  businessName: string
  address: string | null
  postalCode?: string | null
  accountType: string
  accountName: string
}

// Fetch with automatic retry on 429
async function fetchWithRetry(url: string, headers: Record<string, string>, retries = 3): Promise<Response> {
  for (let attempt = 0; attempt < retries; attempt++) {
    const res = await fetch(url, { headers })
    if (res.status !== 429) return res
    // Exponential backoff: 1s, 2s, 4s
    await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)))
  }
  return fetch(url, { headers })
}

/**
 * GET /api/google/businesses
 * Fetches the authenticated merchant's Google-managed business locations.
 * Uses stored access token (auto-refreshed) and retries on 429.
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const accessToken = await getValidGoogleToken(user.id)

  if (!accessToken) {
    return NextResponse.json({
      error: "No Google access token. Please re-authenticate with Google.",
      code: "NO_TOKEN",
    }, { status: 401 })
  }

  const authHeaders = { Authorization: `Bearer ${accessToken}` }
  const businesses: ManagedBusiness[] = []
  const errors: string[] = []

  // --- Approach 1: Account Management API → per-account Locations ---
  try {
    const accountsRes = await fetchWithRetry(
      "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
      authHeaders
    )

    if (accountsRes.ok) {
      const accountsData = await accountsRes.json()
      const accounts: Array<{ name: string; type?: string }> = accountsData.accounts ?? []

      for (const account of accounts) {
        const locRes = await fetchWithRetry(
          `https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations?readMask=name,title,metadata,storefrontAddress`,
          authHeaders
        )

        if (locRes.ok) {
          const locData = await locRes.json()
          for (const loc of locData.locations ?? []) {
            const placeId: string | null = loc.metadata?.placeId ?? null
            businesses.push({
              locationId: loc.name ?? "",
              placeId,
              businessName: loc.title ?? "Unknown Business",
              address: loc.storefrontAddress?.addressLines?.join(", ") ?? null,
              postalCode: loc.storefrontAddress?.postalCode ?? null,
              accountType: account.type ?? "PERSONAL",
              accountName: account.name,
            })
          }
        } else {
          errors.push(`Locations API ${locRes.status} for ${account.name}`)
        }
      }
    } else {
      errors.push(`Accounts API ${accountsRes.status}`)
    }
  } catch (err) {
    errors.push(`Accounts fetch error: ${String(err)}`)
  }

  // --- Approach 2: Wildcard query for Modern Experience businesses ---
  try {
    const wildcardRes = await fetchWithRetry(
      "https://mybusinessbusinessinformation.googleapis.com/v1/accounts/-/locations?readMask=name,title,metadata,storefrontAddress",
      authHeaders
    )

    if (wildcardRes.ok) {
      const wildcardData = await wildcardRes.json()
      for (const loc of wildcardData.locations ?? []) {
        const locationId: string = loc.name ?? ""
        if (businesses.some(b => b.locationId === locationId)) continue

        let placeId: string | null = loc.metadata?.placeId ?? null
        if (!placeId && loc.metadata?.mapsUri) {
          const cidMatch = loc.metadata.mapsUri.match(/cid=(\d+)/)
          if (cidMatch) placeId = `cid:${cidMatch[1]}`
        }

        businesses.push({
          locationId,
          placeId,
          businessName: loc.title ?? "Unknown Business",
          address: loc.storefrontAddress?.addressLines?.join(", ") ?? null,
          postalCode: loc.storefrontAddress?.postalCode ?? null,
          accountType: "WILDCARD_MODERN",
          accountName: locationId.split("/")[1] ?? "unknown",
        })
      }
    } else {
      errors.push(`Wildcard API ${wildcardRes.status}`)
    }
  } catch (err) {
    errors.push(`Wildcard fetch error: ${String(err)}`)
  }

  // Persist fetched businesses so verify-ownership can use them
  if (businesses.length > 0) {
    await supabase.from("merchants").update({
      google_managed_businesses: businesses,
    }).eq("id", user.id)
  }

  return NextResponse.json({
    success: true,
    businesses,
    count: businesses.length,
    errors: errors.length > 0 ? errors : undefined,
  })
}
