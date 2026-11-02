import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Stats, Word } from './core/types'
import type { Repo, Stored } from './data/db/repo'
import { DEFAULT_SETTINGS } from './data/settings'
import { emptyStats } from './data/stats'
import { App } from './state.svelte'

const word = (id: string, createdAt: number, extra: Partial<Word> = {}): Word => ({
  id,
  japanese: `日${id}`,
  hiragana: 'ひ',
  meaning: id,
  disabled: false,
  tags: [],
  createdAt,
  ...extra,
})

function fakeRepo(stored: Partial<Stored> = {}, conflict = false) {
  let current: Stored = { words: [], stats: emptyStats(), settings: { ...DEFAULT_SETTINGS }, ...stored }
  const calls: string[] = []
  const repo: Repo = {
    load: vi.fn(async () => structuredClone(current)),
    upsertWords: vi.fn(async (words: Word[]) => {
      calls.push(`upsert ${words.map((w) => w.id).join(',')}`)
    }),
    deleteWords: vi.fn(async (ids: string[]) => {
      calls.push(`delete ${ids.join(',')}`)
    }),
    recordAnswer: vi.fn(async (kind, key, hit) => {
      calls.push(`answer ${kind} ${key} ${hit}`)
    }),
    replaceStats: vi.fn(async (stats: Stats) => {
      calls.push(`stats ${Object.keys(stats.words).join(',')}|${Object.keys(stats.kana).join(',')}`)
    }),
    saveSettings: vi.fn(async (patch) => {
      calls.push(`settings ${JSON.stringify(patch)}`)
    }),
    account: vi.fn(async () => ({ anonymous: true, email: null, name: null, avatarUrl: null })),
    linkAccount: vi.fn(async () => {
      calls.push('link')
    }),
    signInToAccount: vi.fn(async () => {
      calls.push('signin')
    }),
    signOut: vi.fn(async () => {
      calls.push('signout')
    }),
    takeLinkConflict: vi.fn(() => conflict),
  }
  return { repo, calls, setStored: (next: Stored) => (current = next) }
}

async function ready(stored?: Partial<Stored>, conflict = false) {
  const fake = fakeRepo(stored, conflict)
  const app = new App(fake.repo)
  await app.init()
  return { app, ...fake }
}

describe('App', () => {
  it('loads what the repository has', async () => {
    const { app } = await ready({ words: [word('a', 2), word('b', 1)] })
    expect(app.status).toBe('ready')
    expect(app.words.map((w) => w.id)).toEqual(['a', 'b'])
  })

  it('fails with the error of the repository', async () => {
    const { repo } = fakeRepo()
    vi.mocked(repo.load).mockRejectedValueOnce(new Error('offline'))
    const app = new App(repo)
    await app.init()
    expect(app.status).toBe('failed')
    expect(app.error).toBe('offline')
  })

  it('writes only the words that changed, were added or were removed', async () => {
    const { app, calls } = await ready({ words: [word('a', 3), word('b', 2), word('c', 1)] })
    app.setWords([word('d', 4), app.words[0], { ...app.words[1], disabled: true }])
    await app.flush()
    expect(calls).toEqual(['upsert d,b', 'delete c'])
    expect(app.words.map((w) => w.id)).toEqual(['d', 'a', 'b'])
  })

  it('shows imported words first, in the order of the file', async () => {
    const { app } = await ready({ words: [word('a', 1)] })
    const { added } = app.importWords([word('x', undefined as never), { ...word('y', undefined as never), japanese: '別' }])
    expect(added).toBe(2)
    expect(app.words.map((w) => w.id)).toEqual(['x', 'y', 'a'])
  })

  it('marks added words as new until they are seen', async () => {
    const { app } = await ready({ words: [word('a', 1)] })
    expect(app.newWordIds.size).toBe(0)
    app.setWords([word('b', 2), word('c', 3), { ...app.words[0], disabled: true }])
    expect([...app.newWordIds].sort()).toEqual(['b', 'c'])
    app.markSeen('b')
    expect([...app.newWordIds]).toEqual(['c'])
  })

  it('saves a colour for each new tag and frees the colours of tags no longer in use', async () => {
    const { app, calls } = await ready({ words: [word('a', 1, { tags: ['food'] })] })
    expect(Object.keys(app.settings.tagColors)).toEqual(['food'])
    app.setWords([{ ...app.words[0], tags: ['verbs'] }])
    await app.flush()
    expect(Object.keys(app.settings.tagColors)).toEqual(['verbs'])
    expect(calls.at(-1)).toBe(`settings ${JSON.stringify({ tagColors: app.settings.tagColors })}`)
  })

  it('keeps the colour of a renamed tag', async () => {
    const tagColors = { food: { hue: 10, tone: 0 } }
    const { app } = await ready({ words: [word('a', 1, { tags: ['food'] })], settings: { ...DEFAULT_SETTINGS, tagColors } })
    app.renameTag('food', 'Meals')
    expect(app.words[0].tags).toEqual(['Meals'])
    expect(app.settings.tagColors).toEqual({ meals: { hue: 10, tone: 0 } })
  })

  it('keeps the colour of the tag a rename merges into', async () => {
    const tagColors = { food: { hue: 10, tone: 0 }, meals: { hue: 200, tone: 1 } }
    const words = [word('a', 1, { tags: ['food'] }), word('b', 2, { tags: ['meals'] })]
    const { app } = await ready({ words, settings: { ...DEFAULT_SETTINGS, tagColors } })
    app.renameTag('food', 'meals')
    expect(app.settings.tagColors).toEqual({ meals: { hue: 200, tone: 1 } })
  })

  it('drops the stats of a deleted word', async () => {
    const stats: Stats = { words: { a: { hits: 1, misses: 0 } }, kana: {} }
    const { app } = await ready({ words: [word('a', 1)], stats })
    app.setWords([])
    expect(app.stats.words).toEqual({})
  })

  it('counts answers in memory and in the repository', async () => {
    const { app, calls } = await ready({ words: [word('a', 1)] })
    app.recorder.word(app.words[0], 'almost')
    app.recorder.kana('hiragana', 'あ', true)
    await app.flush()
    expect(app.stats.words.a).toEqual({ hits: 0, misses: 1 })
    expect(app.stats.kana['hiragana:あ']).toEqual({ hits: 1, misses: 0 })
    expect(calls).toEqual(['answer word a false', 'answer kana hiragana:あ true'])
  })

  it('ignores imported tallies of words that do not exist', async () => {
    const { app, calls } = await ready({ words: [word('a', 1)] })
    app.replaceStats({ words: { a: { hits: 1, misses: 1 }, gone: { hits: 5, misses: 0 } }, kana: {} })
    await app.flush()
    expect(Object.keys(app.stats.words)).toEqual(['a'])
    expect(calls).toEqual(['stats a|'])
  })

  it('saves only the setting that changed', async () => {
    const { app, calls } = await ready()
    app.setWordsFocus('both')
    app.setKanaSelection(['hiragana:あ'])
    app.setWordsSort('reading', 'desc')
    app.setStatsSort('misses', 'asc')
    await app.flush()
    expect(app.settings).toMatchObject({
      wordsFocus: 'both',
      kanaSelection: ['hiragana:あ'],
      wordsSort: 'reading',
      wordsSortDirection: 'desc',
      statsSort: 'misses',
      statsSortDirection: 'asc',
    })
    expect(calls).toEqual([
      'settings {"wordsFocus":"both"}',
      'settings {"kanaSelection":["hiragana:あ"]}',
      'settings {"wordsSort":"reading","wordsSortDirection":"desc"}',
      'settings {"statsSort":"misses","statsSortDirection":"asc"}',
    ])
  })

  it('reads the data back when a write fails', async () => {
    const { app, repo, setStored } = await ready({ words: [word('a', 1)] })
    vi.mocked(repo.upsertWords).mockRejectedValueOnce(new Error('denied'))
    setStored({ words: [word('a', 1)], stats: emptyStats(), settings: { ...DEFAULT_SETTINGS } })
    app.setWords([word('b', 2), ...app.words])
    await app.flush()
    expect(app.error).toContain('denied')
    expect(app.words.map((w) => w.id)).toEqual(['a'])
  })
})

describe('legacy localStorage import', () => {
  const store = new Map<string, string>()

  beforeEach(() => {
    store.clear()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    })
  })

  afterEach(() => vi.unstubAllGlobals())

  function saveLegacy() {
    store.set('zennia:words', JSON.stringify({ version: 2, words: [word('a', 0), word('b', 0)] }))
    store.set('zennia:stats', JSON.stringify({ version: 1, stats: { words: { a: { hits: 2, misses: 1 }, gone: { hits: 1, misses: 0 } }, kana: {} } }))
    store.set('zennia:words-focus', JSON.stringify('both'))
  }

  it('uploads the old data once and removes it', async () => {
    saveLegacy()
    const { app, calls } = await ready()
    expect(calls).toEqual(['upsert a,b', 'stats a|', 'settings ' + JSON.stringify({ ...DEFAULT_SETTINGS, wordsFocus: 'both' })])
    expect(store.has('zennia:words')).toBe(false)
    expect(store.has('zennia:stats')).toBe(false)
    expect(app.status).toBe('ready')
  })

  it('keeps the first word of the old list first', async () => {
    saveLegacy()
    const { repo } = fakeRepo()
    const app = new App(repo)
    await app.init()
    const uploaded = vi.mocked(repo.upsertWords).mock.calls[0][0]
    expect(uploaded[0].createdAt!).toBeGreaterThan(uploaded[1].createdAt!)
  })

  it('does nothing when the user already has data', async () => {
    saveLegacy()
    const { calls } = await ready({ words: [word('z', 1)] })
    expect(calls).toEqual([])
    expect(store.has('zennia:words')).toBe(true)
  })

  describe('login', () => {
    it('asks before discarding the data of a browser that already has some', async () => {
      const { app, calls } = await ready({ words: [word('a', 1)] }, true)
      expect(app.conflict).toBe(true)
      expect(calls).toEqual([])
      await app.resolveConflict(true)
      expect(calls).toEqual(['signin'])
    })

    it('keeps the data when the user declines', async () => {
      const { app, calls } = await ready({ words: [word('a', 1)] }, true)
      await app.resolveConflict(false)
      expect(app.conflict).toBe(false)
      expect(calls).toEqual([])
    })

    it('signs in to the existing account at once when the browser has no data', async () => {
      const { app, calls } = await ready({}, true)
      expect(app.conflict).toBe(false)
      expect(calls).toEqual(['signin'])
    })

    it('reloads the data after signing out', async () => {
      const { app, calls, repo } = await ready({ words: [word('a', 1)] })
      await app.signOut()
      expect(calls).toEqual(['signout'])
      expect(repo.load).toHaveBeenCalledTimes(2)
    })
  })
})
