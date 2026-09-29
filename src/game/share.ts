import type { Format, Mode } from "@/engine";
import { chartDate } from "./chart";
import { FORMAT_META } from "./meta";
import { formatClock } from "./time";

/** Text copied by "Challenge a friend" / share, e.g. "Hexathlon Rush · Port Math 11/13 · 2:41". */
export function shareText(args: {
  format: Format;
  mode: Mode;
  correct: number;
  total: number;
  totalMs: number;
  /** UTC date the run finished, printed as the chart's edition. */
  date?: string | null;
}): string {
  const mode = args.mode === "rush" ? "Rush" : "Daily";
  const edition = args.date ? ` · Ed. ${chartDate(args.date)}` : "";
  return `Hexathlon ${mode} · ${FORMAT_META[args.format].name} ${args.correct}/${args.total} · ${formatClock(args.totalMs)}${edition}`;
}

/** Buoy strip of per-puzzle results by shape: "▲" cone for right, "■" can for wrong. */
export function marksStrip(marks: readonly boolean[]): string {
  return marks.map((m) => (m ? "▲" : "■")).join("");
}
