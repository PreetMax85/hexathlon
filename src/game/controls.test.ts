import { describe, expect, it } from "vitest";
import { generate } from "@/engine";
import { comboOf, lightCharacter } from "./combo";
import { CONFIRM_WINDOW_MS, pressConfirm } from "./confirm";
import { logSummary } from "./handTrackerFlow";
import { emptyPad, padKey, padTap } from "./numberPad";

describe("inline confirm (Skip, Quit)", () => {
  it("arms on the first tap and fires on the second", () => {
    const first = pressConfirm(null, 1000);
    expect(first).toEqual({ armedAt: 1000, fire: false });
    expect(pressConfirm(first.armedAt, 2500)).toEqual({ armedAt: null, fire: true });
  });

  it("disarms itself after the window, so a stray tap later doesn't fire", () => {
    expect(CONFIRM_WINDOW_MS).toBe(3000);
    expect(pressConfirm(1000, 4001)).toEqual({ armedAt: 4001, fire: false });
  });
});

describe("Hand Tracker pad: select, then confirm", () => {
  it("a tap selects without submitting", () => {
    expect(padTap(emptyPad, 7)).toEqual({ value: 7, typedAt: null });
    expect(padTap(padTap(emptyPad, 7), 3).value).toBe(3);
  });

  it("digit keys build 10–19 when typed quickly", () => {
    let s = padKey(emptyPad, "1", 0).state;
    expect(s.value).toBe(1);
    s = padKey(s, "4", 400).state;
    expect(s.value).toBe(14);
    // A third digit can't make a valid count, so it starts over.
    expect(padKey(s, "2", 600).state.value).toBe(2);
  });

  it("a slow second digit replaces the first; 2 then 5 is 5, not 25", () => {
    expect(padKey(padKey(emptyPad, "1", 0).state, "2", 1500).state.value).toBe(2);
    expect(padKey(padKey(emptyPad, "2", 0).state, "5", 100).state.value).toBe(5);
    expect(padKey(padKey(emptyPad, "0", 0).state, "5", 100).state.value).toBe(5);
  });

  it("Enter submits only a selection; Backspace clears", () => {
    expect(padKey(emptyPad, "Enter", 0).submit).toBe(false);
    const s = padKey(emptyPad, "9", 0).state;
    expect(padKey(s, "Enter", 10)).toEqual({ state: s, submit: true });
    expect(padKey(s, "Backspace", 10).state).toEqual(emptyPad);
    expect(padKey(s, "x", 10)).toEqual({ state: s, submit: false });
  });
});

describe("combo", () => {
  it("counts the current run of right answers", () => {
    expect(comboOf([])).toBe(0);
    expect(comboOf([true, true, false])).toBe(0);
    expect(comboOf([false, true, true, true])).toBe(3);
  });

  it("reads like a lighthouse characteristic", () => {
    expect(lightCharacter(0)).toBeNull();
    expect(lightCharacter(1)).toBe("Fl");
    expect(lightCharacter(4)).toBe("Fl(4)");
  });
});

describe("Hand Tracker screen-reader summary", () => {
  it("announces once after playback, not every event", () => {
    const p = generate("hand-tracker", "hard", 2);
    expect(logSummary(p, 0)).toBe(
      `Log finished: 20 events. Question 1 of 2: how many ${p.questions[0]} does Rival hold? Choose 0 to 19, then confirm.`,
    );
    const easy = generate("hand-tracker", "easy", 2);
    expect(logSummary(easy, 0)).toBe(
      `Log finished: 8 events. How many ${easy.questions[0]} does Rival hold? Choose 0 to 19, then confirm.`,
    );
  });
});
