/**
 * Where a scan came from (server-only).
 *
 * Approximate location comes from the visitor's network, using the headers
 * our host adds to every request (Vercel: x-vercel-ip-*). Exact location is
 * only used when the customer chooses to share it on the rating page.
 */
import type { NextRequest } from "next/server"

export interface NetworkLocation {
  city: string | null
  region: string | null
  country: string | null
  lat: number | null
  lng: number | null
}

const num = (v: string | null) => {
  const n = v === null ? NaN : Number(v)
  return Number.isFinite(n) ? n : null
}
const text = (v: string | null) => {
  if (!v) return null
  try {
    return decodeURIComponent(v).slice(0, 80)
  } catch {
    return v.slice(0, 80)
  }
}

export function networkLocation(request: NextRequest): NetworkLocation {
  const h = request.headers
  return {
    city: text(h.get("x-vercel-ip-city")),
    region: text(h.get("x-vercel-ip-country-region")),
    country: text(h.get("x-vercel-ip-country") ?? h.get("cf-ipcountry")),
    lat: num(h.get("x-vercel-ip-latitude")),
    lng: num(h.get("x-vercel-ip-longitude")),
  }
}

/** "iPhone", "Android", "iPad" or "Computer" from the browser's user agent. */
export function deviceFrom(request: NextRequest): string | null {
  const ua = request.headers.get("user-agent") ?? ""
  if (!ua) return null
  if (/iPad/i.test(ua)) return "iPad"
  if (/iPhone|iPod/i.test(ua)) return "iPhone"
  if (/Android/i.test(ua)) return "Android"
  return "Computer"
}

/** A location the customer shared from their phone, if it looks valid. */
export function sharedLocation(v: unknown): { lat: number; lng: number; accuracy: number | null } | null {
  if (!v || typeof v !== "object") return null
  const { lat, lng, accuracy } = v as Record<string, unknown>
  if (typeof lat !== "number" || typeof lng !== "number") return null
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
  return { lat, lng, accuracy: typeof accuracy === "number" && accuracy >= 0 ? Math.round(Math.min(accuracy, 100000)) : null }
}
