"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Card,
  Select,
  Badge,
  Spinner,
  ErrorMsg,
  PageHeader,
  Button,
  EmptyState,
  Modal,
} from "@/components/ui";
import { toast } from "@/components/Toast";
import { getRealSpinProBets, getRealSpinProStats } from "@/lib/admin";
import { fmtDate, fmtDateTime, fmtMoney } from "@/lib/format";
import { parseApiError } from "@/lib/error-parser";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { UserCell } from "@/components/UserCell";
import {
  Search,
  RefreshCw,
  Coins,
  TrendingUp,
  Award,
  Clock,
  Sparkles,
  Eye,
  Radio,
  Sliders,
  CheckCircle2,
  XCircle,
} from "lucide-react";

const NUMBER_COLORS: Record<number, { bg: string; text: string; border: string }> = {
  0: { bg: "bg-blue-600", text: "text-white", border: "border-blue-400" },
  1: { bg: "bg-amber-500", text: "text-white", border: "border-amber-300" },
  2: { bg: "bg-purple-600", text: "text-white", border: "border-purple-400" },
  3: { bg: "bg-pink-600", text: "text-white", border: "border-pink-400" },
  4: { bg: "bg-emerald-600", text: "text-white", border: "border-emerald-400" },
  5: { bg: "bg-red-600", text: "text-white", border: "border-red-400" },
  6: { bg: "bg-orange-500", text: "text-white", border: "border-orange-300" },
  7: { bg: "bg-cyan-600", text: "text-white", border: "border-cyan-400" },
  8: { bg: "bg-indigo-600", text: "text-white", border: "border-indigo-400" },
  9: { bg: "bg-violet-600", text: "text-white", border: "border-violet-400" },
};

interface RealSpinBetItem {
  id: string;
  user_id: number;
  user: string;
  username: string;
  phone?: string;
  round_id: number;
  number: number;
  amount: number;
  payout: number;
  won: boolean;
  winning_number?: number | null;
  multiplier: string;
  status: "won" | "lost" | "pending";
  time: string;
  created_at?: string;
}

export default function RealSpinProBidsHistoryPage() {
  const [items, setItems] = useState<RealSpinBetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [roundIdFilter, setRoundIdFilter] = useState("");
  const [numberFilter, setNumberFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [selectedBet, setSelectedBet] = useState<RealSpinBetItem | null>(null);

  // Stats from backend
  const [gameStats, setGameStats] = useState<{
    total_wagered: number;
    total_payout: number;
    total_profit: number;
    house_edge_pct: number;
  } | null>(null);

  const loadStats = useCallback(async () => {
    try {
      const res = await getRealSpinProStats();
      if (res) {
        setGameStats({
          total_wagered: res.total_wagered || 0,
          total_payout: res.total_payout || 0,
          total_profit: res.total_profit || 0,
          house_edge_pct: res.house_edge_pct || 0,
        });
      }
    } catch {
      // Ignored
    }
  }, []);

  const load = useCallback(async (isSilent: boolean = false) => {
    if (!isSilent) {
      setLoading(true);
      setError(null);
    }
    try {
      const params: any = { limit: 200 };
      if (status) params.status = status;
      if (roundIdFilter.trim()) params.round_id = Number(roundIdFilter.trim());
      if (numberFilter !== "") params.number = Number(numberFilter);
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (dateFrom) params.date_from = new Date(dateFrom).toISOString();
      if (dateTo) {
        const dt = new Date(dateTo);
        dt.setHours(23, 59, 59, 999);
        params.date_to = dt.toISOString();
      }
      const data = await getRealSpinProBets(params);
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      if (!isSilent) setError(parseApiError(e, "Failed to load RealSpinPro bets"));
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [status, roundIdFilter, numberFilter, searchQuery, dateFrom, dateTo]);

  useEffect(() => {
    loadStats();
    load();
  }, [load, loadStats]);

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      load(true);
      loadStats();
    }, 4000);
    return () => clearInterval(interval);
  }, [autoRefresh, load, loadStats]);

  // Aggregate local filtered stats
  const localStats = useMemo(() => {
    let stake = 0;
    let payout = 0;
    let won = 0;
    let lost = 0;
    let pending = 0;

    for (const b of items) {
      stake += b.amount || 0;
      payout += b.payout || 0;
      if (b.status === "won") won++;
      else if (b.status === "lost") lost++;
      else pending++;
    }

    const profit = stake - payout;
    const margin = stake > 0 ? (profit / stake) * 100 : 0;

    return {
      totalBets: items.length,
      stake,
      payout,
      profit,
      margin,
      won,
      lost,
      pending,
    };
  }, [items]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 pb-20">
      {/* Header */}
      <PageHeader
        title="RealSpinPro Bids History"
        description="Audit and monitor real-time bets across 60-second synchronized game rounds"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                autoRefresh
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  : "bg-slate-800 text-slate-400 border-slate-700"
              }`}
            >
              <Radio className={`w-3.5 h-3.5 ${autoRefresh ? "animate-pulse text-emerald-400" : ""}`} />
              {autoRefresh ? "Live Sync Active" : "Live Sync Off"}
            </button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                load();
                loadStats();
              }}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 bg-slate-900/60 border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Bets Loaded
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white mt-2">
            {localStats.totalBets.toLocaleString()}
          </div>
          <div className="text-xs text-slate-400 mt-1 flex gap-2">
            <span className="text-emerald-400 font-semibold">{localStats.won} won</span>
            <span>•</span>
            <span className="text-slate-400">{localStats.lost} lost</span>
          </div>
        </Card>

        <Card className="p-4 bg-slate-900/60 border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Wagered
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white mt-2">
            {fmtMoney(localStats.stake)}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            All-time: {fmtMoney(gameStats?.total_wagered || 0)}
          </div>
        </Card>

        <Card className="p-4 bg-slate-900/60 border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Won Payout
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-2">
            {fmtMoney(localStats.payout)}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            All-time: {fmtMoney(gameStats?.total_payout || 0)}
          </div>
        </Card>

        <Card className="p-4 bg-slate-900/60 border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              House Profit
            </span>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                localStats.profit >= 0
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-red-500/10 text-red-400"
              }`}
            >
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`text-2xl font-black mt-2 ${
              localStats.profit >= 0 ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {fmtMoney(localStats.profit)}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Margin:{" "}
            <span
              className={localStats.margin >= 0 ? "text-emerald-400" : "text-red-400"}
            >
              {localStats.margin.toFixed(1)}%
            </span>{" "}
            (Target: {gameStats?.house_edge_pct ?? 20}%)
          </div>
        </Card>
      </div>

      {/* Number Quick Selector Strip */}
      <Card className="p-3 bg-slate-900/60 border-slate-800">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Filter by Wheel Number:
            </span>
            <button
              onClick={() => setNumberFilter("")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                numberFilter === ""
                  ? "bg-purple-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              ALL
            </button>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {Array.from({ length: 10 }).map((_, n) => {
              const cfg = NUMBER_COLORS[n] || { bg: "bg-slate-700", text: "text-white", border: "border-slate-500" };
              const isSelected = numberFilter === String(n);
              return (
                <button
                  key={n}
                  onClick={() => setNumberFilter(isSelected ? "" : String(n))}
                  className={`w-8 h-8 rounded-lg font-black text-xs transition-all flex items-center justify-center shadow-sm ${
                    cfg.bg
                  } ${cfg.text} ${
                    isSelected
                      ? "ring-2 ring-white scale-110 shadow-lg"
                      : "opacity-75 hover:opacity-100"
                  }`}
                >
                  {n}
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Filter Bar */}
      <Card className="p-4 bg-slate-900/60 border-slate-800 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search player, phone, bet ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Round ID Filter */}
          <input
            type="text"
            placeholder="Filter by Round ID..."
            value={roundIdFilter}
            onChange={(e) => setRoundIdFilter(e.target.value)}
            className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
          />

          {/* Outcome Status Dropdown */}
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full"
          >
            <option value="">All Outcomes</option>
            <option value="won">WON (Payout Credit)</option>
            <option value="lost">LOST</option>
            <option value="pending">PENDING (Live Round)</option>
          </Select>

          {/* Date Range */}
          <DateRangeFilter
            dateFrom={dateFrom}
            dateTo={dateTo}
            onChange={(df, dt) => {
              setDateFrom(df);
              setDateTo(dt);
            }}
          />
        </div>

        {/* Active Filter Chips */}
        {(roundIdFilter || numberFilter !== "" || status || dateFrom || dateTo || searchQuery) && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800">
            <span className="text-xs text-slate-400">Active filters:</span>
            {numberFilter !== "" && (
              <Badge variant="outline" className="text-xs bg-slate-800 text-purple-300">
                Number: #{numberFilter}
                <button onClick={() => setNumberFilter("")} className="ml-1 text-slate-400 hover:text-white">
                  ×
                </button>
              </Badge>
            )}
            {roundIdFilter && (
              <Badge variant="outline" className="text-xs bg-slate-800 text-purple-300">
                Round: #{roundIdFilter}
                <button onClick={() => setRoundIdFilter("")} className="ml-1 text-slate-400 hover:text-white">
                  ×
                </button>
              </Badge>
            )}
            {status && (
              <Badge variant="outline" className="text-xs bg-slate-800 text-purple-300">
                Outcome: {status.toUpperCase()}
                <button onClick={() => setStatus("")} className="ml-1 text-slate-400 hover:text-white">
                  ×
                </button>
              </Badge>
            )}
            {searchQuery && (
              <Badge variant="outline" className="text-xs bg-slate-800 text-purple-300">
                Search: {searchQuery}
                <button onClick={() => setSearchQuery("")} className="ml-1 text-slate-400 hover:text-white">
                  ×
                </button>
              </Badge>
            )}
            {(dateFrom || dateTo) && (
              <Badge variant="outline" className="text-xs bg-slate-800 text-purple-300">
                Date: {dateFrom ? fmtDate(dateFrom) : "Start"} – {dateTo ? fmtDate(dateTo) : "Now"}
                <button
                  onClick={() => {
                    setDateFrom("");
                    setDateTo("");
                  }}
                  className="ml-1 text-slate-400 hover:text-white"
                >
                  ×
                </button>
              </Badge>
            )}
            <button
              onClick={() => {
                setRoundIdFilter("");
                setNumberFilter("");
                setStatus("");
                setSearchQuery("");
                setDateFrom("");
                setDateTo("");
              }}
              className="text-xs text-purple-400 hover:text-purple-300 underline ml-2"
            >
              Clear all
            </button>
          </div>
        )}
      </Card>

      {/* Main Content */}
      {error && <ErrorMsg error={error} onRetry={() => load()} />}

      {loading ? (
        <Card className="p-12 flex justify-center items-center bg-slate-900/40 border-slate-800">
          <Spinner />
        </Card>
      ) : items.length === 0 ? (
        <EmptyState
          title="No RealSpinPro Bets Found"
          description="No bets match your selected filters. Try widening your filters or check if rounds are currently active."
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setRoundIdFilter("");
                setNumberFilter("");
                setStatus("");
                setSearchQuery("");
                setDateFrom("");
                setDateTo("");
              }}
            >
              Reset Filters
            </Button>
          }
        />
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">#Bet ID</th>
                    <th className="py-3 px-4">Round</th>
                    <th className="py-3 px-4">Player</th>
                    <th className="py-3 px-4 text-center">Bidded Number</th>
                    <th className="py-3 px-4 text-center">Multiplier</th>
                    <th className="py-3 px-4 text-center">Winning Number</th>
                    <th className="py-3 px-4 text-right">Stake</th>
                    <th className="py-3 px-4 text-right">Payout</th>
                    <th className="py-3 px-4 text-center">Outcome</th>
                    <th className="py-3 px-4">Time</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {items.map((b) => {
                    const numCfg = NUMBER_COLORS[b.number] || {
                      bg: "bg-slate-700",
                      text: "text-white",
                      border: "border-slate-500",
                    };
                    const winCfg =
                      b.winning_number !== null && b.winning_number !== undefined
                        ? NUMBER_COLORS[b.winning_number]
                        : null;

                    return (
                      <tr
                        key={b.id}
                        className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                        onClick={() => setSelectedBet(b)}
                      >
                        <td className="py-3 px-4 font-mono font-medium text-slate-400 text-xs">
                          #{b.id}
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-purple-300 text-xs">
                          #{b.round_id}
                        </td>
                        <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                          <UserCell
                            userId={b.user_id}
                            username={b.username}
                            phone={b.phone}
                            avatarSize="sm"
                          />
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-black shadow-sm ${numCfg.bg} ${numCfg.text}`}
                          >
                            {b.number}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-md text-xs font-black ${
                              b.multiplier === "3x"
                                ? "bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30"
                                : b.multiplier === "2x"
                                ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                            }`}
                          >
                            {b.multiplier.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {winCfg ? (
                            <span
                              className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-black shadow-sm ${winCfg.bg} ${winCfg.text}`}
                            >
                              {b.winning_number}
                            </span>
                          ) : (
                            <span className="text-slate-500 text-xs font-mono">Spinning…</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-white">
                          {fmtMoney(b.amount)}
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-bold ${
                            b.won ? "text-emerald-400" : "text-slate-500"
                          }`}
                        >
                          {b.won ? fmtMoney(b.payout) : "₹0.00"}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge
                            variant={
                              b.status === "won"
                                ? "emerald"
                                : b.status === "lost"
                                ? "red"
                                : "amber"
                            }
                            className="capitalize text-xs font-bold px-2 py-0.5"
                          >
                            {b.status.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-xs whitespace-nowrap">
                          {b.time || (b.created_at ? fmtDateTime(b.created_at) : "—")}
                        </td>
                        <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setSelectedBet(b)}
                            title="View Bet Details"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View (Optimized for handheld mobile devices) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:hidden">
            {items.map((b) => {
              const numCfg = NUMBER_COLORS[b.number] || {
                bg: "bg-slate-700",
                text: "text-white",
                border: "border-slate-500",
              };

              return (
                <Card
                  key={b.id}
                  onClick={() => setSelectedBet(b)}
                  className="p-4 bg-slate-900/80 border-slate-800 space-y-3 cursor-pointer active:scale-[0.99] transition-transform"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-slate-400">#{b.id}</span>
                      <span className="font-mono text-xs font-bold text-purple-300">
                        Round #{b.round_id}
                      </span>
                    </div>
                    <Badge
                      variant={
                        b.status === "won"
                          ? "emerald"
                          : b.status === "lost"
                          ? "red"
                          : "amber"
                      }
                      className="capitalize text-xs font-bold"
                    >
                      {b.status.toUpperCase()}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between py-2 border-y border-slate-800/80">
                    <div onClick={(e) => e.stopPropagation()}>
                      <UserCell
                        userId={b.user_id}
                        username={b.username}
                        phone={b.phone}
                        avatarSize="sm"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">Number</span>
                        <span
                          className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-black shadow-sm ${numCfg.bg} ${numCfg.text}`}
                        >
                          {b.number}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">Mult</span>
                        <span className="inline-block px-1.5 py-0.5 rounded text-[11px] font-black bg-slate-800 text-purple-300">
                          {b.multiplier.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <span className="text-xs text-slate-400 block">Stake</span>
                      <span className="font-bold text-white">{fmtMoney(b.amount)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-400 block">Payout</span>
                      <span
                        className={`font-bold ${
                          b.won ? "text-emerald-400" : "text-slate-500"
                        }`}
                      >
                        {b.won ? fmtMoney(b.payout) : "₹0.00"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-xs text-slate-500 dark:text-slate-400">
                    <span>{b.time || (b.created_at ? fmtDateTime(b.created_at) : "—")}</span>
                    {b.winning_number !== null && b.winning_number !== undefined && (
                      <span className="text-xs text-slate-600 dark:text-slate-300">
                        Result: <strong className="text-slate-900 dark:text-white">#{b.winning_number}</strong>
                      </span>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Details Modal */}
      {selectedBet && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedBet(null)}
          title={`RealSpinPro Bet #${selectedBet.id}`}
        >
          <div className="space-y-4 text-sm">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 block">Player</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedBet.username}</span>
                {selectedBet.phone && (
                  <span className="text-xs text-slate-500 dark:text-slate-400 block">{selectedBet.phone}</span>
                )}
              </div>
              <Badge
                variant={
                  selectedBet.status === "won"
                    ? "emerald"
                    : selectedBet.status === "lost"
                    ? "red"
                    : "amber"
                }
                className="capitalize text-xs font-bold"
              >
                {selectedBet.status.toUpperCase()}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <span className="text-xs text-slate-500 dark:text-slate-400 block">Round ID</span>
                <span className="font-mono font-bold text-purple-600 dark:text-purple-300">
                  #{selectedBet.round_id}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <span className="text-xs text-slate-500 dark:text-slate-400 block">Multiplier</span>
                <span className="font-bold text-slate-900 dark:text-white uppercase">
                  {selectedBet.multiplier}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block">Bidded Number</span>
                  <span className="font-black text-slate-900 dark:text-white text-lg">
                    {selectedBet.number}
                  </span>
                </div>
                <span
                  className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm ${
                    NUMBER_COLORS[selectedBet.number]?.bg || "bg-slate-700"
                  } text-white`}
                >
                  {selectedBet.number}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block">Winning Number</span>
                  <span className="font-black text-slate-900 dark:text-white text-lg">
                    {selectedBet.winning_number !== null && selectedBet.winning_number !== undefined
                      ? selectedBet.winning_number
                      : "Pending"}
                  </span>
                </div>
                {selectedBet.winning_number !== null && selectedBet.winning_number !== undefined && (
                  <span
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm ${
                      NUMBER_COLORS[selectedBet.winning_number]?.bg || "bg-slate-700"
                    } text-white`}
                  >
                    {selectedBet.winning_number}
                  </span>
                )}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-purple-500/10 dark:bg-purple-950/20 border border-purple-500/20 dark:border-purple-900/30 flex justify-between items-center">
              <div>
                <span className="text-xs text-purple-700 dark:text-purple-300 block">Stake Wagered</span>
                <span className="font-black text-slate-900 dark:text-white text-lg">
                  {fmtMoney(selectedBet.amount)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs text-emerald-700 dark:text-emerald-300 block">Payout Received</span>
                <span
                  className={`font-black text-lg ${
                    selectedBet.won ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500"
                  }`}
                >
                  {selectedBet.won ? fmtMoney(selectedBet.payout) : "₹0.00"}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setSelectedBet(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
