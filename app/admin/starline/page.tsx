"use client";

import React, { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import {
  Card,
  Button,
  Input,
  Select,
  Spinner,
  ErrorMsg,
  PageHeader,
  EmptyState,
  TimePicker,
} from "@/components/ui";
import { toast } from "@/components/Toast";
import { parseApiError } from "@/lib/error-parser";
import {
  listStarlineMarkets,
  createStarlineMarket,
  updateStarlineMarket,
  listStarlineResults,
  bulkDeclareStarlineResults,
  deleteStarlineResult,
} from "@/lib/admin";

export default function StarlinePage() {
  const [market, setMarket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Results Management State
  const [declaredResults, setDeclaredResults] = useState<any[]>([]);
  const [loadingResults, setLoadingResults] = useState(true);
  const [resultDate, setResultDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [openResult, setOpenResult] = useState("");
  const [sessionLabel, setSessionLabel] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [isDeclaring, setIsDeclaring] = useState(false);

  // New Slot State
  const [newTime, setNewTime] = useState("");
  const [isAddingSlot, setIsAddingSlot] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listStarlineMarkets({});
      if (data && data.length > 0) {
        setMarket(data[0]);
      } else {
        setMarket(null);
      }
    } catch (e: any) {
      setError(parseApiError(e, "Failed to load starline data"));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadResults = useCallback(async () => {
    setLoadingResults(true);
    try {
      const data = await listStarlineResults();
      setDeclaredResults(data);
    } catch {
      setDeclaredResults([]);
    } finally {
      setLoadingResults(false);
    }
  }, []);

  useEffect(() => {
    load();
    loadResults();
  }, [load, loadResults]);

  async function initMarket() {
    try {
      setLoading(true);
      // Create market with default time slots for Satta Matka
      await createStarlineMarket({ 
        name: "Starline Market", 
        market_type: "starline",
        game_days: "Mon-Sun",
        sequence_number: 0,
        holiday_status: false,
        schedules: [
          { session_label: "Morning", result_time: "10:00" },
          { session_label: "Day", result_time: "12:00" },
          { session_label: "Afternoon", result_time: "04:00" },
          { session_label: "Evening", result_time: "06:00" },
        ]
      });
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Error initializing starline market");
      setLoading(false);
    }
  }

  async function handleAddSlot() {
    if (!newTime || !market) return;
    setIsAddingSlot(true);
    try {
      let formattedLabel = newTime;
      try {
        const [h, m] = newTime.split(':');
        const d = new Date();
        d.setHours(parseInt(h, 10));
        d.setMinutes(parseInt(m, 10));
        formattedLabel = format(d, "hh:mm a");
      } catch (e) {
        // fallback
      }
      const newSchedules = [...(market.schedules || []), { session_label: formattedLabel, result_time: newTime }];
      const payload = { ...market, schedules: newSchedules };
      await updateStarlineMarket(market.id, payload);
      setNewTime("");
      await load();
      toast.success("Time slot added");
    } catch (err: any) {
      toast.error("Failed to add time slot");
    } finally {
      setIsAddingSlot(false);
    }
  }

  async function handleRemoveSlot(idx: number) {
    if (!confirm("Are you sure you want to remove this time slot?")) return;
    try {
      const newSchedules = [...(market.schedules || [])];
      newSchedules.splice(idx, 1);
      const payload = { ...market, schedules: newSchedules };
      await updateStarlineMarket(market.id, payload);
      await load();
      toast.success("Time slot removed");
    } catch (err: any) {
      toast.error("Failed to remove time slot");
    }
  }

  async function declareResult() {
    if (!market || !openResult || !sessionLabel) return;
    setIsDeclaring(true);
    setError(null);
    setMsg(null);
    try {
      const payload: any = { 
        market_id: market.id, 
        open_result: openResult,
        result_date: resultDate,
        session_label: sessionLabel
      };
      const res = await bulkDeclareStarlineResults([payload]);
      const first = res.results?.[0];
      if (first?.status === "error") {
        setError(first.detail || "Failed to declare result");
      } else {
        setMsg(first?.status === "updated" ? "Result updated successfully." : "Result declared successfully.");
        setOpenResult("");
        setSessionLabel("");
        loadResults();
      }
    } catch (e: any) {
      setError(parseApiError(e, "Failed to declare result"));
    } finally {
      setIsDeclaring(false);
    }
  }

  async function handleDeleteResult(id: number) {
    if (!confirm("Are you sure you want to delete this result? This will automatically revert any winnings and update user wallets!")) return;
    try {
      await deleteStarlineResult(id);
      toast.success("Result deleted successfully");
      loadResults();
    } catch (err: any) {
      toast.error(parseApiError(err, "Failed to delete result"));
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Starline Settings"
        description="Manage Starline time slots and declare results directly"
      />
      <ErrorMsg msg={error} />
      {msg && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-300">
          {msg}
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center"><Spinner /></div>
      ) : !market ? (
        <Card title="Starline System Setup" className="text-center py-8">
           <EmptyState 
             title="No Starline Market Found" 
             hint="Initialize the Starline system to start adding time slots."
           />
           <Button onClick={initMarket} className="mt-4">Initialize Starline System</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           
           {/* Left Column: Time Slots & Results */}
           <div className="lg:col-span-2 space-y-6">
             <Card title="Time Slots (Sessions)" subtitle="Add direct time slots for Starline">
               <div className="mb-6 p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-wrap gap-4 items-end">
                 <div className="w-48">
<label className="mb-1 block text-xs font-medium text-slate-400">Result Time</label>
                    <div className="relative">
                      <TimePicker value={newTime} onChange={setNewTime} className="pl-10"/>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer select-none transition-colors hover:text-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" id="eye-icon">
                          <path d="M1 12s4-8 11-8 11 8 11 8" strokeLinecap="round" />
                        </svg>
                      </div>
                    </div>
                 </div>
                 <Button onClick={handleAddSlot} disabled={!newTime || isAddingSlot} className="mb-0.5">
                   {isAddingSlot ? "Adding..." : "+ Add Slot"}
                 </Button>
               </div>

               {market.schedules && market.schedules.length > 0 ? (
                 <div className="table-wrap">
                   <table className="w-full text-sm">
                     <thead>
                       <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-200">
                         <th className="py-2.5 px-4">Time Slot</th>
                         <th className="text-right px-4">Action</th>
                       </tr>
                     </thead>
                     <tbody>
                       {market.schedules.map((s: any, idx: number) => (
                         <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                           <td className="py-3 px-4 font-medium text-slate-700">{s.session_label}</td>
                           <td className="px-4 text-right">
                             <Button size="sm" variant="danger" onClick={() => handleRemoveSlot(idx)}>Delete</Button>
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               ) : (
                 <EmptyState title="No Time Slots added yet" />
               )}
             </Card>

             <Card title="Recent Starline Results">
               {loadingResults ? (
                 <Spinner />
               ) : declaredResults.length === 0 ? (
                 <EmptyState title="No results declared yet" />
               ) : (
                 <div className="table-wrap">
                   <table className="w-full text-sm">
                     <thead>
                       <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-200">
                         <th className="py-2.5 px-4">Date</th>
                         <th className="px-4">Time Slot</th>
                         <th className="px-4">Result</th>
                         <th className="px-4 text-right">Actions</th>
                       </tr>
                     </thead>
                     <tbody>
                       {declaredResults.map((r: any) => {
                         const dateStr = r.result_date 
                            ? format(new Date(r.result_date), "dd/MM/yyyy")
                            : r.declared_at ? format(new Date(r.declared_at), "dd/MM/yyyy") : "—";
                         
                         return (
                           <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                             <td className="py-3 px-4 text-slate-600">{dateStr}</td>
                             <td className="px-4 text-slate-400">{r.session_label}</td>
                             <td className="px-4 font-mono text-emerald-400 font-semibold">
                                {r.total_result || r.open_result || "—"}
                             </td>
                             <td className="px-4 text-right space-x-2">
                               <Button 
                                 size="sm" 
                                 variant="outline" 
                                 onClick={() => {
                                   if (r.result_date) setResultDate(r.result_date);
                                   setSessionLabel(r.session_label);
                                   setOpenResult(r.open_result || "");
                                 }}
                               >
                                 Edit
                               </Button>
                               <Button size="sm" variant="danger" onClick={() => handleDeleteResult(r.id)}>Delete</Button>
                             </td>
                           </tr>
                         )
                       })}
                     </tbody>
                   </table>
                 </div>
               )}
             </Card>
           </div>
           
           {/* Right Column: Upload Result */}
           <div className="space-y-6">
             <Card title="Upload Result" subtitle="Declare result for a time slot">
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-400">Date</label>
                    <Input
                      type="date"
                      value={resultDate}
                      onChange={(e) => setResultDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-400">Time Slot</label>
                    <Select
                      value={sessionLabel}
                      onChange={(e) => setSessionLabel(e.target.value)}
                    >
                      <option value="">-- Select Slot --</option>
                      {market.schedules?.map((s: any) => (
                        <option key={s.id || s.session_label} value={s.session_label}>
                          {s.session_label} ({s.result_time?.slice(0, 5)})
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-400">Result Value (e.g. 178-6)</label>
                    <Input
                      placeholder="e.g. 178-6"
                      value={openResult}
                      onChange={(e) => setOpenResult(e.target.value)}
                    />
                  </div>

                  <Button onClick={declareResult} disabled={!openResult || !sessionLabel || isDeclaring} className="w-full">
                    {isDeclaring ? "Processing..." : "Upload Result"}
                  </Button>
                </div>
             </Card>
           </div>
        </div>
      )}
    </div>
  );
}
