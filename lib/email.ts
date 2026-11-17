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

/*
 * Brand, taken from the sticker: Inter, near-black #1D1D1F on white, the
 * sticker's #D2D2D6 hairline border, small spaced capitals, VLYR yellow as
 * the only accent, and "POWERED BY VLYR" at the foot.
 */
const INK = "#1D1D1F"
const MUTED = "#6E6E73"
const HAIRLINE = "#D2D2D6"
const CANVAS = "#F5F5F7"
const YELLOW = "#FFE100"
const FONT = "Inter,-apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',Roboto,Helvetica,Arial,sans-serif"

const asset = (p: string) => `https://www.vlyr.live${p}`

/** Small spaced capitals, like "TAKES LESS THAN A MINUTE" on the sticker. */
export const eyebrow = (t: string, color = MUTED) =>
  `<div style="font-family:${FONT};font-size:11px;line-height:16px;font-weight:500;letter-spacing:0.2em;text-transform:uppercase;color:${color}">${escapeHtml(t)}</div>`

/** Five stars, filled in VLYR yellow (outlined in grey when empty). */
export const starRow = (n: number) =>
  `<div style="font-size:22px;line-height:26px;letter-spacing:3px">` +
  Array.from({ length: 5 }, (_, i) => `<span style="color:${i < n ? "#FFC800" : HAIRLINE}">★</span>`).join("") +
  `</div>`

/** The customer's words, set apart with a yellow rule. */
export const quoteBlock = (t: string) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate"><tr>` +
  `<td width="3" style="background:${YELLOW};border-radius:3px;font-size:0;line-height:0">&nbsp;</td>` +
  `<td style="background:${CANVAS};border-radius:0 12px 12px 0;padding:16px 18px;font-family:${FONT};font-size:16px;line-height:24px;color:${INK}">“${escapeHtml(t)}”</td>` +
  `</tr></table>`

/** Label / value rows with hairlines, like an Apple receipt. */
export const detailRows = (rows: [string, string][]) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">` +
  rows.map(([k, v], i) =>
    `<tr><td style="padding:12px 0;${i ? `border-top:1px solid ${HAIRLINE};` : ""}font-family:${FONT};font-size:14px;line-height:20px;color:${MUTED}">${escapeHtml(k)}</td>` +
    `<td align="right" style="padding:12px 0;${i ? `border-top:1px solid ${HAIRLINE};` : ""}font-family:${FONT};font-size:14px;line-height:20px;color:${INK};font-weight:500">${escapeHtml(v)}</td></tr>`,
  ).join("") +
  `</table>`

export const paragraph = (html: string) =>
  `<p style="margin:0 0 14px;font-family:${FONT};font-size:16px;line-height:25px;color:${INK}">${html}</p>`

const spacer = (h: number) => `<tr><td style="height:${h}px;font-size:0;line-height:0">&nbsp;</td></tr>`

/**
 * The shared email shell: wordmark, eyebrow, headline, content blocks,
 * one black pill button, then a quiet footer with "POWERED BY VLYR".
 */
export function emailLayout(o: {
  preheader: string
  eyebrow: string
  heading: string
  blocks: string[]
  button?: { label: string; href: string }
  footer: string
}) {
  const button = o.button
    ? spacer(8) + `<tr><td><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:${INK};border-radius:980px">` +
      `<a href="${escapeHtml(o.button.href)}" style="display:inline-block;padding:13px 26px;font-family:${FONT};font-size:15px;line-height:20px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:980px">${escapeHtml(o.button.label)}&nbsp;&rsaquo;</a>` +
      `</td></tr></table></td></tr>`
    : ""
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light">
<title>${escapeHtml(o.heading)}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root{color-scheme:light only}
  body{margin:0;padding:0;-webkit-text-size-adjust:100%}
  a{color:${INK}}
  @media (max-width:600px){.card{padding:28px 22px!important;border-radius:0!important;border-left:0!important;border-right:0!important}.h1{font-size:26px!important;line-height:32px!important}}
</style>
</head>
<body style="margin:0;padding:0;background:${CANVAS}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${CANVAS}">${escapeHtml(o.preheader)}${"&nbsp;&zwnj;".repeat(40)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CANVAS}"><tr><td align="center" style="padding:40px 0">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
    <tr><td align="center" style="padding:0 0 24px">
      <img src="${asset("/images/vlyr-wordmark.png")}" width="84" height="30" alt="VLYR" style="display:block;border:0;width:84px;height:auto">
    </td></tr>
    <tr><td class="card" style="background:#FFFFFF;border:1px solid ${HAIRLINE};border-radius:20px;padding:40px 40px 36px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr><td>${eyebrow(o.eyebrow)}</td></tr>
        ${spacer(10)}
        <tr><td class="h1" style="font-family:${FONT};font-size:30px;line-height:36px;font-weight:600;letter-spacing:-0.022em;color:${INK}">${escapeHtml(o.heading)}</td></tr>
        ${spacer(22)}
        ${o.blocks.map((b) => `<tr><td>${b}</td></tr>${spacer(18)}`).join("")}
        ${button}
      </table>
    </td></tr>
    <tr><td align="center" style="padding:28px 24px 0">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="font-family:${FONT};font-size:9px;line-height:14px;font-weight:500;letter-spacing:0.2em;color:${MUTED};padding-right:8px">POWERED BY</td>
        <td><img src="${asset("/images/vlyr-wordmark.png")}" width="40" height="14" alt="VLYR" style="display:block;border:0;width:40px;height:auto"></td>
      </tr></table>
    </td></tr>
    <tr><td align="center" style="padding:14px 32px 0;font-family:${FONT};font-size:12px;line-height:18px;color:${MUTED}">${o.footer}</td></tr>
  </table>
</td></tr></table>
</body></html>`
}
