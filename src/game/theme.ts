import type { KV } from "./storage";

/** Chart palettes: day paper, dimmed dusk and night (ECDIS-style), or follow the system. */
export const THEMES = ["auto", "day", "dusk", "night"] as const;
export type Theme = (typeof THEMES)[number];

export const THEME_KEY = "hexathlon:theme";

export function readTheme(kv: KV): Theme {
  try {
    const v = kv.getItem(THEME_KEY);
    return (THEMES as readonly string[]).includes(v ?? "") ? (v as Theme) : "auto";
  } catch {
    return "auto";
  }
}

export function cycleTheme(t: Theme): Theme {
  return THEMES[(THEMES.indexOf(t) + 1) % THEMES.length];
}

export const THEME_LABEL: Record<Theme, string> = {
  auto: "Auto",
  day: "Day",
  dusk: "Dusk",
  night: "Night",
};

/** Inline, pre-paint: sets `data-theme` from storage so a chosen palette never flashes. */
export const THEME_BOOT_SCRIPT = `try{var t=localStorage.getItem("${THEME_KEY}");if(t==="day"||t==="dusk"||t==="night")document.documentElement.dataset.theme=t}catch(e){}`;
