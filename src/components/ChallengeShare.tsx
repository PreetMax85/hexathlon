"use client";

import { useState } from "react";
import type { Format } from "@/engine";
import { challengeUrl, createChallenge } from "@/game/api";
import { Button } from "./ui";

interface Props {
  playerId: string;
  format: Format;
  seed: number;
  /** The server has this Rush result (challenges need one). */
  saved: boolean;
  /** Existing challenge when this run already belongs to one. */
  challengeId?: string;
  shareLine: string;
}

type State =
  | { kind: "idle" }
  | { kind: "working" }
  | { kind: "ready"; url: string; copied: boolean }
  | { kind: "error"; message: string };

async function deliver(text: string, url: string): Promise<"shared" | "copied" | "failed"> {
  try {
    if (typeof navigator.share === "function" && matchMedia("(pointer: coarse)").matches) {
      await navigator.share({ text, url });
      return "shared";
    }
    await navigator.clipboard.writeText(`${text}\n${url}`);
    return "copied";
  } catch (err) {
    return (err as Error)?.name === "AbortError" ? "shared" : "failed";
  }
}

/** "Challenge a friend": makes the link, then copies it with the share text. */
export function ChallengeShare({ playerId, format, seed, saved, challengeId, shareLine }: Props) {
  const [state, setState] = useState<State>({ kind: "idle" });

  const go = async () => {
    setState({ kind: "working" });
    let url = state.kind === "ready" ? state.url : null;
    if (!url && challengeId) url = challengeUrl(window.location.origin, challengeId);
    if (!url) {
      const res = await createChallenge({ playerId, format, seed });
      if (!res.ok) {
        setState({ kind: "error", message: res.error });
        return;
      }
      url = challengeUrl(window.location.origin, res.data.id);
    }
    const outcome = await deliver(shareLine, url);
    setState({ kind: "ready", url, copied: outcome === "copied" });
  };

  return (
    <section aria-label="Challenge a friend" className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-4">
      <h3 className="text-lg font-extrabold">{challengeId ? "Send it on" : "Challenge a friend"}</h3>
      <p className="text-sm text-muted">They play the exact same 13 puzzles and land on this leaderboard.</p>
      <Button onClick={go} disabled={!saved || state.kind === "working"}>
        {state.kind === "working"
          ? "Creating link…"
          : state.kind === "ready"
            ? state.copied
              ? "Link copied! Copy again"
              : "Share link again"
            : challengeId
              ? "Share challenge link"
              : "Copy challenge link"}
      </Button>
      {!saved && <p className="text-xs text-muted">Waiting for your score to be saved first.</p>}
      {state.kind === "ready" && (
        <output className="block break-all rounded-lg border border-dashed border-line p-2 text-center text-sm font-semibold">
          {state.url}
        </output>
      )}
      {state.kind === "error" && <p className="text-sm text-bad">Couldn&apos;t create the link: {state.message}</p>}
    </section>
  );
}
