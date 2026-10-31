"use client"

import { useMemo, useState } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { motion } from "framer-motion"
import useSWR from "swr"
import {
  ArrowRight, Crosshair, MapPin, MessageSquare, Navigation, Printer, QrCode, ScanLine, Search, Star, Sticker,
} from "lucide-react"
import { VLYRLoader, VLYRInlineLoader } from "@/components/vlyr-loader"
import type { MapPoint } from "@/components/sticker-map"

const StickerMap = dynamic(() => import("@/components/sticker-map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[420px] rounded-xl border border-border bg-secondary/40 flex items-center justify-center">
      <VLYRInlineLoader label="Loading map..." />
    </div>
  ),
})

// ── Data ─────────────────────────────────────────────────────────────
interface Rating {
  id: string
  stars: number | null
  feedback: string | null
  at: string
  customer: string | null
  resolved: boolean
  lat: number | null
  lng: number | null
  precise: boolean
  accuracy: number | null
  place: string | null
  device: string | null
}
interface StickerRow {
  id: string
  seq: number
  code: string
  printedAt: string
  scans: number
  lastScannedAt: string | null
  lastScanPlace: string | null
  rating: Rating | null
}
interface ScanEvent {
  labelId: string
  at: string
  lat: number | null
  lng: number | null
  place: string | null
  device: string | null
}
interface StickerData {
  business: { name: string; lat: number | null; lng: number | null; address: string | null }
  allowance: { limit: number | null; used: number; remaining: number | null }
  stickers: StickerRow[]
  scanEvents: ScanEvent[]
  locationTracking: boolean
}

async function fetchStickers(): Promise<StickerData> {
  const res = await fetch("/api/stickers")
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? "Could not load stickers")
  return json
}

// ── Helpers ──────────────────────────────────────────────────────────
const no = (seq: number) => `No. ${String(seq).padStart(4, "0")}`
const fmt = (iso: string) => new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
function ago(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))}m ago`
  if (s < 86400) return `${Math.round(s / 3600)}h ago`
  return `${Math.round(s / 86400)}d ago`
}
/** Miles between two points */
function miles(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 3958.8
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}
const fmtMiles = (m: number) => (m < 0.1 ? "at your store" : `${m < 10 ? m.toFixed(1) : Math.round(m)} mi away`)

type Status = "rated-good" | "rated-bad" | "scanned" | "waiting"
const statusOf = (s: StickerRow): Status =>
  s.rating ? ((s.rating.stars ?? 0) >= 4 ? "rated-good" : "rated-bad") : s.scans > 0 ? "scanned" : "waiting"

const PERIODS = [
  { id: "7", label: "7 days", days: 7 },
  { id: "30", label: "30 days", days: 30 },
  { id: "90", label: "90 days", days: 90 },
  { id: "all", label: "All time", days: null },
] as const
type PeriodId = (typeof PERIODS)[number]["id"]
type Show = "all" | "good" | "bad" | "scan"
type Tab = "all" | "rated" | "scanned" | "waiting"

// ── Page ─────────────────────────────────────────────────────────────
export default function StickerMapPage() {
  const { data, error, isLoading } = useSWR("sticker-map", fetchStickers, { refreshInterval: 30000 })
  const [period, setPeriod] = useState<PeriodId>("all")
  const [show, setShow] = useState<Show>("all")
  const [tab, setTab] = useState<Tab>("all")
  const [query, setQuery] = useState("")
  const [focusId, setFocusId] = useState<string | null>(null)

  const store = data?.business.lat != null && data?.business.lng != null
    ? { lat: data.business.lat, lng: data.business.lng, name: data.business.name || "Your store" }
    : null

  const since = useMemo(() => {
    const p = PERIODS.find((x) => x.id === period)!
    return p.days ? Date.now() - p.days * 86400000 : 0
  }, [period])

  // Map points: ratings with a location, plus scans that didn't lead to a rating
  const points = useMemo<MapPoint[]>(() => {
    if (!data) return []
    const bySticker = new Map(data.stickers.map((s) => [s.id, s]))
    const out: MapPoint[] = []
    for (const s of data.stickers) {
      const r = s.rating
      if (!r || r.lat == null || r.lng == null || new Date(r.at).getTime() < since) continue
      const good = (r.stars ?? 0) >= 4
      if ((show === "good" && !good) || (show === "bad" && good) || show === "scan") continue
      const dist = store ? fmtMiles(miles(store, { lat: r.lat, lng: r.lng })) : null
      out.push({
        id: s.id,
        lat: r.lat,
        lng: r.lng,
        kind: good ? "good" : "bad",
        precise: r.precise,
        title: `${no(s.seq)} · ${"★".repeat(r.stars ?? 0)}${"☆".repeat(5 - (r.stars ?? 0))}`,
        lines: [
          r.customer ? `${r.customer}` : "Customer",
          fmt(r.at),
          [r.place, dist].filter(Boolean).join(" · ") + (r.precise ? " (exact)" : " (approximate)"),
          r.feedback ? `“${r.feedback.slice(0, 90)}${r.feedback.length > 90 ? "…" : ""}”` : "",
        ].filter(Boolean),
        href: `/dashboard/feedback?id=${r.id}`,
        linkText: good ? "Open rating" : "Open feedback & follow up",
      })
    }
    if (show === "all" || show === "scan") {
      const seen = new Set<string>()
      for (const e of data.scanEvents) {
        const s = bySticker.get(e.labelId)
        if (!s || s.rating || seen.has(e.labelId) || e.lat == null || e.lng == null || new Date(e.at).getTime() < since) continue
        seen.add(e.labelId)
        out.push({
          id: s.id,
          lat: e.lat,
          lng: e.lng,
          kind: "scan",
          precise: false,
          title: `${no(s.seq)} · scanned, not rated yet`,
          lines: [fmt(e.at), [e.place, store ? fmtMiles(miles(store, { lat: e.lat, lng: e.lng })) : null].filter(Boolean).join(" · ") + " (approximate)", e.device ? `On ${e.device}` : ""].filter(Boolean),
        })
      }
    }
    return out
  }, [data, since, show, store?.lat, store?.lng]) // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) return <VLYRLoader variant="card" message="Loading your sticker map..." />
  if (error || !data) return <p className="text-sm text-red-400">{(error as Error)?.message ?? "Could not load"}</p>

  // ── Totals ──
  const stickers = data.stickers
  const printed = stickers.length
  const scanned = stickers.filter((s) => s.scans > 0).length
  const rated = stickers.filter((s) => s.rating).length
  const good = stickers.filter((s) => (s.rating?.stars ?? 0) >= 4).length
  const bad = rated - good
  const waiting = printed - scanned
  const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0)

  // ── Where customers are ──
  const located = points.filter((p) => p.kind !== "scan" || show === "scan" || show === "all")
  const placeCounts = new Map<string, { n: number; stars: number; rated: number }>()
  for (const s of stickers) {
    const place = s.rating?.place || s.lastScanPlace
    if (!place) continue
    const v = placeCounts.get(place) ?? { n: 0, stars: 0, rated: 0 }
    v.n++
    if (s.rating?.stars) { v.stars += s.rating.stars; v.rated++ }
    placeCounts.set(place, v)
  }
  const topPlaces = [...placeCounts.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 6)
  const buckets = [
    { label: "Under 1 mi", test: (m: number) => m < 1 },
    { label: "1–3 mi", test: (m: number) => m >= 1 && m < 3 },
    { label: "3–10 mi", test: (m: number) => m >= 3 && m < 10 },
    { label: "10+ mi", test: (m: number) => m >= 10 },
  ].map((b) => ({ ...b, n: store ? located.filter((p) => b.test(miles(store, p))).length : 0 }))
  const maxBucket = Math.max(1, ...buckets.map((b) => b.n))

  // ── Table ──
  const q = query.trim().toLowerCase()
  const rows = stickers
    .filter((s) =>
      tab === "all" ? true : tab === "rated" ? !!s.rating : tab === "scanned" ? s.scans > 0 && !s.rating : s.scans === 0,
    )
    .filter((s) => !q || [no(s.seq), s.code, s.rating?.customer, s.rating?.feedback, s.lastScanPlace, s.rating?.place].some((v) => v?.toLowerCase().includes(q)))
    .sort((a, b) => (b.lastScannedAt ?? "").localeCompare(a.lastScannedAt ?? "") || a.seq - b.seq)

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <MapPin size={22} className="text-[#FFE100]" /> Sticker Map
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Every sticker you&apos;ve printed: where it was scanned, what the customer said, and what&apos;s left to use.
          </p>
        </div>
        <Link href="/dashboard/supply" className="text-xs font-medium text-[#A68B00] hover:underline underline-offset-4 flex items-center gap-1">
          <Printer size={13} /> Print or reprint stickers
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Kpi icon={<Sticker size={15} />} label="Printed" value={printed} sub={data.allowance.limit ? `of ${data.allowance.limit} in your trial` : "stickers in use"} />
        <Kpi icon={<ScanLine size={15} />} label="Scanned" value={scanned} sub={`${pct(scanned, printed)}% of printed`} />
        <Kpi icon={<Star size={15} />} label="Rated" value={rated} sub={<><span className="text-[#A68B00] font-medium">{good} happy</span> · <span className="text-red-500 font-medium">{bad} unhappy</span></>} />
        <Kpi icon={<QrCode size={15} />} label="Waiting to be scanned" value={waiting} sub="still out on orders" />
        <Kpi
          icon={<Printer size={15} />}
          label="Can still print"
          value={data.allowance.remaining ?? "∞"}
          sub={data.allowance.remaining === 0 ? <Link href="/dashboard/upgrade" className="underline underline-offset-2">Upgrade for more</Link> : data.allowance.remaining === null ? "unlimited plan" : "new stickers"}
          tone={data.allowance.remaining === 0 ? "alert" : undefined}
        />
      </div>

      {/* Journey */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Sticker journey</p>
        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            { label: "Printed", n: printed },
            { label: "Scanned", n: scanned },
            { label: "Rated", n: rated },
            { label: "Invited to Google", n: good },
          ].map((step, i, all) => (
            <div key={step.label} className="flex flex-col items-center gap-1.5">
              <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
                <div className="h-full rounded-full bg-[#FFE100]" style={{ width: `${pct(step.n, all[0].n || 1)}%` }} />
              </div>
              <span className="text-lg font-bold text-foreground tabular-nums">{step.n}</span>
              <span className="text-[11px] text-muted-foreground">
                {step.label}
                {i > 0 && all[i - 1].n > 0 ? ` · ${pct(step.n, all[i - 1].n)}%` : ""}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Map + insights */}
      <div className="grid lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-4 items-start">
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1 p-1 rounded-lg bg-secondary/50 border border-border">
              {([
                ["all", "Everything"],
                ["good", "4–5★"],
                ["bad", "1–3★"],
                ["scan", "Scanned, no rating"],
              ] as [Show, string][]).map(([id, label]) => (
                <button key={id} onClick={() => setShow(id)} className={`px-2.5 py-1 rounded-md text-xs font-medium ${show === id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
                  {label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1 p-1 rounded-lg bg-secondary/50 border border-border">
              {PERIODS.map((p) => (
                <button key={p.id} onClick={() => setPeriod(p.id)} className={`px-2.5 py-1 rounded-md text-xs font-medium ${period === p.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <StickerMap store={store} points={points} focusId={focusId} onSelect={setFocusId} />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            <Legend color="#0A0A0A" ring="#FFE100" label="Your store" square />
            <Legend color="#EAB308" label="Happy (4–5★)" />
            <Legend color="#EF4444" label="Unhappy (1–3★)" />
            <Legend color="#9CA3AF" label="Scanned, not rated" />
            <span>Soft halo = approximate area</span>
          </div>
          {points.length === 0 && (
            <p className="text-xs text-muted-foreground bg-secondary/40 rounded-lg p-3 leading-relaxed">
              {stickers.length === 0
                ? "Print your first stickers to start seeing scans here."
                : "No locations to show yet for this filter. Approximate locations appear automatically once your app is live online; exact spots appear when customers choose to share their location."}
            </p>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-card border border-border rounded-2xl p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
              <Navigation size={12} /> Top places
            </p>
            {topPlaces.length === 0 ? (
              <p className="text-xs text-muted-foreground">Appears as stickers get scanned.</p>
            ) : (
              <ul className="space-y-2.5">
                {topPlaces.map(([place, v]) => (
                  <li key={place} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate text-foreground">{place}</span>
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                      {v.n} scan{v.n === 1 ? "" : "s"}{v.rated ? ` · ${(v.stars / v.rated).toFixed(1)}★` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="bg-card border border-border rounded-2xl p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
              <Crosshair size={12} /> Distance from your store
            </p>
            {!store ? (
              <p className="text-xs text-muted-foreground">
                <Link href="/dashboard/profile" className="underline underline-offset-2">Pin your store</Link> to see how far your orders travel.
              </p>
            ) : (
              <ul className="space-y-2">
                {buckets.map((b) => (
                  <li key={b.label} className="flex items-center gap-2 text-xs">
                    <span className="w-20 text-muted-foreground shrink-0">{b.label}</span>
                    <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                      <div className="h-full rounded-full bg-foreground/70" style={{ width: `${(b.n / maxBucket) * 100}%` }} />
                    </div>
                    <span className="w-6 text-right tabular-nums text-foreground">{b.n}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Every sticker */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border">
          <div className="flex flex-wrap gap-1 p-1 rounded-lg bg-secondary/50 border border-border w-fit">
            {([
              ["all", "All", printed],
              ["rated", "Rated", rated],
              ["scanned", "Scanned, not rated", scanned - rated],
              ["waiting", "Not scanned yet", waiting],
            ] as [Tab, string, number][]).map(([id, label, n]) => (
              <button key={id} onClick={() => setTab(id)} className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 ${tab === id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
                {label} <span className="tabular-nums rounded px-1 bg-secondary">{n}</span>
              </button>
            ))}
          </div>
          <div className="relative md:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Sticker no., customer, place"
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20"
            />
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Nothing here.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="px-4 py-2.5 font-semibold">Sticker</th>
                  <th className="px-4 py-2.5 font-semibold">Status</th>
                  <th className="px-4 py-2.5 font-semibold">Scans</th>
                  <th className="px-4 py-2.5 font-semibold">Last scanned</th>
                  <th className="px-4 py-2.5 font-semibold">Rating</th>
                  <th className="px-4 py-2.5 font-semibold">Customer</th>
                  <th className="px-4 py-2.5 font-semibold text-right"> </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((s) => {
                  const st = statusOf(s)
                  const r = s.rating
                  const onMap = points.some((p) => p.id === s.id)
                  const dist = store && r?.lat != null && r?.lng != null ? fmtMiles(miles(store, { lat: r.lat, lng: r.lng })) : null
                  return (
                    <tr
                      key={s.id}
                      onClick={() => onMap && setFocusId(s.id)}
                      className={`${onMap ? "cursor-pointer" : ""} ${focusId === s.id ? "bg-secondary/60" : "hover:bg-secondary/30"}`}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-mono font-semibold text-foreground">{no(s.seq)}</span>
                        <span className="block text-[11px] text-muted-foreground font-mono">{s.code}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap"><StatusPill status={st} resolved={r?.resolved} /></td>
                      <td className="px-4 py-3 tabular-nums text-foreground">{s.scans}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {s.lastScannedAt ? (
                          <>
                            <span className="text-foreground" title={fmt(s.lastScannedAt)}>{ago(s.lastScannedAt)}</span>
                            <span className="block text-[11px] text-muted-foreground">
                              {[r?.place || s.lastScanPlace, dist].filter(Boolean).join(" · ") || "Location not shared"}
                              {r?.precise ? " · exact" : ""}
                            </span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {r ? (
                          <span className="flex items-center gap-0.5" aria-label={`${r.stars} out of 5`}>
                            {[1, 2, 3, 4, 5].map((n) => (
                              <Star key={n} size={12} className={n <= (r.stars ?? 0) ? ((r.stars ?? 0) >= 4 ? "text-[#EAB308] fill-[#EAB308]" : "text-red-500 fill-red-500") : "text-muted-foreground/25"} />
                            ))}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-[220px]">
                        {r ? (
                          <>
                            <span className="block truncate text-foreground">{r.customer || "Customer"}</span>
                            {r.feedback && <span className="block truncate text-[11px] text-muted-foreground">“{r.feedback}”</span>}
                          </>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {r && (
                          <Link
                            href={`/dashboard/feedback?id=${r.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-xs font-medium text-foreground hover:underline underline-offset-4"
                          >
                            <MessageSquare size={12} /> {(r.stars ?? 0) <= 3 && !r.resolved ? "Follow up" : "View"} <ArrowRight size={11} />
                          </Link>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  )
}

function Kpi({ icon, label, value, sub, tone }: { icon: React.ReactNode; label: string; value: number | string; sub: React.ReactNode; tone?: "alert" }) {
  return (
    <div className={`bg-card border rounded-2xl p-4 flex flex-col gap-1 ${tone === "alert" ? "border-red-400/50" : "border-border"}`}>
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">{icon} {label}</span>
      <span className={`text-2xl font-bold tracking-tight tabular-nums ${tone === "alert" ? "text-red-500" : "text-foreground"}`}>{value}</span>
      <span className="text-[11px] text-muted-foreground">{sub}</span>
    </div>
  )
}

function Legend({ color, label, ring, square }: { color: string; label: string; ring?: string; square?: boolean }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`inline-block w-3 h-3 ${square ? "rounded-[3px]" : "rounded-full"}`} style={{ background: color, border: `2px solid ${ring ?? "#fff"}`, boxShadow: "0 0 0 1px rgba(0,0,0,.08)" }} />
      {label}
    </span>
  )
}

function StatusPill({ status, resolved }: { status: Status; resolved?: boolean }) {
  const map: Record<Status, [string, string]> = {
    "rated-good": ["Happy", "bg-[#FFE100]/15 text-[#A68B00] border-[#FFE100]/30"],
    "rated-bad": [resolved ? "Unhappy · resolved" : "Unhappy · follow up", resolved ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"],
    scanned: ["Scanned, no rating", "bg-secondary text-foreground border-border"],
    waiting: ["Not scanned yet", "bg-transparent text-muted-foreground border-border"],
  }
  const [label, cls] = map[status]
  return <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md border ${cls}`}>{label}</span>
}
