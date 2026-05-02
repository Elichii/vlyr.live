"use client"
import { motion } from "framer-motion"
import { AlertTriangle, Bell, Gift, MessageSquare, Star, Smartphone } from "lucide-react"

// SVG path for the heartbeat-style pulse line
const PulseLine = () => (
  <div className="relative h-10 w-full overflow-hidden mb-4">
    <svg viewBox="0 0 300 40" className="w-full h-full" preserveAspectRatio="none">
      <motion.path
        d="M0,20 L40,20 L50,8 L60,32 L70,4 L80,36 L90,20 L130,20 L140,10 L150,30 L160,6 L170,34 L180,20 L220,20 L230,12 L240,28 L250,8 L260,32 L270,20 L300,20"
        fill="none"
        stroke="#FFE100"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0.4 }}
        animate={{ pathLength: 1, opacity: [0.4, 1, 0.4] }}
        transition={{
          pathLength: { duration: 2, repeat: Infinity, ease: "linear" },
          opacity: { duration: 2, repeat: Infinity, ease: "linear" },
        }}
      />
      {/* Faint trail underneath */}
      <path
        d="M0,20 L40,20 L50,8 L60,32 L70,4 L80,36 L90,20 L130,20 L140,10 L150,30 L160,6 L170,34 L180,20 L220,20 L230,12 L240,28 L250,8 L260,32 L270,20 L300,20"
        fill="none"
        stroke="#FFE100"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.15"
      />
    </svg>
  </div>
)

export const CommandCenterPreview = () => {
  return (
    <section className="w-full py-24 px-6 lg:px-8 bg-white overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left - Text Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-[#C4841D] mb-4">
              Command Center
            </p>
            <h2 className="text-4xl lg:text-[44px] leading-[1.1] tracking-tight text-[#0A0A0A] font-bold mb-6">
              Your Business.{" "}
              <span className="text-[#999999]">In Your Pocket.</span>
            </h2>
            <p className="text-lg leading-relaxed text-[#666666] mb-8 max-w-md">
              The VLYR mobile dashboard gives you real-time alerts, customer sentiment tracking, and instant action tools. Resolve issues before the customer leaves the shop.
            </p>

            <div className="space-y-4">
              {[
                "Real-time negative feedback alerts",
                "One-tap digital apology + discount",
                "Staff performance leaderboards",
                "Burn-Code issuance and tracking",
              ].map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-[#0A0A0A]" />
                  <span className="text-base text-[#444444]">{feature}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right - Phone Mockup with Z-index floating depth */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.645, 0.045, 0.355, 1] }}
            className="flex items-center justify-center"
          >
            <div className="relative">
              {/* Multi-layer depth shadow for floating effect */}
              <div
                className="absolute inset-0 rounded-[40px] translate-y-5"
                style={{
                  boxShadow: "0 20px 60px rgba(0,0,0,0.15), 0 8px 20px rgba(0,0,0,0.1), 0 40px 80px rgba(0,0,0,0.08)",
                }}
              />

              {/* Phone Frame */}
              <div className="relative w-[280px] lg:w-[320px] bg-[#1F1F1F] rounded-[40px] p-3 border border-[#2A2A2A]">
                {/* Screen */}
                <div className="bg-[#0A0A0A] rounded-[30px] p-5 min-h-[540px] relative overflow-hidden">
                  {/* Status Bar */}
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-xs text-[#888888] font-mono">9:41</span>
                    <div className="flex items-center gap-1.5">
                      <Smartphone className="w-3 h-3 text-[#888888]" />
                      <div className="w-6 h-3 rounded-sm border border-[#888888] relative">
                        <div className="absolute inset-[2px] right-1 bg-[#FFE100] rounded-[1px]" />
                      </div>
                    </div>
                  </div>

                  {/* Dashboard Header */}
                  <div className="mb-4">
                    <p className="text-xs text-[#888888] font-mono uppercase tracking-wider">VLYR Pulse</p>
                    <p className="text-lg font-bold text-white mt-1">{"Tony's Cafe"}</p>
                  </div>

                  {/* Animated Pulse Heartbeat Line */}
                  <PulseLine />

                  {/* Alert Notification */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.6 }}
                    className="bg-[#C4841D]/15 border border-[#C4841D]/30 rounded-2xl p-4 mb-4"
                  >
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-4 h-4 text-[#C4841D] mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-[#C4841D]">Red Alert</p>
                        <p className="text-xs text-[#C4841D]/80 mt-1 leading-relaxed">
                          Customer at Table 4 is unsatisfied. Tap to send a digital apology and 10% discount now.
                        </p>
                      </div>
                    </div>
                    <button className="w-full mt-3 bg-[#C4841D] text-white text-xs font-semibold py-2 rounded-lg">
                      Resolve Now
                    </button>
                  </motion.div>

                  {/* Activity Items */}
                  <div className="space-y-3">
                    {[
                      { icon: Star, text: "New 5-star review from Sarah M.", time: "2m", color: "#FFE100" },
                      { icon: Gift, text: "Burn-Code redeemed at counter", time: "8m", color: "#FFE100" },
                      { icon: Bell, text: "Lunch rush alert: 42 scans", time: "15m", color: "#888888" },
                      { icon: MessageSquare, text: "Staff response time: 1.2min", time: "22m", color: "#888888" },
                    ].map((item, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: 10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.3, delay: 0.8 + i * 0.1 }}
                        className="flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2.5 border border-white/5"
                      >
                        <item.icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: item.color }} />
                        <span className="text-xs text-[#CCCCCC] flex-1 leading-tight">{item.text}</span>
                        <span className="text-[10px] text-[#555555] font-mono">{item.time}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
