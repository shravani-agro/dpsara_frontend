"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Card,
  Badge,
  Spinner,
  ErrorMsg,
  PageHeader,
  Button,
  EmptyState,
} from "@/components/ui";
import {
  listDeposits,
  getDepositCounts,
  approveDeposit,
  rejectDeposit,
  autoRejectExpiredDeposits,
} from "@/lib/admin";
import type { DepositRequest } from "@/lib/types";
import { fmtMoney, fmtDateTime } from "@/lib/format";
import { toast } from "@/components/Toast";
import { parseApiError } from "@/lib/error-parser";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { UserCell } from "@/components/UserCell";

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

const isDepositExpired = (iso: string) => {
  try {
    const t = new Date(iso).getTime();
    return !isNaN(t) && Date.now() - t > 30 * 60 * 1000;
  } catch {
    return false;
  }
};

export default function DepositsPage() {
  const [items, setItems] = useState<DepositRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [counts, setCounts] = useState<any>({ pending: 0, completed: 0, rejected: 0, total: 0 });
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [cleaning, setCleaning] = useState(false);

  const handleAutoRejectExpired = async () => {
    setCleaning(true);
    try {
      let rejectedCount = 0;
      try {
        const res = await autoRejectExpiredDeposits(30);
        rejectedCount = res.auto_rejected || 0;
      } catch {
        const pendingItems = await listDeposits({ status: "pending", limit: 100 });
        const expired = pendingItems.filter((d: any) => isDepositExpired(d.created_at));
        for (const item of expired) {
          try {
            await rejectDeposit(item.id, "Auto-rejected: pending deposit older than 30 minutes");
            rejectedCount++;
          } catch {
            // ignore
          }
        }
      }
      toast.success(`Auto-reject complete: ${rejectedCount} expired deposit(s) rejected`);
      load();
    } catch (e: any) {
      toast.error(parseApiError(e, "Failed to auto-reject expired deposits"));
    } finally {
      setCleaning(false);
    }
  };

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

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.trim().toLowerCase();
    return items.filter((d) => {
      const txn = (d.txn_id || "").toLowerCase();
      const u = ((d as any).username || "").toLowerCase();
      const phone = ((d as any).phone || (d as any).mobile_number || "").toLowerCase();
      const idStr = String(d.user_id || "");
      return txn.includes(q) || u.includes(q) || phone.includes(q) || idStr.includes(q);
    });
  }, [items, search]);

  const totalAmount = filteredItems.reduce((sum, d) => sum + Number(d.amount || 0), 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Deposits"
        description="View and verify deposits. Click any user to inspect their profile or chat on WhatsApp."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAutoRejectExpired}
              disabled={cleaning}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 border border-rose-200 dark:border-rose-800 transition disabled:opacity-50 active:scale-95 shadow-xs"
              title="Auto-reject pending deposits older than 30 minutes"
            >
              <span>{cleaning ? "⏳" : "⚡"}</span>
              <span className="hidden sm:inline">{cleaning ? "Checking..." : "Auto-Reject Expired"}</span>
              <span className="sm:hidden">Auto-Reject</span>
            </button>
            <Button variant="outline" size="sm" onClick={() => load()}>
              🔄 Refresh
            </Button>
          </div>
        }
      />

      <ErrorMsg msg={error} />

      {/* Date Filter & Search Controls */}
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

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Status Pills */}
          <div className="flex flex-wrap gap-1.5 overflow-x-auto no-scrollbar">
            {STATUSES.map((s) => {
              const active = status === s.id;
              const count = s.id === "" ? counts.total : counts[s.id] ?? 0;
              return (
                <button
                  key={s.id || "all"}
                  onClick={() => setStatus(s.id)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap active:scale-95 ${
                    active
                      ? "bg-brand-600 text-white shadow-sm ring-1 ring-brand-700/50"
                      : "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-white" : statusDot[s.id] ?? "bg-slate-500"}`} />
                  {s.label}
                  <span className={`rounded-full px-1.5 text-[10px] font-bold ${active ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-500"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick Search */}
          <div className="w-full sm:w-64">
            <input
              type="text"
              placeholder="Search Txn ID, User Name, or Phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
        </div>
      </div>

      <Card
        title={
          <div className="flex items-center gap-2">
            <span>{filteredItems.length} Deposits</span>
            <span className="text-xs font-normal text-slate-400">· Total: {fmtMoney(totalAmount)}</span>
          </div>
        }
        subtitle="Click on any user name or number to inspect their full profile"
        bodyClassName="p-0"
      >
        {loading ? (
          <div className="p-8"><Spinner /></div>
        ) : filteredItems.length === 0 ? (
          <EmptyState title="No deposits found" hint="Try changing the status filter or date range" />
        ) : (
          <div>
            {/* Desktop Table View */}
            <div className="table-wrap hidden md:block">
              <table className="w-full min-w-[850px] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="py-3">Txn ID</th>
                    <th>User</th>
                    <th>Method</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Created At</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((d) => (
                    <tr key={d.id} className="border-t border-slate-100 dark:border-slate-800 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 font-mono font-medium text-slate-900 dark:text-slate-100 text-xs">
                        {d.txn_id}
                      </td>
                      <td>
                        <UserCell
                          userId={d.user_id}
                          username={(d as any).username}
                          phone={(d as any).phone || (d as any).mobile_number}
                        />
                      </td>
                      <td>
                        <Badge color="slate">{d.method}</Badge>
                      </td>
                      <td className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {fmtMoney(d.amount)}
                      </td>
                      <td>
                        <Badge color={statusColor[d.status] ?? "slate"}>{d.status}</Badge>
                      </td>
                      <td className="text-slate-400 text-xs whitespace-nowrap">
                        {fmtDateTime(d.created_at)}
                      </td>
                      <td className="text-right">
                        {d.status === "pending" ? (
                          isDepositExpired(d.created_at) ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <span className="px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/50 rounded border border-amber-300 dark:border-amber-800">
                                Expired
                              </span>
                              <button
                                type="button"
                                onClick={() => handleReject(d.id)}
                                className="px-2 py-1 rounded text-xs font-bold bg-rose-500/10 text-rose-700 dark:text-rose-400 hover:bg-rose-600 hover:text-white border border-rose-500/30 transition active:scale-95"
                                title="Auto-Reject Expired Deposit"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleApprove(d.id)}
                                className="px-2.5 py-1 rounded text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white border border-emerald-500/30 transition active:scale-95"
                                title="Approve & Credit Wallet"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReject(d.id)}
                                className="px-2.5 py-1 rounded text-xs font-bold bg-rose-500/10 text-rose-700 dark:text-rose-400 hover:bg-rose-600 hover:text-white border border-rose-500/30 transition active:scale-95"
                                title="Reject Deposit"
                              >
                                Reject
                              </button>
                            </div>
                          )
                        ) : (
                          <span className="text-xs text-slate-400 capitalize">{d.status}</span>
                        )}
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
                <span>Deposit & User ({filteredItems.length})</span>
                <span>Amount & Actions</span>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredItems.map((d) => {
                  const isPending = d.status === "pending";
                  const expired = isPending && isDepositExpired(d.created_at);
                  const username = (d as any).username || `User #${d.user_id}`;
                  const userPhone = (d as any).phone || (d as any).mobile_number;

                  return (
                    <div
                      key={d.id}
                      className="flex items-center justify-between gap-2 px-3 py-2.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-850/50"
                    >
                      {/* Left: User & Txn Details */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate">
                            {username}
                          </span>
                          {d.method && (
                            <span className="shrink-0 rounded bg-slate-100 dark:bg-slate-800 px-1 py-0.2 text-[9px] font-bold uppercase text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                              {d.method}
                            </span>
                          )}
                          {userPhone && (
                            <WhatsAppLink
                              phone={userPhone}
                              userName={username}
                              variant="inline"
                            />
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                          <span className="font-mono text-slate-500 dark:text-slate-400 truncate max-w-[150px]" title={d.txn_id}>
                            #{d.txn_id}
                          </span>
                          <span>•</span>
                          <span>{fmtDateTime(d.created_at)}</span>
                        </div>
                      </div>

                      {/* Right: Amount & Status & Inline Actions */}
                      <div className="shrink-0 text-right space-y-1">
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="font-mono text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400">
                            +{fmtMoney(d.amount)}
                          </span>
                          <Badge color={statusColor[d.status] ?? "slate"} className="text-[9px] px-1.5 py-0.2 font-bold uppercase">
                            {d.status}
                          </Badge>
                        </div>

                        {isPending && (
                          <div className="flex items-center justify-end gap-1">
                            {expired ? (
                              <>
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                                  Expired
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleReject(d.id)}
                                  className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 active:scale-95"
                                >
                                  Reject
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleApprove(d.id)}
                                  className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-2xs active:scale-95"
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleReject(d.id)}
                                  className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 active:scale-95"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
