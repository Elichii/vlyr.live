"use client"

/**
 * Phone number with "Text me a code" → 6-digit code → confirmed.
 * Used for the owner during setup and for customers on the rating page.
 * Changing the number after confirming asks for a new code.
 */
import { useState } from "react"
import { CheckCircle2, Loader2, Phone } from "lucide-react"

interface Props {
  value: string
  onChange: (phone: string) => void
  /** Set once the number is confirmed (null while it isn't) */
  confirmed: string | null
  onConfirmed: (maskedPhone: string | null) => void
  send: (phone: string) => Promise<{ sentTo: string }>
  confirm: (code: string) => Promise<{ phone: string }>
  placeholder?: string
  inputClassName?: string
  tone?: "light" | "app"
}

export const usPhoneOk = (p: string) => {
  const d = p.replace(/\D/g, "")
  return d.length === 10 || (d.length === 11 && d.startsWith("1"))
}

export function PhoneVerifyField({ value, onChange, confirmed, onConfirmed, send, confirm, placeholder = "(202) 555-0123", inputClassName = "", tone = "light" }: Props) {
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [code, setCode] = useState("")
  const [busy, setBusy] = useState<"send" | "confirm" | null>(null)
  const [error, setError] = useState<string | null>(null)

  const btn = tone === "light"
    ? "h-12 px-4 rounded-xl bg-[#0A0A0A] text-white text-sm font-semibold disabled:opacity-30 shrink-0"
    : "h-12 px-4 rounded-xl bg-foreground text-background text-sm font-semibold disabled:opacity-30 shrink-0"
  const field = `w-full h-12 rounded-xl pl-10 pr-3 text-[15px] outline-none ${inputClassName}`

  const doSend = async () => {
    setBusy("send"); setError(null)
    try {
      const r = await send(value)
      setSentTo(r.sentTo); setCode("")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send a code.")
    } finally { setBusy(null) }
  }
  const doConfirm = async () => {
    setBusy("confirm"); setError(null)
    try {
      const r = await confirm(code)
      onConfirmed(r.phone); setSentTo(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "That code didn't work.")
    } finally { setBusy(null) }
  }

  if (confirmed) {
    return (
      <div className="flex items-center gap-3 h-12 px-4 rounded-xl bg-[#EAF7EE] border border-[#1E8E3E]/25">
        <CheckCircle2 size={17} className="text-[#137333] shrink-0" />
        <span className="text-sm font-semibold text-[#137333] flex-1">Confirmed · {confirmed}</span>
        <button type="button" onClick={() => { onConfirmed(null); onChange("") }} className="text-xs text-[#137333] underline underline-offset-2">Change</button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {!sentTo ? (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="tel" inputMode="tel" autoComplete="tel" value={value} placeholder={placeholder}
              onChange={(e) => { onChange(e.target.value.replace(/[^\d+()\-\s.]/g, "").slice(0, 20)); setError(null) }}
              className={field}
              aria-label="Mobile number"
            />
          </div>
          <button type="button" onClick={doSend} disabled={!usPhoneOk(value) || busy !== null} className={btn}>
            {busy === "send" ? <Loader2 size={15} className="animate-spin" /> : "Text me a code"}
          </button>
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            <input
              inputMode="numeric" autoComplete="one-time-code" value={code} placeholder="6-digit code" autoFocus
              onChange={(e) => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(null) }}
              onKeyDown={(e) => { if (e.key === "Enter" && code.length === 6) doConfirm() }}
              className={`w-full h-12 rounded-xl px-4 text-[17px] font-mono tracking-[0.3em] outline-none ${inputClassName}`}
              aria-label="Code from the text"
            />
            <button type="button" onClick={doConfirm} disabled={code.length !== 6 || busy !== null} className={btn}>
              {busy === "confirm" ? <Loader2 size={15} className="animate-spin" /> : "Confirm"}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Code sent to {sentTo}.{" "}
            <button type="button" onClick={doSend} disabled={busy !== null} className="underline underline-offset-2">Send again</button>
            {" · "}
            <button type="button" onClick={() => { setSentTo(null); setError(null) }} className="underline underline-offset-2">Use a different number</button>
          </p>
        </>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
