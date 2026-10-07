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

function calculateAnk(panna: string): string {
  const clean = panna.replace(/\D/g, "");
  if (clean.length !== 3) return "";
  const sum = clean.split("").reduce((acc, digit) => acc + parseInt(digit, 10), 0);
  return String(sum % 10);
}

function parseResultField(val: string | null | undefined): { panna: string; ank: string } {
  if (!val || val.includes("*")) return { panna: "", ank: "" };
  const parts = val.trim().split("-");
  if (parts.length === 2) {
    if (parts[0].length === 3) {
      return { panna: parts[0], ank: parts[1] };
    } else {
      return { panna: parts[1], ank: parts[0] };
    }
  } else if (parts.length === 1 && parts[0].length === 3) {
    return { panna: parts[0], ank: calculateAnk(parts[0]) };
  }
  return { panna: "", ank: "" };
}

export default function ResultsPage() {
  const [markets, setMarkets] = useState<any[]>([]);
  const [declaredResults, setDeclaredResults] = useState<any[]>([]);
  const [marketId, setMarketId] = useState<number | null>(null);
  const [resultDate, setResultDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Separate Open & Close Result State for Main Markets
  const [openPana, setOpenPana] = useState("");
  const [openAnk, setOpenAnk] = useState("");
  const [closeAnk, setCloseAnk] = useState("");
  const [closePana, setClosePana] = useState("");
  const [quickPaste, setQuickPaste] = useState("");

  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingResults, setLoadingResults] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [filterDate, setFilterDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [filterMarket, setFilterMarket] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<any>(null);
  const [confirmRollback, setConfirmRollback] = useState<any>(null);

  const loadMarkets = useCallback(async () => {
    try {
      const data = await listMarkets({});
      // Only regular / main markets on this page
      setMarkets(data.filter((m: any) => m.market_type !== "starline" && m.market_type !== "jackpot"));
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

  // Find existing result for the selected market & date
  const existingResult = useMemo(() => {
    if (!marketId || !resultDate) return null;
    return declaredResults.find((r: any) => {
      if (r.market_id !== marketId) return false;
      const rDate = r.result_date 
        ? r.result_date.substring(0, 10)
        : r.declared_at ? r.declared_at.substring(0, 10) : "";
      return rDate === resultDate;
    });
  }, [marketId, resultDate, declaredResults]);

  // When market or date changes, check if existing result exists and prefill if empty
  const applyExistingResult = useCallback((res: any) => {
    if (!res) return;
    const openParsed = parseResultField(res.open_result);
    const closeParsed = parseResultField(res.close_result);
    setOpenPana(openParsed.panna);
    setOpenAnk(openParsed.ank);
    setCloseAnk(closeParsed.ank);
    setClosePana(closeParsed.panna);
  }, []);

  const handleMarketChange = (id: number | null) => {
    setMarketId(id);
    setQuickPaste("");
    setOpenPana("");
    setOpenAnk("");
    setCloseAnk("");
    setClosePana("");
    if (id) {
      const match = declaredResults.find((r: any) => {
        if (r.market_id !== id) return false;
        const rDate = r.result_date ? r.result_date.substring(0, 10) : "";
        return rDate === resultDate;
      });
      if (match) {
        applyExistingResult(match);
      }
    }
  };

  // Quick paste parser
  const handleQuickPasteChange = (val: string) => {
    setQuickPaste(val);
    const text = val.trim();
    if (!text) return;

    // Pattern 1: Full formatted result: 128-14-356 or 128 - 14 - 356
    const fullMatch = text.match(/^(\d{3})\s*-\s*(\d)(\d)\s*-\s*(\d{3})$/);
    if (fullMatch) {
      setOpenPana(fullMatch[1]);
      setOpenAnk(fullMatch[2]);
      setCloseAnk(fullMatch[3]);
      setClosePana(fullMatch[4]);
      return;
    }

    // Pattern 2: 8 continuous digits: 12814356
    if (/^\d{8}$/.test(text)) {
      setOpenPana(text.slice(0, 3));
      setOpenAnk(text.slice(3, 4));
      setCloseAnk(text.slice(4, 5));
      setClosePana(text.slice(5, 8));
      return;
    }

    // Pattern 3: Open result: 128-1
    const openMatch = text.match(/^(\d{3})\s*-\s*(\d)$/);
    if (openMatch) {
      setOpenPana(openMatch[1]);
      setOpenAnk(openMatch[2]);
      return;
    }

    // Pattern 4: Close result: 4-356 or 356-4
    const closeMatch1 = text.match(/^(\d)\s*-\s*(\d{3})$/);
    if (closeMatch1) {
      setCloseAnk(closeMatch1[1]);
      setClosePana(closeMatch1[2]);
      return;
    }
    const closeMatch2 = text.match(/^(\d{3})\s*-\s*(\d)$/);
    if (closeMatch2 && openPana) {
      // If open is already filled, treat this as close
      setClosePana(closeMatch2[1]);
      setCloseAnk(closeMatch2[2]);
      return;
    }
  };

  // Open Pana input change with auto Ank calculation
  const handleOpenPanaChange = (val: string) => {
    const clean = val.replace(/\D/g, "").slice(0, 3);
    setOpenPana(clean);
    if (clean.length === 3) {
      const calculated = calculateAnk(clean);
      setOpenAnk(calculated);
    }
  };

  // Close Pana input change with auto Ank calculation
  const handleClosePanaChange = (val: string) => {
    const clean = val.replace(/\D/g, "").slice(0, 3);
    setClosePana(clean);
    if (clean.length === 3) {
      const calculated = calculateAnk(clean);
      setCloseAnk(calculated);
    }
  };

  // Derived formatted result strings
  const openResultFormatted = useMemo(() => {
    if (!openPana && !openAnk) return "";
    if (openPana && openAnk) return `${openPana}-${openAnk}`;
    if (openPana) return openPana;
    return openAnk;
  }, [openPana, openAnk]);

  const closeResultFormatted = useMemo(() => {
    if (!closePana && !closeAnk) return "";
    if (closeAnk && closePana) return `${closeAnk}-${closePana}`;
    if (closePana) return closePana;
    return closeAnk;
  }, [closeAnk, closePana]);

  // Combined Preview (Matka Card: OpenPana - OpenAnk CloseAnk - ClosePana)
  const combinedCardPreview = useMemo(() => {
    const oP = openPana || "***";
    const oA = openAnk || "*";
    const cA = closeAnk || "*";
    const cP = closePana || "***";
    return {
      openPana: oP,
      openAnk: oA,
      closeAnk: cA,
      closePana: cP,
      jodi: `${oA}${cA}`,
      fullString: `${oP} - ${oA}${cA} - ${cP}`,
      hasOpen: !!openPana || !!openAnk,
      hasClose: !!closePana || !!closeAnk,
    };
  }, [openPana, openAnk, closeAnk, closePana]);

  async function handleDeclare(mode: "both" | "open" | "close") {
    if (!marketId) {
      setError("Please select a market");
      return;
    }

    if (mode === "open" && !openResultFormatted) {
      setError("Please enter Open Result (Pana and Ank)");
      return;
    }

    if (mode === "close" && !closeResultFormatted) {
      setError("Please enter Close Result (Ank and Pana)");
      return;
    }

    if (mode === "both" && (!openResultFormatted || !closeResultFormatted)) {
      setError("Please enter both Open and Close results to declare full market result");
      return;
    }

    setLoading(true);
    setError(null);
    setMsg(null);

    try {
      const payload: any = { market_id: marketId };
      if (resultDate) payload.result_date = resultDate;

      if (mode === "both") {
        payload.open_result = openResultFormatted;
        payload.close_result = closeResultFormatted;
      } else if (mode === "open") {
        payload.open_result = openResultFormatted;
        // If close result was already present on this market, preserve it
        if (existingResult?.close_result && existingResult.close_result !== "*-***") {
          payload.close_result = existingResult.close_result;
        }
      } else if (mode === "close") {
        payload.close_result = closeResultFormatted;
        // If open result was filled or already present, keep it
        if (openResultFormatted) {
          payload.open_result = openResultFormatted;
        } else if (existingResult?.open_result && existingResult.open_result !== "***-*") {
          payload.open_result = existingResult.open_result;
        }
      }

      const res = await bulkDeclareResults([payload]);
      const first = res.results?.[0];
      if (first?.status === "error") {
        setError(first.detail || "Failed to declare result");
      } else {
        const actionText =
          mode === "open"
            ? "Open Result declared successfully!"
            : mode === "close"
            ? "Close Result declared successfully!"
            : "Full Market Result declared successfully!";
        setMsg(`${actionText} ${first?.status === "updated" ? "(Updated)" : ""}`);
        setQuickPaste("");
        setOpenPana("");
        setOpenAnk("");
        setCloseAnk("");
        setClosePana("");
        setPreview(null);
        await loadResults();
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
      : r.declared_at
      ? format(new Date(r.declared_at), "yyyy-MM-dd")
      : format(new Date(), "yyyy-MM-dd");
    setResultDate(dateStr);
    applyExistingResult(r);
    window.scrollTo({ top: 0, behavior: "smooth" });
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

  // Filtered Results List
  const filteredResults = useMemo(() => {
    return declaredResults
      .filter((r: any) => r.market_type !== "starline" && r.market_type !== "jackpot")
      .filter((r: any) => {
        if (filterMarket && r.market_id.toString() !== filterMarket) return false;
        if (filterDate) {
          const rDate = r.result_date
            ? r.result_date.substring(0, 10)
            : r.declared_at
            ? format(new Date(r.declared_at), "yyyy-MM-dd")
            : "";
          if (rDate !== filterDate) return false;
        }
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const nameMatch = (r.market_name || "").toLowerCase().includes(q);
          const resMatch = (r.total_result || r.open_result || "").toLowerCase().includes(q);
          if (!nameMatch && !resMatch) return false;
        }
        return true;
      });
  }, [declaredResults, filterMarket, filterDate, searchQuery]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Declare Results — Main Markets"
        description="Upload and manage Open and Close results for regular Satta Matka markets with auto-ank calculation"
      />

      {msg && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300 flex items-center justify-between">
          <span>{msg}</span>
          <button onClick={() => setMsg(null)} className="text-emerald-400 hover:text-white text-xs">✕</button>
        </div>
      )}
      <ErrorMsg msg={error} />

      <Card
        title="Upload Main Market Result"
        subtitle="Dedicated Open & Close input fields with automatic Single Ank calculation"
      >
        <div className="space-y-5">
          {/* Market & Date Selection */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-300">Select Market *</label>
              <Select
                value={marketId ?? ""}
                onChange={(e) => handleMarketChange(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">-- Choose Main Market --</option>
                {markets.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.open_time?.slice(0, 5)} - {m.close_time?.slice(0, 5)})
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-300">Result Date *</label>
              <Input
                type="date"
                value={resultDate}
                onChange={(e) => {
                  setResultDate(e.target.value);
                  if (marketId) {
                    const match = declaredResults.find((r: any) => {
                      if (r.market_id !== marketId) return false;
                      const rDate = r.result_date ? r.result_date.substring(0, 10) : "";
                      return rDate === e.target.value;
                    });
                    if (match) applyExistingResult(match);
                  }
                }}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-300">
                Quick Paste / Auto Split
              </label>
              <Input
                placeholder="e.g. 128-14-356 or 128-1 or 4-356"
                value={quickPaste}
                onChange={(e) => handleQuickPasteChange(e.target.value)}
              />
              <span className="text-[11px] text-slate-400">Pastes & auto-fills Open and Close fields</span>
            </div>
          </div>

          {/* Existing Result Notification Banner */}
          {existingResult && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-amber-200">
                <span className="font-semibold text-amber-300">Existing Result Found: </span>
                Open: <span className="font-mono font-bold text-white">{existingResult.open_result || "None"}</span> | 
                Close: <span className="font-mono font-bold text-white">{existingResult.close_result || "None"}</span> | 
                Combined: <span className="font-mono font-bold text-amber-300">{existingResult.total_result || "—"}</span>
              </div>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => applyExistingResult(existingResult)}>
                Reload into Fields
              </Button>
            </div>
          )}

          {/* Dedicated Open & Close Inputs Grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* OPEN RESULT SECTION */}
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/10 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400"></span>
                  <h4 className="text-sm font-bold uppercase tracking-wider text-emerald-400">Open Result</h4>
                </div>
                <Badge color={openPana && openAnk ? "emerald" : "slate"}>
                  {openPana && openAnk ? `Ready: ${openPana}-${openAnk}` : "Open Session"}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-300">
                    Open Pana (3 Digits)
                  </label>
                  <Input
                    placeholder="e.g. 128"
                    value={openPana}
                    maxLength={3}
                    onChange={(e) => handleOpenPanaChange(e.target.value)}
                    className="font-mono text-center text-lg font-bold tracking-widest"
                  />
                  <span className="text-[10px] text-slate-400">Auto-calculates Open Ank</span>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-300">
                    Open Ank (1 Digit)
                  </label>
                  <Input
                    placeholder="e.g. 1"
                    value={openAnk}
                    maxLength={1}
                    onChange={(e) => setOpenAnk(e.target.value.replace(/\D/g, "").slice(0, 1))}
                    className="font-mono text-center text-lg font-bold text-emerald-400"
                  />
                  <span className="text-[10px] text-slate-400">Sum % 10 or manual</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-slate-400">
                  Formatted: <strong className="font-mono text-emerald-300">{openResultFormatted || "—"}</strong>
                </span>
                <Button
                  size="sm"
                  variant="primary"
                  disabled={!marketId || !openResultFormatted || loading}
                  onClick={() => handleDeclare("open")}
                  className="h-8 text-xs"
                >
                  Upload Open Only
                </Button>
              </div>
            </div>

            {/* CLOSE RESULT SECTION */}
            <div className="rounded-2xl border border-blue-500/20 bg-blue-950/10 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-400"></span>
                  <h4 className="text-sm font-bold uppercase tracking-wider text-blue-400">Close Result</h4>
                </div>
                <Badge color={closeAnk && closePana ? "blue" : "slate"}>
                  {closeAnk && closePana ? `Ready: ${closeAnk}-${closePana}` : "Close Session"}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-300">
                    Close Ank (1 Digit)
                  </label>
                  <Input
                    placeholder="e.g. 4"
                    value={closeAnk}
                    maxLength={1}
                    onChange={(e) => setCloseAnk(e.target.value.replace(/\D/g, "").slice(0, 1))}
                    className="font-mono text-center text-lg font-bold text-blue-400"
                  />
                  <span className="text-[10px] text-slate-400">Sum % 10 or manual</span>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-300">
                    Close Pana (3 Digits)
                  </label>
                  <Input
                    placeholder="e.g. 356"
                    value={closePana}
                    maxLength={3}
                    onChange={(e) => handleClosePanaChange(e.target.value)}
                    className="font-mono text-center text-lg font-bold tracking-widest"
                  />
                  <span className="text-[10px] text-slate-400">Auto-calculates Close Ank</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-slate-400">
                  Formatted: <strong className="font-mono text-blue-300">{closeResultFormatted || "—"}</strong>
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={!marketId || !closeResultFormatted || loading}
                  onClick={() => handleDeclare("close")}
                  className="h-8 text-xs"
                >
                  Upload Close Only
                </Button>
              </div>
            </div>
          </div>

          {/* LIVE MATKA BOARD CARD PREVIEW */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Live Combined Result Preview</span>
                <h3 className="text-base font-bold text-white">
                  {selectedMarket ? selectedMarket.name : "Select a Market"}
                </h3>
              </div>

              {/* Matka Board Number Boxes */}
              <div className="flex items-center gap-2 font-mono">
                {/* Open Pana Box */}
                <div className="flex flex-col items-center">
                  <span className="text-[10px] uppercase text-emerald-400 font-semibold mb-1">Open Pana</span>
                  <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-2 text-xl font-black text-emerald-300 tracking-wider">
                    {combinedCardPreview.openPana}
                  </div>
                </div>

                <span className="text-2xl text-slate-600 font-bold -mt-2">-</span>

                {/* Jodi Center Box */}
                <div className="flex flex-col items-center">
                  <span className="text-[10px] uppercase text-amber-400 font-semibold mb-1">Jodi Result</span>
                  <div className="flex gap-1">
                    <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xl font-black text-emerald-300">
                      {combinedCardPreview.openAnk}
                    </div>
                    <div className="rounded-xl border border-blue-500/40 bg-blue-500/10 px-3 py-2 text-xl font-black text-blue-300">
                      {combinedCardPreview.closeAnk}
                    </div>
                  </div>
                </div>

                <span className="text-2xl text-slate-600 font-bold -mt-2">-</span>

                {/* Close Pana Box */}
                <div className="flex flex-col items-center">
                  <span className="text-[10px] uppercase text-blue-400 font-semibold mb-1">Close Pana</span>
                  <div className="rounded-xl border border-blue-500/40 bg-blue-500/10 px-3.5 py-2 text-xl font-black text-blue-300 tracking-wider">
                    {combinedCardPreview.closePana}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  onClick={() => handleDeclare("both")}
                  disabled={!marketId || !openResultFormatted || !closeResultFormatted || loading}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold px-5"
                >
                  {loading ? "Processing..." : "Declare Full Result (Both)"}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setOpenPana("");
                    setOpenAnk("");
                    setCloseAnk("");
                    setClosePana("");
                    setQuickPaste("");
                  }}
                  className="text-xs"
                >
                  Reset
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Bets settlement preview if available */}
      {loading && !preview && <Spinner />}
      {preview && (
        <Card title={`Pending Bets Preview — Market #${preview.market_id}`}>
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-800/50 p-3 border border-slate-700">
              <div className="text-xs text-slate-400">Total Pending Bets</div>
              <div className="text-lg font-semibold text-white">{preview.total_pending_bets}</div>
            </div>
            <div className="rounded-xl bg-slate-800/50 p-3 border border-slate-700">
              <div className="text-xs text-slate-400">Total Stakes Pending Settlement</div>
              <div className="text-lg font-semibold text-emerald-400">₹{preview.total_stakes}</div>
            </div>
          </div>
          {preview.bets?.length ? (
            <div className="table-wrap max-h-60 overflow-y-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="py-2.5">Bet ID</th>
                    <th>User</th>
                    <th>Session</th>
                    <th>Type</th>
                    <th>Selected Number</th>
                    <th>Amount</th>
                    <th>Potential Win</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.bets.map((b: any) => (
                    <tr key={b.id} className="border-t border-slate-800">
                      <td className="py-2.5 text-slate-400 font-mono">#{b.id}</td>
                      <td className="text-white">{b.user_id}</td>
                      <td>
                        <Badge color={b.session === "open" ? "emerald" : "blue"}>
                          {b.session || "Open"}
                        </Badge>
                      </td>
                      <td>{b.bet_type}</td>
                      <td className="font-mono font-bold text-amber-300">{b.selected_number}</td>
                      <td>₹{b.amount}</td>
                      <td className="text-emerald-400 font-semibold">₹{b.potential_win}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="No pending bets waiting for settlement in this market" />
          )}
        </Card>
      )}

      {/* RECENT RESULTS TABLE */}
      <Card
        title="Declared Results History"
        subtitle="View and manage recent regular market results"
      >
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between text-sm text-slate-400">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs">Date:</span>
              <Input
                type="date"
                className="h-8 w-40 text-xs px-2"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
              />
              <Button size="sm" variant="ghost" onClick={() => setFilterDate("")} className="h-8 px-2 text-xs">
                All
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs">Market:</span>
              <Select
                className="h-8 w-44 text-xs px-2"
                value={filterMarket}
                onChange={(e) => setFilterMarket(e.target.value)}
              >
                <option value="">All Markets</option>
                {markets.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs">Search:</span>
            <Input
              className="h-8 w-40 text-xs px-2"
              placeholder="Search result or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {loadingResults ? (
          <Spinner />
        ) : filteredResults.length === 0 ? (
          <EmptyState title="No results declared for the selected filters" />
        ) : (
          <div className="table-wrap">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-700">
                  <th className="py-3 px-3">Date</th>
                  <th className="px-3">Market</th>
                  <th className="px-3 text-center">Open Result</th>
                  <th className="px-3 text-center">Close Result</th>
                  <th className="px-3 text-center">Full Card Result</th>
                  <th className="px-3 text-center">Status</th>
                  <th className="px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults.map((r: any) => {
                  const dateStr = r.result_date
                    ? format(new Date(r.result_date), "dd/MM/yyyy")
                    : r.declared_at
                    ? format(new Date(r.declared_at), "dd/MM/yyyy")
                    : "—";

                  const hasOpen = r.open_result && r.open_result !== "***-*";
                  const hasClose = r.close_result && r.close_result !== "*-***";
                  const isFullyDeclared = hasOpen && hasClose;

                  return (
                    <tr key={r.id} className="border-b border-slate-800/80 hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-3 text-slate-300 font-medium">{dateStr}</td>
                      <td className="px-3 font-semibold text-white">{r.market_name}</td>

                      {/* Open Result */}
                      <td className="px-3 text-center">
                        {hasOpen ? (
                          <span className="inline-block rounded-md bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 font-mono font-bold text-emerald-300 text-xs">
                            {r.open_result}
                          </span>
                        ) : (
                          <span className="text-slate-500 font-mono text-xs">Pending</span>
                        )}
                      </td>

                      {/* Close Result */}
                      <td className="px-3 text-center">
                        {hasClose ? (
                          <span className="inline-block rounded-md bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 font-mono font-bold text-blue-300 text-xs">
                            {r.close_result}
                          </span>
                        ) : (
                          <span className="text-slate-500 font-mono text-xs">Pending</span>
                        )}
                      </td>

                      {/* Full Result */}
                      <td className="px-3 text-center font-mono font-black text-amber-300 text-base">
                        {r.total_result || "—"}
                      </td>

                      {/* Status */}
                      <td className="px-3 text-center">
                        <Badge color={isFullyDeclared ? "emerald" : "amber"}>
                          {isFullyDeclared ? "Completed" : "Open Declared"}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="px-3 text-right whitespace-nowrap">
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => handleEdit(r)}>
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-7 text-xs ml-2"
                          onClick={() => setConfirmRollback(r)}
                        >
                          Rollback
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          className="h-7 text-xs ml-2"
                          onClick={() => setConfirmDelete(r)}
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={!!confirmRollback} onClose={() => setConfirmRollback(null)} title="Rollback Result">
        <p className="text-sm text-slate-300">
          Are you sure you want to rollback this result for <b className="text-white">{confirmRollback?.market_name}</b>?
          This will revert all settled bets to pending and safely deduct any winnings paid to users.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmRollback(null)}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={executeRollback}>
            Rollback
          </Button>
        </div>
      </Modal>

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Result">
        <p className="text-sm text-slate-300">
          Are you sure you want to delete this result for <b className="text-white">{confirmDelete?.market_name}</b>?
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmRemove}>
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
