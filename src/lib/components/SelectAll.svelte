<script lang="ts">
  import type { ClassValue } from "svelte/elements";
  import type { Snippet } from "svelte";
  import { plural } from "../core/plural";

  let {
    checked,
    onchange,
    count,
    noun,
    summary,
    class: className,
    children,
  }: {
    checked: boolean;
    onchange: () => void;
    count: number;
    noun: string;
    /** What is selected, beside the checkbox. */
    summary: string;
    class?: ClassValue;
    children?: Snippet;
  } = $props();
</script>

<!-- on top of the list, which scrolls up behind it -->
<div class={["relative z-10 flex flex-wrap items-center gap-2", className]}>
  <label class="flex items-center gap-2">
    <input type="checkbox" {checked} {onchange} />
    {count === 1 ? "Select" : "Select all"}
    {count}
    {plural(count, noun)}
  </label>
  <span class="text-muted">{summary}</span>
  {@render children?.()}
</div>
