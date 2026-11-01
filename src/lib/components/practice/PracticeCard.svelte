<script lang="ts">
  import type { Verdict } from '../../core/types'
  import Icon from '../Icon.svelte'
  import Scoreboard from './Scoreboard.svelte'

  const VERDICT_STYLES: Record<Verdict, string> = {
    correct: 'bg-ok-bg text-ok',
    almost: 'bg-warn-bg text-warn',
    incorrect: 'bg-bad-bg text-bad',
  }

  const VERDICT_TEXT: Record<Verdict, string> = {
    correct: 'text-ok',
    almost: 'text-warn',
    incorrect: 'text-bad',
  }

  let {
    prompt,
    verdict,
    reading,
    detail,
    note,
    readingVerdict = null,
    meaningVerdict = null,
    hits,
    total,
    askReading = true,
    askMeaning = false,
    answer = $bindable(),
    inputEl = $bindable(),
    meaningAnswer = $bindable(''),
    meaningEl = $bindable(),
    onsubmit,
    onkeydown,
  }: {
    /** The word or symbol being asked */
    prompt: string
    verdict: Verdict | null
    /** Shown with the verdict: the right answer */
    reading: string
    /** Optional extra line below the reading (the meaning of a word) */
    detail?: string
    /** Optional outcome of each part of the answer, for screen readers */
    note?: string
    /** Outcome of the romaji field, shown on it once checked */
    readingVerdict?: Verdict | null
    /** Outcome of the meaning field, shown on it once checked */
    meaningVerdict?: Verdict | null
    /** Session score, shown below the fields */
    hits: number
    total: number
    /** Whether the romaji field is shown */
    askReading?: boolean
    /** Whether the meaning field is shown */
    askMeaning?: boolean
    answer: string
    inputEl?: HTMLInputElement
    meaningAnswer?: string
    meaningEl?: HTMLInputElement
    onsubmit: (event: Event) => void
    onkeydown: (event: KeyboardEvent) => void
  } = $props()
</script>

{#snippet verdictIcon(fieldVerdict: Verdict | null)}
  {#if fieldVerdict}
    <!-- top-2 puts the 24px icon on the text line of the 40px field -->
    <Icon class="pointer-events-none absolute top-2 right-0 size-6 {VERDICT_TEXT[fieldVerdict]}">
      {#if fieldVerdict === 'correct'}<path d="M20 6 9 17l-5-5" />{:else}<path d="M18 6 6 18M6 6l12 12" />{/if}
    </Icon>
  {/if}
{/snippet}

<!-- the bottom padding plus the 12px margin of the line below gives the same 24px as above the result -->
<section class="mt-6 bg-surface px-4 pt-6 pb-3 text-center">
  <p class="mb-5 font-serif text-display" lang="ja">{prompt}</p>

  <form class="flex gap-2" {onsubmit}>
    <div class="flex min-w-0 flex-1 flex-col gap-2">
      {#if askReading}
        <div class="relative">
          <input
            type="text"
            class="field {readingVerdict ? 'pr-8' : ''}"
            data-verdict={readingVerdict}
            aria-invalid={readingVerdict ? readingVerdict !== 'correct' : undefined}
            bind:this={inputEl}
            bind:value={answer}
            {onkeydown}
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
            class="field {meaningVerdict ? 'pr-8' : ''}"
            data-verdict={meaningVerdict}
            aria-invalid={meaningVerdict ? meaningVerdict !== 'correct' : undefined}
            bind:this={meaningEl}
            bind:value={meaningAnswer}
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
    <button class="action w-24 flex-none" type="submit">{verdict ? 'Next' : 'Check'}</button>
  </form>

  {#if verdict}
    <div class="mt-6 rounded-control p-3 text-left {VERDICT_STYLES[verdict]}" role="status">
      <strong>
        {#if verdict === 'correct'}Correct!
        {:else if verdict === 'almost'}Almost: only the length of a vowel differs.
        {:else}Incorrect.{/if}
      </strong>
      <p class="mt-1 text-lg" lang="ja">{reading}</p>
      {#if detail !== undefined}<p class="mt-1">{detail}</p>{/if}
      {#if note}<p class="sr-only">{note}</p>{/if}
    </div>
  {/if}

  <Scoreboard {hits} {total} />
</section>
