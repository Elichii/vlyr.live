/**
 * GET /s/:code — where every printed QR label points.
 *
 * Looks up the sticker, counts the scan, and sends the customer to the
 * feedback page. Unknown codes go to the "setting up" fallback page.
 */
import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { publicUrl } from "@/lib/public-origin"
import { deviceFrom, networkLocation } from "@/lib/scan-geo"

export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code: raw } = await params
  const code = decodeURIComponent(raw).trim().toUpperCase()
  // Build redirects from the visitor's public address (not the internal one)
  const to = (path: string) => NextResponse.redirect(publicUrl(request, path), 302)

  if (!/^V-[0-9A-Z]{8}$/.test(code)) return to("/fallback")

  const supabase = createAdminClient()
  const { data: label } = await supabase
    .from("label_instances")
    .select("id, scan_count, merchant_id")
    .eq("short_code", code)
    .maybeSingle()

  if (!label) return to("/fallback")

  // Count the scan and log when/where it happened (best effort; never block the customer)
  const geo = networkLocation(request)
  await Promise.all([
    supabase
      .from("label_instances")
      .update({ scan_count: (label.scan_count ?? 0) + 1, last_scanned_at: new Date().toISOString() })
      .eq("id", label.id),
    supabase.from("sticker_scans").insert({
      merchant_id: label.merchant_id,
      label_id: label.id,
      ...geo,
      device: deviceFrom(request),
    }),
  ]).then(() => undefined, () => undefined)

  return to(`/pulse?c=${encodeURIComponent(code)}`)
}
