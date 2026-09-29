"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  dailyRunSeed,
  generate,
  minPuzzleMs,
  runItems,
  type Format,
  type HandTrackerAnswer,
  type Mode,
  type PipFlashAnswer,
  type PortMathAnswer,
  type Tier,
} from "@/engine";
import { ensurePlayer, submitResult, type SubmitBody } from "@/game/api";
import { compareToBest, type BestComparison } from "@/game/best";
import { browserKV, haptic, useLocalResult, usePlayer, useSettings, useTodayKey } from "@/game/browser";
import { comboOf, lightCharacter } from "@/game/combo";
import { FORMAT_META, introTiming } from "@/game/meta";
import { relaxPuzzle } from "@/game/relaxed";
import { betweenPuzzles, initialBetween, type BetweenState } from "@/game/runFlow";
import { emptyProgress, finalScore, marksSoFar, record, type RunProgress } from "@/game/runState";
import { saveSettings } from "@/game/settings";
import { readResult, saveResult, saveRushBest, type LocalResult, type Player } from "@/game/storage";
import { idleSync, type Sync } from "@/game/sync";
import { markDailyDay } from "@/game/today";
import { verdict } from "@/game/verdict";
import { shareText } from "@/game/share";
import { ChallengeShare } from "./ChallengeShare";
import { Feedback } from "./Feedback";
import { HandTrackerPlay } from "./HandTrackerPlay";
import { ChallengeBoard, DailyBoard } from "./Leaderboard";
import { NicknameForm } from "./NicknameDialog";
import { PipFlashPlay } from "./PipFlashPlay";
import { PortMathPlay } from "./PortMathPlay";
import { Result } from "./Result";
import { Buoy } from "./glyphs";
import { Button, ButtonLink, Note, TierMark } from "./ui";
import { useConfirm } from "./useClock";

/** A finished run: the local result and the payload sent to the server. */
interface Finished {
  result: LocalResult;
  comparison: BestComparison | null;
  body: SubmitBody | null;
  dateKey: string | null;
}

type Stage =
  | { kind: "intro" }
  | {
      kind: "play";
      seed: number;
      dateKey: string | null;
      relaxed: boolean;
      progress: RunProgress;
      between: BetweenState;
      final: Finished | null;
    }
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

/**
 * The combo as a lighthouse characteristic: the lamp flashes once per step of
 * the streak on each right answer, and the label reads like a chart light.
 */
function LightChar({ combo }: { combo: number }) {
  const text = lightCharacter(combo);
  if (!text) return <span className="h-[18px]" aria-hidden />;
  return (
    <span className="flex items-center gap-1.5" aria-label={`Combo ${combo}`}>
      <svg width={18} height={18} viewBox="-9 -9 18 18" aria-hidden>
        <g key={combo} className="light-flash" style={{ animationIterationCount: Math.min(combo, 8) }}>
          {[0, 60, 120, 180, 240, 300].map((a) => (
            <line key={a} x1={0} y1={-4.6} x2={0} y2={-8} stroke="var(--magenta)" strokeWidth={1.6} strokeLinecap="round" transform={`rotate(${a})`} />
          ))}
          <circle r={3.4} fill="var(--magenta)" />
        </g>
      </svg>
      <span className="sea text-s font-bold text-magenta">{text}</span>
    </span>
  );
}

function RunHeader({
  format,
  mode,
  marks,
  index,
  total,
  tier,
  relaxed,
}: {
  format: Format;
  mode: Mode;
  marks: boolean[];
  index: number;
  total: number;
  tier: Tier;
  relaxed: boolean;
}) {
  const router = useRouter();
  const quit = useConfirm(() => router.push("/"));
  return (
    <div className="flex flex-col gap-2 border-b border-ink pb-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={quit.press}
            aria-label={quit.armed ? "Quit this run? Tap again to confirm" : "Quit run"}
            className={`grid min-h-11 min-w-11 shrink-0 place-items-center px-2 text-s font-bold ${
              quit.armed ? "bg-red text-paper" : "ring-1 ring-inset ring-ink"
            }`}
          >
            {quit.armed ? (
              "Quit?"
            ) : (
              <svg width={16} height={16} viewBox="0 0 16 16" aria-hidden>
                <path d="M3 3l10 10M13 3 3 13" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
              </svg>
            )}
          </button>
          <div className="min-w-0 leading-tight">
            <div className="truncate font-bold">{FORMAT_META[format].name}</div>
            <div className="text-s text-ink-2">
              {mode === "rush" ? "Rush" : "Daily"} · {Math.min(index + 1, total)} of {total}
              {relaxed && <span className="sea"> · Relaxed</span>}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <LightChar combo={comboOf(marks)} />
          <TierMark tier={tier} />
        </div>
      </div>
      <ol className="flex items-end justify-between" aria-label="Progress">
        {Array.from({ length: total }, (_, i) => {
          const kind = i < marks.length ? (marks[i] ? "cone" : "can") : i === index ? "current" : "pending";
          return (
            <li key={i} className="flex justify-center" style={{ width: `${100 / total}%` }}>
              <Buoy
                kind={kind}
                size={total > 6 ? 18 : 22}
                label={i < marks.length ? `Puzzle ${i + 1}: ${marks[i] ? "right" : "wrong"}` : `Puzzle ${i + 1}${i === index ? ", now" : ""}`}
              />
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function GameRun({ format, mode, fixedSeed, challenge }: Props) {
  const meta = FORMAT_META[format];
  const player = usePlayer();
  const settings = useSettings();
  const today = useTodayKey();
  const dailyResult = useLocalResult(format, "daily", mode === "daily" ? today : null);
  const [stage, setStage] = useState<Stage>({ kind: "intro" });
  const [sync, setSync] = useState<Sync>(idleSync);

  const play = stage.kind === "play" ? stage : null;
  const relaxed = play?.relaxed ?? settings?.relaxed ?? false;
  const items = useMemo(() => (play ? runItems(mode, play.seed) : []), [mode, play?.seed]); // eslint-disable-line react-hooks/exhaustive-deps
  const answered = play ? play.progress.answers.length : 0;
  const showing = play ? play.between.phase !== "puzzle" : false;
  const index = play ? (showing ? answered - 1 : answered) : 0;
  const item = play ? items[index] : undefined;
  const puzzle = useMemo(() => {
    if (!item) return null;
    const p = generate(format, item.tier, item.seed);
    return relaxed ? relaxPuzzle(p) : p;
  }, [format, item, relaxed]);
  const finished = play ? answered >= items.length : false;
  const last = play && showing && puzzle ? verdict(puzzle, play.progress.answers[index], play.progress.times[index]) : null;
  const marks = play ? marksSoFar(format, mode, play.seed, play.progress, { relaxed }) : [];

  const step = (event: "pause" | "resume" | "next") => {
    if (!play) return;
    if (finished && event === "next") {
      if (play.final) setStage({ kind: "result", seed: play.seed, final: play.final });
      return;
    }
    setStage({ ...play, between: betweenPuzzles(play.between, event) });
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
  const autoAdvance = last?.correct === true && play?.between.phase === "verdict";
  useEffect(() => {
    if (!autoAdvance) return;
    const id = window.setTimeout(() => step("next"), AUTO_ADVANCE_MS);
    return () => window.clearTimeout(id);
    // `step` closes over the same stage that `last` derives from.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAdvance, answered]);

  const start = () => {
    const dateKey = mode === "daily" ? today : null;
    if (mode === "daily" && !dateKey) return;
    const seed = mode === "daily" ? dailyRunSeed(format, dateKey!) : (fixedSeed ?? randomSeed());
    setSync(idleSync);
    setStage({
      kind: "play",
      seed,
      dateKey,
      relaxed: settings?.relaxed ?? false,
      progress: emptyProgress,
      between: initialBetween,
      final: null,
    });
  };

  const onAnswer = (answer: unknown, ms: number) => {
    if (!play || !puzzle || play.between.phase !== "puzzle") return;
    // A real tap can't beat the human floor, but a fast Skip can land under
    // it; round up so the server doesn't reject the whole run.
    const progress = record(play.progress, answer, Math.max(Math.round(ms), minPuzzleMs(puzzle)));
    if (verdict(puzzle, answer, ms).correct) haptic();
    let final: Finished | null = null;
    if (progress.answers.length >= items.length) {
      const score = finalScore(format, mode, play.seed, progress, { relaxed: play.relaxed });
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
          ...(play.relaxed ? { relaxed: true } : {}),
        };
        let comparison: BestComparison | null = null;
        if (mode === "daily" && play.dateKey) {
          saveResult(browserKV, format, "daily", play.dateKey, result);
          markDailyDay(browserKV, play.dateKey);
        }
        if (mode === "rush" && !play.relaxed) {
          comparison = compareToBest(result, readResult(browserKV, format, "rush", "best"));
          saveRushBest(browserKV, format, result);
        }
        // Relaxed runs are unranked: they never reach the server.
        const body: SubmitBody | null = play.relaxed
          ? null
          : {
              playerId: player?.id ?? "",
              format,
              mode,
              seed: play.seed,
              answers: progress.answers,
              times: progress.times,
              challengeId: challenge?.id ?? null,
            };
        final = { result, comparison, body, dateKey: play.dateKey };
        if (body && player) void send(player, body, play.dateKey ? { dateKey: play.dateKey, result } : undefined);
      }
    }
    setStage({ ...play, progress, between: betweenPuzzles(play.between, "answer"), final });
  };

  // A Daily finished while offline (or before a nickname) is sent when the page reopens.
  const retryDaily =
    mode === "daily" && stage.kind === "intro" && dailyResult && !dailyResult.synced && !dailyResult.relaxed && dailyResult.answers && dailyResult.times && today && player
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

  if (player === undefined || settings === undefined) return <p className="sea py-10 text-center text-ink-2">Loading the chart…</p>;

  const boards = (result: LocalResult, seed: number, challengeId: string | undefined) => {
    if (result.relaxed) return null;
    const key = sync.kind;
    if (mode === "daily") return <DailyBoard format={format} playerId={player?.id ?? null} refreshKey={key} />;
    return (
      <>
        {challengeId && <ChallengeBoard id={challengeId} playerId={player?.id ?? null} refreshKey={key} />}
        {player && (
          <ChallengeShare
            playerId={player.id}
            format={format}
            seed={seed}
            saved={sync.kind === "saved"}
            challengeId={challengeId}
            shareLine={shareText({ format, mode, correct: result.correct, total: result.total, totalMs: result.totalMs })}
          />
        )}
      </>
    );
  };

  if (stage.kind === "result") {
    const { result, comparison, body, dateKey } = stage.final;
    // First scored submit: ask for a nickname now, then send.
    const needsName = !player && body !== null;
    const sendNow = (who: Player) =>
      body && void send(who, { ...body, playerId: who.id }, dateKey ? { dateKey, result } : undefined);
    return (
      <Result
        format={format}
        mode={mode}
        result={result}
        comparison={comparison}
        sync={sync}
        onRetrySync={player && body ? () => sendNow(player) : undefined}
        onPlayAgain={mode === "rush" && fixedSeed === undefined ? () => setStage({ kind: "intro" }) : undefined}
        nickname={needsName ? <NicknameForm title="Put your score on the board" onSaved={sendNow} /> : null}
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
              ? () => void send(retryDaily.player, {
                  playerId: retryDaily.player.id,
                  format,
                  mode: "daily",
                  seed: dailyResult.seed,
                  answers: dailyResult.answers ?? [],
                  times: dailyResult.times ?? [],
                }, { dateKey: today, result: dailyResult })
              : undefined
          }
        >
          {!dailyResult.relaxed && <DailyBoard format={format} playerId={player?.id ?? null} refreshKey={sync.kind} />}
        </Result>
      );
    }
    const rel = settings.relaxed;
    return (
      <div className="anim-pop flex flex-col gap-6">
        <header className="flex flex-col gap-1">
          <p className="sea text-ink-2">
            {challenge ? `Challenge from ${challenge.createdBy}` : mode === "rush" ? "Rush" : "Today's Daily"}
          </p>
          <h1 className="text-l font-extrabold wide uppercase">{meta.name}</h1>
          <p>{meta.tagline}</p>
        </header>
        <Note title="Sailing directions" as="div">
          <ul className="flex flex-col gap-2 text-s">
            {mode === "rush" ? (
              <>
                <li><b>13 puzzles</b> back to back: easy 1–4, medium 5–9, hard 10–13.</li>
                <li>Score is the number right. Ties go to the faster total time.</li>
                {challenge && <li>The same 13 puzzles {challenge.createdBy} sailed. Beat their score.</li>}
              </>
            ) : (
              <>
                <li><b>5 puzzles</b>: 2 easy, 2 medium, 1 hard. The same for everyone today.</li>
                <li>One scored attempt a day. It resets at 00:00 UTC.</li>
              </>
            )}
            <li className="font-semibold">{introTiming(format, rel)}</li>
            <li>Each clock starts after a short steady beat. You can pause between puzzles.</li>
          </ul>
        </Note>
        <label className="flex min-h-12 cursor-pointer items-center justify-between gap-4 border-y border-hair py-3">
          <span className="text-s">
            <b className="text-m">Relaxed mode</b>
            <span className="block text-ink-2">Double time; Hand Tracker steps on tap. Unranked, kept on this device.</span>
          </span>
          <input
            type="checkbox"
            className="size-6 shrink-0"
            checked={rel}
            onChange={(e) => saveSettings(browserKV, { ...settings, relaxed: e.target.checked })}
          />
        </label>
        {challenge && <ChallengeBoard id={challenge.id} playerId={player?.id ?? null} refreshKey="intro" limit={5} />}
        <div className="flex gap-2">
          <ButtonLink href="/" variant="secondary">Back</ButtonLink>
          <Button className="flex-1" onClick={start} disabled={mode === "daily" && !today}>
            {challenge ? "Accept challenge" : mode === "rush" ? "Start Rush" : "Play today's Daily"}
            {rel && <span className="sea font-normal"> relaxed</span>}
          </Button>
        </div>
      </div>
    );
  }

  if (!puzzle || !item || !play) return null;

  if (play.between.phase === "paused") {
    return (
      <div className="flex flex-col gap-4">
        <RunHeader format={format} mode={mode} marks={marks} index={index} total={items.length} tier={item.tier} relaxed={play.relaxed} />
        <section className="anim-pop flex flex-col items-center gap-3 py-10 text-center" aria-label="Paused">
          <h2 className="text-l font-extrabold wide uppercase">Paused</h2>
          <p className="text-ink-2">
            {answered} of {items.length} done. The next puzzle&apos;s clock starts when you resume.
          </p>
          <Button className="w-full" onClick={() => step("resume")} autoFocus>
            Resume
          </Button>
        </section>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <RunHeader format={format} mode={mode} marks={marks} index={index} total={items.length} tier={item.tier} relaxed={play.relaxed} />
      <div key={`${play.seed}-${index}`}>
        {puzzle.format === "pip-flash" && (
          <PipFlashPlay puzzle={puzzle} onAnswer={(a: PipFlashAnswer, ms) => onAnswer(a, ms)} />
        )}
        {puzzle.format === "port-math" && (
          <PortMathPlay puzzle={puzzle} onAnswer={(a: PortMathAnswer | null, ms) => onAnswer(a, ms)} />
        )}
        {puzzle.format === "hand-tracker" && (
          <HandTrackerPlay
            puzzle={puzzle}
            tapPaced={play.relaxed}
            onAnswer={(a: HandTrackerAnswer, ms) => onAnswer(a, ms)}
          />
        )}
      </div>
      {last && (
        <Feedback
          verdict={last}
          action={finished ? "See results" : "Next"}
          onNext={() => step("next")}
          onPause={finished ? undefined : () => step("pause")}
          autoAdvance={last.correct}
        />
      )}
    </div>
  );
}
