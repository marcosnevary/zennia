import { drawItem } from "./memory";
import type { Memory, Verdict } from "#lib/core/types.ts";

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
  /** What the draw knows about how well the item is remembered; undefined while it is new. */
  memoryOf: (item: T) => Memory | undefined;
  /** Null when nothing was typed for what the item asks. */
  check: (answer: TypedAnswer, item: T) => Outcome | null;
  /** Persists the outcome (stats); called once per checked answer. */
  record: (item: T, verdict: Verdict) => void;
}

export interface Session<T> {
  current: T | null;
  /** Set once the current item was checked; the next submit moves on. */
  outcome: Outcome | null;
  /** Drawn when the current item is checked, so what it shows with can load while the result is up. */
  upcoming: T | null;
  hits: number;
  answers: number;
  lastKey: string | null;
}

export function startSession<T>(): Session<T> {
  return {
    current: null,
    outcome: null,
    upcoming: null,
    hits: 0,
    answers: 0,
    lastKey: null,
  };
}

/** Avoids the previous item when there are others. */
function draw<T>(
  session: Session<T>,
  mode: PracticeMode<T>,
  random?: () => number,
): T | null {
  const choices =
    mode.pool.length > 1
      ? mode.pool.filter((item) => mode.keyOf(item) !== session.lastKey)
      : mode.pool;
  return drawItem(mode.pool, choices, mode.memoryOf, random);
}

/**
 * Moves on to the upcoming item, or draws one when there's none or it left the pool meanwhile (the selection
 * can change in Settings while the result is up).
 */
export function nextRound<T>(
  session: Session<T>,
  mode: PracticeMode<T>,
  random?: () => number,
): Session<T> {
  const { upcoming } = session;
  const kept = upcoming
    ? mode.pool.find((item) => mode.keyOf(item) === mode.keyOf(upcoming))
    : undefined;
  const current = kept ?? draw(session, mode, random);
  return {
    ...session,
    current,
    outcome: null,
    upcoming: null,
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
    upcoming: draw(session, mode, random),
    hits: session.hits + (outcome.verdict === "correct" ? 1 : 0),
    answers: session.answers + 1,
  };
}
