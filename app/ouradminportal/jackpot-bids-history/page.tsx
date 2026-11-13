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
import {
  listJackpotBids,
  listJackpotMarkets,
  cancelJackpotBet,
  updateJackpotBidStatus,
} from "@/lib/admin";
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
  CheckCircle2,
  XCircle,
  Eye,
  RotateCcw,
  Sparkles,
} from "lucide-react";

const STATUSES = ["pending", "won", "lost", "cancelled"];
const statusColor: Record<string, "amber" | "emerald" | "red" | "slate"> = {
  pending: "amber",
  won: "emerald",
  lost: "red",
  cancelled: "slate",
};

interface JackpotBidItem {
  id: number;
  user_id: number;
  username: string;
  phone?: string;
  market_id: number;
  market_name: string;
  bet_type: string;
  selected_number: string;
  amount: number;
  potential_win: number;
  status: string;
  session?: string;
  bid_date?: string;
  placed_at?: string;
}

export default function JackpotBidsHistoryPage() {
  const [items, setItems] = useState<JackpotBidItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [marketId, setMarketId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [markets, setMarkets] = useState<any[]>([]);
  const [selectedBid, setSelectedBid] = useState<JackpotBidItem | null>(null);
  const [statusModalBid, setStatusModalBid] = useState<JackpotBidItem | null>(null);
  const [newStatusValue, setNewStatusValue] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const loadMarkets = useCallback(async () => {
    try {
      const data = await listJackpotMarkets({});
      setMarkets(Array.isArray(data) ? data : []);
    } catch {
      setMarkets([]);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (status) params.status = status;
      if (marketId) params.market_id = Number(marketId);
      if (dateFrom) params.date_from = new Date(dateFrom).toISOString();
      if (dateTo) {
        const dt = new Date(dateTo);
        dt.setHours(23, 59, 59, 999);
        params.date_to = dt.toISOString();
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      const data = await listJackpotBids(params);
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(parseApiError(e, "Failed to load jackpot bids"));
    } finally {
      setLoading(false);
    }
  }, [status, marketId, dateFrom, dateTo, searchQuery]);

  useEffect(() => {
    loadMarkets();
  }, [loadMarkets]);

  useEffect(() => {
    load();
  }, [load]);

  const handleStatusChange = async (id: number, newSt: string) => {
    if (!newSt) return;
    setActionLoading(true);
    try {
      const res = await updateJackpotBidStatus(id, newSt);
      toast.success(res.message || `Jackpot Bet #${id} updated to ${newSt.toUpperCase()}`);
      setStatusModalBid(null);
      load();
    } catch (e: any) {
      toast.error(parseApiError(e, "Failed to update jackpot bet status"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async (id: number) => {
    if (!confirm(`Are you sure you want to cancel Jackpot Bet #${id} and refund stake?`)) return;
    try {
      await cancelJackpotBet(id);
      toast.success(`Jackpot Bet #${id} cancelled and refunded to user wallet`);
      load();
    } catch (e: any) {
      toast.error(parseApiError(e, "Failed to cancel jackpot bet"));
    }
  };

  // Filter client-side search fallback if needed
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter((b) => {
      const u = (b.username || "").toLowerCase();
      const p = (b.phone || "").toLowerCase();
      const m = (b.market_name || "").toLowerCase();
      const n = (b.selected_number || "").toLowerCase();
      const idStr = String(b.id);
      return (
        u.includes(q) ||
        p.includes(q) ||
        m.includes(q) ||
        n.includes(q) ||
        idStr.includes(q)
      );
    });
  }, [items, searchQuery]);

  // Aggregate Stats
  const stats = useMemo(() => {
    let totalStake = 0;
    let totalWinPayout = 0;
    let wonCount = 0;
    let pendingCount = 0;
    let lostCount = 0;

    for (const b of filteredItems) {
      totalStake += b.amount || 0;
      if (b.status === "won") {
        wonCount++;
        totalWinPayout += b.potential_win || 0;
      } else if (b.status === "lost") {
        lostCount++;
      } else if (b.status === "pending") {
        pendingCount++;
      }
    }

    const netProfit = totalStake - totalWinPayout;
    const profitMargin = totalStake > 0 ? (netProfit / totalStake) * 100 : 0;

    return {
      totalBids: filteredItems.length,
      totalStake,
      totalWinPayout,
      netProfit,
      profitMargin,
      wonCount,
      pendingCount,
      lostCount,
    };
  }, [filteredItems]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 pb-20">
      {/* Header */}
      <PageHeader
        title="Jackpot Bids History"
        description="Audit, search and monitor all user bets across hourly Jackpot markets"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => load()}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 bg-slate-900/60 border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Bids
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white mt-2">
            {stats.totalBids.toLocaleString()}
          </div>
          <div className="text-xs text-slate-400 mt-1 flex gap-2">
            <span className="text-emerald-400 font-semibold">{stats.wonCount} won</span>
            <span>•</span>
            <span className="text-amber-400 font-semibold">{stats.pendingCount} pending</span>
          </div>
        </Card>

        <Card className="p-4 bg-slate-900/60 border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Stake
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white mt-2">
            {fmtMoney(stats.totalStake)}
          </div>
          <div className="text-xs text-slate-400 mt-1">Total wagered amount</div>
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
            {fmtMoney(stats.totalWinPayout)}
          </div>
          <div className="text-xs text-slate-400 mt-1">Paid to winners</div>
        </Card>

        <Card className="p-4 bg-slate-900/60 border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              House Profit
            </span>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                stats.netProfit >= 0
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-red-500/10 text-red-400"
              }`}
            >
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`text-2xl font-black mt-2 ${
              stats.netProfit >= 0 ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {fmtMoney(stats.netProfit)}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Margin:{" "}
            <span
              className={stats.profitMargin >= 0 ? "text-emerald-400" : "text-red-400"}
            >
              {stats.profitMargin.toFixed(1)}%
            </span>
          </div>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="p-4 bg-slate-900/60 border-slate-800 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search user, phone, number, ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Market Dropdown */}
          <Select
            value={marketId}
            onChange={(e) => setMarketId(e.target.value)}
            className="w-full"
          >
            <option value="">All Jackpot Markets</option>
            {markets.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>

          {/* Status Dropdown */}
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full"
          >
            <option value="">All Statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.toUpperCase()}
              </option>
            ))}
          </Select>

          {/* Date Range */}
          <DateRangeFilter
            onFilterChange={({ dateFrom: df, dateTo: dt }) => {
              setDateFrom(df);
              setDateTo(dt);
            }}
          />
        </div>

        {/* Active Filter Chips */}
        {(marketId || status || dateFrom || dateTo || searchQuery) && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800">
            <span className="text-xs text-slate-400">Active filters:</span>
            {marketId && (
              <Badge variant="outline" className="text-xs bg-slate-800 text-purple-300">
                Market: {markets.find((m) => String(m.id) === marketId)?.name || marketId}
                <button onClick={() => setMarketId("")} className="ml-1 text-slate-400 hover:text-white">
                  ×
                </button>
              </Badge>
            )}
            {status && (
              <Badge variant="outline" className="text-xs bg-slate-800 text-purple-300">
                Status: {status.toUpperCase()}
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
                setMarketId("");
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
      {error && <ErrorMsg error={error} onRetry={load} />}

      {loading ? (
        <Card className="p-12 flex justify-center items-center bg-slate-900/40 border-slate-800">
          <Spinner />
        </Card>
      ) : filteredItems.length === 0 ? (
        <EmptyState
          title="No Jackpot Bids Found"
          description="No bets match your selected filters. Try widening your search or date range."
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setMarketId("");
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
          {/* Desktop Table View (Hidden on mobile) */}
          <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">#ID</th>
                    <th className="py-3 px-4">Player</th>
                    <th className="py-3 px-4">Market</th>
                    <th className="py-3 px-4">Number</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4 text-right">Stake</th>
                    <th className="py-3 px-4 text-right">Potential Win</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4">Placed At</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredItems.map((b) => (
                    <tr
                      key={b.id}
                      className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                      onClick={() => setSelectedBid(b)}
                    >
                      <td className="py-3 px-4 font-mono font-medium text-slate-400 text-xs">
                        #{b.id}
                      </td>
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <UserCell
                          userId={b.user_id}
                          username={b.username}
                          phone={b.phone}
                          avatarSize="sm"
                        />
                      </td>
                      <td className="py-3 px-4 font-medium text-white">
                        {b.market_name}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-sm font-black bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          {b.selected_number}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 capitalize text-xs">
                        {b.bet_type?.replace(/_/g, " ") || "Single"}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-white">
                        {fmtMoney(b.amount)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-400">
                        {fmtMoney(b.potential_win)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge
                          variant={statusColor[b.status] || "slate"}
                          className="capitalize text-xs font-semibold px-2 py-0.5"
                        >
                          {b.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-xs whitespace-nowrap">
                        {b.placed_at ? fmtDateTime(b.placed_at) : "—"}
                      </td>
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedBid(b)}
                            title="View Details"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setStatusModalBid(b);
                              setNewStatusValue(b.status);
                            }}
                            title="Update Status"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-purple-300 hover:bg-purple-900/30 transition-colors"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                          {b.status === "pending" && (
                            <button
                              onClick={() => handleCancel(b.id)}
                              title="Cancel & Refund"
                              className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-900/30 transition-colors"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View (Optimized for small screens) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:hidden">
            {filteredItems.map((b) => (
              <Card
                key={b.id}
                onClick={() => setSelectedBid(b)}
                className="p-4 bg-slate-900/80 border-slate-800 space-y-3 cursor-pointer active:scale-[0.99] transition-transform"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-slate-400">#{b.id}</span>
                    <span className="font-bold text-white text-sm">{b.market_name}</span>
                  </div>
                  <Badge
                    variant={statusColor[b.status] || "slate"}
                    className="capitalize text-xs font-semibold"
                  >
                    {b.status}
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
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">Number</span>
                    <span className="inline-block px-2 py-0.5 rounded-md text-sm font-black bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      {b.selected_number}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div>
                    <span className="text-xs text-slate-400 block">Stake</span>
                    <span className="font-bold text-white">{fmtMoney(b.amount)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">Potential Win</span>
                    <span className="font-bold text-emerald-400">
                      {fmtMoney(b.potential_win)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 text-xs text-slate-400">
                  <span>{b.placed_at ? fmtDateTime(b.placed_at) : "—"}</span>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => {
                        setStatusModalBid(b);
                        setNewStatusValue(b.status);
                      }}
                      className="text-purple-400 hover:text-purple-300 font-semibold text-xs"
                    >
                      Status
                    </button>
                    {b.status === "pending" && (
                      <button
                        onClick={() => handleCancel(b.id)}
                        className="text-red-400 hover:text-red-300 font-semibold text-xs"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Details Modal */}
      {selectedBid && (
        <Modal
          open={true}
          onClose={() => setSelectedBid(null)}
          title={`Jackpot Bet #${selectedBid.id}`}
        >
          <div className="space-y-4 text-sm">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center">
              <div>
                <span className="text-xs text-slate-400 block">Player</span>
                <span className="font-bold text-white">{selectedBid.username}</span>
                {selectedBid.phone && (
                  <span className="text-xs text-slate-400 block">{selectedBid.phone}</span>
                )}
              </div>
              <Badge variant={statusColor[selectedBid.status] || "slate"} className="capitalize">
                {selectedBid.status}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-xs text-slate-400 block">Market</span>
                <span className="font-semibold text-white">{selectedBid.market_name}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-xs text-slate-400 block">Bet Type</span>
                <span className="font-semibold text-white capitalize">
                  {selectedBid.bet_type?.replace(/_/g, " ") || "Single"}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-xs text-slate-400 block">Bidded Number</span>
                <span className="font-black text-purple-300 text-lg">
                  {selectedBid.selected_number}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-xs text-slate-400 block">Placed At</span>
                <span className="font-semibold text-white">
                  {selectedBid.placed_at ? fmtDateTime(selectedBid.placed_at) : "—"}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-900/30 flex justify-between items-center">
              <div>
                <span className="text-xs text-purple-300 block">Stake Wagered</span>
                <span className="font-black text-white text-lg">
                  {fmtMoney(selectedBid.amount)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs text-emerald-300 block">Potential / Won</span>
                <span className="font-black text-emerald-400 text-lg">
                  {fmtMoney(selectedBid.potential_win)}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              {selectedBid.status === "pending" && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    handleCancel(selectedBid.id);
                    setSelectedBid(null);
                  }}
                >
                  Cancel & Refund
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setSelectedBid(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Status Update Modal */}
      {statusModalBid && (
        <Modal
          open={true}
          onClose={() => setStatusModalBid(null)}
          title={`Update Status: Bet #${statusModalBid.id}`}
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Select new outcome status for bet placed by{" "}
              <strong className="text-slate-900 dark:text-white">{statusModalBid.username}</strong> on number{" "}
              <strong className="text-purple-600 dark:text-purple-300">{statusModalBid.selected_number}</strong>:
            </p>

            <Select
              value={newStatusValue}
              onChange={(e) => setNewStatusValue(e.target.value)}
              className="w-full"
            >
              <option value="pending">Pending</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
              <option value="cancelled">Cancelled</option>
            </Select>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStatusModalBid(null)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => handleStatusChange(statusModalBid.id, newStatusValue)}
                disabled={actionLoading || newStatusValue === statusModalBid.status}
              >
                {actionLoading ? <Spinner /> : "Save Status"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
