/**
 * Customer activity for the signed-in merchant's dashboard.
 *
 * GET   /api/activity?limit=50  -> { stats, items, recent }
 *   stats:  totals for the stat cards
 *   items:  newest ratings with customer contact details, sticker and reward
 *   recent: { created_at, rating } for the last 28 days (charts, grouped in the browser)
 * PATCH /api/activity { id, resolved?, note? }  mark feedback resolved / save a private note
 *
 * "New" = created after merchants.feedback_seen_at (set by /api/activity/seen).
 */
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

async function merchantId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

// Older ratings stored the phone inside the comment ("Phone: ...")
function splitPhone(feedback: string | null, phone: string | null) {
  if (phone || !feedback) return { feedback, phone }
  const m = feedback.match(/\n*\s*(?:Phone|Contact):\s*(.+)\s*$/i)
  if (!m) return { feedback, phone: null }
  return { feedback: feedback.slice(0, m.index).trim() || null, phone: m[1].trim() }
}

export async function GET(request: NextRequest) {
  const id = await merchantId()
  if (!id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  const limit = Math.min(200, Math.max(1, Number(request.nextUrl.searchParams.get("limit")) || 50))
  const admin = createAdminClient()
  const since = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString()

  const [itemsRes, allRes, stickersRes, couponsRes, merchantRes] = await Promise.all([
    admin
      .from("scans")
      .select("id, rating, feedback, created_at, customer_email, customer_name, customer_phone, contact_preference, resolved_at, manager_note, label_id, label_instances(seq)")
      .eq("merchant_id", id)
      .order("created_at", { ascending: false })
      .limit(limit),
    admin.from("scans").select("rating, resolved_at, created_at").eq("merchant_id", id),
    admin.from("label_instances").select("scan_count").eq("merchant_id", id),
    admin.from("reward_coupons").select("scan_id, code, offer, expires_at, redeemed_at").eq("merchant_id", id),
    admin.from("merchants").select("feedback_seen_at").eq("id", id).maybeSingle(),
  ])
  const seenAt = (merchantRes.data?.feedback_seen_at as string | null) ?? null
  const isNew = (createdAt: string) => !seenAt || createdAt > seenAt
  if (itemsRes.error) return NextResponse.json({ error: itemsRes.error.message }, { status: 500 })

  const all = allRes.data ?? []
  const rated = all.filter((s) => s.rating !== null)
  const coupons = couponsRes.data ?? []
  const couponByScan = new Map(coupons.filter((c) => c.scan_id).map((c) => [c.scan_id as string, c]))

  const items = (itemsRes.data ?? []).map((s) => {
    const { feedback, phone } = splitPhone(s.feedback, s.customer_phone)
    const c = couponByScan.get(s.id)
    const label = s.label_instances as unknown as { seq: number | null } | null
    return {
      id: s.id,
      rating: s.rating,
      feedback,
      phone,
      contactPreference: (s.contact_preference as string | null) ?? null,
      isNew: isNew(s.created_at),
      email: s.customer_email,
      name: s.customer_name,
      createdAt: s.created_at,
      resolvedAt: s.resolved_at,
      note: s.manager_note,
      sticker: label?.seq ?? null,
      reward: c ? { code: c.code, offer: c.offer, expiresAt: c.expires_at, redeemedAt: c.redeemed_at } : null,
    }
  })

  return NextResponse.json({
    stats: {
      stickerScans: (stickersRes.data ?? []).reduce((sum, l) => sum + (l.scan_count ?? 0), 0),
      ratings: rated.length,
      avgRating: rated.length ? Number((rated.reduce((s, r) => s + (r.rating ?? 0), 0) / rated.length).toFixed(1)) : null,
      sentToGoogle: rated.filter((r) => (r.rating ?? 0) >= 4).length,
      privateFeedback: rated.filter((r) => (r.rating ?? 0) <= 3).length,
      needsFollowUp: rated.filter((r) => (r.rating ?? 0) <= 3 && !r.resolved_at).length,
      rewardsIssued: coupons.length,
      rewardsRedeemed: coupons.filter((c) => c.redeemed_at).length,
      resolved: rated.filter((r) => (r.rating ?? 0) <= 3 && r.resolved_at).length,
      newGood: rated.filter((r) => (r.rating ?? 0) >= 4 && isNew(r.created_at)).length,
      newBad: rated.filter((r) => (r.rating ?? 0) <= 3 && isNew(r.created_at)).length,
    },
    seenAt,
    items,
    recent: all.filter((s) => s.created_at >= since).map((s) => ({ createdAt: s.created_at, rating: s.rating })),
  })
}

export async function PATCH(request: NextRequest) {
  const id = await merchantId()
  if (!id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  const scanId = String(body.id ?? "")
  if (!/^[0-9a-f-]{36}$/i.test(scanId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 })

  const update: Record<string, unknown> = {}
  if (typeof body.resolved === "boolean") update.resolved_at = body.resolved ? new Date().toISOString() : null
  if (typeof body.note === "string") update.manager_note = body.note.trim().slice(0, 1000) || null
  if (!Object.keys(update).length) return NextResponse.json({ error: "Nothing to update" }, { status: 400 })

  const { data, error } = await createAdminClient()
    .from("scans")
    .update(update)
    .eq("id", scanId)
    .eq("merchant_id", id) // only the merchant's own feedback
    .select("id")
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data?.length) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ ok: true })
}
