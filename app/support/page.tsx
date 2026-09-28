import type { Metadata } from "next";
import Link from "next/link";
import { Mail, Phone, Clock, MessageCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Support - DPSara Booking",
  description: "Contact DPSara support team 24/7 for help with account issues, payments, withdrawals, and technical problems.",
  keywords: ["support", "contact", "help", "satta matka", "24/7 support", "customer service"],
  openGraph: {
    title: "Support - DPSara Booking",
    description: "Contact DPSara support team 24/7 for help with your account.",
    type: "website",
  },
};

const contactMethods = [
  {
    icon: Mail,
    title: "Email Support",
    value: "support@dpsara.in",
    description: "Send us an email and we'll respond within 2 hours.",
  },
  {
    icon: Phone,
    title: "Phone Support",
    value: "+91 900XXXXXXXX",
    description: "Call us for immediate assistance during business hours.",
  },
  {
    icon: MessageCircle,
    title: "Live Chat",
    value: "Chat on our website",
    description: "Available 24/7 for instant help with your queries.",
  },
  {
    icon: Clock,
    title: "Support Hours",
    value: "24/7 Available",
    description: "Our support team is always ready to assist you.",
  },
];

const faqs = [
  {
    question: "How do I register an account?",
    answer: "Click on the 'Download App' button on the homepage, install the app, and sign up using your mobile number or email address. Follow the on-screen instructions to complete registration.",
  },
  {
    question: "What is the minimum deposit amount?",
    answer: "The minimum deposit is ₹500. You can deposit any amount above this threshold using UPI, bank transfer, or other supported payment methods.",
  },
  {
    question: "How long do withdrawals take?",
    answer: "Withdrawals are typically processed within 24 hours of approval. The funds will be credited to your bank account based on your bank's processing time.",
  },
  {
    question: "Can I cancel or modify a bid after placing it?",
    answer: "No. All bids are final once submitted. Please double-check your bid before confirming. Results are declared strictly according to the official market timings.",
  },
  {
    question: "What should I do if my deposit hasn't reflected?",
    answer: "Wait for at least 15 minutes after the transaction. If it still doesn't reflect, contact support with your transaction ID and registered mobile number.",
  },
];

export default function SupportPage() {
  return (
    <div className="mesh-bg min-h-screen">
      <div className="mx-auto max-w-7xl px-6 py-16 sm:px-8 lg:py-24">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Support Center
          </h1>
          <p className="mt-4 text-lg text-slate-400">
            We're here to help 24/7. Contact us through any of the channels below.
          </p>
        </div>

        {/* Contact Methods */}
        <div className="mb-16 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {contactMethods.map((method) => {
            const Icon = method.icon;
            return (
              <div
                key={method.title}
                className="relative rounded-2xl border border-white/10 bg-ink-900/60 p-6 text-center shadow-card backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-brand-500/30"
              >
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-brand-500/20 bg-brand-500/10">
                  <Icon className="h-6 w-6 text-brand-400" />
                </div>
                <h3 className="mb-1 text-sm font-semibold text-white">{method.title}</h3>
                <p className="mb-2 text-sm text-brand-300">{method.value}</p>
                <p className="text-xs text-slate-500">{method.description}</p>
              </div>
            );
          })}
        </div>

        {/* FAQ Section */}
        <div>
          <h2 className="mb-2 text-2xl font-bold text-white">Frequently Asked Questions</h2>
          <p className="mb-8 text-slate-400">
            Find quick answers to common questions below.
          </p>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="rounded-xl border border-white/10 bg-ink-900/40 p-5 transition-all duration-200 hover:border-white/20"
              >
                <h3 className="mb-2 text-base font-semibold text-white">{faq.question}</h3>
                <p className="text-sm leading-relaxed text-slate-400">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Back link */}
        <div className="mt-16 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-brand-400 hover:text-brand-300"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
