"use client"

import { useCallback, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import useSWR from "swr"
import {
  ArrowLeft, Download, Eye, FileText, Gift, Leaf, Printer, Scissors, Sticker, X, Zap,
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StickerDesigner } from "@/components/sticker-designer"
import { VLYRInlineLoader } from "@/components/vlyr-loader"
import { buildScanUrl } from "@/lib/short-code"
import { PAPER, SIZE_NAMES, formatSeq, sheetGrid, type PaperSize } from "@/lib/label-sheet-layout"
import { isModernSize, type LabelDesign } from "@/lib/label-types"

const MAX_LABELS = 500
const SHEET_PRESETS = [1, 2, 5, 10]

interface Batch {
  id: string
  quantity: number
  first_seq: number
  last_seq: number
  paper: PaperSize
  ink_saver: boolean
  design_json: LabelDesign
  download_count: number
  created_at: string
  unused_count?: number
}

interface Allowance {
  plan: string
  limit: number | null
  used: number
  remaining: number | null
  reason: "free" | "unpaid" | null
}

async function fetchBatches(): Promise<{ batches: Batch[]; allowance: Allowance }> {
  const res = await fetch("/api/labels/batches")
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? "Failed to load label sheets")
  return json
}

const pdfUrl = (id: string, view = false, extra: Record<string, string> = {}) => {
  const q = new URLSearchParams(extra)
  if (view) q.set("view", "1")
  const qs = q.toString()
  return `/api/labels/batches/${id}/pdf${qs ? `?${qs}` : ""}`
}

function downloadFile(url: string) {
  const a = document.createElement("a")
  a.href = url
  a.download = ""
  document.body.appendChild(a)
  a.click()
  a.remove()
}

interface PrintAtHomeLabelsProps {
  businessName: string
  logoUrl: string | null
  onBack: () => void
}

export function PrintAtHomeLabels({ businessName, logoUrl, onBack }: PrintAtHomeLabelsProps) {
  const { data: labelData, mutate, isLoading, error: loadError } = useSWR("label-batches", fetchBatches)
  const batches = labelData?.batches
  const allowance = labelData?.allowance
  const isFree = allowance?.limit != null
  const remaining = allowance?.remaining ?? null
  const maxQty = remaining ?? MAX_LABELS
  // Trial used up: only reprints are allowed
  const exhausted = isFree && remaining === 0

  const [design, setDesign] = useState<LabelDesign | null>(null)
  const handleDesignChange = useCallback((d: LabelDesign) => setDesign(d), [])

  const [paper, setPaper] = useState<PaperSize>("letter")
  const [inkSaver, setInkSaver] = useState(false)
  const [quantity, setQuantity] = useState<number>(0) // 0 = "1 sheet" until the grid is known
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<Batch | null>(null)

  const labelSize = design?.labelSize ?? "2x1"
  // Start from the last modern design they printed
  const savedDesign = useMemo(
    () => (batches ?? []).find((b) => b.design_json?.labelSize === "1x2" || b.design_json?.labelSize === "2x1")?.design_json ?? null,
    [batches],
  )
  const grid = sheetGrid(paper, labelSize)
  // Free trials default to all remaining stickers; paid plans to one sheet
  const qty = quantity > 0 ? quantity : isFree ? Math.max(maxQty, 1) : grid.perPage
  const sheets = Math.ceil(qty / grid.perPage)
  const nextSeq = useMemo(() => (batches ?? []).reduce((m, b) => Math.max(m, b.last_seq ?? 0), 0) + 1, [batches])
  const qtyValid = Number.isInteger(qty) && qty >= 1 && qty <= maxQty

  // A sample code so the designer preview shows a real VLYR QR link
  const previewUrl = useMemo(() => buildScanUrl("V-SAMPLE01"), [])

  const handleCreate = async () => {
    if (!design || !qtyValid) return
    setCreating(true)
    setError(null)
    setCreated(null)
    try {
      const res = await fetch("/api/labels/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: qty, design, paper, inkSaver }),
      })
      const json = await res.json()
      if (!res.ok) {
        if (json.code === "free_limit") await mutate()
        throw new Error(json.error ?? "Could not create labels")
      }
      setCreated(json.batch)
      downloadFile(pdfUrl(json.batch.id))
      await mutate()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create labels")
    } finally {
      setCreating(false)
    }
  }

  // Apply the design on screen to a sheet already printed, then reprint it
  const [restyling, setRestyling] = useState<string | null>(null)
  const DESIGN_KEYS = ["labelSize", "backgroundColor", "borderColor", "textColor", "qrColor", "eyeColor", "dotStyle", "eyeStyle", "qrCenterLogo", "showBorder", "headline", "subline", "cta", "logoUrl", "businessName"] as const
  const sameDesign = (a: LabelDesign | null | undefined, b: LabelDesign | null) =>
    !!a && !!b && DESIGN_KEYS.every((k) => String(a[k] ?? "").trim() === String(b[k] ?? "").trim())
  const reprintInDesign = async (b: Batch) => {
    if (!design) return
    setRestyling(b.id)
    setError(null)
    try {
      const res = await fetch(`/api/labels/batches/${b.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ design }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Could not update the design")
      await mutate()
      downloadFile(pdfUrl(b.id, false, { paper }))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update the design")
    } finally {
      setRestyling(null)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="max-w-5xl space-y-6">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft size={16} /> Back to Shop
      </button>

      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#FFE100]/10 border border-[#FFE100]/20 flex items-center justify-center shrink-0">
          <Printer size={18} className="text-[#FFE100]" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Print labels at home</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Free. Download numbered QR labels as a PDF, print them on sticker paper, cut them out and stick one on each takeaway box.
          </p>
        </div>
      </div>

      {/* Free trial allowance */}
      {isFree && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-[#FFE100]/30 bg-[#FFE100]/5">
          <div className="flex items-start gap-3">
            <Gift size={16} className="text-[#FFE100] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground">
                {allowance?.reason === "unpaid" ? "Trial" : "Free trial"}: {remaining} of {allowance?.limit} stickers left
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {allowance?.reason === "unpaid"
                  ? "Unlimited stickers unlock once your plan's payment is confirmed. Until then, the 15-sticker trial applies."
                  : remaining === 0
                    ? "You've used all your free stickers. Upgrade to keep printing and collecting reviews."
                    : "Print them, stick them on takeaway boxes and watch the feedback come in."}
              </p>
            </div>
          </div>
          <Link href="/dashboard/upgrade" className="shrink-0">
            <Button size="sm" className="h-9 gap-1.5 rounded-lg bg-[#FFE100] text-[#111] hover:bg-[#FFE100]/90 font-semibold">
              <Zap size={14} /> Upgrade
            </Button>
          </Link>
        </div>
      )}

      {/* How it works */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { icon: Sticker, title: "1. Design", text: isFree ? "Your stickers use the standard VLYR design. Upgrade to customise." : "Pick landscape or portrait, add your logo and colours." },
          { icon: Printer, title: "2. Print", text: `Print the PDF on full-sheet sticker paper at 100% ("Actual size").` },
          { icon: Scissors, title: "3. Cut & stick", text: "Cut between the small corner marks. Every sticker has its own QR code." },
        ].map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex gap-3 p-4 rounded-xl bg-card border border-border">
            <Icon size={16} className="text-[#FFE100] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground">{title}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{text}</p>
            </div>
          </div>
        ))}
      </div>

      {exhausted ? (
        /* Trial used up: no new QR codes, but every sticker can be reprinted (in any design) */
        <>
        <div className="bg-card rounded-2xl border border-[#FFE100]/30 p-5 space-y-4">
          <div className="flex items-start gap-3">
            <Sticker size={18} className="text-[#FFE100] shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-foreground">You&apos;ve created all {allowance?.limit} trial stickers</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                New QR codes are part of a paid plan. You can reprint the stickers you already have as often as you like:
                they keep the same QR codes, so every scan still reaches you.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Reprint on:</span>
            {(Object.keys(PAPER) as PaperSize[]).map((pp) => (
              <button
                key={pp}
                type="button"
                onClick={() => setPaper(pp)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                  paper === pp ? "bg-[#FFE100]/15 border-[#FFE100]/40 text-[#FFE100]" : "bg-secondary/50 border-border text-muted-foreground"
                }`}
              >
                {PAPER[pp].name}
              </button>
            ))}
            <Link href="/dashboard/upgrade" className="ml-auto">
              <Button size="sm" className="h-8 gap-1.5 rounded-lg bg-[#FFE100] text-[#111] hover:bg-[#FFE100]/90 font-semibold">
                <Zap size={13} /> Get more stickers
              </Button>
            </Link>
          </div>
        </div>
        <StickerDesigner
          initialBusinessName={businessName}
          initialLogoUrl={logoUrl}
          initialDesign={savedDesign}
        locked={isFree}
          reviewUrl={previewUrl}
          onDesignChange={handleDesignChange}
          qrNote={<>Reprints keep the same QR codes, so stickers already handed out keep working.</>}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        </>
      ) : (
        <>
      {/* Designer */}
      <StickerDesigner
        initialBusinessName={businessName}
        initialLogoUrl={logoUrl}
        initialDesign={savedDesign}
        locked={isFree}
        reviewUrl={previewUrl}
        onDesignChange={handleDesignChange}
        qrNote={
          <>
            This preview shows a sample code. In the PDF, every sticker gets its own QR code, so you can see which box
            each scan came from. Customers who scan it land on your VLYR feedback page.
          </>
        }
      />

      {/* Print options */}
      <div className="bg-card rounded-2xl border border-border p-5 space-y-5">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <FileText size={15} /> Print options
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Quantity */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground block">How many labels?</label>
            <div className="flex flex-wrap gap-1.5">
              {SHEET_PRESETS.filter((n, i) => i === 0 || n * grid.perPage <= maxQty).map((n) => {
                const count = Math.min(maxQty, n * grid.perPage)
                const active = qty === count
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setQuantity(count)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      active
                        ? "bg-[#FFE100]/15 border-[#FFE100]/40 text-[#FFE100]"
                        : "bg-secondary/50 border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {count} <span className="opacity-60">({n} sheet{n > 1 ? "s" : ""})</span>
                  </button>
                )
              })}
              {isFree && maxQty > 0 && maxQty % grid.perPage !== 0 && (
                <button
                  type="button"
                  onClick={() => setQuantity(maxQty)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    qty === maxQty
                      ? "bg-[#FFE100]/15 border-[#FFE100]/40 text-[#FFE100]"
                      : "bg-secondary/50 border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  All {maxQty} <span className="opacity-60">(free)</span>
                </button>
              )}
            </div>
            <Input
              type="number"
              min={1}
              max={maxQty}
              value={qty}
              onChange={(e) => setQuantity(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
              className="h-10 bg-secondary/50 border-border rounded-xl font-mono"
              aria-label="Number of labels"
            />
            {!qtyValid && maxQty > 0 && <p className="text-[11px] text-red-400">Choose between 1 and {maxQty} labels.</p>}
          </div>

          {/* Paper */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground block">Sticker paper size</label>
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.keys(PAPER) as PaperSize[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => { setPaper(p); setQuantity(0) }}
                  className={`px-3 py-2.5 rounded-lg text-xs font-medium border transition-colors ${
                    paper === p
                      ? "bg-[#FFE100]/15 border-[#FFE100]/40 text-[#FFE100]"
                      : "bg-secondary/50 border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {PAPER[p].name}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {grid.perPage} labels per sheet at {SIZE_NAMES[labelSize]} ({grid.cols} × {grid.rows}).
            </p>
          </div>

          {/* Ink saver */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground block">Ink</label>
            <button
              type="button"
              onClick={() => setInkSaver((v) => !v)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors ${
                inkSaver ? "bg-[#FFE100]/10 border-[#FFE100]/40" : "bg-secondary/50 border-border"
              }`}
              aria-pressed={inkSaver}
            >
              <Leaf size={15} className={inkSaver ? "text-[#FFE100]" : "text-muted-foreground"} />
              <span className="flex-1">
                <span className="block text-xs font-medium text-foreground">Ink saver {inkSaver ? "on" : "off"}</span>
                <span className="block text-[11px] text-muted-foreground">White background with dark text. Uses much less ink.</span>
              </span>
            </button>
          </div>
        </div>

        {/* Summary + action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-border">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{qtyValid ? qty : "–"} labels</span>
            {qtyValid && <> · {sheets} sheet{sheets > 1 ? "s" : ""} · No. {formatSeq(nextSeq)}–{formatSeq(nextSeq + qty - 1)}</>}
          </p>
          <Button
            onClick={handleCreate}
            disabled={creating || !design || !qtyValid || isLoading || maxQty === 0}
            className="h-11 px-6 rounded-xl bg-[#FFE100] text-[#111] hover:bg-[#FFE100]/90 font-semibold gap-2 disabled:opacity-40"
          >
            {creating ? <VLYRInlineLoader label="Creating labels..." /> : <><Download size={16} /> Create & download PDF</>}
          </Button>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center justify-between p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              {error}
              <button onClick={() => setError(null)} aria-label="Dismiss"><X size={14} /></button>
            </motion.div>
          )}
          {created && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-500 text-xs">
              Labels No. {formatSeq(created.first_seq)}–{formatSeq(created.last_seq)} are downloading.{" "}
              <a href={pdfUrl(created.id)} download className="underline underline-offset-2 font-medium">Download again</a>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Tips: use matte, full-sheet sticker paper for inkjet or laser (whichever matches your printer). Let the ink dry for a minute before cutting.
          A paper trimmer makes the straight cuts quick; the small marks in the margin show where to line it up.
        </p>
      </div>

        </>
      )}

      {/* History */}
      <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">Your label sheets</h3>
          <span className="text-[11px] text-muted-foreground">
            Reprints use the same QR codes (nothing new is created) and print on {PAPER[paper].name}.
          </span>
        </div>
        {isLoading ? (
          <VLYRInlineLoader label="Loading..." />
        ) : loadError ? (
          <p className="text-xs text-red-400">{loadError.message}</p>
        ) : !batches?.length ? (
          <p className="text-xs text-muted-foreground">No labels yet. Your downloads will appear here so you can print them again.</p>
        ) : (
          <ul className="divide-y divide-border">
            {batches.map((b) => (
              <li key={b.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground font-mono">
                    No. {formatSeq(b.first_seq)}–{formatSeq(b.last_seq)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {b.quantity} labels · {isFree ? SIZE_NAMES.vlyr : <>{SIZE_NAMES[b.design_json?.labelSize ?? "3inch"] ?? ""}{isModernSize(b.design_json?.labelSize ?? "3inch") ? "" : ` ${b.design_json?.shape?.replace("-", " ") ?? ""}`}</>} ·{" "}
                    {PAPER[b.paper]?.name ?? "US Letter"}{b.ink_saver ? " · ink saver" : ""} ·{" "}
                    {new Date(b.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                  {typeof b.unused_count === "number" && (
                    <p className="text-[11px] mt-0.5">
                      <span className="text-foreground font-medium">{b.quantity - b.unused_count} rated</span>
                      <span className="text-muted-foreground"> · {b.unused_count} not used yet</span>
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  {design && !isFree && !sameDesign(b.design_json, design) && (
                    <Button
                      size="sm"
                      className="h-8 gap-1.5 text-xs rounded-lg bg-[#FFE100] text-[#111] hover:bg-[#FFE100]/90 font-semibold"
                      disabled={restyling === b.id}
                      onClick={() => reprintInDesign(b)}
                      title="Same QR codes and numbers, new look"
                    >
                      <Sticker size={13} /> {restyling === b.id ? "Updating..." : "Reprint in this design"}
                    </Button>
                  )}
                  <a href={pdfUrl(b.id, true)} target="_blank" rel="noreferrer">
                    <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs rounded-lg"><Eye size={13} /> View</Button>
                  </a>
                  {(b.unused_count ?? 0) > 0 && (b.unused_count ?? 0) < b.quantity && (
                    <a href={pdfUrl(b.id, false, { only: "unused", paper })} download>
                      <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs rounded-lg">
                        <Printer size={13} /> Reprint unused ({b.unused_count})
                      </Button>
                    </a>
                  )}
                  <a href={pdfUrl(b.id, false, { paper })} download>
                    <Button size="sm" className="h-8 gap-1.5 text-xs rounded-lg bg-foreground text-background hover:bg-foreground/90">
                      <Download size={13} /> Reprint all ({b.quantity})
                    </Button>
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </motion.div>
  )
}
