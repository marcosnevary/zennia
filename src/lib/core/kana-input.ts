import { toKana } from "wanakana";

/**
 * Typed romaji as a field shows it, in hiragana. A final n stays romaji until the next letter tells ん from な,
 * and a final nn is ん, as the answer check reads it.
 */
export function typedKana(romaji: string): string {
  const typed = romaji.toLowerCase();
  if (/(^|[^n])n$/.test(typed)) return `${toKana(typed.slice(0, -1))}n`;
  if (typed.endsWith("nn")) return toKana(typed.slice(0, -1));
  return toKana(typed);
}

/**
 * The text behind a field that shows `typedKana(romaji)`, once an edit changed it to `value`. The romaji is kept
 * up to the first kana the edit changed, so the check still sees what was typed (ti for ティ, not the ち shown);
 * from there on, the field's own text is kept.
 */
export function editedRomaji(romaji: string, value: string): string {
  for (let end = romaji.length; end > 0; end--) {
    const kept = typedKana(romaji.slice(0, end));
    if (value.startsWith(kept))
      return romaji.slice(0, end) + value.slice(kept.length);
  }
  return value;
}
