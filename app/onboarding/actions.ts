"use server"

import { createClient } from "@/lib/supabase/server"
import type { OnboardingData } from "@/lib/onboarding-types"
import { PACKAGES, HARDWARE_PRICES } from "@/lib/onboarding-types"

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
    .select("onboarding_step_index, package_id, billing_cycle")
    .eq("id", user.id)
    .single()

  return merchant
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
      username: data.username,
      phone: data.phone,
      business_name: data.businessName,
      business_category: data.businessCategory,
      logo_url: data.logoUrl,
      google_place_id: data.googlePlaceId,
      lat: data.lat,
      lng: data.lng,
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

  return { success: true, error: null }
}
