"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ShieldCheck } from "lucide-react"
import { PulseCheck } from "@/components/PulseCheck"
import { BurnCode } from "@/components/BurnCode"
import { VLYRSkeleton } from "@/components/VLYRSkeleton"

type Screen = "loading" | "pulse" | "reward"

const MERCHANT_NAME = "Demo Merchant"
const GOOGLE_REVIEW_URL = "https://g.page/review/demo"

export default function PulsePage() {
  const [screen, setScreen] = useState<Screen>("loading")

  useEffect(() => {
    const timer = setTimeout(() => setScreen("pulse"), 500)
    return () => clearTimeout(timer)
  }, [])

  const handlePulseSubmit = () => {
    setScreen("reward")
  }

  return (
    <main className="relative min-h-svh flex flex-col bg-background overflow-hidden">
      <AnimatePresence>
        {screen === "loading" && <VLYRSkeleton />}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {screen !== "loading" && (
          <motion.div
            key={screen}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col min-h-svh"
          >
            {/* Header */}
            <header className="flex items-center justify-center px-5 py-4 shrink-0 border-b border-border">
              <div className="flex items-center gap-2.5">
                <img
                  src="/images/vlyr-logo.png"
                  alt="VLYR"
                  className="h-6 w-auto"
                />
                <span className="text-border text-lg font-light select-none">|</span>
                <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Pulse Check
                </span>
              </div>
            </header>

            {/* Body */}
            <div className="flex-1 flex flex-col items-center justify-center px-5 pb-8">
              <AnimatePresence mode="wait">
                {screen === "pulse" && (
                  <motion.div
                    key="pulse-screen"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -16 }}
                    transition={{ duration: 0.35 }}
                    className="w-full max-w-sm flex flex-col items-center gap-8"
                  >
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.1 }}
                      className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border"
                    >
                      <ShieldCheck size={16} className="text-accent" />
                      <span className="text-foreground text-sm font-medium">
                        {"Verified at "}
                        <span className="text-foreground font-semibold">{MERCHANT_NAME}</span>
                      </span>
                    </motion.div>

                    <PulseCheck
                      merchantName={MERCHANT_NAME}
                      googleReviewUrl={GOOGLE_REVIEW_URL}
                      onSubmit={handlePulseSubmit}
                    />
                  </motion.div>
                )}

                {screen === "reward" && (
                  <motion.div
                    key="reward-screen"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -16 }}
                    transition={{ duration: 0.35 }}
                    className="w-full max-w-sm flex flex-col items-center gap-6"
                  >
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border">
                      <ShieldCheck size={16} className="text-accent" />
                      <span className="text-foreground text-sm font-medium">
                        {"Thank you for your feedback"}
                      </span>
                    </div>

                    <BurnCode />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <footer className="flex items-center justify-center px-5 py-5 shrink-0 bg-vlyr-dark">
              <span className="text-[#FFFFFF]/40 text-[11px] font-medium tracking-wide">
                Powered by VLYR
              </span>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
