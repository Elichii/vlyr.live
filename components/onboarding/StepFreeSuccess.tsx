"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import { ArrowRight, CheckCircle2, Download, Eye, Printer, RotateCcw, Scissors, Sticker } from "lucide-react"
import { Button } from "@/components/ui/button"
import { VLYRInlineLoader } from "@/components/vlyr-loader"
import { persistFreeOnboarding } from "@/app/onboarding/actions"
import { FREE_STICKER_LIMIT, type OnboardingData } from "@/lib/onboarding-types"

interface StepFreeSuccessProps {
  data: OnboardingData
  onGoToDashboard: () => void
}

interface Batch {
  id: string
  first_seq: number
  last_seq: number
  quantity: number
}

const pdfUrl = (id: string, opts: { paper?: "letter" | "a4"; view?: boolean } = {}) => {
  const q = new URLSearchParams()
  if (opts.paper) q.set("paper", opts.paper)
  if (opts.view) q.set("view", "1")
  const qs = q.toString()
  return `/api/labels/batches/${id}/pdf${qs ? `?${qs}` : ""}`
}

/**
 * Last onboarding step for the free trial: save the profile, create the
 * merchant's free stickers from the label design and offer the PDF.
 */
export function StepFreeSuccess({ data, onGoToDashboard }: StepFreeSuccessProps) {
  const [batch, setBatch] = useState<Batch | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [working, setWorking] = useState(true)
  const started = useRef(false)

  const prepare = async () => {
    setWorking(true)
    setError(null)
    try {
      const saved = await persistFreeOnboarding(data)
      if (!saved.success) throw new Error(saved.error ?? "Could not save your profile")

      // Reuse stickers already created (e.g. after a page refresh)
      const listRes = await fetch("/api/labels/batches")
      const list = await listRes.json()
      if (!listRes.ok) throw new Error(list.error ?? "Could not load your stickers")
      if (list.batches?.length) {
        setBatch(list.batches[0])
        return
      }

      const quantity = Math.min(FREE_STICKER_LIMIT, list.allowance?.remaining ?? FREE_STICKER_LIMIT)
      if (quantity < 1) throw new Error("You've already used your free stickers.")
      const res = await fetch("/api/labels/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantity,
          design: { ...(data.labelDesign ?? {}), businessName: (data.labelDesign?.businessName as string) || data.businessName },
          paper: "letter",
          inkSaver: false,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Could not create your stickers")
      setBatch(json.batch)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setWorking(false)
    }
  }

  useEffect(() => {
    if (started.current) return
    started.current = true
    prepare()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="w-full max-w-lg mx-auto flex flex-col gap-6 pt-4"
    >
      <div className="flex flex-col items-center text-center gap-3">
        <div className="w-14 h-14 rounded-full bg-[#FFE100] flex items-center justify-center">
          <CheckCircle2 size={28} className="text-[#0A0A0A]" />
        </div>
        <h2 className="text-2xl font-bold text-[#0A0A0A] tracking-tight">
          {data.businessName ? `${data.businessName} is ready` : "You're all set"}
        </h2>
        <p className="text-sm text-[#595959] max-w-sm leading-relaxed">
          Your free trial includes {FREE_STICKER_LIMIT} QR stickers. Each one has its own QR code, so every
          rating is tied to one box.
        </p>
      </div>

      {/* Stickers */}
      <div className="rounded-2xl border border-[#E5E5E5] bg-[#FAFAFA] p-5 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0A0A0A] flex items-center justify-center shrink-0">
            <Sticker size={18} className="text-[#FFE100]" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#0A0A0A]">Your free stickers</p>
            <p className="text-xs text-[#595959]">
              {batch ? `${batch.quantity} stickers · No. ${String(batch.first_seq).padStart(4, "0")}–${String(batch.last_seq).padStart(4, "0")}` : "PDF ready to print"}
            </p>
          </div>
        </div>

        {working ? (
          <div className="py-3"><VLYRInlineLoader label="Creating your stickers..." /></div>
        ) : error ? (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>
            <Button variant="outline" onClick={prepare} className="h-10 gap-2 rounded-xl">
              <RotateCcw size={14} /> Try again
            </Button>
          </div>
        ) : batch ? (
          <div className="flex flex-col gap-2">
            <a href={pdfUrl(batch.id, { paper: "letter" })} download>
              <Button className="w-full h-11 rounded-xl bg-[#FFE100] text-[#0A0A0A] hover:bg-[#FFE100]/90 font-bold gap-2">
                <Download size={16} /> Download PDF (US Letter)
              </Button>
            </a>
            <div className="grid grid-cols-2 gap-2">
              <a href={pdfUrl(batch.id, { paper: "a4" })} download>
                <Button variant="outline" className="w-full h-10 rounded-xl gap-1.5 text-sm"><Download size={14} /> A4 paper</Button>
              </a>
              <a href={pdfUrl(batch.id, { view: true })} target="_blank" rel="noreferrer">
                <Button variant="outline" className="w-full h-10 rounded-xl gap-1.5 text-sm"><Eye size={14} /> Preview</Button>
              </a>
            </div>
          </div>
        ) : null}
      </div>

      {/* How to use */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { icon: Printer, title: "Print", text: "On full-sheet sticker paper, at 100% size." },
          { icon: Scissors, title: "Cut", text: "Between the small corner marks." },
          { icon: Sticker, title: "Stick", text: "One on every takeaway box or bag." },
        ].map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-xl border border-[#E5E5E5] p-3.5">
            <Icon size={15} className="text-[#0A0A0A]" />
            <p className="text-sm font-semibold text-[#0A0A0A] mt-2">{title}</p>
            <p className="text-xs text-[#595959] mt-0.5 leading-relaxed">{text}</p>
          </div>
        ))}
      </div>

      <p className="text-xs text-[#595959] text-center leading-relaxed">
        When a customer scans, happy ones are sent to your Google reviews and unhappy ones reach you privately in your
        dashboard. You can download these stickers again any time from Supply Shop.
      </p>

      <Button onClick={onGoToDashboard} size="lg" className="w-full h-12 rounded-xl gap-2">
        Go to my dashboard <ArrowRight size={16} />
      </Button>
    </motion.div>
  )
}
