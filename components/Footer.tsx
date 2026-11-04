"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

export default function Footer() {
  const pathname = usePathname();
  if (pathname?.startsWith("/ouradminportal") || pathname?.startsWith("/admin")) {
    return null;
  }
  return (
    <footer className="bg-transparent border-t border-slate-200/50">
      {/* Full-width video */}
      <div className="relative w-full">
         <video
          muted
          playsInline
          loop
          autoPlay
          preload="auto"
          className="w-full h-[280px] object-cover block"
        >
          <source src="/CTA.mp4" type="video/mp4" />
        </video>

      {/* Smooth fade from theme background into video at the top */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-40
          bg-gradient-to-b from-[#fdfbf7] via-[#fdfbf7]/60 to-transparent"
        />

        {/* Smooth fade from video into dark footer at the bottom */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-40
          bg-gradient-to-t from-black via-black/60 to-transparent"
        />
      </div>

      {/* Footer content */}
      <div className="border-t border-white/5 bg-black">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 py-10 flex flex-col items-center justify-between gap-8">
          
          {/* SEO Links */}
          <div className="flex flex-col items-center gap-4 w-full border-b border-white/5 pb-8">
            <h3 className="text-slate-300 font-semibold tracking-wide text-sm uppercase">Quick Links</h3>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-3">
              <Link href="/kalyan-matka" className="text-slate-400 hover:text-amber-400 transition-colors text-sm">Kalyan Matka</Link>
              <Link href="/dpboss" className="text-slate-400 hover:text-amber-400 transition-colors text-sm">Dpboss</Link>
              <Link href="/satta-king" className="text-slate-400 hover:text-amber-400 transition-colors text-sm">Satta King</Link>
              <Link href="/matka-result" className="text-slate-400 hover:text-amber-400 transition-colors text-sm">Matka Result</Link>
              <Link href="/milan-day" className="text-slate-400 hover:text-amber-400 transition-colors text-sm">Milan Day</Link>
              <Link href="/rajdhani-night" className="text-slate-400 hover:text-amber-400 transition-colors text-sm">Rajdhani Night</Link>
              <Link href="/satta-matka" className="text-slate-400 hover:text-amber-400 transition-colors text-sm">Satta Matka</Link>
              <Link href="/main-bazar" className="text-slate-400 hover:text-amber-400 transition-colors text-sm">Main Bazar</Link>
              <Link href="/kalyan-night" className="text-slate-400 hover:text-amber-400 transition-colors text-sm">Kalyan Night</Link>
              <Link href="/time-bazar" className="text-slate-400 hover:text-amber-400 transition-colors text-sm">Time Bazar</Link>
              <Link href="/kalyan-chart" className="text-slate-400 hover:text-amber-400 transition-colors text-sm">Kalyan Chart</Link>
              <Link href="/dpboss-net" className="text-slate-400 hover:text-amber-400 transition-colors text-sm">Dpboss Net</Link>
            </div>
          </div>

          {/* Bottom Legal Links */}
          <div className="flex flex-col lg:flex-row items-center justify-between w-full gap-4">
            <p className="text-slate-500 text-sm">
              &copy; {new Date().getFullYear()} Satta Matka. All rights reserved.
            </p>

            <div className="flex flex-wrap justify-center gap-6">
              <Link
                href="/terms"
                className="text-slate-500 hover:text-white transition-colors text-sm"
              >
                Terms
              </Link>
              <Link
                href="/privacy"
                className="text-slate-500 hover:text-white transition-colors text-sm"
              >
                Privacy
              </Link>
              <Link
                href="/support"
                className="text-slate-500 hover:text-white transition-colors text-sm"
              >
                Support
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}