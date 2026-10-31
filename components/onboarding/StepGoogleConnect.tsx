"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowRight, ArrowLeft, Building2, Star, CheckCircle2,
  Loader2, AlertTriangle, MapPin, Phone, Globe, Lock, Mail, RefreshCw,
  ExternalLink,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import type { OnboardingData, ReviewSnapshot } from "@/lib/onboarding-types"

interface ReviewData {
  author: string
  rating: number
  text: string
  time: number
  relativeTime: string
  authorPhoto?: string | null
}

interface GoogleBusinessData {
  placeId: string
  businessName: string
  address: string
  phone: string | null
  category: string
  lat: number | null
  lng: number | null
  website: string | null
  googleMapsUrl: string | null
  reviewUrl: string
  rating: number | null
  totalReviews: number
  logoUrl: string | null
  openingHours?: string[] | null
  reviews?: ReviewData[]
}

interface StepGoogleConnectProps {
  data: OnboardingData
  onChange: (updates: Partial<OnboardingData>) => void
  onNext: () => void
  onBack: () => void
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

export function StepGoogleConnect({ data, onChange, onNext, onBack }: StepGoogleConnectProps) {
  const [step, setStep] = useState<VerificationStep>("google-signin")
  const [isConnecting, setIsConnecting] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)
  const [googleEmail, setGoogleEmail] = useState<string | null>(null)
  const [businessUrl, setBusinessUrl] = useState("")
  const [manualBusinessName, setManualBusinessName] = useState("")
  const [businessData, setBusinessData] = useState<GoogleBusinessData | null>(null)
  const [error, setError] = useState<string | null>(null)
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
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError) {
          await supabase.auth.signOut()
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
          if (refreshError || !refreshData.user) { setIsCheckingExisting(false); return }
          const refreshedUser = refreshData.user
          const { data: merchant } = await supabase.from("merchants")
            .select("google_connected, google_account_name, google_location_id, google_email")
            .eq("id", refreshedUser.id).single()
          if (merchant?.google_connected && merchant?.google_location_id) {
            await fetchAndSetBusinessDetails(merchant.google_location_id, merchant.google_account_name)
            setGoogleEmail(merchant.google_email || null)
            setStep("verified")
          } else if (merchant?.google_email) {
            setGoogleEmail(merchant.google_email)
            setStep("select-business")
          }
          setIsCheckingExisting(false)
          return
        }
        if (user) {
          const { data: merchant } = await supabase.from("merchants")
            .select("google_connected, google_account_name, google_location_id, google_email")
            .eq("id", user.id).single()
          if (merchant?.google_connected && merchant?.google_location_id) {
            await fetchAndSetBusinessDetails(merchant.google_location_id, merchant.google_account_name)
            setGoogleEmail(merchant.google_email || null)
            setStep("verified")
            setIsCheckingExisting(false)
            return
          }
          if (merchant?.google_email) {
            setGoogleEmail(merchant.google_email)
            setStep("select-business")
            setIsCheckingExisting(false)
            return
          }
        }
      } catch { /* continue */ }
      setIsCheckingExisting(false)
    }
    initialize()
  }, [])

  const fetchAndSetBusinessDetails = async (placeId: string, businessName: string | null) => {
    try {
      const res = await fetch(`/api/google/verify?placeId=${encodeURIComponent(placeId)}`)
      if (res.ok) {
        const details = await res.json()
        if (details.success) {
          setBusinessData({ placeId: details.placeId || placeId, businessName: details.businessName || businessName || "Your Business", address: details.address || "", phone: details.phone || null, category: details.category || "", lat: details.lat || null, lng: details.lng || null, website: details.website || null, googleMapsUrl: details.googleMapsUrl || null, reviewUrl: details.reviewUrl || `https://search.google.com/local/writereview?placeid=${placeId}`, rating: details.rating || null, totalReviews: details.totalReviews || 0, logoUrl: details.logoUrl || null, openingHours: details.openingHours || null, reviews: details.reviews || [] })
          onChange({ businessName: details.businessName || businessName, businessCategory: details.category || data.businessCategory, googlePlaceId: details.placeId || placeId, lat: details.lat, lng: details.lng, logoUrl: details.logoUrl || data.logoUrl })
        }
      }
    } catch {
      setBusinessData({ placeId, businessName: businessName || "Your Business", address: "", phone: null, category: "", lat: null, lng: null, website: null, googleMapsUrl: null, reviewUrl: `https://search.google.com/local/writereview?placeid=${placeId}`, rating: null, totalReviews: 0, logoUrl: null, openingHours: null, reviews: [] })
    }
  }

  const handleManualVerification = async () => {
    if (!businessUrl.trim() || !manualBusinessName.trim()) { setError("Please enter both a Maps link and your business name"); return }
    setIsVerifying(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError("Session expired. Please refresh and try again."); setIsVerifying(false); return }
      const verifyRes = await fetch("/api/google/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: businessUrl.trim(), businessName: manualBusinessName.trim() }) })
      const verifyData = await verifyRes.json()
      if (!verifyData.success) throw new Error(verifyData.error || "Failed to resolve business URL")
      const runOwnershipCheck = async () => fetch("/api/google/verify-ownership", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ placeId: verifyData.placeId, businessName: verifyData.businessName || manualBusinessName.trim(), businessAddress: verifyData.address }) }).then(r => r.json())
      let ownershipData = await runOwnershipCheck()
      if (!ownershipData.success && ownershipData.code === "NO_MANAGED_BUSINESSES") {
        const refetchRes = await fetch("/api/google/businesses")
        const refetchData = await refetchRes.json()
        if (refetchData.success && refetchData.businesses?.length > 0) ownershipData = await runOwnershipCheck()
      }
      if (!ownershipData.success) {
        if (ownershipData.code === "NOT_AUTHORIZED") setError(`This business isn't managed by ${googleEmail}. Sign in with the account that manages "${manualBusinessName.trim()}".`)
        else if (ownershipData.code === "MISSING_SCOPE") setError("Google Business Profile access wasn't granted. Please sign in again and approve all permissions.")
        else if (ownershipData.code === "NO_MANAGED_BUSINESSES") setError("Google's API is temporarily unavailable. Wait 1–2 minutes and try again.")
        else setError(ownershipData.error || "Verification failed. Please try again.")
        setIsVerifying(false)
        return
      }
      const matchType = ownershipData.matchType ?? "VERIFIED"
      void matchType // ownership was recorded by the server in /api/google/verify-ownership
      const { error: updateError } = await supabase.from("merchants").update({ business_name: verifyData.businessName || manualBusinessName.trim(), business_category: verifyData.category || null, google_rating: verifyData.rating, google_review_count: verifyData.totalReviews, google_address: verifyData.address, google_phone: verifyData.phone, google_website: verifyData.website, lat: verifyData.lat, lng: verifyData.lng }).eq("id", user.id)
      if (updateError) throw new Error(updateError.message)
      setBusinessData({ placeId: verifyData.placeId || "", businessName: verifyData.businessName || manualBusinessName.trim(), address: verifyData.address || "", phone: verifyData.phone ?? null, category: verifyData.category || "", lat: verifyData.lat ?? null, lng: verifyData.lng ?? null, website: verifyData.website ?? null, googleMapsUrl: verifyData.googleMapsUrl || businessUrl, reviewUrl: verifyData.reviewUrl || (verifyData.placeId ? `https://search.google.com/local/writereview?placeid=${verifyData.placeId}` : ""), rating: verifyData.rating ?? null, totalReviews: verifyData.totalReviews ?? 0, logoUrl: verifyData.logoUrl ?? null, openingHours: verifyData.openingHours ?? null, reviews: verifyData.reviews ?? [] })
      onChange({
        googleRating: verifyData.rating ?? undefined,
        googleReviewCount: verifyData.totalReviews ?? undefined,
        googleConnected: true,
        googleReviewsSnapshot: (verifyData.reviews ?? [])
          .slice(0, 6)
          .map((r: ReviewSnapshot) => ({ author: r.author, rating: r.rating, text: r.text, relativeTime: r.relativeTime })),
      })
      // Fill address, phone, photo, etc. from Google (only empty fields)
      fetch("/api/google/sync-profile", { method: "POST" }).catch(() => {})
      setOwnershipVerified(true)
      setStep("verified")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify business")
    } finally {
      setIsVerifying(false)
    }
  }

  const handleSelectBusiness = async () => {
    if (selectedBusinessIndex === null || !managedBusinessesFull[selectedBusinessIndex]) { setError("Please select a business from the list"); return }
    setIsVerifying(true)
    setError(null)
    const selectedBusiness = managedBusinessesFull[selectedBusinessIndex]
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError("Session expired. Please refresh and try again."); setIsVerifying(false); return }
      type FullDetails = { success: boolean; placeId: string; businessName: string; address: string; phone: string | null; category: string; lat: number | null; lng: number | null; website: string | null; googleMapsUrl: string | null; reviewUrl: string; rating: number | null; totalReviews: number; logoUrl: string | null; openingHours: string[] | null; reviews: Array<{ author: string; rating: number; text: string; time: number; relativeTime: string; authorPhoto?: string | null }> }
      let full: FullDetails | null = null
      if (selectedBusiness.placeId && !selectedBusiness.placeId.startsWith("cid:")) {
        try {
          const fullRes = await fetch(`/api/google/verify?placeId=${encodeURIComponent(selectedBusiness.placeId)}`)
          if (fullRes.ok) { const d = await fullRes.json(); if (d.success) full = d }
        } catch { /* silent */ }
      }
      // The server confirms this business is in the list Google returned and
      // that no other VLYR account has it, then records the ownership
      const claimRes = await fetch("/api/google/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId: selectedBusiness.locationId, placeId: selectedBusiness.placeId }),
      })
      const claim = await claimRes.json()
      if (!claim.success) throw new Error(claim.error || "We couldn't verify that business.")
      const { error: updateError } = await supabase.from("merchants").update({ business_name: full?.businessName || selectedBusiness.businessName, business_category: full?.category || null, google_rating: full?.rating ?? null, google_review_count: full?.totalReviews ?? null, google_address: full?.address || selectedBusiness.address || null, google_phone: full?.phone ?? null, google_website: full?.website ?? null, lat: full?.lat ?? null, lng: full?.lng ?? null }).eq("id", user.id)
      if (updateError) throw new Error(updateError.message)
      setBusinessData({ placeId: full?.placeId || selectedBusiness.placeId || "", businessName: full?.businessName || selectedBusiness.businessName, address: full?.address || selectedBusiness.address || "", phone: full?.phone ?? null, category: full?.category || "", lat: full?.lat ?? null, lng: full?.lng ?? null, website: full?.website ?? null, googleMapsUrl: full?.googleMapsUrl ?? null, reviewUrl: full?.reviewUrl || (selectedBusiness.placeId ? `https://search.google.com/local/writereview?placeid=${selectedBusiness.placeId}` : ""), rating: full?.rating ?? null, totalReviews: full?.totalReviews ?? 0, logoUrl: full?.logoUrl ?? null, openingHours: full?.openingHours ?? null, reviews: full?.reviews ?? [] })
      onChange({
        googleRating: full?.rating ?? undefined,
        googleReviewCount: full?.totalReviews ?? undefined,
        googleConnected: true,
        googleReviewsSnapshot: (full?.reviews ?? [])
          .slice(0, 6)
          .map((r: ReviewSnapshot) => ({ author: r.author, rating: r.rating, text: r.text, relativeTime: r.relativeTime })),
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
        if (isRateLimit) setError("Google is rate-limiting right now. Paste your Google Maps link below to continue.")
        else if (isPermission) setError("Business Profile API access was denied. Sign in again and approve all permissions.")
        else if (apiErrors.length > 0) setError(`Couldn't load businesses: ${apiErrors[0]}`)
        else setError("No businesses found. Try a different Google account, or paste your Maps link below.")
      }
    } catch { setError("Couldn't reach Google. Check your connection and try again.") }
    finally { setIsRetrying(false) }
  }

  const handleDisconnect = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from("merchants").update({ google_connected: false, google_location_id: null, google_account_name: null, google_email: null }).eq("id", user.id)
    setStep("google-signin")
    setBusinessData(null)
    setGoogleEmail(null)
    setManagedBusinessesFull([])
    setSelectedBusinessIndex(null)
    setBusinessUrl("")
    onChange({ googlePlaceId: undefined })
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
        <div className="flex flex-col gap-6">
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
        </div>
      )}

      {/* ── STATE 2: Select / Link business ───────────────────────────────── */}
      {step === "select-business" && (
        <div className="flex flex-col gap-5">
          {/* Header */}
          <div>
            <h2 className="text-2xl font-bold text-[#0A0A0A] tracking-tight mb-1">
              {managedBusinessesFull.length > 0 ? "Which business is yours?" : "Find your business"}
            </h2>
            <p className="text-sm text-[#666666] leading-relaxed">
              {managedBusinessesFull.length > 0
                ? "Select the location you want to connect to VLYR."
                : "Open Google Maps, find your business, tap Share, and paste the link below."}
            </p>
          </div>

          {/* Signed-in pill */}
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-[#f0fdf4] border border-[#00a544]/20 rounded-full w-fit">
            <CheckCircle2 size={14} className="text-[#00a544] shrink-0" />
            <span className="text-sm font-semibold text-[#166534] truncate max-w-[220px]">{googleEmail}</span>
            <button
              onClick={() => { setStep("google-signin"); setGoogleEmail(null); setManagedBusinessesFull([]); setSelectedBusinessIndex(null) }}
              className="text-xs text-[#888888] hover:text-[#0A0A0A] transition-colors ml-1 underline underline-offset-2"
            >
              Change
            </button>
          </div>

          {/* ── Businesses found: pick one ── */}
          {managedBusinessesFull.length > 0 && (
            <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-0.5">
              {managedBusinessesFull.map((business, index) => {
                const isSelected = selectedBusinessIndex === index
                return (
                  <button
                    key={business.locationId || index}
                    onClick={() => setSelectedBusinessIndex(index)}
                    className={`w-full p-4 rounded-2xl border-2 text-left transition-all duration-150 ${
                      isSelected
                        ? "border-[#0A0A0A] bg-[#0A0A0A] text-white"
                        : "border-[#E5E5E5] bg-[#FAFAFA] hover:border-[#0A0A0A]/30 hover:bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isSelected ? "bg-white/10" : "bg-[#F0F0F0]"}`}>
                        <Building2 size={18} className={isSelected ? "text-white" : "text-[#888888]"} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${isSelected ? "text-white" : "text-[#0A0A0A]"}`}>
                          {business.businessName}
                        </p>
                        {business.address && (
                          <p className={`text-xs mt-0.5 flex items-center gap-1 truncate ${isSelected ? "text-white/60" : "text-[#888888]"}`}>
                            <MapPin size={10} className="shrink-0" />
                            {business.address}
                          </p>
                        )}
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-[#FFE100] flex items-center justify-center shrink-0">
                          <CheckCircle2 size={12} className="text-[#0A0A0A]" />
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* ── No businesses: URL paste flow ── */}
          {managedBusinessesFull.length === 0 && (
            <div className="flex flex-col gap-4">
              {/* How to get the link */}
              <div className="flex items-start gap-3 p-4 bg-[#FAFAFA] border border-[#E5E5E5] rounded-2xl">
                <div className="w-8 h-8 rounded-lg bg-[#0A0A0A] flex items-center justify-center shrink-0 mt-0.5">
                  <ExternalLink size={14} className="text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#0A0A0A] mb-1">How to get your link</p>
                  <ol className="text-xs text-[#666666] leading-relaxed space-y-0.5">
                    <li>1. Open Google Maps on your phone</li>
                    <li>2. Search for your business</li>
                    <li>3. Tap <strong>Share</strong> → <strong>Copy link</strong></li>
                    <li>4. Paste it below</li>
                  </ol>
                </div>
              </div>

              {/* Inputs */}
              <div className="flex flex-col gap-2.5">
                <input
                  type="url"
                  value={businessUrl}
                  onChange={(e) => { setBusinessUrl(e.target.value); setError(null) }}
                  placeholder="Paste your Google Maps link…"
                  className="w-full h-12 px-4 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5] text-sm text-[#0A0A0A] placeholder:text-[#AAAAAA] focus:outline-none focus:border-[#0A0A0A] transition-colors"
                />
                <input
                  type="text"
                  value={manualBusinessName}
                  onChange={(e) => setManualBusinessName(e.target.value)}
                  placeholder="Your business name"
                  className="w-full h-12 px-4 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5] text-sm text-[#0A0A0A] placeholder:text-[#AAAAAA] focus:outline-none focus:border-[#0A0A0A] transition-colors"
                />
              </div>

              {/* Retry as secondary link */}
              <button
                onClick={fetchBusinesses}
                disabled={isRetrying}
                className="flex items-center justify-center gap-1.5 text-sm text-[#888888] hover:text-[#0A0A0A] transition-colors disabled:opacity-40 self-center"
              >
                <RefreshCw size={12} className={isRetrying ? "animate-spin" : ""} />
                {isRetrying ? "Checking your account…" : "Try auto-detecting businesses instead"}
              </button>
            </div>
          )}

          {/* Error — inline, not a banner */}
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

          {/* Primary CTA */}
          {managedBusinessesFull.length > 0 ? (
            <button
              onClick={handleSelectBusiness}
              disabled={selectedBusinessIndex === null || isVerifying}
              className="w-full h-13 rounded-full bg-[#0A0A0A] text-white font-bold text-sm hover:bg-[#1F1F1F] hover:rounded-2xl disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
            >
              {isVerifying ? <><Loader2 size={16} className="animate-spin" /> Connecting…</> : <>Connect Business <ArrowRight size={16} /></>}
            </button>
          ) : (
            <button
              onClick={handleManualVerification}
              disabled={isVerifying || !businessUrl.trim() || !manualBusinessName.trim()}
              className="w-full h-13 rounded-full bg-[#0A0A0A] text-white font-bold text-sm hover:bg-[#1F1F1F] hover:rounded-2xl disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
            >
              {isVerifying ? <><Loader2 size={16} className="animate-spin" /> Verifying…</> : <>Connect My Business <ArrowRight size={16} /></>}
            </button>
          )}

          {/* Switch account — bottom text link */}
          <p className="text-center text-sm text-[#888888]">
            Wrong account?{" "}
            <button
              onClick={() => { setStep("google-signin"); setGoogleEmail(null); setManagedBusinessesFull([]); setSelectedBusinessIndex(null); setError(null) }}
              className="text-[#0A0A0A] font-semibold underline underline-offset-2 hover:no-underline transition-all"
            >
              Sign in with a different Google account
            </button>
          </p>

          {/* Privacy note */}
          <p className="text-center text-xs text-[#CCCCCC] flex items-center justify-center gap-1">
            <Lock size={9} /> Your data is never shared or sold
          </p>
        </div>
      )}

      {/* ── STATE 3: Verified ─────────────────────────────────────────────── */}
      {step === "verified" && businessData && ownershipVerified && (
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-2xl font-bold text-[#0A0A0A] tracking-tight mb-1">Business connected</h2>
            <p className="text-sm text-[#666666]">Your Google Business Profile is linked to VLYR.</p>
          </div>

          {/* Business card */}
          <div className="p-5 bg-[#FAFAFA] border border-[#E5E5E5] rounded-2xl space-y-4">
            <div className="flex items-start gap-4">
              {businessData.logoUrl ? (
                <img src={businessData.logoUrl} alt={businessData.businessName} className="w-14 h-14 rounded-xl object-cover border border-[#E5E5E5] shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-[#F0F0F0] border border-[#E5E5E5] flex items-center justify-center shrink-0">
                  <Building2 size={22} className="text-[#888888]" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <h3 className="text-base font-bold text-[#0A0A0A] truncate">{businessData.businessName}</h3>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#f0fdf4] text-[#166534] border border-[#00a544]/20 uppercase tracking-wider shrink-0">
                    Connected
                  </span>
                </div>
                {businessData.category && <p className="text-sm text-[#888888]">{businessData.category}</p>}
                {businessData.rating && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={12} className={i < Math.round(businessData.rating!) ? "fill-[#FFE100] text-[#FFE100]" : "text-[#E5E5E5] fill-[#E5E5E5]"} />
                    ))}
                    <span className="text-xs font-bold text-[#0A0A0A]">{businessData.rating}</span>
                    <span className="text-sm text-[#888888]">({businessData.totalReviews.toLocaleString()} reviews)</span>
                  </div>
                )}
              </div>
            </div>

            <div className="h-px bg-[#E5E5E5]" />

            <div className="space-y-2">
              {businessData.address && (
                <div className="flex items-start gap-2.5 text-xs">
                  <MapPin size={13} className="text-[#888888] shrink-0 mt-0.5" />
                  <span className="text-[#666666]">{businessData.address}</span>
                </div>
              )}
              {businessData.phone && (
                <div className="flex items-center gap-2.5 text-xs">
                  <Phone size={13} className="text-[#888888] shrink-0" />
                  <span className="text-[#666666]">{businessData.phone}</span>
                </div>
              )}
              {businessData.website && (
                <div className="flex items-center gap-2.5 text-xs">
                  <Globe size={13} className="text-[#888888] shrink-0" />
                  <a href={businessData.website} target="_blank" rel="noopener noreferrer"
                    className="text-[#0A0A0A] underline underline-offset-2 hover:no-underline truncate">
                    {businessData.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Signed in as */}
          <div className="flex items-center gap-2 px-3.5 py-2 bg-[#f0fdf4] border border-[#00a544]/20 rounded-full w-fit">
            <Mail size={12} className="text-[#00a544]" />
            <span className="text-xs text-[#166534] font-medium">{googleEmail}</span>
          </div>

          <button onClick={handleDisconnect} className="text-xs text-[#888888] hover:text-[#0A0A0A] transition-colors self-start underline underline-offset-2">
            Disconnect and use a different business
          </button>
        </div>
      )}

      {/* ── Navigation ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={onBack}
          className="flex items-center justify-center gap-1.5 h-12 px-6 rounded-full border border-[#E5E5E5] bg-white text-[#0A0A0A] text-sm font-semibold hover:border-[#0A0A0A] hover:rounded-2xl transition-all duration-200 flex-1"
        >
          <ArrowLeft size={15} /> Back
        </button>

        {step === "verified" && ownershipVerified && (
          <button
            onClick={onNext}
            className="flex items-center justify-center gap-1.5 h-12 px-6 rounded-full bg-[#FFE100] text-[#0A0A0A] text-sm font-bold hover:bg-[#FFE100]/90 hover:rounded-2xl transition-all duration-200 flex-[2]"
          >
            Continue <ArrowRight size={15} />
          </button>
        )}
      </div>

    </motion.div>
  )
}
