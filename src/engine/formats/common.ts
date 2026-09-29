export const FORMATS = ["pip-flash", "port-math", "hand-tracker"] as const;
export type Format = (typeof FORMATS)[number];

export const TIERS = ["easy", "medium", "hard"] as const;
export type Tier = (typeof TIERS)[number];

export function isFormat(x: unknown): x is Format {
  return typeof x === "string" && (FORMATS as readonly string[]).includes(x);
}

export function isTier(x: unknown): x is Tier {
  return typeof x === "string" && (TIERS as readonly string[]).includes(x);
}

export function isNonNegativeInt(x: unknown): x is number {
  return typeof x === "number" && Number.isInteger(x) && x >= 0;
}
