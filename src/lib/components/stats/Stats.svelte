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
  import { downloadText, exportStatsJSON, importStatsJSON, statsExportFilename } from '../../data/io'
  import { buildRows, filterRows, type StatsKind } from '../../data/stats-rows'
  import type { Stats, Tally, Word } from '../../core/types'
  import StatTile from '../StatTile.svelte'

  const LEVEL_STYLES = { high: 'text-on', low: 'text-off', '': '' }

  let { words, stats = $bindable() }: { words: Word[]; stats: Stats } = $props()

  const KINDS: { id: StatsKind; label: string }[] = [
    { id: 'words', label: 'Words' },
    { id: 'hiragana', label: 'Hiragana' },
    { id: 'katakana', label: 'Katakana' },
  ]

  let query = $state('')
  let sort = $state<StatsSort>('accuracy')
  let direction = $state<StatsSortDirection>('desc')
  let showFilters = $state(false)
  let kinds = $state<Record<StatsKind, boolean>>({ words: true, hiragana: true, katakana: true })

  const rows = $derived(buildRows(stats, words))
  const visibleRows = $derived(filterRows(rows, { query, kinds, sort, direction }))
  const activeFilters = $derived(KINDS.filter((k) => !kinds[k.id]).length)

  const total = $derived(totalTally(stats))

  let message = $state('')
  let error = $state('')

  function exportStats() {
    downloadText(statsExportFilename(), exportStatsJSON(stats))
    message = 'Statistics exported.'
    error = ''
  }

  async function importStats(event: Event) {
    const input = event.currentTarget as HTMLInputElement
    const file = input.files?.[0]
    input.value = ''
    if (!file) return
    message = ''
    error = ''
    try {
      const incoming = importStatsJSON(await file.text())
      if (attempts(total) && !confirm('Importing replaces your current statistics. Continue?')) return
      stats = incoming
      message = 'Statistics imported.'
    } catch (e) {
      error = e instanceof Error ? e.message : 'Could not import the file.'
    }
  }

  function reset() {
    if (confirm('Reset all statistics? This cannot be undone.')) stats = emptyStats()
  }
</script>

{#snippet summary(tally: Tally)}
  <section class="mt-6 mb-4 grid grid-cols-4 gap-2">
    <StatTile value={tally.hits} label="Correct" />
    <StatTile value={tally.misses} label="Wrong" />
    <StatTile value={percent(accuracy(tally))} label="Accuracy" />
    <StatTile value={attempts(tally)} label="Answers" />
  </section>
{/snippet}

<svelte:window
  onclick={(e) => {
    if (showFilters && !(e.target as Element).closest('.filters')) showFilters = false
  }}
  onkeydown={(e) => e.key === 'Escape' && (showFilters = false)}
/>

{#snippet transfer()}
  <div class="mt-4 mb-2 flex flex-wrap items-center justify-center gap-2">
    <button onclick={exportStats} disabled={!attempts(total)}>Export stats</button>
    <label class="file">
      Import stats
      <input type="file" accept="application/json,.json" onchange={importStats} hidden />
    </label>
    {#if attempts(total)}<button class="danger" onclick={reset}>Reset stats</button>{/if}
  </div>
  {#if error}<p class="my-4 text-bad" role="alert">{error}</p>{/if}
  {#if message}<p class="my-4 text-muted" role="status">{message}</p>{/if}
{/snippet}

{#if !attempts(total)}
  <p class="my-4 text-muted">No statistics yet. Answer some words or kana in Practice and they will show up here.</p>
  {@render transfer()}
{:else}
  {@render summary(total)}

  {@render transfer()}

  <h2 class="mb-0">Practiced ({visibleRows.length === rows.length ? rows.length : `${visibleRows.length} of ${rows.length}`})</h2>
  <div class="mt-4 mb-2 flex flex-wrap items-center gap-2">
    <input
      type="search"
      class="field h-11 min-w-50 flex-1 appearance-none bg-surface px-3"
      placeholder="Search by word, reading, romaji or meaning"
      aria-label="Search stats"
      bind:value={query}
    />
    <div class="relative">
      <button
        class="no-hover field chevron h-11 w-33 bg-surface text-left"
        onclick={() => (showFilters = !showFilters)}
        aria-expanded={showFilters}
        aria-haspopup="true"
      >
        Filters{activeFilters ? ` (${activeFilters})` : ''}
      </button>
      {#if showFilters}
        <div class="absolute top-[calc(100%+4px)] left-0 z-10 flex min-w-40 flex-col gap-2.5 border-2 border-muted bg-surface p-3" role="group" aria-label="Filters">
          {#each KINDS as kind (kind.id)}
            <label class="flex items-center gap-1.5">
              <input type="checkbox" bind:checked={kinds[kind.id]} />
              {kind.label}
            </label>
          {/each}
        </div>
      {/if}
    </div>
    <div class="flex items-center gap-2">
      <select class="field chevron h-11 bg-surface" bind:value={sort} aria-label="Sort by">
        {#each STATS_SORT_OPTIONS as option (option.key)}
          <option value={option.key}>{option.label}</option>
        {/each}
      </select>
      <button
        class="no-hover inline-flex p-1.5"
        onclick={() => (direction = direction === 'asc' ? 'desc' : 'asc')}
        aria-label={direction === 'asc' ? 'Ascending' : 'Descending'}
        title={direction === 'asc' ? 'Ascending (click to reverse)' : 'Descending (click to reverse)'}
      >
        <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
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
    <p class="my-4 text-muted">Nothing matches your search and filters.</p>
  {/if}
  <ul>
    {#each visibleRows as row (row.key)}
      <li class="flex items-center gap-3 py-2.5">
        <span class="text-[1.2rem]" lang="ja">{row.symbol}</span>
        <span class="text-[0.9rem] text-muted" lang={row.ja ? 'ja' : undefined}>{row.reading}</span>
        <!-- runs from the symbol to the counts on the other side -->
        <span class="dot-leader min-w-4 flex-1" aria-hidden="true"></span>
        <!-- fixed width so the dotted line always ends at the same x, whatever the numbers; the negative margin pulls the counts toward the accuracy column -->
        <span class="-mr-7 flex w-[5ch] flex-none flex-col text-[0.8rem] leading-[1.3] tabular-nums">
          <span>✓{row.tally.hits}</span>
          <span>✗{row.tally.misses}</span>
        </span>
        <span class="w-16 flex-none py-0.5 text-center font-bold tabular-nums {LEVEL_STYLES[accuracyLevel(row.tally)]}">{percent(accuracy(row.tally))}</span>
      </li>
    {/each}
  </ul>
{/if}
