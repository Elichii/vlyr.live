"use client"

import { useEffect, useMemo, useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Download,
  ArrowRight,
  Rocket,
  ShieldCheck,
  QrCode,
  Package,
  Sparkles,
  FileText,
  Image as ImageIcon,
  Palette,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import type { OnboardingData } from "@/lib/onboarding-types"
import { PACKAGES, HARDWARE_PRICES } from "@/lib/onboarding-types"

interface StepSuccessProps {
  data: OnboardingData
  onGoToDashboard: () => void
}

// Confetti particle
function Particle({ delay, index }: { delay: number; index: number }) {
  const colors = ["#FFE100", "#3B82F6", "#10B981", "#F97316", "#A855F7", "#EC4899"]
  const color = colors[index % colors.length]
  const x = Math.random() * 100
  const rotation = Math.random() * 720 - 360
  const size = 4 + Math.random() * 6
  const duration = 2.5 + Math.random() * 1.5

  return (
    <motion.div
      className="absolute top-0 rounded-sm"
      style={{
        left: `${x}%`,
        width: size,
        height: size * 0.4,
        backgroundColor: color,
      }}
      initial={{ y: -20, opacity: 1, rotate: 0 }}
      animate={{
        y: [0, 400 + Math.random() * 200],
        opacity: [1, 1, 0],
        rotate: rotation,
        x: [0, (Math.random() - 0.5) * 100],
      }}
      transition={{
        duration,
        delay,
        ease: "easeIn",
      }}
    />
  )
}

export function StepSuccess({ data, onGoToDashboard }: StepSuccessProps) {
  const [phase, setPhase] = useState<"shield" | "reveal">("shield")
  const [showKit, setShowKit] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("reveal"), 1800)
    const t2 = setTimeout(() => setShowKit(true), 2800)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [])

  const pkg = PACKAGES.find((p) => p.id === data.packageId) ?? PACKAGES[1]
  const recurringPrice =
    data.billingCycle === "annual" ? pkg.annualPrice : pkg.monthlyPrice

  const hardwareTotal = useMemo(() => {
    let total = data.stickerQty * HARDWARE_PRICES.stickerRoll
    if (data.acrylicStands) total += HARDWARE_PRICES.acrylicStand
    if (data.safetyDecals) total += HARDWARE_PRICES.safetyDecal
    return total
  }, [data.stickerQty, data.acrylicStands, data.safetyDecals])

  const orderId = useMemo(
    () => "VLYR-" + Math.random().toString(36).substring(2, 8).toUpperCase(),
    [],
  )

  // Render a mini label preview on canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const design = data.labelDesign ?? {}
    const bg = (design.backgroundColor as string) ?? "#0A0A0A"
    const border = (design.borderColor as string) ?? "#FFE100"
    const biz = (design.businessName as string) ?? data.businessName ?? "VLYR"

    const s = 120
    canvas.width = s * 2
    canvas.height = s * 2
    canvas.style.width = `${s}px`
    canvas.style.height = `${s}px`
    ctx.scale(2, 2)

    // Background
    ctx.fillStyle = bg
    ctx.beginPath()
    ctx.roundRect(0, 0, s, s, 12)
    ctx.fill()

    // Border
    ctx.strokeStyle = border
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.roundRect(0, 0, s, s, 12)
    ctx.stroke()

    // Business name
    const textColor = isLight(bg) ? "#0A0A0A" : "#FFFFFF"
    ctx.fillStyle = textColor
    ctx.font = "bold 8px Inter, sans-serif"
    ctx.textAlign = "center"
    ctx.fillText(biz.toUpperCase(), s / 2, 18)

    // QR placeholder
    ctx.fillStyle = "#FFF"
    ctx.beginPath()
    ctx.roundRect(s / 2 - 25, s / 2 - 25, 50, 50, 4)
    ctx.fill()

    // Mini QR pattern
    ctx.fillStyle = "#000"
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if ((r + c + biz.charCodeAt(r % biz.length)) % 3 !== 0) {
          ctx.fillRect(s / 2 - 23 + c * 5, s / 2 - 23 + r * 5, 4, 4)
        }
      }
    }

    // Footer
    ctx.fillStyle = border
    ctx.font = "bold 6px Inter, sans-serif"
    ctx.textAlign = "center"
    ctx.fillText("VLYR", s / 2, s - 8)
  }, [data])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center gap-6 w-full text-center relative overflow-hidden"
    >
      {/* Confetti burst */}
      <AnimatePresence>
        {phase === "reveal" && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
            {Array.from({ length: 40 }).map((_, i) => (
              <Particle key={i} index={i} delay={i * 0.03} />
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Phase 1: Shield animation */}
      <AnimatePresence mode="wait">
        {phase === "shield" && (
          <motion.div
            key="shield"
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.2, 1] }}
            exit={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 1.2, times: [0, 0.6, 1] }}
            className="flex flex-col items-center gap-4 py-12"
          >
            <div className="relative">
              <motion.div
                animate={{
                  boxShadow: [
                    "0 0 0 0 rgba(255,225,0,0)",
                    "0 0 40px 20px rgba(255,225,0,0.15)",
                    "0 0 0 0 rgba(255,225,0,0)",
                  ],
                }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-24 h-24 rounded-full bg-[#FFE100]/10 border-2 border-[#FFE100]/30 flex items-center justify-center"
              >
                <ShieldCheck size={48} className="text-[#FFE100]" />
              </motion.div>
            </div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-sm font-semibold text-[#FFE100] tracking-widest uppercase"
            >
              Deploying Shield...
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Phase 2: Reveal */}
      {phase === "reveal" && (
        <>
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex flex-col items-center gap-3 relative z-20"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
              className="w-16 h-16 rounded-full bg-[#FFE100]/10 border-2 border-[#FFE100]/30 flex items-center justify-center"
            >
              <Sparkles size={28} className="text-[#FFE100]" />
            </motion.div>
            <h2 className="text-2xl font-bold text-foreground tracking-tight">
              Shield Deployed
            </h2>
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
              Your VLYR protection is live, {data.businessName || data.username}.
              Your first batch of labels is being generated.
            </p>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="grid grid-cols-3 gap-3 w-full max-w-sm relative z-20"
          >
            {[
              {
                icon: QrCode,
                value: `${data.stickerQty * 500}`,
                label: "Labels",
              },
              {
                icon: Package,
                value: pkg.name,
                label: "Plan",
              },
              {
                icon: ShieldCheck,
                value: "Active",
                label: "Status",
              },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7 + i * 0.1 }}
                className="flex flex-col items-center gap-1 p-3 rounded-xl bg-card/50 border border-border/30"
              >
                <stat.icon size={16} className="text-[#FFE100]" />
                <span className="text-sm font-bold text-foreground">{stat.value}</span>
                <span className="text-[9px] text-muted-foreground uppercase tracking-wider">
                  {stat.label}
                </span>
              </motion.div>
            ))}
          </motion.div>

          {/* Label preview + Receipt */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="flex flex-col sm:flex-row gap-3 w-full relative z-20"
          >
            {/* Label preview card */}
            <div className="flex-1 p-4 bg-card/50 border border-border/30 rounded-xl flex flex-col items-center gap-2">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Your Label Design
              </span>
              <canvas ref={canvasRef} className="rounded-lg" />
              <span className="text-[9px] text-muted-foreground">
                First batch generating now
              </span>
            </div>

            {/* Receipt card */}
            <div className="flex-1 p-4 bg-card/50 border border-border/30 rounded-xl text-left">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] text-muted-foreground font-medium tracking-wide uppercase">
                  Order Receipt
                </span>
                <span className="text-[10px] text-foreground font-mono font-semibold">
                  {orderId}
                </span>
              </div>
              <div className="flex flex-col gap-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    {pkg.name} ({data.billingCycle})
                  </span>
                  <span className="text-foreground">${recurringPrice}/mo</span>
                </div>
                {data.stickerQty > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      Sticker Roll x{data.stickerQty}
                    </span>
                    <span className="text-foreground">
                      ${data.stickerQty * HARDWARE_PRICES.stickerRoll}
                    </span>
                  </div>
                )}
                {data.acrylicStands && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Acrylic Stand</span>
                    <span className="text-foreground">${HARDWARE_PRICES.acrylicStand}</span>
                  </div>
                )}
                {data.safetyDecals && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Safety Decals</span>
                    <span className="text-foreground">${HARDWARE_PRICES.safetyDecal}</span>
                  </div>
                )}
                <div className="h-px bg-border my-1" />
                <div className="flex items-center justify-between font-semibold text-sm">
                  <span className="text-foreground">Total</span>
                  <span className="text-foreground">
                    ${recurringPrice + hardwareTotal}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Digital Kit */}
          {showKit && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="w-full relative z-20 space-y-3"
            >
              <div className="flex items-center gap-2 justify-center">
                <Download size={14} className="text-[#FFE100]" />
                <span className="text-xs font-semibold text-foreground tracking-wide uppercase">
                  Your Digital Kit
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  {
                    icon: FileText,
                    label: "Invoice PDF",
                    desc: "Tax-ready receipt",
                    action: () => downloadMockPdf("invoice", orderId),
                  },
                  {
                    icon: Palette,
                    label: "Brand Assets",
                    desc: "Logo + color palette",
                    action: () => downloadMockPdf("brand-kit", orderId),
                  },
                  {
                    icon: ImageIcon,
                    label: "Label Preview",
                    desc: "Print-ready PNG",
                    action: () => {
                      if (canvasRef.current) {
                        const url = canvasRef.current.toDataURL("image/png")
                        const a = document.createElement("a")
                        a.href = url
                        a.download = `vlyr-label-${orderId}.png`
                        a.click()
                      }
                    },
                  },
                ].map((kit) => (
                  <button
                    key={kit.label}
                    onClick={kit.action}
                    className="flex items-center gap-3 p-3 rounded-xl bg-card/50 border border-border/30 hover:border-[#FFE100]/20 hover:bg-[#FFE100]/5 transition-all text-left group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-[#FFE100]/10 flex items-center justify-center shrink-0 group-hover:bg-[#FFE100]/15 transition-colors">
                      <kit.icon size={16} className="text-[#FFE100]" />
                    </div>
                    <div>
                      <span className="text-xs font-medium text-foreground block">
                        {kit.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {kit.desc}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: showKit ? 0.3 : 1.2 }}
            className="w-full relative z-20"
          >
            <Button
              onClick={onGoToDashboard}
              className="w-full h-13 rounded-xl bg-[#FFE100] text-[#0A0A0A] font-bold text-base hover:bg-[#FFE100]/90 hover:shadow-[0_0_24px_4px_rgba(255,225,0,0.2)] transition-all gap-2"
            >
              <Rocket size={18} />
              Launch Command Center
              <ArrowRight size={18} />
            </Button>
          </motion.div>
        </>
      )}
    </motion.div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────

function isLight(hex: string): boolean {
  const c = hex.replace("#", "")
  const r = parseInt(c.substring(0, 2), 16)
  const g = parseInt(c.substring(2, 4), 16)
  const b = parseInt(c.substring(4, 6), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 140
}

function downloadMockPdf(type: string, orderId: string) {
  // In production, this would call an API to generate a real PDF.
  // For now, create a simple text blob as a placeholder.
  const content =
    type === "invoice"
      ? `VLYR Invoice\nOrder: ${orderId}\nThank you for your purchase.`
      : `VLYR Brand Kit\nOrder: ${orderId}\nYour brand assets are attached.`

  const blob = new Blob([content], { type: "text/plain" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `vlyr-${type}-${orderId}.txt`
  a.click()
  URL.revokeObjectURL(url)
}
