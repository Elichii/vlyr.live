/**
 * Emails to business owners (server-only):
 * - every 1–3★ sticker rating
 * - every new 1–3★ Google review
 * - a welcome email when setup is finished
 *
 * Alerts go to the account email (merchants.email) and are on by default; the
 * owner can switch them off on the Feedback page (auth user_metadata.email_alerts).
 * Nothing here throws: a failed email never affects ratings or setup.
 */
import { createAdminClient } from "@/lib/supabase/admin"
import { appUrl, emailConfigured, emailLayout, escapeHtml, sendEmail } from "@/lib/email"

const FOOTER_ALERTS = `You get these because you run this business on VLYR. <a href="${appUrl("/dashboard/feedback")}" style="color:#71717a">Turn off email alerts</a>.`

const stars = (n: number) => "★".repeat(n) + "☆".repeat(Math.max(0, 5 - n))

export interface EmailAlertSettings {
  available: boolean
  enabled: boolean
  email: string | null
}

export async function getEmailAlertSettings(merchantId: string): Promise<EmailAlertSettings> {
  const admin = createAdminClient()
  const [{ data: m }, { data: u }] = await Promise.all([
    admin.from("merchants").select("email").eq("id", merchantId).maybeSingle(),
    admin.auth.admin.getUserById(merchantId),
  ])
  return {
    available: emailConfigured(),
    enabled: u?.user?.user_metadata?.email_alerts !== false,
    email: m?.email || u?.user?.email || null,
  }
}

export async function setEmailAlertsEnabled(merchantId: string, enabled: boolean) {
  const admin = createAdminClient()
  const { data } = await admin.auth.admin.getUserById(merchantId)
  if (data?.user) {
    await admin.auth.admin.updateUserById(merchantId, { user_metadata: { ...data.user.user_metadata, email_alerts: enabled } })
  }
  return getEmailAlertSettings(merchantId)
}

/** Owner's address and business name, or null if alerts are off / email isn't set up. */
async function alertTarget(merchantId: string) {
  if (!emailConfigured()) return null
  const s = await getEmailAlertSettings(merchantId)
  if (!s.enabled || !s.email) return null
  const { data: m } = await createAdminClient().from("merchants").select("business_name").eq("id", merchantId).maybeSingle()
  return { email: s.email, businessName: m?.business_name || "your business" }
}

function lowRatingEmail(o: { stars: number; businessName: string; source: string; who: string | null; feedback: string | null }) {
  const subject = `${o.stars}-star ${o.source} for ${o.businessName}`
  const quote = o.feedback?.trim()
  const body =
    `<p style="margin:0 0 12px"><span style="color:#f59e0b;font-size:18px;letter-spacing:2px">${stars(o.stars)}</span><br>` +
    `${o.who ? `${escapeHtml(o.who)} left` : "A customer left"} a ${o.stars}-star ${escapeHtml(o.source)} for <strong>${escapeHtml(o.businessName)}</strong>.</p>` +
    (quote
      ? `<p style="margin:0 0 12px;padding:12px 14px;background:#fafafa;border-left:3px solid #FFE100;border-radius:6px;font-style:italic">“${escapeHtml(quote.slice(0, 1500))}”</p>`
      : `<p style="margin:0 0 12px;color:#71717a">No comment left.</p>`) +
    `<p style="margin:0">Reaching out quickly is the best way to turn this around.</p>`
  const text = `${o.who ?? "A customer"} left a ${o.stars}-star ${o.source} for ${o.businessName}.\n\n${quote ? `"${quote}"` : "No comment left."}\n\nSee it on your dashboard: ${appUrl("/dashboard/feedback")}\n\nTurn off email alerts: ${appUrl("/dashboard/feedback")}`
  return { subject, html: emailLayout({ preheader: quote?.slice(0, 90) || subject, heading: `New ${o.stars}-star ${o.source}`, body, button: { label: "Open your feedback", href: appUrl("/dashboard/feedback") }, footer: FOOTER_ALERTS }), text }
}

/** Email the owner about a 1–3★ sticker rating. */
export async function sendLowRatingEmail(o: { merchantId: string; stars: number; feedback: string | null }) {
  try {
    if (o.stars > 3) return
    const t = await alertTarget(o.merchantId)
    if (!t) return
    const msg = lowRatingEmail({ stars: o.stars, businessName: t.businessName, source: "rating", who: null, feedback: o.feedback })
    await sendEmail({ to: t.email, ...msg, tag: "low_rating" })
  } catch (e) {
    console.error("[email] low-rating email failed:", e)
  }
}

/** Email the owner about a new 1–3★ Google review. */
export async function sendGoogleReviewEmail(o: { merchantId: string; stars: number; reviewer: string | null; comment: string | null }) {
  try {
    if (o.stars > 3) return false
    const t = await alertTarget(o.merchantId)
    if (!t) return false
    const msg = lowRatingEmail({ stars: o.stars, businessName: t.businessName, source: "Google review", who: o.reviewer, feedback: o.comment })
    const res = await sendEmail({ to: t.email, ...msg, tag: "google_review" })
    return res.ok
  } catch (e) {
    console.error("[email] Google review email failed:", e)
    return false
  }
}

/** Welcome email when setup is finished (sent once). */
export async function sendWelcomeEmail(merchantId: string) {
  try {
    if (!emailConfigured()) return
    const s = await getEmailAlertSettings(merchantId)
    if (!s.email) return
    const { data: m } = await createAdminClient().from("merchants").select("business_name, owner_name").eq("id", merchantId).maybeSingle()
    const business = m?.business_name || "your business"
    const first = (m?.owner_name || "").trim().split(/\s+/)[0]
    const canReply = !!process.env.EMAIL_REPLY_TO
    const hi = first ? `Hi ${escapeHtml(first)},` : "Hi there,"
    const body =
      `<p style="margin:0 0 12px">${hi}</p>` +
      `<p style="margin:0 0 12px"><strong>${escapeHtml(business)}</strong> is set up on VLYR. Here's how to get your first ratings:</p>` +
      `<ol style="margin:0 0 12px;padding-left:20px">` +
      `<li style="margin-bottom:6px"><strong>Print your stickers</strong> on US Letter sticker paper at 100% size.</li>` +
      `<li style="margin-bottom:6px"><strong>Put one on every order.</strong> Each sticker has its own QR code.</li>` +
      `<li><strong>Happy customers</strong> are guided to Google; <strong>1–3 star feedback</strong> comes straight to you, by email and on your dashboard.</li>` +
      `</ol>` +
      (canReply ? `<p style="margin:0">Questions? Just reply to this email.</p>` : "")
    const text = `${first ? `Hi ${first},` : "Hi there,"}\n\n${business} is set up on VLYR.\n\n1. Print your stickers on US Letter sticker paper at 100% size.\n2. Put one on every order. Each sticker has its own QR code.\n3. Happy customers are guided to Google; 1–3 star feedback comes straight to you.\n\nPrint your stickers: ${appUrl("/dashboard/stickers")}${canReply ? "\n\nQuestions? Just reply to this email." : ""}`
    await sendEmail({
      to: s.email,
      subject: `Welcome to VLYR, ${business} is ready`,
      html: emailLayout({ preheader: "Print your stickers and start collecting ratings.", heading: "You're all set", body, button: { label: "Print your stickers", href: appUrl("/dashboard/stickers") }, footer: "VLYR, operated by Mare LLC." }),
      text,
      tag: "welcome",
    })
  } catch (e) {
    console.error("[email] welcome email failed:", e)
  }
}
