"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Mail, Lock, Phone, ArrowRight, ArrowLeft, Eye, EyeOff, ShieldCheck, CheckCircle2, AlertCircle, User } from "lucide-react"
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
  if (score <= 1) return { score: 1, label: "Weak", color: "bg-red-400" }
  if (score === 2) return { score: 2, label: "Fair", color: "bg-orange-400" }
  if (score === 3) return { score: 3, label: "Good", color: "bg-yellow-400" }
  if (score === 4) return { score: 4, label: "Strong", color: "bg-green-500" }
  return { score: 5, label: "Very strong", color: "bg-green-600" }
}

export function StepAuth({ data, onChange, onNext, onBack }: StepAuthProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [showOtp, setShowOtp] = useState(false)
  const [otpValue, setOtpValue] = useState("")
  const [resendTimer, setResendTimer] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  const strength = useMemo(() => getPasswordStrength(data.password), [data.password])
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)

  useEffect(() => {
    if (resendTimer <= 0) return
    const id = setInterval(() => setResendTimer((p) => p - 1), 1000)
    return () => clearInterval(id)
  }, [resendTimer])

  const handleSendOtp = useCallback(() => {
    if (!data.phone || data.phone.length < 10) return
    setShowOtp(true)
    setResendTimer(60)
  }, [data.phone])

  const handleVerifyOtp = useCallback((value: string) => {
    setOtpValue(value)
    if (value.length === 6) onChange({ otpVerified: true })
  }, [onChange])

  const canProceed = isEmailValid && data.username.length >= 3 && data.password.length >= 6 && data.otpVerified

  const handleSignUp = useCallback(async () => {
    if (!canProceed) return
    setIsSubmitting(true)
    setAuthError(null)
    try {
      const result = await serverSignUp({ email: data.email, password: data.password, username: data.username, phone: data.phone, packageId: data.packageId || "starter", billingCycle: data.billingCycle || "monthly" })
      if (!result.success || !result.userId) { setAuthError(result.error ?? "Account creation failed. Please try again."); return }
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
      className="flex flex-col gap-7 w-full"
    >
      <div>
        <h2 className="text-2xl font-bold text-[#0A0A0A] tracking-tight mb-1">Create your account</h2>
        <p className="text-sm text-[#666666] leading-relaxed">Takes about 90 seconds. Your progress is saved automatically.</p>
      </div>

      <AnimatePresence>
        {authError && (
          <motion.div initial={{ opacity: 0, y: -4, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="flex items-start gap-3 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            {authError}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-5">
        {/* Email */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-[#0A0A0A] uppercase tracking-wider">Email address</label>
          <div className="relative">
            <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#888888]" />
            <Input type="email" placeholder="you@yourbusiness.com" value={data.email} onChange={(e) => onChange({ email: e.target.value })}
              className="pl-10 h-12 rounded-xl bg-[#FAFAFA] border-[#E5E5E5] text-[#0A0A0A] placeholder:text-[#AAAAAA] focus-visible:ring-[#0A0A0A]/20 focus-visible:border-[#0A0A0A]" />
            {isEmailValid && <CheckCircle2 size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#00a544]" />}
          </div>
          {data.email.length > 4 && !isEmailValid && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={10} /> Enter a valid email address</p>}
        </div>

        {/* Username */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-[#0A0A0A] uppercase tracking-wider">Username</label>
          <div className="relative">
            <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#888888]" />
            <Input type="text" placeholder="Choose a username" value={data.username} onChange={(e) => onChange({ username: e.target.value })}
              className="pl-10 h-12 rounded-xl bg-[#FAFAFA] border-[#E5E5E5] text-[#0A0A0A] placeholder:text-[#AAAAAA] focus-visible:ring-[#0A0A0A]/20 focus-visible:border-[#0A0A0A]" />
            {data.username.length >= 3 && <CheckCircle2 size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#00a544]" />}
          </div>
          {data.username.length > 0 && data.username.length < 3 && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={10} /> At least 3 characters</p>}
        </div>

        {/* Password */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-[#0A0A0A] uppercase tracking-wider">Password</label>
          <div className="relative">
            <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#888888]" />
            <Input type={showPassword ? "text" : "password"} placeholder="Min. 6 characters" value={data.password} onChange={(e) => onChange({ password: e.target.value })}
              className="pl-10 pr-11 h-12 rounded-xl bg-[#FAFAFA] border-[#E5E5E5] text-[#0A0A0A] placeholder:text-[#AAAAAA] focus-visible:ring-[#0A0A0A]/20 focus-visible:border-[#0A0A0A]" />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#888888] hover:text-[#0A0A0A] transition-colors">
              {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          {data.password.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 2 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2.5 mt-0.5">
              <div className="flex gap-1 flex-1">
                {[1, 2, 3, 4, 5].map((lvl) => (
                  <div key={lvl} className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${lvl <= strength.score ? strength.color : "bg-[#EBEBEB]"}`} />
                ))}
              </div>
              <span className="text-xs font-semibold text-[#888888] shrink-0">{strength.label}</span>
            </motion.div>
          )}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 my-1">
          <div className="flex-1 h-px bg-[#E5E5E5]" />
          <span className="text-xs text-[#AAAAAA] font-semibold uppercase tracking-wider">Phone verification</span>
          <div className="flex-1 h-px bg-[#E5E5E5]" />
        </div>

        {/* Phone */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-[#0A0A0A] uppercase tracking-wider">Mobile number</label>
          <p className="text-sm text-[#888888]">We'll send negative review alerts to this number</p>
          <div className="relative">
            <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#888888]" />
            <Input type="tel" placeholder="+1 (555) 000-0000" value={data.phone} onChange={(e) => onChange({ phone: e.target.value, otpVerified: false })}
              className="pl-10 h-12 rounded-xl bg-[#FAFAFA] border-[#E5E5E5] text-[#0A0A0A] placeholder:text-[#AAAAAA] focus-visible:ring-[#0A0A0A]/20 focus-visible:border-[#0A0A0A]" />
            {data.otpVerified && <CheckCircle2 size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#00a544]" />}
          </div>
        </div>

        <AnimatePresence>
          {!showOtp && data.phone.length >= 10 && !data.otpVerified && (
            <motion.button initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              onClick={handleSendOtp}
              className="w-full h-11 rounded-full border-2 border-dashed border-[#E5E5E5] bg-[#FAFAFA] text-sm font-semibold text-[#0A0A0A] hover:border-[#0A0A0A] hover:rounded-xl transition-all duration-200">
              Send verification code →
            </motion.button>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showOtp && !data.otpVerified && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
              className="flex flex-col items-center gap-4 p-5 bg-[#FAFAFA] rounded-2xl border border-[#E5E5E5]">
              <div className="text-center">
                <p className="text-sm font-semibold text-[#0A0A0A]">Check your messages</p>
                <p className="text-xs text-[#888888] mt-0.5">Enter the 6-digit code sent to {data.phone}</p>
              </div>
              <InputOTP maxLength={6} value={otpValue} onChange={handleVerifyOtp}>
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot key={i} index={i} className="bg-white border-[#E5E5E5] text-[#0A0A0A] h-11 w-10 text-base font-mono" />
                  ))}
                </InputOTPGroup>
              </InputOTP>
              <button type="button" disabled={resendTimer > 0} onClick={() => setResendTimer(60)}
                className="text-xs text-[#888888] hover:text-[#0A0A0A] disabled:opacity-40 transition-colors">
                {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend code"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {data.otpVerified && (
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2.5 p-3.5 bg-[#f0fdf4] border border-[#00a544]/20 rounded-xl">
              <div className="w-6 h-6 rounded-full bg-[#00a544] flex items-center justify-center shrink-0">
                <CheckCircle2 size={14} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#166534]">Phone verified</p>
                <p className="text-xs text-[#16a34a]">{data.phone}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Trust signals */}
      <div className="flex items-center justify-center gap-5 py-2">
        {[
          { icon: ShieldCheck, text: "256-bit SSL" },
          { icon: CheckCircle2, text: "GDPR compliant" },
          { icon: Lock, text: "Encrypted" },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-1 text-[#AAAAAA]">
            <item.icon size={11} />
            <span className="text-sm font-medium">{item.text}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={onBack} disabled={isSubmitting} size="lg" className="flex-1">
          <ArrowLeft size={16} className="mr-1" /> Back
        </Button>
        <Button variant="default" onClick={handleSignUp} disabled={!canProceed || isSubmitting} size="lg" className="flex-[2]">
          {isSubmitting ? <VLYRInlineLoader label="Creating account..." /> : <><span>Create account</span><ArrowRight size={16} /></>}
        </Button>
      </div>
    </motion.div>
  )
}
