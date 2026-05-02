"use client"

import { motion } from "framer-motion"
import { Check, ShieldCheck, Sparkles, Building2, Zap } from "lucide-react"
import { PACKAGES, HARDWARE_PRICES, PLAN_FEATURES } from "@/lib/onboarding-types"
import type { OnboardingData } from "@/lib/onboarding-types"

interface OrderSummaryProps {
  data: OnboardingData
  currentStep: string
}

const TIER_ICONS: Record<string, React.ReactNode> = {
  starter: <ShieldCheck size={18} />,
  growth: <Sparkles size={18} />,
  enterprise: <Building2 size={18} />,
}

export function OnboardingOrderSummary({ data, currentStep }: OrderSummaryProps) {
  const pkg = PACKAGES.find((p) => p.id === data.packageId)
  if (!pkg) return null

  const monthlyPrice = data.billingCycle === "annual" ? pkg.annualPrice : pkg.monthlyPrice
  const features = PLAN_FEATURES[pkg.id] ?? []
  const includedFeatures = features.filter((f) => f.included)

  // Hardware costs (only show if user has reached logistics step or beyond)
  const showHardware = ["logistics", "print-studio", "payment", "success"].includes(currentStep)
  const hardwareTotal = showHardware
    ? data.stickerQty * HARDWARE_PRICES.stickerRoll +
      (data.acrylicStands ? HARDWARE_PRICES.acrylicStand : 0) +
      (data.safetyDecals ? HARDWARE_PRICES.safetyDecal : 0)
    : 0

  const isAnnual = data.billingCycle === "annual"

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className="flex flex-col gap-0 rounded-2xl border border-border bg-card overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-5 bg-vlyr-dark border-b border-border">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-accent/15 text-accent">
          {TIER_ICONS[pkg.id] ?? <Zap size={18} />}
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-foreground">{pkg.name} Plan</span>
          <span className="text-[11px] text-muted-foreground capitalize">
            {data.billingCycle} billing
          </span>
        </div>
      </div>

      {/* Price section */}
      <div className="flex items-baseline gap-1.5 p-5 pb-0">
        <span className="text-3xl font-bold tracking-tight text-foreground">${monthlyPrice}</span>
        <span className="text-sm text-muted-foreground">/month</span>
      </div>
      {isAnnual && (
        <div className="px-5 pt-1">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/10 text-accent text-[10px] font-bold tracking-wide uppercase">
            Save 20% with annual
          </span>
        </div>
      )}

      {/* Included features */}
      <div className="flex flex-col gap-2 p-5">
        <span className="text-[10px] text-muted-foreground font-semibold tracking-wider uppercase mb-1">
          Included
        </span>
        {includedFeatures.map((feat) => (
          <div key={feat.label} className="flex items-center gap-2">
            <div className="flex items-center justify-center w-4 h-4 rounded-full bg-green-500/15 shrink-0">
              <Check size={10} className="text-green-500" />
            </div>
            <span className="text-xs text-foreground/80">{feat.label}</span>
          </div>
        ))}
      </div>

      {/* Hardware add-ons -- only when visible */}
      {showHardware && hardwareTotal > 0 && (
        <div className="flex flex-col gap-2 px-5 pb-4 pt-1 border-t border-border">
          <span className="text-[10px] text-muted-foreground font-semibold tracking-wider uppercase mb-1 pt-3">
            Hardware
          </span>
          {data.stickerQty > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-foreground/80">
                QR Sticker Rolls x{data.stickerQty}
              </span>
              <span className="text-foreground font-medium">
                ${data.stickerQty * HARDWARE_PRICES.stickerRoll}
              </span>
            </div>
          )}
          {data.acrylicStands && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-foreground/80">Acrylic Stand</span>
              <span className="text-foreground font-medium">${HARDWARE_PRICES.acrylicStand}</span>
            </div>
          )}
          {data.safetyDecals && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-foreground/80">Safety Decals</span>
              <span className="text-foreground font-medium">${HARDWARE_PRICES.safetyDecal}</span>
            </div>
          )}
        </div>
      )}

      {/* Total */}
      <div className="flex flex-col gap-2 p-5 bg-vlyr-dark border-t border-border">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-medium">Recurring</span>
          <span className="text-sm font-bold text-foreground">${monthlyPrice}/mo</span>
        </div>
        {showHardware && hardwareTotal > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">One-time hardware</span>
            <span className="text-sm font-bold text-foreground">${hardwareTotal}</span>
          </div>
        )}
        <div className="h-px bg-border my-1" />
        <div className="flex items-center justify-between">
          <span className="text-xs text-foreground font-semibold">Due today</span>
          <span className="text-lg font-bold text-foreground">
            ${monthlyPrice + (showHardware ? hardwareTotal : 0)}
          </span>
        </div>
      </div>
    </motion.div>
  )
}
