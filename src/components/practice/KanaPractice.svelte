<script lang="ts">
  import {
    KANA_SECTIONS,
    columnKeys,
    defaultKanaSelection,
    kanaKey,
    lineKeys,
    scriptKeys,
    sectionKeys,
    selectKeys,
    symbolOf,
    toggleKeys,
    type Kana,
    type KanaScript,
  } from '../../core/kana'
  import { toDisplayRomaji } from '../../core/romaji'
  import PracticeCard from './PracticeCard.svelte'
  import Scoreboard from './Scoreboard.svelte'
  import { kanaMode } from '../../data/practice-modes'
  import { drawOdds, nextRound, resetScore, startSession, submit as submitAnswer } from '../../data/practice-session'
  import { loadKanaSelection, saveKanaSelection } from '../../data/storage'
  import type { Stats } from '../../core/types'

  let { stats = $bindable() }: { stats: Stats } = $props()

  const SCRIPTS: { id: KanaScript; label: string }[] = [
    { id: 'hiragana', label: 'Hiragana' },
    { id: 'katakana', label: 'Katakana' },
  ]

  /** Keys (see `kanaKey`) of the characters included in practice; defaults to the basic hiragana, then remembers the last choice */
  let selected = $state<string[]>(loadKanaSelection() ?? defaultKanaSelection())

  $effect(() => {
    saveKanaSelection($state.snapshot(selected))
  })

  const mode = $derived(kanaMode(selected, stats))

  let session = $state(startSession<Kana>())
  const odds = $derived(drawOdds(session, mode).map(({ item, chance }) => ({ label: item.symbol, chance })))
  let answer = $state('')
  let inputEl = $state<HTMLInputElement>()

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

  function select(keys: string[], on: boolean) {
    setSelected(selectKeys(selected, keys, on))
  }

  function toggle(keys: string[]) {
    setSelected(toggleKeys(selected, keys))
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
  <PracticeCard
    prompt={session.current.symbol}
    verdict={session.verdict}
    reading="{session.current.symbol} · {toDisplayRomaji(session.current.hiragana)}"
    bind:answer
    bind:inputEl
    onsubmit={submit}
    {onkeydown}
  />
  <Scoreboard
    hits={session.hits}
    total={session.total}
    streak={session.streak}
    bestStreak={session.bestStreak}
    {odds}
    onreset={() => (session = resetScore(session))}
  />
{:else}
  <p class="muted">Select at least one character below to practice.</p>
{/if}

<div class="tables">
  {#each SCRIPTS as script (script.id)}
    {@const scriptSelected = scriptKeys(script.id).filter((k) => selected.includes(k)).length}
    <section class="script">
      <header>
        <h2>{script.label}</h2>
        <span class="muted">{scriptSelected} selected</span>
      </header>

      {#each KANA_SECTIONS as section (section.id)}
        {@const keys = sectionKeys(script.id, section)}
        <div class="group">
          <div class="group-head">
            <h3>{section.title}</h3>
            <button class="link" onclick={() => select(keys, true)}>All</button>
            <button class="link" onclick={() => select(keys, false)}>None</button>
          </div>
          <!-- transposed: one column per consonant row, one row per vowel -->
          <div class="scroll">
            <table>
              <thead>
                <tr>
                  <th></th>
                  {#each section.rows as r, i (i)}
                    {@const colKeys = columnKeys(script.id, r)}
                    <th scope="col" class:gap={r.gap}>
                      <button
                        class="link"
                        title="Toggle the whole column"
                        onclick={() => toggle(colKeys)}
                      >
                        {r.label || '·'}
                      </button>
                    </th>
                  {/each}
                </tr>
              </thead>
              <tbody>
                {#each section.columns as col, c (col)}
                  {@const line = lineKeys(script.id, section, c)}
                  <tr>
                    <th scope="row">
                      <button
                        class="link"
                        title="Toggle the whole row"
                        onclick={() => toggle(line)}
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
                            onclick={() => toggle([key])}
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
  @media (prefers-color-scheme: dark) {
    .cell.on:hover {
      --lift-shadow: #0062a3;
    }
    .cell:not(.on):hover {
      color: var(--text);
      background: #2a2a2a;
      --lift-shadow: #3d3d3d;
    }
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
