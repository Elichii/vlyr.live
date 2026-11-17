/**
 * The logo on a business's own website, for profiles that have no logo on
 * Google (server-only).
 *
 * Reads the homepage's <link rel="apple-touch-icon"> / <link rel="icon"> and
 * downloads the best PNG or JPEG (sticker printing needs one of those).
 * Safety: public http(s) addresses only (no private or local networks, checked
 * on every redirect), short timeouts and size limits.
 */
import { lookup } from "dns/promises"
import { isIP } from "net"

const TIMEOUT_MS = 5000
const MAX_HTML = 1_000_000
const MAX_IMAGE = 5_000_000
/** Smaller icons look blurry on a sticker */
const MIN_PNG_SIZE = 96

function isPrivateAddress(ip: string): boolean {
  if (isIP(ip) === 6) {
    const v = ip.toLowerCase()
    if (v === "::1" || v === "::" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80")) return true
    const mapped = v.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/)
    return mapped ? isPrivateAddress(mapped[1]) : false
  }
  const [a, b] = ip.split(".").map(Number)
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224
}

async function isPublicUrl(url: URL) {
  if (url.protocol !== "https:" && url.protocol !== "http:") return false
  if (url.username || url.password) return false
  const host = url.hostname.replace(/^\[|\]$/g, "")
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return false
  try {
    const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true })
    return addrs.length > 0 && addrs.every((a) => !isPrivateAddress(a.address))
  } catch {
    return false
  }
}

/** fetch() that re-checks every redirect hop and stops reading past `max` bytes. */
async function safeFetch(start: string, max: number): Promise<{ res: Response; body: Uint8Array; url: URL } | null> {
  let url: URL
  try { url = new URL(start) } catch { return null }
  for (let hop = 0; hop < 4; hop++) {
    if (!(await isPublicUrl(url))) return null
    const res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; VLYR/1.0; +https://vlyr.live)", Accept: "text/html,image/*;q=0.9,*/*;q=0.5" },
    }).catch(() => null)
    if (!res) return null
    if (res.status >= 300 && res.status < 400) {
      const next = res.headers.get("location")
      if (!next) return null
      url = new URL(next, url)
      continue
    }
    if (!res.ok || !res.body) return null
    const reader = res.body.getReader()
    const chunks: Uint8Array[] = []
    let size = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.length
      if (size > max) { await reader.cancel().catch(() => {}); return null }
      chunks.push(value)
    }
    const body = new Uint8Array(size)
    let off = 0
    for (const c of chunks) { body.set(c, off); off += c.length }
    return { res, body, url }
  }
  return null
}

/** Icon links on the page, best first: apple-touch-icon, then the largest declared icon. */
function iconCandidates(html: string, base: URL): string[] {
  const found: { href: string; score: number }[] = []
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    const rel = tag.match(/\brel\s*=\s*["']?([^"'>]+)/i)?.[1]?.toLowerCase() ?? ""
    const href = tag.match(/\bhref\s*=\s*["']?([^"'\s>]+)/i)?.[1]
    if (!href || !/icon/.test(rel) || /mask-icon/.test(rel)) continue
    const sizes = tag.match(/\bsizes\s*=\s*["']?(\d+)x\d+/i)?.[1]
    const score = (rel.includes("apple-touch-icon") ? 1000 : 0) + (sizes ? Number(sizes) : 0)
    try { found.push({ href: new URL(href, base).toString(), score }) } catch { /* bad href */ }
  }
  const list = found.sort((x, y) => y.score - x.score).map((f) => f.href)
  list.push(new URL("/apple-touch-icon.png", base).toString())
  return [...new Set(list)].filter((h) => !/\.(ico|svg)(\?|$)/i.test(h))
}

function pngWidth(b: Uint8Array) {
  const isPng = b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47
  return isPng ? (b[16] << 24) | (b[17] << 16) | (b[18] << 8) | b[19] : null
}

/** The website's logo as PNG/JPEG bytes, or null if it has no usable one. */
export async function fetchSiteLogo(website: string | null | undefined): Promise<{ bytes: Uint8Array; type: string } | null> {
  if (!website) return null
  let home: URL
  try { home = new URL(/^https?:\/\//i.test(website) ? website : `https://${website}`) } catch { return null }
  const page = await safeFetch(home.toString(), MAX_HTML)
  if (!page || !(page.res.headers.get("content-type") ?? "").includes("html")) return null
  const html = new TextDecoder().decode(page.body)

  for (const href of iconCandidates(html, page.url).slice(0, 4)) {
    const img = await safeFetch(href, MAX_IMAGE)
    const type = (img?.res.headers.get("content-type") ?? "").split(";")[0].trim()
    if (!img || !/^image\/(png|jpe?g)$/.test(type)) continue
    const w = pngWidth(img.body)
    if (w !== null && w < MIN_PNG_SIZE) continue
    return { bytes: img.body, type }
  }
  return null
}
