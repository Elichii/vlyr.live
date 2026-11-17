"use client"

/**
 * "Business connected": the owner's Google business, full width, with
 * everything we imported (rating, reviews, contact details, hours, map).
 */
import dynamic from "next/dynamic"
import { motion } from "framer-motion"
import {
  ArrowLeft, ArrowRight, BellRing, CheckCircle2, Clock, ExternalLink, Globe, MapPin, MessageSquareQuote, Phone, ShieldCheck,
} from "lucide-react"
import type { BusinessPreview } from "@/lib/google/business-profile"
import { BusinessAvatar, BusinessCover, OpenBadge, Stars, cleanUrl } from "@/components/onboarding/BusinessProfileCard"

const ProfileMap = dynamic(() => import("@/components/profile-map"), {
  ssr: false,
  loading: () => <div className="w-full h-64 md:h-80 rounded-2xl bg-[#F2F2F2] animate-pulse" />,
})

interface Props {
  business: BusinessPreview
  googleEmail: string | null
  /** Back to the list of the owner's Google businesses */
  onBack: () => void
  onNext: () => void
}

export function ConnectedBusiness({ business: b, googleEmail, onBack, onNext }: Props) {
  const today = new Date().toLocaleDateString("en-US", { weekday: "long" })
  const hasPin = b.lat != null && b.lng != null

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="flex flex-col gap-6">
      {/* Hero */}
      <section className="relative rounded-3xl overflow-hidden ring-1 ring-[#E6E6E6] bg-white">
        <BusinessCover coverUrl={b.coverUrl} className="h-48 md:h-60" />
        <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-[#137333] shadow-sm">
          <CheckCircle2 size={14} /> Connected to VLYR
        </div>
        <div className="px-6 md:px-8 pb-6 relative flex flex-col xl:flex-row xl:items-start gap-4 xl:gap-6">
          <div className="-mt-14 shrink-0"><BusinessAvatar name={b.name} logoUrl={b.logoUrl} size={104} /></div>
          <div className="flex-1 min-w-0 xl:pt-4">
            <h2 className="text-3xl font-bold text-[#0A0A0A] tracking-tight leading-tight">{b.name}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {b.category && <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#F4F4F4] text-[#444444]">{b.category}</span>}
              <OpenBadge openNow={b.openNow} />
              {b.address && <span className="text-sm text-[#666666] flex items-center gap-1.5"><MapPin size={13} className="text-[#9A9A9A]" />{b.address}</span>}
            </div>
          </div>
          {b.mapsUrl && (
            <a href={b.mapsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0A0A0A] border border-[#E5E5E5] rounded-full px-4 h-10 hover:border-[#0A0A0A] transition-colors self-start xl:mt-4 shrink-0">
              View on Google <ExternalLink size={13} />
            </a>
          )}
        </div>
      </section>

      {/* Key numbers */}
      <section className="grid 2xl:grid-cols-[1.15fr_1fr] gap-4">
        <div className="rounded-3xl bg-[#0A0A0A] text-white p-6 flex items-center gap-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55 whitespace-nowrap">Google rating</p>
            <p className="text-6xl font-bold leading-none tracking-tight text-[#FFE100] mt-3">{b.rating != null ? b.rating.toFixed(1) : "—"}</p>
            {b.rating != null && <div className="mt-3"><Stars rating={b.rating} size={16} /></div>}
          </div>
          <div className="w-px self-stretch bg-white/10" />
          <div className="flex flex-col gap-3 min-w-0">
            <div>
              <p className="text-3xl font-bold leading-none">{b.totalReviews.toLocaleString()}</p>
              <p className="text-[13px] text-white/60 mt-1">reviews on Google</p>
            </div>
            {b.reviews.length > 0 && (() => {
              const low = b.reviews.filter((r) => r.rating > 0 && r.rating <= 3).length
              return (
                <p className={`text-[13px] leading-snug ${low ? "text-[#FF8A80]" : "text-[#7CFFB2]"}`}>
                  {low ? `${low} of the latest ${b.reviews.length} need${low === 1 ? "s" : ""} attention` : `All of the latest ${b.reviews.length} are 4★ or better`}
                </p>
              )
            })()}
          </div>
        </div>

        <div className="rounded-3xl ring-1 ring-[#E6E6E6] bg-white divide-y divide-[#F0F0F0]">
          <div className="flex items-start gap-4 p-5">
            <span className="w-10 h-10 rounded-xl bg-[#EAF7EE] text-[#137333] flex items-center justify-center shrink-0"><ShieldCheck size={19} /></span>
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-[#0A0A0A]">Ownership verified by Google</p>
              <p className="text-[13px] text-[#777777] truncate">{googleEmail ? `Managed by ${googleEmail}` : "Confirmed with your Google account"}</p>
            </div>
          </div>
          <div className="flex items-start gap-4 p-5">
            <span className="w-10 h-10 rounded-xl bg-[#FFF6BF] text-[#7A6500] flex items-center justify-center shrink-0"><BellRing size={18} /></span>
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-[#0A0A0A]">Review watch is on</p>
              <p className="text-[13px] text-[#777777]">New 1–3★ Google reviews are flagged within minutes.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid 2xl:grid-cols-2 gap-5">
        {/* Reviews: fills the column height and scrolls */}
        <div className="relative min-h-[420px]">
          <div className="2xl:absolute 2xl:inset-0 rounded-3xl ring-1 ring-[#E6E6E6] bg-white flex flex-col overflow-hidden max-h-[560px] 2xl:max-h-none">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[#F0F0F0]">
              <h3 className="text-base font-bold text-[#0A0A0A] flex items-center gap-2">
                <MessageSquareQuote size={17} /> Latest Google reviews

              </h3>
              {b.mapsUrl && <a href={b.mapsUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-[#555555] hover:text-[#0A0A0A] whitespace-nowrap">See all</a>}
            </div>
            {b.reviews.length === 0 ? (
              <p className="text-sm text-[#888888] p-6">No recent reviews to show yet.</p>
            ) : (
              <ul className="flex-1 min-h-0 overflow-y-auto divide-y divide-[#F0F0F0] px-6">
                {b.reviews.map((r, i) => (
                  <li key={i} className="py-4 flex gap-3">
                    {r.authorPhoto ? (
                      <img src={r.authorPhoto} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-[#EFEFEF] flex items-center justify-center text-sm font-bold text-[#666666] shrink-0">{r.author[0]}</div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-x-2 gap-y-1 flex-wrap">
                        <span className="text-sm font-semibold text-[#0A0A0A]">{r.author}</span>
                        <Stars rating={r.rating} size={11} />
                        <span className="text-xs text-[#999999]">{r.relativeTime}</span>
                        {r.rating <= 3 && <span className="text-[10px] font-bold uppercase tracking-wider text-[#B3261E] bg-[#FCE8E6] px-1.5 py-0.5 rounded">Needs attention</span>}
                      </div>
                      {r.text ? <p className="text-sm text-[#444444] mt-1 leading-relaxed">{r.text}</p> : <p className="text-xs text-[#AAAAAA] mt-1">Rating only, no comment</p>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Map, contact, hours */}
        <div className="flex flex-col gap-5">
          <div className="rounded-3xl ring-1 ring-[#E6E6E6] bg-white p-3">
            {hasPin ? (
              <ProfileMap center={[b.lat!, b.lng!]} markerPosition={[b.lat!, b.lng!]} />
            ) : (
              <div className="h-64 rounded-2xl bg-[#F4F4F4] flex items-center justify-center text-sm text-[#888888]">No map location on Google</div>
            )}
            <p className="text-xs text-[#888888] px-2 pt-3 pb-1">You can adjust the pin on the next step if it&apos;s off.</p>
          </div>

          <div className="rounded-3xl ring-1 ring-[#E6E6E6] bg-white p-6">
            <h3 className="text-base font-bold text-[#0A0A0A] mb-3">Contact</h3>
            <ul className="space-y-3 text-sm text-[#444444]">
              <li className="flex items-start gap-2.5"><MapPin size={15} className="text-[#9A9A9A] mt-0.5 shrink-0" />{b.address || "No address on Google"}</li>
              <li className="flex items-center gap-2.5"><Phone size={15} className="text-[#9A9A9A] shrink-0" />{b.phone || "No phone on Google"}</li>
              <li className="flex items-center gap-2.5 min-w-0">
                <Globe size={15} className="text-[#9A9A9A] shrink-0" />
                {b.website ? <a href={b.website} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 truncate">{cleanUrl(b.website)}</a> : "No website on Google"}
              </li>
            </ul>
          </div>

          <div className="rounded-3xl ring-1 ring-[#E6E6E6] bg-white p-6">
            <h3 className="text-base font-bold text-[#0A0A0A] mb-3 flex items-center gap-2"><Clock size={15} /> Hours</h3>
            {b.hours.length === 0 ? (
              <p className="text-sm text-[#888888]">No hours on Google.</p>
            ) : (
              <ul className="space-y-1.5 text-[13px]">
                {b.hours.map((h) => {
                  const [day, ...rest] = h.split(": ")
                  const isToday = day === today
                  return (
                    <li key={h} className={`flex justify-between gap-3 ${isToday ? "font-bold text-[#0A0A0A]" : "text-[#555555]"}`}>
                      <span>{day}</span><span className="text-right whitespace-nowrap">{rest.join(": ")}</span>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
        <p className="text-xs text-[#888888] sm:mr-auto">Wrong business? Go back and pick another one.</p>
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="flex items-center justify-center gap-1.5 h-12 px-6 rounded-full border border-[#E5E5E5] bg-white text-[#0A0A0A] text-sm font-semibold hover:border-[#0A0A0A] transition-all">
            <ArrowLeft size={15} /> Back
          </button>
          <button onClick={onNext} className="flex items-center justify-center gap-1.5 h-12 px-8 rounded-full bg-[#FFE100] text-[#0A0A0A] text-sm font-bold hover:bg-[#FFE100]/90 transition-all">
            Looks right, continue <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </motion.div>
  )
}
