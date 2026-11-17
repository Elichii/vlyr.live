"use client"

/**
 * Right-hand panel on "Your business": an interactive rating simulator
 * built on the business's real Google numbers. Owners can see what a few
 * bad reviews would cost them, and what steady 5-star reviews would earn.
 * Every number here is calculated from their own rating and review count.
 */
import { useMemo, useState } from "react"
import { BellRing, CalendarClock, MessageCircleReply, Scale, ShieldAlert, Sparkles, Star, TrendingDown, TrendingUp, Users } from "lucide-react"

interface Props {
  businessName: string
  rating: number | null
  totalReviews: number | null
  logoUrl: string | null
}

const round1 = (n: number) => Math.round(n * 10) / 10
const avg = (sum: number, count: number) => (count > 0 ? sum / count : 0)

function StarRow({ value, size = 18 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = Math.max(0, Math.min(1, value - (i - 1)))
        return (
          <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
            <Star size={size} className="absolute inset-0 text-white/15 fill-white/15" />
            <span className="absolute inset-0 overflow-hidden transition-[width] duration-300" style={{ width: `${fill * 100}%` }}>
              <Star size={size} className="text-[#FFE100] fill-[#FFE100]" />
            </span>
          </span>
        )
      })}
    </span>
  )
}

function Slider({ label, value, max, onChange, tone, suffix = "" }: {
  label: string; value: number; max: number; onChange: (v: number) => void; tone: "bad" | "good" | "plain"; suffix?: string
}) {
  const color = tone === "bad" ? "#FF5A4E" : tone === "good" ? "#FFE100" : "#FFFFFF"
  return (
    <label className="block">
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-[14px] text-white/80">{label}</span>
        <span className="text-xl font-bold tabular-nums" style={{ color }}>{value}{suffix}</span>
      </div>
      <input
        type="range" min={0} max={max} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none bg-white/10 cursor-pointer"
        style={{ accentColor: color, background: `linear-gradient(to right, ${color} ${(value / max) * 100}%, rgba(255,255,255,0.1) ${(value / max) * 100}%)` }}
      />
    </label>
  )
}

export function RatingSimulatorPanel({ businessName, rating, totalReviews, logoUrl }: Props) {
  // No Google rating yet: start from zero (never borrow numbers from elsewhere)
  const fresh = rating == null || !totalReviews
  const r0 = fresh ? 0 : rating!
  const n0 = fresh ? 0 : totalReviews!
  const name = businessName?.trim() || "Your business"
  const sum0 = r0 * n0

  const [bad, setBad] = useState(fresh ? 1 : 3)
  const [good, setGood] = useState(fresh ? 9 : 0)
  const [perWeek, setPerWeek] = useState(150)
  const [reviewRate, setReviewRate] = useState(5)

  const projectedCount = n0 + bad + good
  const projected = avg(sum0 + bad * 1 + good * 5, projectedCount)
  const shownNow = round1(r0)
  const shownThen = round1(projected)
  const delta = fresh ? 0 : round1(shownThen - shownNow)

  const facts = useMemo(() => {
    // 5-star reviews needed to cancel one 1-star review
    const cancelOne = r0 < 5 ? Math.ceil((r0 - 1) / (5 - r0) - 1e-9) : null
    // 1-star reviews until Google shows a lower number
    let dropAfter = 0
    while (dropAfter < 500 && round1(avg(sum0 + (dropAfter + 1), n0 + dropAfter + 1)) >= shownNow) dropAfter++
    dropAfter += 1
    // 1-star reviews until the rating shows below 4.0
    let toFour: number | null = null
    if (shownNow >= 4) {
      let k = 0
      while (k < 2000 && round1(avg(sum0 + k, n0 + k)) >= 4) k++
      toFour = k
    }
    // 5-star reviews to show the next tenth up
    let nextUp: number | null = null
    const target = round1(shownNow + 0.1)
    if (target <= 5) {
      let k = 0
      while (k < 5000 && round1(avg(sum0 + 5 * k, n0 + k)) < target) k++
      nextUp = k < 5000 ? k : null
    }
    // Starting from zero: what a single 1-star does to a brand-new rating
    const firstFive = round1((4 * 5 + 1) / 5)
    let backTo48 = 0
    while (backTo48 < 500 && round1((5 * backTo48 + 1) / (backTo48 + 1)) < 4.8) backTo48++
    return { cancelOne, dropAfter, toFour, nextUp, target, firstFive, backTo48 }
  }, [r0, n0, sum0, shownNow])

  // 90-day plan: happy customers who leave a 5-star review
  const newReviews90 = Math.round(perWeek * (reviewRate / 100) * 13)
  const rating90 = round1(avg(sum0 + 5 * newReviews90, n0 + newReviews90))

  return (
    <aside className="w-full h-svh overflow-y-auto bg-[#0B0B0C] text-white">
      <div className="w-full px-8 xl:px-12 2xl:px-16 py-10 flex flex-col gap-8">
        {/* Header */}
        <header className="flex items-center gap-4">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="w-14 h-14 rounded-2xl object-cover bg-white" />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-[#FFE100] text-[#0A0A0A] font-bold text-xl flex items-center justify-center">{name[0]?.toUpperCase()}</div>
          )}
          <div className="min-w-0">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#FFE100]">Rating simulator</p>
            <h2 className="text-2xl font-bold leading-tight truncate">{name}</h2>
          </div>
        </header>

        {/* Current rating */}
        <section className="rounded-3xl bg-white/[0.04] ring-1 ring-white/10 p-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-[13px] text-white/60">On Google today</p>
            <div className="flex items-end gap-3 mt-1">
              <span className="text-6xl font-bold leading-none tracking-tight">{fresh ? "—" : shownNow.toFixed(1)}</span>
              <span className="pb-1.5"><StarRow value={r0} size={20} /></span>
            </div>
            <p className="text-[14px] text-white/60 mt-2">{fresh ? "No Google reviews yet. Your first ones set the tone." : `from ${n0.toLocaleString()} reviews`}</p>
          </div>
          <Scale size={40} className="text-white/15 shrink-0" />
        </section>

        {/* What if */}
        <section className="rounded-3xl bg-white/[0.04] ring-1 ring-white/10 p-6 flex flex-col gap-6">
          <div>
            <h3 className="text-lg font-bold">{fresh ? "Your first reviews could be…" : "What if this month brings…"}</h3>
            <p className="text-[14px] text-white/60 mt-1">Move the sliders to see the rating Google would show.</p>
          </div>
          <Slider label="Unhappy customers posting 1★" value={bad} max={25} onChange={setBad} tone="bad" />
          <Slider label="Happy customers posting 5★" value={good} max={100} onChange={setGood} tone="good" />

          <div className="rounded-2xl bg-black/40 ring-1 ring-white/10 p-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-[13px] text-white/60">Google would show</p>
              <div className="flex items-end gap-3 mt-1">
                <span className={`text-5xl font-bold leading-none tabular-nums ${delta < 0 ? "text-[#FF5A4E]" : delta > 0 ? "text-[#7CFFB2]" : "text-white"}`}>{projectedCount ? shownThen.toFixed(1) : "—"}</span>
                {projectedCount > 0 && <span className="pb-1"><StarRow value={projected} size={16} /></span>}
              </div>
              <p className="text-[12px] text-white/45 mt-2">{projectedCount ? `Exact average ${projected.toFixed(2)} from ${projectedCount.toLocaleString()} reviews` : "Move a slider to start"}</p>
            </div>
            {!fresh && (
              <div className={`flex items-center gap-1.5 text-lg font-bold rounded-full px-3 py-1.5 ${delta < 0 ? "bg-[#FF5A4E]/15 text-[#FF8A80]" : delta > 0 ? "bg-[#7CFFB2]/10 text-[#7CFFB2]" : "bg-white/10 text-white/70"}`}>
                {delta < 0 ? <TrendingDown size={18} /> : delta > 0 ? <TrendingUp size={18} /> : null}
                {delta > 0 ? "+" : ""}{delta.toFixed(1)}
              </div>
            )}
          </div>
        </section>

        {/* The maths of your rating */}
        {fresh ? (
          <section className="flex flex-col gap-3">
            <h3 className="text-lg font-bold">Why your first reviews matter</h3>
            <div className="grid grid-cols-2 2xl:grid-cols-3 gap-3">
              <div className="rounded-2xl bg-white/[0.04] ring-1 ring-white/10 p-4">
                <p className="text-3xl font-bold text-[#FF8A80]">{facts.firstFive.toFixed(1)}</p>
                <p className="text-[13px] text-white/70 mt-1 leading-snug">is all you&apos;d show if 1 of your first 5 reviews is a 1★</p>
              </div>
              <div className="rounded-2xl bg-white/[0.04] ring-1 ring-white/10 p-4">
                <p className="text-3xl font-bold text-[#7CFFB2]">{facts.backTo48}</p>
                <p className="text-[13px] text-white/70 mt-1 leading-snug">five-star reviews needed to reach 4.8 after a single 1★</p>
              </div>
              <div className="rounded-2xl bg-white/[0.04] ring-1 ring-white/10 p-4">
                <p className="text-3xl font-bold text-[#FFE100]">1</p>
                <p className="text-[13px] text-white/70 mt-1 leading-snug">sticker per order is all it takes to start collecting them</p>
              </div>
            </div>
          </section>
        ) : (
        <section className="flex flex-col gap-3">
          <h3 className="text-lg font-bold">The maths behind your {shownNow.toFixed(1)}</h3>
          <div className="grid grid-cols-2 2xl:grid-cols-4 gap-3">
            {facts.cancelOne !== null && (
              <div className="rounded-2xl bg-white/[0.04] ring-1 ring-white/10 p-4">
                <p className="text-3xl font-bold text-[#FFE100]">{facts.cancelOne}</p>
                <p className="text-[13px] text-white/70 mt-1 leading-snug">five-star reviews to cancel out a single 1★</p>
              </div>
            )}
            <div className="rounded-2xl bg-white/[0.04] ring-1 ring-white/10 p-4">
              <p className="text-3xl font-bold text-[#FF8A80]">{facts.dropAfter}</p>
              <p className="text-[13px] text-white/70 mt-1 leading-snug">one-star review{facts.dropAfter === 1 ? "" : "s"} and Google shows {(shownNow - 0.1).toFixed(1)}</p>
            </div>
            {facts.nextUp !== null && (
              <div className="rounded-2xl bg-white/[0.04] ring-1 ring-white/10 p-4">
                <p className="text-3xl font-bold text-[#7CFFB2]">{facts.nextUp}</p>
                <p className="text-[13px] text-white/70 mt-1 leading-snug">more five-star reviews to reach {facts.target.toFixed(1)}</p>
              </div>
            )}
            {facts.toFour !== null && (
              <div className="rounded-2xl bg-white/[0.04] ring-1 ring-white/10 p-4">
                <p className="text-3xl font-bold text-white">{facts.toFour}</p>
                <p className="text-[13px] text-white/70 mt-1 leading-snug">one-star reviews to fall below 4.0</p>
              </div>
            )}
          </div>
        </section>

        )}

        {/* 90-day plan */}
        <section className="rounded-3xl bg-gradient-to-br from-[#FFE100]/15 to-transparent ring-1 ring-[#FFE100]/25 p-6 flex flex-col gap-5">
          <div className="flex items-center gap-2.5">
            <CalendarClock size={20} className="text-[#FFE100]" />
            <h3 className="text-lg font-bold">Your next 90 days with VLYR</h3>
          </div>
          <Slider label="Customers per week" value={perWeek} max={1000} onChange={(v) => setPerWeek(Math.max(10, v))} tone="plain" />
          <Slider label="Happy customers who leave a 5★" value={reviewRate} max={20} onChange={(v) => setReviewRate(Math.max(1, v))} tone="good" suffix="%" />
          <div className="flex items-center justify-between gap-4 rounded-2xl bg-black/40 ring-1 ring-white/10 p-5">
            <div>
              <p className="text-4xl font-bold text-[#FFE100] tabular-nums">+{newReviews90.toLocaleString()}</p>
              <p className="text-[13px] text-white/70">new 5★ reviews</p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold tabular-nums">{rating90.toFixed(1)}</p>
              <p className="text-[13px] text-white/70">rating in 90 days</p>
            </div>
          </div>
          <p className="text-[12px] text-white/45 -mt-2">Assumes every new review is 5★ and nothing else changes. Stickers at the counter make asking effortless.</p>
        </section>

        {/* Playbook */}
        <section className="flex flex-col gap-3 pb-6">
          <h3 className="text-lg font-bold flex items-center gap-2"><Sparkles size={18} className="text-[#FFE100]" /> Playbook</h3>
          {[
            { icon: BellRing, title: "Catch it before it's public", body: "When a sticker rating is 1–3★, VLYR texts you right away, so you can fix it while the customer is still nearby." },
            { icon: Users, title: "Ask at the happy moment", body: "Put stickers where customers smile: pickup counters, receipts, take-away bags. Asking at the right moment beats asking often." },
            { icon: MessageCircleReply, title: "Reply to every review", body: "Short, personal replies, good or bad, show future customers that someone is listening." },
            { icon: ShieldAlert, title: "Never pay for reviews", body: "Discounts in exchange for Google reviews break Google's rules and can get reviews removed. Earn them with great service instead." },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex gap-4 rounded-2xl bg-white/[0.03] ring-1 ring-white/10 p-4">
              <div className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center shrink-0"><Icon size={18} className="text-[#FFE100]" /></div>
              <div>
                <p className="text-[15px] font-semibold">{title}</p>
                <p className="text-[13px] text-white/65 leading-relaxed mt-0.5">{body}</p>
              </div>
            </div>
          ))}
        </section>
      </div>
    </aside>
  )
}
