"use client";

import React, { useEffect, useState, useCallback } from "react";
import { format } from "@/lib/format";
import {
  Card,
  Button,
  Input,
  Select,
  Badge,
  Modal,
  SlideOver,
  Tabs,
  Spinner,
  ErrorMsg,
  PageHeader,
  DataTable,
  EmptyState,
  Field,
  cn,
} from "@/components/ui";
import {
  listUsers,
  toggleUserActive,
  addUserBonus,
  deductUserFunds,
  resetUserPassword,
  deleteUser,
  getUserDetailed,
  listBids,
  listDeposits,
  listWithdrawals,
  getUserContacts,
  getUserLocations,
} from "@/lib/admin";
import { parseApiError } from "@/lib/error-parser";
import { fmtMoney, fmtNum, fmtDate } from "@/lib/format";
import { toast } from "@/components/Toast";
import { WhatsAppLink } from "@/components/WhatsAppLink";
import { UserBetsManager } from "@/components/UserBetsManager";
import { DateRangeFilter, DatePreset } from "@/components/DateRangeFilter";

function BalanceChip({ balance }: { balance: number }) {
  const value = Number(balance || 0);
  const positive = value >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-xs font-bold ring-1 ring-inset ${positive
        ? "bg-emerald-500/10 text-emerald-700 ring-emerald-500/25"
        : "bg-red-500/10 text-red-600 ring-red-500/25"
        }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${positive ? "bg-emerald-500" : "bg-red-500"}`} />
      ₹{value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </span>
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    username: "",
    is_active: "",
    dateFrom: "",
    dateTo: "",
    datePreset: "all" as DatePreset,
  });
  const [submitting, setSubmitting] = useState(false);

  const [selected, setSelected] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const [userBids, setUserBids] = useState<any[]>([]);
  const [userDeposits, setUserDeposits] = useState<any[]>([]);
  const [userWithdrawals, setUserWithdrawals] = useState<any[]>([]);
  const [userContacts, setUserContacts] = useState<any[]>([]);
  const [userLocations, setUserLocations] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [activeTab, setActiveTab] = useState("overview");

  const [bonusUser, setBonusUser] = useState<any>(null);
  const [bonusAmount, setBonusAmount] = useState("0");
  const [bonusDesc, setBonusDesc] = useState("Bonus credited");
  const [resetUser, setResetUser] = useState<any>(null);
  const [resetPw, setResetPw] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (filters.username.trim()) params.username = filters.username.trim();
      if (filters.is_active !== "") params.is_active = filters.is_active === "true";
      if (filters.dateFrom) params.registered_from = `${filters.dateFrom}T00:00:00`;
      if (filters.dateTo) params.registered_to = `${filters.dateTo}T23:59:59`;
      const data = await listUsers(params);
      setUsers(data);
    } catch (e: any) {
      setError(parseApiError(e, "Failed to load users"));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const targetId = params.get("userId") || params.get("id");
    if (targetId) {
      const numId = parseInt(targetId, 10);
      if (!isNaN(numId)) {
        openDetail({ id: numId });
      }
    }
  }, []);

  async function openDetail(user: any) {
    setSelected(user);
    setDetail(null);
    setUserBids([]);
    setUserDeposits([]);
    setUserWithdrawals([]);
    setUserContacts([]);
    setUserLocations([]);
    setActiveTab("overview");
    setLoadingDetails(true);
    try {
      const [d, b, dep, w, contacts, locations] = await Promise.all([
        getUserDetailed(user.id),
        listBids({ user_id: user.id, limit: 150 }),
        listDeposits({ user_id: user.id, limit: 50 }),
        listWithdrawals({ user_id: user.id, limit: 50 }),
        getUserContacts(user.id),
        getUserLocations(user.id),
      ]);
      setDetail(d);
      setUserBids(b);
      setUserDeposits(dep);
      setUserWithdrawals(w);
      setUserContacts(contacts);
      setUserLocations(locations);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoadingDetails(false);
    }
  }

  async function handleToggle(user: any) {
    try {
      const res = await toggleUserActive(user.id);
      toast.success(`User ${res.is_active ? "enabled" : "disabled"}`);
      load();
    } catch (e: any) {
      toast.error(parseApiError(e, "Failed to toggle user status"));
    }
  }

  async function submitBonus() {
    if (!bonusUser) return;
    try {
      await addUserBonus(bonusUser.id, parseFloat(bonusAmount), bonusDesc);
      setBonusUser(null);
      toast.success(`Bonus of ₹${fmtNum(bonusAmount)} credited to ${bonusUser.username}`);
      load();
      if (selected && selected.id === bonusUser.id) {
        openDetail(selected); // refresh details if open
      }
    } catch (e: any) {
      toast.error(parseApiError(e, "Failed to credit bonus"));
    }
  }

  const [deductUser, setDeductUser] = useState<any>(null);
  const [deductAmount, setDeductAmount] = useState("0");
  const [deductDesc, setDeductDesc] = useState("Manual deduction");

  async function submitDeduct() {
    if (!deductUser || submitting) return;
    setSubmitting(true);
    try {
      const { deductUserFunds } = await import("@/lib/admin");
      await deductUserFunds(deductUser.id, parseFloat(deductAmount), deductDesc);
      setDeductUser(null);
      toast.success(`₹${fmtNum(deductAmount)} deducted from ${deductUser.username}`);
      load();
      if (selected && selected.id === deductUser.id) {
        openDetail(selected);
      }
    } catch (e: any) {
      toast.error(parseApiError(e, "Failed to deduct funds"));
    } finally {
      setSubmitting(false);
    }
  }

  async function submitReset() {
    if (!resetUser || submitting) return;
    setSubmitting(true);
    try {
      await resetUserPassword(resetUser.id, resetPw);
      setResetUser(null);
      setResetPw("");
      toast.success("Password reset successfully");
    } catch (e: any) {
      toast.error(parseApiError(e, "Failed to reset password"));
    } finally {
      setSubmitting(false);
    }
  }

  async function submitDelete() {
    if (!deleteTarget) return;
    if (deleteConfirm !== deleteTarget.username) return;
    setDeleting(true);
    try {
      await deleteUser(deleteTarget.id);
      toast.success(`User ${deleteTarget.username} and all related data deleted`);
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      setDeleteTarget(null);
      setDeleteConfirm("");
      setSelected(null);
    } catch (e: any) {
      toast.error(parseApiError(e, "Failed to delete user"));
    } finally {
      setDeleting(false);
    }
  }

  const tabs = [
    { id: "overview", label: "Overview", icon: "👤" },
    { id: "bets", label: "Recent Bets", icon: "🎯" },
    { id: "transactions", label: "Transactions", icon: "💸" },
    { id: "device", label: "Device Data", icon: "📱" },
    { id: "security", label: "Security & Actions", icon: "🛡️" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Users" description="Manage accounts, balances and access" />

      <ErrorMsg msg={error} />

      <Card bodyClassName="p-3.5 space-y-3">
        {/* Top Search Input with clear button and submit */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">🔍</span>
            <input
              type="text"
              placeholder="Search username, 10-digit mobile, full name, or ID…"
              value={filters.username}
              onChange={(e) => setFilters((prev) => ({ ...prev, username: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === "Enter") load();
              }}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 py-2 pl-9 pr-9 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            />
            {filters.username && (
              <button
                type="button"
                onClick={() => {
                  setFilters((prev) => ({ ...prev, username: "" }));
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto no-scrollbar">
            {[
              { id: "", label: "All Users" },
              { id: "true", label: "Active" },
              { id: "false", label: "Inactive" },
            ].map((st) => {
              const active = filters.is_active === st.id;
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setFilters((prev) => ({ ...prev, is_active: st.id }))}
                  className={cn(
                    "px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition active:scale-95",
                    active
                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                  )}
                >
                  {st.label}
                </button>
              );
            })}

            <Button onClick={load} className="h-9 px-4 text-xs font-bold shrink-0">
              Search
            </Button>

            {(filters.username || filters.is_active !== "" || filters.datePreset !== "all") && (
              <Button
                variant="outline"
                onClick={() =>
                  setFilters({
                    username: "",
                    is_active: "",
                    dateFrom: "",
                    dateTo: "",
                    datePreset: "all",
                  })
                }
                className="h-9 px-3 text-xs shrink-0 text-rose-600 border-rose-200 hover:bg-rose-50"
              >
                Reset ✕
              </Button>
            )}
          </div>
        </div>

        {/* Date Filter Bar */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <DateRangeFilter
            initialPreset={filters.datePreset}
            onFilterChange={({ dateFrom, dateTo, preset }) => {
              setFilters((prev) => ({ ...prev, dateFrom, dateTo, datePreset: preset }));
            }}
            compact
          />
        </div>
      </Card>

      <Card
        title={
          <div className="flex items-center gap-2">
            <span>Users</span>
            <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-bold text-slate-700 dark:text-slate-300">
              {users.length}
            </span>
          </div>
        }
        subtitle="Browse and manage all registered platform users"
        bodyClassName="p-0"
      >
        {loading ? (
          <div className="p-6">
            <Spinner />
          </div>
        ) : (
          <>
            {/* Desktop Full Table */}
            <div className="hidden md:block">
              <DataTable
                getRowKey={(u) => u.id}
                rows={users}
                onRowClick={openDetail}
                columns={[
                  { key: "id", header: "ID", className: "w-12 text-slate-400" },
                  {
                    key: "username",
                    header: "Username",
                    render: (u) => (
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {u.full_name || u.username}
                        {u.username === "admin" && <Badge color="brand" className="ml-2">Owner</Badge>}
                        {u.auth_provider === "google" && <Badge color="blue" className="ml-2">Google signed in</Badge>}
                      </span>
                    ),
                  },
                  {
                    key: "phone",
                    header: "Phone / WhatsApp",
                    render: (u) => (
                      <WhatsAppLink
                        phone={u.phone || u.mobile_number}
                        userName={u.full_name || u.username}
                        variant="pill"
                      />
                    ),
                  },
                  { key: "balance", header: "Balance", render: (u) => <BalanceChip balance={u.wallet_balance} /> },
                  {
                    key: "status",
                    header: "Status",
                    render: (u) => (
                      <Badge color={u.is_active ? "emerald" : "red"}>
                        {u.is_active ? "Active" : "Inactive"}
                      </Badge>
                    ),
                  },
                  {
                    key: "actions",
                    header: "Actions",
                    className: "text-right",
                    render: (u) => (
                      <Button size="sm" variant="outline" onClick={() => openDetail(u)}>View Profile</Button>
                    ),
                  },
                ]}
              />
            </div>

            {/* Mobile Compact High-Density Row View */}
            <div className="md:hidden">
              {/* Mobile Table Header */}
              <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-850/90 px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span>User</span>
                  <span className="rounded-full bg-slate-200 dark:bg-slate-700 px-1.5 py-0.2 text-[9px] font-semibold text-slate-700 dark:text-slate-300">
                    {users.length}
                  </span>
                </div>
                <span>Balance & Status</span>
              </div>

              {users.length === 0 ? (
                <div className="py-10">
                  <EmptyState title="No users found" hint="Try changing the search filter above" />
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {users.map((u) => {
                    const displayName = u.full_name || u.username;
                    const initial = (displayName?.[0] || "U").toUpperCase();
                    const balance = Number(u.wallet_balance || 0);
                    const isPositive = balance >= 0;

                    return (
                      <div
                        key={u.id}
                        onClick={() => openDetail(u)}
                        className="flex items-center justify-between gap-2.5 px-3 py-2.5 transition-colors active:bg-amber-500/10 hover:bg-slate-50 dark:hover:bg-slate-850/50 cursor-pointer select-none"
                      >
                        {/* Left: Avatar & Info */}
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400/20 to-brand-500/15 text-xs font-bold text-amber-800 ring-1 ring-inset ring-amber-500/25">
                            {initial}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                                {displayName}
                              </span>
                              {u.username === "admin" && (
                                <span className="shrink-0 rounded bg-amber-500/15 px-1 py-0.2 text-[9px] font-bold text-amber-700">
                                  Owner
                                </span>
                              )}
                              {u.auth_provider === "google" && (
                                <span className="shrink-0 rounded bg-blue-500/15 px-1 py-0.2 text-[9px] font-bold text-blue-700">
                                  Google
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 leading-tight mt-1 flex-wrap">
                              <span className="font-mono text-slate-500 font-medium">#{u.id}</span>
                              {u.phone || u.mobile_number ? (
                                <>
                                  <span>•</span>
                                  <WhatsAppLink
                                    phone={u.phone || u.mobile_number}
                                    userName={displayName}
                                    variant="inline"
                                  />
                                </>
                              ) : u.created_at ? (
                                <>
                                  <span>•</span>
                                  <span>{format(new Date(u.created_at), "dd/MM/yy")}</span>
                                </>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        {/* Right: Balance & Status & Chevron */}
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right">
                            <div
                              className={`font-mono text-xs font-bold leading-tight ${isPositive ? "text-emerald-600" : "text-red-600"
                                }`}
                            >
                              ₹{balance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="mt-0.5 flex items-center justify-end gap-1">
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${u.is_active ? "bg-emerald-500" : "bg-red-500"
                                  }`}
                              />
                              <span
                                className={`text-[10px] font-medium leading-none ${u.is_active ? "text-emerald-700" : "text-red-600"
                                  }`}
                              >
                                {u.is_active ? "Active" : "Inactive"}
                              </span>
                            </div>
                          </div>
                          <div className="text-slate-400 pl-0.5">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </Card>

      {/* User Detail SlideOver */}
      <SlideOver
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.full_name || selected?.username}
        description={`ID: ${selected?.id}`}
      >
        {selected && (
          <div className="space-y-6">
            <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

            {loadingDetails ? (
              <Spinner className="min-h-[200px]" />
            ) : (
              <div className="animate-fade-in mt-4">
                {activeTab === "overview" && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <Card bodyClassName="p-4 flex flex-col items-center text-center">
                        <span className="text-xs text-slate-400 uppercase">Wallet Balance</span>
                        <span className={`mt-1 text-2xl font-bold ${selected.wallet_balance >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {fmtMoney(selected.wallet_balance)}
                        </span>
                        <span className="mt-1 text-[11px] text-slate-400">Joined {fmtDate(selected.created_at)}</span>
                      </Card>
                      <Card bodyClassName="p-4 flex flex-col items-center text-center">
                        <span className="text-xs text-slate-400 uppercase">Status</span>
                        <Badge color={selected.is_active ? "emerald" : "red"} className="mt-2">{selected.is_active ? "Active" : "Inactive"}</Badge>
                        <span className="mt-1 text-[11px] text-slate-400">ID #{selected.id}</span>
                      </Card>
                      <Card bodyClassName="p-4 flex flex-col items-center text-center">
                        <span className="text-xs text-slate-400 uppercase">Role</span>
                        <Badge color={selected.username === "admin" ? "brand" : "slate"} className="mt-2">{selected.username === "admin" ? "Owner" : "User"}</Badge>

                      </Card>
                    </div>

                    <Card title="Profile Information">
                      {(selected.phone || selected.mobile_number) && (
                        <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                              WhatsApp Phone Contact
                            </p>
                            <p className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                              {selected.phone || selected.mobile_number}
                            </p>
                          </div>
                          <WhatsAppLink
                            phone={selected.phone || selected.mobile_number}
                            userName={selected.full_name || selected.username}
                            variant="button"
                            label="Chat on WhatsApp"
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        <Field label="Phone Number" value={selected.phone || selected.mobile_number || "—"} />
                        <Field label="First Name" value={selected.first_name || "—"} />
                        <Field label="Last Name" value={selected.last_name || "—"} />
                        <Field label="Language" value={selected.language || "—"} />
                        <Field label="Postal PIN" value={selected.postal_pin || "—"} />
                        <Field label="State" value={selected.state || "—"} />
                        <Field label="City" value={selected.city || "—"} />
                      </div>
                    </Card>

                    {detail && (
                      <>
                        <Card title="Wallet Summary" bodyClassName="p-0">
                          <div className="grid grid-cols-2 gap-px bg-slate-100 md:grid-cols-4">
                            {[
                              { label: "Lifetime Deposits", value: fmtMoney(detail.total_deposits), tone: "text-emerald-400" },
                              { label: "Lifetime Withdrawals", value: fmtMoney(detail.total_withdrawals), tone: "text-red-400" },
                              { label: "Net Deposits", value: fmtMoney((detail.total_deposits ?? 0) - (detail.total_withdrawals ?? 0)), tone: "text-slate-900" },
                              { label: "Total Wins", value: fmtMoney(detail.total_wins), tone: "text-emerald-400" },
                            ].map((s) => (
                              <div key={s.label} className="bg-white p-4">
                                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{s.label}</p>
                                <p className={`mt-1 text-lg font-bold ${s.tone}`}>{s.value}</p>
                              </div>
                            ))}
                          </div>
                        </Card>

                        <Card title="Activity Summary">
                          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-4">
                            <Field label="Total Bets" value={fmtNum(detail.total_bets)} />
                            <Field label="Total Wins (count)" value={fmtNum(detail.total_wins_count ?? "—")} />
                            <Field label="Deposits" value={fmtMoney(detail.total_deposits)} />
                            <Field label="Withdrawals" value={fmtMoney(detail.total_withdrawals)} />
                          </div>
                        </Card>
                      </>
                    )}

                    {(userBids.length > 0 || userDeposits.length > 0 || userWithdrawals.length > 0) && (
                      <Card title="Recent Activity" bodyClassName="p-0">
                        <div className="max-h-80 overflow-y-auto">
                          {[
                            ...userDeposits.map((d) => ({
                              key: `dep-${d.id}`,
                              type: "Deposit",
                              amount: Number(d.amount || 0),
                              status: d.status,
                              date: d.created_at,
                            })),
                            ...userWithdrawals.map((w) => ({
                              key: `wit-${w.id}`,
                              type: "Withdrawal",
                              amount: -Number(w.amount || 0),
                              status: w.status,
                              date: w.requested_at || w.created_at,
                            })),
                            ...userBids.map((b) => ({
                              key: `bid-${b.id}`,
                              type: "Bet",
                              amount: -Number(b.amount || 0),
                              status: b.status,
                              date: b.created_at || b.placed_at,
                            })),
                          ]
                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                            .slice(0, 15)
                            .map((a) => (
                              <div key={a.key} className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 last:border-0">
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold ${a.type === "Deposit"
                                      ? "bg-emerald-500/15 text-emerald-400"
                                      : a.type === "Withdrawal"
                                        ? "bg-red-500/15 text-red-400"
                                        : "bg-violet-500/15 text-violet-400"
                                      }`}
                                  >
                                    {a.type === "Deposit" ? "D" : a.type === "Withdrawal" ? "W" : "B"}
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-slate-700">{a.type}</p>
                                    <p className="text-[11px] text-slate-400">{fmtDate(a.date)}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`text-sm font-semibold ${a.amount >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                    {a.amount >= 0 ? "+" : ""}{fmtMoney(a.amount)}
                                  </span>
                                  <Badge color={a.status === "completed" || a.status === "won" || a.status === "approved" ? "emerald" : a.status === "rejected" || a.status === "lost" ? "red" : "amber"}>
                                    {a.status}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                        </div>
                      </Card>
                    )}
                  </div>
                )}

                {activeTab === "bets" && (
                  <UserBetsManager bids={userBids} />
                )}

                {activeTab === "transactions" && (
                  <div className="space-y-6">
                    <Card title="Recent Deposits" bodyClassName="p-0">
                      <DataTable
                        getRowKey={(d) => d.id}
                        rows={userDeposits}
                        columns={[
                          { key: "amount", header: "Amount", render: (d) => <span className="text-emerald-400">+{fmtMoney(d.amount)}</span> },
                          { key: "method", header: "Method", render: (d) => d.method || "N/A" },
                          {
                            key: "status", header: "Status", render: (d) => (
                              <Badge color={d.status === "completed" || d.status === "approved" || d.status === "success" ? "emerald" : d.status === "rejected" || d.status === "failed" ? "red" : "amber"}>
                                {d.status}
                              </Badge>
                            )
                          },
                          { key: "date", header: "Date", render: (d) => format(new Date(d.created_at), "dd/MM/yyyy") },
                        ]}
                      />
                    </Card>

                    <Card title="Recent Withdrawals" bodyClassName="p-0">
                      <DataTable
                        getRowKey={(w) => w.id}
                        rows={userWithdrawals}
                        columns={[
                          { key: "amount", header: "Amount", render: (w) => <span className="text-red-400">-{fmtMoney(w.amount)}</span> },
                          { key: "method", header: "Method", render: (w) => w.method || w.bank_details || "N/A" },
                          {
                            key: "status", header: "Status", render: (w) => (
                              <Badge color={w.status === "approved" ? "emerald" : w.status === "rejected" ? "red" : "amber"}>
                                {w.status}
                              </Badge>
                            )
                          },
                          { key: "date", header: "Date", render: (w) => format(new Date(w.requested_at || w.created_at), "dd/MM/yyyy") },
                        ]}
                      />
                    </Card>
                  </div>
                )}

                {activeTab === "device" && (
                  <div className="space-y-6">
                    <Card title={`Contacts (${userContacts.length})`} bodyClassName="p-0 max-h-96 overflow-y-auto">
                      <DataTable
                        getRowKey={(c: any) => c.id}
                        rows={userContacts}
                        columns={[
                          { key: "name", header: "Name", render: (c) => c.name || "Unknown" },
                          {
                            key: "number",
                            header: "WhatsApp / Phone",
                            render: (c) => (
                              <WhatsAppLink
                                phone={c.number}
                                userName={c.name}
                                variant="inline"
                              />
                            ),
                          },
                          { key: "date", header: "Date Extracted", render: (c) => format(new Date(c.created_at), "dd/MM/yyyy HH:mm") },
                        ]}
                      />
                    </Card>

                    <Card title={`Location History (${userLocations.length})`} bodyClassName="p-0 max-h-96 overflow-y-auto">
                      <DataTable
                        getRowKey={(l: any) => l.id}
                        rows={userLocations}
                        columns={[
                          { key: "coords", header: "Coordinates", render: (l) => `${l.latitude || '-'}, ${l.longitude || '-'}` },
                          { key: "address", header: "Address", render: (l) => l.address || "-" },
                          { key: "date", header: "Date Extracted", render: (l) => format(new Date(l.created_at), "dd/MM/yyyy HH:mm") },
                        ]}
                      />
                    </Card>

                    <Card title="Media (Photos & Videos)" bodyClassName="p-8 flex flex-col items-center justify-center text-center">
                      <div className="mb-3 rounded-full bg-slate-800 p-4 text-slate-400">
                        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-slate-600">No Media Synced</p>
                      <p className="mt-1 text-xs text-slate-400 max-w-sm">
                        Remote syncing of user photos and videos is currently not collected by the device service.
                      </p>
                    </Card>
                  </div>
                )}

                {activeTab === "security" && (
                  <div className="space-y-4">
                    <Card title="Account Status">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-700">Active Status</p>
                          <p className="text-xs text-slate-400">Prevent this user from logging in or placing bets.</p>
                        </div>
                        <Button variant={selected.is_active ? "danger" : "success"} onClick={() => handleToggle(selected)}>
                          {selected.is_active ? "Disable Account" : "Enable Account"}
                        </Button>
                      </div>
                    </Card>

                    <Card title="Credit Bonus">
                      <p className="text-xs text-slate-400 mb-4">Add promotional bonus directly to this user's wallet.</p>
                      <Button onClick={() => { setBonusAmount("0"); setBonusDesc("Bonus credited"); setBonusUser(selected); }}>
                        Credit Bonus
                      </Button>
                    </Card>

                    <Card title="Deduct Funds">
                      <p className="text-xs text-slate-400 mb-4">Manually deduct funds from this user's wallet.</p>
                      <Button variant="danger" onClick={() => { setDeductAmount("0"); setDeductDesc("Manual deduction"); setDeductUser(selected); }}>
                        Deduct Funds
                      </Button>
                    </Card>

                    <Card title="Reset Password">
                      <p className="text-xs text-slate-400 mb-4">Force a password reset for this user.</p>
                      <Button variant="danger" onClick={() => { setResetPw(""); setResetUser(selected); }}>
                        Reset Password
                      </Button>
                    </Card>

                    {selected.username !== "admin" && (
                      <Card
                        title="Delete User"
                        className="border-red-500/40"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-medium text-slate-700">Permanently delete this user</p>
                            <p className="text-xs text-slate-400 mt-1 max-w-md">
                              Removes the account and ALL associated data — bets, starline bets, deposits,
                              withdrawals, transactions, device tokens, contacts, locations and login history.
                              This action cannot be undone.
                            </p>
                          </div>
                          <Button
                            variant="danger"
                            onClick={() => { setDeleteConfirm(""); setDeleteTarget(selected); }}
                          >
                            Delete User
                          </Button>
                        </div>
                      </Card>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </SlideOver>

      {/* Bonus modal */}
      <Modal open={!!bonusUser} onClose={() => setBonusUser(null)} title={`Add Bonus — ${bonusUser?.full_name || bonusUser?.username || ""}`}>
        <div className="space-y-4">
          <Field label="Amount">
            <Input type="number" value={bonusAmount} onChange={(e) => setBonusAmount(e.target.value)} />
          </Field>
          <Field label="Description">
            <Input value={bonusDesc} onChange={(e) => setBonusDesc(e.target.value)} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setBonusUser(null)}>Cancel</Button>
            <Button disabled={submitting} onClick={submitBonus}>Credit</Button>
          </div>
        </div>
      </Modal>

      {/* Deduct modal */}
      <Modal open={!!deductUser} onClose={() => setDeductUser(null)} title={`Deduct Funds — ${deductUser?.full_name || deductUser?.username || ""}`}>
        <div className="space-y-4">
          <Field label="Amount">
            <Input type="number" value={deductAmount} onChange={(e) => setDeductAmount(e.target.value)} />
          </Field>
          <Field label="Description / Reason">
            <Input value={deductDesc} onChange={(e) => setDeductDesc(e.target.value)} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeductUser(null)}>Cancel</Button>
            <Button disabled={submitting} variant="danger" onClick={submitDeduct}>Deduct</Button>
          </div>
        </div>
      </Modal>

      {/* Reset password modal */}
      <Modal open={!!resetUser} onClose={() => setResetUser(null)} title={`Reset Password — ${resetUser?.full_name || resetUser?.username || ""}`}>
        <div className="space-y-4">
          <Field label="New Password">
            <Input value={resetPw} onChange={(e) => setResetPw(e.target.value)} placeholder="Enter new password" />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setResetUser(null)}>Cancel</Button>
            <Button disabled={submitting} variant="danger" onClick={submitReset}>Reset</Button>
          </div>
        </div>
      </Modal>

      {/* Delete user confirmation modal */}
      <Modal open={!!deleteTarget} onClose={() => { setDeleteTarget(null); setDeleteConfirm(""); }} title="Delete User Permanently">
        {deleteTarget && (
          <div className="space-y-4">
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
              You are about to permanently delete <b>{deleteTarget.username}</b> (#{deleteTarget.id}) and ALL of
              their data. This cannot be undone.
            </div>
            <Field label={`Type the username "${deleteTarget.username}" to confirm`}>
              <Input
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder={deleteTarget.username}
              />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => { setDeleteTarget(null); setDeleteConfirm(""); }}>Cancel</Button>
              <Button
                variant="danger"
                disabled={deleting || deleteConfirm !== deleteTarget.username}
                onClick={submitDelete}
              >
                {deleting ? "Deleting…" : "Delete Permanently"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
