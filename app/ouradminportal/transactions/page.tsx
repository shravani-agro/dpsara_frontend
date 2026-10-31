"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Card,
  Badge,
  Spinner,
  ErrorMsg,
  PageHeader,
  Input,
  Select,
  Button,
  DataTable,
  Modal,
  EmptyState,
} from "@/components/ui";
import { listTransactions } from "@/lib/admin";
import { fmtMoney, fmtDateTime, fmtNum } from "@/lib/format";
import { parseApiError } from "@/lib/error-parser";

const TYPE_FILTERS = [
  { id: "all", label: "All Transactions", icon: "📋" },
  { id: "deposit", label: "Deposits", icon: "➕" },
  { id: "withdrawal", label: "Withdrawals", icon: "💸" },
  { id: "bet_debit", label: "Bets Placed", icon: "🎲" },
  { id: "win_credit", label: "Wins Won", icon: "🏆" },
  { id: "adjustment", label: "Adjustments / Bonuses", icon: "⚙️" },
];

const STATUS_FILTERS = [
  { id: "all", label: "All Status" },
  { id: "completed", label: "Completed" },
  { id: "pending", label: "Pending" },
  { id: "failed", label: "Failed" },
  { id: "cancelled", label: "Cancelled" },
];

function getTypeBadge(type: string) {
  switch (type) {
    case "deposit":
      return <Badge color="emerald">Deposit</Badge>;
    case "withdrawal":
      return <Badge color="amber">Withdrawal</Badge>;
    case "bet_debit":
      return <Badge color="slate">Bet Stake</Badge>;
    case "win_credit":
      return <Badge color="brand">Win Credit</Badge>;
    case "adjustment":
      return <Badge color="blue">Adjustment</Badge>;
    default:
      return <Badge color="slate">{type}</Badge>;
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case "completed":
      return <Badge color="emerald">Completed</Badge>;
    case "pending":
      return <Badge color="amber">Pending</Badge>;
    case "failed":
      return <Badge color="red">Failed</Badge>;
    case "cancelled":
      return <Badge color="slate">Cancelled</Badge>;
    default:
      return <Badge color="slate">{status}</Badge>;
  }
}

export default function TransactionsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedTxn, setSelectedTxn] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = { limit: 200 };
      if (type !== "all") params.type = type;
      if (status !== "all") params.status = status;
      if (search.trim()) params.search = search.trim();
      if (dateFrom) params.date_from = new Date(dateFrom).toISOString();
      if (dateTo) {
        const dt = new Date(dateTo);
        dt.setHours(23, 59, 59, 999);
        params.date_to = dt.toISOString();
      }

      const data = await listTransactions(params);
      setItems(data || []);
    } catch (e: any) {
      setError(parseApiError(e, "Failed to load transactions"));
    } finally {
      setLoading(false);
    }
  }, [type, status, search, dateFrom, dateTo]);

  useEffect(() => {
    load();
  }, [load]);

  const summary = useMemo(() => {
    let credits = 0;
    let debits = 0;
    let count = items.length;

    for (const t of items) {
      const amt = Number(t.amount || 0);
      if (["deposit", "win_credit"].includes(t.type)) {
        credits += amt;
      } else if (["withdrawal", "bet_debit"].includes(t.type)) {
        debits += amt;
      } else if (t.type === "adjustment") {
        if (t.description?.toLowerCase().includes("deduct")) {
          debits += amt;
        } else {
          credits += amt;
        }
      }
    }

    return { credits, debits, count, totalVolume: credits + debits };
  }, [items]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Wallet Transactions"
        description="Complete financial audit trail: inspect every debit, deposit, withdrawal, and stake adjustment"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => load()}>
              🔄 Refresh
            </Button>
          </div>
        }
      />

      <ErrorMsg msg={error} />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 sm:grid-cols-4">
        <Card bodyClassName="p-3 sm:p-4">
          <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-500 truncate block">
            Total Records
          </span>
          <div className="mt-1 text-lg sm:text-2xl font-bold text-slate-900 truncate">
            {fmtNum(summary.count)}
          </div>
          <span className="text-[11px] text-slate-400 hidden xs:inline">In current filter</span>
        </Card>

        <Card bodyClassName="p-3 sm:p-4">
          <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-emerald-600 truncate block">
            Total Credits (+)
          </span>
          <div className="mt-1 text-lg sm:text-2xl font-bold text-emerald-600 truncate">
            {fmtMoney(summary.credits)}
          </div>
          <span className="text-[11px] text-slate-400 hidden xs:inline">Deposits, wins</span>
        </Card>

        <Card bodyClassName="p-3 sm:p-4">
          <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-rose-600 truncate block">
            Total Debits (-)
          </span>
          <div className="mt-1 text-lg sm:text-2xl font-bold text-rose-600 truncate">
            {fmtMoney(summary.debits)}
          </div>
          <span className="text-[11px] text-slate-400 hidden xs:inline">Withdrawals, bets</span>
        </Card>

        <Card bodyClassName="p-3 sm:p-4">
          <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-brand-600 truncate block">
            Total Volume
          </span>
          <div className="mt-1 text-lg sm:text-2xl font-bold text-brand-600 truncate">
            {fmtMoney(summary.totalVolume)}
          </div>
          <span className="text-[11px] text-slate-400 hidden xs:inline">Combined movement</span>
        </Card>
      </div>

      {/* Filter Tabs by Transaction Type */}
      <div className="flex flex-wrap gap-2 overflow-x-auto no-scrollbar pb-1">
        {TYPE_FILTERS.map((f) => {
          const active = type === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setType(f.id)}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-all whitespace-nowrap shadow-sm border ${
                active
                  ? "bg-slate-900 text-white border-slate-900 shadow-md"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
              }`}
            >
              <span>{f.icon}</span>
              <span>{f.label}</span>
            </button>
          );
        })}
      </div>

      {/* Search and Date Filter Controls */}
      <Card bodyClassName="p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5 items-end">
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Search User, Phone, or Reference
            </label>
            <Input
              placeholder="Username, 10-digit mobile, or Txn ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Status
            </label>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUS_FILTERS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              From Date
            </label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              To Date
            </label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between pt-3 border-t border-slate-100">
          <div className="text-xs text-slate-500">
            Showing <span className="font-semibold text-slate-800">{items.length}</span> transactions
          </div>
          <div className="flex gap-2">
            {(search || status !== "all" || type !== "all" || dateFrom || dateTo) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setStatus("all");
                  setType("all");
                  setDateFrom("");
                  setDateTo("");
                }}
              >
                Clear Filters
              </Button>
            )}
            <Button size="sm" onClick={load}>
              Apply Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Main Transactions Table */}
      <Card title="Ledger Records" bodyClassName="p-0">
        {loading ? (
          <div className="p-8 text-center">
            <Spinner />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title="No transactions found"
            hint="Try adjusting your filters or search term to see records."
          />
        ) : (
          <DataTable
            getRowKey={(t) => t.id}
            rows={items}
            columns={[
              {
                key: "id",
                header: "Txn ID",
                className: "w-20 font-mono text-xs text-slate-500",
                render: (t) => `#${t.id}`,
              },
              {
                key: "user",
                header: "User Details",
                render: (t) => (
                  <div>
                    <div className="font-semibold text-slate-900 text-xs">
                      {t.full_name && t.full_name !== "—" ? t.full_name : t.username}
                    </div>
                    <div className="font-mono text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <span>📱 {t.phone || t.username}</span>
                      <span className="text-slate-300">|</span>
                      <span>ID #{t.user_id}</span>
                    </div>
                  </div>
                ),
              },
              {
                key: "type",
                header: "Type",
                render: (t) => getTypeBadge(t.type),
              },
              {
                key: "amount",
                header: "Amount",
                render: (t) => {
                  const amt = Number(t.amount || 0);
                  const isDebit =
                    ["withdrawal", "bet_debit"].includes(t.type) ||
                    (t.type === "adjustment" && t.description?.toLowerCase().includes("deduct"));
                  return (
                    <span
                      className={`font-mono text-xs font-bold ${
                        isDebit ? "text-rose-600" : "text-emerald-600"
                      }`}
                    >
                      {isDebit ? "-" : "+"}
                      {fmtMoney(amt)}
                    </span>
                  );
                },
              },
              {
                key: "balance_after",
                header: "Wallet After",
                render: (t) => (
                  <span className="font-mono text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {fmtMoney(t.balance_after)}
                  </span>
                ),
              },
              {
                key: "description",
                header: "Description / Reference",
                render: (t) => (
                  <div className="max-w-xs truncate text-xs text-slate-700" title={t.description}>
                    <p className="truncate font-medium">{t.description || "—"}</p>
                    {t.reference_id && (
                      <p className="font-mono text-[11px] text-slate-400 truncate">
                        Ref: {t.reference_id}
                      </p>
                    )}
                  </div>
                ),
              },
              {
                key: "status",
                header: "Status",
                render: (t) => getStatusBadge(t.status),
              },
              {
                key: "created_at",
                header: "Date & Time",
                render: (t) => (
                  <span className="text-xs text-slate-500 whitespace-nowrap">
                    {fmtDateTime(t.created_at)}
                  </span>
                ),
              },
              {
                key: "actions",
                header: "",
                className: "text-right w-16",
                render: (t) => (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedTxn(t)}
                    title="View details"
                  >
                    🔍
                  </Button>
                ),
              },
            ]}
          />
        )}
      </Card>

      {/* Transaction Detail Modal */}
      <Modal
        open={!!selectedTxn}
        onClose={() => setSelectedTxn(null)}
        title={`Transaction Details #${selectedTxn?.id}`}
      >
        {selectedTxn && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4 rounded-lg bg-slate-50 p-4 border border-slate-200">
              <div>
                <span className="text-slate-400 uppercase text-[10px] font-bold">Transaction Type</span>
                <div className="mt-1">{getTypeBadge(selectedTxn.type)}</div>
              </div>
              <div>
                <span className="text-slate-400 uppercase text-[10px] font-bold">Status</span>
                <div className="mt-1">{getStatusBadge(selectedTxn.status)}</div>
              </div>
              <div>
                <span className="text-slate-400 uppercase text-[10px] font-bold">Amount</span>
                <div className="mt-1 font-mono font-bold text-base text-slate-900">
                  {fmtMoney(selectedTxn.amount)}
                </div>
              </div>
              <div>
                <span className="text-slate-400 uppercase text-[10px] font-bold">Balance After</span>
                <div className="mt-1 font-mono font-bold text-base text-slate-900">
                  {fmtMoney(selectedTxn.balance_after)}
                </div>
              </div>
            </div>

            <div className="space-y-2 border-t border-slate-100 pt-3">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">User</span>
                <span className="font-semibold text-slate-800">
                  {selectedTxn.full_name || selectedTxn.username} (ID: #{selectedTxn.user_id})
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Mobile Number</span>
                <span className="font-mono font-semibold text-slate-800">
                  {selectedTxn.phone || selectedTxn.username}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Description</span>
                <span className="text-slate-800 max-w-[240px] text-right font-medium">
                  {selectedTxn.description || "—"}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Reference ID</span>
                <span className="font-mono text-slate-800 max-w-[240px] truncate">
                  {selectedTxn.reference_id || "None"}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Created At</span>
                <span className="font-mono text-slate-800">
                  {fmtDateTime(selectedTxn.created_at)}
                </span>
              </div>
            </div>

            <div className="pt-2 text-right">
              <Button size="sm" variant="outline" onClick={() => setSelectedTxn(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
