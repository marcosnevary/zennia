<script lang="ts">
  import Volume2 from "@lucide/svelte/icons/volume-2";
  import type { Verdict } from "#lib/core/types.ts";
  import type { RightAnswer } from "#lib/data/practice-modes.ts";

  const VERDICT_STYLES: Record<Verdict, string> = {
    correct: "bg-ok/15",
    almost: "bg-warn/15",
    incorrect: "bg-bad/15",
  };

  let {
    answer,
    promptFont,
    promptReady = true,
    verdict,
    note,
    showRomaji = true,
    onplay,
  }: {
    /** The item's answer: its written runs are the prompt, and the rest shows once checked */
    answer: RightAnswer;
    /** A font-family for the prompt instead of the UI font */
    promptFont?: string;
    /** False keeps the prompt hidden while its font loads */
    promptReady?: boolean;
    verdict: Verdict | null;
    /** Optional outcome of each part of the answer, for screen readers: the fields show it by color */
    note?: string;
    /** Whether the result shows the romaji; screen readers get it either way */
    showRomaji?: boolean;
    /** Plays the pronunciation of the answer again */
    onplay: () => void;
  } = $props();

  const written = $derived(answer.written.map((part) => part.text).join(""));
  // a word all in hiragana has no furigana, so it gets no furigana line
  const hasFurigana = $derived(answer.written.some((part) => part.reading));
  // only words have a meaning, below the prompt and its reading
  const hasMeaning = $derived(answer.meaning !== undefined);
</script>

<div
  class="relative flex flex-col items-center gap-1 rounded-panel p-4 text-ink motion-safe:transition-colors motion-safe:duration-200 {verdict
    ? VERDICT_STYLES[verdict]
    : 'bg-surface'}"
>
  <!-- the word with its reading: furigana above each run, the romaji of the whole word below; screen readers get the
       plain word, and the romaji with the verdict -->
  <div class="flex flex-col items-center">
    <p
      class={["flex items-end", !promptReady && "invisible"]}
      style:font-family={promptFont}
      lang="ja"
    >
      <span class="sr-only">{written}</span>
      {#each answer.written as part, i (i)}
        <span class="flex flex-col items-center" aria-hidden="true">
          <!-- a run without furigana keeps the line, so the runs stay aligned on the word -->
          {#if verdict && hasFurigana}
            <span class="text-base leading-6">{part.reading || "\u00a0"}</span>
          {/if}
          <!-- text-2xl's negative letter spacing would cramp Japanese -->
          <span class="text-2xl tracking-normal">{part.text}</span>
        </span>
      {/each}
    </p>
    {#if verdict && showRomaji}
      <p class="text-base leading-6 text-muted" aria-hidden="true">
        {answer.romaji}
      </p>
    {/if}
  </div>

  {#if verdict}
    <!-- the verdict is told by the card's color, and its word is left for screen readers -->
    <div
      class={hasMeaning
        ? "flex w-full flex-col items-center gap-1 px-10 text-center"
        : "sr-only"}
      role="status"
    >
      <p class="sr-only">
        {#if verdict === "correct"}Correct.
        {:else if verdict === "almost"}Almost.
        {:else}Incorrect.{/if}
      </p>
      <p class="sr-only">{answer.romaji}</p>
      {#if hasMeaning}
        <p class="text-base leading-6">{answer.meaning}</p>
      {/if}
      {#if verdict === "almost"}
        <p class="text-sm leading-5">Only the length of a vowel differs.</p>
      {/if}
      {#if note}<p class="sr-only">{note}</p>{/if}
    </div>
    <!-- outside the status, so its label isn't announced with the verdict; a mouse click leaves the focus on the page,
         where Enter and Space move on to the next item -->
    <button
      type="button"
      class="icon absolute right-2 bottom-2"
      aria-label="Listen"
      title="Listen"
      onmousedown={(e) => e.preventDefault()}
      onclick={onplay}
    >
      <Volume2 />
    </button>
  {/if}
</div>
