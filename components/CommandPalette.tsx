"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/components/ui";

const ACTIONS = [
  { href: "/ouradminportal", label: "Dashboard", icon: "▦", section: "Navigation" },
  { href: "/ouradminportal/users", label: "Users", icon: "👤", section: "Navigation" },
  { href: "/ouradminportal/markets", label: "Markets", icon: "📈", section: "Navigation" },
  { href: "/ouradminportal/starline", label: "Starline", icon: "⭐", section: "Navigation" },
  { href: "/ouradminportal/results", label: "Results", icon: "🎯", section: "Navigation" },
  { href: "/ouradminportal/deposits", label: "Deposits", icon: "➕", section: "Navigation" },
  { href: "/ouradminportal/bids", label: "Regular Bids", icon: "🎲", section: "Navigation" },
  { href: "/ouradminportal/starline-bids-history", label: "Starline Bids", icon: "🎲", section: "Navigation" },
  { href: "/ouradminportal/withdrawals", label: "Withdrawals", icon: "💸", section: "Navigation" },
  { href: "/ouradminportal/game-rates", label: "Game Rates", icon: "💰", section: "Navigation" },
  { href: "/ouradminportal/audit", label: "Audit Logs", icon: "🛡", section: "Navigation" },
  { href: "/ouradminportal/settings", label: "Settings", icon: "⚙", section: "Navigation" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();

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

  const filtered = ACTIONS.filter((a) => a.label.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const handleNavigation = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && filtered.length > 0) {
        e.preventDefault();
        router.push(filtered[selectedIndex].href);
        setOpen(false);
        setQuery("");
      }
    };
    window.addEventListener("keydown", handleNavigation);
    return () => window.removeEventListener("keydown", handleNavigation);
  }, [open, filtered, selectedIndex, router]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 sm:px-0">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-ink-900/95 shadow-2xl backdrop-blur-xl"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <div className="flex items-center border-b border-slate-100 dark:border-white/10 px-5 relative">
              <span className="text-slate-400 text-lg">🔍</span>
              <input
                autoFocus
                className="w-full bg-transparent p-4 sm:p-5 text-base sm:text-xl font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none"
                placeholder="Type a command or search pages..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <div className="absolute right-5 flex gap-2">
                <span className="text-[10px] font-bold tracking-widest text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5 px-2 py-1 rounded border border-slate-200 dark:border-white/5 shadow-xs">ESC</span>
              </div>
            </div>
            
            <div className="max-h-[60vh] min-h-[260px] overflow-y-auto p-3 bg-slate-50/60 dark:bg-ink-950/40">
              {filtered.length === 0 ? (
                <div className="py-16 text-center flex flex-col items-center">
                  <span className="text-4xl opacity-30 mb-3">📭</span>
                  <div className="text-slate-500 dark:text-slate-400 text-sm">No results found for <span className="text-slate-900 dark:text-slate-200 font-medium">&quot;{query}&quot;</span></div>
                </div>
              ) : (
                <div className="space-y-1">
                  {filtered.map((action, i) => (
                    <button
                      key={action.href}
                      onClick={() => {
                        router.push(action.href);
                        setOpen(false);
                        setQuery("");
                      }}
                      onMouseEnter={() => setSelectedIndex(i)}
                      className={cn(
                        "flex w-full items-center gap-3.5 rounded-xl px-4 py-2.5 text-left transition-all duration-150",
                        selectedIndex === i 
                          ? "bg-brand-500/15 text-brand-700 dark:text-brand-300 border border-brand-500/30 shadow-sm" 
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 border border-transparent"
                      )}
                    >
                      <span className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-lg text-base transition-colors",
                        selectedIndex === i ? "bg-brand-500/20 text-brand-600 dark:text-brand-400" : "bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400"
                      )}>{action.icon}</span>
                      <div className="flex flex-col">
                        <span className={cn("text-sm font-semibold", selectedIndex === i ? "text-brand-800 dark:text-white" : "text-slate-800 dark:text-slate-200")}>{action.label}</span>
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">{action.section}</span>
                      </div>
                      
                      {selectedIndex === i && (
                         <span className="ml-auto text-xs text-brand-600 dark:text-brand-400 font-semibold tracking-wide">Jump to →</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
