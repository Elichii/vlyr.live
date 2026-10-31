/**
 * Sending text messages through Twilio.
 *
 * Every text goes through our Twilio Messaging Service
 * (TWILIO_MESSAGING_SERVICE_SID), which carries the registered A2P 10DLC
 * campaign "VLYR Feedback Alerts". If no Messaging Service is set, the
 * number TWILIO_PHONE_NUMBER is used instead.
 *
 * While SMS_ALERTS_LIVE is not "true" nothing is sent: the text is only
 * written to the server log (dry run).
 *
 * Server-only.
 */
import twilio from "twilio"

export function smsConfigured() {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    (process.env.TWILIO_MESSAGING_SERVICE_SID || process.env.TWILIO_PHONE_NUMBER)
  )
}

/** Real texts go out only when SMS_ALERTS_LIVE=true. */
export const smsLive = () => process.env.SMS_ALERTS_LIVE === "true"

/**
 * US/Canada numbers as E.164 digits without "+": "(202) 555-0123" -> "12025550123".
 * Returns null for anything else.
 */
export function normalizeUsPhone(input: string | null | undefined): string | null {
  const digits = (input ?? "").replace(/\D/g, "")
  const n = digits.length === 10 ? `1${digits}` : digits
  // NANP: area code and exchange can't start with 0 or 1
  return /^1[2-9]\d{2}[2-9]\d{6}$/.test(n) ? n : null
}

/** "12025550123" -> "(202) 555-0123" */
export function formatUsPhone(e164: string) {
  const d = e164.replace(/^1/, "")
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
}

/** "12025550123" -> "(•••) •••-0123" */
export const maskPhone = (e164: string) => `(•••) •••-${e164.slice(-4)}`

/**
 * Plain characters only, so a text stays in the cheap GSM format
 * (emoji or curly quotes switch phones to a 70-character format).
 */
export function smsSafe(s: string) {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

/** Longest text we send: two SMS segments. */
export const SMS_MAX_CHARS = 306

/** Twilio error 21610: the person replied STOP to our number. */
export const TWILIO_OPTED_OUT = 21610

export type SmsResult =
  | { ok: true; id: string | null; simulated?: boolean }
  | { ok: false; error: string; code?: number }

/** What to record in sms_messages.status for a send result. */
export const smsStatus = (r: SmsResult) => (r.ok ? (r.simulated ? "dry_run" : "sent") : "failed")

/**
 * The live site, e.g. https://www.vlyr.live (NEXT_PUBLIC_APP_URL).
 * Only a public https address can receive Twilio's delivery reports.
 */
function statusCallbackUrl() {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "")
  return /^https:\/\//.test(base) ? `${base}/api/webhooks/twilio-sms/status` : undefined
}

let client: ReturnType<typeof twilio> | null = null
const twilioClient = () => (client ??= twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!))

export async function sendSms(to: string, text: string): Promise<SmsResult> {
  const digits = normalizeUsPhone(to)
  if (!digits) return { ok: false, error: "Not a valid US phone number." }
  const body = smsSafe(text).slice(0, SMS_MAX_CHARS)

  if (!smsLive()) {
    console.log(`[sms dry-run] to ${maskPhone(digits)}: ${body}`)
    return { ok: true, id: null, simulated: true }
  }
  if (!smsConfigured()) return { ok: false, error: "Text messaging is not set up." }

  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID
  const statusCallback = statusCallbackUrl()
  try {
    const message = await twilioClient().messages.create({
      to: `+${digits}`,
      body,
      ...(statusCallback ? { statusCallback } : {}),
      ...(messagingServiceSid ? { messagingServiceSid } : { from: process.env.TWILIO_PHONE_NUMBER! }),
    })
    return { ok: true, id: message.sid }
  } catch (e) {
    const err = e as { code?: number; message?: string; status?: number }
    console.error("[sms] Twilio rejected the message:", err.status, err.code, err.message)
    return { ok: false, error: `Twilio ${err.code ?? err.status ?? ""}: ${err.message ?? "unknown error"}`.slice(0, 300), code: err.code }
  }
}
