import { MAX_COUNT } from "@/engine";

/** Values on the Hand Tracker number pad: 0..19. */
export const PAD_VALUES: readonly number[] = Array.from({ length: MAX_COUNT + 1 }, (_, i) => i);
