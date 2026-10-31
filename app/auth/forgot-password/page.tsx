"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowLeft, Mail, MailCheck } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { VLYRInlineLoader } from "@/components/vlyr-loader"
import { createClient } from "@/lib/supabase/client"

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <ForgotPassword />
    </Suspense>
  )
}

function ForgotPassword() {
  const expired = useSearchParams().get("expired") === "1"
  const [email, setEmail] = useState("")
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(expired ? "That reset link has expired or was already used. Request a new one below." : null)
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  const send = async () => {
    if (!valid) return
    setSending(true)
    setError(null)
    const { error: err } = await createClient().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
    })
    setSending(false)
    // Rate limits are worth showing; anything else, show the same message so
    // nobody can use this page to find out which emails have accounts
    if (err && /rate|too many|seconds/i.test(err.message)) {
      setError("Too many requests. Please wait a minute and try again.")
      return
    }
    setSent(true)
  }

  return (
    <div className="min-h-svh flex flex-col items-center justify-center bg-background px-5">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm flex flex-col gap-8">
        <div className="flex flex-col items-center gap-4">
          <Image src="/images/vlyr-logo.png" alt="VLYR" width={100} height={40} className="object-contain" priority />
          <div className="text-center">
            <h1 className="text-xl font-semibold text-foreground tracking-tight">Reset your password</h1>
            <p className="text-sm text-muted-foreground mt-1">We&apos;ll email you a link to choose a new one.</p>
          </div>
        </div>

        {sent ? (
          <div className="flex flex-col items-center gap-3 text-center p-6 rounded-2xl bg-card border border-border">
            <MailCheck size={28} className="text-[#FFE100]" />
            <p className="text-sm font-semibold text-foreground">Check your email</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              If <span className="text-foreground font-medium">{email}</span> has a VLYR account, a reset link is on its way.
              It can take a minute; check spam too.
            </p>
            <p className="text-xs text-muted-foreground">
              Signed up with Google? You don&apos;t have a password: use <span className="font-medium">Continue with Google</span> on the login page.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {error && <p className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</p>}
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="email"
                placeholder="Email address"
                value={email}
                autoFocus
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                className="pl-10 h-12 rounded-xl"
              />
            </div>
            <Button onClick={send} disabled={!valid || sending} className="h-12 rounded-xl font-semibold">
              {sending ? <VLYRInlineLoader label="Sending..." /> : "Send reset link"}
            </Button>
          </div>
        )}

        <Link href="/auth/login" className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft size={14} /> Back to login
        </Link>
      </motion.div>
    </div>
  )
}
