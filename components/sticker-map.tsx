"use client"

import { useEffect, useRef } from "react"
import "leaflet/dist/leaflet.css"
import type * as Leaflet from "leaflet"

export interface MapPoint {
  id: string
  lat: number
  lng: number
  kind: "good" | "bad" | "scan"
  /** Exact (customer shared GPS) or approximate (from their network) */
  precise: boolean
  /** Plain-text lines for the popup (escaped before display) */
  title: string
  lines: string[]
  href?: string
  linkText?: string
}

interface StickerMapProps {
  store: { lat: number; lng: number; name: string } | null
  points: MapPoint[]
  focusId?: string | null
  onSelect?: (id: string) => void
}

const COLORS = { good: "#EAB308", bad: "#EF4444", scan: "#9CA3AF" }

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)

function popupHtml(p: MapPoint) {
  return `<div style="font-family:inherit;min-width:190px;max-width:240px">
    <div style="font-weight:600;font-size:13px;margin-bottom:4px">${esc(p.title)}</div>
    ${p.lines.map((l) => `<div style="font-size:12px;color:#555;line-height:1.45">${esc(l)}</div>`).join("")}
    ${p.href ? `<a href="${esc(p.href)}" style="display:inline-block;margin-top:8px;font-size:12px;font-weight:600;color:#0A0A0A;text-decoration:underline">${esc(p.linkText ?? "Open")}</a>` : ""}
  </div>`
}

const MAP_HEIGHT = "h-[560px] lg:h-[calc(100svh-300px)] lg:min-h-[560px]"
const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY

/**
 * Map of where stickers were scanned. Yellow = 4–5★, red = 1–3★, grey =
 * scanned without a rating; approximate locations get a soft halo.
 *
 * Uses Google Maps when NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY is set (a browser
 * key restricted to the site's domains); otherwise a free street map.
 */
export default function StickerMap(props: StickerMapProps) {
  return GOOGLE_KEY ? <GoogleStickerMap {...props} apiKey={GOOGLE_KEY} /> : <LeafletStickerMap {...props} />
}

/* eslint-disable @typescript-eslint/no-explicit-any */
let googleLoading: Promise<any> | null = null
function loadGoogleMaps(key: string): Promise<any> {
  const w = window as any
  if (w.google?.maps) return Promise.resolve(w.google.maps)
  googleLoading ??= new Promise((resolve, reject) => {
    w.__vlyrMapsReady = () => resolve(w.google.maps)
    const script = document.createElement("script")
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&callback=__vlyrMapsReady`
    script.async = true
    script.onerror = reject
    document.head.appendChild(script)
  })
  return googleLoading
}

function GoogleStickerMap({ store, points, focusId, onSelect, apiKey }: StickerMapProps & { apiKey: string }) {
  const el = useRef<HTMLDivElement>(null)
  const gmap = useRef<any>(null)
  const gm = useRef<any>(null)
  const overlays = useRef<any[]>([])
  const byId = useRef(new Map<string, any>())
  const info = useRef<any>(null)

  const draw = () => {
    const maps = gm.current
    const m = gmap.current
    if (!maps || !m) return
    overlays.current.forEach((o) => o.setMap(null))
    overlays.current = []
    byId.current.clear()
    const bounds = new maps.LatLngBounds()
    let count = 0

    if (store) {
      const mk = new maps.Marker({
        position: { lat: store.lat, lng: store.lng },
        map: m,
        title: `${store.name} (your store)`,
        zIndex: 1000,
        label: { text: "V", color: "#FFE100", fontWeight: "700" },
        icon: { path: maps.SymbolPath.CIRCLE, scale: 15, fillColor: "#0A0A0A", fillOpacity: 1, strokeColor: "#FFE100", strokeWeight: 2 },
      })
      overlays.current.push(mk)
      bounds.extend(mk.getPosition())
      count++
    }

    const ordered = [...points].sort((a, b) => (a.kind === "scan" ? 0 : 1) - (b.kind === "scan" ? 0 : 1))
    for (const p of ordered) {
      const color = COLORS[p.kind]
      if (!p.precise) {
        overlays.current.push(new maps.Circle({ map: m, center: { lat: p.lat, lng: p.lng }, radius: 900, strokeOpacity: 0, fillColor: color, fillOpacity: 0.1, clickable: false }))
      }
      const mk = new maps.Marker({
        position: { lat: p.lat, lng: p.lng },
        map: m,
        title: p.title,
        icon: { path: maps.SymbolPath.CIRCLE, scale: p.kind === "scan" ? 5 : 8, fillColor: color, fillOpacity: p.kind === "scan" ? 0.75 : 1, strokeColor: "#ffffff", strokeWeight: 2 },
      })
      mk.addListener("click", () => {
        info.current?.setContent(popupHtml(p))
        info.current?.open({ map: m, anchor: mk })
        onSelect?.(p.id)
      })
      overlays.current.push(mk)
      byId.current.set(p.id, { marker: mk, point: p })
      bounds.extend(mk.getPosition())
      count++
    }

    if (count > 1) m.fitBounds(bounds, 60)
    else if (count === 1) { m.setCenter(bounds.getCenter()); m.setZoom(14) }
    else { m.setCenter({ lat: 39.5, lng: -98.35 }); m.setZoom(4) }
  }

  useEffect(() => {
    let cancelled = false
    loadGoogleMaps(apiKey).then((maps) => {
      if (cancelled || !el.current || gmap.current) return
      gm.current = maps
      gmap.current = new maps.Map(el.current, {
        center: { lat: 39.5, lng: -98.35 },
        zoom: 4,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        gestureHandling: "cooperative",
      })
      info.current = new maps.InfoWindow()
      draw()
    }).catch(() => {})
    return () => { cancelled = true }
  }, [apiKey]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(draw, [store?.lat, store?.lng, points]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!focusId || !gmap.current) return
    const hit = byId.current.get(focusId)
    if (!hit) return
    gmap.current.panTo(hit.marker.getPosition())
    if (gmap.current.getZoom() < 14) gmap.current.setZoom(14)
    info.current?.setContent(popupHtml(hit.point))
    info.current?.open({ map: gmap.current, anchor: hit.marker })
  }, [focusId])

  return <div ref={el} className={`w-full ${MAP_HEIGHT} rounded-xl overflow-hidden border border-border`} />
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function LeafletStickerMap({ store, points, focusId, onSelect }: StickerMapProps) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<Leaflet.Map | null>(null)
  const L = useRef<typeof Leaflet | null>(null)
  const layer = useRef<Leaflet.LayerGroup | null>(null)
  const markers = useRef(new Map<string, Leaflet.CircleMarker>())

  // Create the map once
  useEffect(() => {
    let cancelled = false
    import("leaflet").then((mod) => {
      if (cancelled || !el.current || map.current) return
      L.current = mod
      const m = mod.map(el.current, { zoomControl: true, scrollWheelZoom: false, attributionControl: true })
      mod
        // Free OpenStreetMap tiles until a Google Maps browser key is set
        .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        })
        .addTo(m)
      m.on("focus", () => m.scrollWheelZoom.enable())
      m.on("blur", () => m.scrollWheelZoom.disable())
      layer.current = mod.layerGroup().addTo(m)
      map.current = m
      draw()
      // The map's height comes from the page layout: measure again once it has settled
      setTimeout(() => { m.invalidateSize(); draw() }, 250)
    })
    return () => {
      cancelled = true
      map.current?.remove()
      map.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Redraw markers when the data changes
  const draw = () => {
    const mod = L.current
    const m = map.current
    const group = layer.current
    if (!mod || !m || !group) return
    group.clearLayers()
    markers.current.clear()
    const bounds: [number, number][] = []

    if (store) {
      const icon = mod.divIcon({
        className: "",
        html: `<div title="${esc(store.name)}" style="width:30px;height:30px;border-radius:9px;background:#0A0A0A;border:2px solid #FFE100;display:flex;align-items:center;justify-content:center;color:#FFE100;font:700 15px/1 sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.35)">V</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      })
      mod.marker([store.lat, store.lng], { icon, zIndexOffset: 1000 }).bindTooltip(esc(store.name) + " (your store)").addTo(group)
      bounds.push([store.lat, store.lng])
    }

    // Grey scans first so ratings sit on top
    const ordered = [...points].sort((a, b) => (a.kind === "scan" ? 0 : 1) - (b.kind === "scan" ? 0 : 1))
    for (const p of ordered) {
      const color = COLORS[p.kind]
      if (!p.precise) {
        mod.circle([p.lat, p.lng], { radius: 900, color, weight: 0, fillColor: color, fillOpacity: 0.08, interactive: false }).addTo(group)
      }
      const mk = mod
        .circleMarker([p.lat, p.lng], {
          radius: p.kind === "scan" ? 5 : 8,
          color: "#fff",
          weight: 2,
          fillColor: color,
          fillOpacity: p.kind === "scan" ? 0.7 : 0.95,
        })
        .bindPopup(popupHtml(p))
        .on("click", () => onSelect?.(p.id))
        .addTo(group)
      markers.current.set(p.id, mk)
      bounds.push([p.lat, p.lng])
    }

    if (bounds.length > 1) m.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 })
    else if (bounds.length === 1) m.setView(bounds[0], 13)
    else m.setView([39.5, -98.35], 4) // whole US until there's data
  }

  useEffect(draw, [store?.lat, store?.lng, points]) // eslint-disable-line react-hooks/exhaustive-deps

  // Zoom to a sticker picked in the table
  useEffect(() => {
    if (!focusId || !map.current) return
    const mk = markers.current.get(focusId)
    if (mk) {
      map.current.setView(mk.getLatLng(), Math.max(map.current.getZoom(), 14), { animate: true })
      mk.openPopup()
    }
  }, [focusId])

  return <div ref={el} className={`w-full ${MAP_HEIGHT} rounded-xl overflow-hidden border border-border z-0`} />
}
