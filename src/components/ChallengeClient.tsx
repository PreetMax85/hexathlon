"use client";

import { fetchChallenge } from "@/game/api";
import { usePlayer } from "@/game/browser";
import { GameRun } from "./GameRun";
import { NicknameDialog } from "./NicknameDialog";
import { Button, ButtonLink } from "./ui";
import { useFetched } from "./useFetched";

function Skeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading challenge">
      <div className="h-36 animate-pulse rounded-3xl bg-surface-2" />
      <div className="h-32 animate-pulse rounded-2xl bg-surface-2" />
      <div className="h-12 animate-pulse rounded-xl bg-surface-2" />
    </div>
  );
}

/** `/c/<id>`: load the challenge, then play the same Rush. */
export function ChallengeClient({ id }: { id: string }) {
  const player = usePlayer();
  const { result, retry } = useFetched(`c:${id}:${player?.id ?? "-"}`, () => fetchChallenge(id, player?.id ?? null));

  if (player === undefined || result === undefined) return <Skeleton />;
  if (!result.ok) {
    const missing = result.status === 404;
    return (
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-line bg-surface p-6 text-center">
        <span aria-hidden className="text-5xl">{missing ? "🧭" : "📡"}</span>
        <h1 className="text-2xl font-black">{missing ? "Challenge not found" : "Couldn't load the challenge"}</h1>
        <p className="text-muted">
          {missing ? "The link may be mistyped, or it never existed." : result.error}
        </p>
        <div className="flex w-full gap-2">
          {!missing && (
            <Button className="flex-1" onClick={retry}>
              Try again
            </Button>
          )}
          <ButtonLink href="/" variant="secondary" className="flex-1">
            Home
          </ButtonLink>
        </div>
      </div>
    );
  }
  if (player === null) return <NicknameDialog />;

  const c = result.data;
  return (
    <GameRun
      format={c.format}
      mode="rush"
      fixedSeed={c.seed}
      challenge={{ id: c.id, createdBy: c.createdBy }}
    />
  );
}
