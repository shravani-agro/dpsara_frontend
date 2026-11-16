"use client";

import React, { useEffect, useState, useCallback } from "react";
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
  SubAdmin,
  SubAdminPayload,
} from "@/lib/admin";
import { fmtDateTime } from "@/lib/format";
import { toast } from "@/components/Toast";
import { parseApiError } from "@/lib/error-parser";

const PERMISSION_CONFIG = [
  {
    key: "show_bid_data",
    icon: "📊",
    label: "Main Bid Live Data",
    desc: "View live incoming bets & real-time aggregated bid sheets for Main markets (/regular-bids)",
    color: "blue",
  },
  {
    key: "show_result",
    icon: "🎯",
    label: "Main Result Uploading",
    desc: "Declare and upload open/close results and winning numbers for Main markets (/results)",
    color: "amber",
  },
  {
    key: "show_starline_bids",
    icon: "📈",
    label: "Starline Live Bid Data",
    desc: "View real-time live bets & bid figures for Starline hourly markets (/starline-bids)",
    color: "indigo",
  },
  {
    key: "show_starline",
    icon: "⭐",
    label: "Starline Result Uploading",
    desc: "Declare and upload hourly winning pana/digit results for Starline games (/starline)",
    color: "purple",
  },
  {
    key: "show_jackpot_bids",
    icon: "📊",
    label: "Jackpot Live Bid Data",
    desc: "View real-time live bets & bid figures for Jackpot hourly markets (/jackpot-bids)",
    color: "violet",
  },
  {
    key: "show_jackpot",
    icon: "💰",
    label: "Jackpot Result Uploading",
    desc: "Declare and upload hourly triple pana results for Jackpot games (/jackpot)",
    color: "emerald",
  },
  {
    key: "show_realspinpro",
    icon: "🎡",
    label: "RealSpinPro Game Access",
    desc: "Allow access to RealSpinPro live wheel game console & bets history (/realspinpro)",
    color: "rose",
  },
];

export default function SubAdminsPage() {
  const { isSubAdmin } = useAuth();
  const [subAdmins, setSubAdmins] = useState<SubAdmin[]>([]);
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

  // Permissions state
  const [perms, setPerms] = useState<Record<string, boolean>>({
    show_bid_data: true,
    show_result: true,
    show_starline_bids: true,
    show_starline: true,
    show_jackpot_bids: true,
    show_jackpot: true,
    show_realspinpro: false,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const subsData = await getSubAdmins();
      setSubAdmins(subsData || []);
    } catch (err: any) {
      setError(parseApiError(err, "Failed to load sub-admins"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreateModal = () => {
    setEditingSubAdmin(null);
    setFormUsername("");
    setFormPassword("");
    setShowPassword(false);
    setPerms({
      show_bid_data: true,
      show_result: true,
      show_starline_bids: true,
      show_starline: true,
      show_jackpot_bids: true,
      show_jackpot: true,
      show_realspinpro: false,
    });
    setModalOpen(true);
  };

  const openEditModal = (sub: SubAdmin) => {
    setEditingSubAdmin(sub);
    setFormUsername(sub.username);
    setFormPassword(sub.password || "");
    setShowPassword(false);
    setPerms({
      show_bid_data: sub.show_bid_data ?? true,
      show_result: sub.show_result ?? true,
      show_starline_bids: sub.show_starline_bids ?? true,
      show_starline: sub.show_starline ?? true,
      show_jackpot_bids: sub.show_jackpot_bids ?? true,
      show_jackpot: sub.show_jackpot ?? true,
      show_realspinpro: sub.show_realspinpro ?? false,
    });
    setModalOpen(true);
  };

  const setAllPermissions = (value: boolean) => {
    setPerms({
      show_bid_data: value,
      show_result: value,
      show_starline_bids: value,
      show_starline: value,
      show_jackpot_bids: value,
      show_jackpot: value,
      show_realspinpro: value,
    });
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
        assigned_user_ids: "", // Sub-admins never have individual player scoping
        // Explicitly allowed modular permissions
        show_bid_data: !!perms.show_bid_data,
        show_result: !!perms.show_result,
        can_add_result: !!perms.show_result,
        can_update_result: !!perms.show_result,
        can_delete_result: false,
        show_starline_bids: !!perms.show_starline_bids,
        show_starline: !!perms.show_starline,
        show_jackpot_bids: !!perms.show_jackpot_bids,
        show_jackpot: !!perms.show_jackpot,
        show_realspinpro: !!perms.show_realspinpro,
        // All sensitive user management & finance permissions stripped
        show_commission: false,
        show_overview: false,
        show_agent_report: false,
        can_approve_deposit: false,
        can_approve_withdrawal: false,
        can_manage_users: false,
        show_markets: false,
        show_support: false,
        show_settings: false,
        show_deposits: false,
        show_withdrawals: false,
        show_bids: false,
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
    return PERMISSION_CONFIG.filter((cfg) => (sub as any)[cfg.key] === true).length;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sub Admins Management"
        description="Create and manage subordinate operator accounts with modular permissions for live bids and result uploading."
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
          <p className="mt-1 text-xs text-slate-500">Configured portal operators</p>
        </Card>
        <Card className="p-5 border-l-4 border-l-emerald-500">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Result Operators</p>
          <p className="mt-2 text-3xl font-bold text-emerald-500">
            {subAdmins.filter((s) => s.show_result || s.show_starline || s.show_jackpot).length}
          </p>
          <p className="mt-1 text-xs text-slate-500">Granted result declaration permissions</p>
        </Card>
        <Card className="p-5 border-l-4 border-l-blue-500">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Live Bids Monitors</p>
          <p className="mt-2 text-3xl font-bold text-blue-500">
            {subAdmins.filter((s) => s.show_bid_data || s.show_starline_bids || s.show_jackpot_bids).length}
          </p>
          <p className="mt-1 text-xs text-slate-500">Can view live incoming market figures</p>
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
            hint="Click '+ Create Sub-Admin' to set up a new portal operator with tailored live bids and result permissions."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-3.5">Sub-Admin</th>
                  <th className="px-5 py-3.5">Granted Permissions</th>
                  <th className="px-5 py-3.5">Created Date</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {subAdmins.map((sub) => {
                  const totalGranted = activePermsCount(sub);
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
                        <div className="flex flex-wrap gap-1.5 max-w-xl">
                          {sub.show_bid_data && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40">
                              <span>📊</span> Main Live Bids
                            </span>
                          )}
                          {sub.show_result && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40">
                              <span>🎯</span> Main Results
                            </span>
                          )}
                          {sub.show_starline_bids && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/40">
                              <span>📈</span> Starline Live Bids
                            </span>
                          )}
                          {sub.show_starline && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/40">
                              <span>⭐</span> Starline Results
                            </span>
                          )}
                          {sub.show_jackpot_bids && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800/40">
                              <span>📊</span> Jackpot Live Bids
                            </span>
                          )}
                          {sub.show_jackpot && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40">
                              <span>💰</span> Jackpot Results
                            </span>
                          )}
                          {sub.show_realspinpro && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40">
                              <span>🎡</span> RealSpinPro
                            </span>
                          )}
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                            {totalGranted}/{PERMISSION_CONFIG.length} Allowed
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
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  {editingSubAdmin ? `Edit Sub-Admin: ${editingSubAdmin.username}` : "Create New Sub-Admin"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Set login credentials and choose permissions for live bid data and result uploading.
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

              {/* Modular Permissions Section */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-850/30 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>🛡️</span>
                      <span>Sub-Admin Permissions</span>
                    </h4>
                    <p className="text-xs text-slate-500">
                      Enable or disable access to live market sheets and game result declaring.
                    </p>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setAllPermissions(true)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-semibold hover:bg-emerald-200 transition"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => setAllPermissions(false)}
                      className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-300 transition"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {PERMISSION_CONFIG.map((item) => {
                    const isChecked = !!perms[item.key];
                    return (
                      <label
                        key={item.key}
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition shadow-sm ${
                          isChecked
                            ? "bg-brand-50/50 dark:bg-brand-950/20 border-brand-300 dark:border-brand-800/60"
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-60 hover:opacity-100"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => setPerms({ ...perms, [item.key]: e.target.checked })}
                          className="mt-1 h-4 w-4 rounded text-brand-600 focus:ring-brand-500"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <span>{item.icon}</span>
                            <span>{item.label}</span>
                          </p>
                          <p className="text-[11px] text-slate-400 leading-snug mt-1">{item.desc}</p>
                        </div>
                      </label>
                    );
                  })}
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
