"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Card,
  Button,
  Badge,
  Spinner,
  ErrorMsg,
  PageHeader,
  Modal,
  cn,
} from "@/components/ui";
import {
  Target,
  Sliders,
  Settings,
  RefreshCw,
  Save,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Info,
  PlayCircle,
  Coins,
  BookOpen,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  Zap,
  Flame,
  Award,
} from "lucide-react";
import { toast } from "@/components/Toast";
import { parseApiError } from "@/lib/error-parser";
import {
  getWinGoSettings,
  updateWinGoSettings,
  getWinGoStats,
  getWinGoBets,
  getWinGoRounds,
  WinGoConfig,
} from "@/lib/admin";

const DEFAULT_CONFIG: WinGoConfig = {
  mode: "profit_driven",
  target_margin: 20,
  min_win_rate_percent: 65,
  max_losing_streak_trigger: 3,
  manual_override_number: null,
  manual_override_color: null,
  kill_switch: false,
};

export default function WinGoConsolePage() {
  const [enabled, setEnabled] = useState<boolean>(true);
  const [savingToggle, setSavingToggle] = useState<boolean>(false);
  const [savingConfig, setSavingConfig] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Settings Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Algorithmic Game Controls
  const [config, setConfig] = useState<WinGoConfig>(DEFAULT_CONFIG);

  // Stats
  const [stats, setStats] = useState<{
    total_wagered: number;
    total_payout: number;
    total_profit: number;
    total_players: number;
    total_rounds: number;
    house_edge_pct: number;
    active_connections?: number;
    current_period?: string;
    seconds_remaining?: number;
    is_locked?: boolean;
    period_bets_count?: number;
    period_exposure?: number;
    bets_breakdown?: Record<string, number>;
  } | null>(null);

  // Active Main Tab: "rounds" | "bets" | "manual_control" | "rules"
  const [activeTab, setActiveTab] = useState<"rounds" | "bets" | "manual_control" | "rules">("rounds");

  // Bets & Rounds
  const [bets, setBets] = useState<any[]>([]);
  const [rounds, setRounds] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [betOutcomeFilter, setBetOutcomeFilter] = useState<"all" | "won" | "lost" | "pending">("all");
  const [loadingData, setLoadingData] = useState<boolean>(true);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);

  // Live countdown timer for 30-second cycle
  const [secondsRemaining, setSecondsRemaining] = useState<number>(30);
  const [selectedOverrideNum, setSelectedOverrideNum] = useState<number | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = 30 - (now % 30);
      setSecondsRemaining(remaining);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchLiveGameData = useCallback(async () => {
    try {
      const [statsData, betsData, roundsData] = await Promise.all([
        getWinGoStats().catch(() => null),
        getWinGoBets(50).catch(() => []),
        getWinGoRounds(30).catch(() => []),
      ]);
      if (statsData && typeof statsData === "object" && !("detail" in statsData)) setStats(statsData);
      if (Array.isArray(betsData)) setBets(betsData);
      if (Array.isArray(roundsData)) setRounds(roundsData);
    } catch (_) {
      // Periodic polling error ignored
    } finally {
      setLoadingData(false);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const data = await getWinGoSettings();
      setEnabled(data.enabled);
      if (data.config) {
        setConfig({
          mode: data.config.mode || "profit_driven",
          target_margin: data.config.target_margin ?? 20,
          min_win_rate_percent: data.config.min_win_rate_percent ?? 65,
          max_losing_streak_trigger: data.config.max_losing_streak_trigger ?? 3,
          manual_override_number: data.config.manual_override_number ?? null,
          manual_override_color: data.config.manual_override_color ?? null,
          kill_switch: Boolean(data.config.kill_switch),
        });
        setSelectedOverrideNum(data.config.manual_override_number ?? null);
      }
    } catch (err: any) {
      setError(parseApiError(err));
    }
  }, []);

  useEffect(() => {
    fetchSettings();
    fetchLiveGameData();

    if (!autoRefresh) return;
    const interval = setInterval(fetchLiveGameData, 3000);
    return () => clearInterval(interval);
  }, [fetchSettings, fetchLiveGameData, autoRefresh]);

  const handleToggle = async (nextState: boolean) => {
    setSavingToggle(true);
    setError(null);
    try {
      await updateWinGoSettings({ enabled: nextState });
      setEnabled(nextState);
      const stateText = nextState ? "ACTIVATED on Mobile" : "DEACTIVATED / Paused";
      toast.success(`Win Go is now ${stateText}`);
    } catch (err: any) {
      setError(parseApiError(err));
    } finally {
      setSavingToggle(false);
    }
  };

  const handleSaveConfig = async (overrideConfig?: WinGoConfig) => {
    setSavingConfig(true);
    setError(null);
    const targetConfig = overrideConfig || config;
    try {
      await updateWinGoSettings({ config: targetConfig });
      setConfig(targetConfig);
      toast.success("Win Go game settings saved successfully!");
      setIsSettingsOpen(false);
    } catch (err: any) {
      setError(parseApiError(err));
      toast.error("Failed to save controls: " + parseApiError(err));
    } finally {
      setSavingConfig(false);
    }
  };

  const handleSetOverride = async (num: number | null) => {
    setSelectedOverrideNum(num);
    const updated = { ...config, manual_override_number: num };
    await handleSaveConfig(updated);
  };

  const filteredBets = useMemo(() => {
    if (!Array.isArray(bets)) return [];
    return bets.filter((b) => {
      const matchesSearch =
        !searchTerm ||
        String(b.user_id || "").includes(searchTerm) ||
        String(b.username || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(b.period || "").includes(searchTerm) ||
        String(b.bet_value || "").toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        betOutcomeFilter === "all" ||
        (betOutcomeFilter === "won" && b.status === "won") ||
        (betOutcomeFilter === "lost" && b.status === "lost") ||
        (betOutcomeFilter === "pending" && b.status === "pending");

      return matchesSearch && matchesStatus;
    });
  }, [bets, searchTerm, betOutcomeFilter]);

  const isLocked = secondsRemaining <= 5;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-rose-600 text-white shadow-md shadow-rose-500/20">
              <span className="text-xl">🎰</span>
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Win Go Console
                <Badge variant={enabled ? "emerald" : "outline"} className="text-xs">
                  {enabled ? "ACTIVE 30s" : "OFFLINE"}
                </Badge>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Live 30-second cycle engine, automated profit optimization & manual overrides
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/ouradminportal/wingo-bids-history">
            <Button variant="outline" size="sm" className="gap-1.5 border-slate-300 dark:border-slate-700">
              <BookOpen className="h-4 w-4 text-brand-500" />
              Bids History
            </Button>
          </Link>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSettingsOpen(true)}
            className="gap-1.5 border-slate-300 dark:border-slate-700"
          >
            <Settings className="h-4 w-4 text-slate-600 dark:text-slate-300" />
            Profit Controls
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchLiveGameData()}
            className="gap-1 border-slate-300 dark:border-slate-700"
            disabled={loadingData}
          >
            <RefreshCw className={cn("h-4 w-4", loadingData && "animate-spin text-brand-500")} />
          </Button>

          {/* Master ON/OFF Switch */}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-sm">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Game Status:
            </span>
            <button
              onClick={() => handleToggle(!enabled)}
              disabled={savingToggle}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500/20",
                enabled ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600",
                savingToggle && "opacity-50 cursor-not-allowed"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out",
                  enabled ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
          </div>
        </div>
      </div>

      {error && <ErrorMsg error={error} />}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <Card className="p-4 border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 mb-1">
            <span>Total Wagered</span>
            <Coins className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-slate-100">
            ₹{(stats?.total_wagered || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">All-time turnover</div>
        </Card>

        <Card className="p-4 border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 mb-1">
            <span>Total Payout</span>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-slate-100">
            ₹{(stats?.total_payout || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Paid to players</div>
        </Card>

        <Card className="p-4 border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 mb-1">
            <span>Net Profit</span>
            <Sparkles className="h-4 w-4 text-brand-500" />
          </div>
          <div className={cn(
            "text-xl font-black",
            (stats?.total_profit || 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600"
          )}>
            ₹{(stats?.total_profit || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
            Margin: {(stats?.house_edge_pct || 0).toFixed(1)}%
          </div>
        </Card>

        <Card className="p-4 border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 mb-1">
            <span>Total Rounds</span>
            <Target className="h-4 w-4 text-sky-500" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-slate-100">
            {(stats?.total_rounds || 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">30s periods resolved</div>
        </Card>

        <Card className="col-span-2 md:col-span-1 p-4 border-amber-300 dark:border-amber-700/60 bg-gradient-to-br from-amber-500/10 via-rose-500/5 to-transparent shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">
            <span>Active Countdown</span>
            <Clock className={cn("h-4 w-4", isLocked ? "text-rose-500 animate-spin" : "text-amber-500")} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn(
              "text-2xl font-black font-mono tracking-tight",
              isLocked ? "text-rose-600 animate-pulse" : "text-amber-600 dark:text-amber-400"
            )}>
              00:{String(secondsRemaining).padStart(2, "0")}
            </span>
            <span className="text-[11px] uppercase font-bold text-slate-500">
              {isLocked ? "LOCKED" : "BETTING"}
            </span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono truncate mt-0.5">
            #{stats?.current_period || "Syncing..."}
          </div>
        </Card>
      </div>

      {/* Live Exposure Radar & Override Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Exposure Radar */}
        <Card className="lg:col-span-2 p-5 border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                Live Period Exposure Radar
              </h3>
            </div>
            <div className="text-xs text-slate-500">
              Period <span className="font-mono font-bold text-slate-800 dark:text-slate-200">#{stats?.current_period || "—"}</span>
            </div>
          </div>

          {/* Color & Size Exposure */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mb-4">
            <div className="p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-center">
              <span className="text-xs font-black text-emerald-500 uppercase tracking-wider">Green</span>
              <div className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                ₹{Number(stats?.bets_breakdown?.green || 0).toLocaleString("en-IN")}
              </div>
            </div>
            <div className="p-2.5 rounded-xl border border-purple-500/30 bg-purple-500/10 text-center">
              <span className="text-xs font-black text-purple-400 uppercase tracking-wider">Violet</span>
              <div className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                ₹{Number(stats?.bets_breakdown?.violet || 0).toLocaleString("en-IN")}
              </div>
            </div>
            <div className="p-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-center">
              <span className="text-xs font-black text-rose-500 uppercase tracking-wider">Red</span>
              <div className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                ₹{Number(stats?.bets_breakdown?.red || 0).toLocaleString("en-IN")}
              </div>
            </div>
            <div className="p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-center">
              <span className="text-xs font-black text-amber-500 uppercase tracking-wider">Big (5-9)</span>
              <div className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                ₹{Number(stats?.bets_breakdown?.big || 0).toLocaleString("en-IN")}
              </div>
            </div>
            <div className="p-2.5 rounded-xl border border-sky-500/30 bg-sky-500/10 text-center">
              <span className="text-xs font-black text-sky-400 uppercase tracking-wider">Small (0-4)</span>
              <div className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                ₹{Number(stats?.bets_breakdown?.small || 0).toLocaleString("en-IN")}
              </div>
            </div>
          </div>

          {/* Numbers 0-9 Live Heat */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-500">Number Bets Exposure (0-9):</span>
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => {
                const isOverridden = config.manual_override_number === n;
                const exposure = Number(stats?.bets_breakdown?.[String(n)] || 0);
                const isVioletSplit = n === 0 || n === 5;
                const isGreen = [1, 3, 7, 9].includes(n);

                return (
                  <div
                    key={n}
                    className={cn(
                      "p-2 rounded-xl text-center border transition-all",
                      isOverridden
                        ? "border-amber-400 bg-amber-500/20 shadow-md ring-2 ring-amber-400"
                        : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850"
                    )}
                  >
                    <div className="flex items-center justify-center">
                      <div
                        className={cn(
                          "h-7 w-7 rounded-full flex items-center justify-center font-black text-xs text-white shadow-sm",
                          n === 0 && "bg-gradient-to-r from-rose-500 to-purple-600",
                          n === 5 && "bg-gradient-to-r from-emerald-500 to-purple-600",
                          isGreen && "bg-emerald-600",
                          !isGreen && !isVioletSplit && "bg-rose-600"
                        )}
                      >
                        {n}
                      </div>
                    </div>
                    <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mt-1 truncate">
                      {exposure > 0 ? `₹${exposure}` : "—"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Manual Override Control */}
        <Card className="p-5 border-amber-300 dark:border-amber-700/60 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-amber-500" />
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  Next Round Override
                </h3>
              </div>
              {config.manual_override_number !== null ? (
                <Badge variant="emerald" className="text-[10px] animate-pulse">
                  FORCED #{config.manual_override_number}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px]">
                  AUTO PROFIT
                </Badge>
              )}
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Force the winning ball for upcoming period. When active, algorithm overrides normal profit calculations.
            </p>

            {/* Quick 0-9 Selectors */}
            <div className="grid grid-cols-5 gap-2 mb-4">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => {
                const selected = selectedOverrideNum === n;
                const isVioletSplit = n === 0 || n === 5;
                const isGreen = [1, 3, 7, 9].includes(n);

                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setSelectedOverrideNum(selected ? null : n)}
                    className={cn(
                      "h-9 rounded-xl font-black text-sm flex items-center justify-center transition-all",
                      selected
                        ? "ring-2 ring-amber-400 scale-105 shadow-md text-white " +
                          (n === 0
                            ? "bg-gradient-to-r from-rose-600 to-purple-600"
                            : n === 5
                            ? "bg-gradient-to-r from-emerald-600 to-purple-600"
                            : isGreen
                            ? "bg-emerald-600"
                            : "bg-rose-600")
                        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                    )}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs"
              size="sm"
              disabled={savingConfig || selectedOverrideNum === config.manual_override_number}
              onClick={() => handleSetOverride(selectedOverrideNum)}
            >
              {selectedOverrideNum !== null ? `Apply Override (#${selectedOverrideNum})` : "Save Auto-Profit"}
            </Button>
            {config.manual_override_number !== null && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs text-rose-500 border-rose-300 dark:border-rose-800"
                onClick={() => handleSetOverride(null)}
              >
                Clear
              </Button>
            )}
          </div>
        </Card>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6">
        <button
          onClick={() => setActiveTab("rounds")}
          className={cn(
            "pb-3 text-sm font-semibold border-b-2 transition-colors",
            activeTab === "rounds"
              ? "border-brand-500 text-brand-600 dark:text-brand-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          )}
        >
          Live Rounds ({rounds.length})
        </button>
        <button
          onClick={() => setActiveTab("bets")}
          className={cn(
            "pb-3 text-sm font-semibold border-b-2 transition-colors",
            activeTab === "bets"
              ? "border-brand-500 text-brand-600 dark:text-brand-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          )}
        >
          Recent Bets ({bets.length})
        </button>
        <button
          onClick={() => setActiveTab("rules")}
          className={cn(
            "pb-3 text-sm font-semibold border-b-2 transition-colors",
            activeTab === "rules"
              ? "border-brand-500 text-brand-600 dark:text-brand-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          )}
        >
          Payout Rules & Guide
        </button>
      </div>

      {/* TAB 1: Live Rounds */}
      {activeTab === "rounds" && (
        <Card className="border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase">
                <tr>
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3 text-center">Result Ball</th>
                  <th className="px-4 py-3 text-center">Color</th>
                  <th className="px-4 py-3 text-center">Size</th>
                  <th className="px-4 py-3 text-right">Total Wagered</th>
                  <th className="px-4 py-3 text-right">Total Payout</th>
                  <th className="px-4 py-3 text-right">Net Profit</th>
                  <th className="px-4 py-3 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {rounds.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                      No rounds recorded yet. The background 30s engine will generate results automatically.
                    </td>
                  </tr>
                ) : (
                  rounds.map((r) => {
                    const profit = Number(r.profit || 0);
                    const n = Number(r.number ?? 0);
                    const isGreen = [1, 3, 7, 9].includes(n);
                    const isVioletSplit = n === 0 || n === 5;

                    return (
                      <tr key={r.id || r.period} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition">
                        <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                          {r.period}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={cn(
                              "inline-flex h-6 w-6 items-center justify-center rounded-full font-black text-xs text-white shadow-sm",
                              n === 0 && "bg-gradient-to-r from-rose-500 to-purple-600",
                              n === 5 && "bg-gradient-to-r from-emerald-500 to-purple-600",
                              isGreen && "bg-emerald-600",
                              !isGreen && !isVioletSplit && "bg-rose-600"
                            )}
                          >
                            {n}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={cn(
                              "inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider",
                              r.color === "green" && "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20",
                              r.color === "red" && "bg-rose-500/10 text-rose-500 border border-rose-500/20",
                              r.color?.includes("violet") && "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                            )}
                          >
                            {r.color}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-bold uppercase text-slate-700 dark:text-slate-300">
                            {r.size}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-slate-100">
                          ₹{Number(r.total_wagered || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-600 dark:text-slate-400">
                          ₹{Number(r.total_payout || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className={cn(
                          "px-4 py-3 text-right font-black",
                          profit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600"
                        )}>
                          {profit >= 0 ? "+" : ""}₹{profit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-400 font-mono text-[11px]">
                          {r.created_at ? new Date(r.created_at).toLocaleTimeString() : "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 2: Recent Bets */}
      {activeTab === "bets" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Search by period, user ID, selection..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-80 px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <span className="text-xs text-slate-400">Filter:</span>
              {(["all", "won", "lost", "pending"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setBetOutcomeFilter(f)}
                  className={cn(
                    "px-2.5 py-1 text-xs rounded-lg font-semibold uppercase transition",
                    betOutcomeFilter === f
                      ? "bg-brand-500 text-white shadow-sm"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <Card className="border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase">
                  <tr>
                    <th className="px-4 py-3">Bet ID</th>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3 font-mono">Period</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Selection</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-right">Payout</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Placed At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {filteredBets.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                        No bets matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredBets.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition">
                        <td className="px-4 py-3 font-mono text-slate-500">#{b.id}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                          {b.username || `User #${b.user_id}`}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300">
                          {b.period}
                        </td>
                        <td className="px-4 py-3 uppercase text-[10px] font-bold text-slate-500">
                          {b.bet_type}
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[11px] font-black uppercase",
                            b.bet_value === "green" && "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20",
                            b.bet_value === "red" && "bg-rose-500/10 text-rose-500 border border-rose-500/20",
                            b.bet_value === "violet" && "bg-purple-500/10 text-purple-400 border border-purple-500/20",
                            b.bet_value === "big" && "bg-amber-500/10 text-amber-500 border border-amber-500/20",
                            b.bet_value === "small" && "bg-sky-500/10 text-sky-400 border border-sky-500/20",
                            !["green", "red", "violet", "big", "small"].includes(String(b.bet_value).toLowerCase()) && "bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                          )}>
                            {b.bet_value}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-slate-100">
                          ₹{Number(b.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right font-black text-emerald-600 dark:text-emerald-400">
                          {b.payout > 0 ? `₹${Number(b.payout).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={cn(
                            "inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase",
                            b.status === "won" && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
                            b.status === "lost" && "bg-rose-500/15 text-rose-600 dark:text-rose-400",
                            b.status === "pending" && "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                          )}>
                            {b.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-slate-400 font-mono text-[11px]">
                          {b.created_at ? new Date(b.created_at).toLocaleTimeString() : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: Rules & Guide */}
      {activeTab === "rules" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Card className="p-5 border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-brand-500" />
              Win Go Payout Multipliers
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-850">
                <span className="font-bold text-slate-800 dark:text-slate-200">Number Selection (0 - 9)</span>
                <span className="font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">9.0x Payout</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-850">
                <span className="font-bold text-slate-800 dark:text-slate-200">Big (5, 6, 7, 8, 9) / Small (0, 1, 2, 3, 4)</span>
                <span className="font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">2.0x Payout</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-850">
                <span className="font-bold text-slate-800 dark:text-slate-200">Green (1, 3, 7, 9)</span>
                <span className="font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">2.0x (1.5x on 5)</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-850">
                <span className="font-bold text-slate-800 dark:text-slate-200">Red (2, 4, 6, 8)</span>
                <span className="font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">2.0x (1.5x on 0)</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-850">
                <span className="font-bold text-slate-800 dark:text-slate-200">Violet (Hit 0 or 5)</span>
                <span className="font-black text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">4.5x Payout</span>
              </div>
            </div>
          </Card>

          <Card className="p-5 border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Algorithm & Profit Engine
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              The Win Go backend runs a synchronized 30-second loop. Every second, it broadcasts live ticks to connected mobile clients. 
              At <strong>T-5 seconds</strong>, betting is locked to prevent front-running.
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              When in <strong>Profit Driven</strong> mode, the engine evaluates all 10 possible winning numbers (0 through 9) against the exact 
              distribution of user bets for that period. It picks the outcome that guarantees the house profit margin while maintaining natural winning feeling.
            </p>
          </Card>
        </div>
      )}

      {/* Algorithmic Settings Modal */}
      <Modal
        open={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title="Win Go Algorithmic Controls"
      >
        <div className="space-y-5 py-2">
          {/* Mode Switcher */}
          <div>
            <label className="text-xs font-bold uppercase text-slate-500 mb-2 block">
              Engine Operating Mode
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setConfig({ ...config, mode: "profit_driven" })}
                className={cn(
                  "p-3 rounded-xl border text-left transition",
                  config.mode === "profit_driven"
                    ? "border-brand-500 bg-brand-500/10 text-brand-600 dark:text-brand-400"
                    : "border-slate-200 dark:border-slate-700 hover:bg-slate-50"
                )}
              >
                <div className="font-bold text-sm">Profit Driven (Smart)</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Optimizes payouts to meet margin</div>
              </button>
              <button
                type="button"
                onClick={() => setConfig({ ...config, mode: "random" })}
                className={cn(
                  "p-3 rounded-xl border text-left transition",
                  config.mode === "random"
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "border-slate-200 dark:border-slate-700 hover:bg-slate-50"
                )}
              >
                <div className="font-bold text-sm">Pure RNG (Fair)</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Random numbers without bias</div>
              </button>
            </div>
          </div>

          {/* Target Margin % */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Target House Margin (%)
              </label>
              <span className="font-mono font-bold text-sm text-brand-600">
                {config.target_margin}%
              </span>
            </div>
            <input
              type="range"
              min="5"
              max="60"
              step="1"
              value={config.target_margin}
              onChange={(e) => setConfig({ ...config, target_margin: Number(e.target.value) })}
              className="w-full accent-brand-500"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>5% (Player Friendly)</span>
              <span>20% (Recommended)</span>
              <span>60% (High Profit)</span>
            </div>
          </div>

          {/* Player Win Rate Target */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Target Player Win Rate (%)
              </label>
              <span className="font-mono font-bold text-sm text-emerald-600">
                {config.min_win_rate_percent}%
              </span>
            </div>
            <input
              type="range"
              min="30"
              max="90"
              step="5"
              value={config.min_win_rate_percent}
              onChange={(e) => setConfig({ ...config, min_win_rate_percent: Number(e.target.value) })}
              className="w-full accent-emerald-500"
            />
          </div>

          {/* Streak Trigger */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Max Losing Streak Trigger
              </label>
              <span className="font-mono font-bold text-sm text-amber-600">
                {config.max_losing_streak_trigger} rounds
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={config.max_losing_streak_trigger}
              onChange={(e) => setConfig({ ...config, max_losing_streak_trigger: Number(e.target.value) })}
              className="w-full accent-amber-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              If a player loses this many rounds consecutively, engine favors a payout to retain retention.
            </p>
          </div>

          {/* Save Action */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button variant="outline" size="sm" onClick={() => setIsSettingsOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-brand-500 hover:bg-brand-600 text-white font-bold"
              disabled={savingConfig}
              onClick={() => handleSaveConfig()}
            >
              {savingConfig ? <Spinner className="h-4 w-4" /> : "Save Changes"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

