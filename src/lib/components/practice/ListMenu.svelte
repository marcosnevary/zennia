<script lang="ts">
  import Ellipsis from "@lucide/svelte/icons/ellipsis";
  import RotateCcw from "@lucide/svelte/icons/rotate-ccw";
  import { LIST_LABELS, type List } from "#lib/data/learn.ts";
  import { getApp } from "#lib/state.svelte.ts";

  let { list }: { list: List } = $props();

  const app = getApp();
  const name = $derived(LIST_LABELS[list.id]);

  let triggerEl = $state<HTMLButtonElement>();
  let menuEl = $state<HTMLDivElement>();
  let open = $state(false);

  // the menu lives in the top layer, so it is placed by hand just below the trigger, aligned to its right edge
  function ontoggle(event: ToggleEvent) {
    open = event.newState === "open";
    if (!open || !triggerEl || !menuEl) return;
    const trigger = triggerEl.getBoundingClientRect();
    menuEl.style.top = `${trigger.bottom + 8}px`;
    menuEl.style.right = `${window.innerWidth - trigger.right}px`;
    menuEl.querySelector<HTMLElement>("[role=menuitem]")?.focus();
  }

  function restart() {
    menuEl?.hidePopover();
    if (
      confirm(
        `Restart ${name}? Its progress goes back to the start. Your words and statistics stay.`,
      )
    )
      app.restartList(list);
  }
</script>

<button
  class="icon text-muted"
  bind:this={triggerEl}
  popovertarget="list-menu"
  aria-haspopup="menu"
  aria-expanded={open}
  aria-label="{name} options"
  title="{name} options"
>
  <Ellipsis />
</button>

<div
  id="list-menu"
  class="menu"
  role="menu"
  aria-label="{name} options"
  tabindex="-1"
  popover="auto"
  bind:this={menuEl}
  {ontoggle}
>
  <button class="menu-item" role="menuitem" onclick={restart}
    ><RotateCcw />Restart list</button
  >
</div>
