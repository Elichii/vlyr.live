"use client"

/**
 * A Google business, shown the way customers see it: cover photo, logo,
 * rating, contact details and the latest review. Used when the owner picks
 * which business to connect.
 */
import { useState } from "react"
import { CheckCircle2, Globe, MapPin, Phone, Star } from "lucide-react"
import type { BusinessPreview } from "@/lib/google/business-profile"

export function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = Math.max(0, Math.min(1, rating - (i - 1)))
        return (
          <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
            <Star size={size} className="absolute inset-0 text-[#E2E2E2] fill-[#E2E2E2]" />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star size={size} className="text-[#F5B400] fill-[#F5B400]" />
            </span>
          </span>
        )
      })}
    </span>
  )
}

export function BusinessAvatar({ name, logoUrl, size = 64 }: { name: string; logoUrl: string | null; size?: number }) {
  const initials = name.split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase()
  // A logo that can't load (e.g. the website has none) falls back to the initials
  const [failed, setFailed] = useState<string | null>(null)
  return logoUrl && failed !== logoUrl ? (
    <img
      src={logoUrl}
      onError={() => setFailed(logoUrl)}
      alt={`${name} logo`}
      className="rounded-2xl object-cover bg-white border-4 border-white shadow-md shrink-0"
      style={{ width: size, height: size }}
    />
  ) : (
    <div
      className="rounded-2xl bg-[#0A0A0A] border-4 border-white shadow-md flex items-center justify-center text-[#FFE100] font-bold shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.34 }}
    >
      {initials || "B"}
    </div>
  )
}

export function OpenBadge({ openNow }: { openNow: boolean | null }) {
  if (openNow === null) return null
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full ${openNow ? "bg-[#EAF7EE] text-[#137333]" : "bg-[#F4F4F4] text-[#666666]"}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${openNow ? "bg-[#1E8E3E]" : "bg-[#9A9A9A]"}`} />
      {openNow ? "Open now" : "Closed now"}
    </span>
  )
}

export const cleanUrl = (url: string) => url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")

export function BusinessCover({ coverUrl, className = "h-36" }: { coverUrl: string | null; className?: string }) {
  return coverUrl ? (
    <div className={`relative ${className} bg-[#EDEDED] overflow-hidden`}>
      <img src={coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/0 to-black/0" />
    </div>
  ) : (
    <div className={`relative ${className} overflow-hidden bg-[#0A0A0A]`}>
      <div
        className="absolute inset-0 opacity-[0.18]"
        style={{ backgroundImage: "radial-gradient(#FFE100 1px, transparent 1px)", backgroundSize: "14px 14px" }}
      />
      <div className="absolute -right-10 -top-16 w-56 h-56 rounded-full bg-[#FFE100]/15 blur-2xl" />
    </div>
  )
}

interface CardProps {
  business: BusinessPreview | null
  fallbackName: string
  fallbackAddress: string | null
  selected: boolean
  onSelect: () => void
}

/** Selectable card on "Your Google businesses". */
export function BusinessProfileCard({ business: b, fallbackName, fallbackAddress, selected, onSelect }: CardProps) {
  const name = b?.name || fallbackName
  const address = b?.address || fallbackAddress
  const review = b?.reviews.find((r) => r.text.trim()) ?? null

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`group relative flex flex-col justify-start items-stretch h-full text-left rounded-3xl overflow-hidden bg-white transition-all duration-200 outline-none focus-visible:ring-4 focus-visible:ring-[#FFE100]/60 ${
        selected
          ? "ring-2 ring-[#0A0A0A] shadow-[0_18px_50px_-20px_rgba(0,0,0,0.45)] -translate-y-0.5"
          : "ring-1 ring-[#E6E6E6] hover:ring-[#BDBDBD] hover:shadow-[0_14px_40px_-24px_rgba(0,0,0,0.35)]"
      }`}
    >
      <BusinessCover coverUrl={b?.coverUrl ?? null} />

      {/* Selection mark */}
      <span
        className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
          selected ? "bg-[#FFE100] text-[#0A0A0A] scale-100" : "bg-white/85 text-transparent ring-1 ring-black/10 scale-90 group-hover:scale-100"
        }`}
      >
        <CheckCircle2 size={18} />
      </span>

      <div className="px-5 pb-5 -mt-9 relative">
        <BusinessAvatar name={name} logoUrl={b?.logoUrl ?? null} size={72} />

        <div className="mt-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-[#0A0A0A] leading-tight truncate">{name}</h3>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              {b?.category && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#F4F4F4] text-[#444444]">{b.category}</span>
              )}
              {b && <OpenBadge openNow={b.openNow} />}
            </div>
          </div>
          {b?.rating != null && (
            <div className="text-right shrink-0">
              <p className="text-3xl font-bold text-[#0A0A0A] leading-none tracking-tight">{b.rating.toFixed(1)}</p>
              <div className="mt-1"><Stars rating={b.rating} size={12} /></div>
              <p className="text-[11px] text-[#777777] mt-0.5">{b.totalReviews.toLocaleString()} reviews</p>
            </div>
          )}
        </div>

        {/* Loading shimmer while Google details arrive */}
        {!b && (
          <div className="mt-4 space-y-2 animate-pulse">
            <div className="h-3 w-3/4 rounded bg-[#EEEEEE]" />
            <div className="h-3 w-1/2 rounded bg-[#EEEEEE]" />
            <div className="h-3 w-2/3 rounded bg-[#EEEEEE]" />
          </div>
        )}

        {b && (
          <ul className="mt-4 space-y-2 text-[13px] text-[#4A4A4A]">
            {address && (
              <li className="flex items-start gap-2.5"><MapPin size={14} className="text-[#9A9A9A] mt-0.5 shrink-0" /><span className="leading-snug">{address}</span></li>
            )}
            {b.phone && (
              <li className="flex items-center gap-2.5"><Phone size={14} className="text-[#9A9A9A] shrink-0" />{b.phone}</li>
            )}
            {b.website && (
              <li className="flex items-center gap-2.5 min-w-0"><Globe size={14} className="text-[#9A9A9A] shrink-0" /><span className="truncate">{cleanUrl(b.website)}</span></li>
            )}
          </ul>
        )}

        {b && !address && !b.phone && !b.website && b.rating == null && (
          <p className="mt-4 text-[13px] text-[#888888] leading-relaxed">
            This profile has no public address, phone or reviews on Google yet. You can still connect it and add the details on the next step.
          </p>
        )}

        {review && (
          <div className="mt-4 rounded-2xl bg-[#FAFAFA] border border-[#EFEFEF] p-3.5">
            <div className="flex items-center justify-between gap-2">
              <Stars rating={review.rating} size={11} />
              <span className="text-[11px] text-[#999999]">{review.relativeTime}</span>
            </div>
            <p className="mt-1.5 text-[13px] text-[#333333] leading-snug line-clamp-2">&ldquo;{review.text}&rdquo;</p>
            <p className="mt-1 text-[11px] text-[#888888]">{review.author} · latest review</p>
          </div>
        )}
      </div>
    </button>
  )
}
