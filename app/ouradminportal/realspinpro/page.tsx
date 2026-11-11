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
  manual_override_number: null,
  manual_override_multiplier: 1,
  kill_switch: false,
};

export default function RealSpinProPage() {
  const [enabled, setEnabled] = useState<boolean>(true);
  const [savingToggle, setSavingToggle] = useState<boolean>(false);
  const [savingConfig, setSavingConfig] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Settings Modal State (Gear option in header)
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

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
    active_connections?: number;
    redis_connected?: boolean;
  } | null>(null);

  // Active Main Tab: "rounds" | "bets" | "manual_control" | "reference"
  const [activeTab, setActiveTab] = useState<"rounds" | "bets" | "manual_control" | "reference">("rounds");

  // Bets & Rounds
  const [bets, setBets] = useState<any[]>([]);
  const [rounds, setRounds] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [betOutcomeFilter, setBetOutcomeFilter] = useState<"all" | "won" | "lost" | "pending">("all");
  const [loadingData, setLoadingData] = useState<boolean>(true);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);

  // Countdown timer for 60-second cycle
  const [secondsRemaining, setSecondsRemaining] = useState<number>(60);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setSecondsRemaining(60 - now.getSeconds());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchLiveGameData = useCallback(async () => {
    try {
      const [statsData, betsData, roundsData] = await Promise.all([
        getRealSpinProStats().catch(() => null),
        getRealSpinProBets(50).catch(() => []),
        getRealSpinProRounds(30).catch(() => []),
      ]);
      if (statsData) setStats(statsData);
      if (betsData) setBets(Array.isArray(betsData) ? betsData : []);
      if (roundsData) setRounds(Array.isArray(roundsData) ? roundsData : []);
    } catch (_) {
      // Ignored during periodic polling
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
          manual_override_number: data.config.manual_override_number ?? null,
          manual_override_multiplier: data.config.manual_override_multiplier ?? 1,
          kill_switch: Boolean(data.config.kill_switch),
        });
      }
    } catch (err: any) {
      setError(parseApiError(err));
    }
  }, []);

  useEffect(() => {
    fetchSettings();
    fetchLiveGameData();

    if (!autoRefresh) return;
    const interval = setInterval(fetchLiveGameData, 3500);
    return () => clearInterval(interval);
  }, [fetchSettings, fetchLiveGameData, autoRefresh]);

  const handleToggle = async (nextState: boolean) => {
    setSavingToggle(true);
    setError(null);
    try {
      await updateRealSpinProSettings({ enabled: nextState });
      setEnabled(nextState);
      const stateText = nextState ? "ACTIVATED on Mobile" : "DEACTIVATED / Paused";
      toast.success(`RealSpinPro is now ${stateText}`);
    } catch (err: any) {
      setError(parseApiError(err));
    } finally {
      setSavingToggle(false);
    }
  };

  const handleSaveConfig = async (overrideConfig?: RealSpinProConfig) => {
    setSavingConfig(true);
    setError(null);
    const targetConfig = overrideConfig || config;
    try {
      await updateRealSpinProSettings({ config: targetConfig });
      setConfig(targetConfig);
      toast.success("Game controls and profit settings saved successfully!");
      setIsSettingsOpen(false);
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

  // Active round analysis
  const activeRound = useMemo(() => {
    if (!rounds || rounds.length === 0) return null;
    return rounds[0];
  }, [rounds]);

  // Breakdown of bets for the current active round across digits 0 to 9
  const activeRoundBetsByNumber = useMemo(() => {
    const map: Record<number, number> = {
      0: 0, 1: 0, 2: 0, 3: 0, 4: 0,
      5: 0, 6: 0, 7: 0, 8: 0, 9: 0,
    };
    if (!activeRound) return map;
    for (const b of bets) {
      if (Number(b.round_id) === Number(activeRound.id)) {
        const num = Number(b.number);
        if (num >= 0 && num <= 9) {
          map[num] = (map[num] || 0) + (Number(b.amount) || 0);
        }
      }
    }
    return map;
  }, [bets, activeRound]);

  const activeRoundTotalBets = useMemo(() => {
    return Object.values(activeRoundBetsByNumber).reduce((a, b) => a + b, 0);
  }, [activeRoundBetsByNumber]);

  const filteredBets = bets.filter((b) => {
    if (betOutcomeFilter !== "all") {
      if (betOutcomeFilter === "won" && b.status !== "won") return false;
      if (betOutcomeFilter === "lost" && b.status !== "lost") return false;
      if (betOutcomeFilter === "pending" && (b.status === "won" || b.status === "lost")) return false;
    }
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
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto pb-16 px-1 sm:px-0">
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* HEADER BAR (Mobile-First with Quick Toggle & Settings Gear) */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 sm:p-5 shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-xl sm:text-2xl shrink-0 shadow-inner">
            🎡
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <h1 className="text-base sm:text-xl font-black text-slate-900 dark:text-white tracking-wide truncate">
                RealSpinPro Console
              </h1>
              <Badge
                variant={enabled ? "success" : "danger"}
                className="text-[10px] sm:text-xs px-2 py-0.5 font-bold uppercase"
              >
                {enabled ? "● LIVE" : "○ OFF"}
              </Badge>
              {config.manual_override_number !== null && config.manual_override_number !== undefined && (
                <Badge variant="warning" className="text-[10px] px-2 py-0.5 font-extrabold uppercase animate-pulse">
                  ⚡ OVERRIDE: {config.manual_override_number}
                </Badge>
              )}
              {stats?.redis_connected !== undefined && (
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-cyan-600 dark:text-cyan-400 font-medium">
                  ⚡ Redis Hub
                </span>
              )}
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
              1 ka 9 Spinning Game Engine • Real-time DPSara Wallet Bets &amp; Profit Controller
            </p>
          </div>
        </div>

        {/* Action Controls: Quick Switch, Settings Gear & Refresh */}
        <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200 dark:border-slate-800">
          <Link href="/ouradminportal/realspinpro-bids-history">
            <Button variant="outline" size="sm" className="text-xs h-9 font-bold px-2.5 hidden md:inline-flex">
              Bids History 🎰
            </Button>
          </Link>

          {/* Quick Mobile Master Toggle */}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 hidden xs:inline">App:</span>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              onClick={() => handleToggle(!enabled)}
              disabled={savingToggle}
              className={cn(
                "relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                enabled ? "bg-amber-500" : "bg-slate-300 dark:bg-neutral-700",
                savingToggle && "opacity-60 cursor-not-allowed"
              )}
              title={enabled ? "Click to disable game on mobile" : "Click to activate game on mobile"}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out text-[9px] font-black text-center leading-5",
                  enabled ? "translate-x-6 text-amber-600" : "translate-x-0.5 text-slate-500 dark:text-neutral-400"
                )}
              >
                {enabled ? "ON" : "OFF"}
              </span>
            </button>
          </div>

          {/* Settings Gear Modal Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSettingsOpen(true)}
            className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30 text-xs gap-1.5 h-9 font-bold px-3 shadow-xs"
            title="Open game controls, profit margins, and multiplier settings"
          >
            <Settings className="w-4 h-4 text-amber-600 dark:text-amber-400 animate-spin-slow" />
            <span>Settings</span>
          </Button>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLiveGameData}
            loading={loadingData}
            className="text-xs gap-1 h-9 px-2.5"
            title="Refresh game data"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {error && <ErrorMsg error={error} onDismiss={() => setError(null)} />}

      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* COMPACT KPI STATS CARDS (Mobile Responsive Grid) */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3.5">
        {/* Total Wagered */}
        <Card className="p-3 sm:p-4 rounded-xl shadow-xs">
          <div className="flex justify-between items-start mb-1 sm:mb-1.5">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Wagered
            </span>
            <span className="text-amber-500 dark:text-amber-400 text-sm sm:text-base">💰</span>
          </div>
          <div className="text-base sm:text-2xl font-black text-slate-900 dark:text-white truncate">
            ₹{(stats?.total_wagered ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">Chips placed</p>
        </Card>

        {/* Total Won / Payout */}
        <Card className="p-3 sm:p-4 rounded-xl shadow-xs">
          <div className="flex justify-between items-start mb-1 sm:mb-1.5">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Payout
            </span>
            <span className="text-emerald-500 dark:text-emerald-400 text-sm sm:text-base">🏆</span>
          </div>
          <div className="text-base sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 truncate">
            ₹{(stats?.total_payout ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">Won by players</p>
        </Card>

        {/* House Profit */}
        <Card className="p-3 sm:p-4 rounded-xl shadow-xs">
          <div className="flex justify-between items-start mb-1 sm:mb-1.5">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              House Profit (GGR)
            </span>
            <span className="text-blue-500 dark:text-blue-400 text-sm sm:text-base">📈</span>
          </div>
          <div className={cn("text-base sm:text-2xl font-black truncate", (stats?.total_profit ?? 0) >= 0 ? "text-blue-600 dark:text-blue-400" : "text-rose-600 dark:text-rose-400")}>
            ₹{(stats?.total_profit ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
            Margin: {stats?.house_edge_pct ?? 0}%
          </p>
        </Card>

        {/* Total Players */}
        <Card className="p-3 sm:p-4 rounded-xl shadow-xs">
          <div className="flex justify-between items-start mb-1 sm:mb-1.5">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Players
            </span>
            <span className="text-purple-500 dark:text-purple-400 text-sm sm:text-base">👥</span>
          </div>
          <div className="text-base sm:text-2xl font-black text-slate-900 dark:text-white truncate">
            {stats?.total_players ?? 0}
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
            {stats?.total_rounds ?? 0} rounds settled
          </p>
        </Card>

        {/* Active WebSocket Sessions */}
        <Card className="p-3 sm:p-4 rounded-xl shadow-xs col-span-2 sm:col-span-1">
          <div className="flex justify-between items-start mb-1 sm:mb-1.5">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Live Sockets
            </span>
            <span className="text-cyan-500 dark:text-cyan-400 text-sm sm:text-base">⚡</span>
          </div>
          <div className="text-base sm:text-2xl font-black text-cyan-600 dark:text-cyan-400 truncate">
            {stats?.active_connections ?? 0}
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
            {enabled ? "Online app users" : "Offline"}
          </p>
        </Card>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* ACTIVE ROUND RADAR & LIVE BETS BREAKDOWN */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {activeRound && (
        <Card className="p-4 sm:p-5 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="relative">
                <span className="w-3.5 h-3.5 rounded-full bg-amber-500 block animate-ping" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 absolute top-0.5 left-0.5" />
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Current Active Round #{activeRound.id}</span>
                  <Badge variant={secondsRemaining > 15 ? "warning" : "danger"} className="text-[10px] font-black uppercase">
                    {secondsRemaining > 15 ? `BETTING OPEN (${secondsRemaining}s)` : `SPINNING (${secondsRemaining}s)`}
                  </Badge>
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Pool: ₹{Number(activeRound.total_pool || activeRoundTotalBets).toFixed(2)} • {activeRound.bets_count || 0} Bets placed
                </p>
              </div>
            </div>

            {/* Countdown Progress Bar */}
            <div className="flex items-center gap-3 min-w-[200px]">
              <div className="flex-1 bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all duration-1000",
                    secondsRemaining > 20 ? "bg-amber-500" : secondsRemaining > 10 ? "bg-orange-500" : "bg-rose-500 animate-pulse"
                  )}
                  style={{ width: `${(secondsRemaining / 60) * 100}%` }}
                />
              </div>
              <span className="font-mono text-xs font-black text-slate-900 dark:text-white shrink-0">
                {secondsRemaining}s
              </span>
            </div>
          </div>

          {/* 10 Digits Live Exposure Distribution */}
          <div className="mt-3">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
              Active Round Wager Distribution by Number (0 – 9)
            </span>
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
                const amount = activeRoundBetsByNumber[num] || 0;
                const isOverridden = config.manual_override_number === num;
                return (
                  <div
                    key={num}
                    className={cn(
                      "p-2 rounded-xl border text-center transition-all",
                      isOverridden
                        ? "border-amber-500 bg-amber-500/20 ring-1 ring-amber-500/50"
                        : amount > 0
                        ? "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 opacity-60"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-flex items-center justify-center w-6 h-6 rounded-full font-black text-xs shadow-xs mx-auto mb-1",
                        NUMBER_COLORS[num]
                      )}
                    >
                      {num}
                    </span>
                    <span className="text-[10px] font-bold block text-slate-900 dark:text-white truncate">
                      ₹{amount}
                    </span>
                    {isOverridden && (
                      <span className="text-[8px] font-black uppercase text-amber-600 dark:text-amber-400 block">
                        ★ NEXT WIN
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* MAIN OPERATIONS CONTAINER & TABS */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      <Card className="p-3 sm:p-6 rounded-2xl shadow-sm">
        {/* Navigation Tabs Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 sm:pb-4 border-b border-slate-200 dark:border-slate-800 gap-3">
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-0.5">
            <button
              onClick={() => setActiveTab("rounds")}
              className={cn(
                "px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 shrink-0",
                activeTab === "rounds"
                  ? "bg-amber-500 text-neutral-950 shadow-md font-black"
                  : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400"
              )}
            >
              <PlayCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Live Rounds ({rounds.length})
            </button>

            <button
              onClick={() => setActiveTab("bets")}
              className={cn(
                "px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 shrink-0",
                activeTab === "bets"
                  ? "bg-amber-500 text-neutral-950 shadow-md font-black"
                  : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400"
              )}
            >
              <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Recent Bets ({bets.length})
            </button>

            <button
              onClick={() => setActiveTab("manual_control")}
              className={cn(
                "px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 shrink-0",
                activeTab === "manual_control"
                  ? "bg-amber-500 text-neutral-950 shadow-md font-black"
                  : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400"
              )}
            >
              <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Manual Override
            </button>

            <button
              onClick={() => setActiveTab("reference")}
              className={cn(
                "px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 shrink-0",
                activeTab === "reference"
                  ? "bg-amber-500 text-neutral-950 shadow-md font-black"
                  : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400"
              )}
            >
              <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Rules &amp; Matrix
            </button>
          </div>

          {/* Quick Search on Bets Tab */}
          {activeTab === "bets" && (
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search phone or round #..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-amber-500 w-full sm:w-60"
              />
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
                {(["all", "won", "lost"] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setBetOutcomeFilter(filter)}
                    className={cn(
                      "px-2 py-1 rounded-lg text-[10px] font-bold uppercase transition",
                      betOutcomeFilter === filter
                        ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    )}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════════════════════ */}
        {/* TAB 1: LIVE ROUNDS MONITORING */}
        {/* ══════════════════════════════════════════════════════════════════════════ */}
        {activeTab === "rounds" && (
          <div className="mt-3 sm:mt-4 space-y-3 sm:space-y-4">
            {rounds.length === 0 ? (
              <div className="py-12 text-center text-slate-500 dark:text-slate-400 text-xs sm:text-sm">
                No rounds data found.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs border-collapse min-w-[560px]">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 text-slate-600 dark:text-slate-400 font-semibold uppercase text-[10px] sm:text-[11px]">
                      <th className="py-3 px-3">Round ID</th>
                      <th className="py-3 px-3">Winning #</th>
                      <th className="py-3 px-3">Multiplier</th>
                      <th className="py-3 px-3">Total Bets</th>
                      <th className="py-3 px-3">Round Pool</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {rounds.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white">#{r.id}</td>
                        <td className="py-2.5 px-3">
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
                            <span className="text-amber-500 dark:text-amber-400 font-semibold text-[11px] animate-pulse">
                              Spinning...
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={cn("font-bold px-1.5 py-0.5 rounded text-[11px]", (r.multiplier || 1) > 1 ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 font-black border border-amber-500/30" : "text-slate-500 dark:text-slate-400")}>
                            {r.multiplier ? `${r.multiplier}x` : "1x"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-700 dark:text-slate-300">
                          {r.bets_count} bets
                        </td>
                        <td className="py-2.5 px-3 font-black text-amber-600 dark:text-amber-400">
                          ₹{Number(r.total_pool).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3">
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
                        <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 text-[11px] whitespace-nowrap">
                          {r.created_at ? new Date(r.created_at).toLocaleTimeString() : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════════ */}
        {/* TAB 2: RECENT BETS ACTIVITY */}
        {/* ══════════════════════════════════════════════════════════════════════════ */}
        {activeTab === "bets" && (
          <div className="mt-3 sm:mt-4">
            {filteredBets.length === 0 ? (
              <div className="py-12 text-center text-slate-500 dark:text-slate-400 text-xs sm:text-sm">
                No betting activity found matching search criteria.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs border-collapse min-w-[620px]">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 text-slate-600 dark:text-slate-400 font-semibold uppercase text-[10px] sm:text-[11px]">
                      <th className="py-3 px-3">Bet ID</th>
                      <th className="py-3 px-3">Player</th>
                      <th className="py-3 px-3">Round #</th>
                      <th className="py-3 px-3">Number Picked</th>
                      <th className="py-3 px-3">Bet Amount</th>
                      <th className="py-3 px-3">Outcome</th>
                      <th className="py-3 px-3">Payout</th>
                      <th className="py-3 px-3">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredBets.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-slate-500 dark:text-slate-400">#{b.id}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">
                          {b.phone || b.username || b.user}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-500 dark:text-slate-400">#{b.round_id}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={cn(
                              "inline-flex items-center justify-center w-7 h-7 rounded-full font-black text-xs shadow-sm",
                              NUMBER_COLORS[b.number] || "bg-neutral-700 text-white"
                            )}
                          >
                            {b.number}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                          ₹{Number(b.amount).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3">
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
                        <td className="py-2.5 px-3 font-black">
                          {b.payout > 0 ? (
                            <span className="text-emerald-600 dark:text-emerald-400">₹{Number(b.payout).toFixed(2)}</span>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500">₹0.00</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 text-[11px] whitespace-nowrap">
                          {b.time || (b.created_at ? new Date(b.created_at).toLocaleTimeString() : "—")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════════ */}
        {/* TAB 3: OPERATOR MANUAL OVERRIDE (NEXT ROUND LUCKY NUMBER) */}
        {/* ══════════════════════════════════════════════════════════════════════════ */}
        {activeTab === "manual_control" && (
          <div className="mt-3 sm:mt-5 space-y-5 max-w-3xl">
            <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-500" />
                Next Round Lucky Number Override
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Select a designated number 0–9 to guarantee the winner for the upcoming round. The algorithm will automatically revert to default profit-driven mode once this round is settled.
              </p>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                Choose Target Winning Number:
              </label>
              <div className="grid grid-cols-5 sm:grid-cols-11 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const next = { ...config, manual_override_number: null };
                    setConfig(next);
                    handleSaveConfig(next);
                  }}
                  className={cn(
                    "py-2.5 px-2 rounded-xl border text-xs font-bold transition-all",
                    config.manual_override_number === null
                      ? "bg-amber-500 text-neutral-950 border-amber-600 shadow-md font-black"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                  )}
                >
                  AUTO
                </button>
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
                  const isSelected = config.manual_override_number === num;
                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() => {
                        const next = { ...config, manual_override_number: num };
                        setConfig(next);
                        handleSaveConfig(next);
                      }}
                      className={cn(
                        "py-2 px-1 rounded-xl border font-black text-sm transition-all flex flex-col items-center justify-center gap-1",
                        isSelected
                          ? "ring-2 ring-amber-500 scale-105 shadow-md bg-amber-500/20 border-amber-500"
                          : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-amber-400"
                      )}
                    >
                      <span className={cn("w-6 h-6 rounded-full inline-flex items-center justify-center text-xs", NUMBER_COLORS[num])}>
                        {num}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Override Multiplier */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                Optional Override Multiplier:
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      const next = { ...config, manual_override_multiplier: m };
                      setConfig(next);
                      handleSaveConfig(next);
                    }}
                    className={cn(
                      "py-2.5 px-3 rounded-xl border text-xs font-bold transition-all",
                      config.manual_override_multiplier === m
                        ? "bg-amber-500 text-neutral-950 border-amber-600 font-black shadow-sm"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                    )}
                  >
                    {m}x Multiplier ({m * 9}x Payout)
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  Current Status:
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  {config.manual_override_number !== null
                    ? `Overriding Next Round to Number ${config.manual_override_number} (${config.manual_override_multiplier || 1}x)`
                    : "Automatic Profit-Driven Engine Active"}
                </span>
              </div>
              {config.manual_override_number !== null && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const next = { ...config, manual_override_number: null };
                    setConfig(next);
                    handleSaveConfig(next);
                  }}
                  className="text-xs font-bold text-rose-600"
                >
                  Cancel Override
                </Button>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════════ */}
        {/* TAB 4: RULES & MULTIPLIERS REFERENCE */}
        {/* ══════════════════════════════════════════════════════════════════════════ */}
        {activeTab === "reference" && (
          <div className="mt-3 sm:mt-5 space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Card className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850/60">
                <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mb-1.5 flex items-center gap-2">
                  <span className="text-amber-500 dark:text-amber-400 text-base">💰</span> Base Rate: 1 ka 9
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Players choose single numbers 0–9. When a number hits on a 1x round, the payout is 9x the wagered amount. If 2x or 3x triggers, payouts jump to 18x and 27x respectively!
                </p>
              </Card>

              <Card className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850/60">
                <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mb-1.5 flex items-center gap-2">
                  <span className="text-blue-500 dark:text-blue-400 text-base">⏱️</span> 60-Second Game Clock
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Every round lasts exactly 60 seconds. 0–45s is betting phase; at 15s remaining, bets lock and the wheel spins. At 0s, winners are credited immediately.
                </p>
              </Card>

              <Card className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850/60">
                <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mb-1.5 flex items-center gap-2">
                  <span className="text-emerald-500 dark:text-emerald-400 text-base">💳</span> DPSara Wallet Sync
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  RealSpinPro connects directly to the player&apos;s main DPSara wallet. Bets are debited via transaction ledger, and winnings are credited automatically.
                </p>
              </Card>
            </div>

            <Card className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850/60 space-y-3">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Payout Matrix by Multiplier
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[460px]">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold text-[11px]">
                      <th className="py-2 px-3">Bet Chip</th>
                      <th className="py-2 px-3">1x Multiplier (9x)</th>
                      <th className="py-2 px-3">2x Multiplier (18x)</th>
                      <th className="py-2 px-3">3x Multiplier (27x)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-bold">
                    <tr>
                      <td className="py-2.5 px-3 text-slate-900 dark:text-white">₹10 Chip</td>
                      <td className="py-2.5 px-3 text-emerald-600 dark:text-emerald-400">₹90.00</td>
                      <td className="py-2.5 px-3 text-blue-600 dark:text-blue-400">₹180.00</td>
                      <td className="py-2.5 px-3 text-purple-600 dark:text-purple-400">₹270.00</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-slate-900 dark:text-white">₹50 Chip</td>
                      <td className="py-2.5 px-3 text-emerald-600 dark:text-emerald-400">₹450.00</td>
                      <td className="py-2.5 px-3 text-blue-600 dark:text-blue-400">₹900.00</td>
                      <td className="py-2.5 px-3 text-purple-600 dark:text-purple-400">₹1,350.00</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-slate-900 dark:text-white">₹100 Chip</td>
                      <td className="py-2.5 px-3 text-emerald-600 dark:text-emerald-400">₹900.00</td>
                      <td className="py-2.5 px-3 text-blue-600 dark:text-blue-400">₹1,800.00</td>
                      <td className="py-2.5 px-3 text-purple-600 dark:text-purple-400">₹2,700.00</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-slate-900 dark:text-white">₹500 Chip</td>
                      <td className="py-2.5 px-3 text-emerald-600 dark:text-emerald-400">₹4,500.00</td>
                      <td className="py-2.5 px-3 text-blue-600 dark:text-blue-400">₹9,000.00</td>
                      <td className="py-2.5 px-3 text-purple-600 dark:text-purple-400">₹13,500.00</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-slate-900 dark:text-white">₹1000 Chip</td>
                      <td className="py-2.5 px-3 text-emerald-600 dark:text-emerald-400">₹9,000.00</td>
                      <td className="py-2.5 px-3 text-blue-600 dark:text-blue-400">₹18,000.00</td>
                      <td className="py-2.5 px-3 text-purple-600 dark:text-purple-400">₹27,000.00</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </Card>

      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* SETTINGS GEAR MODAL (Mobile Optimized Dialog) */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      <Modal
        open={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title={
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-amber-400" />
            <span>RealSpinPro Engine Settings</span>
          </div>
        }
        description="Configure profit margins, streak breakers, and multiplier distribution."
        size="lg"
      >
        <div className="space-y-6 pt-1">
          {/* Master Mobile Switch */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div>
              <span className="text-sm font-bold text-slate-900 dark:text-white block">
                Mobile Game Availability
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Displays the floating RealSpinPro game icon across the mobile app.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              onClick={() => handleToggle(!enabled)}
              disabled={savingToggle}
              className={cn(
                "relative inline-flex h-8 w-16 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                enabled ? "bg-amber-500 shadow-md shadow-amber-500/20" : "bg-slate-300 dark:bg-neutral-700"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out flex items-center justify-center text-[10px] font-black",
                  enabled ? "translate-x-8 text-amber-600" : "translate-x-0.5 text-slate-500 dark:text-neutral-400"
                )}
              >
                {enabled ? "ON" : "OFF"}
              </span>
            </button>
          </div>

          {/* Operating Mode Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Game Engine Algorithm Mode
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Profit Driven */}
              <div
                onClick={() => setConfig((prev) => ({ ...prev, mode: "profit_driven" }))}
                className={cn(
                  "p-4 rounded-xl border cursor-pointer transition-all",
                  config.mode === "profit_driven"
                    ? "border-amber-500 bg-amber-500/10 shadow-sm"
                    : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-600"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                    Profit Driven
                  </span>
                  <Badge variant="warning" className="text-[9px] font-bold">
                    RECOMMENDED
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  Balances house target margin while distributing payouts to active bettors to maximize retention.
                </p>
              </div>

              {/* Fair / Random */}
              <div
                onClick={() => setConfig((prev) => ({ ...prev, mode: "random" }))}
                className={cn(
                  "p-4 rounded-xl border cursor-pointer transition-all",
                  config.mode === "random"
                    ? "border-blue-500 bg-blue-500/10 shadow-sm"
                    : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-600"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                    Fair (Pure RNG)
                  </span>
                  <Badge variant="primary" className="text-[9px] font-bold">
                    UNBIASED
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  Draws outcomes purely at random without checking current round bet volume or house margins.
                </p>
              </div>
            </div>
          </div>

          {/* Target Profit Margin Slider (When Profit Driven) */}
          {config.mode === "profit_driven" && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                    Target Profit Margin (%)
                  </label>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Percentage of total round bets retained as house profit.
                  </p>
                </div>
                <span className="text-xl font-black text-amber-600 dark:text-amber-400">
                  {config.target_margin}%
                </span>
              </div>

              <input
                type="range"
                min="0"
                max="60"
                value={config.target_margin}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, target_margin: Number(e.target.value) }))
                }
                className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-lg"
              />

              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold self-center mr-1">Presets:</span>
                {[10, 15, 20, 25, 30, 40].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setConfig((prev) => ({ ...prev, target_margin: preset }))}
                    className={cn(
                      "px-2.5 py-0.5 rounded-md text-[11px] font-bold transition-all",
                      config.target_margin === preset
                        ? "bg-amber-500 text-neutral-950"
                        : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:text-white"
                    )}
                  >
                    {preset}% {preset === 20 ? "★" : ""}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Multipliers Probability Distribution */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
              Multiplier Probabilities (Relative Weights)
            </label>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {/* 1x */}
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-center">
                <span className="text-xs font-bold text-slate-900 dark:text-white block">1x (Base 9x)</span>
                <Badge variant="primary" className="text-[9px] font-bold my-1">
                  {getWeightPct(config.multipliers["1x"])}%
                </Badge>
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
                  className="w-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded px-2 py-1 text-xs text-slate-900 dark:text-white text-center font-bold"
                />
              </div>

              {/* 2x */}
              <div className="p-3 rounded-xl border border-blue-500/30 bg-blue-50/5 text-center">
                <span className="text-xs font-bold text-blue-700 dark:text-blue-300 block">2x (18x)</span>
                <Badge variant="primary" className="text-[9px] font-bold my-1">
                  {getWeightPct(config.multipliers["2x"])}%
                </Badge>
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
                  className="w-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded px-2 py-1 text-xs text-blue-700 dark:text-blue-300 text-center font-bold"
                />
              </div>

              {/* 3x */}
              <div className="p-3 rounded-xl border border-purple-500/30 bg-purple-50/5 text-center">
                <span className="text-xs font-bold text-purple-700 dark:text-purple-300 block">3x (27x)</span>
                <Badge variant="warning" className="text-[9px] font-bold my-1">
                  {getWeightPct(config.multipliers["3x"])}%
                </Badge>
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
                  className="w-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded px-2 py-1 text-xs text-purple-700 dark:text-purple-300 text-center font-bold"
                />
              </div>
            </div>
          </div>

          {/* Retention & Streak Protection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                  Outcome Win Rate (%)
                </label>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {config.min_win_rate_percent}%
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                Frequency of winning candidate outcomes when within target margins.
              </p>
              <input
                type="range"
                min="10"
                max="100"
                value={config.min_win_rate_percent}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, min_win_rate_percent: Number(e.target.value) }))
                }
                className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg"
              />
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                  Streak Breaker Assist
                </label>
                <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                  {config.max_losing_streak_trigger} Losses
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                Assists player by prioritizing their numbers after consecutive losses.
              </p>
              <div className="flex items-center gap-2 pt-0.5">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Trigger after:</span>
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
                  className="w-16 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded px-2 py-1 text-xs text-slate-900 dark:text-white text-center font-bold"
                />
                <span className="text-[11px] text-slate-500 dark:text-slate-400">losses</span>
              </div>
            </div>
          </div>

          {/* Modal Action Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800 gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetDefaults}
              disabled={savingConfig}
              className="text-xs gap-1 text-slate-600 dark:text-slate-400"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Defaults
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsSettingsOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleSaveConfig()}
                loading={savingConfig}
                className="bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold text-xs gap-1.5 shadow-md shadow-amber-500/20"
              >
                <Save className="w-3.5 h-3.5" /> Save Controls
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
