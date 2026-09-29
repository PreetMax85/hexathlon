"use client";

import { useMemo, useState } from "react";
import { generate, type Format, type HandTrackerPuzzle } from "@/engine";
import { verdict, type Verdict } from "@/game/verdict";
import { Feedback } from "./Feedback";
import { HandTrackerPlay } from "./HandTrackerPlay";
import { PipFlashPlay } from "./PipFlashPlay";
import { PortMathPlay } from "./PortMathPlay";
import { Button } from "./ui";

const STEPS: Record<Format, string[]> = {
  "pip-flash": [
    "Every number token shows dots (pips): 6 and 8 have 5, down to 2 and 12 with 1.",
    "A corner's score is the sum of pips on the hexes it touches.",
    "Tap the lettered corner with the highest score before the bar runs out.",
  ],
  "port-math": [
    "You can trade 4 of one card for 1 of another. A 3:1 port makes it 3, a matching 2:1 port makes it 2.",
    "Tap a resource's “→ 1” button, then tap the card you want.",
    "Cover the Build with the fewest trades, then press Build.",
  ],
  "hand-tracker": [
    "You see Rival's starting hand for 3 seconds.",
    "Then the game log plays: rolls, builds, trades and steals. Keep a running count.",
    "Tap the number of cards Rival holds of the resource asked.",
  ],
};

const DEMO_SEEDS = [11, 4, 23, 8, 35];

function Demo({ format }: { format: Format }) {
  const [round, setRound] = useState(0);
  const [result, setResult] = useState<Verdict | null>(null);
  const seed = DEMO_SEEDS[round % DEMO_SEEDS.length];

  const puzzle = useMemo(() => {
    if (format === "pip-flash") return generate("pip-flash", "easy", seed);
    if (format === "port-math") return generate("port-math", "easy", seed);
    // Shorter and slower than the real thing, so it is a friendly first try.
    const base = generate("hand-tracker", "easy", seed) as HandTrackerPuzzle;
    return { ...base, events: base.events.slice(0, 4), secondsPerEvent: 2 };
  }, [format, seed]);

  const answer = (a: unknown, ms: number) => setResult(verdict(puzzle, a, format === "pip-flash" ? 0 : ms));

  return (
    <div className="-mx-2 mt-4 flex flex-col gap-3 rounded-2xl border border-dashed border-line bg-bg p-2 sm:mx-0 sm:p-3">
      <div className="text-xs font-bold uppercase tracking-wide text-brand">Try it</div>
      <div key={`${format}-${round}`}>
        {puzzle.format === "pip-flash" && <PipFlashPlay puzzle={puzzle} onAnswer={answer} untimed />}
        {puzzle.format === "port-math" && <PortMathPlay puzzle={puzzle} onAnswer={answer} />}
        {puzzle.format === "hand-tracker" && <HandTrackerPlay puzzle={puzzle} onAnswer={answer} />}
      </div>
      {result && (
        <>
          <Feedback verdict={result} inline />
          <Button
            variant="secondary"
            onClick={() => {
              setResult(null);
              setRound((r) => r + 1);
            }}
          >
            Try another
          </Button>
        </>
      )}
    </div>
  );
}

/** One-screen explainer with a tappable, untimed example. Demo mounts only when opened. */
export function HowToPlay({ format }: { format: Format }) {
  const [open, setOpen] = useState(false);
  return (
    <details
      className="group rounded-xl border border-line bg-bg"
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 font-semibold">
        How to play
        <span aria-hidden className="text-muted transition-transform group-open:rotate-180">▾</span>
      </summary>
      <div className="px-3 pb-3 sm:px-4 sm:pb-4">
        <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm">
          {STEPS[format].map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        {open && <Demo format={format} />}
      </div>
    </details>
  );
}
