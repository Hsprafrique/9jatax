import React from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'

const COMPANY = 'HSPR Technologies Limited'
const RC = 'RC 7163476'
const EMAIL = 'privacy@9jatax.app'
const APP = '9jaTax'

export default function Privacy() {
  return (
    <div className="min-h-screen" style={{ background: 'transparent' }}>
      <div className="sticky top-0 z-10 px-6 py-4 flex items-center gap-4"
        style={{ background: 'rgba(13,13,13,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <Link to="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#008751,#006B40)' }}>
            <span className="text-white font-bold text-xs">9T</span>
          </div>
          <span className="font-bold text-white text-sm">9jaTax</span>
        </Link>
        <span className="text-sm font-semibold text-white ml-2">Privacy Policy</span>
        <Link to="/terms" className="ml-auto text-sm" style={{ color: 'rgba(0,135,81,0.8)' }}>Terms of Service</Link>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="ng-flag-stripe rounded-full mb-8" />

        <div className="mb-10">
          <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Effective date: 1 January 2025</p>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Last updated: {format(new Date(), 'dd MMMM yyyy')}</p>
          <div className="mt-4 px-4 py-3 rounded-xl" style={{ background: 'rgba(0,135,81,0.08)', border: '1px solid rgba(0,135,81,0.2)' }}>
            <p className="text-sm text-white">
              {COMPANY} ({RC}) is committed to protecting your privacy in compliance with the
              <strong> Nigeria Data Protection Regulation (NDPR) 2019</strong>, the
              <strong> Nigeria Data Protection Act (NDPA) 2023</strong>, and guidelines issued by the
              <strong> Nigeria Data Protection Commission (NDPC)</strong>.
            </p>
          </div>
        </div>

        <div className="space-y-8 text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>

          <section>
            <p>
              This Privacy Policy explains how {COMPANY}, operating the {APP} platform at 9jatax.app ("we", "us", "our"),
              collects, uses, stores, protects, and discloses your personal data when you use our Service. Please read this
              policy carefully. By using {APP}, you consent to the practices described herein.
            </p>
          </section>

          {[
            {
              title: '1. Data Controller',
              content: `The data controller responsible for your personal data is ${COMPANY}, registered in Nigeria with 
              registration number ${RC}. For all privacy-related enquiries, contact our Data Protection Officer at: ${EMAIL}.`
            },
            {
              title: '2. Data We Collect',
              points: [
                'Identity data: Full name, business name, email address, phone number',
                'Business data: Business type, industry, registered address, RC Number, TIN',
                'Financial data: Invoice records, expense records, payroll information, transaction history',
                'Account data: Login credentials (passwords are hashed and never stored in plain text)',
                'Usage data: Pages visited, features used, session duration, device type and browser',
                'Payment data: Payment method, transaction references (full card numbers are never stored --- processed by Flutterwave)',
                'Communication data: Support enquiries, feedback, and correspondence with us',
              ]
            },
            {
              title: '3. Legal Basis for Processing',
              content: `We process your personal data on the following legal bases under the NDPA 2023: 
              (a) Contractual necessity --- to provide the Service you signed up for; 
              (b) Legitimate interests --- to improve the platform, detect fraud, and ensure security; 
              (c) Legal obligation --- to comply with applicable Nigerian laws including tax and financial reporting requirements; 
              (d) Consent --- for marketing communications, which you may withdraw at any time.`
            },
            {
              title: '4. How We Use Your Data',
              points: [
                'To create and manage your account',
                'To provide bookkeeping, invoicing, payroll, and tax compliance features',
                'To process subscription payments via Flutterwave',
                'To compute your internal Business Credit Score',
                'To send transactional communications (account alerts, payment confirmations)',
                'To send product updates and marketing communications (with your consent)',
                'To comply with legal and regulatory obligations under Nigerian law',
                'To detect, prevent, and investigate fraud or unauthorized access',
                'To improve, personalize, and develop the platform',
              ]
            },
            {
              title: '5. Data Sharing and Disclosure',
              content: `We do not sell your personal data to third parties. We may share your data with:`,
              points: [
                'Supabase Inc. --- our database and authentication infrastructure provider (data processed under data processing agreements)',
                'Flutterwave Technology Solutions Limited --- a CBN-licensed payment processor, for payment processing only',
                'Email service providers --- for transactional and marketing communications',
                'Nigerian regulatory authorities (FIRS, CAC, NDPC, CBN, law enforcement) --- where required by valid legal process or applicable law',
                'Professional advisers --- lawyers, auditors, and accountants under confidentiality obligations',
                'Accountants you invite --- through our Accountant Portal, with access levels you control',
              ]
            },
            {
              title: '6. Data Retention',
              content: `We retain your personal data for as long as your account is active and for a period of 7 years 
              after account termination, in compliance with the Companies Income Tax Act and other applicable Nigerian 
              financial record-keeping requirements. After the retention period, data is securely deleted or anonymised. 
              You may request earlier deletion subject to our legal obligations.`
            },
            {
              title: '7. Data Security',
              content: `We implement appropriate technical and organisational security measures including: 
              TLS/SSL encryption for all data in transit; AES-256 encryption for sensitive data at rest; 
              Row-Level Security (RLS) on our database ensuring each user can only access their own data; 
              Multi-factor authentication options; regular security audits; and access controls limiting 
              staff access to personal data on a need-to-know basis. Despite these measures, no system is 
              completely secure. You are responsible for maintaining the security of your account credentials.`
            },
            {
              title: '8. Your Rights Under the NDPA 2023',
              content: `As a data subject under Nigerian law, you have the following rights:`,
              points: [
                'Right of access --- request a copy of the personal data we hold about you',
                'Right to rectification --- correct inaccurate or incomplete personal data',
                'Right to erasure --- request deletion of your data subject to legal retention obligations',
                'Right to data portability --- receive your data in a structured, machine-readable format',
                'Right to object --- object to processing based on legitimate interests',
                'Right to withdraw consent --- withdraw consent for marketing at any time',
                'Right to lodge a complaint --- with the Nigeria Data Protection Commission (NDPC) at ndpc.gov.ng',
              ]
            },
            {
              title: '9. Children\'s Privacy',
              content: `The Service is not directed to individuals under 18 years of age. We do not knowingly collect 
              personal data from minors. If we become aware that we have collected data from a minor without parental 
              consent, we will delete it promptly.`
            },
            {
              title: '10. International Data Transfers',
              content: `Your data may be processed on servers located outside Nigeria (including data centres operated 
              by Supabase). Where we transfer personal data internationally, we ensure appropriate safeguards are in 
              place in accordance with the NDPA 2023 and NDPC guidelines, including data processing agreements with 
              standard contractual clauses.`
            },
            {
              title: '11. Cookies and Tracking',
              content: `We use essential cookies to maintain your session and authentication state. We do not use 
              third-party advertising cookies or tracking pixels for targeted advertising. Analytics data collected 
              is aggregated and anonymised. You may disable cookies in your browser settings, though this may affect 
              functionality.`
            },
            {
              title: '12. Flutterwave Payments',
              content: `When you process payments through the Service, you are also subject to Flutterwave's Privacy 
              Policy and Terms of Service. Flutterwave is a licensed payment service provider regulated by the Central 
              Bank of Nigeria. ${COMPANY} does not store full payment card details --- all payment data is handled 
              directly by Flutterwave's PCI-DSS compliant infrastructure.`
            },
            {
              title: '13. Changes to This Policy',
              content: `We may update this Privacy Policy periodically. Material changes will be communicated to 
              registered users by email or in-app notification at least 14 days before taking effect. The "Last updated" 
              date at the top reflects the most recent revision. Your continued use of the Service after changes take 
              effect constitutes acceptance of the updated policy.`
            },
            {
              title: '14. Contact and Complaints',
              content: `To exercise your rights or for any privacy concerns, contact our Data Protection Officer at ${EMAIL}. 
              If you are not satisfied with our response, you have the right to lodge a complaint with the Nigeria Data 
              Protection Commission (NDPC) at www.ndpc.gov.ng or info@ndpc.gov.ng.`
            },
          ].map(section => (
            <section key={section.title}>
              <h2 className="text-base font-bold text-white mb-3">{section.title}</h2>
              {section.content && <p className="mb-2">{section.content}</p>}
              {section.points && (
                <ul className="space-y-2 ml-4">
                  {section.points.map((p, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#008751' }} />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          <div className="ng-flag-stripe rounded-full mt-10" />
          <p className="text-center text-xs pt-2" style={{ color: 'rgba(255,255,255,0.25)' }}>
            &copy; {new Date().getFullYear()} {COMPANY} -- {RC} -- Federal Republic of Nigeria
          </p>
        </div>
      </div>
    </div>
  )
}
