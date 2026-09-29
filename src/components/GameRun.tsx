"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  generate,
  dailyRunSeed,
  minPuzzleMs,
  runItems,
  type Format,
  type HandTrackerAnswer,
  type Mode,
  type PipFlashAnswer,
  type PortMathAnswer,
} from "@/engine";
import { ensurePlayer, submitResult, type SubmitBody } from "@/game/api";
import { browserKV, useLocalResult, usePlayer, useTodayKey } from "@/game/browser";
import { FORMAT_META } from "@/game/meta";
import { emptyProgress, finalScore, marksSoFar, record, type RunProgress } from "@/game/runState";
import { saveResult, saveRushBest, type LocalResult, type Player } from "@/game/storage";
import { idleSync, type Sync } from "@/game/sync";
import { verdict } from "@/game/verdict";
import { ChallengeShare } from "./ChallengeShare";
import { Feedback } from "./Feedback";
import { HandTrackerPlay } from "./HandTrackerPlay";
import { ChallengeBoard, DailyBoard } from "./Leaderboard";
import { NicknameDialog } from "./NicknameDialog";
import { PipFlashPlay } from "./PipFlashPlay";
import { PortMathPlay } from "./PortMathPlay";
import { Result } from "./Result";
import { shareText } from "@/game/share";
import { Button, ButtonLink, TierBadge } from "./ui";

/** A finished run: the local result and the payload sent to the server. */
interface Finished {
  result: LocalResult;
  isBest: boolean;
  body: SubmitBody;
  dateKey: string | null;
}

type Stage =
  | { kind: "intro" }
  | { kind: "play"; seed: number; dateKey: string | null; progress: RunProgress; showing: boolean; final: Finished | null }
  | { kind: "result"; seed: number; final: Finished };

interface Props {
  format: Format;
  mode: Mode;
  /** Fixed Rush seed (challenge links). Otherwise a fresh random seed per run. */
  fixedSeed?: number;
  /** Set when playing someone's challenge link. */
  challenge?: { id: string; createdBy: string };
}

const AUTO_ADVANCE_MS = 1200;

function randomSeed(): number {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0];
}

function RunHeader({
  format,
  mode,
  seed,
  progress,
  index,
  total,
  tier,
}: {
  format: Format;
  mode: Mode;
  seed: number;
  progress: RunProgress;
  index: number;
  total: number;
  tier: Parameters<typeof TierBadge>[0]["tier"];
}) {
  const marks = marksSoFar(format, mode, seed, progress);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            aria-label="Quit run and go home"
            className="grid size-11 place-items-center rounded-full border border-line bg-surface text-lg"
          >
            ✕
          </Link>
          <div className="leading-tight">
            <div className="font-extrabold">{FORMAT_META[format].name}</div>
            <div className="tabular text-sm text-muted">
              {mode === "rush" ? `Rush · ${Math.min(index + 1, total)} / ${total}` : "Daily"}
            </div>
          </div>
        </div>
        <TierBadge tier={tier} />
      </div>
      {total > 1 && (
        <ol className="flex gap-1" aria-label="Progress">
          {Array.from({ length: total }, (_, i) => (
            <li
              key={i}
              className={`h-2 flex-1 rounded-full ${
                i < marks.length
                  ? marks[i]
                    ? "bg-[#16a34a]"
                    : "bg-[#dc2626]"
                  : i === index
                    ? "bg-brand"
                    : "bg-surface-2"
              }`}
            />
          ))}
        </ol>
      )}
    </div>
  );
}

export function GameRun({ format, mode, fixedSeed, challenge }: Props) {
  const meta = FORMAT_META[format];
  const player = usePlayer();
  const today = useTodayKey();
  const dailyResult = useLocalResult(format, "daily", mode === "daily" ? today : null);
  const [stage, setStage] = useState<Stage>({ kind: "intro" });
  const [sync, setSync] = useState<Sync>(idleSync);

  const play = stage.kind === "play" ? stage : null;
  const items = useMemo(() => (play ? runItems(mode, play.seed) : []), [mode, play?.seed]); // eslint-disable-line react-hooks/exhaustive-deps
  const answered = play ? play.progress.answers.length : 0;
  const index = play ? (play.showing ? answered - 1 : answered) : 0;
  const item = play ? items[index] : undefined;
  const puzzle = useMemo(
    () => (item ? generate(format, item.tier, item.seed) : null),
    [format, item],
  );
  const finished = play ? answered >= items.length : false;
  const last = play && play.showing && puzzle ? verdict(puzzle, play.progress.answers[index], play.progress.times[index]) : null;

  const next = () => {
    if (!play) return;
    if (finished) {
      if (play.final) setStage({ kind: "result", seed: play.seed, final: play.final });
      return;
    }
    setStage({ ...play, showing: false });
  };

  /** Send a run to the server; the local copy is marked synced on success. */
  const perform = async (who: Player, body: SubmitBody, local?: { dateKey: string; result: LocalResult }): Promise<Sync> => {
    const reg = await ensurePlayer(who);
    if (!reg.ok) return { kind: "error", message: reg.error };
    const res = await submitResult(body);
    const conflict = !res.ok && res.status === 409 && body.mode === "daily";
    if ((res.ok || conflict) && local) {
      saveResult(browserKV, format, "daily", local.dateKey, { ...local.result, synced: true });
    }
    if (res.ok) return { kind: "saved" };
    return conflict ? { kind: "conflict" } : { kind: "error", message: res.error };
  };

  const send = async (who: Player, body: SubmitBody, local?: { dateKey: string; result: LocalResult }) => {
    setSync({ kind: "saving" });
    setSync(await perform(who, body, local));
  };

  // Correct answers glide on; wrong ones wait so the explanation can be read.
  useEffect(() => {
    if (!last?.correct) return;
    const id = window.setTimeout(next, AUTO_ADVANCE_MS);
    return () => window.clearTimeout(id);
    // `next` closes over the same stage that `last` derives from.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [last?.correct, answered]);

  const start = () => {
    const dateKey = mode === "daily" ? today : null;
    if (mode === "daily" && !dateKey) return;
    const seed = mode === "daily" ? dailyRunSeed(format, dateKey!) : (fixedSeed ?? randomSeed());
    setSync(idleSync);
    setStage({ kind: "play", seed, dateKey, progress: emptyProgress, showing: false, final: null });
  };

  const onAnswer = (answer: unknown, ms: number) => {
    if (!play || !player || !puzzle) return;
    // A real tap can't beat the human floor, but a fast Skip can land under
    // it; round up so the server doesn't reject the whole run.
    const progress = record(play.progress, answer, Math.max(Math.round(ms), minPuzzleMs(puzzle)));
    let final: Finished | null = null;
    if (progress.answers.length >= items.length) {
      const score = finalScore(format, mode, play.seed, progress);
      if (score) {
        const result: LocalResult = {
          correct: score.correct,
          total: items.length,
          totalMs: score.totalMs,
          marks: score.marks,
          seed: play.seed,
          answers: progress.answers,
          times: progress.times,
          synced: false,
        };
        if (mode === "daily" && play.dateKey) saveResult(browserKV, format, "daily", play.dateKey, result);
        const isBest = mode === "rush" && saveRushBest(browserKV, format, result);
        const body: SubmitBody = {
          playerId: player.id,
          format,
          mode,
          seed: play.seed,
          answers: progress.answers,
          times: progress.times,
          challengeId: challenge?.id ?? null,
        };
        final = { result, isBest, body, dateKey: play.dateKey };
        void send(player, body, play.dateKey ? { dateKey: play.dateKey, result } : undefined);
      }
    }
    setStage({ ...play, progress, showing: true, final });
  };

  // A Daily finished while offline is sent again when the page is reopened.
  const retryDaily =
    mode === "daily" && stage.kind === "intro" && dailyResult && !dailyResult.synced && dailyResult.answers && dailyResult.times && today && player
      ? { result: dailyResult, today, player }
      : null;
  const retryKey = retryDaily ? `${retryDaily.today}:${retryDaily.player.id}` : null;
  useEffect(() => {
    if (!retryDaily) return;
    const { result, today: dateKey, player: who } = retryDaily;
    void perform(
      who,
      { playerId: who.id, format, mode: "daily", seed: result.seed, answers: result.answers!, times: result.times! },
      { dateKey, result },
    ).then(setSync);
    // Runs once per (date, player) when an unsent Daily is found.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryKey]);

  if (player === undefined) return <p className="py-10 text-center text-muted">Loading…</p>;
  if (player === null) return <NicknameDialog />;

  const boards = (result: LocalResult, seed: number, challengeId: string | undefined) => {
    const key = sync.kind;
    if (mode === "daily") return <DailyBoard format={format} playerId={player.id} refreshKey={key} />;
    return (
      <>
        {challengeId && <ChallengeBoard id={challengeId} playerId={player.id} refreshKey={key} />}
        <ChallengeShare
          playerId={player.id}
          format={format}
          seed={seed}
          saved={sync.kind === "saved"}
          challengeId={challengeId}
          shareLine={shareText({ format, mode, correct: result.correct, total: result.total, totalMs: result.totalMs })}
        />
      </>
    );
  };

  if (stage.kind === "result") {
    const { result, isBest, body } = stage.final;
    return (
      <Result
        format={format}
        mode={mode}
        result={result}
        isBest={isBest}
        sync={sync}
        onRetrySync={() => void send(player, body, stage.final.dateKey ? { dateKey: stage.final.dateKey, result } : undefined)}
        onPlayAgain={mode === "rush" && fixedSeed === undefined ? () => setStage({ kind: "intro" }) : undefined}
      >
        {boards(result, stage.seed, challenge?.id)}
      </Result>
    );
  }

  if (stage.kind === "intro") {
    if (mode === "daily" && dailyResult) {
      return (
        <Result
          format={format}
          mode="daily"
          result={dailyResult}
          alreadyPlayed
          sync={sync}
          onRetrySync={
            retryDaily && today
              ? () => void send(player, {
                  playerId: player.id,
                  format,
                  mode: "daily",
                  seed: dailyResult.seed,
                  answers: dailyResult.answers ?? [],
                  times: dailyResult.times ?? [],
                }, { dateKey: today, result: dailyResult })
              : undefined
          }
        >
          <DailyBoard format={format} playerId={player.id} refreshKey={sync.kind} />
        </Result>
      );
    }
    return (
      <div className="anim-pop flex flex-col gap-5">
        <div className={`rounded-3xl bg-gradient-to-br ${meta.accent} p-5 text-white`}>
          <div className="text-sm font-bold uppercase tracking-wide opacity-90">
            {challenge ? `Challenge from ${challenge.createdBy}` : mode === "rush" ? "Rush" : "Daily"}
          </div>
          <h1 className="text-3xl font-black leading-tight">{meta.name}</h1>
          <p className="mt-1 font-medium opacity-95">{meta.tagline}</p>
        </div>
        <ul className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-4 text-sm">
          {mode === "rush" ? (
            <>
              <li>⚡ <b>13 puzzles</b> back to back.</li>
              <li>📈 Gets harder: Easy 1–4, Medium 5–9, Hard 10–13.</li>
              <li>🏁 Score = number correct. Ties are broken by total time.</li>
              {challenge && <li>🔗 Same 13 puzzles as {challenge.createdBy}. Beat their score.</li>}
            </>
          ) : (
            <>
              <li>📅 <b>One puzzle</b> a day, the same for everyone.</li>
              <li>🔒 One scored attempt per day. It resets at 00:00 UTC.</li>
            </>
          )}
          {format === "pip-flash" && <li>⏱️ Each puzzle has a time limit. Timeouts count as wrong.</li>}
          {format === "hand-tracker" && <li>👀 Watch closely. The hand and log play out on a fixed timer.</li>}
        </ul>
        {challenge && <ChallengeBoard id={challenge.id} playerId={player.id} refreshKey="intro" limit={5} />}
        <div className="flex gap-2">
          <ButtonLink href="/" variant="secondary">Back</ButtonLink>
          <Button className="flex-1" onClick={start} disabled={mode === "daily" && !today}>
            {challenge ? "Accept challenge" : mode === "rush" ? "Start Rush" : "Play today's Daily"}
          </Button>
        </div>
      </div>
    );
  }

  if (!puzzle || !item || !play) return null;

  return (
    <div className="flex flex-col gap-4">
      <RunHeader
        format={format}
        mode={mode}
        seed={play.seed}
        progress={play.progress}
        index={index}
        total={items.length}
        tier={item.tier}
      />
      <div key={`${play.seed}-${index}`}>
        {puzzle.format === "pip-flash" && (
          <PipFlashPlay puzzle={puzzle} onAnswer={(a: PipFlashAnswer, ms) => onAnswer(a, ms)} />
        )}
        {puzzle.format === "port-math" && (
          <PortMathPlay puzzle={puzzle} onAnswer={(a: PortMathAnswer | null, ms) => onAnswer(a, ms)} />
        )}
        {puzzle.format === "hand-tracker" && (
          <HandTrackerPlay puzzle={puzzle} onAnswer={(a: HandTrackerAnswer, ms) => onAnswer(a, ms)} />
        )}
      </div>
      {last && (
        <Feedback
          verdict={last}
          action={finished ? "See results" : "Next"}
          onNext={next}
          autoAdvance={last.correct}
        />
      )}
    </div>
  );
}
