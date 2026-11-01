<script lang="ts">
  import { prefersReducedMotion } from 'svelte/motion'
  import { fade } from 'svelte/transition'
  import type { Verdict } from '../../core/types'
  import type { RightAnswer } from '../../data/practice-modes'

  const VERDICT_STYLES: Record<Verdict, string> = {
    correct: 'bg-ok/15',
    almost: 'bg-warn/15',
    incorrect: 'bg-bad/15',
  }

  let {
    verdict,
    answer,
    note,
  }: {
    verdict: Verdict | null
    answer: RightAnswer
    /** Optional outcome of each part of the answer, for screen readers: the fields show it by color */
    note?: string
  } = $props()

  const duration = $derived(prefersReducedMotion.current ? 0 : 200)

  /** An answer with every part, for the invisible verdict that sets the height. */
  const TALLEST: RightAnswer = { written: [{ text: '\u00a0', reading: '\u00a0', romaji: '\u00a0' }], romaji: '\u00a0', meaning: '\u00a0' }
</script>

<!-- sizes step down from what was asked to its reading, so the eye starts at the word -->
{#snippet answerLines(a: RightAnswer)}
  <!-- each run stacks its furigana above it and its romaji below it, without line spacing so the height is exact; screen readers get the plain word and the romaji -->
  <div class="flex items-end justify-center leading-none" lang="ja" aria-hidden="true">
    {#each a.written as part, i (i)}
      <span class="flex flex-col items-center gap-1">
        {#if part.reading}<span class="text-lg">{part.reading}</span>{/if}
        <!-- text-2xl's negative letter spacing would cramp Japanese -->
        <span class="text-2xl leading-none tracking-normal">{part.text}</span>
        <!-- a lone っ adds no romaji of its own, but keeps the line so the runs stay aligned -->
        <span class="text-base" lang="en">{part.romaji || '\u00a0'}</span>
      </span>
    {/each}
  </div>
  <p class="sr-only" lang="ja">{a.written.map((part) => part.text).join('')}</p>
  <p class="sr-only">{a.romaji}</p>
  {#if a.meaning !== undefined}<p class="mt-2">{a.meaning}</p>{/if}
{/snippet}

<!-- both are items of the grid cell that holds the prompt, which they cover -->
<!-- an invisible verdict with every part keeps the cell as tall as a verdict, so the prompt area never resizes -->
<div class="invisible col-start-1 row-start-1 p-4" aria-hidden="true">
  {@render answerLines(TALLEST)}
</div>
{#if verdict}
  <!-- the verdict is told by the panel's color alone; the words are left for screen readers -->
  <div
    class="col-start-1 row-start-1 flex flex-col justify-center rounded-panel p-4 text-ink {VERDICT_STYLES[verdict]}"
    role="status"
    transition:fade={{ duration }}
  >
    <p class="sr-only">
      {#if verdict === 'correct'}Correct.
      {:else if verdict === 'almost'}Almost: only the length of a vowel differs.
      {:else}Incorrect.{/if}
    </p>
    {@render answerLines(answer)}
    {#if note}<p class="sr-only">{note}</p>{/if}
  </div>
{/if}
