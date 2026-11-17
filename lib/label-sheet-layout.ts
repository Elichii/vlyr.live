/**
 * Sheet layout maths for print-at-home labels.
 * No dependencies, so it is safe to use in the browser too.
 */
import type { LabelDesign } from "@/lib/label-types"

export type PaperSize = "letter" | "a4"

export const PT_PER_INCH = 72

export const PAPER: Record<PaperSize, { w: number; h: number; name: string }> = {
  letter: { w: 612, h: 792, name: "US Letter" },
  a4: { w: 595.28, h: 841.89, name: "A4" },
}

/** Sticker width × height in inches */
export const LABEL_INCHES: Record<LabelDesign["labelSize"], { w: number; h: number }> = {
  "2inch": { w: 2, h: 2 },
  "3inch": { w: 3, h: 3 },
  "4inch": { w: 4, h: 4 },
  "1x2": { w: 1.5, h: 3 },
  "2x1": { w: 3, h: 1.5 },
  vlyr: { w: 180 / 72, h: 309 / 72 },
}

export const SIZE_NAMES: Record<LabelDesign["labelSize"], string> = {
  "2inch": '2"',
  "3inch": '3"',
  "4inch": '4"',
  "1x2": '1.5" × 3" portrait',
  "2x1": '3" × 1.5" landscape',
  vlyr: 'VLYR standard 2.5" × 4.3"',
}

// Page margins. The top margin holds the print instructions.
export const MARGIN_SIDE = 0.25 * PT_PER_INCH
export const MARGIN_TOP = 0.5 * PT_PER_INCH
export const MARGIN_BOTTOM = 0.25 * PT_PER_INCH

/** How many labels of a given size fit on one sheet. */
export function sheetGrid(paper: PaperSize, labelSize: LabelDesign["labelSize"]) {
  const { w, h } = PAPER[paper]
  const size = LABEL_INCHES[labelSize] ?? LABEL_INCHES["3inch"]
  const cellW = size.w * PT_PER_INCH
  const cellH = size.h * PT_PER_INCH
  const cols = Math.max(1, Math.floor((w - 2 * MARGIN_SIDE) / cellW))
  const rows = Math.max(1, Math.floor((h - MARGIN_TOP - MARGIN_BOTTOM) / cellH))
  return { cols, rows, perPage: cols * rows, cellW, cellH }
}

/** Label number as printed on the sticker: 1 -> "0001". */
export function formatSeq(seq: number) {
  return String(seq).padStart(4, "0")
}
