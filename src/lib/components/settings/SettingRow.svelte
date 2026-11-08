<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    title,
    description,
    help,
    children,
  }: {
    title: string;
    description: string;
    /** Shown beside the title, such as a help button. */
    help?: Snippet;
    children: Snippet;
  } = $props();
</script>

<div class="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3">
  <div class="min-w-0 flex-1 basis-64">
    <div class="flex items-center gap-1">
      <h3 class="m-0 text-sm">{title}</h3>
      {@render help?.()}
    </div>
    <p class="mt-1 mb-0 text-muted opacity-70">{description}</p>
  </div>
  <div class="flex shrink-0">
    {@render children()}
  </div>
</div>
