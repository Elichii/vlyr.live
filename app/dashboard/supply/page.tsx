"use client"

import { useState, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import useSWR, { mutate } from "swr"
import {
  ShoppingCart, QrCode, Layers, Sticker, CheckCircle2, Plus, Minus,
  ArrowRight, RotateCcw, Package, CreditCard, ArrowLeft, Lock, X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { VLYRLoader, VLYRInlineLoader } from "@/components/vlyr-loader"
import { LabelDesigner } from "@/components/label-designer"
import type { LabelDesign } from "@/lib/label-types"

const PRODUCTS = [
  { id: "stickers-100", name: "QR Sticker Roll (100)", desc: "100 premium weatherproof QR stickers", icon: QrCode, price: 29, stickerQty: 100, popular: false, isSticker: true },
  { id: "stickers-500", name: "QR Sticker Roll (500)", desc: "500 premium weatherproof QR stickers", icon: QrCode, price: 99, stickerQty: 500, popular: true, isSticker: true },
  { id: "stickers-1000", name: "QR Sticker Roll (1000)", desc: "1000 QR stickers. Best value.", icon: QrCode, price: 169, stickerQty: 1000, popular: false, isSticker: true },
  { id: "acrylic-stand", name: "Acrylic Counter Stand", desc: "Premium clear acrylic stand with embedded QR", icon: Layers, price: 24, stickerQty: 0, popular: false, isSticker: false },
  { id: "window-decal", name: "Window Decal", desc: "Large-format window decal with QR code", icon: Sticker, price: 19, stickerQty: 0, popular: false, isSticker: false },
]

async function fetchLastOrder() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from("orders").select("*")
    .eq("merchant_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1).maybeSingle()
  return data
}

async function fetchMerchant() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from("merchants").select("business_name, logo_url")
    .eq("id", user.id).single()
  // Also fetch primary review link
  const { data: primaryLink } = await supabase
    .from("review_links").select("url")
    .eq("merchant_id", user.id)
    .eq("is_primary", true)
    .maybeSingle()
  return { ...data, primary_review_url: primaryLink?.url ?? "" }
}

export default function SupplyShop() {
  const { data: lastOrder, isLoading } = useSWR("last-order", fetchLastOrder)
  const { data: merchant } = useSWR("merchant-supply", fetchMerchant)
  const [cart, setCart] = useState<Record<string, number>>({})
  const [step, setStep] = useState<"shop" | "design" | "payment">("shop")

  // Label design state
  const labelDesignRef = useRef<LabelDesign | null>(null)

  // Payment form state
  const [cardNumber, setCardNumber] = useState("")
  const [cardExpiry, setCardExpiry] = useState("")
  const [cardCvc, setCardCvc] = useState("")
  const [cardName, setCardName] = useState("")

  const [ordering, setOrdering] = useState(false)
  const [reordering, setReordering] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cartItems = PRODUCTS.filter((p) => (cart[p.id] || 0) > 0)
  const cartTotal = cartItems.reduce((sum, p) => sum + p.price * (cart[p.id] || 0), 0)
  const cartCount = cartItems.reduce((sum, p) => sum + (cart[p.id] || 0), 0)
  const hasStickerInCart = cartItems.some((p) => p.isSticker)

  const updateQty = (id: string, delta: number) => {
    setCart((prev) => {
      const next = Math.max(0, (prev[id] || 0) + delta)
      if (next === 0) { const { [id]: _, ...rest } = prev; return rest }
      return { ...prev, [id]: next }
    })
    setSuccess(false)
    setError(null)
  }

  const formatCardNumber = (v: string) => v.replace(/\D/g, "").replace(/(\d{4})/g, "$1 ").trim().slice(0, 19)
  const formatExpiry = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 4)
    return d.length >= 3 ? `${d.slice(0, 2)}/${d.slice(2)}` : d
  }

  const cardValid = cardNumber.replace(/\s/g, "").length >= 15 && cardExpiry.length >= 4 && cardCvc.length >= 3 && cardName.length >= 2

  const insertOrder = useCallback(async (stickerQty: number, hasAcrylic: boolean, hasDecals: boolean, totalAmount: number, design: LabelDesign | null) => {
    const supabase = createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) throw new Error("Not authenticated")
    const { error: insertErr } = await supabase.from("orders").insert({
      merchant_id: user.id,
      order_type: "supply",
      package_id: "supply",
      billing_cycle: "one-time",
      sticker_qty: stickerQty,
      acrylic_stands: hasAcrylic,
      safety_decals: hasDecals,
      recurring_amount: 0,
      hardware_amount: totalAmount,
      total_amount: totalAmount,
      status: "confirmed",
    })
    if (insertErr) throw insertErr

    // Create a label batch if a sticker design was configured
    if (design && stickerQty > 0) {
      await supabase.from("label_batches").insert({
        merchant_id: user.id,
        quantity: stickerQty,
        status: "pending",
        design_json: design,
      })
    }

    await mutate("last-order")
    await mutate("orders-list")
    await mutate("dashboard-stats")
  }, [])

  /** Proceed from shop -> decide whether to show designer or go straight to payment */
  const handleProceed = () => {
    setError(null)
    if (hasStickerInCart) {
      setStep("design")
    } else {
      setStep("payment")
    }
  }

  const handlePayAndOrder = async () => {
    if (!cardValid || cartItems.length === 0) return
    setOrdering(true)
    setError(null)
    try {
      const stickerQty = cartItems.reduce((s, p) => s + p.stickerQty * (cart[p.id] || 0), 0)
      const hasAcrylic = cartItems.some((p) => p.id === "acrylic-stand")
      const hasDecals = cartItems.some((p) => p.id === "window-decal")
      await new Promise((r) => setTimeout(r, 1500))
      await insertOrder(stickerQty, hasAcrylic, hasDecals, cartTotal, labelDesignRef.current)
      setSuccess(true)
      setCart({})
      labelDesignRef.current = null
      setStep("shop")
      setCardNumber(""); setCardExpiry(""); setCardCvc(""); setCardName("")
      setTimeout(() => setSuccess(false), 5000)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed. Try again.")
    } finally { setOrdering(false) }
  }

  const handleReorder = async () => {
    if (!lastOrder) return
    setReordering(true)
    setError(null)
    try {
      let totalAmt = Number(lastOrder.total_amount) || 0
      if (totalAmt > 1000) totalAmt = totalAmt / 100
      await insertOrder(
        lastOrder.sticker_qty || 0,
        lastOrder.acrylic_stands || false,
        lastOrder.safety_decals || false,
        totalAmt,
        null,
      )
      setSuccess(true)
      setTimeout(() => setSuccess(false), 5000)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reorder failed.")
    } finally { setReordering(false) }
  }

  if (isLoading) return <VLYRLoader variant="card" message="Loading supply shop..." />

  // ─── Design Step ──────────────────────────────────────────────────
  if (step === "design") {
    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="max-w-4xl">
        <button onClick={() => setStep("shop")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft size={16} /> Back to Shop
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#FFE100]/10 border border-[#FFE100]/20 flex items-center justify-center">
            <QrCode size={18} className="text-[#FFE100]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Customize Your Labels</h2>
            <p className="text-xs text-muted-foreground">Design how your QR stickers will look before printing</p>
          </div>
        </div>

<LabelDesigner
  initialBusinessName={merchant?.business_name || "Your Business"}
  initialLogoUrl={merchant?.logo_url || null}
  reviewUrl={merchant?.primary_review_url || ""}
  onDesignChange={(d) => { labelDesignRef.current = d }}
  />

        {/* Cart summary + proceed */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <Package size={16} className="text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {cartCount} item{cartCount !== 1 ? "s" : ""} in cart
            </span>
            <span className="text-sm font-bold text-foreground font-mono">${cartTotal.toFixed(2)}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setStep("shop")} className="gap-1.5 text-sm">
              <ArrowLeft size={14} /> Edit Cart
            </Button>
            <Button
              onClick={() => setStep("payment")}
              className="bg-[#FFE100] text-[#111] hover:bg-[#FFE100]/90 font-semibold gap-2 text-sm h-10 px-6 rounded-xl"
            >
              Continue to Payment <ArrowRight size={14} />
            </Button>
          </div>
        </div>
      </motion.div>
    )
  }

  // ─── Payment Screen ───────────────────────────────────────────────
  if (step === "payment") {
    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="max-w-4xl">
        <button onClick={() => hasStickerInCart ? setStep("design") : setStep("shop")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft size={16} /> {hasStickerInCart ? "Back to Label Design" : "Back to Shop"}
        </button>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Payment Form */}
          <div className="flex-1">
            <div className="bg-card rounded-2xl border border-border p-6 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FFE100]/10 border border-[#FFE100]/20 flex items-center justify-center">
                  <CreditCard size={18} className="text-[#FFE100]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Secure Checkout</h2>
                  <p className="text-xs text-muted-foreground">Enter your payment details below</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Name on Card</label>
                  <Input value={cardName} onChange={(e) => setCardName(e.target.value)} placeholder="John Doe" className="h-11 bg-secondary/50 border-border rounded-xl" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Card Number</label>
                  <div className="relative">
                    <CreditCard size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input value={cardNumber} onChange={(e) => setCardNumber(formatCardNumber(e.target.value))} placeholder="4242 4242 4242 4242" className="h-11 pl-9 bg-secondary/50 border-border rounded-xl font-mono tracking-wider" maxLength={19} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Expiry</label>
                    <Input value={cardExpiry} onChange={(e) => setCardExpiry(formatExpiry(e.target.value))} placeholder="MM/YY" className="h-11 bg-secondary/50 border-border rounded-xl font-mono" maxLength={5} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">CVC</label>
                    <Input value={cardCvc} onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="123" className="h-11 bg-secondary/50 border-border rounded-xl font-mono" maxLength={4} />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-secondary/50 rounded-lg p-2.5 border border-border/50">
                <Lock size={12} className="text-[#FFE100] shrink-0" />
                Your payment information is secured with 256-bit SSL encryption
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">{error}</motion.div>
                )}
              </AnimatePresence>

              <Button onClick={handlePayAndOrder} disabled={ordering || !cardValid} className="w-full h-12 rounded-xl bg-[#FFE100] text-[#111] hover:bg-[#FFE100]/90 font-bold text-base disabled:opacity-40">
                {ordering ? <VLYRInlineLoader label="Processing payment..." /> : (
                  <span className="flex items-center gap-2"><Lock size={16} /> Pay ${cartTotal.toFixed(2)}</span>
                )}
              </Button>
            </div>
          </div>

          {/* Payment Breakdown Sidebar */}
          <div className="lg:w-72 shrink-0">
            <div className="bg-card rounded-2xl border border-border p-5 lg:sticky lg:top-6 space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Payment Breakdown</h3>
              <div className="space-y-3">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded bg-secondary text-[10px] font-bold text-foreground flex items-center justify-center shrink-0">{cart[item.id]}</span>
                      <span className="text-xs text-foreground truncate">{item.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground font-mono shrink-0">${(item.price * (cart[item.id] || 0)).toFixed(2)}</span>
                  </div>
                ))}
                {labelDesignRef.current && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded bg-[#FFE100]/10 text-[10px] font-bold text-[#FFE100] flex items-center justify-center shrink-0">
                        <QrCode size={10} />
                      </span>
                      <span className="text-xs text-foreground truncate">Custom Label Design</span>
                    </div>
                    <span className="text-xs text-green-500 font-medium shrink-0">Included</span>
                  </div>
                )}
              </div>
              <div className="border-t border-border pt-3 space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Subtotal</span><span className="font-mono">${cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Shipping</span><span className="text-green-500 font-medium">Free</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Tax</span><span className="font-mono">$0.00</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-foreground pt-2 border-t border-border">
                  <span>Total</span><span className="font-mono">${cartTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    )
  }

  // ─── Shop Screen ──────────────────────────────────────────────────
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
          <ShoppingCart size={22} className="text-[#FFE100]" /> VLYR Supply Shop
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Order QR materials and accessories for your business</p>
      </div>

      {/* Quick Reorder Banner */}
      {lastOrder && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between p-4 bg-[#FFE100]/5 border border-[#FFE100]/20 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFE100]/10 border border-[#FFE100]/20 flex items-center justify-center">
              <RotateCcw size={16} className="text-[#FFE100]" />
            </div>
            <div>
              <span className="text-sm font-semibold text-foreground block">Quick Reorder</span>
              <span className="text-xs text-muted-foreground">
                Repeat your last order - ${(Number(lastOrder.total_amount) > 1000 ? Number(lastOrder.total_amount) / 100 : Number(lastOrder.total_amount)).toFixed(2)}
              </span>
            </div>
          </div>
          <Button onClick={handleReorder} disabled={reordering} size="sm" className="bg-[#FFE100] text-[#111] hover:bg-[#FFE100]/90 rounded-lg font-semibold h-9 px-5">
            {reordering ? <VLYRInlineLoader /> : "Reorder"}
          </Button>
        </motion.div>
      )}

      {/* Success / Error messages */}
      <AnimatePresence>
        {success && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="flex items-center gap-2 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-500 text-sm font-medium">
            <CheckCircle2 size={16} /> Order placed successfully! Check your Order History for details.
          </motion.div>
        )}
        {error && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="flex items-center justify-between p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
            <button onClick={() => setError(null)}><X size={14} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main: Products + Sidebar */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Products Grid */}
        <div className="flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PRODUCTS.map((product, i) => {
              const qty = cart[product.id] || 0
              const Icon = product.icon
              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="bg-card rounded-2xl border border-border p-5 flex flex-col gap-4 hover:border-foreground/15 transition-colors relative"
                >
                  {product.popular && (
                    <Badge className="absolute top-3 right-3 bg-[#FFE100]/10 text-[#FFE100] border-[#FFE100]/20 text-[10px]">Popular</Badge>
                  )}
                  <div className="flex items-start justify-between">
                    <div className="w-11 h-11 rounded-xl bg-[#FFE100]/10 border border-[#FFE100]/20 flex items-center justify-center">
                      <Icon size={20} className="text-[#FFE100]" />
                    </div>
                    <span className="text-lg font-bold text-foreground">${product.price}</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{product.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{product.desc}</p>
                  </div>
                  <div className="mt-auto pt-2 border-t border-border/50">
                    {qty === 0 ? (
                      <Button onClick={() => updateQty(product.id, 1)} size="sm" className="w-full bg-foreground text-background hover:bg-foreground/90 rounded-lg font-semibold h-9">
                        <Plus size={14} className="mr-1.5" /> Add to Order
                      </Button>
                    ) : (
                      <div className="flex items-center justify-between">
                        <button onClick={() => updateQty(product.id, -1)} className="w-9 h-9 rounded-lg bg-secondary border border-border flex items-center justify-center hover:bg-destructive/10 hover:border-destructive/30 transition-colors">
                          <Minus size={14} />
                        </button>
                        <span className="text-sm font-bold text-foreground tabular-nums">{qty}</span>
                        <button onClick={() => updateQty(product.id, 1)} className="w-9 h-9 rounded-lg bg-secondary border border-border flex items-center justify-center hover:bg-[#FFE100]/10 hover:border-[#FFE100]/30 transition-colors">
                          <Plus size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Order Summary Sidebar */}
        <div className="lg:w-80 shrink-0">
          <div className="bg-card rounded-2xl border border-border p-6 lg:sticky lg:top-6 space-y-5">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Package size={15} /> Order Summary
            </h2>

            {cartItems.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart size={28} className="text-muted-foreground/25 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Your cart is empty</p>
                <p className="text-[11px] text-muted-foreground/60 mt-1">Add items to get started</p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded bg-secondary text-[10px] font-bold text-foreground flex items-center justify-center shrink-0">{cart[item.id]}</span>
                        <span className="text-xs text-foreground font-medium truncate">{item.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground font-mono shrink-0">${(item.price * (cart[item.id] || 0)).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border pt-3 space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Subtotal ({cartCount} items)</span>
                    <span className="font-mono">${cartTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Shipping</span>
                    <span className="text-green-500 font-medium">Free</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-foreground pt-1 border-t border-border">
                    <span>Total</span>
                    <span className="font-mono">${cartTotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* CTA -- goes to design step if stickers in cart */}
                <Button
                  onClick={handleProceed}
                  className="w-full h-11 rounded-xl bg-[#FFE100] text-[#111] hover:bg-[#FFE100]/90 font-semibold"
                >
                  <span className="flex items-center gap-2">
                    {hasStickerInCart ? (
                      <>Customize Labels <QrCode size={16} /></>
                    ) : (
                      <>Proceed to Checkout <ArrowRight size={16} /></>
                    )}
                  </span>
                </Button>

                {hasStickerInCart && (
                  <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
                    {"You'll design your QR label layout before checkout"}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
