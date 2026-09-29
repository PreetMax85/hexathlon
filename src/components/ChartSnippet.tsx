import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { isRed, TOPOLOGY, toCartesian, type Board } from "@/engine";
import { soundings } from "@/game/chart";
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

const nearLand = (x: number, y: number) => CENTERS.some((c) => Math.hypot(c.x - x, c.y - y) < 2.05);

function portMarks(board: Board) {
  return board.ports.map((port) => {
    const a = VERTS[port.vertices[0]];
    const b = VERTS[port.vertices[1]];
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const len = Math.hypot(mx, my) || 1;
    return { port, a, b, p: { x: mx + (mx / len) * 1.02, y: my + (my / len) * 1.02 } };
  });
}

function IslandPlate({ board }: { board: Board }) {
  const spots = soundings(board.seed, { x: -HALF + 0.3, y: -HALF + 0.3, w: HALF * 2 - 0.6, h: HALF * 2 - 0.6 }, nearLand);
  const ports = portMarks(board);
  const ticks = Array.from({ length: Math.floor((HALF * 2) / 0.5) + 1 }, (_, i) => i * 0.5 * k);
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
        {ports.map(({ port, a, b, p }) => (
          <path
            key={`p${port.edge}`}
            d={`M${px(a.x)} ${px(a.y)}L${px(p.x)} ${px(p.y)}L${px(b.x)} ${px(b.y)}`}
            fill="none"
            stroke={MAGENTA}
            strokeWidth={2}
            strokeDasharray="5 3"
          />
        ))}
        {ticks.map((t, i) => (
          <path
            key={`g${i}`}
            d={`M${t} 0v${i % 4 === 0 ? 14 : 7}M${t} ${PLATE}v-${i % 4 === 0 ? 14 : 7}M0 ${t}h${i % 4 === 0 ? 14 : 7}M${PLATE} ${t}h-${i % 4 === 0 ? 14 : 7}`}
            stroke={INK}
            strokeWidth={1.5}
          />
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
      {spots.map((sp, i) => (
        <div
          key={`s${i}`}
          style={{
            position: "absolute",
            left: px(sp.x) - 14,
            top: px(sp.y) - 10,
            width: 28,
            display: "flex",
            justifyContent: "center",
            fontFamily: "ArchivoItalic",
            fontStyle: "italic",
            fontSize: 13,
            color: INK2,
          }}
        >
          {sp.depth}
        </div>
      ))}
      {ports.map(({ port, p }) => (
        <div
          key={`q${port.edge}`}
          style={{
            position: "absolute",
            left: px(p.x) - 22,
            top: px(p.y) - 12,
            width: 44,
            height: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#ffffff",
            border: `1.5px solid ${MAGENTA}`,
            borderRadius: 4,
            fontFamily: "ArchivoItalic",
            fontStyle: "italic",
            fontSize: 14,
            color: MAGENTA,
          }}
        >
          {port.kind === "generic" ? "3:1" : "2:1"}
        </div>
      ))}
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
                padding: 4,
                border: `2px solid ${MAGENTA}`,
                transform: "rotate(-4deg)",
              }}
            >
              {/* Two nested rules: Satori has no double border style. */}
              <div
                style={{
                  display: "flex",
                  padding: "4px 22px",
                  border: `2px solid ${MAGENTA}`,
                  color: MAGENTA,
                  fontFamily: "ArchivoWide",
                  fontSize: 64,
                }}
              >
                {score}
              </div>
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
