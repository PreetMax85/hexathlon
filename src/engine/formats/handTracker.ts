import type { PortKind } from "../board";
import { createRng, mixSeed, type Rng } from "../rng";
import { emptyCounts, RESOURCES, type Resource, type ResourceCounts } from "../types";
import { isNonNegativeInt, type Tier } from "./common";
import { BUILD_COSTS, BUILDS, PORT_KINDS, tradeRate, type Build } from "./portMath";

export interface HandTrackerTierRules {
  events: number;
  /** Reading speed the log is paced for, in words per minute. */
  wpm: number;
  questions: number;
}

/**
 * Hard gets harder through more events and two questions, not through speed:
 * every tier is paced at or below typical silent reading (175–300 wpm).
 */
export const HAND_TRACKER_RULES: Record<Tier, HandTrackerTierRules> = {
  easy: { events: 5, wpm: 180, questions: 1 },
  medium: { events: 9, wpm: 220, questions: 1 },
  hard: { events: 14, wpm: 260, questions: 2 },
};

/** How long the rival's starting hand is shown. */
export const REVEAL_MS = 3000;
/** Highest count on the number pad (the bank holds 19 of each). */
export const MAX_COUNT = 19;

export interface Gain {
  resource: Resource;
  count: number;
}

export type HandEvent =
  | { type: "roll"; roll: number; rival: Gain | null; you: Gain | null }
  | { type: "build"; build: Build }
  | { type: "trade"; give: Resource; giveCount: number; get: Resource }
  | { type: "you-steal"; resource: Resource }
  | { type: "rival-steal"; resource: Resource };

export interface HandTrackerPuzzle {
  format: "hand-tracker";
  tier: Tier;
  seed: number;
  startHand: ResourceCounts;
  events: HandEvent[];
  /** How long each event stays on screen, from `eventDurationMs`. */
  eventDurationsMs: number[];
  revealMs: number;
  /** Each question asks: how many of this resource does Rival hold? */
  questions: Resource[];
}

/** One count per question, in question order. */
export type HandTrackerAnswer = number[];

/** Rival's hand after an event, or null if the event is impossible. */
export function applyEvent(hand: ResourceCounts, event: HandEvent): ResourceCounts | null {
  const next = { ...hand };
  switch (event.type) {
    case "roll":
      if (event.rival) next[event.rival.resource] += event.rival.count;
      break;
    case "build":
      for (const r of RESOURCES) next[r] -= BUILD_COSTS[event.build][r];
      break;
    case "trade":
      if (event.give === event.get) return null;
      next[event.give] -= event.giveCount;
      next[event.get] += 1;
      break;
    case "you-steal":
      next[event.resource] -= 1;
      break;
    case "rival-steal":
      next[event.resource] += 1;
      break;
  }
  return RESOURCES.every((r) => next[r] >= 0 && next[r] <= MAX_COUNT) ? next : null;
}

/** Rival's hand after every event (index 0 = start). Null if any step is impossible. */
export function replayHand(puzzle: HandTrackerPuzzle): ResourceCounts[] | null {
  const hands = [puzzle.startHand];
  for (const e of puzzle.events) {
    const next = applyEvent(hands[hands.length - 1], e);
    if (!next) return null;
    hands.push(next);
  }
  return hands;
}

const BUILD_TEXT: Record<Build, string> = {
  road: "built a road",
  settlement: "built a settlement",
  city: "built a city",
  dev: "bought a dev card",
};

const gainText = (who: string, g: Gain) => `${who} +${g.count} ${g.resource}`;

/** Game-log line for an event, e.g. "Rolled 8 — Rival +2 wheat, You +1 ore". */
export function describeEvent(event: HandEvent): string {
  switch (event.type) {
    case "roll": {
      const parts = [
        event.rival && gainText("Rival", event.rival),
        event.you && gainText("You", event.you),
      ].filter(Boolean);
      return `Rolled ${event.roll} — ${parts.length ? parts.join(", ") : "no one collects"}`;
    }
    case "build":
      return `Rival ${BUILD_TEXT[event.build]}`;
    case "trade":
      return `Rival traded ${event.giveCount} ${event.give} → 1 ${event.get}`;
    case "you-steal":
      return `You stole 1 ${event.resource} from Rival`;
    case "rival-steal":
      return `Rival stole 1 ${event.resource} from you`;
  }
}

/** Extra time to update the running count, by what the event does to Rival's hand. */
function updateMs(event: HandEvent): number {
  switch (event.type) {
    case "roll":
      // Only "You" collecting is a distractor; the rival's hand doesn't move.
      return event.rival ? 1000 : 500;
    case "you-steal":
    case "rival-steal":
      return 1000;
    case "trade":
      return 1500;
    case "build":
      // The player has to recall the build cost.
      return 2000;
  }
}

/** Words in a log line; punctuation like "—" and "→" isn't read as a word. */
function countWords(line: string): number {
  return line.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;
}

/** Time an event stays on screen: reading time at the tier's wpm plus update time. */
export function eventDurationMs(event: HandEvent, tier: Tier): number {
  const words = countWords(describeEvent(event));
  return Math.round((words * 60_000) / HAND_TRACKER_RULES[tier].wpm + updateMs(event));
}

/** Preview of the starting hand plus every event: the shortest possible solve. */
export function handTrackerPlaybackMs(puzzle: HandTrackerPuzzle): number {
  return puzzle.revealMs + puzzle.eventDurationsMs.reduce((a, b) => a + b, 0);
}

/** 2d6 re-rolled until it isn't 7 (sevens move the robber, which is out of scope). */
function rollDice(rng: Rng): number {
  for (;;) {
    const roll = rng.range(1, 6) + rng.range(1, 6);
    if (roll !== 7) return roll;
  }
}

const START_SIZE: Record<Tier, [number, number]> = {
  easy: [2, 4],
  medium: [3, 6],
  hard: [4, 7],
};

const EVENT_WEIGHTS: ReadonlyArray<[HandEvent["type"], number]> = [
  ["roll", 40],
  ["build", 15],
  ["trade", 15],
  ["you-steal", 15],
  ["rival-steal", 15],
];

function pickType(rng: Rng): HandEvent["type"] {
  let x = rng.int(100);
  for (const [type, w] of EVENT_WEIGHTS) {
    if (x < w) return type;
    x -= w;
  }
  return "roll";
}

/** A random card from the hand (each card equally likely), or null if empty. */
function randomCard(rng: Rng, hand: ResourceCounts): Resource | null {
  const cards = RESOURCES.flatMap((r) => Array<Resource>(hand[r]).fill(r));
  return cards.length ? rng.pick(cards) : null;
}

/** Try to make an event of the given type that the rival can afford. */
function makeEvent(
  rng: Rng,
  type: HandEvent["type"],
  hand: ResourceCounts,
  rivalPorts: readonly PortKind[],
): HandEvent | null {
  switch (type) {
    case "roll": {
      const rival = rng.chance(0.8)
        ? { resource: rng.pick(RESOURCES), count: rng.chance(0.3) ? 2 : 1 }
        : null;
      const you = rival === null || rng.chance(0.5)
        ? { resource: rng.pick(RESOURCES), count: rng.chance(0.3) ? 2 : 1 }
        : null;
      return { type, roll: rollDice(rng), rival, you };
    }
    case "build": {
      const affordable = BUILDS.filter((b) => RESOURCES.every((r) => hand[r] >= BUILD_COSTS[b][r]));
      return affordable.length ? { type, build: rng.pick(affordable) } : null;
    }
    case "trade": {
      const payers = RESOURCES.filter((r) => hand[r] >= tradeRate(rivalPorts, r));
      if (!payers.length) return null;
      const give = rng.pick(payers);
      const get = rng.pick(RESOURCES.filter((r) => r !== give));
      return { type, give, giveCount: tradeRate(rivalPorts, give), get };
    }
    case "you-steal": {
      const resource = randomCard(rng, hand);
      return resource ? { type, resource } : null;
    }
    case "rival-steal":
      return { type, resource: rng.pick(RESOURCES) };
  }
}

const MAX_ATTEMPTS = 1000;

export function generateHandTracker(tier: Tier, seed: number): HandTrackerPuzzle {
  const rules = HAND_TRACKER_RULES[tier];
  const rng = createRng(mixSeed(seed, "hand-tracker", tier));
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const rivalPorts = rng.shuffle(PORT_KINDS).slice(0, rng.range(0, 2));
    const startHand = emptyCounts();
    const [lo, hi] = START_SIZE[tier];
    const size = rng.range(lo, hi);
    for (let i = 0; i < size; i++) startHand[rng.pick(RESOURCES)]++;

    const events: HandEvent[] = [];
    const touched = new Set<Resource>();
    let hand = startHand;
    while (events.length < rules.events) {
      const event = makeEvent(rng, pickType(rng), hand, rivalPorts);
      const next = event && applyEvent(hand, event);
      if (!event || !next) continue;
      for (const r of RESOURCES) if (next[r] !== hand[r]) touched.add(r);
      events.push(event);
      hand = next;
    }

    // Ask about resources the log actually changed.
    if (touched.size < rules.questions) continue;
    const questions = rng
      .shuffle(RESOURCES.filter((r) => touched.has(r)))
      .slice(0, rules.questions);
    return {
      format: "hand-tracker",
      tier,
      seed,
      startHand,
      events,
      eventDurationsMs: events.map((e) => eventDurationMs(e, tier)),
      revealMs: REVEAL_MS,
      questions,
    };
  }
  throw new Error(`hand-tracker: no puzzle for ${tier}/${seed}`);
}

export function solveHandTracker(puzzle: HandTrackerPuzzle): number[] {
  const hands = replayHand(puzzle);
  if (!hands) throw new Error("hand-tracker puzzle is inconsistent");
  const final = hands[hands.length - 1];
  return puzzle.questions.map((r) => final[r]);
}

/** Correct iff every question gets the rival's exact final count. */
export function validateHandTracker(puzzle: HandTrackerPuzzle, answer: unknown): boolean {
  if (!Array.isArray(answer) || answer.length !== puzzle.questions.length) return false;
  if (!answer.every((a) => isNonNegativeInt(a) && a <= MAX_COUNT)) return false;
  const expected = solveHandTracker(puzzle);
  return expected.every((n, i) => answer[i] === n);
}
