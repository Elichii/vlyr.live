"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Star, TrendingUp, Target, AlertTriangle, Shield, ArrowRight,
  ThumbsUp, ThumbsDown, MessageSquare, BarChart3, CheckCircle2,
  Zap, Users, Sparkles, EyeOff, Eye,
} from "lucide-react"
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts"

interface ReviewData {
  author: string
  rating: number
  text: string
  time: number
  relativeTime: string
}

interface BusinessData {
  businessName: string
  rating: number
  totalReviews: number
  reviews: ReviewData[]
  address?: string
  phone?: string
  category?: string
  logoUrl?: string
  openingHours?: string[]
}

interface ReputationAnalysisProps {
  businessData: BusinessData
  onContinue: () => void
  onBack: () => void
}

// Ratings needed: solve (R*N + 5*X) / (N+X) = T  →  X = N*(T-R)/(5-T)
function reviewsToReach(current: number, total: number, target: number): number {
  if (current >= target) return 0
  if (target >= 5) {
    const t = 4.95
    return Math.max(0, Math.ceil((total * (t - current)) / (5 - t)))
  }
  return Math.max(0, Math.ceil((total * (target - current)) / (5 - target)))
}

function ratingStyle(r: number): { text: string; ring: string; hex: string } {
  if (r >= 4.2) return { text: "text-green-400", ring: "ring-green-400/30", hex: "#4ade80" }
  if (r >= 3.5) return { text: "text-amber-400", ring: "ring-amber-400/30", hex: "#fbbf24" }
  return { text: "text-red-400", ring: "ring-red-400/30", hex: "#f87171" }
}

function Stars({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => {
        const full = i <= Math.floor(rating)
        const partial = !full && i === Math.ceil(rating) && rating % 1 > 0
        const pct = partial ? Math.round((rating % 1) * 100) : 0
        return (
          <div key={i} className="relative" style={{ width: size, height: size }}>
            <Star size={size} className="absolute text-muted-foreground/20" />
            {(full || partial) && (
              <div className="absolute inset-0 overflow-hidden" style={{ width: full ? "100%" : `${pct}%` }}>
                <Star size={size} className="fill-[#FFE100] text-[#FFE100]" />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function AnimatedBar({ pct, color, delay = 0 }: { pct: number; color: string; delay?: number }) {
  return (
    <div className="flex-1 h-3 bg-secondary rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ delay, duration: 0.55, ease: "easeOut" }}
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
      />
    </div>
  )
}

export function ReputationAnalysis({ businessData, onContinue }: ReputationAnalysisProps) {
  const [tab, setTab] = useState<"state" | "simulator" | "plan">("state")
  const [posSlider, setPosSlider] = useState(0)
  const [negSlider, setNegSlider] = useState(0)

  const { rating, totalReviews, reviews, businessName } = businessData
  const hasData = totalReviews > 0 && rating > 0

  // Build star distribution (real or estimated)
  const distribution = useMemo(() => {
    const dist = [0, 0, 0, 0, 0]
    reviews.forEach(r => { if (r.rating >= 1 && r.rating <= 5) dist[r.rating - 1]++ })
    if (!hasData) return dist

    // If we have fewer review objects than the total, estimate the full distribution
    if (reviews.length < totalReviews * 0.5) {
      const avg = rating
      return [
        Math.round(totalReviews * (avg < 2 ? 0.30 : avg < 3 ? 0.14 : avg < 4 ? 0.06 : 0.02)),
        Math.round(totalReviews * (avg < 2 ? 0.25 : avg < 3 ? 0.14 : avg < 4 ? 0.07 : 0.03)),
        Math.round(totalReviews * (avg < 3 ? 0.20 : avg < 4 ? 0.15 : 0.08)),
        Math.round(totalReviews * (avg < 3 ? 0.15 : avg < 4 ? 0.25 : 0.22)),
        Math.round(totalReviews * (avg < 3 ? 0.10 : avg < 4 ? 0.42 : 0.65)),
      ]
    }
    return dist
  }, [reviews, totalReviews, rating, hasData])

  const negCount = distribution[0] + distribution[1]
  const neuCount = distribution[2]
  const posCount = distribution[3] + distribution[4]
  const posPercent = hasData ? Math.round((posCount / totalReviews) * 100) : 0
  const negPercent = hasData ? Math.round((negCount / totalReviews) * 100) : 0
  const neuPercent = hasData ? Math.round((neuCount / totalReviews) * 100) : 0
  const isEstimated = hasData && reviews.length < totalReviews * 0.5

  // Simulator projections
  const projNoVlyr = useMemo(() => {
    if (posSlider === 0 && negSlider === 0) return rating
    const added = posSlider * 5 + negSlider * 1
    const count = totalReviews + posSlider + negSlider
    return count === 0 ? 0 : (rating * totalReviews + added) / count
  }, [rating, totalReviews, posSlider, negSlider])

  const projWithVlyr = useMemo(() => {
    // VLYR: intercepts 73% of negative reviewers (they get resolved privately)
    //       amplifies positive collection by 2×
    const actualNeg = Math.ceil(negSlider * 0.27)
    const amplifiedPos = Math.round(posSlider * 2) + Math.floor(negSlider * 0.73 * 0.1) // some intercepted leave 5-star after resolution
    const added = amplifiedPos * 5 + actualNeg * 1
    const count = totalReviews + amplifiedPos + actualNeg
    return count === 0 ? rating : (rating * totalReviews + added) / count
  }, [rating, totalReviews, posSlider, negSlider])

  const delta = projNoVlyr - rating
  const vlyrAdvantage = projWithVlyr - projNoVlyr

  // Trend data (visual simulation based on current rating)
  const trendData = useMemo(() => [
    { t: "6mo", r: Math.max(1, rating - 0.28) },
    { t: "5mo", r: Math.max(1, rating - 0.20) },
    { t: "4mo", r: Math.max(1, rating - 0.13) },
    { t: "3mo", r: Math.max(1, rating - 0.08) },
    { t: "2mo", r: Math.max(1, rating - 0.03) },
    { t: "Now", r: rating },
  ], [rating])

  const s = ratingStyle(rating)
  const tabs = [
    { id: "state" as const, label: "Current State", icon: BarChart3 },
    { id: "simulator" as const, label: "Impact Simulator", icon: Zap },
    { id: "plan" as const, label: "Growth Plan", icon: Target },
  ]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex bg-black/70 backdrop-blur-sm"
    >
      {/* ── Left Panel ─────────────────────────────────────────── */}
      <motion.div
        initial={{ x: -40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="hidden lg:flex lg:w-[40%] flex-col justify-between p-10 bg-gradient-to-br from-background via-background to-secondary/20 border-r border-border"
      >
        <div className="space-y-8 max-w-sm">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FFE100]/10 border border-[#FFE100]/20 text-[#FFE100] text-xs font-medium mb-5">
              <Sparkles size={12} />
              Your Reputation Report
            </div>
            <h2 className="text-3xl font-bold text-foreground leading-tight">
              Turn Every Customer Into a
              <span className="text-[#FFE100]"> 5-Star Advocate</span>
            </h2>
            <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
              See exactly where you stand, simulate the impact of every review, and discover how VLYR shifts the outcome in your favour.
            </p>
          </div>

          <div className="space-y-5">
            {[
              { icon: EyeOff, color: "text-red-400", bg: "bg-red-500/10", title: "The Invisible Problem", body: "Most low ratings come from customers who felt unheard at the moment of service. By the time they post, it's too late." },
              { icon: Eye, color: "text-[#FFE100]", bg: "bg-[#FFE100]/10", title: "VLYR Intercepts Issues", body: "QR codes capture unhappy customers instantly — giving you a chance to fix things before they hit Google." },
              { icon: TrendingUp, color: "text-green-400", bg: "bg-green-500/10", title: "Amplify Happy Customers", body: "Satisfied customers are guided directly to your Google review page. Watch your rating climb automatically." },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl ${item.bg} flex items-center justify-center shrink-0`}>
                  <item.icon size={17} className={item.color} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-0.5">{item.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 pt-6 border-t border-border">
          {[
            { v: "73%", l: "Issues resolved\nbefore Google", c: "text-[#FFE100]" },
            { v: "+0.8★", l: "Avg. rating\nimprovement", c: "text-green-400" },
            { v: "2×", l: "More 5-star\nreviews", c: "text-foreground" },
          ].map((st, i) => (
            <div key={i} className="text-center">
              <div className={`text-xl font-bold ${st.c}`}>{st.v}</div>
              <div className="text-xs text-muted-foreground mt-1 whitespace-pre-line leading-relaxed">{st.l}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── Right Panel ────────────────────────────────────────── */}
      <motion.div
        initial={{ x: 40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="w-full lg:w-[60%] bg-background flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="shrink-0 border-b border-border px-6 py-4 bg-background">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FFE100] to-[#FFE100]/60 flex items-center justify-center">
                <BarChart3 size={20} className="text-black" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">Reputation Insights</h2>
                <p className="text-xs text-muted-foreground truncate max-w-[200px]">{businessName}</p>
              </div>
            </div>
            {hasData && (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary border border-border ring-2 ${s.ring}`}>
                <Stars rating={rating} size={12} />
                <span className={`text-sm font-bold ${s.text}`}>{rating.toFixed(1)}</span>
                <span className="text-xs text-muted-foreground">({totalReviews.toLocaleString()})</span>
              </div>
            )}
          </div>

          <div className="flex gap-2 overflow-x-auto">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  tab === t.id ? "bg-[#FFE100] text-black" : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                <t.icon size={13} />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <AnimatePresence mode="wait">

            {/* ═══════════ TAB 1: CURRENT STATE ═══════════ */}
            {tab === "state" && (
              <motion.div key="state" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">

                {/* Rating hero */}
                <div className="rounded-2xl bg-gradient-to-br from-secondary to-secondary/40 border border-border p-5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Current Google Rating</p>
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <div className="flex items-baseline gap-2 mb-1.5">
                        <span className={`text-6xl font-black tabular-nums ${hasData ? s.text : "text-muted-foreground"}`}>
                          {hasData ? rating.toFixed(1) : "—"}
                        </span>
                        <span className="text-lg text-muted-foreground">/ 5.0</span>
                      </div>
                      <Stars rating={hasData ? rating : 0} size={20} />
                      <p className="text-xs text-muted-foreground mt-2">
                        {hasData ? `${totalReviews.toLocaleString()} reviews on Google` : "No reviews yet"}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-2.5">
                      <div className="text-center p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                        <ThumbsUp size={14} className="text-green-500 mx-auto mb-1" />
                        <div className="text-lg font-bold text-green-400">{posPercent}%</div>
                        <p className="text-xs text-muted-foreground">Positive</p>
                      </div>
                      <div className="text-center p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                        <MessageSquare size={14} className="text-amber-500 mx-auto mb-1" />
                        <div className="text-lg font-bold text-amber-400">{neuPercent}%</div>
                        <p className="text-xs text-muted-foreground">Neutral</p>
                      </div>
                      <div className="text-center p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                        <ThumbsDown size={14} className="text-red-500 mx-auto mb-1" />
                        <div className="text-lg font-bold text-red-400">{negPercent}%</div>
                        <p className="text-xs text-muted-foreground">Negative</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Distribution bars */}
                <div className="rounded-2xl bg-card border border-border p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                    <BarChart3 size={14} className="text-[#FFE100]" />
                    Rating Distribution
                    {isEstimated && <span className="text-xs text-muted-foreground">(estimated)</span>}
                  </h3>
                  <div className="space-y-2.5">
                    {[5, 4, 3, 2, 1].map(star => {
                      const count = distribution[star - 1]
                      const pct = hasData && totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0
                      const color = star >= 4 ? "#4ade80" : star === 3 ? "#fbbf24" : "#f87171"
                      return (
                        <div key={star} className="flex items-center gap-3">
                          <div className="flex items-center gap-1 w-8 shrink-0">
                            <span className="text-sm font-semibold text-foreground">{star}</span>
                            <Star size={10} className="fill-[#FFE100] text-[#FFE100]" />
                          </div>
                          <AnimatedBar pct={pct} color={color} delay={(5 - star) * 0.05} />
                          <div className="flex gap-2 w-16 justify-end shrink-0">
                            <span className="text-xs text-muted-foreground">{count.toLocaleString()}</span>
                            <span className="text-xs font-semibold text-foreground">{pct}%</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Trend */}
                <div className="rounded-2xl bg-card border border-border p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                    <TrendingUp size={14} className="text-[#FFE100]" />
                    Rating Trend
                    <span className="text-xs text-muted-foreground">(simulated)</span>
                  </h3>
                  <div className="h-36">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendData}>
                        <defs>
                          <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#FFE100" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#FFE100" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                        <XAxis dataKey="t" tick={{ fill: "#888", fontSize: 10 }} />
                        <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fill: "#888", fontSize: 10 }} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "#111", border: "1px solid #333", borderRadius: "8px", fontSize: "12px" }}
                          formatter={(v: number) => [v.toFixed(2), "Rating"]}
                        />
                        <Area type="monotone" dataKey="r" stroke="#FFE100" strokeWidth={2.5} fill="url(#rg)" dot={{ fill: "#FFE100", r: 3 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Negative review warning */}
                {negCount > 0 && (
                  <div className="rounded-xl bg-red-500/5 border border-red-500/15 p-4 flex items-start gap-3">
                    <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {negCount} negative review{negCount > 1 ? "s" : ""} hurting your rating
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Each 1-star review needs <span className="text-red-400 font-semibold">79 five-star reviews</span> to offset.
                        Use the <button onClick={() => setTab("simulator")} className="text-[#FFE100] underline underline-offset-2">Impact Simulator</button> to see the math live.
                      </p>
                    </div>
                  </div>
                )}

                {/* Recent negative reviews */}
                {reviews.filter(r => r.rating <= 2).length > 0 && (
                  <div className="rounded-2xl bg-card border border-border p-5">
                    <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <MessageSquare size={14} className="text-red-400" />
                      Could Have Been Prevented
                    </h3>
                    <div className="space-y-3">
                      {reviews.filter(r => r.rating <= 2).slice(0, 2).map((r, i) => (
                        <div key={i} className="p-3 rounded-xl bg-red-500/5 border border-red-500/10">
                          <div className="flex items-center gap-2 mb-1.5">
                            <Stars rating={r.rating} size={11} />
                            <span className="text-xs text-muted-foreground">{r.relativeTime}</span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">"{r.text || "No comment left"}"</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* ═══════════ TAB 2: IMPACT SIMULATOR ═══════════ */}
            {tab === "simulator" && (
              <motion.div key="sim" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">

                {/* Live projected rating display */}
                <div className="rounded-2xl bg-gradient-to-br from-secondary to-secondary/40 border border-border p-5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">Projected Rating</p>
                  <div className="grid grid-cols-3 items-center gap-2 text-center">
                    {/* Current */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5">Current</p>
                      <div className={`text-4xl font-black tabular-nums ${hasData ? s.text : "text-muted-foreground"}`}>
                        {hasData ? rating.toFixed(1) : "—"}
                      </div>
                      <Stars rating={hasData ? rating : 0} size={11} />
                      <p className="text-xs text-muted-foreground mt-1">{totalReviews.toLocaleString()} reviews</p>
                    </div>

                    {/* Arrow + delta */}
                    <div className="flex flex-col items-center gap-1">
                      <ArrowRight size={18} className="text-muted-foreground" />
                      {(posSlider > 0 || negSlider > 0) && (
                        <span className={`text-xs font-bold ${delta > 0 ? "text-green-400" : delta < 0 ? "text-red-400" : "text-muted-foreground"}`}>
                          {delta > 0 ? "+" : ""}{delta.toFixed(2)}
                        </span>
                      )}
                    </div>

                    {/* Without VLYR */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5">Without VLYR</p>
                      <motion.div
                        key={projNoVlyr.toFixed(2)}
                        initial={{ scale: 1.15, opacity: 0.7 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className={`text-4xl font-black tabular-nums ${ratingStyle(projNoVlyr).text}`}
                      >
                        {projNoVlyr.toFixed(1)}
                      </motion.div>
                      <Stars rating={projNoVlyr} size={11} />
                      <p className="text-xs text-muted-foreground mt-1">{(totalReviews + posSlider + negSlider).toLocaleString()} reviews</p>
                    </div>
                  </div>

                  {/* VLYR comparison row */}
                  {(posSlider > 0 || negSlider > 0) && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 pt-4 border-t border-[#FFE100]/20 flex items-center justify-between gap-4"
                    >
                      <div>
                        <p className="text-sm font-bold text-[#FFE100]">With VLYR Protection</p>
                        <p className="text-xs text-muted-foreground">73% negatives intercepted · 2× positive amplification</p>
                      </div>
                      <div className="text-right shrink-0">
                        <motion.div
                          key={projWithVlyr.toFixed(2)}
                          initial={{ scale: 1.2 }}
                          animate={{ scale: 1 }}
                          className="text-3xl font-black text-[#FFE100] tabular-nums"
                        >
                          {projWithVlyr.toFixed(1)}
                        </motion.div>
                        {vlyrAdvantage > 0.01 && (
                          <p className="text-xs text-green-400 font-semibold">
                            +{vlyrAdvantage.toFixed(2)} better
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Positive slider */}
                <div className="rounded-2xl bg-card border border-green-500/25 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <ThumbsUp size={15} className="text-green-400" />
                      <h3 className="text-sm font-semibold text-foreground">Add 5-Star Reviews</h3>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20">
                      <Star size={11} className="fill-[#FFE100] text-[#FFE100]" />
                      <span className="text-sm font-bold text-green-400">+{posSlider}</span>
                    </div>
                  </div>
                  <input
                    type="range" min={0} max={50} value={posSlider}
                    onChange={e => setPosSlider(Number(e.target.value))}
                    className="w-full h-2 rounded-full cursor-pointer accent-green-400"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1.5 px-0.5">
                    {[0, 10, 20, 30, 40, 50].map(n => <span key={n}>{n}</span>)}
                  </div>
                  {posSlider > 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 p-3 rounded-xl bg-green-500/5 border border-green-500/10">
                      <p className="text-xs text-green-400 font-medium">
                        {posSlider} new 5★ reviews → rating becomes <strong>{projNoVlyr.toFixed(2)}</strong>
                      </p>
                      <p className="text-xs text-[#FFE100] mt-1">
                        With VLYR amplification (2×): <strong>{posSlider * 2}</strong> reviews collected → <strong>{projWithVlyr.toFixed(2)} ★</strong>
                      </p>
                    </motion.div>
                  )}
                </div>

                {/* Negative slider */}
                <div className="rounded-2xl bg-card border border-red-500/25 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <ThumbsDown size={15} className="text-red-400" />
                      <h3 className="text-sm font-semibold text-foreground">Simulate Negative Reviews</h3>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20">
                      <Star size={11} className="text-red-400" />
                      <span className="text-sm font-bold text-red-400">+{negSlider}</span>
                    </div>
                  </div>
                  <input
                    type="range" min={0} max={20} value={negSlider}
                    onChange={e => setNegSlider(Number(e.target.value))}
                    className="w-full h-2 rounded-full cursor-pointer accent-red-400"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1.5 px-0.5">
                    {[0, 5, 10, 15, 20].map(n => <span key={n}>{n}</span>)}
                  </div>
                  {negSlider > 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 space-y-2">
                      <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/10">
                        <p className="text-xs text-red-400 font-medium">
                          Without VLYR: all {negSlider} post publicly → rating drops to <strong>{projNoVlyr.toFixed(2)} ★</strong>
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-[#FFE100]/5 border border-[#FFE100]/15">
                        <p className="text-xs text-[#FFE100] font-medium">
                          With VLYR: only ~{Math.ceil(negSlider * 0.27)} reach Google → rating stays at <strong>{projWithVlyr.toFixed(2)} ★</strong>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {Math.floor(negSlider * 0.73)} unhappy customers resolved privately before posting
                        </p>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* 79:1 rule */}
                <div className="rounded-2xl bg-gradient-to-br from-amber-500/10 to-red-500/5 border border-amber-500/20 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap size={15} className="text-amber-400" />
                    <h3 className="text-sm font-bold text-foreground">The 79:1 Rule</h3>
                    <span className="text-xs text-muted-foreground">— why prevention beats recovery</span>
                  </div>
                  <div className="bg-black/20 rounded-xl p-4 text-center mb-3">
                    <p className="text-xs text-muted-foreground mb-3">To fully cancel out 1 one-star review you need:</p>
                    <div className="flex items-center justify-center gap-6">
                      <div>
                        <div className="text-4xl font-black text-red-400">1</div>
                        <div className="text-xs text-muted-foreground mt-1">1-star review</div>
                      </div>
                      <ArrowRight size={20} className="text-muted-foreground" />
                      <div>
                        <div className="text-4xl font-black text-green-400">79</div>
                        <div className="text-xs text-muted-foreground mt-1">5-star reviews</div>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Cheaper to print <span className="text-foreground font-semibold">500 stickers</span> and intercept that one customer, than wait for <span className="text-foreground font-semibold">79 people</span> to voluntarily post.
                  </p>
                </div>

              </motion.div>
            )}

            {/* ═══════════ TAB 3: GROWTH PLAN ═══════════ */}
            {tab === "plan" && (
              <motion.div key="plan" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">

                {/* Header */}
                <div className="rounded-2xl bg-gradient-to-br from-[#FFE100]/10 to-transparent border border-[#FFE100]/20 p-5">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-1">
                    <Target size={15} className="text-[#FFE100]" />
                    Your Path to 5 Stars
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Here's the exact number of consecutive 5-star reviews you need to hit each milestone, and what VLYR does to get you there faster.
                  </p>
                </div>

                {/* Milestones */}
                {hasData ? (
                  <div className="space-y-3">
                    {[
                      { target: 4.0, label: "Good Standing", color: "#fbbf24", borderColor: "border-amber-500/30", bg: "bg-amber-500/5" },
                      { target: 4.5, label: "Excellent", color: "#4ade80", borderColor: "border-green-500/30", bg: "bg-green-500/5" },
                      { target: 5.0, label: "Perfect Score", color: "#FFE100", borderColor: "border-[#FFE100]/30", bg: "bg-[#FFE100]/5" },
                    ]
                      .filter(m => m.target > rating)
                      .map((m, i) => {
                        const needed = reviewsToReach(rating, totalReviews, m.target)
                        const pct = Math.min(Math.round((rating / m.target) * 100), 99)
                        return (
                          <motion.div
                            key={m.target}
                            initial={{ opacity: 0, x: 16 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.07 }}
                            className={`rounded-xl ${m.bg} border ${m.borderColor} p-4`}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="text-sm font-bold text-foreground">{m.target.toFixed(1)} ★</span>
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{m.label}</span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Need <span className="font-semibold text-foreground">{needed.toLocaleString()}</span> more 5-star reviews
                                </p>
                              </div>
                              <div className="text-right">
                                <div className="text-3xl font-black tabular-nums" style={{ color: m.color }}>
                                  {needed > 9999 ? `${(needed / 1000).toFixed(1)}k` : needed.toLocaleString()}
                                </div>
                                <div className="text-xs text-muted-foreground">reviews needed</div>
                              </div>
                            </div>
                            <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ delay: i * 0.07 + 0.2, duration: 0.6, ease: "easeOut" }}
                                className="h-full rounded-full"
                                style={{ backgroundColor: m.color }}
                              />
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
                              <span>Now: {rating.toFixed(1)} ★</span>
                              <span className="font-medium" style={{ color: m.color }}>{pct}% there</span>
                              <span>Goal: {m.target.toFixed(1)} ★</span>
                            </div>
                            {i === 0 && (
                              <div className="mt-2 pt-2 border-t border-border/50 flex items-center gap-2">
                                <Zap size={11} className="text-[#FFE100]" />
                                <span className="text-xs text-[#FFE100]">With VLYR, businesses typically reach this in 2–4 weeks</span>
                              </div>
                            )}
                          </motion.div>
                        )
                      })}
                    {rating >= 4.5 && (
                      <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-5 text-center">
                        <CheckCircle2 size={28} className="text-green-500 mx-auto mb-2" />
                        <h4 className="text-sm font-semibold text-foreground">Excellent Rating!</h4>
                        <p className="text-xs text-muted-foreground mt-1">VLYR will protect this and help you maintain your lead.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl bg-secondary/50 border border-border p-6 text-center">
                    <p className="text-sm text-muted-foreground">Connect your business to see personalised milestones.</p>
                  </div>
                )}

                {/* ROI snapshot */}
                {hasData && negCount > 0 && (
                  <div className="rounded-2xl bg-card border border-border p-5">
                    <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <AlertTriangle size={14} className="text-red-400" />
                      Your Current Reputation Debt
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: "Negative reviews active", value: negCount, c: "text-red-400", bg: "bg-red-500/10" },
                        { label: "5★ needed to fully recover", value: (negCount * 79).toLocaleString(), c: "text-amber-400", bg: "bg-amber-500/10" },
                        { label: "Est. customers lost", value: `${(negCount * 30).toLocaleString()}+`, c: "text-red-400", bg: "bg-red-500/10" },
                        { label: "VLYR prevents (per 10 neg)", value: "~7", c: "text-green-400", bg: "bg-green-500/10" },
                      ].map((item, i) => (
                        <div key={i} className={`${item.bg} rounded-xl p-3.5 text-center`}>
                          <div className={`text-2xl font-black ${item.c}`}>{item.value}</div>
                          <div className="text-xs text-muted-foreground mt-1 leading-snug">{item.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* How VLYR helps */}
                <div className="rounded-2xl bg-card border border-border p-5">
                  <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Sparkles size={14} className="text-[#FFE100]" />
                    How VLYR Gets You There
                  </h4>
                  <div className="space-y-3">
                    {[
                      { icon: Shield, c: "text-red-400", bg: "bg-red-500/10", text: "Intercepts unhappy customers before they post publicly on Google" },
                      { icon: Star, c: "text-[#FFE100]", bg: "bg-[#FFE100]/10", text: "Routes satisfied customers directly to your Google review page" },
                      { icon: TrendingUp, c: "text-green-400", bg: "bg-green-500/10", text: "Doubles your positive review collection rate automatically" },
                      { icon: Users, c: "text-blue-400", bg: "bg-blue-500/10", text: "Sends real-time alerts the moment negative feedback is captured" },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg ${item.bg} flex items-center justify-center shrink-0`}>
                          <item.icon size={14} className={item.c} />
                        </div>
                        <p className="text-xs text-muted-foreground">{item.text}</p>
                      </div>
                    ))}
                  </div>
                </div>

              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Footer CTA */}
        <div className="shrink-0 border-t border-border p-4 bg-background">
          <button
            onClick={onContinue}
            className="w-full h-12 rounded-xl bg-[#FFE100] hover:bg-[#FFE100]/90 text-black font-semibold text-sm transition-all flex items-center justify-center gap-2"
          >
            I'm Ready to Grow My Reputation
            <ArrowRight size={16} />
          </button>
          <p className="text-center text-xs text-muted-foreground mt-2">
            Continue to confirm your business details and choose your supplies
          </p>
        </div>
      </motion.div>
    </motion.div>
  )
}
