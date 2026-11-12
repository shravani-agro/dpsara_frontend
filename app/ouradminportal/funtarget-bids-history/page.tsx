"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Card, Badge, Spinner, ErrorMsg, PageHeader, Button, EmptyState } from "@/components/ui";
import { getFunTargetBets, getFunTargetStats } from "@/lib/admin";
import { fmtDateTime, fmtMoney } from "@/lib/format";
import { parseApiError } from "@/lib/error-parser";
import { UserCell } from "@/components/UserCell";
import { RefreshCw } from "lucide-react";

export default function FunTargetBidsHistoryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [bets, st] = await Promise.all([
        getFunTargetBets({ limit: 150, status: status || undefined, search: search || undefined }),
        getFunTargetStats(),
      ]);
      setItems(Array.isArray(bets) ? bets : []);
      setStats(st);
    } catch (e: any) {
      setError(parseApiError(e));
    } finally {
      setLoading(false);
    }
  }, [status, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Fun Target Bids History"
        description="Inspect all player bets, multipliers (10x / 20x Double Bonus), and settlement status."
        actions={
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="w-4 h-4 mr-1.5" />
            Refresh
          </Button>
        }
      />

      {error && <ErrorMsg message={error} />}

      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="text-xs text-slate-400">Total Wagered</div>
            <div className="text-lg font-bold">{fmtMoney(stats.total_wagered || 0)}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-slate-400">Total Payouts</div>
            <div className="text-lg font-bold">{fmtMoney(stats.total_payout || 0)}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-slate-400">House Profit</div>
            <div className="text-lg font-bold text-emerald-400">{fmtMoney(stats.total_profit || 0)}</div>
          </Card>
        </div>
      )}

      <Card className="p-4 flex flex-wrap gap-3 items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search player username / phone..."
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm flex-1 min-w-[200px]"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm"
        >
          <option value="">All Status</option>
          <option value="won">Won</option>
          <option value="lost">Lost</option>
          <option value="pending">Pending</option>
        </select>
      </Card>

      <Card className="p-4 overflow-x-auto">
        {loading ? (
          <div className="py-10 flex justify-center">
            <Spinner />
          </div>
        ) : items.length === 0 ? (
          <EmptyState title="No Fun Target bets yet" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400 border-b border-slate-800">
                <th className="py-2 pr-4">Player</th>
                <th className="py-2 pr-4">Round</th>
                <th className="py-2 pr-4">Picked</th>
                <th className="py-2 pr-4">Winner</th>
                <th className="py-2 pr-4">Amount</th>
                <th className="py-2 pr-4">Payout</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2">Time</th>
              </tr>
            </thead>
            <tbody>
              {items.map((b) => (
                <tr key={b.id} className="border-b border-slate-800/60">
                  <td className="py-2 pr-4">
                    <UserCell userId={b.user_id} username={b.username || b.full_name || `#${b.user_id}`} phone={b.phone} />
                  </td>
                  <td className="py-2 pr-4 font-mono">#{b.round_id}</td>
                  <td className="py-2 pr-4 font-bold">{b.number}</td>
                  <td className="py-2 pr-4">{b.winning_number ?? "-"}</td>
                  <td className="py-2 pr-4">{fmtMoney(b.amount || 0)}</td>
                  <td className="py-2 pr-4">{fmtMoney(b.payout || 0)}</td>
                  <td className="py-2 pr-4">
                    <Badge variant={b.won ? "success" : b.round_status === "settled" ? "danger" : "default"}>
                      {b.won ? `WON (${b.multiplier || 10}x)` : b.round_status === "settled" ? "LOST" : "PENDING"}
                    </Badge>
                  </td>
                  <td className="py-2 text-xs text-slate-400">{b.created_at ? fmtDateTime(b.created_at) : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

