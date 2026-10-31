/**
 * The address the visitor actually used (e.g. https://vlyr.live, or a
 * temporary tunnel in development).
 *
 * Behind a proxy or tunnel, `request.url` can show the internal address
 * (http://localhost:3000). Redirects built from it would send phones to
 * their own "localhost", so we prefer the forwarded host headers.
 */
import type { NextRequest } from "next/server"

export function publicOrigin(request: NextRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim()
  const host = forwardedHost || request.headers.get("host") || request.nextUrl.host
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim()
  const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host)
  const proto = forwardedProto || (isLocal ? "http" : request.nextUrl.protocol.replace(":", ""))
  return `${proto}://${host}`
}

/** Absolute URL on the visitor's public address. */
export function publicUrl(request: NextRequest, path: string): URL {
  return new URL(path, publicOrigin(request))
}
