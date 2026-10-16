"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Card,
  Badge,
  Spinner,
  ErrorMsg,
  PageHeader,
  Input,
  EmptyState,
} from "@/components/ui";
import { listDeposits, getDepositCounts, approveDeposit, rejectDeposit } from "@/lib/admin";
import type { DepositRequest } from "@/lib/types";
import { fmtMoney, fmtDateTime } from "@/lib/format";
import { toast } from "@/components/Toast";
import { parseApiError } from "@/lib/error-parser";

const STATUSES: { id: string; label: string; color: string }[] = [
  { id: "", label: "All", color: "slate" },
  { id: "pending", label: "Pending", color: "amber" },
  { id: "completed", label: "Completed", color: "emerald" },
  { id: "rejected", label: "Rejected", color: "red" },
];

const statusColor: Record<string, any> = {
  pending: "amber",
  completed: "emerald",
  rejected: "red",
};

const statusDot: Record<string, string> = {
  pending: "bg-amber-400",
  completed: "bg-emerald-400",
  rejected: "bg-red-400",
};

export default function DepositsPage() {
  const [items, setItems] = useState<DepositRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [counts, setCounts] = useState<any>({ pending: 0, completed: 0, rejected: 0, total: 0 });
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (status) params.status = status;
      if (dateFrom) params.date_from = new Date(dateFrom).toISOString();
      if (dateTo) {
        const dt = new Date(dateTo);
        dt.setHours(23, 59, 59, 999);
        params.date_to = dt.toISOString();
      }
      const [data, c] = await Promise.all([listDeposits(params), getDepositCounts()]);
      setItems(data);
      setCounts(c);
    } catch (e: any) {
      setError(parseApiError(e, "Failed to load deposits"));
    } finally {
      setLoading(false);
    }
  }, [status, dateFrom, dateTo]);

  useEffect(() => {
    load();
  }, [load]);

  const handleApprove = async (id: number) => {
    if (!confirm(`Are you sure you want to APPROVE deposit #${id}? This will credit the user's wallet.`)) return;
    try {
      const res = await approveDeposit(id);
      toast.success(res.message || `Deposit #${id} approved and wallet credited`);
      load();
    } catch (e: any) {
      toast.error(parseApiError(e, "Failed to approve deposit"));
    }
  };

  const handleReject = async (id: number) => {
    const reason = prompt("Enter reason for rejection (optional):", "Invalid payment reference / payment not received");
    if (reason === null) return;
    try {
      const res = await rejectDeposit(id, reason);
      toast.success(res.message || `Deposit #${id} rejected`);
      load();
    } catch (e: any) {
      toast.error(parseApiError(e, "Failed to reject deposit"));
    }
  };

  const totalAmount = items.reduce((sum, d) => sum + Number(d.amount || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Deposits"
        description="View all deposits, auto-confirmed via payment gateway or manually approve/reject pending requests"
        actions={
          <div className="flex flex-wrap gap-2 items-center">
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-36 h-9 text-xs" />
            <span className="text-slate-400">to</span>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-36 h-9 text-xs" />
          </div>
        }
      />
      <ErrorMsg msg={error} />

      <div className="flex flex-wrap gap-1.5 overflow-x-auto no-scrollbar">
        {STATUSES.map((s) => {
          const active = status === s.id;
          const count = s.id === "" ? counts.total : (counts[s.id] ?? 0);
          return (
            <button
              key={s.id || "all"}
              onClick={() => setStatus(s.id)}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all whitespace-nowrap ${
                active
                  ? "bg-brand-600 text-slate-900 shadow-glow"
                  : "border border-slate-200 bg-slate-50 text-slate-400 hover:border-slate-300 hover:text-slate-700"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-white/80" : statusDot[s.id] ?? "bg-slate-500"}`} />
              {s.label}
              <span className={`rounded-full px-1.5 text-[10px] font-bold ${active ? "bg-white/20 text-slate-900" : "bg-slate-200 text-slate-400"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <Card
        title={`${items.length} deposits`}
        subtitle={`Total: ${fmtMoney(totalAmount)}`}
        bodyClassName="p-0"
      >
        {loading ? (
          <div className="p-4"><Spinner /></div>
        ) : (
          <div>
            <div className="table-wrap hidden md:block">
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                    <th>Txn ID</th>
                    <th>User</th>
                    <th>Method</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((d) => (
                    <tr key={d.id} className="border-t border-slate-100 transition-colors hover:bg-slate-50">
                      <td className="py-3 font-medium text-slate-900">{d.txn_id}</td>
                      <td className="text-slate-400">#{d.user_id}</td>
                      <td className="text-slate-400">
                        <Badge color="slate">{d.method}</Badge>
                      </td>
                      <td className="font-semibold text-emerald-400">{fmtMoney(d.amount)}</td>
                      <td>
                        <Badge color={statusColor[d.status] ?? "slate"}>{d.status}</Badge>
                      </td>
                      <td className="text-slate-400">
                        {fmtDateTime(d.created_at)}
                      </td>
                      <td>
                        {d.status === "pending" ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleApprove(d.id)}
                              className="px-2 py-1 rounded text-xs font-bold bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white border border-emerald-200 transition"
                              title="Approve & Credit Wallet"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReject(d.id)}
                              className="px-2 py-1 rounded text-xs font-bold bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white border border-rose-200 transition"
                              title="Reject Deposit"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 capitalize">{d.status}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {items.length === 0 && <EmptyState title="No deposits found" hint="Try changing the status filter or date range" />}
            </div>
            <div className="space-y-2.5 p-2 md:hidden">
              {items.map((d) => (
                <div key={d.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-sm font-semibold text-slate-900">{d.txn_id}</p>
                      <p className="mt-0.5 text-xs text-slate-400">User #{d.user_id} · {d.method}</p>
                    </div>
                    <Badge color={statusColor[d.status] ?? "slate"}>{d.status}</Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      {fmtDateTime(d.created_at)}
                    </span>
                    <span className="text-lg font-bold text-emerald-400">{fmtMoney(d.amount)}</span>
                  </div>
                  {d.status === "pending" && (
                    <div className="mt-3 flex items-center gap-2 pt-2 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={() => handleApprove(d.id)}
                        className="flex-1 py-1.5 rounded text-xs font-bold bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white border border-emerald-200 transition text-center"
                      >
                        Approve & Credit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReject(d.id)}
                        className="flex-1 py-1.5 rounded text-xs font-bold bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white border border-rose-200 transition text-center"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {items.length === 0 && <EmptyState title="No deposits found" hint="Try changing the status filter or date range" />}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
