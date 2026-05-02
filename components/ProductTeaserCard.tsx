"use client"
import { motion } from "framer-motion"
import { ArrowUpRight, Shield, Star, TrendingUp, Zap } from "lucide-react"

export const ProductTeaserCard = () => {
  return (
    <section className="w-full px-6 lg:px-8 pt-32 pb-16 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Left - Content Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.645, 0.045, 0.355, 1] }}
            className="bg-[#FAFAFA] rounded-[32px] p-10 lg:p-14 flex flex-col justify-end relative overflow-hidden border border-[#E5E5E5]"
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex items-center gap-2 mb-8"
            >
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0A0A0A]/5 border border-[#0A0A0A]/10">
                <div className="w-1.5 h-1.5 rounded-full bg-[#0A0A0A] animate-pulse" />
                <span className="text-[#0A0A0A] text-xs font-mono uppercase tracking-wider">Live Platform</span>
              </div>
            </motion.div>

            <h1 className="text-4xl lg:text-[52px] leading-[1.1] tracking-tight text-[#0A0A0A] font-bold mb-6 max-w-[520px]">
              Your Reputation.{" "}
              <span className="text-[#0A0A0A]">Shielded.</span>{" "}
              <span className="text-[#888888]">Your Growth. Amplified.</span>
            </h1>

            <p className="text-lg leading-7 text-[#666666] max-w-[480px] mb-8">
              VLYR intercepts negative feedback before it reaches Google, boosts your 5-star reviews automatically, and turns every customer into a repeat visitor.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mt-2">
              <button className="bg-[#0A0A0A] text-white rounded-full px-7 py-4 text-base leading-4 font-bold whitespace-nowrap transition-all duration-200 hover:bg-[#1F1F1F] hover:rounded-2xl shadow-sm">
                Deploy VLYR to My Business
              </button>
              <button className="text-[#0A0A0A] border border-[#E5E5E5] rounded-full px-7 py-4 text-base leading-4 font-medium whitespace-nowrap transition-all duration-200 hover:rounded-2xl hover:border-[#0A0A0A]">
                View Demo
              </button>
            </div>
          </motion.div>

          {/* Right - Pulse Dashboard Preview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.645, 0.045, 0.355, 1], delay: 0.2 }}
            className="bg-[#0A0A0A] rounded-[32px] p-8 lg:p-10 flex flex-col relative overflow-hidden"
          >
            {/* Subtle ambient glow */}
            <div className="absolute bottom-0 right-0 w-72 h-72 bg-[#FFE100]/5 rounded-full blur-[100px] translate-x-1/3 translate-y-1/3 pointer-events-none" />

            {/* Brand Health Score */}
            <div className="text-center mb-8 relative z-10">
              <p className="text-xs font-mono uppercase tracking-wider text-[#888888] mb-3">Brand Health Score</p>
              <div className="relative inline-flex items-center justify-center">
                <div className="text-7xl font-bold text-white">87</div>
                <div className="absolute -inset-4 rounded-full bg-[#FFE100]/10 blur-xl pointer-events-none" />
              </div>
              <div className="flex items-center justify-center gap-1.5 mt-2">
                <TrendingUp className="w-3.5 h-3.5 text-[#FFE100]" />
                <span className="text-[#FFE100] text-sm font-medium">+12 this week</span>
              </div>
            </div>

            {/* Reputation Shield Stats */}
            <div className="grid grid-cols-2 gap-3 mb-6 relative z-10">
              <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-[#FFE100]" />
                  <span className="text-xs text-[#888888] font-medium">Shielded</span>
                </div>
                <p className="text-2xl font-bold text-white">23</p>
                <p className="text-xs text-[#C4841D] mt-0.5">Negative reviews intercepted</p>
              </div>
              <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="w-4 h-4 text-[#FFE100]" />
                  <span className="text-xs text-[#888888] font-medium">Boosted</span>
                </div>
                <p className="text-2xl font-bold text-white">142</p>
                <p className="text-xs text-[#FFE100] mt-0.5">5-star reviews to Google</p>
              </div>
            </div>

            {/* Live Activity Feed */}
            <div className="relative z-10 flex-1">
              <p className="text-xs font-mono uppercase tracking-wider text-[#888888] mb-3">Live Activity</p>
              <div className="space-y-2">
                {[
                  { text: "Customer scanned at Counter 1", time: "2s ago", icon: Zap, color: "#FFE100" },
                  { text: "5-star review boosted to Google", time: "14s ago", icon: Star, color: "#FFE100" },
                  { text: "Negative feedback intercepted", time: "1m ago", icon: Shield, color: "#C4841D" },
                  { text: "New Burn-Code issued", time: "3m ago", icon: ArrowUpRight, color: "#FFE100" },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.6 + i * 0.15 }}
                    className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3 border border-white/5"
                  >
                    <item.icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: item.color }} />
                    <span className="text-sm text-[#CCCCCC] flex-1">{item.text}</span>
                    <span className="text-xs text-[#555555] font-mono">{item.time}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
