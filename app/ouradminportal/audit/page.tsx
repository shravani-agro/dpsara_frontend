"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { fmtDateTime } from "@/lib/format";
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
import { getAuditLogs } from "@/lib/admin";
import { parseApiError } from "@/lib/error-parser";
import { DateRangeFilter } from "@/components/DateRangeFilter";

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionType, setActionType] = useState("");
  const [adminId, setAdminId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = { limit: 200 };
      if (actionType) params.action_type = actionType;
      if (adminId && /^\d+$/.test(adminId)) params.admin_id = Number(adminId);
      if (dateFrom) params.date_from = new Date(dateFrom).toISOString();
      if (dateTo) {
        const dt = new Date(dateTo);
        dt.setHours(23, 59, 59, 999);
        params.date_to = dt.toISOString();
      }
      setLogs(await getAuditLogs(params));
    } catch (e: any) {
      setError(parseApiError(e, "Failed to load audit logs"));
    } finally {
      setLoading(false);
    }
  }, [actionType, adminId, dateFrom, dateTo]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredLogs = useMemo(() => {
    if (!search.trim()) return logs;
    const q = search.trim().toLowerCase();
    return logs.filter((l) => {
      const aId = String(l.admin_id || "").toLowerCase();
      const aType = String(l.action_type || "").toLowerCase();
      const ep = String(l.endpoint || "").toLowerCase();
      const ip = String(l.ip_address || "").toLowerCase();
      return aId.includes(q) || aType.includes(q) || ep.includes(q) || ip.includes(q);
    });
  }, [logs, search]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Audit Logs"
        description="Comprehensive chronological trail of administrative and security events"
        actions={
          <Button variant="outline" size="sm" onClick={() => load()}>
            🔄 Refresh
          </Button>
        }
      />

      <ErrorMsg msg={error} />

      {/* Date Filter & Search Controls */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
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

        <DateRangeFilter
          onFilterChange={({ dateFrom: df, dateTo: dt }) => {
            setDateFrom(df);
            setDateTo(dt);
          }}
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Input
            placeholder="Search action, IP, or path..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Input
            placeholder="Filter by Admin ID..."
            value={adminId}
            onChange={(e) => setAdminId(e.target.value)}
          />
          <Input
            placeholder="Action type (e.g. update, delete)..."
            value={actionType}
            onChange={(e) => setActionType(e.target.value)}
          />
        </div>
      </div>

      <Card title={`${filteredLogs.length} Audit Events`} bodyClassName="p-0">
        {loading ? (
          <div className="p-8"><Spinner /></div>
        ) : filteredLogs.length === 0 ? (
          <EmptyState title="No audit logs found" hint="Try adjusting your date range or search query" />
        ) : (
          <div>
            {/* Desktop Table View */}
            <div className="hidden md:block table-wrap">
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="py-3">Log ID</th>
                    <th>Admin</th>
                    <th>Action</th>
                    <th>Endpoint</th>
                    <th>IP Address</th>
                    <th className="text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((l) => (
                    <tr key={l.id} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 font-mono text-xs text-slate-400">#{l.id}</td>
                      <td className="font-semibold text-slate-900 dark:text-slate-100">{l.admin_username || l.username || (l.admin_id ? `Admin (${l.admin_id})` : "Admin")}</td>
                      <td>
                        <Badge color="violet" className="font-mono text-xs">{l.action_type}</Badge>
                      </td>
                      <td className="text-slate-500 font-mono text-xs">{l.endpoint || "—"}</td>
                      <td className="text-slate-400 font-mono text-xs">{l.ip_address || "—"}</td>
                      <td className="text-right text-xs text-slate-500 whitespace-nowrap">{fmtDateTime(l.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {filteredLogs.map((l) => (
                <div key={l.id} className="p-3.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                      Admin: {l.admin_id}
                    </span>
                    <Badge color="violet" className="font-mono text-[10px]">{l.action_type}</Badge>
                  </div>

                  <div className="text-xs text-slate-500 font-mono bg-slate-50 dark:bg-slate-850 p-2 rounded-lg break-all">
                    {l.endpoint || "Internal system action"}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span>IP: {l.ip_address || "—"}</span>
                    <span>{fmtDateTime(l.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
