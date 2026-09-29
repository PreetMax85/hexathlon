"use client";

import { useEffect, useState } from "react";
import {
  describeEvent,
  RESOURCES,
  replayHand,
  type HandTrackerAnswer,
  type HandTrackerPuzzle,
  type Resource,
  type ResourceCounts,
} from "@/engine";
import { handPhaseAt, handPhaseAtStep, handPlaybackMs, logSummary } from "@/game/handTrackerFlow";
import { RESOURCE_META } from "@/game/meta";
import { emptyPad, PAD_VALUES, padKey, padTap, type PadState } from "@/game/numberPad";
import { Button } from "./ui";
import { now, usePuzzleClock } from "./useClock";

interface Props {
  puzzle: HandTrackerPuzzle;
  /** Fired once after the last question, with the counts and clock ms. */
  onAnswer: (answer: HandTrackerAnswer, ms: number) => void;
  /** Relaxed mode: the hand and each event stay until the player taps on. */
  tapPaced?: boolean;
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

export function HandTrackerPlay({ puzzle, onAnswer, tapPaced = false }: Props) {
  const [answers, setAnswers] = useState<number[]>([]);
  const [pad, setPad] = useState<PadState>(emptyPad);
  const [step, setStep] = useState(0);
  const finished = answers.length >= puzzle.questions.length;
  const { ready, elapsed, clockMs } = usePuzzleClock(finished);
  const playbackMs = handPlaybackMs(puzzle);
  const phase = tapPaced ? handPhaseAtStep(puzzle, step) : handPhaseAt(puzzle, elapsed);
  const asking = !ready && phase.kind === "ask";
  const qIndex = Math.min(answers.length, puzzle.questions.length - 1);
  const question = puzzle.questions[qIndex];

  const confirm = (value: number | null) => {
    if (!asking || finished || value === null) return;
    const next = [...answers, value];
    setAnswers(next);
    setPad(emptyPad);
    if (next.length === puzzle.questions.length) onAnswer(next, clockMs());
  };

  // Digit keys select, Enter confirms, Backspace clears. Space steps Relaxed playback.
  // Re-subscribes each render so the handler sees the current selection.
  useEffect(() => {
    if (ready || finished) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest("button, input, a")) {
        if (e.key === "Enter" || e.key === " ") return;
      }
      if (!asking) {
        if (tapPaced && (e.key === " " || e.key === "Enter")) {
          e.preventDefault();
          setStep((s) => s + 1);
        }
        return;
      }
      const r = padKey(pad, e.key, now());
      setPad(r.state);
      if (r.submit) confirm(r.state.value);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const hands = replayHand(puzzle);
  const finalHand = hands ? hands[hands.length - 1] : puzzle.startHand;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold leading-tight">Count your rival&apos;s cards.</h2>
        <p className="text-sm text-muted">
          Memorise the starting hand, keep a running count, then answer.
        </p>
      </div>

      {/* Screen readers hear one summary when the log ends, not every line live. */}
      <p className="sr-only" aria-live="polite">
        {asking && !finished ? logSummary(puzzle, qIndex) : ""}
      </p>

      {ready && (
        <p className="py-10 text-center text-2xl font-extrabold" aria-hidden>
          Ready…
        </p>
      )}

      {!ready && phase.kind === "reveal" && (
        <section aria-label="Rival's starting hand" className="anim-pop flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h3 className="font-bold">Rival&apos;s starting hand</h3>
            {!tapPaced && (
              <span className="tabular text-sm font-bold text-brand">
                {Math.max(0, Math.ceil((puzzle.revealMs - elapsed) / 1000))}s
              </span>
            )}
          </div>
          <HandTiles hand={puzzle.startHand} />
          {tapPaced ? (
            <Button onClick={() => setStep(1)}>Start the log</Button>
          ) : (
            <p className="text-center text-sm text-muted">Remember these. They disappear.</p>
          )}
        </section>
      )}

      {!ready && phase.kind === "events" && (
        <section aria-label="Game log" className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h3 className="font-bold">Game log</h3>
            <span className="tabular text-sm font-bold text-brand">
              {phase.index + 1} / {puzzle.events.length}
            </span>
          </div>
          {!tapPaced && (
            <div className="h-2 overflow-hidden rounded-full bg-surface-2" aria-hidden>
              <div
                className="h-full bg-brand"
                style={{ width: `${(Math.min(elapsed, playbackMs) - puzzle.revealMs) / (playbackMs - puzzle.revealMs) * 100}%` }}
              />
            </div>
          )}
          {/* Only the current line: the format trains a running count, not re-reading. */}
          <p
            key={phase.index}
            aria-hidden
            className="anim-slide rounded-xl border border-brand bg-surface px-4 py-4 text-lg font-bold"
          >
            {describeEvent(puzzle.events[phase.index])}
          </p>
          {tapPaced && <Button onClick={() => setStep((s) => s + 1)}>Next line</Button>}
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
            How many <span className="whitespace-nowrap">{RESOURCE_META[question].label.toLowerCase()}</span> does Rival hold?
          </h3>
          <ul className="grid grid-cols-5 gap-2" aria-label="Number pad">
            {PAD_VALUES.map((n) => (
              <li key={n}>
                <button
                  type="button"
                  onClick={() => setPad(padTap(pad, n))}
                  aria-pressed={pad.value === n}
                  className={`tabular min-h-12 w-full rounded-xl border text-xl font-bold ${
                    pad.value === n ? "border-ink bg-ink text-bg" : "border-line bg-surface"
                  }`}
                >
                  {n}
                </button>
              </li>
            ))}
          </ul>
          <Button disabled={pad.value === null} onClick={() => confirm(pad.value)}>
            {pad.value === null ? "Pick a count" : `Confirm ${pad.value}`}
          </Button>
          <p className="text-center text-xs text-muted">Tap or type 0–19, then confirm (Enter).</p>
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
