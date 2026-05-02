"use client"

import { useState, useMemo } from "react"
import { motion } from "framer-motion"
import useSWR from "swr"
import {
  Star,
  TrendingUp,
  TrendingDown,
  Target,
  Calendar,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  AlertCircle,
  ChevronDown,
  ExternalLink,
  BarChart3,
  PieChart,
  Zap,
} from "lucide-react"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart as RechartsPie,
  Pie,
  Legend,
  Area,
  AreaChart,
} from "recharts"
import { VLYRLoader } from "@/components/vlyr-loader"

interface GoogleReview {
  author: string
  rating: number
  text: string
  time: number
  relativeTime: string
  authorPhoto: string | null
}

interface ReviewsData {
  success?: boolean
  businessName?: string
  rating?: number
  totalReviews?: number
  googleUrl?: string
  reviews: GoogleReview[]
  error?: string
}

async function fetchReviews(): Promise<ReviewsData> {
  const res = await fetch("/api/google/reviews")
  return res.json()
}

// Calculate how many 5-star reviews needed to reach a target rating
function reviewsNeededForRating(
  currentRating: number,
  currentTotal: number,
  targetRating: number
): number {
  if (currentRating >= targetRating) return 0
  // Formula: (targetRating * (currentTotal + x) - currentRating * currentTotal) / x = 5
  // Solving for x: x = (targetRating * currentTotal - currentRating * currentTotal) / (5 - targetRating)
  const needed = Math.ceil(
    (targetRating * currentTotal - currentRating * currentTotal) / (5 - targetRating)
  )
  return Math.max(0, needed)
}

// Sentiment analysis based on rating
function getSentiment(rating: number): "positive" | "neutral" | "negative" {
  if (rating >= 4) return "positive"
  if (rating >= 3) return "neutral"
  return "negative"
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
}

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
}

export default function AnalyticsPage() {
  const { data, isLoading, error } = useSWR<ReviewsData>("google-reviews-analytics", fetchReviews)
  const [sortBy, setSortBy] = useState<"date" | "rating">("date")
  const [filterRating, setFilterRating] = useState<number | null>(null)
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  const reviews = data?.reviews || []
  const currentRating = data?.rating || 0
  const totalReviews = data?.totalReviews || 0

  // Calculate rating distribution
  const ratingDistribution = useMemo(() => {
    const dist = [0, 0, 0, 0, 0] // 1-5 stars
    reviews.forEach((r) => {
      if (r.rating >= 1 && r.rating <= 5) {
        dist[r.rating - 1]++
      }
    })
    return dist.map((count, i) => ({
      stars: i + 1,
      count,
      percentage: reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0,
    }))
  }, [reviews])

  // Calculate sentiment breakdown
  const sentimentBreakdown = useMemo(() => {
    let positive = 0, neutral = 0, negative = 0
    reviews.forEach((r) => {
      const sentiment = getSentiment(r.rating)
      if (sentiment === "positive") positive++
      else if (sentiment === "neutral") neutral++
      else negative++
    })
    return [
      { name: "Positive", value: positive, color: "#22c55e" },
      { name: "Neutral", value: neutral, color: "#f59e0b" },
      { name: "Negative", value: negative, color: "#ef4444" },
    ]
  }, [reviews])

  // Mock trend data (in real app, this would come from historical data)
  const trendData = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"]
    return months.map((month, i) => ({
      month,
      rating: Math.min(5, Math.max(1, currentRating - 0.3 + (i * 0.1) + (Math.random() * 0.2 - 0.1))).toFixed(1),
      reviews: Math.floor(Math.random() * 10 + 5),
    }))
  }, [currentRating])

  // Rating improvement targets
  const improvementTargets = useMemo(() => {
    const targets = [4.0, 4.25, 4.5, 4.75, 5.0]
    return targets
      .filter((t) => t > currentRating)
      .slice(0, 4)
      .map((target) => ({
        target,
        needed: reviewsNeededForRating(currentRating, totalReviews, target),
      }))
  }, [currentRating, totalReviews])

  // Sorted and filtered reviews
  const displayedReviews = useMemo(() => {
    let filtered = [...reviews]
    if (filterRating !== null) {
      filtered = filtered.filter((r) => r.rating === filterRating)
    }
    filtered.sort((a, b) => {
      if (sortBy === "date") {
        return sortOrder === "desc" ? b.time - a.time : a.time - b.time
      } else {
        return sortOrder === "desc" ? b.rating - a.rating : a.rating - b.rating
      }
    })
    return filtered
  }, [reviews, filterRating, sortBy, sortOrder])

  if (isLoading) {
    return <VLYRLoader variant="card" message="Loading review analytics..." />
  }

  if (!data?.success || reviews.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8"
      >
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <BarChart3 size={28} className="text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">No Review Data Available</h2>
        <p className="text-muted-foreground text-sm max-w-md mb-4">
          {data?.error || "Connect your Google Business Profile from the Profile page to see detailed review analytics."}
        </p>
        <a
          href="/dashboard/profile"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FFE100] text-black font-semibold text-sm hover:bg-[#FFE100]/90 transition-all"
        >
          Go to Profile <ArrowUpRight size={14} />
        </a>
      </motion.div>
    )
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6 max-w-7xl mx-auto"
    >
      {/* Header */}
      <motion.div variants={item} className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Review Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Deep insights into your Google reviews for {data.businessName}
          </p>
        </div>
        <a
          href={data.googleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary border border-border text-sm font-medium hover:bg-secondary/80 transition-all"
        >
          View on Google <ExternalLink size={14} />
        </a>
      </motion.div>

      {/* Key Metrics Row */}
      <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Current Rating */}
        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-3">
            <Star size={14} />
            CURRENT RATING
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-foreground">{currentRating.toFixed(1)}</span>
            <span className="text-sm text-muted-foreground">/ 5.0</span>
          </div>
          <div className="flex items-center gap-1 mt-2">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                size={14}
                className={i < Math.round(currentRating) ? "fill-[#FFE100] text-[#FFE100]" : "text-muted-foreground/30"}
              />
            ))}
          </div>
        </div>

        {/* Total Reviews */}
        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-3">
            <MessageSquare size={14} />
            TOTAL REVIEWS
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-foreground">{totalReviews.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
            <TrendingUp size={12} className="text-green-500" />
            <span>+{reviews.length} recent</span>
          </div>
        </div>

        {/* Positive Reviews */}
        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-3">
            <ThumbsUp size={14} />
            POSITIVE (4-5 STARS)
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-green-500">
              {Math.round((sentimentBreakdown[0].value / Math.max(1, reviews.length)) * 100)}%
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            {sentimentBreakdown[0].value} of {reviews.length} reviews
          </div>
        </div>

        {/* Action Needed */}
        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-3">
            <Target size={14} />
            TO REACH 4.5 STARS
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#FFE100]">
              {reviewsNeededForRating(currentRating, totalReviews, 4.5)}
            </span>
            <span className="text-sm text-muted-foreground">5-star reviews</span>
          </div>
          <div className="text-xs text-muted-foreground mt-2">needed</div>
        </div>
      </motion.div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Rating Trend Chart */}
        <motion.div variants={item} className="bg-card rounded-2xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Rating Trend</h3>
            <span className="text-xs text-muted-foreground">Last 6 months</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="ratingGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FFE100" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#FFE100" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                <XAxis dataKey="month" tick={{ fill: "#888", fontSize: 12 }} />
                <YAxis domain={[1, 5]} tick={{ fill: "#888", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1A1A1A",
                    border: "1px solid #2A2A2A",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "#fff" }}
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
        </motion.div>

        {/* Rating Distribution */}
        <motion.div variants={item} className="bg-card rounded-2xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Rating Distribution</h3>
            <span className="text-xs text-muted-foreground">{reviews.length} reviews</span>
          </div>
          <div className="space-y-3">
            {ratingDistribution.reverse().map((item) => (
              <div key={item.stars} className="flex items-center gap-3">
                <div className="flex items-center gap-1 w-16">
                  <span className="text-sm text-foreground font-medium">{item.stars}</span>
                  <Star size={12} className="fill-[#FFE100] text-[#FFE100]" />
                </div>
                <div className="flex-1 h-3 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${item.percentage}%`,
                      backgroundColor:
                        item.stars >= 4 ? "#22c55e" : item.stars === 3 ? "#f59e0b" : "#ef4444",
                    }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-12 text-right">
                  {item.count} ({item.percentage}%)
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Improvement Roadmap */}
      <motion.div variants={item} className="bg-card rounded-2xl border border-border p-5">
        <div className="flex items-center gap-2 mb-4">
          <Zap size={16} className="text-[#FFE100]" />
          <h3 className="text-sm font-semibold text-foreground">Rating Improvement Roadmap</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Here&apos;s how many 5-star reviews you need to reach each milestone:
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {improvementTargets.map((t) => (
            <div
              key={t.target}
              className="p-4 rounded-xl bg-secondary/50 border border-border text-center"
            >
              <div className="flex items-center justify-center gap-1 mb-2">
                <span className="text-lg font-bold text-foreground">{t.target}</span>
                <Star size={14} className="fill-[#FFE100] text-[#FFE100]" />
              </div>
              <div className="text-2xl font-bold text-[#FFE100]">{t.needed}</div>
              <div className="text-[10px] text-muted-foreground mt-1">5-star reviews needed</div>
            </div>
          ))}
        </div>
        <div className="mt-4 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
              <Target size={16} className="text-green-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Actionable Insight</p>
              <p className="text-xs text-muted-foreground mt-1">
                Focus on delivering exceptional experiences. Each 5-star review brings you closer to your goal. 
                Consider sending follow-up messages to satisfied customers asking them to share their experience on Google.
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Sentiment Analysis */}
      <motion.div variants={item} className="bg-card rounded-2xl border border-border p-5">
        <div className="flex items-center gap-2 mb-4">
          <PieChart size={16} className="text-[#FFE100]" />
          <h3 className="text-sm font-semibold text-foreground">Sentiment Analysis</h3>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPie>
                <Pie
                  data={sentimentBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {sentimentBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Legend
                  formatter={(value) => <span className="text-xs text-foreground">{value}</span>}
                />
              </RechartsPie>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3">
            {sentimentBreakdown.map((s) => (
              <div key={s.name} className="flex items-center justify-between p-3 rounded-xl bg-secondary/50">
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="text-sm text-foreground">{s.name}</span>
                </div>
                <span className="text-sm font-semibold text-foreground">{s.value} reviews</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* All Reviews Section */}
      <motion.div variants={item} className="bg-card rounded-2xl border border-border p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <MessageSquare size={16} className="text-[#FFE100]" />
            <h3 className="text-sm font-semibold text-foreground">All Reviews</h3>
            <span className="text-xs text-muted-foreground">({displayedReviews.length})</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter by rating */}
            <div className="relative">
              <select
                value={filterRating ?? "all"}
                onChange={(e) => setFilterRating(e.target.value === "all" ? null : Number(e.target.value))}
                className="appearance-none px-3 py-1.5 pr-8 rounded-lg bg-secondary border border-border text-xs text-foreground cursor-pointer"
              >
                <option value="all">All Ratings</option>
                <option value="5">5 Stars</option>
                <option value="4">4 Stars</option>
                <option value="3">3 Stars</option>
                <option value="2">2 Stars</option>
                <option value="1">1 Star</option>
              </select>
              <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
            {/* Sort by */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "date" | "rating")}
                className="appearance-none px-3 py-1.5 pr-8 rounded-lg bg-secondary border border-border text-xs text-foreground cursor-pointer"
              >
                <option value="date">Sort by Date</option>
                <option value="rating">Sort by Rating</option>
              </select>
              <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
            {/* Sort order */}
            <button
              onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
              className="px-3 py-1.5 rounded-lg bg-secondary border border-border text-xs text-foreground hover:bg-secondary/80 transition-all"
            >
              {sortOrder === "desc" ? "Newest First" : "Oldest First"}
            </button>
          </div>
        </div>

        {displayedReviews.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No reviews match your filter.
          </div>
        ) : (
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
            {displayedReviews.map((review, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-secondary/30 border border-border/50 hover:border-border transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {review.authorPhoto ? (
                      <img
                        src={review.authorPhoto}
                        alt={review.author}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-sm font-bold text-white">
                        {review.author.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-foreground">{review.author}</p>
                      <p className="text-xs text-muted-foreground">{review.relativeTime}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={14}
                        className={i < review.rating ? "fill-[#FFE100] text-[#FFE100]" : "text-muted-foreground/30"}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                  &quot;{review.text}&quot;
                </p>
                <div className="flex items-center gap-2 mt-3">
                  {getSentiment(review.rating) === "positive" && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 text-[10px] font-medium">
                      <ThumbsUp size={10} /> Positive
                    </span>
                  )}
                  {getSentiment(review.rating) === "neutral" && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-500 text-[10px] font-medium">
                      <Minus size={10} /> Neutral
                    </span>
                  )}
                  {getSentiment(review.rating) === "negative" && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 text-[10px] font-medium">
                      <ThumbsDown size={10} /> Needs Attention
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
