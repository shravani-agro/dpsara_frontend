"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Card,
  Button,
  Input,
  Textarea,
  Badge,
  Modal,
  Spinner,
  ErrorMsg,
  PageHeader,
  Field,
} from "@/components/ui";
import { parseApiError } from "@/lib/error-parser";
import {
  getSettings,
  updateSetting,
  broadcastNotification,
  sendUserNotification,
} from "@/lib/admin";

export default function SettingsPage() {
  const [settings, setSettings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [editSetting, setEditSetting] = useState<any>(null);
  const [editValue, setEditValue] = useState("");
  const [editDesc, setEditDesc] = useState("");

  const [bcTitle, setBcTitle] = useState("");
  const [bcMessage, setBcMessage] = useState("");
  const [bcSending, setBcSending] = useState(false);

  const [userNotifUserId, setUserNotifUserId] = useState("");
  const [userNotifTitle, setUserNotifTitle] = useState("");
  const [userNotifMessage, setUserNotifMessage] = useState("");
  const [userNotifSending, setUserNotifSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSettings();
      setSettings(data);
    } catch (e: any) {
      setError(parseApiError(e, "Failed to load settings"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editSetting) return;
    try {
      await updateSetting(editSetting.key, editValue, editDesc || undefined);
      setEditSetting(null);
      setMsg(`Setting "${editSetting.key}" updated`);
      load();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to update setting");
    }
  }

  async function submitBroadcast(e: React.FormEvent) {
    e.preventDefault();
    if (!bcTitle || !bcMessage) return;
    setBcSending(true);
    setError(null);
    setMsg(null);
    try {
      await broadcastNotification(bcTitle, bcMessage);
      setBcTitle("");
      setBcMessage("");
      setMsg("Broadcast sent successfully");
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to send broadcast");
    } finally {
      setBcSending(false);
    }
  }

  async function submitUserNotification(e: React.FormEvent) {
    e.preventDefault();
    if (!userNotifUserId || !userNotifTitle || !userNotifMessage) return;
    setUserNotifSending(true);
    setError(null);
    setMsg(null);
    try {
      await sendUserNotification(parseInt(userNotifUserId, 10), userNotifTitle, userNotifMessage);
      setUserNotifUserId("");
      setUserNotifTitle("");
      setUserNotifMessage("");
      setMsg("Notification sent to user");
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to send notification");
    } finally {
      setUserNotifSending(false);
    }
  }

  function openEdit(s: any) {
    setEditSetting(s);
    setEditValue(s.value ?? "");
    setEditDesc(s.description ?? "");
    setError(null);
  }

  function openCreate() {
    setEditSetting({ key: "", isNew: true });
    setEditValue("");
    setEditDesc("");
    setError(null);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="System configuration and notifications" />

      <ErrorMsg msg={error} />
      {msg && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-300">
          {msg}
        </div>
      )}

      <Card 
        title={`${settings.length} settings`} 
        bodyClassName="p-0" 
        actions={<Button size="sm" onClick={openCreate}>Create Setting</Button>}
      >
        {loading ? (
          <div className="p-4"><Spinner /></div>
        ) : (
          <div className="table-wrap">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="py-2.5">Key</th>
                  <th>Value</th>
                  <th>Description</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {settings.map((s: any) => (
                  <tr key={s.key} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="py-3 font-mono text-slate-900">{s.key}</td>
                    <td className="py-3 text-slate-700 max-w-[200px] truncate">{s.value ?? "—"}</td>
                    <td className="py-3 text-slate-400 text-xs max-w-[300px] truncate">{s.description ?? "—"}</td>
                    <td className="py-3 text-right">
                      <Button size="sm" variant="outline" onClick={() => openEdit(s)}>Edit</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Broadcast Notification">
        <form onSubmit={submitBroadcast} className="space-y-4">
          <Field label="Title">
            <Input required value={bcTitle} onChange={(e) => setBcTitle(e.target.value)} placeholder="Notification title" />
          </Field>
          <Field label="Message">
            <Textarea required value={bcMessage} onChange={(e) => setBcMessage(e.target.value)} placeholder="Notification message" rows={3} />
          </Field>
          <Button type="submit" disabled={bcSending} className="w-full sm:w-auto">
            {bcSending ? "Sending..." : "Broadcast to All"}
          </Button>
        </form>
      </Card>

      <Card title="Send Notification to User">
        <form onSubmit={submitUserNotification} className="space-y-4">
          <Field label="User ID">
            <Input required type="number" value={userNotifUserId} onChange={(e) => setUserNotifUserId(e.target.value)} placeholder="User ID" />
          </Field>
          <Field label="Title">
            <Input required value={userNotifTitle} onChange={(e) => setUserNotifTitle(e.target.value)} placeholder="Notification title" />
          </Field>
          <Field label="Message">
            <Textarea required value={userNotifMessage} onChange={(e) => setUserNotifMessage(e.target.value)} placeholder="Notification message" rows={3} />
          </Field>
          <Button type="submit" disabled={userNotifSending} className="w-full sm:w-auto">
            {userNotifSending ? "Sending..." : "Send to User"}
          </Button>
        </form>
      </Card>

      <Modal open={!!editSetting} onClose={() => setEditSetting(null)} title={`Edit Setting`} description={editSetting?.key}>
        {editSetting && (
          <form onSubmit={submitEdit} className="space-y-4">
            <Field label="Key">
              <Input 
                value={editSetting.key} 
                onChange={(e) => setEditSetting({ ...editSetting, key: e.target.value })}
                disabled={!editSetting.isNew} 
                className={!editSetting.isNew ? "opacity-60" : ""}
                required
              />
            </Field>
            <Field label="Value">
              <Input required value={editValue} onChange={(e) => setEditValue(e.target.value)} placeholder="Setting value" />
            </Field>
            <Field label="Description">
              <Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="Optional description" />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" type="button" onClick={() => setEditSetting(null)}>Cancel</Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
