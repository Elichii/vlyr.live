import { NextRequest, NextResponse } from "next/server"
import { createHmac } from "crypto"
import { createAdminClient } from "@/lib/supabase/admin"

// ── Square Signature Verification ──────────────────────────────────
const SQUARE_SIGNATURE_KEY = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY ?? ""
const SQUARE_NOTIFICATION_URL =
  process.env.SQUARE_NOTIFICATION_URL ??
  `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL ?? "localhost:3000"}/api/webhooks/square`

function verifySquareSignature(
  body: string,
  signature: string | null,
): boolean {
  if (!signature || !SQUARE_SIGNATURE_KEY) return false
  const combined = SQUARE_NOTIFICATION_URL + body
  const expected = createHmac("sha256", SQUARE_SIGNATURE_KEY)
    .update(combined)
    .digest("base64")
  return expected === signature
}

// ── Event Handlers ─────────────────────────────────────────────────

async function handlePaymentMade(payload: Record<string, unknown>, eventId?: string) {
  const supabase = createAdminClient()

  // Extract the invoice data from the event
  const data = payload.data as Record<string, unknown> | undefined
  const obj = (data?.object as Record<string, unknown>) ?? {}
  const invoice = (obj.invoice as Record<string, unknown>) ?? {}

  const customerId =
    (invoice.primary_recipient as Record<string, unknown>)?.customer_id as
      | string
      | undefined
  const invoiceId = invoice.id as string | undefined
  const totalMoney = (invoice.payment_requests as Array<Record<string, unknown>>)?.[0]
    ?.computed_amount_money as Record<string, unknown> | undefined
  const amountCents = (totalMoney?.amount as number) ?? 0

  if (!customerId) {
    console.error("[Square Webhook] No customer_id found in invoice.payment_made")
    return NextResponse.json({ error: "No customer_id" }, { status: 400 })
  }

  // Find the merchant by square_customer_id
  const { data: merchant, error: findErr } = await supabase
    .from("merchants")
    .select("id")
    .eq("square_customer_id", customerId)
    .single()

  if (findErr || !merchant) {
    console.error("[Square Webhook] No merchant for customer_id:", customerId, findErr)
    return NextResponse.json({ error: "Merchant not found" }, { status: 404 })
  }

  // Update merchant to active + provisioned
  const { error: updateErr } = await supabase
    .from("merchants")
    .update({
      subscription_status: "active",
      is_provisioned: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", merchant.id)

  if (updateErr) {
    console.error("[Square Webhook] Failed to update merchant:", updateErr)
    return NextResponse.json({ error: "Update failed" }, { status: 500 })
  }

  // Upsert subscription record
  await supabase.from("subscriptions").upsert(
    {
      merchant_id: merchant.id,
      stripe_customer_id: customerId, // reuse column for square ID
      stripe_subscription_id: invoiceId ?? `sq_inv_${Date.now()}`,
      status: "active",
      current_period_end: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000,
      ).toISOString(),
    },
    { onConflict: "merchant_id" },
  )

  // Log for audit
  await supabase.from("billing_logs").insert({
    merchant_id: merchant.id,
    event_type: "invoice.payment_made",
    square_invoice_id: eventId ?? invoiceId,
    square_customer_id: customerId,
    status: "paid",
    amount_cents: amountCents,
    raw_payload: payload,
  })

  // Broadcast via Supabase Realtime so the UI auto-refreshes
  await supabase.channel("billing").send({
    type: "broadcast",
    event: "payment_success",
    payload: { merchant_id: merchant.id },
  })

  console.log("[Square Webhook] invoice.payment_made processed for merchant:", merchant.id)
  return NextResponse.json({ ok: true })
}

async function handlePaymentFailed(payload: Record<string, unknown>, eventId?: string) {
  const supabase = createAdminClient()

  const data = payload.data as Record<string, unknown> | undefined
  const obj = (data?.object as Record<string, unknown>) ?? {}
  const invoice = (obj.invoice as Record<string, unknown>) ?? {}

  const customerId =
    (invoice.primary_recipient as Record<string, unknown>)?.customer_id as
      | string
      | undefined
  const invoiceId = invoice.id as string | undefined

  if (!customerId) {
    console.error("[Square Webhook] No customer_id in charge_failed event")
    return NextResponse.json({ error: "No customer_id" }, { status: 400 })
  }

  const { data: merchant, error: findErr } = await supabase
    .from("merchants")
    .select("id")
    .eq("square_customer_id", customerId)
    .single()

  if (findErr || !merchant) {
    console.error("[Square Webhook] No merchant for customer_id:", customerId)
    return NextResponse.json({ error: "Merchant not found" }, { status: 404 })
  }

  // Mark as past_due
  await supabase
    .from("merchants")
    .update({
      subscription_status: "past_due",
      updated_at: new Date().toISOString(),
    })
    .eq("id", merchant.id)

  // Update subscription
  await supabase
    .from("subscriptions")
    .update({ status: "past_due" })
    .eq("merchant_id", merchant.id)

  // Log the failure
  await supabase.from("billing_logs").insert({
    merchant_id: merchant.id,
    event_type: "invoice.scheduled_charge_failed",
    square_invoice_id: eventId ?? invoiceId,
    square_customer_id: customerId,
    status: "failed",
    amount_cents: 0,
    raw_payload: payload,
  })

  console.log("[Square Webhook] charge_failed processed for merchant:", merchant.id)
  return NextResponse.json({ ok: true })
}

// ── POST Handler ───────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient()
    const rawBody = await request.text()
    const signature = request.headers.get("x-square-hmacsha256-signature")

    // Step 1: Verify signature
    if (!verifySquareSignature(rawBody, signature)) {
      console.error("[Square Webhook] Invalid signature")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Step 2: Parse and check idempotency
    const payload = JSON.parse(rawBody) as Record<string, unknown>
    const eventType = payload.type as string | undefined
    const eventId = payload.event_id as string | undefined

    // Idempotency: skip if we already processed this event_id
    if (eventId) {
      const { data: existing } = await supabaseAdmin
        .from("billing_logs")
        .select("id")
        .eq("square_invoice_id", eventId)
        .limit(1)
        .maybeSingle()

      if (existing) {
        console.log("[Square Webhook] Duplicate event_id, skipping:", eventId)
        return NextResponse.json({ ok: true, duplicate: true })
      }
    }

    switch (eventType) {
      case "invoice.payment_made":
        return await handlePaymentMade(payload, eventId)

      case "invoice.scheduled_charge_failed":
        return await handlePaymentFailed(payload, eventId)

      default:
        // Acknowledge unhandled events
        console.log("[Square Webhook] Unhandled event type:", eventType)
        return NextResponse.json({ ok: true, ignored: eventType })
    }
  } catch (err) {
    console.error("[Square Webhook] Unexpected error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
