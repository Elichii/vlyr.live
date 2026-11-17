"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { Check, Minus, ArrowRight, ShieldCheck, Sparkles, Building2, Star, Gift } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { OnboardingData } from "@/lib/onboarding-types"
import { PACKAGES, PLAN_FEATURES, isFreePlan } from "@/lib/onboarding-types"

interface StepPlanProps {
  data: OnboardingData
  onChange: (updates: Partial<OnboardingData>) => void
  onNext: () => void
}

const TIER_ICONS: Record<string, React.ReactNode> = {
  free: <Gift size={16} />,
  starter: <ShieldCheck size={16} />,
  growth: <Sparkles size={16} />,
  enterprise: <Building2 size={16} />,
}

export function StepPlan({ data, onChange, onNext }: StepPlanProps) {
  const searchParams = useSearchParams()
  const urlPlan = searchParams.get("plan")
  const [billing, setBilling] = useState<"monthly" | "annual">(data.billingCycle)

  useEffect(() => {
    if (urlPlan && PACKAGES.some((p) => p.id === urlPlan)) {
      onChange({ packageId: urlPlan })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectPlan = (planId: string) => onChange({ packageId: planId, billingCycle: billing })
  const handleBillingToggle = (cycle: "monthly" | "annual") => {
    setBilling(cycle)
    onChange({ billingCycle: cycle })
  }

  const selectedPkg = PACKAGES.find((p) => p.id === data.packageId)
  const annualSavings = selectedPkg ? (selectedPkg.monthlyPrice - selectedPkg.annualPrice) * 12 : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.35 }}
      className="flex flex-col gap-8 w-full"
    >
      {/* Header */}
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="inline-flex items-center gap-1.5 text-xs font-bold tracking-[0.12em] uppercase text-[#888888] mb-1">
          <div className="w-4 h-px bg-[#EBEBEB]" />
          Pricing
          <div className="w-4 h-px bg-[#EBEBEB]" />
        </div>
        <h2 className="text-3xl font-bold text-[#0A0A0A] tracking-tight">Choose your plan</h2>
        <p className="text-sm text-[#666666] max-w-xs leading-relaxed">
          No contracts, no setup fees. Upgrade or cancel anytime.
        </p>

        {/* Billing toggle */}
        <div className="mt-3 inline-flex items-center p-1 bg-[#F0F0F0] rounded-full border border-[#E5E5E5]">
          {(["monthly", "annual"] as const).map((cycle) => (
            <button
              key={cycle}
              onClick={() => handleBillingToggle(cycle)}
              className={`py-1.5 px-5 rounded-full text-sm font-semibold transition-all duration-200 ${
                billing === cycle ? "bg-[#0A0A0A] text-white shadow-sm" : "text-[#888888] hover:text-[#0A0A0A]"
              }`}
            >
              {cycle === "monthly" ? "Monthly" : (
                <span className="flex items-center gap-1.5">Annual <span className="text-xs font-bold bg-[#FFE100] text-[#0A0A0A] px-1.5 py-0.5 rounded-full">−20%</span></span>
              )}
            </button>
          ))}
        </div>

        {billing === "annual" && annualSavings > 0 && (
          <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            className="text-xs font-semibold text-[#00a544] flex items-center gap-1">
            <Check size={11} /> You save ${annualSavings}/year on {selectedPkg?.name}
          </motion.p>
        )}
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {PACKAGES.map((pkg, i) => {
          const price = billing === "annual" ? pkg.annualPrice : pkg.monthlyPrice
          const isSelected = data.packageId === pkg.id
          const isPopular = pkg.id === "growth"
          const features = PLAN_FEATURES[pkg.id] ?? []

          if (isPopular) {
            return (
              <motion.div key={pkg.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 + i * 0.06 }} onClick={() => handleSelectPlan(pkg.id)}
                className={`relative flex flex-col bg-[#0A0A0A] text-white rounded-2xl cursor-pointer transition-all duration-200 overflow-hidden
                  ${isSelected ? "ring-2 ring-[#FFE100] ring-offset-2" : "hover:ring-1 hover:ring-white/20"}`}>
                <div className="h-0.5 w-full bg-[#FFE100]" />
                <div className="flex flex-col flex-1 p-5 gap-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[#FFE100]">{TIER_ICONS[pkg.id]}</span>
                        <span className="text-sm font-bold text-white">{pkg.name}</span>
                      </div>
                      <span className="text-xs font-bold tracking-widest uppercase text-[#FFE100] bg-[#FFE100]/10 px-2 py-0.5 rounded-full border border-[#FFE100]/20">Most Popular</span>
                    </div>
                    {isSelected && <div className="w-5 h-5 rounded-full bg-[#FFE100] flex items-center justify-center shrink-0"><Check size={11} className="text-[#0A0A0A]" /></div>}
                  </div>
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold tracking-tight text-white">${price}</span>
                      <span className="text-xs text-white/60">/mo</span>
                    </div>
                    {billing === "annual" && <p className="text-xs text-white/40 mt-0.5">${price * 12}/yr · <span className="text-[#FFE100]">Save ${(pkg.monthlyPrice - price) * 12}/yr</span></p>}
                    <p className="text-xs text-white/50 mt-1.5">{pkg.tagline}</p>
                  </div>
                  <div className="h-px bg-white/10" />
                  <div className="flex flex-col gap-2.5 flex-1">
                    {features.map((feat) => (
                      <div key={feat.label} className="flex items-center gap-2.5">
                        {feat.included ? (
                          <div className="w-4 h-4 rounded-full bg-[#FFE100]/20 flex items-center justify-center shrink-0"><Check size={9} className="text-[#FFE100]" /></div>
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center shrink-0"><Minus size={9} className="text-white/20" /></div>
                        )}
                        <span className={`text-sm leading-snug ${feat.included ? "text-white/90" : "text-white/20 line-through"}`}>{feat.label}</span>
                      </div>
                    ))}
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); handleSelectPlan(pkg.id) }}
                    className={`w-full py-2.5 rounded-full text-sm font-bold transition-all duration-200 hover:rounded-xl ${isSelected ? "bg-[#FFE100] text-[#0A0A0A]" : "bg-white/10 text-white hover:bg-white/20"}`}>
                    {isSelected ? <span className="flex items-center justify-center gap-1.5"><Check size={13} /> Selected</span> : "Choose Growth"}
                  </button>
                </div>
              </motion.div>
            )
          }

          return (
            <motion.div key={pkg.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 + i * 0.06 }} onClick={() => handleSelectPlan(pkg.id)}
              className={`relative flex flex-col bg-[#FAFAFA] rounded-2xl border cursor-pointer transition-all duration-200
                ${isSelected ? "border-[#0A0A0A] shadow-sm ring-1 ring-[#0A0A0A]/10" : "border-[#E5E5E5] hover:border-[#0A0A0A]/30 hover:shadow-sm"}`}>
              <div className="flex flex-col flex-1 p-5 gap-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[#888888]">{TIER_ICONS[pkg.id]}</span>
                    <span className="text-sm font-bold text-[#0A0A0A]">{pkg.name}</span>
                  </div>
                  {isSelected && <div className="w-5 h-5 rounded-full bg-[#0A0A0A] flex items-center justify-center shrink-0"><Check size={11} className="text-white" /></div>}
                </div>
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold tracking-tight text-[#0A0A0A]">{price === 0 ? "Free" : `$${price}`}</span>
                    {price > 0 && <span className="text-sm text-[#888888]">/mo</span>}
                  </div>
                  {billing === "annual" && price > 0 && <p className="text-xs text-[#888888] mt-0.5">${price * 12}/yr · <span className="text-[#00a544]">Save ${(pkg.monthlyPrice - price) * 12}/yr</span></p>}
                  <p className="text-xs text-[#888888] mt-1.5">{pkg.tagline}</p>
                </div>
                <div className="h-px bg-[#E5E5E5]" />
                <div className="flex flex-col gap-2.5 flex-1">
                  {features.map((feat) => (
                    <div key={feat.label} className="flex items-center gap-2.5">
                      {feat.included ? (
                        <div className="w-4 h-4 rounded-full bg-[#F0F0F0] border border-[#E5E5E5] flex items-center justify-center shrink-0"><Check size={9} className="text-[#0A0A0A]" /></div>
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-[#F0F0F0] flex items-center justify-center shrink-0"><Minus size={9} className="text-[#CCCCCC]" /></div>
                      )}
                      <span className={`text-sm leading-snug ${feat.included ? "text-[#0A0A0A]" : "text-[#CCCCCC] line-through"}`}>{feat.label}</span>
                    </div>
                  ))}
                </div>
                <button onClick={(e) => { e.stopPropagation(); handleSelectPlan(pkg.id) }}
                  className={`w-full py-2.5 rounded-full text-sm font-semibold transition-all duration-200 hover:rounded-xl ${isSelected ? "bg-[#0A0A0A] text-white" : "border border-[#E5E5E5] text-[#0A0A0A] hover:border-[#0A0A0A]"}`}>
                  {isSelected ? <span className="flex items-center justify-center gap-1.5"><Check size={13} /> Selected</span> : pkg.id === "enterprise" ? "Contact Sales" : pkg.id === "free" ? "Start free" : `Choose ${pkg.name}`}
                </button>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Social proof */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
        className="flex items-center gap-4 p-4 rounded-2xl bg-[#FAFAFA] border border-[#EBEBEB]">
        <p className="text-sm text-[#666666] leading-snug flex-1">
          Join our founding cohort of local businesses protecting their Google reputation.
        </p>
        <div className="flex shrink-0">
          {[1, 2, 3, 4, 5].map((s) => <Star key={s} size={11} className="fill-[#FFE100] text-[#FFE100]" />)}
        </div>
      </motion.div>

      <Button variant="default" onClick={onNext} disabled={!data.packageId} size="lg" className="w-full md:w-auto md:self-center md:px-16">
        Continue with {PACKAGES.find((p) => p.id === data.packageId)?.name ?? "your plan"}
        <ArrowRight size={16} />
      </Button>

      <p className="text-center text-xs text-[#AAAAAA]">{isFreePlan(data.packageId) ? "No credit card required" : "Cancel anytime"}</p>
    </motion.div>
  )
}
