<script lang="ts">
  import ChevronUp from "@lucide/svelte/icons/chevron-up";
  import LogOut from "@lucide/svelte/icons/log-out";
  import Settings from "@lucide/svelte/icons/settings";
  import { getApp } from "#lib/state.svelte.ts";
  import Avatar from "./Avatar.svelte";
  import SettingsDialog from "#lib/components/settings/SettingsDialog.svelte";

  const app = getApp();
  const label = $derived(app.account.name ?? app.account.email ?? "");

  let triggerEl = $state<HTMLButtonElement>();
  let menuEl = $state<HTMLDivElement>();
  let settingsDialog = $state<SettingsDialog>();
  let open = $state(false);

  // the menu lives in the top layer, out of the sidebar, so it is placed by hand just above the trigger
  function ontoggle(event: ToggleEvent) {
    open = event.newState === "open";
    if (!open || !triggerEl || !menuEl) return;
    const trigger = triggerEl.getBoundingClientRect();
    menuEl.style.left = `${trigger.left + 8}px`;
    menuEl.style.bottom = `${window.innerHeight - trigger.top + 8}px`;
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
  class="menu-item -mx-3 -mb-6 gap-2 rounded-none border-t border-tint px-3 py-4 max-md:justify-center md:-mx-4 md:px-4"
  bind:this={triggerEl}
  popovertarget="account-menu"
  aria-haspopup="menu"
  aria-expanded={open}
  title={app.account.email}
>
  <Avatar url={app.account.avatarUrl} {label} />
  <span class="min-w-0 flex-1 truncate text-left text-sm max-md:hidden"
    >{label}</span
  >
  <ChevronUp
    class={[
      "size-4 text-muted transition-transform motion-reduce:transition-none max-md:hidden",
      open && "rotate-180",
    ]}
  />
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
