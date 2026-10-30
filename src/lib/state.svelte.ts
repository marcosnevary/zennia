import { getContext, setContext } from 'svelte'
import { kanaKey, type KanaScript } from './core/kana'
import type { Stats, Verdict, Word } from './core/types'
import { clearLegacy, readLegacy } from './data/db/legacy'
import type { Account } from './data/db/client'
import type { Repo, Stored } from './data/db/repo'
import type { Recorder, WordsFocus } from './data/practice-modes'
import { pruneScopeTags, type PracticeScope } from './data/practice-scope'
import { DEFAULT_SETTINGS, type Settings } from './data/settings'
import { attempts, emptyStats, recordAnswer, recordKana, totalTally } from './data/stats'
import { readThemeCache, writeThemeCache, type ThemePreference } from './data/theme'
import { allTags, mergeWords, type MergeResult } from './data/words'

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error.'
}

function newestFirst(words: Word[]): Word[] {
  return [...words].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
}

/**
 * The app's data, shared by every page. The database is the source of truth: each change updates
 * the screen first and then writes only the rows it touched, in order. If a write fails, the data
 * is read back from the database.
 */
export class App {
  words = $state<Word[]>([])
  stats = $state<Stats>(emptyStats())
  settings = $state<Settings>({ ...DEFAULT_SETTINGS, theme: readThemeCache() })
  status = $state<'loading' | 'ready' | 'failed'>('loading')
  error = $state('')
  account = $state<Account>({ anonymous: true, email: null })
  // Google sent the user back because that account already has data; waits for them to choose
  conflict = $state(false)
  // words of the writing sheet being printed; it renders hidden and only shows up in the print dialog
  sheetWords = $state<Word[] | null>(null)

  readonly recorder: Recorder = {
    word: (word, verdict) => this.recordWord(word, verdict),
    kana: (script, hiragana, hit) => this.recordKana(script, hiragana, hit),
  }

  readonly #repo: Repo
  #queue: Promise<void> = Promise.resolve()

  constructor(repo: Repo) {
    this.#repo = repo
  }

  async init(): Promise<void> {
    this.status = 'loading'
    this.error = ''
    try {
      let stored = await this.#repo.load()
      const isNew = stored.words.length === 0 && !attempts(totalTally(stored.stats))
      this.account = await this.#repo.account()
      if (this.#repo.takeLinkConflict()) {
        if (isNew) {
          await this.#repo.signInToAccount()
          return
        }
        this.conflict = true
      }
      const legacy = isNew ? readLegacy() : null
      if (legacy) {
        await this.#repo.upsertWords(legacy.words)
        await this.#repo.replaceStats(legacy.stats)
        await this.#repo.saveSettings(legacy.settings)
        clearLegacy()
        stored = await this.#repo.load()
      }
      this.#apply(stored)
      this.status = 'ready'
    } catch (e) {
      this.error = messageOf(e)
      this.status = 'failed'
    }
  }

  async signIn(): Promise<void> {
    try {
      await this.#repo.linkAccount()
    } catch (e) {
      this.error = `Could not sign in: ${messageOf(e)}`
    }
  }

  /** Answers the conflict: discarding signs in to the existing account, keeping stays anonymous. */
  async resolveConflict(discard: boolean): Promise<void> {
    this.conflict = false
    if (!discard) return
    try {
      await this.#repo.signInToAccount()
    } catch (e) {
      this.error = `Could not sign in: ${messageOf(e)}`
    }
  }

  async signOut(): Promise<void> {
    await this.flush()
    try {
      await this.#repo.signOut()
    } catch (e) {
      this.error = `Could not sign out: ${messageOf(e)}`
      return
    }
    await this.init()
  }

  /** Resolves when every change made so far has been written. */
  flush(): Promise<void> {
    return this.#queue
  }

  clearError(): void {
    this.error = ''
  }

  /** Replaces the word list; only the words that were added, changed or removed are written. */
  setWords(next: Word[]): void {
    const now = Date.now()
    const previous: Word[] = $state.snapshot(this.words)
    const words = newestFirst($state.snapshot(next).map((w) => ({ ...w, createdAt: w.createdAt ?? now })))

    const before = new Map(previous.map((w) => [w.id, JSON.stringify(w)]))
    const changed = words.filter((w) => before.get(w.id) !== JSON.stringify(w))
    const kept = new Set(words.map((w) => w.id))
    const removed = previous.filter((w) => !kept.has(w.id)).map((w) => w.id)

    this.words = words
    for (const id of removed) delete this.stats.words[id]
    const scope: PracticeScope | null = $state.snapshot(this.settings.practiceScope)
    const pruned = pruneScopeTags(scope, allTags(words))
    if (pruned !== scope) this.#setSettings({ practiceScope: pruned })
    this.#persist(async () => {
      if (changed.length) await this.#repo.upsertWords(changed)
      if (removed.length) await this.#repo.deleteWords(removed)
    })
  }

  importWords(incoming: Word[]): MergeResult {
    const result = mergeWords(this.words, incoming)
    this.setWords(result.words)
    return result
  }

  recordWord(word: Word, verdict: Verdict): void {
    recordAnswer(this.stats, word, verdict)
    this.#persist(() => this.#repo.recordAnswer('word', word.id, verdict === 'correct'))
  }

  recordKana(script: KanaScript, hiragana: string, hit: boolean): void {
    recordKana(this.stats, script, hiragana, hit)
    this.#persist(() => this.#repo.recordAnswer('kana', kanaKey(script, hiragana), hit))
  }

  /** Replaces all the stats, e.g. when importing or resetting; tallies of words that do not exist are dropped. */
  replaceStats(stats: Stats): void {
    const ids = new Set(this.words.map((w) => w.id))
    const next: Stats = {
      words: Object.fromEntries(Object.entries(stats.words).filter(([id]) => ids.has(id))),
      kana: stats.kana,
    }
    this.stats = next
    const saved: Stats = $state.snapshot(next)
    this.#persist(() => this.#repo.replaceStats(saved))
  }

  setTheme(theme: ThemePreference): void {
    writeThemeCache(theme)
    this.#setSettings({ theme })
  }

  setWordsFocus(wordsFocus: WordsFocus): void {
    this.#setSettings({ wordsFocus })
  }

  setKanaSelection(kanaSelection: string[]): void {
    this.#setSettings({ kanaSelection: [...kanaSelection] })
  }

  setPracticeScope(practiceScope: PracticeScope): void {
    this.#setSettings({ practiceScope: { ...practiceScope, scripts: [...practiceScope.scripts], tags: [...practiceScope.tags] } })
  }

  #setSettings(patch: Partial<Settings>): void {
    Object.assign(this.settings, patch)
    this.#persist(() => this.#repo.saveSettings(patch))
  }

  #apply(stored: Stored): void {
    this.words = stored.words
    this.stats = stored.stats
    this.settings = stored.settings
    writeThemeCache(stored.settings.theme)
  }

  #persist(write: () => Promise<void>): void {
    this.#queue = this.#queue.then(write).catch(async (e) => {
      this.error = `Could not save your changes: ${messageOf(e)}`
      try {
        this.#apply(await this.#repo.load())
      } catch {
        // still unreachable: the screen keeps showing the unsaved data
      }
    })
  }
}

const APP = Symbol('app')

export function setApp(app: App): App {
  return setContext(APP, app)
}

export function getApp(): App {
  return getContext<App>(APP)
}
