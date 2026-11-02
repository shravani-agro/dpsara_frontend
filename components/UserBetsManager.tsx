"use client";

import React, { useState, useMemo } from "react";
import { Badge, cn } from "@/components/ui";
import { fmtMoney, fmtNum, fmtDate, fmtDateTime, parseToDate } from "@/lib/format";
import { DateRangeFilter, DatePreset, computeDatesForPreset } from "@/components/DateRangeFilter";

interface BetItem {
  id: number;
  market_name?: string;
  session?: string;
  bet_type?: string;
  selected_number?: string | number;
  amount: number;
  potential_win?: number;
  win_amount?: number;
  status: "won" | "lost" | "pending" | string;
  placed_at?: string;
  created_at?: string;
}

interface UserBetsManagerProps {
  bids: BetItem[];
  loading?: boolean;
}

export function UserBetsManager({ bids, loading = false }: UserBetsManagerProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{ dateFrom: string; dateTo: string; preset: DatePreset }>({
    dateFrom: "",
    dateTo: "",
    preset: "all",
  });

  // Calculate overall statistics across all loaded bids
  const stats = useMemo(() => {
    let totalBetPoints = 0;
    let totalWonPoints = 0;
    let totalLostPoints = 0;
    let totalPendingPoints = 0;
    let wonCount = 0;
    let lostCount = 0;
    let pendingCount = 0;

    for (const b of bids) {
      const amt = Number(b.amount || 0);
      totalBetPoints += amt;
      const st = (b.status || "").toLowerCase();

      if (st === "won") {
        wonCount++;
        const win = Number(b.win_amount || b.potential_win || 0);
        totalWonPoints += win;
      } else if (st === "lost") {
        lostCount++;
        totalLostPoints += amt;
      } else {
        pendingCount++;
        totalPendingPoints += amt;
      }
    }

    const netPnL = totalWonPoints - totalBetPoints;

    return {
      totalCount: bids.length,
      totalBetPoints,
      wonCount,
      totalWonPoints,
      lostCount,
      totalLostPoints,
      pendingCount,
      totalPendingPoints,
      netPnL,
    };
  }, [bids]);

  // Filter bids based on search, status, and date range
  const filteredBids = useMemo(() => {
    return bids.filter((b) => {
      // 1. Status Filter
      if (statusFilter !== "all") {
        if ((b.status || "").toLowerCase() !== statusFilter) return false;
      }

      // 2. Search Filter (Market, Digit, Type, Session)
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const market = (b.market_name || "").toLowerCase();
        const digit = String(b.selected_number || "").toLowerCase();
        const type = (b.bet_type || "").toLowerCase();
        const session = (b.session || "").toLowerCase();
        const match =
          market.includes(q) || digit.includes(q) || type.includes(q) || session.includes(q);
        if (!match) return false;
      }

      // 3. Date Range Filter
      if (dateRange.dateFrom || dateRange.dateTo) {
        const rawDate = b.placed_at || b.created_at;
        const d = parseToDate(rawDate);
        if (!d) return false;
        const pad = (n: number) => String(n).padStart(2, "0");
        const ymd = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

        if (dateRange.dateFrom && ymd < dateRange.dateFrom) return false;
        if (dateRange.dateTo && ymd > dateRange.dateTo) return false;
      }

      return true;
    });
  }, [bids, search, statusFilter, dateRange]);

  const hasActiveFilters = search.trim() !== "" || statusFilter !== "all" || dateRange.preset !== "all";

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setDateRange({ dateFrom: "", dateTo: "", preset: "all" });
  };

  return (
    <div className="space-y-3.5">
      {/* 1. Mandatory Stats Breakdown (Mobile Responsive Grid) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* Total Placed */}
        <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Bets</span>
            <span className="rounded-full bg-slate-200 dark:bg-slate-700 px-1.5 py-0.2 text-[10px] font-bold text-slate-700 dark:text-slate-300">
              {stats.totalCount}
            </span>
          </div>
          <div className="mt-1 font-mono text-sm sm:text-base font-black text-slate-900 dark:text-slate-100">
            {fmtMoney(stats.totalBetPoints)}
          </div>
        </div>

        {/* Total Won */}
        <div className="p-2.5 sm:p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/50">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Total Won
            </span>
            <span className="rounded-full bg-emerald-200/80 dark:bg-emerald-800/80 px-1.5 py-0.2 text-[10px] font-bold text-emerald-800 dark:text-emerald-200">
              {stats.wonCount} won
            </span>
          </div>
          <div className="mt-1 font-mono text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400">
            {fmtMoney(stats.totalWonPoints)}
          </div>
        </div>

        {/* Total Lost */}
        <div className="p-2.5 sm:p-3 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-800/50">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
              Total Lost
            </span>
            <span className="rounded-full bg-rose-200/80 dark:bg-rose-800/80 px-1.5 py-0.2 text-[10px] font-bold text-rose-800 dark:text-rose-200">
              {stats.lostCount} lost
            </span>
          </div>
          <div className="mt-1 font-mono text-sm sm:text-base font-black text-rose-600 dark:text-rose-400">
            {fmtMoney(stats.totalLostPoints)}
          </div>
        </div>

        {/* Net Profit / Loss */}
        <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">User P&L</span>
            <span
              className={cn(
                "rounded-full px-1.5 py-0.2 text-[9px] font-black uppercase tracking-tight",
                stats.netPnL >= 0
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300"
                  : "bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300"
              )}
            >
              {stats.netPnL >= 0 ? "Profit" : "Loss"}
            </span>
          </div>
          <div
            className={cn(
              "mt-1 font-mono text-sm sm:text-base font-black truncate",
              stats.netPnL >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
            )}
          >
            {stats.netPnL >= 0 ? "+" : ""}
            {fmtMoney(stats.netPnL)}
          </div>
        </div>
      </div>

      {/* 2. Search & Filter Bar */}
      <div className="space-y-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Search Box */}
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
              🔍
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search market (e.g. KALYAN), digit, type…"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-1.5 pl-8 pr-8 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            )}
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar shrink-0">
            {[
              { id: "all", label: "All", count: stats.totalCount },
              { id: "won", label: "Won", count: stats.wonCount, color: "text-emerald-600" },
              { id: "lost", label: "Lost", count: stats.lostCount, color: "text-rose-600" },
              { id: "pending", label: "Pending", count: stats.pendingCount, color: "text-amber-600" },
            ].map((tab) => {
              const active = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all active:scale-95",
                    active
                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                  )}
                >
                  <span>{tab.label}</span>
                  <span className={cn("text-[10px] font-bold opacity-80", !active && tab.color)}>
                    ({tab.count})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Date Filter Bar */}
        <DateRangeFilter
          initialPreset={dateRange.preset}
          onFilterChange={(d) => setDateRange(d)}
          compact
        />

        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500">
            <span>
              Showing {filteredBids.length} of {bids.length} bets
            </span>
            <button
              type="button"
              onClick={clearFilters}
              className="text-rose-600 dark:text-rose-400 font-bold hover:underline"
            >
              Reset Filters ✕
            </button>
          </div>
        )}
      </div>

      {/* 3. Bets List / Cards (Optimized for Mobile Phone Screens) */}
      {filteredBids.length === 0 ? (
        <div className="p-8 text-center rounded-xl bg-slate-50/50 dark:bg-slate-850/50 border border-dashed border-slate-200 dark:border-slate-800">
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">No bets matching filters</p>
          <p className="mt-1 text-xs text-slate-400">
            {hasActiveFilters ? "Try clearing search or date filters above" : "No bets have been placed by this user"}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-300 transition"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredBids.map((b) => {
            const isWon = (b.status || "").toLowerCase() === "won";
            const isLost = (b.status || "").toLowerCase() === "lost";
            const winAmount = Number(b.win_amount || b.potential_win || 0);

            return (
              <div
                key={b.id}
                className={cn(
                  "p-3 rounded-xl border transition-all text-xs bg-white dark:bg-slate-900/80 shadow-xs",
                  isWon
                    ? "border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/20"
                    : isLost
                    ? "border-slate-200 dark:border-slate-800"
                    : "border-amber-200 dark:border-amber-800/60 bg-amber-50/15"
                )}
              >
                {/* Top Row: Market Name, Session, and Timestamp */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/60 pb-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-bold text-slate-900 dark:text-slate-100 truncate text-xs sm:text-sm">
                      {b.market_name || "Market"}
                    </span>
                    {b.session && (
                      <span className="shrink-0 px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[9px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
                        {b.session}
                      </span>
                    )}
                  </div>

                  <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                    {fmtDateTime(b.placed_at || b.created_at)}
                  </span>
                </div>

                {/* Middle Row: Digit Chosen & Bet Type */}
                <div className="flex items-center justify-between gap-2 pt-2">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-2.5 py-1 border border-amber-500/25">
                      <span className="text-[10px] font-bold uppercase text-amber-800 dark:text-amber-400">Digit</span>
                      <span className="font-mono font-black text-sm text-amber-900 dark:text-amber-300">
                        {b.selected_number}
                      </span>
                    </div>

                    <span className="text-slate-600 dark:text-slate-400 font-medium text-[11px]">
                      {b.bet_type}
                    </span>
                  </div>

                  {/* Bet Amount & Win Status */}
                  <div className="text-right">
                    <div className="font-mono text-xs font-extrabold text-slate-900 dark:text-slate-100">
                      Points: {fmtMoney(b.amount)}
                    </div>
                    {isWon && winAmount > 0 && (
                      <div className="font-mono text-[11px] font-black text-emerald-600 dark:text-emerald-400">
                        Won: +{fmtMoney(winAmount)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Row: Status Badge */}
                <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/40 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-mono text-[10px]">Bet #{b.id}</span>
                  <Badge
                    color={isWon ? "emerald" : isLost ? "red" : "amber"}
                    className="font-bold text-[10px] tracking-wide"
                  >
                    {isWon ? "WON 🎯" : isLost ? "LOST" : "PENDING ⏳"}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
