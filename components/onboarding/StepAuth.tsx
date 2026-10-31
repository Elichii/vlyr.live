"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Mail, Lock, Phone, ArrowRight, ArrowLeft,
  Eye, EyeOff, ShieldCheck, CheckCircle2, AlertCircle, User,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"
import { serverSignUp } from "@/app/auth/signup-action"
import { persistPlanChoice } from "@/app/onboarding/actions"
import { VLYRInlineLoader } from "@/components/vlyr-loader"
import type { OnboardingData } from "@/lib/onboarding-types"

interface StepAuthProps {
  data: OnboardingData
  onChange: (updates: Partial<OnboardingData>) => void
  onNext: () => void
  onBack: () => void
}

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0
  if (pw.length >= 6) score++
  if (pw.length >= 10) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  if (score <= 1) return { score: 1, label: "Weak",       color: "bg-red-400" }
  if (score === 2) return { score: 2, label: "Fair",       color: "bg-orange-400" }
  if (score === 3) return { score: 3, label: "Good",       color: "bg-[#FFE100]" }
  if (score === 4) return { score: 4, label: "Strong",     color: "bg-[#0A0A0A]" }
  return              { score: 5,    label: "Very strong", color: "bg-[#0A0A0A]" }
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-xs font-semibold text-[#595959] tracking-wide uppercase">
      {children}
    </label>
  )
}

export function StepAuth({ data, onChange, onNext, onBack }: StepAuthProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  // Errors sent back from "Continue with Google"
  useEffect(() => {
    const googleError = new URLSearchParams(window.location.search).get("google_error")
    if (googleError) setAuthError(googleError.replace(/_/g, " "))
  }, [])

  const strength = useMemo(() => getPasswordStrength(data.password), [data.password])
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)

  const canProceed = isEmailValid && data.username.length >= 3 && data.password.length >= 6

  const handleSignUp = useCallback(async () => {
    if (!canProceed) return
    setIsSubmitting(true)
    setAuthError(null)
    try {
      const result = await serverSignUp({
        email: data.email, password: data.password, username: data.username,
        phone: data.phone, packageId: data.packageId || "starter", billingCycle: data.billingCycle || "monthly",
      })
      if (!result.success || !result.userId) {
        setAuthError(result.error ?? "Account creation failed. Please try again.")
        return
      }
      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: data.email, password: data.password })
      if (signInError) { setAuthError("Account created but sign-in failed. Please use the login page."); return }
      onChange({ userId: result.userId })
      await persistPlanChoice(result.userId, data.packageId, data.billingCycle)
      onNext()
    } catch {
      setAuthError("Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }, [canProceed, data, onChange, onNext])

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.35 }}
      className="flex flex-col gap-6 w-full"
    >
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-[#0A0A0A] tracking-tight mb-1">
          Create your account
        </h2>
        <p className="text-sm text-[#595959] leading-relaxed">
          Your reputation protection starts here. Takes under 2 minutes.
        </p>
      </div>

      {/* Error banner */}
      <AnimatePresence>
        {authError && (
          <motion.div
            initial={{ opacity: 0, y: -4, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="flex items-start gap-3 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm"
          >
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            {authError}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Google (fastest) ────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <a
          href={`/api/google/auth?mode=signup&plan=${encodeURIComponent(data.packageId || "free")}&cycle=${data.billingCycle || "monthly"}`}
          className="flex items-center justify-center gap-3 h-12 rounded-xl border border-[#DADCE0] bg-white text-[#0A0A0A] text-sm font-semibold hover:bg-[#F8F9FA] transition-colors"
        >
          <GoogleIcon />
          Continue with Google
        </a>
        <p className="text-[11px] text-[#888888] text-center leading-relaxed">
          Recommended. Uses your Google account and connects your Google Business Profile in one step.
        </p>
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-[#EBEBEB]" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#AAAAAA]">or use email</span>
          <div className="h-px flex-1 bg-[#EBEBEB]" />
        </div>
      </div>

      {/* ── Credentials ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">

        {/* Email */}
        <div className="flex flex-col gap-1.5">
          <FieldLabel>Email address</FieldLabel>
          <div className="relative">
            <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#AAAAAA]" />
            <Input
              type="email" placeholder="you@yourbusiness.com"
              value={data.email} onChange={(e) => onChange({ email: e.target.value })}
              className="pl-10 h-12 rounded-xl bg-[#FAFAFA] border-[#E5E5E5] text-[#0A0A0A] placeholder:text-[#AAAAAA] focus-visible:ring-1 focus-visible:ring-[#0A0A0A]/20 focus-visible:border-[#0A0A0A]"
            />
            {isEmailValid && (
              <CheckCircle2 size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#16a34a]" />
            )}
          </div>
          {data.email.length > 4 && !isEmailValid && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <AlertCircle size={10} /> Enter a valid email address
            </p>
          )}
        </div>

        {/* Username */}
        <div className="flex flex-col gap-1.5">
          <FieldLabel>Username</FieldLabel>
          <div className="relative">
            <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#AAAAAA]" />
            <Input
              type="text" placeholder="Choose a username"
              value={data.username} onChange={(e) => onChange({ username: e.target.value })}
              className="pl-10 h-12 rounded-xl bg-[#FAFAFA] border-[#E5E5E5] text-[#0A0A0A] placeholder:text-[#AAAAAA] focus-visible:ring-1 focus-visible:ring-[#0A0A0A]/20 focus-visible:border-[#0A0A0A]"
            />
            {data.username.length >= 3 && (
              <CheckCircle2 size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#16a34a]" />
            )}
          </div>
          {data.username.length > 0 && data.username.length < 3 && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <AlertCircle size={10} /> At least 3 characters
            </p>
          )}
        </div>

        {/* Password */}
        <div className="flex flex-col gap-1.5">
          <FieldLabel>Password</FieldLabel>
          <div className="relative">
            <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#AAAAAA]" />
            <Input
              type={showPassword ? "text" : "password"} placeholder="Min. 6 characters"
              value={data.password} onChange={(e) => onChange({ password: e.target.value })}
              className="pl-10 pr-11 h-12 rounded-xl bg-[#FAFAFA] border-[#E5E5E5] text-[#0A0A0A] placeholder:text-[#AAAAAA] focus-visible:ring-1 focus-visible:ring-[#0A0A0A]/20 focus-visible:border-[#0A0A0A]"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#AAAAAA] hover:text-[#0A0A0A] transition-colors">
              {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          {data.password.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 2 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2.5">
              <div className="flex gap-1 flex-1">
                {[1, 2, 3, 4, 5].map((lvl) => (
                  <div key={lvl} className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${lvl <= strength.score ? strength.color : "bg-[#EBEBEB]"}`} />
                ))}
              </div>
              <span className="text-xs font-semibold text-[#595959] shrink-0 w-20 text-right">{strength.label}</span>
            </motion.div>
          )}
        </div>
      </div>

      {/* ── Phone (optional) ─────────────────────────────────────── */}
      <div className="flex flex-col gap-1.5">
        <FieldLabel>Phone number <span className="normal-case font-normal tracking-normal text-[#8C8C8C]">(optional)</span></FieldLabel>
        <div className="relative">
          <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#AAAAAA]" />
          <Input
            type="tel" placeholder="+1 (555) 000-0000" autoComplete="tel"
            value={data.phone} onChange={(e) => onChange({ phone: e.target.value.replace(/[^\d+()\-\s.]/g, "").slice(0, 25) })}
            className="pl-10 h-12 rounded-xl bg-[#FAFAFA] border-[#E5E5E5] text-[#0A0A0A] placeholder:text-[#AAAAAA] focus-visible:ring-1 focus-visible:ring-[#0A0A0A]/20 focus-visible:border-[#0A0A0A]"
          />
        </div>
        <p className="text-xs text-[#8C8C8C]">For orders and support. You can switch on text alerts later in your dashboard.</p>
      </div>

      {/* ── Trust strip ─────────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-6 py-1">
        {[
          { icon: ShieldCheck, text: "256-bit SSL" },
          { icon: CheckCircle2, text: "GDPR compliant" },
          { icon: Lock, text: "Encrypted" },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[#595959]">
            <item.icon size={12} />
            <span className="text-xs font-medium">{item.text}</span>
          </div>
        ))}
      </div>

      {/* ── Actions ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          disabled={isSubmitting}
          className="flex-1 h-12 rounded-xl border border-[#E5E5E5] bg-white text-[#0A0A0A] text-sm font-semibold flex items-center justify-center gap-2 hover:border-[#0A0A0A] transition-colors disabled:opacity-40"
        >
          <ArrowLeft size={15} /> Back
        </button>
        <button
          onClick={handleSignUp}
          disabled={!canProceed || isSubmitting}
          className="flex-[2] h-12 rounded-xl bg-[#FFE100] text-[#0A0A0A] text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#FFE100]/90 hover:shadow-[0_0_24px_rgba(255,225,0,0.3)] disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
        >
          {isSubmitting
            ? <VLYRInlineLoader label="Creating account..." />
            : <><span>Create account</span><ArrowRight size={15} /></>
          }
        </button>
      </div>

      <p className="text-center text-xs text-[#AAAAAA]">
        Already have an account?{" "}
        <a href="/auth/login" className="text-[#0A0A0A] font-semibold underline underline-offset-2 hover:no-underline">
          Sign in
        </a>
      </p>
    </motion.div>
  )
}
