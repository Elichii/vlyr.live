"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  CheckCircle2, ShieldCheck, Star, MapPin, Phone, Globe, 
  Building2, ArrowRight, Sparkles, Clock
} from "lucide-react"
import { Button } from "@/components/ui/button"
import dynamic from "next/dynamic"

const ProfileMap = dynamic(() => import("@/components/profile-map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-32 rounded-xl bg-secondary/50 animate-pulse" />
  ),
})

interface BusinessData {
  businessName: string
  address: string
  phone: string | null
  website: string | null
  category: string
  rating: number | null
  totalReviews: number
  logoUrl: string | null
  lat: number | null
  lng: number | null
  openingHours?: string[] | null
}

interface VerificationSuccessProps {
  businessData: BusinessData
  onContinue: () => void
}

export function VerificationSuccess({ businessData, onContinue }: VerificationSuccessProps) {
  const [showContent, setShowContent] = useState(false)
  const [showMap, setShowMap] = useState(false)

  useEffect(() => {
    // Animate content appearance
    const timer1 = setTimeout(() => setShowContent(true), 600)
    const timer2 = setTimeout(() => setShowMap(true), 1200)
    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
    }
  }, [])

  const mapCenter: [number, number] = businessData.lat && businessData.lng 
    ? [businessData.lat, businessData.lng] 
    : [37.7749, -122.4194]
  
  const markerPosition: [number, number] | null = businessData.lat && businessData.lng 
    ? [businessData.lat, businessData.lng] 
    : null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative w-full max-w-lg bg-gradient-to-b from-background to-card rounded-3xl border border-border overflow-hidden shadow-2xl"
      >
        {/* Confetti-like decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ delay: 0.3 }}
            className="absolute -top-20 -left-20 w-60 h-60 bg-green-500/20 rounded-full blur-3xl"
          />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            transition={{ delay: 0.5 }}
            className="absolute -bottom-20 -right-20 w-60 h-60 bg-[#FFE100]/20 rounded-full blur-3xl"
          />
        </div>

        {/* Success Animation */}
        <div className="relative pt-8 pb-4 flex flex-col items-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", damping: 15, stiffness: 300, delay: 0.1 }}
            className="relative"
          >
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/30">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3 }}
              >
                <CheckCircle2 size={40} className="text-white" strokeWidth={2.5} />
              </motion.div>
            </div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: "spring" }}
              className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-[#FFE100] flex items-center justify-center shadow-lg"
            >
              <ShieldCheck size={16} className="text-black" />
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-4 text-center"
          >
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2 justify-center">
              <Sparkles size={18} className="text-[#FFE100]" />
              Verification Complete!
              <Sparkles size={18} className="text-[#FFE100]" />
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Your business ownership has been confirmed
            </p>
          </motion.div>
        </div>

        {/* Business Card */}
        <AnimatePresence>
          {showContent && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="px-6 pb-4"
            >
              <div className="bg-secondary/50 rounded-2xl border border-border p-4">
                {/* Header with logo and name */}
                <div className="flex items-start gap-3 mb-4">
                  {businessData.logoUrl ? (
                    <img 
                      src={businessData.logoUrl} 
                      alt={businessData.businessName}
                      className="w-14 h-14 rounded-xl object-cover border border-border"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#FFE100]/20 to-[#FFE100]/5 flex items-center justify-center border border-[#FFE100]/20">
                      <Building2 size={24} className="text-[#FFE100]" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-lg truncate">
                      {businessData.businessName}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate">
                      {businessData.category}
                    </p>
                    {businessData.rating && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className="flex items-center gap-0.5">
                          {[1,2,3,4,5].map(i => (
                            <Star 
                              key={i} 
                              size={12} 
                              className={i <= Math.round(businessData.rating!) ? "text-[#FFE100] fill-[#FFE100]" : "text-muted-foreground/30"} 
                            />
                          ))}
                        </div>
                        <span className="text-xs font-medium text-foreground">{businessData.rating}</span>
                        <span className="text-xs text-muted-foreground">({businessData.totalReviews} reviews)</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Business details */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <MapPin size={14} className="text-muted-foreground mt-0.5 shrink-0" />
                    <span className="text-muted-foreground text-xs">{businessData.address}</span>
                  </div>
                  {businessData.phone && (
                    <div className="flex items-center gap-2">
                      <Phone size={14} className="text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground text-xs">{businessData.phone}</span>
                    </div>
                  )}
                  {businessData.website && (
                    <div className="flex items-center gap-2">
                      <Globe size={14} className="text-muted-foreground shrink-0" />
                      <span className="text-xs text-[#FFE100] truncate">{businessData.website}</span>
                    </div>
                  )}
                  {businessData.openingHours && businessData.openingHours.length > 0 && (
                    <div className="flex items-start gap-2">
                      <Clock size={14} className="text-muted-foreground mt-0.5 shrink-0" />
                      <span className="text-muted-foreground text-xs">
                        {businessData.openingHours[new Date().getDay()] || businessData.openingHours[0]}
                      </span>
                    </div>
                  )}
                </div>

                {/* Map preview */}
                <AnimatePresence>
                  {showMap && businessData.lat && businessData.lng && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      transition={{ duration: 0.4 }}
                      className="mt-4 rounded-xl overflow-hidden border border-border"
                    >
                      <div className="h-28">
                        <ProfileMap
                          center={mapCenter}
                          markerPosition={markerPosition}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* What's Next */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="px-6 pb-6"
        >
          <div className="text-center mb-4">
            <p className="text-xs text-muted-foreground">
              Next: View your reputation analysis and improvement roadmap
            </p>
          </div>
          <Button
            onClick={onContinue}
            className="w-full h-12 rounded-xl bg-[#FFE100] hover:bg-[#FFE100]/90 text-black font-semibold text-base transition-all"
          >
            View Reputation Analysis
            <ArrowRight size={18} className="ml-2" />
          </Button>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
