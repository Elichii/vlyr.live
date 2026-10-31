/**
 * GET /api/invite/flyer[?ref=name][&paper=letter|a4]
 *
 * One-page printable flyer inviting a business to the free trial.
 * Its QR code opens /invite (with the ref, to see who brought them in).
 */
import { NextRequest, NextResponse } from "next/server"
import { PDFDocument, StandardFonts, rgb } from "pdf-lib"
import QRCode from "qrcode"
import { qrPath } from "@/lib/label-sheet"
import { PAPER } from "@/lib/label-sheet-layout"
import { buildInviteUrl } from "@/lib/short-code"
import { FREE_STICKER_LIMIT } from "@/lib/onboarding-types"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams
  const ref = (q.get("ref") ?? "").replace(/[^\w.-]/g, "").slice(0, 64)
  const paper = q.get("paper") === "a4" ? PAPER.a4 : PAPER.letter
  const inviteUrl = buildInviteUrl(ref || undefined)

  const pdf = await PDFDocument.create()
  pdf.setTitle("VLYR free trial invite")
  const page = pdf.addPage([paper.w, paper.h])
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const { w, h } = { w: paper.w, h: paper.h }
  const black = rgb(0.04, 0.04, 0.04)
  const grey = rgb(0.35, 0.35, 0.35)
  const yellow = rgb(1, 0.882, 0)

  const center = (text: string, y: number, size: number, font = regular, color = black) =>
    page.drawText(text, { x: (w - font.widthOfTextAtSize(text, size)) / 2, y, size, font, color })

  // Top band
  page.drawRectangle({ x: 0, y: h - 120, width: w, height: 120, color: black })
  center("VLYR", h - 62, 34, bold, yellow)
  center("Reputation Shield for local businesses", h - 92, 12, regular, rgb(0.85, 0.85, 0.85))

  center("You're invited to a free trial", h - 175, 26, bold)
  center(`${FREE_STICKER_LIMIT} free QR stickers for your takeaway boxes.`, h - 205, 14, regular, grey)
  center("Happy customers go to your Google reviews. Unhappy ones tell you privately.", h - 225, 11, regular, grey)

  // QR code
  const qr = QRCode.create(inviteUrl, { errorCorrectionLevel: "M" })
  const qrSize = 230
  const plate = qrSize + 36
  const plateY = h - 260 - plate
  page.drawRectangle({ x: (w - plate) / 2, y: plateY, width: plate, height: plate, color: yellow })
  page.drawRectangle({ x: (w - qrSize - 16) / 2, y: plateY + 10, width: qrSize + 16, height: qrSize + 16, color: rgb(1, 1, 1) })
  page.drawSvgPath(qrPath(qr.modules, qrSize / qr.modules.size), {
    x: (w - qrSize) / 2,
    y: plateY + 18 + qrSize,
    color: black,
  })
  center("Scan with your phone camera to start", plateY - 26, 14, bold)
  center(inviteUrl.replace(/^https?:\/\//, ""), plateY - 46, 10, regular, grey)

  // Steps
  const steps = [
    "1. Sign up with your Google account (about 3 minutes).",
    `2. Download and print your ${FREE_STICKER_LIMIT} numbered stickers.`,
    "3. Stick one on every takeaway box and watch feedback arrive.",
  ]
  steps.forEach((s, i) => center(s, plateY - 90 - i * 22, 12, regular, black))

  center("No credit card needed.  ·  hello@vlyr.app", 40, 10, regular, grey)

  const bytes = await pdf.save()
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="vlyr-invite${ref ? `-${ref}` : ""}.pdf"`,
      "Cache-Control": "public, max-age=300",
    },
  })
}
