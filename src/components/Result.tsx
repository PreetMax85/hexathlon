"use client";

import { useState } from "react";
import { runItems, type Format, type Mode } from "@/engine";
import { FORMAT_META, TIER_LABEL } from "@/game/meta";
import { marksStrip, shareText } from "@/game/share";
import type { LocalResult } from "@/game/storage";
import { formatClock, formatSeconds } from "@/game/time";
import { Button, ButtonLink } from "./ui";

interface Props {
  format: Format;
  mode: Mode;
  result: LocalResult;
  /** New personal best for Rush. */
  isBest?: boolean;
  /** Daily was already played earlier today. */
  alreadyPlayed?: boolean;
  onPlayAgain?: () => void;
}

/** Score, time, per-puzzle ✓/✗ strip and the share text. */
export function Result({ format, mode, result, isBest, alreadyPlayed, onPlayAgain }: Props) {
  const [copied, setCopied] = useState<"idle" | "copied" | "failed">("idle");
  const items = runItems(mode, result.seed);
  const text = shareText({
    format,
    mode,
    correct: result.correct,
    total: result.total,
    totalMs: result.totalMs,
  });
  const perfect = result.correct === result.total;

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
    <div className="anim-pop flex flex-col gap-5">
      <div className="rounded-3xl border border-line bg-surface p-5 text-center">
        <div className="text-sm font-bold uppercase tracking-wide text-muted">
          {FORMAT_META[format].name} · {mode === "rush" ? "Rush" : "Daily"}
        </div>
        {alreadyPlayed && (
          <p className="mt-1 text-sm font-semibold text-warn">
            You already played today&apos;s Daily. New puzzles at 00:00 UTC.
          </p>
        )}
        <div className="tabular mt-2 text-6xl font-black tracking-tight">
          {result.correct}
          <span className="text-3xl font-bold text-muted">/{result.total}</span>
        </div>
        <div className="mt-1 text-lg font-semibold">
          {perfect ? "Perfect run!" : result.correct >= result.total * 0.7 ? "Sharp." : "Keep training."}
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-left">
          <div className="rounded-xl bg-surface-2 p-3">
            <dt className="text-xs font-bold uppercase tracking-wide text-muted">Time</dt>
            <dd className="tabular text-2xl font-extrabold">{formatClock(result.totalMs)}</dd>
          </div>
          <div className="rounded-xl bg-surface-2 p-3">
            <dt className="text-xs font-bold uppercase tracking-wide text-muted">Avg per puzzle</dt>
            <dd className="tabular text-2xl font-extrabold">{formatSeconds(result.totalMs / result.total)}</dd>
          </div>
        </dl>
        {isBest && <p className="mt-3 font-bold text-good">New personal best!</p>}
      </div>

      <section aria-label="Per-puzzle results" className="rounded-2xl border border-line bg-surface p-4">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">Puzzles</h3>
        <ol className="grid grid-cols-[repeat(auto-fill,minmax(2.5rem,1fr))] gap-2">
          {result.marks.map((ok, i) => (
            <li
              key={i}
              title={`#${i + 1} · ${TIER_LABEL[items[i].tier]}`}
              aria-label={`Puzzle ${i + 1}, ${TIER_LABEL[items[i].tier]}: ${ok ? "correct" : "wrong"}`}
              className={`flex aspect-square flex-col items-center justify-center rounded-lg text-lg font-black ${
                ok ? "bg-good-bg text-good" : "bg-bad-bg text-bad"
              }`}
            >
              {ok ? "✓" : "✗"}
              <span className="text-[10px] font-semibold opacity-70">{i + 1}</span>
            </li>
          ))}
        </ol>
        {mode === "rush" && (
          <p className="mt-3 text-xs text-muted">Easy 1–4 · Medium 5–9 · Hard 10–13</p>
        )}
      </section>

      <section aria-label="Share" className="flex flex-col gap-2">
        <output className="block rounded-xl border border-dashed border-line bg-surface p-3 text-center text-sm font-semibold">
          {text}
        </output>
        <Button onClick={share}>
          {copied === "copied" ? "Copied!" : copied === "failed" ? "Copy failed — select the text above" : "Share result"}
        </Button>
      </section>

      <div className="flex gap-2">
        {onPlayAgain && (
          <Button variant="secondary" className="flex-1" onClick={onPlayAgain}>
            Play again
          </Button>
        )}
        <ButtonLink href="/" variant="secondary" className="flex-1">
          Home
        </ButtonLink>
      </div>
    </div>
  );
}
