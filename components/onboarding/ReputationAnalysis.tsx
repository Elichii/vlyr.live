"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Star,
  TrendingUp,
  Target,
  AlertTriangle,
  Shield,
  ArrowRight,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  BarChart3,
  CheckCircle2,
  Zap,
  Eye,
  EyeOff,
  Users,
  Sparkles,
} from "lucide-react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

interface ReviewData {
  author: string
  rating: number
  text: string
  time: number
  relativeTime: string
}

interface BusinessData {
  businessName: string
  rating: number
  totalReviews: number
  reviews: ReviewData[]
  address?: string
  phone?: string
  category?: string
  logoUrl?: string
  openingHours?: string[]
}

interface ReputationAnalysisProps {
  businessData: BusinessData
  onContinue: () => void
  onBack: () => void
}

// Correct mathematical formula for calculating reviews needed
// Formula: X = N × (Rt - Rc) / (5 - Rt)
// Where: N = Total reviews, Rt = Target rating, Rc = Current rating
function reviewsNeededForRating(
  currentRating: number,
  totalReviews: number,
  targetRating: number
): number {
  if (currentRating >= targetRating) return 0
  if (targetRating >= 5) {
    // For a perfect 5.0, we need a different calculation
    // Every new 5-star brings up the average, but it's impossible to reach exactly 5.0
    // Calculate how many to get to 4.95 instead (rounds to 5.0)
    const adjustedTarget = 4.95
    const needed = Math.ceil(
      (totalReviews * (adjustedTarget - currentRating)) / (5 - adjustedTarget)
    )
    return Math.max(0, needed)
  }
  const needed = Math.ceil(
    (totalReviews * (targetRating - currentRating)) / (5 - targetRating)
  )
  return Math.max(0, needed)
}

// Calculate how many 5-star reviews needed to "erase" a single 1-star review
// To show 5.0 (really 4.95), with N1 one-star reviews:
// (1 × N1 + 5 × N5) / (N1 + N5) = 4.95
// Solving: N5 = (4.95 - 1) × N1 / (5 - 4.95) = 3.95 × N1 / 0.05 = 79 × N1
function fiveStarReviewsToCounterOneStar(oneStarCount: number): number {
  return Math.ceil(79 * oneStarCount)
}

// The "Reputation Debt" - how many 5-star reviews to reach 5.0 given current 1-star reviews
function getReputationDebt(oneStarReviews: number): { reviews: number; effort: string }[] {
  return [
    { reviews: 1, effort: fiveStarReviewsToCounterOneStar(1).toString() },
    { reviews: 5, effort: fiveStarReviewsToCounterOneStar(5).toString() },
    { reviews: 10, effort: fiveStarReviewsToCounterOneStar(10).toString() },
    { reviews: 20, effort: fiveStarReviewsToCounterOneStar(20).toString() },
  ]
}

export function ReputationAnalysis({ businessData, onContinue, onBack }: ReputationAnalysisProps) {
  const [activeSection, setActiveSection] = useState<"overview" | "gap" | "roadmap">("overview")
  
  const { rating, totalReviews, reviews, businessName } = businessData
  
  // Calculate rating distribution from reviews
  const ratingDistribution = [0, 0, 0, 0, 0]
  reviews.forEach((r) => {
    if (r.rating >= 1 && r.rating <= 5) {
      ratingDistribution[r.rating - 1]++
    }
  })
  
  // If we don't have enough reviews data, estimate based on rating
  const estimatedDistribution = totalReviews > reviews.length
  let displayDistribution = ratingDistribution
  
  if (reviews.length < totalReviews && totalReviews > 0) {
    // Estimate distribution based on average rating
    const avg = rating
    displayDistribution = [
      Math.round(totalReviews * (avg < 2 ? 0.3 : avg < 3 ? 0.15 : avg < 4 ? 0.08 : 0.03)),
      Math.round(totalReviews * (avg < 2 ? 0.25 : avg < 3 ? 0.15 : avg < 4 ? 0.07 : 0.04)),
      Math.round(totalReviews * (avg < 3 ? 0.2 : avg < 4 ? 0.15 : 0.08)),
      Math.round(totalReviews * (avg < 3 ? 0.15 : avg < 4 ? 0.25 : 0.25)),
      Math.round(totalReviews * (avg < 3 ? 0.1 : avg < 4 ? 0.37 : 0.6)),
    ]
  }

  const ratingData = displayDistribution.map((count, i) => ({
    stars: i + 1,
    count,
    percentage: totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0,
  })).reverse()

  // Sentiment breakdown
  const negativeReviewsEstimate = displayDistribution[0] + displayDistribution[1]
  const neutralReviewsEstimate = displayDistribution[2]
  const positiveReviewsEstimate = displayDistribution[3] + displayDistribution[4]
  
  const positivePercentage = totalReviews > 0 ? Math.round((positiveReviewsEstimate / totalReviews) * 100) : 0
  const negativePercentage = totalReviews > 0 ? Math.round((negativeReviewsEstimate / totalReviews) * 100) : 0
  const neutralPercentage = totalReviews > 0 ? Math.round((neutralReviewsEstimate / totalReviews) * 100) : 0

  // Growth roadmap with correct formula
  const currentRatingRounded = Math.floor(rating * 10) / 10
  const improvementTargets = [
    { 
      target: Math.ceil(rating * 2) / 2, // Next 0.5 increment
      needed: reviewsNeededForRating(rating, totalReviews, Math.ceil(rating * 2) / 2),
      label: `+${(Math.ceil(rating * 2) / 2 - rating).toFixed(1)} Stars`,
      milestone: "Next Milestone"
    },
    { 
      target: 4.0, 
      needed: reviewsNeededForRating(rating, totalReviews, 4.0), 
      label: "4.0 Stars",
      milestone: "Good Standing" 
    },
    { 
      target: 4.5, 
      needed: reviewsNeededForRating(rating, totalReviews, 4.5), 
      label: "4.5 Stars",
      milestone: "Excellent" 
    },
  ].filter(t => t.target > rating && t.needed > 0)

  // Mock trend data for visualization
  const trendData = [
    { month: "6mo ago", rating: Math.max(1, rating - 0.2) },
    { month: "5mo ago", rating: Math.max(1, rating - 0.15) },
    { month: "4mo ago", rating: Math.max(1, rating - 0.1) },
    { month: "3mo ago", rating: Math.max(1, rating - 0.08) },
    { month: "2mo ago", rating: Math.max(1, rating - 0.03) },
    { month: "Now", rating: rating },
  ]

  // Recent negative reviews
  const recentNegativeReviews = reviews
    .filter(r => r.rating <= 2)
    .slice(0, 2)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex bg-black/60 backdrop-blur-sm"
    >
      {/* Left Side - Value Proposition */}
      <motion.div 
        initial={{ x: -50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="hidden lg:flex lg:w-1/2 flex-col justify-center p-12 bg-gradient-to-br from-background via-background to-secondary/30"
      >
        <div className="max-w-lg mx-auto space-y-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FFE100]/10 border border-[#FFE100]/20 text-[#FFE100] text-xs font-medium mb-6">
              <Sparkles size={12} />
              Why VLYR Works
            </div>
            <h2 className="text-3xl font-bold text-foreground leading-tight">
              Turn Every Customer Into a
              <span className="text-[#FFE100]"> 5-Star Advocate</span>
            </h2>
          </div>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                <EyeOff size={18} className="text-red-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-1">The Invisible Problem</h3>
                <p className="text-sm text-muted-foreground">
                  Most low ratings come from customers who felt unheard <em>at the moment of service</em>. 
                  By the time they leave a review, it's too late.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#FFE100]/10 flex items-center justify-center shrink-0">
                <Eye size={18} className="text-[#FFE100]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-1">VLYR Intercepts Issues</h3>
                <p className="text-sm text-muted-foreground">
                  Our QR code system captures feedback instantly, giving you a <strong className="text-foreground">second chance</strong> to 
                  resolve concerns privately before they hit Google.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
                <TrendingUp size={18} className="text-green-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-1">Amplify Happy Customers</h3>
                <p className="text-sm text-muted-foreground">
                  Satisfied customers are guided directly to leave a 5-star Google review. 
                  Watch your rating climb while protecting your reputation.
                </p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
            <div className="text-center">
              <div className="text-2xl font-bold text-[#FFE100]">73%</div>
              <div className="text-xs text-muted-foreground">Issues resolved<br/>before Google</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">+0.8</div>
              <div className="text-xs text-muted-foreground">Avg. rating<br/>improvement</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">2x</div>
              <div className="text-xs text-muted-foreground">More 5-star<br/>reviews</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Right Side - Analysis Panel */}
      <motion.div 
        initial={{ x: 50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="w-full lg:w-1/2 bg-background overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FFE100] to-[#FFE100]/60 flex items-center justify-center">
                <BarChart3 size={20} className="text-black" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Reputation Insights</h2>
                <p className="text-xs text-muted-foreground">{businessName}</p>
              </div>
            </div>
          </div>

          {/* Section Tabs */}
          <div className="flex items-center gap-2">
            {[
              { id: "overview", label: "Overview", icon: BarChart3 },
              { id: "gap", label: "Reputation Gap", icon: AlertTriangle },
              { id: "roadmap", label: "Growth Plan", icon: Target },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id as typeof activeSection)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeSection === tab.id
                    ? "bg-[#FFE100] text-black"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {/* Overview Section */}
            {activeSection === "overview" && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Current Rating Hero */}
                <div className="bg-gradient-to-br from-secondary to-secondary/50 rounded-2xl p-6 border border-border">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2">
                    Your Current Google Rating
                  </p>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-5xl font-bold text-foreground">{rating.toFixed(1)}</span>
                        <span className="text-lg text-muted-foreground">/ 5.0</span>
                      </div>
                      <div className="flex items-center gap-1 mt-2">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            size={18}
                            className={i < Math.round(rating) ? "fill-[#FFE100] text-[#FFE100]" : "text-muted-foreground/30"}
                          />
                        ))}
                        <span className="text-xs text-muted-foreground ml-2">
                          {totalReviews.toLocaleString()} reviews
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-2.5 rounded-xl bg-green-500/10 border border-green-500/20">
                        <ThumbsUp size={14} className="text-green-500 mx-auto mb-1" />
                        <span className="text-lg font-bold text-green-500">{positivePercentage}%</span>
                        <p className="text-[9px] text-muted-foreground">Positive</p>
                      </div>
                      <div className="text-center p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                        <MessageSquare size={14} className="text-amber-500 mx-auto mb-1" />
                        <span className="text-lg font-bold text-amber-500">{neutralPercentage}%</span>
                        <p className="text-[9px] text-muted-foreground">Neutral</p>
                      </div>
                      <div className="text-center p-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
                        <ThumbsDown size={14} className="text-red-500 mx-auto mb-1" />
                        <span className="text-lg font-bold text-red-500">{negativePercentage}%</span>
                        <p className="text-[9px] text-muted-foreground">Negative</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Rating Trend */}
                <div className="bg-card rounded-2xl border border-border p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                    <TrendingUp size={16} className="text-[#FFE100]" />
                    Rating Trend
                  </h3>
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendData}>
                        <defs>
                          <linearGradient id="ratingGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#FFE100" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#FFE100" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                        <XAxis dataKey="month" tick={{ fill: "#888", fontSize: 10 }} />
                        <YAxis domain={[1, 5]} tick={{ fill: "#888", fontSize: 10 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#1A1A1A",
                            border: "1px solid #2A2A2A",
                            borderRadius: "8px",
                            fontSize: "12px",
                          }}
                          formatter={(value: number) => [value.toFixed(2), "Rating"]}
                        />
                        <Area
                          type="monotone"
                          dataKey="rating"
                          stroke="#FFE100"
                          strokeWidth={2}
                          fill="url(#ratingGradient)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Rating Distribution */}
                <div className="bg-card rounded-2xl border border-border p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                    <BarChart3 size={16} className="text-[#FFE100]" />
                    Rating Distribution
                    {estimatedDistribution && <span className="text-[10px] text-muted-foreground">(estimated)</span>}
                  </h3>
                  <div className="space-y-2.5">
                    {ratingData.map((item) => (
                      <div key={item.stars} className="flex items-center gap-3">
                        <div className="flex items-center gap-1 w-10">
                          <span className="text-sm text-foreground font-medium">{item.stars}</span>
                          <Star size={11} className="fill-[#FFE100] text-[#FFE100]" />
                        </div>
                        <div className="flex-1 h-3 bg-secondary rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${item.percentage}%` }}
                            transition={{ delay: 0.2, duration: 0.5 }}
                            className="h-full rounded-full"
                            style={{
                              backgroundColor:
                                item.stars >= 4 ? "#22c55e" : item.stars === 3 ? "#f59e0b" : "#ef4444",
                            }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-16 text-right">
                          {item.percentage}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Reputation Gap Section */}
            {activeSection === "gap" && (
              <motion.div
                key="gap"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Gap Alert */}
                <div className="bg-gradient-to-r from-red-500/10 to-amber-500/10 rounded-2xl p-5 border border-red-500/20">
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0">
                      <AlertTriangle size={22} className="text-red-400" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-foreground mb-1">Your Reputation Gap</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        You have a <span className="text-foreground font-semibold">{rating.toFixed(1)}-star</span> rating. 
                        <span className="text-red-400 font-semibold"> {negativePercentage}% of your reviews are negative</span>.
                        Let's fix that.
                      </p>
                    </div>
                  </div>
                </div>

                {/* The Invisible Loss */}
                <div className="bg-card rounded-2xl border border-border p-5">
                  <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <EyeOff size={16} className="text-amber-400" />
                    The Invisible Loss
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Most low ratings are left by customers who <strong className="text-foreground">felt unheard at the time of service</strong>. 
                    VLYR captures these privately, giving you a second chance to fix it <em>before</em> it hits Google.
                  </p>
                </div>

                {/* The 79:1 Rule - Unicorn Insight */}
                <div className="bg-gradient-to-br from-amber-500/10 to-red-500/10 rounded-2xl border border-amber-500/20 p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                      <Zap size={18} className="text-amber-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground">The 79:1 Rule</h4>
                      <p className="text-xs text-muted-foreground">The math that explains why prevention beats recovery</p>
                    </div>
                  </div>
                  <div className="bg-black/20 rounded-xl p-4 text-center mb-4">
                    <p className="text-sm text-muted-foreground mb-2">To recover from</p>
                    <div className="flex items-center justify-center gap-3">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-red-400">1</div>
                        <div className="text-[10px] text-muted-foreground">1-star review</div>
                      </div>
                      <ArrowRight size={20} className="text-muted-foreground" />
                      <div className="text-center">
                        <div className="text-3xl font-bold text-green-400">79</div>
                        <div className="text-[10px] text-muted-foreground">5-star reviews needed</div>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Which is cheaper? <span className="text-foreground font-medium">Printing 500 stickers</span> to intercept that one unhappy customer, 
                    or waiting for <span className="text-foreground font-medium">79 people</span> to post on Google?
                  </p>
                </div>

                {/* Reputation Debt Table */}
                <div className="bg-card rounded-2xl border border-border p-5">
                  <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <BarChart3 size={16} className="text-red-400" />
                    Your Reputation Debt
                  </h4>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground font-medium pb-2 border-b border-border">
                      <div>1-Star Reviews</div>
                      <div className="text-right">5-Stars Needed for 5.0</div>
                    </div>
                    {getReputationDebt(negativeReviewsEstimate).map((row, i) => (
                      <div key={i} className={`grid grid-cols-2 gap-2 text-sm py-1.5 ${row.reviews === 1 ? "bg-red-500/5 rounded-lg px-2 -mx-2" : ""}`}>
                        <div className="text-foreground">{row.reviews}</div>
                        <div className="text-right font-semibold text-red-400">{row.effort}</div>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-3 pt-3 border-t border-border">
                    You currently have ~{negativeReviewsEstimate} negative reviews. That's a debt of <span className="text-red-400 font-semibold">{fiveStarReviewsToCounterOneStar(negativeReviewsEstimate)} five-star reviews</span> to reach a perfect 5.0.
                  </p>
                </div>

                {/* Impact Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-red-500/5 rounded-xl border border-red-500/10 p-4 text-center">
                    <div className="text-2xl font-bold text-red-400">{negativeReviewsEstimate}</div>
                    <div className="text-xs text-muted-foreground">Negative reviews<br/>hurting your rating</div>
                  </div>
                  <div className="bg-red-500/5 rounded-xl border border-red-500/10 p-4 text-center">
                    <div className="text-2xl font-bold text-red-400">{negativeReviewsEstimate * 30}+</div>
                    <div className="text-xs text-muted-foreground">Potential customers<br/>lost</div>
                  </div>
                </div>

                {/* Recent Negative Reviews */}
                {recentNegativeReviews.length > 0 && (
                  <div className="bg-card rounded-2xl border border-border p-5">
                    <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <MessageSquare size={16} className="text-red-400" />
                      Could Have Been Prevented
                    </h4>
                    <div className="space-y-3">
                      {recentNegativeReviews.map((review, i) => (
                        <div key={i} className="p-3 rounded-xl bg-red-500/5 border border-red-500/10">
                          <div className="flex items-center gap-2 mb-2">
                            {[...Array(5)].map((_, j) => (
                              <Star
                                key={j}
                                size={10}
                                className={j < review.rating ? "fill-red-400 text-red-400" : "text-muted-foreground/30"}
                              />
                            ))}
                            <span className="text-[10px] text-muted-foreground">{review.relativeTime}</span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            "{review.text || "No comment left"}"
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Growth Roadmap Section */}
            {activeSection === "roadmap" && (
              <motion.div
                key="roadmap"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Path to 5 Stars */}
                <div className="bg-gradient-to-br from-[#FFE100]/10 to-transparent rounded-2xl p-5 border border-[#FFE100]/20">
                  <h3 className="text-base font-bold text-foreground mb-1 flex items-center gap-2">
                    <Target size={18} className="text-[#FFE100]" />
                    Your Path to 5 Stars
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Here's exactly how many consecutive 5-star reviews you need to reach each milestone.
                  </p>
                </div>

                {/* Formula Explanation */}
                <div className="bg-card rounded-2xl border border-border p-5">
                  <h4 className="text-sm font-semibold text-foreground mb-3">The Math Behind Your Growth</h4>
                  <div className="bg-secondary/50 rounded-xl p-4 font-mono text-xs text-muted-foreground mb-3">
                    <p className="mb-1">Current: <span className="text-foreground">{rating.toFixed(2)}</span> stars from <span className="text-foreground">{totalReviews}</span> reviews</p>
                    <p>Formula: X = N × (Target - Current) / (5 - Target)</p>
                  </div>
                </div>

                {/* Improvement Targets */}
                <div className="space-y-3">
                  {improvementTargets.length > 0 ? (
                    improvementTargets.map((target, i) => (
                      <motion.div
                        key={target.target}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-card rounded-xl border border-border p-4"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              i === 0 ? "bg-[#FFE100]/20" : "bg-secondary"
                            }`}>
                              <Star size={18} className={i === 0 ? "text-[#FFE100]" : "text-muted-foreground"} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-foreground">{target.label}</span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                                  {target.milestone}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Reach {target.target.toFixed(1)} star average
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-bold text-foreground">{target.needed}</div>
                            <div className="text-[10px] text-muted-foreground">5-star reviews</div>
                          </div>
                        </div>
                        {i === 0 && (
                          <div className="mt-3 pt-3 border-t border-border">
                            <div className="flex items-center gap-2 text-xs text-[#FFE100]">
                              <Zap size={12} />
                              <span>With VLYR, businesses typically achieve this in 2-4 weeks</span>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    ))
                  ) : (
                    <div className="bg-green-500/10 rounded-xl border border-green-500/20 p-5 text-center">
                      <CheckCircle2 size={32} className="text-green-500 mx-auto mb-2" />
                      <h4 className="text-sm font-semibold text-foreground">Excellent Rating!</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Your rating is already great. VLYR will help you maintain and protect it.
                      </p>
                    </div>
                  )}
                </div>

                {/* VLYR Promise */}
                <div className="bg-card rounded-2xl border border-border p-5">
                  <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Shield size={16} className="text-[#FFE100]" />
                    How VLYR Bridges the Gap
                  </h4>
                  <ul className="space-y-2.5">
                    {[
                      "Intercept unhappy customers before they leave negative reviews",
                      "Route satisfied customers directly to Google for 5-star reviews",
                      "Get real-time alerts when issues arise at your business",
                      "Track your rating improvement with detailed analytics",
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 size={14} className="text-green-500 mt-0.5 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer CTA */}
        <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border p-4">
          <button
            onClick={onContinue}
            className="w-full h-12 rounded-xl bg-[#FFE100] hover:bg-[#FFE100]/90 text-black font-semibold text-sm transition-all flex items-center justify-center gap-2"
          >
            I'm Ready to Grow My Reputation
            <ArrowRight size={16} />
          </button>
          <p className="text-center text-[10px] text-muted-foreground mt-2">
            Continue to confirm your business details and choose your supplies
          </p>
        </div>
      </motion.div>
    </motion.div>
  )
}
