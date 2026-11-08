<script lang="ts">
  import CircleAlert from "@lucide/svelte/icons/circle-alert";
  import TriangleAlert from "@lucide/svelte/icons/triangle-alert";
  import X from "@lucide/svelte/icons/x";
  import { fly } from "svelte/transition";
  import { prefersReducedMotion } from "svelte/motion";
  import { getApp } from "#lib/state.svelte.ts";

  const toasts = getApp().toasts;
  const duration = $derived(prefersReducedMotion.current ? 0 : 200);
</script>

<section
  class="toaster fixed right-4 bottom-4 z-10 grid w-[min(400px,calc(100vw-32px))] gap-2 sm:right-8 sm:bottom-8 print:hidden"
  aria-label="Notifications"
>
  {#each toasts.items as toast (toast.id)}
    <div
      class="toast flex items-start gap-3 p-4"
      data-tone={toast.tone}
      role={toast.tone === "error" ? "alert" : "status"}
      transition:fly={{ y: 16, duration }}
    >
      {#if toast.tone === "error"}
        <CircleAlert class="shrink-0 text-bad" />
      {:else}
        <TriangleAlert class="shrink-0 text-warn" />
      {/if}
      <div class="grid flex-1 gap-3">
        <p>{toast.message}</p>
        {#if toast.actions.length}
          <div class="flex flex-wrap gap-2">
            {#each toast.actions as action (action.label)}
              <button
                type="button"
                class={{ action: action.primary }}
                onclick={action.run}>{action.label}</button
              >
            {/each}
          </div>
        {/if}
      </div>
      {#if !toast.actions.length}
        <!-- as tall as the message's first line, so the X lines up with it -->
        <button
          type="button"
          class="bare size-6"
          aria-label="Dismiss"
          title="Dismiss"
          onclick={() => toasts.dismiss(toast.id)}><X /></button
        >
      {/if}
    </div>
  {/each}
</section>
