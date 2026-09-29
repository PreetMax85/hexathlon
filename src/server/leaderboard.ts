export interface BoardRow {
  playerId: string;
  nickname: string;
  correct: number;
  totalMs: number;
}

export interface RankedRow extends BoardRow {
  rank: number;
}

/** More correct first; equal correct → less time first. */
export function compareRows(a: BoardRow, b: BoardRow): number {
  return b.correct - a.correct || a.totalMs - b.totalMs;
}

/** Each player's best row, sorted best first. */
export function bestPerPlayer(rows: readonly BoardRow[]): BoardRow[] {
  const best = new Map<string, BoardRow>();
  for (const row of rows) {
    const prev = best.get(row.playerId);
    if (!prev || compareRows(row, prev) < 0) best.set(row.playerId, row);
  }
  return [...best.values()].sort(compareRows);
}

/** Competition ranking: rows tied on (correct, time) share a rank (1, 1, 3). */
export function rankRows(sorted: readonly BoardRow[]): RankedRow[] {
  const out: RankedRow[] = [];
  sorted.forEach((row, i) => {
    const prev = out[i - 1];
    out.push({ ...row, rank: prev && compareRows(prev, row) === 0 ? prev.rank : i + 1 });
  });
  return out;
}

export interface PublicRow {
  rank: number;
  nickname: string;
  correct: number;
  totalMs: number;
  /** True for the viewer's own row. */
  mine: boolean;
}

/**
 * What the API returns. Player ids act as the player's secret, so they are
 * never sent to other clients; the viewer only learns which row is theirs.
 */
export function publicRows(rows: readonly RankedRow[], viewerId: string | null): PublicRow[] {
  return rows.map((r) => ({
    rank: r.rank,
    nickname: r.nickname,
    correct: r.correct,
    totalMs: r.totalMs,
    mine: viewerId !== null && r.playerId === viewerId,
  }));
}
