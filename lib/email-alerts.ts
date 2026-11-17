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
import { appUrl, detailRows, emailConfigured, emailLayout, escapeHtml, paragraph, quoteBlock, sendEmail, starRow } from "@/lib/email"

const FOOTER_ALERTS = `You're receiving this because email alerts are on for your business. <a href="${appUrl("/dashboard/feedback")}" style="color:#6E6E73;text-decoration:underline">Manage alerts</a><br>VLYR · Mare LLC`

const CONTACT_LABEL: Record<string, string> = { call: "A phone call", text: "A text message", email: "An email" }

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

export function lowRatingEmail(o: {
  stars: number
  businessName: string
  source: "rating" | "Google review"
  who: string | null
  feedback: string | null
  contact?: string | null
}) {
  const quote = o.feedback?.trim().slice(0, 1500) || null
  const google = o.source === "Google review"
  const subject = `${o.stars}-star ${o.source} for ${o.businessName}`
  const rows: [string, string][] = [
    ["Business", o.businessName],
    ["From", o.who || (google ? "A Google user" : "A customer")],
    ["Where", google ? "Google Business Profile" : "VLYR sticker"],
  ]
  if (o.contact && CONTACT_LABEL[o.contact]) rows.push(["Prefers", CONTACT_LABEL[o.contact]])
  const blocks = [
    starRow(o.stars),
    quote ? quoteBlock(quote) : paragraph(`<span style="color:#6E6E73">No comment was left.</span>`),
    detailRows(rows),
    paragraph(google
      ? "A thoughtful public reply, sent soon, shows future customers you care."
      : "This feedback came only to you. Reaching out quickly is the best way to make it right."),
  ]
  const html = emailLayout({
    preheader: quote ? `“${quote.slice(0, 80)}”` : `${o.stars} out of 5 stars for ${o.businessName}`,
    eyebrow: google ? "New Google review" : "New private feedback",
    heading: `${o.stars} out of 5 stars`,
    blocks,
    button: { label: google ? "Review and reply" : "Open feedback", href: appUrl("/dashboard/feedback") },
    footer: FOOTER_ALERTS,
  })
  const text = [
    `${google ? "New Google review" : "New private feedback"}: ${o.stars} out of 5 stars`,
    "",
    quote ? `"${quote}"` : "No comment was left.",
    "",
    ...rows.map(([k, v]) => `${k}: ${v}`),
    "",
    `Open feedback: ${appUrl("/dashboard/feedback")}`,
    "",
    `Manage alerts: ${appUrl("/dashboard/feedback")}`,
  ].join("\n")
  return { subject, html, text }
}

/** Email the owner about a 1–3★ sticker rating. */
export async function sendLowRatingEmail(o: { merchantId: string; scanId: string; stars: number; feedback: string | null }) {
  try {
    if (o.stars > 3) return
    const t = await alertTarget(o.merchantId)
    if (!t) return
    const { data: scan } = await createAdminClient().from("scans").select("customer_name, contact_preference").eq("id", o.scanId).maybeSingle()
    const msg = lowRatingEmail({ stars: o.stars, businessName: t.businessName, source: "rating", who: scan?.customer_name ?? null, feedback: o.feedback, contact: scan?.contact_preference ?? null })
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
    await sendEmail({ to: s.email, ...welcomeEmail(first, business), tag: "welcome" })
  } catch (e) {
    console.error("[email] welcome email failed:", e)
  }
}

export function welcomeEmail(first: string, business: string) {
  const canReply = !!process.env.EMAIL_REPLY_TO
  const step = (n: number, title: string, body: string) =>
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>` +
    `<td width="40" valign="top"><div style="width:28px;height:28px;border-radius:14px;background:#FFE100;color:#1D1D1F;font-family:Inter,-apple-system,Helvetica,Arial,sans-serif;font-size:13px;line-height:28px;font-weight:600;text-align:center">${n}</div></td>` +
    `<td valign="top" style="font-family:Inter,-apple-system,Helvetica,Arial,sans-serif;font-size:15px;line-height:22px;color:#1D1D1F"><strong style="font-weight:600">${title}</strong><br><span style="color:#6E6E73">${body}</span></td>` +
    `</tr></table>`
  const blocks = [
    paragraph(`${first ? `Hi ${escapeHtml(first)},` : "Hi there,"}<br><strong style="font-weight:600">${escapeHtml(business)}</strong> is set up and ready to collect ratings.`),
    step(1, "Print your stickers", "US Letter sticker paper, printed at 100% (Actual size)."),
    step(2, "Add one to every order", "Each sticker has its own QR code, so every rating is tied to one order."),
    step(3, "Hear from every customer", "Happy customers are invited to Google. 1–3 star feedback comes privately to you, by email and on your dashboard."),
    ...(canReply ? [paragraph(`<span style="color:#6E6E73">Questions? Just reply to this email.</span>`)] : []),
  ]
  const text = `${first ? `Hi ${first},` : "Hi there,"}\n\n${business} is set up and ready to collect ratings.\n\n1. Print your stickers: US Letter sticker paper, printed at 100% (Actual size).\n2. Add one to every order. Each sticker has its own QR code.\n3. Happy customers are invited to Google. 1–3 star feedback comes privately to you.\n\nPrint your stickers: ${appUrl("/dashboard/stickers")}${canReply ? "\n\nQuestions? Just reply to this email." : ""}`
  return {
    subject: `Welcome to VLYR. ${business} is ready.`,
    html: emailLayout({ preheader: "Print your stickers and start hearing from every customer.", eyebrow: "Welcome to VLYR", heading: "You're all set.", blocks, button: { label: "Print your stickers", href: appUrl("/dashboard/stickers") }, footer: "VLYR · Mare LLC" }),
    text,
  }
}
