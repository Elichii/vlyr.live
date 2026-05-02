"use server"

import { createAdminClient } from "@/lib/supabase/admin"

interface SignupPayload {
  email: string
  password: string
  username: string
  phone: string
  packageId: string
  billingCycle: string
}

export async function serverSignUp(payload: SignupPayload) {
  const admin = createAdminClient()

  // Create the user with admin API -- auto-confirms email, no confirmation email sent
  const { data, error } = await admin.auth.admin.createUser({
    email: payload.email,
    password: payload.password,
    email_confirm: true, // Auto-confirm -- no email sent, no rate limit
    user_metadata: {
      username: payload.username,
      phone: payload.phone,
      package_id: payload.packageId,
      billing_cycle: payload.billingCycle,
    },
  })

  if (error) {
    // Friendly error messages
    const msg = error.message.toLowerCase()
    if (msg.includes("already") || msg.includes("exists") || msg.includes("duplicate")) {
      return { success: false, userId: null, error: "This email is already registered. Please use the login page." }
    }
    return { success: false, userId: null, error: error.message }
  }

  if (!data.user) {
    return { success: false, userId: null, error: "Account creation failed. Please try again." }
  }

  return { success: true, userId: data.user.id, error: null }
}
