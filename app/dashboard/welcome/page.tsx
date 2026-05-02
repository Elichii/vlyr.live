"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { ShieldCheck, ArrowRight, BarChart3, QrCode, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

function ConfettiPiece({ delay, x }: { delay: number; x: number }) {
  const colors = ["#FFE100", "#111111", "#22C55E", "#3B82F6", "#EF4444", "#F97316"]
  const color = useMemo(() => colors[Math.floor(Math.random() * colors.length)], []) // eslint-disable-line react-hooks/exhaustive-deps
  const size = useMemo(() => 4 + Math.random() * 6, [])
  const rotateEnd = useMemo(() => Math.random() * 720 - 360, [])
  const duration = useMemo(() => 2 + Math.random() * 2, [])

  return (
    <motion.div
      initial={{ y: -20, x, opacity: 1, rotate: 0 }}
      animate={{ y: "100vh", opacity: 0, rotate: rotateEnd }}
      transition={{ delay, duration, ease: "easeIn" }}
      className="fixed top-0 z-50 pointer-events-none"
      style={{
        left: `${x}%`,
        width: size,
        height: size * 1.5,
        backgroundColor: color,
        borderRadius: 1,
      }}
    />
  )
}

export default function WelcomePage() {
  const router = useRouter()
  const [showConfetti, setShowConfetti] = useState(true)

  const confettiPieces = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => ({
        id: i,
        delay: Math.random() * 0.8,
        x: Math.random() * 100,
      })),
    [],
  )

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 5000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-5 py-12 relative overflow-hidden">
      {/* Confetti */}
      {showConfetti &&
        confettiPieces.map((piece) => (
          <ConfettiPiece key={piece.id} delay={piece.delay} x={piece.x} />
        ))}

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col items-center gap-8 max-w-lg text-center"
      >
        {/* Animated shield */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 150, damping: 12 }}
          className="flex items-center justify-center w-24 h-24 rounded-full bg-accent/15 border-2 border-accent/30"
        >
          <ShieldCheck size={48} className="text-accent" />
        </motion.div>

        <div className="flex flex-col gap-2">
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-3xl font-bold text-foreground tracking-tight text-balance"
          >
            Your Shield is Active
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="text-base text-muted-foreground leading-relaxed max-w-sm"
          >
            Your Reputation Shield is live, your QR kit is being printed, and your Command Center is ready.
          </motion.p>
        </div>

        {/* Quick-start cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="flex flex-col gap-3 w-full"
        >
          <div className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl text-left">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 shrink-0">
              <QrCode size={18} className="text-accent" />
            </div>
            <div className="flex-1">
              <span className="text-sm font-semibold text-foreground">QR Kit Shipping</span>
              <p className="text-[11px] text-muted-foreground">Your stickers and hardware ship within 3 business days.</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl text-left">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-green-50 border border-green-200 shrink-0">
              <BarChart3 size={18} className="text-green-600" />
            </div>
            <div className="flex-1">
              <span className="text-sm font-semibold text-foreground">Analytics Live</span>
              <p className="text-[11px] text-muted-foreground">Track scans, reviews, and burn-code redemptions in real time.</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl text-left">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 shrink-0">
              <Sparkles size={18} className="text-blue-600" />
            </div>
            <div className="flex-1">
              <span className="text-sm font-semibold text-foreground">Reputation Shield</span>
              <p className="text-[11px] text-muted-foreground">Negative feedback is now captured privately. Only 5-star reviews go public.</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="w-full"
        >
          <Button
            onClick={() => router.push("/dashboard")}
            className="w-full h-12 rounded-xl bg-foreground text-background font-semibold text-base hover:bg-foreground/90"
          >
            Go to Command Center
            <ArrowRight size={18} className="ml-2" />
          </Button>
        </motion.div>
      </motion.div>
    </div>
  )
}
