/**
 * Print-at-home label batches for the signed-in merchant.
 *
 * GET  /api/labels/batches  -> { batches, allowance }
 * POST /api/labels/batches  { quantity, design, paper, inkSaver } -> { batch, allowance }
 *      402 { code: "free_limit" } when a free trial runs out of stickers
 *
 * Download the PDF with GET /api/labels/batches/:id/pdf
 */
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  LabelLimitError,
  createSelfPrintBatch,
  getLabelAllowance,
  listSelfPrintBatches,
  parsePaper,
  sanitizeDesign,
} from "@/lib/label-print"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  try {
    const [batches, allowance] = await Promise.all([listSelfPrintBatches(user.id), getLabelAllowance(user.id)])
    return NextResponse.json({ batches, allowance })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to load labels" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  try {
    const batch = await createSelfPrintBatch({
      merchantId: user.id,
      quantity: Number(body.quantity),
      design: sanitizeDesign(body.design, user.id),
      paper: parsePaper(body.paper),
      inkSaver: body.inkSaver === true,
    })
    return NextResponse.json({ batch, allowance: await getLabelAllowance(user.id) }, { status: 201 })
  } catch (e) {
    if (e instanceof LabelLimitError) {
      return NextResponse.json({ error: e.message, code: "free_limit" }, { status: 402 })
    }
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to create labels" }, { status: 400 })
  }
}
