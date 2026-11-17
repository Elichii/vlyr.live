"use client"

import { useState, useEffect } from "react"
import { BusinessProfileCard } from "@/components/onboarding/BusinessProfileCard"
import { ConnectedBusiness } from "@/components/onboarding/ConnectedBusiness"
import type { BusinessPreview } from "@/lib/google/business-profile"
import { normalizeCategory } from "@/lib/google/categories"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowRight, ArrowLeft, Building2, Star, CheckCircle2,
  Loader2, AlertTriangle, MapPin, Phone, Globe, Lock, Mail, RefreshCw,
  ExternalLink, KeyRound, ShieldCheck, UserPlus, LogIn, Store,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import type { OnboardingData } from "@/lib/onboarding-types"

interface StepGoogleConnectProps {
  data: OnboardingData
  onChange: (updates: Partial<OnboardingData>) => void
  onNext: () => void
  /** Missing when there's no earlier step to return to */
  onBack?: () => void
  /** Tells the side panel which business is highlighted */
  onPreview?: (b: { name: string; rating: number | null; totalReviews: number | null; logoUrl: string | null } | null) => void
}

type VerificationStep = "google-signin" | "select-business" | "verified"

// Google "G" SVG
function GoogleIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

export function StepGoogleConnect({ data, onChange, onNext, onBack, onPreview }: StepGoogleConnectProps) {
  const [step, setStep] = useState<VerificationStep>("google-signin")
  const [isConnecting, setIsConnecting] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)
  const [googleEmail, setGoogleEmail] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Google sign-in worked, but the Business Profile permission box wasn't ticked
  const [needsPermission, setNeedsPermission] = useState(false)
  const [isCheckingExisting, setIsCheckingExisting] = useState(true)
  const [ownershipVerified, setOwnershipVerified] = useState(false)
  const [managedBusinessesFull, setManagedBusinessesFull] = useState<Array<{
    locationId: string
    placeId: string | null
    businessName: string
    address: string | null
    postalCode?: string | null
    accountType: string
    accountName: string
  }>>([])
  const [selectedBusinessIndex, setSelectedBusinessIndex] = useState<number | null>(null)
  // Live Google details for each business, keyed by location id
  const [previews, setPreviews] = useState<Record<string, BusinessPreview | null>>({})
  // The business that is connected (shown on the "connected" screen)
  const [connected, setConnected] = useState<BusinessPreview | null>(null)

  const loadPreview = async (locationId: string): Promise<BusinessPreview | null> => {
    try {
      const res = await fetch(`/api/google/business-preview?locationId=${encodeURIComponent(locationId)}`)
      if (!res.ok) return null
      return ((await res.json()).business as BusinessPreview) ?? null
    } catch { return null }
  }

  // Fetch the details for every business on the list (in parallel)
  useEffect(() => {
    const missing = managedBusinessesFull.filter((b) => b.locationId && !(b.locationId in previews))
    if (!missing.length) return
    setPreviews((p) => ({ ...p, ...Object.fromEntries(missing.map((b) => [b.locationId, null])) }))
    missing.forEach(async (b) => {
      const preview = await loadPreview(b.locationId)
      setPreviews((p) => ({ ...p, [b.locationId]: preview ?? {
        locationId: b.locationId, placeId: b.placeId, name: b.businessName, category: null, address: b.address,
        phone: null, website: null, mapsUrl: null, rating: null, totalReviews: 0, lat: null, lng: null,
        openNow: null, hours: [], reviews: [], logoUrl: null, coverUrl: null,
      } }))
    })
    // Only one business: select it for them
    if (managedBusinessesFull.length === 1) setSelectedBusinessIndex(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [managedBusinessesFull])

  // The side panel shows the business only once it's connected (until then: what VLYR does)
  useEffect(() => {
    onPreview?.(connected ? { name: connected.name, rating: connected.rating, totalReviews: connected.totalReviews, logoUrl: connected.logoUrl } : null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected])

  /** Hand everything to the next steps so "Your business" opens filled in. */
  const shareBusiness = (b: {
    name: string; category: string | null; logoUrl: string | null; placeId: string | null; address: string | null
    phone: string | null; website: string | null; lat: number | null; lng: number | null; rating: number | null
    totalReviews: number | null; reviews?: BusinessPreview["reviews"]
  }) => {
    onChange({
      // Only the chosen business's own values: never keep a previous business's
      businessName: b.name,
      businessCategory: normalizeCategory(b.category),
      logoUrl: b.logoUrl,
      googlePlaceId: b.placeId ?? "",
      googleAddress: b.address ?? "",
      googlePhone: b.phone ?? "",
      googleWebsite: b.website ?? "",
      lat: b.lat,
      lng: b.lng,
      googleRating: b.rating,
      googleReviewCount: b.totalReviews,
      googleConnected: true,
      ...(b.reviews ? { googleReviewsSnapshot: b.reviews.map((r) => ({ author: r.author, rating: r.rating, text: r.text, relativeTime: r.relativeTime })) } : {}),
    })
  }

  // ── All logic below is unchanged ──────────────────────────────────────────

  useEffect(() => {
    async function initialize() {
      const params = new URLSearchParams(window.location.search)
      const googleSignedIn = params.get("google_signed_in")
      const googleError = params.get("google_error")
      const email = params.get("google_email")
      params.get("google_name")

      if (googleError) {
        setError(googleError.replace(/_/g, " "))
        setIsConnecting(false)
        window.history.replaceState({}, "", window.location.pathname)
        setIsCheckingExisting(false)
        return
      }
      if (googleSignedIn === "true" && email) {
        setGoogleEmail(email)
        setStep("select-business")
        window.history.replaceState({}, "", window.location.pathname)
        setIsCheckingExisting(false)
        return
      }

      const supabase = createClient()
      try {
        let { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          const { data: refreshed } = await supabase.auth.refreshSession()
          user = refreshed.user
        }
        if (user) {
          const { data: merchant } = await supabase.from("merchants")
            .select("google_email, google_managed_businesses, google_ownership_verified, google_verified_location_id, google_verified_place_id, business_name, business_category, logo_url, address, google_address, google_phone, google_website, lat, lng, google_rating, google_review_count")
            .eq("id", user.id).single()
          if (merchant?.google_ownership_verified) {
            // Already connected: show it, and fill the next step from what we saved
            setGoogleEmail(merchant.google_email || null)
            setOwnershipVerified(true)
            setStep("verified")
            setIsCheckingExisting(false)
            shareBusiness({
              name: merchant.business_name || "", category: merchant.business_category, logoUrl: merchant.logo_url,
              placeId: merchant.google_verified_place_id, address: merchant.google_address || merchant.address,
              phone: merchant.google_phone, website: merchant.google_website, lat: merchant.lat, lng: merchant.lng,
              rating: merchant.google_rating, totalReviews: merchant.google_review_count,
            })
            const preview = merchant.google_verified_location_id ? await loadPreview(merchant.google_verified_location_id) : null
            setConnected(preview ? { ...preview, logoUrl: merchant.logo_url || preview.logoUrl } : {
              locationId: merchant.google_verified_location_id || "", placeId: merchant.google_verified_place_id, name: merchant.business_name || "Your business",
              category: merchant.business_category, address: merchant.google_address || merchant.address, phone: merchant.google_phone,
              website: merchant.google_website, mapsUrl: null, rating: merchant.google_rating, totalReviews: merchant.google_review_count ?? 0,
              lat: merchant.lat, lng: merchant.lng, openNow: null, hours: [], reviews: [], logoUrl: merchant.logo_url, coverUrl: null,
            })
            return
          }
          if (merchant?.google_email) {
            // Signed in with Google but no business picked yet
            setGoogleEmail(merchant.google_email)
            setStep("select-business")
            const saved = typeof merchant.google_managed_businesses === "string" ? JSON.parse(merchant.google_managed_businesses) : merchant.google_managed_businesses
            if (Array.isArray(saved) && saved.length) setManagedBusinessesFull(saved)
            else fetchBusinesses()
          }
        }
      } catch { /* continue */ }
      setIsCheckingExisting(false)
    }
    initialize()
  }, [])



  const handleSelectBusiness = async () => {
    if (selectedBusinessIndex === null || !managedBusinessesFull[selectedBusinessIndex]) { setError("Please select a business from the list"); return }
    setIsVerifying(true)
    setError(null)
    const selectedBusiness = managedBusinessesFull[selectedBusinessIndex]
    try {
      // The server confirms this business is in the list Google returned and
      // that no other VLYR account has it, records the ownership, imports the
      // Google logo and fills in the profile
      const claimRes = await fetch("/api/google/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId: selectedBusiness.locationId, placeId: selectedBusiness.placeId }),
      })
      const claim = await claimRes.json()
      if (!claim.success) throw new Error(claim.error || "We couldn't verify that business.")
      const preview = previews[selectedBusiness.locationId] ?? (await loadPreview(selectedBusiness.locationId))
      const saved = claim.business ?? {}
      const merged: BusinessPreview = {
        ...(preview ?? {
          locationId: selectedBusiness.locationId, placeId: selectedBusiness.placeId, name: selectedBusiness.businessName,
          category: null, address: selectedBusiness.address, phone: null, website: null, mapsUrl: null, rating: null,
          totalReviews: 0, lat: null, lng: null, openNow: null, hours: [], reviews: [], logoUrl: null, coverUrl: null,
        }),
        logoUrl: saved.logoUrl || preview?.logoUrl || null,
      }
      setConnected(merged)
      shareBusiness({
        name: saved.businessName || merged.name,
        category: saved.businessCategory || merged.category,
        logoUrl: saved.logoUrl || null,
        placeId: merged.placeId,
        address: saved.address || merged.address,
        phone: saved.phone || merged.phone,
        website: saved.website || merged.website,
        lat: saved.lat ?? merged.lat,
        lng: saved.lng ?? merged.lng,
        rating: saved.rating ?? merged.rating,
        totalReviews: saved.totalReviews ?? merged.totalReviews,
        reviews: merged.reviews,
      })
      setOwnershipVerified(true)
      setStep("verified")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect business")
    } finally {
      setIsVerifying(false)
    }
  }

  const handleGoogleSignIn = () => {
    setIsConnecting(true)
    setError(null)
    sessionStorage.setItem("vlyr-oauth-pending", "true")
    sessionStorage.setItem("vlyr-oauth-return-step", step)
    window.location.href = "/api/google/auth?redirect=true"
  }

  useEffect(() => {
    const checkOAuthCompletion = async () => {
      // Also runs right after "Sign up with Google", which returns with ?oauth_complete=true
      const pending = sessionStorage.getItem("vlyr-oauth-pending") ||
        new URLSearchParams(window.location.search).get("oauth_complete")
      if (!pending) return
      sessionStorage.removeItem("vlyr-oauth-pending")
      sessionStorage.removeItem("vlyr-oauth-return-step")
      setIsConnecting(true)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setIsConnecting(false); return }
      const { data: merchant } = await supabase.from("merchants").select("google_email, google_account_name, google_managed_businesses, google_connected, google_debug_info").eq("id", user.id).single()
      if (merchant?.google_connected && merchant?.google_email) {
        setGoogleEmail(merchant.google_email)
        if (merchant.google_managed_businesses) {
          try {
            const businesses = typeof merchant.google_managed_businesses === "string" ? JSON.parse(merchant.google_managed_businesses) : merchant.google_managed_businesses
            setManagedBusinessesFull(businesses)
          } catch { setManagedBusinessesFull([]) }
        }
        setStep("select-business")
      }
      setIsConnecting(false)
    }
    checkOAuthCompletion()
  }, [])

  const fetchBusinesses = async () => {
    setIsRetrying(true)
    setError(null)
    setNeedsPermission(false)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: merchant } = await supabase.from("merchants").select("google_managed_businesses").eq("id", user.id).single()
        if (merchant?.google_managed_businesses) {
          const saved = typeof merchant.google_managed_businesses === "string" ? JSON.parse(merchant.google_managed_businesses) : merchant.google_managed_businesses
          if (Array.isArray(saved) && saved.length > 0) { setManagedBusinessesFull(saved); setIsRetrying(false); return }
        }
      }
      const res = await fetch("/api/google/businesses")
      const result = await res.json()
      if (result.success && result.businesses.length > 0) {
        setManagedBusinessesFull(result.businesses)
      } else {
        const apiErrors: string[] = result.errors ?? []
        const isRateLimit = apiErrors.some((e: string) => e.includes("429") || e.toLowerCase().includes("rate"))
        const isPermission = apiErrors.some((e: string) => e.includes("403") || e.toLowerCase().includes("permission") || e.toLowerCase().includes("denied"))
        if (isPermission) setNeedsPermission(true)
        else if (isRateLimit) setError("Google is busy right now. Wait a minute and tap “Check my Google account again”.")
        else if (apiErrors.length > 0) setError("We couldn't reach your Google Business Profile just now. Please try again in a moment.")
      }
    } catch { setError("Couldn't reach Google. Check your connection and try again.") }
    finally { setIsRetrying(false) }
  }

  /** Pick a different business from the same Google account. */
  const handleDisconnect = () => {
    setConnected(null)
    setOwnershipVerified(false)
    setSelectedBusinessIndex(null)
    setStep("select-business")
    if (!managedBusinessesFull.length) fetchBusinesses()
  }

  // ── Loading state ──────────────────────────────────────────────────────────
  if (isCheckingExisting) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16">
        <Loader2 size={28} className="animate-spin text-[#0A0A0A]" />
        <p className="text-sm text-[#888888]">Checking your connection…</p>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.35 }}
      className="flex flex-col gap-6 w-full"
    >

      {/* ── STATE 1: Google Sign-In ────────────────────────────────────────── */}
      {step === "google-signin" && (
        <div className="flex flex-col gap-6 max-w-lg mx-auto w-full">
          {/* Header */}
          <div>
            <h2 className="text-2xl font-bold text-[#0A0A0A] tracking-tight mb-1">
              Connect Your Google Business
            </h2>
            <p className="text-sm text-[#666666] leading-relaxed">
              We'll import your rating, reviews and photos automatically.
            </p>
          </div>

          {/* What you get */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Rating imported", sub: "Live from Google" },
              { label: "Reviews synced", sub: "Auto-updated" },
              { label: "Location pinned", sub: "From Maps" },
            ].map((item) => (
              <div key={item.label} className="flex flex-col gap-1 p-3.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded-2xl">
                <CheckCircle2 size={14} className="text-[#B8860B]" />
                <p className="text-xs font-semibold text-[#0A0A0A] mt-1">{item.label}</p>
                <p className="text-sm text-[#888888]">{item.sub}</p>
              </div>
            ))}
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="text-sm text-red-600 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5"
              >
                <AlertTriangle size={14} className="shrink-0" /> {error}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Primary: Google sign-in */}
          <button
            onClick={handleGoogleSignIn}
            disabled={isConnecting}
            className="flex items-center justify-center gap-3 w-full h-14 rounded-2xl bg-[#FFE100] text-[#0A0A0A] font-bold text-[15px] hover:bg-[#FFE100]/90 hover:shadow-[0_0_28px_rgba(255,225,0,0.3)] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isConnecting ? (
              <><Loader2 size={18} className="animate-spin text-[#0A0A0A]/60" /> Connecting to Google…</>
            ) : (
              <><GoogleIcon size={20} /> Continue with Google</>
            )}
          </button>

          <p className="text-center text-xs text-[#AAAAAA]">
            You'll choose which business to connect on the next screen
          </p>

          {/* Escape hatch — quiet, for managers / multi-account edge cases */}
          <div className="flex items-center gap-3 my-1">
            <div className="flex-1 h-px bg-[#F0F0F0]" />
            <span className="text-[11px] text-[#CCCCCC] font-medium">or</span>
            <div className="flex-1 h-px bg-[#F0F0F0]" />
          </div>
          <p className="text-center text-xs text-[#AAAAAA]">
            Don't have access to your Google account right now?{" "}
            <button
              onClick={onNext}
              className="text-[#595959] font-semibold underline underline-offset-2 hover:text-[#0A0A0A] transition-colors"
            >
              Set up manually instead
            </button>
          </p>
          <p className="text-center text-[10px] text-[#CCCCCC] leading-relaxed -mt-1">
            Your shield activates once Google is connected from the dashboard.
          </p>
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center justify-center gap-1.5 h-12 px-6 rounded-full border border-[#E5E5E5] bg-white text-[#0A0A0A] text-sm font-semibold hover:border-[#0A0A0A] transition-all"
            >
              <ArrowLeft size={15} /> Back
            </button>
          )}
        </div>
      )}

      {/* ── STATE 2a: Pick one of the owner's Google businesses ───────────── */}
      {step === "select-business" && managedBusinessesFull.length > 0 && (
        <div className="flex flex-col gap-7">
          <div className="flex flex-col gap-2">
            <div>
              <div className="flex items-center gap-2.5 px-3 py-1.5 bg-[#f0fdf4] border border-[#00a544]/20 rounded-full w-fit mb-4">
                <GoogleIcon size={14} />
                <span className="text-xs font-semibold text-[#166534] truncate max-w-[260px]">{googleEmail}</span>
                <button
                  onClick={() => { setStep("google-signin"); setGoogleEmail(null); setManagedBusinessesFull([]); setSelectedBusinessIndex(null); setError(null); setNeedsPermission(false) }}
                  className="text-[11px] text-[#666666] hover:text-[#0A0A0A] underline underline-offset-2"
                >
                  Switch account
                </button>
              </div>
              <h2 className="text-3xl font-bold text-[#0A0A0A] tracking-tight">Your Google Business Profiles</h2>
              <p className="text-[15px] text-[#666666] mt-1.5 max-w-2xl leading-relaxed">
                {managedBusinessesFull.length === 1
                  ? "Here's the business you manage on Google. Confirm it and VLYR will start protecting its reputation."
                  : `You manage ${managedBusinessesFull.length} businesses on Google. Choose the one VLYR should protect first.`}
              </p>
            </div>
            <p className="text-xs text-[#888888] flex items-center gap-1.5">
              <Lock size={11} /> Live details from Google · only you can see them
            </p>
          </div>

          <div className={`grid gap-5 ${managedBusinessesFull.length === 1 ? "grid-cols-1" : "grid-cols-1 2xl:grid-cols-2"}`}>
            {managedBusinessesFull.map((business, index) => (
              <BusinessProfileCard
                key={business.locationId || index}
                business={previews[business.locationId] ?? null}
                fallbackName={business.businessName}
                fallbackAddress={business.address}
                selected={selectedBusinessIndex === index}
                onSelect={() => { setSelectedBusinessIndex(index); setError(null) }}
              />
            ))}
          </div>

          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="text-sm text-red-600 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5"
              >
                <AlertTriangle size={14} className="shrink-0 mt-0.5" /> {error}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Action bar */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-3xl bg-[#FAFAFA] border border-[#EDEDED] p-3 pl-5">
            <p className="text-sm text-[#555555] flex-1">
              {selectedBusinessIndex !== null
                ? <>Connecting <span className="font-semibold text-[#0A0A0A]">{previews[managedBusinessesFull[selectedBusinessIndex].locationId]?.name || managedBusinessesFull[selectedBusinessIndex].businessName}</span>. We&apos;ll import its logo, details and reviews.</>
                : "Select a business above to continue."}
            </p>
            <div className="flex items-center gap-2">
              {onBack && (
                <button
                  onClick={onBack}
                  className="flex items-center justify-center gap-1.5 h-12 px-5 rounded-full border border-[#E5E5E5] bg-white text-[#0A0A0A] text-sm font-semibold hover:border-[#0A0A0A] transition-all"
                >
                  <ArrowLeft size={15} /> Back
                </button>
              )}
              <button
                onClick={handleSelectBusiness}
                disabled={selectedBusinessIndex === null || isVerifying}
                className="h-12 px-7 rounded-full bg-[#0A0A0A] text-white font-bold text-sm hover:bg-[#1F1F1F] disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {isVerifying ? <><Loader2 size={16} className="animate-spin" /> Connecting…</> : <>Connect business <ArrowRight size={16} /></>}
              </button>
            </div>
          </div>

          {managedBusinessesFull.length > 1 && (
            <p className="text-xs text-[#999999] -mt-3">
              Run several businesses? Connect one now. You&apos;ll be able to add the others to the same VLYR account soon.
            </p>
          )}
        </div>
      )}

      {/* ── STATE 2a: Business Profile permission wasn't granted ─────────── */}
      {step === "select-business" && managedBusinessesFull.length === 0 && needsPermission && !isRetrying && (
        <div className="flex flex-col gap-5 max-w-lg mx-auto w-full">
          <div className="w-12 h-12 rounded-2xl bg-[#FFFBDA] border border-[#F3E27A] flex items-center justify-center">
            <KeyRound size={20} className="text-[#8A7400]" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[#0A0A0A] tracking-tight mb-1">One more permission needed</h2>
            <p className="text-sm text-[#666666] leading-relaxed">
              You&apos;re signed in, but Google didn&apos;t share your Business Profile with VLYR. That happens when the
              business listings box is left unticked on Google&apos;s sign-in screen.
            </p>
          </div>

          {googleEmail && (
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded-full w-fit">
              <Mail size={14} className="text-[#666666] shrink-0" />
              <span className="text-sm font-semibold text-[#0A0A0A] truncate max-w-[260px]">{googleEmail}</span>
            </div>
          )}

          <div className="rounded-2xl border border-[#E5E5E5] bg-[#FAFAFA] p-4 flex flex-col gap-3">
            <p className="text-sm font-semibold text-[#0A0A0A]">How to fix it</p>
            <ol className="text-sm text-[#595959] leading-relaxed space-y-1.5">
              <li>1. Tap <strong className="text-[#0A0A0A]">Allow access</strong> below.</li>
              <li>2. Choose <strong className="text-[#0A0A0A]">{googleEmail || "your Google account"}</strong>.</li>
              <li>3. Tick the box for your <strong className="text-[#0A0A0A]">Google business listings</strong>, then tap Continue.</li>
            </ol>
          </div>

          <div className="flex items-start gap-2.5 text-xs text-[#666666] leading-relaxed">
            <ShieldCheck size={15} className="text-[#137333] shrink-0 mt-0.5" />
            VLYR uses this to confirm you manage the business and to watch for new Google reviews. You can remove access anytime in your Google account.
          </div>

          <button
            onClick={handleGoogleSignIn}
            disabled={isConnecting}
            className="w-full h-13 rounded-full bg-[#0A0A0A] text-white font-bold text-sm hover:bg-[#1F1F1F] disabled:opacity-40 transition-all flex items-center justify-center gap-2"
          >
            {isConnecting ? <Loader2 size={16} className="animate-spin" /> : <>Allow access <ArrowRight size={16} /></>}
          </button>

          <p className="text-center text-sm text-[#888888]">
            Your business is on another account?{" "}
            <button
              onClick={() => { setStep("google-signin"); setGoogleEmail(null); setManagedBusinessesFull([]); setSelectedBusinessIndex(null); setError(null); setNeedsPermission(false) }}
              className="text-[#0A0A0A] font-semibold underline underline-offset-2 hover:no-underline"
            >
              Use a different Google account
            </button>
          </p>

          {onBack && (
            <button onClick={onBack} className="flex items-center justify-center gap-1.5 h-12 px-6 rounded-full border border-[#E5E5E5] bg-white text-[#0A0A0A] text-sm font-semibold hover:border-[#0A0A0A] transition-all">
              <ArrowLeft size={15} /> Back
            </button>
          )}
        </div>
      )}

      {/* ── STATE 2b: This Google account manages no business ───────────── */}
      {step === "select-business" && managedBusinessesFull.length === 0 && !(needsPermission && !isRetrying) && (
        <div className="flex flex-col gap-6 max-w-lg mx-auto w-full">
          {isRetrying ? (
            <div className="flex flex-col items-center text-center gap-3 py-16">
              <Loader2 size={26} className="animate-spin text-[#0A0A0A]" />
              <p className="text-sm text-[#666666]">Looking for businesses on {googleEmail ?? "your Google account"}…</p>
            </div>
          ) : (
            <>
              <div>
                <div className="w-12 h-12 rounded-2xl bg-[#F3F3F3] flex items-center justify-center mb-4">
                  <Building2 size={21} className="text-[#0A0A0A]" />
                </div>
                <h2 className="text-2xl font-bold text-[#0A0A0A] tracking-tight mb-1.5">No business on this account</h2>
                <p className="text-sm text-[#666666] leading-relaxed">
                  <span className="font-semibold text-[#0A0A0A]">{googleEmail ?? "This Google account"}</span> doesn&apos;t own or manage a
                  Google Business Profile. VLYR connects to the profile your account manages, so customers&apos; reviews go to the right place.
                </p>
              </div>

              <div className="flex flex-col gap-2.5">
                <button
                  onClick={() => { setStep("google-signin"); setGoogleEmail(null); setManagedBusinessesFull([]); setSelectedBusinessIndex(null); setError(null); setNeedsPermission(false) }}
                  className="group flex items-center gap-3.5 rounded-2xl border border-[#E5E5E5] p-4 text-left hover:border-[#0A0A0A] transition-colors"
                >
                  <span className="w-10 h-10 rounded-xl bg-[#0A0A0A] text-white flex items-center justify-center shrink-0"><LogIn size={17} /></span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-[#0A0A0A]">Use a different Google account</span>
                    <span className="block text-xs text-[#888888] mt-0.5">It&apos;s my business, but it&apos;s on another account</span>
                  </span>
                  <ArrowRight size={15} className="text-[#AAAAAA] group-hover:text-[#0A0A0A] transition-colors" />
                </button>
                <a
                  href="https://support.google.com/business/answer/3403100"
                  target="_blank" rel="noopener noreferrer"
                  className="group flex items-center gap-3.5 rounded-2xl border border-[#E5E5E5] p-4 hover:border-[#0A0A0A] transition-colors"
                >
                  <span className="w-10 h-10 rounded-xl bg-[#F3F3F3] text-[#0A0A0A] flex items-center justify-center shrink-0"><UserPlus size={17} /></span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-[#0A0A0A]">Get added as a manager</span>
                    <span className="block text-xs text-[#888888] mt-0.5">I work there: ask the owner to add {googleEmail ?? "this account"} on Google</span>
                  </span>
                  <ExternalLink size={14} className="text-[#AAAAAA] group-hover:text-[#0A0A0A] transition-colors" />
                </a>
                <a
                  href="https://business.google.com/create"
                  target="_blank" rel="noopener noreferrer"
                  className="group flex items-center gap-3.5 rounded-2xl border border-[#E5E5E5] p-4 hover:border-[#0A0A0A] transition-colors"
                >
                  <span className="w-10 h-10 rounded-xl bg-[#F3F3F3] text-[#0A0A0A] flex items-center justify-center shrink-0"><Store size={17} /></span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-[#0A0A0A]">Create a free Business Profile</span>
                    <span className="block text-xs text-[#888888] mt-0.5">I don&apos;t have one yet: set it up on Google, then come back</span>
                  </span>
                  <ExternalLink size={14} className="text-[#AAAAAA] group-hover:text-[#0A0A0A] transition-colors" />
                </a>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="text-sm text-[#7A5C00] flex items-start gap-2 bg-[#FFFBEA] border border-[#F3E27A] rounded-xl px-3.5 py-2.5"
                  >
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" /> {error}
                  </motion.p>
                )}
              </AnimatePresence>

              <div className="flex flex-col items-center gap-1 text-center">
                <button
                  onClick={fetchBusinesses}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0A0A0A] hover:underline underline-offset-2"
                >
                  <RefreshCw size={13} /> Check again
                </button>
                <p className="text-xs text-[#999999]">Just added as a manager or created your profile? Tap to refresh.</p>
              </div>
            </>
          )}

          {onBack && !isRetrying && (
            <button onClick={onBack} className="flex items-center justify-center gap-1.5 h-12 px-6 rounded-full border border-[#E5E5E5] bg-white text-[#0A0A0A] text-sm font-semibold hover:border-[#0A0A0A] transition-all">
              <ArrowLeft size={15} /> Back
            </button>
          )}
        </div>
      )}

      {/* ── STATE 3: Connected ────────────────────────────────────────────── */}
      {step === "verified" && ownershipVerified && (connected ? (
        <ConnectedBusiness
          business={connected}
          googleEmail={googleEmail}
          onBack={handleDisconnect}
          onNext={onNext}
        />
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 py-24">
          <Loader2 size={28} className="animate-spin text-[#0A0A0A]" />
          <p className="text-sm text-[#888888]">Loading your business from Google…</p>
        </div>
      ))}

    </motion.div>
  )
}
