"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, Button, Badge, Spinner, ErrorMsg, PageHeader, cn } from "@/components/ui";
import { Target, Sliders, RefreshCw, Save, Sparkles, TrendingUp, BookOpen } from "lucide-react";
import { toast } from "@/components/Toast";
import { parseApiError } from "@/lib/error-parser";
import { fmtMoney } from "@/lib/format";
import {
  getFunTargetSettings,
  updateFunTargetSettings,
  getFunTargetStats,
  getFunTargetRounds,
  FunTargetConfig,
} from "@/lib/admin";

const DEFAULT_CONFIG: FunTargetConfig = {
  mode: "profit_driven",
  target_margin: 20,
  min_win_rate_percent: 70,
  max_losing_streak_trigger: 3,
  double_bonus_percent: 16,
  coins_percent: 20,
  chest_percent: 64,
  manual_override_number: null,
  manual_override_globe: null,
};

export default function FunTargetAdminPage() {
  const [enabled, setEnabled] = useState<boolean>(true);
  const [savingToggle, setSavingToggle] = useState<boolean>(false);
  const [savingConfig, setSavingConfig] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<FunTargetConfig>(DEFAULT_CONFIG);
  const [stats, setStats] = useState<any>(null);
  const [rounds, setRounds] = useState<any[]>([]);

  const loadAll = useCallback(async () => {
    try {
      setError(null);
      const [sRes, stRes, rRes] = await Promise.all([
        getFunTargetSettings(),
        getFunTargetStats(),
        getFunTargetRounds(20),
      ]);
      setEnabled(Boolean(sRes.enabled));
      if (sRes.config) setConfig({ ...DEFAULT_CONFIG, ...sRes.config });
      setStats(stRes);
      setRounds(Array.isArray(rRes) ? rRes : []);
    } catch (e: any) {
      setError(parseApiError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
    const t = setInterval(loadAll, 15000);
    return () => clearInterval(t);
  }, [loadAll]);

  const handleToggle = async () => {
    setSavingToggle(true);
    try {
      const next = !enabled;
      await updateFunTargetSettings({ enabled: next });
      setEnabled(next);
      toast.success(`Fun Target is now ${next ? "LIVE" : "DISABLED"}`);
    } catch (e: any) {
      toast.error(parseApiError(e));
    } finally {
      setSavingToggle(false);
    }
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      await updateFunTargetSettings({ config });
      toast.success("Fun Target configuration saved");
      loadAll();
    } catch (e: any) {
      toast.error(parseApiError(e));
    } finally {
      setSavingConfig(false);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Fun Target Console"
        description="Manage Fun Target (Unity) master switch, house margin, Double Bonus 20x odds, and next-round overrides."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/ouradminportal/funtarget-bids-history">
              <Button variant="outline" size="sm">
                <BookOpen className="w-4 h-4 mr-1.5" />
                Bids History
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={loadAll}>
              <RefreshCw className="w-4 h-4 mr-1.5" />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={handleToggle}
              disabled={savingToggle}
              className={cn(enabled ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700")}
            >
              {savingToggle ? <Spinner size="sm" /> : enabled ? "LIVE (Click to Disable)" : "OFF (Click to Enable)"}
            </Button>
          </div>
        }
      />

      {error && <ErrorMsg message={error} />}

      {loading ? (
        <div className="py-12 flex justify-center">
          <Spinner />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="text-xs text-slate-400">Total Wagered</div>
              <div className="text-xl font-bold mt-1">{fmtMoney(stats?.total_wagered || 0)}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-slate-400">Total Payouts</div>
              <div className="text-xl font-bold mt-1">{fmtMoney(stats?.total_payout || 0)}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-slate-400">House Profit</div>
              <div className="text-xl font-bold text-emerald-400 mt-1">{fmtMoney(stats?.total_profit || 0)}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-slate-400">Settled Rounds</div>
              <div className="text-xl font-bold mt-1">{stats?.total_rounds || 0}</div>
            </Card>
          </div>

          <Card className="p-5 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-base">
                <Sliders className="w-4 h-4 text-amber-400" />
                Algorithm &amp; Next-Round Control
              </div>
              <Badge variant={enabled ? "success" : "danger"}>{enabled ? "LIVE" : "DISABLED"}</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Result Mode</label>
                <select
                  value={config.mode}
                  onChange={(e) => setConfig({ ...config, mode: e.target.value as any })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
                >
                  <option value="profit_driven">Profit Driven (Smart Margin)</option>
                  <option value="random">Pure Random</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Target Margin (%)</label>
                <input
                  type="number"
                  min={0}
                  max={80}
                  value={config.target_margin}
                  onChange={(e) => setConfig({ ...config, target_margin: Number(e.target.value) })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Double Bonus 20x Chance (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={config.double_bonus_percent}
                  onChange={(e) => setConfig({ ...config, double_bonus_percent: Number(e.target.value) })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Force Next Number (0-9)</label>
                <select
                  value={config.manual_override_number ?? ""}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      manual_override_number: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
                >
                  <option value="">Auto</option>
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
                    <option key={d} value={d}>
                      Force Digit {d}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Force Next Globe Sticker</label>
                <select
                  value={config.manual_override_globe ?? ""}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      manual_override_globe: (e.target.value || null) as any,
                    })
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
                >
                  <option value="">Auto</option>
                  <option value="chest">Black Chest (10x)</option>
                  <option value="coins">Gold Coins (10x)</option>
                  <option value="double_bonus">Funrep Double Bonus (20x)</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button onClick={handleSaveConfig} disabled={savingConfig} className="w-full">
                  <Save className="w-4 h-4 mr-1.5" />
                  {savingConfig ? "Saving..." : "Save Configuration"}
                </Button>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 font-semibold text-base mb-4">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Recent Rounds
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-400 border-b border-slate-800">
                    <th className="py-2 pr-4">Round ID</th>
                    <th className="py-2 pr-4">Winner</th>
                    <th className="py-2 pr-4">Globe / Mult</th>
                    <th className="py-2 pr-4">Pool</th>
                    <th className="py-2 pr-4">Payout</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rounds.map((r) => (
                    <tr key={r.id} className="border-b border-slate-800/60">
                      <td className="py-2 pr-4 font-mono">#{r.id}</td>
                      <td className="py-2 pr-4 font-bold">{r.winning_number ?? "-"}</td>
                      <td className="py-2 pr-4">
                        <Badge variant={r.multiplier === 20 ? "warning" : "default"}>
                          {r.globe_key || "chest"} ({r.multiplier}x)
                        </Badge>
                      </td>
                      <td className="py-2 pr-4">{fmtMoney(r.total_pool || 0)}</td>
                      <td className="py-2 pr-4">{fmtMoney(r.total_payout || 0)}</td>
                      <td className="py-2">{r.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

