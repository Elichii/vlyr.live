/**
 * GET /api/stickers — everything the Sticker Map needs for the signed-in merchant.
 *
 * {
 *   business:  name + location (the store pin)
 *   allowance: printed / limit / can still print
 *   stickers:  every printed sticker with its scans, last scan place and rating
 *   events:    scans and ratings with where/when (for the map and timeline)
 * }
 */
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getLabelAllowance } from "@/lib/label-print"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  const id = user.id
  const admin = createAdminClient()

  const [merchantRes, labelsRes, ratingsRes, scansRes, allowance] = await Promise.all([
    admin.from("merchants").select("business_name, lat, lng, address, google_address").eq("id", id).maybeSingle(),
    admin
      .from("label_instances")
      .select("id, seq, short_code, scan_count, last_scanned_at, used_at, created_at")
      .eq("merchant_id", id)
      .order("seq", { ascending: true })
      .limit(5000),
    admin
      .from("scans")
      .select("id, label_id, rating, feedback, created_at, customer_name, customer_email, resolved_at, lat, lng, location_accuracy_m, location_source, city, region, country, device")
      .eq("merchant_id", id)
      .not("label_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(5000),
    admin
      .from("sticker_scans")
      .select("label_id, scanned_at, city, region, country, lat, lng, device")
      .eq("merchant_id", id)
      .order("scanned_at", { ascending: false })
      .limit(10000),
    getLabelAllowance(id),
  ])
  if (labelsRes.error) return NextResponse.json({ error: labelsRes.error.message }, { status: 500 })

  const ratings = ratingsRes.data ?? []
  const scanEvents = scansRes.error ? [] : scansRes.data ?? [] // table may not exist yet
  const ratingByLabel = new Map(ratings.map((r) => [r.label_id as string, r]))
  const lastScanByLabel = new Map<string, (typeof scanEvents)[number]>()
  for (const e of scanEvents) if (!lastScanByLabel.has(e.label_id as string)) lastScanByLabel.set(e.label_id as string, e)

  const stickers = (labelsRes.data ?? []).map((l) => {
    const r = ratingByLabel.get(l.id)
    const last = lastScanByLabel.get(l.id)
    return {
      id: l.id,
      seq: l.seq,
      code: l.short_code,
      printedAt: l.created_at,
      scans: l.scan_count ?? 0,
      lastScannedAt: l.last_scanned_at,
      lastScanPlace: last ? [last.city, last.region].filter(Boolean).join(", ") || last.country || null : null,
      rating: r
        ? {
            id: r.id,
            stars: r.rating,
            feedback: r.feedback,
            at: r.created_at,
            customer: r.customer_name || r.customer_email,
            resolved: !!r.resolved_at,
            lat: r.lat,
            lng: r.lng,
            precise: r.location_source === "gps",
            accuracy: r.location_accuracy_m,
            place: [r.city, r.region].filter(Boolean).join(", ") || r.country || null,
            device: r.device,
          }
        : null,
    }
  })

  const m = merchantRes.data
  return NextResponse.json({
    business: {
      name: m?.business_name ?? "",
      lat: m?.lat ?? null,
      lng: m?.lng ?? null,
      address: m?.address || m?.google_address || null,
    },
    allowance,
    stickers,
    // Scans that didn't lead to a rating still show where stickers travel
    scanEvents: scanEvents.map((e) => ({
      labelId: e.label_id,
      at: e.scanned_at,
      lat: e.lat,
      lng: e.lng,
      place: [e.city, e.region].filter(Boolean).join(", ") || e.country || null,
      device: e.device,
    })),
    locationTracking: !scansRes.error,
  })
}
