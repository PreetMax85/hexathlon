import { describe, expect, it } from "vitest";
import { TOPOLOGY } from "./topology";

const { hexes, vertices, edges, coast } = TOPOLOGY;

describe("topology", () => {
  it("has 19 hexes in rows of 3-4-5-4-3", () => {
    expect(hexes).toHaveLength(19);
    const rows = new Map<number, number>();
    for (const h of hexes) rows.set(h.r, (rows.get(h.r) ?? 0) + 1);
    expect([...rows.entries()].sort((a, b) => a[0] - b[0]).map(([, n]) => n)).toEqual([
      3, 4, 5, 4, 3,
    ]);
  });

  it("has 54 vertices and 72 edges", () => {
    expect(vertices).toHaveLength(54);
    expect(edges).toHaveLength(72);
  });

  it("every vertex touches 1–3 hexes and 2–3 vertices", () => {
    for (const v of vertices) {
      expect(v.hexes.length).toBeGreaterThanOrEqual(1);
      expect(v.hexes.length).toBeLessThanOrEqual(3);
      expect(v.neighbors.length).toBeGreaterThanOrEqual(2);
      expect(v.neighbors.length).toBeLessThanOrEqual(3);
    }
    const byHexCount = [1, 2, 3].map((n) => vertices.filter((v) => v.hexes.length === n).length);
    expect(byHexCount).toEqual([18, 12, 24]);
  });

  it("vertex↔hex and vertex↔vertex adjacency are symmetric", () => {
    for (const h of hexes) {
      expect(new Set(h.vertices).size).toBe(6);
      for (const v of h.vertices) expect(vertices[v].hexes).toContain(h.id);
    }
    for (const v of vertices) {
      for (const h of v.hexes) expect(hexes[h].vertices).toContain(v.id);
      for (const n of v.neighbors) expect(vertices[n].neighbors).toContain(v.id);
    }
    for (const e of edges) {
      expect(vertices[e.a].neighbors).toContain(e.b);
      expect(e.hexes.length === 1 || e.hexes.length === 2).toBe(true);
    }
  });

  it("hex neighbours are symmetric, 3–6 each", () => {
    for (const h of hexes) {
      expect(h.neighbors.length).toBeGreaterThanOrEqual(3);
      expect(h.neighbors.length).toBeLessThanOrEqual(6);
      for (const n of h.neighbors) expect(hexes[n].neighbors).toContain(h.id);
    }
    expect(hexes.filter((h) => h.neighbors.length === 6)).toHaveLength(7);
  });

  it("coast is a closed ring of 30 edges", () => {
    expect(coast).toHaveLength(30);
    expect(new Set(coast).size).toBe(30);
    for (let i = 0; i < coast.length; i++) {
      const e = edges[coast[i]];
      const f = edges[coast[(i + 1) % coast.length]];
      expect(e.hexes).toHaveLength(1);
      const shared = [e.a, e.b].filter((v) => v === f.a || v === f.b);
      expect(shared).toHaveLength(1);
    }
  });
});
