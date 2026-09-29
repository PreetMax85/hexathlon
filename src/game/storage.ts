import type { Format, Mode } from "@/engine";

/** Minimal Storage surface so tests can inject a fake. */
export interface KV {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface Player {
  id: string;
  nickname: string;
}

export interface LocalResult {
  correct: number;
  total: number;
  totalMs: number;
  marks: boolean[];
  seed: number;
  /** Kept so an unsent Daily can be submitted again (e.g. after being offline). */
  answers?: unknown[];
  times?: number[];
  /** True once the server has this result. */
  synced?: boolean;
  /** Played in Relaxed mode: local only, never ranked or sent. */
  relaxed?: boolean;
}

export const PLAYER_KEY = "hexathlon:player";
const RESULT_PREFIX = "hexathlon:result:";
export const NICKNAME_MAX = 20;

export function cleanNickname(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, NICKNAME_MAX);
}

export function newPlayerId(): string {
  const c = globalThis.crypto;
  if (c && "randomUUID" in c) return c.randomUUID();
  return `p-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

export function readPlayer(kv: KV): Player | null {
  return safe(() => {
    const raw = kv.getItem(PLAYER_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<Player>;
    return typeof p.id === "string" && typeof p.nickname === "string" && p.nickname
      ? { id: p.id, nickname: p.nickname }
      : null;
  }, null);
}

/** Save a nickname, keeping the existing player id when there is one. */
export function savePlayer(kv: KV, nickname: string): Player | null {
  const clean = cleanNickname(nickname);
  if (!clean) return null;
  const player = { id: readPlayer(kv)?.id ?? newPlayerId(), nickname: clean };
  safe(() => kv.setItem(PLAYER_KEY, JSON.stringify(player)), undefined);
  return player;
}

export function resultKey(format: Format, mode: Mode, tag: string): string {
  return `${RESULT_PREFIX}${format}:${mode}:${tag}`;
}

/** Daily results are keyed by UTC date; Rush keeps the best run per format under "best". */
export function readResult(kv: KV, format: Format, mode: Mode, tag: string): LocalResult | null {
  return safe(() => {
    const raw = kv.getItem(resultKey(format, mode, tag));
    return raw ? (JSON.parse(raw) as LocalResult) : null;
  }, null);
}

export function saveResult(
  kv: KV,
  format: Format,
  mode: Mode,
  tag: string,
  result: LocalResult,
): void {
  safe(() => kv.setItem(resultKey(format, mode, tag), JSON.stringify(result)), undefined);
}

/** More correct wins; equal correct → less time wins. */
export function isBetter(a: LocalResult, b: LocalResult | null): boolean {
  if (!b) return true;
  return a.correct > b.correct || (a.correct === b.correct && a.totalMs < b.totalMs);
}

/** Keep the better Rush run. Returns true if `result` is the new best. */
export function saveRushBest(kv: KV, format: Format, result: LocalResult): boolean {
  const best = readResult(kv, format, "rush", "best");
  if (!isBetter(result, best)) return false;
  saveResult(kv, format, "rush", "best", result);
  return true;
}
