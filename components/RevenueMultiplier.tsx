"use client"
import { useState } from "react"
import { motion } from "framer-motion"
import { Shield, QrCode, Activity, BadgeCheck } from "lucide-react"

const cards = [
  {
    icon: Shield,
    title: "The Reputation Shield",
    subtitle: "Intercept Before Impact",
    description:
      "Stop public 1-star reviews before they happen. Our AI intercepts negative feedback and routes it to your private inbox, giving you the chance to resolve issues face-to-face.",
    stat: "23",
    statLabel: "Reviews shielded this month",
    accentColor: "#FFE100",
  },
  {
    icon: QrCode,
    title: "The Commission Killer",
    subtitle: "Direct Orders, Zero Fees",
    description:
      "Direct QR-ordering that bypasses third-party 30% fees. Customers scan, order, and pay. You keep the margin. Use your own staff for local delivery or integrate with flat-fee white-label couriers to keep your 30% margin.",
    stat: "30%",
    statLabel: "Saved on delivery commissions",
    accentColor: "#FFE100",
  },
  {
    icon: Activity,
    title: "The Instant Pulse",
    subtitle: "Real-Time Intelligence",
    description:
      "See staff performance and customer sentiment in real-time. Know which shifts drive the most 5-star reviews and which need attention before the lunch rush. Fraud-Proof Loyalty: every Burn-Code is tied to a unique device ID and Merchant ID (MID), ensuring rewards are claimed once and only by the intended customer.",
    stat: "4.8",
    statLabel: "Average sentiment score",
    accentColor: "#FFE100",
  },
  {
    icon: BadgeCheck,
    title: "The Safety Seal",
    subtitle: "Signal Quality, Earn Trust",
    description:
      "More than a badge. Our physical VLYR seals secure the customer's order, verifying the package hasn't been opened since it left your counter. The Tamper-Proof Seal signals 22nd-century quality -- customers know your business is actively listening, improving, and verified.",
    stat: "VLYR",
    statLabel: "Verified business badge",
    accentColor: "#FFE100",
  },
]

export const RevenueMultiplier = () => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  return (
    <section className="w-full py-24 px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center mb-20"
        >
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-[#C4841D] mb-4">
            Revenue Multiplier
          </p>
          <h2 className="text-4xl lg:text-[48px] leading-[1.1] tracking-tight text-[#0A0A0A] font-bold max-w-3xl mx-auto">
            Four Weapons.{" "}
            <span className="text-[#999999]">One Platform.</span>
          </h2>
          <p className="text-lg text-[#666666] mt-4 max-w-xl mx-auto">
            Each feature is designed to protect your revenue and compound your growth.
          </p>
        </motion.div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {cards.map((card, index) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: index * 0.1, ease: "easeOut" }}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              className="group relative bg-[#FAFAFA] rounded-[24px] p-8 lg:p-10 border border-[#E5E5E5] hover:border-[#0A0A0A]/20 transition-all duration-300 overflow-hidden"
            >
              {/* Ambient glow */}
              <div
                className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-[80px] pointer-events-none transition-opacity duration-500"
                style={{
                  backgroundColor: card.accentColor,
                  opacity: hoveredIndex === index ? 0.08 : 0,
                }}
              />

              <div className="relative z-10">
                {/* Icon + Label */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-[#0A0A0A]/5 border border-[#0A0A0A]/10 flex items-center justify-center group-hover:bg-[#0A0A0A]/10 transition-colors duration-300">
                    <card.icon className="w-5 h-5 text-[#0A0A0A]" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#0A0A0A]">{card.title}</h3>
                    <p className="text-xs font-mono uppercase tracking-wider text-[#999999]">{card.subtitle}</p>
                  </div>
                </div>

                {/* Description */}
                <p className="text-base leading-relaxed text-[#666666] mb-8">{card.description}</p>

                {/* Stat */}
                <div className="flex items-end gap-3 pt-6 border-t border-[#E5E5E5]">
                  <span className="text-3xl font-bold text-[#0A0A0A]">{card.stat}</span>
                  <span className="text-sm text-[#999999] pb-1">{card.statLabel}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
