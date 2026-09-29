import type { Format } from "@/engine";

const STEPS: Record<Format, string[]> = {
  "pip-flash": [
    "Every number token shows dots (pips): 6 and 8 have 5, down to 2 and 12 with 1.",
    "A corner's score is the sum of pips on the hexes it touches.",
    "Tap the lettered corner with the highest score before the clock runs out.",
  ],
  "port-math": [
    "You can trade 4 of one card for 1 of another. A 3:1 port makes it 3, a matching 2:1 port makes it 2.",
    "You see your hand, what to build and your trade rates.",
    "Tap the fewest trades it takes to afford the build. No clock: time only breaks ties.",
  ],
  "hand-tracker": [
    "You see Rival's starting hand for 3 seconds.",
    "Then the game log plays: rolls, builds, trades and steals. Easy and medium name the card to track; hard keeps it a surprise.",
    "Pick how many of the asked resource Rival holds, then confirm. Digit keys and Enter work too.",
  ],
};

/** The rules in three lines. New players warm up with a Rush, not a demo. */
export function HowToPlay({ format }: { format: Format }) {
  return (
    <details className="group">
      <summary className="flex min-h-11 w-fit cursor-pointer list-none items-center gap-2 font-semibold">
        <svg width={12} height={12} viewBox="0 0 12 12" aria-hidden className="transition-transform group-open:rotate-90">
          <path d="M3 1.5 8 6l-5 4.5" fill="none" stroke="currentColor" strokeWidth={1.8} />
        </svg>
        How to play
      </summary>
      <div className="pb-2">
        <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-s">
          {STEPS[format].map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        <p className="mt-2 text-s text-ink-2">New to it? Warm up with a Rush before the Daily.</p>
      </div>
    </details>
  );
}
