import type { KV } from "./storage";

export const SETTINGS_KEY = "hexathlon:settings";

export interface Settings {
  /** Doubles every time limit and event duration; results stay local and unranked. */
  relaxed: boolean;
}

export const defaultSettings: Settings = { relaxed: false };

export function readSettings(kv: KV): Settings {
  try {
    const raw = kv.getItem(SETTINGS_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<Settings>) : {};
    return { relaxed: parsed.relaxed === true };
  } catch {
    return defaultSettings;
  }
}

export function saveSettings(kv: KV, settings: Settings): void {
  try {
    kv.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Storage full or blocked: the toggle lasts for this page only.
  }
}
