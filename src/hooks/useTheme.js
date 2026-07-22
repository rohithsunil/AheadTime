import { useSyncExternalStore, useCallback } from "react";

let currentTheme = typeof localStorage !== "undefined" ? localStorage.getItem("aheadtime-theme") || "light" : "light";
const listeners = new Set();

function applyTheme(t) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const isDark = t === "dark" || t === "amoled" || (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", isDark);
  root.classList.toggle("amoled", t === "amoled");
  localStorage.setItem("aheadtime-theme", t);

  // Dynamically update theme-color to match gradient top — controlled by the
  // APP theme, not the phone's system mode (avoids black bar when phone is dark
  // but app is light). The color must exactly match the top of the html gradient
  // so the system status bar blends seamlessly with the app background.
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (themeColorMeta) {
    if (t === "amoled") themeColorMeta.content = "#000000";
    else if (isDark) themeColorMeta.content = "#0C0E1E";
    else themeColorMeta.content = "#FDFDFD";
  }

  // Status bar style: "default" for light (dark text on light bg), "black-translucent"
  // for dark/amoled (transparent bg + white text — lets the gradient show through
  // the status bar so it always matches the app background).
  const statusBarMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
  if (statusBarMeta) {
    statusBarMeta.content = isDark ? "black-translucent" : "default";
  }

  // Set color-scheme so form controls / scrollbars match the app theme, not the
  // phone's system preference.
  root.style.colorScheme = isDark ? "dark" : "light";
}

function notify() {
  listeners.forEach((l) => l());
}

if (typeof window !== "undefined") {
  applyTheme(currentTheme);
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (currentTheme === "system") applyTheme("system");
  });
}

export function useTheme() {
  const theme = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => currentTheme
  );

  const setTheme = useCallback((t) => {
    currentTheme = t;
    applyTheme(t);
    notify();
  }, []);

  return { theme, setTheme };
}