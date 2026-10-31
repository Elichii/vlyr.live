/**
 * Reward settings and redemption for the signed-in merchant.
 *
 * GET  /api/rewards                 -> { settings, coupons }
 * PUT  /api/rewards { enabled, offer, validDays }   save settings
 * POST /api/rewards { code, redeem? } look up a customer's code; redeem=true marks it used
 */
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

async function merchantId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

export async function GET() {
  const id = await merchantId()
  if (!id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  const admin = createAdminClient()
  const [{ data: m, error }, { data: coupons }] = await Promise.all([
    admin.from("merchants").select("reward_enabled, reward_offer, reward_valid_days").eq("id", id).single(),
    admin
      .from("reward_coupons")
      .select("code, offer, customer_email, customer_name, expires_at, redeemed_at, created_at")
      .eq("merchant_id", id)
      .order("created_at", { ascending: false })
      .limit(100),
  ])
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({
    settings: { enabled: !!m?.reward_enabled, offer: m?.reward_offer ?? "", validDays: m?.reward_valid_days ?? 7 },
    coupons: coupons ?? [],
  })
}

export async function PUT(request: NextRequest) {
  const id = await merchantId()
  if (!id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  const offer = typeof body.offer === "string" ? body.offer.trim().slice(0, 80) : ""
  const enabled = body.enabled === true
  const validDays = Math.min(90, Math.max(1, Math.round(Number(body.validDays) || 7)))
  if (enabled && !offer) return NextResponse.json({ error: "Describe the reward first (e.g. 10% off your next order)." }, { status: 400 })

  const { error } = await createAdminClient()
    .from("merchants")
    .update({ reward_enabled: enabled, reward_offer: offer || null, reward_valid_days: validDays })
    .eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function POST(request: NextRequest) {
  const id = await merchantId()
  if (!id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  // Accept codes typed with or without the dash, any case
  const raw = String(body.code ?? "").toUpperCase().replace(/[^0-9A-Z]/g, "")
  if (raw.length !== 6) return NextResponse.json({ status: "not_found" })
  const code = `${raw.slice(0, 3)}-${raw.slice(3)}`

  const admin = createAdminClient()
  const { data: coupon } = await admin
    .from("reward_coupons")
    .select("id, code, offer, customer_name, customer_email, expires_at, redeemed_at")
    .eq("merchant_id", id)
    .eq("code", code)
    .maybeSingle()
  if (!coupon) return NextResponse.json({ status: "not_found" })
  if (coupon.redeemed_at) return NextResponse.json({ status: "redeemed", coupon })
  if (new Date(coupon.expires_at) < new Date()) return NextResponse.json({ status: "expired", coupon })

  if (body.redeem === true) {
    // Only one redemption can win
    const { data: updated } = await admin
      .from("reward_coupons")
      .update({ redeemed_at: new Date().toISOString() })
      .eq("id", coupon.id)
      .is("redeemed_at", null)
      .select("redeemed_at")
    if (!updated?.length) return NextResponse.json({ status: "redeemed", coupon })
    return NextResponse.json({ status: "just_redeemed", coupon: { ...coupon, redeemed_at: updated[0].redeemed_at } })
  }
  return NextResponse.json({ status: "valid", coupon })
}
