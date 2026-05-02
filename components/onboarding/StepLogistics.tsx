"use client"

import { useMemo } from "react"
import { motion } from "framer-motion"
import { Package, MapPin, ArrowRight, ArrowLeft, Minus, Plus } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import type { OnboardingData, ShippingAddress } from "@/lib/onboarding-types"
import { PACKAGES, HARDWARE_PRICES } from "@/lib/onboarding-types"

interface StepLogisticsProps {
  data: OnboardingData
  onChange: (updates: Partial<OnboardingData>) => void
  onNext: () => void
  onBack: () => void
}

export function StepLogistics({ data, onChange, onNext, onBack }: StepLogisticsProps) {
  const pkg = PACKAGES.find((p) => p.id === data.packageId) ?? PACKAGES[1]
  const recurringPrice =
    data.billingCycle === "annual" ? pkg.annualPrice : pkg.monthlyPrice

  const hardwareTotal = useMemo(() => {
    let total = data.stickerQty * HARDWARE_PRICES.stickerRoll
    if (data.acrylicStands) total += HARDWARE_PRICES.acrylicStand
    if (data.safetyDecals) total += HARDWARE_PRICES.safetyDecal
    return total
  }, [data.stickerQty, data.acrylicStands, data.safetyDecals])

  const updateAddress = (field: keyof ShippingAddress, value: string) => {
    onChange({
      shippingAddress: { ...data.shippingAddress, [field]: value },
    })
  }

  const canProceed =
    data.shippingAddress.street.length > 0 &&
    data.shippingAddress.city.length > 0 &&
    data.shippingAddress.state.length > 0 &&
    data.shippingAddress.zip.length > 0

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.35 }}
      className="flex flex-col gap-6 w-full"
    >
      <div className="flex flex-col gap-1.5">
        <h2 className="text-xl font-semibold text-foreground tracking-tight text-balance">
          The VLYR Supply Shop
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Boost your physical presence with hardware add-ons. Ships within 3 business days.
        </p>
      </div>

      {/* Hardware Products */}
      <div className="flex flex-col gap-3">
        {/* Sticker Roll (500ct) */}
        <div className="p-4 bg-card border border-border rounded-2xl">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 shrink-0">
              <Package size={18} className="text-accent" />
            </div>
            <div className="flex-1 flex flex-col gap-0.5">
              <span className="text-sm font-semibold text-foreground">VLYR Sticker Roll (500ct)</span>
              <span className="text-[11px] text-muted-foreground leading-relaxed">
                Heavy-duty, weather-proof QR stickers for bags, receipts, and windows.
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
            <div className="flex items-center gap-3">
              <button
                onClick={() => onChange({ stickerQty: Math.max(0, data.stickerQty - 1) })}
                disabled={data.stickerQty === 0}
                className="flex items-center justify-center w-8 h-8 rounded-lg border border-border bg-background text-foreground hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <Minus size={14} />
              </button>
              <span className="text-sm font-semibold text-foreground tabular-nums min-w-[20px] text-center">
                {data.stickerQty}
              </span>
              <button
                onClick={() => onChange({ stickerQty: data.stickerQty + 1 })}
                className="flex items-center justify-center w-8 h-8 rounded-lg border border-border bg-background text-foreground hover:bg-secondary transition-colors"
              >
                <Plus size={14} />
              </button>
            </div>
            <span className="text-sm font-bold text-foreground">
              ${data.stickerQty * HARDWARE_PRICES.stickerRoll}
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground mt-1 block">
            ${HARDWARE_PRICES.stickerRoll} per roll
          </span>
        </div>

        {/* Acrylic Pulse-Point Stand */}
        <div className="flex items-center justify-between p-4 bg-card border border-border rounded-2xl">
          <div className="flex flex-col gap-0.5 flex-1 pr-4">
            <span className="text-sm font-semibold text-foreground">Acrylic Pulse-Point Stand</span>
            <span className="text-[11px] text-muted-foreground leading-relaxed">
              Sleek counter-top QR display for instant customer scans.
            </span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-muted-foreground font-medium">${HARDWARE_PRICES.acrylicStand}</span>
            <Switch
              checked={data.acrylicStands}
              onCheckedChange={(val) => onChange({ acrylicStands: val })}
            />
          </div>
        </div>

        {/* Safety Seal Decals */}
        <div className="flex items-center justify-between p-4 bg-card border border-border rounded-2xl">
          <div className="flex flex-col gap-0.5 flex-1 pr-4">
            <span className="text-sm font-semibold text-foreground">Safety Seal Decals</span>
            <span className="text-[11px] text-muted-foreground leading-relaxed">
              Branded vinyl decals for your storefront window and door.
            </span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-muted-foreground font-medium">${HARDWARE_PRICES.safetyDecal}</span>
            <Switch
              checked={data.safetyDecals}
              onCheckedChange={(val) => onChange({ safetyDecals: val })}
            />
          </div>
        </div>
      </div>

      {/* Shipping Address */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <label className="text-xs text-muted-foreground font-medium tracking-wide uppercase">
            Shipping Address
          </label>
          <div className="flex items-center gap-2">
            <Checkbox
              id="sameAddress"
              checked={data.sameAsBusiness}
              onCheckedChange={(val) => onChange({ sameAsBusiness: !!val })}
              className="border-border"
            />
            <label htmlFor="sameAddress" className="text-xs text-muted-foreground cursor-pointer">
              Same as business
            </label>
          </div>
        </div>

        <div className="relative">
          <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Street address"
            value={data.shippingAddress.street}
            onChange={(e) => updateAddress("street", e.target.value)}
            className="pl-10 h-12 bg-card border-border text-foreground placeholder:text-muted-foreground/60 rounded-xl"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            placeholder="City"
            value={data.shippingAddress.city}
            onChange={(e) => updateAddress("city", e.target.value)}
            className="h-12 bg-card border-border text-foreground placeholder:text-muted-foreground/60 rounded-xl"
          />
          <Input
            placeholder="State"
            value={data.shippingAddress.state}
            onChange={(e) => updateAddress("state", e.target.value)}
            className="h-12 bg-card border-border text-foreground placeholder:text-muted-foreground/60 rounded-xl"
          />
        </div>
        <Input
          placeholder="ZIP code"
          value={data.shippingAddress.zip}
          onChange={(e) => updateAddress("zip", e.target.value)}
          className="h-12 bg-card border-border text-foreground placeholder:text-muted-foreground/60 rounded-xl"
        />
      </div>

      {/* Sticky Total Balance */}
      <div className="flex flex-col gap-2 p-4 bg-foreground text-background rounded-2xl sticky bottom-4">
        <span className="text-[10px] font-bold tracking-widest uppercase opacity-60">
          Order Summary
        </span>
        <div className="flex items-center justify-between text-sm">
          <span className="opacity-70">
            {pkg.name} Plan ({data.billingCycle === "annual" ? "Annual" : "Monthly"})
          </span>
          <span className="font-medium">${recurringPrice}/mo</span>
        </div>
        {data.stickerQty > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="opacity-70">Sticker Roll x{data.stickerQty}</span>
            <span className="font-medium">${data.stickerQty * HARDWARE_PRICES.stickerRoll}</span>
          </div>
        )}
        {data.acrylicStands && (
          <div className="flex items-center justify-between text-sm">
            <span className="opacity-70">Acrylic Stand</span>
            <span className="font-medium">${HARDWARE_PRICES.acrylicStand}</span>
          </div>
        )}
        {data.safetyDecals && (
          <div className="flex items-center justify-between text-sm">
            <span className="opacity-70">Safety Decals</span>
            <span className="font-medium">${HARDWARE_PRICES.safetyDecal}</span>
          </div>
        )}
        <div className="h-px bg-background/20 my-0.5" />
        <div className="flex items-center justify-between">
          <span className="font-semibold">Due Today</span>
          <span className="font-bold text-xl tracking-tight">
            ${recurringPrice + hardwareTotal}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          onClick={onBack}
          className="h-12 rounded-xl border-border bg-card text-foreground hover:bg-secondary flex-1"
        >
          <ArrowLeft size={18} className="mr-2" />
          Back
        </Button>
        <Button
          onClick={onNext}
          disabled={!canProceed}
          className="h-12 rounded-xl bg-foreground text-background font-semibold text-base hover:bg-foreground/90 disabled:opacity-30 flex-[2]"
        >
          Continue to Labels
          <ArrowRight size={18} className="ml-2" />
        </Button>
      </div>
    </motion.div>
  )
}
