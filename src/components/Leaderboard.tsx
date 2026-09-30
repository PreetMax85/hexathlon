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
    <section aria-label={title} className="flex flex-col">
      <div className="border-b border-ink pb-1.5">
        <h2 className="sea text-l">{title}</h2>
      </div>
      {result === undefined ? (
        <ul className="flex flex-col" aria-busy="true" aria-label="Loading leaderboard">
          {[0, 1, 2].map((i) => (
            <li key={i} className="hatch h-11 border-b border-hair" />
          ))}
        </ul>
      ) : !result.ok ? (
        <div className="flex flex-col items-start gap-1 py-3">
          <p className="text-s text-red">Couldn&apos;t load the leaderboard. {result.error}</p>
          <Button variant="ghost" className="min-h-11 px-0" onClick={onRetry}>
            Try again
          </Button>
        </div>
      ) : result.data.entries.length === 0 ? (
        <p className="sea py-3 text-s text-ink-2">{empty}</p>
      ) : (
        <ol className="flex flex-col">
          {result.data.entries.slice(0, limit).map((e, i) => (
            <li
              key={`${e.rank}-${e.nickname}-${i}`}
              className={`flex min-h-11 items-center gap-3 border-b border-hair px-1 ${e.mine ? "bg-shoal-2 font-bold" : ""}`}
            >
              <span className="w-6 text-center font-bold text-ink-2">{e.rank}</span>
              <span className="min-w-0 flex-1 truncate">
                {e.nickname}
                {e.mine && <span className="sea ml-2 text-s font-semibold text-accent">you</span>}
              </span>
              <span className="font-bold">
                {e.correct}/{total}
              </span>
              <span className="w-12 text-right text-s text-ink-2">{formatClock(e.totalMs)}</span>
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
      empty="No scores yet today. Yours could be the first."
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
