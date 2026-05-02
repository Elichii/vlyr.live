"use client"

import { useState, useEffect, useMemo } from "react"
import { motion } from "framer-motion"
import { Clock, Ticket } from "lucide-react"

function generateBurnCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = ""
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `VLYR-${code}`
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
}

export function BurnCode() {
  const code = useMemo(() => generateBurnCode(), [])
  const [timeLeft, setTimeLeft] = useState(60 * 60)
  const [isExpired, setIsExpired] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          setIsExpired(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const progress = timeLeft / (60 * 60)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="w-full flex flex-col items-center gap-6"
    >
      {/* Voucher Card */}
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {/* Top accent bar */}
        <div className="h-1.5 w-full bg-foreground" />

        <div className="flex flex-col items-center gap-5 px-6 py-8">
          {/* Ticket icon */}
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-accent/15 border border-accent/30">
            <Ticket size={22} className="text-accent" />
          </div>

          {/* Discount label */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
              Your Reward
            </span>
            <span className="text-4xl font-bold text-foreground tracking-tight">
              15% OFF
            </span>
          </div>

          {/* Dashed divider with cutouts */}
          <div className="relative w-full flex items-center">
            <div className="absolute -left-9 w-6 h-6 rounded-full bg-background" />
            <div className="w-full border-t-2 border-dashed border-border" />
            <div className="absolute -right-9 w-6 h-6 rounded-full bg-background" />
          </div>

          {/* Burn Code Display */}
          <div className="flex flex-col items-center gap-2 w-full">
            <span className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
              Burn Code
            </span>
            <div className="flex items-center justify-center w-full py-3 px-4 rounded-xl bg-background border border-border">
              <span className="text-2xl font-mono font-bold text-foreground tracking-[0.2em]">
                {isExpired ? "EXPIRED" : code}
              </span>
            </div>
          </div>

          {/* Countdown Timer */}
          <div className="flex flex-col items-center gap-2 w-full">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock size={14} className={isExpired ? "" : "animate-countdown-pulse"} />
              <span className="text-xs font-medium tracking-wide uppercase">
                {isExpired ? "Expired" : "Expires in"}
              </span>
            </div>

            <span
              className={`text-lg font-mono font-semibold tracking-widest ${
                isExpired
                  ? "text-destructive"
                  : timeLeft < 300
                    ? "text-destructive"
                    : "text-foreground"
              }`}
            >
              {formatTime(timeLeft)}
            </span>

            {/* Progress bar */}
            <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${
                  isExpired
                    ? "bg-destructive"
                    : timeLeft < 300
                      ? "bg-destructive"
                      : "bg-foreground"
                }`}
                initial={{ width: "100%" }}
                animate={{ width: `${progress * 100}%` }}
                transition={{ duration: 1, ease: "linear" }}
              />
            </div>
          </div>

          {/* Instructions */}
          <p className="text-muted-foreground text-xs text-center leading-relaxed max-w-[260px]">
            Show this code at the counter for your 15% discount.
          </p>
        </div>
      </div>
    </motion.div>
  )
}
