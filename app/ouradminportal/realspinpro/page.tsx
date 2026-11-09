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
import {
  getRealSpinProSettings,
  updateRealSpinProSettings,
  getRealSpinProStats,
  getRealSpinProBets,
  getRealSpinProRounds,
} from "@/lib/admin";

const NUMBER_COLORS: Record<number, string> = {
  0: "bg-blue-600 text-white",
  1: "bg-yellow-600 text-white",
  2: "bg-purple-600 text-white",
  3: "bg-pink-600 text-white",
  4: "bg-emerald-600 text-white",
  5: "bg-red-600 text-white",
  6: "bg-orange-600 text-white",
  7: "bg-cyan-600 text-white",
  8: "bg-indigo-600 text-white",
  9: "bg-violet-600 text-white",
};

export default function RealSpinProPage() {
  const [enabled, setEnabled] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Stats
  const [stats, setStats] = useState<{
    total_wagered: number;
    total_payout: number;
    total_profit: number;
    total_players: number;
    total_rounds: number;
    house_edge_pct: number;
  } | null>(null);

  // Tabs: "bets" | "rounds"
  const [activeTab, setActiveTab] = useState<"bets" | "rounds">("bets");

  // Bets & Rounds
  const [bets, setBets] = useState<any[]>([]);
  const [rounds, setRounds] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingData, setLoadingData] = useState<boolean>(true);

  const fetchLiveGameData = useCallback(async () => {
    try {
      const [statsData, betsData, roundsData] = await Promise.all([
        getRealSpinProStats().catch(() => null),
        getRealSpinProBets(50).catch(() => []),
        getRealSpinProRounds(30).catch(() => []),
      ]);
      if (statsData) setStats(statsData);
      if (betsData) setBets(betsData);
      if (roundsData) setRounds(roundsData);
    } catch (_) {
      // Ignored during polling
    } finally {
      setLoadingData(false);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const data = await getRealSpinProSettings();
      setEnabled(data.enabled);
    } catch (err: any) {
      setError(parseApiError(err));
    }
  }, []);

  useEffect(() => {
    fetchSettings();
    fetchLiveGameData();

    // Auto-poll live game data every 4 seconds
    const interval = setInterval(fetchLiveGameData, 4000);
    return () => clearInterval(interval);
  }, [fetchSettings, fetchLiveGameData]);

  const handleToggle = async (nextState: boolean) => {
    setSaving(true);
    setError(null);
    try {
      await updateRealSpinProSettings(nextState);
      setEnabled(nextState);
      const stateText = nextState ? "ACTIVATED on Mobile" : "DEACTIVATED / Hidden";
      toast.success(`RealSpinPro is now ${stateText}`);
    } catch (err: any) {
      setError(parseApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const filteredBets = bets.filter((b) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      (b.user && b.user.toLowerCase().includes(q)) ||
      (b.phone && b.phone.toLowerCase().includes(q)) ||
      (b.username && b.username.toLowerCase().includes(q)) ||
      String(b.round_id).includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <PageHeader
        title="🎡 RealSpinPro Management"
        description="Live monitoring, profit analytics, and master visibility control for the RealSpinPro game."
      />

      {error && <ErrorMsg error={error} onDismiss={() => setError(null)} />}

      {/* Top Banner & Master Toggle */}
      <Card className="p-6 border border-border/60 bg-surface/90 backdrop-blur-md rounded-2xl shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-3xl shadow-inner">
              🎡
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-black text-white tracking-wide">
                  RealSpinPro Game Engine
                </h2>
                <Badge
                  variant={enabled ? "success" : "danger"}
                  className="text-xs px-2.5 py-0.5 font-bold uppercase tracking-wider"
                >
                  {enabled ? "● LIVE ON MOBILE" : "○ GAME DISABLED"}
                </Badge>
              </div>
              <p className="text-xs text-muted mt-1">
                {enabled
                  ? "Spinning logo floats on the bottom-right above Support on mobile. Players can tap and place bets from their DPSara wallet."
                  : "Game is hidden on mobile app. No players can access or place bets on RealSpinPro."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              onClick={() => handleToggle(!enabled)}
              disabled={saving}
              className={cn(
                "relative inline-flex h-9 w-20 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500",
                enabled ? "bg-amber-500 shadow-lg shadow-amber-500/30" : "bg-neutral-700",
                saving && "opacity-60 cursor-not-allowed"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-8 w-8 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out flex items-center justify-center text-[10px] font-black",
                  enabled ? "translate-x-11 text-amber-600" : "translate-x-0 text-neutral-400"
                )}
              >
                {enabled ? "ON" : "OFF"}
              </span>
            </button>
          </div>
        </div>
      </Card>

      {/* Game Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Wagered */}
        <Card className="p-4 rounded-xl border border-border/50 bg-surface/80">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">
              Total Wagered
            </span>
            <span className="text-amber-400 text-lg">💰</span>
          </div>
          <div className="text-2xl font-black text-white">
            ₹{(stats?.total_wagered ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-muted mt-1">Total chips placed</p>
        </Card>

        {/* Total Won / Payout */}
        <Card className="p-4 rounded-xl border border-border/50 bg-surface/80">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">
              Total Payout
            </span>
            <span className="text-emerald-400 text-lg">🏆</span>
          </div>
          <div className="text-2xl font-black text-emerald-400">
            ₹{(stats?.total_payout ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-muted mt-1">Won by players</p>
        </Card>

        {/* House Profit */}
        <Card className="p-4 rounded-xl border border-border/50 bg-surface/80">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">
              House Profit (GGR)
            </span>
            <span className="text-blue-400 text-lg">📈</span>
          </div>
          <div className={cn("text-2xl font-black", (stats?.total_profit ?? 0) >= 0 ? "text-blue-400" : "text-rose-400")}>
            ₹{(stats?.total_profit ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-muted mt-1">
            Margin: {stats?.house_edge_pct ?? 0}%
          </p>
        </Card>

        {/* Total Players */}
        <Card className="p-4 rounded-xl border border-border/50 bg-surface/80">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">
              Active Players
            </span>
            <span className="text-purple-400 text-lg">👥</span>
          </div>
          <div className="text-2xl font-black text-white">
            {stats?.total_players ?? 0}
          </div>
          <p className="text-[11px] text-muted mt-1">
            {stats?.total_rounds ?? 0} total rounds
          </p>
        </Card>
      </div>

      {/* Tabs & Table Header */}
      <Card className="p-6 border border-border/50 bg-surface/90 rounded-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border/50 gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("bets")}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-bold transition-all",
                activeTab === "bets"
                  ? "bg-amber-500 text-neutral-950 shadow-md"
                  : "bg-surface hover:bg-neutral-800 text-muted"
              )}
            >
              🎲 Recent Bets Activity
            </button>
            <button
              onClick={() => setActiveTab("rounds")}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-bold transition-all",
                activeTab === "rounds"
                  ? "bg-amber-500 text-neutral-950 shadow-md"
                  : "bg-surface hover:bg-neutral-800 text-muted"
              )}
            >
              🔄 Live Rounds Monitoring
            </button>
          </div>

          <div className="flex items-center gap-3">
            {activeTab === "bets" && (
              <input
                type="text"
                placeholder="Search phone or round..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-muted focus:outline-none focus:border-amber-500 w-48 sm:w-60"
              />
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={fetchLiveGameData}
              loading={loadingData}
              className="text-xs gap-1.5"
            >
              <span>🔄</span> Refresh
            </Button>
          </div>
        </div>

        {/* Content: Bets Activity */}
        {activeTab === "bets" ? (
          <div className="mt-4 overflow-x-auto">
            {filteredBets.length === 0 ? (
              <div className="py-12 text-center text-muted text-sm">
                No betting activity found.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border/40 text-muted font-semibold uppercase text-[11px]">
                    <th className="py-3 px-3">Bet ID</th>
                    <th className="py-3 px-3">Player</th>
                    <th className="py-3 px-3">Round #</th>
                    <th className="py-3 px-3">Number Picked</th>
                    <th className="py-3 px-3">Bet Amount</th>
                    <th className="py-3 px-3">Winning Num</th>
                    <th className="py-3 px-3">Outcome</th>
                    <th className="py-3 px-3">Payout</th>
                    <th className="py-3 px-3">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {filteredBets.map((b) => (
                    <tr key={b.id} className="hover:bg-neutral-800/40 transition-colors">
                      <td className="py-3 px-3 font-mono text-muted">#{b.id}</td>
                      <td className="py-3 px-3 font-medium text-white">
                        {b.phone || b.username || b.user}
                      </td>
                      <td className="py-3 px-3 font-mono text-muted">#{b.round_id}</td>
                      <td className="py-3 px-3">
                        <span
                          className={cn(
                            "inline-flex items-center justify-center w-7 h-7 rounded-full font-black text-xs shadow-sm",
                            NUMBER_COLORS[b.number] || "bg-neutral-700 text-white"
                          )}
                        >
                          {b.number}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold text-white">
                        ₹{Number(b.amount).toFixed(2)}
                      </td>
                      <td className="py-3 px-3">
                        {b.winning_number !== null ? (
                          <span
                            className={cn(
                              "inline-flex items-center justify-center w-7 h-7 rounded-full font-black text-xs shadow-sm",
                              NUMBER_COLORS[b.winning_number] || "bg-neutral-700 text-white"
                            )}
                          >
                            {b.winning_number}
                          </span>
                        ) : (
                          <span className="text-muted text-[11px]">Pending</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {b.status === "won" ? (
                          <Badge variant="success" className="text-[10px] font-bold">
                            WIN ({b.multiplier || "1x"})
                          </Badge>
                        ) : b.status === "lost" ? (
                          <Badge variant="danger" className="text-[10px] font-bold">
                            LOST
                          </Badge>
                        ) : (
                          <Badge variant="warning" className="text-[10px] font-bold">
                            PENDING
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-3 font-black">
                        {b.payout > 0 ? (
                          <span className="text-emerald-400">₹{Number(b.payout).toFixed(2)}</span>
                        ) : (
                          <span className="text-muted">₹0.00</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-muted text-[11px] whitespace-nowrap">
                        {b.time || (b.created_at ? new Date(b.created_at).toLocaleTimeString() : "—")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          /* Content: Rounds Monitoring */
          <div className="mt-4 overflow-x-auto">
            {rounds.length === 0 ? (
              <div className="py-12 text-center text-muted text-sm">
                No rounds data found.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border/40 text-muted font-semibold uppercase text-[11px]">
                    <th className="py-3 px-3">Round ID</th>
                    <th className="py-3 px-3">Winning Number</th>
                    <th className="py-3 px-3">Multiplier</th>
                    <th className="py-3 px-3">Total Bets</th>
                    <th className="py-3 px-3">Round Pool</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {rounds.map((r) => (
                    <tr key={r.id} className="hover:bg-neutral-800/40 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-white">#{r.id}</td>
                      <td className="py-3 px-3">
                        {r.winning_number !== null ? (
                          <span
                            className={cn(
                              "inline-flex items-center justify-center w-7 h-7 rounded-full font-black text-xs shadow-sm",
                              NUMBER_COLORS[r.winning_number] || "bg-neutral-700 text-white"
                            )}
                          >
                            {r.winning_number}
                          </span>
                        ) : (
                          <span className="text-amber-400 font-semibold animate-pulse">
                            Spinning...
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-amber-400">
                          {r.multiplier ? `${r.multiplier}x` : "1x"}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-semibold text-white">
                        {r.bets_count} bets
                      </td>
                      <td className="py-3 px-3 font-black text-amber-300">
                        ₹{Number(r.total_pool).toFixed(2)}
                      </td>
                      <td className="py-3 px-3">
                        <Badge
                          variant={
                            r.status === "settled"
                              ? "success"
                              : r.status === "locked"
                              ? "warning"
                              : "primary"
                          }
                          className="text-[10px] font-bold uppercase"
                        >
                          {r.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-muted text-[11px] whitespace-nowrap">
                        {r.created_at ? new Date(r.created_at).toLocaleTimeString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
