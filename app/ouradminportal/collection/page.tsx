"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { format, fmtMoney, fmtNum, fmtDate, fmtDateTime } from "@/lib/format";
import {
  Card,
  Select,
  Spinner,
  ErrorMsg,
  PageHeader,
  Button,
  Badge,
  cn,
} from "@/components/ui";
import { toast } from "@/components/Toast";
import {
  listMarkets,
  listStarlineMarkets,
  listBids,
  listStarlineBids,
  listUsers,
} from "@/lib/admin";
import { CachedUser, prefetchAllUsers, primeUserCache } from "@/lib/user-cache";
import { parseApiError } from "@/lib/error-parser";
import { WhatsAppLink } from "@/components/WhatsAppLink";
import { useUserModal } from "@/components/UserModalContext";

function isSameDate(bDate?: string | null, placedAt?: string | null, targetDate?: string): boolean {
  if (!targetDate) return true;
  if (bDate && bDate.slice(0, 10) === targetDate) return true;
  if (placedAt && placedAt.slice(0, 10) === targetDate) return true;
  return false;
}

export default function CollectionPlusMinusPage() {
  const { openUser } = useUserModal();

  // Filters
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [gameMode, setGameMode] = useState<"all" | "regular" | "starline">("all");
  const [selectedMarketId, setSelectedMarketId] = useState<string>("all");
  const [searchUser, setSearchUser] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"markets" | "users" | "bids">("markets");

  // Data states
  const [regularMarkets, setRegularMarkets] = useState<any[]>([]);
  const [starlineMarkets, setStarlineMarkets] = useState<any[]>([]);
  const [regularBids, setRegularBids] = useState<any[]>([]);
  const [starlineBids, setStarlineBids] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<CachedUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Load initial markets and users
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const [regMarkets, starMarkets, users] = await Promise.all([
          listMarkets({}).catch(() => []),
          listStarlineMarkets({}).catch(() => []),
          prefetchAllUsers().catch(() => []),
        ]);
        if (!isMounted) return;

        const filteredReg = (regMarkets || []).filter(
          (m: any) => m.market_type === "regular" || !m.market_type
        );
        setRegularMarkets(filteredReg);
        setStarlineMarkets(starMarkets || []);

        if (Array.isArray(users) && users.length > 0) {
          setAllUsers(users);
        } else {
          const directUsers = await listUsers({ limit: 1000 }).catch(() => []);
          primeUserCache(directUsers);
          setAllUsers(directUsers);
        }
      } catch (err) {
        console.error("Error loading initial data", err);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // Load Bids
  const loadBids = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [regData, starData] = await Promise.all([
        listBids({ limit: 5000 }).catch(() => []),
        listStarlineBids({}).catch(() => []),
      ]);
      setRegularBids(regData || []);
      setStarlineBids(starData || []);
    } catch (e: any) {
      setError(parseApiError(e, "Failed to load bid telemetry"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBids();
  }, [loadBids]);

  // Filter bids for the selected date and market
  const filteredBids = useMemo(() => {
    const list: any[] = [];

    // Process regular bids
    if (gameMode === "all" || gameMode === "regular") {
      for (const b of regularBids) {
        if (b.status?.toLowerCase() === "cancelled") continue;
        if (!isSameDate(b.bid_date, b.placed_at, selectedDate)) continue;
        if (selectedMarketId !== "all" && String(b.market_id) !== String(selectedMarketId)) {
          continue;
        }
        list.push({
          ...b,
          is_starline: false,
          category: "Regular",
        });
      }
    }

    // Process starline bids
    if (gameMode === "all" || gameMode === "starline") {
      for (const b of starlineBids) {
        if (b.status?.toLowerCase() === "cancelled") continue;
        if (!isSameDate(b.bid_date, b.placed_at, selectedDate)) continue;
        if (selectedMarketId !== "all" && String(b.market_id) !== String(selectedMarketId)) {
          continue;
        }
        list.push({
          ...b,
          is_starline: true,
          category: "Starline",
        });
      }
    }

    return list;
  }, [regularBids, starlineBids, selectedDate, gameMode, selectedMarketId]);

  // Overall Financial Totals
  const overallStats = useMemo(() => {
    let totalCollection = 0;
    let totalWins = 0;
    let wonBidsCount = 0;
    let lostBidsCount = 0;
    let pendingBidsCount = 0;

    for (const b of filteredBids) {
      const amt = Number(b.amount || 0);
      totalCollection += amt;

      const st = (b.status || "").toLowerCase();
      if (st === "won") {
        wonBidsCount++;
        totalWins += Number(b.potential_win || b.win_amount || 0);
      } else if (st === "lost") {
        lostBidsCount++;
      } else {
        pendingBidsCount++;
      }
    }

    const netPlusMinus = totalCollection - totalWins;
    const isPositive = netPlusMinus > 0;
    const isNegative = netPlusMinus < 0;
    const absBalance = Math.abs(netPlusMinus);

    return {
      totalBidsCount: filteredBids.length,
      totalCollection,
      totalWins,
      wonBidsCount,
      lostBidsCount,
      pendingBidsCount,
      netPlusMinus,
      isPositive,
      isNegative,
      absBalance,
    };
  }, [filteredBids]);

  // Market-wise Breakdown
  const marketStats = useMemo(() => {
    const map = new Map<string, {
      market_id: number | string;
      market_name: string;
      category: string;
      bids_count: number;
      collection: number;
      wins: number;
      won_count: number;
      net_pl: number;
    }>();

    for (const b of filteredBids) {
      const key = `${b.category}-${b.market_id}`;
      const existing = map.get(key) || {
        market_id: b.market_id,
        market_name: b.market_name || "Unknown",
        category: b.category,
        bids_count: 0,
        collection: 0,
        wins: 0,
        won_count: 0,
        net_pl: 0,
      };

      existing.bids_count += 1;
      existing.collection += Number(b.amount || 0);

      if ((b.status || "").toLowerCase() === "won") {
        const winVal = Number(b.potential_win || b.win_amount || 0);
        existing.wins += winVal;
        existing.won_count += 1;
      }

      existing.net_pl = existing.collection - existing.wins;
      map.set(key, existing);
    }

    return Array.from(map.values()).sort((a, b) => b.collection - a.collection);
  }, [filteredBids]);

  // User-wise Breakdown
  const userStats = useMemo(() => {
    const map = new Map<number, {
      user_id: number;
      user_obj?: CachedUser;
      username: string;
      phone: string;
      bids_count: number;
      collection: number;
      wins: number;
      won_count: number;
      net_pl: number; // From company perspective: collection - wins
    }>();

    for (const b of filteredBids) {
      const uid = Number(b.user_id);
      if (!uid) continue;

      const cached = allUsers.find((u) => u.id === uid);
      const existing = map.get(uid) || {
        user_id: uid,
        user_obj: cached,
        username: b.username || cached?.full_name || cached?.username || `User #${uid}`,
        phone: String(b.phone || b.mobile_number || cached?.phone || cached?.mobile_number || ""),
        bids_count: 0,
        collection: 0,
        wins: 0,
        won_count: 0,
        net_pl: 0,
      };

      existing.bids_count += 1;
      existing.collection += Number(b.amount || 0);

      if ((b.status || "").toLowerCase() === "won") {
        const winVal = Number(b.potential_win || b.win_amount || 0);
        existing.wins += winVal;
        existing.won_count += 1;
      }

      existing.net_pl = existing.collection - existing.wins;
      map.set(uid, existing);
    }

    let arr = Array.from(map.values());
    if (searchUser.trim()) {
      const q = searchUser.trim().toLowerCase();
      arr = arr.filter(
        (u) =>
          u.username.toLowerCase().includes(q) ||
          u.phone.toLowerCase().includes(q) ||
          String(u.user_id).includes(q)
      );
    }

    return arr.sort((a, b) => b.collection - a.collection);
  }, [filteredBids, allUsers, searchUser]);

  // Date Formatting for Display
  const isToday = selectedDate === format(new Date(), "yyyy-MM-dd");
  const displayDateStr = format(new Date(selectedDate), "dd-MM-yyyy");
  const periodLabel = isToday ? `आजचा हिशोब (${displayDateStr})` : `तारीख: ${displayDateStr}`;

  const currentMarketLabel = useMemo(() => {
    if (selectedMarketId === "all") return "सर्व मार्केट (All Markets)";
    const reg = regularMarkets.find((m) => String(m.id) === String(selectedMarketId));
    if (reg) return reg.name;
    const star = starlineMarkets.find((m) => String(m.id) === String(selectedMarketId));
    if (star) return star.name;
    return "Market #" + selectedMarketId;
  }, [selectedMarketId, regularMarkets, starlineMarkets]);

  // Copy Settlement Message
  const buildSettlementReportText = () => {
    const { totalCollection, totalWins, netPlusMinus, absBalance, isPositive, isNegative } =
      overallStats;

    const statusTitle = isPositive ? "जमा (+)" : isNegative ? "नावे (−)" : "शून्य (0)";
    const balanceDisplay = isNegative
      ? `-₹${absBalance.toLocaleString("en-IN")}`
      : `+₹${absBalance.toLocaleString("en-IN")}`;

    const actionMsg = isPositive
      ? `कंपनीला आज ₹${absBalance.toLocaleString("en-IN")} नफा (Profit) झाला आहे.`
      : isNegative
        ? `कंपनीला आज ₹${absBalance.toLocaleString("en-IN")} तोटा (Payouts) झाला आहे.`
        : `दोन्ही बाजूंचा हिशोब पूर्णपणे जुळला आहे.`;

    let text = `DPSARA 777\n\n`;
    text += `आजचा कलेक्शन & प्लस-मायनस रिपोर्ट\n\n`;
    text += `कालावधी: ${periodLabel}\n`;
    text += `मार्केट: ${currentMarketLabel}\n\n`;
    text += `Total Collection: ₹${totalCollection.toLocaleString("en-IN")}\n`;
    text += `Total Win Amount: ₹${totalWins.toLocaleString("en-IN")}\n\n`;
    text += `Final Plus / Minus: ${balanceDisplay}\n`;
    text += `स्थिती: ${statusTitle}\n\n`;
    text += `👉 ${actionMsg}\n\n`;

    if (marketStats.length > 0) {
      text += `--- मार्केटनुसार तपशील (Market-wise) ---\n`;
      marketStats.slice(0, 15).forEach((m) => {
        const sign = m.net_pl > 0 ? "+" : m.net_pl < 0 ? "-" : "";
        text += `${m.market_name}: Col ₹${m.collection.toLocaleString("en-IN")} | Win ₹${m.wins.toLocaleString("en-IN")} | Net ${sign}₹${Math.abs(m.net_pl).toLocaleString("en-IN")}\n`;
      });
      text += `\n`;
    }

    text += `कृपया वरील हिशोब तपासून घ्यावा.\n`;
    text += `धन्यवाद! DPSARA 777 Admin`;

    return text;
  };

  const copyToClipboard = (text: string, id: string = "main") => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      toast.success("कलेक्शन & प्लस-मायनस रिपोर्ट क्लिपबोर्डवर कॉपी झाला!");
      setTimeout(() => setCopiedId(null), 2500);
    });
  };

  const copyUserReport = (u: any) => {
    const isPos = u.net_pl > 0;
    const isNeg = u.net_pl < 0;
    const absBal = Math.abs(u.net_pl);
    const balanceDisplay = isNeg
      ? `-₹${absBal.toLocaleString("en-IN")}`
      : `+₹${absBal.toLocaleString("en-IN")}`;
    const statusTitle = isPos ? "जमा (+)" : isNeg ? "नावे (−)" : "शून्य (0)";

    const text = `DPSARA 777 - युझर हिशोब रिपोर्ट

युझर नाव: ${u.username}
तारीख: ${periodLabel}

Total Collection: ₹${u.collection.toLocaleString("en-IN")}
Total Win Amount: ₹${u.wins.toLocaleString("en-IN")}

Final Plus / Minus: ${balanceDisplay}
स्थिती: ${statusTitle}

DPSARA 777 Admin`;

    copyToClipboard(text, `user-${u.user_id}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Today Collection & Plus/Minus"
        description="Monitor real-time daily collections, player winnings, and net settlement plus/minus."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(buildSettlementReportText(), "header")}
            >
              📋 {copiedId === "header" ? "Copied Report!" : "Copy Today Report"}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => loadBids()}
              disabled={loading}
            >
              🔄 Refresh
            </Button>
          </div>
        }
      />

      {/* Control Panel / Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          {/* Game Mode Pill */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setGameMode("all")}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-lg transition",
                gameMode === "all"
                  ? "bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              )}
            >
              📑 All Games (Regular + Starline)
            </button>
            <button
              type="button"
              onClick={() => setGameMode("regular")}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-lg transition",
                gameMode === "regular"
                  ? "bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              )}
            >
              🎲 Regular Only
            </button>
            <button
              type="button"
              onClick={() => setGameMode("starline")}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-lg transition",
                gameMode === "starline"
                  ? "bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              )}
            >
              ⭐ Starline Only
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-brand-500/10 text-brand-700 dark:text-brand-300 border border-brand-500/20">
              📅 {periodLabel}
            </span>
          </div>
        </div>

        {/* Filter Inputs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          {/* Date Selector with Quick Buttons */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                तारीख (Date)
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedDate(format(new Date(), "yyyy-MM-dd"))}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-brand-50 dark:hover:bg-brand-500/10 hover:text-brand-600 dark:hover:text-brand-400 text-slate-600 dark:text-slate-300 transition"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const y = new Date();
                    y.setDate(y.getDate() - 1);
                    setSelectedDate(format(y, "yyyy-MM-dd"));
                  }}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-brand-50 dark:hover:bg-brand-500/10 hover:text-brand-600 dark:hover:text-brand-400 text-slate-600 dark:text-slate-300 transition"
                >
                  Yesterday
                </button>
              </div>
            </div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="input-base text-xs"
            />
          </div>

          {/* Market Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              मार्केट निवडा (Market)
            </label>
            <Select
              value={selectedMarketId}
              onChange={(e) => setSelectedMarketId(e.target.value)}
              className="text-xs"
            >
              <option value="all">-- सर्व मार्केट एकत्र (All Markets) --</option>
              {gameMode !== "starline" && (
                <optgroup label="Regular Markets">
                  {regularMarkets.map((m) => (
                    <option key={`reg-${m.id}`} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </optgroup>
              )}
              {gameMode !== "regular" && (
                <optgroup label="Starline Markets">
                  {starlineMarkets.map((m) => (
                    <option key={`star-${m.id}`} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </Select>
          </div>

          {/* User Search Input */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              युझर शोधा (Filter User)
            </label>
            <input
              type="text"
              placeholder="Search user name, phone, or ID..."
              value={searchUser}
              onChange={(e) => setSearchUser(e.target.value)}
              className="input-base text-xs"
            />
          </div>
        </div>
      </div>

      <ErrorMsg msg={error} />

      {loading ? (
        <div className="p-16 text-center">
          <Spinner />
          <p className="text-xs text-slate-400 mt-2">Calculating collection & plus-minus telemetry...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 4 Summary Cards (Matching Kalyan 36 Bazar Style) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Business */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Total Business
                </span>
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm font-bold">
                  💼
                </div>
              </div>
              <p className="mt-1 text-xs text-slate-400">एकूण धंदा (All Stakes)</p>
              <p className="mt-2 text-2xl font-black text-slate-900 dark:text-slate-100">
                {fmtMoney(overallStats.totalCollection)}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                {overallStats.totalBidsCount} total bets placed
              </p>
            </div>

            {/* Total Collection */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Total Collection
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-sm font-bold">
                  💰
                </div>
              </div>
              <p className="mt-1 text-xs text-slate-400">एकूण कलेक्शन (100% बिड)</p>
              <p className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {fmtMoney(overallStats.totalCollection)}
              </p>
              <p className="mt-1 text-[11px] text-emerald-600/80 font-medium">
                Live Inflow
              </p>
            </div>

            {/* Total Win Amount */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Total Win Amount
                </span>
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center text-sm font-bold">
                  🏆
                </div>
              </div>
              <p className="mt-1 text-xs text-slate-400">एकूण विनिंग (Payouts)</p>
              <p className="mt-2 text-2xl font-black text-purple-600 dark:text-purple-400">
                {fmtMoney(overallStats.totalWins)}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                {overallStats.wonBidsCount} winning bets
              </p>
            </div>

            {/* Today Plus / Minus */}
            <div
              className={cn(
                "rounded-2xl border p-5 shadow-sm transition-all",
                overallStats.isPositive
                  ? "border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20"
                  : overallStats.isNegative
                  ? "border-rose-500/30 bg-rose-50/50 dark:bg-rose-950/20"
                  : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Today Plus / Minus
                </span>
                <span
                  className={cn(
                    "text-[10px] font-black px-2 py-0.5 rounded-full uppercase",
                    overallStats.isPositive
                      ? "bg-emerald-600 text-white"
                      : overallStats.isNegative
                      ? "bg-rose-600 text-white"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                  )}
                >
                  {overallStats.isPositive ? "जमा (+)" : overallStats.isNegative ? "नावे (−)" : "0"}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">अंतिम हिशोब (Net P&L)</p>
              <p
                className={cn(
                  "mt-2 text-2xl font-black",
                  overallStats.isPositive
                    ? "text-emerald-600 dark:text-emerald-400"
                    : overallStats.isNegative
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-slate-900 dark:text-slate-100"
                )}
              >
                {overallStats.isPositive
                  ? `+${fmtMoney(overallStats.absBalance)}`
                  : overallStats.isNegative
                  ? `-${fmtMoney(overallStats.absBalance)}`
                  : "₹0"}
              </p>
              <p className="mt-1 text-[11px] font-bold text-slate-600 dark:text-slate-300 truncate">
                {overallStats.isPositive
                  ? "कंपनी नफा (Profit)"
                  : overallStats.isNegative
                  ? "कंपनी तोटा (Payouts)"
                  : "हिशोब बरोबर"}
              </p>
            </div>
          </div>

          {/* Hero Settlement Card (Formula & WhatsApp Report Action) */}
          <div
            className={cn(
              "rounded-2xl border p-6 shadow-md transition-all",
              overallStats.isPositive
                ? "border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-white dark:via-slate-900 to-emerald-500/5"
                : overallStats.isNegative
                ? "border-rose-500/30 bg-gradient-to-br from-rose-500/10 via-white dark:via-slate-900 to-rose-500/5"
                : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
            )}
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    Final Settlement Formula / अंतिम सेटलमेंट
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-extrabold",
                      overallStats.isPositive
                        ? "bg-emerald-600 text-white"
                        : overallStats.isNegative
                        ? "bg-rose-600 text-white"
                        : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                    )}
                  >
                    {overallStats.isPositive
                      ? "जमा (+) / नफा"
                      : overallStats.isNegative
                      ? "नावे (−) / तोटा"
                      : "शून्य (0)"}
                  </span>
                </div>

                <div className="flex items-baseline gap-3">
                  <span className="text-sm font-semibold text-slate-500">Final Balance:</span>
                  <span
                    className={cn(
                      "text-3xl sm:text-4xl font-black font-mono",
                      overallStats.isPositive
                        ? "text-emerald-600 dark:text-emerald-400"
                        : overallStats.isNegative
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-slate-900 dark:text-slate-100"
                    )}
                  >
                    {overallStats.isPositive
                      ? `+₹${overallStats.absBalance.toLocaleString("en-IN")}`
                      : overallStats.isNegative
                      ? `-₹${overallStats.absBalance.toLocaleString("en-IN")}`
                      : "₹0"}
                  </span>
                </div>

                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  👉{" "}
                  {overallStats.isPositive
                    ? `कंपनीला आज ₹${overallStats.absBalance.toLocaleString("en-IN")} चा निव्वळ नफा (Net Profit) झाला आहे.`
                    : overallStats.isNegative
                    ? `कंपनीला आज ₹${overallStats.absBalance.toLocaleString("en-IN")} चे जास्तीचे विनिंग पेआऊट करावे लागले आहे.`
                    : `कलेक्शन आणि विनिंग पूर्णपणे समान आहे.`}
                </p>
              </div>

              {/* Formula calculation badge with quick copy */}
              <div className="flex flex-col items-start md:items-end gap-3 shrink-0">
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-800/80 p-3.5 text-xs backdrop-blur-sm shadow-xs space-y-1">
                  <p className="font-bold text-slate-500">हिशोब सूत्र (Calculation):</p>
                  <p className="font-mono text-slate-700 dark:text-slate-300">
                    कलेक्शन ({fmtMoney(overallStats.totalCollection)})
                    <br />
                    − विन अमाऊंट ({fmtMoney(overallStats.totalWins)})
                    <br />
                    <span className="font-black text-sm underline underline-offset-4">
                      = {overallStats.isPositive
                        ? `+₹${overallStats.absBalance.toLocaleString("en-IN")}`
                        : overallStats.isNegative
                        ? `-₹${overallStats.absBalance.toLocaleString("en-IN")}`
                        : "₹0"}
                    </span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => copyToClipboard(buildSettlementReportText(), "hero")}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-md transition active:scale-95"
                >
                  <span>📋</span>
                  <span>{copiedId === "hero" ? "Copied Report!" : "Copy WhatsApp Report"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Navigation Tabs (Market-wise vs User-wise vs All Bids) */}
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
            <button
              type="button"
              onClick={() => setActiveTab("markets")}
              className={cn(
                "px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5",
                activeTab === "markets"
                  ? "bg-brand-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900"
              )}
            >
              <span>📊</span>
              <span>मार्केटनुसार हिशोब (Market-wise: {marketStats.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("users")}
              className={cn(
                "px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5",
                activeTab === "users"
                  ? "bg-brand-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900"
              )}
            >
              <span>👤</span>
              <span>युझरनुसार हिशोब (User-wise: {userStats.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("bids")}
              className={cn(
                "px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5",
                activeTab === "bids"
                  ? "bg-brand-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900"
              )}
            >
              <span>🎲</span>
              <span>आजचे सर्व बिड्स (All Bids: {filteredBids.length})</span>
            </button>
          </div>

          {/* TAB 1: MARKET-WISE BREAKDOWN */}
          {activeTab === "markets" && (
            <Card title={`Market Collection & Plus/Minus Breakdown (${marketStats.length} Markets)`}>
              {marketStats.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  या तारखेसाठी कोणतीही बिड डेटा उपलब्ध नाही (No bets placed on this date)
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 dark:bg-slate-850 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="px-4 py-3">Market Name</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3 text-right">Total Bids</th>
                        <th className="px-4 py-3 text-right">Total Collection (धंदा)</th>
                        <th className="px-4 py-3 text-right">Total Won (पेआऊट)</th>
                        <th className="px-4 py-3 text-right">Plus / Minus (हिशोब)</th>
                        <th className="px-4 py-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                      {marketStats.map((m) => {
                        const isPos = m.net_pl > 0;
                        const isNeg = m.net_pl < 0;
                        return (
                          <tr
                            key={`${m.category}-${m.market_id}`}
                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                          >
                            <td className="px-4 py-3 font-bold text-slate-900 dark:text-slate-100">
                              {m.market_name}
                            </td>
                            <td className="px-4 py-3">
                              <Badge color={m.category === "Regular" ? "brand" : "amber"}>
                                {m.category}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-slate-500">
                              {m.bids_count}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                              {fmtMoney(m.collection)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-purple-600 dark:text-purple-400">
                              {fmtMoney(m.wins)}
                            </td>
                            <td
                              className={cn(
                                "px-4 py-3 text-right font-mono font-black text-sm",
                                isPos
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : isNeg
                                  ? "text-rose-600 dark:text-rose-400"
                                  : "text-slate-500"
                              )}
                            >
                              {isPos
                                ? `+${fmtMoney(m.net_pl)}`
                                : isNeg
                                ? `-${fmtMoney(Math.abs(m.net_pl))}`
                                : "₹0"}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span
                                className={cn(
                                  "px-2 py-0.5 rounded-full text-[10px] font-black",
                                  isPos
                                    ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                                    : isNeg
                                    ? "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                                    : "bg-slate-100 text-slate-500"
                                )}
                              >
                                {isPos ? "जमा (+)" : isNeg ? "नावे (−)" : "0"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-slate-50 dark:bg-slate-850 font-black border-t-2 border-slate-200 dark:border-slate-700">
                      <tr>
                        <td className="px-4 py-3">GRAND TOTAL</td>
                        <td className="px-4 py-3"></td>
                        <td className="px-4 py-3 text-right font-mono">
                          {overallStats.totalBidsCount}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                          {fmtMoney(overallStats.totalCollection)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-purple-600 dark:text-purple-400">
                          {fmtMoney(overallStats.totalWins)}
                        </td>
                        <td
                          className={cn(
                            "px-4 py-3 text-right font-mono text-sm",
                            overallStats.isPositive
                              ? "text-emerald-600 dark:text-emerald-400"
                              : overallStats.isNegative
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-slate-500"
                          )}
                        >
                          {overallStats.isPositive
                            ? `+${fmtMoney(overallStats.absBalance)}`
                            : overallStats.isNegative
                            ? `-${fmtMoney(overallStats.absBalance)}`
                            : "₹0"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-black",
                              overallStats.isPositive
                                ? "bg-emerald-600 text-white"
                                : overallStats.isNegative
                                ? "bg-rose-600 text-white"
                                : "bg-slate-200 text-slate-600"
                            )}
                          >
                            {overallStats.isPositive ? "जमा (+)" : overallStats.isNegative ? "नावे (−)" : "0"}
                          </span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </Card>
          )}

          {/* TAB 2: USER-WISE BREAKDOWN */}
          {activeTab === "users" && (
            <Card
              title={`User Collection & Plus/Minus Breakdown (${userStats.length} Players)`}
              actions={
                <Link href={`/ouradminportal/user-bid-data?date=${selectedDate}`}>
                  <Button variant="outline" size="sm">
                    👤 Detailed User Bid Data →
                  </Button>
                </Link>
              }
            >
              {userStats.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  कोणताही युझर डेटा सापडला नाही (No user activity found for selected filters)
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 dark:bg-slate-850 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="px-4 py-3">User</th>
                        <th className="px-4 py-3">Phone</th>
                        <th className="px-4 py-3 text-right">Total Bids</th>
                        <th className="px-4 py-3 text-right">Total Collection (बिड)</th>
                        <th className="px-4 py-3 text-right">Total Won (जिंकलेली रक्कम)</th>
                        <th className="px-4 py-3 text-right">Company P&L (प्लस/मायनस)</th>
                        <th className="px-4 py-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                      {userStats.map((u) => {
                        const isPos = u.net_pl > 0;
                        const isNeg = u.net_pl < 0;
                        return (
                          <tr
                            key={u.user_id}
                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => openUser(u.user_id)}
                                  className="font-bold text-slate-900 dark:text-slate-100 hover:text-brand-600 transition"
                                >
                                  {u.username}
                                </button>
                                <span className="text-[10px] text-slate-400">#{u.user_id}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5 font-mono text-slate-500">
                                <span>{u.phone || "No phone"}</span>
                                {u.phone && <WhatsAppLink phone={u.phone} />}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-slate-500">
                              {u.bids_count}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                              {fmtMoney(u.collection)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-purple-600 dark:text-purple-400">
                              {fmtMoney(u.wins)}
                            </td>
                            <td
                              className={cn(
                                "px-4 py-3 text-right font-mono font-black text-sm",
                                isPos
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : isNeg
                                  ? "text-rose-600 dark:text-rose-400"
                                  : "text-slate-500"
                              )}
                            >
                              {isPos
                                ? `+${fmtMoney(u.net_pl)}`
                                : isNeg
                                ? `-${fmtMoney(Math.abs(u.net_pl))}`
                                : "₹0"}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => copyUserReport(u)}
                                  className="p-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 transition text-[11px]"
                                  title="Copy user settlement report"
                                >
                                  📋
                                </button>
                                <Link
                                  href={`/ouradminportal/user-bid-data?userId=${u.user_id}&date=${selectedDate}`}
                                  className="px-2 py-0.5 rounded bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 hover:underline font-semibold text-[10px]"
                                >
                                  Bid Data
                                </Link>
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
          )}

          {/* TAB 3: ALL BIDS FEED */}
          {activeTab === "bids" && (
            <Card title={`All Bids Feed for ${periodLabel} (${filteredBids.length} Bids)`}>
              {filteredBids.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  या फिल्टरसाठी कोणतीही बिड नाही (No bids match the filter)
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 dark:bg-slate-850 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200 dark:border-slate-800 sticky top-0">
                      <tr>
                        <th className="px-4 py-2.5">User</th>
                        <th className="px-4 py-2.5">Market</th>
                        <th className="px-4 py-2.5">Game Type</th>
                        <th className="px-4 py-2.5">Digit / Pana</th>
                        <th className="px-4 py-2.5 text-right">Points (₹)</th>
                        <th className="px-4 py-2.5 text-right">Win (₹)</th>
                        <th className="px-4 py-2.5 text-center">Status</th>
                        <th className="px-4 py-2.5 text-right">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                      {filteredBids.slice(0, 100).map((b) => {
                        const st = (b.status || "").toLowerCase();
                        return (
                          <tr
                            key={`${b.category}-${b.id}`}
                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                          >
                            <td className="px-4 py-2 font-bold text-slate-900 dark:text-slate-100">
                              {b.username || `User #${b.user_id}`}
                            </td>
                            <td className="px-4 py-2">
                              <span className="font-semibold">{b.market_name}</span>
                              <span className="text-[10px] text-slate-400 ml-1">({b.category})</span>
                            </td>
                            <td className="px-4 py-2 text-slate-600 dark:text-slate-300 font-medium">
                              {b.bet_type?.replace(/_/g, " ")}
                            </td>
                            <td className="px-4 py-2 font-mono font-bold text-brand-600 dark:text-brand-400">
                              {b.selected_number}
                            </td>
                            <td className="px-4 py-2 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                              ₹{b.amount}
                            </td>
                            <td className="px-4 py-2 text-right font-mono font-bold text-purple-600 dark:text-purple-400">
                              {st === "won" ? `₹${b.potential_win || b.win_amount || 0}` : "—"}
                            </td>
                            <td className="px-4 py-2 text-center">
                              <Badge
                                color={
                                  st === "won"
                                    ? "emerald"
                                    : st === "lost"
                                    ? "red"
                                    : "amber"
                                }
                              >
                                {st}
                              </Badge>
                            </td>
                            <td className="px-4 py-2 text-right text-[11px] text-slate-400 font-mono">
                              {b.placed_at ? fmtDateTime(b.placed_at) : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {filteredBids.length > 100 && (
                    <div className="p-3 text-center text-xs text-slate-400 border-t border-slate-100 dark:border-slate-800">
                      Showing latest 100 of {filteredBids.length} total bids
                    </div>
                  )}
                </div>
              )}
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
