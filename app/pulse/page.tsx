"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Download, ExternalLink, Gift, Heart, MapPin, QrCode, ShieldCheck } from "lucide-react"
import { PulseCheck, type PulseResult } from "@/components/PulseCheck"
import { VLYRSkeleton } from "@/components/VLYRSkeleton"

/**
 * Customer feedback page, opened by scanning a sticker (/s/CODE -> /pulse?c=CODE).
 * Flow: sign in with Google -> rate -> (reward code) -> optional Google review.
 * Each sticker can be rated once.
 */

interface Reward {
  code: string
  offer: string
  expiresAt: string
}

interface Info {
  /** false: the business no longer uses VLYR */
  active?: boolean
  /** Phone numbers must be confirmed with a texted code */
  phoneVerification?: boolean
  businessName: string
  reviewUrl: string | null
  rewardOffer: string | null
  rewardValidDays: number
  used: boolean
  usedByMe: boolean
  customer: { name: string; email: string } | null
  reward: Reward | null
  myRating: number | null
}

type Screen = "loading" | "no-code" | "unknown" | "inactive" | "sign-in" | "rate" | "done" | "used"

const SIGN_IN_ERRORS: Record<string, string> = {
  sign_in_cancelled: "Sign-in was cancelled. Please try again to leave your rating.",
  sign_in_expired: "That sign-in took too long. Please try again.",
  sign_in_failed: "We couldn't sign you in with Google. Please try again.",
  email_not_verified: "Your Google email isn't verified yet.",
  google_not_configured: "Google sign-in isn't available right now.",
}

export default function PulsePage() {
  return (
    <Suspense fallback={<VLYRSkeleton />}>
      <PulseContent />
    </Suspense>
  )
}

function PulseContent() {
  const params = useSearchParams()
  const code = params.get("c")
  const signInError = params.get("error")
  const [screen, setScreen] = useState<Screen>("loading")
  const [info, setInfo] = useState<Info | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(
    signInError ? SIGN_IN_ERRORS[signInError] ?? SIGN_IN_ERRORS.sign_in_failed : null,
  )
  const [rating, setRating] = useState<number | null>(null)
  const [reward, setReward] = useState<Reward | null>(null)
  // Exact location is only sent if the customer turns this on
  const [location, setLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null)
  const [locStatus, setLocStatus] = useState<"off" | "asking" | "on" | "denied">("off")

  const toggleLocation = () => {
    if (locStatus === "on") { setLocation(null); setLocStatus("off"); return }
    if (!navigator.geolocation) { setLocStatus("denied"); return }
    setLocStatus("asking")
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: Math.round(pos.coords.accuracy) })
        setLocStatus("on")
      },
      () => setLocStatus("denied"),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  }

  useEffect(() => {
    if (!code) {
      setScreen("no-code")
      return
    }
    let cancelled = false
    fetch(`/api/pulse?c=${encodeURIComponent(code)}`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("unknown")
        const data: Info = await res.json()
        if (cancelled) return
        setInfo(data)
        if (data.active === false) {
          setScreen("inactive")
        } else if (data.used) {
          setReward(data.reward)
          setRating(data.myRating)
          setScreen("used")
        } else {
          setScreen(data.customer ? "rate" : "sign-in")
        }
      })
      .catch(() => !cancelled && setScreen("unknown"))
    return () => {
      cancelled = true
    }
  }, [code])

  const handleSubmit = async (result: PulseResult) => {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch("/api/pulse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, ...result, location }),
      })
      const json = await res.json()
      if (res.status === 401) return setScreen("sign-in")
      if (res.status === 409) return setScreen("used")
      if (!res.ok) throw new Error(json.error ?? "Could not save your rating")
      setRating(result.rating)
      setReward(json.reward ?? null)
      setScreen("done")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your rating")
    } finally {
      setSubmitting(false)
    }
  }

  const name = info?.businessName ?? "this business"
  const happy = rating !== null && rating >= 4

  return (
    <main className="relative min-h-svh flex flex-col bg-background overflow-hidden">
      <AnimatePresence>{screen === "loading" && <VLYRSkeleton />}</AnimatePresence>

      {screen !== "loading" && (
        <div className="flex flex-col min-h-svh">
          <header className="flex items-center justify-center px-5 py-4 shrink-0 border-b border-border">
            <div className="flex items-center gap-2.5">
              <img src="/images/vlyr-logo.png" alt="VLYR" className="h-6 w-auto" />
              <span className="text-border text-lg font-light select-none">|</span>
              <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Pulse Check</span>
            </div>
          </header>

          <div className="flex-1 flex flex-col items-center justify-center px-5 py-8">
            <motion.div
              key={screen}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-sm flex flex-col items-center gap-6"
            >
              {error && (
                <p className="w-full text-sm text-center rounded-xl border border-red-500/30 bg-red-500/10 text-red-500 p-3">{error}</p>
              )}

              {screen === "no-code" && (
                <Message icon={<QrCode size={28} className="text-accent" />} title="Scan a VLYR sticker">
                  Point your phone camera at the QR sticker on your order to rate it.
                </Message>
              )}

              {screen === "unknown" && (
                <Message icon={<ShieldCheck size={28} className="text-accent" />} title="This sticker isn't active">
                  It may have been replaced or switched off by the business. If you&apos;d like to share feedback, please let the staff know in person.
                </Message>
              )}

              {screen === "inactive" && (
                <Message icon={<ShieldCheck size={28} className="text-accent" />} title={`${name} isn't collecting feedback here right now`}>
                  This sticker is no longer active, so nothing was sent. If you&apos;d like to share feedback, please speak to the team directly. Thank you for scanning.
                </Message>
              )}

              {screen === "sign-in" && (
                <>
                  <BusinessBadge name={name} />
                  {info?.rewardOffer ? (
                    <div className="w-full rounded-2xl border-2 border-dashed border-accent bg-accent/10 p-5 text-center flex flex-col items-center gap-2">
                      <Gift size={26} className="text-accent" />
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your thank-you gift</p>
                      <p className="text-lg font-bold text-foreground leading-snug">{info.rewardOffer}</p>
                      <p className="text-xs text-muted-foreground">Rate your order in about 10 seconds to unlock it.</p>
                    </div>
                  ) : null}
                  <div className="text-center flex flex-col gap-2">
                    <h1 className="text-xl font-bold text-foreground">How was your order?</h1>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Your honest rating goes straight to {name}{info?.rewardOffer ? " and unlocks your gift" : " and helps them get better"}.
                      Sign in with Google so we know it&apos;s really you. Each sticker can be used once.
                    </p>
                  </div>
                  <a
                    href={`/api/customer/google?c=${encodeURIComponent(code ?? "")}`}
                    className="w-full flex items-center justify-center gap-3 h-12 rounded-xl bg-foreground text-background font-semibold"
                  >
                    <span className="bg-white rounded-full p-1 flex"><GoogleIcon /></span>
                    Continue with Google
                  </a>
                  <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
                    We only use your name and email so {name} can follow up on your feedback. Nothing is posted publicly.
                  </p>
                </>
              )}

              {screen === "rate" && (
                <>
                  <BusinessBadge name={name} />
                  {info?.rewardOffer && (
                    <p className="flex items-center gap-2 text-xs font-medium text-foreground bg-accent/15 border border-accent/40 rounded-full px-3 py-1.5">
                      <Gift size={13} className="text-accent" /> Rate to unlock: {info.rewardOffer}
                    </p>
                  )}
                  <PulseCheck merchantName={name} customerEmail={info?.customer?.email} submitting={submitting} onSubmit={handleSubmit} stickerCode={code ?? undefined} phoneVerification={!!info?.phoneVerification} />
                  <button
                    type="button"
                    onClick={toggleLocation}
                    aria-pressed={locStatus === "on"}
                    className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                      locStatus === "on" ? "border-foreground bg-secondary" : "border-border bg-card"
                    }`}
                  >
                    <MapPin size={16} className={locStatus === "on" ? "text-foreground" : "text-muted-foreground"} />
                    <span className="flex-1">
                      <span className="block text-sm font-medium text-foreground">
                        {locStatus === "on" ? "Location shared" : locStatus === "asking" ? "Getting your location..." : "Share my location (optional)"}
                      </span>
                      <span className="block text-[11px] text-muted-foreground">
                        {locStatus === "denied"
                          ? "Location is off on this phone. That's fine, you can still rate."
                          : `Helps ${name} see where their orders are enjoyed. Only they see it.`}
                      </span>
                    </span>
                  </button>
                  {info?.customer && <p className="text-[11px] text-muted-foreground">Signed in as {info.customer.email}</p>}
                </>
              )}

              {screen === "done" && (
                <>
                  <Message
                    icon={<Heart size={28} className="text-accent fill-accent" />}
                    title={happy ? `Thanks for rating ${name}!` : `${name} has your message`}
                  >
                    {happy
                      ? "Your rating helps them keep doing what you liked."
                      : "The manager sees it right away and will use it to make your next visit better."}
                  </Message>
                  {reward && <RewardCard reward={reward} />}
                  {happy && info?.reviewUrl && <ShareOnGoogle url={info.reviewUrl} name={name} />}
                </>
              )}

              {screen === "used" && (
                <>
                  <Message icon={<ShieldCheck size={28} className="text-accent" />} title="This sticker has been used">
                    {info?.usedByMe ? "You've already rated this order. Thank you!" : "Each sticker can be rated once. Thanks for scanning!"}
                  </Message>
                  {reward && <RewardCard reward={reward} />}
                  {info?.usedByMe && happy && info.reviewUrl && <ShareOnGoogle url={info.reviewUrl} name={name} />}
                </>
              )}
            </motion.div>
          </div>

          <footer className="flex items-center justify-center px-5 py-5 shrink-0 bg-vlyr-dark">
            <span className="text-[#FFFFFF]/40 text-[11px] font-medium tracking-wide">Powered by VLYR</span>
          </footer>
        </div>
      )}
    </main>
  )
}

function BusinessBadge({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border">
      <ShieldCheck size={16} className="text-accent" />
      <span className="text-foreground text-sm font-semibold">{name}</span>
    </div>
  )
}

function Message({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="w-full rounded-2xl bg-card border border-border p-6 flex flex-col items-center gap-3 text-center">
      {icon}
      <p className="text-foreground font-semibold">{title}</p>
      <p className="text-muted-foreground text-sm leading-relaxed">{children}</p>
    </div>
  )
}

/** Draw the reward as an image the customer can keep in their photos. */
function saveRewardImage(reward: Reward, until: string) {
  const c = document.createElement("canvas")
  c.width = 900
  c.height = 520
  const g = c.getContext("2d")
  if (!g) return
  g.fillStyle = "#0A0A0A"
  g.fillRect(0, 0, 900, 520)
  g.strokeStyle = "#FFE100"
  g.lineWidth = 6
  g.setLineDash([18, 12])
  g.strokeRect(24, 24, 852, 472)
  g.setLineDash([])
  g.textAlign = "center"
  g.fillStyle = "#FFE100"
  g.font = "bold 30px sans-serif"
  g.fillText("YOUR REWARD", 450, 100)
  g.fillStyle = "#FFFFFF"
  g.font = "bold 40px sans-serif"
  g.fillText(reward.offer.slice(0, 40), 450, 180)
  g.font = "bold 110px monospace"
  g.fillText(reward.code, 450, 320)
  g.fillStyle = "#BBBBBB"
  g.font = "26px sans-serif"
  g.fillText(`Show this code at the counter · Valid until ${until}`, 450, 400)
  g.fillStyle = "#FFE100"
  g.font = "bold 24px sans-serif"
  g.fillText("VLYR", 450, 460)
  const a = document.createElement("a")
  a.download = `reward-${reward.code}.png`
  a.href = c.toDataURL("image/png")
  a.click()
}

/** Opens Google in a new tab so this page (and the reward code) stays open. */
function ShareOnGoogle({ url, name }: { url: string; name: string }) {
  return (
    <div className="w-full flex flex-col items-center gap-2">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full flex items-center justify-center gap-2 h-12 rounded-xl border border-border bg-card text-foreground font-semibold"
      >
        <ExternalLink size={16} /> Share it on Google
      </a>
      <p className="text-[11px] text-muted-foreground text-center">
        Optional. Opens {name}&apos;s Google page in a new tab, where you post with your Google account.
      </p>
    </div>
  )
}

function RewardCard({ reward }: { reward: Reward }) {
  const until = new Date(reward.expiresAt).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })
  return (
    <div className="w-full rounded-2xl border-2 border-dashed border-accent bg-accent/10 p-5 flex flex-col items-center gap-2 text-center">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Gift size={16} className="text-accent" /> Your reward
      </div>
      <p className="text-base font-bold text-foreground">{reward.offer}</p>
      <p className="font-mono text-3xl font-bold tracking-[0.2em] text-foreground">{reward.code}</p>
      <p className="text-xs text-muted-foreground">Show this code at the counter. One-time use, valid until {until}.</p>
      <button
        type="button"
        onClick={() => saveRewardImage(reward, until)}
        className="mt-1 flex items-center gap-2 text-sm font-semibold text-foreground bg-card border border-border rounded-xl px-4 py-2"
      >
        <Download size={15} /> Save reward to my phone
      </button>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}
