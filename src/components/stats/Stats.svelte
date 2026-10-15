<script lang="ts">
  import { toRomaji } from 'wanakana'
  import { symbolOf, type KanaScript } from '../../core/kana'
  import { emptyStats, STATS_SORT_OPTIONS, accuracy, attempts, percent, sortTallies, sumTallies, type StatsSort } from '../../data/stats'
  import type { Stats, Tally, Word } from '../../core/types'

  let { words, stats = $bindable() }: { words: Word[]; stats: Stats } = $props()

  let sort = $state<StatsSort>('misses')
  let showWords = $state(true)
  let showKana = $state(true)

  const byId = $derived(new Map(words.map((w) => [w.id, w])))
  // stats of deleted words stay saved but are not listed
  const wordRows = $derived(
    sortTallies(Object.entries(stats.words).filter(([id]) => byId.has(id)), sort).map(
      ([id, tally]) => ({ word: byId.get(id)!, tally }),
    ),
  )
  const SCRIPTS: { id: KanaScript; label: string }[] = [
    { id: 'hiragana', label: 'Hiragana' },
    { id: 'katakana', label: 'Katakana' },
  ]
  // kana keys look like "katakana:か" (see kanaKey)
  const kanaRows = $derived(
    SCRIPTS.map((script) => ({
      ...script,
      rows: sortTallies(
        Object.entries(stats.kana).filter(([key]) => key.startsWith(`${script.id}:`)),
        sort,
      ).map(([key, tally]) => {
        const hiragana = key.slice(script.id.length + 1)
        return { key, symbol: symbolOf(script.id, hiragana), romaji: toRomaji(hiragana), tally }
      }),
    })).filter((script) => script.rows.length),
  )

  const wordTotal = $derived(sumTallies(stats.words))
  const kanaTotal = $derived(sumTallies(stats.kana))

  /** good / ok / poor, always shown together with the percentage text */
  function level(tally: Tally): 'ok' | 'warn' | 'bad' {
    const a = accuracy(tally) ?? 0
    return a >= 0.8 ? 'ok' : a >= 0.5 ? 'warn' : 'bad'
  }

  function reset() {
    if (confirm('Reset all statistics? This cannot be undone.')) stats = emptyStats()
  }
</script>

{#snippet summary(tally: Tally)}
  <section class="summary">
    <div class="tile ok">
      <span class="value">{tally.hits}</span>
      <span class="label">Correct</span>
    </div>
    <div class="tile bad">
      <span class="value">{tally.misses}</span>
      <span class="label">Wrong</span>
    </div>
    <div class="tile {level(tally)}">
      <span class="value">{percent(accuracy(tally))}</span>
      <span class="label">Accuracy</span>
    </div>
    <div class="tile">
      <span class="value">{attempts(tally)}</span>
      <span class="label">Answers</span>
    </div>
  </section>
{/snippet}

{#if !attempts(wordTotal) && !attempts(kanaTotal)}
  <p class="muted">No statistics yet. Answer some words or kana in Practice and they will show up here.</p>
{:else}
  <div class="toolbar">
    <label>
      Sort by
      <select bind:value={sort}>
        {#each STATS_SORT_OPTIONS as option (option.key)}
          <option value={option.key}>{option.label}</option>
        {/each}
      </select>
    </label>
    <button class="danger" onclick={reset}>Reset stats</button>
  </div>

  {#if attempts(wordTotal)}
    <div class="section-head">
      <h2>
        <button class="toggle" onclick={() => (showWords = !showWords)} aria-expanded={showWords}>
          <span aria-hidden="true">{showWords ? '▾' : '▸'}</span> Words
        </button>
      </h2>
    </div>
    {#if showWords}
    {@render summary(wordTotal)}
    <ul class="words">
      {#each wordRows as { word, tally } (word.id)}
        <li>
          <span class="jp" lang="ja">{word.japanese}</span>
          <span class="reading muted" lang="ja">{word.hiragana}</span>
          <span class="counts">✓{tally.hits} ✗{tally.misses}</span>
          <span class="badge {level(tally)}">{percent(accuracy(tally))}</span>
        </li>
      {/each}
    </ul>
    {/if}
  {/if}

  {#if attempts(kanaTotal)}
    <div class="section-head">
      <h2>
        <button class="toggle" onclick={() => (showKana = !showKana)} aria-expanded={showKana}>
          <span aria-hidden="true">{showKana ? '▾' : '▸'}</span> Kana
        </button>
      </h2>
    </div>
    {#if showKana}
    {@render summary(kanaTotal)}
    {#each kanaRows as script (script.id)}
      <h3>{script.label}</h3>
      <ul class="words">
        {#each script.rows as { key, symbol, romaji, tally } (key)}
          <li>
            <span class="jp" lang="ja">{symbol}</span>
            <span class="reading muted">{romaji}</span>
            <span class="counts">✓{tally.hits} ✗{tally.misses}</span>
            <span class="badge {level(tally)}">{percent(accuracy(tally))}</span>
          </li>
        {/each}
      </ul>
    {/each}
    {/if}
  {/if}
{/if}

<style>
  .summary {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin: 8px 0 16px;
  }
  .tile {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 10px 6px;
    background: var(--surface);
  }
  .tile .value {
    font-family: var(--font-serif);
    font-size: 1.8rem;
    font-weight: 700;
    line-height: 1.1;
    font-variant-numeric: tabular-nums;
  }
  .tile .label {
    font-size: 0.8rem;
    color: var(--muted);
  }
  .ok {
    background: var(--ok-bg);
    color: var(--ok);
  }
  .warn {
    background: var(--warn-bg);
    color: var(--warn);
  }
  .bad {
    background: var(--bad-bg);
    color: var(--bad);
  }
  .tile.ok .label,
  .tile.warn .label,
  .tile.bad .label {
    color: inherit;
  }
  .section-head {
    margin-top: 24px;
  }
  .section-head h2 {
    margin: 0;
  }
  .toggle {
    display: block;
    width: 100%;
    padding: 4px 0;
    font: inherit;
    font-weight: inherit;
    text-align: left;
    background: none;
    border: none;
    cursor: pointer;
  }
  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-top: 16px;
  }
  select {
    padding: 8px 10px;
    background: var(--surface);
  }
  h3 {
    margin: 16px 0 8px;
    font-size: 0.95rem;
    color: var(--muted);
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .counts {
    font-size: 0.8rem;
    font-variant-numeric: tabular-nums;
  }
  .words li {
    display: grid;
    grid-template-columns: 1fr auto auto auto;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    margin-bottom: 6px;
    background: var(--surface);
  }
  .jp {
    font-size: 1.2rem;
  }
  .reading {
    font-size: 0.9rem;
  }
  .badge {
    min-width: 52px;
    padding: 2px 8px;
    background: color-mix(in srgb, currentColor 15%, transparent);
    font-weight: 700;
    text-align: center;
  }
  @media (max-width: 480px) {
    .words li {
      grid-template-columns: 1fr auto;
    }
    .reading {
      grid-column: 1;
    }
  }
</style>
