<script lang="ts">
  import {
    KANA_SECTIONS,
    kanaKey,
    symbolOf,
    type Kana,
    type KanaScript,
    type KanaSection,
  } from '../../core/kana'
  import { toDisplayRomaji } from '../../core/romaji'
  import Scoreboard from './Scoreboard.svelte'
  import { kanaMode } from '../../data/practice-modes'
  import { nextRound, resetScore, startSession, submit as submitAnswer } from '../../data/practice-session'
  import { loadKanaSelection, saveKanaSelection } from '../../data/storage'
  import type { Stats } from '../../core/types'

  let { stats = $bindable() }: { stats: Stats } = $props()

  const SCRIPTS: { id: KanaScript; label: string }[] = [
    { id: 'hiragana', label: 'Hiragana' },
    { id: 'katakana', label: 'Katakana' },
  ]

  const basic = KANA_SECTIONS[0]
  // the basic set is everything before the dakuten block
  const BASIC_ROWS = basic.rows.slice(0, basic.rows.findIndex((r) => r.gap))

  /** Keys (see `kanaKey`) of the characters included in practice; defaults to the basic hiragana, then remembers the last choice */
  let selected = $state<string[]>(
    loadKanaSelection() ??
      BASIC_ROWS.flatMap((r) => cellsOf(r.cells).map((h) => kanaKey('hiragana', h))),
  )

  $effect(() => {
    saveKanaSelection($state.snapshot(selected))
  })

  const mode = $derived(kanaMode(selected, stats))

  let session = $state(startSession<Kana>())
  let answer = $state('')
  let inputEl = $state<HTMLInputElement>()

  function cellsOf(cells: (string | null)[]): string[] {
    return cells.filter((c): c is string => c !== null)
  }

  function sectionKeys(script: KanaScript, section: KanaSection): string[] {
    return section.rows.flatMap((r) => cellsOf(r.cells).map((h) => kanaKey(script, h)))
  }

  function draw() {
    session = nextRound(session, mode)
    answer = ''
  }

  // changing the selection starts a fresh round and score
  function setSelected(keys: string[]) {
    selected = keys
    session = nextRound(startSession<Kana>(), mode) // no focus change, so the page does not jump
    answer = ''
  }

  function setKeys(keys: string[], on: boolean) {
    const rest = selected.filter((k) => !keys.includes(k))
    setSelected(on ? [...rest, ...keys] : rest)
  }

  /** Clicking a group of keys selects them all, or clears them when all were already selected. */
  function toggleKeys(keys: string[]) {
    setKeys(keys, !keys.every((k) => selected.includes(k)))
  }

  function submit(event: Event) {
    event.preventDefault()
    const advancing = session.verdict !== null
    session = submitAnswer(session, answer, mode)
    if (advancing) {
      answer = ''
      queueMicrotask(() => inputEl?.focus({ preventScroll: true }))
    }
  }

  // Space works like Enter
  function onkeydown(event: KeyboardEvent) {
    if (event.key === ' ') submit(event)
  }

  draw()
</script>

{#if session.current}
  <section class="card">
    <p class="symbol" lang="ja">{session.current.symbol}</p>

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
        <strong>{session.verdict === 'correct' ? 'Correct!' : 'Incorrect.'}</strong>
        <p class="answer" lang="ja">{session.current.symbol} · {toDisplayRomaji(session.current.hiragana)}</p>
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
{:else}
  <p class="muted">Select at least one character below to practice.</p>
{/if}

<div class="tables">
  {#each SCRIPTS as script (script.id)}
    {@const scriptKeys = KANA_SECTIONS.flatMap((s) => sectionKeys(script.id, s))}
    <section class="script">
      <header>
        <h2>{script.label}</h2>
        <span class="muted">{scriptKeys.filter((k) => selected.includes(k)).length} selected</span>
      </header>

      {#each KANA_SECTIONS as section (section.id)}
        {@const keys = sectionKeys(script.id, section)}
        <div class="group">
          <div class="group-head">
            <h3>{section.title}</h3>
            <button class="link" onclick={() => setKeys(keys, true)}>All</button>
            <button class="link" onclick={() => setKeys(keys, false)}>None</button>
          </div>
          <!-- transposed: one column per consonant row, one row per vowel -->
          <div class="scroll">
            <table>
              <thead>
                <tr>
                  <th></th>
                  {#each section.rows as r, i (i)}
                    {@const colKeys = cellsOf(r.cells).map((h) => kanaKey(script.id, h))}
                    <th scope="col" class:gap={r.gap}>
                      <button
                        class="link"
                        title="Toggle the whole column"
                        onclick={() => toggleKeys(colKeys)}
                      >
                        {r.label || '·'}
                      </button>
                    </th>
                  {/each}
                </tr>
              </thead>
              <tbody>
                {#each section.columns as col, c (col)}
                  {@const lineKeys = section.rows
                    .map((r) => r.cells[c])
                    .filter((h): h is string => !!h)
                    .map((h) => kanaKey(script.id, h))}
                  <tr>
                    <th scope="row">
                      <button
                        class="link"
                        title="Toggle the whole row"
                        onclick={() => toggleKeys(lineKeys)}
                      >
                        {col}
                      </button>
                    </th>
                    {#each section.rows as r, i (i)}
                      {@const cell = r.cells[c]}
                      <td class:gap={r.gap}>
                        {#if cell}
                          {@const key = kanaKey(script.id, cell)}
                          <button
                            class="cell"
                            class:on={selected.includes(key)}
                            aria-pressed={selected.includes(key)}
                            lang="ja"
                            onclick={() => toggleKeys([key])}
                          >
                            {symbolOf(script.id, cell)}
                          </button>
                        {/if}
                      </td>
                    {/each}
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      {/each}
    </section>
  {/each}
</div>

<style>
  .card {
    margin-top: 24px;
    padding: 24px 16px;
    background: var(--surface);
    text-align: center;
  }
  .symbol {
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
  .incorrect {
    background: var(--bad-bg);
    color: var(--bad);
  }
  .tables {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-top: 24px;
  }
  .scroll {
    overflow-x: auto;
  }
  .script {
    padding: 12px;
    background: var(--surface);
  }
  .script > header {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    padding-bottom: 12px;
    border-bottom: 2px solid var(--text);
  }
  .script > header span {
    font-size: 0.85rem;
  }
  h2 {
    margin: 0;
    font-size: 1.1rem;
  }
  h3 {
    flex: 1;
    margin: 0;
    font-size: 0.9rem;
    color: var(--muted);
  }
  .group {
    margin-top: 16px;
  }
  .group-head {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 8px;
  }
  table {
    margin: 4px auto 0;
    border-collapse: separate;
    border-spacing: 4px;
  }
  th {
    font-weight: normal;
    font-size: 0.8rem;
    color: var(--muted);
  }
  td {
    padding: 0;
  }
  th.gap,
  td.gap {
    padding-left: 20px;
  }
  .cell {
    /* same size for every cell, single or double kana */
    --lift: 2px;
    width: 52px;
    height: 40px;
    padding: 0;
    white-space: nowrap;
    font-size: 1.2rem;
    color: var(--muted);
    background: transparent;
    cursor: pointer;
  }
  .cell.on {
    color: var(--on);
    background: var(--on-bg);
  }
  /* selected cells keep their light blue while lifting on hover; unselected ones hover black and white */
  .cell.on:hover {
    color: var(--on);
    background: var(--on-bg);
    --lift-shadow: var(--on);
  }
  .cell:not(.on):hover {
    color: var(--bg);
    background: var(--text);
    --lift-shadow: color-mix(in srgb, var(--text) 55%, black);
  }
  .link {
    padding: 0 2px;
    font-size: 0.8rem;
    color: var(--muted);
    background: none;
    border: none;
    text-decoration: underline;
    cursor: pointer;
  }
</style>
