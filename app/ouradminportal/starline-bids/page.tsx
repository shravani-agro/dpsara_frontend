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
import { listStarlineMarkets, getStarlineBidsSummary } from "@/lib/admin";
import { parseApiError } from "@/lib/error-parser";

const BET_TYPES = [
  { key: "single_ank", label: "Single Digit" },
  { key: "single_patti", label: "Single Pana" },
  { key: "double_patti", label: "Double Pana" },
  { key: "triple_patti", label: "Triple Pana" },
];

export default function StarlineBidDataPage() {
  const [markets, setMarkets] = useState<any[]>([]);
  const [marketId, setMarketId] = useState("");
  const [bidDate, setBidDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [session, setSession] = useState("");
  const [summaryData, setSummaryData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMarkets = useCallback(async () => {
    try {
      const data = await listStarlineMarkets({});
      const starlineMarkets = data;
      setMarkets(starlineMarkets);
      if (starlineMarkets.length > 0) {
        setMarketId(starlineMarkets[0].id.toString());
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
      const data = await getStarlineBidsSummary({
        market_id: Number(marketId),
        bid_date: bidDate,
        session: session || undefined,
      });
      setSummaryData(data);
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
    const items = summaryData.filter((d) => d.bet_type === betType || (betType === "single_ank" && d.bet_type === "starline")); // starline bet type is sometimes stored as "starline" for single digits
    return items.sort((a, b) => {
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

  const selectedMarket = markets.find(m => m.id.toString() === marketId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Starline Bid Data"
        description="View and copy formatted accumulated starline bid data."
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
          <Select value={marketId} onChange={(e) => {
            setMarketId(e.target.value);
            setSession("");
          }}>
            {markets.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1 w-full sm:w-48">
          <label className="text-xs font-medium text-slate-400">Time Slot (Optional)</label>
          <Select value={session} onChange={(e) => setSession(e.target.value)}>
            <option value="">All Slots</option>
            {selectedMarket?.schedules?.map((s: any) => (
              <option key={s.id || s.session_label} value={s.session_label}>
                {s.session_label}
              </option>
            ))}
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
