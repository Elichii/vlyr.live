/**
 * Email alerts for the signed-in business.
 *
 * GET  -> { settings }
 * POST { enabled: boolean } -> { settings }
 */
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getEmailAlertSettings, setEmailAlertsEnabled } from "@/lib/email-alerts"

export const runtime = "nodejs"

async function merchantId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

export async function GET() {
  const id = await merchantId()
  if (!id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  return NextResponse.json({ settings: await getEmailAlertSettings(id) })
}

export async function POST(request: NextRequest) {
  const id = await merchantId()
  if (!id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  const body = (await request.json().catch(() => ({}))) as { enabled?: unknown }
  if (typeof body.enabled !== "boolean") return NextResponse.json({ error: "enabled must be true or false" }, { status: 400 })
  return NextResponse.json({ settings: await setEmailAlertsEnabled(id, body.enabled) })
}
