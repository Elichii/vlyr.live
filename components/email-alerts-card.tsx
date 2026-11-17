"use client"

/** "Email me about unhappy customers": on by default, sent to the account email. */
import { useState } from "react"
import useSWR from "swr"
import { Mail } from "lucide-react"
import { Switch } from "@/components/ui/switch"

interface Settings {
  available: boolean
  enabled: boolean
  email: string | null
}

const fetchSettings = async (): Promise<Settings> => {
  const res = await fetch("/api/email-alerts")
  const json = await res.json()
  if (!res.ok) throw new Error(json.error)
  return json.settings
}

export function EmailAlertsCard() {
  const { data: s, mutate } = useSWR("email-alerts", fetchSettings)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!s?.available || !s.email) return null

  const toggle = async (enabled: boolean) => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/email-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Something went wrong.")
      await mutate(json.settings, { revalidate: false })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="flex items-start gap-3 lg:w-80 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
            <Mail size={16} className="text-blue-500" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Email alerts</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              An email for every 1–3 star rating and every new 1–3 star Google review.
            </p>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Switch checked={s.enabled} disabled={busy} onCheckedChange={toggle} aria-label="Email alerts on or off" />
            <span className="text-sm text-foreground min-w-0 truncate">
              {s.enabled ? "On" : "Off"} · emails go to <span className="font-mono">{s.email}</span>
            </span>
          </div>
          {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
        </div>
      </div>
    </div>
  )
}
