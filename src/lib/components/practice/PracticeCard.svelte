<script lang="ts">
  import CircleSmall from "@lucide/svelte/icons/circle-small";
  import X from "@lucide/svelte/icons/x";
  import { editedRomaji, typedKana } from "#lib/core/kana-input.ts";
  import type { Verdict } from "#lib/core/types.ts";
  import type { RightAnswer } from "#lib/data/practice-modes.ts";
  import PromptCard from "./PromptCard.svelte";
  import Scoreboard from "./Scoreboard.svelte";

  const VERDICT_TEXT: Record<Verdict, string> = {
    correct: "text-ok",
    almost: "text-warn",
    incorrect: "text-bad",
  };

  let {
    promptFont,
    promptReady = true,
    verdict,
    rightAnswer,
    note,
    readingVerdict = null,
    meaningVerdict = null,
    hits,
    answers,
    askReading = true,
    askMeaning = false,
    showRomaji = true,
    kanaInput = false,
    answer = $bindable(),
    inputEl = $bindable(),
    meaningAnswer = $bindable(""),
    meaningEl = $bindable(),
    onsubmit,
    onkeydown,
    onplay,
  }: {
    /** A font-family for the prompt instead of the UI font */
    promptFont?: string;
    /** False keeps the prompt hidden while its font loads */
    promptReady?: boolean;
    verdict: Verdict | null;
    /** Its written runs are the prompt, and the rest shows with the verdict */
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
    /** Whether the result shows the romaji in the reading */
    showRomaji?: boolean;
    /** Whether the romaji field shows what is typed as kana, while `answer` keeps the romaji */
    kanaInput?: boolean;
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

  function onReadingInput(event: Event) {
    const field = inputEl;
    if (!field) return;
    if (!kanaInput) {
      answer = field.value;
      return;
    }
    // rewriting the field mid-composition would break a Japanese keyboard's own input; its compositionend comes next
    if (event instanceof InputEvent && event.isComposing) return;
    const fromEnd = field.value.length - (field.selectionEnd ?? 0);
    answer = editedRomaji(answer, field.value);
    const shown = typedKana(answer);
    if (field.value === shown) return;
    field.value = shown;
    const caret = Math.max(0, shown.length - fromEnd);
    field.setSelectionRange(caret, caret);
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
      class="pointer-events-none absolute top-2 right-4 {VERDICT_TEXT[
        fieldVerdict
      ]}"
    />
  {/if}
{/snippet}

<section class="mt-6">
  <PromptCard
    answer={rightAnswer}
    {promptFont}
    {promptReady}
    {verdict}
    {note}
    {showRomaji}
    {onplay}
  />

  <form class="mt-4 flex flex-col gap-2" {onsubmit}>
    <div class="flex flex-col gap-2">
      {#if askReading}
        <div class="relative">
          <input
            type="text"
            class="field {readingVerdict ? 'pr-12' : ''}"
            data-verdict={readingVerdict}
            aria-invalid={readingVerdict
              ? readingVerdict !== "correct"
              : undefined}
            bind:this={inputEl}
            value={kanaInput ? typedKana(answer) : answer}
            oninput={onReadingInput}
            oncompositionend={onReadingInput}
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
            class="field {meaningVerdict ? 'pr-12' : ''}"
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
    <button class="action" type="submit">{verdict ? "Next" : "Check"}</button>
  </form>

  <Scoreboard {hits} {answers} />
</section>
