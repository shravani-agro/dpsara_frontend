"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Card,
  Button,
  Input,
  Select,
  Badge,
  Modal,
  Spinner,
  ErrorMsg,
  PageHeader,
  TimePicker,
} from "@/components/ui";
import { toast } from "@/components/Toast";
import { parseApiError } from "@/lib/error-parser";
import {
  listMarkets,
  softDeleteMarket,
  createMarket,
  updateMarket,
  reorderMarkets,
} from "@/lib/admin";

const TIME_OPTIONS = Array.from({ length: 24 * 12 }, (_, i) => {
  const h = Math.floor(i / 12).toString().padStart(2, "0");
  const m = ((i % 12) * 5).toString().padStart(2, "0");
  const ampm = Math.floor(i / 12) >= 12 ? "PM" : "AM";
  const h12 = Math.floor(i / 12) % 12 || 12;
  return { value: `${h}:${m}`, label: `${h12}:${m} ${ampm}` };
});

// Helper: check if betting is enabled (current time + 5 min buffer before open/close)
const isBettingEnabled = (marketOpenTime: string, marketCloseTime: string): boolean => {
  const now = new Date();
  const fiveMin = 5 * 60 * 1000; // 5 minutes in ms

  // Parse market times (format "HH:MM")
  const parseTime = (timeStr: string): Date => {
    const [h, m] = timeStr.split(":").map(Number);
    const date = new Date();
    date.setHours(h, m, 0, 0);
    return date
  }

  const openTime = parseTime(marketOpenTime);
  const closeTime = parseTime(marketCloseTime);

  // Check if current time is within 5 min before open time
  const fiveMinBeforeOpen = new Date(openTime.getTime() - fiveMin);
  // Check if current time is within 5 min before close time
  const fiveMinBeforeClose = new Date(closeTime.getTime() - fiveMin);

  // Betting is disabled if current time is within 5 min buffer before open OR close
  // Also disabled if we are past the close time
  const isPastClose = now >= closeTime;
  const isWithinFiveMinBeforeOpen = now >= fiveMinBeforeOpen && now < openTime;
  const isWithinFiveMinBeforeClose = now >= fiveMinBeforeClose && now < closeTime;

  // Betting enabled only if we are NOT in the 5-min buffer AND not past close time
  return !isPastClose && !isWithinFiveMinBeforeOpen && !isWithinFiveMinBeforeClose
};

export default function MarketsPage() {
  const [markets, setMarkets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [edit, setEdit] = useState<any>(null);
  const [confirmDelete, setConfirmDelete] = useState<any>(null);
  const [isReordering, setIsReordering] = useState(false);
  const [orderChanged, setOrderChanged] = useState(false);

  const dragItem = React.useRef<number | null>(null);
  const dragOverItem = React.useRef<number | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    market_type: "regular",
    game_days: "Mon-Sat",
    open_time: "",
    close_time: "",
    sequence_number: 0,
    holiday_status: false,
    schedules: [] as { result_time: string; session_label: string }[],
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listMarkets({});
      setMarkets(data.filter((m: any) => m.is_active !== false && m.market_type !== "starline").sort((a: any, b: any) => (a.sequence_number || 0) - (b.sequence_number || 0)));
      setOrderChanged(false);
    } catch (e: any) {
      setError(parseApiError(e, "Failed to load markets"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setFormData({
      name: "",
      market_type: "regular",
      game_days: "Mon-Sat",
      open_time: "",
      close_time: "",
      sequence_number: 0,
      holiday_status: false,
      schedules: [],
    });
    setEdit({ isNew: true });
  }

  function openEdit(m: any) {
    setFormData({
      name: m.name || "",
      market_type: m.market_type || "regular",
      game_days: m.game_days || "Mon-Sat",
      open_time: (m.open_time || "").substring(0, 5),
      close_time: (m.close_time || "").substring(0, 5),
      sequence_number: m.sequence_number || 0,
      holiday_status: m.holiday_status || false,
      schedules: m.schedules || [],
    });
    setEdit(m);
  }

  async function saveMarket(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload: any = {
        name: formData.name,
        market_type: formData.market_type,
        game_days: formData.game_days,
        open_time: formData.open_time || null,
        close_time: formData.close_time || null,
        sequence_number: Number(formData.sequence_number),
        holiday_status: formData.holiday_status,
      };

      if (edit?.isNew) {
        await createMarket(payload);
      } else {
        await updateMarket(edit.id, payload);
      }
      setEdit(null);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Error saving market");
    }
  }

  async function confirmRemove() {
    if (!confirmDelete) return;
    try {
      await softDeleteMarket(confirmDelete.id);
      toast.success("Market removed successfully");
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Error removing market");
    }
  }
}
// ... rest of the file unchanged