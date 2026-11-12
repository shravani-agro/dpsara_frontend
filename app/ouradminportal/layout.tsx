"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useTheme } from "@/components/useTheme";
import { Button, Spinner, cn } from "@/components/ui";
import { ToastContainer } from "@/components/Toast";
import { CommandPalette } from "@/components/CommandPalette";
import { UserModalProvider } from "@/components/UserModalContext";
import { getWithdrawalCounts, getRealSpinProSettings, getFunTargetSettings /*, getWinGoSettings*/ } from "@/lib/admin";
import { prefetchAllUsers } from "@/lib/user-cache";

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

type NavItem = {
  href: string;
  label: string;
  icon: string;
  permKey?: string;
  superAdminOnly?: boolean;
};
type NavGroup = { label: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/ouradminportal", label: "Dashboard", icon: "▦", permKey: "show_overview" },
      { href: "/ouradminportal/users", label: "Users", icon: "👤", permKey: "can_manage_users" },
    ],
  },
  {
    label: "Main Market",
    items: [
      { href: "/ouradminportal/markets", label: "Main Markets", icon: "📈", permKey: "show_markets" },
      { href: "/ouradminportal/results", label: "Declare Results", icon: "🎯", permKey: "show_result" },
      { href: "/ouradminportal/bids", label: "Main Bids History", icon: "🎲", permKey: "show_bids" },
      { href: "/ouradminportal/regular-bids", label: "Main Bid Live Data", icon: "📊", permKey: "show_bid_data" },
    ],
  },
  {
    label: "Starline Market",
    items: [
      { href: "/ouradminportal/starline", label: "Starline Markets", icon: "⭐", permKey: "show_starline" },
      { href: "/ouradminportal/starline-bids-history", label: "Starline Bids History", icon: "🎲", permKey: "show_bids" },
      { href: "/ouradminportal/starline-bids", label: "Starline Bid Live Data", icon: "📈", permKey: "show_bid_data" },
    ],
  },
  {
    label: "Jackpot Market",
    items: [
      { href: "/ouradminportal/jackpot", label: "Jackpot Market & Results", icon: "💰", permKey: "show_jackpot" },
      { href: "/ouradminportal/jackpot-bids-history", label: "Jackpot Bids History", icon: "🎲", permKey: "show_bids" },
      { href: "/ouradminportal/jackpot-bids", label: "Jackpot Bid Live Data", icon: "📊", permKey: "show_bid_data" },
    ],
  },
  {
    label: "RealSpinPro Game",
    items: [
      { href: "/ouradminportal/realspinpro", label: "RealSpinPro Console", icon: "🎡" },
      { href: "/ouradminportal/realspinpro-bids-history", label: "RealSpinPro Bids History", icon: "🎰" },
    ],
  },
  {
    label: "Fun Target Game",
    items: [
      { href: "/ouradminportal/funtarget", label: "Fun Target Console", icon: "🎯" },
      { href: "/ouradminportal/funtarget-bids-history", label: "Fun Target Bids History", icon: "📋" },
    ],
  },
  // Commented out (Win Go Color Prediction disabled)
  // {
  //   label: "Win Go Game",
  //   items: [
  //     { href: "/ouradminportal/wingo", label: "Win Go Console", icon: "🎰" },
  //     { href: "/ouradminportal/wingo-bids-history", label: "Win Go Bids History", icon: "📊" },
  //   ],
  // },
  {
    label: "Player Analytics",
    items: [
      { href: "/ouradminportal/user-bid-data", label: "User Bid Data", icon: "👤", permKey: "show_bid_data" },
    ],
  },
  {
    label: "Finance",
    items: [
      { href: "/ouradminportal/transactions", label: "Transactions", icon: "💳", permKey: "show_commission" },
      { href: "/ouradminportal/collection", label: "Today Collection & P/L", icon: "📊", permKey: "show_overview" },
      { href: "/ouradminportal/deposits", label: "Deposits", icon: "➕", permKey: "show_deposits" },
      { href: "/ouradminportal/withdrawals", label: "Withdrawals", icon: "💸", permKey: "show_withdrawals" },
      { href: "/ouradminportal/game-rates", label: "Game Rates", icon: "💰", permKey: "show_markets" },
    ],
  },
  {
    label: "Engagement",
    items: [
      { href: "/ouradminportal/whatsapp", label: "WhatsApp Marketing", icon: "📱", permKey: "show_support" },
      { href: "/ouradminportal/support", label: "Support Chat", icon: "💬", permKey: "show_support" },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/ouradminportal/subadmins", label: "Sub Admins", icon: "👥", superAdminOnly: true },
      { href: "/ouradminportal/audit", label: "Audit Logs", icon: "🛡", superAdminOnly: true },
      { href: "/ouradminportal/settings", label: "Settings", icon: "⚙", superAdminOnly: true },
    ],
  },
];

const ALL_NAV: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

function isActive(item: NavItem, pathname?: string | null) {
  if (!pathname) return false;
  return item.href === "/ouradminportal"
    ? pathname === "/ouradminportal"
    : pathname === item.href || pathname.startsWith(item.href + "/");
}

function NavContent({
  pathname,
  query,
  onNavigate,
  pendingWithdrawals = 0,
  realspinproLive = null,
  funtargetLive = null,
  // wingoLive = null,
}: {
  pathname: string;
  query: string;
  onNavigate?: () => void;
  pendingWithdrawals?: number;
  realspinproLive?: boolean | null;
  funtargetLive?: boolean | null;
  // wingoLive?: boolean | null;
}) {
  const { isSubAdmin, hasPermission, assignedUserIds } = useAuth();
  const q = query.trim().toLowerCase();

  const isAllowed = (item: NavItem) => {
    if (!isSubAdmin) return true;
    if (item.superAdminOnly) return false;
    if (item.permKey && !hasPermission(item.permKey)) return false;
    return true;
  };

  const groups = (q
    ? [{ label: "", items: ALL_NAV.filter((i) => i.label.toLowerCase().includes(q)) }]
    : NAV_GROUPS
  )
    .map((group) => ({
      ...group,
      items: group.items
        .filter(isAllowed)
        .map((item) => {
          if (item.href === "/ouradminportal/users" && isSubAdmin && (assignedUserIds?.length ?? 0) > 0) {
            return { ...item, label: "My Users" };
          }
          return item;
        }),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
      {groups.map((group) => (
        <div key={group.label || "search"}>
          {group.label && <div className="section-label">{group.label}</div>}
          {group.items.map((item) => {
            const active = isActive(item, pathname);
            const isWithdrawals = item.href === "/ouradminportal/withdrawals";
            const isRealSpinPro = item.href === "/ouradminportal/realspinpro";
            const isFunTarget = item.href === "/ouradminportal/funtarget";
            // const isWinGo = item.href === "/ouradminportal/wingo";
            const isJackpot = item.href === "/ouradminportal/jackpot";
            const isStarline = item.href === "/ouradminportal/starline";
            const isMainMarkets = item.href === "/ouradminportal/markets";
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
                {isRealSpinPro && (
                  <span
                    className={cn(
                      "ml-auto inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded border",
                      realspinproLive === true
                        ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30 animate-pulse"
                        : realspinproLive === false
                        ? "text-slate-400 bg-slate-500/10 border-slate-500/25"
                        : "text-amber-500 bg-amber-500/10 border-amber-500/25"
                    )}
                  >
                    {realspinproLive === true ? "LIVE" : realspinproLive === false ? "OFF" : "GAME"}
                  </span>
                )}
                {isFunTarget && (
                  <span
                    className={cn(
                      "ml-auto inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded border",
                      funtargetLive === true
                        ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30 animate-pulse"
                        : funtargetLive === false
                        ? "text-slate-400 bg-slate-500/10 border-slate-500/25"
                        : "text-amber-500 bg-amber-500/10 border-amber-500/25"
                    )}
                  >
                    {funtargetLive === true ? "LIVE" : funtargetLive === false ? "OFF" : "GAME"}
                  </span>
                )}
                {/* {isWinGo && (
                  <span
                    className={cn(
                      "ml-auto inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded border",
                      wingoLive === true
                        ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30 animate-pulse"
                        : wingoLive === false
                        ? "text-slate-400 bg-slate-500/10 border-slate-500/25"
                        : "text-amber-500 bg-amber-500/10 border-amber-500/25"
                    )}
                  >
                    {wingoLive === true ? "LIVE" : wingoLive === false ? "OFF" : "GAME"}
                  </span>
                )} */}
                {isJackpot && (
                  <span className="ml-auto inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 rounded border border-amber-500/25">
                    PANNA
                  </span>
                )}
                {isStarline && (
                  <span className="ml-auto inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-purple-400 bg-purple-500/10 rounded border border-purple-500/25">
                    12 SLOTS
                  </span>
                )}
                {isMainMarkets && (
                  <span className="ml-auto inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-sky-400 bg-sky-500/10 rounded border border-sky-500/25">
                    MAIN
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
      {q && groups.length === 0 && (
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
  const { authenticated, loading, username, isSubAdmin, hasPermission, logout } = useAuth();
  const router = useRouter();
  const rawPathname = usePathname();
  const pathname = rawPathname || "";
  const isLoginPage = pathname === "/ouradminportal/login";
  const [open, setOpen] = useState(false);
  const [navQuery, setNavQuery] = useState("");
  const { theme, setTheme } = useTheme();
  const [pendingWithdrawals, setPendingWithdrawals] = useState(0);
  const [realspinproLive, setRealspinproLive] = useState<boolean | null>(null);
  const [funtargetLive, setFuntargetLive] = useState<boolean | null>(null);
  // const [wingoLive, setWingoLive] = useState<boolean | null>(null);
  const [showWithdrawalPopup, setShowWithdrawalPopup] = useState(false);
  const prevPendingRef = React.useRef<number | null>(null);

  const activeItem = React.useMemo(
    () => ALL_NAV.find((n) => isActive(n, pathname)),
    [pathname]
  );

  const isAllowed = React.useMemo(() => {
    if (!isSubAdmin) return true;
    const match = ALL_NAV.find((n) => isActive(n, pathname));
    if (!match) return true;
    if (match.superAdminOnly) return false;
    if (match.permKey && !hasPermission(match.permKey)) return false;
    return true;
  }, [isSubAdmin, pathname, hasPermission]);

  useEffect(() => {
    if (isLoginPage || !authenticated) return;
    let mounted = true;

    const checkGames = async () => {
      try {
        const rsp = await getRealSpinProSettings();
        if (mounted && rsp) {
          setRealspinproLive(Boolean(rsp.enabled));
        }
      } catch {
        // ignore polling errors
      }
      try {
        const ft = await getFunTargetSettings();
        if (mounted && ft) {
          setFuntargetLive(Boolean(ft.enabled));
        }
      } catch {
        // ignore polling errors
      }
      // Win Go status polling commented out
      // try {
      //   const wg = await getWinGoSettings();
      //   if (mounted && wg) {
      //     setWingoLive(Boolean(wg.enabled));
      //   }
      // } catch {
      //   // ignore polling errors
      // }
    };

    checkGames();
    const gamesInterval = setInterval(checkGames, 12000);
    return () => {
      mounted = false;
      clearInterval(gamesInterval);
    };
  }, [authenticated, isLoginPage]);

  useEffect(() => {
    if (isLoginPage || !authenticated) return;
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
  }, [authenticated, isLoginPage]);

  // Auto-dismiss downside popup after 2 minutes
  useEffect(() => {
    if (showWithdrawalPopup) {
      const timer = setTimeout(() => {
        setShowWithdrawalPopup(false);
      }, 120000); // 2 minutes
      return () => clearTimeout(timer);
    }
  }, [showWithdrawalPopup]);

  useEffect(() => {
    if (isLoginPage) return;
    if (!loading && !authenticated) {
      router.replace("/ouradminportal/login");
    } else if (authenticated) {
      prefetchAllUsers();
    }
  }, [loading, authenticated, isLoginPage, router]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (loading || !authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Spinner />
      </div>
    );
  }

  return (
    <UserModalProvider>
      <div className="app-bg flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md lg:flex transition-colors">
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl shadow-md ring-1 ring-brand-500/10">
            <img src="/images/logo/dpsara777-logo.svg" alt="SattaAdmin Logo" className="h-full w-full object-cover" />
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Satta<span className="text-brand-500">Admin</span>
          </span>
        </div>
        <div className="px-3 py-2.5">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">🔍</span>
            <input
              value={navQuery}
              onChange={(e) => setNavQuery(e.target.value)}
              placeholder="Search pages…"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/90 py-2 pl-9 pr-3 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition-colors focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15"
            />
          </div>
        </div>
        <NavContent pathname={pathname} query={navQuery} pendingWithdrawals={pendingWithdrawals} realspinproLive={realspinproLive} funtargetLive={funtargetLive} />
        <div className="border-t border-slate-200 dark:border-slate-800 p-3 bg-slate-50/50 dark:bg-slate-850/30">
          <div className="flex items-center justify-between px-2 pb-1">
            <span className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Signed in as
            </span>
            <span className={cn(
              "px-1.5 py-0.5 text-[10px] font-bold rounded",
              isSubAdmin
                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300"
                : "bg-brand-100 text-brand-800 dark:bg-brand-900/60 dark:text-brand-300"
            )}>
              {isSubAdmin ? "Sub-Admin" : "Super Admin"}
            </span>
          </div>
          <div className="px-2 pb-3 text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{username || (isSubAdmin ? "Sub-Admin" : "OurAdmin_777")}</div>
          <Button variant="outline" size="sm" className="w-full" onClick={logout}>
            Logout
          </Button>
        </div>
      </aside>

      {/* Mobile drawer */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm transition-opacity lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => setOpen(false)}
      >
        <aside
          className={cn(
            "absolute left-0 top-0 flex h-full w-72 max-w-[85%] flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl transition-transform duration-300",
            open ? "translate-x-0" : "-translate-x-full"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 py-5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl shadow-md ring-1 ring-brand-500/10">
                <img src="/images/logo/dpsara777-logo.svg" alt="SattaAdmin Logo" className="h-full w-full object-cover" />
              </div>
              <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Satta<span className="text-brand-500">Admin</span>
              </span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200"
              aria-label="Close menu"
            >
              ✕
            </button>
          </div>
          <div className="px-3 py-2.5">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">🔍</span>
              <input
                value={navQuery}
                onChange={(e) => setNavQuery(e.target.value)}
                placeholder="Search pages…"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 py-2 pl-9 pr-3 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition-colors focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15"
              />
            </div>
          </div>
          <NavContent pathname={pathname} query={navQuery} onNavigate={() => setOpen(false)} pendingWithdrawals={pendingWithdrawals} realspinproLive={realspinproLive} funtargetLive={funtargetLive} />
          <div className="border-t border-slate-200 dark:border-slate-800 p-3 bg-slate-50/50 dark:bg-slate-850/30">
            <div className="px-2 pb-1 text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Signed in as
            </div>
            <div className="px-2 pb-3 text-sm font-semibold text-slate-800 dark:text-slate-200">{username || "OurAdmin_777"}</div>
            <Button variant="outline" size="sm" className="w-full" onClick={logout}>
              Logout
            </Button>
          </div>
        </aside>
      </div>

      {/* Main Container */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar / Navbar */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 px-3.5 py-2.5 backdrop-blur-lg lg:px-7 lg:py-3 transition-colors">
          <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
            <button
              onClick={() => setOpen(true)}
              className="rounded-xl p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden shrink-0 transition"
              aria-label="Open menu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
              </svg>
            </button>
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center overflow-hidden rounded-xl lg:hidden shadow-sm ring-1 ring-brand-500/10 shrink-0">
              <img src="/images/logo/dpsara777-logo.svg" alt="SattaAdmin Logo" className="h-full w-full object-cover" />
            </div>

            {/* Breadcrumb Navigation on Desktop */}
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
              <Link href="/ouradminportal" className="hover:text-slate-700 dark:hover:text-slate-300 transition flex items-center gap-1 font-medium">
                <span>▦</span>
                <span>Admin</span>
              </Link>
              <span>/</span>
              <span className="font-bold text-slate-900 dark:text-slate-100 truncate text-sm">
                {activeItem?.label ?? "Dashboard"}
              </span>
            </div>

            {/* Title on Mobile */}
            <h1 className="sm:hidden text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
              {activeItem?.label ?? "Dashboard"}
            </h1>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Quick Command / Search Bar Trigger */}
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("open-command-palette"))}
              className="hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 transition shadow-2xs"
              title="Search and jump to any admin page (Ctrl+K)"
            >
              <span>🔍</span>
              <span className="font-normal text-slate-500 dark:text-slate-400">Search pages...</span>
              <kbd className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-300">
                ⌘K
              </kbd>
            </button>

            {/* Live Pending Withdrawals Pill */}
            {pendingWithdrawals > 0 && (
              <Link
                href="/ouradminportal/withdrawals"
                className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-300 dark:border-rose-800 text-xs font-bold animate-pulse hover:bg-rose-100 dark:hover:bg-rose-900/60 transition shadow-sm"
                title="View pending withdrawals"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600"></span>
                </span>
                <span className="sm:hidden font-black">🚨 {pendingWithdrawals}</span>
                <span className="hidden sm:inline">🚨 {pendingWithdrawals} Pending Payout{pendingWithdrawals > 1 ? "s" : ""}</span>
              </Link>
            )}

            {/* User profile pill */}
            <span className="hidden lg:flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-3 py-1 text-xs font-medium text-slate-700 dark:text-slate-200">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              {username || "OurAdmin_777"}
            </span>

            {/* Theme Toggle Button */}
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-base text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition shadow-2xs active:scale-95"
              aria-label="Toggle theme"
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>

            {/* Logout on tablet / small desktop */}
            <Button variant="ghost" size="sm" className="hidden sm:inline-flex lg:hidden text-xs" onClick={logout}>
              Logout
            </Button>
          </div>
        </header>

        {/* Main Content Area - Optimized Space Utilization */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-3.5 py-4 sm:px-6 lg:px-8 lg:py-6 pb-24 lg:pb-10 transition-all">
          {!isAllowed ? (
            <div className="flex flex-col items-center justify-center p-12 text-center min-h-[60vh] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm mt-4">
              <div className="h-16 w-16 rounded-2xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center text-3xl mb-4 shadow-inner">
                🚫
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Access Denied</h2>
              <p className="text-sm text-slate-500 max-w-md mb-6 leading-relaxed">
                Your sub-admin account does not have permission to view or manage this section. Please contact your Super Administrator to request access.
              </p>
              <Link href="/ouradminportal">
                <Button variant="outline">Back to Dashboard</Button>
              </Link>
            </div>
          ) : (
            children
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Dock */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 lg:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.06)] safe-area-bottom">
        <div className="grid grid-cols-5 items-center h-16 px-1 max-w-lg mx-auto">
          {/* 1. Dashboard */}
          <Link
            href="/ouradminportal"
            className={cn(
              "flex flex-col items-center justify-center h-full gap-0.5 transition-all text-[11px] font-semibold active:scale-95",
              pathname === "/ouradminportal"
                ? "text-brand-600 dark:text-brand-400 font-bold"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            )}
          >
            <span className="text-xl leading-none">▦</span>
            <span>Home</span>
          </Link>

          {/* 2. Withdrawals with LIVE badge */}
          <Link
            href="/ouradminportal/withdrawals"
            className={cn(
              "relative flex flex-col items-center justify-center h-full gap-0.5 transition-all text-[11px] font-semibold active:scale-95",
              pathname?.startsWith("/ouradminportal/withdrawals")
                ? "text-rose-600 dark:text-rose-400 font-bold"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            )}
          >
            <span className="text-xl leading-none relative">
              💸
              {pendingWithdrawals > 0 && (
                <span className="absolute -top-1 -right-2.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-600 text-[9px] font-black text-white ring-2 ring-white dark:ring-slate-900 animate-pulse">
                  {pendingWithdrawals > 99 ? "99+" : pendingWithdrawals}
                </span>
              )}
            </span>
            <span>Payouts</span>
          </Link>

          {/* 3. Results */}
          <Link
            href="/ouradminportal/results"
            className={cn(
              "flex flex-col items-center justify-center h-full gap-0.5 transition-all text-[11px] font-semibold active:scale-95",
              pathname?.startsWith("/ouradminportal/results")
                ? "text-brand-600 dark:text-brand-400 font-bold"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            )}
          >
            <span className="text-xl leading-none">🎯</span>
            <span>Results</span>
          </Link>

          {/* 4. Users */}
          <Link
            href="/ouradminportal/users"
            className={cn(
              "flex flex-col items-center justify-center h-full gap-0.5 transition-all text-[11px] font-semibold active:scale-95",
              pathname?.startsWith("/ouradminportal/users")
                ? "text-brand-600 dark:text-brand-400 font-bold"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            )}
          >
            <span className="text-xl leading-none">👤</span>
            <span>Users</span>
          </Link>

          {/* 5. More Menu */}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex flex-col items-center justify-center h-full gap-0.5 transition-all text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 active:scale-95"
            aria-label="Open Full Menu"
          >
            <span className="text-xl leading-none">☰</span>
            <span>Menu</span>
          </button>
        </div>
      </nav>

      {showWithdrawalPopup && pendingWithdrawals > 0 && (
        <div className="fixed bottom-20 sm:bottom-6 left-3 right-3 sm:left-auto sm:right-6 z-50 max-w-sm w-auto sm:w-full p-4 rounded-2xl bg-white dark:bg-slate-900 border-2 border-rose-500 shadow-2xl shadow-rose-500/30">
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
                  href="/ouradminportal/withdrawals"
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
    </UserModalProvider>
  );
}
