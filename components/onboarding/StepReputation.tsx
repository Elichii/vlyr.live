"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowRight, ArrowLeft, TrendingUp, Star,
  CheckCircle2, Shield, ThumbsUp, ThumbsDown,
} from "lucide-react"
import type { OnboardingData } from "@/lib/onboarding-types"

interface StepReputationProps {
  data: OnboardingData
  onNext: () => void
  onBack: () => void
}

// ─── VLYR impact math (same model as ReputationAnalysis) ──────────────────────
function useProjection(rating: number, total: number, pos: number, neg: number) {
  return useMemo(() => {
    if (pos === 0 && neg === 0) return { noVlyr: rating, withVlyr: rating }
    const noVlyr = (rating * total + pos * 5 + neg) / (total + pos + neg)
    const actualNeg = Math.ceil(neg * 0.27)
    const amplifiedPos = Math.round(pos * 2)
    const withVlyr = (rating * total + amplifiedPos * 5 + actualNeg) / (total + amplifiedPos + actualNeg)
    return { noVlyr, withVlyr }
  }, [rating, total, pos, neg])
}

// ─── PHASE 1: Loading scanner ─────────────────────────────────────────────────
const SCAN_STEPS = [
  "Reading public reviews",
  "Identifying reputation patterns",
  "Calculating your VLYR projection",
]

function ScanLoader({ businessName, onComplete }: { businessName: string; onComplete: () => void }) {
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 700),
      setTimeout(() => setPhase(2), 1400),
      setTimeout(() => setPhase(3), 2100),
      setTimeout(onComplete, 2800),
    ]
    return () => timers.forEach(clearTimeout)
  }, [onComplete])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center min-h-[480px] gap-10 px-4"
    >
      {/* Logo + pulse ring */}
      <div className="relative flex items-center justify-center">
        <motion.div
          animate={{ scale: [1, 1.18, 1], opacity: [0.15, 0.04, 0.15] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute w-24 h-24 rounded-full border border-[#FFE100]/40"
        />
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.25, 0.06, 0.25] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
          className="absolute w-16 h-16 rounded-full border border-[#FFE100]/30"
        />
        <div className="w-14 h-14 rounded-2xl bg-[#0A0A0A] flex items-center justify-center shadow-lg z-10">
          <img src="/images/vlyr-logo-white.png" alt="VLYR" className="h-5 w-auto object-contain" />
        </div>
      </div>

      {/* Text */}
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-base font-bold text-[#0A0A0A] tracking-tight">
          Analyzing {businessName || "your business"}
        </p>
        <p className="text-sm text-[#595959]">Building your personalized impact report…</p>
      </div>

      {/* Sequential steps */}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        {SCAN_STEPS.map((text, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: phase > i ? 1 : 0.2, x: 0 }}
            transition={{ duration: 0.35, delay: i * 0.05 }}
            className="flex items-center gap-3"
          >
            <div className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center"
              style={{
                background: phase > i ? "#0A0A0A" : "#F0F0F0",
                transition: "background 0.3s",
              }}>
              {phase > i
                ? <CheckCircle2 size={12} className="text-[#FFE100]" />
                : <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-3 h-3 border-2 border-[#CCCCCC] border-t-[#0A0A0A] rounded-full"
                  />
              }
            </div>
            <span className="text-sm font-medium text-[#595959]">{text}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

// ─── PHASE 2: Impact data ──────────────────────────────────────────────────────
function ReputationImpact({
  data, onNext, onBack,
}: { data: OnboardingData; onNext: () => void; onBack: () => void }) {
  const rating = data.googleRating ?? 4.2
  const total = data.googleReviewCount ?? 0
  const businessName = data.businessName || "Your Business"

  const [pos, setPos] = useState(0)
  const [neg, setNeg] = useState(0)
  const { noVlyr, withVlyr } = useProjection(rating, total, pos, neg)

  const delta = withVlyr - noVlyr
  const hasAdjusted = pos > 0 || neg > 0

  // Estimated negative reviews on file
  const estimatedNeg = Math.round(
    total * (rating < 3 ? 0.28 : rating < 3.8 ? 0.12 : rating < 4.3 ? 0.05 : 0.02)
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="flex flex-col gap-6 w-full"
    >
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-xl bg-[#0A0A0A] flex items-center justify-center shrink-0">
            <img src="/images/vlyr-logo-white.png" alt="VLYR" className="h-3.5 w-auto object-contain" />
          </div>
          <h2 className="text-xl font-black text-[#0A0A0A] tracking-tight leading-tight">
            {businessName}
          </h2>
        </div>
        <p className="text-sm text-[#595959] ml-10">
          {total > 0
            ? `${total.toLocaleString()} reviews · ${estimatedNeg > 0 ? `${estimatedNeg} negative reviews visible publicly` : "Your profile looks strong"}`
            : "Google Business connected"}
        </p>
      </div>

      {/* Current vs With VLYR — default */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2 p-4 rounded-2xl bg-[#FAFAFA] border border-[#E5E5E5]">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#AAAAAA]">Current</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-[#0A0A0A]">{rating.toFixed(1)}</span>
            <span className="text-sm text-[#AAAAAA]">/ 5</span>
          </div>
          <div className="flex gap-0.5">
            {[1,2,3,4,5].map(i => (
              <Star key={i} size={12}
                className={i <= Math.round(rating) ? "fill-[#FFE100] text-[#FFE100]" : "fill-[#E5E5E5] text-[#E5E5E5]"} />
            ))}
          </div>
          {total > 0 && <p className="text-xs text-[#AAAAAA]">{total.toLocaleString()} reviews</p>}
        </div>

        <div className="flex flex-col gap-2 p-4 rounded-2xl border-2"
          style={{
            background: hasAdjusted ? "rgba(255,225,0,0.06)" : "#FAFAFA",
            borderColor: hasAdjusted ? "rgba(255,225,0,0.35)" : "#E5E5E5",
          }}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#FFE100]">With VLYR</p>
          <motion.div key={withVlyr.toFixed(2)} initial={{ scale: 1.08 }} animate={{ scale: 1 }}
            transition={{ duration: 0.2 }} className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-[#0A0A0A]">{withVlyr.toFixed(1)}</span>
            <span className="text-sm text-[#AAAAAA]">/ 5</span>
          </motion.div>
          <div className="flex gap-0.5">
            {[1,2,3,4,5].map(i => (
              <Star key={i} size={12}
                className={i <= Math.round(withVlyr) ? "fill-[#FFE100] text-[#FFE100]" : "fill-[#E5E5E5] text-[#E5E5E5]"} />
            ))}
          </div>
          {hasAdjusted && delta > 0.01 && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-xs font-bold text-[#0A0A0A]">
              +{delta.toFixed(2)} stars protected
            </motion.p>
          )}
        </div>
      </div>

      {/* Sliders */}
      <div className="flex flex-col gap-3 p-4 rounded-2xl bg-[#FAFAFA] border border-[#E5E5E5]">
        <p className="text-xs font-bold text-[#595959] uppercase tracking-wider">Simulate your scenario</p>

        {[
          { label: "Positive reviews collected by VLYR", icon: ThumbsUp, v: pos, set: setPos, max: 50 },
          { label: "Negative reviews that arrive", icon: ThumbsDown, v: neg, set: setNeg, max: 20 },
        ].map(({ label, icon: Icon, v, set, max }) => (
          <div key={label} className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Icon size={12} className="text-[#595959]" />
                <span className="text-xs font-medium text-[#595959]">{label}</span>
              </div>
              <span className="text-xs font-bold text-[#0A0A0A] w-6 text-right">+{v}</span>
            </div>
            <input type="range" min={0} max={max} value={v}
              onChange={e => set(Number(e.target.value))}
              className="w-full h-1.5 rounded-full cursor-pointer accent-[#FFE100] bg-[#E5E5E5]"
            />
          </div>
        ))}

        {/* Projection row when sliders moved */}
        <AnimatePresence>
          {hasAdjusted && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="pt-3 border-t border-[#E5E5E5] flex items-center justify-between overflow-hidden">
              <div>
                <p className="text-xs text-[#595959]">Without VLYR</p>
                <p className="text-lg font-black text-[#0A0A0A]">{noVlyr.toFixed(1)} ★</p>
              </div>
              <ArrowRight size={16} className="text-[#CCCCCC]" />
              <div className="text-right">
                <p className="text-xs font-bold text-[#FFE100]">With VLYR</p>
                <motion.p key={withVlyr.toFixed(2)} initial={{ scale: 1.12 }} animate={{ scale: 1 }}
                  className="text-lg font-black text-[#0A0A0A]">
                  {withVlyr.toFixed(1)} ★
                </motion.p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 79:1 insight — shown if they have any negative reviews */}
      {estimatedNeg > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="flex items-start gap-3 p-4 rounded-2xl bg-[#FFFCE6] border border-[#FFE100]/30">
          <Shield size={16} className="text-[#B8860B] shrink-0 mt-0.5" />
          <p className="text-sm text-[#595959] leading-relaxed">
            <span className="font-semibold text-[#0A0A0A]">
              Each 1-star review requires ~79 five-star reviews to offset.
            </span>{" "}
            VLYR intercepts the complaint before it posts — so you never have to play catch-up.
          </p>
        </motion.div>
      )}

      {/* CTA */}
      <div className="flex flex-col gap-3 pt-2">
        <button
          onClick={onNext}
          className="group w-full h-13 flex items-center justify-center gap-2 bg-[#FFE100] text-[#0A0A0A] font-bold text-[15px] rounded-xl hover:bg-[#FFE100]/90 hover:shadow-[0_0_32px_rgba(255,225,0,0.25)] active:scale-[0.98] transition-all"
        >
          Activate My Shield
          <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
        </button>
        <button onClick={onBack}
          className="flex items-center justify-center gap-1.5 text-sm text-[#595959] hover:text-[#0A0A0A] transition-colors">
          <ArrowLeft size={14} /> Back to label design
        </button>
      </div>

      <p className="text-center text-xs text-[#AAAAAA]">
        No credit card required · Cancel anytime
      </p>
    </motion.div>
  )
}

// ─── Export ───────────────────────────────────────────────────────────────────
export function StepReputation({ data, onNext, onBack }: StepReputationProps) {
  const [loaded, setLoaded] = useState(false)
  const handleComplete = useCallback(() => setLoaded(true), [])

  // Skip if no Google data was connected
  useEffect(() => {
    if (!data.googleRating && !data.googleReviewCount) {
      onNext()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AnimatePresence mode="wait">
      {!loaded ? (
        <ScanLoader key="scan" businessName={data.businessName} onComplete={handleComplete} />
      ) : (
        <ReputationImpact key="data" data={data} onNext={onNext} onBack={onBack} />
      )}
    </AnimatePresence>
  )
}
