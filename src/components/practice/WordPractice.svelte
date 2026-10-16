<script lang="ts">
  import { toDisplayRomaji } from '../../core/romaji'
  import Scoreboard from './Scoreboard.svelte'
  import { wordsMode } from '../../data/practice-modes'
  import { nextRound, resetScore, startSession, submit as submitAnswer } from '../../data/practice-session'
  import type { Stats, Word } from '../../core/types'

  let { words, stats = $bindable(), onmanage }: { words: Word[]; stats: Stats; onmanage: () => void } = $props()

  const mode = $derived(wordsMode(words, stats))

  let session = $state(startSession<Word>())
  let answer = $state('')
  let inputEl = $state<HTMLInputElement>()

  function draw() {
    session = nextRound(session, mode)
  }

  function submit(event: Event) {
    event.preventDefault()
    const advancing = session.verdict !== null
    session = submitAnswer(session, answer, mode)
    if (advancing) {
      answer = ''
      queueMicrotask(() => inputEl?.focus())
    }
  }

  // Space works like Enter (spaces are ignored when comparing anyway)
  function onkeydown(event: KeyboardEvent) {
    if (event.key === ' ') submit(event)
  }

  draw()
</script>

{#if !session.current}
  <p class="muted">
    {words.length ? 'All words are disabled.' : 'No words saved yet.'}
    <button onclick={onmanage}>{words.length ? 'Manage words' : 'Add words'}</button>
  </p>
{:else}
  <section class="card">
    <p class="word" lang="ja">{session.current.japanese}</p>

    <form onsubmit={submit}>
      <input
        type="text"
        bind:this={inputEl}
        bind:value={answer}
        {onkeydown}
        readonly={session.verdict !== null}
        placeholder="Type in romaji"
        autocomplete="off"
        autocapitalize="off"
        autocorrect="off"
        spellcheck="false"
      />
      <button class="primary" type="submit">{session.verdict ? 'Next' : 'Check'}</button>
    </form>

    {#if session.verdict}
      <div class="result {session.verdict}" role="status">
        <strong>
          {#if session.verdict === 'correct'}Correct!
          {:else if session.verdict === 'almost'}Almost: only the length of a vowel differs.
          {:else}Incorrect.{/if}
        </strong>
        <p class="answer" lang="ja">{session.current.hiragana} · {toDisplayRomaji(session.current.hiragana)}</p>
        <p>{session.current.meaning || '(no meaning saved)'}</p>
      </div>
    {/if}
  </section>
  <Scoreboard
    hits={session.hits}
    total={session.total}
    streak={session.streak}
    bestStreak={session.bestStreak}
    onreset={() => (session = resetScore(session))}
  />
{/if}

<style>
  .card {
    margin-top: 24px;
    padding: 24px 16px;
    background: var(--surface);
    text-align: center;
  }
  .word {
    font-family: var(--font-serif);
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
    border: 2px solid var(--muted);
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
