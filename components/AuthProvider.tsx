"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { login as apiLogin, logout as apiLogout, isAuthenticated, decodeToken } from "@/lib/admin";
import { getToken } from "@/lib/api";

interface AuthContextValue {
  authenticated: boolean;
  loading: boolean;
  username: string | null;
  login: (credential: string, password: string, remember?: boolean) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const ok = isAuthenticated();
    setAuthenticated(ok);
    if (ok) {
      try {
        const token = getToken() || "";
        const payload = decodeToken(token);
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
    window.location.href = "/ouradminportal/login";
  }

  return (
    <AuthContext.Provider value={{ authenticated, loading, username, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
