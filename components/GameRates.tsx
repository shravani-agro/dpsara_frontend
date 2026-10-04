"use client";

import { motion } from "framer-motion";
import { TrendingUp, Coins, Crown, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";

function fetcher(url: string) {
  return fetch(url).then((res) => res.json());
}

export function useGameRates() {
  const [rates, setRates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/mobile/game-rates");
        const data = await res.json();
        setRates(data?.rates || []);
        setIsLoading(false);
      } catch (e) {
        setIsError(true);
        setIsLoading(false);
      }
    }
    load();
  }, []);

  return { rates, isLoading, isError };
}

export default function GameRates() {
  const { rates, isLoading, isError } = useGameRates();

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <span className="text-slate-600">Loading rates...</span>
      </div>
    );
  }

  if (isError || !rates || rates.length === 0) {
    return (
      <div className="min-h-[400px] flex items-center justify-center text-slate-600">
        <span>Failed to load rates. Please try again.</span>
      </div>
    );
  }

  return (
    <section className="py-20 relative overflow-hidden bg-[#fdfbf7]">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-brand-500/5 rounded-full blur-3xl -z-10" />

      <div className="max-w-4xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 text-green-700 text-sm font-semibold mb-4 ring-1 ring-green-600/20"
          >
            <Coins className="w-4 h-4" />
            <span>Highest Return Rates in the Market</span>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight"
          >
            Official <span className="text-brand-500">Game Rates</span>
          </motion.h2>
          <motion.p
             initial={{ opacity: 0, y: 20 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             transition={{ delay: 0.2 }}
             className="mt-4 text-slate-600 text-lg max-w-2xl mx-auto"
          >
            Play with us and get the maximum profit for your winnings. We offer the best odds guaranteed.
          </motion.p>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-100 overflow-hidden relative"
        >
          {/* Top highlight line */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-400 via-brand-500 to-indigo-500" />
          
          <div className="p-6 sm:p-8">
            <div className="flex flex-col gap-3">
              {rates.map((rate, index) => (
                <motion.div
                  key={rate.name}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className="group relative flex items-center justify-between p-4 sm:p-5 rounded-2xl bg-slate-50/50 hover:bg-white transition-all duration-300 hover:shadow-md hover:shadow-brand-500/5 ring-1 ring-transparent hover:ring-brand-100"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm text-brand-500 group-hover:scale-110 group-hover:bg-brand-50 transition-all duration-300">
                      <rate.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-bold text-slate-900">{rate.name}</h3>
                      <p className="text-sm text-slate-500 font-medium hidden sm:block">Multiply your amount by {rate.multiplier}</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="inline-flex items-baseline gap-1 bg-gradient-to-r from-emerald-600 to-green-500 bg-clip-text text-transparent">
                      <span className="text-2xl sm:text-3xl font-black tracking-tight">{rate.rate}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
          
          {/* Bottom decorative area */}
          <div className="bg-slate-50 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100 text-center sm:text-left">
            <p className="text-slate-600 text-sm font-medium">
              * Rates are subject to change. Minimum bet amount is ₹10.
            </p>
            <button className="px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold rounded-full shadow-lg shadow-brand-500/30 transition-all hover:-translate-y-0.5">
              Start Playing Now
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}