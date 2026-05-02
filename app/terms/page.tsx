import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export const metadata = {
  title: "Terms of Service - VLYR Dashboard",
  description: "Terms of Service for vlyr.live - Rules and guidelines for using our service.",
}

export default function TermsPage() {
  return (
    <main className="min-h-svh bg-background">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft size={16} />
          Back to Home
        </Link>

        <article className="prose prose-neutral dark:prose-invert max-w-none">
          <h1 className="text-3xl font-bold text-foreground mb-2">VLYR Terms of Service</h1>
          <p className="text-muted-foreground text-sm mb-8">Last Updated: March 24, 2026</p>

          <section className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                By accessing or using the VLYR Dashboard (the &quot;Service&quot;), operated by Mare LLC. (&quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, you may not access or use the Service.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">2. Eligibility and Account Security</h2>
              <p className="text-muted-foreground leading-relaxed">
                To use VLYR, you must be at least 18 years old and the legal owner or authorized manager of the Google Business Profile(s) you connect to the Service. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">3. Professional Conduct and Review Integrity</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                VLYR provides a &quot;Customer Recovery&quot; framework. By using the Service, you agree:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li><strong className="text-foreground">Anti-Gating Compliance:</strong> You will not use the Service to systematically exclude or prevent customers from leaving public reviews on Google.</li>
                <li><strong className="text-foreground">Content Responsibility:</strong> You are solely responsible for all responses sent to customers via the VLYR dashboard. Responses must be professional and comply with Google&apos;s Prohibited and Restricted Content Policies.</li>
                <li><strong className="text-foreground">Truthfulness:</strong> You will not use the Service to generate &quot;fake&quot; or &quot;incentivized&quot; reviews that violate consumer protection laws (FTC).</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">4. Google API Integration</h2>
              <p className="text-muted-foreground leading-relaxed">
                The Service integrates with Google APIs. Your use of the Service is also subject to the{" "}
                <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="text-[#FFE100] hover:underline">
                  Google Terms of Service
                </a>{" "}
                and{" "}
                <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#FFE100] hover:underline">
                  Google Privacy Policy
                </a>. We are not responsible for any changes, outages, or account actions taken by Google regarding your Business Profile.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">5. Fees and Subscription</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                VLYR is a subscription-based service.
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li><strong className="text-foreground">Billing:</strong> You agree to provide a valid payment method. Fees are billed in advance on a recurring basis (monthly/annually).</li>
                <li><strong className="text-foreground">Cancellations:</strong> You may cancel at any time; however, unless required by law, all fees are non-refundable.</li>
                <li><strong className="text-foreground">Supplies:</strong> Physical QR stickers and marketing materials provided as part of your subscription remain the property of the business but must be used in accordance with our branding guidelines.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">6. Intellectual Property</h2>
              <p className="text-muted-foreground leading-relaxed">
                The VLYR name, logo (USPTO Registered), and the &quot;Reputation Shield&quot; technology are the exclusive property of Mare LLC. You are granted a limited, non-transferable license to use the Service for your internal business purposes.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">7. Limitation of Liability</h2>
              <div className="p-4 bg-card border border-border rounded-lg">
                <p className="text-muted-foreground leading-relaxed text-sm">
                  TO THE MAXIMUM EXTENT PERMITTED BY LAW, VLYR IS PROVIDED &quot;AS IS.&quot; WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED. WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, OR CONSEQUENTIAL DAMAGES, INCLUDING LOSS OF REVENUE OR &quot;REPUTATION DEBT&quot; ACCRUED FROM EXTERNAL REVIEWS.
                </p>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">8. Termination</h2>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to suspend or terminate your access immediately, without notice, if we determine, in our sole discretion, that your use of the Service violates these Terms, Google&apos;s policies, or local laws.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">9. Governing Law</h2>
              <p className="text-muted-foreground leading-relaxed">
                These Terms shall be governed by and construed in accordance with the laws of the State of Delaware, without regard to its conflict of law provisions.
              </p>
            </div>
          </section>

          <div className="mt-12 pt-8 border-t border-border">
            <p className="text-sm text-muted-foreground">
              For questions about these Terms, please refer to our{" "}
              <Link href="/privacy" className="text-[#FFE100] hover:underline">
                Privacy Policy
              </Link>.
            </p>
          </div>
        </article>
      </div>
    </main>
  )
}
