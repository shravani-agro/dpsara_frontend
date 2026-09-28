"use client";

import { motion } from "framer-motion";
import { Download, Star, ChevronRight } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative min-h-[100dvh] flex flex-col items-center justify-center overflow-hidden bg-transparent pt-20">
      {/* Video Background Container */}
      <div className="absolute top-0 left-0 w-full h-[50vh] sm:h-[60vh] overflow-hidden">
        <video
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          disablePictureInPicture
        >
          <source src="/hero.mp4" type="video/mp4" />
        </video>

        {/* Gradients to fade out video cleanly into the light theme background */}
        <div className="absolute inset-0 bg-[#fdfbf7]/40" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#fdfbf7]/70 to-[#fdfbf7]" />
        <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-[#fdfbf7] to-transparent" />
      </div>

      <div className="relative w-full max-w-7xl px-6 lg:px-8 z-10 flex flex-col items-center mt-auto mb-auto">
        {/* Trusted By Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mb-6 sm:mb-10 flex justify-center"
        >
          <div className="group relative rounded-full px-5 py-2 text-[13px] sm:text-sm font-semibold text-slate-900 ring-1 ring-brand-500/30 bg-white/80 backdrop-blur-md transition-all hover:bg-white cursor-pointer overflow-hidden shadow-sm">
            <span className="flex items-center gap-2">
              <Star className="h-4 w-4 text-brand-500" />
              <span>Trusted by 10,000+ top players globally</span>
              <ChevronRight className="h-4 w-4 text-brand-500 transition-transform group-hover:translate-x-1" />
            </span>
          </div>
        </motion.div>

        {/* Main Heading */}
        <div className="mx-auto max-w-4xl text-center space-y-1">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-[2.75rem] sm:text-6xl lg:text-[5.5rem] font-black tracking-tight text-slate-900 leading-[1.1]"
          >
            Elevate Your <br />
            <span className="text-brand-500">Gaming</span> <br />
            <span className="bg-gradient-to-r from-brand-500 to-indigo-500 bg-clip-text text-transparent">
              Experience
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 text-[14px] sm:text-lg leading-relaxed text-slate-600 max-w-xl mx-auto font-medium px-2"
          >
            Experience the thrill of the most secure and fast-paced gaming platform. Instant withdrawals, 24/7 support, and unparalleled rewards await you.
          </motion.p>
        </div>

        {/* Download Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="mt-8 flex flex-col items-center w-full"
        >
          <a
            href="https://github.com/shravani-agro/dpsara_frontend/releases/latest/download/dpsara.apk"
            className="group relative flex items-center justify-center gap-2 rounded-full bg-[#E42247] px-8 py-4 text-[15px] font-bold text-white shadow-[0_0_30px_rgba(228,34,71,0.4)] transition-all hover:bg-[#c91d3e] hover:scale-[1.02] active:scale-95 w-[90%] max-w-[320px]"
          >
            <Download className="h-5 w-5" />
            Download App Now
            <div className="absolute inset-0 rounded-full border border-white/20" />
          </a>
        </motion.div>
      </div>
    </section>
  );
}
