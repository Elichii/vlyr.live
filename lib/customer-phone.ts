/**
 * Confirming a customer's phone number with a texted code (server-only).
 *
 * Used on the rating page when a customer asks to be called or texted.
 * The number is only saved with their rating once they type the code in.
 */
import { createHash, randomInt } from "crypto"
import { createAdminClient } from "@/lib/supabase/admin"
import { alertsLive } from "@/lib/sms-alerts"
import { maskPhone, normalizeUsPhone, sendSms, smsSafe, smsStatus } from "@/lib/sms"

const CODE_TTL_MS = 10 * 60 * 1000
const MAX_ATTEMPTS = 5
const MAX_CODES_PER_HOUR = 3
/** A confirmed number can be used with a rating for this long */
const VERIFIED_FOR_MS = 60 * 60 * 1000

export class PhoneCodeError extends Error {}

/** Customer phone codes need texting to be switched on. */
export const customerPhoneVerificationOn = () => alertsLive()

const hash = (id: string, code: string) =>
  createHash("sha256").update(`${id}:${code}:${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""}`).digest("hex")

export async function sendCustomerCode(o: { email: string; phone: string; merchantId: string; businessName: string }) {
  if (!customerPhoneVerificationOn()) throw new PhoneCodeError("Phone confirmation isn't available right now.")
  const phone = normalizeUsPhone(o.phone)
  if (!phone) throw new PhoneCodeError("Please enter a US mobile number, e.g. (202) 555-0123.")

  const admin = createAdminClient()
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count } = await admin
    .from("phone_verifications")
    .select("id", { count: "exact", head: true })
    .eq("purpose", "customer")
    .eq("subject", o.email)
    .gte("created_at", since)
  if ((count ?? 0) >= MAX_CODES_PER_HOUR) throw new PhoneCodeError("Too many codes sent. Please try again later.")

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0")
  const { data: row, error } = await admin
    .from("phone_verifications")
    .insert({ purpose: "customer", subject: o.email, merchant_id: o.merchantId, phone, code_hash: "pending", expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString() })
    .select("id")
    .single()
  if (error || !row) throw new PhoneCodeError("Couldn't send a code right now. Please try again.")
  await admin.from("phone_verifications").update({ code_hash: hash(row.id, code) }).eq("id", row.id)

  const name = smsSafe(o.businessName).slice(0, 30) || "the business"
  const res = await sendSms(phone, `VLYR: Your code is ${code} to confirm your number for ${name}. Msg & data rates may apply. Reply STOP to opt out.`)
  await admin.from("sms_messages").insert({
    merchant_id: o.merchantId, to_phone: phone, kind: "customer_verify", status: smsStatus(res),
    provider_id: res.ok ? res.id : null, error: res.ok ? null : res.error,
  })
  if (!res.ok) throw new PhoneCodeError("We couldn't text that number. Please check it and try again.")
  return { verificationId: row.id, sentTo: maskPhone(phone) }
}

export async function confirmCustomerCode(o: { email: string; verificationId: string; code: string }) {
  const admin = createAdminClient()
  const { data: v } = await admin.from("phone_verifications").select("*").eq("id", o.verificationId).eq("purpose", "customer").maybeSingle()
  if (!v || v.subject !== o.email) throw new PhoneCodeError("Please send a new code.")
  if (v.verified_at) return { phone: maskPhone(v.phone) }
  if (new Date(v.expires_at) < new Date()) throw new PhoneCodeError("That code has expired. Please send a new one.")
  if (v.attempts >= MAX_ATTEMPTS) throw new PhoneCodeError("Too many tries. Please send a new code.")
  if (hash(v.id, o.code.replace(/\D/g, "")) !== v.code_hash) {
    await admin.from("phone_verifications").update({ attempts: v.attempts + 1 }).eq("id", v.id)
    throw new PhoneCodeError("That code isn't right. Please check the text and try again.")
  }
  await admin.from("phone_verifications").update({ verified_at: new Date().toISOString() }).eq("id", v.id)
  return { phone: maskPhone(v.phone) }
}

/** The confirmed number behind a verification, if it belongs to this customer and is recent. */
export async function verifiedCustomerPhone(email: string, verificationId: string | undefined | null): Promise<string | null> {
  if (!verificationId) return null
  const { data: v } = await createAdminClient()
    .from("phone_verifications")
    .select("phone, subject, verified_at")
    .eq("id", verificationId)
    .eq("purpose", "customer")
    .maybeSingle()
  if (!v?.verified_at || v.subject !== email) return null
  if (Date.now() - new Date(v.verified_at).getTime() > VERIFIED_FOR_MS) return null
  return v.phone
}
