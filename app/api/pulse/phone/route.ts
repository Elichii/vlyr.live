/**
 * POST /api/pulse/phone
 *   { action: "send", code: "V-XXXXXXXX", phone }      -> { verificationId, sentTo }
 *   { action: "verify", verificationId, otp }          -> { ok: true, phone }
 *
 * Confirms the phone number a customer leaves with a rating. The customer
 * must be signed in with Google, and the sticker must be active.
 */
import { NextRequest, NextResponse } from "next/server"
import { getCustomer } from "@/lib/customer-session"
import { getPulseContext } from "@/lib/pulse"
import { PhoneCodeError, confirmCustomerCode, sendCustomerCode } from "@/lib/customer-phone"

export async function POST(request: NextRequest) {
  const customer = getCustomer(request)
  if (!customer) return NextResponse.json({ error: "Please sign in with Google first." }, { status: 401 })
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  try {
    if (body.action === "send") {
      const ctx = await getPulseContext(String(body.code ?? ""))
      if (!ctx?.active) return NextResponse.json({ error: "This sticker isn't active." }, { status: 404 })
      const r = await sendCustomerCode({ email: customer.email, phone: String(body.phone ?? ""), merchantId: ctx.merchantId, businessName: ctx.businessName })
      return NextResponse.json(r)
    }
    if (body.action === "verify") {
      const r = await confirmCustomerCode({ email: customer.email, verificationId: String(body.verificationId ?? ""), code: String(body.otp ?? "") })
      return NextResponse.json({ ok: true, ...r })
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch (e) {
    if (e instanceof PhoneCodeError) return NextResponse.json({ error: e.message }, { status: 400 })
    console.error("[pulse/phone]", e)
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 })
  }
}
