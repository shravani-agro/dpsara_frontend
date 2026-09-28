import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms and Conditions - DPSara Booking",
  description: "Read the terms and conditions for using DPSara's satta matka booking platform. Understand the rules, eligibility, and user obligations before playing.",
  keywords: ["terms", "conditions", "satta matka", "booking", "rules", "eligibility", "user agreement"],
  openGraph: {
    title: "Terms and Conditions - DPSara Booking",
    description: "Read the terms and conditions for using DPSara's satta matka booking platform.",
    type: "website",
  },
};

const sections = [
  {
    id: "eligibility",
    title: "1. Eligibility",
    content: (
      <>
        <p>
          You must be at least 18 years old to use this platform. By accessing or using DPSara, you
          represent and warrant that you are of legal age to form a binding contract with us and meet all
          eligibility requirements. If you do not meet these requirements, you must not use the service.
        </p>
      </>
    ),
  },
  {
    id: "account",
    title: "2. Account Registration",
    content: (
      <>
        <p>
          To access certain features, you must register for an account. You agree to provide accurate,
          current, and complete information during registration and to update such information to keep it
          accurate and complete. You are responsible for maintaining the confidentiality of your account
          credentials and for all activities that occur under your account.
        </p>
      </>
    ),
  },
  {
    id: "gameplay",
    title: "3. Game Rules and Bidding",
    content: (
      <>
        <p>
          All bids placed on DPSara are final and cannot be canceled or modified once submitted. Results
          are declared based on the official market timings. Prizes are awarded strictly according to the
          published rates. We reserve the right to disqualify any bid that appears suspicious or violates
          these terms at our sole discretion.
        </p>
      </>
    ),
  },
  {
    id: "payments",
    title: "4. Payments and Withdrawals",
    content: (
      <>
        <p>
          All transactions are processed through trusted third-party payment providers. Deposits are
          typically instant, and withdrawals are processed within 24 hours of approval. A minimum
          withdrawal amount may apply depending on your payment method. Any disputes related to payments
          must be raised within 7 days of the transaction.
        </p>
      </>
    ),
  },
  {
    id: "prohibited",
    title: "5. Prohibited Activities",
    content: (
      <>
        <ul className="list-disc space-y-1.5 pl-6 text-slate-300">
          <li>Using multiple accounts or attempting to circumvent platform restrictions.</li>
          <li>Placing bids on behalf of others or engaging in proxy bidding.</li>
          <li>Interfering with the website's functionality or security measures.</li>
          <li>Attempting to manipulate game results or market rates.</li>
          <li>Using bots, scripts, or automated tools to access the platform.</li>
        </ul>
      </>
    ),
  },
  {
    id: "liability",
    title: "6. Limitation of Liability",
    content: (
      <>
        <p>
          DPSara provides the platform "as is" and "as available." We do not warrant that the service
          will be uninterrupted, secure, or error-free. To the fullest extent permitted by law, we shall
          not be liable for any indirect, incidental, special, or consequential damages, including lost
          profits, data, or business opportunities.
        </p>
      </>
    ),
  },
  {
    id: "termination",
    title: "7. Termination",
    content: (
      <>
        <p>
          We reserve the right, at our sole discretion, to suspend or terminate your account and access to
          the service at any time, with or without cause, and without liability. Upon termination, your
          right to use the service will cease immediately.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    title: "8. Changes to Terms",
    content: (
      <>
        <p>
          We may revise these terms from time to time. Changes will be posted on this page with an updated
          "Last Updated" date. Your continued use of the service after any changes constitutes acceptance of
          the new terms.
        </p>
      </>
    ),
  },
];

export default function TermsPage() {
  return (
    <div className="mesh-bg min-h-screen text-slate-300">
      <div className="mx-auto max-w-3xl px-6 py-16 sm:px-8 lg:py-24">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Terms & Conditions
          </h1>
          <p className="mt-4 text-slate-400">Last updated: August 14, 2026</p>
        </div>

        <div className="space-y-10">
          {sections.map((section) => (
            <section key={section.id} id={section.id}>
              <h2 className="text-xl font-bold text-white">{section.title}</h2>
              <div className="mt-3 space-y-3 text-sm leading-relaxed sm:text-base">
                {section.content}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-16 border-t border-white/10 pt-8 text-center">
          <p className="text-sm text-slate-500">
            By using DPSara, you acknowledge that you have read, understood, and agree to these Terms
            and Conditions.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block text-sm font-medium text-brand-400 hover:text-brand-300"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
