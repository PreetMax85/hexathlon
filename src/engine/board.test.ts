import { describe, expect, it } from "vitest";
import {
  generateBoard,
  pips,
  PORT_POOL,
  redsSeparated,
  TERRAIN_POOL,
  TOKEN_POOL,
  vertexPips,
} from "./board";
import { TOPOLOGY } from "./topology";

const tally = <T extends string | number>(xs: readonly T[]) => {
  const m = new Map<T, number>();
  for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => String(a[0]).localeCompare(String(b[0])));
};

describe("pips", () => {
  it("matches the token table", () => {
    expect([2, 3, 4, 5, 6, 8, 9, 10, 11, 12].map(pips)).toEqual([1, 2, 3, 4, 5, 5, 4, 3, 2, 1]);
    expect(pips(null)).toBe(0);
    expect(pips(7)).toBe(0);
  });
});

describe("generateBoard", () => {
  it("has exact resource and token distributions", () => {
    for (let seed = 0; seed < 200; seed++) {
      const board = generateBoard(seed);
      expect(board.hexes).toHaveLength(19);
      expect(tally(board.hexes.map((h) => h.terrain))).toEqual(tally(TERRAIN_POOL));
      const tokens = board.hexes.flatMap((h) => (h.token === null ? [] : [h.token]));
      expect(tally(tokens)).toEqual(tally(TOKEN_POOL));
      for (const h of board.hexes) expect(h.token === null).toBe(h.terrain === "desert");
    }
  });

  it("never places 6/8 next to each other (1,000 seeds)", () => {
    for (let seed = 0; seed < 1000; seed++) {
      const board = generateBoard(seed);
      expect(redsSeparated(board.hexes)).toBe(true);
      for (const cell of TOPOLOGY.hexes) {
        const t = board.hexes[cell.id].token;
        if (t !== 6 && t !== 8) continue;
        for (const n of cell.neighbors) expect([6, 8]).not.toContain(board.hexes[n].token);
      }
    }
  });

  it("places 9 ports on distinct pairs of adjacent coastal vertices", () => {
    for (let seed = 0; seed < 200; seed++) {
      const { ports } = generateBoard(seed);
      expect(tally(ports.map((p) => p.kind))).toEqual(tally(PORT_POOL));
      const used = new Set<number>();
      for (const p of ports) {
        const edge = TOPOLOGY.edges[p.edge];
        expect(edge.hexes).toHaveLength(1);
        expect(TOPOLOGY.vertices[p.vertices[0]].neighbors).toContain(p.vertices[1]);
        for (const v of p.vertices) {
          expect(used.has(v)).toBe(false);
          used.add(v);
        }
      }
    }
  });

  it("is deterministic: same seed → deep-equal board", () => {
    for (let seed = 0; seed < 100; seed++) {
      expect(generateBoard(seed)).toEqual(generateBoard(seed));
    }
    expect(generateBoard(1)).not.toEqual(generateBoard(2));
  });

  it("vertexPips sums adjacent hex pips", () => {
    const board = generateBoard(5);
    for (const v of TOPOLOGY.vertices) {
      const expected = v.hexes.reduce((s, h) => s + pips(board.hexes[h].token), 0);
      expect(vertexPips(board, v.id)).toBe(expected);
    }
  });
});
