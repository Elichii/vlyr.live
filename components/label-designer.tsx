"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import QRCode from "qrcode"
import {
  Palette, Type, QrCode, RotateCcw, Download, Eye,
  Maximize2, Circle, Square, RectangleHorizontal,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import type { LabelDesign } from "@/lib/label-types"

// ─── Config ───────────────────────────────────────────────────────────
const LABEL_SIZES = [
  { id: "2inch" as const, label: '2"', desc: "Standard", px: 180 },
  { id: "3inch" as const, label: '3"', desc: "Large", px: 240 },
  { id: "4inch" as const, label: '4"', desc: "XL", px: 300 },
]

const SHAPES = [
  { id: "rounded-rect" as const, label: "Rounded", icon: RectangleHorizontal },
  { id: "circle" as const, label: "Circle", icon: Circle },
  { id: "square" as const, label: "Square", icon: Square },
]

const PRESET_COLORS = [
  { bg: "#0A0A0A", border: "#FFE100", name: "VLYR Dark" },
  { bg: "#FFFFFF", border: "#0A0A0A", name: "Clean White" },
  { bg: "#1A1A2E", border: "#E94560", name: "Midnight" },
  { bg: "#0F3460", border: "#16C79A", name: "Ocean" },
  { bg: "#2D1B69", border: "#F97316", name: "Regal" },
  { bg: "#1C1C1C", border: "#3B82F6", name: "Slate Blue" },
]

type ViewMode = "flat" | "mockup3d"

// ─── Props ────────────────────────────────────────────────────────────
interface LabelDesignerProps {
  initialBusinessName?: string
  initialLogoUrl?: string | null
  /** The URL the QR code should encode (primary review link) */
  reviewUrl?: string
  onDesignChange?: (design: LabelDesign) => void
  compact?: boolean
}

export function LabelDesigner({
  initialBusinessName = "Your Business",
  initialLogoUrl = null,
  reviewUrl = "",
  onDesignChange,
  compact = false,
}: LabelDesignerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const qrImageRef = useRef<HTMLImageElement | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>("flat")
  const [activeTab, setActiveTab] = useState<"colors" | "text" | "size">("colors")

  const [design, setDesign] = useState<LabelDesign>({
    backgroundColor: "#0A0A0A",
    borderColor: "#FFE100",
    logoUrl: initialLogoUrl,
    businessName: initialBusinessName,
    tagline: "Scan for a special offer",
    labelSize: "3inch",
    shape: "rounded-rect",
  })

  const updateDesign = useCallback((updates: Partial<LabelDesign>) => {
    setDesign((prev) => ({ ...prev, ...updates }))
  }, [])

  useEffect(() => {
    onDesignChange?.(design)
  }, [design, onDesignChange])

  // ─── Generate real QR code image whenever reviewUrl changes ──────
  useEffect(() => {
    const url = reviewUrl?.trim() || "https://vlyr.com"
    QRCode.toDataURL(url, {
      width: 400,
      margin: 1,
      color: { dark: "#000000", light: "#FFFFFF" },
      errorCorrectionLevel: "M",
    }).then((dataUrl) => {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.onload = () => {
        qrImageRef.current = img
        // Re-trigger canvas render
        setDesign((prev) => ({ ...prev }))
      }
      img.src = dataUrl
    }).catch(() => {
      qrImageRef.current = null
    })
  }, [reviewUrl])

  // ─── Canvas Render ────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const sizeConfig = LABEL_SIZES.find((s) => s.id === design.labelSize) ?? LABEL_SIZES[1]
    const px = sizeConfig.px
    const padding = 16
    const canvasSize = px + padding * 2

    canvas.width = canvasSize * 2
    canvas.height = canvasSize * 2
    canvas.style.width = `${canvasSize}px`
    canvas.style.height = `${canvasSize}px`
    ctx.scale(2, 2)
    ctx.clearRect(0, 0, canvasSize, canvasSize)

    // Draw label shape
    ctx.save()
    ctx.beginPath()
    drawLabelPath(ctx, design.shape, padding, px)
    ctx.closePath()
    ctx.fillStyle = design.backgroundColor
    ctx.fill()
    ctx.lineWidth = 3
    ctx.strokeStyle = design.borderColor
    ctx.stroke()
    ctx.restore()

    // Clip to shape
    ctx.save()
    ctx.beginPath()
    drawLabelPath(ctx, design.shape, padding, px)
    ctx.clip()

    const textColor = isLightColor(design.backgroundColor) ? "#0A0A0A" : "#FFFFFF"
    const accentColor = design.borderColor

    // Business name
    ctx.fillStyle = textColor
    ctx.font = `bold ${Math.max(11, px * 0.06)}px 'Inter', sans-serif`
    ctx.textAlign = "center"
    ctx.fillText(design.businessName.toUpperCase(), padding + px / 2, padding + px * 0.15)

    // QR code (real image or fallback pattern)
    const qrSize = px * 0.45
    const qrX = padding + (px - qrSize) / 2
    const qrY = padding + (px - qrSize) / 2 - px * 0.02

    // White background for QR
    ctx.fillStyle = "#FFFFFF"
    const qrR = 6
    ctx.beginPath()
    ctx.moveTo(qrX + qrR, qrY)
    ctx.arcTo(qrX + qrSize, qrY, qrX + qrSize, qrY + qrSize, qrR)
    ctx.arcTo(qrX + qrSize, qrY + qrSize, qrX, qrY + qrSize, qrR)
    ctx.arcTo(qrX, qrY + qrSize, qrX, qrY, qrR)
    ctx.arcTo(qrX, qrY, qrX + qrSize, qrY, qrR)
    ctx.closePath()
    ctx.fill()

    if (qrImageRef.current) {
      // Draw the real QR code image
      ctx.drawImage(qrImageRef.current, qrX + 2, qrY + 2, qrSize - 4, qrSize - 4)
    } else {
      // Fallback: draw a placeholder pattern
      drawQRPattern(ctx, qrX + 4, qrY + 4, qrSize - 8, design.businessName)
    }

    // Tagline
    ctx.fillStyle = textColor
    ctx.globalAlpha = 0.6
    ctx.font = `${Math.max(8, px * 0.04)}px 'Inter', sans-serif`
    ctx.textAlign = "center"
    ctx.fillText(design.tagline, padding + px / 2, padding + px * 0.88)
    ctx.globalAlpha = 1

    // Footer
    ctx.fillStyle = accentColor
    ctx.font = `bold ${Math.max(7, px * 0.035)}px 'Inter', sans-serif`
    ctx.fillText("VLYR", padding + px / 2, padding + px * 0.95)

    ctx.restore()
  }, [design])

  const handleExportPreview = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dataUrl = canvas.toDataURL("image/png")
    const link = document.createElement("a")
    link.download = `vlyr-label-preview-${design.labelSize}.png`
    link.href = dataUrl
    link.click()
  }

  // ─── Render ───────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className={`flex ${compact ? "flex-col" : "flex-col lg:flex-row"} gap-5`}>

        {/* Canvas Preview */}
        <div className="flex-1 flex flex-col items-center gap-3">
          <div className="relative bg-card/50 border border-border/40 rounded-2xl p-6 w-full flex items-center justify-center min-h-[280px]">
            <div className="absolute top-3 right-3 flex gap-1">
              <button
                onClick={() => setViewMode("flat")}
                className={`p-1.5 rounded-md text-xs transition-colors ${
                  viewMode === "flat"
                    ? "bg-[#FFE100]/15 text-[#FFE100]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Maximize2 size={14} />
              </button>
              <button
                onClick={() => setViewMode("mockup3d")}
                className={`p-1.5 rounded-md text-xs transition-colors ${
                  viewMode === "mockup3d"
                    ? "bg-[#FFE100]/15 text-[#FFE100]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Eye size={14} />
              </button>
            </div>

            <AnimatePresence mode="wait">
              {viewMode === "flat" ? (
                <motion.div
                  key="flat"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex flex-col items-center gap-2"
                >
                  <canvas ref={canvasRef} className="rounded-lg" />
                  <span className="text-[10px] text-muted-foreground/50">
                    {design.labelSize} / {design.shape}
                  </span>
                </motion.div>
              ) : (
                <motion.div
                  key="mockup3d"
                  initial={{ opacity: 0, rotateY: -30 }}
                  animate={{ opacity: 1, rotateY: 0 }}
                  exit={{ opacity: 0, rotateY: 30 }}
                  transition={{ type: "spring", damping: 20 }}
                  className="flex flex-col items-center gap-3"
                  style={{ perspective: 800 }}
                >
                  <div
                    className="relative"
                    style={{ transform: "rotateX(15deg) rotateY(-8deg)", transformStyle: "preserve-3d" }}
                  >
                    <div
                      className="absolute inset-0 rounded-2xl blur-xl opacity-30"
                      style={{ background: design.borderColor, transform: "translateZ(-20px)" }}
                    />
                    <div className="bg-gradient-to-br from-neutral-800 to-neutral-900 rounded-2xl p-8 border border-white/5">
                      <div className="bg-gradient-to-b from-neutral-700/50 to-neutral-800/50 rounded-xl p-4 border border-white/5">
                        <canvas
                          ref={(el) => {
                            if (el && canvasRef.current) {
                              const srcCanvas = canvasRef.current
                              el.width = srcCanvas.width
                              el.height = srcCanvas.height
                              el.style.width = srcCanvas.style.width
                              el.style.height = srcCanvas.style.height
                              const ctx2 = el.getContext("2d")
                              if (ctx2) ctx2.drawImage(srcCanvas, 0, 0)
                            }
                          }}
                          className="rounded-lg"
                          style={{ filter: "brightness(0.95)" }}
                        />
                      </div>
                      <p className="text-center text-[9px] text-white/30 mt-2 tracking-widest uppercase">
                        Product Mockup
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground/50">
                    Isometric preview
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={handleExportPreview}
              className="text-xs text-muted-foreground hover:text-foreground gap-1.5 h-7">
              <Download size={12} /> Export PNG
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => updateDesign({
              backgroundColor: "#0A0A0A", borderColor: "#FFE100", tagline: "Scan for a special offer",
              labelSize: "3inch", shape: "rounded-rect",
            })} className="text-xs text-muted-foreground hover:text-foreground gap-1.5 h-7">
              <RotateCcw size={12} /> Reset
            </Button>
          </div>
        </div>

        {/* Design Controls */}
        <div className={compact ? "w-full" : "lg:w-72"}>
          <div className="space-y-4">
            <div className="flex gap-1 bg-card/50 border border-border/30 rounded-xl p-1">
              {([
                { id: "colors" as const, label: "Colors", icon: Palette },
                { id: "text" as const, label: "Text", icon: Type },
                { id: "size" as const, label: "Size", icon: Maximize2 },
              ]).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
                    activeTab === tab.id
                      ? "bg-[#FFE100]/10 text-[#FFE100] border border-[#FFE100]/20"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <tab.icon size={12} />
                  {tab.label}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {activeTab === "colors" && (
                <motion.div key="colors" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Preset Themes</label>
                    <div className="grid grid-cols-3 gap-2">
                      {PRESET_COLORS.map((preset) => (
                        <button key={preset.name} onClick={() => updateDesign({ backgroundColor: preset.bg, borderColor: preset.border })}
                          className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${
                            design.backgroundColor === preset.bg && design.borderColor === preset.border
                              ? "border-[#FFE100]/40 bg-[#FFE100]/5" : "border-border/30 hover:border-border/60"
                          }`}>
                          <div className="flex gap-0.5">
                            <div className="w-4 h-4 rounded-full border border-white/10" style={{ background: preset.bg }} />
                            <div className="w-4 h-4 rounded-full border border-white/10" style={{ background: preset.border }} />
                          </div>
                          <span className="text-[9px] text-muted-foreground">{preset.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Custom Colors</label>
                    <div className="flex gap-3">
                      <div className="flex-1 space-y-1">
                        <span className="text-[10px] text-muted-foreground">Background</span>
                        <div className="flex items-center gap-2">
                          <input type="color" value={design.backgroundColor} onChange={(e) => updateDesign({ backgroundColor: e.target.value })} className="w-8 h-8 rounded-lg border border-border/30 cursor-pointer" />
                          <Input value={design.backgroundColor} onChange={(e) => updateDesign({ backgroundColor: e.target.value })} className="h-8 text-xs font-mono bg-background/50 border-border/30" />
                        </div>
                      </div>
                      <div className="flex-1 space-y-1">
                        <span className="text-[10px] text-muted-foreground">Border</span>
                        <div className="flex items-center gap-2">
                          <input type="color" value={design.borderColor} onChange={(e) => updateDesign({ borderColor: e.target.value })} className="w-8 h-8 rounded-lg border border-border/30 cursor-pointer" />
                          <Input value={design.borderColor} onChange={(e) => updateDesign({ borderColor: e.target.value })} className="h-8 text-xs font-mono bg-background/50 border-border/30" />
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === "text" && (
                <motion.div key="text" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Business Name</label>
                    <Input value={design.businessName} onChange={(e) => updateDesign({ businessName: e.target.value })} placeholder="Your Business" className="h-9 text-sm bg-background/50 border-border/30" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Tagline</label>
                    <Input value={design.tagline} onChange={(e) => updateDesign({ tagline: e.target.value })} placeholder="Scan for a special offer" className="h-9 text-sm bg-background/50 border-border/30" />
                  </div>
                </motion.div>
              )}

              {activeTab === "size" && (
                <motion.div key="size" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Label Size</label>
                    <div className="flex gap-2">
                      {LABEL_SIZES.map((size) => (
                        <button key={size.id} onClick={() => updateDesign({ labelSize: size.id })}
                          className={`flex-1 flex flex-col items-center gap-0.5 p-3 rounded-xl border transition-all ${
                            design.labelSize === size.id ? "border-[#FFE100]/40 bg-[#FFE100]/5" : "border-border/30 hover:border-border/60"
                          }`}>
                          <span className="text-sm font-bold text-foreground">{size.label}</span>
                          <span className="text-[9px] text-muted-foreground">{size.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Shape</label>
                    <div className="flex gap-2">
                      {SHAPES.map((shape) => (
                        <button key={shape.id} onClick={() => updateDesign({ shape: shape.id })}
                          className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${
                            design.shape === shape.id ? "border-[#FFE100]/40 bg-[#FFE100]/5" : "border-border/30 hover:border-border/60"
                          }`}>
                          <shape.icon size={18} className={design.shape === shape.id ? "text-[#FFE100]" : "text-muted-foreground"} />
                          <span className="text-[9px] text-muted-foreground">{shape.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-[#FFE100]/5 border border-[#FFE100]/10 rounded-xl p-3 flex items-start gap-2.5">
        <QrCode size={14} className="text-[#FFE100] mt-0.5 shrink-0" />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          {reviewUrl ? (
            <>
              The QR code encodes your primary review link: <span className="text-foreground font-medium break-all">{reviewUrl}</span>.
              Customers scan it to leave a review on your preferred platform.
            </>
          ) : (
            <>
              Add a primary review link in your <span className="text-foreground font-medium">Business Profile</span> to generate
              a real scannable QR code. Currently showing a placeholder.
            </>
          )}
        </p>
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────

function drawLabelPath(
  ctx: CanvasRenderingContext2D,
  shape: string,
  padding: number,
  px: number,
) {
  if (shape === "circle") {
    ctx.arc(padding + px / 2, padding + px / 2, px / 2, 0, Math.PI * 2)
  } else if (shape === "square") {
    ctx.rect(padding, padding, px, px)
  } else {
    const r = 16
    ctx.moveTo(padding + r, padding)
    ctx.arcTo(padding + px, padding, padding + px, padding + px, r)
    ctx.arcTo(padding + px, padding + px, padding, padding + px, r)
    ctx.arcTo(padding, padding + px, padding, padding, r)
    ctx.arcTo(padding, padding, padding + px, padding, r)
  }
}

function isLightColor(hex: string): boolean {
  const c = hex.replace("#", "")
  const r = parseInt(c.substring(0, 2), 16)
  const g = parseInt(c.substring(2, 4), 16)
  const b = parseInt(c.substring(4, 6), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 140
}

function drawQRPattern(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, seed: string) {
  const modules = 21
  const cellSize = size / modules
  let h = 0
  for (let i = 0; i < seed.length; i++) { h = ((h << 5) - h + seed.charCodeAt(i)) | 0 }
  const finderPos = [[0, 0], [modules - 7, 0], [0, modules - 7]]
  for (const [fx, fy] of finderPos) {
    ctx.fillStyle = "#000"
    ctx.fillRect(x + fx * cellSize, y + fy * cellSize, 7 * cellSize, 7 * cellSize)
    ctx.fillStyle = "#FFF"
    ctx.fillRect(x + (fx + 1) * cellSize, y + (fy + 1) * cellSize, 5 * cellSize, 5 * cellSize)
    ctx.fillStyle = "#000"
    ctx.fillRect(x + (fx + 2) * cellSize, y + (fy + 2) * cellSize, 3 * cellSize, 3 * cellSize)
  }
  let s = Math.abs(h)
  ctx.fillStyle = "#000"
  for (let row = 0; row < modules; row++) {
    for (let col = 0; col < modules; col++) {
      if ((col < 8 && row < 8) || (col > 12 && row < 8) || (col < 8 && row > 12)) continue
      if (col === 6 || row === 6) {
        if ((col + row) % 2 === 0) ctx.fillRect(x + col * cellSize, y + row * cellSize, cellSize, cellSize)
        continue
      }
      s = (s * 1103515245 + 12345) & 0x7fffffff
      if (s % 3 !== 0) ctx.fillRect(x + col * cellSize, y + row * cellSize, cellSize, cellSize)
    }
  }
}
