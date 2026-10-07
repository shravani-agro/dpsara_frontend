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
  listJackpotMarkets,
  createJackpotMarket,
  updateJackpotMarket,
  listJackpotResults,
  bulkDeclareJackpotResults,
  deleteJackpotResult,
} from "@/lib/admin";

export default function JackpotPage() {
  const [market, setMarket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Results Management State (Jackpot = Panna Numbers Only)
  const [declaredResults, setDeclaredResults] = useState<any[]>([]);
  const [loadingResults, setLoadingResults] = useState(true);
  const [resultDate, setResultDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [sessionLabel, setSessionLabel] = useState("");
  const [pannaNumber, setPannaNumber] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [isDeclaring, setIsDeclaring] = useState(false);

  // New Slot State
  const [newTime, setNewTime] = useState("");
  const [isAddingSlot, setIsAddingSlot] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listJackpotMarkets({});
      if (data && data.length > 0) {
        setMarket(data[0]);
      } else {
        setMarket(null);
      }
    } catch (e: any) {
      setError(parseApiError(e, "Failed to load jackpot data"));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadResults = useCallback(async () => {
    setLoadingResults(true);
    try {
      const data = await listJackpotResults();
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
      await createJackpotMarket({
        name: "Jackpot Market",
        market_type: "jackpot",
        game_days: "Daily",
        sequence_number: 0,
        holiday_status: false,
        schedules: [],
      });
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Error initializing jackpot market");
      setLoading(false);
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
      await updateJackpotMarket(market.id, payload);
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
      await updateJackpotMarket(market.id, payload);
      await load();
      toast.success("Time slot removed");
    } catch (err: any) {
      toast.error("Failed to remove time slot");
    }
  }

  // Sanitize Panna input: 3 digits only
  const handlePannaChange = (val: string) => {
    const clean = val.replace(/\D/g, "").slice(0, 3);
    setPannaNumber(clean);
  };

  async function declareResult() {
    if (!market || !pannaNumber || !sessionLabel) return;
    if (pannaNumber.length !== 3) {
      setError("Jackpot result must be a 3-digit Panna number (e.g. 128)");
      return;
    }

    setIsDeclaring(true);
    setError(null);
    setMsg(null);
    try {
      const payload: any = {
        market_id: market.id,
        open_result: pannaNumber,
        result_date: resultDate,
        session_label: sessionLabel,
      };
      const res = await bulkDeclareJackpotResults([payload]);
      const first = res.results?.[0];
      if (first?.status === "error") {
        setError(first.detail || "Failed to declare result");
      } else {
        setMsg(first?.status === "updated" ? "Jackpot result updated successfully." : "Jackpot result declared successfully.");
        setPannaNumber("");
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
      await deleteJackpotResult(id);
      toast.success("Result deleted successfully");
      loadResults();
    } catch (err: any) {
      toast.error(parseApiError(err, "Failed to delete result"));
    }
  }

  // Extract pure 3-digit panna from result value
  const cleanPannaDisplay = (val: string | null | undefined): string => {
    if (!val) return "—";
    const clean = val.replace(/[^\d]/g, "");
    if (clean.length >= 3) return clean.slice(0, 3);
    return val;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Jackpot Settings & Results"
        description="Manage Jackpot time slots and declare 3-digit Panna numbers"
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
        <Card title="Jackpot System Setup" className="text-center py-8">
          <EmptyState
            title="No Jackpot Market Found"
            hint="Initialize the jackpot system to start adding time slots."
          />
          <Button onClick={initMarket} className="mt-4">
            Initialize Jackpot System
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Time Slots & Results */}
          <div className="lg:col-span-2 space-y-6">
            <Card title="Jackpot Time Slots (Sessions)" subtitle="Configure time slots for hourly Jackpot draws">
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

            <Card title="Recent Jackpot Results" subtitle="Panna Numbers history for Jackpot slots">
              {loadingResults ? (
                <Spinner />
              ) : declaredResults.length === 0 ? (
                <EmptyState title="No Jackpot results declared yet" />
              ) : (
                <div className="table-wrap">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-700">
                        <th className="py-2.5 px-3">Date</th>
                        <th className="px-3">Time Slot</th>
                        <th className="px-3 text-center">Jackpot Panna Number</th>
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

                        const pannaVal = cleanPannaDisplay(r.open_result || r.total_result);

                        return (
                          <tr key={r.id} className="border-b border-slate-800 hover:bg-slate-800/30">
                            <td className="py-3 px-3 text-slate-300 font-medium">{dateStr}</td>
                            <td className="px-3 font-semibold text-white">{r.session_label}</td>
                            <td className="px-3 text-center">
                              <span className="inline-block rounded-lg bg-amber-500/10 border border-amber-500/40 px-3.5 py-1 font-mono font-black text-amber-300 text-lg tracking-widest">
                                {pannaVal}
                              </span>
                            </td>
                            <td className="px-3 text-right space-x-2 whitespace-nowrap">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  if (r.result_date) setResultDate(r.result_date.substring(0, 10));
                                  setSessionLabel(r.session_label);
                                  setPannaNumber(cleanPannaDisplay(r.open_result));
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

          {/* Right Column: Upload Result (Panna Numbers Only) */}
          <div className="space-y-6">
            <Card
              title="Upload Jackpot Result"
              subtitle="Jackpot has 3-digit Panna numbers only"
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

                {/* Dedicated Jackpot 3-digit Panna input */}
                <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase tracking-wider text-amber-300">
                      Panna Number (3 Digits Only) *
                    </label>
                    <Badge color={pannaNumber.length === 3 ? "emerald" : "slate"}>
                      {pannaNumber.length === 3 ? "Valid Panna" : `${pannaNumber.length}/3 Digits`}
                    </Badge>
                  </div>
                  <Input
                    placeholder="e.g. 128"
                    maxLength={3}
                    value={pannaNumber}
                    onChange={(e) => handlePannaChange(e.target.value)}
                    className="font-mono text-center text-2xl font-black tracking-widest text-amber-300"
                  />
                  <span className="text-[11px] text-slate-400 block text-center">
                    Enter any 3-digit winning Panna (e.g. 128, 356, 777)
                  </span>
                </div>

                {/* Live Jackpot Preview Card */}
                <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 text-center">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block mb-2">
                    Jackpot Winning Card Preview
                  </span>
                  <div className="inline-block rounded-xl border border-amber-500/50 bg-amber-500/10 px-6 py-3 font-mono text-3xl font-black text-amber-300 tracking-widest shadow-inner">
                    {pannaNumber || "***"}
                  </div>
                  <span className="text-xs text-slate-400 block mt-2">
                    Slot: <strong className="text-white">{sessionLabel || "Not Selected"}</strong>
                  </span>
                </div>

                <Button
                  onClick={declareResult}
                  disabled={pannaNumber.length !== 3 || !sessionLabel || isDeclaring}
                  className="w-full bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-black py-2.5 text-sm"
                >
                  {isDeclaring
                    ? "Processing..."
                    : `Upload Jackpot Panna ${pannaNumber ? `(${pannaNumber})` : ""}`}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}