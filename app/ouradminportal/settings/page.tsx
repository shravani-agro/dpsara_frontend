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
  cn,
} from "@/components/ui";
import { parseApiError } from "@/lib/error-parser";
import {
  getSettings,
  updateSetting,
  broadcastNotification,
  sendUserNotification,
  getPaymentGatewaySettings,
  updatePaymentGatewaySettings,
  testPay100Connection,
} from "@/lib/admin";
import { UserSelect } from "@/components/UserSelect";

export default function SettingsPage() {
  const [settings, setSettings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [whatsapp, setWhatsapp] = useState("");
  const [callUs, setCallUs] = useState("");
  const [contactSaving, setContactSaving] = useState(false);

  const [welcomeBonusEnabled, setWelcomeBonusEnabled] = useState(true);
  const [welcomeBonusAmount, setWelcomeBonusAmount] = useState("50");
  const [bonusSaving, setBonusSaving] = useState(false);

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

  // Payment Gateway states
  const [activeGateway, setActiveGateway] = useState<"cashfree" | "pay100">("cashfree");
  const [p100ClientId, setP100ClientId] = useState("");
  const [p100EncryptedKey, setP100EncryptedKey] = useState("");
  const [p100SecretKey, setP100SecretKey] = useState("");
  const [p100BaseUrl, setP100BaseUrl] = useState("https://pay100.in");
  const [p100ExpiryMinutes, setP100ExpiryMinutes] = useState("10");
  const [p100HasEncryptedKey, setP100HasEncryptedKey] = useState(false);
  const [p100HasSecretKey, setP100HasSecretKey] = useState(false);

  const [cfClientId, setCfClientId] = useState("");
  const [cfSecretKey, setCfSecretKey] = useState("");
  const [cfHasSecretKey, setCfHasSecretKey] = useState(false);
  const [cfEnv, setCfEnv] = useState("production");

  const [gatewaySaving, setGatewaySaving] = useState(false);
  const [testRunning, setTestRunning] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSettings();
      setSettings(data);
      const wa = data.find((s: any) => s.key === "admin_whatsapp_number");
      const ca = data.find((s: any) => s.key === "admin_call_us_number");
      if (wa?.value) setWhatsapp(wa.value);
      if (ca?.value) setCallUs(ca.value);

      const wbEnabled = data.find((s: any) => s.key === "welcome_bonus_enabled");
      const wbAmount = data.find((s: any) => s.key === "welcome_bonus_amount");
      if (wbEnabled?.value !== undefined) {
        setWelcomeBonusEnabled(wbEnabled.value === "true" || wbEnabled.value === "1");
      }
      if (wbAmount?.value) {
        setWelcomeBonusAmount(wbAmount.value);
      }

      // Load Payment Gateway Configuration
      try {
        const gw = await getPaymentGatewaySettings();
        if (gw.active_gateway) {
          setActiveGateway(gw.active_gateway === "pay100" ? "pay100" : "cashfree");
        }
        if (gw.pay100) {
          setP100ClientId(gw.pay100.client_id || "");
          setP100BaseUrl(gw.pay100.base_url || "https://pay100.in");
          setP100ExpiryMinutes(String(gw.pay100.expiry_minutes || 10));
          setP100HasEncryptedKey(Boolean(gw.pay100.has_encrypted_key));
          setP100HasSecretKey(Boolean(gw.pay100.has_secret_key));
        }
        if (gw.cashfree) {
          setCfClientId(gw.cashfree.client_id || "");
          setCfEnv(gw.cashfree.env || "production");
          setCfHasSecretKey(Boolean(gw.cashfree.has_secret_key));
        }
      } catch (err) {
        console.warn("Could not load gateway settings:", err);
      }
    } catch (e: any) {
      setError(parseApiError(e, "Failed to load settings"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function submitWelcomeBonus(e: React.FormEvent) {
    e.preventDefault();
    setBonusSaving(true);
    setError(null);
    setMsg(null);
    try {
      await updateSetting(
        "welcome_bonus_enabled",
        welcomeBonusEnabled ? "true" : "false",
        "Enable welcome bonus for new registrations (true/false)"
      );
      await updateSetting(
        "welcome_bonus_amount",
        welcomeBonusAmount || "50",
        "Welcome bonus amount credited strictly to new registrations"
      );
      setMsg("Welcome Registration Bonus settings saved successfully!");
      load();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to update bonus settings");
    } finally {
      setBonusSaving(false);
    }
  }

  async function submitContactNumbers(e: React.FormEvent) {
    e.preventDefault();
    setContactSaving(true);
    setError(null);
    setMsg(null);
    try {
      await updateSetting("admin_whatsapp_number", whatsapp, "Admin WhatsApp Number");
      await updateSetting("admin_call_us_number", callUs, "Admin Call Us Number");
      setMsg("Support contact numbers updated successfully!");
      load();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to update contact numbers");
    } finally {
      setContactSaving(false);
    }
  }

  async function submitGatewaySettings(e: React.FormEvent) {
    e.preventDefault();
    setGatewaySaving(true);
    setError(null);
    setMsg(null);
    setTestResult(null);
    try {
      const payload: any = {
        active_gateway: activeGateway,
        pay100_client_id: p100ClientId,
        pay100_base_url: p100BaseUrl,
        pay100_expiry_minutes: parseInt(p100ExpiryMinutes) || 10,
        cashfree_deposit_client_id: cfClientId,
        cashfree_env: cfEnv,
      };
      if (p100EncryptedKey.trim()) payload.pay100_encrypted_key = p100EncryptedKey.trim();
      if (p100SecretKey.trim()) payload.pay100_secret_key = p100SecretKey.trim();
      if (cfSecretKey.trim()) payload.cashfree_deposit_secret_key = cfSecretKey.trim();

      await updatePaymentGatewaySettings(payload);
      setMsg(`Payment Gateway settings saved! Active gateway is now: ${activeGateway.toUpperCase()}`);
      setP100EncryptedKey("");
      setP100SecretKey("");
      setCfSecretKey("");
      load();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to update payment gateway settings");
    } finally {
      setGatewaySaving(false);
    }
  }

  async function handleTestPay100() {
    setTestRunning(true);
    setTestResult(null);
    try {
      const res = await testPay100Connection();
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.response?.data?.detail || "Failed to test Pay100 connection",
      });
    } finally {
      setTestRunning(false);
    }
  }

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
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-700 dark:text-emerald-300 font-medium">
          {msg}
        </div>
      )}

      <Card title="🎁 New User Registration Bonus" subtitle="Configure automatic welcome cash credited strictly on new registrations">
        <form onSubmit={submitWelcomeBonus} className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/70">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  Welcome Registration Bonus Status
                </span>
                <Badge color={welcomeBonusEnabled ? "emerald" : "slate"}>
                  {welcomeBonusEnabled ? "ACTIVE (ON)" : "DISABLED (OFF)"}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl">
                When enabled, every brand-new registration strictly receives ₹{welcomeBonusAmount || "50"} credited into their wallet. When turned OFF, no welcome bonus is given.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setWelcomeBonusEnabled(!welcomeBonusEnabled)}
              className={cn(
                "relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500",
                welcomeBonusEnabled ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
              )}
              title={welcomeBonusEnabled ? "Click to Disable" : "Click to Enable"}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
                  welcomeBonusEnabled ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Registration Bonus Amount (₹)</label>
              <Input
                type="number"
                min="0"
                step="1"
                value={welcomeBonusAmount}
                onChange={(e) => setWelcomeBonusAmount(e.target.value)}
                placeholder="50"
                required
              />
              <p className="text-[11px] text-slate-500 mt-1">Default is ₹50 credited strictly on first registration.</p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={bonusSaving} className="w-full sm:w-auto">
              {bonusSaving ? "Saving..." : "Save Bonus Settings"}
            </Button>
          </div>
        </form>
      </Card>

      <Card
        title="💳 Deposit Payment Gateway"
        subtitle="Dynamically toggle between Cashfree PG and Pay100 Collection (UPI Intent), or update API credentials."
      >
        <form onSubmit={submitGatewaySettings} className="space-y-6">
          {/* Active Gateway Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Active Payment Gateway
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                onClick={() => setActiveGateway("cashfree")}
                className={cn(
                  "cursor-pointer rounded-2xl border-2 p-4 transition-all duration-200",
                  activeGateway === "cashfree"
                    ? "border-brand-500 bg-brand-500/10 shadow-sm"
                    : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 hover:border-slate-300 dark:hover:border-slate-700"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">💳</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">Cashfree PG</span>
                  </div>
                  <Badge color={activeGateway === "cashfree" ? "emerald" : "slate"}>
                    {activeGateway === "cashfree" ? "ACTIVE" : "STANDBY"}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Traditional web checkout with Cards, Netbanking, Wallets & Cashfree UPI SDK.
                </p>
              </div>

              <div
                onClick={() => setActiveGateway("pay100")}
                className={cn(
                  "cursor-pointer rounded-2xl border-2 p-4 transition-all duration-200",
                  activeGateway === "pay100"
                    ? "border-brand-500 bg-brand-500/10 shadow-sm"
                    : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 hover:border-slate-300 dark:hover:border-slate-700"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">⚡</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">Pay100 (UPI Intent)</span>
                  </div>
                  <Badge color={activeGateway === "pay100" ? "emerald" : "slate"}>
                    {activeGateway === "pay100" ? "ACTIVE" : "STANDBY"}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Fast UPI Payment Intent opening PhonePe, GPay, Paytm with instant QR fallback and auto-approval.
                </p>
              </div>
            </div>
          </div>

          {/* Pay100 Configuration */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/40 dark:bg-slate-850/40 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>⚡</span> Pay100 Credentials (https://pay100.in)
                </h4>
                <p className="text-xs text-slate-500">Required for UPI Intent creation and webhook signature validation.</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTestPay100}
                disabled={testRunning}
              >
                {testRunning ? "Testing..." : "Test Pay100 Connection"}
              </Button>
            </div>

            {testResult && (
              <div
                className={cn(
                  "p-3 rounded-xl text-xs font-medium border",
                  testResult.success
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                    : "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
                )}
              >
                {testResult.success ? "✓ " : "✗ "}
                {testResult.message}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Pay100 Client ID (X-Client-ID)">
                <Input
                  value={p100ClientId}
                  onChange={(e) => setP100ClientId(e.target.value)}
                  placeholder="e.g. 1000000000000000"
                />
              </Field>

              <Field label="Pay100 API Base URL">
                <Input
                  value={p100BaseUrl}
                  onChange={(e) => setP100BaseUrl(e.target.value)}
                  placeholder="https://pay100.in"
                />
              </Field>

              <Field
                label={`Pay100 Encrypted Key (X-Encrypted-Key) ${
                  p100HasEncryptedKey ? "• [Saved in Server]" : ""
                }`}
              >
                <Input
                  type="password"
                  value={p100EncryptedKey}
                  onChange={(e) => setP100EncryptedKey(e.target.value)}
                  placeholder={
                    p100HasEncryptedKey
                      ? "•••••••• (Leave blank to keep unchanged)"
                      : "Enter encrypted production key"
                  }
                />
              </Field>

              <Field
                label={`Pay100 Secret Key (X-Secret-Key) ${
                  p100HasSecretKey ? "• [Saved in Server]" : ""
                }`}
              >
                <Input
                  type="password"
                  value={p100SecretKey}
                  onChange={(e) => setP100SecretKey(e.target.value)}
                  placeholder={
                    p100HasSecretKey
                      ? "•••••••• (Leave blank to keep unchanged)"
                      : "Enter active secret key"
                  }
                />
              </Field>

              <Field label="Pay100 Request Validity (Minutes)">
                <Input
                  type="number"
                  min="1"
                  max="60"
                  value={p100ExpiryMinutes}
                  onChange={(e) => setP100ExpiryMinutes(e.target.value)}
                  placeholder="10"
                />
              </Field>
            </div>
            <p className="text-[11px] text-slate-500">
              Webhook URL for Pay100: <code className="font-mono text-slate-700 dark:text-slate-300">https://backend.dpsara777.com/api/mobile/deposit/pay100/webhook</code>
            </p>
          </div>

          {/* Cashfree Configuration */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/40 dark:bg-slate-850/40 space-y-4">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-2">
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>💳</span> Cashfree PG Credentials
              </h4>
              <p className="text-xs text-slate-500">Configured credentials for Cashfree Payment Gateway.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Cashfree Deposit App ID">
                <Input
                  value={cfClientId}
                  onChange={(e) => setCfClientId(e.target.value)}
                  placeholder="Cashfree App ID"
                />
              </Field>

              <Field
                label={`Cashfree Secret Key ${cfHasSecretKey ? "• [Saved]" : ""}`}
              >
                <Input
                  type="password"
                  value={cfSecretKey}
                  onChange={(e) => setCfSecretKey(e.target.value)}
                  placeholder={
                    cfHasSecretKey
                      ? "•••••••• (Leave blank to keep unchanged)"
                      : "Enter secret key"
                  }
                />
              </Field>

              <Field label="Cashfree Environment">
                <select
                  value={cfEnv}
                  onChange={(e) => setCfEnv(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="production">Production</option>
                  <option value="sandbox">Sandbox / Testing</option>
                </select>
              </Field>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={gatewaySaving} className="w-full sm:w-auto">
              {gatewaySaving ? "Saving..." : "Save Payment Gateway Settings"}
            </Button>
          </div>
        </form>
      </Card>

      <Card title="Support Contact Numbers (App Homepage)">
        <form onSubmit={submitContactNumbers} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="WhatsApp Number">
              <Input
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="e.g. +91 8377 999 777"
                required
              />
            </Field>
            <Field label="Call Us Number">
              <Input
                value={callUs}
                onChange={(e) => setCallUs(e.target.value)}
                placeholder="e.g. +91 8377 999 777"
                required
              />
            </Field>
          </div>
          <p className="text-xs text-slate-500">
            These numbers are dynamically used on the mobile app home screen for the &quot;WhatsApp&quot; and &quot;Call Us&quot; buttons.
          </p>
          <Button type="submit" disabled={contactSaving} className="w-full sm:w-auto">
            {contactSaving ? "Saving..." : "Save Support Numbers"}
          </Button>
        </form>
      </Card>

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
                  <tr key={s.key} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 font-mono text-slate-900 dark:text-slate-100">{s.key}</td>
                    <td className="py-3 text-slate-700 dark:text-slate-300 max-w-[200px] truncate">{s.value ?? "—"}</td>
                    <td className="py-3 text-slate-400 dark:text-slate-500 text-xs max-w-[300px] truncate">{s.description ?? "—"}</td>
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
          <Field label="Select User (Search by Name or Phone)">
            <UserSelect
              value={userNotifUserId}
              onChange={(id) => setUserNotifUserId(id)}
              placeholder="Search user by name, username or phone..."
              required
            />
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
