"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { ShieldCheck, QrCode, BarChart3, ArrowRight, Zap, Star, TrendingUp } from "lucide-react"
import { VLYRLoader } from "@/components/vlyr-loader"

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Reputation Shield",
    description: "Intercept negative feedback privately. Only 4-5 star reviews reach Google.",
  },
  {
    icon: QrCode,
    title: "Pulse Check QR",
    description: "Every scan captures real-time sentiment and triggers smart routing.",
  },
  {
    icon: Zap,
    title: "Burn-Code Rewards",
    description: "Instant discount vouchers that drive repeat visits within 60 minutes.",
  },
  {
    icon: BarChart3,
    title: "Command Center",
    description: "Live analytics, order tracking, and supply management in one dashboard.",
  },
]

export default function MerchantIntakePage() {
  const router = useRouter()
  const [navigating, setNavigating] = useState<string | null>(null)

  const handleNavigate = (path: string) => {
    setNavigating(path)
    router.push(path)
  }

  if (navigating) {
    return (
      <VLYRLoader
        variant="full"
        message={navigating === "/onboarding" ? "Preparing onboarding..." : "Loading Command Center..."}
      />
    )
  }

  return (
    <main className="min-h-svh flex flex-col bg-background">
      {/* Navigation */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border">
        <img src="/images/vlyr-logo.png" alt="VLYR" className="h-7 w-auto" />
        <button
          onClick={() => handleNavigate("/auth/login")}
          className="text-sm text-muted-foreground font-medium transition-all duration-200 hover:text-foreground hover:underline underline-offset-4 active:scale-95"
        >
          Login to Command Center
        </button>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-16 lg:py-24">
        <div className="w-full max-w-2xl flex flex-col items-center gap-8 text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/20"
          >
            <Star size={14} className="text-accent fill-accent" />
            <span className="text-xs font-semibold text-foreground tracking-wide">
              Merchant Activation Portal
            </span>
          </motion.div>

          {/* Headline */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col gap-4"
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground tracking-tight text-balance leading-[1.1]">
              VLYR Dashboard
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-lg mx-auto text-pretty">
              Deploy the 22nd-century Reputation Shield to your business. Real-time feedback. Zero-commission orders. Instant growth.
            </p>
          </motion.div>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto"
          >
            <button
              onClick={() => handleNavigate("/onboarding")}
              className="group flex items-center justify-center gap-2 w-full sm:w-auto bg-foreground text-background px-8 py-4 rounded-xl font-semibold text-base transition-all duration-200 hover:shadow-[0_0_24px_4px_rgba(255,225,0,0.25)] hover:scale-[1.02] active:scale-[0.98] active:shadow-none"
            >
              Start Merchant Onboarding
              <ArrowRight size={18} className="transition-transform duration-200 group-hover:translate-x-0.5" />
            </button>
            <button
              onClick={() => handleNavigate("/auth/login")}
              className="flex items-center justify-center gap-2 w-full sm:w-auto bg-card text-foreground px-8 py-4 rounded-xl font-medium text-sm border border-border transition-all duration-200 hover:bg-secondary hover:border-foreground/20 hover:shadow-md active:scale-[0.98] active:shadow-none"
            >
              Already a member? Login
            </button>
          </motion.div>

          {/* Social proof */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex items-center gap-6 pt-4"
          >
            <div className="flex items-center gap-1.5">
              <TrendingUp size={14} className="text-green-600" />
              <span className="text-xs text-muted-foreground">
                <span className="text-foreground font-semibold">4.8x</span> avg review growth
              </span>
            </div>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-accent" />
              <span className="text-xs text-muted-foreground">
                <span className="text-foreground font-semibold">97%</span> negative feedback shielded
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="px-6 pb-16 lg:pb-24">
        <div className="w-full max-w-4xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {FEATURES.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="flex gap-4 p-5 rounded-2xl bg-card border border-border transition-all duration-200 hover:border-foreground/15 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:shadow-none cursor-default"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 shrink-0">
                  <feature.icon size={20} className="text-accent" />
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="text-sm font-semibold text-foreground">{feature.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="flex flex-col items-center justify-center gap-3 px-6 py-6 bg-vlyr-dark">
        <div className="flex items-center gap-4">
          <a 
            href="/privacy" 
            className="text-[#FFFFFF]/60 text-[11px] font-medium tracking-wide hover:text-[#FFFFFF]/90 transition-colors"
          >
            Privacy Policy
          </a>
          <span className="text-[#FFFFFF]/30">|</span>
          <a 
            href="/terms" 
            className="text-[#FFFFFF]/60 text-[11px] font-medium tracking-wide hover:text-[#FFFFFF]/90 transition-colors"
          >
            Terms of Service
          </a>
        </div>
        <span className="text-[#FFFFFF]/40 text-[11px] font-medium tracking-wide">
          Powered by VLYR
        </span>
      </footer>
    </main>
  )
}
