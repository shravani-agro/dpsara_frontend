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
  listTransactions,
  listMarkets,
  getUserContacts,
  getUserLocations,
} from "@/lib/admin";
import { primeUserCache } from "@/lib/user-cache";
import { parseApiError } from "@/lib/error-parser";
import { fmtMoney, fmtNum, fmtDate, fmtDateTime } from "@/lib/format";
import { toast } from "@/components/Toast";
import { WhatsAppLink } from "@/components/WhatsAppLink";
import { UserBetsManager } from "@/components/UserBetsManager";
import { DateRangeFilter, DatePreset } from "@/components/DateRangeFilter";
import { useAuth } from "@/components/AuthProvider";

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
  const { isSubAdmin } = useAuth();

  if (isSubAdmin) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
        <span className="text-4xl">🛡️</span>
        <h2 className="mt-4 text-xl font-bold text-slate-800 dark:text-slate-100">Access Restricted</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Sub-admin accounts do not have access to player information or user management.
        </p>
      </div>
    );
  }
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    username: "",
    is_active: "",
    dateFrom: "",
    dateTo: "",
    datePreset: "all" as DatePreset,
    live_today: false,
    playing_today: false,
    playing_game: "",
  });
  const [availableMarkets, setAvailableMarkets] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [totalUsers, setTotalUsers] = useState<number>(0);

  const [selected, setSelected] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const [userBids, setUserBids] = useState<any[]>([]);
  const [userDeposits, setUserDeposits] = useState<any[]>([]);
  const [userWithdrawals, setUserWithdrawals] = useState<any[]>([]);
  const [userTransactions, setUserTransactions] = useState<any[]>([]);
  const [userContacts, setUserContacts] = useState<any[]>([]);
  const [userLocations, setUserLocations] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [activeTab, setActiveTab] = useState("overview");
  const [txSubTab, setTxSubTab] = useState<"all" | "deposits" | "withdrawals">("all");

  const [bonusUser, setBonusUser] = useState<any>(null);
  const [bonusAmount, setBonusAmount] = useState("0");
  const [bonusDesc, setBonusDesc] = useState("Bonus credited");
  const [resetUser, setResetUser] = useState<any>(null);
  const [resetPw, setResetPw] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    listMarkets()
      .then((m: any) => {
        if (Array.isArray(m)) setAvailableMarkets(m);
      })
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (filters.username.trim()) params.username = filters.username.trim();
      if (filters.is_active !== "") params.is_active = filters.is_active === "true";
      if (filters.live_today) params.active_today = true;
      if (filters.playing_today) params.playing_today = true;
      if (filters.playing_game) params.playing_game = filters.playing_game;
      if (filters.dateFrom) params.registered_from = `${filters.dateFrom}T00:00:00`;
      if (filters.dateTo) params.registered_to = `${filters.dateTo}T23:59:59`;
      params.page = currentPage;
      params.limit = pageSize;
      const data = await listUsers(params);
      setUsers(data);
      const total = typeof (data as any)?.total === "number" ? (data as any).total : data.length;
      setTotalUsers(total);
      primeUserCache(data);
    } catch (e: any) {
      setError(parseApiError(e, "Failed to load users"));
    } finally {
      setLoading(false);
    }
  }, [filters, currentPage, pageSize]);

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
    setUserTransactions([]);
    setUserContacts([]);
    setUserLocations([]);
    setActiveTab("overview");
    setTxSubTab("all");
    setLoadingDetails(true);
    try {
      const [d, b, dep, w, txs, contacts, locations] = await Promise.all([
        getUserDetailed(user.id),
        listBids({ user_id: user.id, limit: 150 }).catch(() => []),
        listDeposits({ user_id: user.id, limit: 50 }).catch(() => []),
        listWithdrawals({ user_id: user.id, limit: 50 }).catch(() => []),
        listTransactions({ user_id: user.id, limit: 100 }).catch(() => []),
        getUserContacts(user.id).catch(() => []),
        getUserLocations(user.id).catch(() => []),
      ]);
      setDetail(d);
      setUserBids(b || []);
      setUserDeposits(dep || []);
      setUserWithdrawals(w || []);
      setUserTransactions(txs || []);
      setUserContacts(contacts || []);
      setUserLocations(locations || []);
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

  const totalPages = Math.max(1, Math.ceil(totalUsers / pageSize));
  const startItem = totalUsers === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalUsers);

  const goToPage = (page: number) => {
    const target = Math.max(1, Math.min(totalPages, page));
    if (target !== currentPage) {
      setCurrentPage(target);
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  };

  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) {
        pages.push("ellipsis");
      }
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) {
        pages.push("ellipsis");
      }
      pages.push(totalPages);
    }
    return pages;
  };

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
              placeholder="Search user by Name, Username, or 10-digit Mobile..."
              value={filters.username}
              onChange={(e) => setFilters((prev) => ({ ...prev, username: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setCurrentPage(1);
                  load();
                }
              }}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 py-2 pl-9 pr-9 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            />
            {filters.username && (
              <button
                type="button"
                onClick={() => {
                  setFilters((prev) => ({ ...prev, username: "" }));
                  setCurrentPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto no-scrollbar">
            {/* Live Players Toggle */}
            <button
              type="button"
              onClick={() => {
                setFilters((prev) => ({ ...prev, live_today: !prev.live_today }));
                setCurrentPage(1);
              }}
              className={cn(
                "px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition active:scale-95 flex items-center gap-1.5",
                filters.live_today
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20 ring-2 ring-emerald-400"
                  : "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 hover:bg-emerald-100"
              )}
            >
              <span className="relative flex h-2 w-2">
                {filters.live_today && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                )}
                <span className={cn("relative inline-flex rounded-full h-2 w-2", filters.live_today ? "bg-white" : "bg-emerald-500")}></span>
              </span>
              Live Players (Today)
            </button>

            {/* Playing Game (Today) Toggle */}
            <button
              type="button"
              onClick={() => {
                setFilters((prev) => ({
                  ...prev,
                  playing_today: !prev.playing_today,
                  playing_game: !prev.playing_today ? prev.playing_game : "",
                }));
                setCurrentPage(1);
              }}
              className={cn(
                "px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition active:scale-95 flex items-center gap-1.5",
                filters.playing_today
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20 ring-2 ring-indigo-400"
                  : "bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800 hover:bg-indigo-100"
              )}
            >
              <span className="relative flex h-2 w-2">
                {filters.playing_today && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                )}
                <span className={cn("relative inline-flex rounded-full h-2 w-2", filters.playing_today ? "bg-white" : "bg-indigo-500")}></span>
              </span>
              🎮 Playing Game (Today)
            </button>

            {/* Game Filter Dropdown */}
            <Select
              value={filters.playing_game}
              onChange={(e) => {
                const val = e.target.value;
                setFilters((prev) => ({
                  ...prev,
                  playing_game: val,
                  playing_today: val !== "" ? true : prev.playing_today,
                }));
                setCurrentPage(1);
              }}
              className="h-9 px-3 text-xs font-semibold shrink-0 max-w-[170px]"
            >
              <option value="">🎮 All Playing Games</option>
              <option value="RealSpinPro">RealSpinPro</option>
              {availableMarkets.map((m: any) => (
                <option key={m.id || m.name} value={m.name}>
                  {m.name}
                </option>
              ))}
            </Select>

            {[
              { id: "", label: "All Users" },
              { id: "true", label: "Active" },
              { id: "false", label: "Inactive" },
            ].map((st) => {
              const active = !filters.live_today && !filters.playing_today && filters.is_active === st.id;
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => {
                    setFilters((prev) => ({ ...prev, is_active: st.id, live_today: false, playing_today: false, playing_game: "" }));
                    setCurrentPage(1);
                  }}
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

            <Select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="h-9 px-4 text-xs font-bold shrink-0"
          >
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100 (Default)</option>
            <option value={200}>200</option>
            <option value={500}>500</option>
          </Select>

          <Button
            onClick={() => {
              setCurrentPage(1);
              load();
            }}
            className="h-9 px-4 text-xs font-bold shrink-0"
          >
              Search
            </Button>

            {(filters.username || filters.is_active !== "" || filters.datePreset !== "all" || filters.live_today || filters.playing_today || filters.playing_game) && (
              <Button
                variant="outline"
                onClick={() => {
                  setFilters({
                    username: "",
                    is_active: "",
                    dateFrom: "",
                    dateTo: "",
                    datePreset: "all",
                    live_today: false,
                    playing_today: false,
                    playing_game: "",
                  });
                  setCurrentPage(1);
                }}
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
              setCurrentPage(1);
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
              {totalUsers > 0 ? totalUsers : users.length}
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
                  {
                    key: "name",
                    header: "Name",
                    render: (u) => {
                      const displayName = u.full_name || u.username;
                      const initial = (displayName?.[0] || "U").toUpperCase();
                      return (
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl font-bold bg-gradient-to-br from-amber-500/20 to-brand-500/20 text-brand-700 dark:text-brand-300 ring-1 ring-inset ring-brand-500/30 text-xs">
                            {initial}
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-slate-900 dark:text-slate-100 block truncate">
                              {displayName}
                            </span>
                            {u.full_name && u.username && (
                              <span className="text-[11px] text-slate-400 block truncate">@{u.username}</span>
                            )}
                          </div>
                          {u.username === "admin" && <Badge color="brand" className="ml-2">Owner</Badge>}
                          {u.auth_provider === "google" && <Badge color="blue" className="ml-2">Google signed in</Badge>}
                        </div>
                      );
                    },
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
                    key: "playing_game",
                    header: "Playing Game (Today)",
                    render: (u) => {
                      const hasGames = Array.isArray(u.active_games) && u.active_games.length > 0;
                      if (!hasGames) {
                        return (
                          <span className="text-slate-400 dark:text-slate-500 text-xs">—</span>
                        );
                      }
                      return (
                        <div className="flex flex-col gap-1 max-w-[220px]">
                          <div className="flex flex-wrap gap-1">
                            {u.active_games.slice(0, 2).map((g: string, i: number) => (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 text-[11px] font-bold"
                              >
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                {g}
                              </span>
                            ))}
                            {u.active_games.length > 2 && (
                              <span className="inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 text-[10px] font-semibold">
                                +{u.active_games.length - 2}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              {u.today_bids_count || 1} bet{(u.today_bids_count || 1) > 1 ? "s" : ""} today
                            </span>
                            {u.last_played_at && (
                              <>
                                <span>•</span>
                                <span>{fmtDateTime(u.last_played_at)}</span>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    },
                  },
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
                    {totalUsers > 0 ? totalUsers : users.length}
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
                              {u.username && u.full_name && <span>@{u.username}</span>}
                              {u.phone || u.mobile_number ? (
                                <>
                                  {u.username && u.full_name && <span>•</span>}
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
                            {Array.isArray(u.active_games) && u.active_games.length > 0 && (
                              <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">🎮 Playing:</span>
                                {u.active_games.map((g: string, i: number) => (
                                  <span key={i} className="text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.2 rounded border border-indigo-200 dark:border-indigo-800">
                                    {g}
                                  </span>
                                ))}
                                <span className="text-[10px] text-emerald-600 font-semibold">
                                  ({u.today_bids_count} bets)
                                </span>
                              </div>
                            )}
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

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3.5 mt-2 border-t border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                <span>
                  Showing <strong className="font-semibold text-slate-900 dark:text-white">{startItem}</strong>–<strong className="font-semibold text-slate-900 dark:text-white">{endItem}</strong> of <strong className="font-semibold text-slate-900 dark:text-white">{totalUsers}</strong> users
                </span>
                <span className="hidden sm:inline text-slate-300 dark:text-slate-700">•</span>
                <span className="text-slate-500 dark:text-slate-400">
                  Page <strong className="font-semibold text-slate-900 dark:text-white">{currentPage}</strong> of <strong className="font-semibold text-slate-900 dark:text-white">{totalPages}</strong>
                </span>
              </div>

              <div className="flex items-center gap-1 flex-wrap justify-center">
                {/* First */}
                <button
                  type="button"
                  onClick={() => goToPage(1)}
                  disabled={currentPage === 1 || loading}
                  title="First Page"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-700/60 disabled:pointer-events-none disabled:opacity-40"
                >
                  «
                </button>
                {/* Prev */}
                <button
                  type="button"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1 || loading}
                  title="Previous Page"
                  className="inline-flex h-8 px-2.5 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-700/60 disabled:pointer-events-none disabled:opacity-40"
                >
                  ‹ Prev
                </button>

                {/* Pages */}
                {getPageNumbers().map((p, idx) =>
                  p === "ellipsis" ? (
                    <span key={`ell-${idx}`} className="px-1.5 text-xs text-slate-400">
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      onClick={() => goToPage(p)}
                      disabled={loading}
                      className={cn(
                        "inline-flex h-8 min-w-[32px] px-2 items-center justify-center rounded-lg text-xs font-semibold transition",
                        currentPage === p
                          ? "bg-amber-500 text-slate-700 shadow-sm font-bold ring-1 ring-amber-600/30"
                          : "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60"
                      )}
                    >
                      {p}
                    </button>
                  )
                )}

                {/* Next */}
                <button
                  type="button"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage >= totalPages || loading}
                  title="Next Page"
                  className="inline-flex h-8 px-2.5 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-700/60 disabled:pointer-events-none disabled:opacity-40"
                >
                  Next ›
                </button>
                {/* Last */}
                <button
                  type="button"
                  onClick={() => goToPage(totalPages)}
                  disabled={currentPage >= totalPages || loading}
                  title="Last Page"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-700/60 disabled:pointer-events-none disabled:opacity-40"
                >
                  »
                </button>
              </div>
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
                        <span className="mt-1 text-[11px] text-slate-400">{selected.username ? `@${selected.username}` : "Verified Member"}</span>
                      </Card>
                      <Card bodyClassName="p-4 flex flex-col items-center text-center">
                        <span className="text-xs text-slate-400 uppercase">Role</span>
                        <Badge color={selected.username === "admin" ? "brand" : "slate"} className="mt-2">{selected.username === "admin" ? "Owner" : "User"}</Badge>

                      </Card>
                    </div>

                    {Array.isArray(selected?.active_games) && selected.active_games.length > 0 && (
                      <Card
                        title="🎮 Actively Playing Games Today"
                        bodyClassName="p-4 bg-gradient-to-r from-indigo-50/50 via-purple-50/20 to-transparent dark:from-indigo-950/30 dark:to-transparent"
                      >
                        <div className="flex flex-wrap gap-2 mb-3">
                          {selected.active_games.map((g: string, i: number) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 px-3 py-1.5 text-xs font-bold"
                            >
                              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                              {g}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                          <div>
                            Today&apos;s Total Bets:{" "}
                            <span className="font-bold text-slate-900 dark:text-slate-100">
                              {selected.today_bids_count}
                            </span>
                          </div>
                          {selected.last_played_game && (
                            <div>
                              Latest Game:{" "}
                              <span className="font-bold text-indigo-600 dark:text-indigo-400">
                                {selected.last_played_game}
                              </span>
                            </div>
                          )}
                          {selected.last_played_at && (
                            <div>
                              Last Bet Placed:{" "}
                              <span className="font-bold text-slate-900 dark:text-slate-100">
                                {fmtDateTime(selected.last_played_at)}
                              </span>
                            </div>
                          )}
                        </div>
                      </Card>
                    )}

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
                  <div className="space-y-4">
                    {/* Sub-tab switcher */}
                    <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                      <button
                        type="button"
                        onClick={() => setTxSubTab("all")}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-bold transition",
                          txSubTab === "all"
                            ? "bg-brand-500 text-white shadow-sm"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200"
                        )}
                      >
                        Ledger / Passbook ({userTransactions.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setTxSubTab("deposits")}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-bold transition",
                          txSubTab === "deposits"
                            ? "bg-brand-500 text-white shadow-sm"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200"
                        )}
                      >
                        Deposits ({userDeposits.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setTxSubTab("withdrawals")}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-bold transition",
                          txSubTab === "withdrawals"
                            ? "bg-brand-500 text-white shadow-sm"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200"
                        )}
                      >
                        Withdrawals ({userWithdrawals.length})
                      </button>
                    </div>

                    {txSubTab === "all" && (
                      <Card title={`Wallet Transactions (${userTransactions.length})`} bodyClassName="p-0">
                        {userTransactions.length === 0 ? (
                          <div className="p-8 text-center text-sm text-slate-400">
                            No wallet transactions found for this user.
                          </div>
                        ) : (
                          <DataTable
                            getRowKey={(t) => t.id}
                            rows={userTransactions}
                            columns={[
                              {
                                key: "type",
                                header: "Type",
                                render: (t) => {
                                  const isCredit = ["deposit", "win", "bonus", "referral", "refund", "credit"].some(
                                    (k) => (t.type || "").toLowerCase().includes(k)
                                  );
                                  return (
                                    <Badge color={isCredit ? "emerald" : "red"}>
                                      {t.type || "transaction"}
                                    </Badge>
                                  );
                                },
                              },
                              {
                                key: "description",
                                header: "Particulars / Description",
                                render: (t) => (
                                  <div className="text-xs">
                                    <div className="font-medium text-slate-900 dark:text-slate-100">
                                      {t.description || t.reference_id || "Wallet Transaction"}
                                    </div>
                                    {t.reference_id && t.reference_id !== t.description && (
                                      <div className="text-[10px] text-slate-400 font-mono">Ref: {t.reference_id}</div>
                                    )}
                                  </div>
                                ),
                              },
                              {
                                key: "amount",
                                header: "Amount",
                                render: (t) => {
                                  const isCredit = ["deposit", "win", "bonus", "referral", "refund", "credit"].some(
                                    (k) => (t.type || "").toLowerCase().includes(k)
                                  );
                                  return (
                                    <span className={cn("font-bold font-mono text-xs", isCredit ? "text-emerald-500" : "text-rose-500")}>
                                      {isCredit ? "+" : "-"}₹{fmtMoney(t.amount)}
                                    </span>
                                  );
                                },
                              },
                              {
                                key: "balance_after",
                                header: "Balance After",
                                render: (t) => (
                                  <span className="font-mono text-xs text-slate-600 dark:text-slate-300">
                                    ₹{fmtMoney(t.balance_after)}
                                  </span>
                                ),
                              },
                              {
                                key: "status",
                                header: "Status",
                                render: (t) => (
                                  <Badge color={t.status === "completed" || t.status === "success" ? "emerald" : t.status === "failed" ? "red" : "amber"}>
                                    {t.status || "completed"}
                                  </Badge>
                                ),
                              },
                              {
                                key: "date",
                                header: "Date & Time",
                                render: (t) => (
                                  <span className="text-[11px] text-slate-400 whitespace-nowrap">
                                    {fmtDateTime(t.created_at)}
                                  </span>
                                ),
                              },
                            ]}
                          />
                        )}
                      </Card>
                    )}

                    {txSubTab === "deposits" && (
                      <Card title="Recent Deposits" bodyClassName="p-0">
                        <DataTable
                          getRowKey={(d) => d.id}
                          rows={userDeposits}
                          columns={[
                            { key: "amount", header: "Amount", render: (d) => <span className="text-emerald-400 font-mono font-bold">+{fmtMoney(d.amount)}</span> },
                            { key: "method", header: "Method", render: (d) => d.method || "N/A" },
                            {
                              key: "status", header: "Status", render: (d) => (
                                <Badge color={d.status === "completed" || d.status === "approved" || d.status === "success" ? "emerald" : d.status === "rejected" || d.status === "failed" ? "red" : "amber"}>
                                  {d.status}
                                </Badge>
                              )
                            },
                            { key: "date", header: "Date", render: (d) => fmtDateTime(d.created_at) },
                          ]}
                        />
                      </Card>
                    )}

                    {txSubTab === "withdrawals" && (
                      <Card title="Recent Withdrawals" bodyClassName="p-0">
                        <DataTable
                          getRowKey={(w) => w.id}
                          rows={userWithdrawals}
                          columns={[
                            { key: "amount", header: "Amount", render: (w) => <span className="text-red-400 font-mono font-bold">-{fmtMoney(w.amount)}</span> },
                            { key: "method", header: "Method", render: (w) => w.method || w.bank_details || "N/A" },
                            {
                              key: "status", header: "Status", render: (w) => (
                                <Badge color={w.status === "approved" ? "emerald" : w.status === "rejected" ? "red" : "amber"}>
                                  {w.status}
                                </Badge>
                              )
                            },
                            { key: "date", header: "Date", render: (w) => fmtDateTime(w.requested_at || w.created_at) },
                          ]}
                        />
                      </Card>
                    )}
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
              You are about to permanently delete <b>{deleteTarget.full_name || deleteTarget.username}</b> and ALL of
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
