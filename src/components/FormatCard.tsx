"use client";

import Link from "next/link";
import type { Format } from "@/engine";
import { useLocalResult } from "@/game/browser";
import { FORMAT_META } from "@/game/meta";
import { formatClock } from "@/game/time";
import { HowToPlay } from "./HowToPlay";

/** One entry in the Sailing Directions: the format, its skill, Rush and How to play. */
export function FormatCard({ format }: { format: Format }) {
  const meta = FORMAT_META[format];
  const best = useLocalResult(format, "rush", "best");
  return (
    <li className="flex flex-col gap-2 border-b border-ink py-4 first:pt-3">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-l font-extrabold uppercase wide">{meta.name}</h3>
        <span className="sea shrink-0 text-s text-ink-2">{meta.skill}</span>
      </div>
      <p>{meta.tagline}</p>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
        <Link href={`/play/${format}/rush`} className="flex min-h-11 items-center gap-2 font-bold text-magenta underline decoration-1 underline-offset-4 hover:decoration-2">
          Rush · 13 puzzles
        </Link>
        <span className="text-s text-ink-2">
          {best === undefined ? " " : best ? <>Best <b className="text-ink">{best.correct}/{best.total}</b> · {formatClock(best.totalMs)}</> : "No Rush yet"}
        </span>
      </div>
      <HowToPlay format={format} />
    </li>
  );
}
