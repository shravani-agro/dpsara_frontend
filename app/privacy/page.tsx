import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy - DPSara Booking",
  description: "Learn how DPSara collects, uses, and protects your personal information. Read our privacy policy to understand your data rights.",
  keywords: ["privacy policy", "data protection", "personal information", "satta matka", "user data", "GDPR"],
  openGraph: {
    title: "Privacy Policy - DPSara Booking",
    description: "Learn how DPSara collects, uses, and protects your personal information.",
    type: "website",
  },
};

const sections = [
  {
    id: "introduction",
    title: "1. Introduction",
    content: (
      <p>
        At DPSara, we are committed to protecting your personal information. This Privacy Policy explains
        how we collect, use, disclose, and safeguard your information when you use our satta matka booking
        platform. Please read this policy carefully before using our services.
      </p>
    ),
  },
  {
    id: "data-collection",
    title: "2. Information We Collect",
    content: (
      <>
        <h3 className="mb-2 text-sm font-semibold text-slate-200">Personal Information</h3>
        <p>
          We may collect personally identifiable information that you provide directly, including but not
          limited to your name, email address, phone number, and payment information.
        </p>

        <h3 className="mb-2 text-sm font-semibold text-slate-200">Usage Information</h3>
        <p>
          We automatically collect information about your interactions with our platform, including IP
          address, browser type, device information, pages visited, and time spent on the site.
        </p>

        <h3 className="mb-2 text-sm font-semibold text-slate-200">Cookies and Tracking</h3>
        <p>
          We use cookies and similar tracking technologies to enhance your experience and analyze platform
          usage. You can control cookies through your browser settings.
        </p>
      </>
    ),
  },
  {
    id: "data-use",
    title: "3. How We Use Your Information",
    content: (
      <ul className="list-disc space-y-1.5 pl-6 text-slate-300">
        <li>To provide, operate, and maintain our services.</li>
        <li>To process your bids, payments, and withdrawals.</li>
        <li>To notify you of important updates, results, and promotions.</li>
        <li>To detect and prevent fraudulent or unauthorized activities.</li>
        <li>To improve and personalize your user experience.</li>
      </ul>
    ),
  },
  {
    id: "data-sharing",
    title: "4. Sharing Your Information",
    content: (
      <p>
        We do not sell, trade, or rent your personal information to third parties. We may share your data
        with trusted service providers who assist us in operating our platform, conducting business, or
        serving you, provided they agree to keep your information confidential. We may also disclose
        information when required by law or to protect our rights and safety.
      </p>
    ),
  },
  {
    id: "security",
    title: "5. Data Security",
    content: (
      <p>
        The security of your information is important to us. We use industry-standard administrative,
        technical, and physical safeguards to protect your data. However, no method of transmission over the
        internet or electronic storage is completely secure, and we cannot guarantee absolute security.
      </p>
    ),
  },
  {
    id: "rights",
    title: "6. Your Rights",
    content: (
      <ul className="list-disc space-y-1.5 pl-6 text-slate-300">
        <li>Access and obtain a copy of your personal data.</li>
        <li>Request correction of inaccurate or incomplete information.</li>
        <li>Request deletion of your data (subject to legal obligations).</li>
        <li>Object to processing for direct marketing purposes.</li>
        <li>Lodge a complaint with a relevant data protection authority.</li>
      </ul>
    ),
  },
  {
    id: "changes",
    title: "7. Changes to This Policy",
    content: (
      <p>
        We may update this Privacy Policy from time to time. We will notify you of any changes by posting
        the new policy on this page with an updated "Last Updated" date. Your continued use of the service
        after any changes constitutes acceptance of the updated policy.
      </p>
    ),
  },
  {
    id: "contact",
    title: "8. Contact Us",
    content: (
      <p>
        If you have any questions about this Privacy Policy or your personal data, please contact our
        support team through the{" "}
        <Link href="/support" className="text-brand-400 hover:underline">
          Support
        </Link>{" "}
        page.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <div className="mesh-bg min-h-screen text-slate-300">
      <div className="mx-auto max-w-3xl px-6 py-16 sm:px-8 lg:py-24">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Privacy Policy
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
          <Link
            href="/"
            className="inline-block text-sm font-medium text-brand-400 hover:text-brand-300"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
