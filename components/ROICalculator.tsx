"use client"
import { useState } from "react"
import { motion } from "framer-motion"
import { TrendingUp, DollarSign, Users, Repeat } from "lucide-react"
import { cn } from "@/lib/utils"

type Mode = "conservative" | "aggressive"

const assumptions = {
  conservative: {
    label: "Conservative",
    churnReduction: 0.04,
    reviewLift: 0.05,
    repeatRate: 0.06,
    churnLabel: "4% fewer customers lost",
    reviewLabel: "5% more walk-ins from reviews",
    repeatLabel: "6% more returning customers",
  },
  aggressive: {
    label: "Aggressive",
    churnReduction: 0.08,
    reviewLift: 0.12,
    repeatRate: 0.15,
    churnLabel: "8% fewer customers lost",
    reviewLabel: "12% more walk-ins from reviews",
    repeatLabel: "15% more returning customers",
  },
}

export const ROICalculator = () => {
  const [dailyCustomers, setDailyCustomers] = useState(80)
  const [avgTicket, setAvgTicket] = useState(25)
  const [mode, setMode] = useState<Mode>("conservative")

  const a = assumptions[mode]
  const monthlyRevenue = dailyCustomers * avgTicket * 30
  const savedFromChurn = monthlyRevenue * a.churnReduction
  const reviewTraffic = monthlyRevenue * a.reviewLift
  const burnCodeRepeat = monthlyRevenue * a.repeatRate
  const totalLift = savedFromChurn + reviewTraffic + burnCodeRepeat
  const liftPercent = ((totalLift / monthlyRevenue) * 100).toFixed(1)

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n)

  return (
    <section className="w-full py-24 px-6 lg:px-8 bg-white">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center mb-16"
        >
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-[#0A0A0A] mb-4">
            ROI Calculator
          </p>
          <h2 className="text-4xl lg:text-[48px] leading-[1.1] tracking-tight text-[#0A0A0A] font-bold max-w-2xl mx-auto">
            See Your VLYR Lift
          </h2>
          <p className="text-lg text-[#666666] mt-4 max-w-xl mx-auto">
            Slide your numbers and toggle between conservative and aggressive projections to see a grounded estimate of your monthly revenue increase.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-[#FAFAFA] rounded-[24px] p-8 lg:p-12 border border-[#E5E5E5]"
        >
          {/* Conservative / Aggressive Toggle */}
          <div className="flex items-center justify-center mb-10">
            <div className="inline-flex items-center gap-1 bg-white rounded-full p-1 border border-[#E5E5E5]">
              {(["conservative", "aggressive"] as Mode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={cn(
                    "px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 capitalize",
                    mode === m
                      ? "bg-[#0A0A0A] text-white shadow-md"
                      : "text-[#888888] hover:text-[#0A0A0A]",
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Sliders */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-[#0A0A0A]">Daily Customers</label>
                <span className="text-2xl font-bold text-[#0A0A0A]">{dailyCustomers}</span>
              </div>
              <input
                type="range"
                min="10"
                max="500"
                step="5"
                value={dailyCustomers}
                onChange={(e) => setDailyCustomers(Number(e.target.value))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #0A0A0A ${((dailyCustomers - 10) / 490) * 100}%, #E5E5E5 ${((dailyCustomers - 10) / 490) * 100}%)`,
                }}
              />
              <div className="flex justify-between mt-1">
                <span className="text-xs text-[#999999]">10</span>
                <span className="text-xs text-[#999999]">500</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-[#0A0A0A]">Avg. Ticket Price</label>
                <span className="text-2xl font-bold text-[#0A0A0A]">${avgTicket}</span>
              </div>
              <input
                type="range"
                min="5"
                max="200"
                step="1"
                value={avgTicket}
                onChange={(e) => setAvgTicket(Number(e.target.value))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #0A0A0A ${((avgTicket - 5) / 195) * 100}%, #E5E5E5 ${((avgTicket - 5) / 195) * 100}%)`,
                }}
              />
              <div className="flex justify-between mt-1">
                <span className="text-xs text-[#999999]">$5</span>
                <span className="text-xs text-[#999999]">$200</span>
              </div>
            </div>
          </div>

          <div className="h-px bg-[#E5E5E5] mb-10" />

          {/* Results */}
          <div className="text-center mb-10">
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-[#999999] mb-2">
              Projected Monthly VLYR Lift ({assumptions[mode].label})
            </p>
            <div className="text-5xl lg:text-6xl font-bold text-[#0A0A0A]">
              {formatCurrency(totalLift)}
            </div>
            <p className="text-sm text-[#666666] mt-2">
              +{liftPercent}% on {formatCurrency(monthlyRevenue)}/mo base revenue
            </p>
          </div>

          {/* Breakdown Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-[#E5E5E5]">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-[#0A0A0A]" />
                <span className="text-xs font-medium text-[#999999]">Churn Reduction</span>
              </div>
              <p className="text-xl font-bold text-[#0A0A0A]">{formatCurrency(savedFromChurn)}</p>
              <p className="text-xs text-[#999999] mt-0.5">{a.churnLabel}</p>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-[#E5E5E5]">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-[#0A0A0A]" />
                <span className="text-xs font-medium text-[#999999]">Review Traffic</span>
              </div>
              <p className="text-xl font-bold text-[#0A0A0A]">{formatCurrency(reviewTraffic)}</p>
              <p className="text-xs text-[#999999] mt-0.5">{a.reviewLabel}</p>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-[#E5E5E5]">
              <div className="flex items-center gap-2 mb-2">
                <Repeat className="w-4 h-4 text-[#0A0A0A]" />
                <span className="text-xs font-medium text-[#999999]">Burn-Code Repeats</span>
              </div>
              <p className="text-xl font-bold text-[#0A0A0A]">{formatCurrency(burnCodeRepeat)}</p>
              <p className="text-xs text-[#999999] mt-0.5">{a.repeatLabel}</p>
            </div>
          </div>

          {/* Methodology note */}
          <p className="text-xs text-[#BBBBBB] text-center mt-6">
            Conservative assumes industry-average improvements. Aggressive assumes top-quartile VLYR merchant results. Actual results vary by location, category, and execution.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
