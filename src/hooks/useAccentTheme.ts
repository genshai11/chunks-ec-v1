import { useEffect, useState } from "react";

export type AccentTheme = "blue" | "red" | "lime";

const STORAGE_KEY = "chunks-accent-theme";

export function useAccentTheme() {
  const [accentTheme, setAccentTheme] = useState<AccentTheme>(() => {
    if (typeof window === "undefined") return "blue";
    const saved = window.localStorage.getItem(STORAGE_KEY) as AccentTheme | null;
    return saved || "blue";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-accent", accentTheme);
    window.localStorage.setItem(STORAGE_KEY, accentTheme);
  }, [accentTheme]);

  return {
    accentTheme,
    setAccentTheme,
  };
}

