/**
 * Print-at-home label sheets.
 *
 * Builds a PDF of numbered QR labels laid out on plain sticker paper
 * (US Letter or A4). The merchant prints it, cuts between the corner marks
 * and sticks the labels on takeaway boxes.
 *
 * Server-only: uses pdf-lib and the `qrcode` package.
 */
import { readFile } from "fs/promises"
import path from "path"
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage, type RGB } from "pdf-lib"
import QRCode from "qrcode"
import { isModernSize, type LabelDesign } from "@/lib/label-types"
import fontkit from "@pdf-lib/fontkit"
import { STICKER_FONTS, stickerLayout, safeHex as safeHexColor, type StickerFont } from "@/lib/sticker-layout"
import { MARGIN_BOTTOM, MARGIN_SIDE, MARGIN_TOP, PAPER, formatSeq, sheetGrid, type PaperSize } from "@/lib/label-sheet-layout"

export { formatSeq, sheetGrid, type PaperSize }

/** Printed under the QR code when the merchant hasn't written their own line. */
export const DEFAULT_TAGLINE = "Scan to rate & review us"
/** Used instead when the business offers a reward for rating. */
export const REWARD_TAGLINE = "Scan, rate & get a reward"
// Older designs saved this line; treat it as "not customised"
const OLD_DEFAULT_TAGLINES = ["scan for a special offer"]

/** Placeholder names the designer used before the real business name loaded. */
export function isPlaceholderName(name: string | null | undefined) {
  const n = (name ?? "").trim().toLowerCase()
  return !n || n === "your business"
}

const stickerFontBytes = new Map<StickerFont, Promise<Uint8Array>>()
/** Inter, the typeface of the modern sticker. */
function loadStickerFont(key: StickerFont) {
  if (!stickerFontBytes.has(key)) {
    stickerFontBytes.set(key, readFile(path.join(process.cwd(), "public/fonts/sticker", STICKER_FONTS[key].file)))
  }
  return stickerFontBytes.get(key)!
}

let iconBytes: Promise<Uint8Array | null> | null = null
/** The VLYR wordmark that sits in the middle of every QR code. */
function loadIcon() {
  iconBytes ??= readFile(path.join(process.cwd(), "public/images/vlyr-wordmark.png")).catch(() => null)
  return iconBytes
}

export interface SheetLabel {
  seq: number
  shortCode: string
  scanUrl: string
}

export interface SheetOptions {
  design: LabelDesign
  labels: SheetLabel[]
  paper: PaperSize
  /** White background instead of the design colour. Saves ink on home printers. */
  inkSaver: boolean
  /** The business's reward for rating (e.g. "Free coffee with your next order"), if switched on */
  rewardOffer?: string | null
  /** The merchant's logo (PNG or JPG), for the modern sticker */
  logo?: Uint8Array | null
}

export async function buildLabelSheetPdf(opts: SheetOptions): Promise<Uint8Array> {
  const { labels, paper, inkSaver } = opts
  // Every sticker is 1.5" × 3": older saved sizes print as the portrait one
  const design: LabelDesign = { ...opts.design, labelSize: opts.design.labelSize === "2x1" ? "2x1" : "1x2" }
  const rewardOffer = toPdfText(opts.rewardOffer)
  const pdf = await PDFDocument.create()
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const iconPng = await loadIcon()
  const icon = iconPng ? await pdf.embedPng(iconPng) : null
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)

  const businessName = toPdfText(design.businessName).toUpperCase()
  pdf.setTitle(`VLYR labels ${rangeText(labels)}${businessName ? ` - ${businessName}` : ""}`)
  pdf.setCreator("VLYR")

  const { w: pageW, h: pageH } = PAPER[paper]
  const { cols, rows, perPage, cellW, cellH } = sheetGrid(paper, design.labelSize)
  const modern = isModernSize(design.labelSize)
  const gridW = cols * cellW
  const gridH = rows * cellH
  // Centre the grid in the printable area
  const gridLeft = (pageW - gridW) / 2
  const gridTop = pageH - MARGIN_TOP - (pageH - MARGIN_TOP - MARGIN_BOTTOM - gridH) / 2

  const colors = labelColors(design, inkSaver)
  const logo = modern && opts.logo ? await embedLogo(pdf, opts.logo) : null
  let fonts: Record<StickerFont, PDFFont> | null = null
  if (modern) {
    pdf.registerFontkit(fontkit)
    const keys = Object.keys(STICKER_FONTS) as StickerFont[]
    const embedded = await Promise.all(keys.map(async (k) => pdf.embedFont(await loadStickerFont(k), { subset: true })))
    fonts = Object.fromEntries(keys.map((k, i) => [k, embedded[i]])) as Record<StickerFont, PDFFont>
  }
  // Ink saver: white sticker; light text switches to dark so it stays readable
  const modernDesign: LabelDesign = inkSaver
    ? { ...design, backgroundColor: "#FFFFFF", textColor: isLightHex(safeHex(design.textColor, "#1D1D1F")) ? "#1D1D1F" : design.textColor }
    : design
  const pageCount = Math.ceil(labels.length / perPage)

  for (let p = 0; p < pageCount; p++) {
    const page = pdf.addPage([pageW, pageH])
    const pageLabels = labels.slice(p * perPage, (p + 1) * perPage)

    drawPageHeader(page, {
      regular,
      bold,
      businessName,
      range: rangeText(pageLabels),
      pageNo: p + 1,
      pageCount,
      paperName: PAPER[paper].name,
      stickerSize: design.labelSize === "2x1" ? '3" × 1.5"' : '1.5" × 3"',
    })

    pageLabels.forEach((label, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      const x = gridLeft + col * cellW
      const top = gridTop - row * cellH
      if (modern) {
        drawModernLabel(page, { x, top, design: modernDesign, label, fonts: fonts!, logo, vlyr: icon, businessName: cleanText(design.businessName), rewardOffer: cleanText(opts.rewardOffer) })
      } else {
        drawLabel(page, { x, top, size: cellW, design, colors, label, regular, bold, businessName, icon, rewardOffer })
      }
    })

    // Cut lines over the cells that have labels on this page
    const usedRows = Math.ceil(pageLabels.length / cols)
    drawCutLines(page, { gridLeft, gridTop, cellW, cellH, cols, rows: usedRows, lastRowCols: pageLabels.length - (usedRows - 1) * cols })
  }

  return pdf.save()
}

// ─── Drawing ──────────────────────────────────────────────────────────

interface LabelColors {
  bg: RGB
  border: RGB
  text: RGB
  accent: RGB
}

function labelColors(design: LabelDesign, inkSaver: boolean): LabelColors {
  const bgHex = inkSaver ? "#FFFFFF" : safeHex(design.backgroundColor, "#0A0A0A")
  const borderHex = safeHex(design.borderColor, "#FFE100")
  const lightBg = isLightHex(bgHex)
  const text = lightBg ? "#0A0A0A" : "#FFFFFF"
  // Accent text must stay readable against the background
  const accent = isLightHex(borderHex) === lightBg ? text : borderHex
  return { bg: hexToRgb(bgHex), border: hexToRgb(borderHex), text: hexToRgb(text), accent: hexToRgb(accent) }
}

function drawLabel(
  page: PDFPage,
  o: {
    x: number
    top: number
    size: number
    design: LabelDesign
    colors: LabelColors
    label: SheetLabel
    regular: PDFFont
    bold: PDFFont
    businessName: string
    icon: PDFImage | null
    rewardOffer: string
  },
) {
  const { size, design, colors, label, regular, bold } = o
  // Leave a thin white rim inside the cut line so small cutting errors don't show
  const inset = size * 0.035
  const L = size - inset * 2
  const left = o.x + inset
  const top = o.top - inset
  const cx = left + L / 2
  const isCircle = design.shape === "circle"
  const borderWidth = Math.max(1.5, L * 0.012)

  // Background shape
  if (isCircle) {
    page.drawEllipse({
      x: cx,
      y: top - L / 2,
      xScale: L / 2 - borderWidth / 2,
      yScale: L / 2 - borderWidth / 2,
      color: colors.bg,
      borderColor: colors.border,
      borderWidth,
    })
  } else {
    const r = design.shape === "rounded-rect" ? L * 0.08 : 0
    page.drawSvgPath(roundedRectPath(borderWidth / 2, borderWidth / 2, L - borderWidth, L - borderWidth, r), {
      x: left,
      y: top,
      color: colors.bg,
      borderColor: colors.border,
      borderWidth,
    })
  }

  // Width available for text at a given distance from the top (narrower inside a circle)
  const textWidthAt = (fromTop: number) => {
    if (!isCircle) return L * 0.84
    const d = L / 2 - fromTop
    return Math.max(0, 2 * Math.sqrt(Math.max(0, (L / 2) ** 2 - d * d))) * 0.86
  }

  // Business name
  if (o.businessName) {
    const y = isCircle ? L * 0.235 : L * 0.135
    const maxW = textWidthAt(y - L * 0.072)
    // Shrink long names (down to 60%) before shortening them
    const fs = Math.max(L * 0.072 * 0.6, Math.min(L * 0.072, (L * 0.072 * maxW) / bold.widthOfTextAtSize(o.businessName, L * 0.072)))
    drawCentered(page, fit(o.businessName, bold, fs, maxW), { cx, y: top - y, font: bold, size: fs, color: colors.text })
  }

  // QR code on a white plate
  const plate = L * (isCircle ? 0.48 : 0.52)
  const plateTop = top - L * (isCircle ? 0.255 : 0.2)
  page.drawSvgPath(roundedRectPath(0, 0, plate, plate, plate * 0.06), {
    x: cx - plate / 2,
    y: plateTop,
    color: rgb(1, 1, 1),
  })
  // Highest error correction, so the code still scans with the logo on top
  const qr = QRCode.create(label.scanUrl, { errorCorrectionLevel: o.icon ? "H" : "M" })
  const modules = qr.modules.size
  const qrSize = plate * 0.88
  const unit = qrSize / modules
  const qrLeft = cx - qrSize / 2
  const qrTop = plateTop - (plate - qrSize) / 2
  page.drawSvgPath(qrPath(qr.modules, unit), { x: qrLeft, y: qrTop, color: rgb(0, 0, 0) })

  // VLYR wordmark in the middle, on a white box about 32% wide and 15% tall
  // (~6% of the code, well within what "H" error correction recovers)
  if (o.icon) {
    const bw = Math.round(modules * 0.32) | 1 // odd module counts keep it centred
    const bh = Math.round(modules * 0.15) | 1
    const boxW = bw * unit
    const boxH = bh * unit
    const boxLeft = qrLeft + ((modules - bw) / 2) * unit
    const boxTop = qrTop - ((modules - bh) / 2) * unit
    page.drawSvgPath(roundedRectPath(0, 0, boxW, boxH, boxH * 0.18), { x: boxLeft, y: boxTop, color: rgb(1, 1, 1) })
    const pad = boxH * 0.12
    const aspect = o.icon.width / o.icon.height
    let iw = boxW - pad * 2
    let ih = iw / aspect
    if (ih > boxH - pad * 2) { ih = boxH - pad * 2; iw = ih * aspect }
    page.drawImage(o.icon, { x: boxLeft + (boxW - iw) / 2, y: boxTop - boxH + (boxH - ih) / 2, width: iw, height: ih })
  }

  // Tagline. With a reward switched on, the default line invites customers to
  // rate (not review) and the offer is printed underneath. Rewards are for
  // rating only, never for posting on Google.
  const offer = o.rewardOffer
  const rawTagline = toPdfText(design.tagline)
  const isDefault = !rawTagline || rawTagline === DEFAULT_TAGLINE || OLD_DEFAULT_TAGLINES.includes(rawTagline.toLowerCase())
  const tagline = isDefault ? (offer ? REWARD_TAGLINE : DEFAULT_TAGLINE) : rawTagline
  if (tagline) {
    // Bold call to action; shrinks (down to 70%) before it gets shortened
    const y = L * (isCircle ? (offer ? 0.8 : 0.8) : offer ? 0.8 : 0.83)
    const maxW = textWidthAt(y)
    const base = L * (isCircle && offer ? 0.052 : 0.058)
    const fs = Math.max(base * 0.7, Math.min(base, (base * maxW) / bold.widthOfTextAtSize(tagline, base)))
    drawCentered(page, fit(tagline, bold, fs, maxW), { cx, y: top - y, font: bold, size: fs, color: colors.text })
  }

  // The reward itself, in the accent colour
  if (offer) {
    const y = L * (isCircle ? 0.857 : 0.875)
    const maxW = textWidthAt(y)
    const base = L * 0.046
    // May shrink to 55% on small round stickers before being shortened
    const fs = Math.max(base * 0.55, Math.min(base, (base * maxW) / regular.widthOfTextAtSize(offer, base)))
    drawCentered(page, fit(offer, regular, fs, maxW), { cx, y: top - y, font: regular, size: fs, color: colors.accent })
  }

  // Footer: VLYR mark, label number and code (the code helps with support requests)
  const fs = L * (offer ? 0.034 : 0.038)
  const footer = isCircle ? `No. ${formatSeq(label.seq)}` : `VLYR  ·  No. ${formatSeq(label.seq)}  ·  ${label.shortCode}`
  const y = L * (isCircle ? (offer ? 0.918 : 0.89) : offer ? 0.945 : 0.93)
  drawCentered(page, fit(footer, bold, fs, textWidthAt(y)), { cx, y: top - y, font: bold, size: fs, color: colors.accent })
}

/** Embeds a PNG or JPG logo; anything else is skipped. */
async function embedLogo(pdf: PDFDocument, bytes: Uint8Array) {
  try {
    if (bytes[0] === 0x89 && bytes[1] === 0x50) return await pdf.embedPng(bytes)
    if (bytes[0] === 0xff && bytes[1] === 0xd8) return await pdf.embedJpg(bytes)
  } catch {
    // Broken image: print the business name instead
  }
  return null
}

/** The modern 1.5"×3" / 3"×1.5" sticker, drawn from the shared layout. */
function drawModernLabel(
  page: PDFPage,
  o: {
    x: number
    top: number
    design: LabelDesign
    label: SheetLabel
    fonts: Record<StickerFont, PDFFont>
    logo: PDFImage | null
    vlyr: PDFImage | null
    businessName: string
    rewardOffer: string
  },
) {
  const font = (k: StickerFont) => o.fonts[k]
  const clean = (d: LabelDesign): LabelDesign => ({
    ...d,
    headline: cleanText(d.headline),
    subline: d.subline === undefined ? undefined : cleanText(d.subline),
    cta: cleanText(d.cta),
  })
  const layout = stickerLayout({
    design: clean(o.design),
    businessName: o.businessName,
    logo: o.logo ? { width: o.logo.width, height: o.logo.height } : null,
    vlyr: o.vlyr ? { width: o.vlyr.width, height: o.vlyr.height } : { width: 4, height: 1 },
    scanUrl: o.label.scanUrl,
    seq: o.label.seq,
    rewardOffer: o.rewardOffer || null,
    measure: (t, size, k) => font(k).widthOfTextAtSize(t, size),
  })
  const X = (x: number) => o.x + x
  const Y = (y: number) => o.top - y

  for (const e of layout.elements) {
    switch (e.kind) {
      case "rect":
        page.drawSvgPath(roundedRectPath(0, 0, e.w, e.h, e.r ?? 0), {
          x: X(e.x),
          y: Y(e.y),
          color: e.fill ? hexToRgb(safeHexColor(e.fill, "#FFFFFF")) : undefined,
          borderColor: e.stroke ? hexToRgb(safeHexColor(e.stroke, "#D2D2D6")) : undefined,
          borderWidth: e.stroke ? e.strokeWidth : 0,
        })
        break
      case "line":
        page.drawLine({ start: { x: X(e.x1), y: Y(e.y1) }, end: { x: X(e.x2), y: Y(e.y2) }, thickness: e.width, color: hexToRgb(e.color), opacity: 0.18 })
        break
      case "path":
        if (e.d) {
          page.drawSvgPath(e.d, {
            x: o.x,
            y: o.top - (e.ty ?? 0),
            color: e.fill === "none" ? undefined : hexToRgb(e.fill),
            borderColor: e.stroke ? hexToRgb(e.stroke) : undefined,
            borderWidth: e.stroke ? e.strokeWidth ?? 0.4 : 0,
          })
        }
        break
      case "image": {
        const img = e.src === "logo" ? o.logo : o.vlyr
        if (img) page.drawImage(img, { x: X(e.x), y: Y(e.y + e.h), width: e.w, height: e.h })
        break
      }
      case "text": {
        const f = font(e.font)
        const spacing = (e.tracking ?? 0) * e.size
        const x = X(e.x)
        const opts = { size: e.size, font: f, color: hexToRgb(e.color), opacity: e.opacity }
        if (!spacing) page.drawText(e.text, { x, y: Y(e.y), ...opts })
        else {
          // Letter-spaced caps: place each character
          let cx = x
          for (const ch of e.text) {
            page.drawText(ch, { x: cx, y: Y(e.y), ...opts })
            cx += f.widthOfTextAtSize(ch, e.size) + spacing
          }
        }
        break
      }
    }
  }
}

function drawPageHeader(
  page: PDFPage,
  o: { regular: PDFFont; bold: PDFFont; businessName: string; range: string; pageNo: number; pageCount: number; paperName: string; stickerSize: string },
) {
  const { width, height } = page.getSize()
  const grey = rgb(0.35, 0.35, 0.35)
  const left = MARGIN_SIDE + 4
  const right = width - MARGIN_SIDE - 4

  const title = `VLYR labels${o.businessName ? ` - ${o.businessName}` : ""}`
  page.drawText(fit(title, o.bold, 8, width * 0.55), { x: left, y: height - 16, size: 8, font: o.bold, color: grey })

  const pageInfo = `No. ${o.range}   ·   Page ${o.pageNo} of ${o.pageCount}`
  page.drawText(pageInfo, {
    x: right - o.regular.widthOfTextAtSize(pageInfo, 8),
    y: height - 16,
    size: 8,
    font: o.regular,
    color: grey,
  })

  const paperSize = o.paperName === "A4" ? "A4 (210 × 297 mm)" : `${o.paperName} (8.5" × 11")`
  const hint = `Print on ${paperSize} sticker paper at 100% / "Actual size" (not "Fit to page"). Each sticker is ${o.stickerSize}. Cut between the corner marks.`
  page.drawText(fit(hint, o.regular, 6.5, right - left), { x: left, y: height - 27, size: 6.5, font: o.regular, color: grey })
}

function drawCutLines(
  page: PDFPage,
  o: { gridLeft: number; gridTop: number; cellW: number; cellH: number; cols: number; rows: number; lastRowCols: number },
) {
  // Small, light corner marks only (no lines across the stickers)
  const { gridLeft, gridTop, cellW, cellH, cols, rows, lastRowCols } = o
  const mark = { thickness: 0.3, color: rgb(0.55, 0.55, 0.58), opacity: 0.7 }
  const arm = 4.5
  const rowCount = (k: number) => (k < 0 || k >= rows ? 0 : k === rows - 1 ? lastRowCols : cols)

  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c <= cols; c++) {
      // Only corners that touch a sticker on this page
      const touches = [r - 1, r].some((row) => row >= 0 && row < rows && [c - 1, c].some((col) => col >= 0 && col < rowCount(row)))
      if (!touches) continue
      const x = gridLeft + c * cellW
      const y = gridTop - r * cellH
      page.drawLine({ start: { x: x - arm, y }, end: { x: x + arm, y }, ...mark })
      page.drawLine({ start: { x, y: y - arm }, end: { x, y: y + arm }, ...mark })
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────

/** SVG path (y down) for a rectangle with rounded corners. */
function roundedRectPath(x: number, y: number, w: number, h: number, r: number) {
  if (r <= 0) return `M ${x} ${y} H ${x + w} V ${y + h} H ${x} Z`
  const k = r * 0.5523 // bezier circle approximation
  return [
    `M ${x + r} ${y}`,
    `H ${x + w - r}`,
    `C ${x + w - r + k} ${y} ${x + w} ${y + r - k} ${x + w} ${y + r}`,
    `V ${y + h - r}`,
    `C ${x + w} ${y + h - r + k} ${x + w - r + k} ${y + h} ${x + w - r} ${y + h}`,
    `H ${x + r}`,
    `C ${x + r - k} ${y + h} ${x} ${y + h - r + k} ${x} ${y + h - r}`,
    `V ${y + r}`,
    `C ${x} ${y + r - k} ${x + r - k} ${y} ${x + r} ${y}`,
    "Z",
  ].join(" ")
}

/** One SVG path for all dark QR modules, merging horizontal runs. */
export function qrPath(modules: { size: number; get(row: number, col: number): number | boolean }, unit: number) {
  const parts: string[] = []
  const n = modules.size
  for (let r = 0; r < n; r++) {
    let c = 0
    while (c < n) {
      if (!modules.get(r, c)) {
        c++
        continue
      }
      const start = c
      while (c < n && modules.get(r, c)) c++
      // Slight overlap avoids hairline gaps between modules in some PDF viewers
      parts.push(`M ${(start * unit).toFixed(3)} ${(r * unit).toFixed(3)} h ${((c - start) * unit + 0.05).toFixed(3)} v ${(unit + 0.05).toFixed(3)} h ${(-(c - start) * unit - 0.05).toFixed(3)} Z`)
    }
  }
  return parts.join(" ")
}

function drawCentered(
  page: PDFPage,
  text: string,
  o: { cx: number; y: number; font: PDFFont; size: number; color: RGB; opacity?: number },
) {
  if (!text) return
  const w = o.font.widthOfTextAtSize(text, o.size)
  page.drawText(text, { x: o.cx - w / 2, y: o.y, size: o.size, font: o.font, color: o.color, opacity: o.opacity })
}

/** Shorten text with an ellipsis until it fits the width. */
function fit(text: string, font: PDFFont, size: number, maxWidth: number) {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text
  let t = text
  while (t.length > 1 && font.widthOfTextAtSize(`${t}…`, size) > maxWidth) t = t.slice(0, -1)
  return `${t.trimEnd()}…`
}

/** Text for the modern sticker (Inter covers far more than the built-in fonts). */
function cleanText(s: string | null | undefined) {
  return (s ?? "").normalize("NFC").replace(/[\u0000-\u001F\u007F]/g, "").replace(/\s+/g, " ").trim()
}

/**
 * The built-in PDF fonts only cover Western European characters.
 * Drop anything else so text never breaks the PDF.
 */
function toPdfText(s: string | null | undefined) {
  return (s ?? "")
    .normalize("NFC")
    .replace(/[^\x20-\x7E\xA0-\xFF‘’“”–—•…€]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function rangeText(labels: SheetLabel[]) {
  if (labels.length === 0) return ""
  const first = formatSeq(labels[0].seq)
  const last = formatSeq(labels[labels.length - 1].seq)
  return first === last ? first : `${first}–${last}`
}

function safeHex(hex: string | undefined, fallback: string) {
  return typeof hex === "string" && /^#[0-9a-f]{6}$/i.test(hex) ? hex : fallback
}

function hexToRgb(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255)
}

function isLightHex(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return (r * 299 + g * 587 + b * 114) / 1000 > 150
}
