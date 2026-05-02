"use client"

import { useCallback, useState } from "react"
import { motion } from "framer-motion"
import { ArrowRight, ArrowLeft, QrCode } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LabelDesigner } from "@/components/label-designer"
import type { OnboardingData } from "@/lib/onboarding-types"
import type { LabelDesign } from "@/lib/label-types"

interface StepPrintStudioProps {
  data: OnboardingData
  onChange: (updates: Partial<OnboardingData>) => void
  onNext: () => void
  onBack: () => void
}

export function StepPrintStudio({ data, onChange, onNext, onBack }: StepPrintStudioProps) {
  const [currentDesign, setCurrentDesign] = useState<LabelDesign | null>(null)

  const handleDesignChange = useCallback((design: LabelDesign) => {
    setCurrentDesign(design)
  }, [])

  const handleContinue = () => {
    if (currentDesign) {
      onChange({ labelDesign: currentDesign as unknown as Record<string, unknown> })
    }
    onNext()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="text-center space-y-1.5">
        <div className="flex items-center justify-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#FFE100]/10 border border-[#FFE100]/20">
            <QrCode size={16} className="text-[#FFE100]" />
          </div>
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            Print Studio
          </h2>
        </div>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
          Design your VLYR authentication labels. Each sticker contains a unique
          QR code that links to your verification page.
        </p>
      </div>

      {/* Reusable Label Designer */}
      <LabelDesigner
        initialBusinessName={data.businessName || "Your Business"}
        initialLogoUrl={data.logoUrl ?? null}
        reviewUrl={data.googlePlaceId || ""}
        onDesignChange={handleDesignChange}
      />

      {/* Navigation */}
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="flex-1 h-11 rounded-xl border-border/30 hover:border-border/60 gap-2 text-sm"
        >
          <ArrowLeft size={14} /> Back
        </Button>
        <Button
          type="button"
          onClick={handleContinue}
          className="flex-1 h-11 rounded-xl bg-[#FFE100] text-[#0A0A0A] hover:bg-[#FFE100]/90 font-semibold gap-2 text-sm"
        >
          Continue <ArrowRight size={14} />
        </Button>
      </div>
    </motion.div>
  )
}
