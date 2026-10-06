"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { format } from "date-fns";
import {
  Card,
  Select,
  Spinner,
  ErrorMsg,
  PageHeader,
  Button,
} from "@/components/ui";
import { toast } from "@/components/Toast";
import { listMarkets, getBidsSummary } from "@/lib/admin";
import { parseApiError } from "@/lib/error-parser";

const BET_TYPES = [
  { key: "single_ank", label: "Single Digit" },
  { key: "jodi", label: "Jodi digit" },
  { key: "single_patti", label: "Single Pana" },
  { key: "double_patti", label: "Double Pana" },
  { key: "triple_patti", label: "Triple Pana" },
  { key: "half_sangam_a", label: "Half Sangam A" },
  { key: "half_sangam_b", label: "Half Sangam B" },
  { key: "full_sangam", label: "Full Sangam" },
];

export default function RegularBidDataPage() {
  const [markets, setMarkets] = useState<any[]>([]);
  const [marketId, setMarketId] = useState("");
  const [bidDate, setBidDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [session, setSession] = useState("open");
  const [summaryData, setSummaryData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMarkets = useCallback(async () => {
    try {
      const data = await listMarkets({});
      const regularMarkets = data.filter((m: any) => m.market_type === "regular" || !m.market_type);
      setMarkets(regularMarkets);
      if (regularMarkets.length > 0) {
        setMarketId(regularMarkets[0].id.toString());
      }
    } catch {
      setMarkets([]);
    }
  }, []);

  useEffect(() => {
    loadMarkets();
  }, [loadMarkets]);

  const loadSummary = useCallback(async () => {
    if (!marketId || !bidDate) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getBidsSummary({
        market_id: Number(marketId),
        bid_date: bidDate,
        session: session,
      });
      const processed = data.map((d: any) => {
        if (d.bet_type === "half_sangam") {
          const parts = (d.selected_number || "").split("-");
          if (parts.length === 2) {
            if (parts[0].length === 3 && parts[1].length === 1) {
              return { ...d, bet_type: "half_sangam_a" };
            } else if (parts[0].length === 1 && parts[1].length === 3) {
              return { ...d, bet_type: "half_sangam_b" };
            }
          }
        }
        return d;
      });
      setSummaryData(processed);
    } catch (e: any) {
      setError(parseApiError(e, "Failed to load bid summary"));
    } finally {
      setLoading(false);
    }
  }, [marketId, bidDate, session]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const getGroupedData = (betType: string) => {
    const items = summaryData.filter((d) => d.bet_type === betType);
    return items.sort((a, b) => {
      // numeric sort by selected_number
      const numA = parseInt(a.selected_number, 10);
      const numB = parseInt(b.selected_number, 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.selected_number.localeCompare(b.selected_number);
    });
  };

  const grandTotal = useMemo(() => {
    return summaryData.reduce((acc, curr) => acc + curr.total_amount, 0);
  }, [summaryData]);

  const copyToClipboard = () => {
    const marketName = markets.find(m => m.id.toString() === marketId)?.name || "Unknown Market";
    const nowTime = format(new Date(), "hh:mm a").toLowerCase();
    const formattedDate = format(new Date(bidDate), "dd/MM/yyyy");
    const header = `${marketName} ₹ :\nDate and Time   ${nowTime} ${formattedDate}\n`;

    let body = "";
    for (const bt of BET_TYPES) {
      body += `${bt.label}\n`;
      const group = getGroupedData(bt.key);
      if (group.length > 0) {
        for (const item of group) {
          body += `${item.selected_number} - ${item.total_amount}\n`;
        }
      } else {
        body += `0\n`;
      }
    }
    body += `Total  ${grandTotal}`;

    const textToCopy = header + body;
    navigator.clipboard.writeText(textToCopy).then(() => {
      toast.success("Copied perfectly formatted Bid Data to clipboard!");
    }).catch((err) => {
      console.error("Could not copy text: ", err);
      toast.error("Failed to copy to clipboard.");
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Regular Bid Data"
        description="View and copy formatted accumulated bid data."
        actions={
          <Button variant="primary" onClick={copyToClipboard} disabled={loading || !marketId}>
            Copy to Clipboard 📋
          </Button>
        }
      />

      <div className="flex flex-wrap gap-4 items-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div className="flex flex-col gap-1 w-full sm:w-48">
          <label className="text-xs font-medium text-slate-400">Date</label>
          <input
            type="date"
            value={bidDate}
            onChange={(e) => setBidDate(e.target.value)}
            className="input-base"
          />
        </div>
        <div className="flex flex-col gap-1 w-full sm:w-48">
          <label className="text-xs font-medium text-slate-400">Market</label>
          <Select value={marketId} onChange={(e) => setMarketId(e.target.value)}>
            {markets.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1 w-full sm:w-48">
          <label className="text-xs font-medium text-slate-400">Session</label>
          <Select value={session} onChange={(e) => setSession(e.target.value)}>
            <option value="open">Open</option>
            <option value="close">Close</option>
          </Select>
        </div>
      </div>

      <ErrorMsg msg={error} />

      {loading ? (
        <Spinner />
      ) : (
        <Card title={`Total Summary (Total Amount: ₹${grandTotal})`}>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {BET_TYPES.map((bt) => {
              const items = getGroupedData(bt.key);
              return (
                <div key={bt.key} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <h4 className="text-sm font-semibold text-slate-700 mb-3 border-b border-slate-200 pb-2">
                    {bt.label}
                  </h4>
                  {items.length === 0 ? (
                    <div className="text-slate-400 text-sm">0</div>
                  ) : (
                    <div className="space-y-1">
                      {items.map((item) => (
                        <div key={item.selected_number} className="flex justify-between items-center text-sm border-b border-slate-100 pb-1 last:border-0 last:pb-0">
                          <span className="text-slate-600 font-medium">{item.selected_number}</span>
                          <span className="text-brand-400 font-semibold">{item.total_amount}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
