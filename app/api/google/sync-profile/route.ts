/**
 * POST /api/google/sync-profile { overwrite?: boolean }
 * Fill the signed-in merchant's Business Profile from their verified Google
 * business. Without overwrite, only empty fields are filled.
 */
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { syncProfileFromGoogle } from "@/lib/google/profile-sync"

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  try {
    const result = await syncProfileFromGoogle(user.id, { overwrite: body.overwrite === true })
    return NextResponse.json(result, { status: result.skipped ? 422 : 200 })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Sync failed" }, { status: 500 })
  }
}
