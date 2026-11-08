import type { Pronounced } from "#functions/_shared/pronunciation.ts";

interface Source {
  url(pronounced: Pronounced): Promise<string>;
  make(pronounced: Pronounced): Promise<void>;
  onerror(): void;
}

/**
 * Plays the audio of the current item. The audio is made the first time anyone plays a word, so a file that fails to
 * load is made and loaded again once.
 */
export class Pronunciation {
  readonly #audio = new Audio();
  readonly #source: Source;
  #pronounced?: Pronounced;
  #url?: string;
  #loaded = false;
  #made = false;
  #wanted = false;
  #delay?: ReturnType<typeof setTimeout>;

  constructor(source: Source) {
    this.#source = source;
    this.#audio.onerror = () => this.#recover();
  }

  /** Switches to another item; preloading fetches its audio now, so playing it at Check starts at once. */
  async set(pronounced: Pronounced, preload: boolean): Promise<void> {
    this.stop();
    this.#pronounced = pronounced;
    this.#url = undefined;
    this.#loaded = false;
    this.#made = false;
    const url = await this.#source.url(pronounced);
    if (this.#pronounced !== pronounced) return;
    this.#url = url;
    if (preload || this.#wanted) this.#load();
    if (this.#wanted) this.#play();
  }

  /** Waiting `delay` ms first, for the answer sound to be heard; until then the item isn't wanted, so it can't start early. */
  play(delay = 0): void {
    clearTimeout(this.#delay);
    if (delay) {
      this.#delay = setTimeout(() => this.play(), delay);
      return;
    }
    this.#wanted = true;
    if (!this.#url) return;
    if (!this.#loaded) this.#load();
    this.#play();
  }

  stop(): void {
    clearTimeout(this.#delay);
    this.#wanted = false;
    this.#audio.pause();
  }

  // a made file gets a new URL, so a cached failure of the old one isn't played back
  #load() {
    this.#loaded = true;
    this.#audio.src = this.#made ? `${this.#url}?made` : this.#url!;
  }

  // a failed load is handled by onerror, and a play the browser blocks is left silent
  #play() {
    this.#audio.currentTime = 0;
    this.#audio.play().catch(() => {});
  }

  async #recover() {
    const pronounced = this.#pronounced;
    if (!pronounced) return;
    if (this.#made) {
      if (this.#wanted) this.#source.onerror();
      return;
    }
    this.#made = true;
    try {
      await this.#source.make(pronounced);
    } catch {
      if (this.#pronounced === pronounced && this.#wanted)
        this.#source.onerror();
      return;
    }
    if (this.#pronounced !== pronounced) return;
    this.#load();
    if (this.#wanted) this.#play();
  }
}
