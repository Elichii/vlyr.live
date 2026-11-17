"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Suspense } from "react"
import { StepPlan } from "@/components/onboarding/StepPlan"
import { StepAuth } from "@/components/onboarding/StepAuth"
import { StepBusiness } from "@/components/onboarding/StepBusiness"
import { StepGoogleConnect } from "@/components/onboarding/StepGoogleConnect"
import { StepLogistics } from "@/components/onboarding/StepLogistics"
import { StepPrintStudio } from "@/components/onboarding/StepPrintStudio"
import { StepReputation } from "@/components/onboarding/StepReputation"
import { StepPayment } from "@/components/onboarding/StepPayment"
import { StepSuccess } from "@/components/onboarding/StepSuccess"
import { StepFreeSuccess } from "@/components/onboarding/StepFreeSuccess"
import { OnboardingOrderSummary } from "@/components/onboarding/OnboardingOrderSummary"
import { OnboardingMarketingPanel } from "@/components/onboarding/OnboardingMarketingPanel"
import { DEFAULT_ONBOARDING, PACKAGES, PLAN_ALIASES, isFreePlan, type OnboardingData } from "@/lib/onboarding-types"
import { persistStepProgress, fetchOnboardingProgress, persistFreeOnboarding, chooseSignedInPlan } from "@/app/onboarding/actions"
import { StepOwner } from "@/components/onboarding/StepOwner"
import { VlyrIntroPanel } from "@/components/onboarding/VlyrIntroPanel"
import { VLYRLoader } from "@/components/vlyr-loader"
import { RatingSimulatorPanel } from "@/components/onboarding/RatingSimulatorPanel"
import { createClient } from "@/lib/supabase/client"

type StepId =
  | "plan" | "auth" | "google-connect" | "business" | "owner" | "logistics"
  | "print-studio" | "reputation" | "payment" | "success"

// Stickers are ordered (or printed) from the dashboard's Supply Shop, not during setup
const PAID_STEPS: StepId[] = ["auth", "google-connect", "business", "owner", "logistics", "reputation", "payment", "success"]
// Free trial: Google sign-in, business, owner details, then straight to the dashboard
const FREE_STEPS: StepId[] = ["auth", "google-connect", "business", "owner"]

function stepsFor(packageId: string | null | undefined, withPlanStep: boolean): StepId[] {
  const steps = isFreePlan(packageId) ? FREE_STEPS : PAID_STEPS
  return withPlanStep ? ["plan", ...steps] : steps
}

function OnboardingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const rawPlan = searchParams.get("plan")
  const resolvedPlan = rawPlan ? (PLAN_ALIASES[rawPlan] ?? rawPlan) : null
  const rawCycle = searchParams.get("cycle")
  const urlStep = searchParams.get("step") // For OAuth callback redirect
  // Sent here from the dashboard because setup isn't finished
  const setupRequired = searchParams.get("setup") === "required"

  // Validate URL params against real package IDs and billing cycles
  const validPlanIds = PACKAGES.map((p) => p.id) as string[]
  const paramPlan = resolvedPlan && validPlanIds.includes(resolvedPlan) ? resolvedPlan : null
  const paramCycle: "monthly" | "annual" | null =
    rawCycle === "monthly" || rawCycle === "annual" ? rawCycle : null
  const hasPlanParams = !!paramPlan && !!paramCycle

  // Google verification comes FIRST after auth to auto-populate business details.
  // The step list depends on the chosen plan (free trial skips shipping and payment).
  const initialSteps = stepsFor(paramPlan ?? "growth", !hasPlanParams)

  const STEP_META: Record<string, { label: string }> = {
    plan: { label: "Plan" },
    auth: { label: "Account" },
    "google-connect": { label: "Verify" },
    business: { label: "Details" },
    logistics: { label: "Supply" },
    owner: { label: "About you" },
    "print-studio": { label: "Labels" },
    reputation: { label: "Impact" },
    payment: { label: "Payment" },
    success: { label: "Done" },
  }

  // Use URL step param if provided (from OAuth callback), otherwise start at beginning
  const initialStep = urlStep && (initialSteps as string[]).includes(urlStep) ? (urlStep as StepId) : initialSteps[0]
  const [step, setStep] = useState<StepId>(initialStep)
  const [data, setData] = useState<OnboardingData>({
    ...DEFAULT_ONBOARDING,
    packageId: paramPlan ?? "growth",
    billingCycle: paramCycle ?? "monthly",
  })
  // The Plan step only shows to visitors who haven't chosen a plan yet; a
  // signed-in owner's plan is already saved (even when the URL doesn't say it)
  const [planChosen, setPlanChosen] = useState(hasPlanParams)
  const allSteps = stepsFor(data.packageId, !planChosen)
  /** Saved progress always counts steps without the Plan step. */
  const saveStep = (s: StepId) => {
    const idx = (stepsFor(data.packageId, false) as readonly string[]).indexOf(s)
    if (idx >= 0) persistStepProgress(idx).catch(() => {})
  }

  const [resumeChecked, setResumeChecked] = useState(false)
  // Signed in already: the "Account" step is behind them, Back never returns to it
  const [signedIn, setSignedIn] = useState(false)
  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => setSignedIn(!!user)).catch(() => {})
  }, [])
  // The business highlighted on the Google step (feeds the side panel before it's connected)
  const [previewBusiness, setPreviewBusiness] = useState<{ name: string; rating: number | null; totalReviews: number | null; logoUrl: string | null } | null>(null)

  const update = useCallback((updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }))
  }, [])

  // Handle step from URL param (e.g., from OAuth callback). Apply it once only:
  // the URL keeps the param, so re-applying it would undo every "Continue".
  const urlStepHandled = useRef(false)
  useEffect(() => {
    if (urlStepHandled.current || !urlStep) return
    urlStepHandled.current = true
    if ((allSteps as readonly string[]).includes(urlStep) && urlStep !== step) {
      setStep(urlStep as StepId)
    }
    // Clean up URL params after reading
    const newUrl = new URL(window.location.href)
    newUrl.searchParams.delete("step")
    newUrl.searchParams.delete("google_connected")
    newUrl.searchParams.delete("business_name")
    newUrl.searchParams.delete("location_id")
    window.history.replaceState({}, "", newUrl.pathname + newUrl.search)
  }, [urlStep, step, allSteps])

  // Resume from saved progress on mount (only for authenticated users)
  useEffect(() => {
    async function checkResume() {
      // Check if we just came back from OAuth redirect (via URL param or sessionStorage)
      const oauthComplete = searchParams.get("oauth_complete")
      const oauthPending = sessionStorage.getItem("vlyr-oauth-pending")
      
      const fromOAuth = !!(oauthComplete || oauthPending)
      if (fromOAuth) {
        // Don't override step - the URL step param handles it
        sessionStorage.removeItem("vlyr-oauth-pending")
        sessionStorage.removeItem("vlyr-oauth-return-step")
      }

      try {
        const progress = await fetchOnboardingProgress()
        if (progress?.plan_pending) {
          // Signed up without picking a plan (e.g. from the login page): pick one first
          setPlanChosen(false)
          setStep("plan")
          return
        }
        if (progress?.package_id) {
          setPlanChosen(true)
          setData((prev) => ({
            ...prev,
            packageId: progress.package_id || prev.packageId,
            billingCycle: (progress.billing_cycle as "monthly" | "annual") || prev.billingCycle,
          }))
        }
        if (!fromOAuth && progress && progress.onboarding_step_index > 0) {
          const savedSteps = stepsFor(progress.package_id || data.packageId, false)
          let target = savedSteps[Math.min(progress.onboarding_step_index, savedSteps.length - 1)]
          // Nothing after "Verify" makes sense until a business is connected
          const verifyAt = savedSteps.indexOf("google-connect")
          if (!progress.google_ownership_verified && savedSteps.indexOf(target) > verifyAt) target = "google-connect"
          setStep(target)
        }
      } catch {
        // Not authenticated yet or network error -- ignore, start fresh
      } finally {
        setResumeChecked(true)
      }
    }
    checkResume()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const currentIndex = (allSteps as readonly string[]).indexOf(step)
  const progressSteps = allSteps.filter((s) => s !== "success")

  const goNext = () => {
    let nextIndex = currentIndex + 1
    if (signedIn && allSteps[nextIndex] === "auth") nextIndex++

    if (nextIndex < allSteps.length) {
      setStep(allSteps[nextIndex])
      // Persist step progress for resume (fire-and-forget, non-blocking)
      saveStep(allSteps[nextIndex])
    }
  }

  const firstIndex = signedIn && allSteps.includes("auth") && !allSteps.includes("plan") ? (allSteps as readonly string[]).indexOf("auth") + 1 : 0
  const canGoBack = currentIndex > firstIndex

  // Plan step → next. Signed-in owners (e.g. signed up from the login page) save the pick now.
  const choosePlan = async () => {
    if (!signedIn) return goNext()
    const res = await chooseSignedInPlan(data.packageId, data.billingCycle)
    if (!res.success) { alert(res.error ?? "Couldn't save your plan. Please try again."); return }
    setPlanChosen(true)
    setStep("google-connect")
    saveStep("google-connect")
  }

  const goBack = () => {
    if (!canGoBack) return
    let prevIndex = currentIndex - 1
    if (signedIn && allSteps[prevIndex] === "auth") prevIndex--
    if (prevIndex < firstIndex) return
    setStep(allSteps[prevIndex])
    saveStep(allSteps[prevIndex])
  }

  // Signed-in owners never see the Account step again (e.g. after a refresh)
  useEffect(() => {
    if (!signedIn || !resumeChecked) return
    const idx = (allSteps as readonly string[]).indexOf(step)
    if (idx < firstIndex) setStep(allSteps[firstIndex])
    else if (step === "auth") setStep(allSteps[idx + 1])
  }, [signedIn, resumeChecked, step, allSteps, firstIndex])

  // Remember the current step, so a refresh comes back to it
  useEffect(() => {
    if (!signedIn || !resumeChecked || step === "success" || step === "plan") return
    saveStep(step)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn, resumeChecked, step])

  // The browser's Back button moves between setup steps instead of leaving setup
  const fromHistory = useRef(false)
  useEffect(() => {
    if (fromHistory.current) { fromHistory.current = false; return }
    window.history.pushState({ vlyrStep: step }, "")
  }, [step])
  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const target = (e.state as { vlyrStep?: StepId } | null)?.vlyrStep
      if (!target || !(allSteps as readonly string[]).includes(target)) return
      const idx = (allSteps as readonly string[]).indexOf(target)
      if (idx < firstIndex || target === "success") {
        // Don't leave setup or reopen finished steps: stay where we are
        window.history.pushState({ vlyrStep: step }, "")
        return
      }
      fromHistory.current = true
      setStep(target)
    }
    window.addEventListener("popstate", onPop)
    return () => window.removeEventListener("popstate", onPop)
  }, [allSteps, firstIndex, step])

  // Side panel on every setup step (tablet and wider)
  const showMarketingPanel = ["auth", "google-connect", "business", "owner", "logistics", "print-studio", "reputation", "payment"].includes(step)
  const isFullWidth = step === "plan" || step === "success"

  return (
    <main className="min-h-svh bg-background flex">
      {/* Left Side - Form Content */}
      <div className={`flex flex-col ${showMarketingPanel ? 'w-full md:w-1/2' : 'w-full'}`}>
        {/* Header */}
        <header className="shrink-0 border-b border-[#E5E5E5] bg-white sticky top-0 z-20 h-16">
          <div className="max-w-7xl mx-auto px-6 lg:px-10 h-full flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/images/vlyr-logo.png" alt="VLYR" className="h-7 w-auto" />
              <div className="w-px h-4 bg-[#E5E5E5]" />
              <span className="text-[#595959] text-xs font-semibold tracking-[0.1em] uppercase">Setup</span>
            </div>
            <div className="flex items-center gap-3">
              {step !== "success" && (
                <span className="text-sm text-[#595959] font-medium hidden sm:block">
                  Step {currentIndex + 1} of {progressSteps.length}
                </span>
              )}
              <button
                onClick={() => router.push("/")}
                className="text-sm font-semibold text-[#0A0A0A] border border-[#E5E5E5] px-4 py-1.5 rounded-full hover:border-[#0A0A0A] hover:rounded-xl transition-all duration-200"
              >
                Exit
              </button>
            </div>
          </div>
        </header>

        {/* Progress indicator */}
        {step !== "success" && (
          <div className="border-b border-[#E5E5E5] bg-white">
            <div className="max-w-7xl mx-auto px-6 lg:px-10 pt-4 pb-4">
              {/* Progress bars */}
              <div className="flex items-center gap-1.5 mb-2">
                {progressSteps.map((s, i) => {
                  const isComplete = i < currentIndex
                  const isActive = i === currentIndex
                  return (
                    <div key={s} className="flex-1 h-1 rounded-full overflow-hidden bg-[#EBEBEB]">
                      <motion.div
                        className={`h-full rounded-full ${isActive ? "bg-[#FFE100]" : isComplete ? "bg-[#0A0A0A]" : ""}`}
                        initial={{ width: "0%" }}
                        animate={{ width: isComplete ? "100%" : isActive ? "60%" : "0%" }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                      />
                    </div>
                  )
                })}
              </div>
              {/* Step labels — hidden on small screens to avoid overflow */}
              <div className="hidden sm:flex items-center gap-0">
                {progressSteps.map((s, i) => {
                  const isComplete = i < currentIndex
                  const isActive = i === currentIndex
                  return (
                    <div key={s} className="flex-1 min-w-0">
                      <span className={`text-[10px] font-bold tracking-wider uppercase transition-colors truncate block ${
                        isActive ? "text-[#0A0A0A]" : isComplete ? "text-[#595959]" : "text-[#CCCCCC]"
                      }`}>
                        {STEP_META[s]?.label}
                      </span>
                    </div>
                  )
                })}
              </div>
              {/* Mobile: show only current step name */}
              <div className="sm:hidden">
                <span className="text-[10px] font-bold tracking-wider uppercase text-[#0A0A0A]">
                  {STEP_META[step]?.label}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Step Content */}
        <div className={`flex-1 flex ${isFullWidth ? "items-start justify-center" : step === "auth" ? "lg:items-center" : ""} px-4 sm:px-6 lg:px-10 pb-10 pt-6 overflow-auto`}>
          <div className={`w-full ${step === "plan" ? "max-w-6xl" : step === "google-connect" ? "max-w-3xl" : step === "business" ? "max-w-xl" : "max-w-lg"} mx-auto`}>
            {setupRequired && (step === "google-connect" || step === "business") && (
              <p className="mb-5 text-sm rounded-xl border border-[#FFE100]/40 bg-[#FFE100]/10 text-[#0A0A0A] p-3">
                Finish verifying your business with Google to open your dashboard. Only verified owners can use VLYR.
              </p>
            )}
            <AnimatePresence mode="wait">
              {step === "plan" && (
                <StepPlan key="plan" data={data} onChange={update} onNext={choosePlan} />
              )}
              {step === "auth" && (
                <StepAuth key="auth" data={data} onChange={update} onNext={goNext} onBack={goBack} />
              )}
              {step === "google-connect" && (
                <StepGoogleConnect key="google-connect" data={data} onChange={update} onNext={goNext} onBack={canGoBack ? goBack : undefined} onPreview={setPreviewBusiness} />
              )}
              {step === "business" && (
                <StepBusiness key="business" data={data} onChange={update} onNext={goNext} onBack={goBack} />
              )}
              {step === "logistics" && (
                <StepLogistics key="logistics" data={data} onChange={update} onNext={goNext} onBack={goBack} />
              )}
              {step === "owner" && (
                <StepOwner
                  key="owner"
                  data={data}
                  onChange={update}
                  onBack={goBack}
                  finishLabel={isFreePlan(data.packageId) ? "Finish setup" : "Continue"}
                  onFinish={async () => {
                    if (!isFreePlan(data.packageId)) return goNext()
                    const saved = await persistFreeOnboarding(data)
                    if (!saved.success) throw new Error(saved.error ?? "Could not save your details")
                    router.push("/dashboard?welcome=1")
                  }}
                />
              )}
              {step === "print-studio" && (
                <StepPrintStudio key="print-studio" data={data} onChange={update} onNext={goNext} onBack={goBack} />
              )}
              {step === "reputation" && (
                <StepReputation key="reputation" data={data} onNext={goNext} onBack={goBack} />
              )}
              {step === "payment" && (
                <StepPayment key="payment" data={data} onNext={goNext} onBack={goBack} />
              )}
              {step === "success" && (isFreePlan(data.packageId) ? (
                <StepFreeSuccess key="success" data={data} onGoToDashboard={() => router.push("/dashboard")} />
              ) : (
                <StepSuccess key="success" data={data} onGoToDashboard={() => router.push("/dashboard")} />
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer */}
        <footer className="shrink-0 border-t border-[#E5E5E5] bg-white">
          <div className="max-w-7xl mx-auto px-6 lg:px-10 py-4 flex items-center justify-between">
            <span className="text-xs text-[#666666] font-medium">© 2026 VLYR Inc.</span>
            <div className="flex items-center gap-4">
              <a href="/privacy" className="text-xs text-[#666666] hover:text-[#0A0A0A] transition-colors">Privacy</a>
              <a href="/terms" className="text-xs text-[#666666] hover:text-[#0A0A0A] transition-colors">Terms</a>
            </div>
          </div>
        </footer>
      </div>

      {/* Right Side - Marketing Panel (Full Height, Independent Scroll) */}
      {showMarketingPanel && (
        <div className="hidden md:flex md:w-1/2 h-svh sticky top-0 overflow-hidden">
          {step === "google-connect" && !previewBusiness ? (
            <VlyrIntroPanel freePlan={isFreePlan(data.packageId)} />
          ) : step === "business" || step === "google-connect" || step === "owner" ? (
            <RatingSimulatorPanel
              // A different business starts the simulator fresh
              key={step === "google-connect" ? previewBusiness?.name ?? "none" : data.businessName || "none"}
              // On the Google step, follow the business being looked at
              businessName={(step === "google-connect" ? previewBusiness?.name : data.businessName) || ""}
              rating={step === "google-connect" ? previewBusiness?.rating ?? null : data.googleRating}
              totalReviews={step === "google-connect" ? previewBusiness?.totalReviews ?? null : data.googleReviewCount}
              logoUrl={step === "google-connect" ? previewBusiness?.logoUrl ?? null : data.logoUrl}
            />
          ) : (
          <OnboardingMarketingPanel
            isVerified={step !== "auth"}
            businessRating={data.googleRating || 4.7}
            totalReviews={data.googleReviewCount || 62}
            businessName={data.businessName || data.googleAccountName || "Your Business"}
            businessAddress={data.googleAddress || undefined}
            reviews={data.googleReviewsSnapshot}
            googleConnected={data.googleConnected ? true : data.googleConnected === false ? false : undefined}
          />
          )}
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
