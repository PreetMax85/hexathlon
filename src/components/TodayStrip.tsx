"use client";

import Link from "next/link";
import { FORMATS } from "@/engine";
import { useLocalResult, useStreak, useTodayKey } from "@/game/browser";
import { FORMAT_META } from "@/game/meta";
import { formatClock } from "@/game/time";

function DailyItem({ format, today }: { format: (typeof FORMATS)[number]; today: string | null }) {
  const result = useLocalResult(format, "daily", today);
  return (
    <li>
      <Link href={`/play/${format}/daily`} className="flex min-h-12 items-center justify-between gap-2 rounded-xl border border-line bg-surface px-4 py-2">
        <span className="font-semibold">{FORMAT_META[format].name}</span>
        <span className="tabular text-sm text-muted">
          {result === undefined ? "" : result ? `Done · ${result.correct}/${result.total} · ${formatClock(result.totalMs)}` : "Open"}
        </span>
      </Link>
    </li>
  );
}

/** Home's lead: today's three Dailies, done or open, and the streak. */
export function TodayStrip() {
  const today = useTodayKey();
  const streak = useStreak(today);
  return (
    <section aria-label="Today" className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Today</h2>
        <span className="tabular text-sm font-semibold">Days at sea: {streak ?? "–"}</span>
      </div>
      <ul className="flex flex-col gap-2">
        {FORMATS.map((f) => (
          <DailyItem key={f} format={f} today={today} />
        ))}
      </ul>
    </section>
  );
}
