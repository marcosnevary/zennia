<script lang="ts">
  import { checkAnswer, toDisplayRomaji } from '../../core/romaji'
  import Scoreboard from './Scoreboard.svelte'
  import { drawWeight, pickWeighted, recordAnswer } from '../../data/stats'
  import type { Stats, Verdict, Word } from '../../core/types'

  let { words, stats = $bindable(), onmanage }: { words: Word[]; stats: Stats; onmanage: () => void } = $props()

  let current = $state<Word | null>(null)
  let answer = $state('')
  let verdict = $state<Verdict | null>(null)
  let inputEl = $state<HTMLInputElement>()
  let lastId: string | null = null
  let hits = $state(0)
  let total = $state(0)
  let streak = $state(0)
  let bestStreak = $state(0)

  function resetSession() {
    hits = 0
    total = 0
    streak = 0
    bestStreak = 0
  }

  function next() {
    // picks a word weighted by past mistakes (see drawWeight), avoiding the previous one when there are others
    const enabled = words.filter((w) => !w.disabled)
    const pool = enabled.length > 1 ? enabled.filter((w) => w.id !== lastId) : enabled
    current = pickWeighted(pool, (w) => drawWeight(stats.words[w.id]))
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
    if (verdict === 'correct') {
      hits++
      streak++
      bestStreak = Math.max(bestStreak, streak)
    } else {
      streak = 0
    }
    recordAnswer(stats, current, verdict)
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
  <Scoreboard {hits} {total} {streak} {bestStreak} onreset={resetSession} />
{/if}

<style>
  .card {
    margin-top: 24px;
    padding: 24px 16px;
    background: var(--surface);
    text-align: center;
  }
  .word {
    margin: 0 0 20px;
    font-size: 4rem;
    line-height: 1.2;
  }
  form {
    display: flex;
    gap: 8px;
  }
  /* the only bordered element: the answer field */
  form input {
    border: 2px solid var(--text);
  }
  form input:focus-visible {
    outline: none;
    border-color: var(--accent);
  }
  .result {
    margin-top: 16px;
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
