import { useSyncExternalStore } from "react";

const KEY = "mimarlik-theme";

type Theme = "light" | "dark";

function readStored(): Theme {
  const stored = localStorage.getItem(KEY);
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

let theme: Theme = readStored();
const listeners = new Set<() => void>();

function apply() {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

apply();

export function toggleTheme() {
  theme = theme === "dark" ? "light" : "dark";
  localStorage.setItem(KEY, theme);
  apply();
  listeners.forEach((l) => l());
}

export function useTheme(): Theme {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    () => theme
  );
}
