"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { prefetchAllUsers, CachedUser } from "@/lib/user-cache";
import { cn } from "@/components/ui";

interface UserSelectProps {
  value: string | number;
  onChange: (userId: string, user?: CachedUser) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export function UserSelect({
  value,
  onChange,
  placeholder = "Search user by Name, Username or Phone...",
  required = false,
  className = "",
}: UserSelectProps) {
  const [users, setUsers] = useState<CachedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load users
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    prefetchAllUsers()
      .then((data) => {
        if (mounted) {
          setUsers(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Find selected user object
  const selectedUser = useMemo(() => {
    if (!value) return null;
    const num = Number(value);
    return users.find((u) => u.id === num) || null;
  }, [value, users]);

  // Filtered users for dropdown
  const filteredUsers = useMemo(() => {
    if (!query.trim()) return users.slice(0, 15);
    const q = query.trim().toLowerCase();
    return users
      .filter((u) => {
        const name = (u.full_name || "").toLowerCase();
        const username = (u.username || "").toLowerCase();
        const phone = String(u.phone || u.mobile_number || "").toLowerCase();
        return name.includes(q) || username.includes(q) || phone.includes(q);
      })
      .slice(0, 20);
  }, [users, query]);

  const handleSelect = (user: CachedUser) => {
    onChange(String(user.id), user);
    setIsOpen(false);
    setQuery("");
  };

  const handleClear = () => {
    onChange("");
    setQuery("");
  };

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {selectedUser ? (
        // Selected User Card View
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-brand-500/30 bg-brand-50/50 dark:bg-brand-500/10 transition-all">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500/20 text-brand-700 dark:text-brand-300 font-bold text-sm ring-1 ring-inset ring-brand-500/30">
              {(selectedUser.full_name?.[0] || selectedUser.username?.[0] || "U").toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                {selectedUser.full_name || selectedUser.username}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                {selectedUser.username && (
                  <span className="truncate">@{selectedUser.username}</span>
                )}
                {(selectedUser.phone || selectedUser.mobile_number) && (
                  <span>📱 {selectedUser.phone || selectedUser.mobile_number}</span>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition border border-slate-200 dark:border-slate-700"
          >
            Change ✕
          </button>
        </div>
      ) : (
        // Search Input
        <div>
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              placeholder={placeholder}
              required={required && !value}
              className="input-base w-full pr-10 text-xs sm:text-sm"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs">
              {loading ? "⌛" : "🔍"}
            </div>
          </div>

          {/* Autocomplete Dropdown */}
          {isOpen && (
            <div className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in-50 zoom-in-95">
              {filteredUsers.length === 0 ? (
                <div className="p-3 text-xs text-center text-slate-400">
                  {loading ? "Loading users..." : "No users found matching your search."}
                </div>
              ) : (
                filteredUsers.map((u) => {
                  const displayName = u.full_name || u.username;
                  const initial = (displayName?.[0] || "U").toUpperCase();
                  const phone = u.phone || u.mobile_number;

                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleSelect(u)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-colors"
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
                        {initial}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {displayName}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 truncate">
                          {u.username && <span>@{u.username}</span>}
                          {phone && <span>· {phone}</span>}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
