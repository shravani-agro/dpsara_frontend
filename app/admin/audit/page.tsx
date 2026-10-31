"use client";

import { fmtDateTime } from "@/lib/format";

import React, { useEffect, useState } from "react";
import { Card, Button, Input, Select, Spinner, ErrorMsg, PageHeader, Badge, EmptyState } from "@/components/ui";
import { getAuditLogs } from "@/lib/admin";
import { parseApiError } from "@/lib/error-parser";

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionType, setActionType] = useState("");
  const [adminId, setAdminId] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params: any = { limit: 200 };
      if (actionType) params.action_type = actionType;
      if (adminId) params.admin_id = adminId;
      setLogs(await getAuditLogs(params));
    } catch (e: any) {
      setError(parseApiError(e, "Failed to load audit logs"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="Audit Logs" description="Chronological record of admin actions" />

      <ErrorMsg msg={error} />

      <Card>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Input placeholder="Admin ID" value={adminId} onChange={(e) => setAdminId(e.target.value)} />
          <Input placeholder="Action type (e.g. update_user_vip)" value={actionType} onChange={(e) => setActionType(e.target.value)} />
          <Button onClick={load}>Filter</Button>
        </div>
      </Card>

      <Card title={`${logs.length} actions`} bodyClassName="p-0">
        {loading ? (
          <div className="p-4"><Spinner /></div>
        ) : logs.length === 0 ? (
          <EmptyState title="No audit logs found" />
        ) : (
          <div className="table-wrap">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="py-2.5">ID</th>
                  <th>Admin</th>
                  <th>Action</th>
                  <th>Endpoint</th>
                  <th>IP</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="py-3 text-slate-400">{l.id}</td>
                    <td className="font-medium text-slate-900">{l.admin_id}</td>
                    <td><Badge color="violet" className="font-mono">{l.action_type}</Badge></td>
                    <td className="text-slate-400">{l.endpoint || "—"}</td>
                    <td className="text-slate-400">{l.ip_address || "—"}</td>
                    <td className="text-slate-400">{fmtDateTime(l.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
