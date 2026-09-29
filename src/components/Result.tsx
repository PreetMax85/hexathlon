"use client";

import { useState, type ReactNode } from "react";
import { runItems, type Format, type Mode } from "@/engine";
import type { BestComparison } from "@/game/best";
import { useNowMinute, useTodayKey } from "@/game/browser";
import { chartDate } from "@/game/chart";
import { FORMAT_META, TIER_LABEL } from "@/game/meta";
import { marksStrip, shareText } from "@/game/share";
import type { LocalResult } from "@/game/storage";
import { syncLabel, type Sync } from "@/game/sync";
import { formatClock, formatCountdown, formatSeconds, untilNextDaily } from "@/game/time";
import { Buoy } from "./glyphs";
import { PuzzleReveal } from "./PuzzleReveal";
import { Button, ButtonLink } from "./ui";

interface Props {
  format: Format;
  mode: Mode;
  result: LocalResult;
  /** How a Rush compares to the best run stored before it. */
  comparison?: BestComparison | null;
  /** Nickname prompt shown before the first scored result is sent. */
  nickname?: ReactNode;
  /** Daily was already played earlier today. */
  alreadyPlayed?: boolean;
  onPlayAgain?: () => void;
  /** Progress of sending this run to the server. */
  sync?: Sync;
  onRetrySync?: () => void;
  /** Leaderboard and challenge panels, shown between the puzzle strip and sharing. */
  children?: ReactNode;
}

function BestLine({ comparison: c }: { comparison: BestComparison }) {
  if (c.kind === "first") return <p className="sea">First Rush on this device: the mark to beat.</p>;
  if (c.kind === "equal") return <p className="sea">Level with your best.</p>;
  const time = `${c.ms < 0 ? "−" : "+"}${formatSeconds(Math.abs(c.ms))}`;
  const detail = c.correct !== 0 ? `${c.correct > 0 ? "+" : "−"}${Math.abs(c.correct)} right` : time;
  return c.kind === "better" ? (
    <p className="font-bold text-green">New best, {detail}.</p>
  ) : (
    <p className="sea text-ink-2">Best still stands ({detail}).</p>
  );
}

/** The chart stamp: score, time and the edition date, pressed onto the result. */
function PassageStamp({ result, format, mode, date }: { result: LocalResult; format: Format; mode: Mode; date: string | null }) {
  return (
    <div
      className="anim-stamp mx-auto flex w-fit flex-col items-center px-6 py-3 text-magenta"
      style={{ border: "3px double currentColor", transform: "rotate(-4deg)" }}
    >
      <span className="label">
        {FORMAT_META[format].name} {mode === "rush" ? "Rush" : "Daily"}
      </span>
      <span className="label">{mode === "rush" ? "Passage complete" : "Daily charted"}</span>
      <span className="font-extrabold leading-none condensed" style={{ fontSize: "4.5rem" }}>
        {result.correct}
        <span className="text-l font-semibold">/{result.total}</span>
      </span>
      <span className="label">
        {formatClock(result.totalMs)}
        {date && ` · ${chartDate(date)}`}
      </span>
    </div>
  );
}

/** A finished run: stamp, comparison, buoy strip (tap to replay a puzzle), boards and sharing. */
export function Result({ format, mode, result, comparison, nickname, alreadyPlayed, onPlayAgain, sync, onRetrySync, children }: Props) {
  const [copied, setCopied] = useState<"idle" | "copied" | "failed">("idle");
  const [open, setOpen] = useState<number | null>(() => {
    // Open the first miss straight away: the review is the point of a miss.
    const i = result.marks.findIndex((m) => !m);
    return i >= 0 && !alreadyPlayed ? i : null;
  });
  const today = useTodayKey();
  const now = useNowMinute();
  const items = runItems(mode, result.seed);
  const text = shareText({ format, mode, correct: result.correct, total: result.total, totalMs: result.totalMs, date: today });
  const canReplay = !!result.answers && !!result.times;

  const share = async () => {
    const payload = `${text}\n${marksStrip(result.marks)}`;
    try {
      if (typeof navigator.share === "function" && matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ text: payload });
        return;
      }
      await navigator.clipboard.writeText(payload);
      setCopied("copied");
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return;
      setCopied("failed");
    }
  };

  return (
    <div className="anim-pop flex flex-col gap-6">
      <header className="flex flex-col gap-4 text-center">
        <h1 className="sr-only">
          {FORMAT_META[format].name} {mode === "rush" ? "Rush" : "Daily"} result
        </h1>
        <PassageStamp result={result} format={format} mode={mode} date={today} />
        <div className="flex flex-col gap-1">
          {result.relaxed && <p className="sea">Sailed in Relaxed mode: unranked, kept on this device.</p>}
          {comparison && <BestLine comparison={comparison} />}
          {alreadyPlayed && (
            <p className="text-s text-ink-2">
              You&apos;ve sailed today&apos;s Daily.
              {now !== null && <> Next one in <b className="text-ink">{formatCountdown(untilNextDaily(new Date(now)))}</b>.</>}
            </p>
          )}
          <p className="text-s text-ink-2">Average {formatSeconds(result.totalMs / result.total)} a puzzle.</p>
        </div>
      {sync && syncLabel(sync) && (
          <p role="status" className={`flex min-h-11 items-center justify-center gap-3 text-s ${sync.kind === "error" ? "text-red" : "text-ink-2"}`}>
            <span>{syncLabel(sync)}</span>
            {sync.kind === "error" && onRetrySync && (
              <Button variant="ghost" className="min-h-11 shrink-0 px-2" onClick={onRetrySync}>
                Retry
              </Button>
            )}
          </p>
        )}
      </header>

      <section aria-label="Per-puzzle results" className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between border-b border-ink pb-1.5">
          <h2 className="sea">The passage</h2>
          {canReplay && <span className="text-s text-ink-2">Tap a buoy to replay it</span>}
        </div>
        <ol className={`grid gap-y-1 ${result.marks.length > 7 ? "grid-cols-7" : "grid-cols-5"} sm:max-w-md`}>
          {result.marks.map((ok, i) => (
            <li key={i}>
              <button
                type="button"
                disabled={!canReplay}
                onClick={() => setOpen(open === i ? null : i)}
                aria-expanded={open === i}
                aria-label={`Puzzle ${i + 1}, ${TIER_LABEL[items[i].tier]}: ${ok ? "right" : "wrong"}. Replay`}
                className={`flex min-h-12 w-full flex-col items-center justify-end pb-0.5 ${open === i ? "bg-shoal-2 ring-1 ring-inset ring-ink" : ""}`}
              >
                <Buoy kind={ok ? "cone" : "can"} size={24} />
                <span className="text-s leading-none text-ink-2">{i + 1}</span>
              </button>
            </li>
          ))}
        </ol>
        {mode === "rush" && <p className="text-s text-ink-2">Easy 1–4 · Medium 5–9 · Hard 10–13</p>}
        {open !== null && canReplay && (
          <PuzzleReveal
            key={open}
            format={format}
            item={items[open]}
            index={open}
            answer={result.answers![open]}
            ms={result.times![open]}
            relaxed={result.relaxed}
          />
        )}
      </section>

      {nickname}

      {children}

      <section aria-label="Share" className="flex flex-col gap-2">
        <output className="block whitespace-pre-line border border-dashed border-ink-2 bg-deep p-3 text-center text-s font-semibold">
          {text}
          {"\n"}
          <span className="tracking-[0.15em]">{marksStrip(result.marks)}</span>
        </output>
        <Button variant="secondary" onClick={share}>
          {copied === "copied" ? "Copied" : copied === "failed" ? "Copy failed. Select the text above" : "Share result"}
        </Button>
      </section>

      <div className="flex gap-2">
        {onPlayAgain && (
          <Button className="flex-1" onClick={onPlayAgain}>
            Sail again
          </Button>
        )}
        <ButtonLink href="/" variant="secondary" className="flex-1">
          Home
        </ButtonLink>
      </div>
    </div>
  );
}
