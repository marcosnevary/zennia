<script lang="ts">
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import { resolve } from "$app/paths";
  import { LESSONS } from "./lessons";
</script>

<!-- wide enough not to feel cramped on a desktop, narrow enough to keep lines readable -->
<div class="mx-auto mt-6 mb-4 max-w-4xl">
  <ol class="flex flex-col gap-2">
    {#each LESSONS as lesson, i (lesson.id)}
      <li>
        <a
          class="flex items-center gap-4 rounded-panel bg-tint p-4 text-ink transition-colors hover:bg-tint-hover"
          href={resolve("/learn/[lesson]", { lesson: lesson.id })}
        >
          <span class="text-lg font-bold text-muted">{i + 1}</span>
          <span class="flex min-w-0 flex-1 flex-col">
            <span class="font-bold">{lesson.title}</span>
            <span class="text-sm text-muted">{lesson.summary}</span>
          </span>
          <ChevronRight class="shrink-0 text-muted" />
        </a>
      </li>
    {/each}
  </ol>
</div>
