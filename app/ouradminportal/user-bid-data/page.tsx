"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { format, fmtMoney } from "@/lib/format";
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
import { useUserModal } from "@/components/UserModalContext";
import { WhatsAppLink } from "@/components/WhatsAppLink";

const REGULAR_BET_TYPES = [
  { key: "single_ank", label: "Single Digit" },
  { key: "jodi", label: "Jodi digit" },
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

function normalizeRegularBetType(betType?: string, selectedNumber: string = ""): string {
  const t = (betType || "").toLowerCase().trim();
  if (t === "single_ank" || t === "single_digit" || t === "single") return "single_ank";
  if (
    t === "jodi" ||
    t === "jodi_digit" ||
    t === "red_bracket" ||
    t === "group_jodi" ||
    t === "digit_based_jodi"
  ) {
    return "jodi";
  }
  if (t === "single_patti" || t === "single_pana" || t === "sp") return "single_patti";
  if (t === "double_patti" || t === "double_pana" || t === "dp") return "double_patti";
  if (t === "triple_patti" || t === "triple_pana" || t === "tp") return "triple_patti";
  if (t === "half_sangam_a") return "half_sangam_a";
  if (t === "half_sangam_b") return "half_sangam_b";
  if (t === "half_sangam") {
    const parts = (selectedNumber || "").split("-");
    if (parts.length === 2) {
      if (parts[0].length === 3 && parts[1].length === 1) return "half_sangam_a";
      if (parts[0].length === 1 && parts[1].length === 3) return "half_sangam_b";
    }
    return "half_sangam_a";
  }
  if (t === "full_sangam") return "full_sangam";
  return t;
}

function normalizeStarlineBetType(betType?: string): string {
  const t = (betType || "").toLowerCase().trim();
  if (t === "single_ank" || t === "single_digit" || t === "starline" || t === "single") return "single_ank";
  if (t === "single_patti" || t === "single_pana" || t === "sp") return "single_patti";
  if (t === "double_patti" || t === "double_pana" || t === "dp") return "double_patti";
  if (t === "triple_patti" || t === "triple_pana" || t === "tp") return "triple_patti";
  return t;
}

function isSameDate(bDate?: string | null, placedAt?: string | null, targetDate?: string): boolean {
  if (!targetDate) return true;
  if (bDate && bDate.slice(0, 10) === targetDate) return true;
  if (placedAt && placedAt.slice(0, 10) === targetDate) return true;
  return false;
}

export default function UserBidDataPage() {
  const { openUser } = useUserModal();

  // Mode: regular | starline | both
  const [activeMode, setActiveMode] = useState<"regular" | "starline" | "both">("both");

  // Filters
  const [bidDate, setBidDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [regularMarketId, setRegularMarketId] = useState<string>("");
  const [starlineMarketId, setStarlineMarketId] = useState<string>("");

  // Market lists
  const [regularMarkets, setRegularMarkets] = useState<any[]>([]);
  const [starlineMarkets, setStarlineMarkets] = useState<any[]>([]);

  // Users & Selection
  const [allUsers, setAllUsers] = useState<CachedUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [userSearchQuery, setUserSearchQuery] = useState<string>("");
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Raw Bids
  const [regularBids, setRegularBids] = useState<any[]>([]);
  const [starlineBids, setStarlineBids] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Parse initial query params (e.g. ?userId=123)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const uid = sp.get("userId") || sp.get("user_id");
      if (uid) setSelectedUserId(uid);
      const mId = sp.get("marketId") || sp.get("market_id");
      if (mId) setRegularMarketId(mId);
      const sId = sp.get("starlineMarketId") || sp.get("starline_market_id");
      if (sId) setStarlineMarketId(sId);
      const mode = sp.get("mode");
      if (mode === "regular" || mode === "starline" || mode === "both") {
        setActiveMode(mode);
      }
      const dt = sp.get("date") || sp.get("bid_date");
      if (dt) setBidDate(dt);
    }
  }, []);

  // Load Markets and Users
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const [regData, starData, users] = await Promise.all([
          listMarkets({}).catch(() => []),
          listStarlineMarkets({}).catch(() => []),
          prefetchAllUsers().catch(() => []),
        ]);
        if (!isMounted) return;

        const filteredRegular = (regData || []).filter(
          (m: any) => m.market_type === "regular" || !m.market_type
        );
        setRegularMarkets(filteredRegular);
        if (filteredRegular.length > 0 && !regularMarketId) {
          setRegularMarketId(filteredRegular[0].id.toString());
        }

        setStarlineMarkets(starData || []);
        if (starData && starData.length > 0 && !starlineMarketId) {
          setStarlineMarketId(starData[0].id.toString());
        }

        if (Array.isArray(users) && users.length > 0) {
          setAllUsers(users);
        } else {
          const directUsers = await listUsers({ limit: 1000 }).catch(() => []);
          primeUserCache(directUsers);
          setAllUsers(directUsers);
        }
      } catch (err: any) {
        console.error("Failed to load initial metadata", err);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // Selected User Object
  const selectedUser = useMemo(() => {
    if (!selectedUserId) return null;
    const uid = Number(selectedUserId);
    return allUsers.find((u) => u.id === uid) || null;
  }, [allUsers, selectedUserId]);

  // Filtered Users for Dropdown
  const filteredUsers = useMemo(() => {
    if (!userSearchQuery.trim()) return allUsers.slice(0, 30);
    const q = userSearchQuery.trim().toLowerCase();
    return allUsers
      .filter((u) => {
        const idStr = String(u.id);
        const uname = (u.username || "").toLowerCase();
        const fname = (u.full_name || "").toLowerCase();
        const phone = String(u.phone || u.mobile_number || "").toLowerCase();
        return idStr.includes(q) || uname.includes(q) || fname.includes(q) || phone.includes(q);
      })
      .slice(0, 30);
  }, [allUsers, userSearchQuery]);

  // Load user bid data
  const loadUserBids = useCallback(async () => {
    if (!selectedUserId) {
      setRegularBids([]);
      setStarlineBids([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const uid = Number(selectedUserId);

      // Fetch regular bids and starline bids for this user
      const promises: Promise<any>[] = [];

      // Regular bids
      promises.push(
        listBids({
          user_id: uid,
          market_id: regularMarketId ? Number(regularMarketId) : undefined,
          market_type: "regular",
          limit: 2000,
        }).catch((e) => {
          console.error("Error loading user regular bids:", e);
          return [];
        })
      );

      // Starline bids
      promises.push(
        listStarlineBids({
          market_id: starlineMarketId ? Number(starlineMarketId) : undefined,
        }).catch((e) => {
          console.error("Error loading user starline bids:", e);
          return [];
        })
      );

      const [regResult, starResult] = await Promise.all(promises);

      // Process and filter Regular
      const processedRegular = (regResult || []).filter((b: any) => {
        if (Number(b.user_id) !== uid) return false;
        if (b.status?.toLowerCase() === "cancelled") return false;
        if (regularMarketId && Number(b.market_id) !== Number(regularMarketId)) return false;
        return isSameDate(b.bid_date, b.placed_at, bidDate);
      });

      // Process and filter Starline
      const processedStarline = (starResult || []).filter((b: any) => {
        if (Number(b.user_id) !== uid) return false;
        if (b.status?.toLowerCase() === "cancelled") return false;
        if (starlineMarketId && Number(b.market_id) !== Number(starlineMarketId)) return false;
        return isSameDate(b.bid_date, b.placed_at, bidDate);
      });

      setRegularBids(processedRegular);
      setStarlineBids(processedStarline);
    } catch (e: any) {
      setError(parseApiError(e, "Failed to load user bid data"));
    } finally {
      setLoading(false);
    }
  }, [selectedUserId, regularMarketId, starlineMarketId, bidDate]);

  useEffect(() => {
    loadUserBids();
  }, [loadUserBids]);

  // Grouped Regular Data
  const getRegularGroupedData = (targetKey: string) => {
    const map = new Map<string, number>();
    for (const b of regularBids) {
      const type = normalizeRegularBetType(b.bet_type, b.selected_number);
      if (type === targetKey) {
        const num = String(b.selected_number || "").trim();
        map.set(num, (map.get(num) || 0) + Number(b.amount || 0));
      }
    }
    return Array.from(map.entries())
      .map(([selected_number, total_amount]) => ({
        selected_number,
        total_amount,
      }))
      .sort((a, b) => {
        const numA = parseInt(a.selected_number, 10);
        const numB = parseInt(b.selected_number, 10);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.selected_number.localeCompare(b.selected_number);
      });
  };

  // Grouped Starline Data
  const getStarlineGroupedData = (targetKey: string) => {
    const map = new Map<string, number>();
    for (const b of starlineBids) {
      const type = normalizeStarlineBetType(b.bet_type);
      if (type === targetKey) {
        const num = String(b.selected_number || "").trim();
        map.set(num, (map.get(num) || 0) + Number(b.amount || 0));
      }
    }
    return Array.from(map.entries())
      .map(([selected_number, total_amount]) => ({
        selected_number,
        total_amount,
      }))
      .sort((a, b) => {
        const numA = parseInt(a.selected_number, 10);
        const numB = parseInt(b.selected_number, 10);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.selected_number.localeCompare(b.selected_number);
      });
  };

  // Totals
  const regularGrandTotal = useMemo(() => {
    return regularBids.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  }, [regularBids]);

  const starlineGrandTotal = useMemo(() => {
    return starlineBids.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  }, [starlineBids]);

  const combinedGrandTotal = regularGrandTotal + starlineGrandTotal;

  // Active Market Names
  const regularMarketName =
    regularMarkets.find((m) => m.id.toString() === regularMarketId)?.name || "Regular Market";
  const starlineMarketName =
    starlineMarkets.find((m) => m.id.toString() === starlineMarketId)?.name || "Starline Market";

  // Build Clipboard Text
  const buildCopyText = (includeHeader: boolean = true) => {
    const nowTime = format(new Date(), "hh:mm a").toLowerCase();
    const formattedDate = format(new Date(bidDate), "dd/MM/yyyy");
    const userLabel = selectedUser
      ? `${selectedUser.full_name || selectedUser.username || "User"} (${selectedUser.phone || selectedUser.mobile_number || `#${selectedUser.id}`})`
      : `User #${selectedUserId}`;

    let text = "";

    if (activeMode === "regular") {
      if (includeHeader) {
        text += `${regularMarketName} ₹ :\n`;
        text += `User: ${userLabel}\n`;
        text += `Date and Time   ${nowTime} ${formattedDate}\n\n`;
      }
      for (const bt of REGULAR_BET_TYPES) {
        text += `${bt.label}\n`;
        const items = getRegularGroupedData(bt.key);
        if (items.length > 0) {
          for (const item of items) {
            text += `${item.selected_number} - ${item.total_amount}\n`;
          }
        } else {
          text += `0\n`;
        }
      }
      if (includeHeader) {
        text += `Total  ${regularGrandTotal}`;
      }
    } else if (activeMode === "starline") {
      if (includeHeader) {
        text += `${starlineMarketName} ₹ :\n`;
        text += `User: ${userLabel}\n`;
        text += `Date and Time   ${nowTime} ${formattedDate}\n\n`;
      }
      for (const bt of STARLINE_BET_TYPES) {
        text += `${bt.label}\n`;
        const items = getStarlineGroupedData(bt.key);
        if (items.length > 0) {
          for (const item of items) {
            text += `${item.selected_number} - ${item.total_amount}\n`;
          }
        } else {
          text += `0\n`;
        }
      }
      if (includeHeader) {
        text += `Total  ${starlineGrandTotal}`;
      }
    } else {
      // BOTH (Regular followed by Starline)
      if (includeHeader) {
        text += `User Bid Report (Regular: ${regularMarketName} | Starline: ${starlineMarketName}) ₹ :\n`;
        text += `User: ${userLabel}\n`;
        text += `Date and Time   ${nowTime} ${formattedDate}\n\n`;
      }
      for (const bt of REGULAR_BET_TYPES) {
        text += `${bt.label}\n`;
        const items = getRegularGroupedData(bt.key);
        if (items.length > 0) {
          for (const item of items) {
            text += `${item.selected_number} - ${item.total_amount}\n`;
          }
        } else {
          text += `0\n`;
        }
      }
      for (const bt of STARLINE_BET_TYPES) {
        text += `${bt.label}\n`;
        const items = getStarlineGroupedData(bt.key);
        if (items.length > 0) {
          for (const item of items) {
            text += `${item.selected_number} - ${item.total_amount}\n`;
          }
        } else {
          text += `0\n`;
        }
      }
      if (includeHeader) {
        text += `Total  ${combinedGrandTotal}`;
      }
    }

    return text.trim();
  };

  // Copy with header
  const copyFormattedToClipboard = () => {
    if (!selectedUserId) {
      toast.error("Please select a user first.");
      return;
    }
    const text = buildCopyText(true);
    navigator.clipboard
      .writeText(text)
      .then(() => {
        toast.success("Copied formatted Bid Data to clipboard!");
      })
      .catch((err) => {
        console.error("Could not copy text:", err);
        toast.error("Failed to copy to clipboard.");
      });
  };

  // Copy plain text format (e.g. Single Digit 0 Jodi digit 0 ...)
  const copyPlainTemplateToClipboard = () => {
    if (!selectedUserId) {
      toast.error("Please select a user first.");
      return;
    }
    const text = buildCopyText(false);
    navigator.clipboard
      .writeText(text)
      .then(() => {
        toast.success("Copied raw Bid Data to clipboard!");
      })
      .catch((err) => {
        console.error("Could not copy text:", err);
        toast.error("Failed to copy to clipboard.");
      });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Bid Data"
        description="View and copy formatted accumulated regular and starline bid data for a specific user. (Full Result - Open & Close Included)"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={copyPlainTemplateToClipboard}
              disabled={loading || !selectedUserId}
              title="Copy plain categories and numbers without header"
            >
              📄 Copy Plain Format
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={copyFormattedToClipboard}
              disabled={loading || !selectedUserId}
            >
              📋 Copy to Clipboard
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadUserBids()}
              disabled={loading || !selectedUserId}
            >
              🔄 Refresh
            </Button>
          </div>
        }
      />

      {/* Main Control Panel */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        {/* Mode Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveMode("both")}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-lg transition",
                activeMode === "both"
                  ? "bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              )}
            >
              📑 Both (Regular & Starline)
            </button>
            <button
              type="button"
              onClick={() => setActiveMode("regular")}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-lg transition",
                activeMode === "regular"
                  ? "bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              )}
            >
              🎲 Regular Bids (8 Types)
            </button>
            <button
              type="button"
              onClick={() => setActiveMode("starline")}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-lg transition",
                activeMode === "starline"
                  ? "bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              )}
            >
              ⭐ Starline Bids (4 Types)
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
              ✓ Full Result (No Open/Close split needed)
            </span>
          </div>
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          {/* User Selector with Search Dropdown */}
          <div className="flex flex-col gap-1 relative" ref={dropdownRef}>
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                User <span className="text-rose-500">*</span>
              </label>
              {selectedUserId && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUserId("");
                    setUserSearchQuery("");
                  }}
                  className="text-[11px] text-slate-400 hover:text-rose-500 transition"
                >
                  Clear
                </button>
              )}
            </div>

            {selectedUser ? (
              <div className="flex items-center justify-between p-2 rounded-xl border border-brand-500/30 bg-brand-50/50 dark:bg-brand-950/20 text-xs">
                <div className="flex items-center gap-2 truncate">
                  <span className="w-6 h-6 rounded-full bg-brand-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                    {(selectedUser.full_name || selectedUser.username || "U")[0].toUpperCase()}
                  </span>
                  <div className="truncate">
                    <p className="font-bold text-slate-900 dark:text-slate-100 truncate">
                      {selectedUser.full_name || selectedUser.username}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {selectedUser.phone || selectedUser.mobile_number || `#${selectedUser.id}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => openUser(selectedUser.id)}
                    className="text-[10px] text-brand-600 dark:text-brand-400 hover:underline font-semibold px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  >
                    Profile ↗
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setUserDropdownOpen(true);
                      setUserSearchQuery("");
                    }}
                    className="text-[10px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  >
                    Change
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search user name, phone, or ID..."
                  value={userSearchQuery}
                  onFocus={() => setUserDropdownOpen(true)}
                  onChange={(e) => {
                    setUserSearchQuery(e.target.value);
                    setUserDropdownOpen(true);
                  }}
                  className="input-base text-xs w-full"
                />
              </div>
            )}

            {/* Dropdown Menu */}
            {userDropdownOpen && (
              <div className="absolute left-0 top-full mt-1 w-full max-h-64 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 p-1 space-y-0.5">
                <div className="p-1.5">
                  <input
                    type="text"
                    placeholder="Filter users..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="input-base text-xs w-full py-1 px-2"
                    autoFocus
                  />
                </div>
                {filteredUsers.length === 0 ? (
                  <div className="p-3 text-center text-xs text-slate-400">No users found</div>
                ) : (
                  filteredUsers.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        setSelectedUserId(u.id.toString());
                        setUserDropdownOpen(false);
                        setUserSearchQuery("");
                      }}
                      className={cn(
                        "w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition",
                        selectedUserId === u.id.toString()
                          ? "bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 font-bold"
                          : "hover:bg-slate-100 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300"
                      )}
                    >
                      <div className="truncate">
                        <span className="font-semibold">{u.full_name || u.username}</span>
                        <span className="text-[10px] text-slate-400 ml-1.5">
                          ({u.phone || u.mobile_number || `#${u.id}`})
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-slate-500 shrink-0">
                        ₹{u.wallet_balance ?? 0}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Date Picker with Quick Selectors */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Date
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setBidDate(format(new Date(), "yyyy-MM-dd"))}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-brand-50 dark:hover:bg-brand-500/10 hover:text-brand-600 dark:hover:text-brand-400 text-slate-600 dark:text-slate-300 transition"
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
                  className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-brand-50 dark:hover:bg-brand-500/10 hover:text-brand-600 dark:hover:text-brand-400 text-slate-600 dark:text-slate-300 transition"
                >
                  Yesterday
                </button>
              </div>
            </div>
            <input
              type="date"
              value={bidDate}
              onChange={(e) => setBidDate(e.target.value)}
              className="input-base text-xs"
            />
          </div>

          {/* Regular Market Selector (if Regular or Both) */}
          {(activeMode === "regular" || activeMode === "both") && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Regular Market
              </label>
              <Select
                value={regularMarketId}
                onChange={(e) => setRegularMarketId(e.target.value)}
              >
                {regularMarkets.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {/* Starline Market Selector (if Starline or Both) */}
          {(activeMode === "starline" || activeMode === "both") && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Starline Market
              </label>
              <Select
                value={starlineMarketId}
                onChange={(e) => setStarlineMarketId(e.target.value)}
              >
                {starlineMarkets.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </div>
      </div>

      <ErrorMsg msg={error} />

      {/* Main Content Area */}
      {!selectedUserId ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 text-2xl flex items-center justify-center mx-auto">
            👤
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            Select a User to View Bid Data
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Use the search box above to choose any user. You will see their accumulated bids
            neatly grouped into each bet type (Single Digit, Jodi digit, Single Pana, Double Pana,
            Triple Pana, Half Sangam A/B, and Full Sangam).
          </p>
        </div>
      ) : loading ? (
        <div className="p-12 text-center">
          <Spinner />
          <p className="text-xs text-slate-400 mt-2">Loading user bid data...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* User & Grand Totals Summary Card */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 font-black text-sm flex items-center justify-center">
                {(selectedUser?.full_name || selectedUser?.username || "U")[0].toUpperCase()}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>{selectedUser?.full_name || selectedUser?.username}</span>
                  <span className="text-xs font-normal text-slate-400">#{selectedUserId}</span>
                </h3>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>{selectedUser?.phone || selectedUser?.mobile_number || "No phone"}</span>
                  {selectedUser?.phone && <WhatsAppLink phone={String(selectedUser.phone)} />}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {(activeMode === "regular" || activeMode === "both") && (
                <div className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-right">
                  <span className="text-[10px] text-slate-500 block">Regular Total</span>
                  <span className="text-sm font-bold text-brand-600 dark:text-brand-400">
                    {fmtMoney(regularGrandTotal)}
                  </span>
                </div>
              )}

              {(activeMode === "starline" || activeMode === "both") && (
                <div className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-right">
                  <span className="text-[10px] text-slate-500 block">Starline Total</span>
                  <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                    {fmtMoney(starlineGrandTotal)}
                  </span>
                </div>
              )}

              <div className="px-3 py-1.5 rounded-lg bg-brand-500/10 border border-brand-500/20 text-right">
                <span className="text-[10px] text-brand-600 dark:text-brand-400 block font-semibold">
                  Combined Total
                </span>
                <span className="text-sm font-black text-brand-700 dark:text-brand-300">
                  {fmtMoney(combinedGrandTotal)}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 1: REGULAR BIDS */}
          {(activeMode === "regular" || activeMode === "both") && (
            <Card
              title={`Regular Bid Data - ${regularMarketName} (Total: ₹${regularGrandTotal})`}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {REGULAR_BET_TYPES.map((bt) => {
                  const items = getRegularGroupedData(bt.key);
                  const subtotal = items.reduce((sum, item) => sum + item.total_amount, 0);

                  return (
                    <div
                      key={bt.key}
                      className="bg-slate-50 dark:bg-slate-850 rounded-xl p-4 border border-slate-200 dark:border-slate-800 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3 border-b border-slate-200 dark:border-slate-800 pb-2">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            {bt.label}
                          </h4>
                          {items.length > 0 && (
                            <span className="text-xs font-bold text-brand-600 dark:text-brand-400">
                              ₹{subtotal}
                            </span>
                          )}
                        </div>

                        {items.length === 0 ? (
                          <div className="text-slate-400 dark:text-slate-500 font-mono text-sm py-2">
                            0
                          </div>
                        ) : (
                          <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                            {items.map((item) => (
                              <div
                                key={item.selected_number}
                                className="flex justify-between items-center text-sm border-b border-slate-100 dark:border-slate-800 pb-1 last:border-0 last:pb-0"
                              >
                                <span className="text-slate-700 dark:text-slate-300 font-medium">
                                  {item.selected_number}
                                </span>
                                <span className="text-brand-600 dark:text-brand-400 font-bold">
                                  {item.total_amount}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {items.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-400 flex justify-between">
                          <span>{items.length} numbers</span>
                          <span>Total: ₹{subtotal}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* SECTION 2: STARLINE BIDS */}
          {(activeMode === "starline" || activeMode === "both") && (
            <Card
              title={`Starline Bid Data - ${starlineMarketName} (Total: ₹${starlineGrandTotal})`}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {STARLINE_BET_TYPES.map((bt) => {
                  const items = getStarlineGroupedData(bt.key);
                  const subtotal = items.reduce((sum, item) => sum + item.total_amount, 0);

                  return (
                    <div
                      key={bt.key}
                      className="bg-slate-50 dark:bg-slate-850 rounded-xl p-4 border border-slate-200 dark:border-slate-800 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3 border-b border-slate-200 dark:border-slate-800 pb-2">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            {bt.label}
                          </h4>
                          {items.length > 0 && (
                            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                              ₹{subtotal}
                            </span>
                          )}
                        </div>

                        {items.length === 0 ? (
                          <div className="text-slate-400 dark:text-slate-500 font-mono text-sm py-2">
                            0
                          </div>
                        ) : (
                          <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                            {items.map((item) => (
                              <div
                                key={item.selected_number}
                                className="flex justify-between items-center text-sm border-b border-slate-100 dark:border-slate-800 pb-1 last:border-0 last:pb-0"
                              >
                                <span className="text-slate-700 dark:text-slate-300 font-medium">
                                  {item.selected_number}
                                </span>
                                <span className="text-amber-600 dark:text-amber-400 font-bold">
                                  {item.total_amount}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {items.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-400 flex justify-between">
                          <span>{items.length} numbers</span>
                          <span>Total: ₹{subtotal}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

