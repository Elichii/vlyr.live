"use client"

/**
 * Last setup step: the person who manages the business on VLYR.
 * Free plan: "Finish setup" saves everything and opens the dashboard.
 * Paid plans: continues to the remaining steps.
 */
import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { ArrowLeft, ArrowRight, BadgeCheck, Briefcase, Loader2, Mail, Phone, User } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { PhoneVerifyField } from "@/components/phone-verify-field"
import type { OnboardingData } from "@/lib/onboarding-types"

export const OWNER_TITLES = ["Owner", "Co-owner", "General manager", "Store manager", "Marketing manager", "Operations manager", "Staff member", "Other"] as const

interface Props {
  data: OnboardingData
  onChange: (updates: Partial<OnboardingData>) => void
  onBack: () => void
  /** Free plan: saves and opens the dashboard. Paid: next step. */
  onFinish: () => Promise<void> | void
  finishLabel: string
}

export function StepOwner({ data, onChange, onBack, onFinish, finishLabel }: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Texting available: the mobile must be confirmed with a code before finishing
  const [smsOn, setSmsOn] = useState(false)
  const [phoneConfirmed, setPhoneConfirmed] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/sms-alerts").then((r) => r.json()).then((j) => {
      setSmsOn(!!j.settings?.available)
      if (j.settings?.phone) setPhoneConfirmed(j.settings.phone)
    }).catch(() => {})
  }, [])

  const smsAction = async (body: Record<string, string>) => {
    const res = await fetch("/api/sms-alerts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error ?? "Something went wrong.")
    return json
  }

  // Fill in what Google already told us
  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await createClient().auth.getUser()
      if (!user) return
      const meta = user.user_metadata ?? {}
      const updates: Partial<OnboardingData> = {}
      if (!data.ownerName && (meta.full_name || meta.name)) updates.ownerName = String(meta.full_name || meta.name)
      if (!data.email && user.email) updates.email = user.email
      if (Object.keys(updates).length) onChange(updates)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)
  const phoneDigits = data.phone.replace(/\D/g, "")
  const phoneOk = !phoneDigits || phoneDigits.length === 10 || (phoneDigits.length === 11 && phoneDigits.startsWith("1"))
  const phoneNeedsCode = smsOn && !!phoneDigits && !phoneConfirmed
  const canFinish = data.ownerName.trim().length >= 2 && !!data.ownerTitle && emailOk && phoneOk && !phoneNeedsCode

  const finish = async () => {
    setBusy(true)
    setError(null)
    try {
      await onFinish()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.")
      setBusy(false)
    }
  }

  const input = "h-12 rounded-xl bg-[#FAFAFA] border-[#E5E5E5] text-[#0A0A0A] placeholder:text-[#AAAAAA] focus-visible:border-[#0A0A0A]"
  const label = "text-[13px] font-semibold text-[#0A0A0A] uppercase tracking-wider"

  return (
    <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.35 }} className="flex flex-col gap-6 w-full">
      <div>
        <h2 className="text-2xl font-bold text-[#0A0A0A] tracking-tight">About you</h2>
        <p className="text-sm text-[#666666] mt-1">
          Who manages {data.businessName || "the business"} on VLYR? We&apos;ll use these details for your account, alerts and support.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={label}>Full name</label>
        <div className="relative">
          <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={data.ownerName} onChange={(e) => onChange({ ownerName: e.target.value })} placeholder="Your full name" autoComplete="name" className={`pl-10 ${input}`} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={label}>Your role</label>
        <Select value={data.ownerTitle || undefined} onValueChange={(v) => onChange({ ownerTitle: v })}>
          <SelectTrigger className={`${input} w-full`}>
            <span className="flex items-center gap-2.5"><Briefcase size={15} className="text-muted-foreground" /><SelectValue placeholder="Choose your role" /></span>
          </SelectTrigger>
          <SelectContent className="bg-white border-[#E5E5E5] text-[#0A0A0A]">
            {OWNER_TITLES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={label}>Email</label>
        <div className="relative">
          <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input type="email" value={data.email} onChange={(e) => onChange({ email: e.target.value.trim() })} placeholder="you@yourbusiness.com" autoComplete="email" className={`pl-10 ${input}`} />
        </div>
        {data.email && !emailOk && <p className="text-xs text-red-500">Please enter a valid email address.</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={label}>Mobile number <span className="normal-case font-normal tracking-normal text-[#8C8C8C]">(optional)</span></label>
        {smsOn ? (
          <>
            <PhoneVerifyField
              value={data.phone}
              onChange={(phone) => onChange({ phone })}
              confirmed={phoneConfirmed}
              onConfirmed={setPhoneConfirmed}
              send={async (phone) => { const j = await smsAction({ action: "send_code", phone }); return { sentTo: j.settings?.pendingPhone ?? phone } }}
              confirm={async (code) => { const j = await smsAction({ action: "verify", code }); return { phone: j.settings?.phone ?? data.phone } }}
              inputClassName="bg-[#FAFAFA] border border-[#E5E5E5] text-[#0A0A0A] placeholder:text-[#AAAAAA] focus:border-[#0A0A0A]"
            />
            {phoneNeedsCode && <p className="text-xs text-[#8A7400]">Confirm your number with the code we text you, or clear the field to skip.</p>}
            {phoneConfirmed && <p className="text-xs text-[#137333]">Text alerts are on: we&apos;ll text this number when a customer leaves 1–3★.</p>}
          </>
        ) : (
          <>
            <div className="relative">
              <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input type="tel" inputMode="tel" value={data.phone} onChange={(e) => onChange({ phone: e.target.value.replace(/[^\d+()\-\s.]/g, "").slice(0, 20) })} placeholder="(202) 555-0123" autoComplete="tel" className={`pl-10 ${input}`} />
            </div>
            {!phoneOk && <p className="text-xs text-red-500">Please enter a 10-digit US mobile number.</p>}
          </>
        )}
        <p className="text-xs text-[#595959] leading-relaxed">
          By entering your mobile number, you consent to receive account verification and automated feedback alert SMS messages from VLYR
          (operated by Mare LLC). Consent is not a condition of purchase. Msg frequency varies based on feedback activity. Msg &amp; data
          rates may apply. Reply STOP to cancel at any time, or HELP for support. View{" "}
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-[#0A0A0A]">Privacy Policy</a> and{" "}
          <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-[#0A0A0A]">Terms</a>.
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-2xl bg-[#FFFBDA] border border-[#F3E27A] p-4">
        <BadgeCheck size={18} className="text-[#8A7400] mt-0.5 shrink-0" />
        <p className="text-sm text-[#5C4D00] leading-relaxed">
          Next: your dashboard. Your stickers are waiting in <span className="font-semibold">Supply Shop</span>; print them and put one on every order.
        </p>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">{error}</p>}

      <div className="flex items-center gap-3 pt-1">
        <button onClick={onBack} disabled={busy} className="flex items-center justify-center gap-1.5 h-12 px-6 rounded-full border border-[#E5E5E5] bg-white text-[#0A0A0A] text-sm font-semibold hover:border-[#0A0A0A] transition-all flex-1">
          <ArrowLeft size={15} /> Back
        </button>
        <button onClick={finish} disabled={!canFinish || busy} className="flex items-center justify-center gap-2 h-12 px-6 rounded-full bg-[#0A0A0A] text-white text-sm font-bold hover:bg-[#1F1F1F] disabled:opacity-30 transition-all flex-[2]">
          {busy ? <Loader2 size={16} className="animate-spin" /> : null} {finishLabel} {!busy && <ArrowRight size={15} />}
        </button>
      </div>
    </motion.div>
  )
}
