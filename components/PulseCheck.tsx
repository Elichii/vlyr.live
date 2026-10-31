"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Star, Send, Check, Phone, MessageSquare, Mail } from "lucide-react"

export interface PulseResult {
  rating: number
  feedback?: string
  phone?: string
  contactPreference?: "call" | "text" | "email"
}

interface PulseCheckProps {
  merchantName: string
  /** The signed-in customer's email (shown for the "Email me" option) */
  customerEmail?: string
  submitting: boolean
  onSubmit: (result: PulseResult) => void
}

/** Star rating + comment. Saving and what happens next is up to the parent. */
const CONTACT_OPTIONS = [
  { id: "call" as const, label: "Call me", icon: Phone },
  { id: "text" as const, label: "Text me", icon: MessageSquare },
  { id: "email" as const, label: "Email me", icon: Mail },
]

export function PulseCheck({ merchantName, customerEmail, submitting, onSubmit }: PulseCheckProps) {
  const [selectedRating, setSelectedRating] = useState<number | null>(null)
  const [hoveredRating, setHoveredRating] = useState<number | null>(null)
  const [feedback, setFeedback] = useState("")
  const [phone, setPhone] = useState("")
  const [contact, setContact] = useState<"call" | "text" | "email">("text")
  const needsPhone = contact === "call" || contact === "text"
  const phoneOk = phone.replace(/\D/g, "").length >= 7

  const activeRating = hoveredRating ?? selectedRating
  const isPositive = selectedRating !== null && selectedRating >= 4
  const isNegative = selectedRating !== null && selectedRating <= 3

  return (
    <div className="flex flex-col items-center gap-8 w-full">
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-muted-foreground text-sm font-medium tracking-wide uppercase"
      >
        How was your order?
      </motion.p>

      <div className="flex items-center gap-3">
        {[1, 2, 3, 4, 5].map((rating) => {
          const isActive = activeRating !== null && rating <= activeRating
          return (
            <motion.button
              key={rating}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + rating * 0.08 }}
              whileTap={{ scale: 0.9 }}
              onMouseEnter={() => setHoveredRating(rating)}
              onMouseLeave={() => setHoveredRating(null)}
              onClick={() => setSelectedRating(rating)}
              disabled={submitting}
              className={`relative flex items-center justify-center w-14 h-14 rounded-xl transition-all duration-200 cursor-pointer border ${
                isActive ? "bg-accent/20 border-accent shadow-[0_0_20px_rgba(255,225,0,0.15)]" : "bg-card border-border hover:bg-secondary"
              }`}
              aria-label={`Rate ${rating} out of 5`}
            >
              <Star size={24} className={`transition-all duration-200 ${isActive ? "text-accent fill-accent" : "text-muted-foreground"}`} />
            </motion.button>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        {isPositive && (
          <motion.div
            key="positive"
            initial={{ opacity: 0, y: 16, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            className="w-full flex flex-col items-center gap-4"
          >
            <p className="text-muted-foreground text-sm text-center">Glad you enjoyed {merchantName}! Anything to add? (optional)</p>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="What did you like?"
              rows={2}
              maxLength={1000}
              className="w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground text-sm placeholder:text-muted-foreground/60 resize-none focus:outline-none focus:ring-2 focus:ring-foreground/20"
            />
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => onSubmit({ rating: selectedRating!, feedback: feedback.trim() || undefined })}
              disabled={submitting}
              className="flex items-center gap-2 bg-foreground text-background px-8 py-3.5 rounded-xl font-semibold text-base shadow-lg disabled:opacity-50"
            >
              <Check size={18} /> {submitting ? "Saving..." : "Submit rating"}
            </motion.button>
          </motion.div>
        )}

        {isNegative && (
          <motion.div
            key="negative"
            initial={{ opacity: 0, y: 16, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            className="w-full flex flex-col items-center gap-4"
          >
            <p className="text-muted-foreground text-sm text-center">
              Sorry about that. Tell {merchantName} what went wrong so they can make it right. This goes straight to the manager.
            </p>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Tell us what happened..."
              rows={3}
              maxLength={1000}
              className="w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground text-sm placeholder:text-muted-foreground/60 resize-none focus:outline-none focus:ring-2 focus:ring-foreground/20"
            />
            <div className="w-full flex flex-col gap-2">
              <p className="text-xs font-medium text-foreground">How should the manager reach you to make it right?</p>
              <div className="grid grid-cols-3 gap-2">
                {CONTACT_OPTIONS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setContact(id)}
                    aria-pressed={contact === id}
                    className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-medium transition-colors ${
                      contact === id ? "border-foreground bg-foreground text-background" : "border-border bg-card text-foreground"
                    }`}
                  >
                    <Icon size={15} /> {label}
                  </button>
                ))}
              </div>
              {needsPhone ? (
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Your phone number"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  maxLength={40}
                  className="w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-foreground/20"
                />
              ) : (
                <p className="text-xs text-muted-foreground">We&apos;ll use {customerEmail || "your Google email"}.</p>
              )}
            </div>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() =>
                onSubmit({
                  rating: selectedRating!,
                  feedback: feedback.trim(),
                  phone: needsPhone ? phone.trim() : undefined,
                  contactPreference: contact,
                })
              }
              disabled={submitting || !feedback.trim() || (needsPhone && !phoneOk)}
              className="flex items-center gap-2 bg-foreground text-background px-8 py-3.5 rounded-xl font-semibold text-base disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send size={18} /> {submitting ? "Sending..." : "Send to the manager"}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
