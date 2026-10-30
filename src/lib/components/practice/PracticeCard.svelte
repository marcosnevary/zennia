<script lang="ts">
  import type { Verdict } from '../../core/types'

  const VERDICT_STYLES: Record<Verdict, string> = {
    correct: 'bg-ok-bg text-ok',
    almost: 'bg-warn-bg text-warn',
    incorrect: 'bg-bad-bg text-bad',
  }

  let {
    prompt,
    verdict,
    reading,
    detail,
    note,
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
    /** Optional line with the outcome of each part of the answer, shown with the verdict */
    note?: string
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

<!-- the bottom padding plus the scoreboard's 12px margin gives the same 24px as above the result -->
<section class="mt-6 bg-surface px-4 pt-6 pb-3 text-center">
  <p class="mb-5 font-serif text-[4rem] leading-[1.2]" lang="ja">{prompt}</p>

  <form class="flex gap-2" {onsubmit}>
    <div class="flex min-w-0 flex-1 flex-col gap-2">
      {#if askReading}
        <input
          type="text"
          class="field"
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
      {/if}
      {#if askMeaning}
        <input
          type="text"
          class="field"
          bind:this={meaningEl}
          bind:value={meaningAnswer}
          readonly={verdict !== null}
          placeholder="Type the meaning"
          autocomplete="off"
          autocapitalize="off"
          autocorrect="off"
          spellcheck="false"
        />
      {/if}
    </div>
    <!-- fixed width, so the button does not resize when its label switches between Check and Next -->
    <button class="primary w-24 flex-none" type="submit">{verdict ? 'Next' : 'Check'}</button>
  </form>

  {#if verdict}
    <div class="mt-6 p-3 text-left {VERDICT_STYLES[verdict]}" role="status">
      <strong>
        {#if verdict === 'correct'}Correct!
        {:else if verdict === 'almost'}Almost: only the length of a vowel differs.
        {:else}Incorrect.{/if}
      </strong>
      <p class="mt-1 text-[1.2rem]" lang="ja">{reading}</p>
      {#if detail !== undefined}<p class="mt-1">{detail}</p>{/if}
      {#if note}<p class="mt-1">{note}</p>{/if}
    </div>
  {/if}
</section>
