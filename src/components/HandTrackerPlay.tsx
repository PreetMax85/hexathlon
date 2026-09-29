"use client";

import { useEffect, useRef, useState } from "react";
import {
  describeEvent,
  MAX_COUNT,
  RESOURCES,
  replayHand,
  type HandTrackerAnswer,
  type HandTrackerPuzzle,
  type Resource,
  type ResourceCounts,
} from "@/engine";
import { handPhaseAt, handPlaybackMs } from "@/game/handTrackerFlow";
import { RESOURCE_META } from "@/game/meta";
import { PAD_VALUES } from "@/game/numberPad";
import { now, useElapsed } from "./useClock";

interface Props {
  puzzle: HandTrackerPuzzle;
  /** Fired once after the last question, with the counts and the time since the preview. */
  onAnswer: (answer: HandTrackerAnswer, ms: number) => void;
}

function HandTiles({ hand, highlight }: { hand: ResourceCounts; highlight?: readonly Resource[] }) {
  return (
    <ul className="grid grid-cols-5 gap-2">
      {RESOURCES.map((r) => (
        <li
          key={r}
          className={`flex flex-col items-center rounded-xl border py-2 ${
            highlight?.includes(r) ? "border-brand bg-brand/10" : "border-line bg-surface"
          }`}
        >
          <span aria-hidden className="text-2xl">{RESOURCE_META[r].emoji}</span>
          <span className="tabular text-2xl font-extrabold">{hand[r]}</span>
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
            {RESOURCE_META[r].label}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function HandTrackerPlay({ puzzle, onAnswer }: Props) {
  const [answers, setAnswers] = useState<number[]>([]);
  const finished = answers.length >= puzzle.questions.length;
  const playbackMs = handPlaybackMs(puzzle);
  const elapsed = useElapsed(!finished);
  const phase = handPhaseAt(puzzle, elapsed);
  const asking = phase.kind === "ask";

  // The puzzle's time runs from the preview to the last answer, so it can
  // never be shorter than the playback (the server enforces that floor).
  const startedAt = useRef<number | null>(null);
  useEffect(() => {
    startedAt.current = now();
  }, []);

  const pick = (n: number) => {
    if (!asking || finished) return;
    const next = [...answers, n];
    setAnswers(next);
    if (next.length === puzzle.questions.length) {
      onAnswer(next, now() - (startedAt.current ?? now()));
    }
  };

  const hands = replayHand(puzzle);
  const finalHand = hands ? hands[hands.length - 1] : puzzle.startHand;
  const question = puzzle.questions[Math.min(answers.length, puzzle.questions.length - 1)];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold leading-tight">Count your rival&apos;s cards.</h2>
        <p className="text-sm text-muted">
          Memorise the starting hand, follow every log line, then answer.
        </p>
      </div>

      {phase.kind === "reveal" && (
        <section aria-label="Rival's starting hand" className="anim-pop flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h3 className="font-bold">Rival&apos;s starting hand</h3>
            <span className="tabular text-sm font-bold text-brand">
              {Math.max(0, Math.ceil((puzzle.revealMs - elapsed) / 1000))}s
            </span>
          </div>
          <HandTiles hand={puzzle.startHand} />
          <p className="text-center text-sm text-muted">Remember these — they disappear.</p>
        </section>
      )}

      {phase.kind === "events" && (
        <section aria-label="Game log" className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h3 className="font-bold">Game log</h3>
            <span className="tabular text-sm font-bold text-brand">
              {phase.index + 1} / {puzzle.events.length}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full bg-brand"
              style={{ width: `${(Math.min(elapsed - puzzle.revealMs, playbackMs) / (playbackMs - puzzle.revealMs)) * 100}%` }}
            />
          </div>
          <ol className="flex flex-col gap-2" aria-live="polite">
            {[phase.index, phase.index - 1, phase.index - 2, phase.index - 3]
              .filter((i) => i >= 0)
              .map((i, rank) => (
                <li
                  key={i}
                  className={`rounded-xl border px-4 py-3 ${
                    rank === 0
                      ? "anim-slide border-brand bg-surface text-lg font-bold"
                      : "border-line bg-surface-2 text-sm text-muted"
                  }`}
                  style={rank > 0 ? { opacity: 1 - rank * 0.22 } : undefined}
                >
                  {describeEvent(puzzle.events[i])}
                </li>
              ))}
          </ol>
        </section>
      )}

      {asking && !finished && (
        <section aria-label="Question" className="anim-pop flex flex-col gap-3">
          {puzzle.questions.length > 1 && (
            <div className="text-xs font-bold uppercase tracking-wide text-muted">
              Question {answers.length + 1} of {puzzle.questions.length}
            </div>
          )}
          <h3 className="text-2xl font-extrabold leading-tight">
            How many <span className="whitespace-nowrap">{RESOURCE_META[question].emoji} {question}</span> does Rival hold?
          </h3>
          <ul className="grid grid-cols-5 gap-2" aria-label="Number pad">
            {PAD_VALUES.map((n) => (
              <li key={n}>
                <button
                  type="button"
                  onClick={() => pick(n)}
                  className="tabular min-h-14 w-full rounded-xl border border-line bg-surface text-xl font-bold active:scale-95 active:bg-brand active:text-brand-ink"
                >
                  {n}
                </button>
              </li>
            ))}
          </ul>
          <p className="text-center text-xs text-muted">Tap a number to lock in your answer (0–{MAX_COUNT}).</p>
        </section>
      )}

      {finished && (
        <section aria-label="Rival's final hand" className="anim-pop flex flex-col gap-3">
          <h3 className="font-bold">Rival&apos;s final hand</h3>
          <HandTiles hand={finalHand} highlight={puzzle.questions} />
          <p className="text-sm text-muted">
            You answered {answers.map((a, i) => `${a} ${puzzle.questions[i]}`).join(" and ")}.
          </p>
        </section>
      )}
    </div>
  );
}
