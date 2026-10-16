"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useTheme } from "@/components/useTheme";
import { Button, Spinner, cn } from "@/components/ui";
import { ToastContainer } from "@/components/Toast";
import { CommandPalette } from "@/components/CommandPalette";
import { getWithdrawalCounts } from "@/lib/admin";

function playWithdrawalChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.setValueAtTime(880, now + 0.15); // A5
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc.start(now);
    osc.stop(now + 0.6);
  } catch {
    // Autoplay restrictions may ignore until user interaction
  }
}

type NavItem = { href: string; label: string; icon: string };
type NavGroup = { label: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [{ href: "/admin", label: "Dashboard", icon: "▦" }],
  },
  {
    label: "Operations",
    items: [
      { href: "/admin/users", label: "Users", icon: "👤" },
      { href: "/admin/markets", label: "Markets", icon: "📈" },
      { href: "/admin/starline", label: "Starline", icon: "⭐" },
      { href: "/admin/jackpot", label: "Jackpot", icon: "💰" },
      { href: "/admin/results", label: "Results", icon: "🎯" },
    ],
  },
  {
    label: "Bids",
    items: [
      { href: "/admin/bids", label: "Regular Bids History", icon: "🎲" },
      { href: "/admin/starline-bids-history", label: "Starline Bids History", icon: "🎲" },
      { href: "/admin/regular-bids", label: "Regular Bid Data", icon: "📊" },
      { href: "/admin/starline-bids", label: "Starline Bid Data", icon: "📈" },
    ],
  },
  {
    label: "Finance",
    items: [
      { href: "/admin/transactions", label: "Transactions", icon: "💳" },
      { href: "/admin/deposits", label: "Deposits", icon: "➕" },
      { href: "/admin/withdrawals", label: "Withdrawals", icon: "💸" },
      { href: "/admin/game-rates", label: "Game Rates", icon: "💰" },
    ],
  },
  {
    label: "Engagement",
    items: [
      { href: "/admin/support", label: "Support Chat", icon: "💬" },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin/audit", label: "Audit Logs", icon: "🛡" },
      { href: "/admin/settings", label: "Settings", icon: "⚙" },
    ],
  },
];

const ALL_NAV: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

function isActive(item: NavItem, pathname: string) {
  return item.href === "/admin"
    ? pathname === "/admin"
    : pathname === item.href || pathname.startsWith(item.href + "/");
}

function NavContent({
  pathname,
  query,
  onNavigate,
  pendingWithdrawals = 0,
}: {
  pathname: string;
  query: string;
  onNavigate?: () => void;
  pendingWithdrawals?: number;
}) {
  const q = query.trim().toLowerCase();
  const groups = q
    ? [{ label: "", items: ALL_NAV.filter((i) => i.label.toLowerCase().includes(q)) }]
    : NAV_GROUPS;

  return (
    <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
      {groups.map((group) => (
        <div key={group.label || "search"}>
          {group.label && <div className="section-label">{group.label}</div>}
          {group.items.map((item) => {
            const active = isActive(item, pathname);
            const isWithdrawals = item.href === "/admin/withdrawals";
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn("nav-link flex items-center justify-between", active && "nav-link-active")}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="w-5 text-center text-base leading-none">{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </div>
                {isWithdrawals && pendingWithdrawals > 0 && (
                  <span className="ml-auto inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-black text-white bg-rose-600 rounded-full animate-pulse shadow-sm shadow-rose-600/50">
                    {pendingWithdrawals} PENDING
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
      {q && groups[0].items.length === 0 && (
        <p className="px-3 py-6 text-center text-sm text-slate-400">No matching pages</p>
      )}
    </nav>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { authenticated, loading, username, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [navQuery, setNavQuery] = useState("");
  const { theme, setTheme } = useTheme();
  const [pendingWithdrawals, setPendingWithdrawals] = useState(0);
  const [showWithdrawalPopup, setShowWithdrawalPopup] = useState(false);
  const prevPendingRef = React.useRef<number | null>(null);

  useEffect(() => {
    let mounted = true;
    const checkWithdrawals = async () => {
      try {
        const counts = await getWithdrawalCounts();
        const pending = Number(counts?.pending || 0);
        if (!mounted) return;
        setPendingWithdrawals(pending);

        if (prevPendingRef.current !== null && pending > prevPendingRef.current) {
          playWithdrawalChime();
          setShowWithdrawalPopup(true);
        } else if (prevPendingRef.current === null && pending > 0) {
          setShowWithdrawalPopup(true);
        }
        prevPendingRef.current = pending;
      } catch {
        // ignore polling errors
      }
    };

    checkWithdrawals();
    const interval = setInterval(checkWithdrawals, 10000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!loading && !authenticated) {
      router.replace("/login");
    }
  }, [loading, authenticated, router]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  if (loading || !authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="app-bg flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white/80 lg:flex">
        <div className="flex items-center gap-2 px-5 py-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl shadow-md ring-1 ring-brand-500/10">
            <img src="/images/logo/dpsara777-logo.svg" alt="SattaAdmin Logo" className="h-full w-full object-cover" />
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900">
            Satta<span className="text-brand-400">Admin</span>
          </span>
        </div>
        <div className="px-3 pb-2">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">🔍</span>
            <input
              value={navQuery}
              onChange={(e) => setNavQuery(e.target.value)}
              placeholder="Search pages…"
              className="w-full rounded-xl border border-slate-200 bg-slate-100 py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 outline-none transition-colors focus:border-brand-500/60 focus:ring-4 focus:ring-brand-500/15"
            />
          </div>
        </div>
        <NavContent pathname={pathname} query={navQuery} pendingWithdrawals={pendingWithdrawals} />
        <div className="border-t border-slate-200 p-3">
          <div className="px-2 pb-1 text-[11px] uppercase tracking-wide text-slate-400">
            Signed in as
          </div>
          <div className="px-2 pb-3 text-sm font-medium text-slate-700">{username || "admin"}</div>
          <Button variant="outline" size="sm" className="w-full" onClick={logout}>
            Logout
          </Button>
        </div>
      </aside>

      {/* Mobile drawer */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm transition-opacity lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => setOpen(false)}
      >
        <aside
          className={cn(
            "absolute left-0 top-0 flex h-full w-72 max-w-[80%] flex-col border-r border-slate-200 bg-white transition-transform duration-300",
            open ? "translate-x-0" : "-translate-x-full"
          )}
          onClick={(e) => e.stopPropagation()}
        >
           <div className="flex items-center justify-between px-5 py-5">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl shadow-md ring-1 ring-brand-500/10">
                <img src="/images/logo/dpsara777-logo.svg" alt="SattaAdmin Logo" className="h-full w-full object-cover" />
              </div>
              <span className="text-lg font-bold tracking-tight text-slate-900">
                Satta<span className="text-brand-400">Admin</span>
              </span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close menu"
            >
              ✕
            </button>
          </div>
          <div className="px-3 pb-2">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">🔍</span>
              <input
                value={navQuery}
                onChange={(e) => setNavQuery(e.target.value)}
                placeholder="Search pages…"
                className="w-full rounded-xl border border-slate-200 bg-slate-100 py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 outline-none transition-colors focus:border-brand-500/60 focus:ring-4 focus:ring-brand-500/15"
              />
            </div>
          </div>
          <NavContent pathname={pathname} query={navQuery} onNavigate={() => setOpen(false)} pendingWithdrawals={pendingWithdrawals} />
          <div className="border-t border-slate-200 p-3">
            <div className="px-2 pb-1 text-[11px] uppercase tracking-wide text-slate-400">
              Signed in as
            </div>
            <div className="px-2 pb-3 text-sm font-medium text-slate-700">{username || "admin"}</div>
            <Button variant="outline" size="sm" className="w-full" onClick={logout}>
              Logout
            </Button>
          </div>
        </aside>
      </div>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur lg:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setOpen(true)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label="Open menu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
              </svg>
            </button>
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg lg:hidden shadow-sm ring-1 ring-brand-500/10">
              <img src="/images/logo/dpsara777-logo.svg" alt="SattaAdmin Logo" className="h-full w-full object-cover" />
            </div>
             <h1 className="text-sm font-semibold text-slate-700">
               {ALL_NAV.find((n) =>
                 n.href === "/admin" ? pathname === "/admin" : (pathname === n.href || pathname.startsWith(n.href + "/"))
               )?.label ?? "Dashboard"}
             </h1>
          </div>
          <div className="flex items-center gap-2">
            {pendingWithdrawals > 0 && (
              <Link
                href="/admin/withdrawals"
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-300 dark:border-rose-800 text-xs font-bold animate-pulse hover:bg-rose-100 dark:hover:bg-rose-900/50 transition shadow-sm"
                title="View pending withdrawals"
              >
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600"></span>
                </span>
                <span>🚨 {pendingWithdrawals} Pending Withdrawal{pendingWithdrawals > 1 ? "s" : ""}</span>
              </Link>
            )}
            <span className="hidden items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-600 sm:flex">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              {username || "admin"}
            </span>
            <Button variant="ghost" size="sm" className="lg:hidden" onClick={logout}>
              Logout
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-sm text-slate-600 hover:bg-slate-200 transition-colors"
              aria-label="Toggle dark mode"
            >
              {theme === "dark" ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.395 15.947a13.953 13.953 0 0 1-4.22-1.447l-.356.188a6.553 6.553 0 0 0 1.063 4.67L21.077 24l-4.887 1.517a6.522 6.522 0 0 1-3.155-1.816l-.076-.255a6.518 6.518 0 0 0-4.388-3.061l-.355.187a13.989 13.989 0 0 1-5.727-1.71l-.022-.076a6.568 6.568 0 0 0-5.228 1.6l-.015.057a14.062 14.062 0 0 1-4.48 2.066l-.115.23a6.533 6.533 0 0 1-5.177-1.247l-.1-.213a14.026 14.026 0 0 1-2.378-5.077l.052-.216a6.527 6.527 0 0 0-.069-4.67l-.282-.518a8.315 8.315 0 0 1-1.126-4.357l-.115-.228a6.513 6.513 0 0 1 1.078-5.058l.1.217a13.968 13.968 0 0 1 3.157 1.077l.122-.25a6.523 6.523 0 0 0-1.065-4.67l-.322-.552a6.796 6.796 0 0 1-1.083-3.154l-.218-.368a6.836 6.836 0 0 1 .547-5.208l1.338-1.887a8.342 8.342 0 0 1 3.457-1.083l1.348.115c.3.013 .606.023.906.023s.607 0 .906-.023l1.35-.118a6.813 6.813 0 0 1 1.083 3.154l.22.368c.044.155.16 1.23.403 2.72l.1.212a6.522 6.522 0 0 0 1.063 4.67l.052-.077a13.995 13.995 0 0 1 4.577 1.81l.128-.252a6.558 6.558 0 0 0 5.178 1.246l.115-.23a6.522 6.522 0 0 1 5.18 1.077l.1.213a14.012 14.012 0 0 1 2.332 5.108l-.056.213a6.53 6.53 0 0 0 .072 4.67l.285.52a8.328 8.328 0 0 1 1.128 4.357l.118.228a6.517 6.517 0 0 1-1.083 5.058l-.1.217a13.985 13.985 0 0 1-3.167 1.083l-.122.25c.017.03.033.06.05.092l1.07 1.81a6.53 6.53 0 0 1-1.072 3.167l-.1.213a6.563 6.563 0 0 0-5.222 1.6l.013-.057a6.512 6.512 0 0 1-4.388 3.06l.355-.187a6.531 6.531 0 0 0 4.394 3.061l.077.255a6.505 6.505 0 0 1 3.152 1.816l4.893-1.515a6.556 6.556 0 0 1 1.063 4.671zM12 2l-4.11 6.89L7.86 5.17 12 2 12 2z" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l-4.11 6.89L7.86 5.17 12 2 12 2zM1 21l4.95-2.227L23 7l-4.937-2.226L12 21l-11 5zM1 7l4.95 2.227L11 17l4.937 2.226L1 7z" />
                </svg>
              )}
            </Button>
          </div>
        </header>

        <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">{children}</main>
      </div>

      {showWithdrawalPopup && pendingWithdrawals > 0 && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full p-4 rounded-2xl bg-white dark:bg-slate-900 border-2 border-rose-500 shadow-2xl shadow-rose-500/30">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-600 text-white font-bold text-lg animate-pulse">
              🚨
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="font-extrabold text-sm text-rose-600 dark:text-rose-400 uppercase tracking-wide">
                  Withdrawal Request!
                </p>
                <button
                  onClick={() => setShowWithdrawalPopup(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold p-1"
                >
                  ✕
                </button>
              </div>
              <p className="mt-1 text-xs text-slate-700 dark:text-slate-300 font-medium">
                There {pendingWithdrawals === 1 ? "is 1 new withdrawal request" : `are ${pendingWithdrawals} withdrawal requests`} waiting for approval.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <Link
                  href="/admin/withdrawals"
                  onClick={() => setShowWithdrawalPopup(false)}
                  className="flex-1 py-1.5 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold text-center shadow transition"
                >
                  Review & Approve
                </Link>
                <button
                  onClick={() => setShowWithdrawalPopup(false)}
                  className="py-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <CommandPalette />
      <ToastContainer />
    </div>
  );
}
