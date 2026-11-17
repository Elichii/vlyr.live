"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import type { OnboardingData } from "@/lib/onboarding-types"
import { PACKAGES, HARDWARE_PRICES } from "@/lib/onboarding-types"
import { after } from "next/server"
import { sendWelcomeEmail } from "@/lib/email-alerts"

/**
 * Persist plan choice immediately after account creation (Step 2).
 * Belt-and-suspenders alongside the DB trigger -- ensures the choice is
 * locked in even if the trigger missed or the user picked a plan via URL params.
 */
export async function persistPlanChoice(
  userId: string,
  packageId: string,
  billingCycle: string,
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("merchants")
    .update({
      package_id: packageId,
      billing_cycle: billingCycle,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)

  if (error) {
    console.error("[persistPlanChoice] Failed:", error.message)
    return { success: false, error: error.message }
  }

  return { success: true, error: null }
}

/**
 * Persist current onboarding step index so user can resume if they
 * refresh or come back later. Called on every step advance.
 */
export async function persistStepProgress(stepIndex: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false }

  await supabase
    .from("merchants")
    .update({ onboarding_step_index: stepIndex })
    .eq("id", user.id)

  return { success: true }
}

/**
 * Fetch saved onboarding progress for resume-from-where-you-left-off.
 */
export async function fetchOnboardingProgress() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: merchant } = await supabase
    .from("merchants")
    .select("onboarding_step_index, package_id, billing_cycle, google_ownership_verified")
    .eq("id", user.id)
    .single()

  if (!merchant) return null
  return { ...merchant, plan_pending: !!user.user_metadata?.plan_pending }
}

/** A signed-in owner picked their plan on the Plan step. */
export async function chooseSignedInPlan(packageId: string, billingCycle: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Not authenticated. Please sign in again." }
  if (!PACKAGES.some((p) => p.id === packageId)) return { success: false, error: "Please choose a plan." }

  const res = await persistPlanChoice(user.id, packageId, billingCycle === "annual" ? "annual" : "monthly")
  if (!res.success) return res
  await createAdminClient().auth.admin.updateUserById(user.id, {
    user_metadata: { ...(user.user_metadata ?? {}), plan_pending: false, package_id: packageId },
  })
  return { success: true, error: null }
}

export async function persistOnboarding(data: OnboardingData) {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { success: false, error: "Not authenticated. Please sign in again." }
  }

  // 1. Update the merchant profile (row was auto-created by trigger)
  const pkg = PACKAGES.find((p) => p.id === data.packageId)
  const recurringPrice = data.billingCycle === "annual"
    ? (pkg?.annualPrice ?? 0)
    : (pkg?.monthlyPrice ?? 0)

  const hardwareTotal =
    data.stickerQty * HARDWARE_PRICES.stickerRoll +
    (data.acrylicStands ? HARDWARE_PRICES.acrylicStand : 0) +
    (data.safetyDecals ? HARDWARE_PRICES.safetyDecal : 0)

  const { error: merchantError } = await supabase
    .from("merchants")
    .update({
      email: data.email,
      ...(data.username ? { username: data.username } : {}),
      phone: data.phone,
      business_name: data.businessName,
      business_category: data.businessCategory,
      logo_url: data.logoUrl,
      google_place_id: data.googlePlaceId,
      lat: data.lat,
      lng: data.lng,
      ...(data.googleAddress ? { address: data.googleAddress } : {}),
      ...(data.googlePhone ? { google_phone: data.googlePhone } : {}),
      ...(data.googleWebsite ? { google_website: data.googleWebsite } : {}),
      package_id: data.packageId,
      billing_cycle: data.billingCycle,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id)

  if (merchantError) {
    return { success: false, error: `Profile save failed: ${merchantError.message}` }
  }

  // 2. Create the order
  const addr = data.shippingAddress
  const { error: orderError } = await supabase.from("orders").insert({
    merchant_id: user.id,
    order_type: "onboarding",
    package_id: data.packageId,
    billing_cycle: data.billingCycle,
    sticker_qty: data.stickerQty,
    acrylic_stands: data.acrylicStands,
    safety_decals: data.safetyDecals,
    recurring_amount: recurringPrice,
    hardware_amount: hardwareTotal,
    total_amount: recurringPrice + hardwareTotal,
    shipping_street: addr.street,
    shipping_city: addr.city,
    shipping_state: addr.state,
    shipping_zip: addr.zip,
    shipping_country: addr.country,
    status: "confirmed",
  })

  if (orderError) {
    return { success: false, error: `Order save failed: ${orderError.message}` }
  }

  // 3. Create a label batch if the user customized a label design
  if (data.labelDesign) {
    const labelQty = data.stickerQty * 500 // Each sticker roll = 500 labels
    await supabase.from("label_batches").insert({
      merchant_id: user.id,
      quantity: labelQty > 0 ? labelQty : 500,
      status: "pending",
      design_json: data.labelDesign,
    })
  }

  await saveOwnerDetails(user.id, data)
  await markOnboardingComplete(user.id)
  return { success: true, error: null }
}

/**
 * Free trial: save the merchant profile without creating an order or
 * taking payment. Empty fields are left alone (e.g. Google sign-ups skip
 * the email/password step, so their email is already on the account).
 */
export async function persistFreeOnboarding(data: OnboardingData) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return { success: false, error: "Not authenticated. Please sign in again." }
  }

  const fields: Record<string, unknown> = {
    email: data.email,
    ...(data.username ? { username: data.username } : {}),
    phone: data.phone,
    business_name: data.businessName,
    business_category: data.businessCategory,
    logo_url: data.logoUrl,
    google_place_id: data.googlePlaceId,
    lat: data.lat,
    lng: data.lng,
    ...(data.googleAddress ? { address: data.googleAddress } : {}),
    ...(data.googlePhone ? { google_phone: data.googlePhone } : {}),
    ...(data.googleWebsite ? { google_website: data.googleWebsite } : {}),
  }
  const update: Record<string, unknown> = {
    package_id: "free",
    billing_cycle: "monthly",
    updated_at: new Date().toISOString(),
  }
  for (const [key, value] of Object.entries(fields)) {
    if (value !== null && value !== undefined && value !== "") update[key] = value
  }

  const { error } = await supabase.from("merchants").update(update).eq("id", user.id)
  if (error) return { success: false, error: `Profile save failed: ${error.message}` }
  await saveOwnerDetails(user.id, data)
  await markOnboardingComplete(user.id)
  return { success: true, error: null }
}

/** Owner name and role (scripts/013). Saved on their own so setup works even before that script runs. */
async function saveOwnerDetails(merchantId: string, data: OnboardingData) {
  const update: Record<string, string> = {}
  if (data.ownerName?.trim()) update.owner_name = data.ownerName.trim().slice(0, 120)
  if (data.ownerTitle?.trim()) update.owner_title = data.ownerTitle.trim().slice(0, 80)
  if (!Object.keys(update).length) return
  const { error } = await createAdminClient().from("merchants").update(update).eq("id", merchantId)
  if (error) console.error("[onboarding] owner details not saved:", error.message)
}

/** Setup is finished: the dashboard opens from now on (server-only field). */
async function markOnboardingComplete(merchantId: string) {
  const { data, error } = await createAdminClient()
    .from("merchants")
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq("id", merchantId)
    .is("onboarding_completed_at", null)
    .select("id")
  // First time only: welcome email
  if (!error && data?.length) after(() => sendWelcomeEmail(merchantId))
  // Column missing until scripts/012 runs: setup still works as before
  if (error && !/onboarding_completed_at/.test(error.message)) console.error("[onboarding] could not mark complete:", error.message)
}
