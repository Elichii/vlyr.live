"use client"

import { motion } from "framer-motion"
import { ShieldCheck, Clock, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export default function FallbackPage() {
  const router = useRouter()

  return (
    <main className="min-h-svh bg-background flex flex-col items-center justify-center px-5">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center gap-6 max-w-sm text-center"
      >
        {/* Logo */}
        <img
          src="/images/vlyr-logo.png"
          alt="VLYR"
          className="h-8 w-auto"
        />

        {/* Shield icon */}
        <div className="flex items-center justify-center w-20 h-20 rounded-full bg-accent/10 border-2 border-accent/20">
          <ShieldCheck size={36} className="text-accent" />
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-bold text-foreground tracking-tight">
            Almost ready
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            This business is setting up their VLYR Reputation Shield. The QR experience will be live shortly.
          </p>
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-xl">
          <Clock size={14} className="text-chart-2 animate-pulse" />
          <span className="text-xs text-muted-foreground font-medium">
            Profile setup in progress
          </span>
        </div>

        <Button
          variant="outline"
          onClick={() => router.push("/")}
          className="h-11 rounded-xl border-border bg-card text-foreground hover:bg-secondary"
        >
          <ArrowLeft size={16} className="mr-2" />
          Back to home
        </Button>
      </motion.div>
    </main>
  )
}
