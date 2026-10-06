"use client";

import React, { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
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
import { listBids, listMarkets, cancelBet } from "@/lib/admin";
import type { Bid } from "@/lib/types";
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

  const handleCancel = async (id: number) => {
    if (!confirm("Are you sure you want to cancel this bet?")) return;
    try {
      await cancelBet(id);
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
          <div className="flex gap-2">
            <Select value={marketId} onChange={(e) => setMarketId(e.target.value)} className="w-40">
              <option value="">All markets</option>
              {markets.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </Select>
            <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-40">
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
                    <td>{b.bid_date ? format(new Date(b.bid_date), "dd/MM/yyyy") : "-"}</td>
                    <td className="text-slate-400">{(b as any).formatted_bet_type || b.bet_type}</td>
                    <td>{b.selected_number}</td>
                    <td>{Number(b.amount).toFixed(2)}</td>
                    <td>{Number(b.potential_win).toFixed(2)}</td>
                    <td>
                      <Badge color={statusColor[b.status] ?? "slate"}>{b.status}</Badge>
                    </td>
                    <td className="text-slate-400">
                      {format(new Date(b.placed_at), "dd/MM/yyyy hh:mm a")}
                    </td>
                    <td>
                      {b.status === "pending" && (
                         <Button variant="danger" size="sm" onClick={() => handleCancel(b.id)}>Cancel</Button>
                      )}
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
