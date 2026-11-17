"use client"

/**
 * Right-hand panel on the Google step, before a business is confirmed:
 * what VLYR does, in plain words. (After confirming, the rating simulator
 * for that business takes over.)
 */
import { BellRing, Gift, MapPin, MessageSquareHeart, QrCode, ScanLine, ShieldCheck, Star, Sticker } from "lucide-react"

const STEPS = [
  { icon: Sticker, title: "Stick it on every order", body: "Each VLYR sticker has its own QR code, so every rating is tied to one order." },
  { icon: ScanLine, title: "Customers rate in seconds", body: "They scan, sign in with Google and tap a star. One rating per sticker keeps every rating real." },
  { icon: Star, title: "Happy customers go public", body: "Customers who loved it get a one-tap link to your Google review page." },
  { icon: BellRing, title: "Unhappy ones reach you first", body: "A 1–3★ rating lands in your dashboard and can text you instantly, so you can make it right." },
]

const INCLUDED = [
  { icon: QrCode, label: "15 printable QR stickers" },
  { icon: MessageSquareHeart, label: "Private feedback inbox" },
  { icon: MapPin, label: "Map of every scan" },
  { icon: Gift, label: "Rewards for feedback" },
  { icon: BellRing, label: "Instant text alerts" },
  { icon: ShieldCheck, label: "Google review watch" },
]

/** freePlan: show what the free trial includes (paid plans skip that box). */
export function VlyrIntroPanel({ freePlan = true }: { freePlan?: boolean }) {
  return (
    <aside className="w-full h-svh overflow-y-auto bg-[#0B0B0C] text-white">
      <div className="w-full px-8 xl:px-12 2xl:px-16 py-10 flex flex-col gap-10">
        <header>
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#FFE100]">Why businesses use VLYR</p>
          <h2 className="text-4xl xl:text-5xl font-bold leading-[1.05] tracking-tight mt-3">
            Turn every order into<br />a five-star moment.
          </h2>
          <p className="text-[15px] text-white/65 mt-4 max-w-xl leading-relaxed">
            Connect your Google business and VLYR starts listening: every sticker scan becomes a rating you can see, act on and grow from.
          </p>
        </header>

        <section className="flex flex-col gap-3">
          <h3 className="text-lg font-bold">How it works</h3>
          <ol className="grid 2xl:grid-cols-2 gap-3">
            {STEPS.map(({ icon: Icon, title, body }, i) => (
              <li key={title} className="rounded-2xl bg-white/[0.04] ring-1 ring-white/10 p-5 flex gap-4">
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <span className="w-10 h-10 rounded-xl bg-[#FFE100] text-[#0A0A0A] flex items-center justify-center"><Icon size={18} /></span>
                  <span className="text-[11px] font-bold text-white/40">0{i + 1}</span>
                </div>
                <div>
                  <p className="text-[15px] font-semibold">{title}</p>
                  <p className="text-[13px] text-white/65 leading-relaxed mt-1">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {freePlan && <section className="rounded-3xl bg-gradient-to-br from-[#FFE100]/15 to-transparent ring-1 ring-[#FFE100]/25 p-6">
          <h3 className="text-lg font-bold">Included in your free trial</h3>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-3 mt-4">
            {INCLUDED.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2.5 text-[14px] text-white/85">
                <Icon size={16} className="text-[#FFE100] shrink-0" /> {label}
              </li>
            ))}
          </ul>
          <p className="text-[12px] text-white/45 mt-5">No credit card. Upgrade any time for custom-designed stickers and more.</p>
        </section>}

        <section className="rounded-2xl bg-white/[0.03] ring-1 ring-white/10 p-5 flex gap-4">
          <ShieldCheck size={22} className="text-[#7CFFB2] shrink-0 mt-0.5" />
          <div>
            <p className="text-[15px] font-semibold">Only the real owner can connect</p>
            <p className="text-[13px] text-white/65 leading-relaxed mt-1">
              Google confirms you manage the business before VLYR shows anything. Nobody else can claim it, and we never post or reply on your behalf.
            </p>
          </div>
        </section>
      </div>
    </aside>
  )
}
