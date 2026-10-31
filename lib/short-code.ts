/**
 * VLYR Short-Code Generator
 *
 * Generates unique, URL-safe short codes for QR label instances.
 * Format: V-XXXXXXXX (8 alphanumeric chars after prefix)
 * Collision space: 36^8 = ~2.8 trillion combinations
 */

const ALPHABET = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ" // No I, O (avoid ambiguity)

export function generateShortCode(): string {
  let code = ""
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  for (let i = 0; i < 8; i++) {
    code += ALPHABET[bytes[i] % ALPHABET.length]
  }
  return `V-${code}`
}

/**
 * Generate a batch of unique short codes.
 * Uses a Set to guarantee uniqueness within the batch.
 */
export function generateShortCodes(count: number): string[] {
  const codes = new Set<string>()
  while (codes.size < count) {
    codes.add(generateShortCode())
  }
  return Array.from(codes)
}

/**
 * Build the full scan URL for a short code.
 */
/** Public address of the app (QR codes and invite links point here). */
export function appBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_SCAN_BASE_URL ?? "https://vlyr.live").replace(/\/$/, "")
}

export function buildScanUrl(shortCode: string, baseUrl?: string): string {
  const base = baseUrl ?? appBaseUrl()
  return `${base}/s/${shortCode}`
}

/** Invite link for a business (optional ref tracks who invited them). */
export function buildInviteUrl(ref?: string): string {
  const url = new URL(`${appBaseUrl()}/invite`)
  if (ref) url.searchParams.set("ref", ref)
  return url.toString()
}
