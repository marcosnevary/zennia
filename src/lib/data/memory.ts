import type { Memory } from "#lib/core/types.ts";

const MINUTE = 60_000;

/** Logged with each answer, so answers drawn by different rules can be told apart; 1 was the tally weight before it. */
export const DRAW_ALGORITHM = 2;

/** Half-life after the first answer, when it is right. */
export const FIRST_HALF_LIFE = 10 * MINUTE;
/** Half-life after any wrong answer. */
export const MISS_HALF_LIFE = 5 * MINUTE;
/** Right answers in a row that move an item from learning to learned. */
export const LEARNED_STREAK = 2;
/** Items learned at a time: new items enter only while the learning group has room. */
export const LEARNING_GROUP_SIZE = 5;
/** Most of the draws the learned items can take from the learning group, once they are badly forgotten. */
export const MAX_LEARNED_SHARE = 0.5;

export type Stage = "new" | "learning" | "learned";

export function stageOf(memory: Memory | undefined): Stage {
  if (!memory) return "new";
  return memory.streak < LEARNED_STREAK ? "learning" : "learned";
}

/** Estimated chance, from 0 to 1, of recalling the item at `now`; 0 for an item never answered. */
export function recall(memory: Memory | undefined, now: number): number {
  if (!memory) return 0;
  const elapsed = Math.max(0, now - memory.answeredAt);
  return 2 ** (-elapsed / memory.halfLife);
}

/**
 * The memory after an answer. A right answer proves the item was recalled after the time since the last one, so the
 * half-life becomes at least twice that time: answering again soon after doesn't grow it, only recalling after a gap
 * does. A miss starts over from a short half-life.
 */
export function remember(
  memory: Memory | undefined,
  hit: boolean,
  now: number,
): Memory {
  if (!hit) return { halfLife: MISS_HALF_LIFE, answeredAt: now, streak: 0 };
  // right the first time it comes up, the item was already known: confirming it would only hold back new ones
  if (!memory)
    return {
      halfLife: FIRST_HALF_LIFE,
      answeredAt: now,
      streak: LEARNED_STREAK,
    };
  const elapsed = Math.max(0, now - memory.answeredAt);
  return {
    halfLife: Math.max(memory.halfLife, 2 * elapsed),
    answeredAt: now,
    streak: memory.streak + 1,
  };
}

/** Weighted random choice; `random` returns a number in [0, 1) and can be replaced in tests. */
export function pickWeighted<T>(
  items: T[],
  weightOf: (item: T) => number,
  random: () => number = Math.random,
): T | null {
  if (!items.length) return null;
  const weights = items.map((item) => Math.max(0, weightOf(item)));
  let remaining = random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < items.length; i++) {
    remaining -= weights[i];
    if (remaining < 0) return items[i];
  }
  return items[items.length - 1];
}

/** How the next draw splits the choices; shared by the draw and the developer view of it. */
export interface DrawPlan<T> {
  /** The learning group among the choices: items in learning and new items */
  learning: T[];
  learned: T[];
  weightOf: (item: T) => number;
  learningSum: number;
  learnedSum: number;
  /** Items in learning in the whole pool, which is what fills the group */
  learningCount: number;
  newCount: number;
  /** Places left in the learning group for new items */
  room: number;
  /** Chance that the draw picks among the learned items rather than the learning group */
  learnedShare: number;
}

/**
 * Splits `choices`, the pool without the item just shown, for the next draw; the stages are counted over the whole
 * `pool`. The learning group is every item in learning plus the room left up to `LEARNING_GROUP_SIZE`, which a random
 * new item fills. Each item weighs how likely it is forgotten (1 − recall).
 */
export function drawPlan<T>(
  pool: T[],
  choices: T[],
  memoryOf: (item: T) => Memory | undefined,
  now: number = Date.now(),
): DrawPlan<T> {
  const learningCount = pool.filter(
    (item) => stageOf(memoryOf(item)) === "learning",
  ).length;
  const newCount = choices.filter((item) => !memoryOf(item)).length;
  const room = Math.max(0, LEARNING_GROUP_SIZE - learningCount);
  // the room goes to a random new item: each one gets an equal share of it
  const newWeight = newCount ? Math.min(room, newCount) / newCount : 0;
  const weightOf = (item: T) => {
    const memory = memoryOf(item);
    return memory ? 1 - recall(memory, now) : newWeight;
  };
  const sum = (items: T[]) => items.reduce((s, i) => s + weightOf(i), 0);
  const learning = choices.filter(
    (item) => stageOf(memoryOf(item)) !== "learned",
  );
  const learned = choices.filter(
    (item) => stageOf(memoryOf(item)) === "learned",
  );
  const learningSum = sum(learning);
  const learnedSum = sum(learned);
  return {
    learning,
    learned,
    weightOf,
    learningSum,
    learnedSum,
    learningCount,
    newCount,
    room,
    learnedShare: learnedShareOf(learningSum, learnedSum),
  };
}

/**
 * The learned items' weight sum is how many of them are forgotten, on average. They take a share of the draws in
 * proportion to it, up to `MAX_LEARNED_SHARE` once they need as much review as a full learning group: items just
 * learned don't hold back new ones, and however large a forgotten backlog grows, the learning group keeps the rest.
 */
function learnedShareOf(learningSum: number, learnedSum: number): number {
  if (!learnedSum) return 0;
  if (!learningSum) return 1;
  return MAX_LEARNED_SHARE * Math.min(1, learnedSum / LEARNING_GROUP_SIZE);
}

/** The chance, from 0 to 1, that the draw picks `item`, one of the plan's choices. */
export function chanceOf<T>(plan: DrawPlan<T>, item: T): number {
  const { learning, learned, weightOf, learningSum, learnedSum, learnedShare } =
    plan;
  if (!learningSum && !learnedSum)
    return 1 / (learning.length + learned.length);
  return learned.includes(item)
    ? learnedSum && (learnedShare * weightOf(item)) / learnedSum
    : learningSum && ((1 - learnedShare) * weightOf(item)) / learningSum;
}

/** A drawn item, with the chance it had of being drawn. */
export interface Drawn<T> {
  item: T;
  chance: number;
}

/**
 * Draws the next item: a coin weighted by `learnedShare` picks the learning group or the learned items, and within
 * the group the draw follows the weights.
 */
export function drawItem<T>(
  pool: T[],
  choices: T[],
  memoryOf: (item: T) => Memory | undefined,
  random: () => number = Math.random,
  now: number = Date.now(),
): Drawn<T> | null {
  if (!choices.length) return null;
  const plan = drawPlan(pool, choices, memoryOf, now);
  const { learning, learned, weightOf, learningSum, learnedSum, learnedShare } =
    plan;
  // the coin is only tossed when both sides can be drawn
  const tossed = learnedShare > 0 && learnedShare < 1;
  const group =
    learnedShare === 1 || (tossed && random() < learnedShare)
      ? learned
      : learning;
  const item =
    !learningSum && !learnedSum
      ? pickWeighted(choices, () => 1, random)
      : pickWeighted(group, weightOf, random);
  return item === null ? null : { item, chance: chanceOf(plan, item) };
}
