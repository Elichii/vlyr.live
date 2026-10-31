/**
 * Customer sign-in (people who scan stickers), separate from merchant accounts.
 *
 * After Google confirms who the customer is, we store their email and name in
 * a signed, http-only cookie. No account is created for them.
 *
 * Server-only.
 */
import { createHmac, timingSafeEqual } from "crypto"
import type { NextRequest, NextResponse } from "next/server"

export const CUSTOMER_COOKIE = "vlyr_customer"
export const CUSTOMER_NONCE_COOKIE = "vlyr_customer_nonce"
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30 // 30 days
const STATE_PREFIX = "customer_"

export interface Customer {
  email: string
  name: string
  sub: string
}

function secret() {
  const s = process.env.CUSTOMER_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!s) throw new Error("CUSTOMER_SESSION_SECRET is not set")
  // Derive a separate key so the raw service key is never used directly
  return createHmac("sha256", s).update("vlyr-customer-session").digest()
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url")
}

export function setCustomerCookie(res: NextResponse, customer: Customer, secure: boolean) {
  const payload = Buffer.from(JSON.stringify({ ...customer, exp: Date.now() + MAX_AGE_SECONDS * 1000 })).toString("base64url")
  res.cookies.set(CUSTOMER_COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  })
}

export function getCustomer(request: NextRequest): Customer | null {
  const raw = request.cookies.get(CUSTOMER_COOKIE)?.value
  if (!raw) return null
  const [payload, sig] = raw.split(".")
  if (!payload || !sig) return null
  const expected = Buffer.from(sign(payload))
  const given = Buffer.from(sig)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"))
    if (typeof data.email !== "string" || !(data.exp > Date.now())) return null
    return { email: data.email, name: data.name ?? "", sub: data.sub ?? "" }
  } catch {
    return null
  }
}

/** OAuth state for a customer sign-in: which sticker to return to + a nonce. */
export function encodeCustomerState(code: string, nonce: string) {
  return STATE_PREFIX + Buffer.from(JSON.stringify({ code, nonce })).toString("base64url")
}

export function decodeCustomerState(state: string | null): { code: string; nonce: string } | null {
  if (!state?.startsWith(STATE_PREFIX)) return null
  try {
    const s = JSON.parse(Buffer.from(state.slice(STATE_PREFIX.length), "base64url").toString("utf8"))
    return typeof s.code === "string" && typeof s.nonce === "string" ? s : null
  } catch {
    return null
  }
}
