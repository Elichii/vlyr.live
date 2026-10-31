"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import useSWR from "swr"
import { CheckCircle2, Gift, Search, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { VLYRLoader } from "@/components/vlyr-loader"

interface Coupon {
  code: string
  offer: string
  customer_email: string | null
  customer_name: string | null
  expires_at: string
  redeemed_at: string | null
  created_at: string
}

interface RewardsData {
  settings: { enabled: boolean; offer: string; validDays: number }
  coupons: Coupon[]
}

type Lookup =
  | { status: "valid" | "just_redeemed" | "redeemed" | "expired"; coupon: Coupon }
  | { status: "not_found" }

async function fetchRewards(): Promise<RewardsData> {
  const res = await fetch("/api/rewards")
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? "Could not load rewards")
  return json
}

const fmt = (d: string) => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" })

export default function RewardsPage() {
  const { data, error, isLoading, mutate } = useSWR("rewards", fetchRewards)
  const [enabled, setEnabled] = useState(false)
  const [offer, setOffer] = useState("")
  const [validDays, setValidDays] = useState(7)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  const [code, setCode] = useState("")
  const [lookup, setLookup] = useState<Lookup | null>(null)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    if (!data) return
    setEnabled(data.settings.enabled)
    setOffer(data.settings.offer)
    setValidDays(data.settings.validDays)
  }, [data])

  if (isLoading) return <VLYRLoader variant="card" message="Loading rewards..." />

  const unsaved = !!data && (enabled !== data.settings.enabled || offer !== data.settings.offer || validDays !== data.settings.validDays)

  const save = async () => {
    setSaving(true)
    setSaveMsg(null)
    const res = await fetch("/api/rewards", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled, offer, validDays }),
    })
    const json = await res.json()
    setSaveMsg(res.ok ? "Saved" : json.error ?? "Could not save")
    setSaving(false)
    if (res.ok) mutate()
  }

  const check = async (redeem: boolean) => {
    setChecking(true)
    const res = await fetch("/api/rewards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, redeem }),
    })
    setLookup(await res.json())
    setChecking(false)
    if (redeem) mutate()
  }

  const coupons = data?.coupons ?? []
  const active = coupons.filter((c) => !c.redeemed_at && new Date(c.expires_at) > new Date()).length
  const redeemed = coupons.filter((c) => c.redeemed_at).length

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
          <Gift size={22} className="text-[#FFE100]" /> Rewards
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Thank customers for leaving feedback with a one-time code they show at the counter.
        </p>
      </div>
      {error && <p className="text-sm text-red-400">{(error as Error).message}</p>}

      {/* Redeem */}
      <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Check a customer&apos;s code</h2>
        <div className="flex gap-2">
          <Input
            value={code}
            onChange={(e) => { setCode(e.target.value.toUpperCase()); setLookup(null) }}
            placeholder="e.g. 7KQ-4XM"
            className="h-11 bg-secondary/50 border-border rounded-xl font-mono tracking-widest uppercase"
            maxLength={8}
          />
          <Button onClick={() => check(false)} disabled={checking || code.replace(/[^0-9A-Z]/gi, "").length !== 6} className="h-11 rounded-xl gap-1.5">
            <Search size={14} /> Check
          </Button>
        </div>
        {lookup && <LookupResult lookup={lookup} onRedeem={() => check(true)} busy={checking} />}
      </div>

      {/* Settings */}
      <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Reward for feedback</h2>
            <p className={`text-xs mt-0.5 ${data?.settings.enabled && data.settings.offer ? "text-green-500" : "text-muted-foreground"}`}>
              {data?.settings.enabled && data.settings.offer
                ? `On: customers get "${data.settings.offer}" (valid ${data.settings.validDays} days)`
                : "Off: customers don't get a code yet"}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={() => setEnabled((v) => !v)}
            className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? "bg-[#FFE100]" : "bg-secondary border border-border"}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${enabled ? "left-[22px]" : "left-0.5"}`} />
            <span className="sr-only">Offer a reward</span>
          </button>
        </div>
        <div className="grid sm:grid-cols-[1fr_140px] gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">What do customers get?</label>
            <Input
              value={offer}
              onChange={(e) => {
                setOffer(e.target.value)
                // Typing an offer means they want rewards on
                if (e.target.value.trim()) setEnabled(true)
              }}
              placeholder="10% off your next order"
              maxLength={80}
              className="h-11 bg-secondary/50 border-border rounded-xl"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Valid for (days)</label>
            <Input
              type="number"
              min={1}
              max={90}
              value={validDays}
              onChange={(e) => setValidDays(Math.max(1, Math.min(90, Number(e.target.value) || 1)))}
              className="h-11 bg-secondary/50 border-border rounded-xl font-mono"
            />
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Every customer who rates gets a code, whatever their rating. One active code per customer at a time. Rewards are
          never tied to posting on Google, which Google&apos;s rules don&apos;t allow.
        </p>
        <div className="flex items-center gap-3">
          <Button onClick={save} disabled={saving} className="rounded-xl bg-[#FFE100] text-[#111] hover:bg-[#FFE100]/90 font-semibold">
            {saving ? "Saving..." : "Save"}
          </Button>
          {unsaved && !saving && <span className="text-xs text-[#FFE100]">Unsaved changes</span>}
          {saveMsg && !unsaved && <span className={`text-xs ${saveMsg === "Saved" ? "text-green-500" : "text-red-400"}`}>{saveMsg}</span>}
        </div>
      </div>

      {/* Issued codes */}
      <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Codes given out</h2>
          <span className="text-[11px] text-muted-foreground">{active} active · {redeemed} redeemed</span>
        </div>
        {coupons.length === 0 ? (
          <p className="text-xs text-muted-foreground">No codes yet. They appear here when customers rate.</p>
        ) : (
          <ul className="divide-y divide-border">
            {coupons.map((c) => {
              const expired = !c.redeemed_at && new Date(c.expires_at) < new Date()
              return (
                <li key={c.code} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-mono font-semibold text-foreground">{c.code}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {c.customer_name || c.customer_email || "Customer"} · {c.offer}
                    </p>
                  </div>
                  <span className={`text-[11px] shrink-0 ${c.redeemed_at ? "text-green-500" : expired ? "text-muted-foreground" : "text-[#FFE100]"}`}>
                    {c.redeemed_at ? `Redeemed ${fmt(c.redeemed_at)}` : expired ? `Expired ${fmt(c.expires_at)}` : `Valid until ${fmt(c.expires_at)}`}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </motion.div>
  )
}

function LookupResult({ lookup, onRedeem, busy }: { lookup: Lookup; onRedeem: () => void; busy: boolean }) {
  if (lookup.status === "not_found") {
    return <p className="flex items-center gap-2 text-sm text-red-400"><XCircle size={16} /> No code like that for your business.</p>
  }
  const c = lookup.coupon
  const who = c.customer_name || c.customer_email || "Customer"
  if (lookup.status === "valid") {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-green-500/10 border border-green-500/20">
        <p className="text-sm text-foreground">
          <span className="font-semibold text-green-500">Valid:</span> {c.offer} for {who} (until {fmt(c.expires_at)})
        </p>
        <Button onClick={onRedeem} disabled={busy} size="sm" className="rounded-lg bg-green-600 hover:bg-green-600/90 text-white">
          Mark as used
        </Button>
      </div>
    )
  }
  if (lookup.status === "just_redeemed") {
    return <p className="flex items-center gap-2 text-sm text-green-500"><CheckCircle2 size={16} /> Redeemed: {c.offer} for {who}.</p>
  }
  if (lookup.status === "redeemed") {
    return <p className="flex items-center gap-2 text-sm text-red-400"><XCircle size={16} /> Already used on {fmt(c.redeemed_at!)}.</p>
  }
  return <p className="flex items-center gap-2 text-sm text-red-400"><XCircle size={16} /> Expired on {fmt(c.expires_at)}.</p>
}
