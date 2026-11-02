"use client";

import React, { useState, useEffect } from "react";
import { useUserModal } from "@/components/UserModalContext";
import { WhatsAppLink } from "@/components/WhatsAppLink";
import { cn } from "@/components/ui";
import {
  getCachedUser,
  resolveUser,
  subscribeUserCache,
  isRawId,
  CachedUser,
} from "@/lib/user-cache";

interface UserCellProps {
  userId?: number | string | null;
  username?: string | null;
  fullName?: string | null;
  phone?: string | number | null;
  avatarSize?: "sm" | "md" | "lg";
  className?: string;
  showPhone?: boolean;
  showId?: boolean;
  clickable?: boolean;
}

export function UserCell({
  userId,
  username,
  fullName,
  phone,
  avatarSize = "sm",
  className = "",
  showPhone = true,
  showId = false, // Never show raw ID tag by default
  clickable = true,
}: UserCellProps) {
  const { openUser } = useUserModal();

  const idNum = userId ? Number(userId) : null;

  // Determine if incoming props contain a real human name rather than a raw numeric ID
  const candidateName = (fullName || username || "").trim();
  const hasValidName = !isRawId(candidateName);

  const [cachedUser, setCachedUser] = useState<CachedUser | null>(() => {
    return idNum ? getCachedUser(idNum) : null;
  });

  useEffect(() => {
    if (!idNum) return;

    // Check if we already have a real name in cache
    const existing = getCachedUser(idNum);
    if (existing && !isRawId(existing.full_name || existing.username)) {
      setCachedUser(existing);
    }

    // Subscribe to cache updates (triggers when prefetchAllUsers or other queries resolve)
    const unsubscribe = subscribeUserCache(() => {
      const updated = getCachedUser(idNum);
      if (updated && !isRawId(updated.full_name || updated.username)) {
        setCachedUser(updated);
      }
    });

    // If incoming prop is missing or is just a raw numeric ID, resolve the real user
    if (!hasValidName) {
      resolveUser(idNum).then((u) => {
        if (u) setCachedUser(u);
      });
    }

    return () => {
      unsubscribe();
    };
  }, [idNum, hasValidName]);

  // Compute final display name: Never allow raw numeric ID to be displayed as user name
  let displayName = "";
  if (hasValidName && candidateName) {
    displayName = candidateName;
  } else if (cachedUser && !isRawId(cachedUser.full_name || cachedUser.username)) {
    displayName = (cachedUser.full_name || cachedUser.username)!;
  } else {
    // While resolving or if completely unknown, show friendly label instead of raw digits
    displayName = "User";
  }

  // Compute phone
  const rawPhone = phone || cachedUser?.phone || cachedUser?.mobile_number;
  const phoneStr = rawPhone ? String(rawPhone).trim() : "";
  const initial = (displayName[0] || "U").toUpperCase();

  const handleClick = (e: React.MouseEvent) => {
    if (!clickable || !idNum) return;
    e.stopPropagation();
    openUser(idNum, {
      username: (username && !isRawId(username) ? username : cachedUser?.username) || undefined,
      full_name: (fullName && !isRawId(fullName) ? fullName : cachedUser?.full_name || displayName) || undefined,
      phone: phoneStr || undefined,
    });
  };

  const avatarSizes = {
    sm: "h-7 w-7 text-xs",
    md: "h-8 w-8 text-xs",
    lg: "h-10 w-10 text-sm",
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        "inline-flex items-center gap-2 group text-left select-none",
        Boolean(clickable && idNum) ? "cursor-pointer active:scale-95 transition-transform" : "",
        className
      )}
      title={clickable && idNum ? `Click to view profile & actions for ${displayName}` : undefined}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-xl font-bold bg-gradient-to-br from-amber-500/20 to-brand-500/20 text-brand-700 dark:text-brand-300 ring-1 ring-inset ring-brand-500/30 shadow-xs group-hover:scale-105 transition-transform",
          avatarSizes[avatarSize]
        )}
      >
        {initial}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "font-semibold text-slate-900 dark:text-slate-100 truncate text-xs sm:text-sm leading-tight",
              Boolean(clickable && idNum) ? "group-hover:text-brand-600 dark:group-hover:text-brand-400 group-hover:underline underline-offset-2" : ""
            )}
          >
            {displayName}
          </span>
          {showId && idNum && (
            <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500 shrink-0">
              #{idNum}
            </span>
          )}
        </div>

        {showPhone && phoneStr && (
          <div
            className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="font-mono">{phoneStr}</span>
            <WhatsAppLink
              phone={phoneStr}
              userName={displayName}
              variant="icon"
              className="h-4 w-4 rounded-xs text-[10px] p-0"
            />
          </div>
        )}
      </div>
    </div>
  );
}
