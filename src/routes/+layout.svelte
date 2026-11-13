<script lang="ts">
  import "@fontsource-variable/geist";
  import "../app.css";
  import BookOpen from "@lucide/svelte/icons/book-open";
  import ChartColumn from "@lucide/svelte/icons/chart-column";
  import Languages from "@lucide/svelte/icons/languages";
  import LogIn from "@lucide/svelte/icons/log-in";
  import PencilLine from "@lucide/svelte/icons/pencil-line";
  import { onMount } from "svelte";
  import { MediaQuery } from "svelte/reactivity";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { navigating, page } from "$app/state";
  import AccountMenu from "#lib/components/account/AccountMenu.svelte";
  import Loading from "#lib/components/Loading.svelte";
  import PrintSheet from "#lib/components/print/PrintSheet.svelte";
  import Toaster from "#lib/components/Toaster.svelte";
  import { getDb } from "#lib/data/db/client.ts";
  import { createRepo } from "#lib/data/db/repo.ts";
  import { resolveTheme } from "#lib/data/theme.ts";
  import { App, setApp } from "#lib/state.svelte.ts";

  let { children } = $props();

  const app = setApp(new App(createRepo(getDb)));
  onMount(() => app.init());

  // 0 with overlay scrollbars; the probe picks up the thin scrollbar app.css gives every element
  onMount(() => {
    const probe = document.createElement("div");
    probe.style.cssText =
      "position: absolute; visibility: hidden; width: 100px; overflow: scroll";
    document.body.append(probe);
    document.documentElement.style.setProperty(
      "--scrollbar-width",
      `${probe.offsetWidth - probe.clientWidth}px`,
    );
    probe.remove();
  });

  // md: below it the sidebar gives way to a header and a tab bar
  const wide = new MediaQuery("min-width: 48rem");

  const tabs = [
    { path: "/practice", label: "Practice", icon: PencilLine },
    { path: "/vocabulary", label: "Vocabulary", icon: BookOpen },
    { path: "/kana", label: "Kana", icon: Languages },
    { path: "/stats", label: "Stats", icon: ChartColumn },
  ] as const;

  // the controls that take typed digits (a select jumps to the option they start), so the number keys are left to them
  const FIELDS =
    "input:not([type=checkbox], [type=radio], [type=file], [type=range]), textarea, select";

  // SvelteKit keeps the old page until the new route's code loads, so follow the in-flight navigation to switch at once
  const currentPath = $derived(
    navigating.to?.url.pathname ?? page.url.pathname,
  );
  const loadingRoute = $derived(
    navigating.to != null && navigating.to.route.id !== page.route.id,
  );

  $effect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    // browsers evaluate prefers-color-scheme as light while the print dialog is open, which would flip the "system" theme
    let printing = false;
    const apply = () => {
      if (printing) return;
      document.documentElement.dataset.theme = resolveTheme(
        app.settings.theme,
        query.matches,
      );
    };
    const startPrinting = () => (printing = true);
    const stopPrinting = () => {
      printing = false;
      apply();
    };
    apply();
    query.addEventListener("change", apply);
    window.addEventListener("beforeprint", startPrinting);
    window.addEventListener("afterprint", stopPrinting);
    return () => {
      query.removeEventListener("change", apply);
      window.removeEventListener("beforeprint", startPrinting);
      window.removeEventListener("afterprint", stopPrinting);
    };
  });

  // Escape is left alone where something else handles it: an open dialog closes on it, and a field that handles it cancels it
  function blurOnEscape(event: KeyboardEvent) {
    const control = document.activeElement;
    if (
      event.key !== "Escape" ||
      event.defaultPrevented ||
      !(control instanceof HTMLElement)
    )
      return;
    if (!control.closest("dialog")) control.blur();
  }

  // Shift is allowed because some layouts (AZERTY) need it to type the digits; the other modifiers belong to the browser and system
  function switchTab(event: KeyboardEvent) {
    if (!app.settings.numberKeyTabs) return;
    const tab = tabs.find((_, i) => event.key === String(i + 1));
    if (!tab || event.metaKey || event.ctrlKey || event.altKey) return;
    if (
      document.activeElement?.matches(FIELDS) ||
      document.querySelector("dialog[open]")
    )
      return;
    event.preventDefault();
    const href = resolve(tab.path);
    goto(href, { replace: currentPath === href });
  }

  function onkeydown(event: KeyboardEvent) {
    blurOnEscape(event);
    switchTab(event);
  }
</script>

<svelte:window {onkeydown} />

{#snippet signIn(compact: boolean)}
  <button
    class={["action", compact && "size-10 p-0"]}
    onclick={() => app.signIn()}
    title="Sign in with Google"
  >
    <LogIn /><span class={[compact && "sr-only"]}>Sign in</span>
  </button>
{/snippet}

<div class="flex print:hidden">
  {#if wide.current}
    <aside
      class="sticky top-0 flex h-dvh w-56 shrink-0 flex-col gap-8 self-start border-r border-tint px-4 py-6"
    >
      <h1 class="h-11 px-4 font-logo text-2xl font-bold">zennia</h1>
      <nav class="flex flex-col gap-2" data-sveltekit-preload-code="eager">
        {#each tabs as { path, label, icon: TabIcon }, i (path)}
          <a
            class="tab justify-start"
            href={resolve(path)}
            aria-current={currentPath === resolve(path) ? "page" : undefined}
            title={app.settings.numberKeyTabs ? `${label} (${i + 1})` : label}
            aria-keyshortcuts={app.settings.numberKeyTabs
              ? String(i + 1)
              : undefined}
          >
            <TabIcon /><span>{label}</span>
          </a>
        {/each}
      </nav>
      {#if app.status === "ready"}
        <div class="mt-auto flex flex-col gap-2">
          {#if app.account.anonymous}
            <!-- free to reach into the sidebar's padding, so the note never wraps -->
            <p
              class="-mx-4 text-center text-xs whitespace-nowrap text-muted opacity-70"
            >
              Sign in to sync across devices.
            </p>
            {@render signIn(false)}
          {:else}
            <AccountMenu />
          {/if}
        </div>
      {/if}
    </aside>
  {:else}
    <!-- a phone has no room for a sidebar: the logo goes on top and the tabs in a bar at the bottom -->
    <header
      class="fixed inset-x-0 top-0 z-20 grid h-14 grid-cols-[1fr_auto_1fr] items-center bg-surface px-4 pt-3"
    >
      <h1 class="col-start-2 h-11 font-logo text-2xl font-bold">zennia</h1>
      {#if app.status === "ready"}
        <div class="justify-self-end">
          {#if app.account.anonymous}
            {@render signIn(true)}
          {:else}
            <AccountMenu compact />
          {/if}
        </div>
      {/if}
    </header>
    <nav
      class="fixed inset-x-0 bottom-4 z-20 mx-auto flex w-fit gap-4 rounded-pill bg-tint p-1"
      data-sveltekit-preload-code="eager"
    >
      {#each tabs as { path, label, icon: TabIcon }, i (path)}
        {@const current = currentPath === resolve(path)}
        <a
          class={[
            "tab flex size-12 items-center justify-center p-0",
            current
              ? "bg-action text-on-action"
              : "bg-surface hover:bg-tint-hover",
          ]}
          href={resolve(path)}
          aria-current={current ? "page" : undefined}
          aria-label={label}
          title={app.settings.numberKeyTabs ? `${label} (${i + 1})` : label}
          aria-keyshortcuts={app.settings.numberKeyTabs
            ? String(i + 1)
            : undefined}
        >
          <TabIcon />
        </a>
      {/each}
    </nav>
  {/if}

  <!-- sized on 100vw, which counts a classic scrollbar, so the content does not shrink or shift when one appears (shrink-0, or the
       flex row would take the scrollbar's width back out of it); 1568px is the 1376px content plus the widest side padding -->
  <div
    class={["shrink-0", wide.current ? "w-[calc(100vw-224px)]" : "w-screen"]}
  >
    <!-- every screen opens with a 24px margin, so its first block starts at the top of the first tab: 24px sidebar padding + 44px logo + 32px gap;
         on a phone it starts below the header, and the bottom padding keeps the end of the page clear of the tab bar -->
    <div
      class={[
        "mx-auto max-w-[1568px] px-4 sm:px-8 lg:px-16 xl:px-24",
        wide.current ? "pt-19 pb-6" : "pt-14 pb-24",
      ]}
    >
      <main>
        {#if app.status === "ready"}
          {#if loadingRoute}
            <Loading />
          {:else}
            {@render children()}
          {/if}
        {:else if app.status === "loading"}
          <Loading />
        {/if}
      </main>
    </div>
  </div>
</div>

<Toaster />

{#if app.sheetWords}
  <PrintSheet words={app.sheetWords} onclose={() => (app.sheetWords = null)} />
{/if}
