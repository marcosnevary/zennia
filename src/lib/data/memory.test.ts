import { describe, expect, it } from "vitest";
import {
  chanceOf,
  drawItem,
  drawPlan,
  FIRST_HALF_LIFE,
  MISS_HALF_LIFE,
  pickWeighted,
  recall,
  remember,
  stageOf,
} from "./memory";
import type { Memory } from "#lib/core/types.ts";

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

const learning: Memory = { halfLife: 10 * MINUTE, answeredAt: 0, streak: 1 };
const learned: Memory = { halfLife: 10 * MINUTE, answeredAt: 0, streak: 2 };

/** Returns the given numbers in turn, as `Math.random` would. */
function randoms(...values: number[]) {
  return () => values.shift() ?? 0;
}

describe("recall", () => {
  it("halves every half-life since the last answer", () => {
    expect(recall(learning, 0)).toBe(1);
    expect(recall(learning, 10 * MINUTE)).toBe(0.5);
    expect(recall(learning, 20 * MINUTE)).toBe(0.25);
  });

  it("is 0 for an item never answered", () => {
    expect(recall(undefined, 0)).toBe(0);
  });
});

describe("remember", () => {
  it("learns an item right the first time it comes up, at the first half-life", () => {
    const memory = remember(undefined, true, 5);
    expect(memory).toEqual({
      halfLife: FIRST_HALF_LIFE,
      answeredAt: 5,
      streak: 2,
    });
    expect(stageOf(memory)).toBe("learned");
  });

  it("keeps an item missed the first time in learning until two right answers in a row", () => {
    const missed = remember(undefined, false, 0);
    const once = remember(missed, true, MINUTE);
    expect(stageOf(missed)).toBe("learning");
    expect(stageOf(once)).toBe("learning");
    expect(stageOf(remember(once, true, 2 * MINUTE))).toBe("learned");
  });

  it("doesn't grow the half-life when the item was answered moments ago", () => {
    expect(remember(learning, true, MINUTE)).toMatchObject({
      halfLife: 10 * MINUTE,
      streak: 2,
    });
  });

  it("doubles the time an item was recalled after", () => {
    expect(remember(learned, true, DAY).halfLife).toBe(2 * DAY);
  });

  it("starts over on a miss, however strong the memory was", () => {
    const strong = { halfLife: 30 * DAY, answeredAt: 0, streak: 9 };
    expect(remember(strong, false, DAY)).toEqual({
      halfLife: MISS_HALF_LIFE,
      answeredAt: DAY,
      streak: 0,
    });
  });
});

describe("stageOf", () => {
  it("is new, then learning, then learned after two right answers in a row", () => {
    expect(stageOf(undefined)).toBe("new");
    expect(stageOf(learning)).toBe("learning");
    expect(stageOf(learned)).toBe("learned");
  });
});

describe("pickWeighted", () => {
  it("picks proportionally to the weights", () => {
    const items = ["a", "b"];
    const w = (x: string) => (x === "a" ? 1 : 3);
    expect(pickWeighted(items, w, () => 0)).toBe("a");
    expect(pickWeighted(items, w, () => 0.24)).toBe("a");
    expect(pickWeighted(items, w, () => 0.26)).toBe("b");
    expect(pickWeighted(items, w, () => 0.999)).toBe("b");
  });

  it("returns null for an empty list", () => {
    expect(pickWeighted([], () => 1)).toBeNull();
  });
});

describe("drawItem", () => {
  const draw = (
    memories: Record<string, Memory | undefined>,
    random: () => number,
    now = 10 * MINUTE,
  ) => {
    const pool = Object.keys(memories);
    return drawItem(pool, pool, (key) => memories[key], random, now)?.item;
  };

  it("leaves new items out while the learning group is full", () => {
    const memories: Record<string, Memory | undefined> = { fresh: undefined };
    for (const key of ["a", "b", "c", "d", "e"]) memories[key] = learning;
    for (let r = 0; r < 1; r += 0.05)
      expect(draw(memories, () => r)).not.toBe("fresh");
  });

  it("lets a new item fill the room left in the learning group", () => {
    const memories = { a: learning, fresh: undefined };
    // a weighs 0.5 (half forgotten) and the new item 1, so the top two thirds go to the new one
    expect(draw(memories, randoms(0.5))).toBe("fresh");
    expect(draw(memories, randoms(0.2))).toBe("a");
  });

  it("splits the room evenly among the new items", () => {
    const pool = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];
    const picks = new Set(
      [0, 0.15, 0.35, 0.55, 0.75, 0.95].map(
        (r) =>
          drawItem(
            pool,
            pool,
            () => undefined,
            () => r,
          )?.item,
      ),
    );
    expect(picks).toEqual(new Set(["a", "b", "d", "f", "h", "j"]));
  });

  it("tosses a coin between the learning group and the learned items", () => {
    // ten half-forgotten learned items need as much review as a full learning group: an even coin
    const memories: Record<string, Memory | undefined> = { a: learning };
    for (let i = 0; i < 10; i++) memories[`old${i}`] = learned;
    expect(draw(memories, randoms(0.4, 0))).toBe("old0");
    expect(draw(memories, randoms(0.6, 0))).toBe("a");
  });

  it("gives the learned items fewer draws the less they are forgotten", () => {
    // one half-forgotten learned item is a tenth of a full group's review: a share of 5%
    const memories = { a: learning, old: learned };
    expect(draw(memories, randoms(0.04, 0))).toBe("old");
    expect(draw(memories, randoms(0.06, 0))).toBe("a");
  });

  it("keeps half the draws for the learning group however many items are learned", () => {
    const memories: Record<string, Memory | undefined> = {
      a: { ...learning, answeredAt: 9 * MINUTE },
    };
    for (let i = 0; i < 2000; i++) memories[`old${i}`] = learned;
    expect(draw(memories, randoms(0.6, 0.99))).toBe("a");
  });

  it("weighs the learned items by how likely they are forgotten", () => {
    const memories = {
      fresh: { ...learned, answeredAt: 10 * MINUTE },
      stale: learned,
    };
    // fresh was just answered, so it weighs 0 and only stale can come up
    expect(draw(memories, randoms(0))).toBe("stale");
    expect(draw(memories, randoms(0.99))).toBe("stale");
  });

  it("draws among all the choices when every weight is 0", () => {
    const now = { ...learned, answeredAt: 10 * MINUTE };
    expect(draw({ a: now, b: now }, randoms(0.9))).toBe("b");
  });

  it("gives the chance the drawn item had", () => {
    const memories = { a: learning, fresh: undefined };
    const pool = Object.keys(memories);
    const memoryOf = (key: string) => memories[key as keyof typeof memories];
    // a weighs 0.5 and the new item 1
    expect(drawItem(pool, pool, memoryOf, randoms(0.5), 10 * MINUTE)).toEqual({
      item: "fresh",
      chance: 2 / 3,
    });
  });

  it("returns null when there is nothing to draw", () => {
    expect(drawItem([], [], () => undefined)).toBeNull();
  });
});

describe("chanceOf", () => {
  const plan = (
    memories: Record<string, Memory | undefined>,
    now = 10 * MINUTE,
  ) => {
    const pool = Object.keys(memories);
    return drawPlan(pool, pool, (key) => memories[key], now);
  };

  it("splits the chances between the two sides of the coin", () => {
    // the learned item weighs 0.5, a tenth of a full group's review, so its side gets 5%
    const p = plan({ a: learning, b: learning, old: learned });
    expect(chanceOf(p, "a")).toBeCloseTo(0.475);
    expect(chanceOf(p, "b")).toBeCloseTo(0.475);
    expect(chanceOf(p, "old")).toBeCloseTo(0.05);
  });

  it("gives every chance to one side when the other is empty", () => {
    const p = plan({ a: learning, fresh: undefined });
    // a weighs 0.5 and the new item 1
    expect(chanceOf(p, "a")).toBeCloseTo(1 / 3);
    expect(chanceOf(p, "fresh")).toBeCloseTo(2 / 3);
  });

  it("gives no chance to a new item while the learning group is full", () => {
    const memories: Record<string, Memory | undefined> = { fresh: undefined };
    for (const key of ["a", "b", "c", "d", "e"]) memories[key] = learning;
    expect(chanceOf(plan(memories), "fresh")).toBe(0);
  });
});
