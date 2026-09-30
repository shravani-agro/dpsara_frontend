"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function Card({
  title,
  subtitle,
  icon,
  children,
  actions,
  className = "",
  bodyClassName = "",
}: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <div className={cn("card animate-fade-in group hover:border-slate-300 transition-all duration-300", className)}>
      {(title || actions) && (
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between bg-slate-50">
          <div className="flex min-w-0 items-center gap-3">
            {icon && (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-base text-brand-700 ring-1 ring-inset ring-slate-200">
                {icon}
              </span>
            )}
            <div className="min-w-0">
              {title && <h3 className="truncate text-base font-semibold text-slate-900">{title}</h3>}
              {subtitle && <p className="mt-0.5 truncate text-xs text-slate-9000">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  loading = false,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "success" | "ghost" | "outline";
  size?: "sm" | "md" | "lg" | "icon";
  loading?: boolean;
}) {
  const variants: Record<string, string> = {
    primary: "bg-brand-600 hover:bg-brand-500 text-white shadow-glow focus-visible:ring-brand-500/40",
    secondary: "bg-slate-100 hover:bg-slate-200 text-slate-900 focus-visible:ring-slate-300",
    danger: "bg-red-600 hover:bg-red-500 text-white focus-visible:ring-red-500/40",
    success: "bg-emerald-600 hover:bg-emerald-500 text-white focus-visible:ring-emerald-500/40",
    ghost: "bg-transparent hover:bg-slate-100 text-slate-600 focus-visible:ring-slate-300",
    outline: "border border-slate-200 bg-transparent hover:bg-slate-100 text-slate-700 focus-visible:ring-slate-300",
  };
  const sizes: Record<string, string> = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 text-sm",
    lg: "h-11 px-5 text-sm",
    icon: "h-9 w-9",
  };
  return (
    <button
      type={type}
      disabled={loading || props.disabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 active:scale-[0.98]",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />
      )}
      {children}
    </button>
  );
}

export function Badge({
  children,
  color = "slate",
  className = "",
}: {
  children: React.ReactNode;
  color?: "slate" | "green" | "red" | "amber" | "orange" | "blue" | "emerald" | "brand" | "violet";
  className?: string;
}) {
  const colors: Record<string, string> = {
    slate: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200 shadow-sm",
    green: "bg-emerald-500/10 text-emerald-700 ring-1 ring-inset ring-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]",
    red: "bg-red-500/10 text-red-700 ring-1 ring-inset ring-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.2)]",
    amber: "bg-amber-500/10 text-amber-700 ring-1 ring-inset ring-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.2)]",
    orange: "bg-orange-500/10 text-orange-700 ring-1 ring-inset ring-orange-500/20 shadow-[0_0_10px_rgba(249,115,22,0.2)]",
    blue: "bg-sky-500/10 text-sky-700 ring-1 ring-inset ring-sky-500/20 shadow-[0_0_10px_rgba(14,165,233,0.2)]",
    emerald: "bg-emerald-500/10 text-emerald-700 ring-1 ring-inset ring-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]",
    brand: "bg-brand-500/10 text-brand-700 ring-1 ring-inset ring-brand-500/20 shadow-[0_0_10px_rgba(139,92,246,0.2)]",
    violet: "bg-violet-500/10 text-violet-700 ring-1 ring-inset ring-violet-500/20 shadow-[0_0_10px_rgba(139,92,246,0.2)]",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        colors[color],
        className
      )}
    >
      {children}
    </span>
  );
}

export function Input({
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("input-base", className)} {...props} />;
}

export function Textarea({
  className = "",
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn("input-base resize-none", className)} {...props} />;
}

export function Select({
  className = "",
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn("input-base appearance-none", className)} {...props}>
      {children}
    </select>
  );
}

export function Label({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <label className={cn("mb-1.5 block text-xs font-medium text-slate-500", className)}>{children}</label>;
}

export function Field({
  label,
  children,
  value,
}: {
  label: string;
  children?: React.ReactNode;
  value?: React.ReactNode;
}) {
  return (
    <div>
      <Label>{label}</Label>
      {children ?? <span className="text-sm text-slate-700">{value ?? "—"}</span>}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  if (!open) return null;
  const sizes = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl" };
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className={cn(
          "w-full rounded-t-2xl border border-slate-200 bg-white shadow-2xl animate-scale-in sm:rounded-2xl",
          sizes[size]
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
          <div>
            {title && <h3 className="text-base font-semibold text-slate-900">{title}</h3>}
            {description && <p className="mt-0.5 text-xs text-slate-9000">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="max-h-[80vh] overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center py-10", className)}>
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-brand-500" />
    </div>
  );
}

export function ErrorMsg({ msg }: { msg?: string | null }) {
  if (!msg) return null;
  return (
    <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-700">
      <span>⚠</span>
      <span>{msg}</span>
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl">📭</div>
      <p className="text-sm font-medium text-slate-600">{title}</p>
      {hint && <p className="mt-1 text-xs text-slate-9000">{hint}</p>}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  icon,
  onBack,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
  onBack?: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition-colors hover:bg-slate-200 hover:text-slate-900 sm:inline-flex"
            aria-label="Go back"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
        {icon && (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-500/10 text-xl text-brand-700 ring-1 ring-inset ring-brand-500/20">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
          {description && <p className="mt-1 truncate text-sm text-slate-500">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function DataTable({
  columns,
  rows,
  getRowKey,
  empty,
  selectable = false,
  selectedKeys = [],
  onToggleSelect,
  onSelectAll,
  onRowClick,
  responsive = false,
}: {
  columns: { key: string; header: React.ReactNode; className?: string; render?: (row: any) => React.ReactNode }[];
  rows: any[];
  getRowKey: (row: any) => React.Key;
  empty?: React.ReactNode;
  selectable?: boolean;
  selectedKeys?: React.Key[];
  onToggleSelect?: (key: React.Key) => void;
  onSelectAll?: (checked: boolean) => void;
  onRowClick?: (row: any) => void;
  responsive?: boolean;
}) {
  const allSelected = rows.length > 0 && rows.every((r) => selectedKeys.includes(getRowKey(r)));
  const renderRow = (row: any) => (
    <>
      {selectable && onToggleSelect && (
        <td
          className={cn("py-3 w-10", onRowClick && "pointer-events-none")}
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            className="accent-brand-600"
            checked={selectedKeys.includes(getRowKey(row))}
            onChange={() => onToggleSelect(getRowKey(row))}
          />
        </td>
      )}
      {columns.map((c) => (
        <td key={c.key} className={cn("py-3 text-slate-600", c.className)}>
          {c.render ? c.render(row) : row[c.key]}
        </td>
      ))}
    </>
  );

  const renderMobileCard = (row: any) => {
    const key = getRowKey(row);
    const isSelected = selectedKeys.includes(key);
    return (
      <motion.div
        key={key}
        variants={{
          hidden: { opacity: 0, y: 10 },
          visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
        }}
        onClick={() => (onRowClick ? onRowClick(row) : undefined)}
        className={cn(
          "rounded-xl border border-slate-200 bg-white p-3.5 transition-colors",
          isSelected ? "border-brand-500/50 bg-brand-50" : "hover:border-slate-300 hover:bg-slate-100",
          onRowClick && "cursor-pointer"
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1.5">
            {columns.map((c) => (
              <div key={c.key} className="flex items-center justify-between gap-3">
                <span className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-slate-9000">
                  {c.header}
                </span>
                <span className="truncate text-right text-sm text-slate-700">
                  {c.render ? c.render(row) : row[c.key]}
                </span>
              </div>
            ))}
          </div>
          {selectable && onToggleSelect && (
            <input
              type="checkbox"
              className="accent-brand-600 mt-0.5 shrink-0"
              checked={isSelected}
              onClick={(e) => e.stopPropagation()}
              onChange={() => onToggleSelect(key)}
            />
          )}
        </div>
      </motion.div>
    );
  };

  const tableBody = (
    <motion.tbody
      initial="hidden"
      animate="visible"
      variants={{
        visible: { transition: { staggerChildren: 0.04 } },
        hidden: {},
      }}
    >
      {rows.map((row) => (
        <motion.tr
          key={getRowKey(row)}
          onClick={onRowClick ? () => onRowClick(row) : undefined}
          className={cn(
            "border-t border-slate-100 transition-colors odd:bg-slate-50",
            selectedKeys.includes(getRowKey(row))
              ? "bg-brand-50"
              : "hover:bg-slate-100",
            onRowClick && "cursor-pointer"
          )}
          variants={{
            hidden: { opacity: 0, y: 10 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
          }}
        >
          {renderRow(row)}
        </motion.tr>
      ))}
    </motion.tbody>
  );

  return (
    <div>
      <div className={cn("table-wrap", responsive && "hidden md:block")}>
        <table className="w-full min-w-[640px] text-sm">
           <thead>
             <tr className="text-left text-[11px] uppercase tracking-[0.08em] text-slate-9000">
               {selectable && onSelectAll && (
                 <th className="whitespace-nowrap py-3 font-medium w-10">
                   <input
                     type="checkbox"
                     className="accent-brand-600"
                     checked={allSelected}
                     onChange={(e) => onSelectAll(e.target.checked)}
                   />
                 </th>
               )}
               {columns.map((c) => (
                 <th key={c.key} className={cn("whitespace-nowrap py-3 font-medium", c.className)}>
                   {c.header}
                 </th>
               ))}
             </tr>
           </thead>
          {tableBody}
        </table>
        {rows.length === 0 && (empty ?? <EmptyState title="No records found" />)}
      </div>
      {responsive && (
        <div className="space-y-2.5 p-2 md:hidden">
          {rows.map(renderMobileCard)}
          {rows.length === 0 && (empty ?? <EmptyState title="No records found" />)}
        </div>
      )}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon,
  accent = "brand",
  delta,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  accent?: "brand" | "emerald" | "amber" | "sky" | "violet";
  delta?: { value: string; positive?: boolean };
}) {
  const accents: Record<string, string> = {
    brand: "from-brand-600/30 to-brand-500/5 text-brand-700 shadow-brand-500/20",
    emerald: "from-emerald-600/30 to-emerald-500/5 text-emerald-700 shadow-emerald-500/20",
    amber: "from-amber-600/30 to-amber-500/5 text-amber-700 shadow-amber-500/20",
    sky: "from-sky-600/30 to-sky-500/5 text-sky-700 shadow-sky-500/20",
    violet: "from-violet-600/30 to-violet-500/5 text-violet-700 shadow-violet-500/20",
  };
  return (
    <div className="card relative overflow-hidden p-4 sm:p-5 group transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
      <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br opacity-50 transition-opacity duration-300 group-hover:opacity-90", accents[accent].split(" ").slice(0, 2).join(" "))} />
      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wide text-slate-500 group-hover:text-slate-600 transition-colors truncate">{label}</p>
          <p className="mt-1.5 sm:mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 truncate">{value}</p>
          {delta && (
            <p className={cn("mt-1 text-xs font-medium", delta.positive ? "text-emerald-600" : "text-red-600")}>
              {delta.positive ? "▲" : "▼"} {delta.value}
            </p>
          )}
        </div>
        {icon && (
          <div className={cn("flex h-9 w-9 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-slate-100 text-base sm:text-xl backdrop-blur-md shadow-lg ring-1 ring-inset ring-slate-200 transition-transform duration-300 group-hover:scale-110", accents[accent].split(" ")[2])}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

export function SlideOver({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm transition-opacity"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl h-full bg-white border-l border-slate-200 shadow-2xl flex flex-col animate-slide-in-right overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5 bg-slate-50/80">
          <div>
            {title && <h3 className="text-xl font-bold text-slate-900">{title}</h3>}
            {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 scroll-smooth">{children}</div>
      </div>
    </div>
  );
}

export function Tabs({
  tabs,
  activeTab,
  onChange,
}: {
  tabs: { id: string; label: string; icon?: React.ReactNode }[];
  activeTab: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex space-x-1 border-b border-slate-200 overflow-x-auto no-scrollbar">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap",
            activeTab === tab.id
              ? "border-brand-500 text-brand-600"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-t-lg"
          )}
        >
          {tab.icon && <span className="text-lg">{tab.icon}</span>}
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function TimePickerModal({
  open,
  onClose,
  value,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  value: string;
  onChange: (val: string) => void;
}) {
  const [mode, setMode] = React.useState<"h" | "m">("h");
  const [tempH, setTempH] = React.useState(12);
  const [tempM, setTempM] = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      if (value) {
        const [h, m] = value.split(":").map(Number);
        if (!isNaN(h) && !isNaN(m)) {
          setTempH(h);
          setTempM(m);
        }
      }
      setMode("h");
    }
  }, [open, value]);

  const isPM = tempH >= 12;
  const displayH = tempH % 12 || 12;

  const handleClockAction = (e: React.PointerEvent<HTMLDivElement>, dragging = false) => {
    setIsDragging(dragging);
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - 130;
    const y = e.clientY - rect.top - 130;
    let angle = (Math.atan2(y, x) * 180) / Math.PI + 90;
    if (angle < 0) angle += 360;

    if (mode === "h") {
      let h = Math.round(angle / 30);
      if (h === 0) h = 12;
      
      let newH = isPM ? (h === 12 ? 12 : h + 12) : (h === 12 ? 0 : h);
      setTempH(newH);
      if (!dragging && e.type === "pointerup") {
         setMode("m");
      }
    } else {
      let m = Math.round(angle / 6) % 60;
      setTempM(m);
    }
  };

  const pad = (n: number) => n.toString().padStart(2, "0");

  const numbers = mode === "h" ? [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] : [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
  
  const handAngle = mode === "h" ? (displayH * 30) : (tempM * 6);

  return (
    <AnimatePresence>
      {open && (
        <motion.div 
          key="time-picker-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" 
          onClick={onClose}
        >
          <motion.div 
            key="time-picker-content"
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: "spring", damping: 25, stiffness: 400 }}
            className="w-full max-w-[320px] max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200" 
            onClick={e => e.stopPropagation()}
          >
        <div className="flex items-center justify-center gap-6 bg-brand-600 p-6">
           <div className="flex items-baseline gap-1 text-5xl font-light text-white">
             <span className={cn("cursor-pointer transition-opacity", mode === "h" ? "opacity-100" : "opacity-60 hover:opacity-80")} onClick={() => setMode("h")}>
               {pad(displayH)}
             </span>
             <span className="opacity-60 text-4xl">:</span>
             <span className={cn("cursor-pointer transition-opacity", mode === "m" ? "opacity-100" : "opacity-60 hover:opacity-80")} onClick={() => setMode("m")}>
               {pad(tempM)}
             </span>
           </div>
           <div className="flex flex-col gap-1.5 text-sm font-semibold">
             <button 
               type="button" 
               className={cn("rounded-md px-2.5 py-1 transition-colors", !isPM ? "bg-white text-brand-600 shadow-md" : "text-white/70 hover:bg-slate-200")} 
               onClick={(e) => {
                 e.preventDefault();
                 e.stopPropagation();
                 setTempH(tempH >= 12 ? tempH - 12 : tempH);
               }}
             >
               AM
             </button>
             <button 
               type="button" 
               className={cn("rounded-md px-2.5 py-1 transition-colors", isPM ? "bg-white text-brand-600 shadow-md" : "text-white/70 hover:bg-slate-200")} 
               onClick={(e) => {
                 e.preventDefault();
                 e.stopPropagation();
                 setTempH(tempH < 12 ? tempH + 12 : tempH);
               }}
             >
               PM
             </button>
           </div>
        </div>

        <div className="flex justify-center p-4 sm:p-8 bg-slate-50 flex-1 overflow-y-auto min-h-0">
           <div 
             className="relative h-[260px] w-[260px] rounded-full bg-slate-50 shadow-inner ring-1 ring-slate-100"
             onPointerDown={(e) => {
               (e.target as HTMLElement).setPointerCapture(e.pointerId);
               handleClockAction(e, false);
             }}
             onPointerMove={(e) => {
               if (e.buttons > 0) handleClockAction(e, true);
             }}
             onPointerUp={(e) => {
               handleClockAction(e, false);
             }}
             style={{ touchAction: "none" }}
           >
              <div 
                className={cn(
                  "absolute top-1/2 left-1/2 w-0.5 h-[90px] bg-brand-500 origin-bottom ease-out",
                  !isDragging && "transition-transform duration-300"
                )}
                style={{ transform: `translate(-50%, -100%) rotate(${handAngle}deg)` }}
              >
                 <div className="absolute -top-4 -left-[14px] h-8 w-8 rounded-full bg-brand-500/20 flex items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-brand-500" />
                 </div>
                 <div className="absolute bottom-0 -left-1 h-2 w-2 rounded-full bg-brand-500" />
              </div>

              {numbers.map((n, i) => {
                const a = ((i * 30 - 90) * Math.PI) / 180;
                const x = 130 + 105 * Math.cos(a);
                const y = 130 + 105 * Math.sin(a);
                const isActive = mode === "h" ? n === displayH || (n===12 && displayH===12) : n === tempM;
                return (
                  <div
                    key={n}
                    className={cn(
                      "absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-sm pointer-events-none transition-colors",
                      isActive ? "text-white font-bold" : "text-slate-500"
                    )}
                    style={{ left: x, top: y }}
                  >
                    {mode === "h" ? n : pad(n)}
                  </div>
                )
              })}
           </div>
        </div>

        <div className="flex shrink-0 justify-end gap-3 p-4 bg-slate-50 border-t border-slate-100">
           <Button variant="ghost" onClick={onClose}>Cancel</Button>
           <Button variant="primary" onClick={() => {
              onChange(`${pad(tempH)}:${pad(tempM)}`);
              onClose();
           }}>OK</Button>
        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function TimePicker({ value, onChange, className = "" }: { value: string; onChange: (v: string) => void; className?: string }) {
  const [open, setOpen] = React.useState(false);
  
  let displayVal = "--:--";
  if (value) {
    const [h, m] = value.split(":").map(Number);
    if (!isNaN(h) && !isNaN(m)) {
      const isPM = h >= 12;
      const dH = h % 12 || 12;
      displayVal = `${dH.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")} ${isPM ? "PM" : "AM"}`;
    }
  }
  
  return (
    <>
      <div 
        className={cn("input-base flex items-center justify-between cursor-pointer select-none", className)}
        onClick={() => setOpen(true)}
      >
        <span className={value ? "text-slate-900" : "text-slate-9000"}>{displayVal}</span>
        <span className="text-slate-500">🕒</span>
      </div>
      <TimePickerModal open={open} onClose={() => setOpen(false)} value={value} onChange={onChange} />
    </>
  );
}

