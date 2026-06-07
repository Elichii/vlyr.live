"use client"

import { useRef, useCallback, useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import dynamic from "next/dynamic"
import {
  Building2, MapPin, Upload, ArrowRight, ArrowLeft, Search,
  X, CheckCircle2, Phone, Globe, Star,
  AlertCircle
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
    <div className="w-full h-44 rounded-xl bg-secondary border border-border flex items-center justify-center">
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

  const isGoogleVerified = !!data.googlePlaceId && data.googlePlaceId.startsWith("ChIJ")

  // Editable copies of Google-populated fields
  const [businessAddress, setBusinessAddress] = useState(data.googleAddress || "")
  const [businessPhone, setBusinessPhone] = useState(data.googlePhone || "")
  const [businessWebsite, setBusinessWebsite] = useState(data.googleWebsite || "")

  useEffect(() => {
    if (isGoogleVerified) {
      setBusinessAddress(data.googleAddress || "")
      setBusinessPhone(data.googlePhone || "")
      setBusinessWebsite(data.googleWebsite || "")
    }
  }, [isGoogleVerified, data.googleAddress, data.googlePhone, data.googleWebsite])

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

  const handleLogoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    uploadLogo(file)
  }, [uploadLogo])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file || !file.type.startsWith("image/")) return
    uploadLogo(file)
  }, [uploadLogo])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowResults(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

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
    onChange({
      googlePlaceId: String(result.place_id),
      lat,
      lng,
      businessName: data.businessName || result.display_name.split(",")[0]?.trim() || "",
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
      .then((d) => { if (d.place_id) onChange({ googlePlaceId: String(d.place_id) }) })
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
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5 mb-1">
          <h2 className="text-2xl font-bold text-foreground tracking-tight">
            {isGoogleVerified ? "Confirm your details" : "Your business"}
          </h2>
          {isGoogleVerified && (
            <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full bg-[#f0fdf4] text-[#166534] border border-[#00a544]/20 uppercase tracking-wider">
              <CheckCircle2 size={9} /> Google verified
            </span>
          )}
        </div>
        <p className="text-sm text-[#666666]">
          {isGoogleVerified
            ? "We imported your details from Google — review and update anything that looks off."
            : "Enter your business information and pin your location on the map."}
        </p>
      </div>

      {/* Google auto-import banner */}
      {isGoogleVerified && (
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-[#f0fdf4] border border-[#00a544]/20">
          <div className="w-8 h-8 rounded-lg bg-[#00a544]/10 border border-[#00a544]/20 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-[#166534]">Imported from Google Business Profile</p>
            <p className="text-xs text-[#16a34a]">Edit any field that needs updating below.</p>
          </div>
        </div>
      )}

      {/* Logo */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-[#0A0A0A] uppercase tracking-wider">Business logo</label>
        <div className="flex items-center gap-4">
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
            className="relative flex items-center justify-center w-16 h-16 rounded-2xl border-2 border-dashed border-[#E5E5E5] bg-[#FAFAFA] overflow-hidden shrink-0 cursor-pointer hover:border-[#0A0A0A] transition-all group"
          >
            {logoUploading ? (
              <VLYRInlineLoader />
            ) : data.logoUrl ? (
              <img src={data.logoUrl} alt="Logo" className="w-full h-full object-cover rounded-2xl" />
            ) : (
              <Upload size={16} className="text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
          <div>
            <p className="text-sm font-semibold text-[#0A0A0A]">{data.logoUrl ? "Logo uploaded" : "Upload your logo"}</p>
            <p className="text-xs text-[#888888] mt-0.5">Appears on your VLYR QR labels</p>
            {data.logoUrl && (
              <button
                type="button"
                onClick={() => onChange({ logoUrl: null })}
                className="text-xs text-red-500 hover:underline mt-1"
              >
                Remove
              </button>
            )}
            {logoError && (
              <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                <AlertCircle size={10} /> {logoError}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Business name */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-[#0A0A0A] uppercase tracking-wider">Business name</label>
        <div className="relative">
          <Building2 size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Your business name"
            value={data.businessName}
            onChange={(e) => onChange({ businessName: e.target.value })}
            className="pl-10 h-12 rounded-xl bg-[#FAFAFA] border-[#E5E5E5] text-[#0A0A0A] placeholder:text-[#AAAAAA] focus-visible:border-[#0A0A0A]"
          />
        </div>
      </div>

      {/* Category */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-[#0A0A0A] uppercase tracking-wider">Business type</label>
        <Select value={data.businessCategory} onValueChange={(val) => onChange({ businessCategory: val })}>
          <SelectTrigger className="h-12 rounded-xl bg-[#FAFAFA] border-[#E5E5E5] text-[#0A0A0A]">
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent className="bg-white border-[#E5E5E5] text-[#0A0A0A]">
            {BUSINESS_CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat} className="text-[#0A0A0A]">{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Google-imported contact details (editable) */}
      {isGoogleVerified && (
        <div className="flex flex-col gap-4 p-4 bg-[#FAFAFA] rounded-2xl border border-[#EBEBEB]">
          <p className="text-sm font-semibold text-[#0A0A0A] uppercase tracking-wider">
            Imported details — edit if needed
          </p>

          {/* Rating summary */}
          {data.googleRating && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-[#E5E5E5]">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    size={13}
                    className={s <= Math.round(data.googleRating || 0)
                      ? "fill-[#FFE100] text-[#FFE100]"
                      : "text-[#E5E5E5] fill-[#E5E5E5]"}
                  />
                ))}
              </div>
              <span className="text-sm font-bold text-[#0A0A0A]">{data.googleRating?.toFixed(1)}</span>
              <span className="text-sm text-[#888888]">({data.googleReviewCount || 0} reviews)</span>
              <span className="ml-auto text-xs text-[#166534] font-semibold bg-[#f0fdf4] border border-[#00a544]/20 px-2 py-0.5 rounded-full">
                Live on Google
              </span>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {/* Address */}
            <div className="relative">
              <MapPin size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Business address"
                value={businessAddress}
                onChange={(e) => setBusinessAddress(e.target.value)}
                className="pl-10 h-11 rounded-xl bg-white border-[#E5E5E5] text-[#0A0A0A] placeholder:text-[#AAAAAA] focus-visible:border-[#0A0A0A] text-sm"
              />
            </div>

            {/* Phone */}
            <div className="relative">
              <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="tel"
                placeholder="Business phone"
                value={businessPhone}
                onChange={(e) => setBusinessPhone(e.target.value)}
                className="pl-10 h-11 rounded-xl bg-white border-[#E5E5E5] text-[#0A0A0A] placeholder:text-[#AAAAAA] focus-visible:border-[#0A0A0A] text-sm"
              />
            </div>

            {/* Website */}
            <div className="relative">
              <Globe size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="url"
                placeholder="Business website"
                value={businessWebsite}
                onChange={(e) => setBusinessWebsite(e.target.value)}
                className="pl-10 h-11 rounded-xl bg-white border-[#E5E5E5] text-[#0A0A0A] placeholder:text-[#AAAAAA] focus-visible:border-[#0A0A0A] text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* Location pin */}
      <div className="flex flex-col gap-3" ref={searchRef}>
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-foreground/70 uppercase tracking-wide flex items-center gap-1.5">
            <MapPin size={11} className="text-[#FFE100]" />
            Location
            {!isGoogleVerified && <span className="text-red-400 ml-0.5">*</span>}
          </label>
          {data.lat && data.lng && (
            <span className="text-xs text-[#00a544] font-semibold flex items-center gap-1">
              <CheckCircle2 size={10} />
              {isGoogleVerified ? "Auto-pinned" : "Pinned"}
            </span>
          )}
        </div>

        {!isGoogleVerified && (
          <>
            <p className="text-xs text-[#888888] -mt-1">
              Search your address or click the map to drop a pin.
            </p>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search address..."
                className="pl-9 pr-10 h-11 rounded-xl bg-[#FAFAFA] border-[#E5E5E5] text-[#0A0A0A] placeholder:text-[#AAAAAA]"
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

            <AnimatePresence>
              {showResults && searchResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="bg-white border border-[#E5E5E5] rounded-xl shadow-md max-h-44 overflow-auto"
                >
                  {searchResults.map((r) => (
                    <button
                      key={r.place_id}
                      onClick={() => selectResult(r)}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-[#F0F0F0] transition-colors border-b border-[#EBEBEB] last:border-0 flex items-start gap-2.5"
                    >
                      <MapPin size={12} className="text-[#FFE100] mt-0.5 shrink-0" />
                      <span className="text-xs text-[#666666] leading-snug">{r.display_name}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}

        <div className="rounded-xl overflow-hidden border border-[#E5E5E5] shadow-sm">
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
            className="flex items-center gap-2 px-3 py-2 bg-[#f0fdf4] border border-[#00a544]/20 rounded-xl"
          >
            <MapPin size={12} className="text-green-600 shrink-0" />
            <span className="text-xs text-[#166534] font-mono">
              {data.lat.toFixed(5)}, {data.lng.toFixed(5)}
            </span>
          </motion.div>
        )}
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
          Continue
          <ArrowRight size={16} className="ml-2" />
        </Button>
      </div>
    </motion.div>
  )
}
