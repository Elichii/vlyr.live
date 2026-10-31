/**
 * GET /api/activity/unseen -> { good, bad }
 * Ratings the manager hasn't seen yet (for the sidebar badges).
 */
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ good: 0, bad: 0 }, { status: 401 })

  const admin = createAdminClient()
  const { data: m } = await admin.from("merchants").select("feedback_seen_at").eq("id", user.id).maybeSingle()
  const since = (m?.feedback_seen_at as string | null) ?? "1970-01-01T00:00:00Z"

  const count = (min: number, max: number) =>
    admin
      .from("scans")
      .select("id", { count: "exact", head: true })
      .eq("merchant_id", user.id)
      .gt("created_at", since)
      .gte("rating", min)
      .lte("rating", max)

  const [good, bad] = await Promise.all([count(4, 5), count(1, 3)])
  return NextResponse.json({ good: good.count ?? 0, bad: bad.count ?? 0 })
}
