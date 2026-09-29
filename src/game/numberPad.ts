import { MAX_COUNT } from "@/engine";

/** Values on the Hand Tracker number pad: 0..19. */
export const PAD_VALUES: readonly number[] = Array.from({ length: MAX_COUNT + 1 }, (_, i) => i);

/** Two digits typed within this window make one number (e.g. 1 then 4 → 14). */
export const DIGIT_WINDOW_MS = 1000;

/** The selected count, and when its last digit was typed (null after a tap). */
export interface PadState {
  value: number | null;
  typedAt: number | null;
}

export const emptyPad: PadState = { value: null, typedAt: null };

/** Tapping a pad key selects it; nothing is locked in until confirm. */
export function padTap(_state: PadState, n: number): PadState {
  return { value: n, typedAt: null };
}

/** Keyboard input: digits select (two quick digits make 10–19), Enter submits, Backspace clears. */
export function padKey(state: PadState, key: string, now: number): { state: PadState; submit: boolean } {
  if (key === "Enter") return { state, submit: state.value !== null };
  if (key === "Backspace" || key === "Delete") return { state: emptyPad, submit: false };
  if (!/^[0-9]$/.test(key)) return { state, submit: false };
  const d = Number(key);
  const { value, typedAt } = state;
  const joined = value !== null ? value * 10 + d : Infinity;
  const quick = typedAt !== null && now - typedAt <= DIGIT_WINDOW_MS;
  const next = quick && value !== 0 && joined <= MAX_COUNT ? joined : d;
  return { state: { value: next, typedAt: now }, submit: false };
}
