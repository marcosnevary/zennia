import { pickWeighted } from "./stats";
import type { Verdict } from "#lib/core/types.ts";

/** What was typed in each field; a field that isn't shown stays empty. */
export interface TypedAnswer {
  reading: string;
  meaning: string;
}

/** The verdict of an answer and of each part of it; a part that is not practiced is null. */
export interface Outcome {
  verdict: Verdict;
  reading: Verdict | null;
  meaning: Verdict | null;
}

/** What differs between the practice modes (words, kana): the rest of the session is shared. */
export interface PracticeMode<T> {
  /** Items eligible for the next draw. */
  pool: T[];
  /** Identity used to avoid drawing the same item twice in a row. */
  keyOf: (item: T) => string;
  /** Draw weight of an item (higher comes up more often). */
  weightOf: (item: T) => number;
  /** Null when nothing was typed for what the item asks. */
  check: (answer: TypedAnswer, item: T) => Outcome | null;
  /** Persists the outcome (stats); called once per checked answer. */
  record: (item: T, verdict: Verdict) => void;
}

export interface Session<T> {
  current: T | null;
  /** Set once the current item was checked; the next submit moves on. */
  outcome: Outcome | null;
  hits: number;
  answers: number;
  lastKey: string | null;
}

export function startSession<T>(): Session<T> {
  return { current: null, outcome: null, hits: 0, answers: 0, lastKey: null };
}

/** Draws the next item, avoiding the previous one when there are others. */
export function nextRound<T>(
  session: Session<T>,
  mode: PracticeMode<T>,
  random?: () => number,
): Session<T> {
  const choices =
    mode.pool.length > 1
      ? mode.pool.filter((item) => mode.keyOf(item) !== session.lastKey)
      : mode.pool;
  const current = pickWeighted(choices, mode.weightOf, random);
  return {
    ...session,
    current,
    outcome: null,
    lastKey: current ? mode.keyOf(current) : null,
  };
}

/** Checks the answer for the current item and updates the score. */
export function submit<T>(
  session: Session<T>,
  answer: TypedAnswer,
  mode: PracticeMode<T>,
  random?: () => number,
): Session<T> {
  const { current } = session;
  if (!current) return session;
  if (session.outcome) return nextRound(session, mode, random);
  const outcome = mode.check(answer, current);
  if (!outcome) return session;
  mode.record(current, outcome.verdict);
  return {
    ...session,
    outcome,
    hits: session.hits + (outcome.verdict === "correct" ? 1 : 0),
    answers: session.answers + 1,
  };
}
