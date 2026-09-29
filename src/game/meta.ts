import { HAND_TRACKER_RULES, PIP_FLASH_RULES, REVEAL_MS, TIERS, type Format, type Resource, type Tier } from "@/engine";
import { RELAXED_FACTOR } from "./relaxed";

export interface FormatMeta {
  name: string;
  tagline: string;
  /** Short skill label shown on cards. */
  skill: string;
  /** Tailwind classes for the format accent. */
  accent: string;
}

export const FORMAT_META: Record<Format, FormatMeta> = {
  "pip-flash": {
    name: "Pip Flash",
    tagline: "Spot the richest corner before the clock runs out.",
    skill: "Reading the board",
    accent: "from-amber-400 to-orange-500",
  },
  "port-math": {
    name: "Port Math",
    tagline: "Reach the build in the fewest bank and port trades.",
    skill: "Trade efficiency",
    accent: "from-sky-400 to-indigo-500",
  },
  "hand-tracker": {
    name: "Hand Tracker",
    tagline: "Follow the game log and count your rival's cards.",
    skill: "Card counting",
    accent: "from-emerald-400 to-teal-500",
  },
};

export interface ResourceMeta {
  label: string;
  emoji: string;
  /** Hex fill on the board. */
  fill: string;
}

export const RESOURCE_META: Record<Resource | "desert", ResourceMeta> = {
  wood: { label: "Wood", emoji: "🌲", fill: "#3f7d4e" },
  brick: { label: "Brick", emoji: "🧱", fill: "#c2603f" },
  sheep: { label: "Sheep", emoji: "🐑", fill: "#a6d06a" },
  wheat: { label: "Wheat", emoji: "🌾", fill: "#e8c547" },
  ore: { label: "Ore", emoji: "⛰️", fill: "#8a94a6" },
  desert: { label: "Desert", emoji: "🏜️", fill: "#e6d3a3" },
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

export const BUILD_EMOJI = {
  road: "🛣️",
  settlement: "🏠",
  city: "🏙️",
  dev: "🃏",
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
      return "No time limit. Your total time only breaks ties.";
    case "hand-tracker":
      return `${(REVEAL_MS * k) / 1000} s to memorise the hand, then ${TIERS.map((t) => HAND_TRACKER_RULES[t].events).join(" / ")} log lines, each shown about ${TIERS.map((t) => (HAND_TRACKER_PACE_S[t] * k).toFixed(1)).join(" / ")} s.`;
  }
}
