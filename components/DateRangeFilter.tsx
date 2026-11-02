"use client";

import React, { useState, useEffect } from "react";
import { format } from "@/lib/format";
import { cn } from "@/components/ui";

export type DatePreset = "all" | "today" | "yesterday" | "7d" | "30d" | "this_month" | "custom";

interface DateRangeFilterProps {
  onFilterChange: (params: { dateFrom: string; dateTo: string; preset: DatePreset }) => void;
  initialPreset?: DatePreset;
  className?: string;
  compact?: boolean;
}

const PRESETS: { id: DatePreset; label: string; icon: string }[] = [
  { id: "all", label: "All Time", icon: "🌐" },
  { id: "today", label: "Today", icon: "⚡" },
  { id: "yesterday", label: "Yesterday", icon: "⏮️" },
  { id: "7d", label: "Last 7 Days", icon: "📅" },
  { id: "this_month", label: "This Month", icon: "🗓️" },
  { id: "custom", label: "Custom", icon: "⚙️" },
];

export function computeDatesForPreset(preset: DatePreset): { dateFrom: string; dateTo: string } {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const toYMD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  if (preset === "all") {
    return { dateFrom: "", dateTo: "" };
  }

  if (preset === "today") {
    const ymd = toYMD(now);
    return { dateFrom: ymd, dateTo: ymd };
  }

  if (preset === "yesterday") {
    const yest = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const ymd = toYMD(yest);
    return { dateFrom: ymd, dateTo: ymd };
  }

  if (preset === "7d") {
    const past7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return { dateFrom: toYMD(past7), dateTo: toYMD(now) };
  }

  if (preset === "30d") {
    const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { dateFrom: toYMD(past30), dateTo: toYMD(now) };
  }

  if (preset === "this_month") {
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    return { dateFrom: toYMD(firstDay), dateTo: toYMD(now) };
  }

  return { dateFrom: "", dateTo: "" };
}

export function DateRangeFilter({
  onFilterChange,
  initialPreset = "all",
  className = "",
  compact = false,
}: DateRangeFilterProps) {
  const [activePreset, setActivePreset] = useState<DatePreset>(initialPreset);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [showCustomPicker, setShowCustomPicker] = useState(initialPreset === "custom");

  const handlePresetSelect = (preset: DatePreset) => {
    setActivePreset(preset);
    if (preset === "custom") {
      setShowCustomPicker(true);
      return;
    }
    setShowCustomPicker(false);
    const { dateFrom, dateTo } = computeDatesForPreset(preset);
    onFilterChange({ dateFrom, dateTo, preset });
  };

  const applyCustom = () => {
    if (!customFrom && !customTo) return;
    onFilterChange({ dateFrom: customFrom, dateTo: customTo, preset: "custom" });
  };

  const resetFilter = () => {
    setActivePreset("all");
    setCustomFrom("");
    setCustomTo("");
    setShowCustomPicker(false);
    onFilterChange({ dateFrom: "", dateTo: "", preset: "all" });
  };

  const isFiltered = activePreset !== "all";

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
        {PRESETS.map((p) => {
          const active = activePreset === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => handlePresetSelect(p.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all select-none active:scale-95",
                active
                  ? "bg-brand-600 text-white shadow-sm ring-1 ring-brand-700/50"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750"
              )}
            >
              <span className="text-[13px] leading-none">{p.icon}</span>
              <span>{p.label}</span>
            </button>
          );
        })}

        {isFiltered && (
          <button
            type="button"
            onClick={resetFilter}
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-800 transition whitespace-nowrap shrink-0"
            title="Reset date filter"
          >
            <span>✕</span>
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* Custom Date Range Picker */}
      {showCustomPicker && (
        <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 animate-fade-in text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">From:</span>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs font-medium outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">To:</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs font-medium outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          <button
            type="button"
            onClick={applyCustom}
            className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 active:scale-95 text-white font-bold text-xs transition shadow-xs"
          >
            Apply Range
          </button>
        </div>
      )}
    </div>
  );
}
