"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { Check, Minus, ArrowRight, ShieldCheck, Sparkles, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { OnboardingData } from "@/lib/onboarding-types"
import { PACKAGES, PLAN_FEATURES } from "@/lib/onboarding-types"

interface StepPlanProps {
  data: OnboardingData
  onChange: (updates: Partial<OnboardingData>) => void
  onNext: () => void
}

const TIER_ICONS: Record<string, React.ReactNode> = {
  starter: <ShieldCheck size={20} />,
  growth: <Sparkles size={20} />,
  enterprise: <Building2 size={20} />,
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

  const handleSelectPlan = (planId: string) => {
    onChange({ packageId: planId, billingCycle: billing })
  }

  const handleBillingToggle = (cycle: "monthly" | "annual") => {
    setBilling(cycle)
    onChange({ billingCycle: cycle })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col gap-8 w-full"
    >
      {/* Header */}
      <div className="flex flex-col items-center gap-3 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight text-balance">
          Plans and Pricing
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
          Choose the plan that fits your business. Upgrade or downgrade anytime, no lock-in.
        </p>

        {/* Billing Toggle */}
        <div className="flex items-center gap-1 p-1 bg-card border border-border rounded-full mt-1">
          <button
            onClick={() => handleBillingToggle("monthly")}
            className={`py-1.5 px-5 rounded-full text-sm font-medium transition-all duration-200 ${
              billing === "monthly"
                ? "bg-foreground text-background shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => handleBillingToggle("annual")}
            className={`py-1.5 px-5 rounded-full text-sm font-medium transition-all duration-200 relative ${
              billing === "annual"
                ? "bg-foreground text-background shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Annual
            <span className="ml-1 text-[10px] font-bold text-accent">-20%</span>
          </button>
        </div>
      </div>

      {/* Plan Cards -- responsive grid: stacked on mobile, side-by-side on md+ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PACKAGES.map((pkg, i) => {
          const price = billing === "annual" ? pkg.annualPrice : pkg.monthlyPrice
          const isSelected = data.packageId === pkg.id
          const isPopular = pkg.id === "growth"
          const isUrlHighlighted = urlPlan === pkg.id
          const features = PLAN_FEATURES[pkg.id] ?? []

          return (
            <motion.div
              key={pkg.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.1 }}
              className={`relative flex flex-col rounded-2xl border transition-all duration-200 cursor-pointer ${
                isSelected
                  ? isPopular || isUrlHighlighted
                    ? "border-accent bg-background shadow-lg vlyr-glow"
                    : "border-foreground bg-background shadow-lg"
                  : isPopular
                    ? "border-accent/40 bg-background hover:border-accent hover:shadow-md"
                    : "border-border bg-background hover:border-foreground/20 hover:shadow-md"
              }`}
              onClick={() => handleSelectPlan(pkg.id)}
            >
              {/* Popular Badge */}
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-accent text-accent-foreground text-[10px] font-bold tracking-wider uppercase rounded-full shadow-sm whitespace-nowrap">
                    Recommended
                  </span>
                </div>
              )}

              {/* Card Content */}
              <div className="flex flex-col flex-1 p-5 md:p-6">
                {/* Tier icon + name */}
                <div className="flex items-center gap-2.5 mb-3">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${
                    isPopular ? "bg-accent/15 text-accent-foreground" : "bg-card text-foreground"
                  }`}>
                    {TIER_ICONS[pkg.id]}
                  </div>
                  <span className="text-base font-semibold text-foreground">{pkg.name}</span>
                </div>

                {/* Price */}
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">${price}</span>
                  <span className="text-sm text-muted-foreground">/month</span>
                </div>
                <p className="text-xs text-muted-foreground mb-5">{pkg.tagline}</p>

                {/* Features */}
                <div className="flex flex-col gap-2.5 flex-1 pt-4 border-t border-border">
                  {features.map((feat) => (
                    <div key={feat.label} className="flex items-start gap-2.5">
                      {feat.included ? (
                        <div className="flex items-center justify-center w-4.5 h-4.5 rounded-full bg-green-500/15 shrink-0 mt-0.5">
                          <Check size={11} className="text-green-500" />
                        </div>
                      ) : (
                        <div className="flex items-center justify-center w-4.5 h-4.5 rounded-full bg-muted shrink-0 mt-0.5">
                          <Minus size={11} className="text-muted-foreground/40" />
                        </div>
                      )}
                      <span
                        className={`text-sm leading-snug ${
                          feat.included ? "text-foreground" : "text-muted-foreground/40 line-through"
                        }`}
                      >
                        {feat.label}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Select Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSelectPlan(pkg.id)
                  }}
                  className={`mt-6 w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 border ${
                    isSelected
                      ? isPopular
                        ? "bg-accent text-accent-foreground border-accent shadow-sm"
                        : "bg-foreground text-background border-foreground shadow-sm"
                      : isPopular
                        ? "bg-transparent text-foreground border-foreground/20 hover:border-accent hover:bg-accent/5"
                        : "bg-transparent text-foreground border-foreground/20 hover:border-foreground/40"
                  }`}
                >
                  {isSelected ? (
                    <span className="flex items-center justify-center gap-1.5">
                      <Check size={14} />
                      Selected
                    </span>
                  ) : (
                    pkg.id === "enterprise" ? "Contact Sales" : `Get ${pkg.name}`
                  )}
                </button>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Continue Button */}
      <Button
        onClick={onNext}
        disabled={!data.packageId}
        className="h-12 rounded-xl bg-foreground text-background font-semibold text-base hover:bg-foreground/90 disabled:opacity-30 w-full md:w-auto md:self-center md:px-16"
      >
        Continue with {PACKAGES.find((p) => p.id === data.packageId)?.name ?? "Plan"}
        <ArrowRight size={18} className="ml-2" />
      </Button>
    </motion.div>
  )
}
