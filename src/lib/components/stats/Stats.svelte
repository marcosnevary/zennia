<script lang="ts">
  import {
    STATS_SORT_OPTIONS,
    accuracy,
    accuracyLevel,
    attempts,
    percent,
    totalTally,
    type StatsSort,
    type StatsSortDirection,
  } from '../../data/stats'
  import { paginate } from '../../data/pagination'
  import { buildRows, filterRows } from '../../data/stats-rows'
  import type { Tally } from '../../core/types'
  import { getApp } from '../../state.svelte'
  import Icon from '../Icon.svelte'
  import Pagination from '../Pagination.svelte'
  import StatTile from '../StatTile.svelte'

  const LEVEL_STYLES = { high: 'text-on', low: 'text-off', '': '' }

  const app = getApp()
  const words = $derived(app.words)
  const stats = $derived(app.stats)

  let query = $state('')
  let sort = $state<StatsSort>('accuracy')
  let direction = $state<StatsSortDirection>('desc')

  const rows = $derived(buildRows(stats, words))
  const visibleRows = $derived(filterRows(rows, { query, sort, direction }))
  let pageNumber = $state(1)
  const current = $derived(paginate(visibleRows, pageNumber))

  const total = $derived(totalTally(stats))
</script>

{#snippet summary(tally: Tally)}
  <section class="mt-6 mb-4 grid grid-cols-4 gap-2">
    <StatTile value={tally.hits} label="Correct" />
    <StatTile value={tally.misses} label="Wrong" />
    <StatTile value={percent(accuracy(tally))} label="Accuracy" />
    <StatTile value={attempts(tally)} label="Answers" />
  </section>
{/snippet}

{#if !attempts(total)}
  <p class="mt-6 mb-4 text-muted">No statistics yet. Answer some words or kana in Practice and they will show up here.</p>
{:else}
  {@render summary(total)}

  <h2 class="mb-0">Practiced ({visibleRows.length === rows.length ? rows.length : `${visibleRows.length} of ${rows.length}`})</h2>
  <div class="mt-4 mb-2 flex flex-wrap items-center gap-2">
    <input
      type="search"
      class="field h-11 min-w-50 flex-1 appearance-none bg-surface"
      placeholder="Search by word, reading, romaji or meaning"
      aria-label="Search stats"
      bind:value={query}
      oninput={() => (pageNumber = 1)}
    />
    <div class="flex items-center gap-2">
      <select class="field chevron h-11" bind:value={sort} onchange={() => (pageNumber = 1)} aria-label="Sort by">
        {#each STATS_SORT_OPTIONS as option (option.key)}
          <option value={option.key}>{option.label}</option>
        {/each}
      </select>
      <button
        class="inline-flex p-1.5"
        onclick={() => {
          direction = direction === 'asc' ? 'desc' : 'asc'
          pageNumber = 1
        }}
        aria-label={direction === 'asc' ? 'Ascending' : 'Descending'}
        title={direction === 'asc' ? 'Ascending (click to reverse)' : 'Descending (click to reverse)'}
      >
        <Icon>
          {#if direction === 'asc'}
            <path d="M12 19V5M5 12l7-7 7 7" />
          {:else}
            <path d="M12 5v14M5 12l7 7 7-7" />
          {/if}
        </Icon>
      </button>
    </div>
  </div>
  {#if visibleRows.length === 0}
    <p class="my-4 text-muted">Nothing matches your search.</p>
  {/if}
  <ul>
    {#each current.items as row (row.key)}
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
  <Pagination page={current.page} pageCount={current.pageCount} label="Stats pages" onchange={(n) => (pageNumber = n)} />
{/if}
