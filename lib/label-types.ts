/**
 * Shared label design types -- safe to import from both client and server code.
 */

export type QrDotStyle = "square" | "rounded" | "dots"
export type QrEyeStyle = "square" | "rounded" | "circle"

export interface LabelDesign {
  backgroundColor: string
  borderColor: string
  logoUrl: string | null
  businessName: string
  tagline: string
  /**
   * "vlyr" = the standard VLYR sticker (2.5" × 4.29", the approved design;
   * the only one on the free trial).
   * "1x2" = portrait 1" wide × 2" tall, "2x1" = landscape 2" × 1" (the modern
   * sticker). "2inch" | "3inch" | "4inch" are the original square/round
   * stickers, kept so older sheets reprint unchanged.
   */
  labelSize: "2inch" | "3inch" | "4inch" | "1x2" | "2x1" | "vlyr"
  shape: "rounded-rect" | "circle" | "square"

  // ── Modern sticker (1x2 / 2x1) ──
  headline?: string
  subline?: string
  cta?: string
  textColor?: string
  qrColor?: string
  /** Colour of the three corner squares of the QR code */
  eyeColor?: string
  dotStyle?: QrDotStyle
  eyeStyle?: QrEyeStyle
  /** Small VLYR wordmark in the middle of the QR code */
  qrCenterLogo?: boolean
  showBorder?: boolean
}

export const isModernSize = (size: LabelDesign["labelSize"]) => size === "1x2" || size === "2x1" || size === "vlyr"
/** Sizes a business can customise (paid plans) */
export const isCustomSize = (size: LabelDesign["labelSize"]) => size === "1x2" || size === "2x1"

export interface BatchRecord {
  id: string
  merchant_id: string
  quantity: number
  status: string
  design_json: LabelDesign
  provider_order_id: string | null
  created_at: string
}

export interface LabelInstance {
  id: string
  batch_id: string
  merchant_id: string
  short_code: string
  scan_url: string
}
