"use client"

import { motion } from "framer-motion"
import useSWR from "swr"
import { ClipboardList, Package, CheckCircle2, Clock, Truck } from "lucide-react"
import { VLYRLoader } from "@/components/vlyr-loader"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"

async function fetchOrders() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await supabase.from("orders").select("*").eq("merchant_id", user.id).order("created_at", { ascending: false })
  return data ?? []
}

const STATUS_MAP: Record<string, { label: string; icon: typeof CheckCircle2; cls: string }> = {
  confirmed: { label: "Confirmed", icon: CheckCircle2, cls: "bg-green-500/10 text-green-500 border-green-500/20" },
  shipped: { label: "Shipped", icon: Truck, cls: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  delivered: { label: "Delivered", icon: Package, cls: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  pending: { label: "Pending", icon: Clock, cls: "bg-muted text-muted-foreground border-border" },
  active: { label: "Active", icon: CheckCircle2, cls: "bg-green-500/10 text-green-500 border-green-500/20" },
}

function describeOrder(o: Record<string, unknown>): string {
  const parts: string[] = []
  const type = String(o.order_type || "")
  if (type === "onboarding" || type === "subscription") {
    const pkg = String(o.package_id || "starter")
    parts.push(`${pkg.charAt(0).toUpperCase()}${pkg.slice(1)} Plan`)
  }
  const qty = Number(o.sticker_qty || 0)
  if (qty > 0) parts.push(`${qty} QR Stickers`)
  if (o.acrylic_stands) parts.push("Acrylic Stand")
  if (o.safety_decals) parts.push("Safety Decals")
  if (type === "supply" && parts.length === 0) parts.push("Supply Order")
  return parts.join(" + ") || "Order"
}

export default function OrdersPage() {
  const { data: orders, isLoading } = useSWR("orders-list", fetchOrders)

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Order History</h1>
        <p className="text-sm text-muted-foreground mt-1">Track all your orders and subscriptions</p>
      </div>

      {isLoading ? (
        <VLYRLoader variant="card" message="Loading orders..." />
      ) : !orders || orders.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-secondary border border-border flex items-center justify-center">
            <ClipboardList size={24} className="text-muted-foreground/40" />
          </div>
          <p className="text-sm text-muted-foreground">No orders yet</p>
          <p className="text-xs text-muted-foreground/60">Orders from onboarding and the Supply Shop will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order: Record<string, unknown>, i: number) => {
            const statusKey = String(order.status || "pending")
            const st = STATUS_MAP[statusKey] || STATUS_MAP.pending
            const Icon = st.icon
            const total = Number(order.total_amount || 0)
            const date = new Date(String(order.created_at))

            return (
              <motion.div
                key={String(order.id)}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card rounded-xl border border-border p-4 flex items-center gap-4"
              >
                {/* Icon */}
                <div className="w-10 h-10 rounded-xl bg-secondary border border-border flex items-center justify-center shrink-0">
                  <Package size={18} className="text-muted-foreground" />
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground truncate">{describeOrder(order)}</span>
                    <Badge variant="outline" className={`text-[10px] shrink-0 ${st.cls}`}>
                      <Icon size={10} className="mr-1" />
                      {st.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="font-mono">{String(order.id).substring(0, 8).toUpperCase()}</span>
                    <span>{date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                    <span className="capitalize">{String(order.order_type || "order")}</span>
                  </div>
                </div>

                {/* Amount */}
                <div className="text-right shrink-0">
                  <span className="text-base font-bold text-foreground">${total.toFixed(2)}</span>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}
