<script lang="ts">
  import { symbolOf, type KanaScript } from './kana'
  import { emptyStats, STATS_SORT_OPTIONS, accuracy, attempts, percent, sortTallies, sumTallies, type StatsSort } from './stats'
  import type { Stats, Tally, Word } from './types'

  let { words, stats = $bindable() }: { words: Word[]; stats: Stats } = $props()

  let sort = $state<StatsSort>('misses')

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
      ).map(([key, tally]) => ({ key, symbol: symbolOf(script.id, key.slice(script.id.length + 1)), tally })),
    })).filter((script) => script.rows.length),
  )

  const wordTotal = $derived(sumTallies(stats.words))
  const overall = $derived({
    hits: wordTotal.hits + stats.drill.hits,
    misses: wordTotal.misses + stats.drill.misses,
  })
  const breakdown = $derived([
    { label: 'Words', tally: wordTotal },
    { label: 'Hiragana & Katakana practice', tally: stats.drill },
  ])

  /** good / ok / poor, always shown together with the percentage text */
  function level(tally: Tally): 'ok' | 'warn' | 'bad' {
    const a = accuracy(tally) ?? 0
    return a >= 0.8 ? 'ok' : a >= 0.5 ? 'warn' : 'bad'
  }

  function reset() {
    if (confirm('Reset all statistics? This cannot be undone.')) stats = emptyStats()
  }
</script>

{#if !attempts(overall)}
  <p class="muted">No statistics yet. Answer some words or kana in Practice and they will show up here.</p>
{:else}
  <section class="summary">
    <div class="tile">
      <span class="value">{attempts(overall)}</span>
      <span class="label">Answers</span>
    </div>
    <div class="tile ok">
      <span class="value">{overall.hits}</span>
      <span class="label">✓ Correct</span>
    </div>
    <div class="tile bad">
      <span class="value">{overall.misses}</span>
      <span class="label">✗ Wrong</span>
    </div>
    <div class="tile {level(overall)}">
      <span class="value">{percent(accuracy(overall))}</span>
      <span class="label">Accuracy</span>
    </div>
  </section>

  <ul class="breakdown">
    {#each breakdown as { label, tally } (label)}
      <li>
        <span>{label}</span>
        <span class="counts">✓{tally.hits} ✗{tally.misses} · {percent(accuracy(tally))}</span>
      </li>
    {/each}
  </ul>

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

  <h2>Kana</h2>
  <p class="muted note">
    Counts both the hiragana/katakana practice and the kana inside the words you answered; for words, a miss means that
    kana was not typed correctly.
  </p>
  {#each kanaRows as script (script.id)}
    <h3>{script.label}</h3>
    <ul class="kana">
      {#each script.rows as { key, symbol, tally } (key)}
        <li class={level(tally)} title="{tally.hits} correct, {tally.misses} wrong">
          <span class="char" lang="ja">{symbol}</span>
          <span class="pct">{percent(accuracy(tally))}</span>
          <span class="counts">✓{tally.hits} ✗{tally.misses}</span>
        </li>
      {/each}
    </ul>
  {/each}

  {#if wordRows.length}
  <h2>Words</h2>
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

<style>
  .summary {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin-top: 24px;
  }
  .tile {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 10px 6px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
  }
  .tile .value {
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
    border-color: var(--ok);
    color: var(--ok);
  }
  .warn {
    background: var(--warn-bg);
    border-color: var(--warn);
    color: var(--warn);
  }
  .bad {
    background: var(--bad-bg);
    border-color: var(--bad);
    color: var(--bad);
  }
  .tile.ok .label,
  .tile.warn .label,
  .tile.bad .label {
    color: inherit;
  }
  .breakdown {
    margin-top: 8px;
    font-size: 0.9rem;
    color: var(--muted);
  }
  .breakdown li {
    display: flex;
    justify-content: space-between;
    padding: 2px 4px;
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
    border: 1px solid var(--border);
    border-radius: 8px;
  }
  h3 {
    margin: 16px 0 8px;
    font-size: 0.95rem;
    color: var(--muted);
  }
  .note {
    margin: 0 0 8px;
    font-size: 0.85rem;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .kana {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
    gap: 8px;
  }
  .kana li {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 8px 4px;
    border: 1px solid;
    border-radius: 10px;
  }
  .char {
    font-size: 1.6rem;
    line-height: 1.2;
  }
  .pct {
    font-weight: 700;
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
    border: 1px solid var(--border);
    border-radius: 10px;
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
    border: 1px solid;
    border-radius: 999px;
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
