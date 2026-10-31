/**
 * GET /api/labels/preview?code=V-XXXXXXXX
 *
 * Returns a real, scannable QR code (SVG) for the given short code.
 */
import { NextRequest, NextResponse } from "next/server"
import QRCode from "qrcode"
import { buildScanUrl } from "@/lib/short-code"

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code") ?? "V-PREVIEW1"
  const svg = await QRCode.toString(buildScanUrl(code), {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 2,
    width: 200,
  })

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=3600",
    },
  })
}
