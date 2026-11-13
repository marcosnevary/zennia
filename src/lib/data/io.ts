import type { Word, WordsFile } from "#lib/core/types.ts";
import { sanitizeWords, type SanitizeResult } from "./words";

/** Name of the exported file, with the date of the export. `what` is "words" for the word export, "data" for everything stored about the user. */
export function exportFilename(
  date = new Date(),
  what: "words" | "data" = "words",
): string {
  return `zennia-${what}-${date.toISOString().slice(0, 10)}.json`;
}

/** Serializes the pool to JSON (format with `version`, for future migrations). */
export function exportJSON(words: Word[]): string {
  const data: WordsFile = {
    version: 2,
    exportedAt: new Date().toISOString(),
    words,
  };
  return JSON.stringify(data, null, 2);
}

function parseJSON(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("The file is not valid JSON.");
  }
}

/** Reads an exported JSON (or a plain list of words) and validates each item. */
export function importJSON(text: string): SanitizeResult {
  return sanitizeWords(parseJSON(text));
}

/** Downloads a JSON text as a file through the browser. */
export function downloadJSON(filename: string, text: string): void {
  const blob = new Blob([text], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
