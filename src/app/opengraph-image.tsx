import { ImageResponse } from "next/og";
import { generateBoard } from "@/engine";
import { ChartSnippet, OG_SIZE, ogFonts } from "@/components/ChartSnippet";

export const alt = "Hexathlon: a chart of one island, and skill drills for hex trading games";
export const size = OG_SIZE;
export const contentType = "image/png";

/** A fixed, handsome island so the site card never changes under a cached link. */
const CARD_SEED = 20260929;

export default async function Image() {
  return new ImageResponse(
    (
      <ChartSnippet
        board={generateBoard(CARD_SEED)}
        title="Read the board. Trade lean. Count cards."
        note="Skill drills for hex trading games"
        detail="Pip Flash · Port Math · Hand Tracker. A Daily run, Rush, friend challenges."
        edition="CHART OF ONE ISLAND · NEW EDITION DAILY"
      />
    ),
    { ...size, fonts: await ogFonts() },
  );
}
