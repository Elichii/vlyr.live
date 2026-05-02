"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus } from "lucide-react"
type FAQItem = {
  question: string
  answer: string
}
type FAQSectionProps = {
  title?: string
  faqs?: FAQItem[]
}
const defaultFAQs: FAQItem[] = [
  {
    question: "Does VLYR replace my POS system?",
    answer:
      "No, VLYR sits above your POS, managing the interaction layer where money meets emotion. It integrates seamlessly with your existing setup -- your POS handles transactions, VLYR handles the customer experience that drives those transactions.",
  },
  {
    question: "What is a 'Burn-Code'?",
    answer:
      "A Burn-Code is a hyper-expiring reward (e.g., 2 hours) designed to fill your 'dead hours' with returning customers. When a happy customer leaves a 5-star review, they instantly receive a time-limited discount that creates urgency to return -- turning one visit into two.",
  },
  {
    question: "How do I handle negative feedback with VLYR?",
    answer:
      "VLYR pings your phone the second negative feedback happens, allowing you to fix the problem before the customer leaves the shop. The feedback is routed to your private inbox -- never to Google. You can send a one-tap digital apology with a discount, resolving the issue in real-time.",
  },
  {
    question: "How long does it take to set up VLYR?",
    answer:
      "180 seconds. Place the VLYR Pulse-Point (a QR code) on your counter, connect your Google Business profile, and you are live. No hardware, no wiring, no technical knowledge required. Your first customer scan can happen within 3 minutes of signing up.",
  },
  {
    question: "What happens to the negative reviews VLYR intercepts?",
    answer:
      "They are routed directly to your private VLYR inbox where only you and your team can see them. This gives you the opportunity to address the customer's concern privately and personally. If you resolve the issue, many customers will voluntarily update their feedback to a positive public review.",
  },
  {
    question: "What if a customer is still angry after the private feedback?",
    answer:
      "VLYR's Instant Resolution tool allows you to send a digital 'Peace Offering' -- a discount, free item, or refund -- immediately to their phone before they even leave your parking lot. This real-time intervention turns a potential public complaint into a private, resolved interaction.",
  },
  {
    question: "Can people game the Burn-Code rewards?",
    answer:
      "No. Every Burn-Code is tied to a unique device ID and Merchant ID (MID), ensuring rewards are claimed once and only by the intended customer. Our fraud detection monitors for duplicate redemptions, device spoofing, and unusual patterns automatically.",
  },
  {
    question: "What if I change my menu or Google link -- do I need to reprint QR stickers?",
    answer:
      "Never. VLYR uses Dynamic QR Points, which means you can update your destination, menu, or rewards remotely without ever replacing a physical sticker. Change anything from your dashboard and it's reflected instantly on every scan.",
  },
]
export const FAQSection = ({ title = "The VLYR Intelligence Hub", faqs = defaultFAQs }: FAQSectionProps) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }
  return (
    <section className="w-full py-24 px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-12 gap-16">
          {/* Left Column - Title */}
          <div className="lg:col-span-4">
            <h2
              className="text-[40px] leading-tight font-normal text-[#202020] tracking-tight sticky top-24"
              style={{
                fontFamily: "var(--font-figtree), Figtree",
                fontWeight: "400",
                fontSize: "40px",
              }}
            >
              {title}
            </h2>
          </div>

          {/* Right Column - FAQ Items */}
          <div className="lg:col-span-8">
            <div className="space-y-0">
              {faqs.map((faq, index) => (
                <div key={index} className="border-b border-[#e5e5e5] last:border-b-0">
                  <button
                    onClick={() => toggleFAQ(index)}
                    className="w-full flex items-center justify-between py-6 text-left group hover:opacity-70 transition-opacity duration-150"
                    aria-expanded={openIndex === index}
                  >
                    <span
                      className="text-lg leading-7 text-[#202020] pr-8"
                      style={{
                        fontFamily: "var(--font-figtree), Figtree",
                        fontWeight: "400",
                      }}
                    >
                      {faq.question}
                    </span>
                    <motion.div
                      animate={{
                        rotate: openIndex === index ? 45 : 0,
                      }}
                      transition={{
                        duration: 0.2,
                        ease: [0.4, 0, 0.2, 1],
                      }}
                      className="flex-shrink-0"
                    >
                      <Plus className="w-6 h-6 text-[#202020]" strokeWidth={1.5} />
                    </motion.div>
                  </button>

                  <AnimatePresence initial={false}>
                    {openIndex === index && (
                      <motion.div
                        initial={{
                          height: 0,
                          opacity: 0,
                        }}
                        animate={{
                          height: "auto",
                          opacity: 1,
                        }}
                        exit={{
                          height: 0,
                          opacity: 0,
                        }}
                        transition={{
                          duration: 0.3,
                          ease: [0.4, 0, 0.2, 1],
                        }}
                        className="overflow-hidden"
                      >
                        <div className="pb-6 pr-12">
                          <p
                            className="text-lg leading-6 text-[#666666]"
                            style={{
                              fontFamily: "var(--font-figtree), Figtree",
                            }}
                          >
                            {faq.answer}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
