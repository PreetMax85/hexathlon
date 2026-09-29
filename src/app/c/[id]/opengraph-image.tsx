import { ImageResponse } from "next/og";
import { generate, generateBoard, isFormat, runItems } from "@/engine";
import { ChartSnippet, OG_SIZE, ogFonts } from "@/app/_og/ChartSnippet";
import { getDb } from "@/db/client";
import { FORMAT_META } from "@/game/meta";
import { chartDate } from "@/game/chart";
import { formatClock } from "@/game/time";
import { CHALLENGE_ID } from "@/server/verify";
import { challengeLeaderboard, getChallenge } from "@/server/store";

export const alt = "A Hexathlon Rush challenge: the island, the score to beat and the date";
export const size = OG_SIZE;
export const contentType = "image/png";

/** The challenge's own island: the first board of its Rush when it has one. */
function islandFor(format: string, seed: number) {
  if (format === "pip-flash") {
    const first = runItems("rush", seed)[0];
    return generate("pip-flash", first.tier, first.seed).board;
  }
  return generateBoard(seed);
}

async function load(id: string) {
  if (!CHALLENGE_ID.test(id)) return null;
  try {
    const db = getDb();
    const c = await getChallenge(db, id);
    if (!c || !isFormat(c.format)) return null;
    const board = await challengeLeaderboard(db, id);
    return { ...c, format: c.format, top: board[0] ?? null };
  } catch {
    // No database (or it's down): fall back to the generic card.
    return null;
  }
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await load(id);
  const fonts = await ogFonts();
  if (!c) {
    return new ImageResponse(
      (
        <ChartSnippet
          board={generateBoard(20260929)}
          title="Rush challenge"
          note="Thirteen puzzles, the same for both of you"
          detail="Open the link to sail it."
          edition="HEXATHLON · CHALLENGE"
        />
      ),
      { ...size, fonts },
    );
  }
  const name = FORMAT_META[c.format].name;
  const edition = `ED. ${chartDate(c.createdAt.toISOString().slice(0, 10))}`;
  return new ImageResponse(
    (
      <ChartSnippet
        board={islandFor(c.format, c.seed)}
        title={`${name} Rush`}
        note={`${c.createdBy} challenges you`}
        score={c.top ? `${c.top.correct}/13` : undefined}
        detail={c.top ? `Best so far: ${c.top.nickname}, ${c.top.correct}/13 in ${formatClock(c.top.totalMs)}. Beat it.` : "Same 13 puzzles. Beat their score."}
        edition={edition}
      />
    ),
    { ...size, fonts },
  );
}
