"use client";

import type { ApiResult, BoardEntry, ChallengeData, DailyBoardData } from "@/game/api";
import { fetchChallenge, fetchDaily } from "@/game/api";
import { DAILY_TIERS, RUSH_LENGTH, type Format } from "@/engine";
import { formatClock } from "@/game/time";
import { Button } from "./ui";
import { useFetched } from "./useFetched";

interface ViewProps {
  title: string;
  result: ApiResult<{ entries: BoardEntry[] }> | undefined;
  onRetry: () => void;
  /** Puzzles per run, to format scores (5 for Daily, 13 for Rush). */
  total: number;
  limit?: number;
  empty: string;
}

function LeaderboardView({ title, result, onRetry, total, limit, empty }: ViewProps) {
  return (
    <section aria-label={title} className="rounded-2xl border border-line bg-surface p-4">
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">{title}</h3>
      {result === undefined ? (
        <ul className="flex flex-col gap-2" aria-busy="true" aria-label="Loading leaderboard">
          {[0, 1, 2].map((i) => (
            <li key={i} className="h-11 animate-pulse rounded-lg bg-surface-2" />
          ))}
        </ul>
      ) : !result.ok ? (
        <div className="flex flex-col items-start gap-2">
          <p className="text-sm text-bad">Couldn&apos;t load the leaderboard. {result.error}</p>
          <Button variant="secondary" className="min-h-11 px-4" onClick={onRetry}>
            Try again
          </Button>
        </div>
      ) : result.data.entries.length === 0 ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        <ol className="flex flex-col gap-1.5">
          {result.data.entries.slice(0, limit).map((e, i) => (
            <li
              key={`${e.rank}-${e.nickname}-${i}`}
              className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-1.5 ${
                e.mine ? "bg-brand/15 font-bold ring-1 ring-brand" : "bg-surface-2"
              }`}
            >
              <span className="tabular w-6 text-center font-black text-muted">{e.rank}</span>
              <span className="min-w-0 flex-1 truncate">
                {e.nickname}
                {e.mine && <span className="ml-2 rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold uppercase text-brand-ink">You</span>}
              </span>
              <span className="tabular font-bold">
                {e.correct}/{total}
              </span>
              <span className="tabular w-14 text-right text-sm text-muted">
                {formatClock(e.totalMs)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/** Today's Daily leaderboard: correctness first, then time. */
export function DailyBoard({ format, playerId, refreshKey }: { format: Format; playerId: string | null; refreshKey: string }) {
  const { result, retry } = useFetched(`daily:${format}:${refreshKey}`, () => fetchDaily(format, playerId));
  return (
    <LeaderboardView
      title="Today's leaderboard"
      result={result as ApiResult<DailyBoardData> | undefined}
      onRetry={retry}
      total={DAILY_TIERS.length}
      limit={20}
      empty="No scores yet. Yours could be the first."
    />
  );
}

/** A challenge's leaderboard (each player's best run). */
export function ChallengeBoard({
  id,
  playerId,
  refreshKey,
  limit,
}: {
  id: string;
  playerId: string | null;
  refreshKey: string;
  limit?: number;
}) {
  const { result, retry } = useFetched(`challenge:${id}:${refreshKey}`, () => fetchChallenge(id, playerId));
  return (
    <LeaderboardView
      title="Challenge leaderboard"
      result={result as ApiResult<ChallengeData> | undefined}
      onRetry={retry}
      total={RUSH_LENGTH}
      limit={limit ?? 20}
      empty="Nobody has finished this challenge yet."
    />
  );
}
