import type { Format, Resource, Tier } from "@/engine";

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
