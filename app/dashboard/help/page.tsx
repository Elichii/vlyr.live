"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search, ShieldCheck, QrCode, BarChart3, ShoppingCart, User,
  Star, Zap, MessageSquare, ChevronRight, ExternalLink, Mail,
  BookOpen, ArrowRight, Clock, CheckCircle2,
} from "lucide-react"
import { Input } from "@/components/ui/input"

// ── Article Type ─────────────────────────────────────────────────────
interface Article {
  id: string
  title: string
  summary: string
  content: string[]
  readTime: string
}

interface Category {
  id: string
  icon: React.ElementType
  label: string
  description: string
  articles: Article[]
}

const CATEGORIES: Category[] = [
  {
    id: "getting-started",
    icon: ShieldCheck,
    label: "Getting Started",
    description: "Learn the basics of VLYR and your Reputation Shield",
    articles: [
      {
        id: "what-is-vlyr",
        title: "What is VLYR?",
        summary: "Smart QR codes that capture real-time customer feedback and protect your online reputation.",
        readTime: "3 min",
        content: [
          "VLYR is a reputation management platform built for local businesses. We give you smart QR codes that capture real-time customer feedback.",
          "Happy customers (4-5 stars) are routed to leave a Google Review, while unhappy customers (1-3 stars) are handled privately so you can resolve issues before they go public.",
          "This \"Reputation Shield\" protects your online ratings while giving you honest feedback to improve your business operations.",
        ],
      },
      {
        id: "first-steps",
        title: "Your first 10 minutes with VLYR",
        summary: "A quick walkthrough of setup, placing your first QR sticker, and reading your first scan.",
        readTime: "5 min",
        content: [
          "Step 1: Complete your Business Profile with your name, logo, and address. This information appears on your customer-facing Pulse Check page.",
          "Step 2: Add your review links (Google, Yelp, Facebook) and mark one as primary. Happy customers will be directed to this link.",
          "Step 3: Place your QR stickers on high-traffic surfaces: takeaway boxes, receipts, counter stands, or windows.",
          "Step 4: Watch scans roll into your Command Center dashboard. Each scan shows the customer rating, feedback, and location data.",
        ],
      },
    ],
  },
  {
    id: "qr-codes",
    icon: QrCode,
    label: "QR Codes",
    description: "How scanning, routing, and tracking work",
    articles: [
      {
        id: "how-qr-works",
        title: "How do the QR Codes work?",
        summary: "Each QR code links to your personalized VLYR Pulse Check page with smart routing.",
        readTime: "4 min",
        content: [
          "Each QR code links to your personalized VLYR Pulse Check page. When a customer scans, they see a simple star rating prompt.",
          "4-5 Stars: They are directed to leave a review on your primary review page (Google, Yelp, Facebook, or any custom URL you configure).",
          "1-3 Stars: They are shown a private feedback form that sends responses directly to your dashboard, keeping negative feedback off public platforms.",
          "You can customize which review platform is used by setting your primary review link in your Business Profile under the Review Links section.",
        ],
      },
      {
        id: "where-to-place",
        title: "Best places to put your QR stickers",
        summary: "Maximize scans with strategic sticker placement.",
        readTime: "2 min",
        content: [
          "Takeaway boxes and bags: Customers scan after experiencing your product at home.",
          "Counter tops and register areas: Capture feedback at the point of sale.",
          "Receipts and invoices: Professional touchpoint for service-based businesses.",
          "Window decals: Attract foot traffic and signal you care about feedback.",
        ],
      },
    ],
  },
  {
    id: "dashboard",
    icon: BarChart3,
    label: "Command Center",
    description: "Navigate your analytics dashboard",
    articles: [
      {
        id: "overview-metrics",
        title: "Understanding your metrics",
        summary: "Total scans, average rating, review count, and trends at a glance.",
        readTime: "3 min",
        content: [
          "The Overview tab shows your key metrics: total scans, average rating, positive review conversion rate, and scan trends over time.",
          "The rating distribution chart breaks down your feedback by star count so you can see the full picture.",
          "Scan source tracking tells you which QR code locations generate the most engagement.",
          "Use the date filter to compare performance across different time periods.",
        ],
      },
    ],
  },
  {
    id: "supply",
    icon: ShoppingCart,
    label: "Supply Shop",
    description: "Order and reorder supplies",
    articles: [
      {
        id: "ordering-supplies",
        title: "How to order supplies",
        summary: "Add items, customize labels, and checkout with one flow.",
        readTime: "3 min",
        content: [
          "Visit the Supply Shop from the sidebar. Add QR Sticker Rolls, Acrylic Stands, or Window Decals to your cart.",
          "When QR Sticker Rolls are in your cart, you will be taken to the Print Studio to customize your label design before checkout.",
          "Choose from preset color themes or create a custom design with your brand colors, logo, and tagline.",
          "After designing, proceed to the secure checkout to complete your payment. All orders appear in your Order History.",
        ],
      },
    ],
  },
  {
    id: "profile",
    icon: User,
    label: "Business Profile",
    description: "Manage your identity and review links",
    articles: [
      {
        id: "setup-profile",
        title: "Setting up your Business Profile",
        summary: "Logo, address, Google Maps pin, review links, and bio.",
        readTime: "4 min",
        content: [
          "Logo: Click the upload area to add your business logo. This appears on your Pulse Check page and QR labels.",
          "Business Name & Address: These are displayed to customers when they scan your QR code.",
          "Pin Location: Use the Google Maps embed to search for your business or drop a pin. This enables proximity tracking for scan analytics.",
          "Review Links: Add multiple review platform URLs (Google, Yelp, Facebook, custom). Mark one as primary - this is where happy customers get directed after scanning.",
          "Bio: A short description that appears on your public-facing Pulse Check page.",
        ],
      },
    ],
  },
  {
    id: "plans",
    icon: Star,
    label: "Plans & Billing",
    description: "Pricing tiers and billing details",
    articles: [
      {
        id: "plan-comparison",
        title: "Plans comparison",
        summary: "Starter, Growth, and Enterprise - find the right fit.",
        readTime: "2 min",
        content: [
          "Starter ($49/mo): 500 QR stickers, basic analytics, email support. Great for getting started.",
          "Growth ($99/mo): 2,000 QR stickers, advanced analytics, priority support, Burn-Code Rewards. Best value for growing businesses.",
          "Enterprise ($249/mo): 5,000 QR stickers, white-label branding, dedicated account manager, API access, SLA guarantee.",
          "All plans include free shipping on hardware. Annual billing saves 20%. You can switch plans anytime.",
        ],
      },
    ],
  },
  {
    id: "burncode",
    icon: Zap,
    label: "Burn-Code Rewards",
    description: "Instant vouchers that drive repeat visits",
    articles: [
      {
        id: "how-burncode",
        title: "How Burn-Code Rewards work",
        summary: "Generate instant discount vouchers when customers leave positive reviews.",
        readTime: "3 min",
        content: [
          "Available on Growth and Enterprise plans, Burn-Code Rewards are instant discount vouchers generated when a customer leaves a positive review.",
          "After leaving a 4 or 5-star review, the customer sees a limited-time voucher with a countdown timer (default: 60 minutes).",
          "The urgency of the expiring voucher encourages them to visit again immediately, driving repeat traffic and loyalty.",
          "You control the discount amount, terms, and expiry time from the Command Center settings.",
        ],
      },
    ],
  },
  {
    id: "support",
    icon: MessageSquare,
    label: "Contact Support",
    description: "Get help from the VLYR team",
    articles: [
      {
        id: "contact-info",
        title: "Getting help",
        summary: "Email support with response times based on your plan tier.",
        readTime: "1 min",
        content: [
          "Email: support@vlyr.com for general inquiries.",
          "Response times: Within 24 hours (Starter), 4 hours (Growth), 1 hour (Enterprise).",
          "For urgent issues (site down, billing errors): email urgent@vlyr.com with your business name.",
          "This help center covers all common topics. Search above to find answers quickly.",
        ],
      },
    ],
  },
]

// ── Component ────────────────────────────────────────────────────────
export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null)

  // Filter articles by search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return CATEGORIES
    const q = searchQuery.toLowerCase()
    return CATEGORIES.map((cat) => ({
      ...cat,
      articles: cat.articles.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.summary.toLowerCase().includes(q) ||
          a.content.some((p) => p.toLowerCase().includes(q)),
      ),
    })).filter((cat) => cat.articles.length > 0)
  }, [searchQuery])

  const activeCategory = selectedCategory
    ? filteredCategories.find((c) => c.id === selectedCategory) ?? null
    : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-8 max-w-4xl"
    >
      {/* Hero Header */}
      <div className="text-center space-y-3 pt-2">
        <div className="flex items-center justify-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-[#FFE100]/10 border border-[#FFE100]/20 flex items-center justify-center">
            <BookOpen size={20} className="text-[#FFE100]" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight text-balance">
          How can we help?
        </h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
          Search our knowledge base or browse topics below to get the most out of VLYR.
        </p>

        {/* Search Bar */}
        <div className="relative max-w-lg mx-auto mt-4">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setSelectedCategory(null)
              setSelectedArticle(null)
            }}
            placeholder="Search articles, topics, features..."
            className="h-12 pl-11 pr-4 bg-card border-border rounded-2xl text-sm placeholder:text-muted-foreground/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* ── Article Detail View ───────────────────────────── */}
        {selectedArticle ? (
          <motion.div
            key="article"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Breadcrumb */}
            <button
              onClick={() => setSelectedArticle(null)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-[#FFE100] transition-colors"
            >
              <ChevronRight size={12} className="rotate-180" />
              Back to {activeCategory?.label ?? "articles"}
            </button>

            {/* Article Card */}
            <div className="bg-card rounded-2xl border border-border p-8 space-y-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <span className="text-[10px] font-medium text-[#FFE100] bg-[#FFE100]/10 border border-[#FFE100]/20 px-2 py-0.5 rounded-full">
                    {activeCategory?.label}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Clock size={10} /> {selectedArticle.readTime} read
                  </span>
                </div>
                <h2 className="text-xl font-bold text-foreground tracking-tight">
                  {selectedArticle.title}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {selectedArticle.summary}
                </p>
              </div>

              <div className="h-px bg-border" />

              <div className="space-y-4">
                {selectedArticle.content.map((paragraph, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="mt-1.5 shrink-0">
                      <CheckCircle2 size={14} className="text-[#FFE100]/60" />
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {paragraph}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Related help */}
            {activeCategory && activeCategory.articles.length > 1 && (
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Related Articles
                </h3>
                <div className="grid gap-2">
                  {activeCategory.articles
                    .filter((a) => a.id !== selectedArticle.id)
                    .map((article) => (
                      <button
                        key={article.id}
                        onClick={() => setSelectedArticle(article)}
                        className="text-left bg-card/50 border border-border/50 rounded-xl px-4 py-3 hover:border-[#FFE100]/20 hover:bg-[#FFE100]/5 transition-all flex items-center justify-between gap-3"
                      >
                        <div>
                          <p className="text-sm font-medium text-foreground">{article.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{article.summary}</p>
                        </div>
                        <ArrowRight size={14} className="text-muted-foreground shrink-0" />
                      </button>
                    ))}
                </div>
              </div>
            )}
          </motion.div>
        ) : selectedCategory && activeCategory ? (
          /* ── Category Article List ───────────────────────── */
          <motion.div
            key="category"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-5"
          >
            <button
              onClick={() => setSelectedCategory(null)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-[#FFE100] transition-colors"
            >
              <ChevronRight size={12} className="rotate-180" />
              All topics
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FFE100]/10 border border-[#FFE100]/20 flex items-center justify-center shrink-0">
                <activeCategory.icon size={18} className="text-[#FFE100]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">{activeCategory.label}</h2>
                <p className="text-xs text-muted-foreground">{activeCategory.description}</p>
              </div>
            </div>

            <div className="grid gap-3">
              {activeCategory.articles.map((article) => (
                <button
                  key={article.id}
                  onClick={() => setSelectedArticle(article)}
                  className="text-left bg-card rounded-2xl border border-border p-5 hover:border-[#FFE100]/20 hover:bg-[#FFE100]/[0.02] transition-all group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5">
                      <h3 className="text-sm font-semibold text-foreground group-hover:text-[#FFE100] transition-colors">
                        {article.title}
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {article.summary}
                      </p>
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground/60 mt-2">
                        <Clock size={10} /> {article.readTime} read
                      </span>
                    </div>
                    <ArrowRight size={16} className="text-muted-foreground/30 group-hover:text-[#FFE100] transition-colors mt-1 shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          /* ── Category Grid ───────────────────────────────── */
          <motion.div
            key="grid"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Category cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredCategories.map((cat) => {
                const Icon = cat.icon
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategory(cat.id)
                      if (cat.articles.length === 1) {
                        setSelectedArticle(cat.articles[0])
                      }
                    }}
                    className="text-left bg-card rounded-2xl border border-border p-5 hover:border-[#FFE100]/20 hover:bg-[#FFE100]/[0.02] transition-all group"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="w-9 h-9 rounded-xl bg-[#FFE100]/10 border border-[#FFE100]/20 flex items-center justify-center shrink-0">
                        <Icon size={16} className="text-[#FFE100]" />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <h3 className="text-sm font-semibold text-foreground group-hover:text-[#FFE100] transition-colors">
                          {cat.label}
                        </h3>
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                          {cat.description}
                        </p>
                        <span className="text-[10px] text-muted-foreground/50">
                          {cat.articles.length} {cat.articles.length === 1 ? "article" : "articles"}
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* No results */}
            {filteredCategories.length === 0 && searchQuery && (
              <div className="text-center py-12 space-y-2">
                <Search size={24} className="text-muted-foreground/30 mx-auto" />
                <p className="text-sm text-muted-foreground">
                  No results for &ldquo;{searchQuery}&rdquo;
                </p>
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-xs text-[#FFE100] hover:underline underline-offset-4"
                >
                  Clear search
                </button>
              </div>
            )}

            {/* Popular Articles */}
            {!searchQuery && (
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Popular Articles
                </h3>
                <div className="grid gap-2">
                  {[
                    CATEGORIES[0].articles[0],
                    CATEGORIES[1].articles[0],
                    CATEGORIES[4].articles[0],
                  ].filter(Boolean).map((article) => {
                    const cat = CATEGORIES.find((c) => c.articles.some((a) => a.id === article.id))
                    return (
                      <button
                        key={article.id}
                        onClick={() => {
                          if (cat) setSelectedCategory(cat.id)
                          setSelectedArticle(article)
                        }}
                        className="text-left bg-card/50 border border-border/50 rounded-xl px-4 py-3 hover:border-[#FFE100]/20 hover:bg-[#FFE100]/5 transition-all flex items-center justify-between gap-3 group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {cat && (
                            <div className="w-7 h-7 rounded-lg bg-[#FFE100]/10 flex items-center justify-center shrink-0">
                              <cat.icon size={12} className="text-[#FFE100]" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate group-hover:text-[#FFE100] transition-colors">
                              {article.title}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">{article.summary}</p>
                          </div>
                        </div>
                        <ArrowRight size={14} className="text-muted-foreground/30 group-hover:text-[#FFE100] shrink-0 transition-colors" />
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Contact CTA */}
            <div className="bg-card rounded-2xl border border-border p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#FFE100]/10 border border-[#FFE100]/20 flex items-center justify-center shrink-0">
                <Mail size={20} className="text-[#FFE100]" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-foreground">Can{"'"}t find what you need?</h3>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Our support team responds within your plan{"'"}s SLA. Reach out and we will get you sorted.
                </p>
              </div>
              <a
                href="mailto:support@vlyr.com"
                className="flex items-center gap-1.5 text-xs font-semibold text-[#FFE100] hover:underline underline-offset-4 shrink-0"
              >
                Contact Support <ExternalLink size={12} />
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
