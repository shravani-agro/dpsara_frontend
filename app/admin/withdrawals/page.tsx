"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  Button,
  Badge,
  Spinner,
  ErrorMsg,
  PageHeader,
  Modal,
  Input,
  SlideOver,
  EmptyState,
} from "@/components/ui";
import {
  listWithdrawals,
  processWithdrawal,
  bulkApproveWithdrawals,
  getWithdrawalCounts,
} from "@/lib/admin";
import { fmtMoney, fmtDateTime } from "@/lib/format";
import { toast } from "@/components/Toast";
import { parseApiError } from "@/lib/error-parser";

const STATUSES: { id: string; label: string; color: string }[] = [
  { id: "", label: "All", color: "slate" },
  { id: "pending", label: "Pending", color: "amber" },
  { id: "processed", label: "Done (Paid)", color: "sky" },
  { id: "rejected", label: "Rejected", color: "red" },
];

const statusColor: Record<string, any> = {
  approved: "emerald",
  rejected: "red",
  processed: "sky",
  pending: "amber",
};

const statusDot: Record<string, string> = {
  pending: "bg-amber-400",
  approved: "bg-emerald-400",
  processed: "bg-sky-400",
  rejected: "bg-red-400",
};

function getPaymentInfo(raw: any) {
  let data: Record<string, any> = {};
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === "string") {
        try {
          data = JSON.parse(parsed);
        } catch {
          data = { "Payment Details": parsed };
        }
      } else if (parsed && typeof parsed === "object") {
        data = { ...parsed };
      }
    } catch {
      data = { "Payment Details": raw };
    }
  } else if (raw && typeof raw === "object") {
    data = { ...raw };
  }

  const upiId = String(data.upi_id || data.upi || data.vpa || data.upiId || "").trim();
  const accountHolder = String(data.account_holder || data.holder_name || data.acc_holder || data.name || "").trim();
  const accountNumber = String(data.account_number || data.acc_number || data.acc_no || data.accountNo || "").trim();
  const ifsc = String(data.ifsc || data.ifsc_code || data.ifscCode || "").trim();
  const bankName = String(data.bank_name || data.bankName || "").trim();

  const standardKeys = new Set([
    "upi_id", "upi", "vpa", "upiId",
    "account_holder", "holder_name", "acc_holder", "name",
    "account_number", "acc_number", "acc_no", "accountNo",
    "ifsc", "ifsc_code", "ifscCode",
    "bank_name", "bankName",
    "fee_percent", "fee_amount", "net_amount",
  ]);

  const extraFields: Array<{ label: string; value: string }> = [];
  for (const [k, v] of Object.entries(data)) {
    if (!standardKeys.has(k) && v !== null && v !== undefined && String(v).trim()) {
      const label = k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      extraFields.push({ label, value: String(v).trim() });
    }
  }

  const hasUpi = !!upiId;
  const hasBank = !!(accountHolder || accountNumber || ifsc || bankName);
  const hasExtra = extraFields.length > 0;
  const hasAny = hasUpi || hasBank || hasExtra;

  return {
    data,
    upiId,
    accountHolder,
    accountNumber,
    ifsc,
    bankName,
    extraFields,
    hasUpi,
    hasBank,
    hasExtra,
    hasAny,
    netAmount: data.net_amount,
    feePercent: data.fee_percent,
    feeAmount: data.fee_amount,
  };
}

export default function WithdrawalsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("pending");
  const [counts, setCounts] = useState<any>({ pending: 0, approved: 0, processed: 0, rejected: 0, total: 0 });
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [confirm, setConfirm] = useState<{ id: number; action: string } | null>(null);
  const [detail, setDetail] = useState<any>(null);

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
      const [data, c] = await Promise.all([listWithdrawals(params), getWithdrawalCounts()]);
      setItems(data);
      setCounts(c);
    } catch (e: any) {
      setError(parseApiError(e, "Failed to load withdrawals"));
    } finally {
      setLoading(false);
    }
  }, [status, dateFrom, dateTo]);

  useEffect(() => {
    load();
  }, [load]);

  function toggle(id: number) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function openConfirm(id: number, action: string) {
    setConfirm({ id, action });
  }

  async function doProcess() {
    if (!confirm) return;
    try {
      await processWithdrawal(confirm.id, confirm.action);
      const actionName =
        confirm.action === "process"
          ? "marked as done (paid)"
          : confirm.action === "approve"
          ? "approved"
          : "rejected";
      setConfirm(null);
      if (detail && detail.id === confirm.id) setDetail(null);
      toast.success(`Withdrawal #${confirm.id} ${actionName}`);
      setSelected([]);
      load();
    } catch (e: any) {
      setConfirm(null);
      toast.error(parseApiError(e, "Failed to process withdrawal"));
    }
  }

  async function bulkApprove() {
    if (selected.length === 0) return;
    try {
      await bulkApproveWithdrawals(selected);
      toast.success(`${selected.length} withdrawals approved`);
      setSelected([]);
      load();
    } catch (e: any) {
      toast.error(parseApiError(e, "Failed to bulk approve withdrawals"));
    }
  }

  async function copyText(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Copy failed");
    }
  }

  const payment = getPaymentInfo(detail?.bank_details);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Withdrawals"
        description="Send the money manually to the user's provided bank/UPI, then Mark as Done. Rejecting refunds the amount to the user's wallet."
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

      <AnimatePresence>
        {selected.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ type: "spring", damping: 26, stiffness: 350 }}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-500/30 bg-brand-500/10 px-4 py-3 shadow-glow"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500/20 text-sm text-brand-300">✓</div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{selected.length} selected</p>
                <p className="text-[11px] text-brand-300/80">Only pending requests can be bulk approved</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={() => setSelected([])}>Clear</Button>
              <Button size="sm" variant="success" disabled={status !== "pending"} onClick={bulkApprove}>
                Mark Selected as Done
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Card title={`${items.length} requests`} bodyClassName="p-0">
        {loading ? (
          <div className="p-4"><Spinner /></div>
        ) : (
          <div className="table-wrap">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="py-2.5">
                    <input
                      type="checkbox"
                      className="accent-brand-600"
                      checked={items.length > 0 && items.every((i) => selected.includes(i.id))}
                      onChange={(e) =>
                        setSelected(e.target.checked ? items.map((i) => i.id) : [])
                      }
                    />
                  </th>
                  <th>ID</th>
                  <th>User</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Requested</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((w) => (
                  <tr
                    key={w.id}
                    onClick={() => setDetail(w)}
                    className={`border-t border-slate-100 transition-colors cursor-pointer ${
                      selected.includes(w.id) ? "bg-brand-500/[0.07]" : "hover:bg-slate-50"
                    }`}
                  >
                    <td className="py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="accent-brand-600"
                        checked={selected.includes(w.id)}
                        onChange={() => toggle(w.id)}
                      />
                    </td>
                    <td className="text-slate-400">#{w.id}</td>
                    <td className="font-medium text-slate-900">
                      {w.username}
                      <span className="ml-1.5 text-xs text-slate-400">(#{w.user_id})</span>
                    </td>
                    <td className="font-semibold text-slate-900">{fmtMoney(w.amount)}</td>
                    <td>
                      <Badge color={statusColor[w.status] ?? "slate"}>{w.status}</Badge>
                    </td>
                    <td className="text-slate-400">
                      {fmtDateTime(w.requested_at)}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <Button size="sm" variant="outline" onClick={() => setDetail(w)}>View</Button>
                        {w.status === "pending" && (
                          <>
                            <Button size="sm" variant="success" onClick={() => openConfirm(w.id, "process")}>
                              Mark as Done
                            </Button>
                            <Button size="sm" variant="danger" onClick={() => openConfirm(w.id, "reject")}>
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {items.length === 0 && <EmptyState title="No withdrawal requests found" hint="Try changing the status filter or date range" />}
          </div>
        )}
      </Card>

      {/* Detail drawer */}
      <SlideOver
        open={!!detail}
        onClose={() => setDetail(null)}
        title={`Withdrawal #${detail?.id ?? ""}`}
        description={detail ? `${detail.username} requested on ${fmtDateTime(detail.requested_at)}` : ""}
      >
        {detail && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-gradient-to-br from-white/[0.06] to-transparent p-5">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Amount</p>
                <p className="mt-1 text-3xl font-bold text-slate-900">{fmtMoney(detail.amount)}</p>
              </div>
              <Badge color={statusColor[detail.status] ?? "slate"} className="text-sm px-3 py-1">{detail.status}</Badge>
            </div>

            {/* User & Request Info */}
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <p className="text-xs text-slate-400">User</p>
                <p className="font-bold text-sm text-slate-900">{detail.username} <span className="text-xs text-slate-400 font-normal">(#{detail.user_id})</span></p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => copyText(detail.username, "Username")}>Copy User</Button>
            </div>

            {/* UPI Details */}
            {payment.hasUpi && (
              <div>
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">UPI Payment Details</h4>
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-500/20 bg-brand-50/50 dark:bg-brand-950/20 p-4">
                  <div>
                    <p className="text-xs text-slate-400">UPI ID / VPA</p>
                    <p className="mt-0.5 font-mono text-base font-bold text-brand-600 dark:text-brand-400">{payment.upiId}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => copyText(payment.upiId, "UPI ID")}>Copy UPI</Button>
                </div>
              </div>
            )}

            {/* Bank Details */}
            {payment.hasBank && (
              <div>
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Bank Account Details</h4>
                <div className="space-y-2">
                  {[
                    { label: "Account Holder", value: payment.accountHolder },
                    { label: "Account Number", value: payment.accountNumber },
                    { label: "IFSC Code", value: payment.ifsc },
                    { label: "Bank Name", value: payment.bankName },
                  ].filter((f) => f.value).map((f) => (
                    <div key={f.label} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5">
                      <div className="min-w-0">
                        <p className="text-[11px] text-slate-400 uppercase tracking-wide">{f.label}</p>
                        <p className="mt-0.5 truncate font-mono text-sm font-semibold text-slate-900">{f.value}</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => copyText(String(f.value), f.label)}>Copy</Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Extra Fields */}
            {payment.hasExtra && (
              <div>
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Additional Payment Info</h4>
                <div className="space-y-2">
                  {payment.extraFields.map((f) => (
                    <div key={f.label} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5">
                      <div className="min-w-0">
                        <p className="text-[11px] text-slate-400 uppercase tracking-wide">{f.label}</p>
                        <p className="mt-0.5 truncate font-mono text-sm font-semibold text-slate-900">{f.value}</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => copyText(f.value, f.label)}>Copy</Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!payment.hasAny && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-center">
                <p className="text-xs font-medium text-amber-600">No payment details (UPI/Bank) were recorded for this request.</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-400">Net Amount</p>
                <p className="mt-1 text-lg font-bold text-slate-900">{fmtMoney(payment.netAmount ?? detail.amount)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-400">Fee ({payment.feePercent ?? 0}%)</p>
                <p className="mt-1 text-lg font-bold text-red-400">-{fmtMoney(payment.feeAmount ?? 0)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-400">Requested</p>
                <p className="mt-1 text-sm text-slate-700">{fmtDateTime(detail.requested_at)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-400">Processed</p>
                <p className="mt-1 text-sm text-slate-700">
                  {detail.processed_at ? fmtDateTime(detail.processed_at) : "—"}
                </p>
              </div>
            </div>

            {detail.admin_remarks && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                <p className="text-xs font-medium text-amber-300">Admin Remarks</p>
                <p className="mt-1 text-sm text-slate-600">{detail.admin_remarks}</p>
              </div>
            )}

            {detail.status === "pending" && (
              <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <Button variant="success" className="flex-1 font-bold" onClick={() => openConfirm(detail.id, "process")}>
                  ✓ Mark as Done (Paid)
                </Button>
                <Button variant="danger" className="flex-1 font-bold" onClick={() => openConfirm(detail.id, "reject")}>
                  ✕ Reject / Cancel Request
                </Button>
              </div>
            )}
          </div>
        )}
      </SlideOver>

      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirm?.action === "process" ? "Confirm Payout (Mark as Done)" : "Reject / Cancel Withdrawal"}
      >
        <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
          <p>
            Are you sure you want to <b>{confirm?.action === "process" ? "mark as done (paid)" : "reject and cancel"}</b> withdrawal request #{confirm?.id}?
          </p>
          {confirm?.action === "process" && (
            <p className="text-xs text-slate-500 rounded-lg bg-slate-100 dark:bg-slate-800 p-2.5">
              Make sure you have already transferred the money to the user&apos;s UPI or Bank account.
            </p>
          )}
          {confirm?.action === "reject" && (
            <p className="text-xs text-rose-600 dark:text-rose-400 font-medium rounded-lg bg-rose-500/10 p-2.5">
              Rejecting will automatically cancel the request and refund the amount back to the user&apos;s wallet immediately.
            </p>
          )}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirm(null)}>Back</Button>
          <Button variant={confirm?.action === "reject" ? "danger" : "success"} onClick={doProcess}>
            {confirm?.action === "reject" ? "Confirm Rejection & Refund" : "Confirm Marked as Paid"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
