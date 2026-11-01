# Glossary

| Term | In the code | Meaning |
| --- | --- | --- |
| Dictionary | `Dictionary` (`src/lib/data/dictionary.ts`) | The bundled JMdict common words, looked up by sound to fill in the words of a romaji list ("Add from romaji"). |
| Furigana | `furigana`, `FuriganaPart`, `annotate`, `AnnotatedPart` (`src/lib/core/furigana.ts`), `AnnotatedWord` (`src/lib/components/AnnotatedWord.svelte`) | The reading in hiragana shown above the kanji or katakana of a word, with the romaji of each run below it, in the practice feedback and the Words list. Hiragana runs (okurigana) get none. |
