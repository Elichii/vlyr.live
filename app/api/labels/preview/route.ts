/**
 * GET /api/labels/preview?code=V-XXXXXXXX
 *
 * Returns a QR code as SVG for the given short code.
 * Used by the Print Studio canvas to render live QR previews.
 */
import { NextRequest, NextResponse } from "next/server"
import { buildScanUrl } from "@/lib/short-code"

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code") ?? "V-PREVIEW1"
  const scanUrl = buildScanUrl(code)

  // Generate a simple QR-code-like SVG pattern
  // In production, replace with a real QR library (qrcode package)
  const size = 200
  const svg = generateQRSvg(scanUrl, size)

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=3600",
    },
  })
}

/**
 * Deterministic SVG QR pattern from a URL string.
 * This generates a visually representative QR-like grid.
 * For production, use the `qrcode` npm package for real QR encoding.
 */
function generateQRSvg(url: string, size: number): string {
  const modules = 21 // QR version 1 is 21x21
  const cellSize = size / modules

  // Hash the URL to generate a deterministic pattern
  let hash = 0
  for (let i = 0; i < url.length; i++) {
    hash = ((hash << 5) - hash + url.charCodeAt(i)) | 0
  }

  let cells = ""

  // Finder patterns (top-left, top-right, bottom-left)
  const finderPositions = [
    [0, 0],
    [14, 0],
    [0, 14],
  ]

  for (const [fx, fy] of finderPositions) {
    // Outer ring
    for (let i = 0; i < 7; i++) {
      cells += `<rect x="${(fx + i) * cellSize}" y="${fy * cellSize}" width="${cellSize}" height="${cellSize}" fill="#000"/>`
      cells += `<rect x="${(fx + i) * cellSize}" y="${(fy + 6) * cellSize}" width="${cellSize}" height="${cellSize}" fill="#000"/>`
      cells += `<rect x="${fx * cellSize}" y="${(fy + i) * cellSize}" width="${cellSize}" height="${cellSize}" fill="#000"/>`
      cells += `<rect x="${(fx + 6) * cellSize}" y="${(fy + i) * cellSize}" width="${cellSize}" height="${cellSize}" fill="#000"/>`
    }
    // Inner square
    for (let dx = 2; dx < 5; dx++) {
      for (let dy = 2; dy < 5; dy++) {
        cells += `<rect x="${(fx + dx) * cellSize}" y="${(fy + dy) * cellSize}" width="${cellSize}" height="${cellSize}" fill="#000"/>`
      }
    }
  }

  // Data area: deterministic from hash
  let seed = Math.abs(hash)
  for (let y = 0; y < modules; y++) {
    for (let x = 0; x < modules; x++) {
      // Skip finder pattern areas
      if ((x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12)) continue
      // Timing patterns
      if (x === 6 || y === 6) {
        if ((x + y) % 2 === 0) {
          cells += `<rect x="${x * cellSize}" y="${y * cellSize}" width="${cellSize}" height="${cellSize}" fill="#000"/>`
        }
        continue
      }
      // Pseudo-random data modules
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      if (seed % 3 !== 0) {
        cells += `<rect x="${x * cellSize}" y="${y * cellSize}" width="${cellSize}" height="${cellSize}" fill="#000"/>`
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" fill="white"/>
  ${cells}
</svg>`
}
