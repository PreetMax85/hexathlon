import { CANDIDATE_LABELS, isRed, pips, TOPOLOGY, toCartesian, type Board as BoardData, type Resource } from "@/engine";
import { RESOURCE_META } from "@/game/meta";
import { BoardGlyph, BuoyShape } from "./glyphs";

const pt = (x: number, y: number) => toCartesian(x, y);

const VERTEX_POINTS = TOPOLOGY.vertices.map((v) => pt(v.x, v.y));
const HEX_CENTERS = TOPOLOGY.hexes.map((h) => pt(h.x, h.y));

/** Port chips sit this far outside the coast. */
const PORT_OUT = 0.95;
const CHIP = { w: 1.06, h: 0.56 };
const TOKEN_R = 0.46;
const MARKER_R = 0.42;

type Port = BoardData["ports"][number];

/** Where a port's chip sits: straight out from the middle of its coastal edge. */
export function portMark(a: number, b: number) {
  const pa = VERTEX_POINTS[a];
  const pb = VERTEX_POINTS[b];
  const mx = (pa.x + pb.x) / 2;
  const my = (pa.y + pb.y) / 2;
  const len = Math.hypot(mx, my) || 1;
  return { a: pa, b: pb, p: { x: mx + (mx / len) * PORT_OUT, y: my + (my / len) * PORT_OUT } };
}

// Fixed bounds that hold a chip on any coastal edge, so every board is the
// same size and the island fills as much of the width as it can.
const EDGE_PAD = 0.14;
const CHIP_SPOTS = TOPOLOGY.coast.map((id) => portMark(TOPOLOGY.edges[id].a, TOPOLOGY.edges[id].b).p);
const MIN_X = Math.min(...CHIP_SPOTS.map((p) => p.x)) - CHIP.w / 2 - EDGE_PAD;
const MAX_X = Math.max(...CHIP_SPOTS.map((p) => p.x)) + CHIP.w / 2 + EDGE_PAD;
const MIN_Y = Math.min(...CHIP_SPOTS.map((p) => p.y)) - CHIP.h / 2 - EDGE_PAD;
const MAX_Y = Math.max(...CHIP_SPOTS.map((p) => p.y)) + CHIP.h / 2 + EDGE_PAD;
export const BOARD_BOUNDS = { x: MIN_X, y: MIN_Y, w: MAX_X - MIN_X, h: MAX_Y - MIN_Y };

export interface BoardReveal {
  /** Pip total per candidate. */
  totals: number[];
  best: number;
  /** Chosen candidate index, or null on timeout. */
  picked: number | null;
}

interface BoardProps {
  board: BoardData;
  candidates?: number[];
  /** Called with the candidate index. Omit for a non-interactive board. */
  onPick?: (index: number) => void;
  reveal?: BoardReveal;
  className?: string;
  label?: string;
}

function hexPoints(hexId: number, scale = 1) {
  const c = HEX_CENTERS[hexId];
  return TOPOLOGY.hexes[hexId].vertices
    .map((v) => {
      const p = VERTEX_POINTS[v];
      return `${c.x + (p.x - c.x) * scale},${c.y + (p.y - c.y) * scale}`;
    })
    .join(" ");
}

/** Pip dots, sized so five sit well inside the token. */
function Pips({ count, color }: { count: number; color: string }) {
  const gap = 0.12;
  const start = -((count - 1) * gap) / 2;
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <circle key={i} cx={start + i * gap} cy={0.25} r={0.048} fill={color} />
      ))}
    </>
  );
}

/** A hex's terrain glyph, drawn after all the land so no neighbour covers it. */
function TerrainGlyph({ hexId, board, busy }: { hexId: number; board: BoardData; busy: ReadonlySet<number> }) {
  const { terrain, token } = board.hexes[hexId];
  const meta = RESOURCE_META[terrain];
  const c = HEX_CENTERS[hexId];
  const verts = TOPOLOGY.hexes[hexId].vertices;
  const top = verts.reduce((a, v) => (VERTEX_POINTS[v].y < VERTEX_POINTS[a].y ? v : a));
  const bottom = verts.reduce((a, v) => (VERTEX_POINTS[v].y > VERTEX_POINTS[a].y ? v : a));
  // The glyph sits above the token; when a corner marker is there it moves
  // below the token, or shrinks if both corners are taken.
  const glyph =
    token === null
      ? { y: c.y, s: 0.9 }
      : !busy.has(top)
        ? { y: c.y - 0.62, s: 0.42 }
        : !busy.has(bottom)
          ? { y: c.y + 0.73, s: 0.3 }
          : { y: c.y - 0.48, s: 0.22 };
  return <BoardGlyph name={token === null ? "desert" : (terrain as Resource)} x={c.x} y={glyph.y} s={glyph.s} color={meta.glyph} />;
}

function Token({ hexId, board }: { hexId: number; board: BoardData }) {
  const { token } = board.hexes[hexId];
  if (token === null) return null;
  const c = HEX_CENTERS[hexId];
  const red = isRed(token);
  const numColor = red ? "var(--token-red)" : "var(--token-ink)";
  return (
    <g transform={`translate(${c.x} ${c.y + 0.1})`}>
      <circle r={TOKEN_R} fill="var(--token)" />
      <text y={0.07} fontSize={0.46} fontWeight={red ? 800 : 700} textAnchor="middle" fill={numColor} style={{ fontStretch: "88%" }}>
        {token}
      </text>
      <Pips count={pips(token)} color={numColor} />
    </g>
  );
}

/** A port: two short piers to the coast and a chip in its resource's own colours. */
function PortMarker({ port }: { port: Port }) {
  const { a, b, p } = portMark(port.vertices[0], port.vertices[1]);
  const generic = port.kind === "generic";
  const meta = generic ? null : RESOURCE_META[port.kind as Resource];
  const fill = meta ? meta.fill : "var(--deep)";
  const ink = meta ? meta.glyph : "var(--ink)";
  return (
    <g>
      <path
        d={`M${a.x} ${a.y}L${p.x} ${p.y}M${b.x} ${b.y}L${p.x} ${p.y}`}
        stroke="var(--ink-2)"
        strokeWidth={0.07}
        strokeLinecap="round"
      />
      <g style={{ filter: meta ? "var(--land-filter)" : undefined }}>
        <rect
          x={p.x - CHIP.w / 2}
          y={p.y - CHIP.h / 2}
          width={CHIP.w}
          height={CHIP.h}
          rx={0.14}
          fill={fill}
          stroke={generic ? "var(--ink-2)" : "var(--paper)"}
          strokeWidth={0.05}
        />
        <text
          x={generic ? p.x : p.x - 0.2}
          y={p.y + 0.12}
          fontSize={0.34}
          fontWeight={800}
          textAnchor="middle"
          fill={ink}
          style={{ fontStretch: "88%" }}
        >
          {generic ? "3:1" : "2:1"}
        </text>
        {meta && <BoardGlyph name={port.kind as Resource} x={p.x + 0.26} y={p.y} s={0.38} color={ink} />}
      </g>
    </g>
  );
}

/**
 * The island: sea with a shore band, ports, hexes, tokens with pips, lettered
 * corners and, once answered, the buoy verdicts.
 */
export function Board({ board, candidates, onPick, reveal, className, label }: BoardProps) {
  const busy = new Set(candidates ?? []);
  const { x, y, w, h } = BOARD_BOUNDS;
  return (
    <svg
      viewBox={`${x} ${y} ${w} ${h}`}
      className={className}
      role={candidates ? "group" : "img"}
      aria-label={label ?? "Game board"}
      style={{ userSelect: "none", fontFamily: "var(--font-chart)" }}
    >
      <rect x={x} y={y} width={w} height={h} fill="var(--sea)" />
      <g fill="var(--sea-2)">
        {TOPOLOGY.hexes.map((hex) => (
          <polygon key={hex.id} points={hexPoints(hex.id, 1.32)} />
        ))}
      </g>
      {board.ports.map((port) => (
        <PortMarker key={port.edge} port={port} />
      ))}
      {/* Dusk dims the land, never the tokens. */}
      <g style={{ filter: "var(--land-filter)" }}>
        {TOPOLOGY.hexes.map((hex) => (
          <polygon
            key={hex.id}
            points={hexPoints(hex.id)}
            fill={RESOURCE_META[board.hexes[hex.id].terrain].fill}
            stroke="var(--paper)"
            strokeWidth={0.06}
            strokeLinejoin="round"
          />
        ))}
        {TOPOLOGY.hexes.map((hex) => (
          <TerrainGlyph key={hex.id} hexId={hex.id} board={board} busy={busy} />
        ))}
      </g>
      {/* The verdict: the hexes that fed the best corner light up; a wrong pick's hexes are ringed in red. */}
      {reveal && candidates && (
        <g fill="none" strokeLinejoin="round" className="anim-pop" aria-hidden>
          {reveal.picked !== null && reveal.picked !== reveal.best &&
            TOPOLOGY.vertices[candidates[reveal.picked]].hexes.map((id) => (
              <polygon key={`p${id}`} points={hexPoints(id, 0.9)} stroke="var(--red)" strokeWidth={0.09} strokeDasharray="0.2 0.12" />
            ))}
          {TOPOLOGY.vertices[candidates[reveal.best]].hexes.map((id) => (
            <polygon key={`b${id}`} points={hexPoints(id, 0.92)} stroke="var(--buoy-green)" strokeWidth={0.13} />
          ))}
        </g>
      )}
      {TOPOLOGY.hexes.map((hex) => (
        <Token key={hex.id} hexId={hex.id} board={board} />
      ))}
      {candidates?.map((vertex, i) => {
        const p = VERTEX_POINTS[vertex];
        const isBest = reveal?.best === i;
        const isPicked = reveal?.picked === i;
        const interactive = !!onPick && !reveal;
        const dim = reveal && !isBest && !isPicked;
        return (
          <g
            key={vertex}
            className="waypoint"
            role={interactive ? "button" : undefined}
            tabIndex={interactive ? 0 : undefined}
            aria-label={`Corner ${CANDIDATE_LABELS[i]}${reveal ? `, ${reveal.totals[i]} pips${isBest ? ", the most" : ""}${isPicked ? ", your pick" : ""}` : ""}`}
            style={{ cursor: interactive ? "pointer" : "default", outline: "none" }}
            onClick={interactive ? () => onPick(i) : undefined}
            onKeyDown={
              interactive
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onPick(i);
                    }
                  }
                : undefined
            }
          >
            {/* Invisible hit area: 44 px+ at 360 px wide. */}
            <circle cx={p.x} cy={p.y} r={0.8} fill="transparent" />
            <circle className="waypoint-focus" cx={p.x} cy={p.y} r={MARKER_R + 0.14} fill="none" stroke="var(--accent)" strokeWidth={0.1} />
            {reveal && (isBest || isPicked) ? (
              <>
                {isPicked && isBest && (
                  <circle cx={p.x} cy={p.y} r={0.5} fill="none" stroke="var(--buoy-green)" strokeWidth={0.1} className="anim-pulse" />
                )}
                {/* The buoy drops onto the corner itself, so it never covers a token. */}
                <g className="anim-buoy">
                  <BuoyShape kind={isBest ? "cone" : "can"} x={p.x} y={p.y + 0.4} s={0.9} />
                </g>
              </>
            ) : (
              <>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={MARKER_R}
                  fill={dim ? "var(--paper)" : "var(--ink)"}
                  stroke={dim ? "var(--ink-2)" : "var(--token)"}
                  strokeWidth={0.07}
                />
                <text
                  x={p.x}
                  y={p.y + 0.16}
                  fontSize={0.46}
                  fontWeight={800}
                  textAnchor="middle"
                  fill={dim ? "var(--ink-2)" : "var(--token)"}
                >
                  {CANDIDATE_LABELS[i]}
                </text>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}
