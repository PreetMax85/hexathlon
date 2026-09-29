"use client";

import { useMemo, useSyncExternalStore } from "react";
import { utcDateKey, type Format, type Mode } from "@/engine";
import {
  PLAYER_KEY,
  readPlayer,
  readResult,
  resultKey,
  type KV,
  type LocalResult,
  type Player,
} from "./storage";
import { readSettings, SETTINGS_KEY, type Settings } from "./settings";
import { readStreak, DAYS_KEY } from "./today";
import { readTheme, THEME_KEY, type Theme } from "./theme";

const CHANGE_EVENT = "hexathlon:storage";

/** localStorage that never throws and tells this tab's hooks when it changes. */
export const browserKV: KV = {
  getItem(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Private mode or full storage: keep playing without persistence.
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  },
};

function subscribeStorage(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

/** Raw stored string; undefined before hydration so server and client markup match. */
function useRaw(key: string): string | null | undefined {
  return useSyncExternalStore(
    subscribeStorage,
    () => browserKV.getItem(key),
    () => undefined,
  );
}

/** The local player: undefined until hydrated, null when no nickname is set yet. */
export function usePlayer(): Player | null | undefined {
  const raw = useRaw(PLAYER_KEY);
  return useMemo(() => {
    if (raw === undefined) return undefined;
    return readPlayer({ getItem: () => raw, setItem: () => undefined });
  }, [raw]);
}

/** A locally stored result: undefined until hydrated, null when there is none. */
export function useLocalResult(format: Format, mode: Mode, tag: string | null): LocalResult | null | undefined {
  const raw = useRaw(tag === null ? "hexathlon:none" : resultKey(format, mode, tag));
  return useMemo(() => {
    if (raw === undefined || tag === null) return undefined;
    return readResult({ getItem: () => raw, setItem: () => undefined }, format, mode, tag);
  }, [raw, format, mode, tag]);
}

const subscribeMinute = (onChange: () => void) => {
  const id = window.setInterval(onChange, 30_000);
  return () => window.clearInterval(id);
};

/** Current UTC date key (rolls over at 00:00 UTC), or null before hydration. */
export function useTodayKey(): string | null {
  return useSyncExternalStore(
    subscribeMinute,
    () => utcDateKey(new Date()),
    () => null,
  );
}

const subscribeNothing = () => () => undefined;

/** False on the server and during hydration, true afterwards. */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribeNothing, () => true, () => false);
}

/** Player settings (Relaxed mode); undefined until hydrated. */
export function useSettings(): Settings | undefined {
  const raw = useRaw(SETTINGS_KEY);
  return useMemo(() => {
    if (raw === undefined) return undefined;
    return readSettings({ getItem: () => raw, setItem: () => undefined });
  }, [raw]);
}

/** Days-at-sea streak for today; undefined until hydrated. */
export function useStreak(today: string | null): number | undefined {
  const raw = useRaw(DAYS_KEY);
  return useMemo(() => {
    if (raw === undefined || today === null) return undefined;
    return readStreak({ getItem: () => raw, setItem: () => undefined }, today);
  }, [raw, today]);
}

/** A short buzz on a right answer where the device supports it. */
export function haptic(): void {
  try {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    navigator.vibrate?.(18);
  } catch {
    // Not supported: the visual pulse is enough.
  }
}

const subscribeMotion = (onChange: () => void) => {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
};

/** True when the player asked for reduced motion; false on the server. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

const subscribeClock = (onChange: () => void) => {
  const id = window.setInterval(onChange, 15_000);
  return () => window.clearInterval(id);
};
let nowCache = 0;
const readNowMinute = () => {
  // Snapshot to the minute so useSyncExternalStore sees a stable value.
  const minute = Math.floor(Date.now() / 60_000) * 60_000;
  if (minute !== nowCache) nowCache = minute;
  return nowCache;
};

/** Current time rounded to the minute (refreshing), or null before hydration. */
export function useNowMinute(): number | null {
  return useSyncExternalStore(subscribeClock, readNowMinute, () => null);
}

/** Chosen chart palette; undefined until hydrated. */
export function useTheme(): Theme | undefined {
  const raw = useRaw(THEME_KEY);
  return useMemo(() => (raw === undefined ? undefined : readTheme({ getItem: () => raw, setItem: () => undefined })), [raw]);
}

/** Store and apply a palette ("auto" follows the system). */
export function applyTheme(theme: Theme): void {
  browserKV.setItem(THEME_KEY, theme);
  if (theme === "auto") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
}
