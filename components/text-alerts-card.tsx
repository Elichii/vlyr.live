"use client"

/**
 * "Text me about unhappy customers": the manager confirms their mobile
 * number with a code, then every 1–3★ sticker rating is texted to them.
 */
import { useState } from "react"
import useSWR from "swr"
import { BellRing, Check, Loader2, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"

interface Settings {
  available: boolean
  enabled: boolean
  phone: string | null
  pendingPhone: string | null
  codeUndelivered?: boolean
}

const fetchSettings = async (): Promise<Settings> => {
  const res = await fetch("/api/sms-alerts")
  const json = await res.json()
  if (!res.ok) throw new Error(json.error)
  return json.settings
}

export function TextAlertsCard() {
  const { data: s, mutate } = useSWR("sms-alerts", fetchSettings, {
    // While a code is on its way, check every few seconds whether it was delivered
    refreshInterval: (d) => (d?.pendingPhone && !d.phone && !d.codeUndelivered ? 5000 : 0),
  })
  const [phone, setPhone] = useState("")
  const [code, setCode] = useState("")
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [changing, setChanging] = useState(false)
  // Typing a new number while a code is still waiting
  const [reenter, setReenter] = useState(false)

  if (!s?.available) return null

  const act = async (action: string, extra: Record<string, string> = {}, done?: string) => {
    setBusy(action)
    setError(null)
    setNote(null)
    try {
      const res = await fetch("/api/sms-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      })
      const json = await res.json()
      if (json.settings) await mutate(json.settings, { revalidate: false })
      if (!res.ok) throw new Error(json.error ?? "Something went wrong.")
      if (done) setNote(done)
      if (action === "verify") { setCode(""); setChanging(false) }
      if (action === "send_code") { setCode(""); setReenter(false) }
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.")
      return false
    } finally {
      setBusy(null)
    }
  }

  const confirmed = !!s.phone && !changing
  const waiting = !!s.pendingPhone && !confirmed && !reenter

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="flex items-start gap-3 lg:w-80 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
            <BellRing size={16} className="text-red-500" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Text alerts</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Get a text the moment a customer leaves 1–3 stars, so you can reach out while it still matters.
            </p>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          {confirmed && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Switch
                  checked={s.enabled}
                  disabled={!!busy}
                  onCheckedChange={(v) => act(v ? "enable" : "disable")}
                  aria-label="Text alerts on or off"
                />
                <span className="text-sm text-foreground">
                  {s.enabled ? "On" : "Off"} · texts go to <span className="font-mono">{s.phone}</span>
                </span>
              </div>
              <div className="flex items-center gap-2 sm:ml-auto">
                <Button size="sm" variant="outline" className="h-8 gap-1.5" disabled={!!busy || !s.enabled} onClick={() => act("test", {}, "Test text sent. It should arrive within a minute.")}>
                  {busy === "test" ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Send a test
                </Button>
                <Button size="sm" variant="ghost" className="h-8 text-muted-foreground" disabled={!!busy} onClick={() => { setChanging(true); setReenter(true); setNote(null); setError(null) }}>
                  Change number
                </Button>
              </div>
            </div>
          )}

          {!confirmed && !waiting && (
            <>
            <label className="text-xs font-medium text-foreground block mb-1.5">Your mobile number</label>
            <form
              className="flex flex-col sm:flex-row gap-2"
              onSubmit={(e) => { e.preventDefault(); act("send_code", { phone }) }}
            >
              <Input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="Your mobile, e.g. (202) 555-0123"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^\d+()\-\s.]/g, "").slice(0, 20))}
                className="h-10 sm:w-72 bg-background border-2 border-foreground/25 focus-visible:border-foreground text-base"
                aria-label="Mobile number for text alerts"
                autoFocus={changing}
              />
              <Button type="submit" size="sm" className="h-10 gap-1.5" disabled={!!busy || phone.replace(/\D/g, "").length < 10}>
                {busy === "send_code" && <Loader2 size={13} className="animate-spin" />} Text me a code
              </Button>
              {changing && (
                <Button type="button" size="sm" variant="ghost" className="h-9 text-muted-foreground" onClick={() => { setChanging(false); setReenter(false) }}>
                  Cancel
                </Button>
              )}
            </form>
            </>
          )}

          {waiting && (
            <form className="flex flex-col sm:flex-row sm:items-center gap-2" onSubmit={(e) => { e.preventDefault(); act("verify", { code }, "Number confirmed. Text alerts are on.") }}>
              <Input
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="6-digit code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="h-10 sm:w-40 bg-background border-2 border-foreground/25 focus-visible:border-foreground font-mono tracking-widest text-base"
                aria-label="Code from the text"
                autoFocus
              />
              <Button type="submit" size="sm" className="h-10 gap-1.5" disabled={!!busy || code.length !== 6}>
                {busy === "verify" ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Confirm
              </Button>
              <span className="text-xs text-muted-foreground">
                Sent to <span className="font-mono">{s.pendingPhone}</span> ·{" "}
                <button type="button" className="underline hover:text-foreground" onClick={() => { setReenter(true); setError(null) }}>use a different number</button>
              </span>
            </form>
          )}

          {waiting && s.codeUndelivered && !error && (
            <p className="text-xs text-red-500 mt-2">
              Your carrier didn&apos;t deliver the code to {s.pendingPhone}. Check the number, or try again in a few minutes.
            </p>
          )}
          {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
          {note && <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2">{note}</p>}
          {!confirmed && (
            <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
              By confirming, you agree to receive alert texts from VLYR about your customer ratings. Message frequency varies.
              Msg &amp; data rates may apply. Reply STOP to opt out, or switch alerts off here at any time.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
