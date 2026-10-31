/**
 * POST /api/activity/seen — the manager has looked at Customer Feedback,
 * so clear the "new ratings" badges.
 */
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  const { error } = await createAdminClient()
    .from("merchants")
    .update({ feedback_seen_at: new Date().toISOString() })
    .eq("id", user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
