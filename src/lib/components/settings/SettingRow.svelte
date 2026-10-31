<script lang="ts">
  import type { Snippet } from 'svelte'

  let { title, description, children }: { title: string; description: string; children: Snippet } = $props()
</script>

<div class="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3">
  <div class="min-w-0 flex-1 basis-64">
    <h3 class="m-0 font-serif text-base font-bold">{title}</h3>
    <p class="mt-0.5 mb-0 text-muted">{description}</p>
  </div>
  <div class="w-full *:block *:w-full sm:w-52">
    {@render children()}
  </div>
</div>
