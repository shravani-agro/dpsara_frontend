"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { login as apiLogin, logout as apiLogout, isAuthenticated, decodeToken } from "@/lib/admin";
import { getToken } from "@/lib/api";

export interface SubAdminPermissions {
  can_add_result: boolean;
  can_update_result: boolean;
  can_delete_result: boolean;
  show_commission: boolean;
  show_overview: boolean;
  show_bid_data: boolean;
  show_result: boolean;
  show_agent_report: boolean;
  can_approve_deposit: boolean;
  can_approve_withdrawal: boolean;
  can_manage_users: boolean;
  show_markets: boolean;
  show_starline: boolean;
  show_jackpot: boolean;
  show_support: boolean;
  show_settings: boolean;
  show_deposits: boolean;
  show_withdrawals: boolean;
  show_bids: boolean;
  [key: string]: boolean;
}

const DEFAULT_PERMISSIONS: SubAdminPermissions = {
  can_add_result: true,
  can_update_result: true,
  can_delete_result: true,
  show_commission: true,
  show_overview: true,
  show_bid_data: true,
  show_result: true,
  show_agent_report: true,
  can_approve_deposit: true,
  can_approve_withdrawal: true,
  can_manage_users: true,
  show_markets: true,
  show_starline: true,
  show_jackpot: true,
  show_support: true,
  show_settings: false,
  show_deposits: true,
  show_withdrawals: true,
  show_bids: true,
};

interface AuthContextValue {
  authenticated: boolean;
  loading: boolean;
  username: string | null;
  role: "admin" | "subadmin";
  isSubAdmin: boolean;
  assignedUserIds: string[];
  permissions: SubAdminPermissions;
  hasPermission: (key: string) => boolean;
  login: (credential: string, password: string, remember?: boolean) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState<string | null>(null);
  const [role, setRole] = useState<"admin" | "subadmin">("admin");
  const [assignedUserIds, setAssignedUserIds] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<SubAdminPermissions>(DEFAULT_PERMISSIONS);

  const applyTokenPayload = (payload: any) => {
    if (!payload) return;
    const isSub = payload.role === "subadmin" || (typeof payload.sub === "string" && payload.sub.startsWith("subadmin:"));
    setRole(isSub ? "subadmin" : "admin");

    if (payload.assigned_user_ids) {
      const ids = String(payload.assigned_user_ids).split(",").map((s) => s.trim()).filter(Boolean);
      setAssignedUserIds(ids);
    } else {
      setAssignedUserIds([]);
    }

    if (isSub) {
      const parsedPerms: SubAdminPermissions = {
        can_add_result: payload.can_add_result ?? true,
        can_update_result: payload.can_update_result ?? true,
        can_delete_result: payload.can_delete_result ?? true,
        show_commission: payload.show_commission ?? true,
        show_overview: payload.show_overview ?? true,
        show_bid_data: payload.show_bid_data ?? true,
        show_result: payload.show_result ?? true,
        show_agent_report: payload.show_agent_report ?? true,
        can_approve_deposit: payload.can_approve_deposit ?? true,
        can_approve_withdrawal: payload.can_approve_withdrawal ?? true,
        can_manage_users: payload.can_manage_users ?? true,
        show_markets: payload.show_markets ?? true,
        show_starline: payload.show_starline ?? true,
        show_jackpot: payload.show_jackpot ?? true,
        show_support: payload.show_support ?? true,
        show_settings: payload.show_settings ?? false,
        show_deposits: payload.show_deposits ?? true,
        show_withdrawals: payload.show_withdrawals ?? true,
        show_bids: payload.show_bids ?? true,
      };
      setPermissions(parsedPerms);
    } else {
      // Super admin has all permissions
      setPermissions({
        can_add_result: true,
        can_update_result: true,
        can_delete_result: true,
        show_commission: true,
        show_overview: true,
        show_bid_data: true,
        show_result: true,
        show_agent_report: true,
        can_approve_deposit: true,
        can_approve_withdrawal: true,
        can_manage_users: true,
        show_markets: true,
        show_starline: true,
        show_jackpot: true,
        show_support: true,
        show_settings: true,
        show_deposits: true,
        show_withdrawals: true,
        show_bids: true,
      });
    }
  };

  useEffect(() => {
    const ok = isAuthenticated();
    setAuthenticated(ok);
    if (ok) {
      try {
        const token = getToken() || "";
        const payload = decodeToken(token);
        applyTokenPayload(payload);

        const storedUser = typeof window !== "undefined"
          ? (window.localStorage.getItem("admin_display_user") || window.sessionStorage.getItem("admin_display_user"))
          : null;
        if (storedUser) {
          setUsername(storedUser);
        } else if (payload) {
          setUsername(payload.username === "admin" ? "OurAdmin_777" : (payload.username || payload.full_name || "OurAdmin_777"));
        } else {
          setUsername("OurAdmin_777");
        }
      } catch {
        setUsername("OurAdmin_777");
      }
    } else {
      setUsername(null);
      setRole("admin");
      setAssignedUserIds([]);
    }
    setLoading(false);
  }, []);

  async function login(credential: string, password: string, remember: boolean = false) {
    await apiLogin(credential, password, remember);
    if (typeof window !== "undefined") {
      if (remember) {
        window.localStorage.setItem("admin_display_user", credential);
      } else {
        window.sessionStorage.setItem("admin_display_user", credential);
      }
    }
    const token = getToken() || "";
    const payload = decodeToken(token);
    applyTokenPayload(payload);

    setAuthenticated(true);
    setUsername(credential);
  }

  function logout() {
    apiLogout();
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("admin_display_user");
      window.sessionStorage.removeItem("admin_display_user");
    }
    setAuthenticated(false);
    setUsername(null);
    setRole("admin");
    setAssignedUserIds([]);
    window.location.href = "/ouradminportal/login";
  }

  const isSubAdmin = role === "subadmin";

  const hasPermission = (key: string): boolean => {
    if (!isSubAdmin) return true; // Super admin has full access
    return permissions[key] ?? false;
  };

  return (
    <AuthContext.Provider
      value={{
        authenticated,
        loading,
        username,
        role,
        isSubAdmin,
        assignedUserIds,
        permissions,
        hasPermission,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
