"use client"

import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Star, Send, ExternalLink } from "lucide-react"

interface PulseCheckProps {
  merchantName: string
  googleReviewUrl: string
  onSubmit: () => void
}

function ConfettiPiece({ index }: { index: number }) {
  const colors = ["#FFE100", "#111111", "#FFD700", "#FFA500", "#FFE100"]
  const left = Math.random() * 100
  const delay = Math.random() * 0.5
  const duration = 1.5 + Math.random() * 1.5
  const size = 6 + Math.random() * 6

  return (
    <motion.div
      initial={{ y: -20, x: 0, opacity: 1, rotate: 0 }}
      animate={{
        y: window.innerHeight + 50,
        x: (Math.random() - 0.5) * 200,
        opacity: 0,
        rotate: 720,
      }}
      transition={{ duration, delay, ease: "easeIn" }}
      className="fixed pointer-events-none z-50"
      style={{
        left: `${left}%`,
        top: -10,
        width: size,
        height: size,
        backgroundColor: colors[index % colors.length],
        borderRadius: Math.random() > 0.5 ? "50%" : "0%",
      }}
    />
  )
}

export function PulseCheck({
  merchantName,
  googleReviewUrl,
  onSubmit,
}: PulseCheckProps) {
  const [selectedRating, setSelectedRating] = useState<number | null>(null)
  const [hoveredRating, setHoveredRating] = useState<number | null>(null)
  const [feedback, setFeedback] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)

  const activeRating = hoveredRating ?? selectedRating

  const handleRatingSelect = useCallback((rating: number) => {
    setSelectedRating(rating)
  }, [])

  const handlePositiveSubmit = useCallback(() => {
    setShowConfetti(true)
    setIsSubmitting(true)
    setTimeout(() => {
      window.open(googleReviewUrl, "_blank")
      setTimeout(() => {
        onSubmit()
      }, 800)
    }, 1200)
  }, [googleReviewUrl, onSubmit])

  const handleNegativeSubmit = useCallback(() => {
    if (!feedback.trim()) return
    setIsSubmitting(true)
    setTimeout(() => {
      onSubmit()
    }, 600)
  }, [feedback, onSubmit])

  const isPositive = selectedRating !== null && selectedRating >= 4
  const isNegative = selectedRating !== null && selectedRating <= 3

  return (
    <div className="flex flex-col items-center gap-8 w-full">
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {Array.from({ length: 60 }).map((_, i) => (
            <ConfettiPiece key={i} index={i} />
          ))}
        </div>
      )}

      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-muted-foreground text-sm font-medium tracking-wide uppercase"
      >
        How was your experience?
      </motion.p>

      {/* 5 Interactive Glass Tiles */}
      <div className="flex items-center gap-3">
        {[1, 2, 3, 4, 5].map((rating) => {
          const isActive = activeRating !== null && rating <= activeRating
          const isSelected =
            selectedRating !== null && rating <= selectedRating

          return (
            <motion.button
              key={rating}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + rating * 0.08 }}
              whileTap={{ scale: 0.9 }}
              onMouseEnter={() => setHoveredRating(rating)}
              onMouseLeave={() => setHoveredRating(null)}
              onClick={() => handleRatingSelect(rating)}
              className={`relative flex items-center justify-center w-14 h-14 rounded-xl transition-all duration-200 cursor-pointer ${
                isActive
                  ? "bg-accent/20 border-accent shadow-[0_0_20px_rgba(255,225,0,0.15)]"
                  : "bg-card border-border hover:bg-secondary"
              } border`}
              aria-label={`Rate ${rating} out of 5`}
            >
              <Star
                size={24}
                className={`transition-all duration-200 ${
                  isActive
                    ? "text-accent fill-accent"
                    : "text-muted-foreground"
                } ${isSelected ? "drop-shadow-[0_0_6px_rgba(255,225,0,0.4)]" : ""}`}
              />
              <span className="sr-only">{`${rating} star${rating > 1 ? "s" : ""}`}</span>
            </motion.button>
          )
        })}
      </div>

      {/* Smart Routing: Positive Path */}
      <AnimatePresence mode="wait">
        {isPositive && !isSubmitting && (
          <motion.div
            key="positive"
            initial={{ opacity: 0, y: 16, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full flex flex-col items-center gap-4"
          >
            <p className="text-muted-foreground text-sm text-center">
              We are glad you had a great experience!
            </p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handlePositiveSubmit}
              className="flex items-center gap-2 bg-foreground text-background px-8 py-3.5 rounded-xl font-semibold text-base transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <ExternalLink size={18} />
              Share on Google
            </motion.button>
          </motion.div>
        )}

        {/* Smart Routing: Negative Path */}
        {isNegative && !isSubmitting && (
          <motion.div
            key="negative"
            initial={{ opacity: 0, y: 16, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full flex flex-col items-center gap-4"
          >
            <p className="text-muted-foreground text-sm text-center">
              We would love to hear how we can improve.
            </p>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Tell us what happened..."
              rows={3}
              className="w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground text-sm placeholder:text-muted-foreground/60 resize-none focus:outline-none focus:ring-2 focus:ring-foreground/20 focus:border-foreground/30 transition-all"
            />
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleNegativeSubmit}
              disabled={!feedback.trim()}
              className="flex items-center gap-2 bg-foreground text-background px-8 py-3.5 rounded-xl font-semibold text-base transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send size={18} />
              Send to Management
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
