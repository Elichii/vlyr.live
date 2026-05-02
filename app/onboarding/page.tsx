"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Suspense } from "react"
import { StepPlan } from "@/components/onboarding/StepPlan"
import { StepAuth } from "@/components/onboarding/StepAuth"
import { StepBusiness } from "@/components/onboarding/StepBusiness"
import { StepGoogleConnect } from "@/components/onboarding/StepGoogleConnect"
import { StepLogistics } from "@/components/onboarding/StepLogistics"
import { StepPrintStudio } from "@/components/onboarding/StepPrintStudio"
import { StepPayment } from "@/components/onboarding/StepPayment"
import { StepSuccess } from "@/components/onboarding/StepSuccess"
import { OnboardingOrderSummary } from "@/components/onboarding/OnboardingOrderSummary"
import { OnboardingMarketingPanel } from "@/components/onboarding/OnboardingMarketingPanel"
import { DEFAULT_ONBOARDING, PACKAGES, type OnboardingData } from "@/lib/onboarding-types"
import { persistStepProgress, fetchOnboardingProgress } from "@/app/onboarding/actions"
import { VLYRLoader } from "@/components/vlyr-loader"

function OnboardingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const rawPlan = searchParams.get("plan")
  const rawCycle = searchParams.get("cycle")
  const urlStep = searchParams.get("step") // For OAuth callback redirect

  // Validate URL params against real package IDs and billing cycles
  const validPlanIds = PACKAGES.map((p) => p.id)
  const paramPlan = rawPlan && validPlanIds.includes(rawPlan) ? rawPlan : null
  const paramCycle: "monthly" | "annual" | null =
    rawCycle === "monthly" || rawCycle === "annual" ? rawCycle : null
  const hasPlanParams = !!paramPlan && !!paramCycle

  // Google verification now comes FIRST after auth to auto-populate business details
  const allSteps = hasPlanParams
    ? (["auth", "google-connect", "business", "logistics", "print-studio", "payment", "success"] as const)
    : (["plan", "auth", "google-connect", "business", "logistics", "print-studio", "payment", "success"] as const)

  type StepId = (typeof allSteps)[number]

  const STEP_META: Record<string, { label: string }> = {
    plan: { label: "Plan" },
    auth: { label: "Account" },
    "google-connect": { label: "Verify" },
    business: { label: "Details" },
    logistics: { label: "Supply" },
    "print-studio": { label: "Labels" },
    payment: { label: "Payment" },
    success: { label: "Done" },
  }

  // Use URL step param if provided (from OAuth callback), otherwise start at beginning
  const initialStep = urlStep && allSteps.includes(urlStep as StepId) ? (urlStep as StepId) : allSteps[0]
  const [step, setStep] = useState<StepId>(initialStep)
  const [data, setData] = useState<OnboardingData>({
    ...DEFAULT_ONBOARDING,
    packageId: paramPlan ?? "growth",
    billingCycle: paramCycle ?? "monthly",
  })

  const [resumeChecked, setResumeChecked] = useState(false)

  const update = useCallback((updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }))
  }, [])

  // Handle step from URL param (e.g., from OAuth callback)
  useEffect(() => {
    if (urlStep && allSteps.includes(urlStep as StepId) && urlStep !== step) {
      setStep(urlStep as StepId)
      // Clean up URL params after reading
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete("step")
      newUrl.searchParams.delete("google_connected")
      newUrl.searchParams.delete("business_name")
      newUrl.searchParams.delete("location_id")
      window.history.replaceState({}, "", newUrl.pathname + newUrl.search)
    }
  }, [urlStep, step, allSteps])

  // Resume from saved progress on mount (only for authenticated users)
  useEffect(() => {
    async function checkResume() {
      // Check if we just came back from OAuth redirect (via URL param or sessionStorage)
      const oauthComplete = searchParams.get("oauth_complete")
      const oauthPending = sessionStorage.getItem("vlyr-oauth-pending")
      
      if (oauthComplete || oauthPending) {
        // Don't override step - the URL step param handles it
        sessionStorage.removeItem("vlyr-oauth-pending")
        sessionStorage.removeItem("vlyr-oauth-return-step")
        setResumeChecked(true)
        return
      }
      
      try {
        const progress = await fetchOnboardingProgress()
        if (progress && progress.onboarding_step_index > 0) {
          const savedIndex = progress.onboarding_step_index
          if (savedIndex < allSteps.length) {
            setStep(allSteps[savedIndex])
          }
          // Also restore plan choice if it was persisted
          if (progress.package_id && progress.billing_cycle) {
            setData((prev) => ({
              ...prev,
              packageId: progress.package_id || prev.packageId,
              billingCycle: (progress.billing_cycle as "monthly" | "annual") || prev.billingCycle,
            }))
          }
        }
      } catch {
        // Not authenticated yet or network error -- ignore, start fresh
      } finally {
        setResumeChecked(true)
      }
    }
    checkResume()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const currentIndex = allSteps.indexOf(step)
  const progressSteps = allSteps.filter((s) => s !== "success")

  const goNext = () => {
    const nextIndex = currentIndex + 1

    if (nextIndex < allSteps.length) {
      setStep(allSteps[nextIndex])
      // Persist step progress for resume (fire-and-forget, non-blocking)
      persistStepProgress(nextIndex).catch(() => {})
    }
  }

  const goBack = () => {
    const prevIndex = currentIndex - 1
    if (prevIndex >= 0) {
      setStep(allSteps[prevIndex])
      persistStepProgress(prevIndex).catch(() => {})
    }
  }

  // Show marketing panel from google-connect through payment
  const showMarketingPanel = ["google-connect", "business", "logistics", "print-studio", "payment"].includes(step)
  const isFullWidth = step === "plan" || step === "auth" || step === "success"

  return (
    <main className="min-h-svh bg-background flex">
      {/* Left Side - Form Content */}
      <div className={`flex flex-col ${showMarketingPanel ? 'w-full lg:w-1/2' : 'w-full'}`}>
        {/* Header */}
        <header className="flex items-center justify-between px-5 py-4 shrink-0 border-b border-border">
          <div className="flex items-center gap-2.5">
            <img
              src="/images/vlyr-logo.png"
              alt="VLYR"
              className="h-6 w-auto"
            />
            <span className="text-border text-lg font-light select-none">|</span>
            <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Onboarding
            </span>
          </div>
          <button
            onClick={() => router.push("/")}
            className="text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
          >
            Back to home
          </button>
        </header>

        {/* Progress bar */}
        {step !== "success" && (
          <div className="px-5 pb-4 pt-4">
            <div className="flex items-center gap-1">
              {progressSteps.map((s, i) => {
                const verifyIndex = progressSteps.indexOf("google-connect")
                const paymentIndex = progressSteps.indexOf("payment")
                const isInVerifyToPaymentRange = currentIndex >= verifyIndex && currentIndex < paymentIndex
                
                let segmentProgress = "0%"
                if (i < currentIndex) {
                  segmentProgress = "100%"
                } else if (i === currentIndex) {
                  if (isInVerifyToPaymentRange && i === verifyIndex) {
                    segmentProgress = "50%"
                  } else if (isInVerifyToPaymentRange && i > verifyIndex && i < paymentIndex) {
                    segmentProgress = "0%"
                  } else {
                    segmentProgress = "50%"
                  }
                }
                
                if (isInVerifyToPaymentRange && i > verifyIndex && i < currentIndex) {
                  segmentProgress = "100%"
                }
                
                return (
                  <div key={s} className="flex-1 flex flex-col gap-1.5">
                    <div className="h-1 rounded-full overflow-hidden bg-muted">
                      <motion.div
                        className="h-full bg-foreground rounded-full"
                        initial={{ width: "0%" }}
                        animate={{ width: segmentProgress }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                      />
                    </div>
                    <span
                      className={`text-[10px] font-medium tracking-wide ${
                        i <= currentIndex
                          ? "text-foreground"
                          : "text-muted-foreground/40"
                      }`}
                    >
                      {STEP_META[s]?.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Step Content */}
        <div className={`flex-1 flex ${isFullWidth ? "items-start justify-center" : ""} px-5 pb-8 pt-2 overflow-auto`}>
          <div className={`w-full ${step === "plan" ? "max-w-4xl" : "max-w-lg"} mx-auto`}>
            <AnimatePresence mode="wait">
              {step === "plan" && (
                <StepPlan key="plan" data={data} onChange={update} onNext={goNext} />
              )}
              {step === "auth" && (
                <StepAuth key="auth" data={data} onChange={update} onNext={goNext} onBack={goBack} />
              )}
              {step === "google-connect" && (
                <StepGoogleConnect key="google-connect" data={data} onChange={update} onNext={goNext} onBack={goBack} />
              )}
              {step === "business" && (
                <StepBusiness key="business" data={data} onChange={update} onNext={goNext} onBack={goBack} />
              )}
              {step === "logistics" && (
                <StepLogistics key="logistics" data={data} onChange={update} onNext={goNext} onBack={goBack} />
              )}
              {step === "print-studio" && (
                <StepPrintStudio key="print-studio" data={data} onChange={update} onNext={goNext} onBack={goBack} />
              )}
              {step === "payment" && (
                <StepPayment key="payment" data={data} onNext={goNext} onBack={goBack} />
              )}
              {step === "success" && (
                <StepSuccess key="success" data={data} onGoToDashboard={() => router.push("/dashboard")} />
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer */}
        <footer className="flex items-center justify-center px-5 py-5 shrink-0 bg-vlyr-dark">
          <span className="text-[#FFFFFF]/40 text-[11px] font-medium tracking-wide">
            Powered by VLYR
          </span>
        </footer>
      </div>

      {/* Right Side - Marketing Panel (Full Height, Independent Scroll) */}
      {showMarketingPanel && (
        <div className="hidden lg:flex lg:w-1/2 border-l border-[#E6E6E6] h-svh sticky top-0 overflow-hidden">
          <OnboardingMarketingPanel 
            isVerified={step !== "google-connect"}
            businessRating={data.googleRating || 4.7}
            totalReviews={data.googleReviewCount || 62}
            businessName={data.businessName || data.googleAccountName || "Your Business"}
          />
        </div>
      )}
    </main>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={<VLYRLoader variant="full" message="Preparing onboarding..." />}
    >
      <OnboardingContent />
    </Suspense>
  )
}
