"use client"

import { motion } from "framer-motion"
import useSWR from "swr"
import { Check, Mail, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { FREE_STICKER_LIMIT, PACKAGES, PLAN_FEATURES } from "@/lib/onboarding-types"

const SALES_EMAIL = "hello@vlyr.app"

async function fetchMerchant() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from("merchants").select("business_name, package_id, email, is_provisioned").eq("id", user.id).single()
  return data
}

/**
 * Upgrade from the free trial. Online checkout isn't live yet, so each plan
 * opens a pre-filled email to the VLYR team, who switch the account over.
 */
export default function UpgradePage() {
  const { data: merchant } = useSWR("merchant-upgrade", fetchMerchant)
  const paid = PACKAGES.filter((p) => p.id !== "free")

  const mailto = (planName: string) => {
    const subject = `Upgrade to ${planName}${merchant?.business_name ? ` – ${merchant.business_name}` : ""}`
    const body = [
      `Hi VLYR team,`,
      ``,
      `I'd like to upgrade to the ${planName} plan.`,
      ``,
      `Business: ${merchant?.business_name ?? ""}`,
      `Account email: ${merchant?.email ?? ""}`,
    ].join("\n")
    return `mailto:${SALES_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
          <Zap size={22} className="text-[#FFE100]" /> Upgrade your plan
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {merchant?.package_id === "free"
            ? `Your free trial includes ${FREE_STICKER_LIMIT} stickers. Upgrade to print as many as you need.`
            : merchant && !merchant.is_provisioned
              ? `Your plan activates once payment is confirmed. Until then you have the ${FREE_STICKER_LIMIT}-sticker trial.`
              : "Compare plans and switch any time."}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {paid.map((pkg) => {
          const chosen = merchant?.package_id === pkg.id
          // Paid plans count as current only once payment is confirmed
          const current = chosen && merchant?.is_provisioned === true
          return (
            <div key={pkg.id} className={`bg-card rounded-2xl border p-5 flex flex-col gap-4 ${pkg.id === "growth" ? "border-[#FFE100]/40" : "border-border"}`}>
              <div>
                <p className="text-sm font-bold text-foreground">{pkg.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{pkg.tagline}</p>
              </div>
              <p className="text-3xl font-bold text-foreground">
                ${pkg.monthlyPrice}
                <span className="text-sm font-normal text-muted-foreground">/mo</span>
              </p>
              <ul className="space-y-2 flex-1">
                <li className="flex items-center gap-2 text-sm text-foreground">
                  <Check size={14} className="text-[#FFE100] shrink-0" /> Unlimited printable stickers
                </li>
                {(PLAN_FEATURES[pkg.id] ?? []).filter((f) => f.included).map((f) => (
                  <li key={f.label} className="flex items-center gap-2 text-sm text-foreground">
                    <Check size={14} className="text-[#FFE100] shrink-0" /> {f.label}
                  </li>
                ))}
              </ul>
              {current ? (
                <Button disabled className="w-full rounded-xl">Current plan</Button>
              ) : (
                <a href={mailto(pkg.name)}>
                  <Button className={`w-full rounded-xl gap-2 font-semibold ${pkg.id === "growth" ? "bg-[#FFE100] text-[#111] hover:bg-[#FFE100]/90" : ""}`}>
                    <Mail size={14} /> {chosen ? `Activate ${pkg.name}` : `Upgrade to ${pkg.name}`}
                  </Button>
                </a>
              )}
            </div>
          )
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        Clicking upgrade opens an email to {SALES_EMAIL}. We&apos;ll switch your account over and send an invoice, usually
        within one business day.
      </p>
    </motion.div>
  )
}
