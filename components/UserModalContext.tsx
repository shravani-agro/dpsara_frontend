"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { SlideOver, Card, Badge, Button, Spinner, Tabs, Field } from "@/components/ui";
import { WhatsAppLink } from "@/components/WhatsAppLink";
import { UserBetsManager } from "@/components/UserBetsManager";
import {
  getUserDetailed,
  listBids,
  listDeposits,
  listWithdrawals,
  toggleUserActive,
  addUserBonus,
  deductUserFunds,
  resetUserPassword,
} from "@/lib/admin";
import { fmtMoney, fmtNum, fmtDate, fmtDateTime } from "@/lib/format";
import { toast } from "@/components/Toast";
import { parseApiError } from "@/lib/error-parser";

interface UserHint {
  username?: string;
  phone?: string;
  mobile_number?: string;
  full_name?: string;
}

interface UserModalContextType {
  openUser: (userId: number, hint?: UserHint) => void;
  closeUser: () => void;
}

const UserModalContext = createContext<UserModalContextType>({
  openUser: () => {},
  closeUser: () => {},
});

export const useUserModal = () => useContext(UserModalContext);

export function UserModalProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<number | null>(null);
  const [userHint, setUserHint] = useState<UserHint | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [bids, setBids] = useState<any[]>([]);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Actions state
  const [showBonusModal, setShowBonusModal] = useState(false);
  const [bonusAmount, setBonusAmount] = useState("");
  const [bonusNote, setBonusNote] = useState("Bonus credited");

  const [showDeductModal, setShowDeductModal] = useState(false);
  const [deductAmount, setDeductAmount] = useState("");
  const [deductNote, setDeductNote] = useState("Manual deduction");

  const [showResetModal, setShowResetModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const openUser = (id: number, hint?: UserHint) => {
    setUserId(id);
    setUserHint(hint || null);
    setDetail(null);
    setBids([]);
    setDeposits([]);
    setWithdrawals([]);
    setActiveTab("overview");
  };

  const closeUser = () => {
    setUserId(null);
    setUserHint(null);
    setDetail(null);
  };

  const loadUserData = async (id: number) => {
    setLoading(true);
    try {
      const [d, b, dep, w] = await Promise.all([
        getUserDetailed(id).catch(() => null),
        listBids({ user_id: id, limit: 150 }).catch(() => []),
        listDeposits({ user_id: id, limit: 50 }).catch(() => []),
        listWithdrawals({ user_id: id, limit: 50 }).catch(() => []),
      ]);
      setDetail(d);
      setBids(b);
      setDeposits(dep);
      setWithdrawals(w);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      loadUserData(userId);
    }
  }, [userId]);

  const handleToggleActive = async () => {
    if (!userId) return;
    try {
      const res = await toggleUserActive(userId);
      toast.success(`User ${res.is_active ? "activated" : "suspended"}`);
      setDetail((prev: any) => (prev ? { ...prev, is_active: res.is_active } : null));
    } catch (e: any) {
      toast.error(parseApiError(e, "Failed to toggle status"));
    }
  };

  const handleBonusSubmit = async () => {
    if (!userId || !bonusAmount || isNaN(Number(bonusAmount))) return;
    setActionLoading(true);
    try {
      await addUserBonus(userId, parseFloat(bonusAmount), bonusNote);
      toast.success(`₹${fmtNum(bonusAmount)} credited to user!`);
      setShowBonusModal(false);
      setBonusAmount("");
      loadUserData(userId);
    } catch (e: any) {
      toast.error(parseApiError(e, "Failed to add bonus"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeductSubmit = async () => {
    if (!userId || !deductAmount || isNaN(Number(deductAmount))) return;
    setActionLoading(true);
    try {
      await deductUserFunds(userId, parseFloat(deductAmount), deductNote);
      toast.success(`₹${fmtNum(deductAmount)} deducted from user.`);
      setShowDeductModal(false);
      setDeductAmount("");
      loadUserData(userId);
    } catch (e: any) {
      toast.error(parseApiError(e, "Failed to deduct funds"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!userId || !newPassword) return;
    setActionLoading(true);
    try {
      await resetUserPassword(userId, newPassword);
      toast.success("Password updated successfully!");
      setShowResetModal(false);
      setNewPassword("");
    } catch (e: any) {
      toast.error(parseApiError(e, "Failed to reset password"));
    } finally {
      setActionLoading(false);
    }
  };

  const copyText = (txt: string, label: string) => {
    navigator.clipboard.writeText(txt);
    toast.success(`${label} copied!`);
  };

  const uPhone = detail?.mobile_number || detail?.phone || userHint?.mobile_number || userHint?.phone || "";
  const uName = detail?.full_name || detail?.username || userHint?.full_name || userHint?.username || `User #${userId}`;
  const uInitial = (uName[0] || "U").toUpperCase();
  const uBalance = Number(detail?.wallet_balance ?? 0);

  const tabs = [
    { id: "overview", label: "Overview", icon: "👤" },
    { id: "bets", label: `Bets (${bids.length})`, icon: "🎯" },
    { id: "finance", label: "Finance & Logs", icon: "💳" },
    { id: "actions", label: "Manage", icon: "⚙️" },
  ];

  return (
    <UserModalContext.Provider value={{ openUser, closeUser }}>
      {children}

      <SlideOver
        open={!!userId}
        onClose={closeUser}
        title={
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-brand-600 text-sm font-bold text-white shadow-sm">
              {uInitial}
            </div>
            <div className="min-w-0">
              <div className="truncate font-bold text-slate-900 dark:text-slate-100 text-base">{uName}</div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>ID #{userId}</span>
                {detail?.is_active !== undefined && (
                  <Badge color={detail.is_active ? "emerald" : "red"}>
                    {detail.is_active ? "Active" : "Suspended"}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        }
      >
        <div className="space-y-5 pb-8">
          {/* Quick Contact & WhatsApp Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-brand-500/10 to-transparent border border-emerald-500/20">
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Direct Contact
              </span>
              <div className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>📱 {uPhone || "No phone added"}</span>
                {uPhone && (
                  <button
                    type="button"
                    onClick={() => copyText(uPhone, "Phone number")}
                    className="text-xs text-slate-400 hover:text-slate-700"
                    title="Copy phone"
                  >
                    📋
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {uPhone && (
                <>
                  <WhatsAppLink
                    phone={uPhone}
                    userName={uName}
                    variant="pill"
                    message={`Hello ${uName}, this is regarding your platform account.`}
                  />
                  <a
                    href={`tel:${uPhone}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800 hover:bg-sky-100 transition active:scale-95"
                    title="Direct Call"
                  >
                    <span>📞</span>
                    <span className="hidden sm:inline">Call</span>
                  </a>
                </>
              )}
            </div>
          </div>

          {/* Quick Balance & Net P&L Card */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Balance</span>
              <div className="mt-1 font-mono text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">
                {fmtMoney(uBalance)}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Deposits</span>
              <div className="mt-1 font-mono text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
                {fmtMoney(detail?.total_deposits ?? 0)}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Payouts</span>
              <div className="mt-1 font-mono text-base sm:text-lg font-black text-rose-600 dark:text-rose-400">
                {fmtMoney(detail?.total_withdrawals ?? 0)}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Won</span>
              <div className="mt-1 font-mono text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">
                {fmtMoney(detail?.total_wins ?? 0)}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

          {loading ? (
            <div className="p-8"><Spinner /></div>
          ) : (
            <div className="animate-fade-in space-y-4">
              {/* TAB 1: OVERVIEW */}
              {activeTab === "overview" && (
                <div className="space-y-4">
                  <Card title="Account Profile">
                    <div className="grid grid-cols-2 gap-3.5 text-xs">
                      <Field label="Username" value={detail?.username || userHint?.username || "—"} />
                      <Field label="Full Name" value={detail?.full_name || userHint?.full_name || "—"} />
                      <Field label="Phone" value={uPhone || "—"} />
                      <Field label="Joined Date" value={detail?.created_at ? fmtDate(detail.created_at) : "—"} />
                      <Field label="State" value={detail?.state || "—"} />
                      <Field label="City" value={detail?.city || "—"} />
                      <Field label="PIN Code" value={detail?.postal_pin || "—"} />
                      <Field label="Language" value={detail?.language || "English"} />
                    </div>
                  </Card>

                  {detail && (
                    <Card title="Activity & Betting Totals">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <Field label="Total Bets" value={fmtNum(detail.total_bets ?? bids.length)} />
                        <Field label="Total Wins" value={fmtMoney(detail.total_wins ?? 0)} />
                        <Field label="Net Win/Loss" value={fmtMoney((detail.total_wins ?? 0) - (detail.total_bets_amount ?? 0))} />
                        <Field label="Net Deposits" value={fmtMoney((detail.total_deposits ?? 0) - (detail.total_withdrawals ?? 0))} />
                      </div>
                    </Card>
                  )}
                </div>
              )}

              {/* TAB 2: RECENT BETS */}
              {activeTab === "bets" && (
                <UserBetsManager bids={bids} />
              )}

              {/* TAB 3: FINANCE & LOGS */}
              {activeTab === "finance" && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Recent Deposits & Withdrawals</h4>
                  <div className="space-y-2">
                    {[
                      ...deposits.map((d) => ({
                        id: `dep-${d.id}`,
                        type: "Deposit",
                        amount: d.amount,
                        status: d.status,
                        date: d.created_at,
                        isCredit: true,
                      })),
                      ...withdrawals.map((w) => ({
                        id: `wit-${w.id}`,
                        type: "Withdrawal",
                        amount: w.amount,
                        status: w.status,
                        date: w.requested_at || w.created_at,
                        isCredit: false,
                      })),
                    ]
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 text-xs"
                        >
                          <div>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{item.type}</span>
                            <p className="text-[10px] text-slate-400 mt-0.5">{fmtDateTime(item.date)}</p>
                          </div>
                          <div className="text-right">
                            <span
                              className={`font-mono font-bold ${
                                item.isCredit ? "text-emerald-600" : "text-rose-600"
                              }`}
                            >
                              {item.isCredit ? "+" : "-"}
                              {fmtMoney(item.amount)}
                            </span>
                            <div>
                              <Badge color={item.status === "completed" || item.status === "processed" ? "emerald" : "amber"}>
                                {item.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* TAB 4: ACTIONS & MANAGEMENT */}
              {activeTab === "actions" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <Button
                      variant="primary"
                      onClick={() => setShowBonusModal(true)}
                      className="w-full text-xs font-bold"
                    >
                      ➕ Credit Bonus / Funds
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => setShowDeductModal(true)}
                      className="w-full text-xs font-bold"
                    >
                      ➖ Deduct Wallet Balance
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleToggleActive}
                      className="w-full text-xs font-bold"
                    >
                      {detail?.is_active ? "🚫 Suspend Account" : "✅ Activate Account"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowResetModal(true)}
                      className="w-full text-xs font-bold"
                    >
                      🔑 Reset Password
                    </Button>
                  </div>

                  <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                    <a
                      href={`/ouradminportal/users`}
                      className="block text-center py-2 px-4 rounded-xl border border-brand-500/30 text-brand-600 dark:text-brand-400 text-xs font-bold hover:bg-brand-50 dark:hover:bg-brand-950/20 transition"
                    >
                      View in Main Users Directory →
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </SlideOver>

      {/* Credit Bonus Modal */}
      {showBonusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-xl">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Credit Funds to {uName}</h3>
            <div>
              <label className="text-xs text-slate-500 font-medium">Amount (₹)</label>
              <input
                type="number"
                placeholder="500"
                value={bonusAmount}
                onChange={(e) => setBonusAmount(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-sm font-mono font-bold"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium">Description</label>
              <input
                type="text"
                value={bonusNote}
                onChange={(e) => setBonusNote(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setShowBonusModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" loading={actionLoading} onClick={handleBonusSubmit}>
                Confirm Credit
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Deduct Funds Modal */}
      {showDeductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-xl">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Deduct Funds from {uName}</h3>
            <div>
              <label className="text-xs text-slate-500 font-medium">Amount to Deduct (₹)</label>
              <input
                type="number"
                placeholder="100"
                value={deductAmount}
                onChange={(e) => setDeductAmount(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-sm font-mono font-bold text-rose-600"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium">Reason</label>
              <input
                type="text"
                value={deductNote}
                onChange={(e) => setDeductNote(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setShowDeductModal(false)}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" loading={actionLoading} onClick={handleDeductSubmit}>
                Confirm Deduction
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-xl">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Reset Password for {uName}</h3>
            <div>
              <label className="text-xs text-slate-500 font-medium">New Password</label>
              <input
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setShowResetModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" loading={actionLoading} onClick={handleResetPassword}>
                Save Password
              </Button>
            </div>
          </div>
        </div>
      )}
    </UserModalContext.Provider>
  );
}
