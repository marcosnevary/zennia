<script lang="ts">
  import Icon from '../Icon.svelte'

  let { page, pageCount, onchange }: { page: number; pageCount: number; onchange: (page: number) => void } = $props()

  const ICON = 'inline-flex p-1.5'

  // first, last and the neighbors of the current page; gaps become a single ellipsis
  const entries = $derived.by(() => {
    const shown = [...new Set([1, page - 1, page, page + 1, pageCount])].filter((n) => n >= 1 && n <= pageCount).sort((a, b) => a - b)
    return shown.flatMap((n, i) => (i > 0 && n - shown[i - 1] > 1 ? ['gap' as const, n] : [n]))
  })
</script>

{#if pageCount > 1}
  <nav class="mt-3 flex flex-wrap items-center justify-center gap-1.5" aria-label="Word pages">
    <button class={ICON} onclick={() => onchange(1)} disabled={page === 1} aria-label="First page" title="First page">
      <Icon><path d="M11 17l-5-5 5-5M18 17l-5-5 5-5" /></Icon>
    </button>
    <button class={ICON} onclick={() => onchange(page - 1)} disabled={page === 1} aria-label="Previous page" title="Previous page">
      <Icon><path d="M15 18l-6-6 6-6" /></Icon>
    </button>
    {#each entries as entry, i (i)}
      {#if entry === 'gap'}
        <span class="text-muted" aria-hidden="true">…</span>
      {:else}
        <button class:primary={entry === page} aria-current={entry === page ? 'page' : undefined} onclick={() => onchange(entry)}>{entry}</button>
      {/if}
    {/each}
    <button class={ICON} onclick={() => onchange(page + 1)} disabled={page === pageCount} aria-label="Next page" title="Next page">
      <Icon><path d="M9 18l6-6-6-6" /></Icon>
    </button>
    <button class={ICON} onclick={() => onchange(pageCount)} disabled={page === pageCount} aria-label="Last page" title="Last page">
      <Icon><path d="M13 17l5-5-5-5M6 17l5-5-5-5" /></Icon>
    </button>
  </nav>
{/if}
