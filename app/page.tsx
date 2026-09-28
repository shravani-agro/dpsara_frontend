import type { Metadata } from "next";

import Hero from "@/components/Hero";
import GameRates from "@/components/GameRates";
import Features from "@/components/Features";
import HowToPlay from "@/components/HowToPlay";
import FAQ from "@/components/FAQ";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "DPSara | Satta Matka Booking Platform",
  description:
    "DPSara is the trusted satta matka booking platform offering instant withdrawals, real-time results, and 24/7 support. Play responsibly and win big!",
  keywords: [
    "satta matka",
    "satta matka booking",
    "satta matka results",
    "satta matka today",
    "online satta matka",
    "matka result",
    "matka guessing",
    "Indian matka",
    "satta matka game",
    "satta matka app",
  ],
  openGraph: {
    title: "DPSara | Satta Matka Booking Platform",
    description:
      "DPSara is the trusted satta matka booking platform offering instant withdrawals, real-time results, and 24/7 support.",
    type: "website",
    locale: "en_IN",
    siteName: "DPSara Booking",
    images: [{ url: "/logo.jpg", alt: "DPSara Logo" }],
  },
};

export default function Home() {
  return (
    <div className="min-h-screen mesh-bg relative selection:bg-brand-500/30 overflow-hidden">
      <Navbar />
      <main>
        <Hero />
        <GameRates />
        <Features />
        <HowToPlay />
        <FAQ />
      </main>
    </div>
  );
}
