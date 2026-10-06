"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, ErrorMsg } from "@/components/ui";

export default function MpinChangePage() {
  const router = useRouter();
  const [mpin, setMpin] = useState("");
  const [confirmMpin, setConfirmMpin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    if (mpin !== confirmMpin) {
      setError("MPIN and confirm MPIN do not match");
      setLoading(false);
      return;
    }
    
    if (mpin.length < 4) {
      setError("MPIN must be at least 4 digits");
      setLoading(false);
      return;
    }
    
    // TODO: Implement MPIN change API call
    setLoading(false);
    setSuccess(true);
  }

  return (
    <div className="mesh-bg flex min-h-screen items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-500/20 blur-[120px] mix-blend-screen animate-pulse-glow" />
      <div className="absolute bottom-1/4 right-1/4 h-80 w-80 translate-x-1/2 translate-y-1/2 rounded-full bg-indigo-500/15 blur-[100px] mix-blend-screen animate-pulse-glow" style={{ animationDelay: "1s" }} />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md z-10"
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-5 flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl shadow-[0_0_40px_rgba(244,63,94,0.3)] ring-2 ring-brand-500/40 bg-ink-900 backdrop-blur-xl">
            <img src="/logo.svg" alt="SattaAdmin Logo" className="h-full w-full object-cover opacity-90 hover:opacity-100 transition-opacity" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">
            Satta<span className="text-brand-400">Admin</span>
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-400">Change your MPIN</p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-ink-900/60 p-8 shadow-card backdrop-blur-xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
          
          {success ? (
            <div className="relative z-10 space-y-5">
              <div className="text-6xl text-brand-500">✓</div>
              <h2 className="text-2xl font-bold text-white">MPIN Changed Successfully</h2>
              <p className="text-slate-400">Your new MPIN has been set. You can now use it to login.</p>
              <Button
                type="button"
                onClick={() => router.push("/login")}
                className="w-full h-12 bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm rounded-xl mt-4"
              >
                Back to Login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="relative z-10 space-y-5">
              <div>
                <label className="mb-2 block text-xs font-semibold tracking-wide text-slate-400 uppercase">New MPIN</label>
                <Input
                  type="password"
                  value={mpin}
                  onChange={(e) => setMpin(e.target.value)}
                  placeholder "••••"
                  autoComplete="current-password"
                  required
                  className="bg-black/50 border-white/10 focus:border-brand-500 focus:ring-brand-500/30 transition-all text-white h-12"
                />
              </div>
              
              <div>
                <label className="mb-2 block text-xs font-semibold tracking-wide text-slate-400 uppercase">Confirm MPIN</label>
                <Input
                  type="password"
                  value={confirmMpin}
                  onChange={(e) => setConfirmMpin(e.target.value)}
                  placeholder "••••"
                  autoComplete="current-password"
                  required
                  className="bg-black/50 border-white/10 focus:border-brand-500 focus:ring-brand-500/30 transition-all text-white h-12"
                />
              </div>
              
              {error && <ErrorMsg msg={error} />}
              
              <Button
                type="submit"
                className="w-full h-12 bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm rounded-xl shadow-[0_0_20px_rgba(225,29,72,0.3)] hover:shadow-[0_0_30px_rgba(225,29,72,0.5)] transition-all mt-4"
                disabled={loading}
              >
                {loading ? "Updating..." : "Change MPIN"}
              </Button>
            </form>
          )}
        </div>

        <p className="mt-8 text-center text-xs font-medium text-slate-500 tracking-wide">
          AUTHORIZED PERSONNEL ONLY. ALL ACTIVITY IS LOGGED.
        </p>
      </motion.div>
    </div>
  );
}