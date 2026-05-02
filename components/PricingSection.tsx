"use client"

import * as React from "react"
import { CheckIcon } from "@radix-ui/react-icons"
import { cn } from "@/lib/utils"
import { Shield, Zap, Brain } from "lucide-react"

type PlanLevel = "starter" | "growth" | "intelligence"

interface PricingFeature {
  name: string
  included: PlanLevel | "all"
}

interface PricingPlan {
  name: string
  tagline: string
  level: PlanLevel
  icon: React.ElementType
  price: {
    monthly: number
    yearly: number
  }
  popular?: boolean
}

const features: PricingFeature[] = [
  { name: "Google Review Growth", included: "starter" },
  { name: "Negative Feedback Interception", included: "starter" },
  { name: "Reputation Shield", included: "starter" },
  { name: "Basic Analytics Dashboard", included: "starter" },
  { name: "Direct Order Menu (Commission Killer)", included: "growth" },
  { name: "Burn-Code Dynamic Loyalty", included: "growth" },
  { name: "Customer Database (CRM)", included: "growth" },
  { name: "Multi-Location Support", included: "growth" },
  { name: "Staff Leaderboards", included: "intelligence" },
  { name: "Customer Heatmapping", included: "intelligence" },
  { name: "AI Auto-Restock Alerts", included: "intelligence" },
  { name: "Dedicated Account Manager", included: "intelligence" },
  { name: "QR Code Scanner System", included: "all" },
  { name: "Real-time Activity Feed", included: "all" },
]

const plans: PricingPlan[] = [
  {
    name: "VLYR Starter",
    tagline: "The Shield",
    price: { monthly: 49, yearly: 490 },
    level: "starter",
    icon: Shield,
  },
  {
    name: "VLYR Growth",
    tagline: "The Full Suite",
    price: { monthly: 149, yearly: 1490 },
    level: "growth",
    popular: true,
    icon: Zap,
  },
  {
    name: "VLYR Intelligence",
    tagline: "The Command Center",
    price: { monthly: 499, yearly: 4990 },
    level: "intelligence",
    icon: Brain,
  },
]

function shouldShowCheck(included: PricingFeature["included"], level: PlanLevel): boolean {
  if (included === "all") return true
  if (included === "intelligence" && level === "intelligence") return true
  if (included === "growth" && (level === "growth" || level === "intelligence")) return true
  if (included === "starter") return true
  return false
}

export function PricingSection() {
  const [isYearly, setIsYearly] = React.useState(false)
  const [selectedPlan, setSelectedPlan] = React.useState<PlanLevel>("growth")

  return (
    <section className="py-24 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-[40px] font-bold leading-tight mb-4 text-[#0A0A0A]">
            Choose Your <span className="text-[#C4841D]">Shield</span>
          </h2>
          <p className="text-lg text-[#666666] max-w-2xl mx-auto">
            Every plan protects your reputation. Pick the level of growth you want to unlock.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex items-center gap-1 bg-[#F5F5F5] rounded-full p-1 border border-[#E5E5E5]">
            <button
              type="button"
              onClick={() => setIsYearly(false)}
              className={cn(
                "px-6 py-2.5 rounded-full text-base font-medium transition-all",
                !isYearly
                  ? "bg-[#0A0A0A] text-white shadow-md"
                  : "text-[#888888] hover:text-[#0A0A0A]",
              )}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setIsYearly(true)}
              className={cn(
                "px-6 py-2.5 rounded-full text-base font-medium transition-all",
                isYearly
                  ? "bg-[#0A0A0A] text-white shadow-md"
                  : "text-[#888888] hover:text-[#0A0A0A]",
              )}
            >
              Yearly
              <span className={cn("ml-2 text-sm", isYearly ? "text-white/70" : "text-[#C4841D]")}>
                Save 17%
              </span>
            </button>
          </div>
        </div>

        {/* Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          {plans.map((plan) => {
            const Icon = plan.icon
            return (
              <button
                key={plan.name}
                type="button"
                onClick={() => setSelectedPlan(plan.level)}
                className={cn(
                  "relative p-8 rounded-2xl text-left transition-all border",
                  selectedPlan === plan.level
                    ? "border-[#0A0A0A] bg-[#FAFAFA] shadow-lg"
                    : "border-[#E5E5E5] bg-[#FAFAFA] hover:border-[#0A0A0A]/30",
                )}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#0A0A0A] text-white px-4 py-1 rounded-full text-sm font-bold shadow-md">
                    Most Popular
                  </span>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[#0A0A0A]/5 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-[#0A0A0A]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#0A0A0A]">{plan.name}</h3>
                    <p className="text-xs text-[#999999]">{plan.tagline}</p>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-[#0A0A0A]">
                      ${isYearly ? plan.price.yearly : plan.price.monthly}
                    </span>
                    <span className="text-base text-[#999999]">/{isYearly ? "year" : "mo"}</span>
                  </div>
                </div>

                <div
                  className={cn(
                    "w-full py-3 px-6 rounded-full text-base font-bold transition-all text-center",
                    selectedPlan === plan.level
                      ? "bg-[#0A0A0A] text-white shadow-md"
                      : "bg-[#E5E5E5] text-[#666666] hover:text-[#0A0A0A]",
                  )}
                >
                  {selectedPlan === plan.level ? "Selected" : "Select Plan"}
                </div>
              </button>
            )
          })}
        </div>

        {/* Features Table */}
        <div className="border border-[#E5E5E5] rounded-2xl overflow-hidden bg-[#FAFAFA]">
          <div className="overflow-x-auto">
            <div className="min-w-[768px]">
              {/* Table Header */}
              <div className="flex items-center p-6 bg-white border-b border-[#E5E5E5]">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-[#0A0A0A]">Features</h3>
                </div>
                <div className="flex items-center gap-8">
                  {plans.map((plan) => (
                    <div key={plan.level} className="w-24 text-center text-base font-bold text-[#666666]">
                      {plan.name.replace("VLYR ", "")}
                    </div>
                  ))}
                </div>
              </div>

              {/* Feature Rows */}
              {features.map((feature, index) => (
                <div
                  key={feature.name}
                  className={cn(
                    "flex items-center p-6 transition-colors",
                    index % 2 === 0 ? "bg-[#FAFAFA]" : "bg-white",
                    feature.included === selectedPlan && "bg-[#0A0A0A]/5",
                  )}
                >
                  <div className="flex-1">
                    <span className="text-base text-[#444444]">{feature.name}</span>
                  </div>
                  <div className="flex items-center gap-8">
                    {plans.map((plan) => (
                      <div key={plan.level} className="w-24 flex justify-center">
                        {shouldShowCheck(feature.included, plan.level) ? (
                          <div className="w-6 h-6 rounded-full bg-[#0A0A0A] flex items-center justify-center shadow-sm">
                            <CheckIcon className="w-4 h-4 text-white" />
                          </div>
                        ) : (
                          <span className="text-[#CCCCCC]">-</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <button className="bg-[#0A0A0A] text-white px-8 py-4 rounded-full text-lg font-bold hover:bg-[#1F1F1F] transition-all shadow-lg">
            Get started with {plans.find((p) => p.level === selectedPlan)?.name}
          </button>
        </div>
      </div>
    </section>
  )
}
