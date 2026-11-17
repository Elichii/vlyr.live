"use client"

/**
 * "Your details" on the Business Profile page: the person who manages the
 * business on VLYR (name, role, email, mobile), plus a short account summary.
 */
import { useEffect, useState } from "react"
import { Briefcase, CheckCircle2, Loader2, Mail, Phone, ShieldCheck, User } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { OWNER_TITLES } from "@/components/onboarding/StepOwner"

interface Owner { name: string; title: string; email: string; phone: string }

export function OwnerDetailsCard() {
  const [owner, setOwner] = useState<Owner | null>(null)
  const [initial, setInitial] = useState<Owner | null>(null)
  const [account, setAccount] = useState<{ signIn: string; plan: string; since: string | null } | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: m } = await supabase.from("merchants").select("*").eq("id", user.id).maybeSingle()
      const meta = user.user_metadata ?? {}
      const o: Owner = {
        name: (m?.owner_name as string) || String(meta.full_name || meta.name || ""),
        title: (m?.owner_title as string) || "",
        email: (m?.email as string) || user.email || "",
        phone: (m?.phone as string) || "",
      }
      setOwner(o)
      setInitial(o)
      const provider = user.app_metadata?.provider === "google" || m?.google_email ? "Google" : "Email & password"
      const plan = m?.package_id === "free" ? "Free trial" : m?.package_id === "starter" ? "Starter" : m?.package_id === "enterprise" ? "Enterprise" : "Growth"
      setAccount({ signIn: provider, plan, since: (m?.created_at as string) ?? null })
    })()
  }, [])

  if (!owner) {
    return <div className="bg-card rounded-2xl border border-border p-6 h-72 animate-pulse" />
  }

  const set = (patch: Partial<Owner>) => { setOwner({ ...owner, ...patch }); setSaved(false) }
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(owner.email)
  const digits = owner.phone.replace(/\D/g, "")
  const phoneOk = !digits || digits.length === 10 || (digits.length === 11 && digits.startsWith("1"))
  const changed = JSON.stringify(owner) !== JSON.stringify(initial)

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Please sign in again.")
      const { error: e } = await supabase.from("merchants").update({
        owner_name: owner.name.trim() || null,
        owner_title: owner.title || null,
        email: owner.email.trim(),
        phone: owner.phone.trim() || null,
      }).eq("id", user.id)
      if (e) throw new Error(/owner_/.test(e.message) ? "Your details can't be saved yet (database update pending)." : e.message)
      setInitial(owner)
      setSaved(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save")
    } finally {
      setSaving(false)
    }
  }

  const field = "pl-10 h-11 bg-secondary/50 border-border rounded-xl"

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Your details</h2>
          <p className="text-xs text-muted-foreground mt-0.5">The person who manages this business on VLYR.</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Full name</label>
          <div className="relative">
            <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={owner.name} onChange={(e) => set({ name: e.target.value })} placeholder="Your full name" className={field} />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Role</label>
          <Select value={owner.title || undefined} onValueChange={(v) => set({ title: v })}>
            <SelectTrigger className="h-11 bg-secondary/50 border-border rounded-xl w-full">
              <span className="flex items-center gap-2.5"><Briefcase size={14} className="text-muted-foreground" /><SelectValue placeholder="Choose your role" /></span>
            </SelectTrigger>
            <SelectContent>
              {OWNER_TITLES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Email</label>
          <div className="relative">
            <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input type="email" value={owner.email} onChange={(e) => set({ email: e.target.value })} className={field} />
          </div>
          {!emailOk && <p className="text-xs text-red-500">Enter a valid email address.</p>}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Mobile number</label>
          <div className="relative">
            <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input type="tel" value={owner.phone} onChange={(e) => set({ phone: e.target.value.replace(/[^\d+()\-\s.]/g, "").slice(0, 20) })} placeholder="(202) 555-0123" className={field} />
          </div>
          {!phoneOk && <p className="text-xs text-red-500">Enter a 10-digit US number.</p>}
          <p className="text-[11px] text-muted-foreground leading-relaxed">For your account. Text alerts use the number you confirm on the Feedback page.</p>
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}
        <Button onClick={save} disabled={!changed || saving || !emailOk || !phoneOk || owner.name.trim().length < 2} className="w-full h-11 rounded-xl bg-foreground text-background hover:bg-foreground/90 font-semibold">
          {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <span className="flex items-center gap-2"><CheckCircle2 size={16} /> Saved</span> : "Save my details"}
        </Button>
      </div>

      {account && (
        <div className="bg-card rounded-2xl border border-border p-6">
          <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2"><ShieldCheck size={16} /> Account</h2>
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Sign-in</dt><dd className="text-foreground font-medium">{account.signIn}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Plan</dt><dd className="text-foreground font-medium">{account.plan}</dd></div>
            {account.since && (
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Member since</dt><dd className="text-foreground font-medium">{new Date(account.since).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</dd></div>
            )}
          </dl>
        </div>
      )}
    </div>
  )
}
