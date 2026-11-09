"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Card,
  Button,
  Badge,
  Spinner,
  ErrorMsg,
  PageHeader,
  cn,
} from "@/components/ui";
import { toast } from "@/components/Toast";
import { parseApiError } from "@/lib/error-parser";
import { getRealSpinProSettings, updateRealSpinProSettings } from "@/lib/admin";

export default function RealSpinProPage() {
  const [enabled, setEnabled] = useState<boolean>(true);
  const [initialEnabled, setInitialEnabled] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getRealSpinProSettings();
      setEnabled(data.enabled);
      setInitialEnabled(data.enabled);
    } catch (err: any) {
      setError(parseApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async (newValue?: boolean) => {
    const valToSave = newValue !== undefined ? newValue : enabled;
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await updateRealSpinProSettings(valToSave);
      setEnabled(valToSave);
      setInitialEnabled(valToSave);
      const stateText = valToSave ? "ENABLED (Visible on Mobile)" : "DISABLED (Hidden on Mobile)";
      setSuccessMsg(`RealSpinPro is now ${stateText}.`);
      toast.success(`RealSpinPro settings updated: ${stateText}`);
    } catch (err: any) {
      const parsed = parseApiError(err);
      setError(parsed);
      toast.error(parsed);
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = enabled !== initialEnabled;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <PageHeader
        title="🎡 RealSpinPro Management"
        description="Control the visibility and live status of the RealSpinPro Lucky Wheel floating on the mobile application."
      />

      {error && <ErrorMsg error={error} onDismiss={() => setError(null)} />}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-3">
            <span className="text-xl">✅</span>
            <p className="font-semibold text-sm">{successMsg}</p>
          </div>
          <button
            onClick={() => setSuccessMsg(null)}
            className="text-emerald-400 hover:text-emerald-200 text-sm font-bold ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 space-y-4">
          <Spinner size="lg" />
          <p className="text-muted text-sm">Loading RealSpinPro status...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Control Card */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6 border border-border/60 bg-surface/90 shadow-lg backdrop-blur-md rounded-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-border/50 gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                      <span className="text-2xl">🎡</span> Master Switch
                    </h2>
                    <Badge variant={enabled ? "success" : "danger"} className="text-xs px-2.5 py-0.5 font-bold uppercase tracking-wide">
                      {enabled ? "● ACTIVE ON MOBILE" : "○ DISABLED"}
                    </Badge>
                  </div>
                  <p className="text-xs sm:text-sm text-muted mt-1">
                    Turn the RealSpinPro floating wheel ON or OFF for all logged-in mobile players.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={enabled}
                    onClick={() => {
                      const next = !enabled;
                      setEnabled(next);
                      handleSave(next);
                    }}
                    disabled={saving}
                    className={cn(
                      "relative inline-flex h-8 w-16 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2",
                      enabled ? "bg-amber-500 shadow-md shadow-amber-500/30" : "bg-neutral-700",
                      saving && "opacity-60 cursor-not-allowed"
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out flex items-center justify-center text-[10px] font-black",
                        enabled ? "translate-x-8 text-amber-600" : "translate-x-0 text-neutral-400"
                      )}
                    >
                      {enabled ? "ON" : "OFF"}
                    </span>
                  </button>
                </div>
              </div>

              {/* Status Details */}
              <div className="pt-6 space-y-4">
                <div
                  className={cn(
                    "p-4 rounded-xl border transition-all duration-200",
                    enabled
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-200"
                      : "bg-neutral-800/60 border-neutral-700 text-neutral-400"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{enabled ? "🌟" : "🔒"}</span>
                    <div>
                      <h4 className="text-sm font-bold text-white mb-1">
                        {enabled ? "Wheel is currently visible to players" : "Wheel is currently hidden"}
                      </h4>
                      <p className="text-xs leading-relaxed text-muted">
                        {enabled
                          ? "The animated spinning logo is actively displayed at the bottom-right above Support on all primary screens for authenticated mobile users."
                          : "The spinning wheel is completely hidden on the mobile application. Users will not see or interact with the wheel until toggled ON."}
                      </p>
                    </div>
                  </div>
                </div>

                {hasChanges && (
                  <div className="flex justify-end pt-2">
                    <Button
                      variant="primary"
                      onClick={() => handleSave()}
                      loading={saving}
                      className="gap-2 font-bold bg-amber-500 hover:bg-amber-600 text-neutral-950 px-6 py-2"
                    >
                      Save Changes
                    </Button>
                  </div>
                )}
              </div>
            </Card>

            {/* Information Card */}
            <Card className="p-6 border border-border/50 bg-surface/70 rounded-2xl">
              <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                <span>ℹ️</span> How RealSpinPro Works
              </h3>
              <ul className="text-xs sm:text-sm text-muted space-y-2.5 list-disc list-inside">
                <li>
                  <strong>Floating Badge:</strong> Floats gracefully above the Support button at the bottom-right corner across all logged-in screens.
                </li>
                <li>
                  <strong>Continuous Animation:</strong> Spins continuously with smooth 60 FPS hardware acceleration.
                </li>
                <li>
                  <strong>Admin Realtime Sync:</strong> When turned OFF, any mobile app query will immediately detect the status and remove the widget.
                </li>
              </ul>
            </Card>
          </div>

          {/* Side Preview Card */}
          <div className="space-y-6">
            <Card className="p-6 border border-amber-500/30 bg-gradient-to-b from-amber-500/10 via-surface/90 to-surface/95 rounded-2xl text-center relative overflow-hidden">
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center justify-center mb-4">
                <div
                  className={cn(
                    "w-28 h-28 rounded-full border-4 border-amber-400/80 shadow-xl shadow-amber-500/20 flex items-center justify-center bg-neutral-900/80 p-2",
                    enabled ? "animate-spin" : "opacity-40"
                  )}
                  style={{ animationDuration: "8s" }}
                >
                  <img
                    src="/api/placeholder/120/120"
                    alt="RealSpinPro Wheel"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      // Fallback icon if preview placeholder isn't available
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                  <span className="text-5xl select-none">🎡</span>
                </div>
              </div>

              <h3 className="text-lg font-black text-amber-300 mb-1 tracking-wide">
                RealSpinPro Wheel
              </h3>
              <p className="text-xs text-muted mb-4">
                {enabled ? "Active & Spinning on Mobile" : "Disabled / Hidden"}
              </p>

              <div className="bg-surface/90 border border-border/50 rounded-xl p-3 text-left space-y-2 text-xs">
                <div className="flex justify-between items-center text-muted">
                  <span>App Position:</span>
                  <span className="font-semibold text-white">Bottom-Right (Above Support)</span>
                </div>
                <div className="flex justify-between items-center text-muted">
                  <span>Target Audience:</span>
                  <span className="font-semibold text-white">Logged-in Players</span>
                </div>
                <div className="flex justify-between items-center text-muted">
                  <span>Current State:</span>
                  <span className={cn("font-bold", enabled ? "text-emerald-400" : "text-rose-400")}>
                    {enabled ? "VISIBLE" : "HIDDEN"}
                  </span>
                </div>
              </div>

              <div className="mt-5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchSettings}
                  loading={loading}
                  className="w-full text-xs"
                >
                  🔄 Refresh Status
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

