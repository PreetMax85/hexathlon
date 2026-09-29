import type { HandTrackerPuzzle } from "@/engine";
import { runningCounts } from "@/game/handTrackerFlow";
import { RESOURCE_META } from "@/game/meta";
import { Glyph } from "./glyphs";

/** The log replayed with Rival's asked counts after each line; lines that moved a count stand out. */
export function CountLog({ puzzle }: { puzzle: HandTrackerPuzzle }) {
  const rows = runningCounts(puzzle);
  return (
    <table className="w-full text-s">
      <thead>
        <tr className="border-b border-ink text-left text-ink-2">
          <th className="py-1 font-semibold">Log</th>
          {puzzle.questions.map((r) => (
            <th key={r} className="w-12 py-1 text-center font-semibold">
              <span className="inline-flex items-center gap-1">
                <Glyph name={r} size={14} />
                <span className="sr-only">{RESOURCE_META[r].label}</span>
              </span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => {
          const moved = row.changed.some(Boolean);
          return (
            <tr key={i} className={`border-b border-hair ${moved ? "bg-shoal-2" : ""}`}>
              <td className={`py-1 pr-2 ${moved ? "font-semibold" : "text-ink-2"}`}>{row.line ?? "Starting hand"}</td>
              {row.counts.map((c, q) => (
                <td key={q} className={`py-1 text-center ${row.changed[q] ? "font-extrabold text-ink" : "text-ink-2"}`}>
                  {c}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
