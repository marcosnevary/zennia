import { parseKanaKey, type KanaScript } from '../core/kana'
import type { Word } from '../core/types'
import { sameTag } from './words'

/** What a practice session includes: kana scripts, word tags, and words without tags. */
export interface PracticeScope {
  scripts: KanaScript[]
  tags: string[]
  untagged: boolean
}

export function scopeIncludesScript(scope: PracticeScope | null, script: KanaScript): boolean {
  return scope === null || scope.scripts.includes(script)
}

export function scopeIncludesUntagged(scope: PracticeScope | null): boolean {
  return scope === null || scope.untagged
}

export function scopeIncludesTag(scope: PracticeScope | null, tag: string): boolean {
  return scope === null || scope.tags.some((t) => sameTag(t, tag))
}

/** The words that have any chosen tag, or no tags when untagged words are included. */
export function scopedWords(words: Word[], scope: PracticeScope | null): Word[] {
  return words.filter((w) => (w.tags.length === 0 ? scopeIncludesUntagged(scope) : w.tags.some((t) => scopeIncludesTag(scope, t))))
}

export function scopedKanaSelection(selected: string[], scope: PracticeScope | null): string[] {
  return selected.filter((key) => {
    const parsed = parseKanaKey(key)
    return parsed !== null && scopeIncludesScript(scope, parsed.script)
  })
}

/** The scope as an explicit list, which `null` (everything) stands for. */
export function resolveScope(scope: PracticeScope | null, allTags: string[]): PracticeScope {
  return scope ?? { scripts: ['hiragana', 'katakana'], tags: allTags, untagged: true }
}

/** The scope without the tags that no word has anymore. */
export function pruneScopeTags(scope: PracticeScope | null, allTags: string[]): PracticeScope | null {
  if (scope === null) return null
  const tags = scope.tags.filter((t) => allTags.some((a) => sameTag(a, t)))
  return tags.length === scope.tags.length ? scope : { ...scope, tags }
}
