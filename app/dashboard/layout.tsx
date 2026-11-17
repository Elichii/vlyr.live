"use client"

import type React from "react"
import { useState, useCallback, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import useSWR from "swr"
import {
  BarChart3,
  ClipboardList,
  Building2,
  ShoppingCart,
  HelpCircle,
  LogOut,
  ShieldCheck,
  Menu,
  TrendingUp,
  MessageSquareWarning,
  Gift,
  MapPin,
  Printer,
  Sparkles,
  ArrowRight,
} from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { createClient } from "@/lib/supabase/client"

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: BarChart3 },
  { href: "/dashboard/feedback", label: "Feedback", icon: MessageSquareWarning },
  { href: "/dashboard/stickers", label: "Sticker Map", icon: MapPin },
  { href: "/dashboard/rewards", label: "Rewards", icon: Gift },
  { href: "/dashboard/analytics", label: "Review Analytics", icon: TrendingUp },
  { href: "/dashboard/orders", label: "Order History", icon: ClipboardList },
  { href: "/dashboard/profile", label: "Business Profile", icon: Building2 },
  { href: "/dashboard/supply", label: "Supply Shop", icon: ShoppingCart },
  { href: "/dashboard/help", label: "Help", icon: HelpCircle },
] as const

async function fetchMerchant() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from("merchants")
    .select("business_name, package_id")
    .eq("id", user.id)
    .single()
  return data
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [confirmSignOut, setConfirmSignOut] = useState(false)
  // Free trial: have they printed their free stickers yet?
  const { data: labels } = useSWR<{ batches?: unknown[] }>("label-batches", () => fetch("/api/labels/batches").then((r) => r.json()))

  const { data: merchant, isLoading: merchantLoading } = useSWR("merchant-sidebar", fetchMerchant)
  // New ratings since the manager last opened Customer Feedback
  const { data: unseen } = useSWR<{ good: number; bad: number }>(
    "feedback-unseen",
    () => fetch("/api/activity/unseen").then((r) => r.json()),
    { refreshInterval: 30000 },
  )

  const displayName = merchant?.business_name || "My Business"
  // Shown on every page until the free trial stickers have been printed (not on Supply Shop itself)
  const showTrialBanner =
    merchant?.package_id === "free" && labels && Array.isArray(labels.batches) && labels.batches.length === 0 && pathname !== "/dashboard/supply"
  const planLabel =
    merchant?.package_id === "free"
      ? "Free Trial · Upgrade"
      : merchant?.package_id === "enterprise"
      ? "Enterprise"
      : merchant?.package_id === "starter"
        ? "Starter Plan"
        : "Growth Plan"

  const navigateTo = useCallback(
    (href: string) => {
      router.push(href)
      setMobileOpen(false)
    },
    [router],
  )

  const handleSignOut = useCallback(async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/auth/login")
    router.refresh()
  }, [router])

  const SidebarNav = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="flex flex-col gap-1" role="navigation" aria-label="Dashboard navigation">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href
        return (
          <button
            key={href}
            onClick={() => {
              navigateTo(href)
              onNavigate?.()
            }}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              isActive
                ? "bg-[#FFE100]/10 text-[#FFE100] border border-[#FFE100]/20"
                : "text-[#FFFFFF]/60 hover:text-[#FFFFFF] hover:bg-[#FFFFFF]/5"
            }`}
          >
            <Icon size={18} />
            <span className="flex-1 text-left">{label}</span>
            {href === "/dashboard/feedback" && (
              <span className="flex items-center gap-1">
                {!!unseen?.good && (
                  <span
                    className="min-w-5 h-5 px-1.5 rounded-full bg-green-500 text-white text-[11px] font-bold flex items-center justify-center"
                    title={`${unseen.good} new happy rating${unseen.good === 1 ? "" : "s"}`}
                  >
                    {unseen.good}
                  </span>
                )}
                {!!unseen?.bad && (
                  <span
                    className="min-w-5 h-5 px-1.5 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center"
                    title={`${unseen.bad} new unhappy rating${unseen.bad === 1 ? "" : "s"}`}
                  >
                    {unseen.bad}
                  </span>
                )}
              </span>
            )}
          </button>
        )
      })}
    </nav>
  )

  const MerchantBadge = () => (
    <div className={`flex items-center gap-2 px-3 py-2 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] transition-opacity ${merchantLoading ? "animate-pulse" : ""}`}>
      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#FFE100]/10 border border-[#FFE100]/20">
        <ShieldCheck size={16} className="text-[#FFE100]" />
      </div>
      <div className="flex flex-col min-w-0">
        {merchantLoading ? (
          <>
            <span className="h-3 w-20 bg-[#2A2A2A] rounded animate-pulse" />
            <span className="h-2.5 w-14 bg-[#2A2A2A] rounded animate-pulse mt-1" />
          </>
        ) : (
          <>
            <span className="text-xs font-semibold text-[#FFFFFF] truncate">{displayName}</span>
            {merchant?.package_id === "free" ? (
              <a href="/dashboard/upgrade" className="text-[10px] text-[#FFE100] font-medium hover:underline">{planLabel}</a>
            ) : (
              <span className="text-[10px] text-[#FFE100] font-medium">{planLabel}</span>
            )}
          </>
        )}
      </div>
    </div>
  )

  // Billing-blocked page renders without the sidebar chrome
  if (pathname === "/dashboard/billing-blocked") {
    return <>{children}</>
  }

  return (
    <div className="min-h-svh bg-background flex">
      {/* Desktop Sidebar - stays dark */}
      <aside className="hidden md:flex w-64 flex-col border-r border-[#2A2A2A] bg-[#111111] p-4 gap-6 shrink-0 sticky top-0 h-svh">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-2 py-1">
          <img
            src="/images/vlyr-logo.png"
            alt="VLYR"
            className="h-5 w-auto brightness-0 invert"
          />
          <span className="text-[#FFFFFF]/20 text-lg font-light select-none">|</span>
          <span className="text-[#FFFFFF]/50 text-[10px] font-medium tracking-widest uppercase">
            Command Center
          </span>
        </div>

        <MerchantBadge />
        <SidebarNav />

        <div className="mt-auto">
          <button
            onClick={() => setConfirmSignOut(true)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#FFFFFF]/50 hover:text-[#FFFFFF] hover:bg-[#FFFFFF]/5 transition-all w-full"
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile Header + Sheet */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex md:hidden items-center justify-between px-4 py-3 border-b border-[#2A2A2A] bg-[#111111] sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <img
              src="/images/vlyr-logo.png"
              alt="VLYR"
              className="h-5 w-auto brightness-0 invert"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(true)}
            className="text-[#FFFFFF] hover:bg-[#FFFFFF]/10"
          >
            <Menu size={20} />
            <span className="sr-only">Open navigation</span>
          </Button>
        </header>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="bg-[#111111] border-[#2A2A2A] text-[#FFFFFF] p-4 w-72">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation</SheetTitle>
              <SheetDescription>Dashboard navigation menu</SheetDescription>
            </SheetHeader>
            <div className="flex flex-col gap-6 mt-4">
              <MerchantBadge />
              <SidebarNav onNavigate={() => setMobileOpen(false)} />
              <button
                onClick={() => { setMobileOpen(false); setConfirmSignOut(true) }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#FFFFFF]/50 hover:text-[#FFFFFF] hover:bg-[#FFFFFF]/5 transition-all w-full"
              >
                <LogOut size={18} />
                Sign out
              </button>
            </div>
          </SheetContent>
        </Sheet>

        {/* Main content - white bg */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 bg-background">
          {showTrialBanner && (
            <div className="mb-6 relative overflow-hidden rounded-3xl bg-[#0A0A0A] text-white p-5 md:p-6 flex flex-col md:flex-row md:items-center gap-4">
              <div
                className="absolute inset-0 opacity-[0.12] pointer-events-none"
                style={{ backgroundImage: "radial-gradient(#FFE100 1px, transparent 1px)", backgroundSize: "16px 16px" }}
              />
              <div className="relative flex items-center gap-4 flex-1 min-w-0">
                <span className="w-12 h-12 rounded-2xl bg-[#FFE100] text-[#0A0A0A] flex items-center justify-center shrink-0"><Sparkles size={22} /></span>
                <div className="min-w-0">
                  <p className="text-base md:text-lg font-bold">Your 15 free stickers are ready to print</p>
                  <p className="text-sm text-white/65">One-time trial: print them at home on sticker paper, put one on every order, and watch the ratings come in.</p>
                </div>
              </div>
              <button
                onClick={() => navigateTo("/dashboard/supply")}
                className="relative inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full bg-[#FFE100] text-[#0A0A0A] text-sm font-bold hover:bg-[#FFE100]/90 shrink-0"
              >
                <Printer size={16} /> Print my free stickers <ArrowRight size={15} />
              </button>
            </div>
          )}
          {children}
        </main>

        <AlertDialog open={confirmSignOut} onOpenChange={setConfirmSignOut}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sign out of VLYR?</AlertDialogTitle>
              <AlertDialogDescription>
                You&apos;ll stop seeing new ratings here until you sign in again. Text alerts keep working while you&apos;re signed out.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Stay signed in</AlertDialogCancel>
              <AlertDialogAction onClick={handleSignOut}>Sign out</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
