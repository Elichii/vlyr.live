"use client"

import { useEffect, useRef, useState } from "react"
import {
  CheckCircle2, ChevronDown, Copy, Gift, Mail, MessageSquare, Phone, RotateCcw, Star, StickyNote,
} from "lucide-react"
import { Button } from "@/components/ui/button"

export interface ActivityItem {
  id: string
  rating: number | null
  feedback: string | null
  phone: string | null
  contactPreference: string | null
  isNew: boolean
  email: string | null
  name: string | null
  createdAt: string
  resolvedAt: string | null
  note: string | null
  sticker: number | null
  reward: { code: string; offer: string; expiresAt: string; redeemedAt: string | null } | null
}

export interface ActivityStats {
  stickerScans: number
  ratings: number
  avgRating: number | null
  sentToGoogle: number
  privateFeedback: number
  needsFollowUp: number
  rewardsIssued: number
  rewardsRedeemed: number
  resolved: number
  newGood: number
  newBad: number
}

export interface ActivityData {
  seenAt: string | null
  stats: ActivityStats
  items: ActivityItem[]
  recent: { createdAt: string; rating: number | null }[]
}

export async function fetchActivity(limit = 50): Promise<ActivityData> {
  const res = await fetch(`/api/activity?limit=${limit}`)
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? "Could not load activity")
  return json
}

function timeAgo(iso: string) {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return "just now"
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`
  return `${Math.floor(s / 86400)} d ago`
}

const needsFollowUp = (i: ActivityItem) => (i.rating ?? 0) <= 3 && !i.resolvedAt

/** List of customer ratings with everything a manager needs to follow up. */
export function CustomerActivityList({
  items,
  businessName,
  onChanged,
  emptyText = "No ratings yet. Ratings appear here as soon as customers scan your stickers.",
}: {
  items: ActivityItem[]
  businessName: string
  onChanged: () => void
  emptyText?: string
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground p-6 text-center bg-card border border-border rounded-xl">{emptyText}</p>
  }
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <ActivityCard key={item.id} item={item} businessName={businessName} onChanged={onChanged} />
      ))}
    </ul>
  )
}

function ActivityCard({ item, businessName, onChanged }: { item: ActivityItem; businessName: string; onChanged: () => void }) {
  const [noteOpen, setNoteOpen] = useState(false)
  const [note, setNote] = useState(item.note ?? "")
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const unhappy = (item.rating ?? 0) <= 3
  const who = item.name || item.email || "Customer"

  const patch = async (body: Record<string, unknown>) => {
    setBusy(true)
    await fetch("/api/activity", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id, ...body }) })
    setBusy(false)
    onChanged()
  }

  const tel = item.phone?.replace(/[^\d+]/g, "")

  return (
    <li
      className={`bg-card rounded-xl border p-4 space-y-3 ${needsFollowUp(item) ? "border-red-400/40" : "border-border"}`}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-0.5 shrink-0" aria-label={`${item.rating} out of 5 stars`}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                size={14}
                className={n <= (item.rating ?? 0) ? (unhappy ? "text-red-400 fill-red-400" : "text-[#FFE100] fill-[#FFE100]") : "text-muted-foreground/30"}
              />
            ))}
          </div>
          <span className="text-sm font-semibold text-foreground truncate">{who}</span>
          {needsFollowUp(item) && (
            <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/20">
              Needs follow-up
            </span>
          )}
          {unhappy && item.resolvedAt && (
            <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-green-500/15 text-green-500 border border-green-500/20">
              Resolved
            </span>
          )}
          {!unhappy && (
            <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-[#FFE100]/10 text-[#FFE100] border border-[#FFE100]/20">
              Invited to Google
            </span>
          )}
        </div>
        <span className="text-[11px] text-muted-foreground" title={new Date(item.createdAt).toLocaleString()}>
          {item.sticker ? `Sticker No. ${String(item.sticker).padStart(4, "0")} · ` : ""}
          {timeAgo(item.createdAt)}
        </span>
      </div>

      {/* What they said */}
      {item.feedback ? (
        <p className="text-sm text-foreground whitespace-pre-line leading-relaxed border-l-2 border-border pl-3">{item.feedback}</p>
      ) : (
        <p className="text-xs text-muted-foreground">No comment left.</p>
      )}

      {/* Contact details */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {item.email && (
          <span className="flex items-center gap-1.5">
            <Mail size={12} /> {item.email}
            <button
              onClick={() => { navigator.clipboard?.writeText(item.email!); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
              className="hover:text-foreground"
              aria-label="Copy email"
            >
              {copied ? <CheckCircle2 size={12} className="text-green-500" /> : <Copy size={12} />}
            </button>
          </span>
        )}
        {item.phone && (
          <span className="flex items-center gap-1.5"><Phone size={12} /> {item.phone}</span>
        )}
        {item.reward && (
          <span className="flex items-center gap-1.5">
            <Gift size={12} /> {item.reward.code} ·{" "}
            {item.reward.redeemedAt ? "redeemed" : new Date(item.reward.expiresAt) < new Date() ? "expired" : "not used yet"}
          </span>
        )}
      </div>

      {/* Private note */}
      {item.note && !noteOpen && (
        <p className="text-xs text-foreground bg-secondary/50 rounded-lg p-2.5 flex gap-2">
          <StickyNote size={12} className="shrink-0 mt-0.5 text-muted-foreground" /> {item.note}
        </p>
      )}
      {noteOpen && (
        <div className="space-y-2">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={1000}
            placeholder="Private note, e.g. Called on Tuesday, offered a free meal"
            className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 resize-none focus:outline-none focus:ring-1 focus:ring-foreground/20"
          />
          <div className="flex gap-2">
            <Button size="sm" disabled={busy} onClick={async () => { await patch({ note }); setNoteOpen(false) }} className="h-8 rounded-lg">Save note</Button>
            <Button size="sm" variant="ghost" onClick={() => { setNote(item.note ?? ""); setNoteOpen(false) }} className="h-8 rounded-lg">Cancel</Button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-1">
        {item.email && <EmailButton item={item} businessName={businessName} primary={unhappy} />}
        {tel && (
          <a href={`tel:${tel}`}>
            <Button size="sm" variant="outline" className="h-8 gap-1.5 rounded-lg text-xs"><Phone size={13} /> Call</Button>
          </a>
        )}
        {tel && (
          <a href={`sms:${tel}`}>
            <Button size="sm" variant="outline" className="h-8 gap-1.5 rounded-lg text-xs"><MessageSquare size={13} /> Text</Button>
          </a>
        )}
        {!noteOpen && (
          <Button size="sm" variant="outline" onClick={() => setNoteOpen(true)} className="h-8 gap-1.5 rounded-lg text-xs">
            <StickyNote size={13} /> {item.note ? "Edit note" : "Add note"}
          </Button>
        )}
        {unhappy && (
          item.resolvedAt ? (
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => patch({ resolved: false })} className="h-8 gap-1.5 rounded-lg text-xs">
              <RotateCcw size={13} /> Reopen
            </Button>
          ) : (
            <Button size="sm" disabled={busy} onClick={() => patch({ resolved: true })} className="h-8 gap-1.5 rounded-lg text-xs bg-green-600 hover:bg-green-600/90 text-white">
              <CheckCircle2 size={13} /> Mark resolved
            </Button>
          )
        )}
      </div>
    </li>
  )
}

/** A ready-to-send reply to the customer. */
export function emailDraft(item: ActivityItem, businessName: string) {
  const firstName = (item.name || "").split(" ")[0]
  const hi = `Hi${firstName ? ` ${firstName}` : ""},`
  const unhappy = (item.rating ?? 0) <= 3
  const subject = unhappy ? `Sorry about your order at ${businessName}` : `Thank you from ${businessName}`
  const body = unhappy
    ? `${hi}\n\nThank you for telling us about your order${item.feedback ? `:\n\n"${item.feedback}"` : "."}\n\nI'm sorry we let you down, and I'd like to make it right. ${
        item.reward ? `Your reward code ${item.reward.code} (${item.reward.offer}) is ready for your next visit. ` : ""
      }Could you reply with a good time to talk?\n\nThank you,\n${businessName}`
    : `${hi}\n\nThank you for your rating, we're so glad you enjoyed your order!${
        item.reward ? ` Your code ${item.reward.code} (${item.reward.offer}) is waiting for your next visit.` : ""
      }\n\nSee you soon,\n${businessName}`
  return { to: item.email ?? "", subject, body }
}

export function emailLinks(item: ActivityItem, businessName: string) {
  const { to, subject, body } = emailDraft(item, businessName)
  const q = (o: Record<string, string>) => new URLSearchParams(o).toString().replace(/\+/g, "%20")
  return {
    gmail: `https://mail.google.com/mail/?${q({ view: "cm", fs: "1", to, su: subject, body })}`,
    outlook: `https://outlook.office.com/mail/deeplink/compose?${q({ to, subject, body })}`,
    mailApp: `mailto:${to}?${q({ subject, body })}`,
  }
}

/**
 * "Email" opens a pre-written reply in Gmail (works in any browser, no mail
 * app needed). The arrow offers Outlook, the computer's mail app, or copying.
 */
export function EmailButton({ item, businessName, primary }: { item: ActivityItem; businessName: string; primary?: boolean }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const links = emailLinks(item, businessName)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener("mousedown", close)
    return () => document.removeEventListener("mousedown", close)
  }, [open])

  const base = primary
    ? "bg-foreground text-background hover:bg-foreground/90"
    : "border border-border bg-background text-foreground hover:bg-secondary"
  return (
    <div ref={ref} className="relative inline-flex">
      <a
        href={links.gmail}
        target="_blank"
        rel="noopener noreferrer"
        className={`h-8 pl-3 pr-2.5 rounded-l-lg text-xs font-medium inline-flex items-center gap-1.5 ${base}`}
      >
        <Mail size={13} /> Email
      </a>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="More ways to email"
        aria-expanded={open}
        className={`h-8 px-1.5 rounded-r-lg border-l border-l-white/20 inline-flex items-center ${base}`}
      >
        <ChevronDown size={13} />
      </button>
      {open && (
        <div className="absolute z-20 top-9 left-0 w-56 rounded-xl border border-border bg-card shadow-lg p-1 text-sm">
          <a href={links.gmail} target="_blank" rel="noopener noreferrer" className="block px-3 py-2 rounded-lg hover:bg-secondary" onClick={() => setOpen(false)}>
            Reply in Gmail
          </a>
          <a href={links.outlook} target="_blank" rel="noopener noreferrer" className="block px-3 py-2 rounded-lg hover:bg-secondary" onClick={() => setOpen(false)}>
            Reply in Outlook
          </a>
          <a href={links.mailApp} className="block px-3 py-2 rounded-lg hover:bg-secondary" onClick={() => setOpen(false)}>
            Open my mail app
          </a>
          <button
            type="button"
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-secondary"
            onClick={() => {
              const { to, subject, body } = emailDraft(item, businessName)
              navigator.clipboard?.writeText(`To: ${to}\nSubject: ${subject}\n\n${body}`)
              setCopied(true)
              setTimeout(() => { setCopied(false); setOpen(false) }, 1200)
            }}
          >
            {copied ? "Copied!" : "Copy address + message"}
          </button>
        </div>
      )}
    </div>
  )
}
