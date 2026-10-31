import Link from "next/link"
import type { Metadata } from "next"
import { CheckCircle2, MessageSquareWarning, Printer, Star, Sticker } from "lucide-react"
import { FREE_STICKER_LIMIT } from "@/lib/onboarding-types"

export const metadata: Metadata = {
  title: "Try VLYR free",
  description: `Get ${FREE_STICKER_LIMIT} free QR stickers that turn happy customers into Google reviews and catch complaints privately.`,
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}

/**
 * Landing page for business invites (the QR on the invite flyer points here).
 * Free trial: sign up with Google, connect the business, download 15 stickers.
 */
export default async function InvitePage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { ref } = await searchParams
  const refParam = ref ? `&ref=${encodeURIComponent(ref.slice(0, 64))}` : ""
  const googleHref = `/api/google/auth?mode=signup&plan=free&cycle=monthly${refParam}`
  const emailHref = `/onboarding?plan=free&cycle=monthly`

  return (
    <main className="min-h-svh bg-white text-[#0A0A0A] flex flex-col">
      <header className="border-b border-[#EBEBEB]">
        <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between">
          <img src="/images/vlyr-logo.png" alt="VLYR" className="h-7 w-auto" />
          <Link href="/auth/login" className="text-sm font-medium text-[#595959] hover:text-[#0A0A0A]">
            Log in
          </Link>
        </div>
      </header>

      <section className="flex-1">
        <div className="max-w-5xl mx-auto px-5 py-12 md:py-20 grid md:grid-cols-2 gap-10 md:gap-16 items-center">
          <div className="flex flex-col gap-6">
            <span className="inline-flex w-fit items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] bg-[#FFE100] px-3 py-1 rounded-full">
              You&apos;re invited · Free trial
            </span>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-[1.05]">
              More 5-star reviews. Fewer bad ones online.
            </h1>
            <p className="text-base text-[#595959] leading-relaxed">
              Get {FREE_STICKER_LIMIT} free QR stickers for your takeaway boxes. Happy customers are sent to your Google
              reviews; unhappy ones tell you privately so you can fix it first.
            </p>

            <div className="flex flex-col gap-3 max-w-sm">
              <a
                href={googleHref}
                className="flex items-center justify-center gap-3 h-12 rounded-xl bg-[#0A0A0A] text-white text-sm font-semibold hover:bg-[#1F1F1F] transition-colors"
              >
                <span className="bg-white rounded-full p-1 flex"><GoogleIcon /></span>
                Continue with Google
              </a>
              <Link
                href={emailHref}
                className="flex items-center justify-center h-12 rounded-xl border border-[#E5E5E5] text-sm font-semibold hover:border-[#0A0A0A] transition-colors"
              >
                Sign up with email instead
              </Link>
              <p className="text-xs text-[#888888] flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-[#16a34a]" /> No credit card · Takes about 3 minutes
              </p>
            </div>
          </div>

          <ol className="flex flex-col gap-3">
            {[
              { icon: Sticker, title: "Sign up with Google", text: "We connect your Google Business Profile so reviews go to the right place." },
              { icon: Printer, title: `Print ${FREE_STICKER_LIMIT} stickers`, text: "Download a PDF, print on sticker paper, cut along the lines." },
              { icon: Star, title: "Stick them on takeaway boxes", text: "Customers scan and rate their order in a few seconds." },
              { icon: MessageSquareWarning, title: "Read feedback first", text: "4–5 stars go to Google. 1–3 stars come to your dashboard, not online." },
            ].map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="flex gap-4 p-4 rounded-2xl border border-[#EBEBEB] bg-[#FAFAFA]">
                <div className="w-10 h-10 rounded-xl bg-[#0A0A0A] text-[#FFE100] flex items-center justify-center shrink-0">
                  <Icon size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold">{i + 1}. {title}</p>
                  <p className="text-sm text-[#595959] mt-0.5 leading-relaxed">{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <footer className="border-t border-[#EBEBEB]">
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between text-xs text-[#888888]">
          <span>© 2026 VLYR Inc.</span>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-[#0A0A0A]">Privacy</Link>
            <Link href="/terms" className="hover:text-[#0A0A0A]">Terms</Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
