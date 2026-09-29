import { CANDIDATE_LABELS, isRed, pips, TOPOLOGY, toCartesian, type Board as BoardData, type Resource } from "@/engine";
import { soundings } from "@/game/chart";
import { RESOURCE_META } from "@/game/meta";
import { BoardGlyph, BuoyShape } from "./glyphs";

const pt = (x: number, y: number) => toCartesian(x, y);

const VERTEX_POINTS = TOPOLOGY.vertices.map((v) => pt(v.x, v.y));
const HEX_CENTERS = TOPOLOGY.hexes.map((h) => pt(h.x, h.y));

/** Port labels sit this far outside the coast. */
const PORT_OUT = 1.02;
const ISLAND_R = Math.max(...VERTEX_POINTS.map((p) => Math.hypot(p.x, p.y)));
/** The range ring runs in open water, clear of the port labels. */
export const RING_R = ISLAND_R + PORT_OUT + 0.72;
const HALF = RING_R + 0.5;
const BOUNDS = { x: -HALF, y: -HALF, w: HALF * 2, h: HALF * 2 };

/** Land, the shoal band and the ring's lane are no place for a sounding. */
const nearLand = (x: number, y: number) =>
  HEX_CENTERS.some((c) => Math.hypot(c.x - x, c.y - y) < 2.05) || Math.abs(Math.hypot(x, y) - RING_R) < 0.42;

const INSET = 0.28;
const SOUNDING_BOX = { x: BOUNDS.x + INSET, y: BOUNDS.y + INSET, w: BOUNDS.w - 2 * INSET, h: BOUNDS.h - 2 * INSET };

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
  /** Range-ring timer: remaining fraction of the time limit, 1 → 0. */
  ring?: number;
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

function Pips({ count, color }: { count: number; color: string }) {
  const gap = 0.14;
  const start = -((count - 1) * gap) / 2;
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <circle key={i} cx={start + i * gap} cy={0.25} r={0.058} fill={color} />
      ))}
    </>
  );
}

/** Land and its terrain glyph. Dusk and night dim this layer, never the tokens. */
function HexLand({ hexId, board }: { hexId: number; board: BoardData }) {
  const { terrain, token } = board.hexes[hexId];
  const meta = RESOURCE_META[terrain];
  const c = HEX_CENTERS[hexId];
  return (
    <g>
      <polygon points={hexPoints(hexId)} fill={meta.fill} stroke="var(--paper)" strokeWidth={0.06} strokeLinejoin="round" />
      {token === null ? (
        <BoardGlyph name="desert" x={c.x} y={c.y} s={0.9} color={meta.glyph} />
      ) : (
        <BoardGlyph name={terrain as Resource} x={c.x} y={c.y - 0.64} s={0.44} color={meta.glyph} />
      )}
    </g>
  );
}

function Token({ hexId, board }: { hexId: number; board: BoardData }) {
  const { token } = board.hexes[hexId];
  if (token === null) return null;
  const c = HEX_CENTERS[hexId];
  const red = isRed(token);
  const numColor = red ? "var(--token-red)" : "var(--token-ink)";
  return (
    <g>
      <g transform={`translate(${c.x} ${c.y + 0.1})`}>
        <circle r={0.44} fill="var(--token)" />
        <text
          y={0.06}
          fontSize={0.44}
          fontWeight={red ? 800 : 700}
          textAnchor="middle"
          fill={numColor}
          style={{ fontStretch: "88%" }}
        >
          {token}
        </text>
        <Pips count={pips(token)} color={numColor} />
      </g>
    </g>
  );
}

function PortMarker({ port }: { port: BoardData["ports"][number] }) {
  const a = VERTEX_POINTS[port.vertices[0]];
  const b = VERTEX_POINTS[port.vertices[1]];
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const len = Math.hypot(mx, my) || 1;
  const p = { x: mx + (mx / len) * PORT_OUT, y: my + (my / len) * PORT_OUT };
  const generic = port.kind === "generic";
  return (
    <g>
      <path
        d={`M${a.x} ${a.y}L${p.x} ${p.y}L${b.x} ${b.y}`}
        fill="none"
        stroke="var(--magenta)"
        strokeWidth={0.05}
        strokeDasharray="0.12 0.08"
        strokeLinejoin="round"
      />
      <rect x={p.x - 0.5} y={p.y - 0.27} width={1} height={0.54} rx={0.1} fill="var(--deep)" stroke="var(--magenta)" strokeWidth={0.04} />
      <text
        x={generic ? p.x : p.x - 0.14}
        y={p.y + 0.11}
        fontSize={0.3}
        fontWeight={700}
        fontStyle="italic"
        textAnchor="middle"
        fill="var(--magenta)"
      >
        {generic ? "3:1" : "2:1"}
      </text>
      {!generic && <BoardGlyph name={port.kind as Resource} x={p.x + 0.27} y={p.y} s={0.34} color="var(--magenta)" />}
    </g>
  );
}

/** Timer as a range ring: the magenta arc is the time left, the bearing line sweeps clockwise from north. */
function RangeRing({ fraction }: { fraction: number }) {
  const f = Math.max(0, Math.min(1, fraction));
  const circ = 2 * Math.PI * RING_R;
  const bearing = -90 + (1 - f) * 360;
  const rad = (bearing * Math.PI) / 180;
  const low = f < 0.3;
  return (
    <g aria-hidden>
      <circle r={RING_R} fill="none" stroke="var(--hair)" strokeWidth={0.05} />
      {Array.from({ length: 36 }, (_, i) => {
        const t = (i * 10 * Math.PI) / 180;
        const long = i % 3 === 0;
        const r1 = RING_R + 0.12;
        const r2 = RING_R + (long ? 0.34 : 0.22);
        return (
          <line
            key={i}
            x1={Math.cos(t) * r1}
            y1={Math.sin(t) * r1}
            x2={Math.cos(t) * r2}
            y2={Math.sin(t) * r2}
            stroke="var(--ink-2)"
            strokeWidth={long ? 0.045 : 0.03}
          />
        );
      })}
      <circle
        r={RING_R}
        fill="none"
        stroke={low ? "var(--red)" : "var(--magenta)"}
        strokeWidth={0.14}
        strokeDasharray={`${f * circ} ${circ}`}
        transform={`rotate(${bearing})`}
      />
      <line
        x1={Math.cos(rad) * (RING_R - 0.5)}
        y1={Math.sin(rad) * (RING_R - 0.5)}
        x2={Math.cos(rad) * (RING_R + 0.42)}
        y2={Math.sin(rad) * (RING_R + 0.42)}
        stroke="var(--ink)"
        strokeWidth={0.07}
        strokeLinecap="round"
      />
    </g>
  );
}

/** Graticule ticks along the plate's neatline. */
function Graticule() {
  const ticks: React.ReactNode[] = [];
  const step = 0.5;
  for (let v = Math.ceil(BOUNDS.x / step) * step, i = 0; v <= BOUNDS.x + BOUNDS.w; v += step, i++) {
    const long = Math.round(v / step) % 4 === 0;
    const l = long ? 0.28 : 0.14;
    ticks.push(
      <line key={`t${i}`} x1={v} y1={BOUNDS.y} x2={v} y2={BOUNDS.y + l} />,
      <line key={`b${i}`} x1={v} y1={BOUNDS.y + BOUNDS.h} x2={v} y2={BOUNDS.y + BOUNDS.h - l} />,
      <line key={`l${i}`} x1={BOUNDS.x} y1={v} x2={BOUNDS.x + l} y2={v} />,
      <line key={`r${i}`} x1={BOUNDS.x + BOUNDS.w} y1={v} x2={BOUNDS.x + BOUNDS.w - l} y2={v} />,
    );
  }
  return (
    <g stroke="var(--ink)" strokeWidth={0.035} aria-hidden>
      {ticks}
    </g>
  );
}

/**
 * The island plate: sea with shoal bands and seeded soundings, ports, hexes,
 * tokens with pips, lettered waypoints, buoy verdicts and the range ring.
 */
export function Board({ board, candidates, onPick, reveal, ring, className, label }: BoardProps) {
  const spots = soundings(board.seed, SOUNDING_BOX, nearLand);
  return (
    <svg
      viewBox={`${BOUNDS.x} ${BOUNDS.y} ${BOUNDS.w} ${BOUNDS.h}`}
      className={className}
      role={candidates ? "group" : "img"}
      aria-label={label ?? "Game board"}
      style={{ userSelect: "none", fontFamily: "var(--font-chart)" }}
    >
      <rect x={BOUNDS.x} y={BOUNDS.y} width={BOUNDS.w} height={BOUNDS.h} fill="var(--deep)" />
      {/* Depth bands follow the coast: shallow water hugs the island. */}
      <g fill="var(--shoal-2)">
        {TOPOLOGY.hexes.map((h) => (
          <polygon key={h.id} points={hexPoints(h.id, 2.05)} />
        ))}
      </g>
      <g fill="var(--shoal)">
        {TOPOLOGY.hexes.map((h) => (
          <polygon key={h.id} points={hexPoints(h.id, 1.45)} />
        ))}
      </g>
      <g fill="var(--ink-2)" fontSize={0.27} fontStyle="italic" textAnchor="middle" aria-hidden>
        {spots.map((s, i) => (
          <text key={i} x={s.x} y={s.y}>
            {s.depth}
          </text>
        ))}
      </g>
      {ring !== undefined && <RangeRing fraction={ring} />}
      {board.ports.map((port) => (
        <PortMarker key={port.edge} port={port} />
      ))}
      <g style={{ filter: "var(--land-filter)" }}>
        {TOPOLOGY.hexes.map((hex) => (
          <HexLand key={hex.id} hexId={hex.id} board={board} />
        ))}
      </g>
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
            <circle cx={p.x} cy={p.y} r={0.85} fill="transparent" />
            <circle className="waypoint-focus" cx={p.x} cy={p.y} r={0.52} fill="none" stroke="var(--magenta)" strokeWidth={0.09} />
            <circle
              cx={p.x}
              cy={p.y}
              r={0.34}
              fill={dim ? "var(--paper)" : "var(--deep)"}
              stroke={dim ? "var(--ink-2)" : "var(--magenta)"}
              strokeWidth={0.08}
            />
            <text
              x={p.x}
              y={p.y + 0.13}
              fontSize={0.38}
              fontWeight={800}
              textAnchor="middle"
              fill={dim ? "var(--ink-2)" : "var(--ink)"}
            >
              {CANDIDATE_LABELS[i]}
            </text>
            {reveal && (
              <g className="anim-pop">
                <rect x={p.x + 0.3} y={p.y - 0.78} width={0.62} height={0.42} fill="var(--deep)" stroke="var(--ink)" strokeWidth={0.035} />
                <text x={p.x + 0.61} y={p.y - 0.47} fontSize={0.3} fontWeight={800} textAnchor="middle" fill="var(--ink)">
                  {reveal.totals[i]}
                </text>
              </g>
            )}
            {reveal && isPicked && isBest && (
              <circle cx={p.x} cy={p.y} r={0.5} fill="none" stroke="var(--buoy-green)" strokeWidth={0.1} className="anim-pulse" />
            )}
            {reveal && (isBest || isPicked) && (
              <g className="anim-buoy">
                <BuoyShape kind={isBest ? "cone" : "can"} x={p.x} y={p.y - 0.3} s={1.02} />
              </g>
            )}
          </g>
        );
      })}
      <rect
        x={BOUNDS.x + 0.02}
        y={BOUNDS.y + 0.02}
        width={BOUNDS.w - 0.04}
        height={BOUNDS.h - 0.04}
        fill="none"
        stroke="var(--ink)"
        strokeWidth={0.05}
      />
      <Graticule />
    </svg>
  );
}
