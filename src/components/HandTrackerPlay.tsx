"use client";

import { useEffect, useState } from "react";
import {
  describeEvent,
  handTrackerPlaybackMs,
  RESOURCES,
  replayHand,
  type HandTrackerAnswer,
  type HandTrackerPuzzle,
  type Resource,
  type ResourceCounts,
} from "@/engine";
import { handPhaseAt, handPhaseAtStep, logSummary, logWindow, trackedFromStart } from "@/game/handTrackerFlow";
import { RESOURCE_META } from "@/game/meta";
import { emptyPad, PAD_VALUES, padKey, padTap, type PadState } from "@/game/numberPad";
import { CountLog } from "./CountLog";
import { Glyph } from "./glyphs";
import { Button, RangeDial } from "./ui";
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
    <ul className="grid grid-cols-5 border-y border-ink">
      {RESOURCES.map((r) => (
        <li
          key={r}
          className={`flex flex-col items-center gap-0.5 border-r border-hair py-2 last:border-r-0 ${
            highlight?.includes(r) ? "bg-shoal-2" : ""
          }`}
        >
          <Glyph name={r} size={22} className="text-ink-2" />
          <span className="text-l font-bold condensed">{hand[r]}</span>
          <span className="label text-ink-2">{RESOURCE_META[r].label}</span>
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
  const playbackMs = handTrackerPlaybackMs(puzzle);
  const phase = tapPaced ? handPhaseAtStep(puzzle, step) : handPhaseAt(puzzle, elapsed);
  const asking = !ready && phase.kind === "ask";
  const qIndex = Math.min(answers.length, puzzle.questions.length - 1);
  const question = puzzle.questions[qIndex];
  const tracked = trackedFromStart(puzzle);

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
      // Enter confirms here; stop it also pressing the Next button that takes focus next.
      if (e.key === "Enter") e.preventDefault();
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
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="font-bold">Count your rival&apos;s cards.</h2>
        {tracked.length > 0 ? (
          <span className="flex items-center gap-1.5 rounded-md bg-shoal-2 px-2 py-1 text-s font-bold">
            Tracking
            {tracked.map((r) => (
              <span key={r} className="inline-flex items-center gap-1">
                <Glyph name={r} size={16} />
                {RESOURCE_META[r].label.toLowerCase()}
              </span>
            ))}
          </span>
        ) : (
          <span className="text-s text-ink-2">Track every card: the question is a surprise.</span>
        )}
      </div>

      {/*
        Timed playback: screen readers hear one summary when the log ends, not
        lines talking over each other. Relaxed (tap-paced) playback reads each
        line as the player steps to it, so the format stays playable by ear.
      */}
      <p className="sr-only" aria-live="polite">
        {asking && !finished
          ? logSummary(puzzle, qIndex)
          : tapPaced && !ready && phase.kind === "events"
            ? `Line ${phase.index + 1} of ${puzzle.events.length}: ${describeEvent(puzzle.events[phase.index])}`
            : ""}
      </p>

      {/* The hand shows during the steady beat too; its clock starts after. */}
      {(ready || phase.kind === "reveal") && (
        <section aria-label="Rival's starting hand" className="anim-pop flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h3 className="sea">Rival&apos;s starting hand</h3>
            {!tapPaced && (
              <span className="text-s font-bold text-accent">
                {ready ? "Steady" : `${Math.max(0, Math.ceil((puzzle.revealMs - elapsed) / 1000))} s`}
              </span>
            )}
          </div>
          <HandTiles hand={puzzle.startHand} />
          {tapPaced ? (
            <Button onClick={() => setStep(1)} disabled={ready}>Start the log</Button>
          ) : (
            <p className="text-center text-s text-ink-2">Remember these. They disappear.</p>
          )}
        </section>
      )}

      {!ready && phase.kind === "events" && (
        <section aria-label="Game log" className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="sea">Log</h3>
            <span className="flex items-center gap-2 text-s font-bold">
              {phase.index + 1} / {puzzle.events.length}
              {!tapPaced && (
                <RangeDial
                  fraction={1 - (Math.min(elapsed, playbackMs) - puzzle.revealMs) / (playbackMs - puzzle.revealMs)}
                  label="Log remaining"
                />
              )}
            </span>
          </div>
          {/* The current line, with the one before faded above it (hard shows only the current). */}
          <div aria-hidden className="flex flex-col">
            {logWindow(puzzle, phase.index).map((i) =>
              i === phase.index ? (
                <p key={i} className="anim-slide border-y-2 border-ink bg-deep px-4 py-5 text-l font-semibold leading-snug">
                  {describeEvent(puzzle.events[i])}
                </p>
              ) : (
                <p key={i} className="px-4 pb-2 text-s text-ink-2">
                  {describeEvent(puzzle.events[i])}
                </p>
              ),
            )}
          </div>
          {tapPaced && <Button onClick={() => setStep((s) => s + 1)}>Next line</Button>}
        </section>
      )}

      {asking && !finished && (
        <section aria-label="Question" className="anim-pop flex flex-col gap-3">
          {puzzle.questions.length > 1 && (
            <div className="label text-ink-2">
              Question {answers.length + 1} of {puzzle.questions.length}
            </div>
          )}
          <h3 className="flex items-center gap-2 text-l font-bold leading-tight">
            <Glyph name={question} size={26} className="shrink-0 text-ink-2" />
            <span>How many {RESOURCE_META[question].label.toLowerCase()} does Rival hold?</span>
          </h3>
          <ul className="grid grid-cols-5 gap-1.5" aria-label="Number pad">
            {PAD_VALUES.map((n) => (
              <li key={n}>
                <button
                  type="button"
                  onClick={() => setPad(padTap(pad, n))}
                  aria-pressed={pad.value === n}
                  className={`min-h-12 w-full text-l font-semibold condensed ${
                    pad.value === n ? "bg-accent text-on-accent" : "bg-deep ring-1 ring-inset ring-hair hover:ring-ink"
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
          <p className="text-center text-s text-ink-2">Tap or type 0–19, then confirm (Enter).</p>
        </section>
      )}

      {finished && (
        <section aria-label="Rival's final hand" className="anim-pop flex flex-col gap-3">
          <h3 className="sea">Rival&apos;s final hand</h3>
          <HandTiles hand={finalHand} highlight={puzzle.questions} />
          <p className="text-s text-ink-2">
            You answered {answers.map((a, i) => `${a} ${puzzle.questions[i]}`).join(" and ")}.
          </p>
          {/* A miss shows where the count moved, line by line: that's where it slipped. */}
          {answers.some((a, i) => a !== finalHand[puzzle.questions[i]]) && <CountLog puzzle={puzzle} />}
        </section>
      )}
    </div>
  );
}
