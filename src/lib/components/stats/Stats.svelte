<script lang="ts">
  import ArrowDown from '@lucide/svelte/icons/arrow-down'
  import ArrowUp from '@lucide/svelte/icons/arrow-up'
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
  import { buildRows, filterRows } from '../../data/stats-rows'
  import { cleanTags, findTag } from '../../data/words'
  import type { Tally } from '../../core/types'
  import { getApp } from '../../state.svelte'
  import StatTile from '../StatTile.svelte'
  import TagChip from '../TagChip.svelte'
  import TagSearch from '../TagSearch.svelte'

  const LEVEL_STYLES = { high: 'text-on', low: 'text-off', '': '' }

  const app = getApp()
  const words = $derived(app.words)
  const stats = $derived(app.stats)

  let query = $state('')
  const sort = $derived(app.settings.statsSort)
  const direction = $derived(app.settings.statsSortDirection)
  let listEl = $state<HTMLUListElement>()

  function setSort(next: StatsSort, nextDirection: StatsSortDirection) {
    app.setStatsSort(next, nextDirection)
    listEl?.scrollTo({ top: 0 })
  }

  const rows = $derived(buildRows(stats, words))
  const tags = $derived(cleanTags(rows.flatMap((r) => r.tags)))
  let activeTags = $state<string[]>([])
  const visibleRows = $derived(filterRows(rows, { query, tags: activeTags, sort, direction }))

  function filterByTag(tag: string) {
    if (findTag(activeTags, tag)) return
    activeTags = [...activeTags, tag]
    listEl?.scrollTo({ top: 0 })
  }

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
  <p class="mt-6 mb-4 text-muted">
    No statistics yet. Answer some words or kana in Practice and they will show up here.
  </p>
{:else}
  {@render summary(total)}

  <h2 class="mb-0">
    Practiced ({visibleRows.length === rows.length ? rows.length : `${visibleRows.length} of ${rows.length}`})
  </h2>
  <div class="mt-4 mb-2 flex flex-wrap items-center gap-2">
    <TagSearch
      id="stats-search"
      placeholder="Search by word, reading, meaning or #tag"
      label="Search stats"
      bind:query
      bind:tags={activeTags}
      suggestions={tags}
      onchange={() => listEl?.scrollTo({ top: 0 })}
    />
    <div class="flex items-center gap-2">
      <select
        class="field chevron"
        value={sort}
        onchange={(e) => setSort(e.currentTarget.value as StatsSort, direction)}
        aria-label="Sort by"
      >
        {#each STATS_SORT_OPTIONS as option (option.key)}
          <option value={option.key}>{option.label}</option>
        {/each}
      </select>
      <button
        class="icon"
        onclick={() => setSort(sort, direction === 'asc' ? 'desc' : 'asc')}
        aria-label={direction === 'asc' ? 'Ascending' : 'Descending'}
        title={direction === 'asc' ? 'Ascending (click to reverse)' : 'Descending (click to reverse)'}
      >
        {#if direction === 'asc'}<ArrowUp />{:else}<ArrowDown />{/if}
      </button>
    </div>
  </div>
  {#if visibleRows.length === 0}
    <p class="my-4 text-muted">Nothing matches your search.</p>
  {:else}
    <ul class="scroll-list-12" bind:this={listEl}>
      {#each visibleRows as row (row.key)}
        <li
          class="flex min-h-12 items-center gap-3 rounded-control px-3 py-1 transition-colors hover:bg-tint motion-reduce:transition-none"
        >
          <span class="text-lg" lang="ja">{row.symbol}</span>
          <span class="text-sm text-muted" lang={row.ja ? 'ja' : undefined}>{row.reading}</span>
          {#if row.meaning}
            <span class="min-w-0 truncate">{row.meaning}</span>
          {/if}
          {#if row.tags.length > 0}
            <span class="flex gap-1"
              >{#each row.tags as tag (tag)}<TagChip {tag} onclick={() => filterByTag(tag)} />{/each}</span
            >
          {/if}
          <span class="min-w-4 flex-1" aria-hidden="true"></span>
          <!-- both counts have a fixed width, the correct one right-aligned and the wrong one left-aligned, so they meet at the same
               point in every row with only the gap between them, whatever the numbers; the negative margin pulls them toward the accuracy column -->
          <span class="-mr-7 flex flex-none gap-2 text-sm tabular-nums *:flex *:w-[6ch] *:gap-1">
            <span class="justify-end"><span>○</span>{row.tally.hits}</span>
            <span><span>✗</span>{row.tally.misses}</span>
          </span>
          <span class="w-16 flex-none text-center font-bold tabular-nums {LEVEL_STYLES[accuracyLevel(row.tally)]}"
            >{percent(accuracy(row.tally))}</span
          >
        </li>
      {/each}
    </ul>
  {/if}
{/if}
