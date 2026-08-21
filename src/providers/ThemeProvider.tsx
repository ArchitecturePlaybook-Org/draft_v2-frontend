"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type ThemeMode = "dark" | "light" | "blueprint";

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = (localStorage.getItem("ap_theme") as ThemeMode) || "dark";
    setThemeState(savedTheme);
    applyThemeClass(savedTheme);
  }, []);

  const setTheme = (mode: ThemeMode) => {
    setThemeState(mode);
    try {
      localStorage.setItem("ap_theme", mode);
    } catch (e) {
      console.warn("Unable to save theme to localStorage", e);
    }
    applyThemeClass(mode);
  };

  const applyThemeClass = (mode: ThemeMode) => {
    const root = document.documentElement;
    root.classList.remove("theme-light", "theme-blueprint", "light", "dark");

    if (mode === "light") {
      root.classList.add("theme-light", "light");
    } else if (mode === "blueprint") {
      root.classList.add("theme-blueprint", "dark");
    } else {
      root.classList.add("dark");
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
