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
