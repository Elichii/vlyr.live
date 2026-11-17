/**
 * Modern VLYR sticker (portrait 1.5"×3" or landscape 3"×1.5"). Every sticker is one of these two.
 *
 * One layout feeds both the live preview in the designer (SVG) and the
 * printed PDF (lib/label-sheet.ts), so what merchants see is what prints.
 * Units are PDF points (72 per inch), y grows downward from the top-left
 * corner of the sticker.
 *
 * Safe for browser and server.
 */
import QRCode from "qrcode"
import type { LabelDesign, QrDotStyle, QrEyeStyle } from "@/lib/label-types"

// ── Defaults (the "Apple white" look) ───────────────────────────────
export const MODERN_DEFAULTS = {
  headline: "Tell us how we did.",
  subline: "Your feedback shapes what we do next.",
  cta: "Scan to review",
  rewardCta: "Scan to rate us",
  backgroundColor: "#FFFFFF",
  borderColor: "#D2D2D6",
  textColor: "#1D1D1F",
  qrColor: "#000000",
  eyeColor: "#000000",
  dotStyle: "square" as QrDotStyle,
  eyeStyle: "square" as QrEyeStyle,
}

export const STICKER_SIZES = {
  "1x2": { w: 108, h: 216, label: 'Portrait 1.5" × 3"' },
  "2x1": { w: 216, h: 108, label: 'Landscape 3" × 1.5"' },
} as const

// ── Elements produced by the layout ─────────────────────────────────
export type El =
  | { kind: "rect"; x: number; y: number; w: number; h: number; r?: number; fill?: string; stroke?: string; strokeWidth?: number }
  | { kind: "line"; x1: number; y1: number; x2: number; y2: number; color: string; width: number }
  /** x is always the left edge of the text (the layout does the centring) */
  | { kind: "text"; x: number; y: number; text: string; size: number; font: StickerFont; color: string; opacity?: number; tracking?: number }
  /** ty: extra vertical offset; fill "none" draws only the outline */
  | { kind: "path"; d: string; fill: string; stroke?: string; strokeWidth?: number; ty?: number }
  | { kind: "image"; src: "logo" | "vlyr"; x: number; y: number; w: number; h: number }

/**
 * The sticker's fonts: Inter (the typeface of the approved design).
 * Files live in public/fonts/sticker and are embedded in the PDF.
 */
export type StickerFont = "regular" | "medium" | "display"
export const STICKER_FONTS: Record<StickerFont, { file: string; family: string }> = {
  regular: { file: "Inter-Regular.ttf", family: "VLYR Sticker Inter" },
  medium: { file: "Inter-Medium.ttf", family: "VLYR Sticker Inter Medium" },
  display: { file: "InterDisplay-Medium.ttf", family: "VLYR Sticker Inter Display" },
}

/** Measures text width in points, without letter-spacing (pdf-lib on the server, canvas in the browser). */
export type Measure = (text: string, size: number, font: StickerFont) => number

export interface LayoutInput {
  design: LabelDesign
  businessName: string
  /** Logo size in pixels, if the merchant has a usable logo */
  logo: { width: number; height: number } | null
  /** VLYR wordmark size in pixels */
  vlyr: { width: number; height: number }
  scanUrl: string
  seq: number
  rewardOffer: string | null
  measure: Measure
}

// ── Colour helpers ──────────────────────────────────────────────────
export const safeHex = (v: unknown, fallback: string) => (typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? v : fallback)

function luminance(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]
}
export function contrast(a: string, b: string) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (l1 + 0.05) / (l2 + 0.05)
}

/**
 * Phones need a dark code on a light background with clear contrast.
 * Returns the colours to actually print, and whether we had to step in.
 */
export function qrColors(design: LabelDesign) {
  const bg = safeHex(design.backgroundColor, MODERN_DEFAULTS.backgroundColor)
  let dots = safeHex(design.qrColor, MODERN_DEFAULTS.qrColor)
  let eyes = safeHex(design.eyeColor, dots)
  // A dark sticker gets a white panel behind the code
  const plate = luminance(bg) < 0.45 ? "#FFFFFF" : null
  const behind = plate ?? bg
  let adjusted = false
  if (contrast(dots, behind) < 4 || luminance(dots) > luminance(behind)) { dots = "#000000"; adjusted = true }
  if (contrast(eyes, behind) < 3 || luminance(eyes) > luminance(behind)) { eyes = dots; adjusted = true }
  return { dots, eyes, plate, adjusted }
}

// ── QR code drawing (styled) ────────────────────────────────────────
function rr(x: number, y: number, w: number, h: number, r: number, ccw = false) {
  r = Math.max(0, Math.min(r, w / 2, h / 2))
  if (r === 0) return ccw ? `M${x} ${y}V${y + h}H${x + w}V${y}Z` : `M${x} ${y}H${x + w}V${y + h}H${x}Z`
  const k = r * 0.5523
  if (!ccw) {
    return `M${x + r} ${y}H${x + w - r}C${x + w - r + k} ${y} ${x + w} ${y + r - k} ${x + w} ${y + r}V${y + h - r}C${x + w} ${y + h - r + k} ${x + w - r + k} ${y + h} ${x + w - r} ${y + h}H${x + r}C${x + r - k} ${y + h} ${x} ${y + h - r + k} ${x} ${y + h - r}V${y + r}C${x} ${y + r - k} ${x + r - k} ${y} ${x + r} ${y}Z`
  }
  return `M${x + r} ${y}C${x + r - k} ${y} ${x} ${y + r - k} ${x} ${y + r}V${y + h - r}C${x} ${y + h - r + k} ${x + r - k} ${y + h} ${x + r} ${y + h}H${x + w - r}C${x + w - r + k} ${y + h} ${x + w} ${y + h - r + k} ${x + w} ${y + h - r}V${y + r}C${x + w} ${y + r - k} ${x + w - r + k} ${y} ${x + w - r} ${y}Z`
}
const f = (n: number) => Number(n.toFixed(3))

/** Paths for the data dots and the three corner "eyes" of a QR code. */
export function qrPaths(url: string, x: number, y: number, size: number, dotStyle: QrDotStyle, eyeStyle: QrEyeStyle, withCenterLogo: boolean) {
  const qr = QRCode.create(url, { errorCorrectionLevel: withCenterLogo ? "H" : "Q" })
  const n = qr.modules.size
  const u = size / n
  const inEye = (r: number, c: number) => (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7)
  // Keep the middle clear for the logo
  const hole = withCenterLogo ? { w: Math.round(n * 0.32) | 1, h: Math.round(n * 0.15) | 1 } : null
  const inHole = (r: number, c: number) =>
    !!hole && Math.abs(c - (n - 1) / 2) <= hole.w / 2 && Math.abs(r - (n - 1) / 2) <= hole.h / 2

  const dots: string[] = []
  for (let r = 0; r < n; r++) {
    if (dotStyle === "square") {
      let c = 0
      while (c < n) {
        if (!qr.modules.get(r, c) || inEye(r, c) || inHole(r, c)) { c++; continue }
        const start = c
        while (c < n && qr.modules.get(r, c) && !inEye(r, c) && !inHole(r, c)) c++
        // Slight overlap avoids hairline gaps in some viewers
        dots.push(`M${f(x + start * u)} ${f(y + r * u)}h${f((c - start) * u + 0.04)}v${f(u + 0.04)}h${f(-(c - start) * u - 0.04)}Z`)
      }
    } else {
      for (let c = 0; c < n; c++) {
        if (!qr.modules.get(r, c) || inEye(r, c) || inHole(r, c)) continue
        const cx = x + c * u, cy = y + r * u
        dots.push(dotStyle === "dots" ? rr(f(cx + u * 0.08), f(cy + u * 0.08), f(u * 0.84), f(u * 0.84), u * 0.42) : rr(f(cx), f(cy), f(u + 0.02), f(u + 0.02), u * 0.3))
      }
    }
  }

  // Eyes: 7×7 ring + 3×3 centre. The ring's inner edge runs the other way
  // so it stays hollow when filled.
  const eyes: string[] = []
  for (const [er, ec] of [[0, 0], [0, n - 7], [n - 7, 0]] as const) {
    const ex = x + ec * u, ey = y + er * u, s7 = 7 * u, s5 = 5 * u, s3 = 3 * u
    const outerR = eyeStyle === "circle" ? s7 / 2 : eyeStyle === "rounded" ? u * 2 : 0
    const innerR = eyeStyle === "circle" ? s5 / 2 : eyeStyle === "rounded" ? u * 1.3 : 0
    const dotR = eyeStyle === "circle" ? s3 / 2 : eyeStyle === "rounded" ? u * 0.9 : 0
    eyes.push(rr(f(ex), f(ey), f(s7), f(s7), outerR) + rr(f(ex + u), f(ey + u), f(s5), f(s5), innerR, true))
    eyes.push(rr(f(ex + 2 * u), f(ey + 2 * u), f(s3), f(s3), dotR))
  }
  return { dots: dots.join(""), eyes: eyes.join(""), modules: n, unit: u, hole }
}

// ── Text helpers ────────────────────────────────────────────────────
type Fit = { lines: string[]; size: number }

/** firstLineRatio: how much shorter the first of two lines should be (1 = balanced). */
function wrap(text: string, size: number, font: StickerFont, maxW: number, maxLines: number, measure: Measure, firstLineRatio = 1) {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let cur = ""
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w
    if (measure(next, size, font) <= maxW || !cur) cur = next
    else { lines.push(cur); cur = w }
  }
  if (cur) lines.push(cur)
  if (lines.length > maxLines || !lines.every((l) => measure(l, size, font) <= maxW)) return null
  // Two lines: prefer the split the design uses (short first line: "Tell us / how we did.")
  if (lines.length === 2 && words.length > 2) {
    let best = lines, bestScore = Infinity
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(" "), b = words.slice(i).join(" ")
      const wa = measure(a, size, font), wb = measure(b, size, font)
      if (wa > maxW || wb > maxW) continue
      // Balanced, with a slight preference for a shorter first line
      const score = Math.abs(wb - wa * firstLineRatio)
      if (score < bestScore) { best = [a, b]; bestScore = score }
    }
    return best
  }
  return lines
}

/** Largest size (down to min) at which the text fits in maxLines. */
function fitLines(text: string, maxSize: number, minSize: number, font: StickerFont, maxW: number, maxLines: number, measure: Measure, firstLineRatio = 1): Fit {
  for (let s = maxSize; s >= minSize; s -= maxSize / 80) {
    const lines = wrap(text, s, font, maxW, maxLines, measure, firstLineRatio)
    if (lines) return { lines, size: s }
  }
  const size = minSize
  const lines = wrap(text, size, font, maxW, 99, measure) ?? [text]
  const kept = lines.slice(0, maxLines)
  let last = kept[kept.length - 1]
  while (last.length > 1 && measure(`${last}…`, size, font) > maxW) last = last.slice(0, -1)
  kept[kept.length - 1] = lines.length > maxLines || measure(last, size, font) > maxW ? `${last.trimEnd()}…` : last
  return { lines: kept, size }
}

// ── The layout ──────────────────────────────────────────────────────
//
// Measured from the approved design (a 180 × 313 artboard), in "design
// units". Portrait uses a 180 × 360 frame and landscape 360 × 180; both
// are scaled by 0.4 to print at 72 points per inch.
const K = 0.6 // design units → points (1.5" × 3" = 108 × 216 pt)

export function stickerLayout(input: LayoutInput) {
  const { design, measure } = input
  const size = design.labelSize === "2x1" ? "2x1" : "1x2"
  const { w: W, h: H } = STICKER_SIZES[size]
  const bg = safeHex(design.backgroundColor, MODERN_DEFAULTS.backgroundColor)
  const text = safeHex(design.textColor, MODERN_DEFAULTS.textColor)
  const border = safeHex(design.borderColor, MODERN_DEFAULTS.borderColor)
  const q = qrColors(design)
  const reward = input.rewardOffer?.trim() || null
  const headline = (design.headline ?? "").trim() || MODERN_DEFAULTS.headline
  const ctaRaw = (design.cta ?? "").trim()
  // With a reward on, never say "review": rewards are for rating, not Google reviews
  const cta = reward ? (ctaRaw && !/review/i.test(ctaRaw) ? ctaRaw : MODERN_DEFAULTS.rewardCta) : ctaRaw || MODERN_DEFAULTS.cta
  const sub = reward ? `Rate us & get ${reward.charAt(0).toLowerCase()}${reward.slice(1)}` : (design.subline ?? "").trim() || MODERN_DEFAULTS.subline

  const els: El[] = []
  const u = (n: number) => n * K

  // Width including letter-spacing (em fraction)
  const widthOf = (t: string, sz: number, font: StickerFont, tracking = 0) =>
    measure(t, sz, font) + tracking * sz * Math.max(0, t.length - 1)

  /** One line of text; x/baseline/size in design units. */
  const line = (t: string, x: number, baseline: number, sz: number, font: StickerFont, align: "left" | "center", opts: { opacity?: number; tracking?: number } = {}) => {
    const size = u(sz)
    const w = widthOf(t, size, font, opts.tracking)
    const left = align === "center" ? u(x) - w / 2 : u(x)
    els.push({ kind: "text", x: left, y: u(baseline), text: t, size, font, color: text, opacity: opts.opacity, tracking: opts.tracking })
    return w
  }

  // Card
  els.push({ kind: "rect", x: 0.2, y: 0.2, w: W - 0.4, h: H - 0.4, r: u(22), fill: bg, ...(design.showBorder === false ? {} : { stroke: border, strokeWidth: u(0.5) }) })

  /** Logo, or the business name in the "YOUR LOGO" style. */
  const header = (x: number, centerY: number, maxW: number, maxH: number, align: "left" | "center") => {
    if (input.logo) {
      const ratio = input.logo.width / input.logo.height
      let lw = maxW, lh = lw / ratio
      if (lh > maxH) { lh = maxH; lw = lh * ratio }
      els.push({ kind: "image", src: "logo", x: u(align === "center" ? x - lw / 2 : x), y: u(centerY - lh / 2), w: u(lw), h: u(lh) })
    } else if (input.businessName) {
      let name = input.businessName.toUpperCase()
      let sz = 7.6
      while (sz > 4.5 && widthOf(name, u(sz), "medium", 0.15) > u(maxW)) sz -= 0.1
      while (name.length > 1 && widthOf(name, u(sz), "medium", 0.15) > u(maxW)) name = `${name.slice(0, -2).trimEnd()}…`
      line(name, x, centerY + sz * 0.36, sz, "medium", align, { opacity: 0.62, tracking: 0.15 })
    }
  }

  /** Headline: 1–2 lines in Inter Display Medium. Returns the last baseline. */
  const headlineBlock = (x: number, firstBaseline: number, oneLineBaseline: number, maxSize: number, maxW: number, align: "left" | "center") => {
    // The design breaks the headline with a shorter first line ("Tell us / how we did.")
    const t = fitLines(headline, u(maxSize), u(maxSize * 0.55), "display", u(maxW), 2, measure, 1.35)
    const sz = t.size / K, lh = sz * 0.997
    const first = t.lines.length === 1 ? oneLineBaseline : firstBaseline
    t.lines.forEach((l, i) => line(l, x, first + i * lh, sz, "display", align))
    return first + (t.lines.length - 1) * lh
  }

  /** Second line (or the reward offer). */
  const subBlock = (x: number, firstBaseline: number, maxSize: number, maxW: number, maxLines: number, align: "left" | "center") => {
    if (!sub) return
    const font: StickerFont = reward ? "medium" : "regular"
    const t = fitLines(sub, u(maxSize), u(maxSize * 0.6), font, u(maxW), maxLines, measure)
    const sz = t.size / K
    t.lines.forEach((l, i) => line(l, x, firstBaseline + i * sz * 1.033, sz, font, align, { opacity: reward ? 1 : 0.55 }))
  }

  const ctaBlock = (x: number, baseline: number, sz: number, maxW: number, align: "left" | "center") => {
    const t = fitLines(`${cta} →`, u(sz), u(sz * 0.6), "regular", u(maxW), 1, measure)
    line(t.lines[0], x, baseline, t.size / K, "regular", align)
  }

  const divider = (x1: number, x2: number, y: number) =>
    els.push({ kind: "line", x1: u(x1), y1: u(y), x2: u(x2), y2: u(y), color: text, width: u(0.6) })

  const quick = (x: number, baseline: number, sz: number, align: "left" | "center") =>
    line("TAKES LESS THAN A MINUTE", x, baseline, sz, "regular", align, { opacity: 0.55, tracking: 0.2 })

  /** "POWERED BY [VLYR]" */
  const powered = (x: number, baseline: number, sz: number, align: "left" | "center") => {
    const boxH = sz * 1.73, boxW = boxH * (input.vlyr.width / input.vlyr.height)
    const gap = sz * 0.85
    const label = "POWERED BY"
    const labelW = widthOf(label, u(sz), "regular", 0.2) / K
    const total = labelW + gap + boxW
    const left = align === "center" ? x - total / 2 : x
    line(label, left, baseline, sz, "regular", "left", { opacity: 0.62, tracking: 0.2 })
    const bx = left + labelW + gap, by = baseline - sz * 1.3
    // The wordmark is dark; give it a white backing on dark stickers
    if (luminance(bg) < 0.45) els.push({ kind: "rect", x: u(bx - 1), y: u(by - 1), w: u(boxW + 2), h: u(boxH + 2), r: u(1.5), fill: "#FFFFFF" })
    els.push({ kind: "image", src: "vlyr", x: u(bx), y: u(by), w: u(boxW), h: u(boxH) })
  }

  const qrBlock = (x: number, y: number, s: number) => {
    // A dark sticker gets a white square behind the code (with a quiet zone)
    if (q.plate) {
      const pad = s * 0.08
      els.push({ kind: "rect", x: u(x - pad), y: u(y - pad), w: u(s + pad * 2), h: u(s + pad * 2), r: u(6), fill: q.plate })
    }
    const p = qrPaths(input.scanUrl, u(x), u(y), u(s), design.dotStyle ?? MODERN_DEFAULTS.dotStyle, design.eyeStyle ?? MODERN_DEFAULTS.eyeStyle, !!design.qrCenterLogo)
    els.push({ kind: "path", d: p.dots, fill: q.dots })
    els.push({ kind: "path", d: p.eyes, fill: q.eyes })
    if (p.hole && design.qrCenterLogo) {
      const hw = p.hole.w * p.unit, hh = p.hole.h * p.unit
      const hx = u(x) + u(s) / 2 - hw / 2, hy = u(y) + u(s) / 2 - hh / 2
      els.push({ kind: "rect", x: hx, y: hy, w: hw, h: hh, r: hh * 0.2, fill: q.plate ?? bg })
      const pad = hh * 0.14
      let iw = hw - pad * 2, ih = iw / (input.vlyr.width / input.vlyr.height)
      if (ih > hh - pad * 2) { ih = hh - pad * 2; iw = ih * (input.vlyr.width / input.vlyr.height) }
      els.push({ kind: "image", src: "vlyr", x: hx + (hw - iw) / 2, y: hy + (hh - ih) / 2, w: iw, h: ih })
    }
  }

  if (size === "1x2") {
    // Portrait: the approved design, top to bottom
    const cx = 90, maxW = 150
    header(cx, 34, 110, 16, "center")
    const last = headlineBlock(cx, 80, 93, 26.7, maxW, "center")
    subBlock(cx, last + 22.4, 12, maxW, 2, "center")
    // No sticker number: the room goes to a larger QR code and more breathing space
    qrBlock(35, 156, 110)
    ctaBlock(cx, 290, 11, maxW, "center")
    divider(17.4, 162.6, 306)
    quick(cx, 323, 7.2, "center")
    powered(cx, 342, 6, "center")
  } else {
    // Landscape: QR on the left, the words on the right in the same style
    qrBlock(18, 18, 144)
    const left = 180, maxW = 162
    header(left, 27, 90, 14, "left")
    const last = headlineBlock(left, 64, 72, 22, maxW, "left")
    subBlock(left, last + 18.5, 10.5, maxW, last > 70 ? 2 : 3, "left")
    ctaBlock(left, 135, 10, maxW, "left")
    divider(left, 342, 144)
    quick(left, 156, 6.3, "left")
    powered(left, 169, 5.2, "left")
  }

  return { width: W, height: H, elements: els, qrAdjusted: q.adjusted }
}

// ── SVG renderer (designer preview) ─────────────────────────────────
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!)

export function stickerSvg(layout: ReturnType<typeof stickerLayout>, images: { logo?: string | null; vlyr: string }) {
  const parts = layout.elements.map((e) => {
    switch (e.kind) {
      case "rect":
        return `<rect x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" rx="${e.r ?? 0}" fill="${e.fill ?? "none"}"${e.stroke ? ` stroke="${e.stroke}" stroke-width="${e.strokeWidth}"` : ""}/>`
      case "line":
        return `<line x1="${e.x1}" y1="${e.y1}" x2="${e.x2}" y2="${e.y2}" stroke="${e.color}" stroke-opacity="0.18" stroke-width="${e.width}"/>`
      case "path":
        return `<path d="${e.d}" fill="${e.fill}"${e.stroke ? ` stroke="${e.stroke}" stroke-width="${e.strokeWidth ?? 0.4}"` : ""}${e.ty ? ` transform="translate(0 ${e.ty})"` : ""}/>`
      case "image": {
        const href = e.src === "logo" ? images.logo : images.vlyr
        return href ? `<image href="${esc(href)}" x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" preserveAspectRatio="xMidYMid meet"/>` : ""
      }
      case "text":
        return `<text x="${e.x}" y="${e.y}" font-family="'${STICKER_FONTS[e.font].family}', Inter, sans-serif" font-size="${e.size}" fill="${e.color}"${e.opacity !== undefined ? ` fill-opacity="${e.opacity}"` : ""}${e.tracking ? ` letter-spacing="${e.tracking * e.size}"` : ""}>${esc(e.text)}</text>`
    }
  })
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${layout.width} ${layout.height}" width="100%" height="100%">${parts.join("")}</svg>`
}
