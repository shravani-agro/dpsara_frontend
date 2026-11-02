"use client";

import { useState, useEffect, useCallback } from "react";

export function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    // 1. Determine current theme from localStorage, html class, or system preference
    const saved = (localStorage.getItem("theme") || localStorage.getItem("dpsara_theme")) as "light" | "dark" | null;
    let initial: "light" | "dark" = "light";

    if (saved === "light" || saved === "dark") {
      initial = saved;
    } else if (document.documentElement.classList.contains("dark") || document.documentElement.getAttribute("data-theme") === "dark") {
      initial = "dark";
    } else if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      initial = "dark";
    }

    setTheme(initial);
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(initial);
    if (initial === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }

    // 2. Listen to system preference changes if no manual preference is saved
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      const currentSaved = localStorage.getItem("theme") || localStorage.getItem("dpsara_theme");
      if (!currentSaved) {
        const nextMode = e.matches ? "dark" : "light";
        setTheme(nextMode);
        document.documentElement.classList.remove("light", "dark");
        document.documentElement.classList.add(nextMode);
        if (nextMode === "dark") {
          document.documentElement.setAttribute("data-theme", "dark");
        } else {
          document.documentElement.removeAttribute("data-theme");
        }
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const setThemeMode = useCallback((mode: "light" | "dark") => {
    setTheme(mode);
    try {
      localStorage.setItem("dpsara_theme", mode);
      localStorage.setItem("theme", mode);
      window.dispatchEvent(new Event("storage"));
    } catch {
      // ignore storage quota errors
    }
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(mode);
    if (mode === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }, []);

  return { theme, setTheme: setThemeMode, setThemeMode };
}