import { asset } from "$app/paths";
import type { List, ListId } from "./lists";

const cached = new Map<ListId, Promise<List>>();

async function fetchList(id: ListId): Promise<List> {
  const response = await fetch(asset(`lists/${id}.json`));
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json() as Promise<List>;
}

/** Loads a list (`static/lists/`) on first use, and keeps it for the session. */
export function loadList(id: ListId): Promise<List> {
  let list = cached.get(id);
  if (!list) {
    list = fetchList(id).catch((error) => {
      cached.delete(id); // lets the next attempt retry
      throw error;
    });
    cached.set(id, list);
  }
  return list;
}
