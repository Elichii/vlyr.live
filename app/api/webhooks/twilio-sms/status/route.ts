/**
 * Delivery reports from Twilio for the texts we send.
 *
 * Every message is sent with statusCallback pointing here (see lib/sms.ts),
 * so nothing needs setting up in the Twilio console. Twilio posts each
 * step (queued, sent, delivered, undelivered, failed) and we store the
 * latest one on the matching sms_messages row.
 * Requests are checked with Twilio's signature (X-Twilio-Signature).
 */
import { NextRequest, NextResponse } from "next/server"
import twilio from "twilio"
import { createAdminClient } from "@/lib/supabase/admin"
import { publicOrigin } from "@/lib/public-origin"

export const runtime = "nodejs"

// Later steps never get replaced by earlier ones arriving late
const ORDER: Record<string, number> = { accepted: 0, queued: 1, sending: 2, sent: 3, delivered: 4, undelivered: 4, failed: 4 }

export async function POST(request: NextRequest) {
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const signature = request.headers.get("x-twilio-signature")
  if (!authToken || !signature) return new NextResponse(null, { status: 404 })

  const params = Object.fromEntries(new URLSearchParams(await request.text()))
  const url = `${publicOrigin(request)}${request.nextUrl.pathname}${request.nextUrl.search}`
  if (!twilio.validateRequest(authToken, signature, url, params)) {
    console.warn("[sms] status callback: bad Twilio signature for", url)
    return new NextResponse(null, { status: 403 })
  }

  const sid = params.MessageSid ?? params.SmsSid
  const status = (params.MessageStatus ?? params.SmsStatus ?? "").toLowerCase()
  if (!sid || !(status in ORDER)) return new NextResponse(null, { status: 204 })

  const admin = createAdminClient()
  const { data: row } = await admin.from("sms_messages").select("id, delivery_status").eq("provider_id", sid).maybeSingle()
  if (row && (ORDER[row.delivery_status ?? ""] ?? -1) <= ORDER[status]) {
    const code = params.ErrorCode ? Number(params.ErrorCode) : null
    const { error } = await admin
      .from("sms_messages")
      .update({ delivery_status: status, error_code: code, status_updated_at: new Date().toISOString() })
      .eq("id", row.id)
    if (error) console.error("[sms] could not save delivery status:", error.message)
    if (code) console.warn(`[sms] ${sid} ${status} (Twilio error ${code})`)
  }
  return new NextResponse(null, { status: 204 })
}
