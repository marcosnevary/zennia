<script lang="ts">
  import { buildKana, type Kana, type KanaGroup, type KanaScript } from './kana'
  import { checkAnswer, toDisplayRomaji } from './romaji'
  import type { Verdict } from './types'

  let scripts = $state<KanaScript[]>(['hiragana', 'katakana'])
  let groups = $state<KanaGroup[]>(['basic'])

  const SCRIPTS: { id: KanaScript; label: string }[] = [
    { id: 'hiragana', label: 'Hiragana' },
    { id: 'katakana', label: 'Katakana' },
  ]
  const GROUPS: { id: KanaGroup; label: string }[] = [
    { id: 'basic', label: 'Basic' },
    { id: 'dakuten', label: 'Dakuten (ga, za, pa…)' },
    { id: 'combo', label: 'Combinations (kya, sha…)' },
  ]

  const pool = $derived(buildKana(scripts, groups))

  let current = $state<Kana | null>(null)
  let answer = $state('')
  let verdict = $state<Verdict | null>(null)
  let inputEl = $state<HTMLInputElement>()
  let lastSymbol: string | null = null
  let hits = $state(0)
  let total = $state(0)

  function next() {
    // picks a random symbol, avoiding the previous one when there are others
    const choices = pool.length > 1 ? pool.filter((k) => k.symbol !== lastSymbol) : pool
    current = choices.length ? choices[Math.floor(Math.random() * choices.length)] : null
    lastSymbol = current?.symbol ?? null
    answer = ''
    verdict = null
    queueMicrotask(() => inputEl?.focus())
  }

  function toggle<T>(list: T[], item: T): T[] {
    return list.includes(item) ? list.filter((x) => x !== item) : [...list, item]
  }

  // changing the selection starts a fresh round and score
  function change(update: () => void) {
    update()
    hits = 0
    total = 0
    lastSymbol = null
    next()
  }

  function submit(event: Event) {
    event.preventDefault()
    if (!current) return
    if (verdict) return next()
    if (!answer.trim()) return
    // single sounds have no vowel-length ambiguity: anything but a match is wrong
    verdict = checkAnswer(answer, current.hiragana) === 'correct' ? 'correct' : 'incorrect'
    total++
    if (verdict === 'correct') hits++
  }

  // Space works like Enter
  function onkeydown(event: KeyboardEvent) {
    if (event.key === ' ') submit(event)
  }

  next()
</script>

<div class="options">
  <fieldset>
    <legend>Script</legend>
    {#each SCRIPTS as s (s.id)}
      <label>
        <input
          type="checkbox"
          checked={scripts.includes(s.id)}
          disabled={scripts.length === 1 && scripts.includes(s.id)}
          onchange={() => change(() => (scripts = toggle(scripts, s.id)))}
        />
        {s.label}
      </label>
    {/each}
  </fieldset>
  <fieldset>
    <legend>Characters</legend>
    {#each GROUPS as g (g.id)}
      <label>
        <input
          type="checkbox"
          checked={groups.includes(g.id)}
          disabled={groups.length === 1 && groups.includes(g.id)}
          onchange={() => change(() => (groups = toggle(groups, g.id)))}
        />
        {g.label}
      </label>
    {/each}
  </fieldset>
</div>

{#if current}
  <section class="card">
    <p class="symbol" lang="ja">{current.symbol}</p>

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
        <strong>{verdict === 'correct' ? 'Correct!' : 'Incorrect.'}</strong>
        <p class="answer" lang="ja">{current.symbol} · {toDisplayRomaji(current.hiragana)}</p>
      </div>
    {/if}
  </section>

  <p class="muted score">Correct: {hits} of {total}</p>
{/if}

<style>
  .options {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 16px;
  }
  fieldset {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 16px;
    margin: 0;
    padding: 6px 12px 8px;
    border: 1px solid var(--border);
    border-radius: 8px;
  }
  legend {
    padding: 0 4px;
    font-size: 0.85rem;
    color: var(--muted);
  }
  label {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .card {
    margin-top: 24px;
    padding: 24px 16px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    text-align: center;
  }
  .symbol {
    margin: 0 0 20px;
    font-size: 4.5rem;
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
  .incorrect {
    background: var(--bad-bg);
    color: var(--bad);
  }
  .score {
    text-align: center;
  }
</style>
