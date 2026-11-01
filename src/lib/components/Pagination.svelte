<script lang="ts">
  import ChevronLeft from '@lucide/svelte/icons/chevron-left'
  import ChevronRight from '@lucide/svelte/icons/chevron-right'
  import ChevronsLeft from '@lucide/svelte/icons/chevrons-left'
  import ChevronsRight from '@lucide/svelte/icons/chevrons-right'
  import { pageEntries } from '../data/pagination'

  let { page, pageCount, label, onchange }: { page: number; pageCount: number; label: string; onchange: (page: number) => void } = $props()

  // one size for every control, so the row does not grow or shrink between pages
  const CELL = 'icon inline-flex size-10 items-center justify-center p-0'
  const entries = $derived(pageEntries(page, pageCount))
</script>

{#if pageCount > 1}
  <nav class="mt-3 flex flex-wrap items-center justify-center gap-2" aria-label={label}>
    <button class={CELL} onclick={() => onchange(1)} disabled={page === 1} aria-label="First page" title="First page">
      <ChevronsLeft />
    </button>
    <button class={CELL} onclick={() => onchange(page - 1)} disabled={page === 1} aria-label="Previous page" title="Previous page">
      <ChevronLeft />
    </button>
    {#each entries as entry, i (i)}
      {#if entry === 'gap'}
        <span class="{CELL} text-muted" aria-hidden="true">…</span>
      {:else}
        <button class={CELL} class:action={entry === page} aria-current={entry === page ? 'page' : undefined} onclick={() => onchange(entry)}>{entry}</button>
      {/if}
    {/each}
    <button class={CELL} onclick={() => onchange(page + 1)} disabled={page === pageCount} aria-label="Next page" title="Next page">
      <ChevronRight />
    </button>
    <button class={CELL} onclick={() => onchange(pageCount)} disabled={page === pageCount} aria-label="Last page" title="Last page">
      <ChevronsRight />
    </button>
  </nav>
{/if}
