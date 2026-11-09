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
import {
  Target,
  Sliders,
  RefreshCw,
  Save,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Info,
  PlayCircle,
  Coins,
  BookOpen,
} from "lucide-react";
import { toast } from "@/components/Toast";
import { parseApiError } from "@/lib/error-parser";
import {
  getRealSpinProSettings,
  updateRealSpinProSettings,
  getRealSpinProStats,
  getRealSpinProBets,
  getRealSpinProRounds,
  RealSpinProConfig,
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

const DEFAULT_CONFIG: RealSpinProConfig = {
  mode: "profit_driven",
  target_margin: 20,
  min_win_rate_percent: 70,
  max_losing_streak_trigger: 3,
  multipliers: {
    "1x": 80,
    "2x": 15,
    "3x": 5,
  },
};

export default function RealSpinProPage() {
  const [enabled, setEnabled] = useState<boolean>(true);
  const [savingToggle, setSavingToggle] = useState<boolean>(false);
  const [savingConfig, setSavingConfig] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Algorithmic Game Controls
  const [config, setConfig] = useState<RealSpinProConfig>(DEFAULT_CONFIG);

  // Stats
  const [stats, setStats] = useState<{
    total_wagered: number;
    total_payout: number;
    total_profit: number;
    total_players: number;
    total_rounds: number;
    house_edge_pct: number;
  } | null>(null);

  // Tabs: "controls" | "bets" | "rounds" | "reference"
  const [activeTab, setActiveTab] = useState<"controls" | "bets" | "rounds" | "reference">("controls");

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
      if (data.config) {
        setConfig({
          mode: data.config.mode || "profit_driven",
          target_margin: data.config.target_margin ?? 20,
          min_win_rate_percent: data.config.min_win_rate_percent ?? 70,
          max_losing_streak_trigger: data.config.max_losing_streak_trigger ?? 3,
          multipliers: {
            "1x": data.config.multipliers?.["1x"] ?? 80,
            "2x": data.config.multipliers?.["2x"] ?? 15,
            "3x": data.config.multipliers?.["3x"] ?? 5,
          },
        });
      }
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
    setSavingToggle(true);
    setError(null);
    try {
      await updateRealSpinProSettings({ enabled: nextState });
      setEnabled(nextState);
      const stateText = nextState ? "ACTIVATED on Mobile" : "DEACTIVATED / Hidden";
      toast.success(`RealSpinPro is now ${stateText}`);
    } catch (err: any) {
      setError(parseApiError(err));
    } finally {
      setSavingToggle(false);
    }
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    setError(null);
    try {
      await updateRealSpinProSettings({ config });
      toast.success("Game controls and profit settings saved successfully!");
    } catch (err: any) {
      setError(parseApiError(err));
      toast.error("Failed to save controls: " + parseApiError(err));
    } finally {
      setSavingConfig(false);
    }
  };

  const handleResetDefaults = () => {
    setConfig(DEFAULT_CONFIG);
    toast.info("Controls reset to default (20% Target Margin). Remember to click Save.");
  };

  const multiplierTotalWeight =
    (config.multipliers?.["1x"] || 0) +
    (config.multipliers?.["2x"] || 0) +
    (config.multipliers?.["3x"] || 0);

  const getWeightPct = (w: number) => {
    if (multiplierTotalWeight <= 0) return 0;
    return Math.round((w / multiplierTotalWeight) * 100);
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
        description="Comprehensive control center: profit margins, streak breakers, live rounds, and mobile visibility."
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
              <p className="text-xs text-muted mt-1 max-w-2xl">
                {enabled
                  ? "Spinning logo is active across all screens right bottom above Support on the mobile app. Players tap to bet with real DPSara wallet balance."
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
              disabled={savingToggle}
              className={cn(
                "relative inline-flex h-9 w-20 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500",
                enabled ? "bg-amber-500 shadow-lg shadow-amber-500/30" : "bg-neutral-700",
                savingToggle && "opacity-60 cursor-not-allowed"
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

      {/* Game Stats KPI Cards */}
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
            Realized Margin: {stats?.house_edge_pct ?? 0}%
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
            {stats?.total_rounds ?? 0} rounds settled
          </p>
        </Card>
      </div>

      {/* Tabs & Management Container */}
      <Card className="p-6 border border-border/50 bg-surface/90 rounded-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border/50 gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab("controls")}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
                activeTab === "controls"
                  ? "bg-amber-500 text-neutral-950 shadow-md"
                  : "bg-surface hover:bg-neutral-800 text-muted"
              )}
            >
              <Sliders className="w-4 h-4" />
              Game Controls & Margin
            </button>
            <button
              onClick={() => setActiveTab("bets")}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
                activeTab === "bets"
                  ? "bg-amber-500 text-neutral-950 shadow-md"
                  : "bg-surface hover:bg-neutral-800 text-muted"
              )}
            >
              <Coins className="w-4 h-4" />
              Recent Bets Activity
            </button>
            <button
              onClick={() => setActiveTab("rounds")}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
                activeTab === "rounds"
                  ? "bg-amber-500 text-neutral-950 shadow-md"
                  : "bg-surface hover:bg-neutral-800 text-muted"
              )}
            >
              <PlayCircle className="w-4 h-4" />
              Live Rounds Monitoring
            </button>
            <button
              onClick={() => setActiveTab("reference")}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
                activeTab === "reference"
                  ? "bg-amber-500 text-neutral-950 shadow-md"
                  : "bg-surface hover:bg-neutral-800 text-muted"
              )}
            >
              <BookOpen className="w-4 h-4" />
              Rules & Multipliers
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
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </Button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════════ */}
        {/* TAB 1: GAME CONTROLS & PROFIT MARGIN */}
        {/* ══════════════════════════════════════════════════════════════════════════ */}
        {activeTab === "controls" && (
          <div className="mt-6 space-y-8">
            {/* Header & Save Action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-neutral-900/60 border border-neutral-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Target className="w-5 h-5 text-amber-400" />
                  RealSpinPro Algorithmic Profit Engine
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  Directly configure how outcomes and multipliers are calculated by the FastAPI game service.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetDefaults}
                  disabled={savingConfig}
                  className="text-xs"
                >
                  Reset Defaults
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveConfig}
                  loading={savingConfig}
                  className="bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold text-xs gap-1.5 shadow-md shadow-amber-500/20"
                >
                  <Save className="w-4 h-4" /> Save Game Controls
                </Button>
              </div>
            </div>

            {/* Operating Mode Selector */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-muted uppercase tracking-wider">
                Game Logic Mode
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Profit Driven */}
                <div
                  onClick={() => setConfig((prev) => ({ ...prev, mode: "profit_driven" }))}
                  className={cn(
                    "p-5 rounded-2xl border cursor-pointer transition-all relative overflow-hidden",
                    config.mode === "profit_driven"
                      ? "border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/10"
                      : "border-border/40 bg-neutral-900/40 hover:border-neutral-700"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-white text-base flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-amber-400" />
                      Profit Driven (House Optimized)
                    </span>
                    <Badge variant="warning" className="text-[10px] font-bold">
                      RECOMMENDED
                    </Badge>
                  </div>
                  <p className="text-xs text-muted leading-relaxed">
                    Continuously balances the house profit margin while strategically distributing payouts to active bettors to maximize player retention and prevent churn.
                  </p>
                </div>

                {/* Fair / Random */}
                <div
                  onClick={() => setConfig((prev) => ({ ...prev, mode: "random" }))}
                  className={cn(
                    "p-5 rounded-2xl border cursor-pointer transition-all relative overflow-hidden",
                    config.mode === "random"
                      ? "border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/10"
                      : "border-border/40 bg-neutral-900/40 hover:border-neutral-700"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-white text-base flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-blue-400" />
                      Fair (Pure Random RNG)
                    </span>
                    <Badge variant="primary" className="text-[10px] font-bold">
                      UNBIASED RNG
                    </Badge>
                  </div>
                  <p className="text-xs text-muted leading-relaxed">
                    Draws winning numbers (0–9) and multipliers purely at random without checking current round bet volume or house margins.
                  </p>
                </div>
              </div>
            </div>

            {/* Target Profit Margin Slider (When Profit Driven) */}
            {config.mode === "profit_driven" && (
              <div className="p-6 rounded-2xl bg-neutral-900/50 border border-neutral-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-bold text-white flex items-center gap-2">
                      <Target className="w-4 h-4 text-amber-400" />
                      Target Profit Margin (%)
                    </label>
                    <p className="text-xs text-muted mt-0.5">
                      The percentage of total bets the algorithm aims to retain as house profit.
                    </p>
                  </div>
                  <span className="text-2xl font-black text-amber-400">
                    {config.target_margin}%
                  </span>
                </div>

                <input
                  type="range"
                  min="0"
                  max="100"
                  value={config.target_margin}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, target_margin: Number(e.target.value) }))
                  }
                  className="w-full accent-amber-500 cursor-pointer h-2 bg-neutral-800 rounded-lg"
                />

                <div className="flex flex-wrap gap-2 pt-2">
                  <span className="text-xs text-muted font-semibold self-center mr-2">Quick Presets:</span>
                  {[10, 15, 20, 25, 30, 40].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setConfig((prev) => ({ ...prev, target_margin: preset }))}
                      className={cn(
                        "px-3 py-1 rounded-lg text-xs font-bold transition-all",
                        config.target_margin === preset
                          ? "bg-amber-500 text-neutral-950"
                          : "bg-neutral-800 text-muted hover:text-white"
                      )}
                    >
                      {preset}% {preset === 20 ? "(Default)" : ""}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Multipliers Probability Distribution */}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Multiplier Probability Distribution
                </label>
                <p className="text-xs text-muted mt-1">
                  Adjust relative weight points for 1x, 2x, and 3x multipliers. Percentage probabilities calculate dynamically.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* 1x Multiplier */}
                <Card className="p-4 rounded-xl border border-border/50 bg-neutral-900/60">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-white">1x Base Multiplier</span>
                    <Badge variant="primary" className="text-xs font-bold">
                      {getWeightPct(config.multipliers["1x"])}% Chance
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted mb-3">Pays standard 9x rate</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted">Weight:</span>
                    <input
                      type="number"
                      min="1"
                      value={config.multipliers["1x"]}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          multipliers: {
                            ...prev.multipliers,
                            "1x": Math.max(1, Number(e.target.value) || 1),
                          },
                        }))
                      }
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-1.5 text-sm text-white font-bold focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </Card>

                {/* 2x Multiplier */}
                <Card className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-blue-300">2x Double Multiplier</span>
                    <Badge variant="primary" className="text-xs font-bold">
                      {getWeightPct(config.multipliers["2x"])}% Chance
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted mb-3">Pays boosted 18x rate</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted">Weight:</span>
                    <input
                      type="number"
                      min="0"
                      value={config.multipliers["2x"]}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          multipliers: {
                            ...prev.multipliers,
                            "2x": Math.max(0, Number(e.target.value) || 0),
                          },
                        }))
                      }
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-1.5 text-sm text-blue-300 font-bold focus:outline-none focus:border-blue-400"
                    />
                  </div>
                </Card>

                {/* 3x Multiplier */}
                <Card className="p-4 rounded-xl border border-purple-500/30 bg-purple-500/5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-purple-300">3x Mega Multiplier</span>
                    <Badge variant="warning" className="text-xs font-bold">
                      {getWeightPct(config.multipliers["3x"])}% Chance
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted mb-3">Pays massive 27x rate</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted">Weight:</span>
                    <input
                      type="number"
                      min="0"
                      value={config.multipliers["3x"]}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          multipliers: {
                            ...prev.multipliers,
                            "3x": Math.max(0, Number(e.target.value) || 0),
                          },
                        }))
                      }
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-1.5 text-sm text-purple-300 font-bold focus:outline-none focus:border-purple-400"
                    />
                  </div>
                </Card>
              </div>
            </div>

            {/* Retention & Loss Protection Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <Card className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/40 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-white flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-emerald-400" />
                    Bidded Outcome Win Rate (%)
                  </label>
                  <span className="text-lg font-black text-emerald-400">
                    {config.min_win_rate_percent}%
                  </span>
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  When safe, profitable candidate outcomes exist, this defines how frequently players win to maintain excitement rather than drawing unplaced numbers.
                </p>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={config.min_win_rate_percent}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, min_win_rate_percent: Number(e.target.value) }))
                  }
                  className="w-full accent-emerald-500 cursor-pointer h-2 bg-neutral-800 rounded-lg"
                />
              </Card>

              <Card className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/40 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-white flex items-center gap-2">
                    <Info className="w-4 h-4 text-amber-400" />
                    Losing Streak Breaker Assist
                  </label>
                  <span className="text-lg font-black text-amber-400">
                    {config.max_losing_streak_trigger} Rounds
                  </span>
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  Consecutive losses before the engine assists a player by prioritizing their numbers (if safe within house margins) to prevent player churn.
                </p>
                <div className="flex items-center gap-3 pt-1">
                  <span className="text-xs text-muted">Trigger after:</span>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={config.max_losing_streak_trigger}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        max_losing_streak_trigger: Math.max(1, Number(e.target.value) || 1),
                      }))
                    }
                    className="w-24 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-1.5 text-sm text-white font-bold text-center focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-xs text-muted">losses in a row</span>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════════ */}
        {/* TAB 2: RECENT BETS ACTIVITY */}
        {/* ══════════════════════════════════════════════════════════════════════════ */}
        {activeTab === "bets" && (
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
        )}

        {/* ══════════════════════════════════════════════════════════════════════════ */}
        {/* TAB 3: LIVE ROUNDS MONITORING */}
        {/* ══════════════════════════════════════════════════════════════════════════ */}
        {activeTab === "rounds" && (
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

        {/* ══════════════════════════════════════════════════════════════════════════ */}
        {/* TAB 4: RULES & MULTIPLIERS REFERENCE */}
        {/* ══════════════════════════════════════════════════════════════════════════ */}
        {activeTab === "reference" && (
          <div className="mt-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-5 rounded-2xl border border-border/50 bg-neutral-900/40">
                <h4 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                  <span className="text-amber-400 text-lg">💰</span> Base Rate: 1 ka 9
                </h4>
                <p className="text-xs text-muted leading-relaxed">
                  Players choose single numbers 0–9. When a number hits on a 1x round, the payout is 9x the wagered amount. If 2x or 3x triggers, payouts jump to 18x and 27x respectively!
                </p>
              </Card>

              <Card className="p-5 rounded-2xl border border-border/50 bg-neutral-900/40">
                <h4 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                  <span className="text-blue-400 text-lg">⏱️</span> 60-Second Game Clock
                </h4>
                <p className="text-xs text-muted leading-relaxed">
                  Every round lasts exactly 60 seconds. 0–40s is betting phase; at 15s remaining, bets lock and the wheel spins. At 0s, winners are credited immediately.
                </p>
              </Card>

              <Card className="p-5 rounded-2xl border border-border/50 bg-neutral-900/40">
                <h4 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                  <span className="text-emerald-400 text-lg">💳</span> DPSara Wallet Sync
                </h4>
                <p className="text-xs text-muted leading-relaxed">
                  RealSpinPro connects directly to the player&apos;s main DPSara wallet. Bets are debited via transaction ledger, and winnings are credited automatically.
                </p>
              </Card>
            </div>

            <Card className="p-6 rounded-2xl border border-border/50 bg-neutral-900/60 space-y-4">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                Payout Matrix by Multiplier
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border/40 text-muted font-semibold">
                      <th className="py-2.5 px-3">Bet Chip</th>
                      <th className="py-2.5 px-3">1x Multiplier (9x)</th>
                      <th className="py-2.5 px-3">2x Multiplier (18x)</th>
                      <th className="py-2.5 px-3">3x Multiplier (27x)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20 font-bold">
                    <tr>
                      <td className="py-2.5 px-3 text-white">₹5 Chip</td>
                      <td className="py-2.5 px-3 text-emerald-400">₹45.00</td>
                      <td className="py-2.5 px-3 text-blue-400">₹90.00</td>
                      <td className="py-2.5 px-3 text-purple-400">₹135.00</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-white">₹10 Chip</td>
                      <td className="py-2.5 px-3 text-emerald-400">₹90.00</td>
                      <td className="py-2.5 px-3 text-blue-400">₹180.00</td>
                      <td className="py-2.5 px-3 text-purple-400">₹270.00</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-white">₹50 Chip</td>
                      <td className="py-2.5 px-3 text-emerald-400">₹450.00</td>
                      <td className="py-2.5 px-3 text-blue-400">₹900.00</td>
                      <td className="py-2.5 px-3 text-purple-400">₹1,350.00</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-white">₹100 Chip</td>
                      <td className="py-2.5 px-3 text-emerald-400">₹900.00</td>
                      <td className="py-2.5 px-3 text-blue-400">₹1,800.00</td>
                      <td className="py-2.5 px-3 text-purple-400">₹2,700.00</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-white">₹500 Chip</td>
                      <td className="py-2.5 px-3 text-emerald-400">₹4,500.00</td>
                      <td className="py-2.5 px-3 text-blue-400">₹9,000.00</td>
                      <td className="py-2.5 px-3 text-purple-400">₹13,500.00</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </Card>
    </div>
  );
}
