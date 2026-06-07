"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  CreditCard, Lock, ArrowLeft, ShieldCheck, CheckCircle2,
  RotateCcw, Zap,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { VLYRInlineLoader } from "@/components/vlyr-loader"
import type { OnboardingData } from "@/lib/onboarding-types"
import { PACKAGES, HARDWARE_PRICES } from "@/lib/onboarding-types"
import { persistOnboarding } from "@/app/onboarding/actions"

interface StepPaymentProps {
  data: OnboardingData
  onNext: () => void
  onBack: () => void
}

export function StepPayment({ data, onNext, onBack }: StepPaymentProps) {
  const [cardNumber, setCardNumber] = useState("")
  const [expiry, setExpiry] = useState("")
  const [cvc, setCvc] = useState("")
  const [nameOnCard, setNameOnCard] = useState("")
  const [processing, setProcessing] = useState(false)
  const [persistError, setPersistError] = useState<string | null>(null)

  const pkg = PACKAGES.find((p) => p.id === data.packageId) ?? PACKAGES[1]
  const recurringPrice = data.billingCycle === "annual" ? pkg.annualPrice : pkg.monthlyPrice

  const hardwareTotal = useMemo(() => {
    let total = data.stickerQty * HARDWARE_PRICES.stickerRoll
    if (data.acrylicStands) total += HARDWARE_PRICES.acrylicStand
    if (data.safetyDecals) total += HARDWARE_PRICES.safetyDecal
    return total
  }, [data.stickerQty, data.acrylicStands, data.safetyDecals])

  const total = recurringPrice + hardwareTotal

  const formatCardNumber = (val: string) => {
    const clean = val.replace(/\D/g, "").substring(0, 16)
    return clean.replace(/(.{4})/g, "$1 ").trim()
  }

  const formatExpiry = (val: string) => {
    const clean = val.replace(/\D/g, "").substring(0, 4)
    if (clean.length >= 3) return clean.substring(0, 2) + " / " + clean.substring(2)
    return clean
  }

  const canPay =
    cardNumber.replace(/\s/g, "").length >= 15 &&
    expiry.replace(/\D/g, "").length === 4 &&
    cvc.length >= 3 &&
    nameOnCard.length >= 2

  const handlePay = async () => {
    setProcessing(true)
    setPersistError(null)
    try {
      const result = await persistOnboarding(data)
      if (!result.success) {
        setPersistError(result.error ?? "Failed to save. Please try again.")
        setProcessing(false)
        return
      }
      await new Promise((r) => setTimeout(r, 1500))
      onNext()
    } catch {
      setPersistError("Something went wrong. Please try again.")
      setProcessing(false)
    }
  }

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
        <h2 className="text-2xl font-bold text-[#0A0A0A] tracking-tight mb-1">Secure checkout</h2>
        <p className="text-sm text-[#666666]">
          One payment activates your subscription and ships your hardware.
        </p>
      </div>

      {/* Trust bar */}
      <div className="flex items-center justify-center gap-5 py-2.5 border-y border-[#E5E5E5]">
        {[
          { icon: Lock, label: "256-bit SSL" },
          { icon: ShieldCheck, label: "PCI DSS Certified" },
          { icon: RotateCcw, label: "30-day refund" },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[#888888]">
            <item.icon size={12} className="text-[#00a544]" />
            <span className="text-sm font-medium">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Error */}
      <AnimatePresence>
        {persistError && (
          <motion.div
            initial={{ opacity: 0, y: -4, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0 }}
            className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm"
          >
            {persistError}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card form */}
      <div className="flex flex-col gap-3 p-5 bg-[#FAFAFA] border border-[#EBEBEB] rounded-2xl">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2 text-[#888888]">
            <CreditCard size={14} />
            <span className="text-xs font-semibold uppercase tracking-wide">Card details</span>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Card brand indicators */}
            {["V", "MC", "AX"].map((brand) => (
              <span
                key={brand}
                className="text-xs font-bold text-[#AAAAAA] border border-[#E5E5E5] px-1.5 py-0.5 rounded"
              >
                {brand}
              </span>
            ))}
          </div>
        </div>

        {/* Name on card */}
        <Input
          placeholder="Cardholder name"
          value={nameOnCard}
          onChange={(e) => setNameOnCard(e.target.value)}
          className="h-12 rounded-xl bg-white border-[#E5E5E5] text-[#0A0A0A] placeholder:text-[#AAAAAA] focus-visible:border-[#0A0A0A]"
        />

        {/* Card number */}
        <div className="relative">
          <CreditCard size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="1234 5678 9012 3456"
            value={cardNumber}
            onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
            className="pl-10 h-12 rounded-xl bg-white border-[#E5E5E5] text-[#0A0A0A] placeholder:text-[#AAAAAA] focus-visible:border-[#0A0A0A] font-mono tracking-wider"
          />
          {cardNumber.replace(/\s/g, "").length >= 15 && (
            <CheckCircle2 size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-green-500" />
          )}
        </div>

        {/* Expiry + CVC */}
        <div className="grid grid-cols-2 gap-2.5">
          <Input
            placeholder="MM / YY"
            value={expiry}
            onChange={(e) => setExpiry(formatExpiry(e.target.value))}
            className="h-12 rounded-xl bg-white border-[#E5E5E5] text-[#0A0A0A] placeholder:text-[#AAAAAA] focus-visible:border-[#0A0A0A] font-mono"
          />
          <div className="relative">
            <Input
              placeholder="CVC"
              value={cvc}
              onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").substring(0, 4))}
              className="h-12 rounded-xl bg-white border-[#E5E5E5] text-[#0A0A0A] placeholder:text-[#AAAAAA] focus-visible:border-[#0A0A0A] font-mono pr-10"
            />
            <Lock size={13} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/40" />
          </div>
        </div>
      </div>

      {/* Payment breakdown */}
      <div className="flex flex-col gap-2.5 p-4 bg-[#FAFAFA] border border-[#EBEBEB] rounded-2xl">
        <p className="text-xs font-bold text-[#888888] uppercase tracking-widest mb-1">
          Payment breakdown
        </p>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#666666]">
              {pkg.name} Plan <span className="text-xs">({data.billingCycle})</span>
            </span>
            <span className="font-medium text-[#0A0A0A]">${recurringPrice}/mo</span>
          </div>

          {hardwareTotal > 0 && (
            <>
              <div className="h-px bg-[#E5E5E5] my-0.5" />
              {data.stickerQty > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#666666]">Sticker Roll ×{data.stickerQty}</span>
                  <span className="font-medium text-[#0A0A0A]">${data.stickerQty * HARDWARE_PRICES.stickerRoll}</span>
                </div>
              )}
              {data.acrylicStands && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#666666]">Acrylic Stand</span>
                  <span className="font-medium text-[#0A0A0A]">${HARDWARE_PRICES.acrylicStand}</span>
                </div>
              )}
              {data.safetyDecals && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#666666]">Safety Decals</span>
                  <span className="font-medium text-[#0A0A0A]">${HARDWARE_PRICES.safetyDecal}</span>
                </div>
              )}
            </>
          )}
        </div>

        <div className="h-px bg-[#E5E5E5] mt-1" />
        <div className="flex items-center justify-between">
          <span className="font-semibold text-[#0A0A0A]">Total due today</span>
          <span className="text-2xl font-bold text-[#0A0A0A] tabular-nums">${total}</span>
        </div>
      </div>

      {/* 30-day guarantee */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#FAFAFA] border border-[#EBEBEB]">
        <div className="w-8 h-8 rounded-full bg-[#0A0A0A] flex items-center justify-center shrink-0 mt-0.5">
          <ShieldCheck size={15} className="text-blue-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[#0A0A0A]">30-Day money-back guarantee</p>
          <p className="text-xs text-[#666666] mt-0.5 leading-relaxed">
            Not seeing results? Contact us within 30 days for a full refund — no questions, no friction.
          </p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={processing}
          className="h-12 rounded-full border-[#E5E5E5] bg-white text-[#0A0A0A] hover:border-[#0A0A0A] hover:rounded-xl flex-1 transition-all duration-200 font-semibold"
        >
          <ArrowLeft size={16} className="mr-2" />
          Back
        </Button>
        <Button
          onClick={handlePay}
          disabled={!canPay || processing}
          className="h-12 rounded-full bg-[#0A0A0A] text-white font-bold text-sm hover:bg-[#1F1F1F] hover:rounded-xl disabled:opacity-30 flex-[2] transition-all duration-200"
        >
          {processing ? (
            <VLYRInlineLoader label="Activating shield..." />
          ) : (
            <>
              <Zap size={15} className="mr-2" />
              Pay ${total} · Activate Shield
            </>
          )}
        </Button>
      </div>

      <p className="text-center text-xs text-[#AAAAAA] flex items-center justify-center gap-1">
        <Lock size={10} />
        Secured with 256-bit SSL. Cancel anytime.
      </p>
    </motion.div>
  )
}
