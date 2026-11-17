"use client"

import { useRef, useCallback, useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import dynamic from "next/dynamic"
import {
  Building2, MapPin, Upload, ArrowRight, ArrowLeft, Search,
  X, CheckCircle2, Phone, Globe, Loader2, AlertCircle,
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
import { normalizeCategory } from "@/lib/google/categories"

const ProfileMap = dynamic(() => import("@/components/profile-map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 rounded-xl bg-secondary border border-border flex items-center justify-center">
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

interface Suggestion { placeId: string; main: string; secondary: string }

const GoogleG = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
)

export function StepBusiness({ data, onChange, onNext, onBack }: StepBusinessProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const session = useRef<string>(typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now()))

  const [query, setQuery] = useState(data.googleAddress || "")
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoError, setLogoError] = useState<string | null>(null)
  const [loadingSaved, setLoadingSaved] = useState(false)

  const isGoogleVerified = data.googleConnected === true && !!data.googlePlaceId

  // Opened directly (e.g. after a refresh): fill the form from what we saved
  useEffect(() => {
    if (data.businessName) return
    let cancelled = false
    ;(async () => {
      setLoadingSaved(true)
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data: m } = await supabase
          .from("merchants")
          .select("business_name, business_category, logo_url, address, google_address, google_phone, google_website, lat, lng, google_rating, google_review_count, google_ownership_verified, google_verified_place_id")
          .eq("id", user.id)
          .maybeSingle()
        if (cancelled || !m?.business_name) return
        const address = m.google_address || m.address || ""
        onChange({
          businessName: m.business_name,
          businessCategory: normalizeCategory(m.business_category),
          logoUrl: m.logo_url,
          googleAddress: address,
          googlePhone: m.google_phone || "",
          googleWebsite: m.google_website || "",
          lat: m.lat,
          lng: m.lng,
          googleRating: m.google_rating,
          googleReviewCount: m.google_review_count,
          ...(m.google_ownership_verified ? { googleConnected: true, googlePlaceId: m.google_verified_place_id || data.googlePlaceId } : {}),
        })
        setQuery(address)
      } finally {
        if (!cancelled) setLoadingSaved(false)
      }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep the dropdown value valid even if an older label was saved
  useEffect(() => {
    if (data.businessCategory && !(BUSINESS_CATEGORIES as readonly string[]).includes(data.businessCategory)) {
      onChange({ businessCategory: normalizeCategory(data.businessCategory) })
    }
  }, [data.businessCategory, onChange])

  useEffect(() => {
    if (data.googleAddress && !query) setQuery(data.googleAddress)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.googleAddress])

  const uploadLogo = useCallback(async (file: File) => {
    setLogoUploading(true)
    setLogoError(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        onChange({ logoUrl: URL.createObjectURL(file) })
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
  }, [onChange])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file?.type.startsWith("image/")) uploadLogo(file)
  }, [uploadLogo])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowResults(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  // Google address / business suggestions as they type
  const handleQueryChange = useCallback((q: string) => {
    setQuery(q)
    setActiveIndex(-1)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (q.trim().length < 3) { setSuggestions([]); setShowResults(false); return }
    searchTimer.current = setTimeout(async () => {
      setIsSearching(true)
      setShowResults(true)
      try {
        const near = data.lat && data.lng ? `&near=${data.lat},${data.lng}` : ""
        const res = await fetch(`/api/google/places-autocomplete?q=${encodeURIComponent(q)}&session=${session.current}${near}`)
        const json = await res.json()
        setSuggestions(json.suggestions ?? [])
      } catch {
        setSuggestions([])
      } finally {
        setIsSearching(false)
      }
    }, 250)
  }, [data.lat, data.lng])

  const pickSuggestion = useCallback(async (s: Suggestion) => {
    setShowResults(false)
    setQuery([s.main, s.secondary].filter(Boolean).join(", "))
    setIsSearching(true)
    try {
      const res = await fetch(`/api/google/places-autocomplete?placeId=${encodeURIComponent(s.placeId)}&session=${session.current}`)
      const json = await res.json()
      if (json.place) {
        setQuery(json.place.address)
        onChange({
          lat: json.place.lat,
          lng: json.place.lng,
          googleAddress: json.place.address,
          // Unverified businesses keep the place they picked; verified ones keep their Google listing
          ...(isGoogleVerified ? {} : { googlePlaceId: json.place.placeId }),
        })
      }
    } finally {
      setIsSearching(false)
      session.current = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now())
    }
  }, [isGoogleVerified, onChange])

  const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showResults || !suggestions.length) return
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex((i) => (i + 1) % suggestions.length) }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1)) }
    else if (e.key === "Enter") { e.preventDefault(); pickSuggestion(suggestions[Math.max(0, activeIndex)]) }
    else if (e.key === "Escape") setShowResults(false)
  }

  const handleMapClick = useCallback((newLat: number, newLng: number) => {
    onChange({ lat: newLat, lng: newLng })
  }, [onChange])

  const mapCenter: [number, number] = data.lat && data.lng ? [data.lat, data.lng] : [38.9072, -77.0369]
  const markerPosition: [number, number] | null = data.lat && data.lng ? [data.lat, data.lng] : null

  const canProceed =
    data.businessName.trim().length >= 2 &&
    data.businessCategory.length > 0 &&
    !!data.lat &&
    !!data.lng

  const inputCls = "h-12 rounded-xl bg-[#FAFAFA] border-[#E5E5E5] text-[#0A0A0A] placeholder:text-[#AAAAAA] focus-visible:border-[#0A0A0A]"
  const labelCls = "text-[13px] font-semibold text-[#0A0A0A] uppercase tracking-wider"

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
        <div className="flex items-center gap-2.5 mb-1 flex-wrap">
          <h2 className="text-2xl font-bold text-foreground tracking-tight">
            {isGoogleVerified ? "Check your details" : "Your business"}
          </h2>
          {isGoogleVerified && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-1 rounded-full bg-[#f0fdf4] text-[#166534] border border-[#00a544]/20 uppercase tracking-wider">
              <GoogleG /> Imported from Google
            </span>
          )}
        </div>
        <p className="text-sm text-[#666666]">
          {isGoogleVerified
            ? "Everything below came from your Google Business Profile. Change anything that looks off, then continue."
            : "Tell us about your business and pin its location on the map."}
        </p>
        {loadingSaved && <p className="text-xs text-[#888888] mt-2 flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> Loading your saved details…</p>}
      </div>

      {/* Identity card: logo + name */}
      <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#FAFAFA] border border-[#EBEBEB]">
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
          title="Change logo"
          className="relative flex items-center justify-center w-20 h-20 rounded-2xl border-2 border-dashed border-[#DADADA] bg-white overflow-hidden shrink-0 cursor-pointer hover:border-[#0A0A0A] transition-all group"
        >
          {logoUploading ? (
            <VLYRInlineLoader />
          ) : data.logoUrl ? (
            <>
              <img src={data.logoUrl} alt="Logo" className="w-full h-full object-cover" />
              <span className="absolute inset-x-0 bottom-0 bg-black/55 text-white text-[10px] font-semibold text-center py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">Change</span>
            </>
          ) : (
            <Upload size={18} className="text-[#AAAAAA] group-hover:text-[#0A0A0A] transition-colors" />
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLogo(f) }} className="hidden" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#0A0A0A]">{data.logoUrl ? (isGoogleVerified ? "Logo from Google" : "Your logo") : "Add your logo"}</p>
          <p className="text-xs text-[#888888] mt-0.5">Printed on your VLYR stickers. Click to {data.logoUrl ? "replace" : "upload"}.</p>
          {data.logoUrl && (
            <button type="button" onClick={() => onChange({ logoUrl: null })} className="text-xs text-red-500 hover:underline mt-1">Remove</button>
          )}
          {logoError && <p className="text-xs text-red-500 flex items-center gap-1 mt-1"><AlertCircle size={10} /> {logoError}</p>}
        </div>
      </div>

      {/* Business name */}
      <div className="flex flex-col gap-1.5">
        <label className={labelCls}>Business name</label>
        <div className="relative">
          <Building2 size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Your business name"
            value={data.businessName}
            onChange={(e) => onChange({ businessName: e.target.value })}
            className={`pl-10 ${inputCls}`}
          />
        </div>
      </div>

      {/* Category */}
      <div className="flex flex-col gap-1.5">
        <label className={labelCls}>Business type</label>
        <Select value={data.businessCategory || undefined} onValueChange={(val) => onChange({ businessCategory: val })}>
          <SelectTrigger className={`${inputCls} w-full`}>
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent className="bg-white border-[#E5E5E5] text-[#0A0A0A]">
            {BUSINESS_CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat} className="text-[#0A0A0A]">{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Contact */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>Phone</label>
          <div className="relative">
            <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input type="tel" placeholder="Business phone" value={data.googlePhone} onChange={(e) => onChange({ googlePhone: e.target.value })} className={`pl-10 ${inputCls}`} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>Website</label>
          <div className="relative">
            <Globe size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input type="url" placeholder="yourbusiness.com" value={data.googleWebsite} onChange={(e) => onChange({ googleWebsite: e.target.value })} className={`pl-10 ${inputCls}`} />
          </div>
        </div>
      </div>

      {/* Location */}
      <div className="flex flex-col gap-2.5" ref={searchRef}>
        <div className="flex items-center justify-between">
          <label className={`${labelCls} flex items-center gap-1.5`}>
            Location <span className="text-red-400">*</span>
          </label>
          {data.lat && data.lng && (
            <span className="text-xs text-[#00a544] font-semibold flex items-center gap-1">
              <CheckCircle2 size={11} /> Pinned
            </span>
          )}
        </div>

        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onFocus={() => suggestions.length && setShowResults(true)}
            onKeyDown={onSearchKeyDown}
            placeholder="Start typing your address or business name"
            role="combobox"
            aria-expanded={showResults}
            aria-autocomplete="list"
            className={`pl-10 pr-10 ${inputCls}`}
          />
          {isSearching ? (
            <Loader2 size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-[#888888]" />
          ) : query ? (
            <button
              type="button"
              aria-label="Clear"
              onClick={() => { setQuery(""); setSuggestions([]); setShowResults(false) }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X size={15} />
            </button>
          ) : null}

          <AnimatePresence>
            {showResults && (suggestions.length > 0 || !isSearching) && (
              <motion.ul
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                role="listbox"
                className="absolute z-30 left-0 right-0 mt-1.5 bg-white border border-[#E5E5E5] rounded-xl shadow-lg overflow-hidden"
              >
                {suggestions.length === 0 ? (
                  <li className="px-4 py-3 text-sm text-[#888888]">No matches. Try adding the city.</li>
                ) : suggestions.map((s, i) => (
                  <li key={s.placeId} role="option" aria-selected={i === activeIndex}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => pickSuggestion(s)}
                      onMouseEnter={() => setActiveIndex(i)}
                      className={`w-full text-left px-4 py-3 flex items-start gap-3 border-b border-[#F2F2F2] last:border-0 ${i === activeIndex ? "bg-[#F5F5F5]" : "bg-white"}`}
                    >
                      <MapPin size={15} className="text-[#C9A800] mt-0.5 shrink-0" />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-[#0A0A0A] truncate">{s.main}</span>
                        {s.secondary && <span className="block text-xs text-[#888888] truncate">{s.secondary}</span>}
                      </span>
                    </button>
                  </li>
                ))}
                <li className="px-4 py-1.5 text-[10px] text-[#AAAAAA] text-right bg-[#FAFAFA]">Suggestions by Google</li>
              </motion.ul>
            )}
          </AnimatePresence>
        </div>

        <div className="rounded-xl overflow-hidden border border-[#E5E5E5] shadow-sm">
          <ProfileMap key={`${data.lat},${data.lng}`} center={mapCenter} markerPosition={markerPosition} onMapClick={handleMapClick} />
        </div>
        <p className="text-xs text-[#888888]">Pick a suggestion to move the pin, or use “Move pin” on the map to fine-tune it.</p>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-3 pt-2">
        <Button
          variant="outline"
          onClick={onBack}
          className="h-12 rounded-full border-[#E5E5E5] bg-white text-[#0A0A0A] hover:border-[#0A0A0A] hover:rounded-xl flex-1 transition-all duration-200 font-semibold"
        >
          <ArrowLeft size={16} className="mr-2" />
          Back
        </Button>
        <Button
          onClick={onNext}
          disabled={!canProceed}
          className="h-12 rounded-full bg-[#0A0A0A] text-white font-semibold hover:bg-[#1F1F1F] hover:rounded-xl disabled:opacity-30 flex-[2] transition-all duration-200"
        >
          {isGoogleVerified ? "Looks good, continue" : "Continue"}
          <ArrowRight size={16} className="ml-2" />
        </Button>
      </div>
    </motion.div>
  )
}
