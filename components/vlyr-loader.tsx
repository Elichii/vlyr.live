"use client"

import { motion } from "framer-motion"
import Image from "next/image"

/**
 * VLYR Branded Loader
 *
 * Displays the VLYR logo bigger and centered. The rotating animation effect
 * is on the outer curved-edge rectangular border/frame (not the logo).
 * A conic-gradient mask rotates continuously around the rounded-rect frame
 * to create a sweeping border trace effect.
 *
 * "full" variant: fixed overlay, blurs and dims background content.
 * "card" variant: inline block for section-level loading.
 */
export function VLYRLoader({
  variant = "full",
  message,
}: {
  variant?: "full" | "card"
  message?: string
}) {
  const isFull = variant === "full"

  return (
    <div
      className={
        isFull
          ? "fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/70 backdrop-blur-md"
          : "flex flex-col items-center justify-center py-16"
      }
    >
      {/* Outer rotating border frame */}
      <div className="relative flex items-center justify-center">
        {/* Spinning conic gradient border */}
        <motion.div
          className="absolute rounded-2xl"
          style={{
            width: isFull ? 220 : 160,
            height: isFull ? 88 : 64,
            background: "conic-gradient(from 0deg, transparent 0%, #FFE100 25%, transparent 50%)",
            filter: "blur(0.5px)",
          }}
          animate={{ rotate: 360 }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "linear",
          }}
        />
        {/* Static track border (faint outline) */}
        <div
          className="absolute rounded-2xl border-2 border-foreground/10"
          style={{
            width: isFull ? 216 : 156,
            height: isFull ? 84 : 60,
          }}
        />
        {/* Inner container with background to clip the gradient */}
        <div
          className="relative rounded-2xl bg-background flex items-center justify-center"
          style={{
            width: isFull ? 212 : 152,
            height: isFull ? 80 : 56,
          }}
        >
          <Image
            src="/images/vlyr-logo-white.png"
            alt="VLYR"
            width={isFull ? 140 : 100}
            height={isFull ? 44 : 32}
            className="object-contain"
            priority
          />
        </div>
      </div>

      {message && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.3,
          }}
          className="text-sm text-muted-foreground font-medium mt-6"
        >
          {message}
        </motion.p>
      )}
    </div>
  )
}

/**
 * Tiny inline loader for buttons -- small VLYR "V" inside a mini
 * spinning rectangle frame.
 */
export function VLYRInlineLoader({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="relative flex items-center justify-center" style={{ width: 22, height: 14 }}>
        <motion.span
          className="absolute rounded-sm"
          style={{
            width: 22,
            height: 14,
            background: "conic-gradient(from 0deg, transparent 0%, #FFE100 30%, transparent 60%)",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        <span
          className="relative rounded-sm bg-background flex items-center justify-center"
          style={{ width: 20, height: 12 }}
        >
          <svg
            width={8}
            height={8}
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M2 2L6 10L10 2"
              stroke="#FFE100"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </span>
      {label && <span className="text-sm font-medium">{label}</span>}
    </span>
  )
}
