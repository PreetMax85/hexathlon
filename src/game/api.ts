import type { Format, Mode } from "@/engine";
import type { Player } from "./storage";

/** Row of a leaderboard as the API returns it (never includes player ids). */
export interface BoardEntry {
  rank: number;
  nickname: string;
  correct: number;
  totalMs: number;
  mine: boolean;
}

export interface SavedResult {
  id: number;
  correct: number;
  total: number;
  totalMs: number;
  marks: boolean[];
}

export interface DailyBoardData {
  format: Format;
  date: string;
  seed: number;
  entries: BoardEntry[];
}

export interface ChallengeData {
  id: string;
  format: Format;
  seed: number;
  createdBy: string;
  entries: BoardEntry[];
}

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string; body?: Record<string, unknown> };

type Fetch = typeof fetch;

/** JSON call that never throws: network failures come back as status 0. */
export async function call<T>(
  path: string,
  init?: RequestInit & { json?: unknown },
  fetchImpl: Fetch = (...args) => fetch(...args),
): Promise<ApiResult<T>> {
  try {
    const { json, ...rest } = init ?? {};
    const res = await fetchImpl(path, {
      ...rest,
      ...(json !== undefined
        ? { method: rest.method ?? "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(json) }
        : {}),
    });
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      // Non-JSON error page (e.g. a gateway timeout).
    }
    if (res.ok) return { ok: true, data: body as T };
    const obj = (body ?? {}) as Record<string, unknown>;
    return {
      ok: false,
      status: res.status,
      error: typeof obj.error === "string" ? obj.error : `request failed (${res.status})`,
      body: obj,
    };
  } catch {
    return { ok: false, status: 0, error: "You appear to be offline." };
  }
}

const registered = new Set<string>();

/** Register the player with the server once per (id, nickname) per page load. */
export async function ensurePlayer(player: Player, fetchImpl?: Fetch): Promise<ApiResult<Player>> {
  const key = `${player.id}:${player.nickname}`;
  if (registered.has(key)) return { ok: true, data: player };
  const res = await call<Player>("/api/players", { json: { id: player.id, nickname: player.nickname } }, fetchImpl);
  if (res.ok) registered.add(key);
  return res;
}

export interface SubmitBody {
  playerId: string;
  format: Format;
  mode: Mode;
  seed: number;
  answers: unknown[];
  times: number[];
  challengeId?: string | null;
}

export const submitResult = (body: SubmitBody, fetchImpl?: Fetch) =>
  call<SavedResult>("/api/results", { json: body }, fetchImpl);

const withViewer = (path: string, playerId: string | null) =>
  playerId ? `${path}?playerId=${encodeURIComponent(playerId)}` : path;

export const fetchDaily = (format: Format, playerId: string | null, fetchImpl?: Fetch) =>
  call<DailyBoardData>(withViewer(`/api/daily/${format}`, playerId), { cache: "no-store" }, fetchImpl);

export const fetchChallenge = (id: string, playerId: string | null, fetchImpl?: Fetch) =>
  call<ChallengeData>(withViewer(`/api/challenges/${encodeURIComponent(id)}`, playerId), { cache: "no-store" }, fetchImpl);

export const createChallenge = (body: { playerId: string; format: Format; seed: number }, fetchImpl?: Fetch) =>
  call<{ id: string }>("/api/challenges", { json: body }, fetchImpl);

/** Full URL of a challenge page for sharing. */
export function challengeUrl(origin: string, id: string): string {
  return `${origin}/c/${id}`;
}
