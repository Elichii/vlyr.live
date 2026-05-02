"use client"

import { motion } from "framer-motion"
import { ShieldAlert, CreditCard, Mail, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function BillingBlockedPage() {
  return (
    <div className="min-h-svh bg-background flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full text-center"
      >
        {/* Warning icon */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20">
              <ShieldAlert size={36} className="text-red-400" />
            </div>
            <motion.div
              className="absolute -inset-2 rounded-3xl border border-red-500/20"
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-foreground tracking-tight mb-2">
          Payment Past Due
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed mb-8">
          Your most recent invoice payment failed. Your dashboard access has been
          temporarily restricted until the payment is resolved.
        </p>

        {/* Info card */}
        <div className="bg-card border border-border rounded-2xl p-5 mb-6 text-left space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#FFE100]/10 border border-[#FFE100]/20 shrink-0 mt-0.5">
              <CreditCard size={14} className="text-[#FFE100]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Update your payment method</p>
              <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                Contact us or log into your payment portal to update your card or billing details.
                Once payment succeeds, your access will be restored automatically.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#FFE100]/10 border border-[#FFE100]/20 shrink-0 mt-0.5">
              <Mail size={14} className="text-[#FFE100]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Check your email</p>
              <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                A payment failure notice was sent to your email with details
                on how to retry or update your payment method.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Button
            asChild
            className="w-full h-11 bg-[#FFE100] text-[#0D0D0D] font-semibold rounded-xl hover:bg-[#FFE100]/90 transition-all"
          >
            <a href="mailto:billing@vlyr.io">
              <CreditCard size={16} className="mr-2" />
              Manage Billing
            </a>
          </Button>
          <Button
            asChild
            variant="outline"
            className="w-full h-11 rounded-xl border-border hover:bg-secondary transition-all"
          >
            <Link href="/">
              <ArrowLeft size={16} className="mr-2" />
              Back to Home
            </Link>
          </Button>
        </div>

        <p className="text-[11px] text-muted-foreground mt-6">
          If you believe this is an error, please contact{" "}
          <a href="mailto:support@vlyr.io" className="underline hover:text-foreground">
            support@vlyr.io
          </a>
        </p>
      </motion.div>
    </div>
  )
}
