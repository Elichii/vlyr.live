"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Shield, MessageSquare, Star, TrendingUp, TrendingDown, 
  AlertTriangle, Info, Lightbulb, CheckCircle
} from "lucide-react"

interface OnboardingMarketingPanelProps {
  isVerified?: boolean
  businessRating?: number
  totalReviews?: number
  businessName?: string
}

type TabId = "simulator" | "overview" | "gap" | "why-vlyr"

export function OnboardingMarketingPanel({ 
  isVerified = false, 
  businessRating = 4.7,
  totalReviews = 62,
  businessName = "Your Business",
}: OnboardingMarketingPanelProps) {
  
  const [activeTab, setActiveTab] = useState<TabId>("simulator")
  
  // Individual star sliders for simulator
  const [fiveStars, setFiveStars] = useState(0)
  const [fourStars, setFourStars] = useState(0)
  const [threeStars, setThreeStars] = useState(0)
  const [twoStars, setTwoStars] = useState(0)
  const [oneStars, setOneStars] = useState(0)

  // Calculate projected rating
  const projectedRating = useMemo(() => {
    const currentTotal = businessRating * totalReviews
    const newStarsTotal = (fiveStars * 5) + (fourStars * 4) + (threeStars * 3) + (twoStars * 2) + (oneStars * 1)
    const newCount = totalReviews + fiveStars + fourStars + threeStars + twoStars + oneStars
    if (newCount === totalReviews) return businessRating
    return Math.min(5, Math.max(1, (currentTotal + newStarsTotal) / newCount))
  }, [businessRating, totalReviews, fiveStars, fourStars, threeStars, twoStars, oneStars])

  const ratingDelta = projectedRating - businessRating
  const isPositive = ratingDelta >= 0
  const totalNewReviews = fiveStars + fourStars + threeStars + twoStars + oneStars

  // Show "Why VLYR Works" ONLY before verification (during google-connect step)
  if (!isVerified) {
    return (
      <div className="h-full w-full bg-white flex flex-col overflow-hidden">
        <div className="flex-1 flex flex-col p-8 overflow-auto">
          {/* Header */}
          <div className="mb-8">
            <span className="text-[11px] font-semibold text-[#635BFF] uppercase tracking-wider">Why VLYR Works</span>
            <h2 className="text-[28px] font-semibold text-[#0A2540] leading-tight mt-2 tracking-tight">
              Turn Every Customer<br />Into a 5-Star Advocate
            </h2>
          </div>

          {/* Feature Cards */}
          <div className="space-y-4 flex-1">
            <FeatureCard
              icon={<MessageSquare size={20} className="text-[#F59E0B]" />}
              iconBg="#FFF4E5"
              title="The Invisible Problem"
              description="Most low ratings come from customers who felt unheard at the moment of service. By the time they leave a review, it's too late."
            />
            <FeatureCard
              icon={<Shield size={20} className="text-[#635BFF]" />}
              iconBg="rgba(99, 91, 255, 0.1)"
              title="VLYR Intercepts Issues"
              description="Our QR code system captures feedback instantly, giving you a second chance to resolve concerns privately before they hit Google."
            />
            <FeatureCard
              icon={<Star size={20} className="text-[#10B981]" />}
              iconBg="#ECFDF5"
              title="Amplify Happy Customers"
              description="Satisfied customers are guided directly to leave a 5-star Google review. Watch your rating climb while protecting your reputation."
            />
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-[#E6E6E6]">
            <StatCard label="Issues Resolved" value="73%" subtext="before Google" />
            <StatCard label="Avg. Improvement" value="+0.8" subtext="rating points" valueColor="#10B981" />
            <StatCard label="5-Star Reviews" value="2x" subtext="more reviews" />
          </div>
        </div>
      </div>
    )
  }

  // After verification - Show tabbed interface with simulator as primary
  const tabs: { id: TabId; label: string }[] = [
    { id: "simulator", label: "Rating Simulator" },
    { id: "overview", label: "Overview" },
    { id: "gap", label: "Risk Analysis" },
    { id: "why-vlyr", label: "Why VLYR" },
  ]

  return (
    <div className="h-full w-full bg-white flex flex-col overflow-hidden">
      {/* Fixed Header with Rating */}
      <div className="p-6 pb-0 shrink-0 border-b-0">
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className="text-[11px] font-semibold text-[#425466] uppercase tracking-wider">Reputation Insights</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-[48px] font-semibold text-[#0A2540] tracking-tight leading-none">{businessRating.toFixed(1)}</span>
            </div>
            <div className="text-[14px] font-medium text-[#425466] mt-1">{businessName}</div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={16}
                  className={star <= Math.round(businessRating) ? "text-[#FBBF24] fill-[#FBBF24]" : "text-[#E5E7EB] fill-[#E5E7EB]"}
                />
              ))}
            </div>
            <span className="text-[12px] text-[#425466] mt-1 block">{totalReviews} reviews</span>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-0 border-b border-[#E6E6E6] -mx-6 px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-[12px] font-medium transition-colors relative ${
                activeTab === tab.id 
                  ? 'text-[#0A2540]' 
                  : 'text-[#425466] hover:text-[#0A2540]'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <motion.div 
                  layoutId="activeTabIndicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#635BFF]" 
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable Tab Content */}
      <div className="flex-1 overflow-auto p-6">
        <AnimatePresence mode="wait">
          {activeTab === "simulator" && (
            <SimulatorTab 
              businessRating={businessRating}
              totalReviews={totalReviews}
              projectedRating={projectedRating}
              ratingDelta={ratingDelta}
              isPositive={isPositive}
              totalNewReviews={totalNewReviews}
              fiveStars={fiveStars}
              fourStars={fourStars}
              threeStars={threeStars}
              twoStars={twoStars}
              oneStars={oneStars}
              setFiveStars={setFiveStars}
              setFourStars={setFourStars}
              setThreeStars={setThreeStars}
              setTwoStars={setTwoStars}
              setOneStars={setOneStars}
            />
          )}
          {activeTab === "overview" && (
            <OverviewTab businessRating={businessRating} totalReviews={totalReviews} />
          )}
          {activeTab === "gap" && (
            <GapTab businessRating={businessRating} totalReviews={totalReviews} />
          )}
          {activeTab === "why-vlyr" && (
            <WhyVlyrTab />
          )}
        </AnimatePresence>
      </div>

      {/* Fixed Footer - Protection Card */}
      <div className="p-6 pt-4 border-t border-[#E6E6E6] bg-white shrink-0">
        <div className="bg-[#0A2540] rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#635BFF] flex items-center justify-center shrink-0">
              <Shield size={18} className="text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-[14px] font-semibold text-white mb-1">VLYR Protects Your Rating</h3>
              <p className="text-[12px] text-white/70 leading-relaxed">
                Unhappy customers share feedback privately first, giving you a chance to resolve issues before they become negative reviews.
              </p>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[18px] font-bold text-[#10B981]">73%</span>
                  <span className="text-[10px] text-white/60">issues resolved privately</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Simulator Tab Component
function SimulatorTab({ 
  businessRating, totalReviews, projectedRating, ratingDelta, isPositive, totalNewReviews,
  fiveStars, fourStars, threeStars, twoStars, oneStars,
  setFiveStars, setFourStars, setThreeStars, setTwoStars, setOneStars
}: {
  businessRating: number
  totalReviews: number
  projectedRating: number
  ratingDelta: number
  isPositive: boolean
  totalNewReviews: number
  fiveStars: number
  fourStars: number
  threeStars: number
  twoStars: number
  oneStars: number
  setFiveStars: (v: number) => void
  setFourStars: (v: number) => void
  setThreeStars: (v: number) => void
  setTwoStars: (v: number) => void
  setOneStars: (v: number) => void
}) {
  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="space-y-5"
    >
      {/* Instructions */}
      <div className="bg-[#F8FAFC] rounded-lg p-4 border border-[#E2E8F0]">
        <div className="flex items-start gap-3">
          <Info size={16} className="text-[#635BFF] shrink-0 mt-0.5" />
          <div>
            <h4 className="text-[13px] font-semibold text-[#0A2540] mb-1">How to Use This Simulator</h4>
            <p className="text-[12px] text-[#425466] leading-relaxed">
              Drag each star slider to simulate how new reviews would affect your overall rating. 
              See in real-time how positive reviews grow your rating and how negative reviews can damage it.
            </p>
          </div>
        </div>
      </div>

      {/* Projected Rating Display */}
      {totalNewReviews > 0 && (
        <div className={`rounded-lg p-4 ${isPositive ? 'bg-[#ECFDF5] border border-[#10B981]/20' : 'bg-[#FEF2F2] border border-[#EF4444]/20'}`}>
          <div className="flex items-center justify-between">
            <div>
              <span className={`text-[11px] font-semibold uppercase tracking-wider ${isPositive ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                Projected Rating
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className={`text-[32px] font-semibold tracking-tight ${isPositive ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                  {projectedRating.toFixed(2)}
                </span>
                <span className={`text-[14px] font-medium flex items-center gap-1 ${isPositive ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                  {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  {isPositive ? '+' : ''}{ratingDelta.toFixed(2)}
                </span>
              </div>
              <span className="text-[11px] text-[#425466]">After {totalNewReviews} new review{totalNewReviews > 1 ? 's' : ''}</span>
            </div>
            <div className={`w-14 h-14 rounded-full flex items-center justify-center ${isPositive ? 'bg-[#10B981]' : 'bg-[#EF4444]'}`}>
              <span className="text-[18px] font-bold text-white">{projectedRating.toFixed(1)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Star Sliders */}
      <div className="space-y-1">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[13px] font-semibold text-[#0A2540] uppercase tracking-wider">Add Reviews</h3>
          {totalNewReviews > 0 && (
            <button 
              onClick={() => {
                setFiveStars(0)
                setFourStars(0)
                setThreeStars(0)
                setTwoStars(0)
                setOneStars(0)
              }}
              className="text-[11px] text-[#635BFF] hover:underline"
            >
              Reset all
            </button>
          )}
        </div>
        
        <div className="space-y-4">
          <StarSlider stars={5} value={fiveStars} onChange={setFiveStars} max={20} color="#10B981" label="Excellent" />
          <StarSlider stars={4} value={fourStars} onChange={setFourStars} max={15} color="#22C55E" label="Good" />
          <StarSlider stars={3} value={threeStars} onChange={setThreeStars} max={10} color="#F59E0B" label="Average" />
          <StarSlider stars={2} value={twoStars} onChange={setTwoStars} max={8} color="#F97316" label="Poor" />
          <StarSlider stars={1} value={oneStars} onChange={setOneStars} max={5} color="#EF4444" label="Terrible" />
        </div>
      </div>

      {/* Important Notes */}
      <div className="space-y-3 pt-2">
        <div className="bg-[#FFFBEB] border border-[#FCD34D]/30 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Lightbulb size={14} className="text-[#F59E0B] shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] text-[#92400E] leading-relaxed font-medium">The 79:1 Rule</p>
              <p className="text-[11px] text-[#92400E] leading-relaxed">
                It takes approximately 79 five-star reviews to recover from just one 1-star review. Prevention is far more effective than recovery.
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-[#EFF6FF] border border-[#3B82F6]/20 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle size={14} className="text-[#3B82F6] shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] text-[#1E40AF] leading-relaxed font-medium">Why This Matters</p>
              <p className="text-[11px] text-[#1E40AF] leading-relaxed">
                VLYR intercepts unhappy customers before they leave negative reviews, redirecting their feedback to you privately. This simulator shows exactly why that protection is invaluable.
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// Star Slider Component
function StarSlider({ stars, value, onChange, max, color, label }: { 
  stars: number
  value: number
  onChange: (val: number) => void
  max: number
  color: string
  label: string
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex gap-0.5 w-[70px]">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} size={12} className={s <= stars ? "fill-[#FBBF24] text-[#FBBF24]" : "text-[#E5E7EB] fill-[#E5E7EB]"} />
            ))}
          </div>
          <span className="text-[12px] text-[#425466] w-16">{label}</span>
        </div>
        <span className="text-[14px] font-semibold tabular-nums min-w-[40px] text-right" style={{ color: value > 0 ? color : '#9CA3AF' }}>
          {value > 0 ? `+${value}` : '0'}
        </span>
      </div>
      <div className="relative h-2 group">
        <div className="absolute inset-0 rounded-full bg-[#F3F4F6]" />
        <div 
          className="absolute inset-y-0 left-0 rounded-full transition-all"
          style={{ backgroundColor: color, width: `${(value / max) * 100}%`, opacity: 0.4 }}
        />
        <input
          type="range"
          min="0"
          max={max}
          step="1"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full appearance-none cursor-pointer bg-transparent [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:cursor-grab"
          style={{ 
            // @ts-expect-error CSS custom property
            '--thumb-border-color': color 
          } as React.CSSProperties}
        />
      </div>
    </div>
  )
}

// Overview Tab
function OverviewTab({ businessRating, totalReviews }: { businessRating: number; totalReviews: number }) {
  const positivePercent = Math.round(60 + (businessRating - 4) * 10)
  const neutralPercent = 8
  const negativePercent = 100 - positivePercent - neutralPercent
  
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#F8FAFC] rounded-lg p-4 text-center">
          <span className="text-[24px] font-semibold text-[#0A2540]">{totalReviews}</span>
          <span className="text-[11px] text-[#425466] block">Total Reviews</span>
        </div>
        <div className="bg-[#ECFDF5] rounded-lg p-4 text-center">
          <span className="text-[24px] font-semibold text-[#10B981]">{positivePercent}%</span>
          <span className="text-[11px] text-[#425466] block">Positive</span>
        </div>
        <div className="bg-[#FEF2F2] rounded-lg p-4 text-center">
          <span className="text-[24px] font-semibold text-[#EF4444]">{negativePercent}%</span>
          <span className="text-[11px] text-[#425466] block">Negative</span>
        </div>
      </div>

      <div>
        <h4 className="text-[13px] font-semibold text-[#0A2540] mb-3">Rating Distribution</h4>
        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map((star) => {
            const percent = star === 5 ? positivePercent - 20 : 
                           star === 4 ? 20 : 
                           star === 3 ? neutralPercent : 
                           star === 2 ? Math.round(negativePercent / 2) : 
                           Math.round(negativePercent / 2)
            return (
              <div key={star} className="flex items-center gap-3">
                <span className="text-[12px] text-[#425466] w-12">{star} star</span>
                <div className="flex-1 h-2 bg-[#F3F4F6] rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all"
                    style={{ 
                      width: `${percent}%`,
                      backgroundColor: star >= 4 ? '#10B981' : star === 3 ? '#F59E0B' : '#EF4444'
                    }}
                  />
                </div>
                <span className="text-[12px] text-[#425466] w-10 text-right">{percent}%</span>
              </div>
            )
          })}
        </div>
      </div>
    </motion.div>
  )
}

// Gap Tab
function GapTab({ businessRating, totalReviews }: { businessRating: number; totalReviews: number }) {
  const negativeReviews = Math.round(totalReviews * 0.06)
  const fiveStarsNeededFor5 = Math.round(negativeReviews * 79)
  const currentGap = 5 - businessRating
  const reviewsToReach5 = Math.ceil((5 * totalReviews - businessRating * totalReviews) / (5 - 5))
  
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
      <div className="bg-[#FEF2F2] border border-[#EF4444]/20 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className="text-[#EF4444] shrink-0 mt-0.5" />
          <div>
            <h4 className="text-[13px] font-semibold text-[#0A2540] mb-1">Your Rating Vulnerability</h4>
            <p className="text-[12px] text-[#425466] leading-relaxed">
              With {totalReviews} reviews, you're estimated to have approximately {negativeReviews} negative reviews. 
              Each additional 1-star review would require {79} five-star reviews to recover.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#F8FAFC] rounded-lg p-4">
          <span className="text-[28px] font-semibold text-[#EF4444]">{currentGap.toFixed(1)}</span>
          <span className="text-[11px] text-[#425466] block">Gap to 5.0 stars</span>
        </div>
        <div className="bg-[#F8FAFC] rounded-lg p-4">
          <span className="text-[28px] font-semibold text-[#F59E0B]">{fiveStarsNeededFor5}</span>
          <span className="text-[11px] text-[#425466] block">5-stars to recover from 1 negative</span>
        </div>
      </div>

      <div className="bg-[#ECFDF5] border border-[#10B981]/20 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <CheckCircle size={18} className="text-[#10B981] shrink-0 mt-0.5" />
          <div>
            <h4 className="text-[13px] font-semibold text-[#0A2540] mb-1">VLYR's Solution</h4>
            <p className="text-[12px] text-[#425466] leading-relaxed">
              VLYR intercepts 73% of negative reviews before they're posted, redirecting unhappy customers to share feedback privately. 
              This protection is worth hundreds of 5-star reviews in damage prevention.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// Why VLYR Tab
function WhyVlyrTab() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
      <FeatureCard
        icon={<MessageSquare size={18} className="text-[#F59E0B]" />}
        iconBg="#FFF4E5"
        title="The Invisible Problem"
        description="Most low ratings come from customers who felt unheard. By the time they leave a review, it's too late."
      />
      <FeatureCard
        icon={<Shield size={18} className="text-[#635BFF]" />}
        iconBg="rgba(99, 91, 255, 0.1)"
        title="VLYR Intercepts Issues"
        description="Our QR code system captures feedback instantly, giving you a second chance to resolve concerns privately."
      />
      <FeatureCard
        icon={<Star size={18} className="text-[#10B981]" />}
        iconBg="#ECFDF5"
        title="Amplify Happy Customers"
        description="Satisfied customers are guided directly to leave a 5-star Google review. Watch your rating climb."
      />
      
      <div className="grid grid-cols-3 gap-3 pt-4 border-t border-[#E6E6E6]">
        <StatCard label="Resolved" value="73%" subtext="privately" />
        <StatCard label="Rating Lift" value="+0.8" subtext="average" valueColor="#10B981" />
        <StatCard label="5-Stars" value="2x" subtext="more" />
      </div>
    </motion.div>
  )
}

// Sub-components
function FeatureCard({ icon, iconBg, title, description }: { icon: React.ReactNode; iconBg: string; title: string; description: string }) {
  return (
    <div className="border border-[#E6E6E6] rounded-lg p-4 hover:border-[#635BFF]/30 transition-colors">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: iconBg }}>
          {icon}
        </div>
        <div>
          <h3 className="text-[13px] font-semibold text-[#0A2540] mb-1">{title}</h3>
          <p className="text-[12px] text-[#425466] leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, subtext, valueColor = "#0A2540" }: { label: string; value: string; subtext: string; valueColor?: string }) {
  return (
    <div className="text-center">
      <span className="text-[10px] font-semibold text-[#425466] uppercase tracking-wider">{label}</span>
      <div className="text-[22px] font-semibold tracking-tight mt-0.5" style={{ color: valueColor }}>{value}</div>
      <span className="text-[10px] text-[#425466]">{subtext}</span>
    </div>
  )
}
