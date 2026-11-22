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
  testBokapgConnection,
  testBulkpeConnection,
  distributeMassBonus,
  getDepositBonusSettings,
  updateDepositBonusSettings,
  getAutomatedNotificationsSettings,
  updateAutomatedNotificationsSettings,
  triggerMarketReminders,
  triggerRandomWinnerAlert,
  triggerInactiveNudge,
  getRealSpinProSettings,
  updateRealSpinProSettings,
  getBettingLimitsSettings,
  updateBettingLimitsSettings,
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

  // Betting Limits states
  const [minBetAmount, setMinBetAmount] = useState<string>("10");
  const [maxBetAmount, setMaxBetAmount] = useState<string>("100000");
  const [betLimitsSaving, setBetLimitsSaving] = useState(false);

  const [welcomeBonusEnabled, setWelcomeBonusEnabled] = useState(true);
  const [welcomeBonusAmount, setWelcomeBonusAmount] = useState("50");
  const [bonusSaving, setBonusSaving] = useState(false);

  // RealSpinPro Master Toggle states
  const [realspinproEnabled, setRealspinproEnabled] = useState(true);
  const [realspinproSaving, setRealspinproSaving] = useState(false);

  // Mass Bonus Distribution states
  const [massBonusAmount, setMassBonusAmount] = useState("50");
  const [massBonusTitle, setMassBonusTitle] = useState("🎁 You Have ₹50 Free Bonus in Your Wallet!");
  const [massBonusMessage, setMassBonusMessage] = useState(
    "Play your favorite games starting from just ₹1! All winnings you make from your bonus are 100% withdrawable to your bank account."
  );
  const [massBonusSending, setMassBonusSending] = useState(false);
  const [massBonusResult, setMassBonusResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [showBonusConfirmModal, setShowBonusConfirmModal] = useState(false);

  // Support Chat Intelligent Auto-Responder states
  const [supportBotEnabled, setSupportBotEnabled] = useState(true);
  const [supportBotSaving, setSupportBotSaving] = useState(false);

  // Deposit Bonus Tiers states
  const [depositBonusEnabled, setDepositBonusEnabled] = useState(true);
  const [depositTiers, setDepositTiers] = useState<Array<{ min_amount: number; bonus_percent: number; label: string }>>([
    { min_amount: 500, bonus_percent: 5, label: "5% Extra" },
    { min_amount: 1000, bonus_percent: 8, label: "8% Extra" },
    { min_amount: 2500, bonus_percent: 12, label: "12% Extra" },
  ]);
  const [depositBonusSaving, setDepositBonusSaving] = useState(false);

  // Strategic Automated Push Notifications states
  const [notifMarketRemindersEnabled, setNotifMarketRemindersEnabled] = useState(true);
  const [notifRandomWinnerEnabled, setNotifRandomWinnerEnabled] = useState(true);
  const [notifRandomWinnerMaxPerDay, setNotifRandomWinnerMaxPerDay] = useState("3");
  const [notifInactiveEnabled, setNotifInactiveEnabled] = useState(true);
  const [notifInactiveDays, setNotifInactiveDays] = useState("3");
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifTriggerLoading, setNotifTriggerLoading] = useState<string | null>(null);
  const [notifTriggerMsg, setNotifTriggerMsg] = useState<{ id: string; success: boolean; text: string } | null>(null);

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

  // Payment Gateway states (Default strictly Cashfree or Manual)
  const [activeGateway, setActiveGateway] = useState<"cashfree" | "bokapg" | "bulkpe" | "manual">("manual");
  const [minDepositAmount, setMinDepositAmount] = useState<number>(100);
  const [maxDepositAmount, setMaxDepositAmount] = useState<number>(1000);
  const [manualWhatsApp, setManualWhatsApp] = useState<string>("");
  const [bokapgApiKey, setBokapgApiKey] = useState<string>("");
  const [bulkpeApiKey, setBulkpeApiKey] = useState<string>("");
  const [gatewayInfo, setGatewayInfo] = useState<any>(null);
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

      const botSetting = data.find((s: any) => s.key === "support_bot_enabled");
      if (botSetting?.value !== undefined) {
        setSupportBotEnabled(botSetting.value !== "false" && botSetting.value !== "0");
      }

      // Load Betting Limits
      try {
        const betLimits = await getBettingLimitsSettings();
        if (betLimits) {
          if (betLimits.min_bet_amount !== undefined) {
            setMinBetAmount(String(betLimits.min_bet_amount));
          }
          if (betLimits.max_bet_amount !== undefined) {
            setMaxBetAmount(String(betLimits.max_bet_amount));
          }
          if (betLimits.min_deposit_amount !== undefined) {
            setMinDepositAmount(Number(betLimits.min_deposit_amount) || 100);
          }
          if (betLimits.max_deposit_amount !== undefined) {
            setMaxDepositAmount(Number(betLimits.max_deposit_amount) || 1000);
          }
        }
      } catch (err) {
        console.warn("Could not load betting limits:", err);
      }

      // Load RealSpinPro Settings
      try {
        const rsp = await getRealSpinProSettings();
        if (rsp && rsp.enabled !== undefined) {
          setRealspinproEnabled(rsp.enabled);
        }
      } catch (err) {
        console.warn("Could not load RealSpinPro settings:", err);
      }

      // Load Payment Gateway Selection
      try {
        const gw = await getPaymentGatewaySettings();
        setGatewayInfo(gw);
        if (gw.active_gateway) {
          setActiveGateway(gw.active_gateway as "cashfree" | "bokapg" | "bulkpe" | "manual");
        }
        if (gw.min_deposit_amount !== undefined) {
          setMinDepositAmount(Number(gw.min_deposit_amount) || 100);
        }
        if (gw.max_deposit_amount !== undefined) {
          setMaxDepositAmount(Number(gw.max_deposit_amount) || 1000);
        }
        if (gw.manual_whatsapp_number) {
          setManualWhatsApp(gw.manual_whatsapp_number);
        }
      } catch (err) {
        console.warn("Could not load gateway settings:", err);
      }

      // Load Deposit Bonus Settings
      try {
        const bonusData = await getDepositBonusSettings();
        if (bonusData) {
          if (bonusData.enabled !== undefined) {
            setDepositBonusEnabled(bonusData.enabled);
          }
          if (bonusData.tiers && Array.isArray(bonusData.tiers) && bonusData.tiers.length > 0) {
            setDepositTiers(bonusData.tiers);
          }
        }
      } catch (err) {
        console.warn("Could not load deposit bonus settings:", err);
      }

      // Load Automated Notifications Settings
      try {
        const notifData = await getAutomatedNotificationsSettings();
        if (notifData) {
          if (notifData.market_reminders_enabled !== undefined) {
            setNotifMarketRemindersEnabled(notifData.market_reminders_enabled);
          }
          if (notifData.random_winner_alerts_enabled !== undefined) {
            setNotifRandomWinnerEnabled(notifData.random_winner_alerts_enabled);
          }
          if (notifData.random_winner_max_per_day !== undefined) {
            setNotifRandomWinnerMaxPerDay(String(notifData.random_winner_max_per_day));
          }
          if (notifData.inactive_reengagement_enabled !== undefined) {
            setNotifInactiveEnabled(notifData.inactive_reengagement_enabled);
          }
          if (notifData.inactive_days !== undefined) {
            setNotifInactiveDays(String(notifData.inactive_days));
          }
        }
      } catch (err) {
        console.warn("Could not load automated notification settings:", err);
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

  async function submitBettingLimits(e: React.FormEvent) {
    e.preventDefault();
    setBetLimitsSaving(true);
    setError(null);
    setMsg(null);
    try {
      const minVal = parseFloat(minBetAmount);
      const maxVal = parseFloat(maxBetAmount);
      const minDepVal = Number(minDepositAmount) || 100;
      const maxDepVal = Number(maxDepositAmount) || 1000;
      if (isNaN(minVal) || minVal < 1) {
        setError("Minimum bet amount must be at least ₹1.");
        return;
      }
      if (isNaN(maxVal) || maxVal < minVal) {
        setError("Maximum bet amount must be greater than or equal to minimum bet amount.");
        return;
      }
      if (maxDepVal < minDepVal) {
        setError("Maximum deposit amount must be greater than or equal to minimum deposit amount.");
        return;
      }
      await updateBettingLimitsSettings({
        min_bet_amount: minVal,
        max_bet_amount: maxVal,
        min_deposit_amount: minDepVal,
        max_deposit_amount: maxDepVal,
      });
      setMsg(`Limits saved successfully! (Min Bet: ₹${minVal}, Max Bet: ₹${maxVal} | Min Deposit: ₹${minDepVal}, Max Deposit: ₹${maxDepVal})`);
      load();
    } catch (err: any) {
      setError(parseApiError(err, "Failed to save limits"));
    } finally {
      setBetLimitsSaving(false);
    }
  }

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
        "Welcome bonus amount credited to new user wallet (₹)"
      );
      setMsg("Registration Welcome Bonus settings saved successfully!");
      load();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to save bonus settings");
    } finally {
      setBonusSaving(false);
    }
  }

  async function handleToggleRealSpinPro(nextVal: boolean) {
    setRealspinproSaving(true);
    setError(null);
    setMsg(null);
    try {
      await updateRealSpinProSettings({ enabled: nextVal });
      setRealspinproEnabled(nextVal);
      setMsg(
        `RealSpinPro is now ${
          nextVal
            ? "ENABLED (Active on Mobile App & WebSocket Running)"
            : "DISABLED (Hidden on Mobile App & WebSocket Stopped)"
        }`
      );
    } catch (err: any) {
      setError(parseApiError(err));
    } finally {
      setRealspinproSaving(false);
    }
  }

  async function handleDistributeMassBonus() {
    setShowBonusConfirmModal(false);
    const amt = parseFloat(massBonusAmount);
    if (isNaN(amt) || amt <= 0) {
      setError("Please enter a valid bonus amount greater than zero.");
      return;
    }
    if (!massBonusMessage.trim()) {
      setError("Please write an announcement message for the bonus.");
      return;
    }

    setMassBonusSending(true);
    setMassBonusResult(null);
    setError(null);
    setMsg(null);

    try {
      const res = await distributeMassBonus({
        amount: amt,
        title: massBonusTitle.trim() || `🎁 You Have ₹${amt} Free Bonus in Your Wallet!`,
        message: massBonusMessage.trim(),
      });
      setMassBonusResult({
        success: true,
        message: res.message || `Successfully credited ₹${amt} bonus to ${res.users_credited} users!`,
      });
      setMsg(res.message);
      load();
    } catch (err: any) {
      const errorMsg = parseApiError(err, "Failed to distribute bonus to users");
      setMassBonusResult({
        success: false,
        message: errorMsg,
      });
      setError(errorMsg);
    } finally {
      setMassBonusSending(false);
    }
  }

  async function handleToggleSupportBot(enabled: boolean) {
    setSupportBotSaving(true);
    setError(null);
    setMsg(null);
    try {
      await updateSetting(
        "support_bot_enabled",
        enabled ? "true" : "false",
        "Intelligent Support Chat Auto-Responder (true/false)"
      );
      setSupportBotEnabled(enabled);
      setMsg(`Support Chat Intelligent Auto-Responder ${enabled ? "enabled" : "disabled"} successfully!`);
      load();
    } catch (err: any) {
      setError(parseApiError(err, "Failed to update support bot setting"));
    } finally {
      setSupportBotSaving(false);
    }
  }

  async function submitDepositBonusSettings(e: React.FormEvent) {
    e.preventDefault();
    setDepositBonusSaving(true);
    setError(null);
    setMsg(null);
    try {
      await updateDepositBonusSettings({
        enabled: depositBonusEnabled,
        tiers: depositTiers,
      });
      setMsg("Smart Deposit Bonus Tiers saved successfully!");
      load();
    } catch (err: any) {
      setError(parseApiError(err, "Failed to update deposit bonus settings"));
    } finally {
      setDepositBonusSaving(false);
    }
  }

  async function submitAutomatedNotifSettings(e: React.FormEvent) {
    e.preventDefault();
    setNotifSaving(true);
    setError(null);
    setMsg(null);
    try {
      await updateAutomatedNotificationsSettings({
        market_reminders_enabled: notifMarketRemindersEnabled,
        random_winner_alerts_enabled: notifRandomWinnerEnabled,
        random_winner_max_per_day: parseInt(notifRandomWinnerMaxPerDay, 10) || 3,
        inactive_reengagement_enabled: notifInactiveEnabled,
        inactive_days: parseInt(notifInactiveDays, 10) || 3,
      });
      setMsg("Automated Push Notification triggers updated successfully!");
      load();
    } catch (err: any) {
      setError(parseApiError(err, "Failed to update automated notification settings"));
    } finally {
      setNotifSaving(false);
    }
  }

  async function handleTriggerMarketPush() {
    setNotifTriggerLoading("market");
    setNotifTriggerMsg(null);
    try {
      const res = await triggerMarketReminders(true);
      setNotifTriggerMsg({
        id: "market",
        success: true,
        text: `Market reminder triggered successfully! (Status: ${res?.status || "sent"})`,
      });
    } catch (err: any) {
      setNotifTriggerMsg({
        id: "market",
        success: false,
        text: parseApiError(err, "Failed to trigger market reminder"),
      });
    } finally {
      setNotifTriggerLoading(null);
    }
  }

  async function handleTriggerWinnerPush() {
    setNotifTriggerLoading("winner");
    setNotifTriggerMsg(null);
    try {
      const res = await triggerRandomWinnerAlert(true);
      setNotifTriggerMsg({
        id: "winner",
        success: true,
        text: `Big winner alert push broadcasted successfully! (Status: ${res?.status || "sent"})`,
      });
    } catch (err: any) {
      setNotifTriggerMsg({
        id: "winner",
        success: false,
        text: parseApiError(err, "Failed to trigger winner alert"),
      });
    } finally {
      setNotifTriggerLoading(null);
    }
  }

  async function handleTriggerInactivePush() {
    setNotifTriggerLoading("inactive");
    setNotifTriggerMsg(null);
    try {
      const days = parseInt(notifInactiveDays, 10) || 3;
      const res = await triggerInactiveNudge(days, 50, true);
      setNotifTriggerMsg({
        id: "inactive",
        success: true,
        text: `Inactive user sweep finished! Sent: ${res?.sent_count ?? 0}, Found: ${res?.candidates_found ?? 0}`,
      });
    } catch (err: any) {
      setNotifTriggerMsg({
        id: "inactive",
        success: false,
        text: parseApiError(err, "Failed to trigger inactive nudge sweep"),
      });
    } finally {
      setNotifTriggerLoading(null);
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
      await updatePaymentGatewaySettings({
        active_gateway: activeGateway,
        min_deposit_amount: minDepositAmount,
        max_deposit_amount: maxDepositAmount,
        manual_whatsapp_number: manualWhatsApp,
        ...(bokapgApiKey ? { bokapg_api_key: bokapgApiKey } : {}),
        ...(bulkpeApiKey ? { bulkpe_api_key: bulkpeApiKey } : {}),
      });
      setMsg(
        `Active payment gateway successfully switched to: ${
          activeGateway === "manual"
            ? "💬 Direct WhatsApp Admin Deposit (Manual)"
            : activeGateway === "cashfree"
            ? "💳 Cashfree PG"
            : activeGateway === "bokapg"
            ? "🌐 BokaPG (Web Checkout - PayFromUPI)"
            : "🚀 BulkPe (Payment Gateway)"
        }!`
      );
      load();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to update payment gateway");
    } finally {
      setGatewaySaving(false);
    }
  }

  async function handleTestBokapg() {
    setTestRunning(true);
    setTestResult(null);
    try {
      const res = await testBokapgConnection();
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.response?.data?.detail || "Failed to test BokaPG connection",
      });
    } finally {
      setTestRunning(false);
    }
  }

  async function handleTestBulkpe() {
    setTestRunning(true);
    setTestResult(null);
    try {
      const res = await testBulkpeConnection();
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.response?.data?.detail || "Failed to test BulkPe connection",
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
      setError(err?.response?.data?.detail || "Failed to send notification to user");
    } finally {
      setUserNotifSending(false);
    }
  }

  function openEdit(s: any) {
    setEditSetting(s);
    setEditValue(s.value || "");
    setEditDesc(s.description || "");
  }

  function openCreate() {
    setEditSetting({ key: "", value: "", description: "", isNew: true });
    setEditValue("");
    setEditDesc("");
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Settings & Configurations"
        description="Manage payment gateways, user bonuses, intelligent support bot, contact numbers and app parameters."
      />

      {error && <ErrorMsg message={error} onDismiss={() => setError(null)} />}
      {msg && (
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4 text-emerald-600 dark:text-emerald-400 text-sm font-semibold flex items-center justify-between">
          <span>✓ {msg}</span>
          <button onClick={() => setMsg(null)} className="text-emerald-500 hover:text-emerald-600 font-bold ml-4">
            ✕
          </button>
        </div>
      )}

      {/* 0. Betting & Deposit Limits Configuration */}
      <Card
        title="🎲 Betting & Deposit Limits Configuration (Min & Max Limits)"
        subtitle="Set the minimum and maximum bidding limits allowed per bet across all games, and configure minimum and maximum deposit limits for the mobile Add Cash screen. Changes take effect instantly across the mobile app and server."
      >
        <form onSubmit={submitBettingLimits} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Minimum Bet Amount */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/70 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  Minimum Bet Amount (₹)
                </span>
                <Badge color="emerald">Current Min Bet: ₹{minBetAmount}</Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                The minimum points/amount a player must bet on any single number.
              </p>
              <Input
                type="number"
                min="1"
                step="1"
                value={minBetAmount}
                onChange={(e) => setMinBetAmount(e.target.value)}
                placeholder="e.g. 10"
                required
              />
              <div className="flex flex-wrap gap-2 pt-1">
                {[1, 5, 10, 20, 50, 100].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setMinBetAmount(String(amt))}
                    className={cn(
                      "px-2.5 py-1 text-xs rounded-lg border font-medium transition-all",
                      minBetAmount === String(amt)
                        ? "bg-emerald-500 text-white border-emerald-500 shadow-sm"
                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-400"
                    )}
                  >
                    ₹{amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Maximum Bet Amount */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/70 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  Maximum Bet Amount (₹)
                </span>
                <Badge color="blue">
                  Current Max Bet: ₹{Number(maxBetAmount).toLocaleString("en-IN")}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                The maximum points/amount allowed per bet or market.
              </p>
              <Input
                type="number"
                min="1"
                step="1"
                value={maxBetAmount}
                onChange={(e) => setMaxBetAmount(e.target.value)}
                placeholder="e.g. 100000"
                required
              />
              <div className="flex flex-wrap gap-2 pt-1">
                {[1000, 5000, 10000, 50000, 100000, 1000000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setMaxBetAmount(String(amt))}
                    className={cn(
                      "px-2.5 py-1 text-xs rounded-lg border font-medium transition-all",
                      maxBetAmount === String(amt)
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400"
                    )}
                  >
                    ₹{amt >= 100000 ? `${amt / 100000} Lakh` : `${amt >= 1000 ? `${amt / 1000}k` : amt}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Minimum Deposit Amount */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/70 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  Minimum Deposit (Add Cash) (₹)
                </span>
                <Badge color="emerald">Current Min: ₹{minDepositAmount}</Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Minimum funds a player can add. Below this, Add Cash button is disabled on mobile.
              </p>
              <Input
                type="number"
                min="1"
                step="1"
                value={String(minDepositAmount)}
                onChange={(e) => setMinDepositAmount(Math.max(1, Number(e.target.value) || 1))}
                placeholder="e.g. 100"
                required
              />
              <div className="flex flex-wrap gap-2 pt-1">
                {[100, 200, 300, 500].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setMinDepositAmount(amt)}
                    className={cn(
                      "px-2.5 py-1 text-xs rounded-lg border font-medium transition-all",
                      minDepositAmount === amt
                        ? "bg-emerald-500 text-white border-emerald-500 shadow-sm"
                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-400"
                    )}
                  >
                    ₹{amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Maximum Deposit Amount */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/70 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  Maximum Deposit (Add Cash) (₹)
                </span>
                <Badge color="blue">
                  Current Max: ₹{Number(maxDepositAmount).toLocaleString("en-IN")}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Maximum funds allowed per deposit transaction. Entering more will not activate Add Cash.
              </p>
              <Input
                type="number"
                min="1"
                step="1"
                value={String(maxDepositAmount)}
                onChange={(e) => setMaxDepositAmount(Math.max(1, Number(e.target.value) || 1))}
                placeholder="e.g. 1000"
                required
              />
              <div className="flex flex-wrap gap-2 pt-1">
                {[500, 1000, 2000, 5000, 10000, 50000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setMaxDepositAmount(amt)}
                    className={cn(
                      "px-2.5 py-1 text-xs rounded-lg border font-medium transition-all",
                      maxDepositAmount === amt
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400"
                    )}
                  >
                    ₹{amt >= 1000 ? `${amt / 1000}k` : amt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={betLimitsSaving}
              className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold shadow-md"
            >
              {betLimitsSaving ? "Saving..." : "Save Limits"}
            </Button>
          </div>
        </form>
      </Card>

      {/* 1. Deposit Payment Gateway Switcher */}
      <Card
        title="💳 Deposit Payment Gateway"
        subtitle="Choose how players add funds: Direct WhatsApp Admin Support, Cashfree PG, BokaPG (PayFromUPI), or BulkPe. Configure minimum deposit and WhatsApp contact."
      >
        <form onSubmit={submitGatewaySettings} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Active Deposit Gateway
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Option 1: Manual WhatsApp Deposit */}
              <div
                onClick={() => setActiveGateway("manual")}
                className={cn(
                  "cursor-pointer rounded-2xl border-2 p-5 transition-all duration-200 relative overflow-hidden",
                  activeGateway === "manual"
                    ? "border-emerald-500 bg-emerald-500/10 shadow-sm"
                    : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 hover:border-slate-300 dark:hover:border-slate-700"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">💬</span>
                    <div>
                      <span className="font-bold text-slate-900 dark:text-slate-100 block">WhatsApp Support</span>
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Direct Admin Deposit</span>
                    </div>
                  </div>
                  <Badge color={activeGateway === "manual" ? "emerald" : "slate"}>
                    {activeGateway === "manual" ? "ACTIVE" : "STANDBY"}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-2">
                  When user taps Add Cash, a beautiful modal opens with user details &amp; amount, and opens WhatsApp directly to pay admin manually via QR/UPI.
                </p>
                <div className="mt-3 flex items-center justify-between text-[11px]">
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    ✓ 100% Safe • No Gateway Rejections
                  </span>
                </div>
              </div>

              {/* Option 2: Cashfree PG */}
              <div
                onClick={() => setActiveGateway("cashfree")}
                className={cn(
                  "cursor-pointer rounded-2xl border-2 p-5 transition-all duration-200 relative overflow-hidden",
                  activeGateway === "cashfree"
                    ? "border-brand-500 bg-brand-500/10 shadow-sm"
                    : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 hover:border-slate-300 dark:hover:border-slate-700"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">💳</span>
                    <div>
                      <span className="font-bold text-slate-900 dark:text-slate-100 block">Cashfree PG</span>
                      <span className="text-[11px] text-slate-500 font-medium">Automated Web Checkout</span>
                    </div>
                  </div>
                  <Badge color={activeGateway === "cashfree" ? "emerald" : "slate"}>
                    {activeGateway === "cashfree" ? "ACTIVE" : "STANDBY"}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-2">
                  Standard checkout flow supporting UPI, Cards, Netbanking, Wallets and Cashfree payment page.
                </p>
                <div className="mt-3 flex items-center justify-between text-[11px]">
                  <span className={gatewayInfo?.cashfree?.configured ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-amber-500 font-medium"}>
                    {gatewayInfo?.cashfree?.configured ? `✓ Ready (${gatewayInfo.cashfree.env || "Production"})` : "⚠️ Credentials not set in .env"}
                  </span>
                </div>
              </div>

              {/* Option 3: BulkPe PG */}
              <div
                onClick={() => setActiveGateway("bulkpe")}
                className={cn(
                  "cursor-pointer rounded-2xl border-2 p-5 transition-all duration-200 relative overflow-hidden",
                  activeGateway === "bulkpe"
                    ? "border-brand-500 bg-brand-500/10 shadow-sm"
                    : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 hover:border-slate-300 dark:hover:border-slate-700"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🚀</span>
                    <div>
                      <span className="font-bold text-slate-900 dark:text-slate-100 block">BulkPe</span>
                      <span className="text-[11px] text-slate-500 font-medium">PG Collection &amp; UPI</span>
                    </div>
                  </div>
                  <Badge color={activeGateway === "bulkpe" ? "emerald" : "slate"}>
                    {activeGateway === "bulkpe" ? "ACTIVE" : "STANDBY"}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-2">
                  Hosted Payment Gateway collection powered by BulkPe. Generates checkout links supporting UPI, Cards, Net Banking &amp; Wallets.
                </p>
                <div className="mt-3 flex items-center justify-between text-[11px]">
                  <span className={gatewayInfo?.bulkpe?.configured ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-amber-500 font-medium"}>
                    {gatewayInfo?.bulkpe?.configured ? `✓ Configured (${gatewayInfo.bulkpe.masked_api_key || "Ready"})` : "⚠️ API Key not configured"}
                  </span>
                </div>
              </div>

              {/* Option 4: BokaPG (Web Checkout) */}
              <div
                onClick={() => setActiveGateway("bokapg")}
                className={cn(
                  "cursor-pointer rounded-2xl border-2 p-5 transition-all duration-200 relative overflow-hidden opacity-75",
                  activeGateway === "bokapg"
                    ? "border-brand-500 bg-brand-500/10 shadow-sm opacity-100"
                    : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 hover:border-slate-300 dark:hover:border-slate-700"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🌐</span>
                    <div>
                      <span className="font-bold text-slate-900 dark:text-slate-100 block">
                        BokaPG (PayFromUPI)
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium">
                        Instant Web Checkout
                      </span>
                    </div>
                  </div>
                  <Badge color={activeGateway === "bokapg" ? "emerald" : "slate"}>
                    {activeGateway === "bokapg" ? "ACTIVE" : "STANDBY"}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-2">
                  Web-based checkout payment gateway powered by PayFromUPI. Generates dynamic checkout links with automated verification.
                </p>
                <div className="mt-3 flex items-center justify-between text-[11px]">
                  <span className={gatewayInfo?.bokapg?.configured ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-amber-500 font-medium"}>
                    {gatewayInfo?.bokapg?.configured ? `✓ Configured (${gatewayInfo.bokapg.masked_api_key || "Ready"})` : "⚠️ API Key not configured"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Deposit Limit & Contact Configuration */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Minimum Deposit Amount (₹)
              </label>
              <input
                type="number"
                min="1"
                value={minDepositAmount}
                onChange={(e) => setMinDepositAmount(Math.max(1, Number(e.target.value) || 1))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="e.g. 100"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Players cannot deposit less than this amount in the mobile app.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Maximum Deposit Amount (₹)
              </label>
              <input
                type="number"
                min="1"
                value={maxDepositAmount}
                onChange={(e) => setMaxDepositAmount(Math.max(1, Number(e.target.value) || 1))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="e.g. 1000"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Players cannot deposit more than this amount. Higher amounts will disable Add Cash.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Admin WhatsApp Number (For Manual Payment)
              </label>
              <input
                type="text"
                value={manualWhatsApp}
                onChange={(e) => setManualWhatsApp(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="+91 95918 69306"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Mobile app will redirect payment requests to this WhatsApp number.
              </p>
            </div>

            {activeGateway === "bulkpe" && (
              <div className="sm:col-span-2 pt-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  BulkPe API Key (Bearer Token)
                </label>
                <input
                  type="text"
                  value={bulkpeApiKey}
                  onChange={(e) => setBulkpeApiKey(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder={gatewayInfo?.bulkpe?.masked_api_key ? `Current: ${gatewayInfo.bulkpe.masked_api_key}` : "e.g. your_bulkpe_api_key from Developer Controls"}
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  API Key from BulkPe Dashboard (Settings &gt; Developer Controls). Ensure your server IP is whitelisted.
                </p>
              </div>
            )}

            {activeGateway === "bokapg" && (
              <div className="sm:col-span-2 pt-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  BokaPG API Key (Bearer Token)
                </label>
                <input
                  type="text"
                  value={bokapgApiKey}
                  onChange={(e) => setBokapgApiKey(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder={gatewayInfo?.bokapg?.masked_api_key ? `Current: ${gatewayInfo.bokapg.masked_api_key}` : "e.g. 60|HSRUrRh32fE6M3BDFnbzSQQMSLVtOf5lMnbHS9taaa89403f"}
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Bearer API token from payfromupi.com. Leave empty to keep currently active token.
                </p>
              </div>
            )}
          </div>

          {/* Gateway Connectivity & Testing */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🔌</span>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Gateway Connectivity Diagnostics
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                  Verify API authentication and responsiveness for active payment gateways.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTestBulkpe}
                disabled={testRunning}
                className="shrink-0 text-xs"
              >
                {testRunning ? "Testing..." : "Test BulkPe"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTestBokapg}
                disabled={testRunning}
                className="shrink-0 text-xs"
              >
                {testRunning ? "Testing..." : "Test BokaPG"}
              </Button>
            </div>
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

          <div className="flex justify-end">
            <Button type="submit" disabled={gatewaySaving} className="w-full sm:w-auto">
              {gatewaySaving ? "Saving..." : "Save Active Gateway"}
            </Button>
          </div>
        </form>
      </Card>

      {/* 2. Distribute Bonus to All Users (Popup + Push Notification) */}
      <Card
        title="🎁 Distribute Bonus to All Users (Popup + Push Notification)"
        subtitle="Credit free bonus amount to all active users with a custom announcement message. Users receive an instant push notification and a golden popup modal upon opening the mobile app."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setShowBonusConfirmModal(true);
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Bonus Amount (₹)
              </label>
              <Input
                type="number"
                min="1"
                step="1"
                value={massBonusAmount}
                onChange={(e) => {
                  setMassBonusAmount(e.target.value);
                  setMassBonusTitle(`🎁 You Have ₹${e.target.value || 0} Free Bonus in Your Wallet!`);
                }}
                placeholder="50"
                required
              />
              <p className="text-[11px] text-slate-500 mt-1">Amount to add to each user wallet.</p>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Push & Popup Title
              </label>
              <Input
                value={massBonusTitle}
                onChange={(e) => setMassBonusTitle(e.target.value)}
                placeholder="🎁 You Have ₹50 Free Bonus in Your Wallet!"
                required
              />
              <p className="text-[11px] text-slate-500 mt-1">Heading for push notification and in-app popup modal.</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Bonus Message / Announcement
            </label>
            <Textarea
              rows={3}
              value={massBonusMessage}
              onChange={(e) => setMassBonusMessage(e.target.value)}
              placeholder="e.g. Play your favorite games starting from just ₹1! All winnings you make from your bonus are 100% withdrawable to your bank account."
              required
            />
            <p className="text-[11px] text-slate-500 mt-1">
              This message will be sent via push notification and displayed in the popup when users open the app.
            </p>
          </div>

          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-400 space-y-1">
            <p className="font-semibold flex items-center gap-1.5">
              <span>💡</span> Intelligent Bonus Rules:
            </p>
            <p>
              • Bonus amount is directly credited to each active user&apos;s wallet balance.
              <br />
              • Users cannot withdraw the bonus amount directly; it is intelligently excluded from withdrawals until wagered.
              <br />
              • All winnings made from playing with bonus are 100% withdrawable to user bank accounts!
            </p>
          </div>

          {massBonusResult && (
            <div
              className={cn(
                "p-3 rounded-xl text-xs font-medium border",
                massBonusResult.success
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
              )}
            >
              {massBonusResult.success ? "✓ " : "✗ "}
              {massBonusResult.message}
            </div>
          )}

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={massBonusSending || !massBonusAmount || !massBonusMessage}
              className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold"
            >
              {massBonusSending ? "Distributing Bonus..." : `🚀 Distribute ₹${massBonusAmount || 0} Bonus to All Users`}
            </Button>
          </div>
        </form>
      </Card>

      {/* 3. Intelligent Support Chat Auto-Responder */}
      <Card
        title="🤖 Intelligent Support Chat Auto-Responder"
        subtitle="24/7 AI-assisted auto-reply service in Hindi, English, and Hinglish. Automatically looks up live pending deposits, withdrawals, bonus balance, and game rates."
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 dark:text-slate-100">
                Support Auto-Responder Status
              </span>
              <Badge color={supportBotEnabled ? "emerald" : "rose"}>
                {supportBotEnabled ? "ACTIVE (AUTO-REPLY ON)" : "DISABLED (MANUAL ONLY)"}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              When active, players asking about deposits, withdrawals, UTRs, bonus rules, or game rates receive instantaneous intelligent responses matching their live account status.
            </p>
          </div>
          <Button
            type="button"
            variant={supportBotEnabled ? "destructive" : "default"}
            disabled={supportBotSaving}
            onClick={() => handleToggleSupportBot(!supportBotEnabled)}
            className="shrink-0"
          >
            {supportBotSaving
              ? "Updating..."
              : supportBotEnabled
              ? "Disable Auto-Responder"
              : "Enable Auto-Responder"}
          </Button>
        </div>
      </Card>

      {/* 4. Registration Welcome Bonus (New User Signups) */}
      <Card
        title="🎁 Registration Welcome Bonus (New Users)"
        subtitle="Automatically add free cash bonus directly into newly registered user wallets on first signup."
      >
        <form onSubmit={submitWelcomeBonus} className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50">
            <div>
              <span className="font-bold text-slate-900 dark:text-slate-100 block">Welcome Bonus Status</span>
              <span className="text-xs text-slate-500">
                If enabled, new users instantly receive free bonus upon signup and view the popup on opening the app.
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={welcomeBonusEnabled}
              onClick={() => setWelcomeBonusEnabled(!welcomeBonusEnabled)}
              className={cn(
                "relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                welcomeBonusEnabled ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
              )}
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
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Registration Bonus Amount (₹)
              </label>
              <Input
                type="number"
                min="0"
                step="1"
                value={welcomeBonusAmount}
                onChange={(e) => setWelcomeBonusAmount(e.target.value)}
                placeholder="50"
                required
              />
              <p className="text-[11px] text-slate-500 mt-1">Default is ₹50 credited on first registration.</p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={bonusSaving} className="w-full sm:w-auto">
              {bonusSaving ? "Saving..." : "Save Welcome Bonus Settings"}
            </Button>
          </div>
        </form>
      </Card>

      {/* RealSpinPro Game Master Controls */}
      <Card
        title="🎡 RealSpinPro Spinning Game Master Switch"
        subtitle="Control mobile visibility, live WebSocket connections, and real-time round settlement for the spinning wheel game."
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  RealSpinPro Game Status
                </span>
                <Badge color={realspinproEnabled ? "emerald" : "rose"}>
                  {realspinproEnabled ? "LIVE ON MOBILE" : "DISABLED"}
                </Badge>
                <Badge color={realspinproEnabled ? "amber" : "slate"}>
                  {realspinproEnabled ? "⚡ WebSocket Active" : "🔌 WebSocket Stopped"}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-xl">
                When enabled, the rotating RealSpinPro wheel is shown to logged-in mobile players right bottom above Support. When disabled, the game icon is hidden and WebSocket connections are stopped.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={realspinproEnabled}
              disabled={realspinproSaving}
              onClick={() => handleToggleRealSpinPro(!realspinproEnabled)}
              className={cn(
                "relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                realspinproEnabled ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700",
                realspinproSaving && "opacity-60 cursor-not-allowed"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
                  realspinproEnabled ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
          </div>

          <div className="flex justify-end pt-2">
            <a
              href="/ouradminportal/realspinpro"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 transition-colors shadow-sm"
            >
              Configure Margins, Multipliers & Live Rounds →
            </a>
          </div>
        </div>
      </Card>

      {/* 5. Smart Deposit Tiers & Extra Cash Bonus */}
      <Card
        title="🎁 Smart Deposit Tiers & Extra Cash Bonus (Increases Average Deposit Size)"
        subtitle="Reward players with extra game bonus credits when depositing higher amounts. Users feel they get free money to play, directly shifting them from depositing ₹300 up to ₹1,000+."
      >
        <form onSubmit={submitDepositBonusSettings} className="space-y-5">
          <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 dark:text-slate-100">Deposit Bonus Tiers Status</span>
                <Badge color={depositBonusEnabled ? "emerald" : "rose"}>
                  {depositBonusEnabled ? "ACTIVE (BONUS ON)" : "DISABLED"}
                </Badge>
              </div>
              <span className="text-xs text-slate-500">
                When enabled, deposit bonus badges appear on quick amount buttons in the mobile app, and bonus is credited automatically upon payment.
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={depositBonusEnabled}
              onClick={() => setDepositBonusEnabled(!depositBonusEnabled)}
              className={cn(
                "relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                depositBonusEnabled ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
                  depositBonusEnabled ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Configured Deposit Bonus Tiers
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {depositTiers.map((tier, idx) => {
                const bonusAmt = Math.round((tier.min_amount * tier.bonus_percent) / 100);
                const totalAmt = tier.min_amount + bonusAmt;
                return (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/10 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-amber-900 dark:text-amber-300">
                        Tier {idx + 1}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-200 font-bold">
                        +{tier.bonus_percent}% Bonus
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Min Amount (₹)
                        </label>
                        <Input
                          type="number"
                          min="100"
                          step="100"
                          value={tier.min_amount}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            const next = [...depositTiers];
                            next[idx] = { ...next[idx], min_amount: val };
                            setDepositTiers(next);
                          }}
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Extra Bonus (%)
                        </label>
                        <Input
                          type="number"
                          min="1"
                          max="50"
                          step="1"
                          value={tier.bonus_percent}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            const next = [...depositTiers];
                            next[idx] = { ...next[idx], bonus_percent: val, label: `${val}% Extra` };
                            setDepositTiers(next);
                          }}
                        />
                      </div>
                    </div>

                    <div className="pt-2 border-t border-amber-500/20 text-[11.5px] text-amber-800 dark:text-amber-300 font-medium">
                      Deposit ₹{tier.min_amount.toLocaleString("en-IN")} → Player gets{" "}
                      <span className="font-bold">₹{totalAmt.toLocaleString("en-IN")}</span> (+₹{bonusAmt} bonus)
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={depositBonusSaving}
              className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold"
            >
              {depositBonusSaving ? "Saving..." : "Save Deposit Bonus Tiers"}
            </Button>
          </div>
        </form>
      </Card>

      {/* 6. Strategic Timed Push Notifications */}
      <Card
        title="🚀 Strategic Timed Push Notifications (Reactivates Dormant Users & Drives Bets)"
        subtitle="Automated high-converting push notifications triggered at optimal impulse moments to maximize daily active players and last-minute market bidding."
      >
        <form onSubmit={submitAutomatedNotifSettings} className="space-y-6">
          {notifTriggerMsg && (
            <div
              className={cn(
                "p-3 rounded-xl text-xs font-medium border",
                notifTriggerMsg.success
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
              )}
            >
              {notifTriggerMsg.success ? "✓ " : "✗ "}
              {notifTriggerMsg.text}
            </div>
          )}

          {/* Trigger 1: 15 Mins Market Open/Close Countdown */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                    ⏳ 15 Mins Market Open/Close Countdown (Kalyan & Major Markets)
                  </span>
                  <Badge color={notifMarketRemindersEnabled ? "emerald" : "rose"}>
                    {notifMarketRemindersEnabled ? "AUTOMATED (ON)" : "DISABLED"}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Fires automatically ~15 minutes before open & close sessions (e.g. 1:30 PM & 9:00 PM for Kalyan).
                  Creates high urgency (FOMO): &quot;⏳ Kalyan Open closes in 15 minutes! Place your Jodi &amp; Panna now before rates lock.&quot;
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  disabled={notifTriggerLoading === "market"}
                  onClick={handleTriggerMarketPush}
                  className="text-xs"
                >
                  {notifTriggerLoading === "market" ? "Sending..." : "🚀 Test Market Push"}
                </Button>

                <button
                  type="button"
                  role="switch"
                  aria-checked={notifMarketRemindersEnabled}
                  onClick={() => setNotifMarketRemindersEnabled(!notifMarketRemindersEnabled)}
                  className={cn(
                    "relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                    notifMarketRemindersEnabled ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
                      notifMarketRemindersEnabled ? "translate-x-5" : "translate-x-0"
                    )}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Trigger 2: Big Win & Social Proof Alerts */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                    🎉 Big Win &amp; Social Proof Alerts (After Big Results)
                  </span>
                  <Badge color={notifRandomWinnerEnabled ? "emerald" : "rose"}>
                    {notifRandomWinnerEnabled ? "AUTOMATED (ON)" : "DISABLED"}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Broadcasts recent winner excitement: &quot;🎉 Big Win Alert! Player 98****32 just won ₹45,000 on Milan Night! Today could be your lucky day.&quot;
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  disabled={notifTriggerLoading === "winner"}
                  onClick={handleTriggerWinnerPush}
                  className="text-xs"
                >
                  {notifTriggerLoading === "winner" ? "Broadcasting..." : "🎉 Broadcast Winner Push"}
                </Button>

                <button
                  type="button"
                  role="switch"
                  aria-checked={notifRandomWinnerEnabled}
                  onClick={() => setNotifRandomWinnerEnabled(!notifRandomWinnerEnabled)}
                  className={cn(
                    "relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                    notifRandomWinnerEnabled ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
                      notifRandomWinnerEnabled ? "translate-x-5" : "translate-x-0"
                    )}
                  />
                </button>
              </div>
            </div>

            <div className="w-48 pt-2">
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Max Winner Broadcasts Per Day
              </label>
              <Input
                type="number"
                min="1"
                max="10"
                value={notifRandomWinnerMaxPerDay}
                onChange={(e) => setNotifRandomWinnerMaxPerDay(e.target.value)}
              />
            </div>
          </div>

          {/* Trigger 3: Inactive User Reactivation */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                    👋 Inactive User Reactivation (Dormant Users 3+ Days)
                  </span>
                  <Badge color={notifInactiveEnabled ? "emerald" : "rose"}>
                    {notifInactiveEnabled ? "AUTOMATED (DAILY SWEEP)" : "DISABLED"}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Automatically finds active devices that have not placed a bet in 3+ days and sends:
                  &quot;👋 We miss you! ₹50 Bonus credited on your next deposit. Valid till midnight today!&quot;
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  disabled={notifTriggerLoading === "inactive"}
                  onClick={handleTriggerInactivePush}
                  className="text-xs"
                >
                  {notifTriggerLoading === "inactive" ? "Sweeping..." : "👋 Trigger Inactive Sweep"}
                </Button>

                <button
                  type="button"
                  role="switch"
                  aria-checked={notifInactiveEnabled}
                  onClick={() => setNotifInactiveEnabled(!notifInactiveEnabled)}
                  className={cn(
                    "relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                    notifInactiveEnabled ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
                      notifInactiveEnabled ? "translate-x-5" : "translate-x-0"
                    )}
                  />
                </button>
              </div>
            </div>

            <div className="w-48 pt-2">
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Inactive Days Threshold
              </label>
              <Input
                type="number"
                min="1"
                max="30"
                value={notifInactiveDays}
                onChange={(e) => setNotifInactiveDays(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={notifSaving}
              className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold"
            >
              {notifSaving ? "Saving..." : "Save Automated Notification Triggers"}
            </Button>
          </div>
        </form>
      </Card>

      {/* 5. Support Contact Numbers */}
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

      {/* 6. Settings Key-Value Table */}
      <Card 
        title={`${settings.length} System Settings`} 
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

      {/* 7. Broadcast Notification */}
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

      {/* 8. Send Notification to User */}
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

      {/* Edit Setting Modal */}
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

      {/* Confirmation Modal for Mass Bonus Distribution */}
      <Modal
        open={showBonusConfirmModal}
        onClose={() => setShowBonusConfirmModal(false)}
        title="Confirm Bonus Distribution to All Users"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Are you sure you want to distribute <strong>₹{massBonusAmount}</strong> bonus to <strong>ALL active users</strong>?
          </p>
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3 text-xs space-y-1.5 border border-slate-200 dark:border-slate-700">
            <div>
              <span className="font-semibold text-slate-700 dark:text-slate-300">Popup & Push Title:</span>{" "}
              {massBonusTitle}
            </div>
            <div>
              <span className="font-semibold text-slate-700 dark:text-slate-300">Message:</span>{" "}
              {massBonusMessage}
            </div>
            <div className="text-amber-600 dark:text-amber-400 font-medium pt-1">
              ⚡ This will credit wallets immediately, send push notifications, and show an in-app popup modal upon opening the app.
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowBonusConfirmModal(false)}>
              Cancel
            </Button>
            <Button
              disabled={massBonusSending}
              onClick={handleDistributeMassBonus}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
            >
              {massBonusSending ? "Distributing..." : "Yes, Distribute to All"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
