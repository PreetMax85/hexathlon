"use client";

import { fetchChallenge } from "@/game/api";
import { usePlayer } from "@/game/browser";
import { GameRun } from "./GameRun";
import { Button, ButtonLink } from "./ui";
import { useFetched } from "./useFetched";

/** A dashed danger ring with "ED", the chart mark for a feature whose existence is doubtful. */
function UnchartedMark() {
  return (
    <svg width={88} height={88} viewBox="-44 -44 88 88" aria-hidden className="text-accent">
      <circle r={34} fill="none" stroke="currentColor" strokeWidth={2} strokeDasharray="5 4" />
      <circle r={4} fill="currentColor" />
      <text y={24} textAnchor="middle" fontSize={15} fontStyle="italic" fontWeight={700} fill="currentColor">ED</text>
    </svg>
  );
}

function Skeleton() {
  return (
    <div className="flex flex-col gap-4 pt-2" aria-busy="true" aria-label="Loading challenge">
      <p className="sea text-ink-2">Plotting the challenge…</p>
      <div className="hatch h-28 border-y border-hair" />
      <div className="hatch h-32 border-y border-hair" />
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
      <div className="flex flex-col gap-5 py-6">
        <UnchartedMark />
        <div className="flex flex-col gap-2">
          <h1 className="text-l font-extrabold uppercase wide">
            {missing ? "No such challenge" : "Couldn't load the challenge"}
          </h1>
          <p className="sea text-ink-2">
            {missing ? (
              "The link may be mistyped, or the challenge doesn't exist."
            ) : (
              result.error
            )}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          {!missing && (
            <Button className="flex-1" onClick={retry}>
              Try again
            </Button>
          )}
          <ButtonLink href="/" variant={missing ? "primary" : "secondary"} className="flex-1">
            Back to today&apos;s chart
          </ButtonLink>
          {missing && (
            <ButtonLink href="/play/pip-flash/rush" variant="secondary" className="flex-1">
              Start a Rush
            </ButtonLink>
          )}
        </div>
      </div>
    );
  }

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
