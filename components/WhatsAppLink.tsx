"use client";

import React from "react";
import { formatWhatsAppUrl } from "@/lib/format";

export function WhatsAppIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
    </svg>
  );
}

interface WhatsAppLinkProps {
  phone: string | number | null | undefined;
  userName?: string;
  label?: string;
  message?: string;
  variant?: "pill" | "button" | "inline" | "icon";
  className?: string;
  stopPropagation?: boolean;
}

export function WhatsAppLink({
  phone,
  userName,
  label,
  message,
  variant = "pill",
  className = "",
  stopPropagation = true,
}: WhatsAppLinkProps) {
  const phoneStr = phone ? String(phone).trim() : "";
  const waUrl = formatWhatsAppUrl(phoneStr, message);

  if (!phoneStr || !waUrl) {
    return <span className="font-mono text-slate-400 text-xs">—</span>;
  }

  const tooltip = userName
    ? `Chat with ${userName} on WhatsApp (${phoneStr})`
    : `Chat with ${phoneStr} on WhatsApp`;

  const handleClick = (e: React.MouseEvent) => {
    if (stopPropagation) {
      e.stopPropagation();
    }
  };

  if (variant === "button") {
    return (
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        title={tooltip}
        className={`inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-95 ${className}`}
      >
        <WhatsAppIcon className="h-4 w-4 shrink-0 text-white" />
        <span className="truncate">{label || `Chat on WhatsApp (${phoneStr})`}</span>
      </a>
    );
  }

  if (variant === "inline") {
    return (
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        title={tooltip}
        className={`inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 font-mono text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300/80 dark:border-emerald-800/80 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition shadow-xs group ${className}`}
      >
        <WhatsAppIcon className="h-3 w-3 shrink-0 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
        <span className="truncate group-hover:underline">{label || phoneStr}</span>
      </a>
    );
  }

  if (variant === "icon") {
    return (
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        title={tooltip}
        className={`inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all shadow-xs ${className}`}
      >
        <WhatsAppIcon className="h-4 w-4" />
      </a>
    );
  }

  // Default "pill" variant
  return (
    <a
      href={waUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      title={tooltip}
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700/60 hover:bg-emerald-100/90 dark:hover:bg-emerald-900/50 hover:border-emerald-400 transition-all shadow-xs group active:scale-95 ${className}`}
    >
      <WhatsAppIcon className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
      <span className="truncate group-hover:underline">{label || phoneStr}</span>
    </a>
  );
}
