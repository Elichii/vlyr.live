"use client"

/**
 * Designer for the modern VLYR sticker (portrait 1"×2" or landscape 2"×1").
 * The preview uses the same layout as the printed PDF (lib/sticker-layout.ts).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { Check, ImagePlus, Loader2, Lock, RotateCcw, Type, QrCode, Palette, AlertTriangle, Store, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { createClient } from "@/lib/supabase/client"
import { MODERN_DEFAULTS, STICKER_FONTS, stickerLayout, stickerSvg, type Measure, type StickerFont } from "@/lib/sticker-layout"
import type { LabelDesign, QrDotStyle, QrEyeStyle } from "@/lib/label-types"

interface StickerDesignerProps {
  initialBusinessName?: string
  initialLogoUrl?: string | null
  /** A saved design to start from (e.g. the last sheet printed) */
  initialDesign?: LabelDesign | null
  /** URL encoded in the preview QR code */
  reviewUrl?: string
  onDesignChange?: (design: LabelDesign) => void
  /** Note under the preview about what the QR code links to */
  qrNote?: React.ReactNode
  /**
   * Free trial: show the standard VLYR sticker and disable every control
   * (customising is a paid feature; the server enforces this too).
   */
  locked?: boolean
}

const THEMES = [
  { name: "Classic", bg: "#FFFFFF", text: "#1D1D1F", border: "#D2D2D6", qr: "#000000", eye: "#000000" },
  { name: "Midnight", bg: "#1D1D1F", text: "#FFFFFF", border: "#1D1D1F", qr: "#000000", eye: "#000000" },
  { name: "Cream", bg: "#F5F1EA", text: "#2B2620", border: "#E4DCCD", qr: "#2B2620", eye: "#8A5A2B" },
  { name: "VLYR", bg: "#0A0A0A", text: "#FFFFFF", border: "#FFE100", qr: "#000000", eye: "#000000" },
  { name: "Ocean", bg: "#EAF2FB", text: "#0F3460", border: "#C9DBF0", qr: "#0F3460", eye: "#0F3460" },
  { name: "Sage", bg: "#EEF3EC", text: "#1F3A2B", border: "#D3E0CF", qr: "#1F3A2B", eye: "#3F7A55" },
]

const DOT_STYLES: { id: QrDotStyle; label: string }[] = [
  { id: "square", label: "Square" },
  { id: "rounded", label: "Rounded" },
  { id: "dots", label: "Dots" },
]
const EYE_STYLES: { id: QrEyeStyle; label: string }[] = [
  { id: "square", label: "Square" },
  { id: "rounded", label: "Rounded" },
  { id: "circle", label: "Circle" },
]

function defaultDesign(name: string, logoUrl: string | null): LabelDesign {
  return {
    labelSize: "2x1",
    shape: "rounded-rect",
    businessName: name,
    logoUrl,
    tagline: "",
    backgroundColor: MODERN_DEFAULTS.backgroundColor,
    borderColor: MODERN_DEFAULTS.borderColor,
    textColor: MODERN_DEFAULTS.textColor,
    qrColor: MODERN_DEFAULTS.qrColor,
    eyeColor: MODERN_DEFAULTS.eyeColor,
    dotStyle: "square",
    eyeStyle: "square",
    headline: "",
    subline: "",
    cta: "",
    qrCenterLogo: false,
    showBorder: true,
  }
}

const isPlaceholder = (n?: string | null) => !n?.trim() || n.trim().toLowerCase() === "your business"

/**
 * Loads the sticker's Inter fonts (the same files the PDF embeds), then
 * measures text with them, so the preview matches the print exactly.
 */
let fontsLoading: Promise<void> | null = null
function loadStickerFonts() {
  fontsLoading ??= Promise.all(
    (Object.keys(STICKER_FONTS) as StickerFont[]).map(async (k) => {
      const { file, family } = STICKER_FONTS[k]
      const face = new FontFace(family, `url(/fonts/sticker/${file})`)
      document.fonts.add(await face.load())
    }),
  ).then(() => undefined)
  return fontsLoading
}

function useMeasure(): { measure: Measure; ready: boolean } {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    loadStickerFonts().then(() => setReady(true)).catch(() => setReady(true))
  }, [])
  const measure = useMemo<Measure>(() => {
    let ctx: CanvasRenderingContext2D | null = null
    return (text, size, font) => {
      ctx ??= typeof document !== "undefined" ? document.createElement("canvas").getContext("2d") : null
      if (!ctx) return text.length * size * 0.55
      ctx.font = `100px '${STICKER_FONTS[font].family}', Inter, sans-serif`
      return (ctx.measureText(text).width / 100) * size
    }
    // Re-create once the fonts arrive so widths are measured with Inter
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])
  return { measure, ready }
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("Could not load image"))
    img.src = src
  })
}

/** Re-encodes any image as a PNG (max 800px), so it always prints. */
async function toPng(src: string): Promise<Blob> {
  const img = await loadImage(src)
  const scale = Math.min(1, 800 / Math.max(img.naturalWidth, img.naturalHeight))
  const c = document.createElement("canvas")
  c.width = Math.max(1, Math.round(img.naturalWidth * scale))
  c.height = Math.max(1, Math.round(img.naturalHeight * scale))
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height)
  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not convert image"))), "image/png"))
}

/** Stores a PNG copy of the logo in the merchant's own folder and returns its public URL. */
async function uploadStickerLogo(src: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Please sign in again to add a logo.")
  const blob = await toPng(src)
  const path = `${user.id}/sticker-logo-${Date.now()}.png`
  const { error } = await supabase.storage.from("logos").upload(path, blob, { upsert: true, contentType: "image/png" })
  if (error) throw new Error(error.message)
  return supabase.storage.from("logos").getPublicUrl(path).data.publicUrl
}

export function StickerDesigner({
  initialBusinessName = "",
  initialLogoUrl = null,
  initialDesign = null,
  reviewUrl = "",
  onDesignChange,
  qrNote,
  locked = false,
}: StickerDesignerProps) {
  const name = isPlaceholder(initialBusinessName) ? "" : initialBusinessName.trim()
  // The standard VLYR sticker (the approved design) used on the free trial; the logo spot shows the business name
  const standard = useMemo<LabelDesign>(() => ({ ...defaultDesign(name, null), labelSize: "vlyr" }), [name])
  const [design, setDesign] = useState<LabelDesign>(() =>
    initialDesign && (initialDesign.labelSize === "1x2" || initialDesign.labelSize === "2x1")
      ? { ...defaultDesign(name, null), ...initialDesign }
      : defaultDesign(name, null),
  )
  const update = useCallback((u: Partial<LabelDesign>) => setDesign((d) => ({ ...d, ...u })), [])
  const [tab, setTab] = useState<"brand" | "text" | "colors" | "qr">("brand")

  // A saved design may arrive after the first render
  const appliedSaved = useRef(false)
  useEffect(() => {
    if (appliedSaved.current || !initialDesign) return
    if (initialDesign.labelSize !== "1x2" && initialDesign.labelSize !== "2x1") return
    appliedSaved.current = true
    setDesign((d) => ({ ...d, ...initialDesign }))
  }, [initialDesign])

  // The real business name often loads late
  useEffect(() => {
    if (!name) return
    setDesign((d) => (isPlaceholder(d.businessName) ? { ...d, businessName: name } : d))
  }, [name])

  // What's shown and printed
  const shown = locked ? standard : design

  useEffect(() => {
    onDesignChange?.(shown)
  }, [shown, onDesignChange])

  // Reward line shown on the sticker when the business has rewards switched on
  const [reward, setReward] = useState<string | null>(null)
  useEffect(() => {
    fetch("/api/rewards")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setReward(j?.settings?.enabled && j.settings.offer?.trim() ? j.settings.offer.trim() : null))
      .catch(() => {})
  }, [])

  // Images for the preview
  const [vlyr, setVlyr] = useState<{ src: string; width: number; height: number } | null>(null)
  useEffect(() => {
    loadImage("/images/vlyr-wordmark.png").then((i) => setVlyr({ src: i.src, width: i.naturalWidth, height: i.naturalHeight })).catch(() => {})
  }, [])
  const [logo, setLogo] = useState<{ width: number; height: number; tone: "dark" | "light" | "any" } | null>(null)
  useEffect(() => {
    setLogo(null)
    if (!shown.logoUrl) return
    let live = true
    loadImage(shown.logoUrl)
      .then((i) => live && setLogo({ width: i.naturalWidth, height: i.naturalHeight, tone: logoTone(i) }))
      .catch(() => live && !locked && update({ logoUrl: null }))
    return () => {
      live = false
    }
  }, [shown.logoUrl, locked, update])

  const [logoBusy, setLogoBusy] = useState(false)
  const [logoError, setLogoError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const applyLogo = async (src: string, revoke = false) => {
    setLogoBusy(true)
    setLogoError(null)
    try {
      update({ logoUrl: await uploadStickerLogo(src) })
    } catch (e) {
      setLogoError(e instanceof Error ? e.message : "Could not add the logo.")
    } finally {
      if (revoke) URL.revokeObjectURL(src)
      setLogoBusy(false)
    }
  }

  const onFile = (f: File | undefined) => {
    if (!f) return
    if (!f.type.startsWith("image/")) return setLogoError("Please choose an image (PNG, JPG, SVG or WebP).")
    if (f.size > 5_000_000) return setLogoError("That image is over 5 MB. Please choose a smaller one.")
    applyLogo(URL.createObjectURL(f), true)
  }

  const { measure, ready: fontsReady } = useMeasure()
  const layout = useMemo(
    () =>
      stickerLayout({
        design: shown,
        businessName: shown.businessName,
        logo: shown.logoUrl ? logo : null,
        vlyr: vlyr ?? { width: 4, height: 1 },
        scanUrl: reviewUrl || "https://vlyr.live/s/V-SAMPLE01",
        seq: 1,
        rewardOffer: reward,
        measure,
      }),
    [shown, logo, vlyr, reviewUrl, reward, measure],
  )
  const svg = useMemo(() => stickerSvg(layout, { logo: shown.logoUrl, vlyr: vlyr?.src ?? "" }), [layout, shown.logoUrl, vlyr])

  const portrait = shown.labelSize === "1x2"
  const standardSize = shown.labelSize === "vlyr"
  const darkBg = luminanceOf(design.backgroundColor) < 0.45
  const logoClash = !!design.logoUrl && !!logo && logo.tone === (darkBg ? "dark" : "light")
  const activeTheme = THEMES.find(
    (t) => t.bg === design.backgroundColor && t.text === design.textColor && t.qr === design.qrColor && t.eye === design.eyeColor,
  )?.name

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px]">
        {/* Preview */}
        <div className="p-6 sm:p-8 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(127,127,127,0.04)_10px,rgba(127,127,127,0.04)_20px)] flex flex-col items-center justify-center gap-5 border-b lg:border-b-0 lg:border-r border-border">
          {/* Orientation (paid plans) */}
          {standardSize ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-foreground">
              Standard VLYR sticker · 2.5&quot; × 4.3&quot;
            </span>
          ) : (
          <div className="inline-flex rounded-xl border border-border bg-background p-1" role="radiogroup" aria-label="Sticker orientation">
            {(["2x1", "1x2"] as const).map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={design.labelSize === s}
                onClick={() => update({ labelSize: s })}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  design.labelSize === s ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className={`inline-block border-[1.5px] border-current rounded-[3px] ${s === "2x1" ? "w-5 h-2.5" : "w-2.5 h-5"}`} />
                {s === "2x1" ? 'Landscape 2" × 1"' : 'Portrait 1" × 2"'}
              </button>
            ))}
          </div>
          )}

          <div
            className="drop-shadow-[0_8px_24px_rgba(0,0,0,0.18)] transition-all"
            style={
              standardSize
                ? { width: "min(260px, 70vw)", aspectRatio: "180 / 309" }
                : portrait
                  ? { width: "min(220px, 60vw)", aspectRatio: "1 / 2" }
                  : { width: "min(440px, 100%)", aspectRatio: "2 / 1" }
            }
            aria-label="Sticker preview"
            dangerouslySetInnerHTML={{ __html: svg }}
          />

          <p className="text-[11px] text-muted-foreground text-center max-w-sm leading-relaxed">
            {standardSize
              ? 'Prints at exactly 2.5" wide × 4.3" tall. Every sticker gets its own QR code.'
              : `Shown larger than life. Prints at exactly ${portrait ? '1" wide × 2" tall' : '2" wide × 1" tall'}.`}
          </p>
          {layout.qrAdjusted && (
            <p className="flex items-start gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 max-w-sm">
              <AlertTriangle size={13} className="shrink-0 mt-px" />
              Those QR colours are too light for phones to read, so the code prints in black. Pick a darker colour to use it.
            </p>
          )}
          {qrNote && <p className="text-[11px] text-muted-foreground text-center max-w-md leading-relaxed">{qrNote}</p>}
        </div>

        {/* Controls (all disabled on the free trial) */}
        <div className="relative flex flex-col">
          {locked && (
            <div className="absolute inset-0 z-10 flex items-center justify-center p-6 bg-card/70 backdrop-blur-[2px]">
              <div className="max-w-xs text-center space-y-3 rounded-2xl border border-border bg-card p-5 shadow-lg">
                <div className="mx-auto w-10 h-10 rounded-xl bg-[#FFE100]/15 flex items-center justify-center">
                  <Lock size={18} className="text-[#B8A000] dark:text-[#FFE100]" />
                </div>
                <p className="text-sm font-semibold text-foreground">Make the stickers yours</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Free stickers use the standard VLYR design. Upgrade to add your own colours and wording, style the QR code,
                  and choose 1&quot; × 2&quot; or 2&quot; × 1&quot; sizes.
                </p>
                <Link href="/dashboard/upgrade" className="inline-block">
                  <Button size="sm" className="h-9 gap-1.5 rounded-lg bg-[#FFE100] text-[#111] hover:bg-[#FFE100]/90 font-semibold">
                    <Zap size={14} /> Upgrade to customise
                  </Button>
                </Link>
              </div>
            </div>
          )}
          <fieldset disabled={locked} aria-disabled={locked} className={`flex flex-col flex-1 min-w-0 border-0 p-0 m-0 ${locked ? "opacity-40 pointer-events-none select-none" : ""}`}>
          <div className="grid grid-cols-4 border-b border-border">
            {([
              ["brand", "Logo", Store],
              ["text", "Text", Type],
              ["colors", "Colours", Palette],
              ["qr", "QR code", QrCode],
            ] as const).map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`flex flex-col items-center gap-1 py-3 text-[11px] font-medium border-b-2 transition-colors ${
                  tab === id ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon size={15} /> {label}
              </button>
            ))}
          </div>

          <div className="p-5 space-y-5 flex-1">
            {tab === "brand" && (
              <>
                <Field label="Top of the sticker">
                  <div className="grid grid-cols-1 gap-2">
                    <Choice active={!design.logoUrl} onClick={() => update({ logoUrl: null })}>
                      <Type size={14} /> Business name
                    </Choice>
                    {initialLogoUrl && (
                      <Choice active={false} onClick={() => applyLogo(initialLogoUrl)} disabled={logoBusy}>
                        <Store size={14} /> Use my profile logo
                      </Choice>
                    )}
                    <Choice active={false} onClick={() => fileRef.current?.click()} disabled={logoBusy}>
                      {logoBusy ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
                      {design.logoUrl ? "Upload a different logo" : "Upload a logo"}
                    </Choice>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = "" }} />
                  </div>
                  {design.logoUrl && (
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-2">
                      <Check size={12} /> Your logo is on the sticker.
                    </p>
                  )}
                  {logoClash && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-start gap-1.5 mt-2">
                      <AlertTriangle size={12} className="shrink-0 mt-px" />
                      Your logo is hard to see on this background. Try a {darkBg ? "lighter" : "darker"} background in Colours, or upload a {darkBg ? "white" : "dark"} version of your logo.
                    </p>
                  )}
                  {logoError && <p className="text-[11px] text-red-500 mt-2">{logoError}</p>}
                  <p className="text-[11px] text-muted-foreground mt-2">Tip: a wide logo on a transparent background looks best.</p>
                </Field>
                {!design.logoUrl && (
                  <Field label="Business name">
                    <Input value={design.businessName} maxLength={40} onChange={(e) => update({ businessName: e.target.value })} placeholder="Your business name" />
                  </Field>
                )}
              </>
            )}

            {tab === "text" && (
              <>
                <Field label="Headline">
                  <Input value={design.headline ?? ""} maxLength={40} onChange={(e) => update({ headline: e.target.value })} placeholder={MODERN_DEFAULTS.headline} />
                </Field>
                <Field label="Second line">
                  {reward ? (
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Your reward is switched on, so this line shows it: <span className="font-medium text-foreground">“Rate us &amp; get {reward.charAt(0).toLowerCase() + reward.slice(1)}”</span>. Change the reward on the Rewards page.
                    </p>
                  ) : (
                    <Input value={design.subline ?? ""} maxLength={60} onChange={(e) => update({ subline: e.target.value })} placeholder={MODERN_DEFAULTS.subline} />
                  )}
                </Field>
                <Field label="Call to action">
                  <Input value={design.cta ?? ""} maxLength={24} onChange={(e) => update({ cta: e.target.value })} placeholder={reward ? MODERN_DEFAULTS.rewardCta : MODERN_DEFAULTS.cta} />
                  {reward && <p className="text-[11px] text-muted-foreground mt-1.5">With a reward on, the sticker asks customers to rate (not review), as Google requires.</p>}
                </Field>
                <p className="text-[11px] text-muted-foreground">Leave a box empty to use the suggested wording. Long text shrinks to fit.</p>
              </>
            )}

            {tab === "colors" && (
              <>
                <Field label="Themes">
                  <div className="grid grid-cols-3 gap-2">
                    {THEMES.map((t) => (
                      <button
                        key={t.name}
                        type="button"
                        onClick={() => update({ backgroundColor: t.bg, textColor: t.text, borderColor: t.border, qrColor: t.qr, eyeColor: t.eye })}
                        className={`rounded-lg border p-2 text-[11px] font-medium flex flex-col items-center gap-1.5 transition-colors ${
                          activeTheme === t.name ? "border-foreground" : "border-border hover:border-foreground/40"
                        }`}
                      >
                        <span className="w-full h-6 rounded-md border border-black/10 flex items-center justify-center gap-1" style={{ background: t.bg }}>
                          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: t.text }} />
                          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: t.eye }} />
                        </span>
                        {t.name}
                      </button>
                    ))}
                  </div>
                </Field>
                <ColorRow label="Background" value={design.backgroundColor} onChange={(v) => update({ backgroundColor: v })} />
                <ColorRow label="Text" value={design.textColor ?? MODERN_DEFAULTS.textColor} onChange={(v) => update({ textColor: v })} />
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-muted-foreground">Outline</span>
                  <div className="flex items-center gap-3">
                    {design.showBorder !== false && <ColorSwatch value={design.borderColor} onChange={(v) => update({ borderColor: v })} label="Outline colour" />}
                    <Switch checked={design.showBorder !== false} onCheckedChange={(v) => update({ showBorder: v })} aria-label="Show outline" />
                  </div>
                </div>
              </>
            )}

            {tab === "qr" && (
              <>
                <Field label="Dots">
                  <Segmented options={DOT_STYLES} value={design.dotStyle ?? "square"} onChange={(v) => update({ dotStyle: v })} />
                </Field>
                <Field label="Corner squares">
                  <Segmented options={EYE_STYLES} value={design.eyeStyle ?? "square"} onChange={(v) => update({ eyeStyle: v })} />
                </Field>
                <ColorRow label="Dot colour" value={design.qrColor ?? "#000000"} onChange={(v) => update({ qrColor: v })} />
                <ColorRow label="Corner colour" value={design.eyeColor ?? design.qrColor ?? "#000000"} onChange={(v) => update({ eyeColor: v })} />
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-medium text-muted-foreground block">VLYR logo in the middle</span>
                    <span className="text-[11px] text-muted-foreground">The code still scans with it.</span>
                  </div>
                  <Switch checked={!!design.qrCenterLogo} onCheckedChange={(v) => update({ qrCenterLogo: v })} aria-label="VLYR logo in the middle of the QR code" />
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Dark colours scan best. On a dark sticker the code sits on a white square so phones can read it.
                </p>
              </>
            )}
          </div>

          <div className="px-5 pb-5">
            <button
              type="button"
              onClick={() => setDesign({ ...defaultDesign(design.businessName, null), labelSize: design.labelSize })}
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
            >
              <RotateCcw size={12} /> Reset design
            </button>
          </div>
          </fieldset>
        </div>
      </div>
    </div>
  )
}

function luminanceOf(hex: string) {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return 1
  const n = parseInt(hex.slice(1), 16)
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255
}

/** Whether the visible part of a logo is dark, light, or has its own background. */
function logoTone(img: HTMLImageElement): "dark" | "light" | "any" {
  try {
    const c = document.createElement("canvas")
    c.width = 48
    c.height = Math.max(1, Math.round((48 * img.naturalHeight) / img.naturalWidth))
    const ctx = c.getContext("2d")!
    ctx.drawImage(img, 0, 0, c.width, c.height)
    const px = ctx.getImageData(0, 0, c.width, c.height).data
    let sum = 0, count = 0
    for (let i = 0; i < px.length; i += 4) {
      if (px[i + 3] < 128) continue
      sum += (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255
      count++
    }
    // Opaque logos (with their own background) are fine anywhere
    if (count === 0 || count > (px.length / 4) * 0.9) return "any"
    const avg = sum / count
    return avg < 0.35 ? "dark" : avg > 0.75 ? "light" : "any"
  } catch {
    return "any"
  }
}

// ─── Small controls ───────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <span className="text-xs font-medium text-muted-foreground block">{label}</span>
      {children}
    </div>
  )
}

function Choice({ active, onClick, disabled, children }: { active: boolean; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium text-left transition-colors disabled:opacity-50 ${
        active ? "border-foreground bg-foreground/5 text-foreground" : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40"
      }`}
    >
      {children}
    </button>
  )
}

function Segmented<T extends string>({ options, value, onChange }: { options: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="grid grid-cols-3 gap-1 rounded-lg border border-border p-1">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`rounded-md py-1.5 text-xs font-medium transition-colors ${value === o.id ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function ColorSwatch({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <label className="relative w-7 h-7 rounded-md border border-border overflow-hidden cursor-pointer shrink-0" style={{ background: value }} title={label}>
      <input type="color" value={value} onChange={(e) => onChange(e.target.value.toUpperCase())} className="absolute inset-0 opacity-0 cursor-pointer" aria-label={label} />
    </label>
  )
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <Input
          value={draft}
          onChange={(e) => {
            const v = e.target.value.trim()
            setDraft(v)
            const hex = v.startsWith("#") ? v : `#${v}`
            if (/^#[0-9a-f]{6}$/i.test(hex)) onChange(hex.toUpperCase())
          }}
          className="h-8 w-24 font-mono text-xs uppercase"
          aria-label={`${label} hex colour`}
        />
        <ColorSwatch value={value} onChange={onChange} label={`${label} colour`} />
      </div>
    </div>
  )
}
