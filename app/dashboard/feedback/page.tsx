"use client"

import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import { motion } from "framer-motion"
import useSWR, { mutate as globalMutate } from "swr"
import { useSearchParams } from "next/navigation"
import {
  ArrowLeft, CheckCircle2, Copy, Gift, Inbox, Mail, MessageSquare, MessageSquareWarning, Phone,
  RotateCcw, Search, Star, StickyNote, ThumbsUp, Clock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { VLYRLoader } from "@/components/vlyr-loader"
import { createClient } from "@/lib/supabase/client"
import { EmailButton, fetchActivity, type ActivityItem } from "@/components/customer-activity"
import { TextAlertsCard } from "@/components/text-alerts-card"
import { EmailAlertsCard } from "@/components/email-alerts-card"

type Filter = "follow-up" | "unhappy" | "happy" | "all"

const FILTERS: { id: Filter; label: string; test: (i: ActivityItem) => boolean }[] = [
  { id: "follow-up", label: "Needs follow-up", test: (i) => (i.rating ?? 5) <= 3 && !i.resolvedAt },
  { id: "unhappy", label: "1–3 stars", test: (i) => (i.rating ?? 5) <= 3 },
  { id: "happy", label: "4–5 stars", test: (i) => (i.rating ?? 0) >= 4 },
  { id: "all", label: "All", test: () => true },
]

const CONTACT_LABEL: Record<string, string> = { call: "Prefers a call", text: "Prefers a text", email: "Prefers email" }

async function fetchBusinessName() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return ""
  const { data } = await supabase.from("merchants").select("business_name").eq("id", user.id).single()
  return (data?.business_name as string) || ""
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })

function timeAgo(iso: string) {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return "now"
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}

const isUnhappy = (i: ActivityItem) => (i.rating ?? 5) <= 3
const initials = (i: ActivityItem) =>
  (i.name || i.email || "?").split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("")

export default function FeedbackPage() {
  return (
    <Suspense fallback={<VLYRLoader variant="card" message="Loading feedback..." />}>
      <FeedbackInbox />
    </Suspense>
  )
}

function FeedbackInbox() {
  const { data, error, isLoading, mutate } = useSWR("feedback-activity", () => fetchActivity(200), { refreshInterval: 30000 })
  const { data: businessName } = useSWR("feedback-business-name", fetchBusinessName)
  const [filter, setFilter] = useState<Filter>("follow-up")
  const [query, setQuery] = useState("")
  // ?id=... opens a specific rating (links from the Sticker Map)
  const linkedId = useSearchParams().get("id")
  const [selectedId, setSelectedId] = useState<string | null>(linkedId)
  const [mobileDetail, setMobileDetail] = useState(false)

  // Remember which ratings were new when the page opened, then clear the badges
  const newIds = useRef<Set<string> | null>(null)
  useEffect(() => {
    if (!data || newIds.current) return
    newIds.current = new Set(data.items.filter((i) => i.isNew).map((i) => i.id))
    if (data.stats.newGood + data.stats.newBad > 0) {
      fetch("/api/activity/seen", { method: "POST" }).then(() => globalMutate("feedback-unseen"))
    }
    // Start on "All" when nothing needs a reply, or when opening a specific rating
    if (data.stats.needsFollowUp === 0 || linkedId) setFilter("all")
    if (linkedId) setMobileDetail(true)
  }, [data])

  const items = data?.items ?? []
  const counts = useMemo(() => Object.fromEntries(FILTERS.map((f) => [f.id, items.filter(f.test).length])), [items])
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    const f = FILTERS.find((x) => x.id === filter)!
    return items.filter(f.test).filter((i) => {
      if (!q) return true
      const sticker = i.sticker ? String(i.sticker).padStart(4, "0") : ""
      return [i.name, i.email, i.phone, i.feedback, sticker, i.reward?.code].some((v) => v?.toLowerCase().includes(q))
    })
  }, [items, filter, query])

  const selected = shown.find((i) => i.id === selectedId) ?? shown[0] ?? null

  if (isLoading) return <VLYRLoader variant="card" message="Loading feedback..." />
  if (error) return <p className="text-sm text-red-400">{(error as Error).message}</p>

  const s = data!.stats
  const breakdown = [5, 4, 3, 2, 1].map((n) => ({ n, count: items.filter((i) => i.rating === n).length }))
  const maxCount = Math.max(1, ...breakdown.map((b) => b.count))
  const responseRate = s.privateFeedback ? Math.round((s.resolved / s.privateFeedback) * 100) : null
  const isNewItem = (i: ActivityItem) => newIds.current?.has(i.id) ?? i.isNew

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <MessageSquareWarning size={22} className="text-[#FFE100]" /> Customer Feedback
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Every rating from your stickers. 1–3 star feedback reaches only you, so you can make it right first.
          </p>
        </div>
        <span className="text-[11px] text-muted-foreground">Updates automatically</span>
      </div>

      <EmailAlertsCard />
      <TextAlertsCard />

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-2xl p-5 flex gap-5 xl:col-span-2">
          <div className="flex flex-col justify-center min-w-24">
            <span className="text-4xl font-bold text-foreground tracking-tight">{s.avgRating ?? "–"}</span>
            <Stars rating={Math.round(s.avgRating ?? 0)} size={14} />
            <span className="text-xs text-muted-foreground mt-1">{s.ratings} rating{s.ratings === 1 ? "" : "s"}</span>
          </div>
          <div className="flex-1 flex flex-col justify-center gap-1.5">
            {breakdown.map((b) => (
              <div key={b.n} className="flex items-center gap-2 text-xs">
                <span className="w-3 text-muted-foreground tabular-nums">{b.n}</span>
                <Star size={11} className="text-muted-foreground" />
                <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                  <div
                    className={`h-full rounded-full ${b.n >= 4 ? "bg-[#FFE100]" : "bg-red-400"}`}
                    style={{ width: `${(b.count / maxCount) * 100}%` }}
                  />
                </div>
                <span className="w-6 text-right text-muted-foreground tabular-nums">{b.count}</span>
              </div>
            ))}
          </div>
        </div>
        <SummaryCard
          icon={<Clock size={15} />}
          label="Needs follow-up"
          value={s.needsFollowUp}
          tone={s.needsFollowUp > 0 ? "alert" : "ok"}
          sub={responseRate === null ? "No complaints yet" : `${responseRate}% of complaints resolved`}
        />
        <SummaryCard
          icon={<ThumbsUp size={15} />}
          label="Invited to Google"
          value={s.sentToGoogle}
          sub={`${s.rewardsRedeemed} of ${s.rewardsIssued} rewards redeemed`}
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-secondary/50 border border-border w-fit">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => { setFilter(f.id); setSelectedId(null); setMobileDetail(false) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                filter === f.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
              <span className={`tabular-nums rounded-md px-1.5 ${f.id === "follow-up" && counts[f.id] > 0 ? "bg-red-500 text-white" : "bg-secondary"}`}>
                {counts[f.id]}
              </span>
            </button>
          ))}
        </div>
        <div className="relative md:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email, comment, sticker"
            className="w-full h-9 pl-9 pr-3 rounded-xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20"
          />
        </div>
      </div>

      {/* Inbox */}
      {shown.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-12 text-center">
          <Inbox size={28} className="text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">
            {items.length === 0 ? "No ratings yet" : query ? "No matches" : filter === "follow-up" ? "You're all caught up" : "Nothing here yet"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {items.length === 0
              ? "Put a sticker on every order. Ratings appear here within seconds of a scan."
              : filter === "follow-up" && !query
                ? "Every unhappy customer has been taken care of."
                : "Try another filter or search."}
          </p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-4 items-start">
          {/* List */}
          <ul className={`bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border ${mobileDetail ? "hidden lg:block" : ""}`}>
            {shown.map((i) => {
              const active = selected?.id === i.id
              const open = isUnhappy(i) && !i.resolvedAt
              return (
                <li key={i.id}>
                  <button
                    onClick={() => { setSelectedId(i.id); setMobileDetail(true) }}
                    className={`w-full text-left px-4 py-3.5 flex gap-3 transition-colors ${active ? "bg-secondary/70" : "hover:bg-secondary/40"}`}
                  >
                    <Avatar item={i} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground truncate">{i.name || i.email || "Customer"}</span>
                        {isNewItem(i) && <span className="w-2 h-2 rounded-full bg-[#FFE100] shrink-0" aria-label="New" />}
                        <span className="ml-auto text-[11px] text-muted-foreground shrink-0">{timeAgo(i.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Stars rating={i.rating ?? 0} size={11} />
                        {open && <Pill tone="red">Needs follow-up</Pill>}
                        {isUnhappy(i) && i.resolvedAt && <Pill tone="green">Resolved</Pill>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 truncate">{i.feedback || "No comment"}</p>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>

          {/* Detail */}
          {selected && (
            <div className={`lg:sticky lg:top-6 ${mobileDetail ? "" : "hidden lg:block"}`}>
              <button onClick={() => setMobileDetail(false)} className="lg:hidden mb-3 flex items-center gap-1.5 text-sm text-muted-foreground">
                <ArrowLeft size={16} /> All feedback
              </button>
              <Detail key={selected.id} item={selected} businessName={businessName || "our team"} isNew={isNewItem(selected)} onChanged={() => mutate()} />
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}

function Detail({ item, businessName, isNew, onChanged }: { item: ActivityItem; businessName: string; isNew: boolean; onChanged: () => void }) {
  const [note, setNote] = useState(item.note ?? "")
  const [savingNote, setSavingNote] = useState(false)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const unhappy = isUnhappy(item)
  const tel = item.phone?.replace(/[^\d+]/g, "")

  const patch = async (body: Record<string, unknown>) => {
    await fetch("/api/activity", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id, ...body }) })
    onChanged()
  }
  const copy = (text: string, what: string) => {
    navigator.clipboard?.writeText(text)
    setCopied(what)
    setTimeout(() => setCopied(null), 1200)
  }

  const timeline = [
    { at: item.createdAt, text: `Rated ${item.rating}★${item.sticker ? ` from sticker No. ${String(item.sticker).padStart(4, "0")}` : ""}` },
    item.reward && { at: item.createdAt, text: `Reward ${item.reward.code} given (${item.reward.offer})` },
    item.reward?.redeemedAt && { at: item.reward.redeemedAt, text: `Reward ${item.reward.code} redeemed` },
    item.resolvedAt && { at: item.resolvedAt, text: "Marked resolved" },
  ].filter(Boolean) as { at: string; text: string }[]

  return (
    <div className={`bg-card border rounded-2xl overflow-hidden ${unhappy && !item.resolvedAt ? "border-red-400/40" : "border-border"}`}>
      {/* Header */}
      <div className="p-5 flex items-start gap-4 border-b border-border">
        <Avatar item={item} large />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-foreground truncate">{item.name || "Customer"}</h2>
            {isNew && <Pill tone="yellow">New</Pill>}
            {unhappy && !item.resolvedAt && <Pill tone="red">Needs follow-up</Pill>}
            {unhappy && item.resolvedAt && <Pill tone="green">Resolved</Pill>}
            {!unhappy && <Pill tone="yellow">Invited to Google</Pill>}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Stars rating={item.rating ?? 0} size={15} />
            <span className="text-xs text-muted-foreground">{fmtDate(item.createdAt)}</span>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Comment */}
        <div>
          <SectionLabel>What they said</SectionLabel>
          {item.feedback ? (
            <blockquote className="text-[15px] text-foreground leading-relaxed whitespace-pre-line border-l-2 border-[#FFE100] pl-4">
              {item.feedback}
            </blockquote>
          ) : (
            <p className="text-sm text-muted-foreground">No comment left.</p>
          )}
        </div>

        {/* Contact */}
        <div>
          <SectionLabel>Contact</SectionLabel>
          <div className="rounded-xl border border-border divide-y divide-border">
            {item.email && (
              <ContactRow icon={<Mail size={14} />} value={item.email} highlight={item.contactPreference === "email"} onCopy={() => copy(item.email!, "email")} copied={copied === "email"} />
            )}
            {item.phone && (
              <ContactRow
                icon={<Phone size={14} />}
                value={item.phone}
                highlight={item.contactPreference === "call" || item.contactPreference === "text"}
                onCopy={() => copy(item.phone!, "phone")}
                copied={copied === "phone"}
              />
            )}
            {!item.email && !item.phone && <p className="text-sm text-muted-foreground p-3">No contact details.</p>}
          </div>
          {item.contactPreference && <p className="text-xs font-medium text-[#A68B00] mt-2">{CONTACT_LABEL[item.contactPreference]}</p>}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {item.email && <EmailButton item={item} businessName={businessName} primary={unhappy && item.contactPreference !== "call" && item.contactPreference !== "text"} />}
          {tel && (
            <a href={`tel:${tel}`}>
              <Button size="sm" variant={item.contactPreference === "call" ? "default" : "outline"} className="h-8 gap-1.5 rounded-lg text-xs">
                <Phone size={13} /> Call
              </Button>
            </a>
          )}
          {tel && (
            <a href={`sms:${tel}`}>
              <Button size="sm" variant={item.contactPreference === "text" ? "default" : "outline"} className="h-8 gap-1.5 rounded-lg text-xs">
                <MessageSquare size={13} /> Text
              </Button>
            </a>
          )}
          {unhappy &&
            (item.resolvedAt ? (
              <Button size="sm" variant="ghost" disabled={busy} onClick={async () => { setBusy(true); await patch({ resolved: false }); setBusy(false) }} className="h-8 gap-1.5 rounded-lg text-xs">
                <RotateCcw size={13} /> Reopen
              </Button>
            ) : (
              <Button size="sm" disabled={busy} onClick={async () => { setBusy(true); await patch({ resolved: true }); setBusy(false) }} className="h-8 gap-1.5 rounded-lg text-xs bg-green-600 hover:bg-green-600/90 text-white ml-auto">
                <CheckCircle2 size={13} /> Mark resolved
              </Button>
            ))}
        </div>

        {/* Reward */}
        {item.reward && (
          <div className="flex items-center gap-3 rounded-xl bg-[#FFE100]/5 border border-[#FFE100]/20 p-3">
            <Gift size={16} className="text-[#FFE100] shrink-0" />
            <div className="flex-1 min-w-0 text-sm">
              <span className="font-mono font-semibold text-foreground">{item.reward.code}</span>
              <span className="text-muted-foreground"> · {item.reward.offer}</span>
            </div>
            <span className="text-[11px] text-muted-foreground shrink-0">
              {item.reward.redeemedAt
                ? "Redeemed"
                : new Date(item.reward.expiresAt) < new Date()
                  ? "Expired"
                  : `Valid until ${new Date(item.reward.expiresAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`}
            </span>
          </div>
        )}

        {/* Private note */}
        <div>
          <SectionLabel>Private note</SectionLabel>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={1000}
            placeholder="Only your team sees this, e.g. Called Saturday, offered a free meal"
            className="w-full bg-secondary/40 border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 resize-none focus:outline-none focus:ring-1 focus:ring-foreground/20"
          />
          {note !== (item.note ?? "") && (
            <Button size="sm" disabled={savingNote} onClick={async () => { setSavingNote(true); await patch({ note }); setSavingNote(false) }} className="h-8 mt-2 gap-1.5 rounded-lg text-xs">
              <StickyNote size={13} /> {savingNote ? "Saving..." : "Save note"}
            </Button>
          )}
        </div>

        {/* Timeline */}
        <div>
          <SectionLabel>History</SectionLabel>
          <ol className="relative border-l border-border ml-1.5 space-y-3">
            {timeline.map((t, idx) => (
              <li key={idx} className="pl-4 relative">
                <span className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-border" />
                <p className="text-sm text-foreground">{t.text}</p>
                <p className="text-[11px] text-muted-foreground">{fmtDate(t.at)}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  )
}

function SummaryCard({ icon, label, value, sub, tone }: { icon: React.ReactNode; label: string; value: number; sub: string; tone?: "alert" | "ok" }) {
  return (
    <div className={`bg-card border rounded-2xl p-5 flex flex-col gap-1 ${tone === "alert" ? "border-red-400/50" : "border-border"}`}>
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">{icon} {label}</span>
      <span className={`text-3xl font-bold tracking-tight ${tone === "alert" ? "text-red-400" : "text-foreground"}`}>{value}</span>
      <span className="text-xs text-muted-foreground">{sub}</span>
    </div>
  )
}

function ContactRow({ icon, value, highlight, onCopy, copied }: { icon: React.ReactNode; value: string; highlight?: boolean; onCopy: () => void; copied: boolean }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 text-sm">
      <span className="text-muted-foreground">{icon}</span>
      <span className={`flex-1 min-w-0 truncate ${highlight ? "font-semibold text-foreground" : "text-foreground"}`}>{value}</span>
      <button onClick={onCopy} className="text-muted-foreground hover:text-foreground" aria-label={`Copy ${value}`}>
        {copied ? <CheckCircle2 size={14} className="text-green-500" /> : <Copy size={14} />}
      </button>
    </div>
  )
}

function Avatar({ item, large }: { item: ActivityItem; large?: boolean }) {
  const unhappy = isUnhappy(item)
  return (
    <div
      className={`${large ? "w-12 h-12 text-base" : "w-9 h-9 text-xs"} rounded-full shrink-0 flex items-center justify-center font-bold ${
        unhappy ? "bg-red-500/15 text-red-400" : "bg-[#FFE100]/15 text-[#C9A800]"
      }`}
    >
      {initials(item)}
    </div>
  )
}

function Stars({ rating, size }: { rating: number; size: number }) {
  const unhappy = rating <= 3
  return (
    <span className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          className={n <= rating ? (unhappy ? "text-red-400 fill-red-400" : "text-[#FFE100] fill-[#FFE100]") : "text-muted-foreground/25"}
        />
      ))}
    </span>
  )
}

function Pill({ tone, children }: { tone: "red" | "green" | "yellow"; children: React.ReactNode }) {
  const cls = {
    red: "bg-red-500/10 text-red-500 border-red-500/20",
    green: "bg-green-500/10 text-green-600 border-green-500/20",
    yellow: "bg-[#FFE100]/15 text-[#A68B00] border-[#FFE100]/30",
  }[tone]
  return <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md border shrink-0 ${cls}`}>{children}</span>
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">{children}</p>
}
