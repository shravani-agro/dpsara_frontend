"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/components/ui";

const ACTIONS = [
  { href: "/admin", label: "Dashboard", icon: "▦", section: "Navigation" },
  { href: "/admin/users", label: "Users", icon: "👤", section: "Navigation" },
  { href: "/admin/markets", label: "Markets", icon: "📈", section: "Navigation" },
  { href: "/admin/starline", label: "Starline", icon: "⭐", section: "Navigation" },
  { href: "/admin/results", label: "Results", icon: "🎯", section: "Navigation" },
  { href: "/admin/deposits", label: "Deposits", icon: "➕", section: "Navigation" },
  { href: "/admin/bids", label: "Regular Bids", icon: "🎲", section: "Navigation" },
  { href: "/admin/starline-bids-history", label: "Starline Bids", icon: "🎲", section: "Navigation" },
  { href: "/admin/withdrawals", label: "Withdrawals", icon: "💸", section: "Navigation" },
  { href: "/admin/game-rates", label: "Game Rates", icon: "💰", section: "Navigation" },
  { href: "/admin/audit", label: "Audit Logs", icon: "🛡", section: "Navigation" },
  { href: "/admin/settings", label: "Settings", icon: "⚙", section: "Navigation" },
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
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-ink-900/90 shadow-2xl backdrop-blur-xl"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <div className="flex items-center border-b border-white/10 px-5 relative">
              <span className="text-slate-400 text-lg">🔍</span>
              <input
                autoFocus
                className="w-full bg-transparent p-5 text-xl font-light text-slate-100 placeholder-slate-500 outline-none"
                placeholder="Type a command or search..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <div className="absolute right-5 flex gap-2">
                <span className="text-[10px] font-bold tracking-widest text-slate-400 bg-white/5 px-2 py-1 rounded border border-white/5 shadow-sm">ESC</span>
              </div>
            </div>
            
            <div className="max-h-[60vh] min-h-[300px] overflow-y-auto p-3 bg-ink-950/30">
              {filtered.length === 0 ? (
                <div className="py-20 text-center flex flex-col items-center">
                  <span className="text-4xl opacity-20 mb-4">📭</span>
                  <div className="text-slate-400 text-sm">No results found for <span className="text-slate-300 font-medium">"{query}"</span></div>
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
                        "flex w-full items-center gap-4 rounded-xl px-4 py-3 text-left transition-all duration-150",
                        selectedIndex === i 
                          ? "bg-brand-500/15 text-brand-300 border border-brand-500/20 shadow-lg shadow-brand-500/5 transform scale-[1.01]" 
                          : "text-slate-300 hover:bg-white/5 border border-transparent"
                      )}
                    >
                      <span className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-lg text-lg transition-colors",
                        selectedIndex === i ? "bg-brand-500/20 text-brand-400" : "bg-white/5 text-slate-400"
                      )}>{action.icon}</span>
                      <div className="flex flex-col">
                        <span className={cn("font-medium", selectedIndex === i ? "text-white" : "text-slate-200")}>{action.label}</span>
                        <span className="text-[10px] uppercase tracking-wider text-slate-500">{action.section}</span>
                      </div>
                      
                      {selectedIndex === i && (
                         <span className="ml-auto text-xs text-brand-400 font-medium tracking-wide">Jump to →</span>
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
