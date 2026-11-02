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
import { listStarlineBids, listStarlineMarkets, cancelStarlineBet, updateStarlineBidStatus } from "@/lib/admin";
import type { Bid } from "@/lib/types";
import { fmtDate, fmtDateTime, fmtMoney } from "@/lib/format";
import { parseApiError } from "@/lib/error-parser";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { UserCell } from "@/components/UserCell";

const STATUSES = ["pending", "won", "lost", "cancelled"];
const statusColor: Record<string, any> = {
  pending: "amber",
  won: "emerald",
  lost: "red",
  cancelled: "slate",
};

export default function StarlineBidsHistoryPage() {
  const [items, setItems] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [marketId, setMarketId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchUser, setSearchUser] = useState("");
  const [markets, setMarkets] = useState<any[]>([]);
  const [selectedBid, setSelectedBid] = useState<Bid | null>(null);

  const loadMarkets = useCallback(async () => {
    try {
      const data = await listStarlineMarkets({});
      setMarkets(data);
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
      setItems(await listStarlineBids(params));
    } catch (e: any) {
      setError(parseApiError(e, "Failed to load bids"));
    } finally {
      setLoading(false);
    }
  }, [status, marketId, dateFrom, dateTo]);

  const handleStatusChange = async (id: number, newStatus: string) => {
    if (!confirm(`Are you sure you want to mark Starline Bet #${id} as ${newStatus.toUpperCase()}?`)) return;
    try {
      const res = await updateStarlineBidStatus(id, newStatus);
      toast.success(res.message || `Starline Bet #${id} updated to ${newStatus.toUpperCase()}`);
      load();
    } catch (e: any) {
      toast.error(parseApiError(e, "Failed to update starline bet status"));
    }
  };

  const handleCancel = async (id: number) => {
    if (!confirm("Are you sure you want to cancel this bet and refund stake?")) return;
    try {
      await cancelStarlineBet(id);
      toast.success(`Starline Bet #${id} cancelled and refunded`);
      load();
    } catch (e: any) {
      toast.error(parseApiError(e, "Failed to cancel bet"));
    }
  };

  useEffect(() => {
    loadMarkets();
  }, [loadMarkets]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredItems = useMemo(() => {
    if (!searchUser.trim()) return items;
    const q = searchUser.trim().toLowerCase();
    return items.filter((b) => {
      const u = (b.username || "").toLowerCase();
      const phone = (b.phone || (b as any).mobile_number || "").toLowerCase();
      const idStr = String(b.user_id || "");
      return u.includes(q) || phone.includes(q) || idStr.includes(q);
    });
  }, [items, searchUser]);

  const totalStake = useMemo(() => {
    return filteredItems.reduce((acc, b) => acc + Number(b.amount || 0), 0);
  }, [filteredItems]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Starline Bids History"
        description="Audit all individual bets placed for Starline games. Click any user to inspect their live details."
        actions={
          <Button variant="outline" size="sm" onClick={() => load()}>
            🔄 Refresh
          </Button>
        }
      />

      <ErrorMsg msg={error} />

      {/* Date & Filter Card */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              📅 Date Filter
            </span>
            {(dateFrom || dateTo) && (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-700 dark:text-brand-300 font-semibold border border-brand-500/20">
                {dateFrom || "Start"} → {dateTo || "End"}
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Market</label>
            <Select value={marketId} onChange={(e) => setMarketId(e.target.value)} className="w-full text-xs mt-1">
              <option value="">All Markets</option>
              {markets.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </Select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Status</label>
            <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full text-xs mt-1">
              <option value="">All Statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s.toUpperCase()}</option>
              ))}
            </Select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Search User</label>
            <input
              type="text"
              placeholder="Search by Name, Username or Phone..."
              value={searchUser}
              onChange={(e) => setSearchUser(e.target.value)}
              className="mt-1 w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
        </div>
      </div>

      <Card
        title={
          <div className="flex items-center gap-2">
            <span>{filteredItems.length} Bids</span>
            <span className="text-xs font-normal text-slate-400">· Total Stake: {fmtMoney(totalStake)}</span>
          </div>
        }
        subtitle="Click any username or phone to open their live profile and WhatsApp drawer"
        bodyClassName="p-0"
      >
        {loading ? (
          <div className="p-8"><Spinner /></div>
        ) : filteredItems.length === 0 ? (
          <EmptyState title="No bids found" hint="Try adjusting the date range or market filter above" />
        ) : (
          <div>
            {/* Desktop Table */}
            <div className="hidden md:block table-wrap">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="py-3">Bet ID</th>
                    <th>User</th>
                    <th>Market</th>
                    <th>Session</th>
                    <th>Bid Date</th>
                    <th>Type</th>
                    <th>Number</th>
                    <th>Amount</th>
                    <th>Potential Win</th>
                    <th>Status</th>
                    <th>Placed</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((b) => (
                    <tr key={b.id} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 font-mono text-xs text-slate-400">#{b.id}</td>
                      <td>
                        <UserCell
                          userId={b.user_id}
                          username={b.username}
                          phone={b.phone || (b as any).mobile_number}
                        />
                      </td>
                      <td className="font-medium text-slate-900 dark:text-slate-100">{b.market_name}</td>
                      <td>{b.session || "-"}</td>
                      <td className="text-slate-500 text-xs">{b.bid_date ? fmtDate(b.bid_date) : "-"}</td>
                      <td className="text-slate-500 text-xs">{b.bet_type}</td>
                      <td className="font-mono font-bold text-slate-900 dark:text-slate-100">{b.selected_number}</td>
                      <td className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{fmtMoney(b.amount)}</td>
                      <td className="font-mono text-xs text-slate-600 dark:text-slate-300">{fmtMoney(b.potential_win)}</td>
                      <td>
                        <Badge color={statusColor[b.status] ?? "slate"}>{b.status}</Badge>
                      </td>
                      <td className="text-xs text-slate-400 whitespace-nowrap">
                        {fmtDateTime(b.placed_at || b.created_at)}
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                          {b.status !== "won" && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(b.id, "won")}
                              className="px-2 py-1 rounded text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white border border-emerald-500/30 transition active:scale-95"
                              title="Mark as WON"
                            >
                              Won
                            </button>
                          )}
                          {b.status !== "lost" && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(b.id, "lost")}
                              className="px-2 py-1 rounded text-xs font-bold bg-rose-500/10 text-rose-700 dark:text-rose-400 hover:bg-rose-600 hover:text-white border border-rose-500/30 transition active:scale-95"
                              title="Mark as LOST"
                            >
                              Lost
                            </button>
                          )}
                          {b.status !== "cancelled" && (
                            <button
                              type="button"
                              onClick={() => handleCancel(b.id)}
                              className="px-2 py-1 rounded text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-600 hover:text-white border border-slate-200 dark:border-slate-700 transition active:scale-95"
                              title="Cancel & Refund"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile High-Density Record Row View */}
            <div className="md:hidden">
              {/* Header Bar */}
              <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-850/90 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <span>Starline Bid & Event ({filteredItems.length})</span>
                <span>Digit · Stake · Status</span>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredItems.map((b) => (
                  <div
                    key={b.id}
                    onClick={() => setSelectedBid(b)}
                    className="flex items-center justify-between gap-2 px-3 py-2.5 transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-850/50 active:bg-slate-100 dark:active:bg-slate-800"
                  >
                    {/* Left: Market, Session & User */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                          {b.market_name}
                        </span>
                        {b.session && (
                          <span className="shrink-0 uppercase text-[9px] font-bold text-slate-500">
                            {b.session}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5 truncate">
                        <span className="font-medium text-slate-600 dark:text-slate-300 truncate max-w-[130px]">
                          {b.username || `User #${b.user_id}`}
                        </span>
                        <span>•</span>
                        <span>{fmtDateTime(b.placed_at || b.created_at)}</span>
                      </div>
                    </div>

                    {/* Right: Digit, Stake & Status Badge (Clean: Won/Lost/Cancel kept inside) */}
                    <div className="shrink-0 text-right space-y-1">
                      <div className="flex items-center justify-end gap-1.5">
                        <span
                          className="font-mono font-black text-xs px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/25"
                          title="Selected Digit"
                        >
                          {b.selected_number}
                        </span>
                        <span className="font-mono text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400">
                          {fmtMoney(b.amount)}
                        </span>
                      </div>

                      <div className="flex items-center justify-end gap-1">
                        <Badge color={statusColor[b.status] ?? "slate"} className="text-[9px] px-1.5 py-0.2 font-bold uppercase">
                          {b.status}
                        </Badge>
                        <span className="text-slate-400 text-xs ml-0.5">›</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Starline Bet Details & Actions Modal (Kept Safely Inside) */}
      <Modal
        open={!!selectedBid}
        onClose={() => setSelectedBid(null)}
        title={`Starline Bet #${selectedBid?.id || ""}`}
      >
        {selectedBid && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 dark:bg-slate-850 p-3.5 border border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Market & Time</span>
                <div className="mt-0.5 font-bold text-sm text-slate-900 dark:text-slate-100">{selectedBid.market_name}</div>
                <div className="text-[11px] text-slate-500 uppercase">{selectedBid.session || "—"}</div>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Status</span>
                <div className="mt-1">
                  <Badge color={statusColor[selectedBid.status] ?? "slate"}>
                    {selectedBid.status}
                  </Badge>
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Bet Type</span>
                <div className="mt-0.5 font-semibold text-slate-800 dark:text-slate-200">
                  {selectedBid.bet_type}
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Chosen Digit / Pana</span>
                <div className="mt-0.5 font-mono font-black text-base text-amber-600 dark:text-amber-400">
                  {selectedBid.selected_number}
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Stake Amount</span>
                <div className="mt-0.5 font-mono font-bold text-sm text-slate-900 dark:text-slate-100">
                  {fmtMoney(selectedBid.amount)}
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Potential Win</span>
                <div className="mt-0.5 font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                  {fmtMoney(selectedBid.potential_win)}
                </div>
              </div>
            </div>

            {/* User & Timestamp */}
            <div className="rounded-xl bg-slate-50 dark:bg-slate-850 p-3 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Placed By</div>
                <div className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                  {selectedBid.username || `User #${selectedBid.user_id}`}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase font-bold text-slate-400">Date & Time</div>
                <div className="text-slate-600 dark:text-slate-300 mt-0.5">
                  {fmtDateTime(selectedBid.placed_at || selectedBid.created_at)}
                </div>
              </div>
            </div>

            {/* Actions Inside Modal */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Update Bet Result / Action
              </span>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  size="sm"
                  variant="success"
                  disabled={selectedBid.status === "won"}
                  onClick={async () => {
                    await handleStatusChange(selectedBid.id, "won");
                    setSelectedBid(null);
                  }}
                  className="font-bold text-xs"
                >
                  ✓ Mark Won
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  disabled={selectedBid.status === "lost"}
                  onClick={async () => {
                    await handleStatusChange(selectedBid.id, "lost");
                    setSelectedBid(null);
                  }}
                  className="font-bold text-xs"
                >
                  ✗ Mark Lost
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={selectedBid.status === "cancelled"}
                  onClick={async () => {
                    await handleCancel(selectedBid.id);
                    setSelectedBid(null);
                  }}
                  className="font-bold text-xs"
                >
                  ⊘ Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
