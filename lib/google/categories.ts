/**
 * Google place types -> the VLYR business categories in the onboarding
 * dropdown (BUSINESS_CATEGORIES). One list, so every screen agrees.
 */
import { BUSINESS_CATEGORIES } from "@/lib/onboarding-types"

type Category = (typeof BUSINESS_CATEGORIES)[number]

const TYPE_TO_CATEGORY: Record<string, Category> = {
  laundry: "Dry Cleaning / Laundry",
  dry_cleaner: "Dry Cleaning / Laundry",
  restaurant: "Restaurant / Cafe",
  cafe: "Restaurant / Cafe",
  bakery: "Restaurant / Cafe",
  bar: "Restaurant / Cafe",
  meal_takeaway: "Restaurant / Cafe",
  meal_delivery: "Restaurant / Cafe",
  food: "Restaurant / Cafe",
  hair_care: "Barbershop / Salon",
  beauty_salon: "Barbershop / Salon",
  spa: "Barbershop / Salon",
  car_repair: "Auto Repair / Detailing",
  car_wash: "Auto Repair / Detailing",
  car_dealer: "Auto Repair / Detailing",
  dentist: "Medical / Dental",
  doctor: "Medical / Dental",
  hospital: "Medical / Dental",
  pharmacy: "Medical / Dental",
  physiotherapist: "Medical / Dental",
  veterinary_care: "Medical / Dental",
  health: "Medical / Dental",
  gym: "Fitness / Gym",
  lodging: "Hotel / Hospitality",
  lawyer: "Professional Services",
  accounting: "Professional Services",
  insurance_agency: "Professional Services",
  real_estate_agency: "Professional Services",
  bank: "Professional Services",
  finance: "Professional Services",
  plumber: "Home Services",
  electrician: "Home Services",
  locksmith: "Home Services",
  painter: "Home Services",
  roofing_contractor: "Home Services",
  general_contractor: "Home Services",
  moving_company: "Home Services",
  store: "Retail Store",
  clothing_store: "Retail Store",
  shoe_store: "Retail Store",
  jewelry_store: "Retail Store",
  shopping_mall: "Retail Store",
  florist: "Retail Store",
  book_store: "Retail Store",
  convenience_store: "Retail Store",
  supermarket: "Retail Store",
}

/** First Google type we recognise, in Google's order (most specific first). */
export function categoryFromTypes(types: string[] | undefined | null): Category | null {
  for (const t of types ?? []) if (TYPE_TO_CATEGORY[t]) return TYPE_TO_CATEGORY[t]
  return null
}

/** Accepts an old/variant label (e.g. "Laundry / Dry Cleaning") and returns the dropdown value. */
export function normalizeCategory(label: string | null | undefined): Category | "" {
  if (!label) return ""
  const exact = BUSINESS_CATEGORIES.find((c) => c.toLowerCase() === label.toLowerCase())
  if (exact) return exact
  const words = label.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 3)
  return BUSINESS_CATEGORIES.find((c) => words.some((w) => c.toLowerCase().includes(w))) ?? "Other"
}
