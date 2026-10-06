"use client";

import { useState, useEffect } from "react";

export function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>("light");

  useEffect(() => {
    // Check for saved preference or system preference
    const saved = localStorage.getItem("dpsara_theme");
    if (saved) {
      setTheme(saved as "light" | "dark");
    } else {
      setTheme(
        window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
      );
    }
  }, []);

  const setThemeMode = (mode: "light" | "dark") => {
    setTheme(mode);
    localStorage.setItem("dpsara_theme", mode);
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(mode);
  };

  return { theme, setTheme: setThemeMode, setThemeMode };
}