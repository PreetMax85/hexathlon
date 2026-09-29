import type { KV } from "./storage";

/** Two palettes: day paper and dusk. Until one is chosen, the system's light/dark setting picks. */
export const THEMES = ["day", "dusk"] as const;
export type Theme = (typeof THEMES)[number];

export const THEME_KEY = "hexathlon:theme";

/** The palette in force: a stored choice wins, otherwise the system's. Retired "night" reads as dusk. */
export function readTheme(kv: KV, systemDark: boolean): Theme {
  let v: string | null = null;
  try {
    v = kv.getItem(THEME_KEY);
  } catch {
    // Storage blocked: follow the system.
  }
  if (v === "day") return "day";
  if (v === "dusk" || v === "night") return "dusk";
  return systemDark ? "dusk" : "day";
}

export const toggleTheme = (t: Theme): Theme => (t === "day" ? "dusk" : "day");

export const THEME_LABEL: Record<Theme, string> = { day: "Day", dusk: "Dusk" };

/** Inline, pre-paint: sets `data-theme` from storage so a chosen palette never flashes. */
export const THEME_BOOT_SCRIPT = `try{var t=localStorage.getItem(${JSON.stringify(THEME_KEY)});if(t==="night")t="dusk";if(t==="day"||t==="dusk")document.documentElement.dataset.theme=t}catch(e){}`;
