import React from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'

const EFFECTIVE_DATE = '1 January 2025'
const COMPANY = 'HSPR Technologies Limited'
const RC = 'RC 7163476'
const ADDRESS = 'Nigeria'
const EMAIL = 'legal@9jatax.app'
const APP = '9jaTax'
const DOMAIN = '9jatax.app'

export default function Terms() {
  return (
    <div className="min-h-screen" style={{ background: 'transparent' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 px-6 py-4 flex items-center gap-4"
        style={{ background: 'rgba(13,13,13,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <Link to="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#008751,#006B40)' }}>
            <span className="text-white font-bold text-xs">9T</span>
          </div>
          <span className="font-bold text-white text-sm">9jaTax</span>
        </Link>
        <span className="text-sm font-semibold text-white ml-2">Terms of Service</span>
        <Link to="/privacy" className="ml-auto text-sm" style={{ color: 'rgba(0,135,81,0.8)' }}>Privacy Policy</Link>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Flag stripe */}
        <div className="ng-flag-stripe rounded-full mb-8" />

        <div className="mb-10">
          <h1 className="text-3xl font-bold text-white mb-2">Terms of Service</h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Effective date: {EFFECTIVE_DATE}</p>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Last updated: {format(new Date(), 'dd MMMM yyyy')}</p>
        </div>

        <div className="space-y-8 text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>

          {/* Intro */}
          <section>
            <p>
              These Terms of Service ("Terms") constitute a legally binding agreement between you ("User", "you", or "your")
              and <strong className="text-white">{COMPANY}</strong> ({RC}), a company duly incorporated under the
              Companies and Allied Matters Act (CAMA) 2020 of the Federal Republic of Nigeria
              ("Company", "we", "us", or "our"), governing your access to and use of the {APP} platform
              available at <strong className="text-white">{DOMAIN}</strong> and its associated mobile and desktop applications
              (collectively, the "Service").
            </p>
            <p className="mt-4">
              BY ACCESSING OR USING THE SERVICE, YOU AGREE TO BE BOUND BY THESE TERMS. IF YOU DO NOT AGREE,
              DO NOT ACCESS OR USE THE SERVICE.
            </p>
          </section>

          {[
            {
              title: '1. Company Information',
              content: `${COMPANY} is registered in the Federal Republic of Nigeria with registration number ${RC}. 
              Our registered address is ${ADDRESS}. For all legal correspondence, contact us at ${EMAIL}.
              ${APP} is a financial management and bookkeeping SaaS platform designed for Nigerian small and 
              medium-sized enterprises (SMEs) and their accountants.`
            },
            {
              title: '2. Eligibility',
              content: `You must be at least 18 years of age to use this Service. By using the Service, you represent 
              and warrant that you are of legal age and capacity to enter into a binding contract under Nigerian law. 
              If you are using the Service on behalf of a business entity, you represent that you have the authority 
              to bind that entity to these Terms.`
            },
            {
              title: '3. Account Registration',
              content: `You must register an account to access most features of the Service. You agree to: (a) provide 
              accurate, complete, and current registration information; (b) maintain the security of your account credentials; 
              (c) promptly update your information when it changes; (d) accept responsibility for all activities that occur 
              under your account. We reserve the right to suspend or terminate accounts that contain false information or 
              violate these Terms.`
            },
            {
              title: '4. Subscription and Payment',
              content: `The Service is offered on a freemium model. The Free plan is available at no charge with defined 
              usage limits. Paid plans (Pro and Business) are billed monthly in Nigerian Naira (NGN). All payments are 
              processed through Flutterwave, a licensed payment service provider regulated by the Central Bank of Nigeria (CBN). 
              Subscription fees are non-refundable except as required by applicable Nigerian consumer protection law. 
              We reserve the right to modify pricing with 30 days written notice to active subscribers.`
            },
            {
              title: '5. Acceptable Use',
              content: `You agree to use the Service only for lawful purposes and in compliance with all applicable Nigerian 
              federal and state laws, including but not limited to the Finance Act, Companies Income Tax Act, Personal Income 
              Tax Act, Value Added Tax Act, and relevant FIRS regulations. You shall not: (a) use the Service to facilitate 
              tax evasion or fraud; (b) upload false financial information; (c) attempt to circumvent security measures; 
              (d) resell or sublicense access to the Service without our written consent; (e) use the Service in any manner 
              that could damage, disable, or impair the platform.`
            },
            {
              title: '6. Financial Data and Tax Information',
              content: `${APP} is a bookkeeping and financial management tool. The tax calculations, PAYE computations, 
              VAT summaries, and credit scores provided by the Service are for informational and planning purposes only. 
              They do not constitute tax advice, legal advice, or certified financial statements. The Company is not a 
              licensed tax consultant, auditor, or financial institution. You remain solely responsible for the accuracy 
              of your tax filings with the Federal Inland Revenue Service (FIRS) and any relevant State Internal Revenue 
              Services (SIRS). We recommend consulting a qualified accountant or tax professional for formal tax advice.`
            },
            {
              title: '7. Business Credit Score',
              content: `The 9jaTax Business Credit Score is a proprietary internal metric computed solely from your 
              activity on the ${APP} platform. It is not a formal credit score, does not originate from any licensed 
              credit bureau, and has no direct effect on your official credit history with the Credit Risk Management 
              System (CRMS) of the CBN or any bureau registered under the Credit Reporting Act 2017. 
              Loan eligibility estimates displayed on the platform are indicative only and are not pre-approval or 
              guarantee of credit from any financial institution. ${COMPANY} is not a lending institution, microfinance 
              bank, or licensed lender under the Banks and Other Financial Institutions Act (BOFIA).`
            },
            {
              title: '8. Intellectual Property',
              content: `All content, features, and functionality of the Service, including but not limited to software, 
              text, graphics, logos, and design, are the exclusive property of ${COMPANY} and are protected by Nigerian 
              copyright law, the Copyright Act 2022 (as amended), and applicable international intellectual property 
              conventions. You are granted a limited, non-exclusive, non-transferable licence to use the Service solely 
              for your internal business purposes. You may not copy, modify, distribute, or create derivative works without 
              our express written consent.`
            },
            {
              title: '9. Data Privacy',
              content: `Your use of the Service is also governed by our Privacy Policy, which is incorporated by reference 
              into these Terms. We process personal data in accordance with the Nigeria Data Protection Regulation (NDPR) 
              2019, the Nigeria Data Protection Act (NDPA) 2023, and applicable guidelines issued by the Nigeria Data 
              Protection Commission (NDPC). By using the Service, you consent to such processing as described in our 
              Privacy Policy.`
            },
            {
              title: '10. Confidentiality',
              content: `We treat your business financial data as strictly confidential. We do not sell your personal or 
              business financial data to third parties. Aggregated and anonymised data may be used for platform improvement 
              and analytics. We may disclose information where required by a valid court order, regulatory authority, or 
              applicable Nigerian law.`
            },
            {
              title: '11. Service Availability',
              content: `We endeavour to maintain high availability of the Service but do not guarantee uninterrupted access. 
              The Service may be temporarily unavailable due to maintenance, upgrades, or circumstances beyond our control. 
              We shall not be liable for any losses arising from service interruptions except to the extent caused by our 
              gross negligence or willful misconduct.`
            },
            {
              title: '12. Limitation of Liability',
              content: `To the maximum extent permitted by Nigerian law, ${COMPANY} shall not be liable for any indirect, 
              incidental, special, consequential, or punitive damages arising from your use of the Service, including but 
              not limited to loss of profits, data, or business opportunities. Our aggregate liability to you for any claims 
              arising under these Terms shall not exceed the total subscription fees paid by you in the three (3) months 
              preceding the claim.`
            },
            {
              title: '13. Indemnification',
              content: `You agree to indemnify, defend, and hold harmless ${COMPANY}, its directors, employees, agents, 
              and affiliates from any claims, damages, losses, liabilities, costs, and expenses (including legal fees) 
              arising from: (a) your use of the Service; (b) your violation of these Terms; (c) your violation of any 
              third-party rights; or (d) inaccurate financial data you submit to the platform.`
            },
            {
              title: '14. Termination',
              content: `Either party may terminate the account at any time. You may cancel your subscription through your 
              account settings. We reserve the right to suspend or terminate your account without notice if we reasonably 
              believe you are in breach of these Terms, applicable law, or pose a risk to the integrity of our platform 
              or other users. Upon termination, your right to access the Service ceases immediately. You may request an 
              export of your data within 30 days of termination.`
            },
            {
              title: '15. Governing Law and Dispute Resolution',
              content: `These Terms shall be governed by and construed in accordance with the laws of the Federal Republic 
              of Nigeria. Any disputes arising from these Terms or the use of the Service shall first be submitted to 
              good-faith negotiation. If unresolved within 30 days, disputes shall be submitted to binding arbitration 
              under the Arbitration and Conciliation Act (ACA) 2023 of Nigeria. The seat of arbitration shall be Lagos, 
              Nigeria. Judgment on the award may be entered in any court of competent jurisdiction. Nothing herein 
              prevents either party from seeking urgent injunctive relief from a Nigerian court of competent jurisdiction.`
            },
            {
              title: '16. Amendments',
              content: `We reserve the right to modify these Terms at any time. Material changes will be communicated to 
              registered users via email or in-app notification at least 14 days before taking effect. Your continued use 
              of the Service after the effective date of any changes constitutes your acceptance of the revised Terms.`
            },
            {
              title: '17. Severability',
              content: `If any provision of these Terms is found to be invalid or unenforceable under Nigerian law, that 
              provision shall be severed and the remaining provisions shall continue in full force and effect.`
            },
            {
              title: '18. Contact',
              content: `For questions about these Terms, please contact us at: ${EMAIL} | ${COMPANY}, ${ADDRESS}, Federal Republic of Nigeria.`
            },
          ].map(section => (
            <section key={section.title}>
              <h2 className="text-base font-bold text-white mb-3">{section.title}</h2>
              <p>{section.content}</p>
            </section>
          ))}

          <div className="ng-flag-stripe rounded-full mt-10" />
          <p className="text-center text-xs pt-2" style={{ color: 'rgba(255,255,255,0.25)' }}>
            &copy; {new Date().getFullYear()} {COMPANY} -- {RC} -- All rights reserved -- Federal Republic of Nigeria
          </p>
        </div>
      </div>
    </div>
  )
}
