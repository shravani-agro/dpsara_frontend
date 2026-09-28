"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import Link from "next/link";

const faqs = [
  {
    question: "What is Satta Matka?",
    answer:
      "Satta Matka is a traditional Indian betting game based on guessing numbers. Players bet on numbers and the winning number is declared based on open, close, and jodi results at specific market times.",
  },
  {
    question: "How do I place a bid?",
    answer:
      "Select your game type (Single, Jodi, Patti, etc.), enter your chosen numbers, and add the desired amount. Confirm your bid before the market cutoff time to participate in that round.",
  },
  {
    question: "Can I withdraw my winnings?",
    answer:
      "Yes, you can withdraw your winnings instantly after they are credited to your account. Minimum withdrawal amount and processing time may vary based on your payment method.",
  },
  {
    question: "Is my personal information secure?",
    answer:
      "Absolutely. We use end-to-end encryption and industry-standard security measures to protect your personal and financial information at all times.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept UPI, bank transfers, and popular digital wallets. You can choose your preferred method during deposit or withdrawal.",
  },
  {
    question: "Can I access my account on mobile?",
    answer:
      "Yes, DPSara is fully optimized for mobile devices. You can also download our app for a seamless experience.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="relative py-20 sm:py-24 lg:py-28 bg-transparent">
      <div className="absolute inset-0 bg-transparent" />
      <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-[#fdfbf7] to-transparent pointer-events-none" />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-brand-600/[0.03] blur-3xl" />
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-b from-transparent via-[#fdfbf7]/50 to-[#fdfbf7] pointer-events-none" />

      <div className="relative mx-auto max-w-3xl px-6 sm:px-8">
        <div className="text-center">
          <motion.span
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center rounded-full border border-brand-500/30 bg-brand-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-brand-600"
          >
            FAQ
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="mt-5 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl"
          >
            Frequently Asked <span className="bg-gradient-to-r from-slate-600 via-slate-900 to-slate-600 bg-clip-text text-transparent">Questions</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mt-5 text-base leading-7 text-slate-600 sm:text-lg"
          >
            Everything you need to know about DPSara. Still have questions?
            Contact our{" "}
            <Link
              href="/support"
              className="text-brand-600 hover:text-brand-500 underline underline-offset-2 transition-colors"
            >
              support team
            </Link>
            .
          </motion.p>
        </div>

        <div className="mt-12 space-y-4">
          {faqs.map((faq, index) => (
            <motion.div
              key={faq.question}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
            >
              <button
                type="button"
                className="flex w-full items-center justify-between gap-4 rounded-xl border border-slate-200/60 bg-white/80 px-6 py-4 text-left text-slate-900 shadow-sm backdrop-blur-xl transition-all duration-200 hover:border-slate-300 hover:bg-white"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                aria-expanded={openIndex === index}
              >
                <span className="font-medium">{faq.question}</span>
                <motion.div
                  animate={{ rotate: openIndex === index ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="h-5 w-5 text-slate-500" />
                </motion.div>
              </button>

              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-4 pt-2 text-sm text-slate-600">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
