"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Card,
  Select,
  Badge,
  Spinner,
  ErrorMsg,
  PageHeader,
  Button,
} from "@/components/ui";
import { toast } from "@/components/Toast";
import { listBids, listMarkets, cancelBet, updateBidStatus } from "@/lib/admin";
import type { Bid } from "@/lib/types";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { parseApiError } from "@/lib/error-parser";

const STATUSES = ["pending", "won", "lost", "cancelled"];
const statusColor: Record<string, any> = {
  pending: "amber",
  won: "green",
  lost: "red",
  cancelled: "slate",
};

export default function BidsPage() {
  const [items, setItems] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [marketId, setMarketId] = useState("");
  const [markets, setMarkets] = useState<any[]>([]);

  const loadMarkets = useCallback(async () => {
    try {
      const data = await listMarkets({});
      setMarkets(data.filter((m: any) => m.market_type === "regular"));
    } catch {
      setMarkets([]);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = { market_type: "regular" };
      if (status) params.status = status;
      if (marketId) params.market_id = Number(marketId);
      const data = await listBids(params);
      const processed = data.map((b: any) => {
        let type = b.bet_type;
        if (type === "half_sangam") {
          const parts = (b.selected_number || "").split("-");
          if (parts.length === 2) {
            if (parts[0].length === 3 && parts[1].length === 1) type = "half_sangam_a";
            else if (parts[0].length === 1 && parts[1].length === 3) type = "half_sangam_b";
          }
        }
        
        // Friendly formatting
        const formattedType = type
          .split("_")
          .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");

        return { ...b, formatted_bet_type: formattedType };
      });
      setItems(processed);
    } catch (e: any) {
      setError(parseApiError(e, "Failed to load bids"));
    } finally {
      setLoading(false);
    }
  }, [status, marketId]);

  const handleStatusChange = async (id: number, newStatus: string) => {
    if (!confirm(`Are you sure you want to mark Bet #${id} as ${newStatus.toUpperCase()}?`)) return;
    try {
      const res = await updateBidStatus(id, newStatus);
      toast.success(res.message || `Bet #${id} updated to ${newStatus.toUpperCase()}`);
      load();
    } catch (e: any) {
      toast.error(parseApiError(e, "Failed to update bet status"));
    }
  };

  const handleCancel = async (id: number) => {
    if (!confirm("Are you sure you want to cancel this bet?")) return;
    try {
      await cancelBet(id);
      toast.success(`Bet #${id} cancelled and refunded`);
      load(); // refresh
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Regular Bids History"
        description="View all individual placed bets for regular games"
        actions={
          <div className="grid grid-cols-2 sm:flex gap-2 w-full sm:w-auto">
            <Select value={marketId} onChange={(e) => setMarketId(e.target.value)} className="w-full sm:w-40 text-xs sm:text-sm">
              <option value="">All markets</option>
              {markets.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </Select>
            <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full sm:w-40 text-xs sm:text-sm">
              <option value="">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          </div>
        }
      />
      <ErrorMsg msg={error} />

      <Card title={`${items.length} bids`} bodyClassName="p-0">
        {loading ? (
          <div className="p-4"><Spinner /></div>
        ) : (
          <div className="table-wrap">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                  <th>ID</th>
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
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((b) => (
                  <tr key={b.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="py-3 text-slate-400">{b.id}</td>
                    <td className="font-medium text-slate-900">{b.username || b.user_id}</td>
                    <td>{b.market_name}</td>
                    <td>{b.session || "-"}</td>
                    <td>{b.bid_date ? fmtDate(b.bid_date) : "-"}</td>
                    <td className="text-slate-400">{(b as any).formatted_bet_type || b.bet_type}</td>
                    <td>{b.selected_number}</td>
                    <td>{Number(b.amount).toFixed(2)}</td>
                    <td>{Number(b.potential_win).toFixed(2)}</td>
                    <td>
                      <Badge color={statusColor[b.status] ?? "slate"}>{b.status}</Badge>
                    </td>
                    <td className="text-slate-400">
                      {fmtDateTime(b.placed_at)}
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5 whitespace-nowrap">
                        {b.status !== "won" && (
                          <button
                            type="button"
                            onClick={() => handleStatusChange(b.id, "won")}
                            className="px-2 py-1 rounded text-xs font-bold bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white border border-emerald-200 transition"
                            title="Mark as WON & credit winnings"
                          >
                            Won
                          </button>
                        )}
                        {b.status !== "lost" && (
                          <button
                            type="button"
                            onClick={() => handleStatusChange(b.id, "lost")}
                            className="px-2 py-1 rounded text-xs font-bold bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white border border-rose-200 transition"
                            title="Mark as LOST"
                          >
                            Lost
                          </button>
                        )}
                        {b.status !== "cancelled" && (
                          <button
                            type="button"
                            onClick={() => handleCancel(b.id)}
                            className="px-2 py-1 rounded text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-600 hover:text-white border border-slate-200 transition"
                            title="Cancel bet & refund stake"
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
        )}
      </Card>
    </div>
  );
}
