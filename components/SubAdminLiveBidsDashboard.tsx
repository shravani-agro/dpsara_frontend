"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { format } from "@/lib/format";
import {
  Card,
  Select,
  Spinner,
  ErrorMsg,
  PageHeader,
  Button,
  Badge,
} from "@/components/ui";
import { toast } from "@/components/Toast";
import { useAuth } from "@/components/AuthProvider";
import {
  listMarkets,
  getBidsSummary,
  listStarlineMarkets,
  getStarlineBidsSummary,
  listJackpotMarkets,
  getJackpotBidsSummary,
} from "@/lib/admin";
import { parseApiError } from "@/lib/error-parser";

const MAIN_BET_TYPES = [
  { key: "single_ank", label: "Single Digit" },
  { key: "jodi", label: "Jodi Digit" },
  { key: "single_patti", label: "Single Pana" },
  { key: "double_patti", label: "Double Pana" },
  { key: "triple_patti", label: "Triple Pana" },
  { key: "half_sangam_a", label: "Half Sangam A" },
  { key: "half_sangam_b", label: "Half Sangam B" },
  { key: "full_sangam", label: "Full Sangam" },
];

const STARLINE_BET_TYPES = [
  { key: "single_ank", label: "Single Digit" },
  { key: "single_patti", label: "Single Pana" },
  { key: "double_patti", label: "Double Pana" },
  { key: "triple_patti", label: "Triple Pana" },
];

const OFFICIAL_JACKPOT_PANAS = [
  "000", "111", "222", "333", "444", "555", "666", "777", "888", "999"
];

export function SubAdminLiveBidsDashboard() {
  const { hasPermission } = useAuth();

  const canMain = hasPermission("show_bid_data");
  const canStarline = hasPermission("show_starline_bids");
  const canJackpot = hasPermission("show_jackpot_bids");

  // Determine initial active tab based on permissions
  const initialTab = canMain ? "main" : canStarline ? "starline" : canJackpot ? "jackpot" : "none";
  const [activeTab, setActiveTab] = useState<"main" | "starline" | "jackpot" | "none">(initialTab);

  // Common Filters
  const [bidDate, setBidDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [session, setSession] = useState("open");

  // Main Markets State
  const [mainMarkets, setMainMarkets] = useState<any[]>([]);
  const [mainMarketId, setMainMarketId] = useState("");
  const [mainSummary, setMainSummary] = useState<any[]>([]);

  // Starline Markets State
  const [starlineMarkets, setStarlineMarkets] = useState<any[]>([]);
  const [starlineMarketId, setStarlineMarketId] = useState("");
  const [starlineSummary, setStarlineSummary] = useState<any[]>([]);

  // Jackpot Markets State
  const [jackpotMarkets, setJackpotMarkets] = useState<any[]>([]);
  const [jackpotMarketId, setJackpotMarketId] = useState("");
  const [jackpotSummary, setJackpotSummary] = useState<any[]>([]);

  // Loading & Refresh
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [countdown, setCountdown] = useState(10);

  // If activeTab is unpermitted, switch to first permitted
  useEffect(() => {
    if (activeTab === "main" && !canMain) {
      if (canStarline) setActiveTab("starline");
      else if (canJackpot) setActiveTab("jackpot");
      else setActiveTab("none");
    } else if (activeTab === "starline" && !canStarline) {
      if (canMain) setActiveTab("main");
      else if (canJackpot) setActiveTab("jackpot");
      else setActiveTab("none");
    } else if (activeTab === "jackpot" && !canJackpot) {
      if (canMain) setActiveTab("main");
      else if (canStarline) setActiveTab("starline");
      else setActiveTab("none");
    }
  }, [canMain, canStarline, canJackpot, activeTab]);

  // Load Markets for all 3 categories
  const loadAllMarkets = useCallback(async () => {
    try {
      const [regularRes, starlineRes, jackpotRes] = await Promise.allSettled([
        listMarkets({}),
        listStarlineMarkets({}),
        listJackpotMarkets({}),
      ]);

      if (regularRes.status === "fulfilled" && Array.isArray(regularRes.value)) {
        const regularOnly = regularRes.value.filter(
          (m: any) =>
            (m.market_type === "regular" || !m.market_type) &&
            m.market_type !== "starline" &&
            m.market_type !== "jackpot" &&
            !m.is_starline &&
            !m.is_jackpot
        );
        setMainMarkets(regularOnly);
        if (regularOnly.length > 0 && !mainMarketId) {
          setMainMarketId(String(regularOnly[0].id));
        }
      }

      if (starlineRes.status === "fulfilled" && Array.isArray(starlineRes.value)) {
        setStarlineMarkets(starlineRes.value);
        if (starlineRes.value.length > 0 && !starlineMarketId) {
          setStarlineMarketId(String(starlineRes.value[0].id));
        }
      }

      if (jackpotRes.status === "fulfilled" && Array.isArray(jackpotRes.value)) {
        setJackpotMarkets(jackpotRes.value);
        if (jackpotRes.value.length > 0 && !jackpotMarketId) {
          setJackpotMarketId(String(jackpotRes.value[0].id));
        }
      }
    } catch {
      // ignore
    }
  }, [mainMarketId, starlineMarketId, jackpotMarketId]);

  useEffect(() => {
    loadAllMarkets();
  }, [loadAllMarkets]);

  // Load Bids Data based on active tab
  const loadActiveBids = useCallback(
    async (isSilent = false) => {
      if (activeTab === "none") return;
      if (!isSilent) setLoading(true);
      setError(null);

      try {
        if (activeTab === "main" && mainMarketId) {
          const data = await getBidsSummary({
            market_id: Number(mainMarketId),
            bid_date: bidDate,
            session: session,
          });
          const processed = (data || []).map((d: any) => {
            if (d.bet_type === "half_sangam") {
              const parts = (d.selected_number || "").split("-");
              if (parts.length === 2) {
                if (parts[0].length === 3 && parts[1].length === 1) {
                  return { ...d, bet_type: "half_sangam_a" };
                } else if (parts[0].length === 1 && parts[1].length === 3) {
                  return { ...d, bet_type: "half_sangam_b" };
                }
              }
            }
            return d;
          });
          setMainSummary(processed);
        } else if (activeTab === "starline" && starlineMarketId) {
          const data = await getStarlineBidsSummary({
            market_id: Number(starlineMarketId),
            bid_date: bidDate,
          });
          setStarlineSummary(data || []);
        } else if (activeTab === "jackpot" && jackpotMarketId) {
          const data = await getJackpotBidsSummary({
            market_id: Number(jackpotMarketId),
            bid_date: bidDate,
          });
          setJackpotSummary(data || []);
        }
      } catch (err: any) {
        if (!isSilent) setError(parseApiError(err, "Failed to load live bid data"));
      } finally {
        if (!isSilent) setLoading(false);
        setCountdown(10);
      }
    },
    [activeTab, mainMarketId, starlineMarketId, jackpotMarketId, bidDate, session]
  );

  useEffect(() => {
    loadActiveBids();
  }, [loadActiveBids]);

  // Auto-Refresh Heartbeat
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          loadActiveBids(true);
          return 10;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadActiveBids]);

  // Calculation for Main
  const getMainGroupedData = (betType: string) => {
    return mainSummary
      .filter((d) => d.bet_type === betType)
      .sort((a, b) => {
        const numA = parseInt(a.selected_number, 10);
        const numB = parseInt(b.selected_number, 10);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return String(a.selected_number).localeCompare(String(b.selected_number));
      });
  };

  const mainGrandTotal = useMemo(() => {
    return mainSummary.reduce((acc, curr) => acc + (Number(curr.total_amount) || 0), 0);
  }, [mainSummary]);

  // Calculation for Starline
  const getStarlineGroupedData = (betType: string) => {
    return starlineSummary
      .filter((d) => d.bet_type === betType || (betType === "single_ank" && d.bet_type === "starline"))
      .sort((a, b) => {
        const numA = parseInt(a.selected_number, 10);
        const numB = parseInt(b.selected_number, 10);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return String(a.selected_number).localeCompare(String(b.selected_number));
      });
  };

  const starlineGrandTotal = useMemo(() => {
    return starlineSummary.reduce((acc, curr) => acc + (Number(curr.total_amount) || 0), 0);
  }, [starlineSummary]);

  // Calculation for Jackpot
  const jackpotGrandTotal = useMemo(() => {
    return jackpotSummary.reduce((acc, curr) => acc + (Number(curr.total_amount) || 0), 0);
  }, [jackpotSummary]);

  const jackpotBidsMap = useMemo(() => {
    const map = new Map<string, { total_amount: number; count: number }>();
    for (const b of jackpotSummary) {
      map.set(String(b.selected_number), {
        total_amount: Number(b.total_amount) || 0,
        count: Number(b.count) || 0,
      });
    }
    return map;
  }, [jackpotSummary]);

  // Copy Active Sheet to Clipboard
  const copyToClipboard = () => {
    const nowTime = format(new Date(), "hh:mm a").toLowerCase();
    const formattedDate = format(new Date(bidDate), "dd/MM/yyyy");

    if (activeTab === "main") {
      const mName = mainMarkets.find((m) => String(m.id) === mainMarketId)?.name || "Main Market";
      let text = `${mName} (${session.toUpperCase()}) ₹ :\nDate and Time: ${nowTime} ${formattedDate}\n`;
      for (const bt of MAIN_BET_TYPES) {
        text += `\n${bt.label}\n`;
        const group = getMainGroupedData(bt.key);
        if (group.length > 0) {
          for (const item of group) {
            text += `${item.selected_number} - ${item.total_amount}\n`;
          }
        } else {
          text += `0\n`;
        }
      }
      text += `\nTotal: ₹${mainGrandTotal}`;
      navigator.clipboard.writeText(text).then(() => {
        toast.success("Main Live Bids copied to clipboard!");
      });
    } else if (activeTab === "starline") {
      const mName = starlineMarkets.find((m) => String(m.id) === starlineMarketId)?.name || "Starline Market";
      let text = `${mName} ₹ :\nDate and Time: ${nowTime} ${formattedDate}\n`;
      for (const bt of STARLINE_BET_TYPES) {
        text += `\n${bt.label}\n`;
        const group = getStarlineGroupedData(bt.key);
        if (group.length > 0) {
          for (const item of group) {
            text += `${item.selected_number} - ${item.total_amount}\n`;
          }
        } else {
          text += `0\n`;
        }
      }
      text += `\nTotal: ₹${starlineGrandTotal}`;
      navigator.clipboard.writeText(text).then(() => {
        toast.success("Starline Live Bids copied to clipboard!");
      });
    } else if (activeTab === "jackpot") {
      const mName = jackpotMarkets.find((m) => String(m.id) === jackpotMarketId)?.name || "Jackpot Market";
      let text = `${mName} ₹ :\nDate and Time: ${nowTime} ${formattedDate}\n\nJackpot Triple Panas:\n`;
      for (const pana of OFFICIAL_JACKPOT_PANAS) {
        const item = jackpotBidsMap.get(pana);
        text += `${pana} - ${item?.total_amount || 0}\n`;
      }
      text += `\nTotal: ₹${jackpotGrandTotal}`;
      navigator.clipboard.writeText(text).then(() => {
        toast.success("Jackpot Live Bids copied to clipboard!");
      });
    }
  };

  if (activeTab === "none") {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
        <span className="text-4xl">🔒</span>
        <h2 className="mt-4 text-xl font-bold text-slate-800 dark:text-slate-100">Live Bids Access Not Enabled</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Your sub-admin account currently does not have permission to view Main, Starline, or Jackpot live bids. Contact the administrator.
        </p>
      </div>
    );
  }

  const currentGrandTotal =
    activeTab === "main" ? mainGrandTotal : activeTab === "starline" ? starlineGrandTotal : jackpotGrandTotal;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <PageHeader
        title="Live Bids Dashboard"
        description="Unified live bets monitor across Main, Starline, and Jackpot markets with real-time aggregate figures."
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                autoRefresh
                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700"
              }`}
            >
              <span className={`inline-block h-2 w-2 rounded-full ${autoRefresh ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
              <span>{autoRefresh ? `Auto-Refresh (${countdown}s)` : "Auto-Refresh Paused"}</span>
            </button>

            <Button variant="outline" size="sm" onClick={() => loadActiveBids(false)} disabled={loading}>
              ↻ Refresh
            </Button>

            <Button variant="primary" size="sm" onClick={copyToClipboard} disabled={loading} className="bg-brand-600 hover:bg-brand-500 text-white">
              📋 Copy Sheet
            </Button>
          </div>
        }
      />

      {/* Unified Tab Switcher */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 overflow-x-auto pb-1">
        {canMain && (
          <button
            type="button"
            onClick={() => setActiveTab("main")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === "main"
                ? "border-brand-500 text-brand-600 dark:text-brand-400 bg-brand-50/50 dark:bg-brand-950/20"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <span>📊</span>
            <span>Main Market Live Bids</span>
            {activeTab === "main" && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-brand-100 dark:bg-brand-900/60 text-brand-700 dark:text-brand-300">
                ₹{mainGrandTotal.toLocaleString("en-IN")}
              </span>
            )}
          </button>
        )}

        {canStarline && (
          <button
            type="button"
            onClick={() => setActiveTab("starline")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === "starline"
                ? "border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <span>⭐</span>
            <span>Starline Live Bids</span>
            {activeTab === "starline" && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                ₹{starlineGrandTotal.toLocaleString("en-IN")}
              </span>
            )}
          </button>
        )}

        {canJackpot && (
          <button
            type="button"
            onClick={() => setActiveTab("jackpot")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === "jackpot"
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <span>💰</span>
            <span>Jackpot Live Bids</span>
            {activeTab === "jackpot" && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                ₹{jackpotGrandTotal.toLocaleString("en-IN")}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Filter Controls Bar */}
      <div className="flex flex-wrap gap-4 items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        {/* Date Selector */}
        <div className="flex flex-col gap-1 w-full sm:w-48">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Date</label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setBidDate(format(new Date(), "yyyy-MM-dd"))}
                className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-brand-50 hover:text-brand-600 text-slate-600 dark:text-slate-300"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => {
                  const y = new Date();
                  y.setDate(y.getDate() - 1);
                  setBidDate(format(y, "yyyy-MM-dd"));
                }}
                className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-brand-50 hover:text-brand-600 text-slate-600 dark:text-slate-300"
              >
                Yesterday
              </button>
            </div>
          </div>
          <input
            type="date"
            value={bidDate}
            onChange={(e) => setBidDate(e.target.value)}
            className="input-base text-xs h-9"
          />
        </div>

        {/* Market Selector for Active Tab */}
        {activeTab === "main" && (
          <div className="flex flex-col gap-1 w-full sm:w-56">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Main Market</label>
            <Select value={mainMarketId} onChange={(e) => setMainMarketId(e.target.value)} className="h-9">
              {mainMarkets.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Select>
          </div>
        )}

        {activeTab === "starline" && (
          <div className="flex flex-col gap-1 w-full sm:w-56">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Starline Slot</label>
            <Select value={starlineMarketId} onChange={(e) => setStarlineMarketId(e.target.value)} className="h-9">
              {starlineMarkets.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Select>
          </div>
        )}

        {activeTab === "jackpot" && (
          <div className="flex flex-col gap-1 w-full sm:w-56">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Jackpot Slot</label>
            <Select value={jackpotMarketId} onChange={(e) => setJackpotMarketId(e.target.value)} className="h-9">
              {jackpotMarkets.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Select>
          </div>
        )}

        {/* Session Selector (Main Market only) */}
        {activeTab === "main" && (
          <div className="flex flex-col gap-1 w-full sm:w-48">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Session</label>
            <Select value={session} onChange={(e) => setSession(e.target.value)} className="h-9">
              <option value="open">Open Session</option>
              <option value="close">Close Session</option>
              <option value="jodi">Full / Jodi (All)</option>
            </Select>
          </div>
        )}

        {/* Total Badge in Bar */}
        <div className="sm:ml-auto flex items-center gap-3">
          <div className="text-right">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Bids Volume</span>
            <span className="text-xl font-black text-brand-600 dark:text-brand-400 font-mono">
              ₹{currentGrandTotal.toLocaleString("en-IN")}
            </span>
          </div>
        </div>
      </div>

      {error && <ErrorMsg msg={error} />}

      {loading ? (
        <div className="py-20 flex justify-center">
          <Spinner />
        </div>
      ) : activeTab === "main" ? (
        /* ================== MAIN MARKET BID SHEET ================== */
        <Card title={`Main Market Summary (Total Amount: ₹${mainGrandTotal.toLocaleString("en-IN")})`}>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {MAIN_BET_TYPES.map((bt) => {
              const items = getMainGroupedData(bt.key);
              const totalForType = items.reduce((s, i) => s + (Number(i.total_amount) || 0), 0);
              return (
                <div key={bt.key} className="bg-slate-50 dark:bg-slate-850 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-3 border-b border-slate-200 dark:border-slate-800 pb-2">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{bt.label}</h4>
                    <span className="text-xs font-bold text-slate-500 font-mono">₹{totalForType.toLocaleString("en-IN")}</span>
                  </div>
                  {items.length === 0 ? (
                    <div className="text-slate-400 dark:text-slate-500 text-sm italic py-2 text-center">No bets placed</div>
                  ) : (
                    <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
                      {items.map((item) => (
                        <div
                          key={item.selected_number}
                          className="flex justify-between items-center text-sm border-b border-slate-100 dark:border-slate-800 pb-1 last:border-0 last:pb-0"
                        >
                          <span className="text-slate-700 dark:text-slate-300 font-medium font-mono">
                            {item.selected_number}
                          </span>
                          <span className="text-brand-600 dark:text-brand-400 font-bold font-mono">
                            ₹{item.total_amount}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      ) : activeTab === "starline" ? (
        /* ================== STARLINE BID SHEET ================== */
        <Card title={`Starline Summary (Total Amount: ₹${starlineGrandTotal.toLocaleString("en-IN")})`}>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {STARLINE_BET_TYPES.map((bt) => {
              const items = getStarlineGroupedData(bt.key);
              const totalForType = items.reduce((s, i) => s + (Number(i.total_amount) || 0), 0);
              return (
                <div key={bt.key} className="bg-slate-50 dark:bg-slate-850 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-3 border-b border-slate-200 dark:border-slate-800 pb-2">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{bt.label}</h4>
                    <span className="text-xs font-bold text-slate-500 font-mono">₹{totalForType.toLocaleString("en-IN")}</span>
                  </div>
                  {items.length === 0 ? (
                    <div className="text-slate-400 dark:text-slate-500 text-sm italic py-2 text-center">No bets placed</div>
                  ) : (
                    <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
                      {items.map((item) => (
                        <div
                          key={item.selected_number}
                          className="flex justify-between items-center text-sm border-b border-slate-100 dark:border-slate-800 pb-1 last:border-0 last:pb-0"
                        >
                          <span className="text-slate-700 dark:text-slate-300 font-medium font-mono">
                            {item.selected_number}
                          </span>
                          <span className="text-indigo-600 dark:text-indigo-400 font-bold font-mono">
                            ₹{item.total_amount}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      ) : (
        /* ================== JACKPOT BID SHEET ================== */
        <Card title={`Jackpot Triple Pana Live Figures (Total: ₹${jackpotGrandTotal.toLocaleString("en-IN")})`}>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {OFFICIAL_JACKPOT_PANAS.map((pana) => {
              const item = jackpotBidsMap.get(pana);
              const amt = item?.total_amount || 0;
              const hasBets = amt > 0;
              return (
                <div
                  key={pana}
                  className={`p-4 rounded-xl border text-center transition ${
                    hasBets
                      ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700 shadow-sm"
                      : "bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-800 opacity-60"
                  }`}
                >
                  <p className="text-2xl font-black font-mono tracking-widest text-slate-900 dark:text-white">
                    {pana}
                  </p>
                  <p className="mt-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Staked</p>
                  <p className={`mt-0.5 text-base font-bold font-mono ${hasBets ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`}>
                    ₹{amt.toLocaleString("en-IN")}
                  </p>
                  {hasBets && (
                    <span className="mt-1 inline-block text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-semibold">
                      {item?.count || 1} bet{item?.count !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
