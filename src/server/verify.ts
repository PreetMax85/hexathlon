import {
  dailySeed,
  isFormat,
  isMode,
  scoreRun,
  utcDateKey,
  type Format,
  type Mode,
  type RunScore,
} from "@/engine";

/** Random ids kept in localStorage: UUIDs or the `p-…` fallback. */
export const PLAYER_ID = /^[A-Za-z0-9_-]{8,64}$/;
export const CHALLENGE_ID = /^[A-Za-z0-9]{6,16}$/;
export const NICKNAME_MAX = 20;

export type Parsed<T> = { ok: true; value: T } | { ok: false; status: number; error: string };

const bad = (error: string, status = 400): { ok: false; status: number; error: string } => ({
  ok: false,
  status,
  error,
});

const isObject = (x: unknown): x is Record<string, unknown> =>
  typeof x === "object" && x !== null && !Array.isArray(x);

export function isSeed(x: unknown): x is number {
  return typeof x === "number" && Number.isInteger(x) && x >= 0 && x <= 0xffffffff;
}

export interface PlayerBody {
  id: string;
  nickname: string;
}

export function cleanNickname(raw: string): string {
  // Strip control characters and collapse whitespace.
  return raw.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, NICKNAME_MAX);
}

export function parsePlayerBody(body: unknown): Parsed<PlayerBody> {
  if (!isObject(body)) return bad("body must be an object");
  if (typeof body.id !== "string" || !PLAYER_ID.test(body.id)) return bad("invalid player id");
  if (typeof body.nickname !== "string") return bad("nickname is required");
  const nickname = cleanNickname(body.nickname);
  if (!nickname) return bad("nickname is required");
  return { ok: true, value: { id: body.id, nickname } };
}

export interface ResultBody {
  playerId: string;
  format: Format;
  mode: Mode;
  seed: number;
  answers: unknown[];
  times: unknown[];
  challengeId: string | null;
}

export function parseResultBody(body: unknown): Parsed<ResultBody> {
  if (!isObject(body)) return bad("body must be an object");
  const { playerId, format, mode, seed, answers, times, challengeId } = body;
  if (typeof playerId !== "string" || !PLAYER_ID.test(playerId)) return bad("invalid player id");
  if (!isFormat(format)) return bad("unknown format");
  if (!isMode(mode)) return bad("unknown mode");
  if (!isSeed(seed)) return bad("invalid seed");
  if (!Array.isArray(answers) || !Array.isArray(times)) return bad("answers and times must be arrays");
  if (challengeId !== undefined && challengeId !== null) {
    if (typeof challengeId !== "string" || !CHALLENGE_ID.test(challengeId)) return bad("invalid challenge id");
  }
  return {
    ok: true,
    value: { playerId, format, mode, seed, answers, times, challengeId: (challengeId as string | null | undefined) ?? null },
  };
}

/** How long after 00:00 UTC yesterday's Daily is still accepted. */
export const DAILY_GRACE_MS = 15 * 60 * 1000;

/**
 * UTC dates whose Daily may be submitted at `now`: today, plus yesterday for
 * a short grace window so a mini-run that straddles midnight still counts.
 */
export function dailyDatesAt(now: Date): string[] {
  const today = utcDateKey(now);
  const sinceMidnight = now.getTime() - Date.parse(`${today}T00:00:00Z`);
  if (sinceMidnight >= DAILY_GRACE_MS) return [today];
  return [today, utcDateKey(new Date(now.getTime() - DAILY_GRACE_MS))];
}

export interface VerifyContext {
  /** UTC dates (YYYY-MM-DD) whose Daily is accepted now, from `dailyDatesAt`. */
  dailyDates: readonly string[];
  /** The challenge named by the body, if the server found it. */
  challenge: { format: string; seed: number } | null;
}

/**
 * Recompute a submitted run from its seed. The client's claimed score is
 * never read: correctness comes only from `scoreRun` on the seed's puzzles.
 */
export function verifyResult(body: ResultBody, ctx: VerifyContext): Parsed<RunScore> {
  if (body.mode === "daily") {
    if (body.challengeId) return bad("a Daily cannot belong to a challenge");
    if (!ctx.dailyDates.some((d) => body.seed === dailySeed(body.format, d))) {
      return bad("not today's Daily puzzle", 409);
    }
  } else if (body.challengeId) {
    if (!ctx.challenge) return bad("challenge not found", 404);
    if (ctx.challenge.format !== body.format || ctx.challenge.seed !== body.seed) {
      return bad("run does not match the challenge");
    }
  }
  const score = scoreRun(body.format, body.mode, body.seed, body.answers, body.times);
  if (!score) return bad("malformed answers or times");
  return { ok: true, value: score };
}

export interface ChallengeBody {
  playerId: string;
  format: Format;
  seed: number;
}

export function parseChallengeBody(body: unknown): Parsed<ChallengeBody> {
  if (!isObject(body)) return bad("body must be an object");
  const { playerId, format, seed } = body;
  if (typeof playerId !== "string" || !PLAYER_ID.test(playerId)) return bad("invalid player id");
  if (!isFormat(format)) return bad("unknown format");
  if (!isSeed(seed)) return bad("invalid seed");
  return { ok: true, value: { playerId, format, seed } };
}
