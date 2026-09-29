import type { Format, Mode } from "@/engine";
import { FORMAT_META } from "./meta";
import { formatClock } from "./time";

/** Text copied by "Challenge a friend" / share, e.g. "Hexathlon Rush · Port Math 11/13 · 2:41". */
export function shareText(args: {
  format: Format;
  mode: Mode;
  correct: number;
  total: number;
  totalMs: number;
}): string {
  const mode = args.mode === "rush" ? "Rush" : "Daily";
  return `Hexathlon ${mode} · ${FORMAT_META[args.format].name} ${args.correct}/${args.total} · ${formatClock(args.totalMs)}`;
}

/** Emoji strip of per-puzzle results, e.g. "✅✅❌". */
export function marksStrip(marks: readonly boolean[]): string {
  return marks.map((m) => (m ? "✅" : "❌")).join("");
}
