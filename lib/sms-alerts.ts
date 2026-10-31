/**
 * Text alerts for business managers.
 *
 * 1. The manager enters their mobile number; we text it a 6-digit code.
 * 2. They type the code back: the number is confirmed and alerts switch on.
 * 3. Every 1–3★ sticker rating texts that number straight away.
 * Replying STOP (Twilio handles it; see /api/webhooks/twilio-sms) or
 * switching off in the dashboard stops the alerts.
 *
 * Server-only.
 */
import { createHash, randomInt } from "crypto"
import { createAdminClient } from "@/lib/supabase/admin"
import { formatSeq } from "@/lib/label-sheet-layout"
import { maskPhone, normalizeUsPhone, sendSms, smsConfigured, smsLive, smsSafe, smsStatus, SMS_MAX_CHARS, TWILIO_OPTED_OUT, type SmsResult } from "@/lib/sms"

/**
 * Text alerts are offered to businesses only when SMS_ALERTS_LIVE=true
 * (switched off while the US texting registration is being approved).
 */
export const alertsLive = () => smsConfigured() && smsLive()

const CODE_TTL_MS = 10 * 60 * 1000
const MAX_CODE_ATTEMPTS = 5
const MAX_CODES_PER_HOUR = 3
const MAX_ALERTS_PER_DAY = 50

export interface AlertSettings {
  available: boolean
  enabled: boolean
  /** Masked confirmed number, e.g. "(•••) •••-0123" */
  phone: string | null
  /** Masked number waiting for its code */
  pendingPhone: string | null
  /** The last code we texted could not be delivered to that number */
  codeUndelivered: boolean
}

export class SmsAlertError extends Error {}

const hashCode = (merchantId: string, code: string) =>
  createHash("sha256").update(`${merchantId}:${code}:${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""}`).digest("hex")

async function logSms(row: { merchant_id: string | null; to_phone: string; kind: string; scan_id?: string | null }, res: SmsResult) {
  const { error } = await createAdminClient().from("sms_messages").insert({
    ...row,
    status: smsStatus(res),
    provider_id: res.ok ? res.id : null,
    error: res.ok ? null : res.error,
  })
  if (error) console.error("[sms] could not log message:", error.message)
  // They replied STOP to our number earlier: Twilio blocks the send, so switch alerts off here too
  if (!res.ok && res.code === TWILIO_OPTED_OUT) await optOutPhone(row.to_phone)
}

export async function getAlertSettings(merchantId: string): Promise<AlertSettings> {
  const { data } = await createAdminClient()
    .from("sms_alert_settings")
    .select("phone, enabled, pending_phone, code_expires_at")
    .eq("merchant_id", merchantId)
    .maybeSingle()
  const pendingLive = data?.pending_phone && data.code_expires_at && new Date(data.code_expires_at) > new Date()
  let codeUndelivered = false
  if (pendingLive) {
    // Delivery report for the latest code (filled in by /api/webhooks/twilio-sms/status)
    const { data: last } = await createAdminClient()
      .from("sms_messages")
      .select("status, delivery_status")
      .eq("merchant_id", merchantId)
      .eq("kind", "verify")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    codeUndelivered = !!last && (last.status === "failed" || last.delivery_status === "undelivered" || last.delivery_status === "failed")
  }
  return {
    available: alertsLive(),
    enabled: !!data?.enabled && !!data.phone,
    phone: data?.phone ? maskPhone(data.phone) : null,
    pendingPhone: pendingLive ? maskPhone(data!.pending_phone!) : null,
    codeUndelivered,
  }
}

/** Texts a confirmation code to the number the manager entered. */
export async function sendVerificationCode(merchantId: string, rawPhone: string) {
  if (!alertsLive()) throw new SmsAlertError("Text alerts aren't available yet.")
  const phone = normalizeUsPhone(rawPhone)
  if (!phone) throw new SmsAlertError("Please enter a US mobile number, e.g. (202) 555-0123.")

  const admin = createAdminClient()
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count } = await admin
    .from("sms_messages")
    .select("id", { count: "exact", head: true })
    .eq("merchant_id", merchantId)
    .eq("kind", "verify")
    .gte("created_at", since)
  if ((count ?? 0) >= MAX_CODES_PER_HOUR) throw new SmsAlertError("Too many codes sent. Please try again in an hour.")

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0")
  const { error } = await admin.from("sms_alert_settings").upsert({
    merchant_id: merchantId,
    pending_phone: phone,
    code_hash: hashCode(merchantId, code),
    code_expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString(),
    code_attempts: 0,
    updated_at: new Date().toISOString(),
  })
  if (error) throw new SmsAlertError(error.message)

  const res = await sendSms(phone, `VLYR: Your verification code is ${code}. Enter it on your dashboard to confirm text alerts for low ratings. Msg & data rates may apply. Reply STOP to opt out.`)
  await logSms({ merchant_id: merchantId, to_phone: phone, kind: "verify" }, res)
  if (!res.ok) throw new SmsAlertError("We couldn't text that number. Please check it and try again.")
  return { pendingPhone: maskPhone(phone) }
}

/** Checks the code; on success the number is confirmed and alerts switch on. */
export async function confirmVerificationCode(merchantId: string, code: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from("sms_alert_settings")
    .select("pending_phone, code_hash, code_expires_at, code_attempts")
    .eq("merchant_id", merchantId)
    .maybeSingle()
  if (!data?.pending_phone || !data.code_hash || !data.code_expires_at || new Date(data.code_expires_at) < new Date()) {
    throw new SmsAlertError("That code has expired. Please send a new one.")
  }
  if (data.code_attempts >= MAX_CODE_ATTEMPTS) throw new SmsAlertError("Too many tries. Please send a new code.")

  if (hashCode(merchantId, code.replace(/\D/g, "")) !== data.code_hash) {
    await admin.from("sms_alert_settings").update({ code_attempts: data.code_attempts + 1 }).eq("merchant_id", merchantId)
    throw new SmsAlertError("That code isn't right. Please check the text and try again.")
  }

  const { error } = await admin
    .from("sms_alert_settings")
    .update({
      phone: data.pending_phone,
      enabled: true,
      verified_at: new Date().toISOString(),
      pending_phone: null,
      code_hash: null,
      code_expires_at: null,
      code_attempts: 0,
      updated_at: new Date().toISOString(),
    })
    .eq("merchant_id", merchantId)
  if (error) throw new SmsAlertError(error.message)
  return getAlertSettings(merchantId)
}

export async function setAlertsEnabled(merchantId: string, enabled: boolean) {
  const admin = createAdminClient()
  const { data } = await admin.from("sms_alert_settings").select("phone").eq("merchant_id", merchantId).maybeSingle()
  if (enabled && !data?.phone) throw new SmsAlertError("Confirm your number first.")
  await admin.from("sms_alert_settings").update({ enabled, updated_at: new Date().toISOString() }).eq("merchant_id", merchantId)
  return getAlertSettings(merchantId)
}

/** Removes the number completely. */
export async function removeAlertPhone(merchantId: string) {
  await createAdminClient().from("sms_alert_settings").delete().eq("merchant_id", merchantId)
  return getAlertSettings(merchantId)
}

/** A sample alert, so the manager can see what they'll receive. */
export async function sendTestAlert(merchantId: string) {
  if (!alertsLive()) throw new SmsAlertError("Text alerts aren't available yet.")
  const admin = createAdminClient()
  const [{ data: s }, { data: m }] = await Promise.all([
    admin.from("sms_alert_settings").select("phone, enabled").eq("merchant_id", merchantId).maybeSingle(),
    admin.from("merchants").select("business_name").eq("id", merchantId).maybeSingle(),
  ])
  if (!s?.phone) throw new SmsAlertError("Confirm your number first.")
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count } = await admin.from("sms_messages").select("id", { count: "exact", head: true }).eq("merchant_id", merchantId).eq("kind", "test").gte("created_at", since)
  if ((count ?? 0) >= 3) throw new SmsAlertError("You've sent 3 test texts this hour. Please try again later.")

  const text = alertText({ stars: 2, businessName: m?.business_name ?? "your business", seq: 1, feedback: "This is a test alert. Real ones show the customer's words here." })
  const res = await sendSms(s.phone, text)
  await logSms({ merchant_id: merchantId, to_phone: s.phone, kind: "test" }, res)
  if (!res.ok) throw new SmsAlertError("The test text couldn't be sent. Please try again in a minute.")
}

/** "vlyr.live/dashboard/feedback": always the live site, since texts go to real phones. */
function dashboardLink() {
  const base = /^https:\/\//.test(process.env.NEXT_PUBLIC_APP_URL ?? "") ? process.env.NEXT_PUBLIC_APP_URL! : "https://vlyr.live"
  return `${base.replace(/\/$/, "").replace(/^https:\/\/(www\.)?/, "")}/dashboard/feedback`
}

/**
 * VLYR Alert: 2-star rating for Dama Pastry (sticker 0042). "Cold coffee..."
 * Reply fast: vlyr.live/dashboard/feedback. Reply STOP to opt out.
 * At most two SMS segments.
 */
export function alertText(o: { stars: number; businessName: string; seq: number | null; feedback: string | null }) {
  const name = smsSafe(o.businessName).slice(0, 40)
  const head = `VLYR Alert: ${o.stars}-star rating for ${name}${o.seq ? ` (sticker ${formatSeq(o.seq)})` : ""}.`
  const tail = ` Reply fast: ${dashboardLink()}. Reply STOP to opt out.`
  const room = SMS_MAX_CHARS - head.length - tail.length - 3
  let words = smsSafe(o.feedback ?? "")
  let middle = ""
  if (words && room > 12) {
    if (words.length > room) words = `${words.slice(0, room - 3).trimEnd()}...`
    middle = ` "${words}"`
  } else if (room > 12) {
    middle = " No comment left."
  }
  return `${head}${middle}${tail}`.slice(0, SMS_MAX_CHARS)
}

/**
 * Texts the manager about a 1–3★ sticker rating. Never throws: a failed
 * text must not affect the customer's rating.
 */
export async function sendLowRatingAlert(o: { merchantId: string; scanId: string; labelId: string; stars: number; feedback: string | null }) {
  try {
    if (o.stars > 3 || !alertsLive()) return
    const admin = createAdminClient()
    const { data: s } = await admin.from("sms_alert_settings").select("phone, enabled").eq("merchant_id", o.merchantId).maybeSingle()
    if (!s?.enabled || !s.phone) return

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count } = await admin.from("sms_messages").select("id", { count: "exact", head: true }).eq("merchant_id", o.merchantId).eq("kind", "alert").gte("created_at", since)
    if ((count ?? 0) >= MAX_ALERTS_PER_DAY) return

    const [{ data: m }, { data: label }] = await Promise.all([
      admin.from("merchants").select("business_name").eq("id", o.merchantId).maybeSingle(),
      admin.from("label_instances").select("seq").eq("id", o.labelId).maybeSingle(),
    ])
    const text = alertText({ stars: o.stars, businessName: m?.business_name ?? "your business", seq: label?.seq ?? null, feedback: o.feedback })
    const res = await sendSms(s.phone, text)
    await logSms({ merchant_id: o.merchantId, to_phone: s.phone, kind: "alert", scan_id: o.scanId }, res)
  } catch (e) {
    console.error("[sms] low-rating alert failed:", e)
  }
}

/** Someone replied STOP (or similar) from this number: stop all alerts to it. */
export async function optOutPhone(rawPhone: string) {
  const phone = normalizeUsPhone(rawPhone)
  if (!phone) return 0
  const { data } = await createAdminClient()
    .from("sms_alert_settings")
    .update({ enabled: false, updated_at: new Date().toISOString() })
    .eq("phone", phone)
    .select("merchant_id")
  return data?.length ?? 0
}

/** They replied START: switch alerts back on for that number. */
export async function optInPhone(rawPhone: string) {
  const phone = normalizeUsPhone(rawPhone)
  if (!phone) return 0
  const { data } = await createAdminClient()
    .from("sms_alert_settings")
    .update({ enabled: true, updated_at: new Date().toISOString() })
    .eq("phone", phone)
    .not("verified_at", "is", null)
    .select("merchant_id")
  return data?.length ?? 0
}
