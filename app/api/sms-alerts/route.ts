/**
 * Text alerts for the signed-in business.
 *
 * GET  -> settings (number shown masked)
 * POST { action: "send_code", phone }   text a confirmation code
 *      { action: "verify", code }        confirm the number, alerts on
 *      { action: "enable" | "disable" }  switch alerts on/off
 *      { action: "remove" }              forget the number
 *      { action: "test" }                send a sample alert
 */
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  SmsAlertError, confirmVerificationCode, getAlertSettings, removeAlertPhone,
  sendTestAlert, sendVerificationCode, setAlertsEnabled,
} from "@/lib/sms-alerts"

export const runtime = "nodejs"

async function merchantId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

export async function GET() {
  const id = await merchantId()
  if (!id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  return NextResponse.json({ settings: await getAlertSettings(id) })
}

export async function POST(request: NextRequest) {
  const id = await merchantId()
  if (!id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  try {
    switch (body.action) {
      case "send_code":
        await sendVerificationCode(id, String(body.phone ?? ""))
        break
      case "verify":
        await confirmVerificationCode(id, String(body.code ?? ""))
        break
      case "enable":
      case "disable":
        await setAlertsEnabled(id, body.action === "enable")
        break
      case "remove":
        await removeAlertPhone(id)
        break
      case "test":
        await sendTestAlert(id)
        break
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 })
    }
    return NextResponse.json({ ok: true, settings: await getAlertSettings(id) })
  } catch (e) {
    const message = e instanceof SmsAlertError ? e.message : "Something went wrong. Please try again."
    if (!(e instanceof SmsAlertError)) console.error("[sms-alerts]", e)
    return NextResponse.json({ error: message, settings: await getAlertSettings(id) }, { status: 400 })
  }
}
