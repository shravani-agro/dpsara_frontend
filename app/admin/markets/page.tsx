"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
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

export default function MarketsPage() {
  const [markets, setMarkets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [edit, setEdit] = useState<any>(null);
  const [confirmDelete, setConfirmDelete] = useState<any>(null);
  const [isReordering, setIsReordering] = useState(false);
  const [orderChanged, setOrderChanged] = useState(false);

  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

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
      const list = Array.isArray(data) ? data : [];
      setMarkets(
        list
          .filter((m: any) => m.is_active !== false && m.is_active !== 0 && m.market_type !== "starline")
          .sort((a: any, b: any) => (a.sequence_number || 0) - (b.sequence_number || 0))
      );
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
      sequence_number: markets.length + 1,
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

      if (formData.market_type === "starline") {
        payload.schedules = formData.schedules;
      }

      if (edit?.isNew) {
        await createMarket(payload);
        toast.success("Market created successfully");
      } else {
        await updateMarket(edit.id, payload);
        toast.success("Market updated successfully");
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
      toast.success("Market deleted successfully from database");
      setConfirmDelete(null);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Error removing market");
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
    if (
      dragItem.current !== null &&
      dragOverItem.current !== null &&
      dragItem.current !== dragOverItem.current
    ) {
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
      toast.success("Markets reordered successfully");
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
      setMarkets(markets.map((m) => (m.id === market.id ? { ...m, holiday_status: newStatus } : m)));
      toast.success(`Holiday status updated for ${market.name}`);
    } catch (err: any) {
      toast.error("Failed to update holiday status");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Markets"
        description="Manage market schedules and operational timings"
        actions={
          <Button onClick={openCreate} className="gap-2">
            <span>+</span> Create Market
          </Button>
        }
      />
      <ErrorMsg msg={error} />

      <Card
        title={`${markets.length} active markets`}
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
          <div className="p-8 text-center">
            <Spinner />
          </div>
        ) : (
          <div className="table-wrap">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-100">
                  <th className="py-3 w-8 pl-3"></th>
                  <th className="py-3">ID</th>
                  <th className="py-3">Name</th>
                  <th className="py-3">Type</th>
                  <th className="py-3">Holiday</th>
                  <th className="py-3">Open / Close</th>
                  <th className="py-3 text-right pr-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {markets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No active markets found. Click "+ Create Market" to add one.
                    </td>
                  </tr>
                ) : (
                  markets.map((m, idx) => (
                    <tr
                      key={m.id}
                      className="border-t border-slate-100 hover:bg-slate-50 cursor-move transition-colors"
                      draggable
                      onDragStart={(e) => handleDragStart(e, idx)}
                      onDragEnter={(e) => handleDragEnter(e, idx)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => e.preventDefault()}
                    >
                      <td className="py-3 text-slate-400 pl-3">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle cx="9" cy="12" r="1" />
                          <circle cx="9" cy="5" r="1" />
                          <circle cx="9" cy="19" r="1" />
                          <circle cx="15" cy="12" r="1" />
                          <circle cx="15" cy="5" r="1" />
                          <circle cx="15" cy="19" r="1" />
                        </svg>
                      </td>
                      <td className="py-3 text-slate-400">{m.id}</td>
                      <td className="py-3 font-semibold text-slate-900">
                        {m.name}{" "}
                        {m.holiday_status && (
                          <Badge color="amber" className="ml-2">
                            Holiday
                          </Badge>
                        )}
                      </td>
                      <td className="py-3">
                        <Badge color={m.market_type === "starline" ? "violet" : "slate"}>
                          {m.market_type}
                        </Badge>
                      </td>
                      <td className="py-3">
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-brand-600 bg-gray-100 border-gray-300 rounded focus:ring-brand-500 cursor-pointer"
                          checked={!!m.holiday_status}
                          onChange={() => toggleHoliday(m)}
                        />
                      </td>
                      <td className="py-3">
                        <div className="text-xs font-mono text-slate-600">
                          {m.open_time || "—"} - {m.close_time || "—"}
                        </div>
                      </td>
                      <td className="py-3 text-right pr-3">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <Button size="sm" variant="outline" onClick={() => openEdit(m)}>
                            Edit
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => setConfirmDelete(m)}>
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        title={edit?.isNew ? "Create Market" : `Edit Market: ${edit?.name || ""}`}
      >
        {edit && (
          <div className="space-y-5 max-h-[80vh] overflow-y-auto pr-2">
            <form onSubmit={saveMarket} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">Game Name</label>
                  <Input
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Market Name"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">Game Days</label>
                  <Select
                    value={formData.game_days}
                    onChange={(e) => setFormData({ ...formData, game_days: e.target.value })}
                  >
                    <option value="Mon-Sun">Mon-Sun</option>
                    <option value="Mon-Sat">Mon-Sat</option>
                    <option value="Mon-Fri">Mon-Fri</option>
                  </Select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Type</label>
                <Select
                  value={formData.market_type}
                  onChange={(e) => setFormData({ ...formData, market_type: e.target.value })}
                >
                  <option value="regular">Regular</option>
                  <option value="starline">Starline (Multi-Result)</option>
                </Select>
              </div>

              {formData.market_type === "regular" && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-400">Open Time</label>
                      <TimePicker
                        value={formData.open_time}
                        onChange={(val) => setFormData({ ...formData, open_time: val })}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-400">Close Time</label>
                      <TimePicker
                        value={formData.close_time}
                        onChange={(val) => setFormData({ ...formData, close_time: val })}
                      />
                    </div>
                  </div>
                </>
              )}

              {formData.market_type === "starline" && (
                <div className="space-y-3 rounded-lg border border-violet-500/20 bg-violet-500/5 p-4">
                  <div className="text-sm font-medium text-violet-300">
                    Multi-result markets don't have Open/Close times like regular markets. Instead, they
                    have multiple Time Slots where results are declared.
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-sm font-semibold text-slate-700">Time Slots</div>
                    <Button size="sm" type="button" onClick={addSchedule}>
                      + Add Slot
                    </Button>
                  </div>
                  {formData.schedules.length === 0 && (
                    <div className="text-xs text-slate-400 italic">
                      No time slots added. You can add them now or later.
                    </div>
                  )}
                  {formData.schedules.map((sch, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        value={sch.session_label}
                        onChange={(e) => updateSchedule(i, "session_label", e.target.value)}
                        placeholder="Label (e.g. 10 AM)"
                        className="flex-1"
                      />
                      <TimePicker
                        value={sch.result_time}
                        onChange={(val) => updateSchedule(i, "result_time", val)}
                        className="w-32"
                      />
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
                  <Input
                    type="number"
                    value={formData.sequence_number}
                    onChange={(e) =>
                      setFormData({ ...formData, sequence_number: parseInt(e.target.value) || 0 })
                    }
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">Holiday Status</label>
                  <div className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-100 px-3">
                    <span className="text-sm text-slate-600">
                      {formData.holiday_status ? "Active Holiday" : "Normal"}
                    </span>
                    <div className="ml-auto">
                      <Button
                        type="button"
                        size="sm"
                        variant={formData.holiday_status ? "danger" : "outline"}
                        onClick={() =>
                          setFormData({ ...formData, holiday_status: !formData.holiday_status })
                        }
                      >
                        {formData.holiday_status ? "Turn Off" : "Turn On"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Button type="submit" className="w-full">
                  Save Market
                </Button>
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
          This will permanently delete the market and all associated data from the database. Are you sure
          you want to continue?
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmRemove}>
            Permanently Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}