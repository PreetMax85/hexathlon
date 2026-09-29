import { ImageResponse } from "next/og";
import { dailySeed, utcDateKey } from "@/engine";
import { ChartSnippet, OG_SIZE, ogFonts } from "@/app/_og/ChartSnippet";
import { chartDate } from "@/game/chart";
import { coverBoard } from "@/game/today";

export const alt = "Hexathlon: today's island as a chart, and skill drills for hex trading games";
export const size = OG_SIZE;
export const contentType = "image/png";
/** A new edition every day: regenerate hourly so the date and island stay current. */
export const revalidate = 3600;

export default async function Image() {
  const today = utcDateKey(new Date());
  return new ImageResponse(
    (
      <ChartSnippet
        board={coverBoard(dailySeed("pip-flash", today))}
        title="Read the board. Trade lean. Count cards."
        note="Skill drills for hex trading games"
        detail="Three drills: Pip Flash, Port Math, Hand Tracker. A new Daily every day."
        edition={`Ed. ${chartDate(today)}`}
      />
    ),
    { ...size, fonts: await ogFonts() },
  );
}
