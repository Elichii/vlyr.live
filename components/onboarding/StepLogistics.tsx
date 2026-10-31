"use client"

import { useMemo } from "react"
import { motion } from "framer-motion"
import {
  Package, MapPin, ArrowRight, ArrowLeft, Minus, Plus,
  Truck, Shield, Award, CheckCircle2,
} from "lucide-react"
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

const PRODUCTS = [
  {
    id: "stickers" as const,
    icon: <Package size={18} />,
    name: "VLYR Sticker Roll",
    qty: "500 labels per roll",
    description: "Heavy-duty, weather-resistant QR labels for bags, receipts, counters & windows.",
    price: HARDWARE_PRICES.stickerRoll,
    badge: "Most ordered",
    type: "counter" as const,
  },
  {
    id: "acrylic" as const,
    icon: <Award size={18} />,
    name: "Acrylic Pulse-Point Stand",
    qty: "Tabletop display",
    description: "Premium counter display. Invites every customer to scan with confidence.",
    price: HARDWARE_PRICES.acrylicStand,
    badge: null,
    type: "toggle" as const,
  },
  {
    id: "decals" as const,
    icon: <Shield size={18} />,
    name: "Safety Seal Decals",
    qty: "Window & door set",
    description: "Branded storefront vinyl decals — signals trustworthiness before they walk in.",
    price: HARDWARE_PRICES.safetyDecal,
    badge: null,
    type: "toggle" as const,
  },
]

export function StepLogistics({ data, onChange, onNext, onBack }: StepLogisticsProps) {
  const pkg = PACKAGES.find((p) => p.id === data.packageId) ?? PACKAGES.find((p) => p.id === "growth")!
  const recurringPrice = data.billingCycle === "annual" ? pkg.annualPrice : pkg.monthlyPrice

  const hardwareTotal = useMemo(() => {
    let total = data.stickerQty * HARDWARE_PRICES.stickerRoll
    if (data.acrylicStands) total += HARDWARE_PRICES.acrylicStand
    if (data.safetyDecals) total += HARDWARE_PRICES.safetyDecal
    return total
  }, [data.stickerQty, data.acrylicStands, data.safetyDecals])

  const updateAddress = (field: keyof ShippingAddress, value: string) => {
    onChange({ shippingAddress: { ...data.shippingAddress, [field]: value } })
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
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-[#0A0A0A] tracking-tight mb-1">Your supply kit</h2>
        <p className="text-sm text-[#888888]">
          Ships within 3 business days. Add what you need — nothing you don't.
        </p>
      </div>

      {/* Shipping badge */}
      <div className="flex items-center gap-2.5 px-4 py-2.5 bg-[#f0fdf4] border border-[#00a544]/20 rounded-xl">
        <Truck size={15} className="text-green-600 shrink-0" />
        <p className="text-xs font-medium text-[#166534]">
          Free shipping on orders over $75 · Usually arrives in 2–3 business days
        </p>
      </div>

      {/* Product cards */}
      <div className="flex flex-col gap-3">
        {/* Sticker Roll (with counter) */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="p-4 bg-[#FAFAFA] border border-[#E5E5E5] rounded-2xl"
        >
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#FFE100]/15 border border-[#FFE100]/30 flex items-center justify-center shrink-0 text-[#B8860B]">
              <Package size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-[#0A0A0A]">VLYR Sticker Roll</span>
                <span className="text-xs font-bold uppercase tracking-wider text-[#B8860B] bg-[#FFE100]/15 px-2 py-0.5 rounded-full border border-[#FFE100]/30">
                  Most ordered
                </span>
              </div>
              <p className="text-xs text-[#888888] mt-0.5">500 heavy-duty QR labels per roll · Waterproof</p>
              <p className="text-xs text-[#666666] mt-1 leading-relaxed">
                Perfect for bags, receipts, counters and windows. Lasts 3–5 years outdoors.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-border">
            <div className="flex items-center gap-3">
              <button
                onClick={() => onChange({ stickerQty: Math.max(0, data.stickerQty - 1) })}
                disabled={data.stickerQty === 0}
                className="w-9 h-9 rounded-xl border border-[#E5E5E5] bg-white flex items-center justify-center text-[#0A0A0A] hover:bg-[#F0F0F0] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <Minus size={13} />
              </button>
              <div className="text-center min-w-[32px]">
                <span className="text-base font-bold text-[#0A0A0A] tabular-nums">{data.stickerQty}</span>
                <p className="text-sm text-[#888888]">rolls</p>
              </div>
              <button
                onClick={() => onChange({ stickerQty: data.stickerQty + 1 })}
                className="w-9 h-9 rounded-xl border border-border bg-white flex items-center justify-center text-foreground hover:bg-secondary transition-colors"
              >
                <Plus size={13} />
              </button>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-[#0A0A0A]">
                ${data.stickerQty * HARDWARE_PRICES.stickerRoll}
              </span>
              <p className="text-sm text-[#888888]">${HARDWARE_PRICES.stickerRoll}/roll · 500 labels each</p>
            </div>
          </div>

          {data.stickerQty >= 2 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-2.5 flex items-center gap-1.5 text-xs text-[#166534]"
            >
              <CheckCircle2 size={11} />
              Smart choice — most businesses use 2+ rolls across front and back of house.
            </motion.div>
          )}
        </motion.div>

        {/* Acrylic Stand */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`p-4 border rounded-2xl transition-all duration-200 ${
            data.acrylicStands ? "bg-foreground/[0.02] border-foreground/20" : "bg-[#FAFAFA] border-border"
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F0F0F0] border border-[#E5E5E5] flex items-center justify-center shrink-0 text-[#888888]">
              <Award size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#0A0A0A]">Acrylic Pulse-Point Stand</p>
              <p className="text-xs text-[#888888] mt-0.5">Tabletop display · Premium counter presence</p>
              <p className="text-xs text-[#666666] mt-1 leading-relaxed">
                Invites customers to scan organically at your checkout counter.
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className="text-sm font-bold text-[#0A0A0A]">${HARDWARE_PRICES.acrylicStand}</span>
              <Switch
                checked={data.acrylicStands}
                onCheckedChange={(val) => onChange({ acrylicStands: val })}
              />
            </div>
          </div>
        </motion.div>

        {/* Safety Decals */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className={`p-4 border rounded-2xl transition-all duration-200 ${
            data.safetyDecals ? "bg-foreground/[0.02] border-foreground/20" : "bg-[#FAFAFA] border-border"
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F0F0F0] border border-[#E5E5E5] flex items-center justify-center shrink-0 text-[#888888]">
              <Shield size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#0A0A0A]">Safety Seal Decals</p>
              <p className="text-xs text-[#888888] mt-0.5">Window & door vinyl set · High-visibility</p>
              <p className="text-xs text-[#666666] mt-1 leading-relaxed">
                Signals quality and trustworthiness before customers even walk in.
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className="text-sm font-bold text-[#0A0A0A]">${HARDWARE_PRICES.safetyDecal}</span>
              <Switch
                checked={data.safetyDecals}
                onCheckedChange={(val) => onChange({ safetyDecals: val })}
              />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Shipping Address */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-foreground/70 uppercase tracking-wide flex items-center gap-1.5">
            <MapPin size={11} className="text-[#FFE100]" />
            Shipping address
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              id="sameAddress"
              checked={data.sameAsBusiness}
              onCheckedChange={(val) => onChange({ sameAsBusiness: !!val })}
              className="border-border"
            />
            <span className="text-sm text-[#888888]">Same as business</span>
          </label>
        </div>

        <div className="flex flex-col gap-2.5">
          <div className="relative">
            <MapPin size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Street address"
              value={data.shippingAddress.street}
              onChange={(e) => updateAddress("street", e.target.value)}
              className="pl-10 h-12 rounded-xl bg-[#FAFAFA] border-[#E5E5E5] text-[#0A0A0A] placeholder:text-[#AAAAAA] focus-visible:border-[#0A0A0A]"
            />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <Input
              placeholder="City"
              value={data.shippingAddress.city}
              onChange={(e) => updateAddress("city", e.target.value)}
              className="h-12 rounded-xl bg-[#FAFAFA] border-[#E5E5E5] text-[#0A0A0A] placeholder:text-[#AAAAAA] focus-visible:border-[#0A0A0A]"
            />
            <Input
              placeholder="State"
              value={data.shippingAddress.state}
              onChange={(e) => updateAddress("state", e.target.value)}
              className="h-12 rounded-xl bg-[#FAFAFA] border-[#E5E5E5] text-[#0A0A0A] placeholder:text-[#AAAAAA] focus-visible:border-[#0A0A0A]"
            />
          </div>
          <Input
            placeholder="ZIP code"
            value={data.shippingAddress.zip}
            onChange={(e) => updateAddress("zip", e.target.value)}
            className="h-12 rounded-xl bg-[#FAFAFA] border-[#E5E5E5] text-[#0A0A0A] placeholder:text-[#AAAAAA] focus-visible:border-[#0A0A0A]"
          />
        </div>
      </div>

      {/* Order summary sticky */}
      <div className="p-4 bg-[#0A0A0A] text-white rounded-2xl">
        <p className="text-xs font-bold tracking-widest uppercase opacity-60 mb-3">Order Summary</p>
        <div className="flex flex-col gap-1.5 text-sm">
          <div className="flex justify-between">
            <span className="opacity-60">{pkg.name} Plan ({data.billingCycle})</span>
            <span className="font-medium">${recurringPrice}/mo</span>
          </div>
          {data.stickerQty > 0 && (
            <div className="flex justify-between">
              <span className="opacity-60">Sticker Roll ×{data.stickerQty}</span>
              <span className="font-medium">${data.stickerQty * HARDWARE_PRICES.stickerRoll}</span>
            </div>
          )}
          {data.acrylicStands && (
            <div className="flex justify-between">
              <span className="opacity-60">Acrylic Stand</span>
              <span className="font-medium">${HARDWARE_PRICES.acrylicStand}</span>
            </div>
          )}
          {data.safetyDecals && (
            <div className="flex justify-between">
              <span className="opacity-60">Safety Decals</span>
              <span className="font-medium">${HARDWARE_PRICES.safetyDecal}</span>
            </div>
          )}
        </div>
        <div className="h-px bg-background/20 my-3" />
        <div className="flex items-center justify-between">
          <span className="font-semibold">Due today</span>
          <span className="text-xl font-bold tracking-tight">${recurringPrice + hardwareTotal}</span>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          onClick={onBack}
          className="h-12 rounded-full border-[#E5E5E5] bg-white text-[#0A0A0A] hover:border-[#0A0A0A] hover:rounded-xl flex-1 transition-all duration-200 font-semibold"
        >
          <ArrowLeft size={16} className="mr-2" />
          Back
        </Button>
        <Button
          onClick={onNext}
          disabled={!canProceed}
          className="h-12 rounded-full bg-[#0A0A0A] text-white font-semibold hover:bg-[#1F1F1F] hover:rounded-xl disabled:opacity-30 flex-[2] transition-all duration-200"
        >
          Continue to Labels
          <ArrowRight size={16} className="ml-2" />
        </Button>
      </div>
    </motion.div>
  )
}
