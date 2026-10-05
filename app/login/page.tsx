"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { Button, Input, ErrorMsg } from "@/components/ui";
import { motion } from "framer-motion";

const MAX_ATTEMPTS = 3;

export default function LoginPage() {
  const router = useRouter();
  const { login, authenticated } = useAuth();
  const [mpin, setMpin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [showForgot, setShowForgot] = useState(false);
  const [showEye, setShowEye] = useState(false);

  useEffect(() => {
    if (authenticated) router.replace("/admin");
  }, [authenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      await login(mpin, "");
      router.replace("/admin");
    } catch (err: any) {
      setAttempts(prev => {
        const next = prev + 1;
        if (next >= MAX_ATTEMPTS) {
          setShowForgot(true);
        }
        return next;
      });
      setError("Invalid MPIN number. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 relative overflow-hidden">
      {/* Full-screen decorative background */}
      <div className="absolute inset-0 bg-gradient-to-b from-brand-600 via-brand-500 to-indigo-600" />
      <div className="absolute top-1/4 left-1/4 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-500/20 blur-[120px] mix-blend-screen animate-pulse-glow" />
      <div className="absolute bottom-1/4 right-1/4 h-80 w-80 translate-x-1/2 translate-y-1/2 rounded-full bg-indigo-500/15 blur-[100px] mix-blend-screen animate-pulse-glow" style={{ animationDelay: "1s" }} />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md md:max-w-lg z-10"
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-5 flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl shadow-[0_0_40px_rgba(244,63,94,0.3)] ring-2 ring-brand-500/40 bg-ink-900 backdrop-blur-xl">
            <img src="/logo.svg" alt="SattaAdmin Logo" className="h-full w-full object-cover opacity-90 hover:opacity-100 transition-opacity" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">
            Satta<span className="text-brand-400">Admin</span>
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-400">Sign in to your administrator console</p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-ink-900/60 p-8 shadow-card backdrop-blur-xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
          
          <form onSubmit={handleSubmit} className="relative z-10 space-y-5">
            <div>
              <label className="mb-2 block text-xs font-semibold tracking-wide text-slate-400 uppercase">MPIN</label>
              <Input
                type={showEye ? "text" : "password"}
                value={mpin}
                onChange={(e) => setMpin(e.target.value)}
                placeholder={showEye ? "1234" : "••••"}
                autoComplete="current-password"
                required
                className="bg-black/50 border-white/10 focus:border-brand-500 focus:ring-brand-500/30 transition-all text-white h-12 rounded-xl"
                inputMode="decimal"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer select-none transition-colors hover:text-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50">
                {showEye ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 21a10.07 10.07 0 0 1-5.94-2.06M9 10h.5m7 0h.5m-7-7h.5M7 7h.5m7 0h.5m-7-7h.5" strokeLinecap="round" />
                  </svg>
                )}
              </div>
            </div>
            
            {error && <ErrorMsg msg={error} />}
            
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Attempts: {attempts}/{MAX_ATTEMPTS}
              </span>
              {attempts > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowForgot(true)}
                >
                  Forgot MPIN
                </Button>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm rounded-xl shadow-[0_0_20px_rgba(225,29,72,0.3)] hover:shadow-[0_0_30px_rgba(225,29,72,0.5)] transition-all mt-4"
              disabled={loading}
            >
              {loading ? "Authenticating..." : "Secure Sign In"}
            </Button>
          </form>
        </div>

        <p className="mt-8 text-center text-xs font-medium text-slate-500 tracking-wide">
          AUTHORIZED PERSONNEL ONLY. ALL ACTIVITY IS LOGGED.
        </p>
      </motion.div>
    </div>
  );
}