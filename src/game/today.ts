import { generateBoard, mixSeed, type Board } from "@/engine";
import { FORMATS, type Format } from "@/engine";
import { readResult, type KV, type LocalResult } from "./storage";

export const DAYS_KEY = "hexathlon:days";
/** Enough history for any streak worth showing, without growing forever. */
const DAYS_CAP = 400;
const DAY_MS = 86_400_000;

const dayNumber = (key: string) => Math.round(Date.parse(`${key}T00:00:00Z`) / DAY_MS);

function readDays(kv: KV): string[] {
  try {
    const raw = kv.getItem(DAYS_KEY);
    const days = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(days) ? days.filter((d): d is string => typeof d === "string") : [];
  } catch {
    return [];
  }
}

/** Remember that at least one Daily was finished on this UTC date. */
export function markDailyDay(kv: KV, dateKey: string): void {
  const days = readDays(kv);
  if (days.includes(dateKey)) return;
  const next = [...days, dateKey].sort().slice(-DAYS_CAP);
  try {
    kv.setItem(DAYS_KEY, JSON.stringify(next));
  } catch {
    // No storage: the streak just won't grow.
  }
}

/**
 * Consecutive UTC days with a finished Daily, ending today, or yesterday while
 * today's Daily is still open (the streak isn't lost until the day is).
 */
export function streakFrom(days: readonly string[], today: string): number {
  const set = new Set(days.map(dayNumber));
  let day = dayNumber(today);
  if (!set.has(day)) day -= 1;
  let n = 0;
  while (set.has(day)) {
    n++;
    day--;
  }
  return n;
}

export function readStreak(kv: KV, today: string): number {
  return streakFrom(readDays(kv), today);
}

export interface TodayStatus {
  dailies: { format: Format; result: LocalResult | null }[];
  /** The first Daily not played yet today, or null when all are done. */
  nextOpen: Format | null;
  allDone: boolean;
  streak: number;
}

/** Data for the home screen's Today strip. */
export function todayStatus(kv: KV, today: string): TodayStatus {
  const dailies = FORMATS.map((format) => ({ format, result: readResult(kv, format, "daily", today) }));
  const open = dailies.find((d) => !d.result);
  return {
    dailies,
    nextOpen: open?.format ?? null,
    allDone: !open,
    streak: readStreak(kv, today),
  };
}

/**
 * A board to show before play (the home island, share cards): drawn from its
 * own branch of the seed, so it is never a board anyone is timed on.
 */
export function coverBoard(seed: number): Board {
  return generateBoard(mixSeed(seed, "cover"));
}

/** The result stamp's line: a clean sweep gets its own. */
export function stampLine(correct: number, total: number, mode: "daily" | "rush"): string {
  if (correct === total) return "Clean passage";
  if (correct >= total * 0.6) return mode === "rush" ? "Passage complete" : "Daily done";
  return "Rough passage";
}

/** Every fifth right answer in a row gets a moment of its own. */
export const isMilestone = (combo: number): boolean => combo > 0 && combo % 5 === 0;
