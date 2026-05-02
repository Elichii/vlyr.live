"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { motion } from "framer-motion"
import { Mail, User, Lock, Phone, ArrowRight, ArrowLeft, Eye, EyeOff, ShieldCheck } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
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

  if (score <= 1) return { score: 1, label: "Weak", color: "bg-red-500" }
  if (score === 2) return { score: 2, label: "Fair", color: "bg-orange-400" }
  if (score === 3) return { score: 3, label: "Good", color: "bg-yellow-400" }
  if (score === 4) return { score: 4, label: "Strong", color: "bg-green-400" }
  return { score: 5, label: "Very Strong", color: "bg-green-600" }
}

export function StepAuth({ data, onChange, onNext, onBack }: StepAuthProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [showOtp, setShowOtp] = useState(false)
  const [otpValue, setOtpValue] = useState("")
  const [resendTimer, setResendTimer] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  const strength = useMemo(() => getPasswordStrength(data.password), [data.password])

  useEffect(() => {
    if (resendTimer <= 0) return
    const interval = setInterval(() => setResendTimer((p) => p - 1), 1000)
    return () => clearInterval(interval)
  }, [resendTimer])

  const handleSendOtp = useCallback(() => {
    if (!data.phone || data.phone.length < 10) return
    setShowOtp(true)
    setResendTimer(60)
  }, [data.phone])

  const handleVerifyOtp = useCallback(
    (value: string) => {
      setOtpValue(value)
      if (value.length === 6) {
        onChange({ otpVerified: true })
      }
    },
    [onChange],
  )

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)

  const canProceed =
    isEmailValid &&
    data.username.length >= 3 &&
    data.password.length >= 6 &&
    data.otpVerified

  const handleSignUp = useCallback(async () => {
    if (!canProceed) return
    setIsSubmitting(true)
    setAuthError(null)

    try {
      const result = await serverSignUp({
        email: data.email,
        password: data.password,
        username: data.username,
        phone: data.phone,
        packageId: data.packageId || "starter",
        billingCycle: data.billingCycle || "monthly",
      })

      if (!result.success || !result.userId) {
        setAuthError(result.error ?? "Account creation failed. Please try again.")
        return
      }

      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (signInError) {
        setAuthError("Account created but sign-in failed. Please use the login page.")
        return
      }

      onChange({ userId: result.userId })

      // Persist plan choice to DB immediately (belt-and-suspenders with trigger)
      await persistPlanChoice(result.userId, data.packageId, data.billingCycle)

      onNext()
    } catch {
      setAuthError("Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }, [canProceed, data.email, data.password, data.username, data.phone, data.packageId, data.billingCycle, onChange, onNext])

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.35 }}
      className="flex flex-col gap-8 w-full"
    >
      {/* Header with shield icon */}
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20">
          <ShieldCheck size={28} className="text-accent" />
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-foreground tracking-tight text-balance">
            Create your account
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
            Secure your Reputation Shield. Your progress is saved automatically.
          </p>
        </div>
      </div>

      {authError && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium"
        >
          {authError}
        </motion.div>
      )}

      {/* Form card */}
      <div className="flex flex-col gap-5 p-5 bg-card border border-border/60 rounded-2xl">
        {/* Email */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground font-medium tracking-wide uppercase">
            Email address
          </label>
          <div className="relative">
            <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="email"
              placeholder="you@business.com"
              value={data.email}
              onChange={(e) => onChange({ email: e.target.value })}
              className="pl-10 h-12 bg-background border-border text-foreground placeholder:text-muted-foreground/50 rounded-xl"
            />
          </div>
          {data.email.length > 0 && !isEmailValid && (
            <span className="text-[11px] text-destructive ml-1">Enter a valid email address</span>
          )}
        </div>

        {/* Username */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground font-medium tracking-wide uppercase">
            Username
          </label>
          <div className="relative">
            <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Choose a username"
              value={data.username}
              onChange={(e) => onChange({ username: e.target.value })}
              className="pl-10 h-12 bg-background border-border text-foreground placeholder:text-muted-foreground/50 rounded-xl"
            />
          </div>
        </div>

        {/* Password with strength meter */}
        <div className="flex flex-col gap-2">
          <label className="text-xs text-muted-foreground font-medium tracking-wide uppercase">
            Password
          </label>
          <div className="relative">
            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Minimum 6 characters"
              value={data.password}
              onChange={(e) => onChange({ password: e.target.value })}
              className="pl-10 pr-11 h-12 bg-background border-border text-foreground placeholder:text-muted-foreground/50 rounded-xl"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {data.password.length > 0 && (
            <div className="flex items-center gap-2.5 px-0.5">
              <div className="flex-1 flex gap-1">
                {[1, 2, 3, 4, 5].map((level) => (
                  <div
                    key={level}
                    className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                      level <= strength.score ? strength.color : "bg-muted"
                    }`}
                  />
                ))}
              </div>
              <span className="text-[10px] text-muted-foreground font-semibold shrink-0">
                {strength.label}
              </span>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Phone verification</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Phone + OTP */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground font-medium tracking-wide uppercase">
              Phone number
            </label>
            <div className="relative">
              <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="tel"
                placeholder="+1 (555) 000-0000"
                value={data.phone}
                onChange={(e) => onChange({ phone: e.target.value, otpVerified: false })}
                className="pl-10 h-12 bg-background border-border text-foreground placeholder:text-muted-foreground/50 rounded-xl"
              />
            </div>
          </div>

          {!showOtp && data.phone.length >= 10 && !data.otpVerified && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSendOtp}
                className="w-full h-11 rounded-xl border-border bg-background text-foreground hover:bg-secondary font-medium"
              >
                Send Verification Code
              </Button>
            </motion.div>
          )}

          {showOtp && !data.otpVerified && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-3 py-3 px-4 bg-secondary/50 rounded-xl"
            >
              <p className="text-xs text-muted-foreground font-medium">
                Enter the 6-digit verification code
              </p>
              <InputOTP maxLength={6} value={otpValue} onChange={handleVerifyOtp}>
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot
                      key={i}
                      index={i}
                      className="bg-background border-border text-foreground"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
              <button
                type="button"
                disabled={resendTimer > 0}
                onClick={() => setResendTimer(60)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
              >
                {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend code"}
              </button>
            </motion.div>
          )}

          {data.otpVerified && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-xl"
            >
              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-green-500">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2.5 6.5L5 9L9.5 3.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="text-xs text-green-500 font-semibold">Phone verified successfully</span>
            </motion.div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={isSubmitting}
          className="h-12 rounded-xl border-border bg-card text-foreground hover:bg-secondary flex-1 font-medium transition-all active:scale-[0.98]"
        >
          <ArrowLeft size={18} className="mr-2" />
          Back
        </Button>
        <Button
          onClick={handleSignUp}
          disabled={!canProceed || isSubmitting}
          className="h-12 rounded-xl bg-foreground text-background font-semibold text-base hover:bg-foreground/90 hover:shadow-lg disabled:opacity-30 flex-[2] transition-all active:scale-[0.98]"
        >
          {isSubmitting ? (
            <VLYRInlineLoader label="Creating account..." />
          ) : (
            <>
              Continue
              <ArrowRight size={18} className="ml-2" />
            </>
          )}
        </Button>
      </div>
    </motion.div>
  )
}
