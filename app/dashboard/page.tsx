"use client"

import { motion } from "framer-motion"
import useSWR from "swr"
import Link from "next/link"
import { 
  BarChart3, ShieldCheck, Star, QrCode, TrendingUp, Building2, 
  ExternalLink, ArrowRight, CheckCircle2 
} from "lucide-react"
import {
    XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts"
import { createClient } from "@/lib/supabase/client"
import { VLYRLoader } from "@/components/vlyr-loader"
import { CustomerActivityList, fetchActivity, type ActivityData } from "@/components/customer-activity"

/** Ratings per day for the last 7 days (in the viewer's time zone). */
function dailyRatings(recent: ActivityData["recent"]) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - (6 - i))
    return { start: d.getTime(), name: i === 6 ? "Today" : d.toLocaleDateString(undefined, { weekday: "short" }), happy: 0, unhappy: 0 }
  })
  for (const r of recent) {
    const t = new Date(r.createdAt).getTime()
    const day = [...days].reverse().find((d) => t >= d.start)
    if (!day || r.rating === null) continue
    if (r.rating >= 4) day.happy++
    else day.unhappy++
  }
  return days
}

/** Private feedback vs customers invited to Google, per week for 4 weeks. */
function weeklyShield(recent: ActivityData["recent"]) {
  const now = Date.now()
  const week = 7 * 24 * 60 * 60 * 1000
  const weeks = [3, 2, 1, 0].map((ago) => ({ name: ago === 0 ? "This week" : `${ago} wk ago`, ago, shielded: 0, google: 0 }))
  for (const r of recent) {
    const ago = Math.floor((now - new Date(r.createdAt).getTime()) / week)
    const w = weeks.find((x) => x.ago === ago)
    if (!w || r.rating === null) continue
    if (r.rating >= 4) w.google++
    else w.shielded++
  }
  return weeks
}

interface GoogleReview {
  author: string
  rating: number
  text: string
  relativeTime: string
  authorPhoto: string | null
}

interface GoogleReviewsData {
  success?: boolean
  businessName?: string
  rating?: number
  totalReviews?: number
  googleUrl?: string
  reviews: GoogleReview[]
  error?: string
}

async function fetchGoogleReviews(): Promise<GoogleReviewsData> {
  try {
    const res = await fetch("/api/google/reviews")
    return await res.json()
  } catch {
    return { reviews: [], error: "Failed to fetch reviews" }
  }
}


interface MerchantData {
  business_name: string
  google_connected: boolean
  google_ownership_verified: boolean
  google_account_name: string | null
  google_location_id: string | null
}

async function fetchStats() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [scansRes, ordersRes, merchantRes] = await Promise.all([
    supabase
      .from("scans")
      .select("id, rating", { count: "exact" })
      .eq("merchant_id", user.id),
    supabase
      .from("orders")
      .select("id", { count: "exact" })
      .eq("merchant_id", user.id),
    supabase
      .from("merchants")
      .select("business_name, google_connected, google_ownership_verified, google_account_name, google_location_id")
      .eq("id", user.id)
      .single(),
  ])

  const totalScans = scansRes.count ?? 0
  const scans = scansRes.data ?? []
  const shielded = scans.filter((s) => s.rating !== null && s.rating <= 3).length
  const positiveScans = scans.filter((s) => s.rating !== null && s.rating >= 4)
  const avgRating = positiveScans.length > 0
    ? (positiveScans.reduce((sum, s) => sum + (s.rating ?? 0), 0) / positiveScans.length).toFixed(1)
    : "0.0"

  return {
    totalScans,
    shielded,
    avgRating,
    totalOrders: ordersRes.count ?? 0,
    merchant: merchantRes.data as MerchantData | null,
  }
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
}
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
}

export default function DashboardOverview() {
  const { data: stats, isLoading } = useSWR("dashboard-stats", fetchStats)
  const { data: activity, mutate: refreshActivity } = useSWR("dashboard-activity", () => fetchActivity(50), { refreshInterval: 30000 })
  const a = activity?.stats
  const { data: reviewsData } = useSWR<GoogleReviewsData>(
    stats?.merchant?.google_ownership_verified ? "google-reviews" : null,
    fetchGoogleReviews
  )

  if (isLoading) {
    return <VLYRLoader variant="card" message="Loading your shield analytics..." />
  }

  const merchant = stats?.merchant
  // Verified ownership, not just "signed in with Google"
  const googleConnected = merchant?.google_ownership_verified === true
  const reviews = reviewsData?.reviews ?? []
  const hasReviews = reviews.length > 0

  const STATS = [
    {
      label: "Sticker scans",
      value: a ? a.stickerScans.toLocaleString() : "0",
      change: "All time",
      icon: QrCode,
    },
    {
      label: a?.avgRating ? `Ratings · avg ${a.avgRating}★` : "Ratings",
      value: a ? String(a.ratings) : "0",
      change: "From customers",
      icon: Star,
    },
    {
      label: "Need follow-up",
      value: a ? String(a.needsFollowUp) : "0",
      change: `${a?.privateFeedback ?? 0} kept private`,
      icon: ShieldCheck,
      alert: (a?.needsFollowUp ?? 0) > 0,
    },
    {
      label: "Invited to Google",
      value: a ? String(a.sentToGoogle) : "0",
      change: `${a?.rewardsRedeemed ?? 0}/${a?.rewardsIssued ?? 0} rewards used`,
      icon: TrendingUp,
    },
  ]

  const daily = dailyRatings(activity?.recent ?? [])
  const weekly = weeklyShield(activity?.recent ?? [])
  // Unresolved complaints first, then newest
  const latest = [...(activity?.items ?? [])]
    .sort((x, y) => Number((y.rating ?? 5) <= 3 && !y.resolvedAt) - Number((x.rating ?? 5) <= 3 && !x.resolvedAt))
    .slice(0, 5)

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col gap-6">
      {/* Page title */}
      <motion.div variants={item} className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground">
          Your Reputation Shield analytics at a glance.
        </p>
      </motion.div>

      {/* Google Identity Bridge Status Card */}
      <motion.div variants={item}>
        {googleConnected ? (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-500/5 via-green-500/5 to-emerald-500/5 border border-green-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-green-500/20 flex items-center justify-center">
                  <CheckCircle2 size={20} className="text-green-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">Identity Bridge Active</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-green-500/15 text-green-400 border border-green-500/20">
                      VERIFIED
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Verified owner of {merchant?.business_name || merchant?.google_account_name || "your Google Business Profile"}
                  </p>
                </div>
              </div>
              <a
                href={`https://business.google.com/locations/${merchant?.google_location_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                View on Google <ExternalLink size={12} />
              </a>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-yellow-500/5 to-orange-500/5 border border-yellow-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                  <Building2 size={20} className="text-yellow-400" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-foreground">Connect Google Business</span>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Verify your identity and display your Google reviews
                  </p>
                </div>
              </div>
              <Link
                href="/dashboard/profile"
                className="flex items-center gap-1.5 text-xs font-medium text-[#FFE100] hover:underline underline-offset-4"
              >
                Set up now <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        )}
      </motion.div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STATS.map((stat) => (
          <motion.div
            key={stat.label}
            variants={item}
            className={`flex flex-col gap-2 p-4 bg-card border rounded-xl ${"alert" in stat && stat.alert ? "border-red-400/50" : "border-border"}`}
          >
            <div className="flex items-center justify-between">
              <stat.icon size={16} className="text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-0.5">
                {stat.change}
              </span>
            </div>
            <span className={`text-2xl font-bold tracking-tight ${"alert" in stat && stat.alert ? "text-red-400" : "text-foreground"}`}>
              {stat.value}
            </span>
            <span className="text-xs text-muted-foreground">{stat.label}</span>
          </motion.div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Scans chart */}
        <motion.div
          variants={item}
          className="flex flex-col gap-3 p-4 bg-card border border-border rounded-xl"
        >
          <div className="flex items-center gap-2">
            <BarChart3 size={16} className="text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">Ratings, last 7 days</span>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="name" stroke="#666" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#666" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: "8px", color: "#fff", fontSize: "12px" }}
                />
                <Bar dataKey="happy" name="4–5 stars" stackId="r" fill="#FFE100" />
                <Bar dataKey="unhappy" name="1–3 stars" stackId="r" fill="#f87171" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Shield chart */}
        <motion.div
          variants={item}
          className="flex flex-col gap-3 p-4 bg-card border border-border rounded-xl"
        >
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">
              Kept private vs invited to Google
            </span>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="name" stroke="#666" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#666" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "#1a1a1a",
                    border: "1px solid #333",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="shielded" name="Kept private (1–3★)" fill="#f87171" radius={[4, 4, 0, 0]} />
                <Bar dataKey="google" name="Invited to Google (4–5★)" fill="#FFE100" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Customer activity */}
      <motion.div variants={item} className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Customer activity</h2>
            <p className="text-xs text-muted-foreground">
              Who scanned, what they said, and how to reach them. Unhappy customers who still need a reply come first.
            </p>
          </div>
          <Link href="/dashboard/feedback" className="text-xs font-medium text-[#FFE100] hover:underline underline-offset-4 flex items-center gap-1 shrink-0">
            View all <ArrowRight size={12} />
          </Link>
        </div>
        <CustomerActivityList
          items={latest}
          businessName={merchant?.business_name || "our team"}
          onChanged={() => refreshActivity()}
          emptyText="No ratings yet. Print your stickers from Supply Shop and put one on every order; ratings show up here within seconds."
        />
      </motion.div>

      {/* Google Reviews section */}
      {googleConnected ? (
        <motion.div variants={item} className="flex flex-col gap-3 p-4 bg-card border border-border rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star size={16} className="text-[#FFE100]" />
              <span className="text-sm font-semibold text-foreground">Google Reviews</span>
              {reviewsData?.rating && (
                <span className="text-xs text-muted-foreground">
                  {reviewsData.rating.toFixed(1)} ({reviewsData.totalReviews} reviews)
                </span>
              )}
            </div>
            <a
              href={reviewsData?.googleUrl || `https://search.google.com/local/reviews?placeid=${merchant?.google_location_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              View all <ExternalLink size={10} />
            </a>
          </div>

          {hasReviews ? (
            <div className="space-y-3">
              {reviews.slice(0, 3).map((review, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-secondary/30 border border-border/50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {review.authorPhoto ? (
                        <img 
                          src={review.authorPhoto} 
                          alt={review.author}
                          className="w-7 h-7 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-[10px] font-bold text-white">
                          {review.author.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="text-xs font-medium text-foreground">{review.author}</span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          size={10} 
                          className={i < review.rating ? "fill-[#FFE100] text-[#FFE100]" : "text-muted-foreground/30"} 
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    &quot;{review.text}&quot;
                  </p>
                  <span className="text-[10px] text-muted-foreground/60 mt-2 block">
                    {review.relativeTime}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-secondary/30 border border-border/50 text-center">
              <div className="flex justify-center mb-3">
                <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                  <CheckCircle2 size={24} className="text-green-500" />
                </div>
              </div>
              <p className="text-sm font-medium text-foreground mb-1">Business Verified</p>
              <p className="text-xs text-muted-foreground mb-3">
                {reviewsData?.error 
                  ? "Add your Google Places API key in Settings → Vars to display real reviews"
                  : "Your QR codes now link directly to your Google review page"}
              </p>
              <a
                href={`https://search.google.com/local/writereview?placeid=${merchant?.google_location_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#FFE100] hover:underline underline-offset-4"
              >
                Test your review link <ExternalLink size={10} />
              </a>
            </div>
          )}

          <p className="text-[10px] text-muted-foreground/50 text-center">
            {hasReviews ? "Real reviews from Google Business Profile" : "Reviews from scans will appear in your analytics above"}
          </p>
        </motion.div>
      ) : null}
    </motion.div>
  )
}
