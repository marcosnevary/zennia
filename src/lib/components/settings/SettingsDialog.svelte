<script lang="ts">
  import Database from "@lucide/svelte/icons/database";
  import PencilLine from "@lucide/svelte/icons/pencil-line";
  import SlidersHorizontal from "@lucide/svelte/icons/sliders-horizontal";
  import UserRound from "@lucide/svelte/icons/user-round";
  import X from "@lucide/svelte/icons/x";
  import ProfileSettings from "#lib/components/account/ProfileSettings.svelte";
  import Dialog from "#lib/components/Dialog.svelte";
  import DataSettings from "./DataSettings.svelte";
  import GeneralSettings from "./GeneralSettings.svelte";
  import PracticeSettings from "./PracticeSettings.svelte";

  const TABS = [
    {
      id: "profile",
      label: "Profile",
      icon: UserRound,
      panel: ProfileSettings,
    },
    {
      id: "general",
      label: "General",
      icon: SlidersHorizontal,
      panel: GeneralSettings,
    },
    {
      id: "practice",
      label: "Practice",
      icon: PencilLine,
      panel: PracticeSettings,
    },
    { id: "data", label: "Data", icon: Database, panel: DataSettings },
  ] as const;

  let dialogEl = $state<HTMLDialogElement>();
  let tabEls = $state<HTMLButtonElement[]>([]);
  // the panels mount on open and unmount on close, so an unsaved profile edit is dropped with the dialog
  let opened = $state(false);
  let selected = $state(0);

  export function open() {
    opened = true;
    dialogEl?.showModal();
  }

  // arrow keys move and select at once, like the tabs of an ARIA tablist; both axes, as the tabs are a row below sm
  function onkeydown(event: KeyboardEvent) {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[
      event.key
    ];
    if (!step) return;
    event.preventDefault();
    selected = (selected + step + TABS.length) % TABS.length;
    tabEls[selected]?.focus();
  }
</script>

<Dialog
  bind:el={dialogEl}
  label="Settings"
  width={800}
  class="p-4"
  onclose={() => (opened = false)}
>
  <div
    class="-mx-4 flex items-center justify-between gap-4 border-b border-tint px-4 pb-4"
  >
    <h2 class="m-0 text-base font-normal">Settings</h2>
    <button
      class="icon -my-2 -mr-2"
      type="button"
      aria-label="Close"
      title="Close"
      onclick={() => dialogEl?.close()}><X class="size-4" /></button
    >
  </div>
  <!-- below sm the dialog is too narrow for a side column, so the tabs go in a row above the panel;
       the negative margins take the borders out to the dialog's edges, past its 16px padding -->
  <div class="-mb-4 flex flex-col text-sm sm:flex-row">
    <div
      class="-mx-4 flex shrink-0 gap-2 overflow-x-auto border-b border-tint px-4 py-4 sm:mx-0 sm:w-48 sm:flex-col sm:overflow-visible sm:border-r sm:border-b-0 sm:pr-4 sm:pl-0"
      role="tablist"
      aria-label="Settings"
      tabindex="-1"
      {onkeydown}
    >
      {#each TABS as tab, i (tab.id)}
        {@const TabIcon = tab.icon}
        <button
          bind:this={tabEls[i]}
          class="tab shrink-0 rounded-pill sm:justify-start"
          type="button"
          role="tab"
          id="settings-tab-{tab.id}"
          aria-controls="settings-panel-{tab.id}"
          aria-selected={i === selected}
          tabindex={i === selected ? 0 : -1}
          onclick={() => (selected = i)}
          ><TabIcon /><span>{tab.label}</span></button
        >
      {/each}
    </div>
    {#if opened}
      <!-- every panel sits in the same grid cell, so the dialog keeps the height of the tallest and doesn't jump between tabs -->
      <div class="grid min-w-0 flex-1 py-4 sm:pl-4">
        {#each TABS as tab, i (tab.id)}
          {@const Panel = tab.panel}
          <div
            class={["col-start-1 row-start-1", i !== selected && "invisible"]}
            role="tabpanel"
            id="settings-panel-{tab.id}"
            aria-labelledby="settings-tab-{tab.id}"
          >
            <Panel />
          </div>
        {/each}
      </div>
    {/if}
  </div>
</Dialog>
