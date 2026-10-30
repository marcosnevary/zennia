/** Lowercase, without punctuation and with single spaces, so "To eat!" and "to eat" compare equal. */
function normalizeMeaning(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Whether the typed text is the saved meaning. A meaning can list several answers
 * separated by ";" or ","; typing any one of them is correct.
 */
export function checkMeaning(input: string, meaning: string): boolean {
  const typed = normalizeMeaning(input)
  if (!typed) return false
  return meaning.split(/[;,]/).some((option) => normalizeMeaning(option) === typed)
}
