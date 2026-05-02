"use client"

import { motion } from "framer-motion"

export function VLYRLogo({ className = "" }: { className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={className}
    >
      <img
        src="/images/vlyr-logo.png"
        alt="VLYR"
        className="h-8 w-auto brightness-0 invert"
      />
    </motion.div>
  )
}
