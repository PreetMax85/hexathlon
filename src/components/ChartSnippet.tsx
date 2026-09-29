import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { isRed, TOPOLOGY, toCartesian, type Board } from "@/engine";
import { RESOURCE_META } from "@/game/meta";

/**
 * The share card as a chart snippet: the island plate on the left and a
 * cartouche on the right with the title, the score and the edition date.
 * Rendered by `ImageResponse` (Satori), so layout is flexbox only.
 */

export const OG_SIZE = { width: 1200, height: 630 };

const FONT_DIR = join(process.cwd(), "src/app/fonts/og");

export async function ogFonts() {
  const [wide, body, italic] = await Promise.all([
    readFile(join(FONT_DIR, "archivo-wide-800.ttf")),
    readFile(join(FONT_DIR, "archivo-600.ttf")),
    readFile(join(FONT_DIR, "archivo-italic-500.ttf")),
  ]);
  return [
    { name: "ArchivoWide", data: wide, style: "normal" as const, weight: 800 as const },
    { name: "Archivo", data: body, style: "normal" as const, weight: 600 as const },
    { name: "ArchivoItalic", data: italic, style: "italic" as const, weight: 500 as const },
  ];
}

const PAPER = "#f3f7f7";
const INK = "#1d2b36";
const INK2 = "#475a68";
const MAGENTA = "#c2187a";

const PLATE = 560;
const VERTS = TOPOLOGY.vertices.map((v) => toCartesian(v.x, v.y));
const CENTERS = TOPOLOGY.hexes.map((h) => toCartesian(h.x, h.y));
const HALF = 6.4;
const k = PLATE / (HALF * 2);
const px = (u: number) => (u + HALF) * k;

function hexPoints(id: number, scale = 1) {
  const c = CENTERS[id];
  return TOPOLOGY.hexes[id].vertices
    .map((v) => `${px(c.x + (VERTS[v].x - c.x) * scale)},${px(c.y + (VERTS[v].y - c.y) * scale)}`)
    .join(" ");
}

function IslandPlate({ board }: { board: Board }) {
  return (
    <div style={{ display: "flex", position: "relative", width: PLATE, height: PLATE, }}>
      <svg width={PLATE} height={PLATE} viewBox={`0 0 ${PLATE} ${PLATE}`} style={{ position: "absolute", left: 0, top: 0 }}>
        <rect width={PLATE} height={PLATE} fill="#ffffff" />
        <rect x={1.5} y={1.5} width={PLATE - 3} height={PLATE - 3} fill="none" stroke={INK} strokeWidth={3} />
        {TOPOLOGY.hexes.map((h) => (
          <polygon key={`a${h.id}`} points={hexPoints(h.id, 2.05)} fill="#cfebef" />
        ))}
        {TOPOLOGY.hexes.map((h) => (
          <polygon key={`b${h.id}`} points={hexPoints(h.id, 1.45)} fill="#9ed6df" />
        ))}
        {TOPOLOGY.hexes.map((h) => (
          <polygon
            key={`c${h.id}`}
            points={hexPoints(h.id)}
            fill={RESOURCE_META[board.hexes[h.id].terrain].fill}
            stroke={PAPER}
            strokeWidth={2.5}
          />
        ))}
        {TOPOLOGY.hexes.map((h) =>
          board.hexes[h.id].token === null ? null : (
            <circle key={`d${h.id}`} cx={px(CENTERS[h.id].x)} cy={px(CENTERS[h.id].y + 0.05)} r={0.44 * k} fill="#fbf8ef" />
          ),
        )}
      </svg>
      {TOPOLOGY.hexes.map((h) => {
        const token = board.hexes[h.id].token;
        if (token === null) return null;
        const size = 0.88 * k;
        return (
          <div
            key={`t${h.id}`}
            style={{
              position: "absolute",
              left: px(CENTERS[h.id].x) - size / 2,
              top: px(CENTERS[h.id].y + 0.05) - size / 2,
              width: size,
              height: size,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "Archivo",
              fontSize: 20,
              color: isRed(token) ? "#b3122b" : INK,
            }}
          >
            {token}
          </div>
        );
      })}
    </div>
  );
}

export function ChartSnippet({
  board,
  note,
  title,
  score,
  detail,
  edition,
}: {
  board: Board;
  note: string;
  title: string;
  score?: string;
  detail: string;
  edition: string;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: PAPER,
        padding: 18,
      }}
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          gap: 44,
          padding: "0 40px",
          border: `3px solid ${INK}`,
          outline: `1px solid ${INK}`,
        }}
      >
        <IslandPlate board={board} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 18, color: INK }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <svg width="44" height="44" viewBox="-12 -12 24 24">
              <polygon points="0,-9.5 8.2,-4.75 8.2,4.75 0,9.5 -8.2,4.75 -8.2,-4.75" fill="none" stroke={INK} strokeWidth="2.2" />
              <circle r="3.2" fill={MAGENTA} />
            </svg>
            <div style={{ fontFamily: "ArchivoWide", fontSize: 36, letterSpacing: 5 }}>HEXATHLON</div>
          </div>
          <div style={{ fontFamily: "ArchivoWide", fontSize: 50, lineHeight: 1.05 }}>{title}</div>
          <div style={{ fontFamily: "ArchivoItalic", fontStyle: "italic", fontSize: 28, color: INK2 }}>{note}</div>
          {score && (
            <div
              style={{
                display: "flex",
                alignSelf: "flex-start",
                padding: "6px 22px",
                border: `5px double ${MAGENTA}`,
                color: MAGENTA,
                fontFamily: "ArchivoWide",
                fontSize: 64,
                transform: "rotate(-4deg)",
              }}
            >
              {score}
            </div>
          )}
          <div style={{ fontFamily: "Archivo", fontSize: 28 }}>{detail}</div>
          <div style={{ display: "flex", borderTop: `2px solid ${INK}`, paddingTop: 10, fontFamily: "Archivo", fontSize: 22, letterSpacing: 3, color: INK2 }}>
            {edition}
          </div>
        </div>
      </div>
    </div>
  );
}
