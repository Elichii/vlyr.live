/**
 * GET /api/labels/batches/:id/pdf[?paper=letter|a4][&ink=saver|full]
 *
 * Returns the batch as a printable PDF. Paper and ink settings default
 * to what the merchant chose when creating the batch.
 */
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { activeRewardOffer, designLocked, getBatchForPrint, getLabelAllowance, loadStickerLogo, parsePaper, trialDesign, withBusinessName } from "@/lib/label-print"
import { buildLabelSheetPdf, formatSeq } from "@/lib/label-sheet"

export const runtime = "nodejs"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // ?only=unused reprints the stickers nobody has rated yet
  const unusedOnly = request.nextUrl.searchParams.get("only") === "unused"
  const found = await getBatchForPrint(user.id, id, { unusedOnly })
  if (!found || found.labels.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { batch, labels } = found
  const q = request.nextUrl.searchParams
  const paper = q.has("paper") ? parsePaper(q.get("paper")) : parsePaper(batch.paper)
  const inkSaver = q.has("ink") ? q.get("ink") === "saver" : batch.ink_saver

  // Older sheets may have saved the placeholder "Your Business"
  // Free trial: every sheet (old ones too) prints in the standard VLYR design
  const design = designLocked(await getLabelAllowance(user.id)) ? await trialDesign(user.id) : await withBusinessName(user.id, batch.design_json)
  const rewardOffer = await activeRewardOffer(user.id)
  const logo = await loadStickerLogo(user.id, design)
  const pdf = await buildLabelSheetPdf({ design, labels, paper, inkSaver, rewardOffer, logo })
  const name = `vlyr-labels-${formatSeq(batch.first_seq)}-${formatSeq(batch.last_seq)}${unusedOnly ? "-unused" : ""}.pdf`

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${q.get("view") === "1" ? "inline" : "attachment"}; filename="${name}"`,
      "Cache-Control": "private, no-store",
    },
  })
}
