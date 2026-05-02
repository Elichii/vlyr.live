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
export function buildScanUrl(shortCode: string, baseUrl?: string): string {
  const base = baseUrl ?? process.env.NEXT_PUBLIC_SCAN_BASE_URL ?? "https://vlyr.live"
  return `${base}/s/${shortCode}`
}
