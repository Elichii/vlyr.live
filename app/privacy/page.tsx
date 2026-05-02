import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export const metadata = {
  title: "Privacy Policy - VLYR Dashboard",
  description: "Privacy Policy for vlyr.live - How we collect, use, and protect your data.",
}

export default function PrivacyPage() {
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
          <h1 className="text-3xl font-bold text-foreground mb-2">VLYR Privacy Policy</h1>
          <p className="text-muted-foreground text-sm mb-8">Last Updated: March 23, 2026</p>

          <section className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">1. Introduction and Scope</h2>
              <p className="text-muted-foreground leading-relaxed">
                This Privacy Policy describes how Mare LLC. (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) collects, uses, and discloses information through the VLYR Dashboard (the &quot;Service&quot;). We provide a reputation management and customer recovery platform designed to help businesses manage their digital presence ethically and transparently.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">2. Compliance with Google API User Data Policy</h2>
              <p className="text-muted-foreground leading-relaxed">
                VLYR&apos;s use and transfer to any other app of information received from Google APIs will adhere to the{" "}
                <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-[#FFE100] hover:underline">
                  Google API Services User Data Policy
                </a>
                , including the Limited Use requirements. We are committed to transparency and the responsible handling of Google User Data.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">3. Information We Collect via Google APIs</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                To provide our Reputation Shield and Analytics services, we request authorized access to the following Google Business Profile (GBP) data:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li><strong className="text-foreground">Business Identity:</strong> Name, address, location ID, and category.</li>
                <li><strong className="text-foreground">Review Content:</strong> We read public customer reviews and star ratings to populate your dashboard.</li>
                <li><strong className="text-foreground">Performance Metrics:</strong> We access aggregated data regarding how customers find your business on Search and Maps.</li>
                <li><strong className="text-foreground">Account Verification:</strong> We verify that the authenticated user has &quot;Owner&quot; or &quot;Manager&quot; permissions for the specific business profile.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">4. How We Use Your Data (The &quot;Limited Use&quot; Disclosure)</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                We use the data retrieved from Google APIs strictly for prominent, user-facing features within the VLYR Dashboard:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li><strong className="text-foreground">Real-Time Analytics:</strong> To calculate your &quot;Reputation Debt&quot; and &quot;Growth Milestones.&quot;</li>
                <li><strong className="text-foreground">Customer Recovery:</strong> To alert business owners when low-rating trends are detected so they can improve their internal operations.</li>
                <li><strong className="text-foreground">Review Management:</strong> To facilitate direct, authorized responses to public reviews.</li>
                <li><strong className="text-foreground">Interactive Simulation:</strong> To allow users to model how potential review changes affect their overall Google rating.</li>
              </ul>
              <div className="mt-4 p-4 bg-card border border-border rounded-lg">
                <p className="text-foreground font-semibold mb-2">Prohibited Uses:</p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  <li>We do not sell your Google User Data to third parties.</li>
                  <li>We do not use your data for advertising or marketing purposes.</li>
                  <li>We do not use your Google data to train generalized AI/ML models.</li>
                </ul>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">5. Review Integrity and Anti-Gating Policy</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                In compliance with FTC guidelines and Google&apos;s Prohibited Content policies, VLYR operates as a <strong className="text-foreground">Customer Recovery Tool</strong>, not a &quot;Review Gate.&quot;
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li><strong className="text-foreground">Universal Access:</strong> VLYR does not technically prevent or discourage any user from leaving a public Google review.</li>
                <li><strong className="text-foreground">Transparency:</strong> All feedback flows managed by VLYR include a direct, visible path for the consumer to post their honest feedback publicly on Google, regardless of their sentiment.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">6. Data Storage, Security, and Retention</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                We implement industry-standard encryption (AES-256) for all data at rest and TLS for data in transit.
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li><strong className="text-foreground">Caching:</strong> In accordance with Google API terms, we cache review data for a maximum of 30 days to optimize performance.</li>
                <li><strong className="text-foreground">User Control:</strong> You may disconnect your Google Account at any time via the VLYR Settings. Upon disconnection, all cached Google data is purged from our active systems within 48 hours.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">7. Human Review and Third-Party Sharing</h2>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li><strong className="text-foreground">Human Review:</strong> Our staff does not read your Google User Data unless you provide explicit, documented consent for a specific support request.</li>
                <li><strong className="text-foreground">Sub-Processors:</strong> We may share data with service providers (e.g., cloud hosting or SMS gateways) solely to provide VLYR&apos;s core features. These providers are contractually bound to the same &quot;Limited Use&quot; requirements.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">8. Contact and Data Subject Rights</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                You have the right to access, correct, or delete your personal data. For all privacy-related inquiries or to exercise your rights, please contact:
              </p>

            </div>
          </section>
        </article>
      </div>
    </main>
  )
}
