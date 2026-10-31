<script lang="ts">
  import Icon from './Icon.svelte'
  import { pageEntries } from '../data/pagination'

  let { page, pageCount, label, onchange }: { page: number; pageCount: number; label: string; onchange: (page: number) => void } = $props()

  // one size for every control, so the row does not grow or shrink between pages
  const CELL = 'inline-flex h-9 w-10 items-center justify-center p-0'
  const entries = $derived(pageEntries(page, pageCount))
</script>

{#if pageCount > 1}
  <nav class="mt-3 flex flex-wrap items-center justify-center gap-1.5" aria-label={label}>
    <button class={CELL} onclick={() => onchange(1)} disabled={page === 1} aria-label="First page" title="First page">
      <Icon><path d="M11 17l-5-5 5-5M18 17l-5-5 5-5" /></Icon>
    </button>
    <button class={CELL} onclick={() => onchange(page - 1)} disabled={page === 1} aria-label="Previous page" title="Previous page">
      <Icon><path d="M15 18l-6-6 6-6" /></Icon>
    </button>
    {#each entries as entry, i (i)}
      {#if entry === 'gap'}
        <span class="{CELL} text-muted" aria-hidden="true">…</span>
      {:else}
        <button class={CELL} class:primary={entry === page} aria-current={entry === page ? 'page' : undefined} onclick={() => onchange(entry)}>{entry}</button>
      {/if}
    {/each}
    <button class={CELL} onclick={() => onchange(page + 1)} disabled={page === pageCount} aria-label="Next page" title="Next page">
      <Icon><path d="M9 18l6-6-6-6" /></Icon>
    </button>
    <button class={CELL} onclick={() => onchange(pageCount)} disabled={page === pageCount} aria-label="Last page" title="Last page">
      <Icon><path d="M13 17l5-5-5-5M6 17l5-5-5-5" /></Icon>
    </button>
  </nav>
{/if}
