export interface Word {
  id: string
  /** Palavra em japonês (kanji/kana), como aparece na prática */
  japanese: string
  /** Leitura em hiragana: é a fonte da verdade para a correção */
  hiragana: string
  /** Significado(s), texto livre */
  meaning: string
}

export type Verdict = 'correct' | 'almost' | 'incorrect'

/** Formato do arquivo de exportação e do localStorage */
export interface WordsFile {
  version: 1
  exportedAt?: string
  words: Word[]
}
