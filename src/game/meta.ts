import { HAND_TRACKER_RULES, PIP_FLASH_RULES, REVEAL_MS, runItems, TIERS, type Format, type Resource, type Tier } from "@/engine";
import { RELAXED_FACTOR } from "./relaxed";

export interface FormatMeta {
  name: string;
  tagline: string;
  /** The one skill the format trains. */
  skill: string;
}

export const FORMAT_META: Record<Format, FormatMeta> = {
  "pip-flash": {
    name: "Pip Flash",
    tagline: "Spot the richest corner before the clock runs out.",
    skill: "Reading the board",
  },
  "port-math": {
    name: "Port Math",
    tagline: "Reach the build in the fewest bank and port trades.",
    skill: "Trade efficiency",
  },
  "hand-tracker": {
    name: "Hand Tracker",
    tagline: "Follow the game log and count your rival's cards.",
    skill: "Card counting",
  },
};

/** Port Math's pace bar: a par per tier to aim at. Never a cutoff; time only breaks ties. */
export const PORT_MATH_PAR_MS: Record<Tier, number> = { easy: 15_000, medium: 20_000, hard: 30_000 };

export interface ResourceMeta {
  label: string;
  /** Hex fill on the board: the board owns the saturated colours. */
  fill: string;
  /** Stroke for the terrain glyph drawn on that fill. */
  glyph: string;
}

export const RESOURCE_META: Record<Resource | "desert", ResourceMeta> = {
  wood: { label: "Wood", fill: "#2f6b45", glyph: "#e9f2e4" },
  brick: { label: "Brick", fill: "#b5532f", glyph: "#fbe9df" },
  sheep: { label: "Sheep", fill: "#9fcb63", glyph: "#1d2b36" },
  wheat: { label: "Wheat", fill: "#e6be3c", glyph: "#1d2b36" },
  ore: { label: "Ore", fill: "#7d8798", glyph: "#f1f3f6" },
  desert: { label: "Desert", fill: "#e3cf9c", glyph: "#6b5a33" },
};

export const TIER_LABEL: Record<Tier, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

export const BUILD_LABEL = {
  road: "Road",
  settlement: "Settlement",
  city: "City",
  dev: "Dev card",
} as const;

/**
 * Average seconds each Hand Tracker log line stays up, measured over 500
 * seeds per tier (engine `eventDurationMs`). Shown on the intro, not used in play.
 */
export const HAND_TRACKER_PACE_S: Record<Tier, number> = { easy: 3.0, medium: 2.7, hard: 2.5 };

/** One line on the intro screen giving each tier's clock before play starts. */
export function introTiming(format: Format, relaxed: boolean): string {
  const k = relaxed ? RELAXED_FACTOR : 1;
  switch (format) {
    case "pip-flash":
      return `Time limit per board: ${TIERS.map((t) => `${(PIP_FLASH_RULES[t].timeLimitMs * k) / 1000} s ${t}`).join(" · ")}.`;
    case "port-math":
      return `No time limit. A par of ${TIERS.map((t) => PORT_MATH_PAR_MS[t] / 1000).join(" / ")} s sets the pace; going over only costs the tiebreak.`;
    case "hand-tracker": {
      const lines = TIERS.map((t) => HAND_TRACKER_RULES[t].events).join(" / ");
      // Relaxed playback is tap-paced: the hand and each line wait for the player.
      if (relaxed) return `Memorise the hand, then ${lines} log lines, one per tap. Take your time.`;
      return `${REVEAL_MS / 1000} s to memorise the hand, then ${lines} log lines, each shown about ${TIERS.map((t) => HAND_TRACKER_PACE_S[t].toFixed(1)).join(" / ")} s.`;
    }
  }
}

/** Which puzzles of a run are which tier, e.g. "easy 1–4, medium 5–9, hard 10–13". */
export function tierRamp(mode: "daily" | "rush", length?: number): string {
  const tiers = runItems(mode, 0, length).map((it) => it.tier);
  return TIERS.map((t) => {
    const first = tiers.indexOf(t) + 1;
    const last = tiers.lastIndexOf(t) + 1;
    return `${t} ${first === last ? first : `${first}–${last}`}`;
  }).join(", ");
}
