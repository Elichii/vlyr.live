"use client"

import { useRef, useCallback, useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import dynamic from "next/dynamic"
import { 
  Building2, MapPin, Upload, ArrowRight, ArrowLeft, Search, ShieldCheck, X, 
  AlertCircle, CheckCircle2, Phone, Mail, User, Globe, Star
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { VLYRInlineLoader } from "@/components/vlyr-loader"
import type { OnboardingData } from "@/lib/onboarding-types"
import { BUSINESS_CATEGORIES } from "@/lib/onboarding-types"

const ProfileMap = dynamic(() => import("@/components/profile-map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-44 rounded-xl bg-secondary border border-border/40 flex items-center justify-center">
      <VLYRInlineLoader />
    </div>
  ),
})

interface StepBusinessProps {
  data: OnboardingData
  onChange: (updates: Partial<OnboardingData>) => void
  onNext: () => void
  onBack: () => void
}

interface NominatimResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
  address: Record<string, string>
}

export function StepBusiness({ data, onChange, onNext, onBack }: StepBusinessProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoError, setLogoError] = useState<string | null>(null)
  
  // Google Business Profile data
  const [googleData, setGoogleData] = useState<{
    businessName?: string
    address?: string
    phone?: string
    category?: string
    website?: string
    rating?: number
    totalReviews?: number
    openingHours?: string[]
  } | null>(null)

  
  // Check if business was pre-populated from Google
  const isGoogleVerified = !!data.googlePlaceId && data.googlePlaceId.startsWith("ChIJ")

  // Contact info state
  const [contactName, setContactName] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [contactPhone, setContactPhone] = useState("")
  
  // State for editable Google fields - pre-populated from props
  const [businessAddress, setBusinessAddress] = useState(data.googleAddress || "")
  const [businessPhone, setBusinessPhone] = useState(data.googlePhone || "")
  const [businessWebsite, setBusinessWebsite] = useState(data.googleWebsite || "")

  // Set googleData from props (already fetched in StepGoogleConnect)
  useEffect(() => {
    if (isGoogleVerified && data.googleRating) {
      setGoogleData({
        businessName: data.businessName,
        address: data.googleAddress,
        phone: data.googlePhone,
        category: data.businessCategory,
        website: data.googleWebsite,
        rating: data.googleRating,
        totalReviews: data.googleReviewCount || 0,
      })
    }
  }, [isGoogleVerified, data.googleRating, data.businessName, data.googleAddress, data.googlePhone, data.businessCategory, data.googleWebsite, data.googleReviewCount])

  // Upload logo to Supabase Storage immediately
  const uploadLogo = useCallback(
    async (file: File) => {
      setLogoUploading(true)
      setLogoError(null)
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          const preview = URL.createObjectURL(file)
          onChange({ logoUrl: preview })
          return
        }
        const ext = file.name.split(".").pop() || "png"
        const path = `${user.id}/logo-${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage
          .from("logos")
          .upload(path, file, { upsert: true, contentType: file.type })
        if (upErr) throw upErr
        const { data: urlData } = supabase.storage.from("logos").getPublicUrl(path)
        onChange({ logoUrl: urlData.publicUrl })
      } catch (err) {
        setLogoError(err instanceof Error ? err.message : "Upload failed")
      } finally {
        setLogoUploading(false)
      }
    },
    [onChange],
  )

  const handleLogoUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      uploadLogo(file)
    },
    [uploadLogo],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer.files?.[0]
      if (!file || !file.type.startsWith("image/")) return
      uploadLogo(file)
    },
    [uploadLogo],
  )

  // Close search dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowResults(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  // Debounced search via Nominatim
  const handleSearchChange = useCallback((q: string) => {
    setSearchQuery(q)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (q.length < 3) { setSearchResults([]); setShowResults(false); return }
    searchTimer.current = setTimeout(async () => {
      setIsSearching(true)
      setShowResults(true)
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&addressdetails=1&limit=6`,
          { headers: { "User-Agent": "VLYRApp/1.0" } },
        )
        const results: NominatimResult[] = await res.json()
        setSearchResults(results)
      } catch {
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 500)
  }, [])

  const selectResult = useCallback((result: NominatimResult) => {
    const lat = parseFloat(result.lat)
    const lng = parseFloat(result.lon)
    const nameCandidate = result.display_name.split(",")[0]?.trim()
    onChange({
      googlePlaceId: String(result.place_id),
      lat,
      lng,
      businessName: data.businessName || nameCandidate || "",
    })
    setShowResults(false)
    setSearchQuery(result.display_name.split(",").slice(0, 2).join(","))
  }, [data.businessName, onChange])

  const handleMapClick = useCallback((newLat: number, newLng: number) => {
    onChange({ lat: newLat, lng: newLng, googlePlaceId: `${newLat.toFixed(6)},${newLng.toFixed(6)}` })
    fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${newLat}&lon=${newLng}&addressdetails=1`,
      { headers: { "User-Agent": "VLYRApp/1.0" } },
    )
      .then((res) => res.json())
      .then((d) => {
        if (d.place_id) onChange({ googlePlaceId: String(d.place_id) })
      })
      .catch(() => {})
  }, [onChange])

  const mapCenter: [number, number] = data.lat && data.lng ? [data.lat, data.lng] : [37.7749, -122.4194]
  const markerPosition: [number, number] | null = data.lat && data.lng ? [data.lat, data.lng] : null

  const canProceed =
    data.businessName.length >= 2 &&
    data.businessCategory.length > 0 &&
    !!data.lat &&
    !!data.lng

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.35 }}
      className="flex flex-col gap-6 w-full"
    >
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold text-foreground tracking-tight text-balance">
            {isGoogleVerified ? "Review & Complete Details" : "Business Identity"}
          </h2>
          {isGoogleVerified && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-green-500/15 text-green-400 border border-green-500/20">
              GOOGLE VERIFIED
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {isGoogleVerified 
            ? "We've imported your business details from Google. Review and add any missing information."
            : "Enter your business details and pin your location on the map."}
        </p>
      </div>

      {/* Google Verified Banner */}
      {isGoogleVerified && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-green-500/10 border border-green-500/20">
          <CheckCircle2 size={18} className="text-green-500 shrink-0" />
          <p className="text-xs text-green-400">
            Business details imported from Google Business Profile
          </p>
        </div>
      )}



      <div className="flex flex-col gap-4">
        {/* Logo Uploader */}
        <div className="flex flex-col gap-2">
          <label className="text-xs text-muted-foreground font-medium tracking-wide uppercase">
            Business Logo
          </label>
          <div className="flex items-center gap-4">
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
              className="relative flex items-center justify-center w-16 h-16 rounded-full bg-card border-2 border-dashed border-border overflow-hidden shrink-0 cursor-pointer hover:border-foreground/30 transition-colors group"
            >
              {logoUploading ? (
                <VLYRInlineLoader />
              ) : data.logoUrl ? (
                <img
                  src={data.logoUrl}
                  alt="Business logo"
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-0.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors">
                  <Upload size={16} />
                </div>
              )}
              <div className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center w-5 h-5 rounded-full bg-accent border-2 border-background">
                <ShieldCheck size={10} className="text-accent-foreground" />
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
            <div className="flex flex-col gap-1">
              <span className="text-xs text-foreground font-medium">
                {data.logoUrl ? "Logo uploaded" : "Upload logo"}
              </span>
              <span className="text-[10px] text-muted-foreground">
                Appears on all VLYR touchpoints
              </span>
              {data.logoUrl && (
                <button
                  type="button"
                  onClick={() => onChange({ logoUrl: null })}
                  className="text-[10px] text-destructive hover:underline text-left w-fit"
                >
                  Remove
                </button>
              )}
              {logoError && (
                <span className="text-[10px] text-red-400 flex items-center gap-1">
                  <AlertCircle size={10} /> {logoError}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Business Name */}
        <div className="relative">
          <Building2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Business name"
            value={data.businessName}
            onChange={(e) => onChange({ businessName: e.target.value })}
            className="pl-10 h-12 bg-card border-border text-foreground placeholder:text-muted-foreground/60 rounded-xl"
          />
        </div>

        {/* Category */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground font-medium tracking-wide uppercase">
              Business Type
            </label>
            {googleData?.category && (
              <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                Google: {googleData.category}
              </span>
            )}
          </div>
          <Select
            value={data.businessCategory}
            onValueChange={(val) => onChange({ businessCategory: val })}
          >
            <SelectTrigger className="w-full h-12 bg-card border-border text-foreground rounded-xl">
              <SelectValue placeholder="Select business category" />
            </SelectTrigger>
            <SelectContent className="bg-background border-border text-foreground">
              {BUSINESS_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat} className="text-foreground">
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Google Pre-populated Business Details (only show if Google verified) */}
        {isGoogleVerified && (
          <div className="flex flex-col gap-4 pt-2 pb-2 border-t border-border/50">
            <label className="text-xs text-muted-foreground font-medium tracking-wide uppercase">
              Business Details from Google
            </label>
            <p className="text-[11px] text-muted-foreground -mt-2">
              Review and update if needed. These were imported from your Google Business Profile.
            </p>

            {/* Business Address */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
                Business Address
              </label>
              <div className="relative">
                <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Business address"
                  value={businessAddress}
                  onChange={(e) => setBusinessAddress(e.target.value)}
                  className="pl-10 h-11 bg-card border-border text-foreground placeholder:text-muted-foreground/60 rounded-xl"
                />
              </div>
            </div>

            {/* Business Phone */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
                Business Phone
              </label>
              <div className="relative">
                <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="tel"
                  placeholder="Business phone"
                  value={businessPhone}
                  onChange={(e) => setBusinessPhone(e.target.value)}
                  className="pl-10 h-11 bg-card border-border text-foreground placeholder:text-muted-foreground/60 rounded-xl"
                />
              </div>
            </div>

            {/* Business Website */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
                Website
              </label>
              <div className="relative">
                <Globe size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="url"
                  placeholder="Business website"
                  value={businessWebsite}
                  onChange={(e) => setBusinessWebsite(e.target.value)}
                  className="pl-10 h-11 bg-card border-border text-foreground placeholder:text-muted-foreground/60 rounded-xl"
                />
              </div>
            </div>

            {/* Google Rating Display */}
            {googleData?.rating && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 border border-border">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={14}
                      className={star <= Math.round(googleData.rating || 0) ? "text-[#FBBF24] fill-[#FBBF24]" : "text-muted-foreground/30 fill-muted-foreground/30"}
                    />
                  ))}
                </div>
                <span className="text-sm font-semibold text-foreground">{googleData.rating.toFixed(1)}</span>
                <span className="text-xs text-muted-foreground">({googleData.totalReviews || 0} reviews)</span>
              </div>
            )}
          </div>
        )}

        {/* Contact Information Section */}
        <div className="flex flex-col gap-3 pt-2">
          <label className="text-xs text-muted-foreground font-medium tracking-wide uppercase">
            Your Contact Information
          </label>
          <p className="text-[11px] text-muted-foreground -mt-1">
            How can we reach you? This won&apos;t be shown to customers.
          </p>

          <div className="relative">
            <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Your name"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className="pl-10 h-11 bg-card border-border text-foreground placeholder:text-muted-foreground/60 rounded-xl"
            />
          </div>

          <div className="relative">
            <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="email"
              placeholder="Your email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="pl-10 h-11 bg-card border-border text-foreground placeholder:text-muted-foreground/60 rounded-xl"
            />
          </div>

          <div className="relative">
            <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="tel"
              placeholder="Your phone (optional)"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="pl-10 h-11 bg-card border-border text-foreground placeholder:text-muted-foreground/60 rounded-xl"
            />
          </div>
        </div>

        {/* Location Section */}
        <div className="flex flex-col gap-3 pt-2" ref={searchRef}>
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground font-medium tracking-wide uppercase flex items-center gap-1.5">
              <MapPin size={12} className="text-accent" /> Business Location
              {!isGoogleVerified && <span className="text-destructive ml-0.5">*</span>}
            </label>
            {isGoogleVerified && data.lat && data.lng && (
              <span className="text-[10px] text-green-400 flex items-center gap-1">
                <CheckCircle2 size={10} /> Auto-pinned
              </span>
            )}
          </div>

          {!isGoogleVerified && (
            <>
              <p className="text-[11px] text-muted-foreground -mt-1.5">
                Search for your business or click the map to place a pin.
              </p>

              {/* Search Input */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search address..."
                  className="pl-9 pr-10 h-11 bg-card border-border text-foreground placeholder:text-muted-foreground/60 rounded-xl"
                />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2"><VLYRInlineLoader /></div>
                )}
                {searchQuery && !isSearching && (
                  <button
                    onClick={() => { setSearchQuery(""); setShowResults(false) }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Search Results Dropdown */}
              <AnimatePresence>
                {showResults && searchResults.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="bg-card border border-border rounded-xl shadow-lg max-h-40 overflow-auto"
                  >
                    {searchResults.map((r) => (
                      <button
                        key={r.place_id}
                        onClick={() => selectResult(r)}
                        className="w-full text-left px-3 py-2.5 hover:bg-secondary transition-colors border-b border-border/30 last:border-0 flex items-start gap-2"
                      >
                        <MapPin size={12} className="text-accent mt-0.5 shrink-0" />
                        <span className="text-xs text-muted-foreground truncate">
                          {r.display_name}
                        </span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}

          {/* Map */}
          <div className="rounded-xl overflow-hidden border border-border">
            <ProfileMap
              center={mapCenter}
              markerPosition={markerPosition}
              onMapClick={isGoogleVerified ? undefined : handleMapClick}
            />
          </div>

          {data.lat && data.lng && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-xl"
            >
              <MapPin size={12} className="text-green-500 shrink-0" />
              <span className="text-[10px] text-muted-foreground font-mono">
                {data.lat.toFixed(5)}, {data.lng.toFixed(5)}
              </span>
            </motion.div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-3 mt-2">
        <Button
          variant="outline"
          onClick={onBack}
          className="h-12 rounded-xl border-border bg-card text-foreground hover:bg-secondary flex-1 transition-all active:scale-[0.98]"
        >
          <ArrowLeft size={18} className="mr-2" />
          Back
        </Button>
        <Button
          onClick={onNext}
          disabled={!canProceed}
          className="h-12 rounded-xl bg-foreground text-background font-semibold text-base hover:bg-foreground/90 disabled:opacity-30 flex-[2] transition-all active:scale-[0.98]"
        >
          Continue
          <ArrowRight size={18} className="ml-2" />
        </Button>
      </div>
    </motion.div>
  )
}
