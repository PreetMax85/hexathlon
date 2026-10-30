"use client";

import { useEffect, useId, useState } from "react";
import { DAILY_TIERS, FORMATS, type Format } from "@/engine";
import { fetchDaily, type ApiResult, type DailyBoardData } from "@/game/api";
import { useNowMinute, usePlayer, useTodayKey } from "@/game/browser";
import { FORMAT_META } from "@/game/meta";
import { LeaderboardView } from "./Leaderboard";
import { Button } from "./ui";

const REFRESH_MS = 3 * 60_000;

/** One board per format, day and viewer. Refresh failures keep the last good scores. */
function DailyRankings({ format, playerId }: { format: Format; playerId: string | null }) {
  const [result, setResult] = useState<ApiResult<DailyBoardData>>();
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [refreshFailed, setRefreshFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const now = useNowMinute();

  useEffect(() => {
    let alive = true;
    let busy = false;
    async function refresh() {
      if (document.visibilityState === "hidden" || busy) return;
      busy = true;
      const next = await fetchDaily(format, playerId);
      busy = false;
      if (!alive) return;
      setResult((previous) => previous?.ok && !next.ok ? previous : next);
      setRefreshFailed(!next.ok);
      if (next.ok) setUpdatedAt(Date.now());
    }
    void refresh();
    const timer = window.setInterval(() => void refresh(), REFRESH_MS);
    const onReturn = () => void refresh();
    document.addEventListener("visibilitychange", onReturn);
    window.addEventListener("focus", onReturn);
    return () => {
      alive = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onReturn);
      window.removeEventListener("focus", onReturn);
    };
  }, [format, playerId, attempt]);

  const minutes = now !== null && updatedAt !== null ? Math.max(0, Math.floor((now - updatedAt) / 60_000)) : 0;
  const retry = () => setAttempt((n) => n + 1);
  return (
    <LeaderboardView
      title={`${FORMAT_META[format].name} rankings`}
      hideHeading
      result={result}
      onRetry={retry}
      total={DAILY_TIERS.length}
      limit={5}
      empty="No scores yet today. Finish a Daily to set the first mark."
      footer={
        <div className="flex min-h-11 items-center justify-between gap-3 pt-2 text-s text-ink-2">
          <p role="status">
            {result?.ok && refreshFailed
              ? "Refresh failed. Showing the last loaded scores."
              : updatedAt !== null
                ? `Updated ${minutes < 1 ? "just now" : `${minutes} min ago`} · Refreshes every 3 min`
                : "Top five · Most correct, then fastest"}
          </p>
          {result?.ok && refreshFailed && (
            <Button variant="ghost" className="shrink-0 px-0" onClick={retry}>Retry</Button>
          )}
        </div>
      }
    />
  );
}

/** A compact, periodically refreshed Daily leaderboard. No account needed to browse. */
export function HomeLeaderboard() {
  const [format, setFormat] = useState<Format>("pip-flash");
  const today = useTodayKey();
  const player = usePlayer();
  const id = useId();
  return (
    <section aria-labelledby={`${id}-title`} className="flex flex-col gap-3">
      <h2 id={`${id}-title`} className="sea text-l">Today&apos;s leaderboard</h2>
      <div role="tablist" aria-label="Leaderboard format" className="grid grid-cols-3 gap-1 border-b border-hair pb-3">
        {FORMATS.map((f, i) => (
          <button
            key={f}
            type="button"
            role="tab"
            id={`${id}-${f}`}
            aria-selected={format === f}
            aria-controls={`${id}-panel`}
            tabIndex={format === f ? 0 : -1}
            className={`min-h-11 rounded-md px-2 text-s font-bold ${format === f ? "bg-ink text-paper" : "text-ink-2 hover:bg-shoal-2"}`}
            onClick={() => setFormat(f)}
            onKeyDown={(event) => {
              const index = event.key === "ArrowRight" ? (i + 1) % FORMATS.length
                : event.key === "ArrowLeft" ? (i + FORMATS.length - 1) % FORMATS.length
                  : event.key === "Home" ? 0 : event.key === "End" ? FORMATS.length - 1 : null;
              if (index === null) return;
              event.preventDefault();
              setFormat(FORMATS[index]);
              document.getElementById(`${id}-${FORMATS[index]}`)?.focus();
            }}
          >
            {FORMAT_META[f].name}
          </button>
        ))}
      </div>
      <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-${format}`} tabIndex={0} className="min-h-32">
        {today !== null && player !== undefined ? (
          <DailyRankings key={`${format}:${today}:${player?.id ?? "guest"}`} format={format} playerId={player?.id ?? null} />
        ) : (
          <p className="py-3 text-ink-2" role="status">Loading today&apos;s rankings…</p>
        )}
      </div>
    </section>
  );
}
