import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { isRed, pips, TOPOLOGY, toCartesian, type Board, type Resource } from "@/engine";
import { RESOURCE_META } from "@/game/meta";
import { portMark } from "@/components/Board";
import { glyphPath } from "@/components/glyphs";

/**
 * The share card: the island on the left and, on the right, the title, the
 * score stamp and the edition date.
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

// Satori renders without the page's CSS, so the day palette is repeated here
// as literals; keep it in step with the tokens in globals.css.
const PAPER = "#f3f7f7";
const INK = "#1d2b36";
const INK2 = "#475a68";
const ACCENT = "#1b6a96";
const SEA = "#a8d6e4";
const SEA2 = "#c9e8f0";

const PLATE = 560;
const VERTS = TOPOLOGY.vertices.map((v) => toCartesian(v.x, v.y));
const CENTERS = TOPOLOGY.hexes.map((h) => toCartesian(h.x, h.y));
const HALF = 6.1;
const k = PLATE / (HALF * 2);
const px = (u: number) => (u + HALF) * k;

function hexPoints(id: number, scale = 1) {
  const c = CENTERS[id];
  return TOPOLOGY.hexes[id].vertices
    .map((v) => `${px(c.x + (VERTS[v].x - c.x) * scale)},${px(c.y + (VERTS[v].y - c.y) * scale)}`)
    .join(" ");
}

// Same port geometry as the in-app board.
const portMarks = (board: Board) => board.ports.map((port) => ({ port, ...portMark(port.vertices[0], port.vertices[1]) }));

function SnippetPlate({ board }: { board: Board }) {
  const ports = portMarks(board);
  return (
    <div style={{ display: "flex", position: "relative", width: PLATE, height: PLATE, }}>
      <svg width={PLATE} height={PLATE} viewBox={`0 0 ${PLATE} ${PLATE}`} style={{ position: "absolute", left: 0, top: 0 }}>
        <rect width={PLATE} height={PLATE} rx={16} fill={SEA} />
        {TOPOLOGY.hexes.map((h) => (
          <polygon key={`b${h.id}`} points={hexPoints(h.id, 1.32)} fill={SEA2} />
        ))}
        {ports.map(({ port, a, b, p }) => (
          <path
            key={`p${port.edge}`}
            d={`M${px(a.x)} ${px(a.y)}L${px(p.x)} ${px(p.y)}M${px(b.x)} ${px(b.y)}L${px(p.x)} ${px(p.y)}`}
            stroke={INK2}
            strokeWidth={3}
            strokeLinecap="round"
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
      {ports.map(({ port, p }) => (
        <div
          key={`q${port.edge}`}
          style={{
            position: "absolute",
            left: px(p.x) - (port.kind === "generic" ? 22 : 31),
            top: px(p.y) - 12,
            width: port.kind === "generic" ? 44 : 62,
            gap: 3,
            height: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: port.kind === "generic" ? "#ffffff" : RESOURCE_META[port.kind].fill,
            border: `1.5px solid ${port.kind === "generic" ? INK2 : PAPER}`,
            borderRadius: 6,
            fontFamily: "Archivo",
            fontSize: 15,
            color: port.kind === "generic" ? INK : RESOURCE_META[port.kind].glyph,
          }}
        >
          {port.kind === "generic" ? "3:1" : "2:1"}
          {port.kind !== "generic" && (
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path d={glyphPath(port.kind)} fill="none" stroke={RESOURCE_META[port.kind].glyph} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      ))}
      {/* Terrain glyphs, so no resource is told apart by colour alone. */}
      {TOPOLOGY.hexes.map((h) => {
        const { terrain, token } = board.hexes[h.id];
        const g = token === null ? 0.8 * k : 0.36 * k;
        const cy = token === null ? CENTERS[h.id].y : CENTERS[h.id].y - 0.62;
        return (
          <svg
            key={`g${h.id}`}
            width={g}
            height={g}
            viewBox="0 0 24 24"
            style={{ position: "absolute", left: px(CENTERS[h.id].x) - g / 2, top: px(cy) - g / 2 }}
          >
            <path
              d={glyphPath(token === null ? "desert" : (terrain as Resource))}
              fill="none"
              stroke={RESOURCE_META[terrain].glyph}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );
      })}
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
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "Archivo",
              fontSize: 19,
              lineHeight: 1,
              color: isRed(token) ? "#b3122b" : INK,
            }}
          >
            {token}
            {/* Pips under the number, as on the board. */}
            <div style={{ display: "flex", gap: 1.5, marginTop: 2 }}>
              {Array.from({ length: pips(token) }, (_, i) => (
                <div key={i} style={{ width: 3.5, height: 3.5, borderRadius: 2, background: isRed(token) ? "#b3122b" : INK }} />
              ))}
            </div>
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
        }}
      >
        <SnippetPlate board={board} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 18, color: INK }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <svg width="44" height="44" viewBox="-12 -12 24 24">
              <polygon points="0,-9.5 8.2,-4.75 8.2,4.75 0,9.5 -8.2,4.75 -8.2,-4.75" fill="none" stroke={INK} strokeWidth="2.2" />
              <circle r="3.2" fill={ACCENT} />
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
                border: `2px solid ${ACCENT}`,
                transform: "rotate(-4deg)",
              }}
            >
              {/* Two nested rules: Satori has no double border style. */}
              <div
                style={{
                  display: "flex",
                  padding: "4px 22px",
                  border: `2px solid ${ACCENT}`,
                  color: ACCENT,
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
