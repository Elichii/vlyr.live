"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion"
import {
  ShieldCheck, QrCode, BarChart3, ArrowRight,
  Star, TrendingUp, Bell, Lock, CheckCircle2, Quote,
} from "lucide-react"
import { VLYRLoader } from "@/components/vlyr-loader"

// ─── Unsplash images ──────────────────────────────────────────────────────────
const IMG = {
  restaurantBand: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=2400&auto=format&fit=crop&q=85",
  ownerPhone:     "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1000&auto=format&fit=crop&q=85",
  ownerSmiling:   "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=1000&auto=format&fit=crop&q=85",
  testimonial:    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&auto=format&fit=crop&q=85",
  shopkeeper:     "https://images.unsplash.com/photo-1541614101331-1a5a3a194e92?w=1200&auto=format&fit=crop&q=85",
}

// ─── Google G ─────────────────────────────────────────────────────────────────
function GoogleG({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

// ─── Parallax wrapper ─────────────────────────────────────────────────────────
function Parallax({ src, height = 540, overlay = "bg-black/60", children }: {
  src: string; height?: number; overlay?: string; children?: React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] })
  const y = useTransform(scrollYProgress, [0, 1], [-70, 70])

  return (
    <div ref={ref} className="relative overflow-hidden" style={{ height }}>
      <motion.div style={{ y }} className="absolute inset-0" >
        <div className="absolute" style={{ top: -80, left: 0, right: 0, bottom: -80 }}>
          <img src={src} alt="" className="w-full h-full object-cover" />
        </div>
      </motion.div>
      <div className={`absolute inset-0 ${overlay}`} />
      <div className="relative z-10 h-full">{children}</div>
    </div>
  )
}

// ─── Hero live widget — fixed 3-slot, no layout shift ─────────────────────────
const INIT = [{ id: 0, good: true }, { id: 1, good: false }, { id: 2, good: true }]

function LiveWidget() {
  const [rating, setRating] = useState(4.2)
  const [feed, setFeed] = useState(INIT)
  const nid = useRef(INIT.length)

  useEffect(() => {
    const id = setInterval(() => {
      const good = Math.random() > 0.3
      setFeed((p) => [{ id: nid.current++, good }, p[0], p[1]])
      if (good) setRating((r) => Math.min(4.9, +(r + 0.02).toFixed(2)))
    }, 2400)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="relative w-full max-w-[380px] mx-auto lg:mx-0 lg:ml-auto">
      <div className="absolute -inset-16 rounded-full bg-[#FFE100]/4 blur-[100px] pointer-events-none" />
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.4, duration: 0.7 }}
        className="relative rounded-[28px] overflow-hidden border border-[#222] bg-[#0D0D0D]"
        style={{ boxShadow: "0 48px 120px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,225,0,0.04)" }}
      >
        <div className="px-6 pt-6 pb-5 border-b border-[#181818]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <GoogleG size={15} />
              <span className="text-[11px] font-semibold text-white/65 tracking-wide">Google Business</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FFE100]/8 border border-[#FFE100]/15">
              <motion.div animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1.8, repeat: Infinity }}
                className="w-1.5 h-1.5 rounded-full bg-[#FFE100]" />
              <span className="text-[10px] font-bold text-[#FFE100] tracking-widest">LIVE</span>
            </div>
          </div>
          <div className="flex items-end gap-3">
            <motion.span key={rating.toFixed(1)} initial={{ scale: 1.1 }} animate={{ scale: 1 }} transition={{ duration: 0.18 }}
              className="text-[68px] font-black leading-none text-[#FFE100]" style={{ fontVariantNumeric: "tabular-nums" }}>
              {rating.toFixed(1)}
            </motion.span>
            <span className="text-sm text-white/20 mb-2.5">/&nbsp;5.0</span>
          </div>
          <div className="flex gap-1 mt-2">
            {[1,2,3,4,5].map(i => (
              <Star key={i} size={13} className={i <= Math.round(rating) ? "fill-[#FFE100] text-[#FFE100]" : "fill-[#FFE100]/12 text-[#FFE100]/12"} />
            ))}
          </div>
        </div>
        <div className="px-5 py-4">
          <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-white/18 mb-3">Review Routing — Live</p>
          <div className="flex flex-col gap-2">
            {feed.map(r => (
              <motion.div key={r.id} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}
                className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl"
                style={{ background: r.good ? "rgba(255,225,0,0.04)" : "rgba(255,255,255,0.025)", border: `1px solid ${r.good ? "rgba(255,225,0,0.09)" : "rgba(255,255,255,0.055)"}` }}>
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {Array.from({ length: r.good ? 5 : 2 }).map((_, i) => (
                      <Star key={i} size={11} className="fill-[#FFE100] text-[#FFE100]" />
                    ))}
                  </div>
                  <span className="text-xs font-medium" style={{ color: r.good ? "rgba(255,225,0,0.7)" : "rgba(255,255,255,0.3)" }}>
                    {r.good ? "Happy customer" : "Complaint"}
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full shrink-0"
                  style={{ background: r.good ? "rgba(66,133,244,0.10)" : "rgba(255,225,0,0.08)", color: r.good ? "#4285F4" : "#FFE100", border: `1px solid ${r.good ? "rgba(66,133,244,0.18)" : "rgba(255,225,0,0.14)"}` }}>
                  {r.good ? "→ Google" : "🛡 Shielded"}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Testimonials ─────────────────────────────────────────────────────────────
const TESTIMONIALS = [
  {
    // Real testimonial from vlyr.io
    quote: "We were losing customers to competitors with more Google reviews. VLYR changed that — now every happy customer at the counter is automatically pushed to leave us a review, and the unhappy ones get resolved before they post anything publicly.",
    name: "Mark I.",
    role: "Owner",
    business: "Presto Pizza",
    location: "Woodbridge, VA",
    photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&auto=format&fit=crop&q=85",
  },
  {
    quote: "I used to find out about a problem from a friend who saw it on Google. Now I know about it the moment it happens — before the customer even leaves. It has completely changed how I manage this shop.",
    name: "James R.",
    role: "Owner",
    business: "Cuts & Culture Barbershop",
    location: "Atlanta, GA",
    photo: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=300&h=300&auto=format&fit=crop&q=85",
  },
  {
    quote: "Setup took less than an hour. We put the stickers on every table and started getting feedback the same day. Complaints come straight to me now — not to Google.",
    name: "Diana M.",
    role: "Co-owner",
    business: "The Corner Kitchen",
    location: "Austin, TX",
    photo: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=300&h=300&auto=format&fit=crop&q=85",
  },
]

function TestimonialCarousel() {
  const [current, setCurrent] = useState(0)
  const [dir, setDir] = useState(1)

  const advance = (next: number) => {
    setDir(next > current ? 1 : -1)
    setCurrent(next)
  }

  useEffect(() => {
    const id = setInterval(() => {
      setDir(1)
      setCurrent((p) => (p + 1) % TESTIMONIALS.length)
    }, 5500)
    return () => clearInterval(id)
  }, [])

  const t = TESTIMONIALS[current]

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-16 py-24">
      <AnimatePresence mode="wait" custom={dir}>
        <motion.div
          key={current}
          custom={dir}
          initial={{ opacity: 0, x: dir * 48 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: dir * -48 }}
          transition={{ duration: 0.45, ease: "easeInOut" }}
          className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20"
        >
          {/* Portrait */}
          <div className="shrink-0">
            <div className="relative">
              <div className="w-36 h-36 lg:w-44 lg:h-44 rounded-full overflow-hidden border-4 border-[#FFE100]/25">
                <img src={t.photo} alt={t.name} className="w-full h-full object-cover" />
              </div>
              <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-[#FFE100] flex items-center justify-center">
                <Quote size={16} className="text-black" />
              </div>
            </div>
          </div>

          {/* Quote */}
          <div className="flex flex-col gap-5">
            <div className="flex gap-0.5">
              {[1,2,3,4,5].map(i => <Star key={i} size={16} className="fill-[#FFE100] text-[#FFE100]" />)}
            </div>
            <p className="text-[17px] sm:text-[20px] lg:text-[26px] font-bold text-white leading-snug">
              "{t.quote}"
            </p>
            <div>
              <p className="text-sm font-bold text-white">{t.name}</p>
              <p className="text-sm text-white/70">{t.role}, {t.business} · {t.location}</p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation dots */}
      <div className="flex items-center gap-3 mt-10">
        {TESTIMONIALS.map((_, i) => (
          <button
            key={i}
            onClick={() => advance(i)}
            aria-label={`Testimonial ${i + 1}`}
            className="h-1.5 rounded-full transition-all duration-300"
            style={{
              width: i === current ? 32 : 6,
              background: i === current ? "#FFE100" : "rgba(255,255,255,0.3)",
            }}
          />
        ))}
      </div>
    </div>
  )
}

// ─── How It Works carousel ────────────────────────────────────────────────────
const CAROUSEL_ITEMS = [
  {
    icon: ShieldCheck,
    title: "Feedback gets routed",
    body: "4–5 star ratings go straight to your Google listing. 1–3 star feedback is captured privately — only you see it.",
  },
  {
    icon: Bell,
    title: "You get an instant alert",
    body: "The moment a complaint is submitted, an SMS is sent to you. You can reach the customer before they open Google.",
  },
  {
    icon: TrendingUp,
    title: "Your rating climbs",
    body: "Happy customers stack up on Google. Unhappy ones get resolved privately. Your public score improves automatically.",
  },
  {
    icon: BarChart3,
    title: "You track everything",
    body: "Every scan, review, and order lives in your Command Center dashboard — visible in real time, any time.",
  },
]

function HowItWorksCarousel() {
  const [active, setActive] = useState(0)
  const trackRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const id = setInterval(() => setActive((p) => (p + 1) % CAROUSEL_ITEMS.length), 3600)
    return () => clearInterval(id)
  }, [])

  return (
    <div>
      {/* Desktop: all 4 visible, active highlighted */}
      <div className="hidden md:grid md:grid-cols-4 gap-4">
        {CAROUSEL_ITEMS.map((item, i) => (
          <motion.div
            key={i}
            onClick={() => setActive(i)}
            animate={{
              opacity: i === active ? 1 : 0.45,
              y: i === active ? -4 : 0,
            }}
            transition={{ duration: 0.4 }}
            className="flex flex-col gap-4 p-6 rounded-2xl cursor-pointer transition-colors"
            style={{
              background: i === active ? "rgba(255,225,0,0.05)" : "#0E0E0E",
              border: `1px solid ${i === active ? "rgba(255,225,0,0.2)" : "rgba(26,26,26,1)"}`,
            }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: i === active ? "rgba(255,225,0,0.1)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${i === active ? "rgba(255,225,0,0.2)" : "rgba(255,255,255,0.06)"}`,
              }}
            >
              <item.icon size={18} className={i === active ? "text-[#FFE100]" : "text-white/60"} />
            </div>
            <div>
              <h4 className={`text-sm font-bold mb-1.5 ${i === active ? "text-white" : "text-white/70"}`}>{item.title}</h4>
              <p className={`text-xs leading-relaxed ${i === active ? "text-white/70" : "text-white/55"}`}>{item.body}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Mobile: sliding single card — track is N×100% wide so each item = 100% of visible window */}
      <div ref={trackRef} className="md:hidden overflow-hidden rounded-2xl">
        <motion.div
          animate={{ x: `-${active * (100 / CAROUSEL_ITEMS.length)}%` }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="flex"
          style={{ width: `${CAROUSEL_ITEMS.length * 100}%` }}
        >
          {CAROUSEL_ITEMS.map((item, i) => (
            <div key={i} style={{ width: `${100 / CAROUSEL_ITEMS.length}%` }}
              className="shrink-0 p-6 bg-[#0E0E0E] border border-[#1A1A1A] rounded-2xl">
              <div className="w-10 h-10 rounded-xl bg-[#FFE100]/8 border border-[#FFE100]/14 flex items-center justify-center mb-4">
                <item.icon size={18} className="text-[#FFE100]" />
              </div>
              <h4 className="text-sm font-bold text-white mb-1.5">{item.title}</h4>
              <p className="text-xs text-white/70 leading-relaxed">{item.body}</p>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Dots */}
      <div className="flex gap-2 mt-5">
        {CAROUSEL_ITEMS.map((_, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            className="h-1.5 rounded-full transition-all duration-300"
            style={{ width: i === active ? 32 : 6, background: i === active ? "#FFE100" : "rgba(255,255,255,0.15)" }}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function MerchantIntakePage() {
  const router = useRouter()
  const [navigating, setNavigating] = useState<string | null>(null)
  const go = (path: string) => { setNavigating(path); router.push(path) }

  if (navigating) {
    return <VLYRLoader variant="full" message={navigating === "/onboarding" ? "Preparing onboarding..." : "Loading Command Center..."} />
  }

  return (
    <main className="min-h-svh flex flex-col bg-[#0A0A0A] text-white overflow-x-hidden">

      {/* ══ HEADER ═══════════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 h-16 border-b border-[#E5E5E5] bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-16 h-full flex items-center justify-between">
          <img src="/images/vlyr-logo.png" alt="VLYR" className="h-7 w-auto" />
          <div className="flex items-center gap-3">
            <button onClick={() => go("/auth/login")} className="text-sm text-[#595959] font-medium hover:text-[#0A0A0A] transition-colors">Login</button>
            <button onClick={() => go("/onboarding")}
              className="flex items-center gap-1.5 bg-[#0A0A0A] text-white text-sm font-bold px-5 py-2.5 rounded-full hover:bg-[#222] active:scale-95 transition-all">
              Get Started <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* ══ 1 — HERO ═════════════════════════════════════════════════════════
          Dark, 50/50 split, live widget right
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="relative w-full max-w-7xl mx-auto px-6 lg:px-16 pt-20 pb-28 lg:pt-28 lg:pb-36 flex flex-col lg:flex-row items-center gap-16">
        <div className="absolute top-0 left-1/3 w-[600px] h-[500px] rounded-full bg-[#FFE100]/3 blur-[130px] pointer-events-none" />
        <div className="relative flex-1 flex flex-col gap-8 max-w-xl">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="flex items-center gap-2.5 w-fit px-4 py-1.5 rounded-full bg-[#FFE100]/10 border border-[#FFE100]/20">
            <div className="w-2 h-2 rounded-full bg-[#FFE100]" />
            <span className="text-xs font-bold text-[#FFE100] tracking-wider">Reputation management for local businesses</span>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h1 className="text-[34px] sm:text-[44px] md:text-[54px] lg:text-[60px] font-black leading-[1.03] tracking-tight">
              Stop Bad Reviews.<br /><span className="text-[#FFE100]">Amplify the Good Ones.</span>
            </h1>
            <p className="mt-6 text-lg text-white/70 leading-relaxed max-w-lg">
              VLYR intercepts unhappy customers before they reach Google — and routes 5-star feedback directly to your listing. Automatically, every day.
            </p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="flex flex-col sm:flex-row gap-3">
            <button onClick={() => go("/onboarding")}
              className="group flex items-center justify-center gap-2 bg-[#FFE100] text-black px-8 py-4 rounded-xl font-bold text-[15px] hover:bg-[#FFE100]/90 hover:shadow-[0_0_40px_rgba(255,225,0,0.22)] active:scale-[0.98] transition-all">
              Activate Your Shield <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
            </button>
            <button onClick={() => go("/auth/login")}
              className="flex items-center justify-center px-8 py-4 rounded-xl text-sm text-white/70 border border-[#222] hover:border-white/14 hover:text-white/75 transition-all">
              Already a member
            </button>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="flex items-center gap-4 pt-1">
            <div className="flex -space-x-2.5">
              {["M","J","A","R","K"].map((l,i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-[#0A0A0A] bg-[#1A1A1A] flex items-center justify-center text-[10px] font-bold text-white/70">{l}</div>
              ))}
            </div>
            <div>
              <div className="flex gap-0.5 mb-0.5">{[1,2,3,4,5].map(i => <Star key={i} size={12} className="fill-[#FFE100] text-[#FFE100]" />)}</div>
              <p className="text-xs text-white/60">Trusted by local business owners</p>
            </div>
          </motion.div>
        </div>
        <div className="relative flex-1 w-full"><LiveWidget /></div>
      </section>

      {/* ══ 2 — BOLD STATEMENT BAND ══════════════════════════════════════════
          White, editorial typography
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="bg-white border-y border-[#E5E5E5]">
        <div className="max-w-7xl mx-auto px-6 lg:px-16 py-20 lg:py-28 flex flex-col lg:flex-row items-end gap-12 lg:gap-24">
          <motion.div initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="flex-1 min-w-0">
            <div className="w-12 h-1 bg-[#FFE100] mb-8" />
            <h2 className="text-[36px] sm:text-[48px] md:text-[64px] lg:text-[76px] font-black text-[#0A0A0A] leading-[0.95] tracking-tight">
              A bad review<br />
              <span className="italic font-black text-[#0A0A0A]/20">stays</span>{" "}
              on Google<br />
              <span className="text-[#FFE100]">forever.</span>
            </h2>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="flex-1 flex flex-col gap-6 max-w-md pb-2">
            <p className="text-[17px] text-[#444] leading-relaxed">
              Most business owners discover a 1-star review days after it posts. By then, every potential customer who searched for them has already seen it and moved on.
            </p>
            <p className="text-[17px] text-[#444] leading-relaxed">
              VLYR changes that. Unhappy customers are intercepted the moment they finish their experience — before they ever open Google.
            </p>
            <button onClick={() => go("/onboarding")}
              className="group flex items-center gap-2 w-fit bg-[#0A0A0A] text-white px-7 py-3.5 rounded-xl font-bold text-sm hover:bg-[#1A1A1A] transition-all mt-2">
              See how it works <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* ══ 3 — FULL-BLEED PARALLAX IMAGE BAND ══════════════════════════════
          Leidos-style: real photography + dark overlay + editorial copy
      ══════════════════════════════════════════════════════════════════════ */}
      <Parallax src={IMG.restaurantBand} height={560} overlay="bg-[#0A0A0A]/72">
        <div className="h-full flex items-center px-6 lg:px-20 max-w-7xl mx-auto w-full">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}
            className="max-w-xl">
            <div className="w-10 h-0.5 bg-[#FFE100] mb-6" />
            <h2 className="text-[26px] sm:text-[36px] md:text-[52px] font-black text-white leading-tight tracking-tight mb-5">
              "I found out about<br />a bad review{" "}
              <span className="text-[#FFE100]">three days late.</span><br />
              Never again."
            </h2>
            <p className="text-white/55 text-[16px] leading-relaxed mb-8 max-w-sm">
              VLYR gives business owners the visibility and speed to respond before a complaint becomes a public review.
            </p>
            <button onClick={() => go("/onboarding")}
              className="group inline-flex items-center gap-2 bg-[#FFE100] text-black px-8 py-3.5 rounded-xl font-bold text-sm hover:bg-[#FFE100]/90 transition-all">
              Protect your business <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
            </button>
          </motion.div>
        </div>
      </Parallax>

      {/* ══ 4 — HOW IT WORKS ═════════════════════════════════════════════════
          Contained within max-w-7xl — step 01 card + feature carousel
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="border-b border-[#141414]">
        <div className="max-w-7xl mx-auto px-6 lg:px-16 py-20">

          {/* Label */}
          <div className="flex items-center gap-4 mb-12">
            <div className="w-8 h-px bg-[#FFE100]/40" />
            <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-[#FFE100]">How It Works</p>
          </div>

          {/* Step 01 — contained card with photo */}
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }}
            className="grid grid-cols-1 lg:grid-cols-2 rounded-3xl border border-[#1A1A1A] overflow-hidden mb-10">
            <div className="p-8 lg:p-12 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#FFE100]/8 border border-[#FFE100]/14 flex items-center justify-center shrink-0">
                  <QrCode size={18} className="text-[#FFE100]" />
                </div>
                <span className="text-[11px] font-black tracking-[0.2em] text-white/18">01</span>
              </div>
              <h3 className="text-2xl lg:text-[28px] font-black text-white mb-4 leading-snug">Customer scans your QR</h3>
              <p className="text-[15px] text-white/70 leading-relaxed">
                Every VLYR sticker carries a unique QR code. At the table, on the delivery bag, at the checkout counter — customers scan it in seconds, right after their experience.
              </p>
            </div>
            <div className="relative min-h-[300px] overflow-hidden">
              <motion.img
                src={IMG.ownerPhone}
                alt="Customer scanning QR code"
                className="w-full h-full object-cover"
                style={{ minHeight: 300 }}
                initial={{ scale: 1.07 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.1, ease: "easeOut" }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0A]/25 to-transparent" />
            </div>
          </motion.div>

          {/* Feature carousel — what happens after the scan */}
          <HowItWorksCarousel />

        </div>
      </section>

      {/* ══ 5 — FEATURES BENTO GRID ══════════════════════════════════════════
          Light, asymmetric — Reputation Shield has a photo background
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="bg-[#F7F7F5] border-b border-[#E5E5E5]">
        <div className="max-w-7xl mx-auto px-6 lg:px-16 py-20 lg:py-28">
          <div className="flex items-end justify-between gap-8 mb-12 flex-wrap">
            <div>
              <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-[#595959] mb-3">Everything Included</p>
              <h2 className="text-[36px] md:text-[48px] font-black text-[#0A0A0A] leading-tight tracking-tight">
                The complete toolkit.<br />Nothing extra.
              </h2>
            </div>
            <button onClick={() => go("/onboarding")}
              className="group flex items-center gap-2 text-sm font-bold text-[#0A0A0A] border-b-2 border-[#FFE100] pb-0.5 hover:gap-3 transition-all shrink-0">
              Start onboarding <ArrowRight size={14} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Large: Reputation Shield — photo background */}
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="md:col-span-2 relative rounded-3xl overflow-hidden min-h-[320px] group cursor-default">
              <motion.img src={IMG.shopkeeper} alt="Business owner"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A]/90 via-[#0A0A0A]/50 to-[#0A0A0A]/20" />
              <div className="relative z-10 h-full flex flex-col justify-end p-8 lg:p-10">
                <div className="w-10 h-10 rounded-2xl bg-[#FFE100]/15 border border-[#FFE100]/25 flex items-center justify-center mb-4">
                  <ShieldCheck size={20} className="text-[#FFE100]" />
                </div>
                <h3 className="text-xl font-black text-white mb-2">Reputation Shield</h3>
                <p className="text-sm text-white/55 leading-relaxed max-w-md">
                  Unhappy customers submit feedback privately through VLYR. You get an SMS within seconds to resolve it — before it ever reaches Google.
                </p>
                <div className="flex gap-2 mt-4 flex-wrap">
                  {["Complaint intercepted", "Instant SMS alert", "Google rating protected"].map(t => (
                    <span key={t} className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-[#FFE100]/10 border border-[#FFE100]/20 text-[#FFE100]">{t}</span>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Small cards */}
            {[
              { icon: QrCode, title: "Pulse Check QR", body: "Physical stickers on bags, receipts, and counters. Every customer gets to rate — right at the moment of experience.", delay: 0.1 },
              { icon: Bell, title: "Instant Alerts", body: "Negative feedback triggers an SMS the moment it's submitted — giving you time to reach out before any public damage.", delay: 0.15 },
            ].map(f => (
              <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: f.delay }}
                className="bg-white border border-[#E5E5E5] rounded-3xl p-7 flex flex-col gap-4">
                <div className="w-11 h-11 rounded-2xl bg-[#0A0A0A] flex items-center justify-center">
                  <f.icon size={20} className="text-[#FFE100]" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#0A0A0A] mb-2">{f.title}</h3>
                  <p className="text-sm text-[#666] leading-relaxed">{f.body}</p>
                </div>
              </motion.div>
            ))}

            {/* Command Center — spans 2 */}
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
              className="md:col-span-2 bg-white border border-[#E5E5E5] rounded-3xl p-7 lg:p-9 flex flex-col gap-5">
              <div className="w-11 h-11 rounded-2xl bg-[#0A0A0A] flex items-center justify-center">
                <BarChart3 size={20} className="text-[#FFE100]" />
              </div>
              <div>
                <h3 className="text-base font-black text-[#0A0A0A] mb-2">Command Center</h3>
                <p className="text-sm text-[#666] leading-relaxed max-w-lg">
                  Every scan, review, shipment, and order in a single live dashboard. Know exactly what's happening with your reputation at any moment.
                </p>
              </div>
              <div className="flex gap-3 flex-wrap">
                {["Scan tracking", "Review feed", "Order history", "Supply management"].map(t => (
                  <span key={t} className="text-[11px] font-semibold px-3 py-1.5 rounded-full border border-[#E5E5E5] text-[#595959] bg-[#FAFAFA]">{t}</span>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══ 6 — TESTIMONIAL CAROUSEL ═════════════════════════════════════════ */}
      <section className="bg-[#0A0A0A] border-b border-[#141414]">
        <TestimonialCarousel />
      </section>

      {/* ══ 8 — SECOND PARALLAX IMAGE BAND ══════════════════════════════════
          CTA-style, full-bleed photo, invites to act
      ══════════════════════════════════════════════════════════════════════ */}
      <Parallax src={IMG.shopkeeper} height={440} overlay="bg-[#0A0A0A]/75">
        <div className="h-full flex items-center justify-center px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
            <div className="flex justify-center gap-1.5 mb-5">
              {[1,2,3,4,5].map(i => <Star key={i} size={18} className="fill-[#FFE100] text-[#FFE100]" />)}
            </div>
            <h2 className="text-[32px] md:text-[48px] font-black text-white leading-tight tracking-tight mb-6">
              Your Google rating is your<br />
              <span className="text-[#FFE100]">most valuable asset.</span>
            </h2>
            <button onClick={() => go("/onboarding")}
              className="group inline-flex items-center gap-2 bg-[#FFE100] text-black px-10 py-4 rounded-xl font-bold text-base hover:bg-[#FFE100]/90 hover:shadow-[0_0_40px_rgba(255,225,0,0.25)] active:scale-[0.98] transition-all">
              Activate Your Shield
              <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
            </button>
          </motion.div>
        </div>
      </Parallax>

      {/* ══ 9 — TRUST STRIP ══════════════════════════════════════════════════ */}
      <section className="bg-[#070707] border-b border-[#141414] px-6 py-10">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-center gap-8 md:gap-12">
          {[
            { icon: Lock, label: "256-bit SSL encryption" },
            { icon: ShieldCheck, label: "PCI DSS compliant" },
            { icon: CheckCircle2, label: "GDPR ready" },
            { icon: TrendingUp, label: "30-day money-back guarantee" },
          ].map((item, i) => (
            <motion.div key={item.label} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }}
              className="flex items-center gap-2 text-white/55">
              <item.icon size={13} />
              <span className="text-xs font-semibold">{item.label}</span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ══ FOOTER ═══════════════════════════════════════════════════════════ */}
      <footer className="border-t border-[#E5E5E5] bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-16 py-5 flex items-center justify-between">
          <img src="/images/vlyr-logo.png" alt="VLYR" className="h-6 w-auto" />
          <div className="flex items-center gap-5">
            <a href="/privacy" className="text-[11px] text-[#666666] hover:text-[#0A0A0A] transition-colors">Privacy</a>
            <a href="/terms" className="text-[11px] text-[#666666] hover:text-[#0A0A0A] transition-colors">Terms</a>
          </div>
          <span className="text-[11px] text-[#666666]">© 2025 VLYR Inc.</span>
        </div>
      </footer>

    </main>
  )
}
