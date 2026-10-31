"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { Button, Input, ErrorMsg } from "@/components/ui";
import { motion } from "framer-motion";

const MAX_ATTEMPTS = 5;

export default function OurAdminPortalLoginPage() {
  const router = useRouter();
  const { login, authenticated } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [showEye, setShowEye] = useState(false);

  useEffect(() => {
    if (authenticated) router.replace("/ouradminportal");
  }, [authenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(username.trim(), password);
      router.replace("/ouradminportal");
    } catch (err: any) {
      setAttempts((prev) => prev + 1);
      setError("Invalid administrator credentials. Access denied.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 relative overflow-hidden flex items-center justify-center p-4">
      {/* Decorative background */}
      <div className="absolute inset-0 bg-gradient-to-b from-brand-950 via-slate-950 to-indigo-950" />
      <div className="absolute top-1/4 left-1/4 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-500/15 blur-[120px] mix-blend-screen animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 h-80 w-80 translate-x-1/2 translate-y-1/2 rounded-full bg-indigo-500/15 blur-[100px] mix-blend-screen animate-pulse" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md z-10"
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl shadow-[0_0_35px_rgba(244,63,94,0.3)] ring-2 ring-brand-500/30 bg-ink-900 backdrop-blur-xl">
            <img
              src="/images/logo/dpsara777-logo.svg"
              alt="Admin Portal Logo"
              className="h-full w-full object-cover"
            />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Admin<span className="text-brand-400">Portal</span>
          </h1>
          <p className="mt-1 text-xs font-medium text-slate-400">
            Secure Administrator Console
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-7 shadow-2xl backdrop-blur-xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

          <form onSubmit={handleSubmit} className="relative z-10 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold tracking-wide text-slate-300 uppercase">
                Admin Username
              </label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter admin username"
                autoComplete="off"
                required
                className="bg-black/60 border-white/10 focus:border-brand-500 focus:ring-brand-500/30 text-white h-11 rounded-xl"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold tracking-wide text-slate-300 uppercase">
                Admin Password
              </label>
              <div className="relative">
                <Input
                  type={showEye ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  autoComplete="off"
                  required
                  className="bg-black/60 border-white/10 focus:border-brand-500 focus:ring-brand-500/30 text-white h-11 rounded-xl pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowEye(!showEye)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  tabIndex={-1}
                >
                  {showEye ? "👁" : "🙈"}
                </button>
              </div>
            </div>

            {error && <ErrorMsg msg={error} />}

            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <span>Attempts: {attempts}/{MAX_ATTEMPTS}</span>
              <span className="text-[11px] text-slate-500">256-bit Encrypted</span>
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm rounded-xl shadow-lg transition-all mt-3"
              disabled={loading || (attempts >= MAX_ATTEMPTS)}
            >
              {loading ? "Authenticating..." : (attempts >= MAX_ATTEMPTS ? "Locked Out" : "Sign In to Admin Portal")}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-[11px] font-semibold text-slate-500 tracking-wider uppercase">
          RESTRICTED AREA · IP & LOGIN ACTIVITY IS MONITORED
        </p>
      </motion.div>
    </div>
  );
}

