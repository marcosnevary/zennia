import { pickWeighted } from './stats'
import type { Verdict } from '../core/types'

/** What differs between the practice modes (words, kana): the rest of the session is shared. */
export interface PracticeMode<T> {
  /** Items eligible for the next draw. */
  pool: T[]
  /** Identity used to avoid drawing the same item twice in a row. */
  keyOf: (item: T) => string
  /** Draw weight of an item (higher comes up more often). */
  weightOf: (item: T) => number
  check: (answer: string, item: T) => Verdict
  /** Persists the outcome (stats); called once per checked answer. */
  record: (item: T, verdict: Verdict) => void
}

export interface Session<T> {
  current: T | null
  /** Set once the current item was checked; the next submit moves on. */
  verdict: Verdict | null
  hits: number
  total: number
  streak: number
  bestStreak: number
  lastKey: string | null
}

export function startSession<T>(): Session<T> {
  return { current: null, verdict: null, hits: 0, total: 0, streak: 0, bestStreak: 0, lastKey: null }
}

/** Draws the next item, avoiding the previous one when there are others. */
export function nextRound<T>(session: Session<T>, mode: PracticeMode<T>, random?: () => number): Session<T> {
  const choices = mode.pool.length > 1 ? mode.pool.filter((item) => mode.keyOf(item) !== session.lastKey) : mode.pool
  const current = pickWeighted(choices, mode.weightOf, random)
  return { ...session, current, verdict: null, lastKey: current ? mode.keyOf(current) : null }
}

/** Clears the score, keeping the item currently on screen. */
export function resetScore<T>(session: Session<T>): Session<T> {
  return { ...session, hits: 0, total: 0, streak: 0, bestStreak: 0 }
}

/** Checks the answer for the current item and updates the score. */
export function submit<T>(
  session: Session<T>,
  answer: string,
  mode: PracticeMode<T>,
  random?: () => number,
): Session<T> {
  const { current } = session
  if (!current) return session
  if (session.verdict) return nextRound(session, mode, random)
  if (!answer.trim()) return session
  const verdict = mode.check(answer, current)
  const hit = verdict === 'correct'
  const streak = hit ? session.streak + 1 : 0
  mode.record(current, verdict)
  return {
    ...session,
    verdict,
    hits: session.hits + (hit ? 1 : 0),
    total: session.total + 1,
    streak,
    bestStreak: Math.max(session.bestStreak, streak),
  }
}
