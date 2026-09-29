/** Right answers in a row at the end of `marks`; resets on a wrong answer. */
export function comboOf(marks: readonly boolean[]): number {
  let n = 0;
  for (let i = marks.length - 1; i >= 0 && marks[i]; i--) n++;
  return n;
}

/**
 * The combo written as a lighthouse characteristic: "Fl" is one flash,
 * "Fl(4)" a group of four. Display only; combos never change the score.
 */
export function lightCharacter(combo: number): string | null {
  if (combo <= 0) return null;
  return combo === 1 ? "Fl" : `Fl(${combo})`;
}
