<script lang="ts">
  import {
    KANA_SECTIONS,
    buildKana,
    kanaKey,
    symbolOf,
    type Kana,
    type KanaScript,
    type KanaSection,
  } from './kana'
  import { checkAnswer, toDisplayRomaji } from './romaji'
  import type { Verdict } from './types'

  const SCRIPTS: { id: KanaScript; label: string }[] = [
    { id: 'hiragana', label: 'Hiragana' },
    { id: 'katakana', label: 'Katakana' },
  ]

  const basic = KANA_SECTIONS[0]
  // the basic set is everything before the dakuten block
  const BASIC_ROWS = basic.rows.slice(0, basic.rows.findIndex((r) => r.gap))

  /** Keys (see `kanaKey`) of the characters included in practice; starts with the basic set */
  let selected = $state<string[]>(
    SCRIPTS.flatMap((s) => BASIC_ROWS.flatMap((r) => cellsOf(r.cells).map((h) => kanaKey(s.id, h)))),
  )

  const pool = $derived(buildKana(selected))

  let current = $state<Kana | null>(null)
  let answer = $state('')
  let verdict = $state<Verdict | null>(null)
  let inputEl = $state<HTMLInputElement>()
  let lastSymbol: string | null = null
  let hits = $state(0)
  let total = $state(0)

  function cellsOf(cells: (string | null)[]): string[] {
    return cells.filter((c): c is string => c !== null)
  }

  function sectionKeys(script: KanaScript, section: KanaSection): string[] {
    return section.rows.flatMap((r) => cellsOf(r.cells).map((h) => kanaKey(script, h)))
  }

  function next(focusInput = true) {
    // picks a random symbol, avoiding the previous one when there are others
    const choices = pool.length > 1 ? pool.filter((k) => k.symbol !== lastSymbol) : pool
    current = choices.length ? choices[Math.floor(Math.random() * choices.length)] : null
    lastSymbol = current?.symbol ?? null
    answer = ''
    verdict = null
    if (focusInput) queueMicrotask(() => inputEl?.focus({ preventScroll: true }))
  }

  // changing the selection starts a fresh round and score
  function setSelected(keys: string[]) {
    selected = keys
    hits = 0
    total = 0
    lastSymbol = null
    next(false) // keep focus on the clicked cell so the page does not jump
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
    border: 1px solid var(--border);
    border-radius: 12px;
  }
  .script > header {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }
  .script > header span {
    font-size: 0.85rem;
  }
  h2 {
    margin: 0;
    font-size: 1.1rem;
  }
  h3 {
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
    justify-content: center;
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
    width: 52px;
    height: 40px;
    padding: 0;
    white-space: nowrap;
    font-size: 1.2rem;
    color: var(--muted);
    background: transparent;
    border: 1px dashed var(--border);
    border-radius: 6px;
    cursor: pointer;
  }
  .cell.on {
    color: var(--on);
    background: var(--on-bg);
    border: 1px solid var(--on);
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
