import { createRng, mixSeed } from "./rng";
import { TOPOLOGY } from "./topology";
import type { Resource, Terrain } from "./types";

export type PortKind = Resource | "generic";

export interface BoardHex {
  id: number;
  terrain: Terrain;
  /** Number token, or null on the desert. */
  token: number | null;
}

export interface Port {
  kind: PortKind;
  /** Coastal edge the port sits on. */
  edge: number;
  /** The two adjacent coastal vertices that use the port. */
  vertices: [number, number];
}

export interface Board {
  seed: number;
  hexes: BoardHex[];
  ports: Port[];
}

export const TERRAIN_POOL: readonly Terrain[] = [
  ...Array<Terrain>(4).fill("wood"),
  ...Array<Terrain>(4).fill("sheep"),
  ...Array<Terrain>(4).fill("wheat"),
  ...Array<Terrain>(3).fill("brick"),
  ...Array<Terrain>(3).fill("ore"),
  "desert",
];

export const TOKEN_POOL: readonly number[] = [
  2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12,
];

export const PORT_POOL: readonly PortKind[] = [
  "generic",
  "generic",
  "generic",
  "generic",
  "wood",
  "brick",
  "sheep",
  "wheat",
  "ore",
];

/**
 * Gaps (in coastal edges) between consecutive ports. Sums to the 30-edge
 * coast and every gap is ≥ 2, so no two ports share a vertex.
 */
const PORT_GAPS = [3, 3, 4, 3, 3, 4, 3, 3, 4] as const;

/** Pips (dots) on a number token: 2/12 → 1 … 6/8 → 5. Desert/none → 0. */
export function pips(token: number | null): number {
  if (token === null || token < 2 || token > 12 || token === 7) return 0;
  return 6 - Math.abs(7 - token);
}

export function isRed(token: number | null): boolean {
  return token === 6 || token === 8;
}

/** Sum of pips on the hexes touching a vertex. */
export function vertexPips(board: Board, vertex: number): number {
  return TOPOLOGY.vertices[vertex].hexes.reduce(
    (sum, h) => sum + pips(board.hexes[h].token),
    0,
  );
}

/** True if no two hexes carrying a 6 or 8 are adjacent. */
export function redsSeparated(hexes: readonly BoardHex[]): boolean {
  return TOPOLOGY.hexes.every(
    (cell) =>
      !isRed(hexes[cell.id].token) ||
      cell.neighbors.every((n) => !isRed(hexes[n].token)),
  );
}

const MAX_TOKEN_ATTEMPTS = 100_000;

/** Deterministic board for a seed (SPEC §1). */
export function generateBoard(seed: number): Board {
  const rng = createRng(mixSeed(seed, "board"));
  const terrains = rng.shuffle(TERRAIN_POOL);

  // Rejection-sample token layouts until 6s and 8s are apart. Uniform over
  // valid layouts; ~1 in 6 shuffles passes, so this ends quickly.
  let hexes: BoardHex[] | null = null;
  for (let attempt = 0; attempt < MAX_TOKEN_ATTEMPTS && !hexes; attempt++) {
    const tokens = rng.shuffle(TOKEN_POOL);
    let t = 0;
    const candidate = terrains.map((terrain, id) => ({
      id,
      terrain,
      token: terrain === "desert" ? null : tokens[t++],
    }));
    if (redsSeparated(candidate)) hexes = candidate;
  }
  if (!hexes) throw new Error(`no valid token layout for seed ${seed}`);

  const kinds = rng.shuffle(PORT_POOL);
  const { coast, edges } = TOPOLOGY;
  let at = rng.int(coast.length);
  const ports: Port[] = kinds.map((kind, i) => {
    const edge = edges[coast[at % coast.length]];
    at += PORT_GAPS[i];
    return { kind, edge: edge.id, vertices: [edge.a, edge.b] };
  });

  return { seed, hexes, ports };
}
