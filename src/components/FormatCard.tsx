"use client";

import Link from "next/link";
import type { Format } from "@/engine";
import { useLocalResult, useTodayKey } from "@/game/browser";
import { FORMAT_META } from "@/game/meta";
import { formatClock } from "@/game/time";
import { HowToPlay } from "./HowToPlay";

const ICON: Record<Format, string> = {
  "pip-flash": "🎯",
  "port-math": "⚓",
  "hand-tracker": "🃏",
};

const MODE_BTN =
  "flex min-h-16 flex-1 flex-col items-start justify-center rounded-xl px-4 py-2 text-left transition-transform active:scale-[0.97]";

export function FormatCard({ format }: { format: Format }) {
  const meta = FORMAT_META[format];
  const today = useTodayKey();
  const daily = useLocalResult(format, "daily", today);
  const best = useLocalResult(format, "rush", "best");

  return (
    <li className="overflow-hidden rounded-3xl border border-line bg-surface shadow-sm">
      <div className={`flex items-center gap-3 bg-gradient-to-br ${meta.accent} px-4 py-3 text-white`}>
        <span aria-hidden className="text-3xl">{ICON[format]}</span>
        <div>
          <h2 className="text-xl font-black leading-tight">{meta.name}</h2>
          <p className="text-xs font-semibold uppercase tracking-wide opacity-90">{meta.skill}</p>
        </div>
      </div>
      <div className="flex flex-col gap-3 p-4">
        <p className="text-sm text-muted">{meta.tagline}</p>
        <div className="flex gap-2">
          <Link href={`/play/${format}/daily`} className={`${MODE_BTN} bg-brand text-brand-ink`}>
            <span className="font-bold">Daily</span>
            <span className="text-xs font-medium opacity-90">
              {daily === undefined ? " " : daily ? `✓ ${daily.correct}/${daily.total} · ${formatClock(daily.totalMs)}` : "5 puzzles today"}
            </span>
          </Link>
          <Link href={`/play/${format}/rush`} className={`${MODE_BTN} border border-line bg-surface-2`}>
            <span className="font-bold">Rush</span>
            <span className="text-xs font-medium text-muted">
              {best === undefined ? " " : best ? `Best ${best.correct}/${best.total} · ${formatClock(best.totalMs)}` : "13 puzzles"}
            </span>
          </Link>
        </div>
        <HowToPlay format={format} />
      </div>
    </li>
  );
}
