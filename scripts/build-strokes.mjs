// Builds static/strokes.json from an extracted KanjiVG release (https://kanjivg.tagaini.net, CC BY-SA 3.0).
// Usage: node scripts/build-strokes.mjs <dir with the kanji/*.svg files>
// Output: { "あ": { "s": ["<path d>", ...], "n": [[x, y], ...] } } where s[i] is stroke i + 1 and n[i] its number position.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const dir = process.argv[2]
if (!dir) {
  console.error('Usage: node scripts/build-strokes.mjs <kanjivg kanji dir>')
  process.exit(1)
}

const out = {}
for (const file of readdirSync(dir).sort()) {
  // skips variants such as 0f9b8-Kaisho.svg: only plain code points
  const match = /^([0-9a-f]{5})\.svg$/.exec(file)
  if (!match) continue
  const svg = readFileSync(join(dir, file), 'utf8')
  const s = [...svg.matchAll(/<path id="kvg:[0-9a-f]+-s\d+"[^>]* d="([^"]+)"/g)].map((m) => m[1])
  const n = [...svg.matchAll(/<text transform="matrix\(1 0 0 1 ([\d.-]+) ([\d.-]+)\)">/g)].map((m) => [+m[1], +m[2]])
  if (s.length === 0 || s.length !== n.length) {
    console.warn(`skipped ${file}: ${s.length} strokes, ${n.length} numbers`)
    continue
  }
  out[String.fromCodePoint(parseInt(match[1], 16))] = { s, n }
}

writeFileSync(new URL('../static/strokes.json', import.meta.url), JSON.stringify(out))
console.log(`${Object.keys(out).length} characters`)
