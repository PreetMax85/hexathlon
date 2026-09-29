/** State of sending a finished run to the server. */
export type Sync =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved" }
  /** Daily was already scored on the server; the first score stands. */
  | { kind: "conflict" }
  | { kind: "error"; message: string };

export const idleSync: Sync = { kind: "idle" };

export function syncLabel(sync: Sync): string | null {
  switch (sync.kind) {
    case "idle":
      return null;
    case "saving":
      return "Saving your score…";
    case "saved":
      return "Score saved";
    case "conflict":
      return "Your first Daily score for today already counts.";
    case "error":
      return `Score not saved: ${sync.message}`;
  }
}
