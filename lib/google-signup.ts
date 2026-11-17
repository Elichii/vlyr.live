/**
 * Sign up / sign in with Google.
 *
 * Google tells us who the person is (verified email + name). We find the
 * matching VLYR merchant or create one, then log them in with a one-time
 * token, so no password is needed.
 *
 * Server-only: uses the service-role Supabase client.
 */
import { createAdminClient } from "@/lib/supabase/admin"
import { PACKAGES, PLAN_ALIASES } from "@/lib/onboarding-types"

export const SIGNUP_NONCE_COOKIE = "vlyr_google_signup"
const STATE_PREFIX = "signup_"
/** Signed up without picking a plan (e.g. from the login page): setup asks for one first. */
export const PLAN_NOT_CHOSEN = "choose"

export interface SignupState {
  plan: string
  cycle: "monthly" | "annual"
  ref: string
  nonce: string
}

export function encodeSignupState(s: SignupState) {
  return STATE_PREFIX + Buffer.from(JSON.stringify(s)).toString("base64url")
}

export function decodeSignupState(state: string | null): SignupState | null {
  if (!state?.startsWith(STATE_PREFIX)) return null
  try {
    const s = JSON.parse(Buffer.from(state.slice(STATE_PREFIX.length), "base64url").toString("utf8"))
    if (typeof s?.nonce !== "string") return null
    return {
      plan: s.plan === PLAN_NOT_CHOSEN ? PLAN_NOT_CHOSEN : normalizePlan(s.plan),
      cycle: s.cycle === "annual" ? "annual" : "monthly",
      ref: typeof s.ref === "string" ? s.ref.slice(0, 64) : "",
      nonce: s.nonce,
    }
  } catch {
    return null
  }
}

export function normalizePlan(plan: unknown): string {
  const p = typeof plan === "string" ? (PLAN_ALIASES[plan] ?? plan) : "free"
  return PACKAGES.some((pkg) => pkg.id === p) ? p : "free"
}

export interface GoogleMerchant {
  userId: string
  email: string
  isNew: boolean
  /** Finished onboarding before (has a business name) */
  onboarded: boolean
}

/** Find the merchant for a Google-verified email, or create a new account. */
export async function findOrCreateGoogleMerchant(opts: {
  email: string
  name: string
  plan: string
  cycle: "monthly" | "annual"
  ref: string
}): Promise<GoogleMerchant> {
  const admin = createAdminClient()
  const email = opts.email.trim().toLowerCase()

  const existing = await findMerchantByEmail(email)
  if (existing) return { ...existing, email, isNew: false }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true, // Google already verified this address
    user_metadata: {
      username: usernameFrom(email),
      full_name: opts.name,
      ...(opts.plan === PLAN_NOT_CHOSEN ? { plan_pending: true } : { package_id: opts.plan, billing_cycle: opts.cycle }),
      invite_ref: opts.ref || null,
      signup_method: "google",
    },
  })

  if (error || !data.user) {
    // The auth user may exist without a merchant row lookup match (e.g. email case)
    const again = await findMerchantByEmail(email)
    if (again) return { ...again, email, isNew: false }
    throw new Error(`Could not create account: ${error?.message ?? "unknown error"}`)
  }

  // The signup trigger creates the merchant row; make sure the plan is set
  if (opts.plan !== PLAN_NOT_CHOSEN) await admin
    .from("merchants")
    .update({ package_id: opts.plan, billing_cycle: opts.cycle, updated_at: new Date().toISOString() })
    .eq("id", data.user.id)

  return { userId: data.user.id, email, isNew: true, onboarded: false }
}

async function findMerchantByEmail(email: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from("merchants")
    .select("id, business_name")
    .eq("email", email)
    .limit(1)
    .maybeSingle()
  if (data) return { userId: data.id as string, onboarded: !!data.business_name }

  // Older rows may store the email with different casing
  const { data: ci } = await admin
    .from("merchants")
    .select("id, business_name, email")
    .ilike("email", email.replace(/[\\%_]/g, (c) => `\\${c}`))
    .limit(1)
    .maybeSingle()
  return ci ? { userId: ci.id as string, onboarded: !!ci.business_name } : null
}

/** One-time token that logs the user in (exchanged with verifyOtp). */
export async function createLoginTokenHash(email: string): Promise<string> {
  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email })
  const hash = data?.properties?.hashed_token
  if (error || !hash) throw new Error(`Could not start session: ${error?.message ?? "no token"}`)
  return hash
}

function usernameFrom(email: string) {
  const base = email.split("@")[0].replace(/[^a-z0-9_]/gi, "").slice(0, 20) || "merchant"
  return `${base}${Math.floor(Math.random() * 900 + 100)}`
}
