"use client"
import { motion } from "framer-motion"
import { QrCode, Shield, TrendingUp } from "lucide-react"

const steps = [
  {
    number: "01",
    title: "The Deployment",
    description:
      "Place your VLYR Pulse-Point on the counter. No hardware, no wires. A single QR code becomes your digital command center. Dynamic QR Points: update your destination, menu, or rewards remotely without ever replacing a physical sticker.",
    icon: QrCode,
    visual: "qr",
  },
  {
    number: "02",
    title: "The Interception",
    description:
      "Our AI routes 1-3 star feedback to your private inbox, keeping your public reputation flawless. You fix it before it goes live.",
    icon: Shield,
    visual: "shield",
  },
  {
    number: "03",
    title: "The Growth Loop",
    description:
      "Happy customers are instantly routed to Google Reviews and issued 'Burn-Codes' to drive them back within 48 hours.",
    icon: TrendingUp,
    visual: "graph",
  },
]

export const ZeroFrictionBlueprint = () => {
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
            The Zero-Friction Blueprint
          </p>
          <h2 className="text-4xl lg:text-[48px] leading-[1.1] tracking-tight text-[#0A0A0A] font-bold max-w-3xl mx-auto">
            From Counter to Cloud{" "}
            <span className="text-[#999999]">in 180 Seconds.</span>
          </h2>
        </motion.div>

        {/* Steps */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: index * 0.15, ease: "easeOut" }}
              className="group relative bg-[#FAFAFA] rounded-[24px] p-8 lg:p-10 border border-[#E5E5E5] hover:border-[#0A0A0A]/20 transition-all duration-300"
            >
              {/* Step number */}
              <div className="flex items-center gap-3 mb-6">
                <span className="text-xs font-mono text-[#0A0A0A] tracking-wider">{step.number}</span>
                <div className="h-px flex-1 bg-[#E5E5E5]" />
              </div>

              {/* Visual */}
              <div className="w-16 h-16 rounded-2xl bg-[#0A0A0A]/5 border border-[#0A0A0A]/10 flex items-center justify-center mb-6 group-hover:bg-[#0A0A0A]/10 transition-colors duration-300">
                <step.icon className="w-7 h-7 text-[#0A0A0A]" strokeWidth={1.5} />
              </div>

              {/* Content */}
              <h3 className="text-xl font-bold text-[#0A0A0A] mb-3">{step.title}</h3>
              <p className="text-base leading-relaxed text-[#666666]">{step.description}</p>

              {/* Bottom accent on hover */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-transparent group-hover:bg-[#0A0A0A]/10 blur-md transition-all duration-500 rounded-full" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
