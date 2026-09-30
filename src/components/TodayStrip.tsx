"use client";

import Link from "next/link";
import { useMemo } from "react";
import { dailySeed, FORMATS, type Format } from "@/engine";
import { useLocalResult, useNowMinute, useStreak, useTodayKey } from "@/game/browser";
import { FORMAT_META } from "@/game/meta";
import { coverBoard } from "@/game/today";
import { formatClock, formatCountdown, untilNextDaily } from "@/game/time";
import { Board } from "./Board";
import { BOARD_BLEED } from "./PipFlashPlay";
import { Buoy } from "./glyphs";
import { ButtonLink } from "./ui";

/** Today's island: a board of its own for the day, never one a Daily is scored on. */
export function IslandPlate() {
  const today = useTodayKey();
  const board = useMemo(() => (today ? coverBoard(dailySeed("pip-flash", today)) : null), [today]);
  return (
    <figure className="flex flex-col gap-1.5">
      {board ? (
        <Board board={board} className={BOARD_BLEED} label="Today's island" />
      ) : (
        <div className="hatch aspect-[1.05] w-full rounded-lg" aria-hidden />
      )}
      <figcaption className="sea text-s text-ink-2">Today&apos;s island. Same board for every player.</figcaption>
    </figure>
  );
}

/** A played Daily: an ink tick, neutral whatever the score (cones mean "right"). */
function ChartedMark() {
  return (
    <svg width={26} height={26} viewBox="0 0 24 24" aria-hidden>
      <circle cx={12} cy={13} r={8} fill="var(--ink)" />
      <path d="M8.2 13.2l2.6 2.6 5-5.4" fill="none" stroke="var(--paper)" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** One row per drill: today's Daily (open or done) and a Rush, side by side. */
function DailyRow({ format, today }: { format: Format; today: string | null }) {
  const result = useLocalResult(format, "daily", today);
  return (
    <li className="flex items-stretch gap-2 border-b border-hair">
      <Link href={`/play/${format}/daily`} className="group flex min-h-16 flex-1 items-center gap-3 py-2 hover:bg-shoal-2">
        {result ? <ChartedMark /> : <Buoy kind="current" size={26} />}
        <span className="min-w-0 flex-1">
          <span className="block font-bold">{FORMAT_META[format].name}</span>
          <span className="block text-s text-ink-2">
            {result === undefined ? " " : result ? (
              <>
                Daily done · <b className="text-ink">{result.correct}/{result.total}</b> in {formatClock(result.totalMs)}
                {result.relaxed && <span className="sea"> · relaxed</span>}
              </>
            ) : (
              `Daily open · ${FORMAT_META[format].skill.toLowerCase()}`
            )}
          </span>
        </span>
      </Link>
      <Link
        href={`/play/${format}/rush`}
        className="my-2 flex min-h-11 min-w-16 items-center justify-center rounded-md border border-ink px-3 text-s font-bold hover:bg-shoal-2"
        aria-label={`${FORMAT_META[format].name} Rush`}
      >
        Rush
      </Link>
    </li>
  );
}

/** Home's lead: today's three Dailies, done or open, and the days-at-sea streak. */
export function TodayStrip() {
  const today = useTodayKey();
  const streak = useStreak(today);
  const now = useNowMinute();
  const r0 = useLocalResult("pip-flash", "daily", today);
  const r1 = useLocalResult("port-math", "daily", today);
  const r2 = useLocalResult("hand-tracker", "daily", today);
  const anyDone = !!(r0 || r1 || r2);
  return (
    <section aria-labelledby="today-title" className="flex flex-col">
      <div className="flex items-end justify-between gap-4 border-b border-ink pb-2">
        <h2 id="today-title" className="sea text-l">Today&apos;s Dailies</h2>
        {/* A first visit has no streak to show yet; from day one it counts. */}
        {!!streak && (
          <div className="flex shrink-0 flex-col items-center rounded-md border border-hair bg-deep px-3 py-1.5" aria-label={`${streak} ${streak === 1 ? "day" : "days"} at sea`}>
            <b className="text-l leading-none condensed">{streak}</b>
            <span className="mt-0.5 text-s text-ink-2">{streak === 1 ? "day" : "days"} at sea</span>
          </div>
        )}
      </div>
      <ul>
        {FORMATS.map((f) => (
          <DailyRow key={f} format={f} today={today} />
        ))}
      </ul>
      {anyDone && now !== null && (
        <p className="pt-2 text-s text-ink-2">
          New Dailies in <b className="text-ink">{formatCountdown(untilNextDaily(new Date(now)))}</b> (00:00 UTC).
        </p>
      )}
    </section>
  );
}

function NextDailyAction() {
  const today = useTodayKey();
  const now = useNowMinute();
  const r0 = useLocalResult("pip-flash", "daily", today);
  const r1 = useLocalResult("port-math", "daily", today);
  const r2 = useLocalResult("hand-tracker", "daily", today);
  if (r0 === undefined || r1 === undefined || r2 === undefined) return <div className="min-h-12" />;
  const results = [r0, r1, r2];
  const open = FORMATS.find((_, i) => !results[i]);
  if (open) {
    return (
      <ButtonLink href={`/play/${open}/daily`} className="w-full">
        Sail the {FORMAT_META[open].name} Daily
      </ButtonLink>
    );
  }
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-s text-ink-2">
        All three done.{now !== null && <> Next in <b className="text-ink">{formatCountdown(untilNextDaily(new Date(now)))}</b>.</>}
      </p>
      <ButtonLink href="/play/pip-flash/rush" variant="secondary" className="shrink-0">
        Rush
      </ButtonLink>
    </div>
  );
}

/** The primary action, held in the thumb zone on phones. */
export function ThumbAction() {
  return (
    <div className="sticky bottom-0 z-20 -mx-4 border-t border-hair bg-paper px-4 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:static lg:mx-0 lg:border-t-0 lg:bg-transparent lg:p-0">
      <NextDailyAction />
    </div>
  );
}
