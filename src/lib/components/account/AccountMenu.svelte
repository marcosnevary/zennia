<script lang="ts">
  import ChevronUp from "@lucide/svelte/icons/chevron-up";
  import LogOut from "@lucide/svelte/icons/log-out";
  import Settings from "@lucide/svelte/icons/settings";
  import { getApp } from "#lib/state.svelte.ts";
  import Avatar from "./Avatar.svelte";
  import SettingsDialog from "#lib/components/settings/SettingsDialog.svelte";

  /** Compact shows only the avatar, at the top of a phone screen, and opens the menu below it. */
  let { compact = false }: { compact?: boolean } = $props();

  const app = getApp();
  const label = $derived(app.account.name ?? app.account.email ?? "");

  let triggerEl = $state<HTMLButtonElement>();
  let menuEl = $state<HTMLDivElement>();
  let settingsDialog = $state<SettingsDialog>();
  let open = $state(false);

  // the menu lives in the top layer, out of the sidebar or header, so it is placed by hand next to the trigger:
  // above it at the bottom of the sidebar, below it and aligned to its right edge at the top of the screen
  function ontoggle(event: ToggleEvent) {
    open = event.newState === "open";
    if (!open || !triggerEl || !menuEl) return;
    const trigger = triggerEl.getBoundingClientRect();
    if (compact) {
      menuEl.style.top = `${trigger.bottom + 8}px`;
      menuEl.style.right = `${window.innerWidth - trigger.right}px`;
    } else {
      menuEl.style.left = `${trigger.left + 8}px`;
      menuEl.style.bottom = `${window.innerHeight - trigger.top + 8}px`;
    }
    menuEl.querySelector<HTMLElement>("[role=menuitem]")?.focus();
  }

  function onkeydown(event: KeyboardEvent) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const items = [
      ...(menuEl?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? []),
    ];
    const at = items.indexOf(document.activeElement as HTMLElement);
    const step = event.key === "ArrowDown" ? 1 : -1;
    items[(at + step + items.length) % items.length]?.focus();
  }

  function openSettings() {
    menuEl?.hidePopover();
    settingsDialog?.open();
  }

  function signOut() {
    menuEl?.hidePopover();
    if (
      confirm(
        "Sign out? This browser will start empty until you sign in again.",
      )
    )
      app.signOut();
  }
</script>

<button
  class={compact
    ? "icon p-1"
    : "menu-item -mx-4 -mb-6 gap-2 rounded-none border-t border-tint px-4 py-4"}
  bind:this={triggerEl}
  popovertarget="account-menu"
  aria-haspopup="menu"
  aria-expanded={open}
  title={app.account.email}
>
  <Avatar url={app.account.avatarUrl} {label} />
  {#if !compact}
    <span class="min-w-0 flex-1 truncate text-left text-sm">{label}</span>
    <ChevronUp
      class={[
        "size-4 text-muted transition-transform motion-reduce:transition-none",
        open && "rotate-180",
      ]}
    />
  {/if}
</button>

<div
  id="account-menu"
  class="menu"
  role="menu"
  aria-label="Account"
  tabindex="-1"
  popover="auto"
  bind:this={menuEl}
  {ontoggle}
  {onkeydown}
>
  <button class="menu-item" role="menuitem" onclick={openSettings}
    ><Settings />Settings</button
  >
  <button class="menu-item" role="menuitem" onclick={signOut}
    ><LogOut />Sign out</button
  >
</div>

<SettingsDialog bind:this={settingsDialog} />
