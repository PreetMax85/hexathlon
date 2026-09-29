export const RESOURCES = ["wood", "brick", "sheep", "wheat", "ore"] as const;
export type Resource = (typeof RESOURCES)[number];
export type Terrain = Resource | "desert";
export type ResourceCounts = Record<Resource, number>;

export function emptyCounts(): ResourceCounts {
  return { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 };
}

export function isResource(x: unknown): x is Resource {
  return typeof x === "string" && (RESOURCES as readonly string[]).includes(x);
}
