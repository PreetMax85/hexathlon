/**
 * Fixed geometry of the 19-hex base board (rows 3-4-5-4-3), in axial
 * coordinates with pointy-top hexes.
 *
 * Positions use an integer lattice: X is in units of √3/2 and Y in units of
 * 1/2 (hex size = 1). A hex centre is (2q + r, 3r) and its corners sit at
 * fixed integer offsets, so shared corners dedupe exactly.
 */

export interface HexCell {
  id: number;
  q: number;
  r: number;
  /** Lattice centre. */
  x: number;
  y: number;
  /** 6 vertex ids clockwise from the top corner. */
  vertices: number[];
  /** 6 edge ids; edge i joins vertices[i] and vertices[(i + 1) % 6]. */
  edges: number[];
  /** Ids of adjacent land hexes. */
  neighbors: number[];
}

export interface Vertex {
  id: number;
  x: number;
  y: number;
  /** Land hexes touching this vertex (1–3). */
  hexes: number[];
  /** Adjacent vertices (2–3). */
  neighbors: number[];
  edges: number[];
}

export interface Edge {
  id: number;
  /** Endpoint vertex ids, a < b. */
  a: number;
  b: number;
  /** Land hexes on either side (1 on the coast, else 2). */
  hexes: number[];
}

export interface Topology {
  hexes: HexCell[];
  vertices: Vertex[];
  edges: Edge[];
  /** Coastal edge ids in clockwise order around the island. */
  coast: number[];
}

/** Corner offsets on the lattice, clockwise from the top. */
const CORNERS: ReadonlyArray<readonly [number, number]> = [
  [0, -2],
  [1, -1],
  [1, 1],
  [0, 2],
  [-1, 1],
  [-1, -1],
];

const AXIAL_DIRS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [1, -1],
  [0, -1],
  [-1, 0],
  [-1, 1],
  [0, 1],
];

export const BOARD_RADIUS = 2;

function buildTopology(): Topology {
  // Hexes in reading order: top row first, left to right.
  const cells: Array<{ q: number; r: number }> = [];
  for (let r = -BOARD_RADIUS; r <= BOARD_RADIUS; r++) {
    const qMin = Math.max(-BOARD_RADIUS, -r - BOARD_RADIUS);
    const qMax = Math.min(BOARD_RADIUS, -r + BOARD_RADIUS);
    for (let q = qMin; q <= qMax; q++) cells.push({ q, r });
  }
  const hexIndex = new Map(cells.map((c, i) => [`${c.q},${c.r}`, i]));

  // Collect unique corner points, then number them in reading order.
  const pointKey = (x: number, y: number) => `${x},${y}`;
  const points = new Map<string, { x: number; y: number }>();
  for (const { q, r } of cells) {
    const cx = 2 * q + r;
    const cy = 3 * r;
    for (const [dx, dy] of CORNERS) {
      points.set(pointKey(cx + dx, cy + dy), { x: cx + dx, y: cy + dy });
    }
  }
  const sortedPoints = [...points.values()].sort((p, o) => p.y - o.y || p.x - o.x);
  const vertexId = new Map(sortedPoints.map((p, i) => [pointKey(p.x, p.y), i]));
  const vertices: Vertex[] = sortedPoints.map((p, id) => ({
    id,
    x: p.x,
    y: p.y,
    hexes: [],
    neighbors: [],
    edges: [],
  }));

  const hexes: HexCell[] = cells.map(({ q, r }, id) => {
    const x = 2 * q + r;
    const y = 3 * r;
    const vs = CORNERS.map(([dx, dy]) => vertexId.get(pointKey(x + dx, y + dy))!);
    const neighbors = AXIAL_DIRS.map(([dq, dr]) => hexIndex.get(`${q + dq},${r + dr}`))
      .filter((n): n is number => n !== undefined)
      .sort((a, b) => a - b);
    return { id, q, r, x, y, vertices: vs, edges: [], neighbors };
  });

  // Edges: dedupe hex sides by their endpoint pair.
  const edgeMap = new Map<string, Edge>();
  for (const hex of hexes) {
    for (let i = 0; i < 6; i++) {
      const u = hex.vertices[i];
      const v = hex.vertices[(i + 1) % 6];
      const [a, b] = u < v ? [u, v] : [v, u];
      const key = `${a}-${b}`;
      let edge = edgeMap.get(key);
      if (!edge) {
        edge = { id: -1, a, b, hexes: [] };
        edgeMap.set(key, edge);
      }
      edge.hexes.push(hex.id);
    }
  }
  const edges = [...edgeMap.values()].sort((e, f) => e.a - f.a || e.b - f.b);
  edges.forEach((e, id) => {
    e.id = id;
    e.hexes.sort((a, b) => a - b);
  });
  const edgeId = new Map(edges.map((e) => [`${e.a}-${e.b}`, e.id]));

  for (const hex of hexes) {
    for (let i = 0; i < 6; i++) {
      const u = hex.vertices[i];
      const v = hex.vertices[(i + 1) % 6];
      hex.edges.push(edgeId.get(u < v ? `${u}-${v}` : `${v}-${u}`)!);
      if (!vertices[u].hexes.includes(hex.id)) vertices[u].hexes.push(hex.id);
    }
  }
  for (const e of edges) {
    vertices[e.a].neighbors.push(e.b);
    vertices[e.b].neighbors.push(e.a);
    vertices[e.a].edges.push(e.id);
    vertices[e.b].edges.push(e.id);
  }
  for (const v of vertices) {
    v.hexes.sort((a, b) => a - b);
    v.neighbors.sort((a, b) => a - b);
    v.edges.sort((a, b) => a - b);
  }

  return { hexes, vertices, edges, coast: orderCoast(vertices, edges) };
}

/** Walk the coastal edges clockwise, starting from the top-most, left-most vertex. */
function orderCoast(vertices: Vertex[], edges: Edge[]): number[] {
  const coastal = edges.filter((e) => e.hexes.length === 1);
  const byVertex = new Map<number, Edge[]>();
  for (const e of coastal) {
    for (const v of [e.a, e.b]) {
      const list = byVertex.get(v) ?? [];
      list.push(e);
      byVertex.set(v, list);
    }
  }
  const start = coastal
    .flatMap((e) => [e.a, e.b])
    .reduce((best, v) =>
      vertices[v].y < vertices[best].y ||
      (vertices[v].y === vertices[best].y && vertices[v].x < vertices[best].x)
        ? v
        : best,
    );
  // From the top-left vertex, going right is clockwise (y grows downward).
  const first = byVertex
    .get(start)!
    .reduce((best, e) => {
      const other = (x: Edge) => (x.a === start ? x.b : x.a);
      return vertices[other(e)].x > vertices[other(best)].x ? e : best;
    });
  const order: number[] = [];
  let edge = first;
  let at = start;
  do {
    order.push(edge.id);
    at = edge.a === at ? edge.b : edge.a;
    const current = edge;
    edge = byVertex.get(at)!.find((e) => e !== current)!;
  } while (edge !== first);
  return order;
}

export const TOPOLOGY: Topology = buildTopology();

/** Lattice → Cartesian (hex size 1), for rendering. */
export function toCartesian(x: number, y: number): { x: number; y: number } {
  return { x: (x * Math.sqrt(3)) / 2, y: y / 2 };
}
