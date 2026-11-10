import { isKana } from "wanakana";
import { plural } from "#lib/core/plural.ts";
import { toDisplayRomaji } from "#lib/core/romaji.ts";
import type { Word } from "#lib/core/types.ts";
import { cleanTags, matchTags } from "./tags";

export function newId(): string {
  return crypto.randomUUID();
}

/** The texts of the add / edit form, as typed. */
export interface WordFields {
  japanese: string;
  hiragana: string;
  meaning: string;
  tags: string[];
}

/** The message to show under each invalid field of the form. */
export type WordErrors = Partial<
  Record<"japanese" | "hiragana" | "meaning" | "duplicate", string>
>;

/** The errors of the form, empty when the word can be saved. */
export function validateWord({
  japanese,
  hiragana,
  meaning,
}: WordFields): WordErrors {
  const errors: WordErrors = {};
  const h = hiragana.trim();
  if (!japanese.trim()) errors.japanese = "Fill in the word.";
  if (!h) errors.hiragana = "Fill in the reading.";
  else if (!isKana(h))
    errors.hiragana =
      "The reading must contain only kana (hiragana, katakana or ー).";
  if (!meaning.trim()) errors.meaning = "Fill in the meaning.";
  return errors;
}

/** What makes two words the same word: the written form and the reading. */
function wordKey({
  japanese,
  hiragana,
}: Pick<Word, "japanese" | "hiragana">): string {
  return `${japanese.trim()}|${hiragana.trim()}`;
}

/**
 * The errors of the edit form. Unlike a new word, an edited word can't merge into the one it would match,
 * because their tallies would have to be combined.
 */
export function validateEdit(
  fields: WordFields,
  words: Word[],
  id: string | null,
): WordErrors {
  const errors = validateWord(fields);
  const key = wordKey(fields);
  if (words.some((w) => w.id !== id && wordKey(w) === key))
    errors.duplicate = "You already have this word with this reading.";
  return errors;
}

/** The muted line next to a word: its hiragana and romaji, or only the romaji when the word is written in hiragana. */
export function wordReading({
  japanese,
  hiragana,
}: Pick<Word, "japanese" | "hiragana">): string {
  const romaji = toDisplayRomaji(hiragana);
  return japanese === hiragana ? romaji : `${hiragana} · ${romaji}`;
}

/** A new active word from the form texts. */
export function makeWord({
  japanese,
  hiragana,
  meaning,
  tags,
}: WordFields): Word {
  return {
    id: newId(),
    japanese: japanese.trim(),
    hiragana: hiragana.trim(),
    meaning: meaning.trim(),
    disabled: false,
    mine: true,
    activatedAt: Date.now(),
    createdAt: Date.now(),
    tags: cleanTags(tags),
  };
}

/** The word activated or deactivated; activating it stamps the time, which orders the status sort. */
export function setDisabled(
  word: Word,
  disabled: boolean,
  now = Date.now(),
): Word {
  if (!disabled && word.disabled)
    return { ...word, disabled, activatedAt: now };
  return { ...word, disabled };
}

/** The word with the form texts applied; the id and whether it is active stay. */
export function updateWord(
  word: Word,
  { japanese, hiragana, meaning, tags }: WordFields,
): Word {
  return {
    ...word,
    japanese: japanese.trim(),
    hiragana: hiragana.trim(),
    meaning: meaning.trim(),
    tags: cleanTags(tags),
  };
}

export interface SearchQuery {
  /** The plain text to look for, lowercase */
  text: string;
  /** The `#` terms, lowercase and without the `#` */
  tags: string[];
}

/** Splits a search into its `#tag` terms and the rest of the text. A bare `#` counts as neither. */
export function parseSearch(query: string): SearchQuery {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  return {
    text: terms.filter((t) => !t.startsWith("#")).join(" "),
    tags: terms
      .filter((t) => t.startsWith("#") && t.length > 1)
      .map((t) => t.slice(1)),
  };
}

/** Whether every `#` term is contained in one of the tags, ignoring case. */
export function hasSearchTags(tags: string[], terms: string[]): boolean {
  return terms.every((term) => matchTags(tags, term).length > 0);
}

/** What a search matches a word against. */
export function wordSearchFields(word: Word): string[] {
  return [
    word.japanese,
    word.hiragana,
    toDisplayRomaji(word.hiragana),
    word.meaning,
  ];
}

/**
 * The words matching the search in the word, the reading, its romaji or the meaning, and having a tag for
 * every `#` term; everything for a blank search.
 */
export function searchWords(words: Word[], query: string): Word[] {
  const { text, tags } = parseSearch(query);
  return words.filter(
    (w) =>
      hasSearchTags(w.tags, tags) &&
      wordSearchFields(w).some((field) => field.toLowerCase().includes(text)),
  );
}

export interface SanitizeResult {
  words: Word[];
  skipped: number;
}

/**
 * Validates an imported file. Accepts a list of words or an object { words: [...] }.
 * Items without `japanese`, `hiragana` or `meaning` are ignored and counted in `skipped`.
 * A word with no valid activation time counts as activated now.
 */
export function sanitizeWords(raw: unknown): SanitizeResult {
  const list = Array.isArray(raw)
    ? raw
    : raw &&
        typeof raw === "object" &&
        Array.isArray((raw as { words?: unknown }).words)
      ? (raw as { words: unknown[] }).words
      : null;

  if (!list) throw new Error("Invalid format: expected a list of words.");

  const words: Word[] = [];
  let skipped = 0;
  const seenIds = new Set<string>();

  for (const item of list) {
    if (!item || typeof item !== "object") {
      skipped++;
      continue;
    }
    const o = item as Record<string, unknown>;
    const japanese = typeof o.japanese === "string" ? o.japanese.trim() : "";
    const hiragana = typeof o.hiragana === "string" ? o.hiragana.trim() : "";
    const meaning = typeof o.meaning === "string" ? o.meaning.trim() : "";
    if (!japanese || !hiragana || !meaning) {
      skipped++;
      continue;
    }
    let id = typeof o.id === "string" && o.id ? o.id : newId();
    if (seenIds.has(id)) id = newId();
    seenIds.add(id);
    const tags = Array.isArray(o.tags) ? cleanTags(o.tags) : [];
    words.push({
      id,
      japanese,
      hiragana,
      meaning,
      disabled: o.disabled === true,
      mine: true,
      activatedAt:
        typeof o.activatedAt === "number" && Number.isFinite(o.activatedAt)
          ? o.activatedAt
          : Date.now(),
      tags,
    });
  }

  return { words, skipped };
}

export interface MergeResult {
  words: Word[];
  added: number;
  /** Existing words that gained a new meaning or tag. */
  updated: number;
  duplicates: number;
}

/** The message shown after importing: what was added, what got a new meaning and what was ignored. */
export function importSummary(
  { added, updated, duplicates }: MergeResult,
  skipped: number,
): string {
  const updatedNote = updated ? `, ${updated} updated` : "";
  const skippedNote = skipped
    ? ` ${skipped} invalid ${plural(skipped, "item")} ignored.`
    : "";
  return `${added} added${updatedNote}, ${duplicates} already existed.${skippedNote}`;
}

/** The main outcome of an import in a few words, short enough for a button label; `importSummary` has the rest. */
export function importBrief({ added, updated }: MergeResult): string {
  if (added) return `${added} added`;
  if (updated) return `${updated} updated`;
  return "Nothing new";
}

/** The message for a word of the add form that merged into an existing one, or '' when it was added. */
export function mergeNote(
  { japanese }: Pick<Word, "japanese">,
  { added, updated }: MergeResult,
): string {
  if (added) return "";
  return updated
    ? `${japanese} already exists and was updated.`
    : `${japanese} already exists, nothing changed.`;
}

const MEANING_SEPARATOR = "; ";

/** Appends `meaning` to `current` unless it is empty or already one of its parts. */
function joinMeanings(current: string, meaning: string): string | null {
  if (!meaning) return null;
  if (!current) return meaning;
  if (current.split(MEANING_SEPARATOR).includes(meaning)) return null;
  return current + MEANING_SEPARATOR + meaning;
}

/**
 * Adds new words to the pool. A word that already exists (same id or same word + hiragana) is not added again,
 * but a different meaning is appended to the existing one, separated by "; ", and the tags are united.
 */
export function mergeWords(current: Word[], incoming: Word[]): MergeResult {
  const words = [...current];
  const ids = new Set(current.map((w) => w.id));
  const byKey = new Map<string, number>();
  words.forEach((w, i) => byKey.set(wordKey(w), i));
  let added = 0;
  let updated = 0;
  let duplicates = 0;

  for (const w of incoming) {
    const key = wordKey(w);
    const at = byKey.get(key);
    if (at !== undefined) {
      const meaning = joinMeanings(words[at].meaning, w.meaning);
      const tags = cleanTags([...words[at].tags, ...w.tags]);
      // adding a word that only a list brought makes it the user's
      const mine = words[at].mine || w.mine;
      if (
        meaning === null &&
        tags.length === words[at].tags.length &&
        mine === words[at].mine
      )
        duplicates++;
      else {
        words[at] = {
          ...words[at],
          meaning: meaning ?? words[at].meaning,
          tags,
          mine,
        };
        updated++;
      }
      continue;
    }
    if (ids.has(w.id)) {
      duplicates++;
      continue;
    }
    ids.add(w.id);
    byKey.set(key, words.length);
    words.push(w);
    added++;
  }

  return { words, added, updated, duplicates };
}

export type SortKey = "list" | "japanese" | "reading" | "meaning" | "status";
export type SortDirection = "asc" | "desc";

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "list", label: "List order" },
  { key: "japanese", label: "Word" },
  { key: "reading", label: "Reading" },
  { key: "meaning", label: "Meaning" },
  { key: "status", label: "Status" },
];

const collator = new Intl.Collator("ja");

/**
 * Returns a sorted copy of the list. `list` keeps the stored order (newest additions first)
 * `status` puts active words first when ascending, oldest activation first. Remaining ties keep the stored order
 * (the direction flips the criterion, including the activation order, but not that tie-break).
 */
export function sortWords(
  words: Word[],
  key: SortKey,
  direction: SortDirection,
): Word[] {
  if (key === "list")
    return direction === "asc" ? [...words] : [...words].reverse();
  const sign = direction === "asc" ? 1 : -1;
  const compare = (a: Word, b: Word): number => {
    switch (key) {
      case "japanese":
        return collator.compare(a.japanese, b.japanese);
      case "reading":
        return collator.compare(a.hiragana, b.hiragana);
      case "meaning":
        return collator.compare(a.meaning, b.meaning);
      case "status":
        return (
          Number(a.disabled) - Number(b.disabled) ||
          (a.disabled ? 0 : a.activatedAt - b.activatedAt)
        );
    }
  };
  return [...words].sort((a, b) => sign * compare(a, b) || 0);
}
