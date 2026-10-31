/**
 * Customer feedback ("Pulse Check") for scanned stickers.
 *
 * Each sticker can be rated once ("burned" after use). The customer signs in
 * with Google first, so every rating has a real person behind it. If the
 * business has a reward set up, the customer gets a one-time code for leaving
 * feedback (at any rating; never in exchange for a Google review).
 *
 * Server-only: uses the service-role Supabase client.
 */
import { randomInt } from "crypto"
import { createAdminClient } from "@/lib/supabase/admin"
import type { Customer } from "@/lib/customer-session"

export interface PulseContext {
  code: string
  labelId: string
  merchantId: string
  businessName: string
  logoUrl: string | null
  /** Where happy customers can leave a public review; null if not set up yet */
  reviewUrl: string | null
  /** The sticker was already rated */
  used: boolean
  usedByEmail: string | null
  /** What the business offers for feedback, if anything */
  rewardOffer: string | null
  rewardValidDays: number
}

export interface Reward {
  code: string
  offer: string
  expiresAt: string
}

export const isLabelCode = (code: string) => /^V-[0-9A-Z]{8}$/.test(code)

/** Who a sticker belongs to, whether it's been used, and the business's settings. */
export async function getPulseContext(rawCode: string): Promise<PulseContext | null> {
  const code = rawCode.trim().toUpperCase()
  if (!isLabelCode(code)) return null

  const admin = createAdminClient()
  const { data: label } = await admin
    .from("label_instances")
    .select("id, merchant_id, used_at, used_by_email")
    .eq("short_code", code)
    .maybeSingle()
  if (!label) return null

  const [{ data: merchant }, { data: link }] = await Promise.all([
    admin
      .from("merchants")
      .select("business_name, logo_url, google_place_id, google_verified_place_id, reward_enabled, reward_offer, reward_valid_days")
      .eq("id", label.merchant_id)
      .maybeSingle(),
    admin.from("review_links").select("url").eq("merchant_id", label.merchant_id).eq("is_primary", true).maybeSingle(),
  ])
  if (!merchant) return null

  const offer = typeof merchant.reward_offer === "string" ? merchant.reward_offer.trim() : ""
  return {
    code,
    labelId: label.id,
    merchantId: label.merchant_id,
    businessName: merchant.business_name || "this business",
    logoUrl: merchant.logo_url || null,
    reviewUrl: safeUrl(link?.url) ?? googleReviewUrl(merchant.google_verified_place_id || merchant.google_place_id),
    used: !!label.used_at,
    usedByEmail: label.used_by_email ?? null,
    rewardOffer: merchant.reward_enabled && offer ? offer : null,
    rewardValidDays: clampDays(merchant.reward_valid_days),
  }
}

/** Google's "write a review" page for a Place ID. */
export function googleReviewUrl(placeId: string | null | undefined) {
  if (!placeId || placeId.startsWith("cid:")) return null
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`
}

function safeUrl(url: string | null | undefined) {
  if (!url) return null
  try {
    const u = new URL(url)
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null
  } catch {
    return null
  }
}

const clampDays = (d: unknown) => Math.min(90, Math.max(1, Math.round(Number(d) || 7)))

export class StickerUsedError extends Error {}

/**
 * Save a signed-in customer's rating and burn the sticker.
 * Returns the reward code if the business offers one.
 */
export async function recordPulse(opts: {
  ctx: PulseContext
  customer: Customer
  rating: number
  feedback?: string
  phone?: string
  contactPreference?: string
  /** Exact location the customer chose to share */
  gps?: { lat: number; lng: number; accuracy: number | null } | null
  /** Approximate location from the network */
  network?: { city: string | null; region: string | null; country: string | null; lat: number | null; lng: number | null }
  device?: string | null
}): Promise<{ reward: Reward | null; scanId: string; rating: number; feedback: string | null }> {
  const rating = Math.round(opts.rating)
  if (!(rating >= 1 && rating <= 5)) throw new Error("Invalid rating")
  const admin = createAdminClient()

  // Burn the sticker. Only one request can win this update.
  const { data: burned, error: burnError } = await admin
    .from("label_instances")
    .update({ used_at: new Date().toISOString(), used_by_email: opts.customer.email })
    .eq("id", opts.ctx.labelId)
    .is("used_at", null)
    .select("id")
  if (burnError) throw new Error(burnError.message)
  if (!burned?.length) throw new StickerUsedError("This sticker has already been used.")

  const feedback = (opts.feedback ?? "").trim().slice(0, 1000)
  const phone = (opts.phone ?? "").trim().slice(0, 40)

  const { data: scan, error } = await admin
    .from("scans")
    .insert({
      merchant_id: opts.ctx.merchantId,
      label_id: opts.ctx.labelId,
      rating,
      feedback: feedback || null,
      source: "qr",
      customer_email: opts.customer.email,
      customer_name: opts.customer.name || null,
      customer_phone: phone || null,
      contact_preference: ["call", "text", "email"].includes(opts.contactPreference ?? "") ? opts.contactPreference : null,
      lat: opts.gps?.lat ?? opts.network?.lat ?? null,
      lng: opts.gps?.lng ?? opts.network?.lng ?? null,
      location_accuracy_m: opts.gps?.accuracy ?? null,
      location_source: opts.gps ? "gps" : opts.network?.lat !== null && opts.network?.lat !== undefined ? "network" : null,
      city: opts.network?.city ?? null,
      region: opts.network?.region ?? null,
      country: opts.network?.country ?? null,
      device: opts.device ?? null,
    })
    .select("id")
    .single()
  if (error) {
    // Give the sticker back so the customer can try again
    await admin.from("label_instances").update({ used_at: null, used_by_email: null }).eq("id", opts.ctx.labelId)
    throw new Error(error.message)
  }

  const reward = opts.ctx.rewardOffer ? await issueReward(opts.ctx, opts.customer, scan.id) : null
  return { reward, scanId: scan.id, rating, feedback: feedback || null }
}

/**
 * One active reward per customer per business: if they already hold an
 * unused, unexpired code, show that one again instead of a new one.
 */
async function issueReward(ctx: PulseContext, customer: Customer, scanId: string): Promise<Reward | null> {
  const admin = createAdminClient()
  const now = new Date()

  const { data: existing } = await admin
    .from("reward_coupons")
    .select("code, offer, expires_at")
    .eq("merchant_id", ctx.merchantId)
    .eq("customer_email", customer.email)
    .is("redeemed_at", null)
    .gt("expires_at", now.toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (existing) return { code: existing.code, offer: existing.offer, expiresAt: existing.expires_at }

  const expiresAt = new Date(now.getTime() + ctx.rewardValidDays * 24 * 60 * 60 * 1000).toISOString()
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = rewardCode()
    const { error } = await admin.from("reward_coupons").insert({
      merchant_id: ctx.merchantId,
      scan_id: scanId,
      label_id: ctx.labelId,
      code,
      offer: ctx.rewardOffer!,
      customer_email: customer.email,
      customer_name: customer.name || null,
      expires_at: expiresAt,
    })
    if (!error) return { code, offer: ctx.rewardOffer!, expiresAt }
    if (error.code !== "23505") {
      console.error("[reward] could not issue:", error.message)
      return null
    }
  }
  return null
}

/** The rating a customer gave on a sticker (when they come back to it). */
export async function getMyRating(labelId: string, email: string): Promise<number | null> {
  const { data } = await createAdminClient()
    .from("scans")
    .select("rating")
    .eq("label_id", labelId)
    .eq("customer_email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  return data?.rating ?? null
}

/** The customer's existing reward from this business, if still valid. */
export async function findActiveReward(merchantId: string, email: string): Promise<Reward | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from("reward_coupons")
    .select("code, offer, expires_at")
    .eq("merchant_id", merchantId)
    .eq("customer_email", email)
    .is("redeemed_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  return data ? { code: data.code, offer: data.offer, expiresAt: data.expires_at } : null
}

// Easy to read aloud at the counter: no 0/O or 1/I
const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
function rewardCode() {
  const pick = () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]
  return `${pick()}${pick()}${pick()}-${pick()}${pick()}${pick()}`
}
