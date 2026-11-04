"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Card,
  Button,
  Input,
  Spinner,
  PageHeader,
  Badge,
} from "@/components/ui";
import { toast } from "@/components/Toast";
import { parseApiError } from "@/lib/error-parser";
import {
  getWhatsAppStatus,
  getWhatsAppSettings,
  updateWhatsAppSettings,
  getWhatsAppTemplates,
  testWhatsAppMessage,
  broadcastWhatsAppMessage,
  triggerMorningWhatsApp,
  triggerNightWhatsApp,
  type WhatsAppStatus,
  type WhatsAppSettings,
} from "@/lib/admin";

export default function WhatsAppMarketingPage() {
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [settings, setSettings] = useState<WhatsAppSettings>({
    url: "http://127.0.0.1:2785",
    session_id: "08464f4f-6619-4a72-aef8-c3bb06ee2029",
    api_key: "",
    master_enabled: true,
    notify_deposit: true,
    notify_withdrawal: true,
    notify_welcome: true,
    morning_enabled: true,
    night_enabled: true,
    morning_time: "09:00",
    night_time: "22:30",
  });

  const [templates, setTemplates] = useState<Record<string, string>>({});
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>("morning");

  // Broadcast state
  const [broadcastText, setBroadcastText] = useState("");
  const [broadcastTarget, setBroadcastTarget] = useState<"all" | "active">("active");
  const [broadcasting, setBroadcasting] = useState(false);

  // Test message state
  const [testPhone, setTestPhone] = useState("");
  const [sendingTest, setSendingTest] = useState(false);

  // Advanced gateway config toggle
  const [showConfig, setShowConfig] = useState(false);
  const [configUrl, setConfigUrl] = useState("");
  const [configSessionId, setConfigSessionId] = useState("");
  const [configApiKey, setConfigApiKey] = useState("");

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [sData, stData, tData] = await Promise.all([
        getWhatsAppSettings().catch(() => null),
        getWhatsAppStatus().catch((err) => ({
          online: false,
          error: parseApiError(err, "Failed to connect to WhatsApp Gateway"),
          gateway_url: "http://127.0.0.1:2785",
          session_id: "08464f4f-6619-4a72-aef8-c3bb06ee2029",
          master_enabled: true,
        })),
        getWhatsAppTemplates().catch(() => ({})),
      ]);

      if (sData) {
        setSettings(sData);
        setConfigUrl(sData.url || "http://127.0.0.1:2785");
        setConfigSessionId(sData.session_id || "08464f4f-6619-4a72-aef8-c3bb06ee2029");
        setConfigApiKey(sData.api_key || "");
      }
      if (stData) setStatus(stData);
      if (tData) {
        setTemplates(tData);
        const tpls = tData as Record<string, string>;
        if (tpls && tpls.morning) setBroadcastText(tpls.morning);
      }
    } catch (e: any) {
      toast.error(parseApiError(e, "Error loading WhatsApp dashboard"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const refreshStatus = async () => {
    setStatusLoading(true);
    try {
      const st = await getWhatsAppStatus();
      setStatus(st);
      if (st.online) {
        toast.success(`OpenWA Gateway is ONLINE! (Session: ${st.state || "active"})`);
      } else {
        toast.info(st.error || "OpenWA Gateway returned offline state");
      }
    } catch (e: any) {
      toast.error(parseApiError(e, "Failed to reach WhatsApp Gateway"));
    } finally {
      setStatusLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const payload: any = {
        wa_enabled: settings.master_enabled,
        wa_notify_deposit: settings.notify_deposit,
        wa_notify_withdrawal: settings.notify_withdrawal,
        wa_notify_welcome: settings.notify_welcome,
        wa_daily_morning_enabled: settings.morning_enabled,
        wa_daily_night_enabled: settings.night_enabled,
        wa_daily_morning_time: settings.morning_time,
        wa_daily_night_time: settings.night_time,
      };

      if (configUrl) payload.wa_api_url = configUrl;
      if (configSessionId) payload.wa_session_id = configSessionId;
      if (configApiKey && !configApiKey.includes("***")) payload.wa_api_key = configApiKey;

      await updateWhatsAppSettings(payload);
      toast.success("WhatsApp automation settings saved successfully!");
      await loadAll();
    } catch (e: any) {
      toast.error(parseApiError(e, "Failed to save settings"));
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSendTest = async () => {
    if (!testPhone.trim() || testPhone.trim().length < 10) {
      toast.info("Please enter a valid 10-digit mobile number for testing.");
      return;
    }
    setSendingTest(true);
    try {
      await testWhatsAppMessage(
        testPhone.trim(),
        "🚀 *DPSARA 777 WhatsApp Gateway Test*\n\nYour OpenWA Gateway connection is ACTIVE and working perfectly! 🎉\n\n✨ _Ready for automated player notifications & daily broadcasts._"
      );
      toast.success(`Test WhatsApp message sent to ${testPhone.trim()}! Check your phone.`);
    } catch (e: any) {
      toast.error(parseApiError(e, "Failed to send test message"));
    } finally {
      setSendingTest(false);
    }
  };

  const handleSelectTemplate = (key: string) => {
    setSelectedTemplateKey(key);
    if (templates[key]) {
      setBroadcastText(templates[key]);
    }
  };

  const handleBroadcast = async () => {
    if (!broadcastText.trim()) {
      toast.info("Message text cannot be empty.");
      return;
    }

    const targetDesc = broadcastTarget === "active" ? "all ACTIVE players" : "ALL registered players";
    if (!confirm(`Are you sure you want to broadcast this WhatsApp message to ${targetDesc}?`)) {
      return;
    }

    setBroadcasting(true);
    try {
      const res = await broadcastWhatsAppMessage({
        text: broadcastText.trim(),
        target: broadcastTarget,
      });
      toast.success(res.message || "Broadcast completed successfully!");
    } catch (e: any) {
      toast.error(parseApiError(e, "Failed to execute WhatsApp broadcast"));
    } finally {
      setBroadcasting(false);
    }
  };

  const handleTriggerMorningNow = async () => {
    if (!confirm("Send Good Morning / Market Opening broadcast to active players right now?")) return;
    try {
      const res = await triggerMorningWhatsApp();
      toast.success(res.message || "Good Morning broadcast executed!");
    } catch (e: any) {
      toast.error(parseApiError(e, "Failed to send Good Morning broadcast"));
    }
  };

  const handleTriggerNightNow = async () => {
    if (!confirm("Send Good Night / Settlement summary broadcast to active players right now?")) return;
    try {
      const res = await triggerNightWhatsApp();
      toast.success(res.message || "Good Night broadcast executed!");
    } catch (e: any) {
      toast.error(parseApiError(e, "Failed to send Good Night broadcast"));
    }
  };

  // Convert WhatsApp markdown format into HTML preview
  const formatWhatsAppText = (text: string) => {
    if (!text) return "";
    let formatted = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Bold *text*
    formatted = formatted.replace(/\*(.*?)\*/g, "<strong>$1</strong>");
    // Italics _text_
    formatted = formatted.replace(/_(.*?)_/g, "<em>$1</em>");
    // Code `text`
    formatted = formatted.replace(/`(.*?)`/g, "<code class='bg-emerald-900/40 text-emerald-300 px-1 rounded text-xs'>$1</code>");
    // URLs
    formatted = formatted.replace(
      /(https?:\/\/[^\s]+)/g,
      "<a href='$1' target='_blank' rel='noopener noreferrer' class='text-blue-400 underline font-semibold'>$1</a>"
    );
    // Line breaks
    formatted = formatted.replace(/\n/g, "<br />");
    return formatted;
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="py-20" />
      </div>
    );
  }

  const isOnline = Boolean(status?.online);
  const stateStr = String(status?.state || "").toLowerCase();
  const isQrRequired = stateStr.includes("qr") || stateStr.includes("relink") || stateStr.includes("disconnected");

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="WhatsApp Automation & Marketing"
        description="High-converting WhatsApp notifications for deposits, withdrawals, registration bonus, and daily scheduled broadcasts powered by OpenWA Gateway"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={refreshStatus}
              disabled={statusLoading}
            >
              {statusLoading ? "Checking..." : "🔄 Check Gateway Status"}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveSettings}
              disabled={savingSettings}
            >
              {savingSettings ? "Saving..." : "💾 Save Settings"}
            </Button>
          </div>
        }
      />

      {/* TOP GATEWAY STATUS BAR */}
      <Card className="border border-slate-200 dark:border-slate-800 bg-gradient-to-r from-emerald-950/20 via-slate-900/40 to-slate-900/60 p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start md:items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-2xl flex-shrink-0">
              📱
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-100">OpenWA Docker Gateway</h3>
                {isOnline && !isQrRequired ? (
                  <Badge color="emerald">CONNECTED & READY</Badge>
                ) : isQrRequired ? (
                  <Badge color="amber">RE-PAIRING / QR REQUIRED</Badge>
                ) : (
                  <Badge color="red">OFFLINE / UNREACHABLE</Badge>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Host: <code className="text-emerald-400 font-mono">{settings.url}</code> &bull; Session:{" "}
                <code className="text-slate-300 font-mono">{settings.session_id}</code>
              </p>
            </div>
          </div>

          {/* Quick Test Message Input */}
          <div className="flex items-center gap-2 bg-slate-950/60 p-2 rounded-xl border border-slate-800">
            <Input
              placeholder="10-digit mobile (e.g. 9876543210)"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              className="w-48 h-8 text-xs"
            />
            <Button
              size="sm"
              variant="primary"
              onClick={handleSendTest}
              disabled={sendingTest}
              className="text-xs whitespace-nowrap"
            >
              {sendingTest ? "Sending..." : "⚡ Send Test"}
            </Button>
          </div>
        </div>

        {isQrRequired && (
          <div className="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
            <div>
              ⚠️ <strong>WhatsApp Unlinked:</strong> WhatsApp Web requires scanning a fresh QR code on the VPS server to restore active messaging.
            </div>
            <code className="text-[11px] bg-slate-900 px-2 py-1 rounded text-amber-200">
              docker logs --tail 30 openwa-api
            </code>
          </div>
        )}
      </Card>

      {/* AUTOMATION TOGGLES GRID */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
              Automated Event Notifications
            </h2>
            <p className="text-xs text-slate-400">
              Instant trigger notifications sent straight to player WhatsApp inbox
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-300">Master WhatsApp Switch:</span>
            <button
              type="button"
              onClick={() => setSettings((s) => ({ ...s, master_enabled: !s.master_enabled }))}
              className={`w-12 h-6 flex items-center rounded-full p-1 duration-200 cursor-pointer ${
                settings.master_enabled ? "bg-emerald-500 justify-end" : "bg-slate-700 justify-start"
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-md transform" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Card 1: Deposit */}
          <Card className="p-4 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-sm text-slate-200">
                  <span className="text-emerald-400 text-lg">💰</span>
                  <span>Deposit Approved</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notify_deposit}
                  onChange={(e) => setSettings((s) => ({ ...s, notify_deposit: e.target.checked }))}
                  className="w-4 h-4 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                />
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Sends a high-profile receipt with new wallet balance, transaction ID, and instant play link immediately upon deposit confirmation.
              </p>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-800 flex justify-between items-center text-[11px] text-slate-500">
              <span>Trigger: Auto & Manual Approval</span>
              <button
                type="button"
                onClick={() => handleSelectTemplate("deposit")}
                className="text-emerald-400 hover:underline font-semibold"
              >
                Preview Template &rarr;
              </button>
            </div>
          </Card>

          {/* Card 2: Withdrawal */}
          <Card className="p-4 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-sm text-slate-200">
                  <span className="text-sky-400 text-lg">💸</span>
                  <span>Withdrawal Processed</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notify_withdrawal}
                  onChange={(e) => setSettings((s) => ({ ...s, notify_withdrawal: e.target.checked }))}
                  className="w-4 h-4 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                />
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Sends payout confirmation with amount, mode (Bank/UPI), account details, and request ID as soon as a payout is processed.
              </p>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-800 flex justify-between items-center text-[11px] text-slate-500">
              <span>Trigger: Single & Bulk Approval</span>
              <button
                type="button"
                onClick={() => handleSelectTemplate("withdrawal")}
                className="text-sky-400 hover:underline font-semibold"
              >
                Preview Template &rarr;
              </button>
            </div>
          </Card>

          {/* Card 3: Welcome Bonus */}
          <Card className="p-4 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-sm text-slate-200">
                  <span className="text-amber-400 text-lg">👑</span>
                  <span>Welcome Registration Bonus</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notify_welcome}
                  onChange={(e) => setSettings((s) => ({ ...s, notify_welcome: e.target.checked }))}
                  className="w-4 h-4 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                />
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Welcomes new registrations warmly, highlighting their ₹50 bonus credit and giving direct links to popular markets.
              </p>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-800 flex justify-between items-center text-[11px] text-slate-500">
              <span>Trigger: New Player Signup</span>
              <button
                type="button"
                onClick={() => handleSelectTemplate("welcome")}
                className="text-amber-400 hover:underline font-semibold"
              >
                Preview Template &rarr;
              </button>
            </div>
          </Card>

          {/* Card 4: Daily Good Morning */}
          <Card className="p-4 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-sm text-slate-200">
                  <span className="text-yellow-400 text-lg">🌅</span>
                  <span>Daily Good Morning Broadcast</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.morning_enabled}
                  onChange={(e) => setSettings((s) => ({ ...s, morning_enabled: e.target.checked }))}
                  className="w-4 h-4 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                />
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Sends daily opening market timings (Sridevi, Time Bazar, Kalyan, etc.) and lucky wishes automatically every morning.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <label className="text-xs text-slate-400">Trigger Time (IST):</label>
                <input
                  type="time"
                  value={settings.morning_time}
                  onChange={(e) => setSettings((s) => ({ ...s, morning_time: e.target.value }))}
                  className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-slate-200"
                />
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-800 flex justify-between items-center text-[11px]">
              <button
                type="button"
                onClick={handleTriggerMorningNow}
                className="text-yellow-400 hover:underline font-semibold"
              >
                ⚡ Trigger Now
              </button>
              <button
                type="button"
                onClick={() => handleSelectTemplate("morning")}
                className="text-slate-400 hover:text-slate-200"
              >
                Preview &rarr;
              </button>
            </div>
          </Card>

          {/* Card 5: Daily Good Night */}
          <Card className="p-4 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-sm text-slate-200">
                  <span className="text-indigo-400 text-lg">🌙</span>
                  <span>Daily Good Night Broadcast</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.night_enabled}
                  onChange={(e) => setSettings((s) => ({ ...s, night_enabled: e.target.checked }))}
                  className="w-4 h-4 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                />
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Notifies players that all day games are settled into wallets, highlights night markets, and invites them to check balances.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <label className="text-xs text-slate-400">Trigger Time (IST):</label>
                <input
                  type="time"
                  value={settings.night_time}
                  onChange={(e) => setSettings((s) => ({ ...s, night_time: e.target.value }))}
                  className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-slate-200"
                />
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-800 flex justify-between items-center text-[11px]">
              <button
                type="button"
                onClick={handleTriggerNightNow}
                className="text-indigo-400 hover:underline font-semibold"
              >
                ⚡ Trigger Now
              </button>
              <button
                type="button"
                onClick={() => handleSelectTemplate("night")}
                className="text-slate-400 hover:text-slate-200"
              >
                Preview &rarr;
              </button>
            </div>
          </Card>

          {/* Card 6: Gateway Config summary */}
          <Card className="p-4 border border-slate-200 dark:border-slate-800 flex flex-col justify-between bg-slate-950/40">
            <div>
              <div className="flex items-center gap-2 font-bold text-sm text-slate-200">
                <span className="text-purple-400 text-lg">⚙️</span>
                <span>Gateway Configuration</span>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                OpenWA runs locally in Docker on port 2785. You can view or adjust the API key and session details here.
              </p>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-800">
              <Button
                variant="secondary"
                size="sm"
                className="w-full text-xs"
                onClick={() => setShowConfig(!showConfig)}
              >
                {showConfig ? "Hide Config" : "🛠️ View / Edit Gateway Details"}
              </Button>
            </div>
          </Card>
        </div>

        {/* Collapsible Advanced Gateway Configuration */}
        {showConfig && (
          <Card className="mt-4 p-4 border border-slate-700 bg-slate-950 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              OpenWA Docker Gateway Settings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Gateway Base URL</label>
                <Input
                  value={configUrl}
                  onChange={(e) => setConfigUrl(e.target.value)}
                  placeholder="http://127.0.0.1:2785"
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Session ID</label>
                <Input
                  value={configSessionId}
                  onChange={(e) => setConfigSessionId(e.target.value)}
                  placeholder="08464f4f-6619-4a72-aef8-c3bb06ee2029"
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">API Key</label>
                <Input
                  value={configApiKey}
                  onChange={(e) => setConfigApiKey(e.target.value)}
                  placeholder="owa_k1_..."
                  type="password"
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="primary" onClick={handleSaveSettings} disabled={savingSettings}>
                {savingSettings ? "Saving..." : "Update Gateway Config"}
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* BROADCAST & LIVE PREVIEW CENTER */}
      <div className="pt-2">
        <div className="mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
            WhatsApp Broadcast & Marketing Center
          </h2>
          <p className="text-xs text-slate-400">
            Compose custom announcements or choose templates to broadcast directly to your players
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Composer */}
          <div className="lg:col-span-7 space-y-4">
            <Card className="p-4 border border-slate-200 dark:border-slate-800 space-y-4">
              {/* Template quick pills */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Select Quick Template
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: "morning", label: "🌅 Good Morning" },
                    { key: "night", label: "🌙 Good Night" },
                    { key: "welcome", label: "👑 Welcome Bonus" },
                    { key: "deposit", label: "💰 Deposit Approved" },
                    { key: "withdrawal", label: "💸 Withdrawal Processed" },
                  ].map((tpl) => (
                    <button
                      key={tpl.key}
                      type="button"
                      onClick={() => handleSelectTemplate(tpl.key)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                        selectedTemplateKey === tpl.key
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                      }`}
                    >
                      {tpl.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Audience */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Audience
                  </label>
                  <select
                    value={broadcastTarget}
                    onChange={(e: any) => setBroadcastTarget(e.target.value)}
                    className="w-full h-9 px-3 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200"
                  >
                    <option value="active">Active Players Only (Recommended)</option>
                    <option value="all">All Registered Players</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Dispatch Delay
                  </label>
                  <div className="h-9 px-3 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-300 flex items-center">
                    0.5s per message (Anti-Spam Safe)
                  </div>
                </div>
              </div>

              {/* Message Textarea */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Message Content
                  </label>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {broadcastText.length} characters
                  </span>
                </div>
                <textarea
                  rows={10}
                  value={broadcastText}
                  onChange={(e) => setBroadcastText(e.target.value)}
                  placeholder="Type your WhatsApp broadcast message here... (*bold*, _italic_, emojis supported)"
                  className="w-full p-3 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 font-mono leading-relaxed focus:border-emerald-500 focus:outline-none"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Formatting tip: wrap words in <code>*bold*</code> for bold, <code>_italics_</code> for italics, and paste links directly.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setBroadcastText("")}
                  className="text-xs"
                >
                  Clear Text
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleBroadcast}
                  disabled={broadcasting || !broadcastText.trim()}
                  className="font-bold flex items-center gap-2"
                >
                  {broadcasting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                      <span>Broadcasting...</span>
                    </>
                  ) : (
                    <>
                      <span>🚀</span>
                      <span>Broadcast to Players</span>
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </div>

          {/* Right Column: Live WhatsApp Mockup Preview */}
          <div className="lg:col-span-5">
            <div className="sticky top-6">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Live Player WhatsApp Preview
              </label>

              {/* Phone Frame */}
              <div className="rounded-2xl border-4 border-slate-800 bg-[#0b141a] overflow-hidden shadow-2xl">
                {/* WhatsApp Chat Header */}
                <div className="bg-[#202c33] px-3 py-2.5 flex items-center gap-3 border-b border-[#2a3942]">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-xs">
                    777
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-slate-100 flex items-center gap-1.5">
                      <span>DPSARA 777 Official</span>
                      <span className="text-[10px] text-emerald-400" title="Verified">✓</span>
                    </div>
                    <div className="text-[10px] text-emerald-400 font-normal">Online &bull; 24x7 Support</div>
                  </div>
                </div>

                {/* WhatsApp Chat Body */}
                <div
                  className="p-4 min-h-[360px] max-h-[500px] overflow-y-auto"
                  style={{
                    backgroundColor: "#0b141a",
                    backgroundImage: "radial-gradient(#1f2c34 1px, transparent 1px)",
                    backgroundSize: "20px 20px",
                  }}
                >
                  {/* Chat Bubble */}
                  <div className="flex justify-end">
                    <div className="max-w-[85%] bg-[#005c4b] text-[#e9edef] rounded-lg p-3 text-xs shadow-md relative leading-relaxed font-sans">
                      <div
                        dangerouslySetInnerHTML={{ __html: formatWhatsAppText(broadcastText) }}
                        className="space-y-1 break-words select-text"
                      />
                      <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-[#8696a0]">
                        <span>Just now</span>
                        <span className="text-sky-400 font-bold">✓✓</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* WhatsApp Chat Footer Mock */}
                <div className="bg-[#202c33] px-3 py-2 flex items-center gap-2 border-t border-[#2a3942]">
                  <div className="flex-1 bg-[#2a3942] rounded-full px-3 py-1.5 text-[11px] text-[#8696a0]">
                    Reply to DPSARA 777...
                  </div>
                  <div className="w-7 h-7 rounded-full bg-[#00a884] flex items-center justify-center text-white text-xs">
                    ➤
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
