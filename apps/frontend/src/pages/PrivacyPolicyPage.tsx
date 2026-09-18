import { Header, Footer } from '@/components/landing'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  )
}

export function PrivacyPolicyPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-6 py-16 md:px-12">
        <div className="mb-10 space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
        </div>

        <div className="space-y-10">
          <p className="text-sm leading-relaxed text-muted-foreground">
            This Privacy Policy explains how LexAssess, the operator of the website lexassess.in and its
            associated dashboard, applications, and services (collectively, the &quot;Platform&quot;), collects,
            uses, discloses, and protects the personal data of individuals who access or use the Platform,
            including through the account and dashboard setup process at lexassess.in/dashboard/setup (&quot;Users&quot;,
            &quot;you&quot;).
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            This Policy is framed in accordance with the Digital Personal Data Protection Act, 2023
            (&quot;DPDP Act&quot;) and the rules made thereunder, and applies to Users located in India. By creating an
            account, completing dashboard setup, or otherwise using the Platform, you agree to the collection
            and processing of your personal data as described in this Policy.
          </p>

          <Section title="1. Who We Are">
            <p>
              LexAssess is a legal assessment, quiz, and examination platform that enables individuals and
              institutions to create, take, administer, and evaluate legal aptitude and knowledge assessments.
              As the entity determining the purpose and means of processing your personal data, LexAssess acts
              as a &quot;Data Fiduciary&quot; under the DPDP Act, and you, as the individual to whom the data relates,
              are the &quot;Data Principal.&quot;
            </p>
          </Section>

          <Section title="2. Personal Data We Collect">
            <p>
              We collect personal data that you voluntarily provide to us, primarily during account creation
              and dashboard setup, and data generated through your use of the Platform.
            </p>
            <p className="font-medium text-foreground">2.1 Account and Setup Information</p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Basic account details: full name, email address, and password (stored in encrypted/hashed form).</li>
              <li>Phone number and OTP verification data: your mobile number, used to send and verify one-time passwords (OTPs) for account verification, login, and security purposes.</li>
              <li>Institution/organization and role details: the name of your institution, college, firm, or organization, your role or designation (e.g., student, faculty, administrator, candidate), and related profile information you choose to add during setup.</li>
            </ul>
            <p className="font-medium text-foreground">2.2 Payment and Billing Information</p>
            <p>Billing name, billing address, and transaction details where you purchase a subscription, assessment package, or paid service.</p>
            <p>
              We do not directly store full card, UPI, or net-banking credentials. Payment transactions are
              processed by our third-party, RBI-authorised payment gateway partner(s), who collect and process
              this information under their own security standards and privacy policies. We retain only limited
              transaction metadata (e.g., amount, date, status, and a masked reference/transaction ID) for
              accounting, invoicing, and dispute-resolution purposes.
            </p>
            <p className="font-medium text-foreground">2.3 Assessment and Usage Data</p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Responses, scores, time taken, and performance data generated when you take, create, or administer an assessment on the Platform.</li>
              <li>Log and device data such as IP address, browser type, device identifiers, access timestamps, and pages viewed, collected automatically through cookies and similar technologies (see Section 7).</li>
            </ul>
            <p className="font-medium text-foreground">2.4 Information from Institutions/Administrators</p>
            <p>
              Where you access the Platform through an institution, employer, or organization that has set up
              a group or bulk account, we may receive your name, email, phone number, and role from that
              institution&apos;s administrator. We process such data on the basis of the arrangement between us
              and the institution, and the institution is responsible for ensuring it has a lawful basis to
              share your data with us.
            </p>
          </Section>

          <Section title="3. How and Why We Use Your Personal Data">
            <p>
              We process your personal data only for the specified purposes for which you give consent, and
              for other purposes permitted under the DPDP Act (such as compliance with law). We use your data
              to:
            </p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Create, verify (including via OTP), and maintain your account and dashboard setup.</li>
              <li>Provide, operate, and personalize the assessment and quiz features of the Platform.</li>
              <li>Process payments, generate invoices/receipts, and manage subscriptions.</li>
              <li>Communicate with you regarding your account, assessments, results, service updates, and support requests.</li>
              <li>Maintain the security and integrity of the Platform, detect and prevent fraud, cheating, or unauthorized access during assessments.</li>
              <li>Generate aggregated, de-identified analytics to improve the Platform&apos;s features and performance.</li>
              <li>Comply with applicable law, regulatory requirements, and lawful requests from government or judicial authorities.</li>
              <li>Enforce our Terms of Use and protect our legal rights.</li>
            </ul>
            <p>We do not use your personal data for any purpose beyond what you have consented to, except where permitted or required by law.</p>
          </Section>

          <Section title="4. Consent">
            <p>
              Before or at the time of collecting your personal data, we will provide you with a notice
              describing the personal data being collected and the purpose of processing, and will seek your
              free, specific, informed, unconditional, and unambiguous consent, in accordance with Section 6
              of the DPDP Act. You may:
            </p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Withdraw your consent at any time, with the same ease as it was given, by writing to our Grievance Officer (Section 10) or through the account settings on the Platform, without affecting the lawfulness of processing carried out before withdrawal.</li>
              <li>Note that withdrawing consent for certain data (e.g., OTP verification, payment information) may mean we are unable to continue providing you the relevant part of the service.</li>
            </ul>
            <p>
              Where our processing is necessary for a purpose exempted from the consent requirement under the
              DPDP Act (for example, compliance with a court order or a legal obligation), we will process
              your data only to the extent necessary for that purpose.
            </p>
          </Section>

          <Section title="5. Children's Data">
            <p>
              Where the Platform is used by, or an assessment is administered to, individuals below the age of
              18, we treat such individuals as &quot;children&quot; under the DPDP Act and:
            </p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Obtain verifiable consent of the parent or lawful guardian before processing the child&apos;s personal data, typically collected through the parent/guardian or the enrolling institution at the time of account setup.</li>
              <li>Do not undertake tracking, behavioural monitoring, or targeted advertising directed at children.</li>
              <li>Process children&apos;s data strictly for purposes that are in the child&apos;s interest, such as delivering and evaluating the assessment.</li>
            </ul>
            <p>
              Institutions and administrators who set up accounts on behalf of minor students represent to us
              that they have obtained the necessary parental/guardian consent required under law.
            </p>
          </Section>

          <Section title="6. Sharing and Disclosure of Personal Data">
            <p>We do not sell your personal data. We may share personal data with:</p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Service providers and processors engaged to operate the Platform, including cloud hosting providers, SMS/OTP gateway providers, email/communication providers, payment gateway providers, and analytics providers, who process data on our behalf and under contractual confidentiality and security obligations.</li>
              <li>Institutions/administrators, where you have registered under an institutional or organizational account, to the extent necessary for them to review results, manage cohorts, or administer assessments.</li>
              <li>Legal and regulatory authorities, where disclosure is required to comply with applicable law, a court order, or a lawful government request.</li>
              <li>Successors in a business transaction, such as a merger, acquisition, or sale of assets, subject to equivalent privacy protections.</li>
            </ul>
            <p>Any third party with whom we share personal data is contractually bound to process it only for the specified purpose and to implement reasonable security safeguards.</p>
          </Section>

          <Section title="7. Cookies and Tracking Technologies">
            <p>The Platform uses cookies, local storage, and similar technologies to:</p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Keep you logged in and maintain session security during assessments.</li>
              <li>Remember preferences and dashboard settings.</li>
              <li>Analyze usage patterns to improve the Platform.</li>
            </ul>
            <p>You can control or disable cookies through your browser settings; however, disabling essential cookies may affect your ability to log in, complete dashboard setup, or take assessments.</p>
          </Section>

          <Section title="8. Data Retention">
            <p>
              We retain personal data only for as long as necessary to fulfil the purposes described in this
              Policy, or as required by applicable law (including tax, accounting, and regulatory
              requirements). Where you withdraw consent or request erasure and there is no other legal ground
              or business requirement to retain the data, we will erase your personal data and direct our data
              processors to do the same, unless retention is necessary for compliance with a legal obligation.
            </p>
            <p>
              Assessment records connected to an institutional account may be retained for the period
              specified in our agreement with the relevant institution, or as required for
              academic/examination record-keeping.
            </p>
          </Section>

          <Section title="9. Your Rights as a Data Principal">
            <p>Subject to the DPDP Act and applicable exemptions, you have the right to:</p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Access a summary of the personal data we hold about you and the processing activities undertaken.</li>
              <li>Correction and updating of inaccurate or incomplete personal data.</li>
              <li>Erasure of personal data that is no longer necessary for the purpose for which it was collected, subject to legal retention requirements.</li>
              <li>Grievance redressal, by lodging a complaint with our Grievance Officer (Section 10) before approaching the Data Protection Board of India.</li>
              <li>Nominate another individual to exercise these rights on your behalf in the event of your death or incapacity, through the account settings or by written request.</li>
              <li>Withdraw consent at any time, as described in Section 4.</li>
            </ul>
            <p>To exercise any of these rights, please contact us using the details in Section 10. We will respond within the timelines prescribed under the DPDP Act and its rules.</p>
          </Section>

          <Section title="10. Grievance Officer and Contact Details">
            <p>
              In accordance with the DPDP Act, we have designated a Grievance Officer to address your queries
              and complaints regarding the processing of your personal data:
            </p>
            <p>
              Grievance Officer: Hemant
              <br />
              Email:{' '}
              <a href="mailto:lexassessofficial@gmail.com" className="text-primary hover:underline">
                lexassessofficial@gmail.com
              </a>
              <br />
              Response timeline: We aim to acknowledge and resolve grievances within the period prescribed
              under the DPDP Rules.
            </p>
          </Section>

          <Section title="11. Data Security">
            <p>
              We implement reasonable technical and organizational security safeguards to protect personal
              data against unauthorized access, alteration, disclosure, or destruction, including encryption
              of passwords, access controls, and secure hosting infrastructure. However, no method of
              transmission or storage is completely secure, and we cannot guarantee absolute security.
            </p>
            <p>
              In the event of a personal data breach, we will notify the Data Protection Board of India and
              affected Data Principals in the manner and timeline prescribed under the DPDP Act.
            </p>
          </Section>

          <Section title="12. Cross-Border Data Transfer">
            <p>
              As this Policy currently applies to India-based Users, personal data is primarily stored and
              processed within India. Where any processing occurs through service providers with
              infrastructure outside India, such transfers will only be made to jurisdictions not restricted
              by the Central Government under the DPDP Act, and with appropriate contractual safeguards in
              place.
            </p>
          </Section>

          <Section title="13. Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time to reflect changes in our practices, the
              Platform&apos;s features, or applicable law. We will post the revised Policy on this page with an
              updated &quot;Last Updated&quot; date, and, where the changes are material, provide additional notice
              (such as an email or in-app notification) before the changes take effect.
            </p>
          </Section>

          <Section title="14. Contact Us">
            <p>
              For any questions about this Privacy Policy or our data practices, please contact:
              <br />
              LexAssess
              <br />
              Email:{' '}
              <a href="mailto:lexassessofficial@gmail.com" className="text-primary hover:underline">
                lexassessofficial@gmail.com
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
