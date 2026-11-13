import { describe, expect, it } from "vitest";
import { arrowIndex } from "./arrow-keys";

// tests run in Node, which has no KeyboardEvent
const key = (k: string) =>
  ({ key: k, preventDefault: () => {} }) as unknown as KeyboardEvent;

describe("arrowIndex", () => {
  it("steps forward on right and down, back on left and up", () => {
    expect(arrowIndex(key("ArrowRight"), 1, 4)).toBe(2);
    expect(arrowIndex(key("ArrowDown"), 1, 4)).toBe(2);
    expect(arrowIndex(key("ArrowLeft"), 1, 4)).toBe(0);
    expect(arrowIndex(key("ArrowUp"), 1, 4)).toBe(0);
  });

  it("wraps around both ends", () => {
    expect(arrowIndex(key("ArrowRight"), 3, 4)).toBe(0);
    expect(arrowIndex(key("ArrowLeft"), 0, 4)).toBe(3);
  });

  it("ignores other keys", () => {
    expect(arrowIndex(key("Enter"), 1, 4)).toBeNull();
  });
});
