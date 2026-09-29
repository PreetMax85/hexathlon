import {
  CANDIDATE_LABELS,
  pipFlashRanking,
  portMathRoute,
  replayHand,
  tradeRate,
  validate,
  type PortMathPuzzle,
  type Puzzle,
  type Trade,
} from "@/engine";
import { RESOURCE_META } from "./meta";

export interface Verdict {
  correct: boolean;
  /** One-line headline, e.g. "Correct". */
  title: string;
  /** Explanation of the right answer. */
  detail: string;
}

/** "3 sheep → 1 brick" for a trade at the puzzle's port rates. */
export function tradeText(puzzle: PortMathPuzzle, trade: Trade): string {
  return `${tradeRate(puzzle.ports, trade.give)} ${trade.give} → 1 ${trade.get}`;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** Result of an answer, with a short explanation for the feedback bar. */
export function verdict(puzzle: Puzzle, answer: unknown, ms: number): Verdict {
  const correct = validate(puzzle, answer, ms);
  switch (puzzle.format) {
    case "pip-flash": {
      const { totals, best } = pipFlashRanking(puzzle.board, puzzle.candidates);
      const label = CANDIDATE_LABELS[best];
      const others = totals.filter((_, i) => i !== best);
      const next = Math.max(...others);
      if (correct) {
        return { correct, title: "Correct", detail: `${label} has ${totals[best]} pips, next best ${next}.` };
      }
      const timedOut = answer === null || ms > puzzle.timeLimitMs;
      // Name the player's own read against the best: that gap is the lesson.
      const picked = typeof answer === "number" && totals[answer] !== undefined ? answer : null;
      return {
        correct,
        title: timedOut ? "Time's up" : "Not quite",
        detail:
          picked !== null && picked !== best
            ? `You picked ${CANDIDATE_LABELS[picked]}: ${totals[picked]} pips. ${label} had ${totals[best]}.`
            : `${label} has the most: ${totals[best]} pips vs ${next}.`,
      };
    }
    case "port-math": {
      const route = portMathRoute(puzzle).map((t) => tradeText(puzzle, t)).join(", then ");
      if (correct) return { correct, title: "Correct", detail: `${plural(puzzle.optimalTrades, "trade")}: ${route}.` };
      const said = typeof answer === "number" ? `You said ${answer}. ` : "";
      return { correct, title: "Not quite", detail: `${said}Best is ${puzzle.optimalTrades}: ${route}.` };
    }
    case "hand-tracker": {
      const hands = replayHand(puzzle);
      const final = hands ? hands[hands.length - 1] : puzzle.startHand;
      const truth = puzzle.questions
        .map((r) => `${final[r]} ${RESOURCE_META[r].label.toLowerCase()}`)
        .join(" and ");
      if (correct) return { correct, title: "Correct", detail: `Rival held ${truth}.` };
      const said = Array.isArray(answer) && answer.every((n) => typeof n === "number") ? (answer as number[]) : null;
      return {
        correct,
        title: "Not quite",
        detail: said ? `You said ${said.join(" and ")}. Rival held ${truth}.` : `Rival held ${truth}.`,
      };
    }
  }
}
