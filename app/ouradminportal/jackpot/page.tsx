"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { format } from "@/lib/format";
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
  getJackpotStats,
  getJackpotBidsSummary,
} from "@/lib/admin";

const OFFICIAL_JACKPOT_NUMBERS = [
  "000",
  "111",
  "222",
  "333",
  "444",
  "555",
  "666",
  "777",
  "888",
  "999",
];

const OFFICIAL_JACKPOT_SLOTS = [
  { session_label: "10:00 AM", result_time: "10:00" },
  { session_label: "11:00 AM", result_time: "11:00" },
  { session_label: "12:00 PM", result_time: "12:00" },
  { session_label: "01:00 PM", result_time: "13:00" },
  { session_label: "02:00 PM", result_time: "14:00" },
  { session_label: "03:00 PM", result_time: "15:00" },
  { session_label: "04:00 PM", result_time: "16:00" },
  { session_label: "05:00 PM", result_time: "17:00" },
  { session_label: "06:00 PM", result_time: "18:00" },
  { session_label: "07:00 PM", result_time: "19:00" },
  { session_label: "08:00 PM", result_time: "20:00" },
  { session_label: "09:00 PM", result_time: "21:00" },
];

export default function JackpotPage() {
  const [market, setMarket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // Overall Stats
  const [stats, setStats] = useState<{
    total_wagered: number;
    total_payout: number;
    total_profit: number;
    total_players: number;
    total_bets: number;
    house_edge_pct: number;
  } | null>(null);

  // Results Management State (Jackpot = Panna Numbers Only)
  const [declaredResults, setDeclaredResults] = useState<any[]>([]);
  const [loadingResults, setLoadingResults] = useState(true);
  const [resultDate, setResultDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [sessionLabel, setSessionLabel] = useState("");
  const [pannaNumber, setPannaNumber] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [isDeclaring, setIsDeclaring] = useState(false);

  // Slot Live Bets Breakdown
  const [slotBids, setSlotBids] = useState<Record<string, number>>({});
  const [loadingSlotBids, setLoadingSlotBids] = useState(false);

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

  const loadStats = useCallback(async () => {
    try {
      const s = await getJackpotStats();
      if (s) setStats(s);
    } catch {
      // ignore
    }
  }, []);

  const loadResults = useCallback(async () => {
    setLoadingResults(true);
    try {
      const data = await listJackpotResults();
      setDeclaredResults(data || []);
    } catch {
      setDeclaredResults([]);
    } finally {
      setLoadingResults(false);
    }
  }, []);

  useEffect(() => {
    load();
    loadStats();
    loadResults();
  }, [load, loadStats, loadResults]);

  // Whenever sessionLabel or resultDate changes, fetch live bets on numbers
  useEffect(() => {
    if (!market || !sessionLabel || !resultDate) {
      setSlotBids({});
      return;
    }
    let active = true;
    setLoadingSlotBids(true);
    getJackpotBidsSummary({
      market_id: market.id,
      bid_date: resultDate,
      session: sessionLabel,
    })
      .then((data: any[]) => {
        if (!active) return;
        const map: Record<string, number> = {};
        for (const item of data || []) {
          const num = String(item.selected_number || "").trim();
          map[num] = (map[num] || 0) + (Number(item.total_amount) || 0);
        }
        setSlotBids(map);
      })
      .catch(() => {
        if (active) setSlotBids({});
      })
      .finally(() => {
        if (active) setLoadingSlotBids(false);
      });

    return () => {
      active = false;
    };
  }, [market, sessionLabel, resultDate]);

  async function initMarket() {
    try {
      setLoading(true);
      await createJackpotMarket({
        name: "Jackpot",
        market_type: "jackpot",
        game_days: "Mon-Sun",
        sequence_number: 0,
        holiday_status: false,
        is_active: true,
        schedules: OFFICIAL_JACKPOT_SLOTS,
      });
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Error initializing jackpot market");
      setLoading(false);
    }
  }

  async function handleToggleActive(nextActive: boolean) {
    if (!market) return;
    setSavingSettings(true);
    try {
      const payload = { ...market, is_active: nextActive };
      await updateJackpotMarket(market.id, payload);
      setMarket(payload);
      toast.success(`Jackpot market is now ${nextActive ? "ACTIVE" : "SUSPENDED"}`);
    } catch (err: any) {
      toast.error(parseApiError(err, "Failed to update market status"));
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleToggleHoliday(nextHoliday: boolean) {
    if (!market) return;
    setSavingSettings(true);
    try {
      const payload = { ...market, holiday_status: nextHoliday };
      await updateJackpotMarket(market.id, payload);
      setMarket(payload);
      toast.success(`Jackpot holiday status updated to ${nextHoliday ? "HOLIDAY" : "OPEN"}`);
    } catch (err: any) {
      toast.error(parseApiError(err, "Failed to update holiday status"));
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleSyncOfficialSlots() {
    if (!market) return;
    if (!confirm("Reset and sync Jackpot to official 12 time slots (10:00 AM - 09:00 PM)?")) return;
    setIsSyncing(true);
    try {
      const payload = {
        ...market,
        name: "Jackpot",
        schedules: OFFICIAL_JACKPOT_SLOTS,
      };
      await updateJackpotMarket(market.id, payload);
      await load();
      toast.success("Synchronized to official 12 time slots (10:00 AM - 09:00 PM)");
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

  async function declareResult() {
    if (!market || !pannaNumber || !sessionLabel) return;
    if (!OFFICIAL_JACKPOT_NUMBERS.includes(pannaNumber)) {
      setError("Invalid Jackpot number! Jackpot result must be one of the 10 official numbers: 000, 111, 222, 333, 444, 555, 666, 777, 888, 999");
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
        toast.success(`Jackpot result for ${sessionLabel} declared: ♠ ${pannaNumber} ♠`);
        setPannaNumber("");
        setSessionLabel("");
        loadResults();
        loadStats();
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
      toast.success("Result deleted successfully and bets rolled back");
      loadResults();
      loadStats();
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

  const slotTotalWagered = useMemo(() => {
    return Object.values(slotBids).reduce((acc, curr) => acc + curr, 0);
  }, [slotBids]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Jackpot Console & Results"
        description="Manage official 12 time slots, monitor live exposures, and declare triplet panna results (000 - 999)"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/ouradminportal/jackpot-bids">
              <Button variant="outline" size="sm" className="text-xs font-bold text-amber-600 dark:text-amber-400 border-amber-500/30">
                Live Bid Data 📊
              </Button>
            </Link>
            <Link href="/ouradminportal/jackpot-bids-history">
              <Button variant="outline" size="sm" className="text-xs font-bold">
                Bids History 🎲
              </Button>
            </Link>
            <Link href="/ouradminportal/game-rates">
              <Button variant="outline" size="sm" className="text-xs">
                Game Rates 💰
              </Button>
            </Link>
          </div>
        }
      />

      <ErrorMsg msg={error} />
      {msg && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300 font-semibold flex items-center justify-between">
          <span>{msg}</span>
          <button onClick={() => setMsg(null)} className="text-emerald-600 dark:text-emerald-400 hover:text-white text-xs">✕</button>
        </div>
      )}

      {/* KPI Performance Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="p-3.5 rounded-xl shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block mb-1">
            Total Jackpot Bets
          </span>
          <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
            ₹{(stats?.total_wagered ?? 0).toLocaleString("en-IN")}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
            {stats?.total_bets ?? 0} tickets placed
          </span>
        </Card>

        <Card className="p-3.5 rounded-xl shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block mb-1">
            Total Payouts
          </span>
          <div className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400">
            ₹{(stats?.total_payout ?? 0).toLocaleString("en-IN")}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
            Disbursed to winners
          </span>
        </Card>

        <Card className="p-3.5 rounded-xl shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block mb-1">
            House Profit (GGR)
          </span>
          <div
            className={`text-lg sm:text-xl font-black ${
              (stats?.total_profit ?? 0) >= 0 ? "text-blue-600 dark:text-blue-400" : "text-rose-600 dark:text-rose-400"
            }`}
          >
            ₹{(stats?.total_profit ?? 0).toLocaleString("en-IN")}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
            House Margin: {stats?.house_edge_pct ?? 0}%
          </span>
        </Card>

        <Card className="p-3.5 rounded-xl shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block mb-1">
            Active Players
          </span>
          <div className="text-lg sm:text-xl font-black text-purple-600 dark:text-purple-400">
            {stats?.total_players ?? 0}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
            Registered bettors
          </span>
        </Card>

        <Card className="p-3.5 rounded-xl shadow-xs col-span-2 sm:col-span-1">
          <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block mb-1">
            Market Status
          </span>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black uppercase ${
                market?.is_active !== false && !market?.holiday_status
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                  : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
              }`}
            >
              {market?.holiday_status ? "● HOLIDAY" : market?.is_active !== false ? "● LIVE" : "○ PAUSED"}
            </span>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
            12 Daily Sessions
          </span>
        </Card>
      </div>

      {loading ? (
        <div className="p-8 text-center">
          <Spinner />
        </div>
      ) : !market ? (
        <Card title="Jackpot System Setup" className="text-center py-8">
          <EmptyState
            title="No Jackpot Market Found"
            hint="Initialize the jackpot system to start adding time slots and accepting triplet bids."
          />
          <Button onClick={initMarket} className="mt-4 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold">
            Initialize Jackpot System
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Time Slots & Results */}
          <div className="lg:col-span-2 space-y-6">
            {/* Market Operation Controls */}
            <Card
              title="Jackpot Market Operational Settings"
              subtitle="Quick switches to pause the market or set holiday mode"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      Market Availability
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Enables Jackpot game across the player mobile app.
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant={market.is_active !== false ? "primary" : "outline"}
                    onClick={() => handleToggleActive(market.is_active === false)}
                    disabled={savingSettings}
                    className="text-xs font-bold"
                  >
                    {market.is_active !== false ? "ACTIVE" : "SUSPENDED"}
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      Holiday Mode
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Close betting today for national holidays / maintenance.
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant={market.holiday_status ? "danger" : "outline"}
                    onClick={() => handleToggleHoliday(!market.holiday_status)}
                    disabled={savingSettings}
                    className="text-xs font-bold"
                  >
                    {market.holiday_status ? "HOLIDAY ON" : "OPEN NORMAL"}
                  </Button>
                </div>
              </div>
            </Card>

            {/* Time Slots (Sessions) */}
            <Card
              title="Jackpot Time Slots (Sessions)"
              subtitle="12 Official Time Slots (10:00 AM to 09:00 PM) — Every hour on the dot"
              actions={
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSyncOfficialSlots}
                  disabled={isSyncing}
                  className="border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 text-xs font-bold"
                >
                  {isSyncing ? "Syncing..." : "⚡ Sync 12 Official Slots (10:00 AM - 09:00 PM)"}
                </Button>
              }
            >
              <div className="mb-6 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 flex flex-wrap gap-4 items-end">
                <div className="w-48">
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Result Time</label>
                  <TimePicker value={newTime} onChange={setNewTime} />
                </div>
                <Button onClick={handleAddSlot} disabled={!newTime || isAddingSlot} className="mb-0.5 text-xs font-bold">
                  {isAddingSlot ? "Adding..." : "+ Add Slot"}
                </Button>
              </div>

              {market.schedules && market.schedules.length > 0 ? (
                <div className="table-wrap">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                        <th className="py-2.5 px-4">Time Slot</th>
                        <th className="py-2.5 px-4">Schedule Time</th>
                        <th className="text-right px-4">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {market.schedules.map((s: any, idx: number) => (
                        <tr key={idx} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">{s.session_label}</td>
                          <td className="px-4 text-slate-500 dark:text-slate-400 font-mono">{s.result_time || "—"}</td>
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

            {/* Results History Table */}
            <Card title="Recent Jackpot Results" subtitle="Panna Numbers history for Jackpot slots">
              {loadingResults ? (
                <Spinner />
              ) : declaredResults.length === 0 ? (
                <EmptyState title="No Jackpot results declared yet" />
              ) : (
                <div className="table-wrap">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
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
                          <tr key={r.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-3 text-slate-600 dark:text-slate-300 font-medium">{dateStr}</td>
                            <td className="px-3 font-semibold text-slate-900 dark:text-white">{r.session_label}</td>
                            <td className="px-3 text-center">
                              <span className="inline-block rounded-lg bg-amber-500/10 border border-amber-500/40 px-3.5 py-1 font-mono font-black text-amber-700 dark:text-amber-300 text-lg tracking-widest">
                                ♠ {pannaVal} ♠
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

          {/* Right Column: Upload Result (10 Official Jackpot Numbers Only) */}
          <div className="space-y-6">
            <Card
              title="Upload Jackpot Result"
              subtitle="Only 10 official winning numbers allowed (000, 111, 222, 333, 444, 555, 666, 777, 888, 999)"
            >
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Result Date *</label>
                  <Input type="date" value={resultDate} onChange={(e) => setResultDate(e.target.value)} />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Select Time Slot *</label>
                  <Select value={sessionLabel} onChange={(e) => setSessionLabel(e.target.value)}>
                    <option value="">-- Choose Slot --</option>
                    {market.schedules?.map((s: any) => (
                      <option key={s.id || s.session_label} value={s.session_label}>
                        {s.session_label} ({s.result_time?.slice(0, 5)})
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Live Exposure Preview for Selected Slot */}
                {sessionLabel && (
                  <div className="p-3.5 rounded-xl border border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-blue-700 dark:text-blue-300">
                      <span>Live Slot Bets: {sessionLabel}</span>
                      <span>
                        {loadingSlotBids ? "Calculating..." : `₹${slotTotalWagered.toLocaleString("en-IN")}`}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Check amounts below to verify house payout liability before declaring.
                    </p>
                  </div>
                )}

                {/* 10 Official Numbers Selector (000 - 999) */}
                <div className="rounded-xl border border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                      Select Winning Number *
                    </label>
                    <Badge color={OFFICIAL_JACKPOT_NUMBERS.includes(pannaNumber) ? "emerald" : "slate"}>
                      {OFFICIAL_JACKPOT_NUMBERS.includes(pannaNumber)
                        ? `Selected: ♠ ${pannaNumber} ♠`
                        : "Select from below"}
                    </Badge>
                  </div>

                  {/* 10 Interactive Number Chips with Live Bets Indicator */}
                  <div className="grid grid-cols-5 gap-2">
                    {OFFICIAL_JACKPOT_NUMBERS.map((num) => {
                      const isSelected = pannaNumber === num;
                      const betAmt = slotBids[num] || 0;
                      return (
                        <button
                          key={num}
                          type="button"
                          onClick={() => {
                            setError(null);
                            setPannaNumber(num);
                          }}
                          className={`py-2 px-1 text-center font-mono font-black text-sm rounded-lg border transition-all flex flex-col items-center justify-center ${
                            isSelected
                              ? "bg-amber-400 text-slate-950 border-amber-300 shadow-md shadow-amber-500/40 scale-105"
                              : "bg-white dark:bg-slate-800/80 text-amber-700 dark:text-amber-300 border-slate-200 dark:border-slate-700 hover:border-amber-500/50 hover:bg-amber-50/50 dark:hover:bg-slate-800"
                          }`}
                        >
                          <span>{num}</span>
                          {betAmt > 0 && (
                            <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                              ₹{betAmt}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      Or Choose from Dropdown:
                    </label>
                    <Select
                      value={pannaNumber}
                      onChange={(e) => {
                        setError(null);
                        setPannaNumber(e.target.value);
                      }}
                    >
                      <option value="">-- Choose from 10 Official Numbers --</option>
                      {OFFICIAL_JACKPOT_NUMBERS.map((num) => (
                        <option key={num} value={num}>
                          ♠ {num} ♠ {slotBids[num] ? `(₹${slotBids[num]} bets)` : ""}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block text-center">
                    Jackpot numbers are strictly triplets: 000, 111, 222, 333, 444, 555, 666, 777, 888, 999.
                  </span>
                </div>

                {/* Live Jackpot Preview Card */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4 text-center">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold block mb-2">
                    Jackpot Winning Card Preview
                  </span>
                  <div className="inline-block rounded-xl border border-amber-500/50 bg-amber-500/10 px-8 py-3 font-mono text-3xl font-black text-amber-700 dark:text-amber-300 tracking-widest shadow-inner">
                    ♠ {pannaNumber || "***"} ♠
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block mt-2">
                    Slot: <strong className="text-slate-900 dark:text-white font-bold">{sessionLabel || "Not Selected"}</strong>
                  </span>
                  {pannaNumber && slotBids[pannaNumber] !== undefined && (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold block mt-1">
                      Bets on {pannaNumber}: ₹{slotBids[pannaNumber].toLocaleString("en-IN")}
                    </span>
                  )}
                </div>

                <Button
                  onClick={declareResult}
                  disabled={!OFFICIAL_JACKPOT_NUMBERS.includes(pannaNumber) || !sessionLabel || isDeclaring}
                  className="w-full bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-black py-2.5 text-sm"
                >
                  {isDeclaring
                    ? "Processing..."
                    : `Upload Jackpot Result ${pannaNumber ? `(♠ ${pannaNumber} ♠)` : ""}`}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
