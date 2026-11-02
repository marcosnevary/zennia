/** The noun as it goes after `count`: "word" for 1, "words" otherwise. Only for nouns that take an "s". */
export function plural(count: number, noun: string): string {
  return count === 1 ? noun : `${noun}s`
}
