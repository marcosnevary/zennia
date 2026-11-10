// Builds static/lists/hiragana.json and katakana.json from the tables of the Kana tab.
// Usage: node scripts/build-kana-lists.ts
import { mkdirSync, writeFileSync } from "node:fs";
import { kanaList } from "#lib/data/learn.ts";

const dir = new URL("../static/lists/", import.meta.url);
mkdirSync(dir, { recursive: true });
for (const script of ["hiragana", "katakana"] as const) {
  const list = kanaList(script);
  writeFileSync(new URL(`${script}.json`, dir), JSON.stringify(list));
  console.log(`${script}: ${list.items.length} items`);
}
