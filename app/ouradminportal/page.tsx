"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { Card, Select, Spinner, ErrorMsg, StatCard, PageHeader, Badge, Button } from "@/components/ui";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { UserCell } from "@/components/UserCell";
import { motion, AnimatePresence } from "framer-motion";
import {
  getOverviewStats,
  getMarketSummaries,
  getTopBettors,
  getUserGrowth,
  getDepositWithdrawalReport,
} from "@/lib/admin";
import { fmtMoney, fmtNum } from "@/lib/format";
import { parseApiError } from "@/lib/error-parser";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  Legend,
} from "recharts";

const tooltipStyle = {
  background: "rgba(4, 6, 11, 0.8)",
  backdropFilter: "blur(12px)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "12px",
  fontSize: "12px",
  color: "#e2e8f0",
  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
} as const;

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [markets, setMarkets] = useState<any[]>([]);
  const [topBettors, setTopBettors] = useState<any[]>([]);
  const [growth, setGrowth] = useState<any[]>([]);
  const [depWit, setDepWit] = useState<any[]>([]);
  const [period, setPeriod] = useState("daily");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Live Auto-Refresh Heartbeat
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [countdown, setCountdown] = useState(30);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mounted, setMounted] = useState(false);

  const load = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setIsRefreshing(true);
    setError(null);
    try {
      const [s, m, t, g, dw] = await Promise.all([
        getOverviewStats(dateFrom || undefined, dateTo || undefined),
        getMarketSummaries(),
        getTopBettors(5),
        getUserGrowth(30),
        getDepositWithdrawalReport(period, 30),
      ]);
      setStats(s);
      setMarkets(m);
      setTopBettors(t);
      setGrowth(g);
      setDepWit(Array.isArray(dw) ? dw : []);
    } catch (e: any) {
      if (!isSilent) setError(parseApiError(e, "Failed to load dashboard"));
    } finally {
      setLoading(false);
      setIsRefreshing(false);
      setCountdown(30);
    }
  }, [dateFrom, dateTo, period]);

  useEffect(() => {
    setMounted(true);
    load();
  }, [load]);

  // 30-second live auto-polling countdown
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          load(true);
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, load]);

  const triggerCommandPalette = () => {
    window.dispatchEvent(new CustomEvent("open-command-palette"));
  };

  if (loading && !stats) return <Spinner className="min-h-[60vh]" />;

  // Financial Intelligence Calculations
  const totalRevenue = Number(stats?.total_revenue || 0);
  const totalPayouts = Number(stats?.total_withdrawals || 0);
  const totalDeposits = Number(stats?.total_deposits || 0);
  const netMarginPct = totalDeposits > 0
    ? (((totalDeposits - totalPayouts) / totalDeposits) * 100).toFixed(1)
    : "0.0";

  const cards = [
    { label: "Total Users", value: stats?.total_users, icon: "👥", accent: "sky" as const },
    { label: "Active (24h)", value: stats?.active_users_24h, icon: "⚡", accent: "emerald" as const },
    { label: "Bets Placed", value: stats?.total_bets_today, icon: "🎯", accent: "violet" as const },
    { label: "Platform Stakes", value: fmtMoney(stats?.total_revenue), icon: "💰", accent: "brand" as const },
    { label: "Total Deposits", value: fmtMoney(stats?.total_deposits), icon: "⬇", accent: "emerald" as const },
    { label: "Total Payouts", value: fmtMoney(stats?.total_withdrawals), icon: "⬆", accent: "amber" as const },
    { label: "Pending Withdrawals", value: stats?.pending_withdrawals, icon: "⏳", accent: "amber" as const },
    { label: "Net Platform P/L", value: fmtMoney(stats?.net_pl), icon: "📊", accent: "violet" as const },
  ];

  return (
    <div className="space-y-5 sm:space-y-6 relative mesh-bg p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-ink-950/80 pointer-events-none rounded-2xl sm:rounded-3xl hidden dark:block" />
      <div className="relative z-10 space-y-5 sm:space-y-6">

        {/* Top Header with Quick Omnisearch Trigger */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Operational Intelligence
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Real-time platform telemetry, risk exposure & analytics
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Command Palette Button */}
            <button
              type="button"
              onClick={triggerCommandPalette}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition shadow-2xs group"
              title="Open Command Palette (Ctrl+K)"
            >
              <span className="text-brand-500 text-sm">⚡</span>
              <span>Quick Command</span>
              <kbd className="hidden sm:inline-block font-mono text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-900 px-1.5 py-0.2 rounded border border-slate-200 dark:border-slate-750">
                Ctrl+K
              </kbd>
            </button>

            {/* Live Polling Heartbeat Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs">
              <span className="relative flex h-2 w-2">
                {autoRefresh && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                )}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${autoRefresh ? "bg-emerald-500" : "bg-slate-400"}`} />
              </span>
              <span className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300">
                {autoRefresh ? `${countdown}s` : "Paused"}
              </span>
              <button
                type="button"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className="text-[10px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                title={autoRefresh ? "Pause auto-polling" : "Resume auto-polling"}
              >
                {autoRefresh ? "⏸" : "▶"}
              </button>
              <button
                type="button"
                onClick={() => load(false)}
                disabled={isRefreshing}
                className={`text-[11px] text-slate-500 hover:text-brand-600 transition ${isRefreshing ? "animate-spin" : ""}`}
                title="Refresh live telemetry now"
              >
                🔄
              </button>
            </div>

            {/* Revenue Period Select */}
            <Select value={period} onChange={(e) => setPeriod(e.target.value)} className="w-24 sm:w-28 text-xs h-8">
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </Select>
          </div>
        </div>

        {/* Actionable Intelligence Alert Banner */}
        <AnimatePresence>
          {Number(stats?.pending_withdrawals || 0) > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 shadow-sm"
            >
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/20 text-base">
                  ⚠️
                </span>
                <div>
                  <p className="text-xs sm:text-sm font-bold">
                    Action Required: {stats.pending_withdrawals} Pending Withdrawal Request{stats.pending_withdrawals > 1 ? "s" : ""}
                  </p>
                  <p className="text-[11px] text-amber-700 dark:text-amber-300/80">
                    Users are awaiting payouts. Process payments to maintain instant settlement trust.
                  </p>
                </div>
              </div>

              <Link
                href="/ouradminportal/withdrawals"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition active:scale-95 shadow-xs"
              >
                <span>Review & Payout Now</span>
                <span>→</span>
              </Link>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Today Collection & Plus/Minus Live Highlight Banner */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-brand-500/10 via-emerald-500/10 to-transparent border border-brand-500/20 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center text-lg font-bold shadow-md shadow-brand-600/30">
              📊
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Today Collection & Plus/Minus
                </h3>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  LIVE
                </span>
              </div>
              <p className="text-xs text-slate-500">
                आजचा एकूण धंदा (Collection) आणि अंतिम प्लस/मायनस (Net P&L Settlement)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="px-3 py-1.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-right">
              <span className="text-[10px] text-slate-500 block uppercase font-bold">
                Total Collection
              </span>
              <span className="text-sm font-black text-slate-900 dark:text-white">
                {fmtMoney(stats?.total_revenue || 0)}
              </span>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-right">
              <span className="text-[10px] text-slate-500 block uppercase font-bold">
                Plus / Minus (P&L)
              </span>
              <span
                className={`text-sm font-black ${
                  Number(stats?.net_pl || 0) >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {Number(stats?.net_pl || 0) >= 0 ? "+" : ""}
                {fmtMoney(stats?.net_pl || 0)}
              </span>
            </div>

            <Link
              href="/ouradminportal/collection"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-md transition active:scale-95"
            >
              <span>View Settlement</span>
              <span>→</span>
            </Link>
          </div>
        </div>

        {/* Intelligent Date Range Filter Bar */}
        <div className="p-3 sm:p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 backdrop-blur-md shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                📊 Analytics Time Filter
              </span>
              {(dateFrom || dateTo) && (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-700 dark:text-brand-300 font-semibold border border-brand-500/20">
                  {dateFrom || "Start"} → {dateTo || "Today"}
                </span>
              )}
            </div>

            {/* Live Financial Margin Chip */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Retention Margin:</span>
              <span
                className={`font-mono font-bold px-2 py-0.5 rounded-full text-[11px] ${
                  Number(netMarginPct) >= 0
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                }`}
              >
                {netMarginPct}% Net Margin
              </span>
            </div>
          </div>
          <DateRangeFilter
            onFilterChange={({ dateFrom: df, dateTo: dt }) => {
              setDateFrom(df);
              setDateTo(dt);
            }}
          />
        </div>

        <ErrorMsg msg={error} />

        {/* 8 Primary Metric Cards */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, staggerChildren: 0.08 }}
          className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3 xl:grid-cols-4"
        >
          {cards.map((c, i) => (
            <motion.div 
              key={c.label}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: i * 0.04 }}
            >
              <StatCard label={c.label} value={c.value ?? "—"} icon={c.icon} accent={c.accent} />
            </motion.div>
          ))}
        </motion.div>

        {/* Visual Charts */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2"
        >
          <Card title="Deposits vs Withdrawals" subtitle={`Platform cashflow trends, grouped by ${period}`}>
            {mounted && (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={depWit}>
                <defs>
                  <linearGradient id="dep" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#065f46" />
                  </linearGradient>
                  <linearGradient id="wit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" />
                    <stop offset="100%" stopColor="#9f1239" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="period" stroke="#64748b" fontSize={12} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <Legend wrapperStyle={{ fontSize: 12, color: "#94a3b8" }} />
                <Bar dataKey="deposits" name="Deposits" fill="url(#dep)" radius={[6, 6, 0, 0]} maxBarSize={24} animationDuration={1500} />
                <Bar dataKey="withdrawals" name="Withdrawals" fill="url(#wit)" radius={[6, 6, 0, 0]} maxBarSize={24} animationDuration={1500} />
              </BarChart>
            </ResponsiveContainer>
            )}
          </Card>

          <Card title="User Acquisition Growth" subtitle="New platform registrations over last 30 days">
            {mounted && (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={growth}>
                <defs>
                  <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: "#10b981" }} />
                <Area type="monotone" dataKey="count" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#growthGrad)" animationDuration={1500} />
              </AreaChart>
            </ResponsiveContainer>
            )}
          </Card>
        </motion.div>

        {/* Intelligence Feeds: Top Bettors Risk Matrix & Market Leaderboard */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.45 }}
          className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2"
        >
          <Card title="High-Volume Bettors Radar" subtitle="Top players by turnover & exposure (Click user to inspect / chat)">
            {/* Desktop Table View */}
            <div className="hidden sm:block table-wrap">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="py-2.5 font-medium">User</th>
                    <th className="py-2.5 font-medium">Wagered</th>
                    <th className="py-2.5 font-medium">Won</th>
                    <th className="py-2.5 font-medium">Net P/L</th>
                  </tr>
                </thead>
                <tbody>
                  {topBettors.map((b) => (
                    <tr key={b.user_id} className="border-t border-slate-100 dark:border-slate-800 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3">
                        <UserCell userId={b.user_id} username={b.username} />
                      </td>
                      <td className="py-3 text-slate-600 dark:text-slate-300 font-mono text-xs">{fmtMoney(b.total_wagered)}</td>
                      <td className="py-3 text-slate-600 dark:text-slate-300 font-mono text-xs">{fmtMoney(b.total_won)}</td>
                      <td className={`py-3 font-mono font-bold text-xs ${b.net_pl >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                        {b.net_pl >= 0 ? "+" : ""}{fmtMoney(b.net_pl)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile High-Density Cards */}
            <div className="sm:hidden space-y-2">
              {topBettors.map((b) => (
                <div
                  key={b.user_id}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="min-w-0 flex-1">
                    <UserCell userId={b.user_id} username={b.username} />
                    <div className="mt-1 text-[11px] text-slate-400">
                      Wagered: <span className="font-mono text-slate-600 dark:text-slate-300">{fmtMoney(b.total_wagered)}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Net P/L</span>
                    <span className={`font-mono text-xs font-black ${b.net_pl >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                      {b.net_pl >= 0 ? "+" : ""}{fmtMoney(b.net_pl)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {topBettors.length === 0 && <p className="py-8 text-center text-sm text-slate-400">No betting activity yet</p>}
          </Card>

          <Card title="Market Leaderboard & Volume" subtitle="Turnover distribution across active games">
            <div className="space-y-3">
              {markets.slice(0, 8).map((m, i) => {
                const maxStakes = Math.max(...markets.slice(0, 8).map((x) => x.total_stakes), 1);
                const pct = (m.total_stakes / maxStakes) * 100;
                const rankColors = [
                  "from-amber-400 to-yellow-600 shadow-amber-500/40",
                  "from-slate-300 to-slate-500 shadow-slate-400/30",
                  "from-orange-400 to-amber-700 shadow-orange-500/40",
                  "from-white/15 to-white/5 shadow-white/10",
                ];
                return (
                  <div
                    key={m.market_id}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 p-3.5 transition-colors hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-sm font-bold text-ink-950 shadow-lg ${
                            rankColors[Math.min(i, 3)]
                          }`}
                        >
                          {i + 1}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{m.market_name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {fmtNum(m.total_bets)} bets · {fmtMoney(m.total_payouts)} paid out
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{fmtMoney(m.total_stakes)}</p>
                        <p className={`text-xs font-semibold ${m.net_pl >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                          {m.net_pl >= 0 ? "+" : ""}{fmtMoney(m.net_pl)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, delay: i * 0.06, ease: "easeOut" }}
                        className={`h-full rounded-full bg-gradient-to-r ${
                          m.net_pl >= 0 ? "from-emerald-500 to-emerald-400" : "from-red-500 to-red-400"
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
              {markets.length === 0 && <p className="py-8 text-center text-sm text-slate-400">No market data yet</p>}
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
