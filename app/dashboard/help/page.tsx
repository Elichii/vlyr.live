"use client"

/**
 * Help Center: a step-by-step guide, topics with full articles, a searchable
 * FAQ and contact options. Content lives in lib/help-content.ts.
 * Deep links: /dashboard/help?article=<id> or ?topic=<id>.
 */
import { Suspense, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import {
  ArrowLeft, ArrowRight, BellRing, Building2, Check, ChevronDown, ChevronRight, Clock, CreditCard, Gift, Inbox,
  Lightbulb, Lock, Mail, MapPin, Rocket, Search, Star, Sticker, ThumbsDown, ThumbsUp, Wrench, X, Info,
} from "lucide-react"
import { FAQ, GUIDE, SUPPORT_EMAIL, TOPICS, type Article, type Block, type Topic } from "@/lib/help-content"

const ICONS: Record<Topic["icon"], React.ElementType> = {
  rocket: Rocket, sticker: Sticker, star: Star, inbox: Inbox, bell: BellRing, google: Star, gift: Gift,
  map: MapPin, building: Building2, card: CreditCard, lock: Lock, wrench: Wrench,
}

const ALL_ARTICLES = TOPICS.flatMap((t) => t.articles.map((a) => ({ ...a, topic: t })))
const findArticle = (id: string | null) => ALL_ARTICLES.find((a) => a.id === id) ?? null

export default function HelpPage() {
  return (
    <Suspense fallback={null}>
      <HelpCenter />
    </Suspense>
  )
}

function HelpCenter() {
  const router = useRouter()
  const params = useSearchParams()
  const article = findArticle(params.get("article"))
  const topic = TOPICS.find((t) => t.id === params.get("topic")) ?? null
  const go = (q: string) => { router.push(`/dashboard/help${q}`); window.scrollTo({ top: 0 }) }

  if (article) return <ArticleView article={article} topic={article.topic} go={go} />
  if (topic) return <TopicView topic={topic} go={go} />
  return <Home go={go} />
}

/* ── Home ─────────────────────────────────────────────────────────── */

function Home({ go }: { go: (q: string) => void }) {
  const [query, setQuery] = useState("")
  const q = query.trim().toLowerCase()
  const results = useMemo(() => {
    if (q.length < 2) return null
    const words = q.split(/\s+/)
    const hit = (s: string) => words.every((w) => s.toLowerCase().includes(w))
    return {
      articles: ALL_ARTICLES.filter((a) => hit([a.title, a.summary, ...a.body.map(blockText)].join(" "))).slice(0, 8),
      faq: FAQ.filter((f) => hit(f.q + " " + f.a)).slice(0, 6),
    }
  }, [q])

  return (
    <div className="flex flex-col gap-16 pb-16">
      {/* Hero */}
      <section className="rounded-[32px] bg-[#0A0A0A] text-white px-6 md:px-12 py-14 md:py-20 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.1] pointer-events-none" style={{ backgroundImage: "radial-gradient(#FFE100 1px, transparent 1px)", backgroundSize: "18px 18px" }} />
        <div className="relative max-w-3xl mx-auto text-center">
          <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-[#FFE100]">VLYR Support</p>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mt-4">How can we help?</h1>
          <div className="relative mt-8">
            <Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-[#888888]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for stickers, text alerts, rewards…"
              className="w-full h-16 rounded-2xl bg-white text-[#0A0A0A] pl-14 pr-12 text-lg placeholder:text-[#9A9A9A] outline-none focus:ring-4 focus:ring-[#FFE100]/40"
              aria-label="Search help"
            />
            {query && (
              <button onClick={() => setQuery("")} aria-label="Clear search" className="absolute right-4 top-1/2 -translate-y-1/2 text-[#888888] hover:text-[#0A0A0A]"><X size={18} /></button>
            )}
          </div>
          {!results && (
            <div className="flex flex-wrap justify-center gap-2 mt-5">
              {["Print stickers", "Text alerts", "Rewards", "Won't scan"].map((s) => (
                <button key={s} onClick={() => setQuery(s)} className="text-sm px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/15 text-white/85">{s}</button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Search results */}
      {results && (
        <section className="max-w-4xl w-full mx-auto -mt-8">
          <p className="text-sm text-muted-foreground mb-4">
            {results.articles.length + results.faq.length === 0 ? `No results for “${query}”. Try different words, or contact us below.` : `Results for “${query}”`}
          </p>
          <div className="flex flex-col gap-3">
            {results.articles.map((a) => (
              <button key={a.id} onClick={() => go(`?article=${a.id}`)} className="text-left rounded-2xl border border-border bg-card p-5 hover:border-foreground/30 transition-colors flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">{a.topic.label}</p>
                  <p className="text-base font-semibold text-foreground mt-0.5">{a.title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{a.summary}</p>
                </div>
                <ChevronRight size={18} className="text-muted-foreground shrink-0" />
              </button>
            ))}
            {results.faq.map((f) => <FaqItem key={f.q} q={f.q} a={f.a} defaultOpen />)}
          </div>
        </section>
      )}

      {/* Step-by-step guide */}
      <Guide />

      {/* Topics */}
      <section>
        <SectionHeading title="Browse by topic" sub="Everything VLYR does, explained." />
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {TOPICS.map((t) => {
            const Icon = ICONS[t.icon]
            return (
              <button key={t.id} onClick={() => go(`?topic=${t.id}`)} className="group text-left rounded-3xl border border-border bg-card p-6 hover:shadow-[0_18px_40px_-24px_rgba(0,0,0,0.35)] hover:-translate-y-0.5 transition-all">
                <span className="w-12 h-12 rounded-2xl bg-[#FFE100]/15 text-[#8A7400] flex items-center justify-center"><Icon size={22} /></span>
                <p className="text-lg font-semibold text-foreground mt-5">{t.label}</p>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{t.description}</p>
                <p className="text-sm font-medium text-foreground mt-4 flex items-center gap-1 group-hover:gap-2 transition-all">
                  {t.articles.length} article{t.articles.length === 1 ? "" : "s"} <ArrowRight size={14} />
                </p>
              </button>
            )
          })}
        </div>
      </section>

      {/* Popular */}
      <section>
        <SectionHeading title="Popular articles" />
        <div className="grid lg:grid-cols-2 gap-x-10">
          {["print-at-home", "text-alerts", "customer-experience", "rewards", "feedback-inbox", "qr-wont-scan"].map((id) => {
            const a = findArticle(id)!
            return (
              <button key={id} onClick={() => go(`?article=${id}`)} className="text-left py-5 border-b border-border flex items-center gap-4 group">
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-foreground group-hover:underline underline-offset-4">{a.title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{a.summary}</p>
                </div>
                <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0"><Clock size={12} /> {a.minutes} min</span>
              </button>
            )
          })}
        </div>
      </section>

      {/* FAQ */}
      <section>
        <SectionHeading title="Frequently asked questions" />
        <div className="grid lg:grid-cols-2 gap-3 items-start">
          {FAQ.map((f) => <FaqItem key={f.q} q={f.q} a={f.a} />)}
        </div>
      </section>

      <Contact />
    </div>
  )
}

/* ── Interactive guide ────────────────────────────────────────────── */

function Guide() {
  const [active, setActive] = useState(0)
  const [done, setDone] = useState<Set<number>>(new Set())
  const step = GUIDE[active]
  const toggleDone = () => setDone((d) => { const n = new Set(d); if (n.has(active)) n.delete(active); else n.add(active); return n })

  return (
    <section>
      <SectionHeading title="Get started in 6 steps" sub="From sign-up to your first rating. Tick each step off as you go." />
      <div className="grid lg:grid-cols-[minmax(280px,380px)_1fr] gap-6">
        <ol className="flex flex-col gap-2">
          {GUIDE.map((g, i) => (
            <li key={g.title}>
              <button
                onClick={() => setActive(i)}
                className={`w-full text-left rounded-2xl px-4 py-3.5 flex items-center gap-3.5 transition-colors ${i === active ? "bg-[#0A0A0A] text-white" : "bg-card border border-border hover:border-foreground/30"}`}
              >
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${done.has(i) ? "bg-green-500 text-white" : i === active ? "bg-[#FFE100] text-[#0A0A0A]" : "bg-secondary text-foreground"}`}>
                  {done.has(i) ? <Check size={15} /> : i + 1}
                </span>
                <span className="text-[15px] font-semibold">{g.title}</span>
              </button>
            </li>
          ))}
          <li className="px-1 pt-2">
            <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
              <div className="h-full bg-green-500 transition-all" style={{ width: `${(done.size / GUIDE.length) * 100}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-2">{done.size} of {GUIDE.length} done</p>
          </li>
        </ol>

        <AnimatePresence mode="wait">
          <motion.div key={active} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }} className="rounded-3xl border border-border bg-card p-6 md:p-10 flex flex-col">
            <p className="text-sm font-semibold text-[#8A7400]">Step {active + 1} of {GUIDE.length}</p>
            <h3 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight mt-2">{step.title}</h3>
            <p className="text-base text-muted-foreground mt-2">{step.summary}</p>
            <ul className="mt-6 flex flex-col gap-4">
              {step.points.map((p) => (
                <li key={p} className="flex gap-3 text-[15px] text-foreground leading-relaxed">
                  <span className="w-6 h-6 rounded-full bg-[#FFE100]/20 text-[#8A7400] flex items-center justify-center shrink-0 mt-0.5"><Check size={13} /></span>
                  {p}
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-8 flex flex-wrap items-center gap-3">
              <Link href={step.action.href} className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-[#0A0A0A] text-white text-sm font-semibold hover:bg-[#1F1F1F]">
                {step.action.label} <ArrowRight size={15} />
              </Link>
              <button onClick={toggleDone} className={`inline-flex items-center gap-2 h-11 px-5 rounded-full border text-sm font-semibold ${done.has(active) ? "border-green-500 text-green-600 bg-green-500/5" : "border-border hover:border-foreground/40"}`}>
                <Check size={15} /> {done.has(active) ? "Done" : "Mark as done"}
              </button>
              <div className="ml-auto flex gap-2">
                <button disabled={active === 0} onClick={() => setActive(active - 1)} aria-label="Previous step" className="w-11 h-11 rounded-full border border-border flex items-center justify-center disabled:opacity-30"><ArrowLeft size={16} /></button>
                <button disabled={active === GUIDE.length - 1} onClick={() => setActive(active + 1)} aria-label="Next step" className="w-11 h-11 rounded-full border border-border flex items-center justify-center disabled:opacity-30"><ArrowRight size={16} /></button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  )
}

/* ── Topic & article views ────────────────────────────────────────── */

function TopicView({ topic, go }: { topic: Topic; go: (q: string) => void }) {
  const Icon = ICONS[topic.icon]
  return (
    <div className="flex flex-col gap-10 pb-16">
      <Breadcrumb items={[{ label: "Help", q: "" }, { label: topic.label }]} go={go} />
      <header className="flex items-center gap-5">
        <span className="w-16 h-16 rounded-3xl bg-[#FFE100]/15 text-[#8A7400] flex items-center justify-center"><Icon size={28} /></span>
        <div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground">{topic.label}</h1>
          <p className="text-base text-muted-foreground mt-2">{topic.description}</p>
        </div>
      </header>
      <div className="grid md:grid-cols-2 2xl:grid-cols-3 gap-4">
        {topic.articles.map((a) => (
          <button key={a.id} onClick={() => go(`?article=${a.id}`)} className="text-left rounded-3xl border border-border bg-card p-6 hover:border-foreground/30 transition-colors">
            <p className="text-lg font-semibold text-foreground">{a.title}</p>
            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{a.summary}</p>
            <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1"><Clock size={12} /> {a.minutes} min read</p>
          </button>
        ))}
      </div>
      <Contact />
    </div>
  )
}

function ArticleView({ article, topic, go }: { article: Article; topic: Topic; go: (q: string) => void }) {
  const [vote, setVote] = useState<"up" | "down" | null>(null)
  const idx = topic.articles.findIndex((a) => a.id === article.id)
  const next = topic.articles[idx + 1] ?? null

  return (
    <div className="grid xl:grid-cols-[260px_minmax(0,1fr)] gap-10 pb-16">
      <aside className="hidden xl:block">
        <div className="sticky top-8">
          <button onClick={() => go("")} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 mb-6"><ArrowLeft size={14} /> All help topics</button>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{topic.label}</p>
          <ul className="flex flex-col gap-1">
            {topic.articles.map((a) => (
              <li key={a.id}>
                <button onClick={() => go(`?article=${a.id}`)} className={`w-full text-left text-sm px-3 py-2 rounded-xl ${a.id === article.id ? "bg-secondary text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"}`}>{a.title}</button>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <article className="max-w-3xl w-full">
        <Breadcrumb items={[{ label: "Help", q: "" }, { label: topic.label, q: `?topic=${topic.id}` }, { label: article.title }]} go={go} />
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground mt-6 leading-tight">{article.title}</h1>
        <p className="text-lg text-muted-foreground mt-4 leading-relaxed">{article.summary}</p>
        <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1"><Clock size={12} /> {article.minutes} min read</p>

        <div className="mt-10 flex flex-col gap-6">
          {article.body.map((b, i) => <BlockView key={i} block={b} />)}
        </div>

        {article.action && (
          <Link href={article.action.href} className="mt-10 inline-flex items-center gap-2 h-12 px-6 rounded-full bg-[#0A0A0A] text-white text-sm font-semibold hover:bg-[#1F1F1F]">
            {article.action.label} <ArrowRight size={15} />
          </Link>
        )}

        <div className="mt-14 pt-8 border-t border-border flex flex-col sm:flex-row sm:items-center gap-4">
          <p className="text-sm font-medium text-foreground">{vote ? "Thanks for your feedback." : "Was this article helpful?"}</p>
          {!vote && (
            <div className="flex gap-2">
              <button onClick={() => setVote("up")} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full border border-border text-sm hover:border-foreground/40"><ThumbsUp size={14} /> Yes</button>
              <button onClick={() => setVote("down")} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full border border-border text-sm hover:border-foreground/40"><ThumbsDown size={14} /> No</button>
            </div>
          )}
          {vote === "down" && <a href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Help: ${article.title}`)}`} className="text-sm underline underline-offset-4">Tell us what was missing</a>}
        </div>

        {next && (
          <button onClick={() => go(`?article=${next.id}`)} className="mt-8 w-full text-left rounded-3xl border border-border bg-card p-6 hover:border-foreground/30 flex items-center gap-4">
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Next in {topic.label}</p>
              <p className="text-lg font-semibold text-foreground mt-1">{next.title}</p>
            </div>
            <ArrowRight size={18} />
          </button>
        )}
      </article>
    </div>
  )
}

/* ── Pieces ───────────────────────────────────────────────────────── */

function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case "p":
      return <p className="text-[17px] text-foreground/90 leading-[1.7]">{block.text}</p>
    case "list":
      return (
        <ul className="flex flex-col gap-3">
          {block.items.map((t) => (
            <li key={t} className="flex gap-3 text-[17px] text-foreground/90 leading-[1.6]"><span className="w-1.5 h-1.5 rounded-full bg-foreground/60 mt-[11px] shrink-0" />{t}</li>
          ))}
        </ul>
      )
    case "steps":
      return (
        <ol className="flex flex-col gap-4">
          {block.items.map((t, i) => (
            <li key={t} className="flex gap-4 text-[17px] text-foreground/90 leading-[1.6]">
              <span className="w-8 h-8 rounded-full bg-[#0A0A0A] text-[#FFE100] text-sm font-bold flex items-center justify-center shrink-0">{i + 1}</span>
              <span className="pt-0.5">{t}</span>
            </li>
          ))}
        </ol>
      )
    case "tip":
      return (
        <div className="rounded-2xl bg-[#FFFBDA] border border-[#F3E27A] p-5 flex gap-3">
          <Lightbulb size={18} className="text-[#8A7400] shrink-0 mt-0.5" />
          <p className="text-[15px] text-[#4D4100] leading-relaxed"><span className="font-semibold">Tip: </span>{block.text}</p>
        </div>
      )
    case "note":
      return (
        <div className="rounded-2xl bg-secondary/60 border border-border p-5 flex gap-3">
          <Info size={18} className="text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-[15px] text-foreground/80 leading-relaxed">{block.text}</p>
        </div>
      )
  }
}

function blockText(b: Block) {
  return "text" in b ? b.text : b.items.join(" ")
}

function FaqItem({ q, a, defaultOpen = false }: { q: string; a: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-2xl border border-border bg-card">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="w-full text-left px-5 py-4 flex items-center gap-4">
        <span className="flex-1 text-[15px] font-semibold text-foreground">{q}</span>
        <ChevronDown size={18} className={`text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <p className="px-5 pb-5 -mt-1 text-[15px] text-muted-foreground leading-relaxed">{a}</p>}
    </div>
  )
}

function SectionHeading({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">{title}</h2>
      {sub && <p className="text-base text-muted-foreground mt-1.5">{sub}</p>}
    </div>
  )
}

function Breadcrumb({ items, go }: { items: { label: string; q?: string }[]; go: (q: string) => void }) {
  return (
    <nav className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground" aria-label="Breadcrumb">
      {items.map((it, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight size={13} />}
          {it.q !== undefined ? <button onClick={() => go(it.q!)} className="hover:text-foreground">{it.label}</button> : <span className="text-foreground">{it.label}</span>}
        </span>
      ))}
    </nav>
  )
}

function Contact() {
  return (
    <section className="rounded-[32px] border border-border bg-card p-8 md:p-12 grid md:grid-cols-[1fr_auto] gap-6 items-center">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Still need help?</h2>
        <p className="text-base text-muted-foreground mt-2 max-w-2xl">Write to us and a real person will get back to you, usually within one business day. Include your business name and what you were trying to do.</p>
      </div>
      <a href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("VLYR help")}`} className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full bg-[#FFE100] text-[#0A0A0A] text-sm font-bold hover:bg-[#FFE100]/90">
        <Mail size={16} /> Email {SUPPORT_EMAIL}
      </a>
    </section>
  )
}
