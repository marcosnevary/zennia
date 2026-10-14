export interface Word {
  id: string
  /** Japanese word (kanji/kana), as shown in practice */
  japanese: string
  /** Reading in hiragana: the source of truth for checking answers */
  hiragana: string
  /** Meaning(s), free text */
  meaning: string
}

export type Verdict = 'correct' | 'almost' | 'incorrect'

/** Format of the export file and of localStorage */
export interface WordsFile {
  version: 1
  exportedAt?: string
  words: Word[]
}
