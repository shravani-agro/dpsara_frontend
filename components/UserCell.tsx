"use client";

import React, { useState, useEffect } from "react";
import { useUserModal } from "@/components/UserModalContext";
import { WhatsAppLink } from "@/components/WhatsAppLink";
import { cn } from "@/components/ui";
import { getCachedUser, resolveUser } from "@/lib/user-cache";

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
  showId = false, // ID is hidden by default to prioritize direct user names
  clickable = true,
}: UserCellProps) {
  const { openUser } = useUserModal();

  const idNum = userId ? Number(userId) : null;
  const cached = idNum ? getCachedUser(idNum) : null;

  const [resolvedName, setResolvedName] = useState<string | null>(
    fullName || username || cached?.full_name || cached?.username || null
  );
  const [resolvedPhone, setResolvedPhone] = useState<string | null>(
    phone ? String(phone) : cached?.phone || cached?.mobile_number ? String(cached?.phone || cached?.mobile_number) : null
  );

  useEffect(() => {
    const currentName = fullName || username;
    if (idNum && (!currentName || currentName.trim() === "" || currentName.toLowerCase().startsWith("user #"))) {
      resolveUser(idNum).then((u) => {
        if (u) {
          const name = u.full_name || u.username;
          if (name) setResolvedName(name);
          const ph = u.phone || u.mobile_number;
          if (ph) setResolvedPhone(String(ph));
        }
      });
    } else if (currentName) {
      setResolvedName(currentName);
    }
    if (phone) {
      setResolvedPhone(String(phone));
    }
  }, [idNum, fullName, username, phone]);

  const displayName = resolvedName || (idNum ? `User` : "Unknown User");
  const phoneStr = resolvedPhone ? String(resolvedPhone).trim() : "";
  const initial = (displayName[0] || "U").toUpperCase();

  const handleClick = (e: React.MouseEvent) => {
    if (!clickable || !idNum) return;
    e.stopPropagation();
    openUser(idNum, {
      username: username || cached?.username || undefined,
      full_name: fullName || resolvedName || cached?.full_name || undefined,
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

