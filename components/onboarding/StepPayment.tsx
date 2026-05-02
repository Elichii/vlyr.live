"use client"

import { useState, useMemo } from "react"
import { motion } from "framer-motion"
import { CreditCard, Lock, ArrowLeft, ShieldCheck } from "lucide-react"
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
  const recurringPrice =
    data.billingCycle === "annual" ? pkg.annualPrice : pkg.monthlyPrice

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
      // Brief delay for "Syncing Shield..." animation
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
      <div className="flex flex-col gap-1.5">
        <h2 className="text-xl font-semibold text-foreground tracking-tight text-balance">
          Secure Checkout
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          One payment covers your subscription and hardware. Shield activates immediately.
        </p>
      </div>

      {persistError && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
        >
          {persistError}
        </motion.div>
      )}

      {/* Card Form */}
      <div className="flex flex-col gap-4 p-5 bg-card border border-border rounded-2xl">
        <div className="flex items-center gap-2 text-muted-foreground">
          <CreditCard size={16} />
          <span className="text-xs font-medium tracking-wide uppercase">Card Details</span>
          <Lock size={12} className="ml-auto" />
        </div>

        <Input
          placeholder="Name on card"
          value={nameOnCard}
          onChange={(e) => setNameOnCard(e.target.value)}
          className="h-12 bg-background border-border text-foreground placeholder:text-muted-foreground/60 rounded-xl"
        />

        <div className="relative">
          <CreditCard size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="4242 4242 4242 4242"
            value={cardNumber}
            onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
            className="pl-10 h-12 bg-background border-border text-foreground placeholder:text-muted-foreground/60 rounded-xl font-mono"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            placeholder="MM / YY"
            value={expiry}
            onChange={(e) => setExpiry(formatExpiry(e.target.value))}
            className="h-12 bg-background border-border text-foreground placeholder:text-muted-foreground/60 rounded-xl font-mono"
          />
          <Input
            placeholder="CVC"
            value={cvc}
            onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").substring(0, 4))}
            className="h-12 bg-background border-border text-foreground placeholder:text-muted-foreground/60 rounded-xl font-mono"
          />
        </div>
      </div>

      {/* Recurring vs One-Time Breakdown */}
      <div className="flex flex-col gap-3 p-4 bg-card border border-border rounded-2xl">
        <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
          Payment Breakdown
        </span>

        {/* Recurring */}
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-foreground/60 uppercase tracking-wide">
            Recurring ({data.billingCycle === "annual" ? "Annual" : "Monthly"})
          </span>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{pkg.name} Plan</span>
            <span className="text-foreground font-medium">${recurringPrice}/mo</span>
          </div>
        </div>

        {/* One-Time */}
        {hardwareTotal > 0 && (
          <div className="flex flex-col gap-1 pt-2 border-t border-border">
            <span className="text-[11px] font-medium text-foreground/60 uppercase tracking-wide">
              One-Time Hardware
            </span>
            {data.stickerQty > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Sticker Roll x{data.stickerQty}</span>
                <span className="text-foreground font-medium">${data.stickerQty * HARDWARE_PRICES.stickerRoll}</span>
              </div>
            )}
            {data.acrylicStands && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Acrylic Stand</span>
                <span className="text-foreground font-medium">${HARDWARE_PRICES.acrylicStand}</span>
              </div>
            )}
            {data.safetyDecals && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Safety Decals</span>
                <span className="text-foreground font-medium">${HARDWARE_PRICES.safetyDecal}</span>
              </div>
            )}
          </div>
        )}

        <div className="h-px bg-border" />
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">Total Due Today</span>
          <span className="text-xl font-bold text-foreground font-mono">${total}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={processing}
          className="h-12 rounded-xl border-border bg-card text-foreground hover:bg-secondary flex-1"
        >
          <ArrowLeft size={18} className="mr-2" />
          Back
        </Button>
        <Button
          onClick={handlePay}
          disabled={!canPay || processing}
          className="h-12 rounded-xl bg-foreground text-background font-semibold text-base hover:bg-foreground/90 disabled:opacity-30 flex-[2]"
        >
          {processing ? (
            <VLYRInlineLoader label="Syncing Shield..." />
          ) : (
            <>
              <ShieldCheck size={16} className="mr-2" />
              Deploy Shield - ${total}
            </>
          )}
        </Button>
      </div>

      <p className="text-[11px] text-muted-foreground/60 text-center">
        Secured with 256-bit SSL encryption. Cancel anytime.
      </p>
    </motion.div>
  )
}
