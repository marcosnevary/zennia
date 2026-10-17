<script lang="ts">
  import type { Verdict } from '../../core/types'

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

<section class="card">
  <p class="prompt" lang="ja">{prompt}</p>

  <form {onsubmit}>
    <div class="fields">
      {#if askReading}
        <input
          type="text"
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
    <button class="primary" type="submit">{verdict ? 'Next' : 'Check'}</button>
  </form>

  {#if verdict}
    <div class="result {verdict}" role="status">
      <strong>
        {#if verdict === 'correct'}Correct!
        {:else if verdict === 'almost'}Almost: only the length of a vowel differs.
        {:else}Incorrect.{/if}
      </strong>
      <p class="answer" lang="ja">{reading}</p>
      {#if detail !== undefined}<p>{detail}</p>{/if}
      {#if note}<p>{note}</p>{/if}
    </div>
  {/if}
</section>

<style>
  .card {
    margin-top: 24px;
    /* the bottom padding plus the scoreboard's 12px margin gives the same 24px as above the result */
    padding: 24px 16px 12px;
    background: var(--surface);
    text-align: center;
  }
  .prompt {
    font-family: var(--font-serif);
    margin: 0 0 20px;
    font-size: 4rem;
    line-height: 1.2;
  }
  form {
    display: flex;
    gap: 8px;
  }
  .fields {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  /* fixed width, so the button does not resize when its label switches between Check and Next */
  form button {
    flex: none;
    width: 6rem;
  }
  /* the only bordered element: the answer field */
  form input {
    width: 100%;
    border: 2px solid var(--muted);
  }
  form input:focus-visible {
    outline: none;
    border-color: var(--accent);
  }
  .result {
    margin-top: 24px;
    padding: 12px;
    text-align: left;
  }
  .result p {
    margin: 4px 0 0;
  }
  .answer {
    font-size: 1.2rem;
  }
  .correct {
    background: var(--ok-bg);
    color: var(--ok);
  }
  .almost {
    background: var(--warn-bg);
    color: var(--warn);
  }
  .incorrect {
    background: var(--bad-bg);
    color: var(--bad);
  }
</style>
