import { describe, expect, it } from "vitest";
import {
  assignTagColors,
  isTagColor,
  TAG_TONES,
  tagChipStyle,
  tagColorOf,
  type TagColor,
} from "./tag-colors";

function distance(x: TagColor, y: TagColor): number {
  const point = ({ hue, tone }: TagColor) => {
    const { l, c } = TAG_TONES[tone].light;
    const rad = (hue * Math.PI) / 180;
    return [l, c * Math.cos(rad), c * Math.sin(rad)];
  };
  const [p, q] = [point(x), point(y)];
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}

function closestPair(colors: TagColor[]): number {
  let min = Infinity;
  for (let i = 0; i < colors.length; i++) {
    for (let j = i + 1; j < colors.length; j++)
      min = Math.min(min, distance(colors[i], colors[j]));
  }
  return min;
}

const names = (n: number) => Array.from({ length: n }, (_, i) => `tag${i}`);

describe("assignTagColors", () => {
  it("keeps the saved colors and drops the ones of tags no longer in use", () => {
    const saved = { food: { hue: 10, tone: 0 }, gone: { hue: 200, tone: 1 } };
    expect(assignTagColors(["Food"], saved)).toEqual({
      food: { hue: 10, tone: 0 },
    });
  });

  it("returns the saved colors themselves when nothing changes", () => {
    const saved = { food: { hue: 10, tone: 0 } };
    expect(assignTagColors(["food"], saved)).toBe(saved);
  });

  it("puts a new tag on the side of the wheel the others leave free", () => {
    const saved = { a: { hue: 0, tone: 0 }, b: { hue: 120, tone: 0 } };
    const { c } = assignTagColors(["a", "b", "c"], saved);
    expect(c.hue).toBeGreaterThan(200);
    expect(c.hue).toBeLessThan(280);
  });

  it("keeps tags that only differ at the end apart", () => {
    const colors = assignTagColors(["lesson1", "lesson2", "lesson3"], {});
    expect(closestPair(Object.values(colors))).toBeGreaterThan(0.07);
  });

  it("keeps 20 tags clearly apart, added together or one at a time", () => {
    const together = assignTagColors(names(20), {});
    let oneByOne: Record<string, TagColor> = {};
    for (let n = 1; n <= 20; n++)
      oneByOne = assignTagColors(names(n), oneByOne);
    for (const colors of [together, oneByOne]) {
      expect(Object.keys(colors)).toHaveLength(20);
      expect(closestPair(Object.values(colors))).toBeGreaterThan(0.045);
    }
  });

  it("uses the softest tone while the colors still fit in it", () => {
    const colors = Object.values(assignTagColors(names(3), {}));
    expect(colors.every((c) => c.tone === 0)).toBe(true);
  });
});

describe("tagColorOf", () => {
  it("gives the saved color of the tag, whatever its spelling", () => {
    expect(tagColorOf({ food: { hue: 10, tone: 2 } }, "Food")).toEqual({
      hue: 10,
      tone: 2,
    });
  });

  it("picks the same color every time for a tag with none saved", () => {
    expect(tagColorOf({}, "draft")).toEqual(tagColorOf({}, " Draft"));
    expect(isTagColor(tagColorOf({}, "draft"))).toBe(true);
  });
});

describe("tagChipStyle", () => {
  it("paints the fill of both themes and the text in the tag hue", () => {
    expect(tagChipStyle({ hue: 40, tone: 0 })).toBe(
      "--tag-fill: oklch(0.91 0.06 40); --tag-fill-dark: oklch(0.8 0.05 40); --tag-text: oklch(0.32 0.07 40)",
    );
  });
});

describe("isTagColor", () => {
  it("accepts only a whole hue on the wheel and a known tone", () => {
    expect(isTagColor({ hue: 0, tone: 0 })).toBe(true);
    expect(isTagColor({ hue: 359, tone: TAG_TONES.length - 1 })).toBe(true);
    expect(isTagColor({ hue: 360, tone: 0 })).toBe(false);
    expect(isTagColor({ hue: 10.5, tone: 0 })).toBe(false);
    expect(isTagColor({ hue: 10, tone: TAG_TONES.length })).toBe(false);
    expect(isTagColor({ hue: "10", tone: 0 })).toBe(false);
    expect(isTagColor(null)).toBe(false);
  });
});
