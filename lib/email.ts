/**
 * Sending email through Resend (server-only).
 *
 * Env: RESEND_API_KEY, EMAIL_FROM ("VLYR <notifications@mail.vlyr.live>"),
 * optional EMAIL_REPLY_TO (mail.vlyr.live has no inbox, so replies go here).
 * Never throws: a failed email must not break the action that triggered it.
 */
const RESEND_URL = "https://api.resend.com/emails"

export const emailConfigured = () => !!process.env.RESEND_API_KEY && !!process.env.EMAIL_FROM

export type EmailResult = { ok: true; id: string } | { ok: false; error: string }

export async function sendEmail(o: { to: string; subject: string; html: string; text: string; tag?: string }): Promise<EmailResult> {
  if (!emailConfigured()) return { ok: false, error: "Email is not configured" }
  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [o.to],
        subject: o.subject,
        html: o.html,
        text: o.text,
        ...(process.env.EMAIL_REPLY_TO ? { reply_to: process.env.EMAIL_REPLY_TO } : {}),
        ...(o.tag ? { tags: [{ name: "kind", value: o.tag }] } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    })
    const json = (await res.json().catch(() => ({}))) as { id?: string; message?: string }
    if (!res.ok || !json.id) {
      console.error("[email] send failed:", res.status, json.message)
      return { ok: false, error: json.message ?? `HTTP ${res.status}` }
    }
    return { ok: true, id: json.id }
  } catch (e) {
    console.error("[email] send failed:", e)
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" }
  }
}

export const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;")

/** The live site for links in emails (emails are read on other devices, never localhost). */
export function appUrl(path = "") {
  const env = process.env.NEXT_PUBLIC_APP_URL ?? ""
  const base = /^https:\/\//.test(env) ? env.replace(/\/$/, "") : "https://www.vlyr.live"
  return `${base}${path}`
}

/** A simple, mail-client-safe layout: heading, paragraphs (already HTML), one button. */
export function emailLayout(o: { preheader: string; heading: string; body: string; button?: { label: string; href: string }; footer: string }) {
  const button = o.button
    ? `<tr><td style="padding:8px 0 24px"><a href="${escapeHtml(o.button.href)}" style="display:inline-block;background:#111111;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:10px">${escapeHtml(o.button.label)}</a></td></tr>`
    : ""
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f4f4f5">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(o.preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;padding:28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#18181b">
<tr><td style="padding-bottom:20px"><span style="display:inline-block;background:#FFE100;color:#111;font-weight:800;font-size:13px;letter-spacing:.08em;padding:4px 10px;border-radius:6px">VLYR</span></td></tr>
<tr><td style="font-size:20px;font-weight:700;line-height:1.3;padding-bottom:12px">${escapeHtml(o.heading)}</td></tr>
<tr><td style="font-size:15px;line-height:1.6;color:#3f3f46;padding-bottom:12px">${o.body}</td></tr>
${button}
<tr><td style="border-top:1px solid #e4e4e7;padding-top:16px;font-size:12px;line-height:1.5;color:#71717a">${o.footer}</td></tr>
</table></td></tr></table></body></html>`
}
