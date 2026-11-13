import { getContext, setContext } from "svelte";
import { toHiragana } from "wanakana";
import { spokenReading } from "#lib/core/romaji.ts";
import type { App } from "#lib/state.svelte.ts";
import { Pronunciation } from "../practice/pronunciation.ts";

const PLAYER = Symbol("player");

/** Says Japanese text aloud; `reading` is needed when the text has kanji. */
export type Say = (written: string, reading?: string) => void;

/** One player for the whole lesson, so a new sound stops the one before. Returns a function that stops it. */
export function setPlayer(app: App): () => void {
  const pronunciation = new Pronunciation({
    url: (pronounced) => app.pronunciationUrl(pronounced),
    make: (pronounced) => app.makePronunciation(pronounced),
    onerror: () =>
      app.toasts.show(
        "Couldn't play the pronunciation. Check your connection and try again.",
        { id: "pronunciation" },
      ),
  });
  const say: Say = (written, reading = toHiragana(written)) => {
    void pronunciation.set({ written, reading: spokenReading(reading) }, false);
    pronunciation.play();
  };
  setContext(PLAYER, say);
  return () => pronunciation.stop();
}

export function getPlayer(): Say {
  return getContext<Say>(PLAYER);
}
