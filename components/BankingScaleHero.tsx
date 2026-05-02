"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { ArrowRight, Shield, Star, Clock, ShoppingBag, Flame, ChevronRight } from "lucide-react"

type StatItem = {
  value: string
  label: string
  description: string
  delay: number
}

type DataPoint = {
  id: number
  left: number
  top: number
  height: number
  direction: "up" | "down"
  delay: number
}

const stats: StatItem[] = [
  { value: "4.8", label: "Avg Rating", description: "Across all\nclient locations", delay: 0 },
  { value: "23K+", label: "Reviews Shielded", description: "Negative feedback\nintercepted", delay: 0.2 },
  { value: "142%", label: "Review Growth", description: "Average increase in\n5-star reviews", delay: 0.4 },
  { value: "$12K", label: "Avg Savings", description: "Monthly commission\nsavings per client", delay: 0.6 },
]

// Seeded pseudo-random number generator for deterministic values
const seededRandom = (seed: number) => {
  const x = Math.sin(seed + 1) * 10000
  return x - Math.floor(x)
}

const generateDataPoints = (): DataPoint[] => {
  const points: DataPoint[] = []
  for (let i = 0; i < 50; i++) {
    const direction = i % 2 === 0 ? "down" : "up"
    const height = Math.floor(seededRandom(i * 3) * 120) + 88
    const top = Math.round(direction === "down" ? seededRandom(i * 5) * 150 + 250 : seededRandom(i * 7) * 100 - 80)
    points.push({
      id: i,
      left: 1 + i * 32,
      top,
      height,
      direction,
      delay: i * 0.035,
    })
  }
  return points
}

export const BankingScaleHero = () => {
  const [isVisible, setIsVisible] = useState(false)
  const [dataPoints] = useState<DataPoint[]>(generateDataPoints())
  const [typingComplete, setTypingComplete] = useState(false)
  const [shieldState, setShieldState] = useState<"negative" | "positive">("positive")

  useEffect(() => {
    setIsVisible(true)
    const timer = setTimeout(() => setTypingComplete(true), 1000)
    const interval = setInterval(() => {
      setShieldState((s) => (s === "positive" ? "negative" : "positive"))
    }, 3000)
    return () => { clearTimeout(timer); clearInterval(interval) }
  }, [])

  return (
    <div className="w-full overflow-hidden bg-[#0A0A0A]">
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-24 pt-16">
        <div className="grid grid-cols-12 gap-5 gap-y-16">
          {/* Left - Text & Stats */}
          <div className="col-span-12 md:col-span-6 relative z-10">
            <div className="relative h-6 inline-flex items-center font-mono uppercase text-xs text-[#FFE100] mb-12 px-2">
              <div className="flex items-center gap-0.5 overflow-hidden">
                <motion.span
                  initial={{ width: 0 }}
                  animate={{ width: "auto" }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="block whitespace-nowrap overflow-hidden text-[#FFE100] relative z-10"
                >
                  Trusted at scale
                </motion.span>
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: typingComplete ? [1, 0, 1, 0] : 0 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="block w-1.5 h-3 bg-[#FFE100] ml-0.5 relative z-10 rounded-sm"
                />
              </div>
            </div>

            <h2 className="text-[40px] font-bold leading-tight tracking-tight text-white mb-6">
              Protecting thousands of businesses daily{" "}
              <span className="text-[#888888] font-normal">
                with intelligent reputation shielding and revenue recovery.
              </span>
            </h2>

            <p className="text-lg leading-7 text-[#AAAAAA] mt-0 mb-6">
              VLYR's Reputation Shield intercepts negative reviews before they hit Google, while boosting 5-star feedback automatically. The result: higher ratings, more customers, more revenue.
            </p>

            <button className="relative inline-flex justify-center items-center cursor-pointer whitespace-nowrap font-medium h-11 text-[#FFE100] bg-[#1F1F1F] border border-[#FFE100]/20 transition-all duration-200 ease-in-out rounded-xl px-5 mt-5 text-sm group hover:border-[#FFE100]/50 hover:bg-[#FFE100]/5">
              <span className="relative z-10 flex items-center gap-1.5">
                See how the shield works
                <ArrowRight className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-1" />
              </span>
            </button>
          </div>

          {/* Right - Animated Data Bars */}
          <div className="col-span-12 md:col-span-6">
            <div className="relative w-full h-[416px] -ml-[200px]">
              <div className="absolute top-0 left-[302px] w-[680px] h-[416px] pointer-events-none">
                <div className="relative w-full h-full">
                  {dataPoints.map((point) => (
                    <motion.div
                      key={point.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={isVisible ? { opacity: [0, 1, 1], height: [0, point.height, point.height] } : {}}
                      transition={{ duration: 2, delay: point.delay, ease: [0.5, 0, 0.01, 1] }}
                      className="absolute w-1.5 rounded-[3px]"
                      style={{
                        left: `${point.left}px`,
                        top: `${point.top}px`,
                        background:
                          point.direction === "down"
                            ? "linear-gradient(rgba(255, 225, 0, 0.4) 0%, rgba(255, 225, 0, 0.15) 30%, rgba(255, 225, 0, 0.02) 75%)"
                            : "linear-gradient(to top, rgba(255, 225, 0, 0.4) 0%, rgba(255, 225, 0, 0.15) 30%, rgba(255, 225, 0, 0.02) 75%)",
                      }}
                    >
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={isVisible ? { opacity: [0, 1] } : {}}
                        transition={{ duration: 0.3, delay: point.delay + 1.7 }}
                        className="absolute -left-[1px] w-2 h-2 bg-[#FFE100] rounded-full"
                        style={{
                          top: point.direction === "down" ? "0px" : `${point.height - 8}px`,
                          boxShadow: "0 0 6px 1px rgba(255, 225, 0, 0.5)",
                        }}
                      />
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="col-span-12">
            <div className="overflow-visible pb-5">
              <div className="grid grid-cols-12 gap-5 relative z-10">
                {stats.map((stat, index) => (
                  <div key={index} className="col-span-6 md:col-span-3">
                    <motion.div
                      initial={{ opacity: 0, y: 20, filter: "blur(4px)" }}
                      animate={isVisible ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
                      transition={{ duration: 1.5, delay: stat.delay, ease: [0.1, 0, 0.1, 1] }}
                      className="flex flex-col gap-2"
                    >
                      <span className="text-2xl font-bold leading-tight tracking-tight text-[#FFE100]">
                        {stat.value}
                      </span>
                      <span className="text-sm font-medium text-white">{stat.label}</span>
                      <p className="text-xs leading-tight text-[#666666] whitespace-pre-line">{stat.description}</p>
                    </motion.div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Feature Showcase Cards */}
          <div className="col-span-12 mt-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Reputation Shield */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6 }}
                className="bg-[#1F1F1F] rounded-2xl p-6 border border-white/5 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFE100]/5 rounded-full blur-[60px] pointer-events-none" />
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-[#FFE100]/10 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-[#FFE100]" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Reputation Shield</h3>
                </div>

                {/* Interactive Toggle Visualization */}
                <div className="bg-[#0A0A0A]/60 rounded-xl p-4 border border-white/5 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono text-[#888888] uppercase">Incoming Review</span>
                    <motion.div
                      key={shieldState}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="flex items-center gap-1"
                    >
                      {shieldState === "positive" ? (
                        <>
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} className="w-3 h-3 text-[#FFE100] fill-[#FFE100]" />
                          ))}
                        </>
                      ) : (
                        <>
                          {[1, 2].map((s) => (
                            <Star key={s} className="w-3 h-3 text-[#C4841D] fill-[#C4841D]" />
                          ))}
                          {[3, 4, 5].map((s) => (
                            <Star key={s} className="w-3 h-3 text-[#333333]" />
                          ))}
                        </>
                      )}
                    </motion.div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ChevronRight className="w-3 h-3 text-[#555555]" />
                    <motion.span
                      key={shieldState}
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`text-sm font-medium ${
                        shieldState === "positive" ? "text-[#FFE100]" : "text-[#C4841D]"
                      }`}
                    >
                      {shieldState === "positive" ? "Redirect to Google" : "Private Form (Shielded)"}
                    </motion.span>
                  </div>
                </div>
                <p className="text-sm text-[#888888]">Negative reviews stay private. 5-star reviews go to Google automatically.</p>
              </motion.div>

              {/* Commission Killer */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, delay: 0.15 }}
                className="bg-[#1F1F1F] rounded-2xl p-6 border border-white/5 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFE100]/5 rounded-full blur-[60px] pointer-events-none" />
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-[#FFE100]/10 flex items-center justify-center">
                    <ShoppingBag className="w-5 h-5 text-[#FFE100]" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Commission Killer</h3>
                </div>
                <div className="bg-[#0A0A0A]/60 rounded-xl p-4 border border-white/5 mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-[#888888]">DoorDash/UberEats Fee</span>
                    <span className="text-sm font-bold text-[#C4841D] line-through">30%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[#888888]">VLYR Direct Orders</span>
                    <span className="text-sm font-bold text-[#FFE100]">0%</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/5 flex justify-between items-center">
                    <span className="text-xs text-[#AAAAAA] font-medium">Monthly Savings</span>
                    <span className="text-lg font-bold text-[#FFE100]">$3,200</span>
                  </div>
                </div>
                <p className="text-sm text-[#888888]">Direct-order menus that save your customers money and keep profits in your pocket.</p>
              </motion.div>

              {/* Burn-Code Loyalty */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="bg-[#1F1F1F] rounded-2xl p-6 border border-white/5 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFE100]/5 rounded-full blur-[60px] pointer-events-none" />
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-[#FFE100]/10 flex items-center justify-center">
                    <Flame className="w-5 h-5 text-[#FFE100]" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Burn-Code Loyalty</h3>
                </div>
                <div className="bg-[#0A0A0A]/60 rounded-xl p-4 border border-white/5 mb-4">
                  <div className="text-center">
                    <span className="text-xs font-mono text-[#888888] uppercase block mb-2">Dynamic Reward</span>
                    <span className="text-2xl font-bold text-[#FFE100]">15% OFF</span>
                    <div className="flex items-center justify-center gap-1.5 mt-2">
                      <Clock className="w-3 h-3 text-[#C4841D]" />
                      <span className="text-xs text-[#C4841D] font-medium" style={{ animation: "vlyr-status-pulse 2s ease-in-out infinite" }}>
                        Expires in 1h 47m
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-[#888888]">Time-sensitive rewards that expire fast, driving immediate return visits and urgency.</p>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
