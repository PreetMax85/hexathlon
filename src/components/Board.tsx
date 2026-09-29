import { CANDIDATE_LABELS, isRed, pips, TOPOLOGY, toCartesian, type Board as BoardData } from "@/engine";
import { RESOURCE_META } from "@/game/meta";

const pt = (x: number, y: number) => toCartesian(x, y);

const VERTEX_POINTS = TOPOLOGY.vertices.map((v) => pt(v.x, v.y));

const MARGIN = 1.45;
const BOUNDS = (() => {
  const xs = VERTEX_POINTS.map((p) => p.x);
  const ys = VERTEX_POINTS.map((p) => p.y);
  const minX = Math.min(...xs) - MARGIN;
  const minY = Math.min(...ys) - MARGIN;
  return { x: minX, y: minY, w: Math.max(...xs) + MARGIN - minX, h: Math.max(...ys) + MARGIN - minY };
})();

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

function Pips({ count }: { count: number }) {
  const gap = 0.115;
  const start = -((count - 1) * gap) / 2;
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <circle key={i} cx={start + i * gap} cy={0.4} r={0.04} fill="currentColor" />
      ))}
    </>
  );
}

function HexTile({ hex, board }: { hex: (typeof TOPOLOGY.hexes)[number]; board: BoardData }) {
  const { terrain, token } = board.hexes[hex.id];
  const meta = RESOURCE_META[terrain];
  const points = hex.vertices.map((v) => `${VERTEX_POINTS[v].x},${VERTEX_POINTS[v].y}`).join(" ");
  const c = pt(hex.x, hex.y);
  return (
    <g>
      <polygon points={points} fill={meta.fill} stroke="#fdfaf0" strokeWidth={0.07} strokeLinejoin="round" />
      {token === null ? (
        <text x={c.x} y={c.y + 0.2} fontSize={0.8} textAnchor="middle">
          {meta.emoji}
        </text>
      ) : (
        <>
          <text x={c.x} y={c.y - 0.34} fontSize={0.46} textAnchor="middle">
            {meta.emoji}
          </text>
          <g transform={`translate(${c.x} ${c.y + 0.1})`}>
            <circle r={0.38} fill="#fdf7e4" stroke="#00000022" strokeWidth={0.02} />
            <g style={{ color: isRed(token) ? "#c62828" : "#3a3326" }}>
              <text y={0.13} fontSize={0.38} fontWeight={700} textAnchor="middle" fill="currentColor">
                {token}
              </text>
              <Pips count={pips(token)} />
            </g>
          </g>
        </>
      )}
    </g>
  );
}

function PortMarker({ port }: { port: BoardData["ports"][number] }) {
  const a = VERTEX_POINTS[port.vertices[0]];
  const b = VERTEX_POINTS[port.vertices[1]];
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const len = Math.hypot(mx, my) || 1;
  const p = { x: mx + (mx / len) * 0.95, y: my + (my / len) * 0.95 };
  const generic = port.kind === "generic";
  return (
    <g>
      <line x1={p.x} y1={p.y} x2={a.x} y2={a.y} stroke="#8a6d3b" strokeWidth={0.07} strokeLinecap="round" />
      <line x1={p.x} y1={p.y} x2={b.x} y2={b.y} stroke="#8a6d3b" strokeWidth={0.07} strokeLinecap="round" />
      <circle cx={p.x} cy={p.y} r={0.46} fill="#fdf7e4" stroke="#8a6d3b" strokeWidth={0.05} />
      <text x={p.x} y={p.y + (generic ? 0.1 : -0.03)} fontSize={0.3} fontWeight={700} textAnchor="middle" fill="#3a3326">
        {generic ? "3:1" : "2:1"}
      </text>
      {port.kind !== "generic" && (
        <text x={p.x} y={p.y + 0.3} fontSize={0.3} textAnchor="middle">
          {RESOURCE_META[port.kind].emoji}
        </text>
      )}
    </g>
  );
}

/** Scalable SVG board: hexes, tokens with pips, ports and labelled candidate corners. */
export function Board({ board, candidates, onPick, reveal, className, label }: BoardProps) {
  return (
    <svg
      viewBox={`${BOUNDS.x} ${BOUNDS.y} ${BOUNDS.w} ${BOUNDS.h}`}
      className={className}
      role={candidates ? "group" : "img"}
      aria-label={label ?? "Game board"}
      style={{ userSelect: "none" }}
    >
      <rect
        x={BOUNDS.x}
        y={BOUNDS.y}
        width={BOUNDS.w}
        height={BOUNDS.h}
        rx={1}
        fill="var(--sea)"
        stroke="var(--sea-edge)"
        strokeWidth={0.06}
      />
      {board.ports.map((port) => (
        <PortMarker key={port.edge} port={port} />
      ))}
      {TOPOLOGY.hexes.map((hex) => (
        <HexTile key={hex.id} hex={hex} board={board} />
      ))}
      {candidates?.map((vertex, i) => {
        const p = VERTEX_POINTS[vertex];
        const isBest = reveal?.best === i;
        const isPicked = reveal?.picked === i;
        const fill = !reveal ? "var(--brand)" : isBest ? "#15803d" : isPicked ? "#b91c1c" : "#5b5850";
        const interactive = !!onPick && !reveal;
        return (
          <g
            key={vertex}
            role={interactive ? "button" : undefined}
            tabIndex={interactive ? 0 : undefined}
            aria-label={`Corner ${CANDIDATE_LABELS[i]}${reveal ? `, ${reveal.totals[i]} pips` : ""}`}
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
            {/* Oversized invisible hit area for 44px+ touch targets. */}
            <circle cx={p.x} cy={p.y} r={0.8} fill="transparent" />
            <circle cx={p.x} cy={p.y} r={0.46} fill={fill} stroke="#fff" strokeWidth={0.08} className={reveal ? "anim-pop" : undefined} />
            <text x={p.x} y={p.y + 0.17} fontSize={0.46} fontWeight={800} textAnchor="middle" fill="#fff">
              {CANDIDATE_LABELS[i]}
            </text>
            {reveal && (
              <g className="anim-pop">
                <rect x={p.x - 0.42} y={p.y - 1.12} width={0.84} height={0.5} rx={0.25} fill={fill} stroke="#fff" strokeWidth={0.05} />
                <text x={p.x} y={p.y - 0.75} fontSize={0.36} fontWeight={800} textAnchor="middle" fill="#fff">
                  {reveal.totals[i]}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}
