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
  import { getApp } from '../../state.svelte'

  const LINK = 'bg-transparent px-0.5 py-0 text-[0.8rem] text-muted underline'

  // same size for every cell, single or double kana
  function cellClass(on: boolean): string {
    const base = 'h-10 w-13 p-0 text-[1.2rem] whitespace-nowrap'
    return on
      ? `${base} bg-on-bg text-on`
      : `${base} bg-transparent text-muted`
  }

  const app = getApp()

  const SCRIPTS: { id: KanaScript; label: string }[] = [
    { id: 'hiragana', label: 'Hiragana' },
    { id: 'katakana', label: 'Katakana' },
  ]

  /** Keys (see `kanaKey`) of the characters included in practice; defaults to the basic hiragana, then remembers the last choice */
  let selected = $state<string[]>(app.settings.kanaSelection ?? defaultKanaSelection())

  const mode = $derived(kanaMode(selected, app.stats, app.recorder))

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
    app.setKanaSelection(keys)
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
  <p class="my-4 text-muted">Select at least one character below to practice.</p>
{/if}

<div class="mt-6 flex flex-col gap-4">
  {#each SCRIPTS as script (script.id)}
    {@const scriptSelected = scriptKeys(script.id).filter((k) => selected.includes(k)).length}
    <section class="bg-surface p-3">
      <header class="flex flex-col items-start gap-0.5 border-b-2 border-ink pb-3">
        <h2 class="m-0">{script.label}</h2>
        <span class="text-[0.85rem] text-muted">{scriptSelected} selected</span>
      </header>

      {#each KANA_SECTIONS as section (section.id)}
        {@const keys = sectionKeys(script.id, section)}
        <div class="mt-4">
          <div class="flex items-center justify-start gap-2">
            <h3 class="flex-1 text-[0.9rem] font-bold text-muted">{section.title}</h3>
            <button class={LINK} onclick={() => select(keys, true)}>All</button>
            <button class={LINK} onclick={() => select(keys, false)}>None</button>
          </div>
          <!-- transposed: one column per consonant row, one row per vowel -->
          <div class="overflow-x-auto">
            <table class="mx-auto mt-1 border-separate border-spacing-1">
              <thead>
                <tr>
                  <th></th>
                  {#each section.rows as r, i (i)}
                    {@const colKeys = columnKeys(script.id, r)}
                    <th scope="col" class="text-[0.8rem] font-normal text-muted" class:pl-5={r.gap}>
                      <button
                        class={LINK}
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
                    <th scope="row" class="text-[0.8rem] font-normal text-muted">
                      <button
                        class={LINK}
                        title="Toggle the whole row"
                        onclick={() => toggle(line)}
                      >
                        {col}
                      </button>
                    </th>
                    {#each section.rows as r, i (i)}
                      {@const cell = r.cells[c]}
                      <td class:pl-5={r.gap}>
                        {#if cell}
                          {@const key = kanaKey(script.id, cell)}
                          <button
                            class={cellClass(selected.includes(key))}
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
