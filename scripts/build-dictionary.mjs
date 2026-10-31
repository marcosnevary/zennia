// Builds static/dictionary.json from a jmdict-simplified "common words" release
// (https://github.com/scriptin/jmdict-simplified, JMdict by EDRDG, CC BY-SA 4.0).
// Usage: node scripts/build-dictionary.mjs <jmdict-eng-common-*.json>
// Output: [[reading, japanese, meaning], ...], one row per common reading, in JMdict order.
import { readFileSync, writeFileSync } from 'node:fs'

const file = process.argv[2]
if (!file) {
  console.error('Usage: node scripts/build-dictionary.mjs <jmdict-eng-common json>')
  process.exit(1)
}

const MAX_GLOSSES = 3

const applies = (list, text) => list.includes('*') || list.includes(text)

const rows = []
for (const entry of JSON.parse(readFileSync(file, 'utf8')).words) {
  for (const kana of entry.kana) {
    if (!kana.common) continue
    const sense = entry.sense.find((s) => applies(s.appliesToKana, kana.text))
    if (!sense) continue
    const spellings = entry.kanji.filter((k) => applies(kana.appliesToKanji, k.text))
    const kanji = spellings.find((k) => k.common) ?? spellings[0]
    const japanese = kanji && !sense.misc.includes('uk') ? kanji.text : kana.text
    const meaning = sense.gloss.slice(0, MAX_GLOSSES).map((g) => g.text).join('; ')
    rows.push([kana.text, japanese, meaning])
  }
}

writeFileSync(new URL('../static/dictionary.json', import.meta.url), JSON.stringify(rows))
console.log(`${rows.length} readings`)
