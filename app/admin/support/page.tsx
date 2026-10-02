"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Card,
  Button,
  Badge,
  Spinner,
  ErrorMsg,
  Input,
  Textarea,
  Select,
  PageHeader,
} from "@/components/ui";
import {
  listSupportConversations,
  getSupportConversation,
  sendSupportMessage,
  setSupportStatus,
  getSupportStats,
} from "@/lib/admin";
import { parseApiError } from "@/lib/error-parser";

const CATEGORY_LABELS: Record<string, string> = {
  payment: "Payment / Deposit",
  withdrawal: "Withdrawal",
  login: "Login / Account",
  bet: "Bet / Game",
  result: "Result Discrepancy",
  other: "Other",
};

function categoryLabel(key?: string) {
  if (!key) return "Other";
  return CATEGORY_LABELS[key] ?? key;
}

function formatDate(raw?: string) {
  if (!raw) return "";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

import { API_BASE } from "@/lib/config";

function attachmentSrc(url?: string) {
  if (!url) return "";
  if (url.startsWith("http")) return url;

  let base = API_BASE || "";
  if (base.endsWith("/api")) {
    base = base.substring(0, base.length - 4);
  } else if (base.endsWith("/api/")) {
    base = base.substring(0, base.length - 5);
  }

  if (base && !base.startsWith("/")) {
    return base + url;
  }

  if (typeof window !== "undefined") {
    return window.location.origin + base + url;
  }
  return url;
}

// Client-side message sanitization - strips HTML, URLs, and event handlers
function sanitizeMessage(text: string): string {
  // Strip ALL HTML tags
  let result = text.replace(/<[^>]+>/g, "");
  // Strip javascript: and data: URLs
  result = result.replace(/\b(?:javascript|data):\S+/gi, "[link removed]");
  // Strip all http/https/ww URLs
  result = result.replace(/\b(?:https?:\/\/|www\.)\S+\b/gi, "[link removed]");
  // Remove remaining < or > characters
  result = result.replace(/[<>]/g, "");
  // Remove on* event handlers
  result = result.replace(/\bon\w+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/g, "");
  // Normalize whitespace
  result = result.replace(/\s+/g, " ").trim();
  return result;
}

export default function SupportPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [thread, setThread] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);

  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [reply, setReply] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadConversations = useCallback(async () => {
    try {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      if (search.trim()) params.search = search.trim();
      const data = await listSupportConversations(params);
      setConversations(data.conversations ?? []);
    } catch (e: any) {
      setError(parseApiError(e, "Failed to load conversations"));
    }
  }, [statusFilter, search]);

  const loadStats = useCallback(async () => {
    try {
      const data = await getSupportStats();
      setStats(data);
    } catch {
      /* ignore */
    }
  }, []);

  const loadThread = useCallback(async (id: number, scroll = true) => {
    try {
      const data = await getSupportConversation(id);
      setThread(data.conversation);
      setMessages(data.conversation?.messages ?? []);
      if (scroll && scrollRef.current) {
        setTimeout(
          () => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }),
          50
        );
      }
    } catch (e: any) {
      setError(parseApiError(e, "Failed to load conversation"));
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadConversations(), loadStats()]).finally(() =>
      setLoading(false)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, search]);

  // Live polling for new messages / new conversations.
  useEffect(() => {
    const interval = setInterval(() => {
      loadConversations();
      loadStats();
      if (selectedId != null) loadThread(selectedId, false);
    }, 6000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, statusFilter, search]);

  async function handleSelect(id: number) {
    setSelectedId(id);
    setReply("");
    setFile(null);
    await loadThread(id);
  }

  async function handleSend() {
    if (selectedId == null) return;
    if (!reply.trim() && !file) return;
    
    // Sanitize the message client-side before sending
    const sanitizedReply = sanitizeMessage(reply);
    
    setSending(true);
    setError(null);
    try {
      await sendSupportMessage(selectedId, sanitizedReply, file);
      setReply("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await loadThread(selectedId);
      await loadConversations();
    } catch (e: any) {
      setError(parseApiError(e, "Failed to send reply"));
    } finally {
      setSending(false);
    }
  }

  async function handleStatusChange(next: string) {
    if (selectedId == null) return;
    setChangingStatus(true);
    try {
      await setSupportStatus(selectedId, next);
      await loadThread(selectedId);
      await loadConversations();
    } catch (e: any) {
      setError(parseApiError(e, "Failed to update status"));
    } finally {
      setChangingStatus(false);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Support Chat"
        description="Reply to users and manage support conversations"
      />

      <ErrorMsg msg={error} />

      {stats && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Stat label="Total Conversations" value={stats.total_conversations} />
          <Stat label="Open" value={stats.open_conversations} accent="amber" />
          <Stat label="Unread User Messages" value={stats.unread_user_messages} accent="brand" />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[380px_1fr]">
        {/* Conversation list */}
        <Card
          title="Conversations"
          subtitle={`${conversations.length} found`}
          actions={
            <Button variant="ghost" size="sm" onClick={() => loadConversations()}>
              Refresh
            </Button>
          }
          bodyClassName="p-0"
        >
          <div className="flex flex-col gap-2 border-b border-slate-100 p-3">
            <div className="flex gap-2">
              <Input
                placeholder="Search user / message…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1"
              />
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-28"
              >
                <option value="">All</option>
                <option value="open">Open</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </Select>
            </div>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {loading && conversations.length === 0 ? (
              <Spinner className="py-10" />
            ) : conversations.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-slate-400">
                No conversations yet.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {conversations.map((c) => {
                  const active = c.id === selectedId;
                  const unread = c.unread_count ?? 0;
                  return (
                    <li key={c.id}>
                      <button
                        onClick={() => handleSelect(c.id)}
                        className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${
                          active ? "bg-brand-50" : "hover:bg-slate-50"
                        }`}
                      >
                        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-base">
                          💬
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm font-semibold text-slate-900">
                              {c.username}
                            </span>
                            <span className="shrink-0 text-[11px] text-slate-400">
                              {formatDate(c.last_message_at)}
                            </span>
                          </div>
                          <div className="mt-0.5 flex items-center gap-1.5">
                            <Badge color="blue">{categoryLabel(c.category)}</Badge>
                            <Badge
                              color={
                                c.status === "open"
                                  ? "amber"
                                  : c.status === "resolved"
                                  ? "emerald"
                                  : "slate"
                              }
                            >
                              {c.status}
                            </Badge>
                          </div>
                          <p
                            className={`mt-1 truncate text-xs ${
                              unread > 0
                                ? "font-medium text-slate-700"
                                : "text-slate-500"
                            }`}
                          >
                            {c.last_message || "No messages yet"}
                          </p>
                        </div>
                        {unread > 0 && (
                          <span className="mt-1 flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-brand-600 px-1.5 text-[11px] font-bold text-white">
                            {unread}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Card>

        {/* Thread */}
        <Card
          title={thread ? `Chat with ${thread.username}` : "Conversation"}
          subtitle={
            thread
              ? `${categoryLabel(thread.category)}${
                  thread.phone ? ` · ${thread.phone}` : ""
                }`
              : "Select a conversation to view the thread"
          }
          actions={
            thread && (
              <Select
                value={thread.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={changingStatus}
                className="w-32"
              >
                <option value="open">Open</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </Select>
            )
          }
          bodyClassName="p-0"
        >
          {!thread ? (
            <p className="px-4 py-16 text-center text-sm text-slate-400">
              Select a conversation from the left to start replying.
            </p>
          ) : (
            <div className="flex h-[60vh] flex-col">
              <div
                ref={scrollRef}
                className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4"
              >
                {messages.length === 0 && (
                  <p className="py-10 text-center text-sm text-slate-400">
                    No messages yet.
                  </p>
                )}
                {messages.map((m) => {
                  const isAdmin = m.sender_type === "admin";
                  return (
                    <div
                      key={m.id}
                      className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${
                          isAdmin
                            ? "rounded-br-sm bg-brand-600 text-white"
                            : "rounded-bl-sm bg-white text-slate-800 ring-1 ring-slate-200"
                        }`}
                      >
                        {m.attachment_url && (
                          <a
                            href={attachmentSrc(m.attachment_url)}
                            target="_blank"
                            rel="noreferrer"
                            className="mb-1.5 block"
                          >
                            <img
                              src={attachmentSrc(m.attachment_url)}
                              alt="attachment"
                              className="max-h-48 w-full rounded-lg object-cover"
                            />
                          </a>
                        )}
                        {m.message && <p className="whitespace-pre-wrap">{m.message}</p>}
                        <p
                          className={`mt-1 text-[10px] ${
                            isAdmin ? "text-white/70" : "text-slate-400"
                          }`}
                        >
                          {formatDate(m.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-slate-100 bg-white p-3">
                <div className="mb-2 flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    📎 {file ? file.name.slice(0, 14) : "Screenshot"}
                  </Button>
                  {file && (
                    <button
                      className="text-xs text-red-500 hover:underline"
                      onClick={() => {
                        setFile(null);
                        if (fileInputRef.current)
                          fileInputRef.current.value = "";
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="flex items-end gap-2">
                  <Textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Type your reply…"
                    className="min-h-[44px] flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                  />
                  <Button
                    onClick={handleSend}
                    loading={sending}
                    disabled={!reply.trim() && !file}
                  >
                    Send
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent = "slate",
}: {
  label: string;
  value?: number | string;
  accent?: "slate" | "amber" | "brand";
}) {
  const accents: Record<string, string> = {
    slate: "from-slate-500/20 to-slate-400/5 text-slate-700",
    amber: "from-amber-500/20 to-amber-400/5 text-amber-700",
    brand: "from-brand-500/20 to-brand-400/5 text-brand-700",
  };
  return (
    <div
      className={`rounded-2xl border border-slate-100 bg-gradient-to-br p-4 ${accents[accent]}`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value ?? 0}</p>
    </div>
  );
}
