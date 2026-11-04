import type { Word } from "#lib/core/types.ts";

/** The key a tag's color is saved under, the same for every spelling of the tag. */
export function tagKey(tag: string): string {
  return tag.trim().toLowerCase();
}

export const MAX_TAG_LENGTH = 30;

/** The message to show for an invalid tag name, or '' when it can be used. */
export function validateTag(tag: string): string {
  const t = tag.trim();
  if (!t) return "Type a tag name.";
  if (t.length > MAX_TAG_LENGTH)
    return `A tag can have at most ${MAX_TAG_LENGTH} characters.`;
  // a space would end a `#` search term and `#` would start one, so a name holds neither
  if (!/^[\p{L}\p{M}\p{N}_-]+$/u.test(t))
    return "A tag can only have letters, numbers, - and _.";
  return "";
}

/** Whether two tag names are the same tag: equal ignoring case and surrounding spaces. */
export function sameTag(a: string, b: string): boolean {
  return tagKey(a) === tagKey(b);
}

/** The spelling the list uses for the tag, if it has it. */
export function findTag(tags: string[], name: string): string | undefined {
  return tags.find((t) => sameTag(t, name));
}

/** Whether the tags include every wanted one. */
export function hasEveryTag(tags: string[], wanted: string[]): boolean {
  return wanted.every((w) => tags.some((t) => sameTag(t, w)));
}

/** The tags that contain the typed text, ignoring case and surrounding spaces; all of them when it is blank. */
export function matchTags(tags: string[], query: string): string[] {
  const q = query.trim().toLowerCase();
  return tags.filter((t) => t.toLowerCase().includes(q));
}

/** The valid tags of a list, trimmed and without repeats (ignoring case), keeping the first spelling. */
export function cleanTags(tags: unknown[]): string[] {
  const result: string[] = [];
  for (const tag of tags) {
    if (typeof tag !== "string" || validateTag(tag)) continue;
    const t = tag.trim();
    if (!result.some((r) => sameTag(r, t))) result.push(t);
  }
  return result;
}

const tagCollator = new Intl.Collator(undefined, { sensitivity: "base" });

/** Every tag in use, once each (the first spelling found), ordered ignoring case. */
export function allTags(words: Word[]): string[] {
  return cleanTags(words.flatMap((w) => w.tags)).sort(tagCollator.compare);
}

/** The spelling the pool already uses for the tag, or the typed one when it is new. */
function spellingOf(words: Word[], tag: string): string {
  return findTag(allTags(words), tag) ?? tag.trim();
}

/** The words with the tag added to the chosen ones; the tag keeps the spelling already in use. */
export function addTag(words: Word[], ids: Set<string>, tag: string): Word[] {
  const spelling = spellingOf(words, tag);
  return words.map((w) =>
    ids.has(w.id) ? { ...w, tags: cleanTags([...w.tags, spelling]) } : w,
  );
}

/** The words with the tag taken off the chosen ones. */
export function removeTag(
  words: Word[],
  ids: Set<string>,
  tag: string,
): Word[] {
  return words.map((w) =>
    ids.has(w.id) ? { ...w, tags: w.tags.filter((t) => !sameTag(t, tag)) } : w,
  );
}

/** The words with the tag taken off every one of them. */
export function deleteTag(words: Word[], tag: string): Word[] {
  return words.map((w) => ({
    ...w,
    tags: w.tags.filter((t) => !sameTag(t, tag)),
  }));
}

/**
 * The words with the tag renamed everywhere. Renaming to a tag that already exists merges the two,
 * and the merged tag keeps the spelling already in use.
 */
export function renameTag(words: Word[], from: string, to: string): Word[] {
  const existing = allTags(words).find(
    (t) => sameTag(t, to) && !sameTag(t, from),
  );
  const name = existing ?? to.trim();
  return words.map((w) => {
    if (!w.tags.some((t) => sameTag(t, from) || sameTag(t, name))) return w;
    return {
      ...w,
      tags: cleanTags(
        w.tags.map((t) => (sameTag(t, from) || sameTag(t, name) ? name : t)),
      ),
    };
  });
}

/** The words that have every one of the tags; all of them when no tag is chosen. */
export function filterByTags(words: Word[], tags: string[]): Word[] {
  return words.filter((w) => hasEveryTag(w.tags, tags));
}

/** The words that have at least one of the tags: the ones deleting those tags would change. */
export function withAnyTag(words: Word[], tags: string[]): Word[] {
  return words.filter((w) =>
    tags.some((tag) => w.tags.some((t) => sameTag(t, tag))),
  );
}
