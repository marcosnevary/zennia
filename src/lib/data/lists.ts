import { asset } from "$app/paths";
import type { List } from "./learn";

/** The files of the path's lists, in path order; N5 joins once `static/lists/n5.json` exists. */
const FILES = ["lists/hiragana.json", "lists/katakana.json"] as const;

async function loadList(file: (typeof FILES)[number]): Promise<List> {
  const response = await fetch(asset(file));
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json() as Promise<List>;
}

let cached: Promise<List[]> | undefined;

/** Loads the lists of the Learn path (`static/lists/`) on first use, and keeps them for the session. */
export function loadPath(): Promise<List[]> {
  cached ??= Promise.all(FILES.map(loadList)).catch((error) => {
    cached = undefined; // lets the next attempt retry
    throw error;
  });
  return cached;
}
