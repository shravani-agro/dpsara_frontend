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
  cn,
} from "@/components/ui";
import { toast } from "@/components/Toast";
import { getWinGoBets, getWinGoStats } from "@/lib/admin";
import { parseApiError } from "@/lib/error-parser";
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
  BookOpen,
} from "lucide-react";

interface WinGoBetItem {
  id: number;
  user_id: number;
  username?: string;
  phone?: string;
  period: string;
  bet_type: "color" | "number" | "size";
  bet_value: string;
  amount: number;
  payout: number;
  status: "won" | "lost" | "pending";
  created_at: string;
}

export default function WinGoBidsHistoryPage() {
  const [items, setItems] = useState<WinGoBetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [periodFilter, setPeriodFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [selectedBet, setSelectedBet] = useState<WinGoBetItem | null>(null);

  // Global game stats
  const [gameStats, setGameStats] = useState<{
    total_wagered: number;
    total_payout: number;
    total_profit: number;
    house_edge_pct: number;
  } | null>(null);

  const loadStats = useCallback(async () => {
    try {
      const res = await getWinGoStats();
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

  const load = useCallback(
    async (isSilent: boolean = false) => {
      if (!isSilent) {
        setLoading(true);
        setError(null);
      }
      try {
        const data = await getWinGoBets(
          200,
          periodFilter.trim() || undefined,
          undefined,
          status || undefined
        );
        setItems(Array.isArray(data) ? data : []);
      } catch (e: any) {
        if (!isSilent) setError(parseApiError(e, "Failed to load Win Go bets"));
      } finally {
        if (!isSilent) setLoading(false);
      }
    },
    [status, periodFilter]
  );

  useEffect(() => {
    loadStats();
    load();
  }, [load, loadStats]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      load(true);
      loadStats();
    }, 4000);
    return () => clearInterval(interval);
  }, [autoRefresh, load, loadStats]);

  // Client-side filtering for search & bet type
  const filteredItems = useMemo(() => {
    return items.filter((b) => {
      if (typeFilter && b.bet_type !== typeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchesUser =
          String(b.user_id).includes(q) ||
          (b.username && b.username.toLowerCase().includes(q)) ||
          (b.phone && b.phone.includes(q));
        const matchesPeriod = b.period && b.period.toLowerCase().includes(q);
        const matchesVal = b.bet_value && b.bet_value.toLowerCase().includes(q);
        if (!matchesUser && !matchesPeriod && !matchesVal) return false;
      }
      return true;
    });
  }, [items, typeFilter, searchQuery]);

  // Aggregate local filtered stats
  const localStats = useMemo(() => {
    let stake = 0;
    let payout = 0;
    let won = 0;
    let lost = 0;
    let pending = 0;

    for (const b of filteredItems) {
      stake += Number(b.amount || 0);
      payout += Number(b.payout || 0);
      if (b.status === "won") won++;
      else if (b.status === "lost") lost++;
      else pending++;
    }

    const profit = stake - payout;
    const margin = stake > 0 ? (profit / stake) * 100 : 0;

    return {
      totalBets: filteredItems.length,
      stake,
      payout,
      profit,
      margin,
      won,
      lost,
      pending,
    };
  }, [filteredItems]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 pb-20">
      {/* Header */}
      <PageHeader
        title="Win Go Bids History"
        description="Comprehensive audit of all player color prediction bids across 30-second cycles"
      >
        <div className="flex items-center gap-2">
          <Button
            variant={autoRefresh ? "primary" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="text-xs gap-1.5"
          >
            <Radio className={cn("h-3.5 w-3.5", autoRefresh && "animate-pulse text-emerald-400")} />
            {autoRefresh ? "Auto-refresh: ON" : "Auto-refresh: OFF"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              load();
              loadStats();
            }}
            disabled={loading}
            className="text-xs gap-1.5"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin text-brand-500")} />
            Refresh
          </Button>
        </div>
      </PageHeader>

      {error && <ErrorMsg error={error} />}

      {/* Aggregate KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Card className="p-4 border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
            <span>Bids Placed</span>
            <Coins className="h-4 w-4 text-brand-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {localStats.totalBets.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {localStats.won} won · {localStats.lost} lost · {localStats.pending} pending
          </div>
        </Card>

        <Card className="p-4 border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
            <span>Total Stake</span>
            <TrendingUp className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            ₹{localStats.stake.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Player investment</div>
        </Card>

        <Card className="p-4 border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
            <span>Total Payout</span>
            <Award className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            ₹{localStats.payout.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Winnings paid out</div>
        </Card>

        <Card className="p-4 border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
            <span>Net House Profit</span>
            <Sparkles className="h-4 w-4 text-emerald-500" />
          </div>
          <div
            className={cn(
              "text-2xl font-black",
              localStats.profit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600"
            )}
          >
            {localStats.profit >= 0 ? "+" : ""}₹
            {localStats.profit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
            Margin: {localStats.margin.toFixed(1)}%
          </div>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <Card className="p-4 border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search user, mobile, period..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          {/* Period ID */}
          <div>
            <input
              type="text"
              placeholder="Filter by Period (e.g. 202611...)"
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 font-mono"
            />
          </div>

          {/* Bet Type */}
          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              <option value="">All Bet Types</option>
              <option value="color">Colors (Green / Violet / Red)</option>
              <option value="number">Numbers (0 to 9)</option>
              <option value="size">Size (Big / Small)</option>
            </select>
          </div>

          {/* Outcome Status */}
          <div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              <option value="">All Statuses</option>
              <option value="won">Won Only</option>
              <option value="lost">Lost Only</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Main Table */}
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
                <th className="px-4 py-3 text-right">Stake</th>
                <th className="px-4 py-3 text-right">Payout</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Placed At</th>
                <th className="px-4 py-3 text-center">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-slate-400">
                    <Spinner className="h-6 w-6 mx-auto mb-2 text-brand-500" />
                    Loading Win Go bids history...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-slate-400">
                    No Win Go bids found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredItems.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition">
                    <td className="px-4 py-3 font-mono text-slate-500">#{b.id}</td>
                    <td className="px-4 py-3 font-semibold">
                      <UserCell userId={b.user_id} username={b.username} phone={b.phone} />
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300">
                      {b.period}
                    </td>
                    <td className="px-4 py-3 uppercase text-[10px] font-bold text-slate-500">
                      {b.bet_type}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded text-[11px] font-black uppercase tracking-wider",
                          b.bet_value === "green" && "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20",
                          b.bet_value === "red" && "bg-rose-500/10 text-rose-500 border border-rose-500/20",
                          b.bet_value === "violet" && "bg-purple-500/10 text-purple-400 border border-purple-500/20",
                          b.bet_value === "big" && "bg-amber-500/10 text-amber-500 border border-amber-500/20",
                          b.bet_value === "small" && "bg-sky-500/10 text-sky-400 border border-sky-500/20",
                          !["green", "red", "violet", "big", "small"].includes(String(b.bet_value).toLowerCase()) &&
                            "bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                        )}
                      >
                        {b.bet_value}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-slate-100">
                      ₹{Number(b.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-emerald-600 dark:text-emerald-400">
                      {b.payout > 0
                        ? `₹${Number(b.payout).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={cn(
                          "inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase",
                          b.status === "won" && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
                          b.status === "lost" && "bg-rose-500/15 text-rose-600 dark:text-rose-400",
                          b.status === "pending" && "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                        )}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-400 font-mono text-[11px]">
                      {b.created_at ? new Date(b.created_at).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedBet(b)}
                        className="p-1 h-7 w-7 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Bet Details Modal */}
      {selectedBet && (
        <Modal
          open={Boolean(selectedBet)}
          onClose={() => setSelectedBet(null)}
          title={`Win Go Bet #${selectedBet.id} Details`}
        >
          <div className="space-y-4 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-850">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">User</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {selectedBet.username || `User #${selectedBet.user_id}`}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Period ID</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {selectedBet.period}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Bet Type</span>
                <span className="font-bold uppercase text-slate-800 dark:text-slate-200">
                  {selectedBet.bet_type}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Selection</span>
                <span className="font-bold uppercase text-slate-800 dark:text-slate-200">
                  {selectedBet.bet_value}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Stake Wagered</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  ₹{Number(selectedBet.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Payout</span>
                <span className="font-black text-emerald-600 dark:text-emerald-400">
                  ₹{Number(selectedBet.payout).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Outcome</span>
                <Badge
                  variant={
                    selectedBet.status === "won"
                      ? "emerald"
                      : selectedBet.status === "lost"
                      ? "rose"
                      : "outline"
                  }
                >
                  {selectedBet.status.toUpperCase()}
                </Badge>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Placed At</span>
                <span className="font-mono text-slate-500">
                  {selectedBet.created_at ? new Date(selectedBet.created_at).toLocaleString() : "—"}
                </span>
              </div>
            </div>

            <div className="flex justify-end">
              <Button size="sm" onClick={() => setSelectedBet(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
