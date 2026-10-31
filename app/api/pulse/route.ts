/**
 * Endpoints for the customer feedback page.
 *
 * GET  /api/pulse?c=V-XXXXXXXX
 *   -> { businessName, logoUrl, reviewUrl, rewardOffer, used, usedByMe, customer, reward }
 * POST /api/pulse { code, rating, feedback?, phone? }   (customer must be signed in with Google)
 *   -> { ok: true, reward }
 */
import { NextRequest, NextResponse, after } from "next/server"
import { sendLowRatingAlert } from "@/lib/sms-alerts"
import { getCustomer } from "@/lib/customer-session"
import { deviceFrom, networkLocation, sharedLocation } from "@/lib/scan-geo"
import { StickerUsedError, findActiveReward, getMyRating, getPulseContext, recordPulse } from "@/lib/pulse"

export async function GET(request: NextRequest) {
  const ctx = await getPulseContext(request.nextUrl.searchParams.get("c") ?? "")
  if (!ctx) return NextResponse.json({ error: "Unknown code" }, { status: 404 })

  const customer = getCustomer(request)
  const usedByMe = !!(ctx.used && customer && ctx.usedByEmail === customer.email)
  return NextResponse.json({
    code: ctx.code,
    businessName: ctx.businessName,
    logoUrl: ctx.logoUrl,
    reviewUrl: ctx.reviewUrl,
    rewardOffer: ctx.rewardOffer,
    rewardValidDays: ctx.rewardValidDays,
    used: ctx.used,
    usedByMe,
    customer: customer ? { name: customer.name, email: customer.email } : null,
    // Show the customer their code again if they come back to their own sticker
    reward: usedByMe && customer ? await findActiveReward(ctx.merchantId, customer.email) : null,
    myRating: usedByMe && customer ? await getMyRating(ctx.labelId, customer.email) : null,
  })
}

export async function POST(request: NextRequest) {
  const customer = getCustomer(request)
  if (!customer) return NextResponse.json({ error: "Please sign in with Google first.", code: "sign_in" }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const ctx = await getPulseContext(String(body.code ?? ""))
  if (!ctx) return NextResponse.json({ error: "Unknown code" }, { status: 404 })

  try {
    const { reward, scanId, rating, feedback } = await recordPulse({
      ctx,
      customer,
      rating: Number(body.rating),
      feedback: typeof body.feedback === "string" ? body.feedback : undefined,
      phone: typeof body.phone === "string" ? body.phone : undefined,
      contactPreference: typeof body.contactPreference === "string" ? body.contactPreference : undefined,
      gps: sharedLocation(body.location),
      network: networkLocation(request),
      device: deviceFrom(request),
    })
    // Low rating: text the manager right away (after the customer gets their answer)
    if (rating <= 3) after(() => sendLowRatingAlert({ merchantId: ctx.merchantId, scanId, labelId: ctx.labelId, stars: rating, feedback }))
    return NextResponse.json({ ok: true, reward })
  } catch (e) {
    if (e instanceof StickerUsedError) {
      return NextResponse.json({ error: e.message, code: "used" }, { status: 409 })
    }
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not save" }, { status: 400 })
  }
}
