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

/**
 * Custom IST format helper replacing date-fns format.
 * Formats dates strictly in Indian Standard Time (IST - Asia/Kolkata).
 * Supports standard format patterns: "yyyy-MM-dd", "dd/MM/yyyy", "dd/MM/yy", "hh:mm a", "HH:mm", etc.
 */
export function format(dateInput: any, formatStr: string = "yyyy-MM-dd"): string {
  const d = parseToDate(dateInput) || (dateInput instanceof Date ? dateInput : new Date(dateInput));
  if (!d || isNaN(d.getTime())) return "—";

  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(d);

  const getPart = (type: string) => parts.find((p) => p.type === type)?.value || "";
  const year = getPart("year");
  const month = getPart("month");
  const day = getPart("day");
  const hours24 = parseInt(getPart("hour") || "0", 10);
  const hours12 = hours24 % 12 || 12;
  const minutes = getPart("minute");
  const seconds = getPart("second");
  const ampm = hours24 >= 12 ? "PM" : "AM";
  const pad = (n: number | string, len: number = 2) => String(n).padStart(len, "0");

  const tokens: Record<string, string> = {
    "yyyy": year,
    "yy": year.slice(-2),
    "MM": month,
    "dd": day,
    "HH": pad(hours24),
    "H": String(hours24),
    "hh": pad(hours12),
    "h": String(hours12),
    "mm": minutes,
    "ss": seconds,
    "a": ampm,
    "aa": ampm,
    "aaa": ampm.toLowerCase(),
    "aaaa": ampm.toLowerCase(),
  };

  return formatStr.replace(/yyyy|yy|MM|dd|HH|H|hh|h|mm|ss|aaaa|aaa|aa|a/g, (match) => {
    return tokens[match] !== undefined ? tokens[match] : match;
  });
}

/**
 * Format a phone number into a direct WhatsApp Web / App chat link.
 * Handles standard 10-digit Indian numbers, leading zeros, +91, international formats, and strips non-digits.
 */
export function formatWhatsAppUrl(
  rawPhone: string | number | null | undefined,
  message?: string
): string | null {
  if (!rawPhone) return null;
  const digits = String(rawPhone).replace(/\D/g, "");
  if (!digits || digits.length < 7) return null;

  let normalized = digits;
  // If 10 digits (standard Indian mobile format, e.g. 9876543210), prepend country code 91
  if (normalized.length === 10) {
    normalized = "91" + normalized;
  } else if (normalized.length === 11 && normalized.startsWith("0")) {
    normalized = "91" + normalized.slice(1);
  }

  let url = `https://wa.me/${normalized}`;
  if (message) {
    url += `?text=${encodeURIComponent(message)}`;
  }
  return url;
}

