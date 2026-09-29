const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-09-29" → "29 Sep 2026", the edition date on a result and a share. */
export function chartDate(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}
