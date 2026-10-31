"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { format } from "date-fns";
import {
  Card,
  Button,
  Input,
  Select,
  Spinner,
  ErrorMsg,
  PageHeader,
  EmptyState,
  TimePicker,
  Badge,
} from "@/components/ui";
import { toast } from "@/components/Toast";
import { parseApiError } from "@/lib/error-parser";
import {
  listStarlineMarkets,
  createStarlineMarket,
  updateStarlineMarket,
  listStarlineResults,
  bulkDeclareStarlineResults,
  deleteStarlineResult,
} from "@/lib/admin";

function calculateAnk(panna: string): string {
  const clean = panna.replace(/\D/g, "");
  if (clean.length !== 3) return "";
  const sum = clean.split("").reduce((acc, digit) => acc + parseInt(digit, 10), 0);
  return String(sum % 10);
}

function parseStarlineResult(val: string | null | undefined): { pana: string; ank: string } {
  if (!val) return { pana: "", ank: "" };
  const clean = val.trim();
  // Standard format: 128-1, 128 1, 128/1, 128:1
  const delimMatch = clean.match(/^(\d{3})[\s\-\/:,](\d)$/);
  if (delimMatch) {
    return { pana: delimMatch[1], ank: delimMatch[2] };
  }
  // 4 continuous digits: e.g. 1281 -> 128 - 1
  const fourDigitMatch = clean.match(/^(\d{3})(\d)$/);
  if (fourDigitMatch) {
    return { pana: fourDigitMatch[1], ank: fourDigitMatch[2] };
  }
  // 3 digits only: e.g. 128 -> auto-calculate ank
  const threeDigitMatch = clean.match(/^(\d{3})$/);
  if (threeDigitMatch) {
    return { pana: threeDigitMatch[1], ank: calculateAnk(threeDigitMatch[1]) };
  }
  // Reverse format: e.g. 1-128
  const revMatch = clean.match(/^(\d)[\s\-\/:](\d{3})$/);
  if (revMatch) {
    return { pana: revMatch[2], ank: revMatch[1] };
  }
  // Fallback splitting by hyphen
  const parts = clean.split("-");
  if (parts.length === 2) {
    const p1 = parts[0].replace(/\D/g, "");
    const p2 = parts[1].replace(/\D/g, "");
    if (p1.length === 3 && p2.length === 1) return { pana: p1, ank: p2 };
    if (p2.length === 3 && p1.length === 1) return { pana: p2, ank: p1 };
  }
  return { pana: "", ank: "" };
}

const OFFICIAL_STARLINE_SLOTS = [
  { session_label: "10:30 AM", result_time: "10:30" },
  { session_label: "11:30 AM", result_time: "11:30" },
  { session_label: "12:30 PM", result_time: "12:30" },
  { session_label: "01:30 PM", result_time: "13:30" },
  { session_label: "02:30 PM", result_time: "14:30" },
  { session_label: "03:30 PM", result_time: "15:30" },
  { session_label: "04:30 PM", result_time: "16:30" },
  { session_label: "05:30 PM", result_time: "17:30" },
  { session_label: "06:30 PM", result_time: "18:30" },
  { session_label: "07:30 PM", result_time: "19:30" },
  { session_label: "08:30 PM", result_time: "20:30" },
  { session_label: "09:30 PM", result_time: "21:30" },
];

export default function StarlinePage() {
  const [market, setMarket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Results Management State (Starline = Open Result Only)
  const [declaredResults, setDeclaredResults] = useState<any[]>([]);
  const [loadingResults, setLoadingResults] = useState(true);
  const [resultDate, setResultDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [sessionLabel, setSessionLabel] = useState("");
  const [openPana, setOpenPana] = useState("");
  const [openAnk, setOpenAnk] = useState("");
  const [quickPaste, setQuickPaste] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [isDeclaring, setIsDeclaring] = useState(false);

  // New Slot State
  const [newTime, setNewTime] = useState("");
  const [isAddingSlot, setIsAddingSlot] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listStarlineMarkets({});
      if (data && data.length > 0) {
        setMarket(data[0]);
      } else {
        setMarket(null);
      }
    } catch (e: any) {
      setError(parseApiError(e, "Failed to load starline data"));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadResults = useCallback(async () => {
    setLoadingResults(true);
    try {
      const data = await listStarlineResults();
      setDeclaredResults(data);
    } catch {
      setDeclaredResults([]);
    } finally {
      setLoadingResults(false);
    }
  }, []);

  useEffect(() => {
    load();
    loadResults();
  }, [load, loadResults]);

  async function initMarket() {
    try {
      setLoading(true);
      await createStarlineMarket({
        name: "Starline",
        market_type: "starline",
        game_days: "Mon-Sun",
        sequence_number: 0,
        holiday_status: false,
        schedules: OFFICIAL_STARLINE_SLOTS,
      });
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Error initializing starline market");
      setLoading(false);
    }
  }

  async function handleSyncOfficialSlots() {
    if (!market) return;
    if (!confirm("Reset and sync Starline to official 12 time slots (10:30 AM to 09:30 PM)?")) return;
    setIsSyncing(true);
    try {
      const payload = {
        ...market,
        name: "Starline",
        schedules: OFFICIAL_STARLINE_SLOTS,
      };
      await updateStarlineMarket(market.id, payload);
      await load();
      toast.success("Synchronized to official 12 time slots (10:30 AM to 09:30 PM)");
    } catch (err: any) {
      toast.error(parseApiError(err, "Failed to sync time slots"));
    } finally {
      setIsSyncing(false);
    }
  }

  async function handleAddSlot() {
    if (!newTime || !market) return;
    setIsAddingSlot(true);
    try {
      let formattedLabel = newTime;
      try {
        const [h, m] = newTime.split(":");
        const d = new Date();
        d.setHours(parseInt(h, 10));
        d.setMinutes(parseInt(m, 10));
        formattedLabel = format(d, "hh:mm a");
      } catch (e) {
        // fallback
      }
      const newSchedules = [...(market.schedules || []), { session_label: formattedLabel, result_time: newTime }];
      const payload = { ...market, schedules: newSchedules };
      await updateStarlineMarket(market.id, payload);
      setNewTime("");
      await load();
      toast.success("Time slot added");
    } catch (err: any) {
      toast.error("Failed to add time slot");
    } finally {
      setIsAddingSlot(false);
    }
  }

  async function handleRemoveSlot(idx: number) {
    if (!confirm("Are you sure you want to remove this time slot?")) return;
    try {
      const newSchedules = [...(market.schedules || [])];
      newSchedules.splice(idx, 1);
      const payload = { ...market, schedules: newSchedules };
      await updateStarlineMarket(market.id, payload);
      await load();
      toast.success("Time slot removed");
    } catch (err: any) {
      toast.error("Failed to remove time slot");
    }
  }

  // Handle Pana input with automatic Single Ank calculation
  const handlePanaChange = (val: string) => {
    const clean = val.replace(/\D/g, "").slice(0, 3);
    setOpenPana(clean);
    if (clean.length === 3) {
      setOpenAnk(calculateAnk(clean));
    }
  };

  // Quick paste parser for Starline (e.g. 178-6 or 1786)
  const handleQuickPaste = (val: string) => {
    setQuickPaste(val);
    const parsed = parseStarlineResult(val);
    if (parsed.pana) {
      setOpenPana(parsed.pana);
      setOpenAnk(parsed.ank);
    }
  };

  const formattedStarlineResult = useMemo(() => {
    if (!openPana && !openAnk) return "";
    if (openPana && openAnk) return `${openPana}-${openAnk}`;
    if (openPana) return openPana;
    return openAnk;
  }, [openPana, openAnk]);

  const existingSlotResult = useMemo(() => {
    if (!sessionLabel || !resultDate || !declaredResults) return null;
    return declaredResults.find(
      (r: any) =>
        r.session_label === sessionLabel &&
        r.result_date &&
        r.result_date.startsWith(resultDate)
    );
  }, [sessionLabel, resultDate, declaredResults]);

  async function declareResult() {
    if (!market || !sessionLabel) {
      setError("Please select a time slot.");
      return;
    }
    if (!openPana || openPana.length !== 3 || !/^\d{3}$/.test(openPana)) {
      setError("Open Pana must be exactly 3 numeric digits (e.g. 178).");
      return;
    }
    if (!openAnk || openAnk.length !== 1 || !/^\d$/.test(openAnk)) {
      setError("Single Ank must be exactly 1 numeric digit (0-9).");
      return;
    }

    const payloadResult = `${openPana}-${openAnk}`;
    setIsDeclaring(true);
    setError(null);
    setMsg(null);
    try {
      const payload: any = {
        market_id: market.id,
        open_result: payloadResult,
        result_date: resultDate,
        session_label: sessionLabel,
      };
      const res = await bulkDeclareStarlineResults([payload]);
      const first = res.results?.[0];
      if (first?.status === "error") {
        setError(first.detail || "Failed to declare result");
      } else {
        setMsg(first?.status === "updated" ? "Starline Result updated successfully." : "Starline Result declared successfully.");
        setOpenPana("");
        setOpenAnk("");
        setQuickPaste("");
        setSessionLabel("");
        loadResults();
      }
    } catch (e: any) {
      setError(parseApiError(e, "Failed to declare result"));
    } finally {
      setIsDeclaring(false);
    }
  }

  async function handleDeleteResult(id: number) {
    if (!confirm("Are you sure you want to delete this result? This will automatically revert any winnings and update user wallets!")) return;
    try {
      await deleteStarlineResult(id);
      toast.success("Result deleted successfully");
      loadResults();
    } catch (err: any) {
      toast.error(parseApiError(err, "Failed to delete result"));
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Starline Settings & Results"
        description="Manage Starline time slots and declare Open Results (Pana - Single Ank)"
      />
      <ErrorMsg msg={error} />
      {msg && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300 flex items-center justify-between">
          <span>{msg}</span>
          <button onClick={() => setMsg(null)} className="text-emerald-400 hover:text-white text-xs">✕</button>
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center">
          <Spinner />
        </div>
      ) : !market ? (
        <Card title="Starline System Setup" className="text-center py-8">
          <EmptyState
            title="No Starline Market Found"
            hint="Initialize the Starline system to start adding time slots."
          />
          <Button onClick={initMarket} className="mt-4">
            Initialize Starline System
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Time Slots & Results Table */}
          <div className="lg:col-span-2 space-y-6">
            {/* Time Slots */}
            <Card
              title="Starline Time Slots (Sessions)"
              subtitle="12 Official Time Slots (10:30 AM to 09:30 PM) — Starline has time only, no names"
              actions={
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSyncOfficialSlots}
                  disabled={isSyncing}
                  className="border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
                >
                  {isSyncing ? "Syncing..." : "⚡ Sync 12 Official Slots (10:30 AM - 09:30 PM)"}
                </Button>
              }
            >
              <div className="mb-6 p-4 rounded-xl border border-slate-700 bg-slate-800/40 flex flex-wrap gap-4 items-end">
                <div className="w-48">
                  <label className="mb-1 block text-xs font-semibold text-slate-300">Result Time</label>
                  <TimePicker value={newTime} onChange={setNewTime} />
                </div>
                <Button onClick={handleAddSlot} disabled={!newTime || isAddingSlot} className="mb-0.5">
                  {isAddingSlot ? "Adding..." : "+ Add Slot"}
                </Button>
              </div>

              {market.schedules && market.schedules.length > 0 ? (
                <div className="table-wrap">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-700">
                        <th className="py-2.5 px-4">Time Slot</th>
                        <th className="py-2.5 px-4">Schedule Time</th>
                        <th className="text-right px-4">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {market.schedules.map((s: any, idx: number) => (
                        <tr key={idx} className="border-b border-slate-800 hover:bg-slate-800/30">
                          <td className="py-3 px-4 font-semibold text-white">{s.session_label}</td>
                          <td className="px-4 text-slate-400 font-mono">{s.result_time || "—"}</td>
                          <td className="px-4 text-right">
                            <Button size="sm" variant="danger" onClick={() => handleRemoveSlot(idx)}>
                              Delete
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState title="No Time Slots added yet" />
              )}
            </Card>

            {/* Recent Starline Results */}
            <Card title="Recent Starline Results" subtitle="Open Results history for Starline slots">
              {loadingResults ? (
                <Spinner />
              ) : declaredResults.length === 0 ? (
                <EmptyState title="No Starline results declared yet" />
              ) : (
                <div className="table-wrap">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-700">
                        <th className="py-2.5 px-3">Date</th>
                        <th className="px-3">Time Slot</th>
                        <th className="px-3 text-center">Pana</th>
                        <th className="px-3 text-center">Single Ank</th>
                        <th className="px-3 text-center">Result (Open Only)</th>
                        <th className="px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {declaredResults.map((r: any) => {
                        const dateStr = r.result_date
                          ? format(new Date(r.result_date), "dd/MM/yyyy")
                          : r.declared_at
                          ? format(new Date(r.declared_at), "dd/MM/yyyy")
                          : "—";

                        const parsed = parseStarlineResult(r.open_result || r.total_result);

                        return (
                          <tr key={r.id} className="border-b border-slate-800 hover:bg-slate-800/30">
                            <td className="py-3 px-3 text-slate-300 font-medium">{dateStr}</td>
                            <td className="px-3 font-semibold text-white">{r.session_label}</td>
                            <td className="px-3 text-center font-mono font-bold text-emerald-400">
                              {parsed.pana || "—"}
                            </td>
                            <td className="px-3 text-center font-mono font-bold text-amber-300">
                              {parsed.ank || "—"}
                            </td>
                            <td className="px-3 text-center">
                              <span className="inline-block rounded-md bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 font-mono font-black text-emerald-300 text-sm">
                                {r.open_result || r.total_result || "—"}
                              </span>
                            </td>
                            <td className="px-3 text-right space-x-2 whitespace-nowrap">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  if (r.result_date) setResultDate(r.result_date.substring(0, 10));
                                  setSessionLabel(r.session_label);
                                  const p = parseStarlineResult(r.open_result);
                                  setOpenPana(p.pana);
                                  setOpenAnk(p.ank);
                                  window.scrollTo({ top: 0, behavior: "smooth" });
                                }}
                              >
                                Edit
                              </Button>
                              <Button size="sm" variant="danger" onClick={() => handleDeleteResult(r.id)}>
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
          </div>

          {/* Right Column: Upload Result (Open Result Only) */}
          <div className="space-y-6">
            <Card
              title="Upload Starline Result"
              subtitle="Starline has Open Result only (Pana - Single Ank)"
            >
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-300">Result Date *</label>
                  <Input type="date" value={resultDate} onChange={(e) => setResultDate(e.target.value)} />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-300">Select Time Slot *</label>
                  <Select value={sessionLabel} onChange={(e) => setSessionLabel(e.target.value)}>
                    <option value="">-- Choose Slot --</option>
                    {market.schedules?.map((s: any) => (
                      <option key={s.id || s.session_label} value={s.session_label}>
                        {s.session_label} ({s.result_time?.slice(0, 5)})
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-300">
                    Quick Paste (e.g. 178-6)
                  </label>
                  <Input
                    placeholder="e.g. 178-6 or 1786"
                    value={quickPaste}
                    onChange={(e) => handleQuickPaste(e.target.value)}
                  />
                </div>

                {/* Starline Dedicated Open Result Inputs */}
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                      Open Result Format (Pana - Single Ank)
                    </span>
                    <Badge color={openPana.length === 3 && openAnk.length === 1 ? "emerald" : "slate"}>
                      {openPana && openAnk ? `${openPana}-${openAnk}` : "Required"}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-300">Open Pana (3 Digits) *</label>
                      <Input
                        placeholder="e.g. 178"
                        maxLength={3}
                        value={openPana}
                        onChange={(e) => handlePanaChange(e.target.value)}
                        className="font-mono text-center text-lg font-bold tracking-widest text-emerald-300"
                      />
                      <span className="text-[10px] text-slate-400">Auto-calculates Single Ank</span>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-300">Single Ank (1 Digit) *</label>
                      <Input
                        placeholder="e.g. 6"
                        maxLength={1}
                        value={openAnk}
                        onChange={(e) => setOpenAnk(e.target.value.replace(/\D/g, "").slice(0, 1))}
                        className="font-mono text-center text-lg font-bold text-amber-400"
                      />
                      <span className="text-[10px] text-slate-400">Sum % 10</span>
                    </div>
                  </div>

                  {/* Intelligent Live Sum Calculation Breakdown */}
                  {openPana.length === 3 && (
                    <div className="rounded-lg bg-slate-900/80 border border-slate-700/60 p-2.5 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-slate-300">
                        <span>
                          Pana Digit Sum:{" "}
                          <strong className="font-mono text-emerald-400 font-bold">
                            {openPana[0]} + {openPana[1]} + {openPana[2]} ={" "}
                            {parseInt(openPana[0], 10) + parseInt(openPana[1], 10) + parseInt(openPana[2], 10)}
                          </strong>
                        </span>
                        <span>
                          Standard Ank:{" "}
                          <strong className="font-mono text-amber-400 font-bold text-sm">
                            {calculateAnk(openPana)}
                          </strong>
                        </span>
                      </div>
                      {openAnk && openAnk !== calculateAnk(openPana) && (
                        <div className="flex items-center justify-between text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded px-2 py-1 text-[11px]">
                          <span>⚠️ Custom Ank: {openAnk} (Expected from sum: {calculateAnk(openPana)})</span>
                          <button
                            type="button"
                            onClick={() => setOpenAnk(calculateAnk(openPana))}
                            className="underline font-bold hover:text-white"
                          >
                            Use Standard {calculateAnk(openPana)}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Existing Result Notice for the Chosen Slot & Date */}
                {existingSlotResult && (
                  <div className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 p-2.5 text-xs text-cyan-300 flex items-center justify-between">
                    <span>
                      ℹ️ Slot <strong>{sessionLabel}</strong> already has result:{" "}
                      <strong className="font-mono">{existingSlotResult.open_result || existingSlotResult.total_result}</strong>
                    </span>
                    <Badge color="blue">Update Mode</Badge>
                  </div>
                )}

                {/* Starline Result Visual Preview Box */}
                <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 text-center">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block mb-2">
                    Starline Result Card Preview
                  </span>
                  <div className="flex items-center justify-center gap-2 font-mono">
                    <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-2xl font-black text-emerald-300 tracking-wider">
                      {openPana || "***"}
                    </div>
                    <span className="text-2xl text-slate-600 font-bold">-</span>
                    <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-2xl font-black text-amber-300">
                      {openAnk || "*"}
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 block mt-2">
                    Open Result Only: <strong className="font-mono text-emerald-300">{formattedStarlineResult || "Pending"}</strong>
                  </span>
                </div>

                <Button
                  onClick={declareResult}
                  disabled={openPana.length !== 3 || openAnk.length !== 1 || !sessionLabel || isDeclaring}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-2.5 shadow-lg shadow-emerald-950/40"
                >
                  {isDeclaring
                    ? "Processing..."
                    : existingSlotResult
                    ? `Update Starline Result (${openPana || "***"}-${openAnk || "*"})`
                    : `Upload Starline Result (${openPana || "***"}-${openAnk || "*"})`}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
