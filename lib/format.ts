export function fmtMoney(n: any): string {
  if (n === undefined || n === null || isNaN(Number(n))) return "—";
  return `₹${Number(n).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
}

export function fmtNum(n: any): string {
  if (n === undefined || n === null || isNaN(Number(n))) return "—";
  return Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export function fmtCompact(n: any): string {
  if (n === undefined || n === null || isNaN(Number(n))) return "—";
  const v = Number(n);
  if (Math.abs(v) >= 1e7) return `${(v / 1e7).toFixed(1)}Cr`;
  if (Math.abs(v) >= 1e5) return `${(v / 1e5).toFixed(1)}L`;
  if (Math.abs(v) >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return `${v}`;
}

/**
 * Safely parse date from backend.
 * Database timestamps are UTC. If naive (no Z or offset), treat as UTC so it renders in IST accurately.
 */
export function parseToDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  let str = String(iso).trim();
  if (!str) return null;

  // Already includes timezone offset or Z
  if (str.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(str)) {
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }

  // Pure date without time: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const d = new Date(`${str}T00:00:00+05:30`);
    return isNaN(d.getTime()) ? null : d;
  }

  // Naive date-time like "2026-10-17 12:51:00" or "2026-10-17T12:51:00" -> treat as UTC
  str = str.replace(" ", "T") + "Z";
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Format datetime strictly in Indian Standard Time (IST - Asia/Kolkata).
 * Example: "17 Oct 2026, 06:21 pm"
 */
export function fmtDateTime(iso: string | null | undefined): string {
  const d = parseToDate(iso);
  if (!d) return "—";
  return d.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Format date in Indian Standard Time (IST - Asia/Kolkata).
 * Example: "17 Oct 2026"
 */
export function fmtDate(iso: string | null | undefined): string {
  const d = parseToDate(iso);
  if (!d) return "—";
  return d.toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Format time in Indian Standard Time (IST - Asia/Kolkata).
 * Example: "06:21 pm"
 */
export function fmtTime(iso: string | null | undefined): string {
  const d = parseToDate(iso);
  if (!d) return "—";
  return d.toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}
