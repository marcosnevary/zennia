import type { Stats, Word } from '../../core/types'
import type { Settings } from '../settings'
import { getAccount, linkGoogle, openSession, signInGoogle, signOut, takeLinkConflict, type Account, type Db } from './client'
import {
  settingsFromRow,
  settingsToRow,
  statsFromRows,
  statsToRows,
  wordFromRow,
  wordToRow,
  type KanaStatRow,
  type SettingsRow,
  type WordRow,
  type WordStatRow,
} from './rows'

export interface Stored {
  words: Word[]
  stats: Stats
  settings: Settings
}

/** Everything the app stores for the signed-in user. */
export interface Repo {
  load(): Promise<Stored>
  upsertWords(words: Word[]): Promise<void>
  deleteWords(ids: string[]): Promise<void>
  /** Adds one answer to the tally of a word (`key` is its id) or of a kana (`key` is its `kanaKey`). */
  recordAnswer(kind: 'word' | 'kana', key: string, hit: boolean): Promise<void>
  replaceStats(stats: Stats): Promise<void>
  saveSettings(patch: Partial<Settings>): Promise<void>
  account(): Promise<Account>
  /** Goes to Google to attach it to the current user; the page is left. */
  linkAccount(): Promise<void>
  /** Goes to Google to sign in to the user that owns the account, leaving the current user's data behind. */
  signInToAccount(): Promise<void>
  /** Signs out; the next load starts a new anonymous user. */
  signOut(): Promise<void>
  /** True once when Google sent the user back because that account already belongs to another user. */
  takeLinkConflict(): boolean
}

const PAGE = 1000
const WRITE_CHUNK = 500
const DELETE_CHUNK = 100

interface Response<T> {
  data: T | null
  error: { message: string } | null
}

function unwrap<T>({ data, error }: Response<T>): T | null {
  if (error) throw new Error(error.message)
  return data
}

/** Reads every row of a query: the API returns at most `PAGE` rows per request. */
export async function fetchAll<T>(page: (from: number, to: number) => PromiseLike<Response<T[]>>): Promise<T[]> {
  const all: T[] = []
  for (let from = 0; ; from += PAGE) {
    const rows = unwrap(await page(from, from + PAGE - 1)) ?? []
    all.push(...rows)
    if (rows.length < PAGE) return all
  }
}

export function chunks<T>(list: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size))
  return out
}

/** `getDb` is only called on first use, so a missing configuration shows up as an error from the first operation. */
export function createRepo(getDb: () => Db): Repo {
  let opened: Promise<{ db: Db; userId: string }> | undefined

  function open() {
    opened ??= (async () => {
      const db = getDb()
      return { db, userId: await openSession(db) }
    })()
    opened.catch(() => (opened = undefined))
    return opened
  }

  return {
    async load() {
      const { db } = await open()
      const [words, wordStats, kanaStats, settings] = await Promise.all([
        fetchAll<WordRow>((from, to) =>
          db.from('words').select('*').order('created_at', { ascending: false }).order('id').range(from, to),
        ),
        fetchAll<WordStatRow>((from, to) => db.from('word_stats').select('word_id, hits, misses').order('word_id').range(from, to)),
        fetchAll<KanaStatRow>((from, to) =>
          db.from('kana_stats').select('script, hiragana, hits, misses').order('script').order('hiragana').range(from, to),
        ),
        db.from('settings').select('theme, words_focus, kana_selection, practice_scope').maybeSingle<SettingsRow>(),
      ])
      return {
        words: words.map(wordFromRow),
        stats: statsFromRows(wordStats, kanaStats),
        settings: settingsFromRow(unwrap(settings)),
      }
    },

    async upsertWords(words) {
      const { db, userId } = await open()
      for (const chunk of chunks(words, WRITE_CHUNK)) {
        unwrap(await db.from('words').upsert(chunk.map((w) => wordToRow(w, userId)), { onConflict: 'user_id,id' }))
      }
    },

    async deleteWords(ids) {
      const { db, userId } = await open()
      for (const chunk of chunks(ids, DELETE_CHUNK)) {
        unwrap(await db.from('words').delete().eq('user_id', userId).in('id', chunk))
      }
    },

    async recordAnswer(kind, key, hit) {
      const { db } = await open()
      unwrap(await db.rpc('record_answer', { p_kind: kind, p_key: key, p_hit: hit }))
    },

    async replaceStats(stats) {
      const { db, userId } = await open()
      unwrap(await db.from('word_stats').delete().eq('user_id', userId))
      unwrap(await db.from('kana_stats').delete().eq('user_id', userId))
      const rows = statsToRows(stats, userId)
      for (const chunk of chunks(rows.words, WRITE_CHUNK)) unwrap(await db.from('word_stats').insert(chunk))
      for (const chunk of chunks(rows.kana, WRITE_CHUNK)) unwrap(await db.from('kana_stats').insert(chunk))
    },

    async saveSettings(patch) {
      const { db, userId } = await open()
      unwrap(await db.from('settings').upsert({ user_id: userId, ...settingsToRow(patch) }))
    },

    async account() {
      const { db } = await open()
      return getAccount(db)
    },

    async linkAccount() {
      const { db } = await open()
      await linkGoogle(db)
    },

    async signInToAccount() {
      const { db } = await open()
      await signInGoogle(db)
    },

    async signOut() {
      const { db } = await open()
      await signOut(db)
      opened = undefined
    },

    takeLinkConflict,
  }
}
