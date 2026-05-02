"use client"

import { useCallback, useRef, useState } from "react"
import { MapPin } from "lucide-react"

interface ProfileMapProps {
  center: [number, number]
  markerPosition: [number, number] | null
  onMapClick: (lat: number, lng: number) => void
}

/**
 * Google Maps embed using the free Embed API (no key needed for place/view mode).
 * Falls back to an interactive click-to-pin overlay when the user wants to fine-tune.
 */
export default function ProfileMap({
  center,
  markerPosition,
  onMapClick,
}: ProfileMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [pinMode, setPinMode] = useState(false)

  const lat = markerPosition?.[0] ?? center[0]
  const lng = markerPosition?.[1] ?? center[1]
  const hasMarker = !!markerPosition

  // Build Google Maps embed URL
  const embedSrc = hasMarker
    ? `https://maps.google.com/maps?q=${lat},${lng}&z=16&output=embed`
    : `https://maps.google.com/maps?q=${center[0]},${center[1]}&z=13&output=embed`

  // Handle click-to-pin on the overlay
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const xPct = (e.clientX - rect.left) / rect.width
      const yPct = (e.clientY - rect.top) / rect.height

      // Approximate: convert click position to lat/lng offset from center
      // Google Maps embed at zoom 16 shows roughly 0.01 degrees
      const zoomSpan = hasMarker ? 0.008 : 0.04
      const newLat = center[0] + zoomSpan * (0.5 - yPct)
      const newLng = center[1] + zoomSpan * (xPct - 0.5)

      onMapClick(newLat, newLng)
      setPinMode(false)
    },
    [center, hasMarker, onMapClick],
  )

  return (
    <div className="relative" ref={containerRef}>
      <iframe
        title="Business Location"
        src={embedSrc}
        className="w-full h-64 md:h-80 border-0 rounded-xl"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />

      {/* Pin mode overlay */}
      {pinMode && (
        <div
          className="absolute inset-0 bg-foreground/10 backdrop-blur-[1px] rounded-xl cursor-crosshair flex items-center justify-center z-10"
          onClick={handleOverlayClick}
        >
          <div className="bg-card/90 backdrop-blur-sm border border-border px-4 py-2.5 rounded-xl shadow-lg pointer-events-none">
            <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <MapPin size={14} className="text-[#FFE100]" />
              Click anywhere to place your pin
            </p>
          </div>
        </div>
      )}

      {/* Pin mode toggle */}
      {!pinMode && (
        <button
          type="button"
          onClick={() => setPinMode(true)}
          className="absolute bottom-3 right-3 z-10 bg-card/90 backdrop-blur-sm border border-border px-3 py-1.5 rounded-lg shadow-lg text-xs font-medium text-foreground hover:bg-[#FFE100]/10 hover:border-[#FFE100]/30 transition-all flex items-center gap-1.5"
        >
          <MapPin size={12} className="text-[#FFE100]" />
          {hasMarker ? "Move Pin" : "Drop Pin"}
        </button>
      )}

      {/* Coordinates badge */}
      {hasMarker && (
        <div className="absolute top-3 left-3 z-10 bg-card/90 backdrop-blur-sm border border-border px-2.5 py-1 rounded-lg shadow">
          <p className="text-[10px] font-mono text-muted-foreground">
            {lat.toFixed(5)}, {lng.toFixed(5)}
          </p>
        </div>
      )}
    </div>
  )
}
