/** Lowercase, without punctuation, single spaces and no leading "to", so "To eat!" and "eat" compare equal. */
function normalizeMeaning(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^to (?=\S)/, "");
}

/**
 * Whether the typed text is the saved meaning. A meaning can list several answers
 * separated by ";" or ","; typing any one of them is correct. What is in parentheses
 * is a note, as in "cat (esp. the domestic cat, Felis catus)": it holds no separators, and is optional.
 */
export function checkMeaning(input: string, meaning: string): boolean {
  const typed = normalizeMeaning(input);
  if (!typed) return false;
  return meaning
    .split(/[;,](?![^(]*\))/)
    .some(
      (option) =>
        normalizeMeaning(option) === typed ||
        normalizeMeaning(option.replace(/\([^)]*\)/g, " ")) === typed,
    );
}
