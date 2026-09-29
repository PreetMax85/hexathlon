/** How long an armed Skip or Quit waits for its confirming tap. */
export const CONFIRM_WINDOW_MS = 3000;

/**
 * One-tap inline confirmation: the first press arms, a second press inside
 * the window fires. `armedAt` is the time of the arming press, or null.
 */
export function pressConfirm(armedAt: number | null, now: number): { armedAt: number | null; fire: boolean } {
  if (armedAt !== null && now - armedAt <= CONFIRM_WINDOW_MS) return { armedAt: null, fire: true };
  return { armedAt: now, fire: false };
}
