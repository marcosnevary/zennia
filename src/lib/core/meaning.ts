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
 * separated by ";" or ","; typing any one of them is correct. A comma may also belong to a phrase,
 * as in "food, clothing and shelter", and the text can't tell which, so what lies between two ";" is
 * an answer as well. What is in parentheses is a note, as in "cat (esp. the domestic cat, Felis catus)":
 * it holds no separators, and is optional.
 */
export function checkMeaning(input: string, meaning: string): boolean {
  const typed = normalizeMeaning(input);
  if (!typed) return false;
  const options = [
    ...meaning.split(/;(?![^(]*\))/),
    ...meaning.split(/[;,](?![^(]*\))/),
  ];
  return options.some(
    (option) =>
      normalizeMeaning(option) === typed ||
      normalizeMeaning(option.replace(/\([^)]*\)/g, " ")) === typed,
  );
}
