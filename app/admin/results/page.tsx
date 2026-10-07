"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { format } from "date-fns";
import {
  Card,
  Button,
  Input,
  Select,
  Badge,
  Spinner,
  ErrorMsg,
  PageHeader,
  EmptyState,
  Modal,
} from "@/components/ui";
import { listMarkets, listResults, previewResult, bulkDeclareResults, deleteResult, rollbackResult } from "@/lib/admin";
import { parseApiError } from "@/lib/error-parser";

const statusColor: Record<string, any> = {
  upcoming: "slate",
  open: "green",
  closed: "amber",
  result_declared: "blue",
};

export default function ResultsPage() {
  const [markets, setMarkets] = useState<any[]>([]);
  const [declaredResults, setDeclaredResults] = useState<any[]>([]);
  const [marketId, setMarketId] = useState<number | null>(null);
  const [resultDate, setResultDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [openResult, setOpenResult] = useState("");
  const [closeResult, setCloseResult] = useState("");
  const [sessionLabel, setSessionLabel] = useState("");
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingResults, setLoadingResults] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [filterDate, setFilterDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [filterMarket, setFilterMarket] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<any>(null);
  const [confirmRollback, setConfirmRollback] = useState<any>(null);

  const loadMarkets = useCallback(async () => {
    try {
      const data = await listMarkets({});
      setMarkets(data.filter((m: any) => m.market_type !== "starline"));
    } catch {
      setMarkets([]);
    }
  }, []);

  const loadResults = useCallback(async () => {
    setLoadingResults(true);
    try {
      setDeclaredResults(await listResults());
    } catch {
      setDeclaredResults([]);
    } finally {
      setLoadingResults(false);
    }
  }, []);

  useEffect(() => {
    loadMarkets();
    loadResults();
  }, [loadMarkets, loadResults]);

  async function loadPreview() {
    if (!marketId) return;
    setLoading(true);
    setError(null);
    try {
      setPreview(await previewResult(marketId));
    } catch (e: any) {
      setError(parseApiError(e, "Failed to load preview"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setPreview(null);
    if (marketId) loadPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marketId]);

  async function declare() {
    if (!marketId) return;
    setLoading(true);
    setError(null);
    setMsg(null);
    try {
      const payload: any = { market_id: marketId };

      // For regular markets, use separate open/close results
      const marketType = selectedMarket?.market_type || "regular";
      if (marketType === "regular") {
        if (!openResult) {
          setError("Open result is required");
          setLoading(false);
          return;
        }
        payload.open_result = openResult;
        if (closeResult) {
          payload.close_result = closeResult;
        }
      } else {
        // For starline/jackpot, use combined result
        payload.open_result = openResult;
      }

      if (resultDate) payload.result_date = resultDate;
      if (sessionLabel) payload.session_label = sessionLabel;
      const res = await bulkDeclareResults([payload]);
      const first = res.results?.[0];
      if (first?.status === "error") {
        setError(first.detail || "Failed to declare result");
      } else {
        setMsg(first?.status === "updated" ? "Result updated successfully." : "Result declared successfully.");
        setMarketId(null);
        setOpenResult("");
        setCloseResult("");
        setSessionLabel("");
        setPreview(null);
        loadResults();
      }
    } catch (e: any) {
      setError(parseApiError(e, "Failed to declare result"));
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(r: any) {
    setMarketId(r.market_id);
    const dateStr = r.result_date 
         ? r.result_date.substring(0, 10)
         : r.declared_at ? format(new Date(r.declared_at), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");
    setResultDate(dateStr);
    
    setOpenResult(r.open_result || "");
    setCloseResult(r.close_result || "");
    setSessionLabel(r.session_label || "");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function confirmRemove() {
    if (!confirmDelete) return;
    try {
      await deleteResult(confirmDelete.id);
      setConfirmDelete(null);
      setMsg("Result deleted successfully");
      loadResults();
    } catch (e: any) {
      setError(parseApiError(e, "Failed to delete result"));
    }
  }

  async function executeRollback() {
    if (!confirmRollback) return;
    try {
      const res = await rollbackResult(confirmRollback.id);
      setConfirmRollback(null);
      setMsg(res.message || "Result rolled back successfully");
      loadResults();
    } catch (e: any) {
      setError(parseApiError(e, "Failed to rollback result"));
    }
  }

  const selectedMarket = markets.find((m: any) => m.id === marketId);
  const marketType = selectedMarket?.market_type || "regular";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Declare Results"
        description="View scraped results and declare or override market results"
      />

      {msg && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-300">
          {msg}
        </div>
      )}
      <ErrorMsg msg={error} />

      <Card title="Upload Result" subtitle="Select any active market to upload results">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Market</label>
            <Select
              value={marketId ?? ""}
              onChange={(e) => {
                setMarketId(e.target.value ? Number(e.target.value) : null);
                setSessionLabel("");
                setOpenResult("");
                setCloseResult("");
              }}
            >
              <option value="">-- Select Market --</option>
              {markets.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} — {m.market_type === "starline" ? "Starline" : "Regular"}
                </option>
              ))}
            </Select>
          </div>

{!selectedMarket || selectedMarket.market_type === "regular" ? (
            <>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Result Date</label>
                <Input
                  type="date"
                  value={resultDate}
                  onChange={(e) => setResultDate(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-400">Result Number</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. 123-4"
                    value={openResult}
                    onChange={(e) => {
                      setOpenResult(e.target.value);
                      // Intelligent auto-split: if input has format XXX-XX, extract open part
                      const val = e.target.value;
                      if (val && val.match(/^\d{3}-\d{2}$/)) {
                        const parts = val.split("-");
                        setCloseResult(parts[1]);
                      } else if (val && val.match(/^\d{3}-\d{1,2}$/)) {
                        // Keep as open, close might be filled separately
                        setCloseResult("");
                      }
                    }}
                    className="flex-1"
                  />
                  <Input
                    placeholder="e.g. 4-678"
                    value={closeResult}
                    onChange={(e) => setCloseResult(e.target.value)}
                  />
                </div>
              </div>
            </>
           ) : (
            <>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Date</label>
                <Input
                  type="date"
                  value={resultDate}
                  onChange={(e) => setResultDate(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Time Slot</label>
                <Select
                  value={sessionLabel}
                  onChange={(e) => setSessionLabel(e.target.value)}
                >
                  <option value="">-- Select Slot --</option>
                  {selectedMarket.schedules?.map((s: any) => (
                    <option key={s.id || s.session_label} value={s.session_label}>
                      {s.session_label} ({s.result_time?.slice(0, 5)})
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Result Value</label>
                <Input
                  placeholder="e.g. 178-6"
                  value={openResult}
                  onChange={(e) => setOpenResult(e.target.value)}
                />
              </div>
            </>
          )}
        </div>
        
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={declare} disabled={!marketId || !openResult || loading}>
            {loading ? "Processing..." : "Upload Result"}
          </Button>
        </div>
      </Card>

      {loading && !preview && <Spinner />}
      {preview && (
        <Card title={`Preview — Market #${preview.market_id}`}>
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-100 p-3">
              <div className="text-xs text-slate-400">Pending bets</div>
              <div className="text-lg font-semibold text-slate-900">{preview.total_pending_bets}</div>
            </div>
            <div className="rounded-xl bg-slate-100 p-3">
              <div className="text-xs text-slate-400">Total stakes</div>
              <div className="text-lg font-semibold text-slate-900">{preview.total_stakes}</div>
            </div>
          </div>
          {preview.bets?.length ? (
            <div className="table-wrap">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="py-2.5">Bet ID</th>
                    <th>User</th>
                    <th>Type</th>
                    <th>Number</th>
                    <th>Amount</th>
                    <th>Potential Win</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.bets.map((b: any) => (
                    <tr key={b.id} className="border-t border-slate-100">
                      <td className="py-3 text-slate-400">{b.id}</td>
                      <td className="text-slate-900">{b.user_id}</td>
                      <td>{b.bet_type}</td>
                      <td>{b.selected_number}</td>
                      <td>{b.amount}</td>
                      <td>{b.potential_win}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="No pending bets for this market" />
          )}
        </Card>
      )}

      <Card
        title="Recent Results"
        subtitle="Manage and view all declared results"
      >
        {loadingResults ? (
          <Spinner />
        ) : declaredResults.length === 0 ? (
          <EmptyState title="No results declared yet" />
        ) : (
          <div className="table-wrap">
            <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between text-sm text-slate-400">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span>Date:</span>
                  <Input type="date" className="h-8 w-40 text-xs px-2" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
                  <Button size="sm" variant="ghost" onClick={() => setFilterDate("")} className="h-8 px-2 text-xs">Clear</Button>
                </div>
                <div className="flex items-center gap-2">
                  <span>Market:</span>
                  <Select className="h-8 w-40 text-xs px-2" value={filterMarket} onChange={(e) => setFilterMarket(e.target.value)}>
                    <option value="">All Markets</option>
                    {markets.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                 <span>Search:</span>
                 <Input className="h-8 w-40 text-xs px-2" placeholder="Search..." />
              </div>
            </div>
            <table className="w-full min-w-[700px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-200">
                  <th className="py-2.5 px-2">Date</th>
                  <th className="px-2">Market</th>
                  <th className="px-2">Time/Slot</th>
                  <th className="px-2">Result</th>
                  <th className="px-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {declaredResults.filter((r: any) => r.market_type !== 'starline').filter((r: any) => {
                  if (filterMarket && r.market_id.toString() !== filterMarket) return false;
                  if (filterDate) {
                    const rDate = r.result_date 
                       ? r.result_date.substring(0, 10)
                       : r.declared_at ? format(new Date(r.declared_at), "yyyy-MM-dd") : "";
                    if (rDate !== filterDate) return false;
                  }
                  return true;
                }).map((r: any) => {
                  const dateStr = r.result_date 
                     ? format(new Date(r.result_date), "dd/MM/yyyy")
                     : r.declared_at ? format(new Date(r.declared_at), "dd/MM/yyyy") : "—";
                  
                  return (
                    <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-2 text-slate-600">{dateStr}</td>
                      <td className="px-2 text-slate-900">{r.market_name}</td>
                      <td className="px-2 text-slate-400">
                         {r.market_type === 'starline' ? r.session_label : 'Regular'}
                      </td>
                      <td className="px-2 font-mono text-emerald-400 font-semibold">
                         {r.total_result || (r.open_result ? r.open_result + (r.close_result || "") : "—")}
                      </td>
                      <td className="px-2 whitespace-nowrap">
                         <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => handleEdit(r)}>Edit</Button>
                         <Button size="sm" variant="secondary" className="h-7 text-xs ml-2" onClick={() => setConfirmRollback(r)}>Rollback</Button>
                         <Button size="sm" variant="danger" className="h-7 text-xs ml-2" onClick={() => setConfirmDelete(r)}>Delete</Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={!!confirmRollback}
        onClose={() => setConfirmRollback(null)}
        title="Rollback Result"
      >
        <p className="text-sm text-slate-600">
          Are you sure you want to rollback this result for <b>{confirmRollback?.market_name}</b>?
          This will revert all settled bets to pending and deduct any winnings that were paid out.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmRollback(null)}>Cancel</Button>
          <Button variant="secondary" onClick={executeRollback}>Rollback</Button>
        </div>
      </Modal>

      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete Result"
      >
        <p className="text-sm text-slate-600">
          Are you sure you want to delete this result for <b>{confirmDelete?.market_name}</b>?
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button variant="danger" onClick={confirmRemove}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
