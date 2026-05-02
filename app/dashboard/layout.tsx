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
} from "lucide-react"
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

  const { data: merchant, isLoading: merchantLoading } = useSWR("merchant-sidebar", fetchMerchant)

  const displayName = merchant?.business_name || "My Business"
  const planLabel =
    merchant?.package_id === "enterprise"
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
            {label}
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
            <span className="text-[10px] text-[#FFE100] font-medium">{planLabel}</span>
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
            onClick={handleSignOut}
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
            </div>
          </SheetContent>
        </Sheet>

        {/* Main content - white bg */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 bg-background">{children}</main>
      </div>
    </div>
  )
}
