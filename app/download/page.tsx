"use client";

import React from "react";
import { motion } from "framer-motion";
import { Download, ShieldCheck, Zap, BarChart3, Smartphone, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function DownloadPage() {
  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = "https://github.com/shravani-agro/dpsara_frontend/releases/latest/download/dpsara.apk";
    link.download = "SM_Booking_Official.apk";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const features = [
    {
      icon: <Zap className="w-8 h-8 text-brand-400" />,
      title: "Lightning Fast Results",
      description: "Get updates the exact second the market results are declared.",
    },
    {
      icon: <ShieldCheck className="w-8 h-8 text-brand-400" />,
      title: "100% Secure & Trusted",
      description: "Your privacy and data are protected with industry-leading encryption.",
    },
    {
      icon: <BarChart3 className="w-8 h-8 text-brand-400" />,
      title: "Live Charts & Analytics",
      description: "Access historical data and guessing forums to plan your next move.",
    },
  ];

  const steps = [
    "Click the 'Download App Now' button above.",
    "If prompted, go to Settings and enable 'Install from Unknown Sources'.",
    "Open the downloaded APK file and tap 'Install'.",
    "Launch SM Booking and start winning!"
  ];

  return (
    <div className="min-h-screen bg-ink-950 text-slate-200 overflow-hidden relative selection:bg-brand-500/30">
      {/* Background ambient glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-900/30 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6 py-16 lg:py-24 relative z-10">

        {/* Hero Section */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-16 mb-24">

          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="flex-1 text-center lg:text-left"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-sm font-medium mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
              </span>
              v2.1.0 is Now Available
            </div>

            <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-6 leading-tight">
              Experience the Best <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-orange-500">
                Satta Matka App
              </span>
            </h1>

            <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              Download the official SM Booking app for lightning-fast results,
              expert guessing, and secure gameplay. Join thousands of winners today.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
              <button
                onClick={handleDownload}
                className="group relative px-8 py-4 bg-gradient-to-r from-brand-600 to-brand-500 rounded-2xl font-bold text-white text-lg shadow-glow hover:shadow-[0_0_30px_rgba(244,63,94,0.5)] transition-all duration-300 transform hover:-translate-y-1 w-full sm:w-auto flex items-center justify-center gap-3"
              >
                <Download className="w-6 h-6 group-hover:animate-bounce" />
                Download App Now
                <div className="absolute inset-0 bg-white/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </button>

              <p className="text-sm text-slate-500 font-medium">
                Size: 12.4 MB &bull; For Android 8.0+
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
            className="flex-1 w-full max-w-sm lg:max-w-md relative"
          >
            {/* Phone Mockup Representation */}
            <div className="relative aspect-[9/19] bg-ink-900 border-[8px] border-ink-800 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col">
              {/* Dynamic Island / Notch */}
              <div className="absolute top-0 inset-x-0 h-6 flex justify-center z-20">
                <div className="w-1/3 h-full bg-ink-800 rounded-b-xl"></div>
              </div>

              {/* Screen Content Mockup */}
              <div className="flex-1 p-6 flex flex-col relative z-10 bg-gradient-to-b from-ink-900 to-ink-950">
                <div className="mt-8 mb-6">
                  <div className="w-16 h-16 bg-brand-500 rounded-2xl mx-auto flex items-center justify-center shadow-glow mb-4">
                    <Smartphone className="w-8 h-8 text-white" />
                  </div>
                  <div className="h-4 w-32 bg-slate-700/50 rounded-full mx-auto mb-2"></div>
                  <div className="h-3 w-24 bg-slate-700/30 rounded-full mx-auto"></div>
                </div>

                <div className="space-y-4 flex-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-16 w-full bg-white/5 rounded-xl border border-white/10 flex items-center px-4 gap-4 animate-pulse" style={{ animationDelay: `${i * 0.1}s` }}>
                      <div className="w-10 h-10 rounded-full bg-slate-700/50"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-full bg-slate-700/50 rounded-full"></div>
                        <div className="h-2 w-2/3 bg-slate-700/30 rounded-full"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Screen Glare */}
              <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 pointer-events-none z-20" />
            </div>

            {/* Floating elements behind phone */}
            <div className="absolute -z-10 top-1/4 -right-12 w-24 h-24 bg-brand-500/20 rounded-full blur-2xl animate-pulse-glow" />
            <div className="absolute -z-10 bottom-1/4 -left-12 w-32 h-32 bg-orange-500/20 rounded-full blur-2xl animate-pulse-glow" style={{ animationDelay: '1s' }} />
          </motion.div>
        </div>

        {/* Features Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="grid md:grid-cols-3 gap-6 mb-24"
        >
          {features.map((feature, idx) => (
            <div key={idx} className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8 hover:bg-white/10 transition-colors group">
              <div className="w-16 h-16 bg-brand-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
              <p className="text-slate-400 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </motion.div>

        {/* Installation Steps */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="bg-ink-900/50 border border-white/5 rounded-[2.5rem] p-8 md:p-12"
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">How to Install</h2>
            <p className="text-slate-400">Follow these simple steps to get started</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, idx) => (
              <div key={idx} className="relative">
                {idx < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-6 left-[60%] w-[80%] h-[2px] bg-gradient-to-r from-brand-500/50 to-transparent z-0" />
                )}
                <div className="relative z-10 flex flex-col items-center text-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-brand-500 flex items-center justify-center text-white font-bold text-xl shadow-glow">
                    {idx + 1}
                  </div>
                  <p className="text-slate-300 font-medium">
                    {step}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

      </div>
    </div>
  );
}
