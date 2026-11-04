"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/components/ui";
import { useUserModal } from "@/components/UserModalContext";
import { useAuth } from "@/components/AuthProvider";
import { useTheme } from "@/components/useTheme";
import { listUsers, autoRejectExpiredDeposits } from "@/lib/admin";
import { fmtMoney } from "@/lib/format";
import { toast } from "@/components/Toast";

interface ActionItem {
  id: string;
  label: string;
  icon: string;
  section: "Actions" | "Users" | "Navigation";
  shortcut?: string;
  badge?: string;
  perform?: () => void;
  href?: string;
  subtitle?: string;
  permKey?: string;
  superAdminOnly?: boolean;
}

const STATIC_ACTIONS: ActionItem[] = [
  // Quick Actions
  {
    id: "action-auto-reject",
    label: "Auto-Reject Expired Deposits (>30m)",
    icon: "⚡",
    section: "Actions",
    shortcut: "A",
    subtitle: "Clean up unverified deposits older than 30 mins",
    permKey: "can_approve_deposit",
  },
  {
    id: "action-withdrawals",
    label: "Process Pending Withdrawals",
    icon: "💸",
    section: "Actions",
    shortcut: "W",
    href: "/ouradminportal/withdrawals",
    subtitle: "Review UPI & Bank payout requests",
    permKey: "show_withdrawals",
  },
  {
    id: "action-declare",
    label: "Declare Market Results",
    icon: "🎯",
    section: "Actions",
    shortcut: "D",
    href: "/ouradminportal/results",
    subtitle: "Input winning pana & ank for today",
    permKey: "can_add_result",
  },
  {
    id: "action-theme",
    label: "Toggle Theme (Dark / Light)",
    icon: "🌓",
    section: "Actions",
    shortcut: "T",
    subtitle: "Switch between dark and light appearance",
  },
  // Navigation
  { id: "nav-dash", href: "/ouradminportal", label: "Dashboard Overview", icon: "▦", section: "Navigation", permKey: "show_overview" },
  { id: "nav-users", href: "/ouradminportal/users", label: "Users Directory", icon: "👥", section: "Navigation", permKey: "can_manage_users" },
  { id: "nav-markets", href: "/ouradminportal/markets", label: "Markets Management", icon: "📈", section: "Navigation", permKey: "show_markets" },
  { id: "nav-starline", href: "/ouradminportal/starline", label: "Starline Markets", icon: "⭐", section: "Navigation", permKey: "show_starline" },
  { id: "nav-jackpot", href: "/ouradminportal/jackpot", label: "Jackpot Games", icon: "💰", section: "Navigation", permKey: "show_jackpot" },
  { id: "nav-bids", href: "/ouradminportal/bids", label: "Regular Bids History", icon: "🎲", section: "Navigation", permKey: "show_bids" },
  { id: "nav-starline-bids", href: "/ouradminportal/starline-bids-history", label: "Starline Bids History", icon: "🎲", section: "Navigation", permKey: "show_bids" },
  { id: "nav-deposits", href: "/ouradminportal/deposits", label: "Deposits Manager", icon: "➕", section: "Navigation", permKey: "show_deposits" },
  { id: "nav-txns", href: "/ouradminportal/transactions", label: "Transactions & Passbook", icon: "💳", section: "Navigation", permKey: "show_commission" },
  { id: "nav-rates", href: "/ouradminportal/game-rates", label: "Game Rates & Odds", icon: "🏷️", section: "Navigation", permKey: "show_markets" },
  { id: "nav-support", href: "/ouradminportal/support", label: "Live Support Chat", icon: "💬", section: "Navigation", permKey: "show_support" },
  { id: "nav-subadmins", href: "/ouradminportal/subadmins", label: "Sub Admins Directory", icon: "👥", section: "Navigation", superAdminOnly: true },
  { id: "nav-audit", href: "/ouradminportal/audit", label: "Security & Audit Logs", icon: "🛡️", section: "Navigation", superAdminOnly: true },
  { id: "nav-settings", href: "/ouradminportal/settings", label: "Platform Settings", icon: "⚙️", section: "Navigation", superAdminOnly: true },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [userResults, setUserResults] = useState<any[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const searchTimeoutRef = useRef<any>(null);

  const router = useRouter();
  const { openUser } = useUserModal();
  const { theme, setTheme } = useTheme();
  const { isSubAdmin, hasPermission } = useAuth();

  // Listen for Ctrl+K, Cmd+K, Escape, and custom trigger events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    const handleOpenCustom = () => setOpen(true);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("open-command-palette", handleOpenCustom);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("open-command-palette", handleOpenCustom);
    };
  }, []);

  // Debounced live user search when typing 2+ chars
  useEffect(() => {
    const clean = query.trim();
    if (clean.length >= 2) {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = setTimeout(async () => {
        setIsSearchingUsers(true);
        try {
          const res = await listUsers({ search: clean, limit: 5 });
          setUserResults(Array.isArray(res) ? res : []);
        } catch {
          setUserResults([]);
        } finally {
          setIsSearchingUsers(false);
        }
      }, 250);
    } else {
      setUserResults([]);
      setIsSearchingUsers(false);
    }

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [query]);

  // Combine static actions + live user results into a single navigable list
  const combinedItems: ActionItem[] = React.useMemo(() => {
    const q = query.trim().toLowerCase();

    // Map matched users
    const mappedUsers: ActionItem[] = userResults.map((u) => ({
      id: `user-${u.id}`,
      label: u.username || u.phone || `User #${u.id}`,
      subtitle: `${u.phone || "No phone"} · Balance: ${fmtMoney(u.wallet_balance || 0)}`,
      icon: "👤",
      section: "Users" as const,
      badge: `#${u.id}`,
      perform: () => {
        openUser(u.id, {
          username: u.username,
          phone: u.phone,
          full_name: u.full_name,
        });
      },
    }));

    const filteredStatic = STATIC_ACTIONS.filter((a) => {
      if (isSubAdmin) {
        if (a.superAdminOnly) return false;
        if (a.permKey && !hasPermission(a.permKey)) return false;
      }
      return (
        a.label.toLowerCase().includes(q) ||
        (a.subtitle && a.subtitle.toLowerCase().includes(q)) ||
        a.section.toLowerCase().includes(q)
      );
    });

    return [...mappedUsers, ...filteredStatic];
  }, [query, userResults, openUser]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [combinedItems.length, query]);

  const executeItem = useCallback(
    async (item: ActionItem) => {
      setOpen(false);
      setQuery("");

      if (item.id === "action-auto-reject") {
        toast.info("Auto-rejecting expired deposits (>30m)...");
        try {
          const res = await autoRejectExpiredDeposits(30);
          toast.success(`Complete: ${res?.auto_rejected || 0} expired deposits rejected`);
        } catch {
          toast.error("Failed to run auto-reject. Check audit logs.");
        }
        return;
      }

      if (item.id === "action-theme") {
        setTheme(theme === "dark" ? "light" : "dark");
        toast.success(`Theme switched to ${theme === "dark" ? "Light" : "Dark"} mode`);
        return;
      }

      if (item.perform) {
        item.perform();
        return;
      }

      if (item.href) {
        router.push(item.href);
      }
    },
    [router, setTheme, theme]
  );

  useEffect(() => {
    if (!open) return;
    const handleKeyNav = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, combinedItems.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && combinedItems.length > 0) {
        e.preventDefault();
        const selected = combinedItems[selectedIndex];
        if (selected) executeItem(selected);
      }
    };
    window.addEventListener("keydown", handleKeyNav);
    return () => window.removeEventListener("keydown", handleKeyNav);
  }, [open, combinedItems, selectedIndex, executeItem]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] sm:pt-[14vh] px-3 sm:px-0">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-md"
            onClick={() => setOpen(false)}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -16 }}
            transition={{ type: "spring", damping: 28, stiffness: 380 }}
            className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 shadow-2xl backdrop-blur-xl"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            {/* Search Input Bar */}
            <div className="flex items-center border-b border-slate-100 dark:border-slate-800 px-4 sm:px-5 relative">
              <span className="text-brand-500 text-lg mr-2 shrink-0">⚡</span>
              <input
                autoFocus
                className="w-full bg-transparent py-4 text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none"
                placeholder="Search users by name/phone, jump to pages, or run smart actions..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <div className="flex items-center gap-1.5 shrink-0 pl-2">
                {isSearchingUsers && (
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent mr-1" />
                )}
                <kbd className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                  ESC
                </kbd>
              </div>
            </div>

            {/* Results List */}
            <div className="max-h-[60vh] min-h-[220px] overflow-y-auto p-2 sm:p-3 space-y-1">
              {combinedItems.length === 0 ? (
                <div className="py-12 text-center flex flex-col items-center">
                  <span className="text-3xl opacity-40 mb-2">🔍</span>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    No results found for &quot;{query}&quot;
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Try searching by a phone number, username, or page title
                  </p>
                </div>
              ) : (
                combinedItems.map((item, i) => {
                  const isSelected = selectedIndex === i;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => executeItem(item)}
                      onMouseEnter={() => setSelectedIndex(i)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left transition-all duration-100",
                        isSelected
                          ? "bg-brand-500/10 dark:bg-brand-500/15 text-brand-900 dark:text-brand-200 border border-brand-500/30 shadow-xs"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-transparent"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base font-bold transition-colors",
                          isSelected
                            ? "bg-brand-500/20 text-brand-600 dark:text-brand-400"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                        )}
                      >
                        {item.icon}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "text-xs sm:text-sm font-bold truncate",
                              isSelected ? "text-brand-700 dark:text-brand-300" : "text-slate-900 dark:text-slate-100"
                            )}
                          >
                            {item.label}
                          </span>
                          {item.badge && (
                            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        {item.subtitle && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {item.subtitle}
                          </p>
                        )}
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
                          {item.section}
                        </span>
                        {isSelected && (
                          <span className="text-xs font-bold text-brand-600 dark:text-brand-400">
                            ↵
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Smart Footer Bar */}
            <div className="flex items-center justify-between px-4 py-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 bg-slate-50/80 dark:bg-slate-950/50">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1">
                  <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[10px] font-mono">↑↓</kbd> Navigate
                </span>
                <span className="inline-flex items-center gap-1">
                  <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[10px] font-mono">↵</kbd> Select
                </span>
              </div>
              <span className="font-medium text-slate-500">
                Tip: Press <kbd className="px-1 py-0.5 rounded bg-brand-500/10 text-brand-600 dark:text-brand-400 font-mono text-[10px]">Ctrl+K</kbd> anywhere
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
