import { Link } from '@tanstack/react-router'

import { Header, Footer } from '@/components/landing'
import { DISCLAIMER_PARAGRAPHS, TERMS_VERSION } from '@/lib/legal'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  )
}

export function TermsPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-6 py-16 md:px-12">
        <div className="mb-10 space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Terms of Use</h1>
          <p className="text-sm text-muted-foreground">Version {TERMS_VERSION}</p>
        </div>

        <div className="space-y-10">
          <p className="text-sm leading-relaxed text-muted-foreground">
            These Terms of Use govern your access to and use of lexassess.in and its associated dashboard,
            assessments, rankings, certificates and services (the &quot;Platform&quot;), operated by LexAssess. By using the
            Platform you agree to these Terms and to our{' '}
            <Link to="/privacy-policy" className="text-primary hover:underline">
              Privacy Policy
            </Link>
            . If you do not agree, please do not use the Platform.
          </p>

          <Section title="1. Nature of the Platform">
            <p>{DISCLAIMER_PARAGRAPHS[0]}</p>
          </Section>

          <Section title="2. Accounts and Eligibility">
            <p>
              You must provide accurate information when you register and keep your login credentials
              confidential. You are responsible for all activity under your account. We may suspend or remove
              accounts that contain false information or that breach these Terms.
            </p>
          </Section>

          <Section title="3. Assessments, Scores and Integrity">
            <p>
              Assessments must be attempted by you alone, without unauthorised assistance. Tests may be monitored
              through camera, microphone, screen sharing and browser-activity checks, and violations may lead to
              scores being withheld or cancelled. A score reflects performance in a particular paper on a
              particular date.
            </p>
          </Section>

          <Section title="4. Ranks and Certificates">
            <p>
              Ranks are published in periodic releases by LexAssess and stay fixed until the next release. Between
              releases, a candidate may see a provisional standing that is only an estimate. Certificates can be
              verified through the QR code or link printed on them. Ranks and certificates are not a guarantee,
              endorsement or certification of professional competence.
            </p>
          </Section>

          <Section title="5. Internships and Placements">
            <p>{DISCLAIMER_PARAGRAPHS[1]}</p>
          </Section>

          <Section title="6. No Legal Advice">
            <p>{DISCLAIMER_PARAGRAPHS[2]}</p>
          </Section>

          <Section title="7. Intellectual Property">
            <p>
              {DISCLAIMER_PARAGRAPHS[3]} You may not scrape, record, redistribute or resell question papers,
              answer keys, rankings or any other content of the Platform.
            </p>
          </Section>

          <Section title="8. Subscriptions and Payments">
            <p>
              Paid access is offered as a subscription for the period and price shown at checkout. Payments are
              processed by Razorpay; we do not store your card details. Fees are charged in advance and, except
              where required by law or stated otherwise at checkout, are non-refundable once access has been
              activated. You will be shown the applicable price and period before you pay, and you must accept
              these Terms at that point.
            </p>
          </Section>

          <Section title="9. Limitation of Liability">
            <p>{DISCLAIMER_PARAGRAPHS[4]}</p>
            <p>
              The Platform is provided on an &quot;as is&quot; and &quot;as available&quot; basis, without warranties of
              uninterrupted or error-free operation.
            </p>
          </Section>

          <Section title="10. Changes">
            <p>
              We may update these Terms from time to time. The version number above changes when we do, and we
              may ask you to accept the updated Terms again.
            </p>
          </Section>

          <Section title="11. Governing Law">
            <p>
              These Terms are governed by the laws of India, and the courts at New Delhi have exclusive
              jurisdiction over any dispute arising from them.
            </p>
          </Section>

          <Section title="12. Contact">
            <p>
              LexAssess
              <br />
              Email:{' '}
              <a href="mailto:contact@lexassess.in" className="text-primary hover:underline">
                contact@lexassess.in
              </a>
              <br />
              Address: New Delhi
            </p>
          </Section>
        </div>
      </main>
      <Footer />
    </>
  )
}
