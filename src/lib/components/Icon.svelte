<script lang="ts">
  import type { Snippet } from 'svelte'

  let { children, class: className = 'size-5' }: { children: Snippet; class?: string } = $props()
</script>

<svg class={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  {@render children()}
</svg>
