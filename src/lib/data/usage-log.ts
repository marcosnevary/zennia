import type { Word } from "#lib/core/types.ts";
import type { Settings } from "./settings";

/** Where added words came from. */
export type WordSource = "hand" | "paste" | "anki" | "json" | "lesson";

/** The facts of a session that would repeat on every answer, logged once when it starts. */
export interface SessionInfo {
  /** The commit the app was built from */
  app: string;
  device: "phone" | "tablet" | "desktop";
  viewport: [number, number];
  timeZone: string;
  language: string;
}

/** The rare events of the usage log; answers have tables of their own. */
export type UsageEvent =
  | { type: "session_start"; payload: SessionInfo }
  | { type: "stats_reset" }
  | { type: "lesson_completed"; payload: { lesson: string } }
  | { type: "tab_opened"; payload: { tab: string } }
  | {
      type: "words_added";
      payload: { ids: string[]; source: WordSource; disabled?: string[] };
    }
  | { type: "words_activated"; payload: { ids: string[] } }
  | { type: "words_deactivated"; payload: { ids: string[] } }
  | { type: "words_deleted"; payload: { ids: string[] } }
  | {
      type: "pool_snapshot";
      payload: { words: string[]; kana: string[] };
    }
  | { type: "settings_changed"; payload: Partial<Settings> };

export function sessionInfo(app: string): SessionInfo {
  // a touch screen narrower than a small tablet is a phone
  const device = !matchMedia("(pointer: coarse)").matches
    ? "desktop"
    : Math.min(screen.width, screen.height) < 600
      ? "phone"
      : "tablet";
  return {
    app,
    device,
    viewport: [innerWidth, innerHeight],
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
  };
}

/**
 * The events of a change to the word list. Added words carry their source, and those that start inactive are listed
 * too, so the pool can be rebuilt from the events.
 */
export function wordEvents(
  previous: Word[],
  next: Word[],
  source: WordSource,
): UsageEvent[] {
  const before = new Map(previous.map((w) => [w.id, w]));
  const kept = new Set(next.map((w) => w.id));
  const added = next.filter((w) => !before.has(w.id));
  const toggled = (disabled: boolean) =>
    next
      .filter((w) => {
        const old = before.get(w.id);
        return old && old.disabled !== w.disabled && w.disabled === disabled;
      })
      .map((w) => w.id);
  const disabled = added.filter((w) => w.disabled).map((w) => w.id);
  const events: UsageEvent[] = [];
  if (added.length)
    events.push({
      type: "words_added",
      payload: {
        ids: added.map((w) => w.id),
        source,
        ...(disabled.length && { disabled }),
      },
    });
  const activated = toggled(false);
  if (activated.length)
    events.push({ type: "words_activated", payload: { ids: activated } });
  const deactivated = toggled(true);
  if (deactivated.length)
    events.push({ type: "words_deactivated", payload: { ids: deactivated } });
  const deleted = previous.filter((w) => !kept.has(w.id)).map((w) => w.id);
  if (deleted.length)
    events.push({ type: "words_deleted", payload: { ids: deleted } });
  return events;
}
