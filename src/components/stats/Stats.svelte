<script lang="ts">
  import {
    emptyStats,
    STATS_SORT_OPTIONS,
    accuracy,
    accuracyLevel,
    attempts,
    percent,
    totalTally,
    type StatsSort,
    type StatsSortDirection,
  } from '../../data/stats'
  import { buildRows, filterRows, type StatsKind } from '../../data/stats-rows'
  import type { Stats, Tally, Word } from '../../core/types'

  let { words, stats = $bindable() }: { words: Word[]; stats: Stats } = $props()

  const KINDS: { id: StatsKind; label: string }[] = [
    { id: 'words', label: 'Words' },
    { id: 'hiragana', label: 'Hiragana' },
    { id: 'katakana', label: 'Katakana' },
  ]

  let query = $state('')
  let sort = $state<StatsSort>('misses')
  let direction = $state<StatsSortDirection>('desc')
  let showFilters = $state(false)
  let kinds = $state<Record<StatsKind, boolean>>({ words: true, hiragana: true, katakana: true })

  const rows = $derived(buildRows(stats, words))
  const visibleRows = $derived(filterRows(rows, { query, kinds, sort, direction }))
  const activeFilters = $derived(KINDS.filter((k) => !kinds[k.id]).length)

  const total = $derived(totalTally(stats))

  function reset() {
    if (confirm('Reset all statistics? This cannot be undone.')) stats = emptyStats()
  }
</script>

{#snippet summary(tally: Tally)}
  <section class="summary">
    <div class="tile">
      <span class="value">{tally.hits}</span>
      <span class="label">Correct</span>
    </div>
    <div class="tile">
      <span class="value">{tally.misses}</span>
      <span class="label">Wrong</span>
    </div>
    <div class="tile">
      <span class="value">{percent(accuracy(tally))}</span>
      <span class="label">Accuracy</span>
    </div>
    <div class="tile">
      <span class="value">{attempts(tally)}</span>
      <span class="label">Answers</span>
    </div>
  </section>
{/snippet}

<svelte:window
  onclick={(e) => {
    if (showFilters && !(e.target as Element).closest('.filters')) showFilters = false
  }}
  onkeydown={(e) => e.key === 'Escape' && (showFilters = false)}
/>

{#if !attempts(total)}
  <p class="muted">No statistics yet. Answer some words or kana in Practice and they will show up here.</p>
{:else}
  {@render summary(total)}

  <div class="toolbar">
    <button class="danger" onclick={reset}>Reset stats</button>
  </div>

  <h2>Practiced ({visibleRows.length === rows.length ? rows.length : `${visibleRows.length} of ${rows.length}`})</h2>
  <div class="toolbar">
    <input
      type="search"
      class="search"
      placeholder="Search by word, reading, romaji or meaning"
      aria-label="Search stats"
      bind:value={query}
    />
    <div class="filters">
      <button
        class="filters-btn no-hover"
        onclick={() => (showFilters = !showFilters)}
        aria-expanded={showFilters}
        aria-haspopup="true"
      >
        Filters{activeFilters ? ` (${activeFilters})` : ''}
      </button>
      {#if showFilters}
        <div class="menu" role="group" aria-label="Filters">
          {#each KINDS as kind (kind.id)}
            <label class="check">
              <input type="checkbox" bind:checked={kinds[kind.id]} />
              {kind.label}
            </label>
          {/each}
        </div>
      {/if}
    </div>
    <div class="sort">
      <select bind:value={sort} aria-label="Sort by">
        {#each STATS_SORT_OPTIONS as option (option.key)}
          <option value={option.key}>{option.label}</option>
        {/each}
      </select>
      <button
        class="icon no-hover"
        onclick={() => (direction = direction === 'asc' ? 'desc' : 'asc')}
        aria-label={direction === 'asc' ? 'Ascending' : 'Descending'}
        title={direction === 'asc' ? 'Ascending (click to reverse)' : 'Descending (click to reverse)'}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          {#if direction === 'asc'}
            <path d="M12 19V5M5 12l7-7 7 7" />
          {:else}
            <path d="M12 5v14M5 12l7 7 7-7" />
          {/if}
        </svg>
      </button>
    </div>
  </div>
  {#if visibleRows.length === 0}
    <p class="muted">Nothing matches your search and filters.</p>
  {/if}
  <ul class="words">
    {#each visibleRows as row (row.key)}
      <li>
        <span class="jp" lang="ja">{row.symbol}</span>
        <span class="reading muted" lang={row.ja ? 'ja' : undefined}>{row.reading}</span>
        <span class="leader" aria-hidden="true"></span>
        <span class="counts">
          <span>✓{row.tally.hits}</span>
          <span>✗{row.tally.misses}</span>
        </span>
        <span class="badge {accuracyLevel(row.tally)}">{percent(accuracy(row.tally))}</span>
      </li>
    {/each}
  </ul>
{/if}

<style>
  .summary {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin: 24px 0 16px;
  }
  .tile {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 10px 6px;
    background: var(--surface);
    border: 2px solid var(--text);
    color: var(--text);
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
    color: inherit;
  }
  .high {
    color: var(--on);
  }
  .low {
    color: var(--off);
  }
  .toolbar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    margin: 16px 0 8px;
  }
  .toolbar:has(.danger) {
    justify-content: center;
  }
  h2 {
    margin: 24px 0 0;
  }
  .search,
  select,
  .filters-btn {
    height: 44px;
    border: 2px solid var(--muted);
    background-color: var(--surface);
  }
  .search {
    flex: 1;
    min-width: 200px;
    padding: 0 12px;
    appearance: none;
  }
  .search:focus-visible,
  select:focus-visible,
  .filters-btn:focus-visible {
    outline: none;
    border-color: var(--accent);
  }
  select,
  .filters-btn {
    /* custom chevron so the arrow keeps its distance from the border */
    padding: 0 36px 0 10px;
    appearance: none;
    background-image:
      linear-gradient(45deg, transparent 50%, var(--text) 50%),
      linear-gradient(135deg, var(--text) 50%, transparent 50%);
    background-position:
      calc(100% - 19px) 50%,
      calc(100% - 13px) 50%;
    background-size: 6px 6px;
    background-repeat: no-repeat;
  }
  .sort {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .filters-btn {
    /* fixed width so the label ("Filters (2)") never resizes the button */
    width: 132px;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .filters {
    position: relative;
  }
  .menu {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    z-index: 10;
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 160px;
    padding: 12px;
    background: var(--surface);
    border: 2px solid var(--muted);
  }
  .check {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  button.icon {
    display: inline-flex;
    padding: 6px;
  }
  button.icon svg {
    width: 20px;
    height: 20px;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .counts {
    display: flex;
    flex-direction: column;
    line-height: 1.3;
    /* fixed width so the dotted line always ends at the same x, whatever the numbers */
    flex: none;
    width: 5ch;
    /* pulls the counts toward the accuracy column */
    margin-right: -28px;
    font-size: 0.8rem;
    font-variant-numeric: tabular-nums;
  }
  .words li {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 0;
  }
  /* row of small, widely spaced square dots that runs from the symbol to the counts on the other side */
  .leader {
    flex: 1;
    min-width: 16px;
    height: 2px;
    background: linear-gradient(90deg, var(--muted) 2px, transparent 2px) left center / 8px 2px repeat-x;
  }
  .jp {
    font-size: 1.2rem;
  }
  .reading {
    font-size: 0.9rem;
  }
  .badge {
    flex: none;
    width: 64px;
    padding: 2px 0;
    font-variant-numeric: tabular-nums;
    font-weight: 700;
    text-align: center;
  }
</style>
