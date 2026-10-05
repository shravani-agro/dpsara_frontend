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

// Eye icon components for form field toggles
const EYE_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8" strokeLinecap="round" />
  </svg>
);

const EYE_OFF_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 21a10.07 10.07 0 0 1-5.94-2.06M9 10h.5m7 0h.5M7 7h.5m7 0h.5M7 7h.5m7 0h.5M7 7h.5m7 0h.5M7 7h.5m7 0h.5M7 7h.5m7 0h.5" strokeLinecap="round" />
  </svg>
);

// Eye visibility state for form fields
const EYE_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8" strokeLinecap="round" />
  </svg>
);

const EYE_OFF_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 21a10.07 10.07 0 0 1-5.94-2.06M9 10h.5m7 0h.5M7 7h.5m7 0h.5M7 7h.5m7 0h.5M7 7h.5m7 0h.5M7 7h.5m7 0h.5" strokeLinecap="round" />
  </svg>
);

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
    open_start_time: "",
    open_stop_time: "",
    close_start_time: "",
    close_stop_time: "",
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
      open_start_time: "",
      open_stop_time: "",
      close_start_time: "",
      close_stop_time: "",
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
      open_start_time: (m.open_start_time || "").substring(0, 5),
      open_stop_time: (m.open_stop_time || "").substring(0, 5),
      close_start_time: (m.close_start_time || "").substring(0, 5),
      close_stop_time: (m.close_stop_time || "").substring(0, 5),
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
        open_start_time: formData.open_start_time || null,
        open_stop_time: formData.open_stop_time || null,
        close_start_time: formData.close_start_time || null,
        close_stop_time: formData.close_stop_time || null,
        sequence_number: Number(formData.sequence_number),
        holiday_status: formData.holiday_status,
      };
      if (formData.market_type === "starline") {
        payload.schedules = formData.schedules;
      }

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
      setConfirmDelete(null);
      load();
    } catch (e: any) {
      setError(parseApiError(e, "Failed to delete market"));
    }
  }

  function addSchedule() {
    setFormData({
      ...formData,
      schedules: [...formData.schedules, { result_time: "", session_label: "" }],
    });
  }

  function removeSchedule(idx: number) {
    const newSchedules = [...formData.schedules];
    newSchedules.splice(idx, 1);
    setFormData({ ...formData, schedules: newSchedules });
  }

  function updateSchedule(idx: number, field: string, val: string) {
    const newSchedules = [...formData.schedules];
    (newSchedules[idx] as any)[field] = val;
    setFormData({ ...formData, schedules: newSchedules });
  }

  const handleDragStart = (e: React.DragEvent, index: number) => {
    dragItem.current = index;
  };

  const handleDragEnter = (e: React.DragEvent, index: number) => {
    dragOverItem.current = index;
  };

  const handleDragEnd = () => {
    if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
      const _markets = [...markets];
      const draggedItemContent = _markets.splice(dragItem.current, 1)[0];
      _markets.splice(dragOverItem.current, 0, draggedItemContent);
      setMarkets(_markets);
      setOrderChanged(true);
    }
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const saveOrder = async () => {
    setIsReordering(true);
    try {
      const payload = markets.map((m, idx) => ({ id: m.id, sequence_number: idx + 1 }));
      await reorderMarkets(payload);
      setOrderChanged(false);
      load();
    } catch (err: any) {
      toast.error("Failed to save reordered markets.");
    } finally {
      setIsReordering(false);
    }
  };

  const toggleHoliday = async (market: any) => {
    try {
      const newStatus = !market.holiday_status;
      await updateMarket(market.id, { holiday_status: newStatus });
      setMarkets(markets.map(m => m.id === market.id ? { ...m, holiday_status: newStatus } : m));
    } catch (err: any) {
      toast.error("Failed to update holiday status");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Markets"
        description="Manage market schedules"
        actions={
          <Button onClick={openCreate} className="gap-2">
            <span>+</span> Create Market
          </Button>
        }
      />
      <ErrorMsg msg={error} />

      <Card 
        title={`${markets.length} markets`} 
        bodyClassName="p-0"
        actions={
          orderChanged ? (
            <Button size="sm" onClick={saveOrder} disabled={isReordering}>
              {isReordering ? "Saving..." : "Save Order"}
            </Button>
          ) : null
        }
      >
        {loading ? (
          <div className="p-4"><Spinner /></div>
        ) : (
          <div className="table-wrap">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="py-2.5 w-8"></th>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Holiday</th>
                  <th>Open / Close</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {markets.map((m, idx) => (
                  <tr 
                    key={m.id} 
                    className="border-t border-slate-100 hover:bg-slate-50 cursor-move"
                    draggable
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragEnter={(e) => handleDragEnter(e, idx)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => e.preventDefault()}
                  >
                    <td className="py-3 text-slate-600 pl-3">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="12" r="1"></circle><circle cx="9" cy="5" r="1"></circle><circle cx="9" cy="19" r="1"></circle><circle cx="15" cy="12" r="1"></circle><circle cx="15" cy="5" r="1"></circle><circle cx="15" cy="19" r="1"></circle></svg>
                    </td>
                    <td className="text-slate-400">{m.id}</td>
                    <td className="font-medium text-slate-900">
                      {m.name} {m.holiday_status && <Badge color="amber" className="ml-2">Holiday</Badge>}
                    </td>
                    <td>
                      <Badge color={m.market_type === "starline" ? "violet" : "slate"}>
                        {m.market_type}
                      </Badge>
                    </td>
                    <td>
                      <input 
                        type="checkbox"
                        className="w-4 h-4 text-violet-600 bg-gray-700 border-gray-600 rounded focus:ring-violet-500 focus:ring-2"
                        checked={!!m.holiday_status} 
                        onChange={() => toggleHoliday(m)} 
                      />
                    </td>
                    <td>
                      <div className="text-xs text-slate-400">
                        {m.open_time} - {m.close_time}
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <Button size="sm" variant="outline" onClick={() => openEdit(m)}>Edit</Button>
                        <Button size="sm" variant="danger" onClick={() => setConfirmDelete(m)}>Delete</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.isNew ? "Create Market" : `Edit Market: ${edit?.name || ""}`}>
        {edit && (
          <div className="space-y-5 max-h-[80vh] overflow-y-auto pr-2">
            <form onSubmit={saveMarket} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">Game Name</label>
                  <Input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Market Name" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">Game Days</label>
                  <Select value={formData.game_days} onChange={(e) => setFormData({ ...formData, game_days: e.target.value })}>
                    <option value="Mon-Sun">Mon-Sun</option>
                    <option value="Mon-Sat">Mon-Sat</option>
                    <option value="Mon-Fri">Mon-Fri</option>
                  </Select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Type</label>
                <Select value={formData.market_type} onChange={(e) => setFormData({ ...formData, market_type: e.target.value })}>
                  <option value="regular">Regular</option>
                  <option value="starline">Starline (Multi-Result)</option>
                </Select>
              </div>

              {formData.market_type === "regular" && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-400">Open Time</label>
                      <TimePicker value={formData.open_time} onChange={(val) => setFormData({ ...formData, open_time: val })} />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-400">Close Time</label>
                      <TimePicker value={formData.close_time} onChange={(val) => setFormData({ ...formData, close_time: val })} />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-400">Open Start Time</label>
                      <TimePicker value={formData.open_start_time} onChange={(val) => setFormData({ ...formData, open_start_time: val })} />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-400">Open Stop Time</label>
                      <TimePicker value={formData.open_stop_time} onChange={(val) => setFormData({ ...formData, open_stop_time: val })} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-400">Close Start Time</label>
                      <TimePicker value={formData.close_start_time} onChange={(val) => setFormData({ ...formData, close_start_time: val })} />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-400">Close Stop Time</label>
                      <TimePicker value={formData.close_stop_time} onChange={(val) => setFormData({ ...formData, close_stop_time: val })} />
                    </div>
                  </div>
                </>
              )}

              {formData.market_type === "starline" && (
                <div className="space-y-3 rounded-lg border border-violet-500/20 bg-violet-500/5 p-4">
                  <div className="text-sm font-medium text-violet-300">
                    Multi-result markets don't have Open/Close times like regular markets.
                    Instead, they have multiple Time Slots (e.g. 11:00 AM, 11:15 AM) where results are declared.
                  </div>
                  
                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-sm font-semibold text-slate-700">Time Slots</div>
                    <Button size="sm" type="button" onClick={addSchedule}>+ Add Slot</Button>
                  </div>
                  {formData.schedules.length === 0 && (
                    <div className="text-xs text-slate-400 italic">No time slots added. You can add them now or later.</div>
                  )}
                  {formData.schedules.map((sch, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input value={sch.session_label} onChange={(e) => updateSchedule(i, "session_label", e.target.value)} placeholder="Label (e.g. 10 AM)" className="flex-1" />
                      <TimePicker value={sch.result_time} onChange={(val) => updateSchedule(i, "result_time", val)} className="w-32" />
                      <Button variant="danger" type="button" size="sm" onClick={() => removeSchedule(i)}>
                        Delete
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">Sequence Number</label>
                  <Input type="number" value={formData.sequence_number} onChange={(e) => setFormData({ ...formData, sequence_number: parseInt(e.target.value) || 0 })} placeholder="0" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">Holiday Status</label>
                  <div className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-100 px-3">
                     <span className="text-sm text-slate-600">{formData.holiday_status ? 'Active Holiday' : 'Normal'}</span>
                     <div className="ml-auto">
                        <Button 
                           type="button"
                           size="sm"
                           variant={formData.holiday_status ? "danger" : "outline"} 
                           onClick={() => setFormData({ ...formData, holiday_status: !formData.holiday_status })}
                        >
                           {formData.holiday_status ? 'Turn Off' : 'Turn On'}
                        </Button>
                     </div>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Button type="submit" className="w-full">Save Market</Button>
              </div>
            </form>
          </div>
        )}
      </Modal>

      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete Market"
        description={confirmDelete?.name}
      >
        <p className="text-sm text-slate-600">
          This will soft-delete the market. Are you sure you want to continue?
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button variant="danger" onClick={confirmRemove}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
