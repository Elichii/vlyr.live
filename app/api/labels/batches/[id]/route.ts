/**
 * PATCH /api/labels/batches/:id  { design }
 *
 * Restyles an existing sheet. The QR codes and numbers stay exactly the same
 * (nothing new is created, so it doesn't count against the free trial);
 * only the look of future reprints changes.
 */
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { designLocked, getLabelAllowance, sanitizeDesign } from "@/lib/label-print"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (designLocked(await getLabelAllowance(user.id))) {
    return NextResponse.json({ error: "Customising stickers is part of paid plans. Upgrade to use your own design.", code: "upgrade" }, { status: 403 })
  }
  const body = (await request.json().catch(() => ({}))) as { design?: unknown }
  const design = sanitizeDesign(body.design, user.id)

  const { data, error } = await createAdminClient()
    .from("label_batches")
    .update({ design_json: design })
    .eq("id", id)
    .eq("merchant_id", user.id)
    .select("id")
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data?.length) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ ok: true })
}
