"use client";

import Link from "next/link";
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
import { listJackpotMarkets, getJackpotBidsSummary, getJackpotStats } from "@/lib/admin";
import { parseApiError } from "@/lib/error-parser";

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

export default function JackpotBidDataPage() {
  const [markets, setMarkets] = useState<any[]>([]);
  const [marketId, setMarketId] = useState("");
  const [bidDate, setBidDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [session, setSession] = useState("");
  const [summaryData, setSummaryData] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMarkets = useCallback(async () => {
    try {
      const data = await listJackpotMarkets({});
      setMarkets(data || []);
      if (data && data.length > 0) {
        setMarketId(data[0].id.toString());
      }
    } catch {
      setMarkets([]);
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

  useEffect(() => {
    loadMarkets();
    loadStats();
  }, [loadMarkets, loadStats]);

  const loadSummary = useCallback(async () => {
    if (!marketId || !bidDate) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getJackpotBidsSummary({
        market_id: Number(marketId),
        bid_date: bidDate,
        session: session || undefined,
      });
      setSummaryData(data || []);
    } catch (e: any) {
      setError(parseApiError(e, "Failed to load jackpot bid summary"));
    } finally {
      setLoading(false);
    }
  }, [marketId, bidDate, session]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const selectedMarket = useMemo(
    () => markets.find((m) => m.id.toString() === marketId),
    [markets, marketId]
  );

  // Group amounts by triplet (000 - 999)
  const numbersMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const num of OFFICIAL_JACKPOT_NUMBERS) {
      map[num] = 0;
    }
    for (const item of summaryData) {
      const clean = String(item.selected_number || "").trim();
      if (map[clean] !== undefined) {
        map[clean] += Number(item.total_amount) || 0;
      } else {
        map[clean] = (map[clean] || 0) + (Number(item.total_amount) || 0);
      }
    }
    return map;
  }, [summaryData]);

  const grandTotal = useMemo(() => {
    return summaryData.reduce((acc, curr) => acc + (Number(curr.total_amount) || 0), 0);
  }, [summaryData]);

  const maxBetNumber = useMemo(() => {
    let topNum = "";
    let maxVal = 0;
    for (const [num, val] of Object.entries(numbersMap)) {
      if (val > maxVal) {
        maxVal = val;
        topNum = num;
      }
    }
    return { number: topNum, amount: maxVal };
  }, [numbersMap]);

  const copyToClipboard = () => {
    const marketName = selectedMarket?.name || "Jackpot";
    const nowTime = format(new Date(), "hh:mm a").toLowerCase();
    const formattedDate = format(new Date(bidDate), "dd/MM/yyyy");
    const slotInfo = session ? `Slot: ${session}` : "All Slots";
    const header = `${marketName} ₹ :\nDate and Time: ${nowTime} ${formattedDate}\n${slotInfo}\n\n`;

    let body = "Jackpot Triplet Panna (000-999):\n";
    let hasAny = false;
    for (const num of OFFICIAL_JACKPOT_NUMBERS) {
      const amt = numbersMap[num] || 0;
      if (amt > 0) {
        body += `${num} - ₹${amt.toLocaleString("en-IN")}\n`;
        hasAny = true;
      }
    }
    if (!hasAny) {
      body += "No bets placed for this selection.\n";
    }
    body += `\nGrand Total: ₹${grandTotal.toLocaleString("en-IN")}`;

    const textToCopy = header + body;
    navigator.clipboard
      .writeText(textToCopy)
      .then(() => {
        toast.success("Copied Jackpot Bid Live Data to clipboard!");
      })
      .catch(() => {
        toast.error("Failed to copy to clipboard.");
      });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Jackpot Bid Live Data"
        description="Monitor real-time exposure, wager volumes, and copy formatted bid data per slot."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/ouradminportal/jackpot">
              <Button variant="outline" size="sm" className="text-xs">
                Market & Results 🎯
              </Button>
            </Link>
            <Link href="/ouradminportal/jackpot-bids-history">
              <Button variant="outline" size="sm" className="text-xs">
                Bids History 🎲
              </Button>
            </Link>
            <Button
              variant="primary"
              size="sm"
              onClick={copyToClipboard}
              disabled={loading || !marketId}
              className="text-xs font-bold bg-amber-500 hover:bg-amber-600 text-neutral-950"
            >
              Copy to Clipboard 📋
            </Button>
          </div>
        }
      />

      <ErrorMsg msg={error} />

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3.5 rounded-xl shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block mb-1">
            Total Jackpot Volume
          </span>
          <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
            ₹{(stats?.total_wagered ?? 0).toLocaleString("en-IN")}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
            {stats?.total_bets ?? 0} total tickets
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
            Won by players
          </span>
        </Card>

        <Card className="p-3.5 rounded-xl shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block mb-1">
            Net House Profit
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
            Current Filter Volume
          </span>
          <div className="text-lg sm:text-xl font-black text-amber-600 dark:text-amber-400">
            ₹{grandTotal.toLocaleString("en-IN")}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
            {session ? session : "All 12 Slots"}
          </span>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap gap-3.5 items-end bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        {/* Date Selector */}
        <div className="flex flex-col gap-1 w-full sm:w-48">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Date</label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setBidDate(format(new Date(), "yyyy-MM-dd"))}
                className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-500/10 hover:text-amber-600 text-slate-600 dark:text-slate-300 transition"
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
                className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-500/10 hover:text-amber-600 text-slate-600 dark:text-slate-300 transition"
              >
                Yesterday
              </button>
            </div>
          </div>
          <input
            type="date"
            value={bidDate}
            onChange={(e) => setBidDate(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Slot / Session Selector */}
        <div className="flex flex-col gap-1 w-full sm:w-56">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Time Slot (Session)</label>
          <Select value={session} onChange={(e) => setSession(e.target.value)} className="text-xs">
            <option value="">All 12 Time Slots</option>
            {selectedMarket?.schedules?.map((s: any) => (
              <option key={s.session_label || s.id} value={s.session_label}>
                {s.session_label} ({s.result_time?.slice(0, 5)})
              </option>
            ))}
          </Select>
        </div>

        {/* Refresh Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={loadSummary}
          loading={loading}
          className="text-xs h-9 px-3"
        >
          Refresh Data 🔄
        </Button>
      </div>

      {/* Main Exposure Matrix: 10 Official Triplet Numbers (000 - 999) */}
      <Card
        title="Jackpot Triplet Live Exposure Matrix"
        subtitle={`Live accumulated bids breakdown for ${bidDate}${session ? ` • ${session}` : " • All Sessions"}`}
        actions={
          maxBetNumber.amount > 0 && (
            <Badge variant="warning" className="text-[10px] font-bold">
              Highest Risk: ♠ {maxBetNumber.number} ♠ (₹{maxBetNumber.amount.toLocaleString("en-IN")})
            </Badge>
          )
        }
      >
        {loading ? (
          <div className="py-12 text-center">
            <Spinner />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {OFFICIAL_JACKPOT_NUMBERS.map((num) => {
              const amount = numbersMap[num] || 0;
              const hasBets = amount > 0;
              const isHighest = hasBets && maxBetNumber.number === num;

              return (
                <div
                  key={num}
                  className={`p-4 rounded-xl border transition-all ${
                    isHighest
                      ? "bg-amber-500/10 border-amber-500 shadow-sm ring-1 ring-amber-500/30"
                      : hasBets
                      ? "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 shadow-2xs"
                      : "bg-slate-50/50 dark:bg-slate-850/50 border-slate-200 dark:border-slate-800 opacity-75"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 tracking-wider">
                      ♠ {num} ♠
                    </span>
                    {isHighest && (
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500 text-neutral-950">
                        TOP
                      </span>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Bidded:</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        ₹{amount.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 dark:text-slate-500">Share:</span>
                      <span className="font-semibold text-slate-600 dark:text-slate-300">
                        {grandTotal > 0 ? ((amount / grandTotal) * 100).toFixed(1) : "0"}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Total Footer Banner */}
        <div className="mt-6 p-4 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 block">
              Filtered Volume Total
            </span>
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              ₹{grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/ouradminportal/jackpot">
              <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold text-xs">
                Declare Winning Result 🎯
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
