<script lang="ts">
  import { checkAnswer, toDisplayRomaji } from './romaji'
  import type { Verdict, Word } from './types'

  let { words, onmanage }: { words: Word[]; onmanage: () => void } = $props()

  let current = $state<Word | null>(null)
  let answer = $state('')
  let verdict = $state<Verdict | null>(null)
  let inputEl = $state<HTMLInputElement>()
  let lastId: string | null = null
  let hits = $state(0)
  let total = $state(0)

  function next() {
    // picks a random word, avoiding the previous one when there are others
    const enabled = words.filter((w) => !w.disabled)
    const pool = enabled.length > 1 ? enabled.filter((w) => w.id !== lastId) : enabled
    current = pool.length ? pool[Math.floor(Math.random() * pool.length)] : null
    lastId = current?.id ?? null
    answer = ''
    verdict = null
    queueMicrotask(() => inputEl?.focus())
  }

  function submit(event: Event) {
    event.preventDefault()
    if (!current) return
    if (verdict) return next()
    if (!answer.trim()) return
    verdict = checkAnswer(answer, current.hiragana)
    total++
    if (verdict === 'correct') hits++
  }

  // Space works like Enter (spaces are ignored when comparing anyway)
  function onkeydown(event: KeyboardEvent) {
    if (event.key === ' ') submit(event)
  }

  next()
</script>

{#if !current}
  <p class="muted">
    {words.length ? 'All words are disabled.' : 'No words saved yet.'}
    <button onclick={onmanage}>{words.length ? 'Manage words' : 'Add words'}</button>
  </p>
{:else}
  <section class="card">
    <p class="word" lang="ja">{current.japanese}</p>

    <form onsubmit={submit}>
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
      <button class="primary" type="submit">{verdict ? 'Next' : 'Check'}</button>
    </form>

    {#if verdict}
      <div class="result {verdict}" role="status">
        <strong>
          {#if verdict === 'correct'}Correct!
          {:else if verdict === 'almost'}Almost: only the length of a vowel differs.
          {:else}Incorrect.{/if}
        </strong>
        <p class="answer" lang="ja">{current.hiragana} · {toDisplayRomaji(current.hiragana)}</p>
        <p>{current.meaning || '(no meaning saved)'}</p>
      </div>
    {/if}
  </section>

  <p class="muted score">Correct: {hits} of {total}</p>
{/if}

<style>
  .card {
    margin-top: 24px;
    padding: 24px 16px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    text-align: center;
  }
  .word {
    margin: 0 0 20px;
    font-size: 3rem;
    line-height: 1.2;
  }
  form {
    display: flex;
    gap: 8px;
  }
  .result {
    margin-top: 16px;
    padding: 12px;
    border-radius: 8px;
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
  .score {
    text-align: center;
  }
</style>
