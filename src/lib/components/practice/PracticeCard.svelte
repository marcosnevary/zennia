<script lang="ts">
  import CircleSmall from "@lucide/svelte/icons/circle-small";
  import X from "@lucide/svelte/icons/x";
  import type { Verdict } from "#lib/core/types.ts";
  import type { RightAnswer } from "#lib/data/practice-modes.ts";
  import ResultPanel from "./ResultPanel.svelte";
  import Scoreboard from "./Scoreboard.svelte";

  const VERDICT_TEXT: Record<Verdict, string> = {
    correct: "text-ok",
    almost: "text-warn",
    incorrect: "text-bad",
  };

  let {
    prompt,
    promptFont,
    verdict,
    rightAnswer,
    note,
    readingVerdict = null,
    meaningVerdict = null,
    hits,
    answers,
    askReading = true,
    askMeaning = false,
    answer = $bindable(),
    inputEl = $bindable(),
    meaningAnswer = $bindable(""),
    meaningEl = $bindable(),
    onsubmit,
    onkeydown,
    onplay,
  }: {
    /** The word or symbol being asked */
    prompt: string;
    /** A font-family for the prompt instead of the UI font */
    promptFont?: string;
    verdict: Verdict | null;
    /** Shown with the verdict */
    rightAnswer: RightAnswer;
    /** Optional outcome of each part of the answer, for screen readers */
    note?: string;
    /** Outcome of the romaji field, shown on it once checked */
    readingVerdict?: Verdict | null;
    /** Outcome of the meaning field, shown on it once checked */
    meaningVerdict?: Verdict | null;
    /** Session score, shown below the fields */
    hits: number;
    answers: number;
    /** Whether the romaji field is shown */
    askReading?: boolean;
    /** Whether the meaning field is shown */
    askMeaning?: boolean;
    answer: string;
    inputEl?: HTMLInputElement;
    meaningAnswer?: string;
    meaningEl?: HTMLInputElement;
    onsubmit: (event: Event) => void;
    onkeydown: (event: KeyboardEvent) => void;
    /** Plays the pronunciation of the answer again */
    onplay: () => void;
  } = $props();

  function moveFocus(event: KeyboardEvent) {
    const target =
      event.key === "ArrowDown"
        ? meaningEl
        : event.key === "ArrowUp"
          ? inputEl
          : undefined;
    if (!target || target === event.target) return;
    event.preventDefault();
    target.focus();
  }

  function onReadingKeydown(event: KeyboardEvent) {
    moveFocus(event);
    onkeydown(event);
  }
</script>

{#snippet verdictIcon(fieldVerdict: Verdict | null)}
  {#if fieldVerdict}
    <!-- top-2 puts the 24px icon on the text line of the 40px field -->
    {@const VerdictIcon = fieldVerdict === "correct" ? CircleSmall : X}
    <VerdictIcon
      class="pointer-events-none absolute top-2 right-3 {VERDICT_TEXT[
        fieldVerdict
      ]}"
    />
  {/if}
{/snippet}

<section class="mt-6 bg-surface px-4 pb-6 text-center">
  <!-- the verdict takes the place of the prompt: they share one grid cell and cross-fade -->
  <div class="mb-5 grid">
    <p
      class="col-start-1 row-start-1 self-center text-display motion-safe:transition-opacity motion-safe:duration-200 {verdict
        ? 'opacity-0'
        : ''}"
      style:font-family={promptFont}
      lang="ja"
      aria-hidden={verdict !== null}
    >
      {prompt}
    </p>
    <ResultPanel {verdict} answer={rightAnswer} {note} {onplay} />
  </div>

  <form class="flex gap-2" {onsubmit}>
    <div class="flex min-w-0 flex-1 flex-col gap-2">
      {#if askReading}
        <div class="relative">
          <input
            type="text"
            class="field {readingVerdict ? 'pr-11' : ''}"
            data-verdict={readingVerdict}
            aria-invalid={readingVerdict
              ? readingVerdict !== "correct"
              : undefined}
            bind:this={inputEl}
            bind:value={answer}
            onkeydown={onReadingKeydown}
            readonly={verdict !== null}
            placeholder="Type in romaji"
            autocomplete="off"
            autocapitalize="off"
            autocorrect="off"
            spellcheck="false"
          />
          {@render verdictIcon(readingVerdict)}
        </div>
      {/if}
      {#if askMeaning}
        <div class="relative">
          <input
            type="text"
            class="field {meaningVerdict ? 'pr-11' : ''}"
            data-verdict={meaningVerdict}
            aria-invalid={meaningVerdict
              ? meaningVerdict !== "correct"
              : undefined}
            bind:this={meaningEl}
            bind:value={meaningAnswer}
            onkeydown={moveFocus}
            readonly={verdict !== null}
            placeholder="Type the meaning"
            autocomplete="off"
            autocapitalize="off"
            autocorrect="off"
            spellcheck="false"
          />
          {@render verdictIcon(meaningVerdict)}
        </div>
      {/if}
    </div>
    <!-- fixed width, so the button does not resize when its label switches between Check and Next -->
    <button class="action w-28 flex-none" type="submit"
      >{verdict ? "Next" : "Check"}</button
    >
  </form>

  <Scoreboard {hits} {answers} />
</section>
