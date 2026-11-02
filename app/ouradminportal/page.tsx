"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Card, Select, Spinner, ErrorMsg, StatCard, PageHeader } from "@/components/ui";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { UserCell } from "@/components/UserCell";
import { motion } from "framer-motion";
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

  async function load() {
    setLoading(true);
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
      setError(parseApiError(e, "Failed to load dashboard"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, dateFrom, dateTo]);

  if (loading && !stats) return <Spinner className="min-h-[60vh]" />;

  const cards = [
    { label: "Total Users", value: stats?.total_users, icon: "👥", accent: "sky" as const },
    { label: "Active (24h)", value: stats?.active_users_24h, icon: "⚡", accent: "emerald" as const },
    { label: "Bets Today", value: stats?.total_bets_today, icon: "🎯", accent: "violet" as const },
    { label: "Revenue", value: fmtMoney(stats?.total_revenue), icon: "💰", accent: "brand" as const },
    { label: "Deposits", value: fmtMoney(stats?.total_deposits), icon: "⬇", accent: "emerald" as const },
    { label: "Withdrawals", value: fmtMoney(stats?.total_withdrawals), icon: "⬆", accent: "amber" as const },
    { label: "Pending Withdrawals", value: stats?.pending_withdrawals, icon: "⏳", accent: "amber" as const },
    { label: "Net P/L", value: fmtMoney(stats?.net_pl), icon: "📊", accent: "violet" as const },
  ];

  return (
    <div className="space-y-5 sm:space-y-6 relative mesh-bg p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-ink-950/80 pointer-events-none rounded-2xl sm:rounded-3xl hidden dark:block" />
      <div className="relative z-10 space-y-5 sm:space-y-6">
        <PageHeader
        title="Dashboard"
        description="Real-time overview of your platform"
        actions={
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-slate-400 sm:inline">Revenue period</span>
            <Select value={period} onChange={(e) => setPeriod(e.target.value)} className="w-28 sm:w-32">
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </Select>
          </div>
        }
      />

      {/* Intelligent Date Range Filter */}
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
        </div>
        <DateRangeFilter
          onFilterChange={({ dateFrom: df, dateTo: dt }) => {
            setDateFrom(df);
            setDateTo(dt);
          }}
        />
      </div>

      <ErrorMsg msg={error} />


      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, staggerChildren: 0.1 }}
        className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3 xl:grid-cols-4"
      >
        {cards.map((c, i) => (
          <motion.div 
            key={c.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
          >
            <StatCard label={c.label} value={c.value ?? "—"} icon={c.icon} accent={c.accent} />
          </motion.div>
        ))}
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2"
      >
        <Card title="Deposits vs Withdrawals" subtitle={`Last 30 days, grouped by ${period}`}>
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
        </Card>

        <Card title="User Growth" subtitle="New users over last 30 days">
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
        </Card>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2"
      >
        <Card title="Top Bettors" subtitle="Highest net profit/loss (Click user for full details)">
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

        <Card title="Market Leaderboard" subtitle="Top markets by total stakes">
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
