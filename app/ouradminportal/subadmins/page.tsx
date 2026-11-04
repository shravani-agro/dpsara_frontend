"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  Card,
  Button,
  Input,
  Spinner,
  ErrorMsg,
  PageHeader,
  Badge,
  EmptyState,
} from "@/components/ui";
import { useAuth } from "@/components/AuthProvider";
import {
  getSubAdmins,
  createSubAdmin,
  updateSubAdmin,
  deleteSubAdmin,
  listUsers,
  SubAdmin,
  SubAdminPayload,
} from "@/lib/admin";
import { fmtDateTime } from "@/lib/format";
import { toast } from "@/components/Toast";
import { parseApiError } from "@/lib/error-parser";

interface UserItem {
  id: number;
  username: string;
  phone: string;
  full_name?: string | null;
  wallet_balance?: number;
}

export default function SubAdminsPage() {
  const { isSubAdmin } = useAuth();
  const [subAdmins, setSubAdmins] = useState<SubAdmin[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSubAdmin, setEditingSubAdmin] = useState<SubAdmin | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formUsername, setFormUsername] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [userSearch, setUserSearch] = useState("");

  // Permissions state
  const [perms, setPerms] = useState<Record<string, boolean>>({
    can_add_result: true,
    can_update_result: true,
    can_delete_result: true,
    show_commission: true,
    show_overview: true,
    show_bid_data: true,
    show_result: true,
    show_agent_report: true,
    can_approve_deposit: true,
    can_approve_withdrawal: true,
    can_manage_users: true,
    show_markets: true,
    show_starline: true,
    show_jackpot: true,
    show_support: true,
    show_settings: false,
    show_deposits: true,
    show_withdrawals: true,
    show_bids: true,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [subsData, usersData] = await Promise.all([
        getSubAdmins(),
        listUsers({ limit: 1000 }),
      ]);
      setSubAdmins(subsData || []);
      setUsers(usersData || []);
    } catch (err: any) {
      setError(parseApiError(err, "Failed to load sub-admins or users"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isSubAdmin) {
      loadData();
    }
  }, [isSubAdmin, loadData]);

  const openCreateModal = () => {
    setEditingSubAdmin(null);
    setFormUsername("");
    setFormPassword("");
    setShowPassword(false);
    setSelectedUserIds([]);
    setUserSearch("");
    setPerms({
      can_add_result: true,
      can_update_result: true,
      can_delete_result: true,
      show_commission: true,
      show_overview: true,
      show_bid_data: true,
      show_result: true,
      show_agent_report: true,
      can_approve_deposit: true,
      can_approve_withdrawal: true,
      can_manage_users: true,
      show_markets: true,
      show_starline: true,
      show_jackpot: true,
      show_support: true,
      show_settings: false,
      show_deposits: true,
      show_withdrawals: true,
      show_bids: true,
    });
    setModalOpen(true);
  };

  const openEditModal = (sub: SubAdmin) => {
    setEditingSubAdmin(sub);
    setFormUsername(sub.username);
    setFormPassword(sub.password || "");
    setShowPassword(false);
    const assigned = sub.assigned_user_ids
      ? String(sub.assigned_user_ids).split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    setSelectedUserIds(assigned);
    setUserSearch("");
    setPerms({
      can_add_result: sub.can_add_result ?? true,
      can_update_result: sub.can_update_result ?? true,
      can_delete_result: sub.can_delete_result ?? true,
      show_commission: sub.show_commission ?? true,
      show_overview: sub.show_overview ?? true,
      show_bid_data: sub.show_bid_data ?? true,
      show_result: sub.show_result ?? true,
      show_agent_report: sub.show_agent_report ?? true,
      can_approve_deposit: sub.can_approve_deposit ?? true,
      can_approve_withdrawal: sub.can_approve_withdrawal ?? true,
      can_manage_users: sub.can_manage_users ?? true,
      show_markets: sub.show_markets ?? true,
      show_starline: sub.show_starline ?? true,
      show_jackpot: sub.show_jackpot ?? true,
      show_support: sub.show_support ?? true,
      show_settings: sub.show_settings ?? false,
      show_deposits: sub.show_deposits ?? true,
      show_withdrawals: sub.show_withdrawals ?? true,
      show_bids: sub.show_bids ?? true,
    });
    setModalOpen(true);
  };

  const toggleUserSelection = (userId: number) => {
    const sId = String(userId);
    setSelectedUserIds((prev) =>
      prev.includes(sId) ? prev.filter((id) => id !== sId) : [...prev, sId]
    );
  };

  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return users;
    const q = userSearch.toLowerCase();
    return users.filter(
      (u) =>
        u.username?.toLowerCase().includes(q) ||
        u.phone?.includes(q) ||
        u.full_name?.toLowerCase().includes(q)
    );
  }, [users, userSearch]);

  const selectFilteredUsers = () => {
    const filteredIds = filteredUsers.map((u) => String(u.id));
    setSelectedUserIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
  };

  const deselectFilteredUsers = () => {
    const filteredSet = new Set(filteredUsers.map((u) => String(u.id)));
    setSelectedUserIds((prev) => prev.filter((id) => !filteredSet.has(id)));
  };

  const setAllPermissions = (value: boolean) => {
    const updated: Record<string, boolean> = {};
    Object.keys(perms).forEach((key) => {
      updated[key] = value;
    });
    setPerms(updated);
  };

  const applyPreset = (preset: "all" | "results" | "finance" | "readonly") => {
    if (preset === "all") {
      setAllPermissions(true);
    } else if (preset === "results") {
      setPerms({
        can_add_result: true,
        can_update_result: true,
        can_delete_result: true,
        show_result: true,
        show_overview: true,
        show_bid_data: true,
        show_commission: false,
        show_agent_report: false,
        can_approve_deposit: false,
        can_approve_withdrawal: false,
        can_manage_users: false,
        show_markets: true,
        show_starline: true,
        show_jackpot: true,
        show_support: false,
        show_settings: false,
        show_deposits: false,
        show_withdrawals: false,
        show_bids: true,
      });
    } else if (preset === "finance") {
      setPerms({
        can_add_result: false,
        can_update_result: false,
        can_delete_result: false,
        show_result: false,
        show_overview: true,
        show_bid_data: false,
        show_commission: true,
        show_agent_report: true,
        can_approve_deposit: true,
        can_approve_withdrawal: true,
        can_manage_users: true,
        show_markets: false,
        show_starline: false,
        show_jackpot: false,
        show_support: true,
        show_settings: false,
        show_deposits: true,
        show_withdrawals: true,
        show_bids: true,
      });
    } else if (preset === "readonly") {
      setPerms({
        can_add_result: false,
        can_update_result: false,
        can_delete_result: false,
        show_result: true,
        show_overview: true,
        show_bid_data: true,
        show_commission: true,
        show_agent_report: true,
        can_approve_deposit: false,
        can_approve_withdrawal: false,
        can_manage_users: true,
        show_markets: true,
        show_starline: true,
        show_jackpot: true,
        show_support: true,
        show_settings: false,
        show_deposits: true,
        show_withdrawals: true,
        show_bids: true,
      });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formUsername.trim()) {
      toast.error("Please enter a username for the sub-admin");
      return;
    }
    if (!editingSubAdmin && !formPassword.trim()) {
      toast.error("Please enter a password for the sub-admin");
      return;
    }

    setSaving(true);
    try {
      const payload: SubAdminPayload = {
        username: formUsername.trim(),
        assigned_user_ids: selectedUserIds.join(","),
        ...perms,
      };
      if (formPassword.trim()) {
        payload.password = formPassword.trim();
      }

      if (editingSubAdmin) {
        await updateSubAdmin(editingSubAdmin.id, payload);
        toast.success(`Sub-Admin '${formUsername}' updated successfully`);
      } else {
        await createSubAdmin(payload);
        toast.success(`Sub-Admin '${formUsername}' created successfully`);
      }

      setModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(parseApiError(err, "Failed to save sub-admin"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (sub: SubAdmin) => {
    if (!confirm(`Are you sure you want to permanently delete sub-admin '${sub.username}'?`)) {
      return;
    }
    try {
      await deleteSubAdmin(sub.id);
      toast.success(`Sub-Admin '${sub.username}' deleted successfully`);
      loadData();
    } catch (err: any) {
      toast.error(parseApiError(err, "Failed to delete sub-admin"));
    }
  };

  if (isSubAdmin) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
        <span className="text-4xl">🛡️</span>
        <h2 className="mt-4 text-xl font-bold text-slate-800 dark:text-slate-100">Access Restricted</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Sub-admin accounts cannot view or manage other sub-admin credentials.
        </p>
      </div>
    );
  }

  const activePermsCount = (sub: SubAdmin) => {
    const permKeys = [
      "can_add_result", "can_update_result", "can_delete_result",
      "show_commission", "show_overview", "show_bid_data",
      "show_result", "show_agent_report", "can_approve_deposit",
      "can_approve_withdrawal", "can_manage_users", "show_markets",
      "show_starline", "show_jackpot", "show_support", "show_deposits",
      "show_withdrawals", "show_bids"
    ];
    return permKeys.filter((k) => (sub as any)[k] === true).length;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sub Admins Management"
        description="Create subordinate administrator accounts, assign specific users, and customize modular permissions."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
              ↻ Refresh
            </Button>
            <Button size="sm" onClick={openCreateModal} className="bg-brand-600 hover:bg-brand-500 text-white shadow-glow">
              + Create Sub-Admin
            </Button>
          </div>
        }
      />

      {error && <ErrorMsg msg={error} />}

      {/* Overview Statistics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5 border-l-4 border-l-brand-500">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Sub-Admins</p>
          <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{subAdmins.length}</p>
          <p className="mt-1 text-xs text-slate-500">Authorized subordinate operators</p>
        </Card>
        <Card className="p-5 border-l-4 border-l-emerald-500">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Result Operators</p>
          <p className="mt-2 text-3xl font-bold text-emerald-500">
            {subAdmins.filter((s) => s.can_add_result || s.can_update_result).length}
          </p>
          <p className="mt-1 text-xs text-slate-500">Granted result declaration rights</p>
        </Card>
        <Card className="p-5 border-l-4 border-l-amber-500">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Finance Operators</p>
          <p className="mt-2 text-3xl font-bold text-amber-500">
            {subAdmins.filter((s) => s.can_approve_deposit || s.can_approve_withdrawal).length}
          </p>
          <p className="mt-1 text-xs text-slate-500">Can approve deposits / withdrawals</p>
        </Card>
      </div>

      {/* Sub-Admins Table */}
      <Card className="overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner />
          </div>
        ) : subAdmins.length === 0 ? (
          <EmptyState
            title="No sub-admins created yet"
            hint="Click '+ Create Sub-Admin' to set up a new portal operator with assigned users and granular permissions."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-3.5">Sub-Admin</th>
                  <th className="px-5 py-3.5">Assigned Users</th>
                  <th className="px-5 py-3.5">Key Permissions</th>
                  <th className="px-5 py-3.5">Created Date</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {subAdmins.map((sub) => {
                  const assignedCount = sub.assigned_user_ids
                    ? String(sub.assigned_user_ids).split(",").filter(Boolean).length
                    : 0;

                  return (
                    <tr
                      key={sub.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-brand-500/20 text-brand-500 dark:text-brand-400 font-bold text-sm ring-1 ring-brand-500/20">
                            {sub.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 dark:text-slate-100">
                              {sub.username}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[11px] text-slate-400 font-mono">ID: #{sub.id}</span>
                              <Badge color="slate">Sub-Admin</Badge>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        {assignedCount > 0 ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 border border-brand-200/60 dark:border-brand-800/40 text-xs font-semibold">
                            <span>👤</span>
                            <span>{assignedCount} Assigned User{assignedCount !== 1 ? "s" : ""}</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40 text-xs font-semibold">
                            <span>🌐</span>
                            <span>All Users (Unrestricted)</span>
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1 max-w-md">
                          {sub.can_add_result && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40">
                              + Results
                            </span>
                          )}
                          {sub.can_update_result && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-cyan-50 text-cyan-700 border border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800/40">
                              Edit Results
                            </span>
                          )}
                          {sub.can_delete_result && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40">
                              Delete Results
                            </span>
                          )}
                          {sub.can_approve_deposit && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40">
                              Approve Deposits
                            </span>
                          )}
                          {sub.can_approve_withdrawal && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40">
                              Approve Withdrawals
                            </span>
                          )}
                          {sub.show_bid_data && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/40">
                              Bid Data
                            </span>
                          )}
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                            {activePermsCount(sub)}/18 Granted
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-xs text-slate-500 dark:text-slate-400 font-mono">
                        {fmtDateTime(sub.created_at)}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditModal(sub)}
                            className="h-8 px-2.5 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800"
                          >
                            ✏ Edit & Permissions
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(sub)}
                            className="h-8 px-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-200 dark:border-rose-800"
                            title="Delete Sub-Admin"
                          >
                            🗑
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  {editingSubAdmin ? `Edit Sub-Admin: ${editingSubAdmin.username}` : "Create New Sub-Admin"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Set login credentials, assign users, and toggle permissions just like Kalyan36Bazar.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              {/* Credentials Grid */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Sub-Admin Username *
                  </label>
                  <Input
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    placeholder="e.g. operator_rahul"
                    required
                    className="h-10"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    {editingSubAdmin ? "Password (leave blank to keep current)" : "Password *"}
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder={editingSubAdmin ? "Leave blank to keep unchanged" : "Enter password"}
                      required={!editingSubAdmin}
                      className="h-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? "🙈" : "👁"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Assign Users Section (Matching Kalyan36Bazar UserMultiSelect) */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-850/30 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>👤</span>
                        <span>Assign Users to Sub-Admin</span>
                      </h4>
                      {selectedUserIds.length === 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                          <span>🌐</span>
                          <span>Shows All Users (When Not Selected)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-brand-100 text-brand-800 dark:bg-brand-950/60 dark:text-brand-300 border border-brand-300 dark:border-brand-800">
                          <span>👤</span>
                          <span>{selectedUserIds.length} Specific Users Assigned</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      When no users are selected, this sub-admin sees <strong>ALL users</strong> across the portal. Check specific users below only if you want to restrict them.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-medium shrink-0">
                    <button
                      type="button"
                      onClick={selectFilteredUsers}
                      className="text-brand-600 dark:text-brand-400 hover:underline"
                    >
                      Select Filtered
                    </button>
                    <span className="text-slate-300 dark:text-slate-700">|</span>
                    <button
                      type="button"
                      onClick={deselectFilteredUsers}
                      className="text-slate-500 hover:underline"
                    >
                      Deselect Filtered
                    </button>
                    <span className="text-slate-300 dark:text-slate-700">|</span>
                    <button
                      type="button"
                      onClick={() => setSelectedUserIds([])}
                      className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
                      title="Clear selection to allow access to all users"
                    >
                      🌐 Allow All Users (Clear)
                    </button>
                  </div>
                </div>

                {selectedUserIds.length === 0 && (
                  <div className="px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                    <span>💡</span>
                    <span>
                      <strong>Notice:</strong> Currently no users are selected. This sub-admin will have full access to view and manage <strong>ALL players</strong>.
                    </span>
                  </div>
                )}

                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">🔍</span>
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search users by name, phone or username..."
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 pl-9 pr-3 text-sm placeholder:text-slate-400 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-56 overflow-y-auto p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-inner">
                  {filteredUsers.slice(0, 150).map((user) => {
                    const isChecked = selectedUserIds.includes(String(user.id));
                    return (
                      <label
                        key={user.id}
                        className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-colors border text-left ${
                          isChecked
                            ? "bg-brand-50/80 dark:bg-brand-950/40 border-brand-300 dark:border-brand-800"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800/60 border-slate-100 dark:border-slate-800"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleUserSelection(user.id)}
                          className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                        />
                        <div className="min-w-0 flex-1 text-xs">
                          <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {user.full_name || user.username}
                          </p>
                          <p className="text-slate-400 truncate">
                            {user.phone} · ₹{user.wallet_balance ?? 0}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                  {filteredUsers.length === 0 && (
                    <div className="col-span-full py-6 text-center text-xs text-slate-400 italic">
                      No users match "{userSearch}"
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>
                    <strong>{selectedUserIds.length}</strong> of {users.length} users selected
                  </span>
                  {selectedUserIds.length > 0 && (
                    <span className="text-brand-600 dark:text-brand-400 font-semibold">
                      ✓ Sub-Admin will be restricted to these {selectedUserIds.length} users
                    </span>
                  )}
                </div>
              </div>

              {/* Permissions Section (Matching Kalyan36Bazar PermissionSelect + Extended) */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-850/30 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>🛡️</span>
                      <span>Sub-Admin Modular Permissions</span>
                    </h4>
                    <p className="text-xs text-slate-500">
                      Toggle exact feature permissions for this sub-admin.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    <button
                      type="button"
                      onClick={() => applyPreset("all")}
                      className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-300"
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset("results")}
                      className="px-2 py-1 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-medium hover:bg-emerald-200"
                    >
                      Results Operator
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset("finance")}
                      className="px-2 py-1 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-medium hover:bg-amber-200"
                    >
                      Finance Operator
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset("readonly")}
                      className="px-2 py-1 rounded bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 font-medium hover:bg-indigo-200"
                    >
                      View Only
                    </button>
                  </div>
                </div>

                {/* Category 1: Results Declarations */}
                <div>
                  <h5 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2">
                    🎯 Results Management
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    {[
                      { key: "can_add_result", label: "Add / Declare Result", desc: "Allow declaring opening/closing market results" },
                      { key: "can_update_result", label: "Update Result", desc: "Allow editing already declared results" },
                      { key: "can_delete_result", label: "Delete / Rollback Result", desc: "Allow rolling back and voiding declared results" },
                      { key: "show_result", label: "Show Results Section", desc: "View results management page in sidebar" },
                    ].map((item) => (
                      <label
                        key={item.key}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition ${
                          perms[item.key]
                            ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/60"
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-60"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={!!perms[item.key]}
                          onChange={(e) => setPerms({ ...perms, [item.key]: e.target.checked })}
                          className="mt-0.5 h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{item.label}</p>
                          <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{item.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Category 2: Finance & Payments */}
                <div>
                  <h5 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-2">
                    💸 Deposits & Withdrawals
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    {[
                      { key: "can_approve_deposit", label: "Approve Deposits", desc: "Manually approve pending deposits & credit wallet" },
                      { key: "show_deposits", label: "View Deposits Queue", desc: "Access the deposits page in sidebar" },
                      { key: "can_approve_withdrawal", label: "Approve Withdrawals", desc: "Approve and process user withdrawal payouts" },
                      { key: "show_withdrawals", label: "View Withdrawals Queue", desc: "Access the withdrawals page in sidebar" },
                    ].map((item) => (
                      <label
                        key={item.key}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition ${
                          perms[item.key]
                            ? "bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/60"
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-60"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={!!perms[item.key]}
                          onChange={(e) => setPerms({ ...perms, [item.key]: e.target.checked })}
                          className="mt-0.5 h-4 w-4 rounded text-amber-600 focus:ring-amber-500"
                        />
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{item.label}</p>
                          <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{item.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Category 3: Analytics, Bids & Operations */}
                <div>
                  <h5 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-2">
                    📊 Bids, Games & Operations
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    {[
                      { key: "show_overview", label: "Show Dashboard", desc: "Overview cards & high-level stats" },
                      { key: "can_manage_users", label: "Manage Users", desc: "View and edit user details & balances" },
                      { key: "show_bids", label: "Bids History", desc: "Access regular and starline bets history" },
                      { key: "show_bid_data", label: "Real-Time Bid Data", desc: "Examine live bet distribution & risk sheets" },
                      { key: "show_commission", label: "Collection & P/L", desc: "View today collection and ledger reports" },
                      { key: "show_agent_report", label: "Agent Report", desc: "Access agent performance breakdowns" },
                      { key: "show_markets", label: "Regular Markets", desc: "View market timings and settings" },
                      { key: "show_starline", label: "Starline Markets", desc: "Access Starline game operations" },
                      { key: "show_jackpot", label: "Jackpot Markets", desc: "Access Jackpot game operations" },
                      { key: "show_support", label: "Support Chat", desc: "Chat with users and reply to queries" },
                    ].map((item) => (
                      <label
                        key={item.key}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition ${
                          perms[item.key]
                            ? "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-300 dark:border-indigo-800/60"
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-60"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={!!perms[item.key]}
                          onChange={(e) => setPerms({ ...perms, [item.key]: e.target.checked })}
                          className="mt-0.5 h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{item.label}</p>
                          <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{item.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-brand-600 hover:bg-brand-500 text-white min-w-[140px]"
                >
                  {saving ? "Saving..." : editingSubAdmin ? "Save Changes" : "Create Sub-Admin"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

