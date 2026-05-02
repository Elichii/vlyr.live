"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import useSWR, { mutate } from "swr"
import dynamic from "next/dynamic"
import {
  Building2, MapPin, Upload, Save, Search, X, CheckCircle2, Camera, Globe, FileText,
  Star, Plus, Trash2, Link2,
} from "lucide-react"
import { GoogleBusinessCard } from "@/components/google-business-card"
import { VLYRLoader, VLYRInlineLoader } from "@/components/vlyr-loader"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"

const ProfileMap = dynamic(() => import("@/components/profile-map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 rounded-xl bg-secondary border border-border/40 flex items-center justify-center">
      <VLYRInlineLoader />
    </div>
  ),
})

// ── Types ───────────────────────────────────────────────────────────
interface ReviewLink {
  id: string
  platform: string
  label: string
  url: string
  is_primary: boolean
  sort_order: number
}

interface NominatimResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
  type: string
  address: Record<string, string>
}

const PLATFORM_OPTIONS = [
  { value: "google", label: "Google Reviews", icon: "G", color: "#4285F4" },
  { value: "yelp", label: "Yelp", icon: "Y", color: "#D32323" },
  { value: "facebook", label: "Facebook", icon: "f", color: "#1877F2" },
  { value: "tripadvisor", label: "TripAdvisor", icon: "T", color: "#34E0A1" },
  { value: "custom", label: "Custom URL", icon: "#", color: "#FFE100" },
]

// ── Fetchers ────────────────────────────────────────────────────────
async function fetchProfile() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from("merchants").select("*").eq("id", user.id).single()
  return data
}

async function fetchReviewLinks(): Promise<ReviewLink[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await supabase
    .from("review_links")
    .select("*")
    .eq("merchant_id", user.id)
    .order("sort_order", { ascending: true })
  return (data as ReviewLink[]) ?? []
}

// ── Page ────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { data: profile, isLoading } = useSWR("merchant-profile", fetchProfile)
  const { data: reviewLinks = [], isLoading: linksLoading } = useSWR("merchant-review-links", fetchReviewLinks)

  const [businessName, setBusinessName] = useState("")
  const [businessCategory, setBusinessCategory] = useState("")
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  const [bio, setBio] = useState("")
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [logoUrl, setLogoUrl] = useState("")

  // Review links local state
  const [links, setLinks] = useState<ReviewLink[]>([])
  const [linksSaving, setLinksSaving] = useState(false)

  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (profile) {
      setBusinessName(profile.business_name || "")
      setBusinessCategory(profile.business_category || "")
      setPhone(profile.phone || "")
      setAddress(profile.address || "")
      setBio(profile.bio || "")
      setLat(profile.lat ?? null)
      setLng(profile.lng ?? null)
      setLogoUrl(profile.logo_url || "")
    }
  }, [profile])

  useEffect(() => {
    if (reviewLinks.length > 0) setLinks(reviewLinks)
  }, [reviewLinks])

  // Close search dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowResults(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  // Debounced search
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
          { headers: { "User-Agent": "VLYRApp/1.0" } }
        )
        const data: NominatimResult[] = await res.json()
        setSearchResults(data)
      } catch { setSearchResults([]) }
      finally { setIsSearching(false) }
    }, 500)
  }, [])

  const selectResult = useCallback((result: NominatimResult) => {
    const a = result.address || {}
    const parts = [a.house_number, a.road, a.city || a.town || a.village, a.state, a.postcode, a.country].filter(Boolean)
    setAddress(parts.join(", "))
    setLat(parseFloat(result.lat))
    setLng(parseFloat(result.lon))
    const nameCandidate = result.display_name.split(",")[0]?.trim()
    if (nameCandidate && !businessName) setBusinessName(nameCandidate)
    setShowResults(false)
    setSearchQuery(result.display_name.split(",").slice(0, 2).join(","))
  }, [businessName])

  const handleMapClick = useCallback((newLat: number, newLng: number) => {
    setLat(newLat)
    setLng(newLng)
    fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${newLat}&lon=${newLng}&addressdetails=1`,
      { headers: { "User-Agent": "VLYRApp/1.0" } }
    )
      .then((res) => res.json())
      .then((data) => { if (data.display_name) setAddress(data.display_name) })
      .catch(() => {})
  }, [])

  // ── Google Disconnect ─────────────────────────────────────────────
  const handleDisconnectGoogle = async () => {
    const confirmed = window.confirm("Are you sure you want to remove Google verification?")
    if (!confirmed) return

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase.from("merchants").update({
        google_connected: false,
        google_location_id: null,
        google_account_name: null,
      }).eq("id", user.id)

      mutate("merchant-profile")
    } catch {
      setSaveError("Failed to remove verification")
    }
  }

  // ── Logo upload ────────────────────────────────────────────────
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setSaveError(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")
      const ext = file.name.split(".").pop() || "png"
      const path = `${user.id}/logo-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from("logos").upload(path, file, { upsert: true, contentType: file.type })
      if (upErr) throw upErr
      const { data: urlData } = supabase.storage.from("logos").getPublicUrl(path)
      setLogoUrl(urlData.publicUrl)
      const { error: dbErr } = await supabase.from("merchants").update({ logo_url: urlData.publicUrl }).eq("id", user.id)
      if (dbErr) console.error("[v0] DB update error:", dbErr)
      mutate("merchant-profile")
      mutate("merchant-sidebar")
    } catch (err) {
      setSaveError(err instanceof Error ? `Logo upload failed: ${err.message}` : "Logo upload failed")
    } finally { setUploading(false) }
  }

  // ── Review Links CRUD ──────────────────────────────────────────
  const addReviewLink = () => {
    setLinks((prev) => [
      ...prev,
      {
        id: `temp-${Date.now()}`,
        platform: "google",
        label: "Google Reviews",
        url: "",
        is_primary: prev.length === 0,
        sort_order: prev.length,
      },
    ])
  }

  const updateLink = (id: string, updates: Partial<ReviewLink>) => {
    setLinks((prev) => prev.map((l) => {
      if (l.id !== id) return l
      const updated = { ...l, ...updates }
      // Auto-set label from platform
      if (updates.platform) {
        const opt = PLATFORM_OPTIONS.find((p) => p.value === updates.platform)
        if (opt) updated.label = opt.label
      }
      return updated
    }))
  }

  const removeLink = (id: string) => {
    setLinks((prev) => {
      const remaining = prev.filter((l) => l.id !== id)
      // If removed was primary, make first item primary
      if (remaining.length > 0 && !remaining.some((l) => l.is_primary)) {
        remaining[0].is_primary = true
      }
      return remaining
    })
  }

  const setPrimary = (id: string) => {
    setLinks((prev) => prev.map((l) => ({ ...l, is_primary: l.id === id })))
  }

  const saveReviewLinks = async () => {
    setLinksSaving(true)
    setSaveError(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setSaveError("Not authenticated"); return }

      // Delete all existing links and re-insert
      await supabase.from("review_links").delete().eq("merchant_id", user.id)

      if (links.length > 0) {
        const rows = links.map((l, i) => ({
          merchant_id: user.id,
          platform: l.platform,
          label: l.label,
          url: l.url,
          is_primary: l.is_primary,
          sort_order: i,
        }))
        const { error } = await supabase.from("review_links").insert(rows)
        if (error) { setSaveError(error.message); return }
      }

      // Also keep google_review_link in merchants table in sync for backwards compat
      const primaryLink = links.find((l) => l.is_primary)
      await supabase.from("merchants").update({
        google_review_link: primaryLink?.url ?? "",
      }).eq("id", user.id)

      await mutate("merchant-review-links")
    } catch {
      setSaveError("Failed to save review links.")
    } finally { setLinksSaving(false) }
  }

  // ── Save profile ───────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    setSaveError(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setSaveError("Not authenticated"); return }

      // Save profile fields
      const { error } = await supabase.from("merchants").update({
        business_name: businessName,
        business_category: businessCategory,
        phone,
        address,
        bio,
        lat,
        lng,
        logo_url: logoUrl,
        updated_at: new Date().toISOString(),
      }).eq("id", user.id)
      if (error) { setSaveError(error.message); return }

      // Save review links
      await saveReviewLinks()

      await mutate("merchant-profile")
      await mutate("merchant-sidebar")
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch { setSaveError("Save failed. Try again.") }
    finally { setSaving(false) }
  }

  const mapCenter = useMemo<[number, number]>(() => (lat && lng ? [lat, lng] : [37.7749, -122.4194]), [lat, lng])

  if (isLoading) return <VLYRLoader variant="card" message="Loading your profile..." />

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Business Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">Update your business details, location, and review pages</p>
      </div>

      {/* Logo + Name Card */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <div className="flex flex-col sm:flex-row gap-6">
          <div className="flex flex-col items-center gap-2">
            <div
              className="relative w-24 h-24 rounded-2xl border-2 border-dashed border-border bg-secondary/50 flex items-center justify-center cursor-pointer overflow-hidden group hover:border-[#FFE100] transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? (
                <VLYRInlineLoader />
              ) : logoUrl ? (
                <>
                  <img src={logoUrl} alt="Business logo" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-foreground/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera size={20} className="text-background" />
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-1 text-muted-foreground group-hover:text-[#FFE100] transition-colors">
                  <Upload size={22} />
                  <span className="text-[10px] font-medium">Upload</span>
                </div>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            <span className="text-[11px] text-muted-foreground">Click to upload logo</span>
          </div>

          <div className="flex-1 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <Building2 size={12} /> Business Name
              </label>
              <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Your business name" className="h-11 bg-secondary/50 border-border rounded-xl" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <MapPin size={12} /> Street Address
              </label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St, City, State" className="h-11 bg-secondary/50 border-border rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Category</label>
                <Input value={businessCategory} onChange={(e) => setBusinessCategory(e.target.value)} placeholder="Restaurant, Salon..." className="h-11 bg-secondary/50 border-border rounded-xl" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Phone</label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" className="h-11 bg-secondary/50 border-border rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Location Card */}
      <div className="bg-card rounded-2xl border border-border p-6 space-y-4" ref={searchRef}>
        <div className="flex items-center gap-2">
          <MapPin size={16} className="text-[#FFE100]" />
          <h2 className="text-sm font-semibold text-foreground">Pin Your Location</h2>
        </div>
        <p className="text-xs text-muted-foreground -mt-2">Search for your business or click the map to place a pin.</p>

        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search business name or address..."
            className="pl-9 pr-10 h-11 bg-secondary/50 border-border rounded-xl"
          />
          {isSearching && <div className="absolute right-3 top-1/2 -translate-y-1/2"><VLYRInlineLoader /></div>}
          {searchQuery && !isSearching && (
            <button onClick={() => { setSearchQuery(""); setShowResults(false) }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X size={14} /></button>
          )}
        </div>

        <AnimatePresence>
          {showResults && searchResults.length > 0 && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="bg-card border border-border rounded-xl shadow-lg max-h-56 overflow-auto">
              {searchResults.map((r) => (
                <button key={r.place_id} onClick={() => selectResult(r)} className="w-full text-left px-4 py-3 hover:bg-secondary transition-colors border-b border-border/30 last:border-0 flex items-start gap-2.5">
                  <MapPin size={14} className="text-[#FFE100] mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-xs font-medium text-foreground block truncate">{r.display_name.split(",")[0]}</span>
                    <span className="text-[11px] text-muted-foreground block truncate">{r.display_name}</span>
                  </div>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="rounded-xl overflow-hidden border border-border">
          <ProfileMap center={mapCenter} markerPosition={lat && lng ? [lat, lng] : null} onMapClick={handleMapClick} />
        </div>
      </div>

      {/* ── Google Business Identity Bridge Card ──────────────────── */}
      <GoogleBusinessCard
        isConnected={profile?.google_connected ?? false}
        accountName={profile?.google_account_name}
        locationId={profile?.google_location_id}
        businessName={businessName}
        onConnect={() => mutate("merchant-profile")}
        onDisconnect={handleDisconnectGoogle}
      />

      {/* ── Review Links Card ─────────────────────────────────────── */}
      <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link2 size={16} className="text-[#FFE100]" />
            <h2 className="text-sm font-semibold text-foreground">Review Pages</h2>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={addReviewLink}
            className="h-8 text-xs text-[#FFE100] hover:text-[#FFE100] hover:bg-[#FFE100]/10 gap-1"
          >
            <Plus size={14} /> Add Link
          </Button>
        </div>
        <p className="text-xs text-muted-foreground -mt-2">
          Add your review page URLs. The primary link is where happy customers get directed when they scan your QR code.
        </p>

        {links.length === 0 && !linksLoading && (
          <div className="text-center py-8 border border-dashed border-border/60 rounded-xl">
            <Globe size={24} className="text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">No review links yet</p>
            <button
              onClick={addReviewLink}
              className="text-xs text-[#FFE100] hover:underline underline-offset-4 mt-1"
            >
              Add your first review link
            </button>
          </div>
        )}

        <div className="space-y-3">
          <AnimatePresence>
            {links.map((link) => {
              const platformOpt = PLATFORM_OPTIONS.find((p) => p.value === link.platform) ?? PLATFORM_OPTIONS[4]
              return (
                <motion.div
                  key={link.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className={`rounded-xl border p-4 space-y-3 transition-colors ${
                    link.is_primary
                      ? "border-[#FFE100]/30 bg-[#FFE100]/[0.02]"
                      : "border-border bg-secondary/30"
                  }`}>
                    {/* Top row: platform + primary toggle + delete */}
                    <div className="flex items-center gap-3">
                      {/* Platform icon */}
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ backgroundColor: platformOpt.color + "20", color: platformOpt.color }}
                      >
                        {platformOpt.icon}
                      </div>

                      {/* Platform select */}
                      <select
                        value={link.platform}
                        onChange={(e) => updateLink(link.id, { platform: e.target.value })}
                        className="h-9 bg-secondary/50 border border-border rounded-lg px-2 text-xs text-foreground cursor-pointer flex-1 max-w-[160px]"
                      >
                        {PLATFORM_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>

                      <div className="flex-1" />

                      {/* Primary toggle */}
                      <button
                        type="button"
                        onClick={() => setPrimary(link.id)}
                        className={`flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all ${
                          link.is_primary
                            ? "bg-[#FFE100]/15 border-[#FFE100]/30 text-[#FFE100]"
                            : "bg-secondary/50 border-border text-muted-foreground hover:border-[#FFE100]/20 hover:text-foreground"
                        }`}
                      >
                        <Star size={10} className={link.is_primary ? "fill-[#FFE100]" : ""} />
                        {link.is_primary ? "Primary" : "Set Primary"}
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => removeLink(link.id)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {/* URL input */}
                    <Input
                      value={link.url}
                      onChange={(e) => updateLink(link.id, { url: e.target.value })}
                      placeholder={
                        link.platform === "google"
                          ? "https://g.page/your-business/review"
                          : link.platform === "yelp"
                          ? "https://yelp.com/biz/your-business"
                          : link.platform === "facebook"
                          ? "https://facebook.com/your-business/reviews"
                          : link.platform === "tripadvisor"
                          ? "https://tripadvisor.com/your-business"
                          : "https://your-review-page.com"
                      }
                      className="h-10 bg-background/50 border-border rounded-lg text-xs"
                    />

                    {/* Custom label for custom platform */}
                    {link.platform === "custom" && (
                      <Input
                        value={link.label}
                        onChange={(e) => updateLink(link.id, { label: e.target.value })}
                        placeholder="Display label (e.g. Trustpilot)"
                        className="h-9 bg-background/50 border-border rounded-lg text-xs"
                      />
                    )}

                    {link.is_primary && (
                      <p className="text-[10px] text-[#FFE100]/70 flex items-center gap-1">
                        <Star size={9} className="fill-[#FFE100]/70" />
                        This link will appear on your QR code labels and Pulse Check routing
                      </p>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Bio Card */}
      <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-[#FFE100]" />
          <h2 className="text-sm font-semibold text-foreground">About Your Business</h2>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Business Bio</label>
          <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell customers about your business..." rows={3} className="bg-secondary/50 border-border rounded-xl resize-none" />
        </div>
      </div>

      {/* Save */}
      <AnimatePresence>
        {saveError && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{saveError}</motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-3 pb-8">
        <Button onClick={handleSave} disabled={saving} className="h-12 rounded-xl bg-foreground text-background hover:bg-foreground/90 font-semibold px-10">
          {saving ? <VLYRInlineLoader label="Saving..." /> : saved ? (
            <span className="flex items-center gap-2"><CheckCircle2 size={16} /> Saved</span>
          ) : (
            <span className="flex items-center gap-2"><Save size={16} /> Save Profile</span>
          )}
        </Button>
        {saved && <span className="text-xs text-green-500 font-medium">Profile updated successfully</span>}
      </div>

    </motion.div>
  )
}
