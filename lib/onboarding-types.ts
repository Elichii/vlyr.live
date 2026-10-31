export interface OnboardingData {
  // Phase 1: Auth
  userId: string | null
  email: string
  username: string
  password: string
  phone: string
  otpVerified: boolean

  // Phase 2: Business Identity
  businessName: string
  businessCategory: string
  logoUrl: string | null
  googlePlaceId: string
  googleAccountName: string
  googleRating: number | null
  googleReviewCount: number | null
  googleAddress: string
  googlePhone: string
  googleWebsite: string
  lat: number | null
  lng: number | null

  // Google auth state
  googleConnected: boolean                            // true = OAuth done; false = manual/skipped
  googleReviewsSnapshot: ReviewSnapshot[] | null      // actual reviews fetched at verification time

  // Phase 3: Supply
  stickerQty: number
  acrylicStands: boolean
  safetyDecals: boolean
  shippingAddress: ShippingAddress
  sameAsBusiness: boolean

  // Phase 3b: Print Studio
  labelDesign: Record<string, unknown> | null

  // Phase 4: Payment
  packageId: string
  billingCycle: "monthly" | "annual"
}

export interface ReviewSnapshot {
  author: string
  rating: number
  text: string
  relativeTime: string
}

export interface ShippingAddress {
  street: string
  city: string
  state: string
  zip: string
  country: string
}

export interface FeatureItem {
  label: string
  included: boolean
}

/** Stickers a free-trial business can download in total. */
export const FREE_STICKER_LIMIT = 15

export const PLAN_FEATURES: Record<string, FeatureItem[]> = {
  free: [
    { label: `${FREE_STICKER_LIMIT} printable QR stickers`, included: true },
    { label: "Reputation Shield", included: true },
    { label: "Private feedback inbox", included: true },
    { label: "Google review boosting", included: true },
    { label: "Burn-Code Rewards", included: false },
    { label: "CRM Dashboard", included: false },
  ],
  starter: [
    { label: "Reputation Shield", included: true },
    { label: "100 QR Scans / mo", included: true },
    { label: "Burn-Code Rewards", included: false },
    { label: "Direct Ordering", included: false },
    { label: "CRM Dashboard", included: false },
    { label: "Commission-Killer", included: false },
  ],
  growth: [
    { label: "Reputation Shield", included: true },
    { label: "Unlimited Scans", included: true },
    { label: "Burn-Code Rewards", included: true },
    { label: "CRM Dashboard", included: true },
    { label: "Commission-Killer", included: true },
    { label: "Priority Support", included: true },
  ],
  enterprise: [
    { label: "Everything in Growth", included: true },
    { label: "Multi-Location Support", included: true },
    { label: "White-Label Branding", included: true },
    { label: "Dedicated Account Mgr", included: true },
    { label: "Custom Integrations", included: true },
    { label: "SLA Guarantee", included: true },
  ],
}

export const PACKAGES = [
  {
    id: "free",
    name: "Free Trial",
    monthlyPrice: 0,
    annualPrice: 0,
    tagline: `Try VLYR with ${FREE_STICKER_LIMIT} free stickers`,
  },
  {
    id: "starter",
    name: "Starter",
    monthlyPrice: 49,
    annualPrice: 39,
    tagline: "For businesses getting started",
  },
  {
    id: "growth",
    name: "Growth",
    monthlyPrice: 99,
    annualPrice: 79,
    tagline: "Best value for growing businesses",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    monthlyPrice: 249,
    annualPrice: 199,
    tagline: "For multi-location empires",
  },
] as const

/** Plan names used on the marketing site that differ from the app. */
export const PLAN_ALIASES: Record<string, string> = { intelligence: "enterprise" }

export const isFreePlan = (packageId: string | null | undefined) => packageId === "free"

export const HARDWARE_PRICES = {
  stickerRoll: 49,
  acrylicStand: 15,
  safetyDecal: 10,
} as const

export const BUSINESS_CATEGORIES = [
  "Dry Cleaning / Laundry",
  "Restaurant / Cafe",
  "Barbershop / Salon",
  "Auto Repair / Detailing",
  "Retail Store",
  "Medical / Dental",
  "Fitness / Gym",
  "Professional Services",
  "Home Services",
  "Hotel / Hospitality",
  "Other",
] as const

export const DEFAULT_ONBOARDING: OnboardingData = {
  userId: null,
  email: "",
  username: "",
  password: "",
  phone: "",
  otpVerified: false,
  businessName: "",
  businessCategory: "",
  logoUrl: null,
  googlePlaceId: "",
  googleAccountName: "",
  googleRating: null,
  googleReviewCount: null,
  googleAddress: "",
  googlePhone: "",
  googleWebsite: "",
  lat: null,
  lng: null,
  googleConnected: false,
  googleReviewsSnapshot: null,
  stickerQty: 1,
  acrylicStands: false,
  safetyDecals: false,
  shippingAddress: { street: "", city: "", state: "", zip: "", country: "US" },
  sameAsBusiness: false,
  labelDesign: null,
  packageId: "growth",
  billingCycle: "monthly",
}
