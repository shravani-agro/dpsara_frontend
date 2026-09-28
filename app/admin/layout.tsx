"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { Button, Spinner, cn } from "@/components/ui";
import { ToastContainer } from "@/components/Toast";
import { CommandPalette } from "@/components/CommandPalette";

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
}: {
  pathname: string;
  query: string;
  onNavigate?: () => void;
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
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn("nav-link", active && "nav-link-active")}
              >
                <span className="w-5 text-center text-base leading-none">{item.icon}</span>
                <span className="truncate">{item.label}</span>
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
            <img src="/images/logo/sara777-logo.svg" alt="SattaAdmin Logo" className="h-full w-full object-cover" />
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
        <NavContent pathname={pathname} query={navQuery} />
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
                <img src="/images/logo/sara777-logo.svg" alt="SattaAdmin Logo" className="h-full w-full object-cover" />
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
          <NavContent pathname={pathname} query={navQuery} onNavigate={() => setOpen(false)} />
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
              <img src="/images/logo/sara777-logo.svg" alt="SattaAdmin Logo" className="h-full w-full object-cover" />
            </div>
             <h1 className="text-sm font-semibold text-slate-700">
               {ALL_NAV.find((n) =>
                 n.href === "/admin" ? pathname === "/admin" : (pathname === n.href || pathname.startsWith(n.href + "/"))
               )?.label ?? "Dashboard"}
             </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-600 sm:flex">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              {username || "admin"}
            </span>
            <Button variant="ghost" size="sm" className="lg:hidden" onClick={logout}>
              Logout
            </Button>
          </div>
        </header>

        <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">{children}</main>
      </div>
      <CommandPalette />
      <ToastContainer />
    </div>
  );
}
