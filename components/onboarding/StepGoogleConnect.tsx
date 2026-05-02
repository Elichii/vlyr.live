"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  ArrowRight, ArrowLeft, ShieldCheck, Building2, Star, CheckCircle2, 
  ExternalLink, Loader2, AlertTriangle, MapPin, Phone, Globe, Lock, Mail, ChevronDown
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"
import type { OnboardingData } from "@/lib/onboarding-types"
import { ReputationAnalysis } from "./ReputationAnalysis"
import { VerificationSuccess } from "./VerificationSuccess"

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

type VerificationStep = "google-signin" | "select-business" | "reputation-analysis" | "verified"

// v87 - Fixed authentication flow
export function StepGoogleConnect({ data, onChange, onNext, onBack }: StepGoogleConnectProps) {
  const [step, setStep] = useState<VerificationStep>("google-signin")
  const [isConnecting, setIsConnecting] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [googleEmail, setGoogleEmail] = useState<string | null>(null)
  const [googleName, setGoogleName] = useState<string | null>(null)
  const [businessUrl, setBusinessUrl] = useState("")
  const [manualBusinessName, setManualBusinessName] = useState("")
  const [needsBusinessName, setNeedsBusinessName] = useState(false)
  const [businessData, setBusinessData] = useState<GoogleBusinessData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isCheckingExisting, setIsCheckingExisting] = useState(true)
  const [showReputationAnalysis, setShowReputationAnalysis] = useState(false)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [managedBusinesses, setManagedBusinesses] = useState<string[]>([])
  const [ownershipError, setOwnershipError] = useState<string | null>(null)
  const [ownershipVerified, setOwnershipVerified] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showDebugInfo, setShowDebugInfo] = useState(false)
  const [debugInfo, setDebugInfo] = useState<{
    googleEmail?: string;
    businessesFound?: number;
    searchedFor?: { name?: string; address?: string; placeId?: string };
    yourManagedBusinesses?: Array<{ name?: string; address?: string; placeId?: string }>;
    apiStatus?: number;
    apiError?: string;
    scopeGranted?: boolean;
    hint?: string;
    rawResponse?: string;
  } | null>(null)
  const [showManualOverride, setShowManualOverride] = useState(false)
  const [manualProfileId, setManualProfileId] = useState("")
  
  // NEW: Full managed business objects for secure selection
  const [managedBusinessesFull, setManagedBusinessesFull] = useState<Array<{
    locationId: string;
    placeId: string | null;
    businessName: string;
    address: string | null;
    postalCode?: string | null;
    accountType: string;
    accountName: string;
  }>>([])
  const [selectedBusinessIndex, setSelectedBusinessIndex] = useState<number | null>(null)

  // Check URL params for OAuth callback and existing verification
  useEffect(() => {
    async function initialize() {
      const params = new URLSearchParams(window.location.search)
      
      // Check for Google sign-in callback
      const googleSignedIn = params.get("google_signed_in")
      const googleError = params.get("google_error")
      const email = params.get("google_email")
      const name = params.get("google_name")

      if (googleError) {
        setError(googleError.replace(/_/g, " "))
        setIsConnecting(false)
        window.history.replaceState({}, "", window.location.pathname)
        setIsCheckingExisting(false)
        return
      }

      if (googleSignedIn === "true" && email) {
        setGoogleEmail(email)
        setGoogleName(name || null)
        setStep("select-business")
        window.history.replaceState({}, "", window.location.pathname)
        setIsCheckingExisting(false)
        return
      }

      // Check for existing verification in database
      const supabase = createClient()
      
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        
        // If there's an auth error (like invalid refresh token), clear the stale session
        if (authError) {

          
          // Sign out to clear stale cookies
          await supabase.auth.signOut()
          
          // Try to refresh the session
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
          
          if (refreshError || !refreshData.user) {
            // Session is truly invalid - just proceed to Google sign-in (don't show error)
            setIsCheckingExisting(false)
            return
          }
          
          // Refresh succeeded, continue with the refreshed user
          const refreshedUser = refreshData.user
          const { data: merchant } = await supabase
            .from("merchants")
            .select("google_connected, google_account_name, google_location_id, google_email")
            .eq("id", refreshedUser.id)
            .single()

          if (merchant?.google_connected && merchant?.google_location_id) {
            await fetchAndSetBusinessDetails(merchant.google_location_id, merchant.google_account_name)
            setGoogleEmail(merchant.google_email || null)
            setStep("verified")
            setIsCheckingExisting(false)
            return
          }

          if (merchant?.google_email) {
            setGoogleEmail(merchant.google_email)
            setGoogleName(merchant.google_account_name || null)
            setStep("select-business")
            setIsCheckingExisting(false)
            return
          }
          
          setIsCheckingExisting(false)
          return
        }
        
        if (user) {
          const { data: merchant } = await supabase
            .from("merchants")
            .select("google_connected, google_account_name, google_location_id, google_email")
            .eq("id", user.id)
            .single()

          if (merchant?.google_connected && merchant?.google_location_id) {
            // Already verified - fetch business details
            await fetchAndSetBusinessDetails(merchant.google_location_id, merchant.google_account_name)
            setGoogleEmail(merchant.google_email || null)
            setStep("verified")
            setIsCheckingExisting(false)
            return
          }

          if (merchant?.google_email) {
            // Signed in but not verified yet
            setGoogleEmail(merchant.google_email)
            setGoogleName(merchant.google_account_name || null)
            setStep("select-business")
            setIsCheckingExisting(false)
            return
          }
        }
      } catch {
        // Don't set error - just continue to show Google sign-in
      }

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
          setBusinessData({
            placeId: details.placeId || placeId,
            businessName: details.businessName || businessName || "Your Business",
            address: details.address || "",
            phone: details.phone || null,
            category: details.category || "",
            lat: details.lat || null,
            lng: details.lng || null,
            website: details.website || null,
            googleMapsUrl: details.googleMapsUrl || null,
            reviewUrl: details.reviewUrl || `https://search.google.com/local/writereview?placeid=${placeId}`,
            rating: details.rating || null,
            totalReviews: details.totalReviews || 0,
            logoUrl: details.logoUrl || null,
            openingHours: details.openingHours || null,
            reviews: details.reviews || [],
          })
          
          onChange({
            businessName: details.businessName || businessName,
            businessCategory: details.category || data.businessCategory,
            googlePlaceId: details.placeId || placeId,
            lat: details.lat,
            lng: details.lng,
            logoUrl: details.logoUrl || data.logoUrl,
          })
        }
      }
    } catch {
      // Fallback to basic info
      setBusinessData({
        placeId: placeId,
        businessName: businessName || "Your Business",
        address: "",
        phone: null,
        category: "",
        lat: null,
        lng: null,
        website: null,
        googleMapsUrl: null,
        reviewUrl: `https://search.google.com/local/writereview?placeid=${placeId}`,
        rating: null,
        totalReviews: 0,
        logoUrl: null,
        openingHours: null,
        reviews: [],
      })
    }
  }

  // Manual verification for businesses not found in API
  const handleManualVerification = async () => {
    if (!businessUrl.trim() || !manualBusinessName.trim()) {
      setError("Please enter both URL and business name")
      return
    }
    
    setIsVerifying(true)
    setError(null)
    
    try {
      // First resolve the URL to get Place ID
      const resolveRes = await fetch("/api/google/resolve-place-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: businessUrl.trim() })
      })
      
      if (!resolveRes.ok) {
        const errData = await resolveRes.json()
        throw new Error(errData.error || "Failed to resolve business URL")
      }
      
      const { placeId, businessName: resolvedName, address } = await resolveRes.json()
      
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setError("Session expired. Please refresh and try again.")
        setIsVerifying(false)
        return
      }
      
      // Fetch baseline data
      let baseline = { rating: null, reviewCount: null, address: null, phone: null, website: null }
      if (placeId) {
        try {
          const placesRes = await fetch(`/api/google/places-details?placeId=${placeId}`)
          if (placesRes.ok) {
            baseline = await placesRes.json()
          }
        } catch {
          // Silent fail
        }
      }
      
      // Update merchant - mark as MANUAL_OAUTH_TRUST since user is signed in with Google
      const { error: updateError } = await supabase.from("merchants").update({
        google_connected: true,
        google_ownership_verified: true,
        google_ownership_verified_at: new Date().toISOString(),
        google_verified_place_id: placeId,
        google_match_type: "MANUAL_OAUTH_TRUST",
        business_name: manualBusinessName.trim(),
        google_rating: baseline.rating,
        google_review_count: baseline.reviewCount,
        google_address: address || baseline.address,
        google_phone: baseline.phone,
        google_website: baseline.website,
      }).eq("id", user.id)
      
      if (updateError) {
        throw new Error(updateError.message)
      }
      
      // Set business data for display
      setBusinessData({
        placeId: placeId || "",
        businessName: manualBusinessName.trim(),
        address: address || baseline.address || "",
        phone: baseline.phone,
        category: "",
        lat: null,
        lng: null,
        website: baseline.website,
        googleMapsUrl: businessUrl,
        reviewUrl: placeId ? `https://search.google.com/local/writereview?placeid=${placeId}` : "",
        rating: baseline.rating,
        totalReviews: baseline.reviewCount || 0,
        logoUrl: null,
        openingHours: null,
        reviews: [],
      })
      
      setOwnershipVerified(true)
      setShowReputationAnalysis(true)
      setStep("reputation-analysis")
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify business")
    } finally {
      setIsVerifying(false)
    }
  }

  // SECURE: Connect a business directly from the managed businesses list
  const handleSelectBusiness = async () => {
    if (selectedBusinessIndex === null || !managedBusinessesFull[selectedBusinessIndex]) {
      setError("Please select a business from the list")
      return
    }
    
    setIsVerifying(true)
    setError(null)
    
    const selectedBusiness = managedBusinessesFull[selectedBusinessIndex]
    
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setError("Session expired. Please refresh and try again.")
        setIsVerifying(false)
        return
      }
      
      // Fetch baseline data from Google Places API if we have a Place ID
      let baseline = { rating: null, reviewCount: null, address: null, phone: null, website: null }
      if (selectedBusiness.placeId) {
        try {
          const placesRes = await fetch(`/api/google/places-details?placeId=${selectedBusiness.placeId}`)
          if (placesRes.ok) {
            baseline = await placesRes.json()
          }
        } catch {
          // Silent fail for baseline fetch
        }
      }
      
      // Update merchant with verified business - NO fuzzy matching, ONLY API-provided data
      const { error: updateError } = await supabase.from("merchants").update({
        google_connected: true,
        google_ownership_verified: true,
        google_ownership_verified_at: new Date().toISOString(),
        google_verified_place_id: selectedBusiness.placeId,
        google_verified_location_id: selectedBusiness.locationId,
        google_location_id: selectedBusiness.locationId,
        google_match_type: "STRICT_API_SELECTION",
        business_name: selectedBusiness.businessName,
        // Baseline data
        google_rating: baseline.rating,
        google_review_count: baseline.reviewCount,
        google_address: selectedBusiness.address || baseline.address,
        google_phone: baseline.phone,
        google_website: baseline.website,
      }).eq("id", user.id)
      
      if (updateError) {
        throw new Error(updateError.message)
      }
      
      // Set business data for display
      setBusinessData({
        placeId: selectedBusiness.placeId || "",
        businessName: selectedBusiness.businessName,
        address: selectedBusiness.address || "",
        phone: baseline.phone,
        category: "",
        lat: null,
        lng: null,
        website: baseline.website,
        googleMapsUrl: null,
        reviewUrl: selectedBusiness.placeId 
          ? `https://search.google.com/local/writereview?placeid=${selectedBusiness.placeId}` 
          : "",
        rating: baseline.rating,
        totalReviews: baseline.reviewCount || 0,
        logoUrl: null,
        openingHours: null,
        reviews: [],
      })
      
      setOwnershipVerified(true)
      setShowReputationAnalysis(true)
      setStep("reputation-analysis")
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect business")
    } finally {
      setIsVerifying(false)
    }
  }

  const handleGoogleSignIn = () => {
    setIsConnecting(true)
    setError(null)
    
    // Use redirect-based OAuth flow to avoid COOP issues
    // Store current state in sessionStorage so we can restore after redirect
    sessionStorage.setItem("vlyr-oauth-pending", "true")
    sessionStorage.setItem("vlyr-oauth-return-step", step)
    
    // Redirect to Google OAuth (not popup)
    window.location.href = "/api/google/auth?redirect=true"
  }
  
  // Check for OAuth completion on mount (after redirect back)
  useEffect(() => {
    const checkOAuthCompletion = async () => {
      const pending = sessionStorage.getItem("vlyr-oauth-pending")
      if (!pending) return
      
      // Clear the pending flag
      sessionStorage.removeItem("vlyr-oauth-pending")
      sessionStorage.removeItem("vlyr-oauth-return-step")
      
      setIsConnecting(true)
      
      // Fetch merchant data to check if OAuth completed
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setIsConnecting(false)
        return
      }
      
      const { data: merchant } = await supabase
        .from("merchants")
        .select("google_email, google_account_name, google_managed_businesses, google_connected, google_debug_info")
        .eq("id", user.id)
        .single()
      
      // DEBUG: Log everything from the database
      console.log("[v0] ========== GOOGLE OAUTH DEBUG ==========")
      console.log("[v0] Merchant data from DB:", merchant)
      console.log("[v0] google_email:", merchant?.google_email)
      console.log("[v0] google_connected:", merchant?.google_connected)
      console.log("[v0] google_managed_businesses:", merchant?.google_managed_businesses)
      console.log("[v0] google_debug_info:", merchant?.google_debug_info)
      console.log("[v0] ==========================================")
      
      if (merchant?.google_connected && merchant?.google_email) {
        setGoogleEmail(merchant.google_email)
        setGoogleName(merchant.google_account_name)
        
        // Parse managed businesses
        if (merchant.google_managed_businesses) {
          try {
            const businesses = typeof merchant.google_managed_businesses === "string"
              ? JSON.parse(merchant.google_managed_businesses)
              : merchant.google_managed_businesses
            
            console.log("[v0] Parsed businesses:", businesses)
            
            setManagedBusinessesFull(businesses)
            setManagedBusinesses(businesses.map((b: { businessName?: string }) => b.businessName || "Unknown"))
          } catch (e) {
            console.log("[v0] Error parsing businesses:", e)
            setManagedBusinessesFull([])
            setManagedBusinesses([])
          }
        } else {
          console.log("[v0] No managed businesses in database")
        }
        
        setStep("select-business")
      }
      
      setIsConnecting(false)
    }
    
    checkOAuthCompletion()
  }, [])
  
  // Legacy popup handling - keep for fallback but won't be used
  const handleGoogleSignInPopup = () => {
    setIsConnecting(true)
    setError(null)
    
    // Open Google OAuth in a popup
    const width = 500
    const height = 600
    const left = window.screenX + (window.outerWidth - width) / 2
    const top = window.screenY + (window.outerHeight - height) / 2
    
    const popup = window.open(
      "/api/google/auth",
      "google-oauth",
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
    )
    
    // Listen for OAuth completion message from popup
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "google-oauth-success") {
        setGoogleEmail(event.data.email)
        setGoogleName(event.data.name || null)
        
        // Parse managed businesses if available - store FULL objects for secure selection
        if (event.data.managedBusinesses) {
          try {
            const businesses = typeof event.data.managedBusinesses === "string" 
              ? JSON.parse(event.data.managedBusinesses) 
              : event.data.managedBusinesses
            
            // Store full business objects for secure dropdown selection
            setManagedBusinessesFull(businesses)
            
            // Also store names for display
            setManagedBusinesses(businesses.map((b: { businessName?: string; accountName?: string }) => 
              b.businessName || b.accountName || "Unknown"
            ))
          } catch {
            setManagedBusinesses([])
            setManagedBusinessesFull([])
          }
        }
        
        // Parse and store debug info for potential display
        if (event.data.debugInfo) {
          try {
            const debug = typeof event.data.debugInfo === "string"
              ? JSON.parse(event.data.debugInfo)
              : event.data.debugInfo
            setDebugInfo({
              googleEmail: event.data.email,
              businessesFound: parseInt(event.data.businessCount || "0"),
              ...debug
            })
          } catch {
            // Silent fail for debug info parsing
          }
        }
        
        // Store Google account info in merchant record (parent window has session)
        const storeGoogleData = async () => {
          const supabase = createClient()
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            // Parse managed businesses for storage
            let parsedBusinesses = null
            try {
              parsedBusinesses = typeof event.data.managedBusinesses === "string"
                ? JSON.parse(event.data.managedBusinesses)
                : event.data.managedBusinesses
            } catch {
              parsedBusinesses = null
            }
            
            const updateData: Record<string, unknown> = {
              google_email: event.data.email,
              google_account_name: event.data.name || null,
              google_managed_businesses: parsedBusinesses,
              google_access_token: event.data.accessToken || null,
            }
            
            // Only store refresh_token if received (first consent only)
            if (event.data.refreshToken) {
              updateData.google_refresh_token = event.data.refreshToken
              updateData.google_token_expires_at = new Date(Date.now() + 3600 * 1000).toISOString() // 1 hour
            }
            
            await supabase.from("merchants").update(updateData).eq("id", user.id)
          }
        }
        storeGoogleData()
        
        setStep("select-business")
        setIsConnecting(false)
        window.removeEventListener("message", handleMessage)
        popup?.close()
      } else if (event.data?.type === "google-oauth-error") {
        setError(event.data.error?.replace(/_/g, " ") || "Google sign-in failed")
        
        // Parse debug info even on error
        if (event.data.debugInfo) {
          try {
            const debug = typeof event.data.debugInfo === "string"
              ? JSON.parse(event.data.debugInfo)
              : event.data.debugInfo
            setDebugInfo(debug)
          } catch {
            // Silent fail
          }
        }
        
        setIsConnecting(false)
        window.removeEventListener("message", handleMessage)
        popup?.close()
      }
    }
    
    window.addEventListener("message", handleMessage)
    
    // Check if popup was blocked
    if (!popup) {
      setError("Popup blocked. Please allow popups and try again.")
      setIsConnecting(false)
      window.removeEventListener("message", handleMessage)
      return
    }
    
    // Clear any old OAuth result from localStorage
    localStorage.removeItem("google-oauth-result")
    
    // Poll localStorage for result (COOP workaround)
    const checkLocalStorage = setInterval(() => {
      const result = localStorage.getItem("google-oauth-result")
      if (result) {
        clearInterval(checkLocalStorage)
        clearInterval(checkClosed)
        localStorage.removeItem("google-oauth-result")
        
        try {
          const data = JSON.parse(result)
          // Create a synthetic message event
          handleMessage({ data } as MessageEvent)
        } catch {
          // Failed to parse
        }
      }
    }, 300)
    
    // Also check if popup closes without completing
    const checkClosed = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkClosed)
        clearInterval(checkLocalStorage)
        
        // One final check of localStorage before giving up
        const result = localStorage.getItem("google-oauth-result")
        if (result) {
          localStorage.removeItem("google-oauth-result")
          try {
            const data = JSON.parse(result)
            handleMessage({ data } as MessageEvent)
            return
          } catch {
            // Failed to parse
          }
        }
        
        setIsConnecting(false)
        window.removeEventListener("message", handleMessage)
      }
    }, 500)
  }

  const handleVerifyBusiness = async () => {
    if (!businessUrl.trim()) {
      setError("Please enter your Google Business Profile URL")
      return
    }

    if (!isAuthorized) {
      setError("Please confirm you are authorized to manage this business")
      return
    }

    setIsVerifying(true)
    setError(null)

    try {
      const res = await fetch("/api/google/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          url: businessUrl,
          googleEmail: googleEmail,
          businessName: manualBusinessName || undefined
        })
      })

      const result = await res.json()

      if (!result.success) {
        setError(result.error || "Could not verify business")
        setIsVerifying(false)
        return
      }

      // Step 2: Verify business ownership via Google Business Profile API
      // First check if user is still authenticated
      const supabaseCheck = createClient()
      const { data: { user: currentUser } } = await supabaseCheck.auth.getUser()
      
      if (!currentUser) {
        setError("Session expired. Please refresh the page and sign in again.")
        setIsVerifying(false)
        return
      }
      
      const ownershipRes = await fetch("/api/google/verify-ownership", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // Ensure cookies are sent
        body: JSON.stringify({ 
          placeId: result.placeId,
          businessName: result.businessName,
          // Include manual Location ID if user entered one
          manualLocationId: manualProfileId.trim() || undefined
        })
      })

      const ownershipResult = await ownershipRes.json()

      if (!ownershipResult.success) {
        // Capture debug info for UI display
        if (ownershipResult.debugInfo) {
          setDebugInfo(ownershipResult.debugInfo)
        }
        
        // Handle different error codes
        if (ownershipResult.code === "NOT_AUTHENTICATED") {
          setOwnershipError(ownershipResult.error)
          setError("Session expired. Please refresh the page and try again.")
          setIsVerifying(false)
          return
        } else if (ownershipResult.code === "MISSING_SCOPE") {
          setOwnershipError(ownershipResult.error)
          setError("Permission Missing: You need to grant access to manage your business profile during Google sign-in.")
          setIsVerifying(false)
          return
        } else if (ownershipResult.code === "API_ERROR") {
          setOwnershipError(ownershipResult.error)
          setError(`Google API Error: ${ownershipResult.debugInfo?.apiError || 'Unable to access business data'}`)
          setIsVerifying(false)
          return
        } else if (ownershipResult.code === "NOT_AUTHORIZED") {
          setOwnershipError(ownershipResult.error)
          setError(`Access Denied: The business "${result.businessName}" was not found in your Google Business Profile.`)
          if (ownershipResult.debugInfo?.yourManagedBusinesses) {
            setManagedBusinesses(ownershipResult.debugInfo.yourManagedBusinesses.map((b: { name?: string }) => b.name || 'Unknown'))
          }
          setIsVerifying(false)
          return
        } else if (ownershipResult.code === "NO_MANAGED_BUSINESSES") {
          setOwnershipError(ownershipResult.error)
          setError("No business profiles found for your Google account.")
          // Allow manual verification as fallback
          if (ownershipResult.allowManualVerification) {
            setShowManualOverride(true)
          }
          setIsVerifying(false)
          return
        } else {
          setError(ownershipResult.error || "Could not verify business ownership")
          setIsVerifying(false)
          return
        }
      }

      // STRICT: Only store verification after ownership is confirmed
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from("merchants").update({
          google_connected: true,
          google_location_id: result.placeId,
          google_account_name: result.businessName,
          // Ownership verification fields
          google_ownership_verified: true,
          google_ownership_verified_at: new Date().toISOString(),
          google_verified_place_id: ownershipResult.matchedPlaceId || result.placeId,
          google_verified_location_id: ownershipResult.matchedLocationId || null,
          google_match_type: ownershipResult.matchType || "EXACT",
        }).eq("id", user.id)

        // Add Google review link
        const reviewUrl = result.reviewUrl || `https://search.google.com/local/writereview?placeid=${result.placeId}`
        const { data: existingLink } = await supabase
          .from("review_links")
          .select("id")
          .eq("merchant_id", user.id)
          .eq("platform", "google")
          .maybeSingle()

        if (existingLink) {
          await supabase.from("review_links").update({
            url: reviewUrl,
            is_primary: true,
          }).eq("id", existingLink.id)
        } else {
          await supabase.from("review_links").update({ is_primary: false }).eq("merchant_id", user.id)
          await supabase.from("review_links").insert({
            merchant_id: user.id,
            platform: "google",
            url: reviewUrl,
            is_primary: true,
            sort_order: 0,
          })
        }
      }

      // Set business data with reviews
      setBusinessData({
        placeId: result.placeId,
        businessName: result.businessName,
        address: result.address || "",
        phone: result.phone || null,
        category: result.category || "",
        lat: result.lat || null,
        lng: result.lng || null,
        website: result.website || null,
        googleMapsUrl: result.googleMapsUrl || null,
        reviewUrl: result.reviewUrl || `https://search.google.com/local/writereview?placeid=${result.placeId}`,
        rating: result.rating || null,
        totalReviews: result.totalReviews || 0,
        logoUrl: result.logoUrl || null,
        openingHours: result.openingHours || null,
        reviews: result.reviews || [],
      })

      onChange({
        businessName: result.businessName,
        businessCategory: result.category || data.businessCategory,
        googlePlaceId: result.placeId,
        googleAccountName: result.businessName,
        googleRating: result.rating || null,
        googleReviewCount: result.totalReviews || null,
        googleAddress: result.address || "",
        googlePhone: result.phone || "",
        googleWebsite: result.website || "",
        lat: result.lat,
        lng: result.lng,
        logoUrl: result.logoUrl || data.logoUrl,
      })

      // STRICT: Mark ownership as verified ONLY after successful API check
      setOwnershipVerified(true)
      
      // Show success modal first, then reputation analysis
      setShowSuccessModal(true)
      
      setStep("verified")
    } catch {
      setError("Failed to verify business. Please try again.")
    } finally {
      setIsVerifying(false)
    }
  }

  const handleDisconnect = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from("merchants").update({
      google_connected: false,
      google_location_id: null,
      google_account_name: null,
      google_email: null,
    }).eq("id", user.id)

    setStep("google-signin")
    setBusinessData(null)
    setGoogleEmail(null)
    setGoogleName(null)
    setBusinessUrl("")
    onChange({ googlePlaceId: undefined })
  }

  if (isCheckingExisting) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center gap-4 py-12"
      >
        <Loader2 size={32} className="animate-spin text-[#FFE100]" />
        <p className="text-sm text-muted-foreground">Checking verification status...</p>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.35 }}
      className="flex flex-col gap-6 w-full"
    >
      {/* Header */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <ShieldCheck size={20} className="text-[#FFE100]" />
          <h2 className="text-xl font-semibold text-foreground tracking-tight">
            Verify Business Ownership
          </h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {step === "google-signin" && "Sign in with Google to verify your identity."}
          {step === "select-business" && "Select the business you manage from your Google account."}
          {step === "reputation-analysis" && "Analyzing your business reputation..."}
          {step === "verified" && "Your business ownership has been verified."}
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2">
        {["google-signin", "select-business", "verified"].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              step === s || (step === "reputation-analysis" && s === "select-business")
                ? "bg-[#FFE100] text-black" 
                : (["google-signin", "select-business", "reputation-analysis", "verified"].indexOf(step) > i)
                  ? "bg-green-500 text-white"
                  : "bg-secondary text-muted-foreground"
            }`}>
              {(["google-signin", "select-business", "reputation-analysis", "verified"].indexOf(step) > i) ? (
                <CheckCircle2 size={16} />
              ) : (
                i + 1
              )}
            </div>
            {i < 2 && (
              <div className={`w-8 h-0.5 ${
                (["google-signin", "select-business", "reputation-analysis", "verified"].indexOf(step) > i) 
                  ? "bg-green-500" 
                  : "bg-secondary"
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Google Sign In */}
      {step === "google-signin" && (
        <div className="flex flex-col gap-5">
          <div className="p-4 rounded-xl bg-gradient-to-br from-[#FFE100]/5 to-transparent border border-[#FFE100]/20">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-[#FFE100]/10 flex items-center justify-center shrink-0">
                <Lock size={18} className="text-[#FFE100]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground mb-1">Two-Step Verification</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  First, sign in with your Google account. Then, link your Google Business Profile to prove ownership.
                </p>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4 rounded-xl bg-red-500/10 border border-red-500/20"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle size={18} className="text-red-400 shrink-0" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={handleGoogleSignIn}
            disabled={isConnecting}
            className="flex items-center justify-center gap-3 w-full h-14 rounded-xl bg-white hover:bg-gray-50 text-gray-900 font-semibold text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200 shadow-sm"
          >
            {isConnecting ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Sign in with Google
              </>
            )}
          </button>

          <p className="text-xs text-muted-foreground text-center">
            This verifies your identity. You'll link your business next.
          </p>
        </div>
      )}

      {/* Step 2: Select Managed Business - SECURE FLOW */}
      {step === "select-business" && (
        <div className="flex flex-col gap-5">
          {/* Signed In Confirmation */}
          <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
              <CheckCircle2 size={20} className="text-green-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Signed in as</p>
              <p className="text-xs text-muted-foreground truncate">{googleEmail}</p>
            </div>
            <button
              onClick={() => {
                setStep("google-signin")
                setGoogleEmail(null)
                setGoogleName(null)
                setManagedBusinessesFull([])
                setManagedBusinesses([])
                setSelectedBusinessIndex(null)
              }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Change
            </button>
          </div>

          {/* Business Selection - Only shows businesses from Google API */}
          {managedBusinessesFull.length > 0 ? (
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">
                Select Your Business
              </label>
              <p className="text-xs text-muted-foreground">
                These are the businesses you manage on Google. Select one to connect:
              </p>
              
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {managedBusinessesFull.map((business, index) => (
                  <button
                    key={business.locationId || index}
                    onClick={() => setSelectedBusinessIndex(index)}
                    className={`w-full p-4 rounded-xl border text-left transition-all ${
                      selectedBusinessIndex === index
                        ? "bg-[#FFE100]/10 border-[#FFE100] ring-1 ring-[#FFE100]"
                        : "bg-secondary border-border hover:border-[#FFE100]/50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        selectedBusinessIndex === index 
                          ? "bg-[#FFE100] text-black" 
                          : "bg-secondary-foreground/10 text-muted-foreground"
                      }`}>
                        <Building2 size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {business.businessName}
                        </p>
                        {business.address && (
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <MapPin size={12} />
                            {business.address}
                          </p>
                        )}
                        {selectedBusinessIndex === index && (
                          <div className="mt-2 flex items-center gap-1 text-[#FFE100]">
                            <CheckCircle2 size={14} />
                            <span className="text-xs font-medium">Selected</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* No Businesses Found - Strict API Only */
            <div className="p-6 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-3">
                <AlertTriangle size={24} className="text-amber-500" />
              </div>
              <p className="text-sm font-semibold text-foreground mb-2">
                No Business Profiles Found
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                We couldn&apos;t find any businesses managed by <strong>{googleEmail}</strong>. 
                Please sign in with the Google account that manages your business on Google Business Profile.
              </p>
              <button
                onClick={() => {
                  setStep("google-signin")
                  setGoogleEmail(null)
                  setGoogleName(null)
                  setManagedBusinessesFull([])
                  setManagedBusinesses([])
                  setError(null)
                }}
                className="flex items-center justify-center gap-2 w-full h-11 rounded-xl bg-white hover:bg-gray-100 text-black font-semibold text-sm transition-all border border-gray-200"
              >
                <Mail size={16} />
                Try Different Google Account
              </button>
            </div>
          )}

          {/* Error Display */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4 rounded-xl bg-red-500/10 border border-red-500/20"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-400 font-medium">{error}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Connect Button - Only show when businesses are available */}
          {managedBusinessesFull.length > 0 && (
            <Button
              onClick={handleSelectBusiness}
              disabled={selectedBusinessIndex === null || isVerifying}
              className="w-full h-14 rounded-xl bg-[#FFE100] hover:bg-[#FFE100]/90 text-black font-bold text-base disabled:opacity-50"
            >
              {isVerifying ? (
                <>
                  <Loader2 size={20} className="animate-spin mr-2" />
                  Connecting...
                </>
              ) : (
                <>
                  Connect Business
                  <ArrowRight size={20} className="ml-2" />
                </>
              )}
            </Button>
          )}

          {/* Security Notice */}
          <div className="p-3 rounded-xl bg-green-500/5 border border-green-500/20">
            <div className="flex items-start gap-2">
              <ShieldCheck size={16} className="text-green-500 shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                <strong className="text-green-500">Secure Verification:</strong> You can only connect businesses 
                that are officially managed by your Google account. This ensures legitimate ownership.
              </p>
            </div>
          </div>
        </div>
      )}



      {/* Step 3: Verified - ONLY shown if ownership is verified */}
      {step === "verified" && businessData && ownershipVerified && (
        <div className="flex flex-col gap-4">
          {/* Success Banner */}
          <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20">
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
              <CheckCircle2 size={24} className="text-green-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-foreground">Business Verified</p>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-green-500/15 text-green-400 border border-green-500/20">
                  VERIFIED OWNER
                </span>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Mail size={10} /> {googleEmail}
              </p>
            </div>
          </div>

          {/* Business Card Preview */}
          <div className="p-4 rounded-xl bg-card border border-border space-y-4">
            <div className="flex items-start gap-4">
              {businessData.logoUrl ? (
                <img 
                  src={businessData.logoUrl} 
                  alt={businessData.businessName}
                  className="w-16 h-16 rounded-xl object-cover border border-border"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-secondary flex items-center justify-center">
                  <Building2 size={24} className="text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-foreground truncate">
                  {businessData.businessName}
                </h3>
                {businessData.category && (
                  <p className="text-xs text-muted-foreground">{businessData.category}</p>
                )}
                {businessData.rating && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="flex items-center gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          size={12} 
                          className={i < Math.round(businessData.rating!) ? "fill-[#FFE100] text-[#FFE100]" : "text-muted-foreground/30"} 
                        />
                      ))}
                    </div>
                    <span className="text-xs text-foreground font-medium">{businessData.rating}</span>
                    <span className="text-xs text-muted-foreground">({businessData.totalReviews} reviews)</span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-2">
              {businessData.address && (
                <div className="flex items-start gap-2 text-xs">
                  <MapPin size={14} className="text-muted-foreground shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">{businessData.address}</span>
                </div>
              )}
              {businessData.phone && (
                <div className="flex items-center gap-2 text-xs">
                  <Phone size={14} className="text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">{businessData.phone}</span>
                </div>
              )}
              {businessData.website && (
                <div className="flex items-center gap-2 text-xs">
                  <Globe size={14} className="text-muted-foreground shrink-0" />
                  <a href={businessData.website} target="_blank" rel="noopener noreferrer" className="text-[#FFE100] hover:underline truncate">
                    {businessData.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Security Note */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-500/5 border border-blue-500/10">
            <Lock size={14} className="text-blue-400 shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Your business is protected. Only your verified Google account can manage it on VLYR.
            </p>
          </div>

          <button
            onClick={handleDisconnect}
            className="text-xs text-muted-foreground hover:text-destructive transition-colors self-start"
          >
            Disconnect and use a different business
          </button>
        </div>
      )}

      {/* Navigation */}
      {step !== "reputation-analysis" && (
        <div className="flex items-center gap-3 mt-2">
          <Button
            variant="outline"
            onClick={onBack}
            className="flex-1 h-12 rounded-xl border-border hover:bg-secondary/80 text-muted-foreground"
          >
            <ArrowLeft size={16} className="mr-2" />
            Back
          </Button>
          <Button
            onClick={() => {
              // STRICT: Only allow proceeding if ownership is verified
              if (step === "verified" && ownershipVerified && businessData?.rating && businessData?.totalReviews > 0) {
                setShowReputationAnalysis(true)
              } else {
                onNext()
              }
            }}
            disabled={step !== "verified" || !ownershipVerified}
            className="flex-1 h-12 rounded-xl bg-[#FFE100] hover:bg-[#FFE100]/90 text-black font-semibold"
          >
            {step === "verified" && ownershipVerified ? "View Analysis & Continue" : "Continue"}
            <ArrowRight size={16} className="ml-2" />
          </Button>
        </div>
      )}

      {/* STRICT: No skip option - ownership verification is required */}

      {/* Reputation Analysis Modal - ONLY shown if ownership is verified */}
      <AnimatePresence>
        {showReputationAnalysis && businessData && ownershipVerified && (
          <ReputationAnalysis
            businessData={{
              businessName: businessData.businessName,
              rating: businessData.rating || 0,
              totalReviews: businessData.totalReviews,
              reviews: businessData.reviews || [],
              address: businessData.address,
              phone: businessData.phone || undefined,
              category: businessData.category,
              logoUrl: businessData.logoUrl || undefined,
              openingHours: businessData.openingHours || undefined,
            }}
            onContinue={() => {
              setShowReputationAnalysis(false)
              onNext()
            }}
            onBack={() => {
              setShowReputationAnalysis(false)
            }}
          />
        )}
      </AnimatePresence>

      {/* Verification Success Modal */}
      <AnimatePresence>
        {showSuccessModal && businessData && ownershipVerified && (
          <VerificationSuccess
            businessData={{
              businessName: businessData.businessName,
              address: businessData.address,
              phone: businessData.phone,
              website: businessData.website,
              category: businessData.category,
              rating: businessData.rating,
              totalReviews: businessData.totalReviews,
              logoUrl: businessData.logoUrl,
              lat: businessData.lat,
              lng: businessData.lng,
              openingHours: businessData.openingHours,
            }}
            onContinue={() => {
              setShowSuccessModal(false)
              // Show reputation analysis if we have rating data
              if (businessData.rating && businessData.totalReviews > 0) {
                setShowReputationAnalysis(true)
              } else {
                // No rating data, proceed to next step
                onNext()
              }
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
