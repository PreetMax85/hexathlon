import { ImageResponse } from "next/og";
import { dailyItems, dailySeed, generate, utcDateKey } from "@/engine";
import { ChartSnippet, OG_SIZE, ogFonts } from "@/app/_og/ChartSnippet";
import { chartDate } from "@/game/chart";

export const alt = "Hexathlon: today's island as a chart, and skill drills for hex trading games";
export const size = OG_SIZE;
export const contentType = "image/png";
/** A new edition every day: regenerate hourly so the date and island stay current. */
export const revalidate = 3600;

export default async function Image() {
  const today = utcDateKey(new Date());
  const first = dailyItems(dailySeed("pip-flash", today))[0];
  return new ImageResponse(
    (
      <ChartSnippet
        board={generate("pip-flash", first.tier, first.seed).board}
        title="Read the board. Trade lean. Count cards."
        note="Skill drills for hex trading games"
        detail="Today's island, from the Pip Flash Daily. Pip Flash · Port Math · Hand Tracker."
        edition={`ED. ${chartDate(today)}`}
      />
    ),
    { ...size, fonts: await ogFonts() },
  );
}
