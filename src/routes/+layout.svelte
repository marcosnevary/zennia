<script lang="ts">
  import '@fontsource-variable/geist'
  import '../app.css'
  import BookOpen from '@lucide/svelte/icons/book-open'
  import ChartColumn from '@lucide/svelte/icons/chart-column'
  import Languages from '@lucide/svelte/icons/languages'
  import PencilLine from '@lucide/svelte/icons/pencil-line'
  import RotateCw from '@lucide/svelte/icons/rotate-cw'
  import Settings from '@lucide/svelte/icons/settings'
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import { resolve } from '$app/paths'
  import { navigating, page } from '$app/state'
  import Loading from '#lib/components/Loading.svelte'
  import PrintSheet from '#lib/components/print/PrintSheet.svelte'
  import { getDb } from '#lib/data/db/client.ts'
  import { createRepo } from '#lib/data/db/repo.ts'
  import { resolveTheme } from '#lib/data/theme.ts'
  import { App, setApp } from '#lib/state.svelte.ts'

  let { children } = $props()

  const app = setApp(new App(createRepo(getDb)))
  onMount(() => app.init())

  const tabs = [
    { path: '/practice', label: 'Practice', icon: PencilLine },
    { path: '/vocabulary', label: 'Vocabulary', icon: BookOpen },
    { path: '/kana', label: 'Kana', icon: Languages },
    { path: '/stats', label: 'Stats', icon: ChartColumn },
    { path: '/settings', label: 'Settings', icon: Settings },
  ] as const

  // the controls that take typed digits (a select jumps to the option they start), so the number keys are left to them
  const FIELDS = 'input:not([type=checkbox], [type=radio], [type=file], [type=range]), textarea, select'

  // SvelteKit keeps the old page until the new route's code loads, so follow the in-flight navigation to switch at once
  const currentPath = $derived(navigating.to?.url.pathname ?? page.url.pathname)
  const loadingRoute = $derived(navigating.to != null && navigating.to.route.id !== page.route.id)

  $effect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    // browsers evaluate prefers-color-scheme as light while the print dialog is open, which would flip the "system" theme
    let printing = false
    const apply = () => {
      if (printing) return
      document.documentElement.dataset.theme = resolveTheme(app.settings.theme, query.matches)
    }
    const startPrinting = () => (printing = true)
    const stopPrinting = () => {
      printing = false
      apply()
    }
    apply()
    query.addEventListener('change', apply)
    window.addEventListener('beforeprint', startPrinting)
    window.addEventListener('afterprint', stopPrinting)
    return () => {
      query.removeEventListener('change', apply)
      window.removeEventListener('beforeprint', startPrinting)
      window.removeEventListener('afterprint', stopPrinting)
    }
  })

  // Escape is left alone where something else handles it: an open dialog closes on it, and a field that handles it cancels it
  function blurOnEscape(event: KeyboardEvent) {
    const control = document.activeElement
    if (event.key !== 'Escape' || event.defaultPrevented || !(control instanceof HTMLElement)) return
    if (!control.closest('dialog')) control.blur()
  }

  // Shift is allowed because some layouts (AZERTY) need it to type the digits; the other modifiers belong to the browser and system
  function switchTab(event: KeyboardEvent) {
    const tab = tabs.find((_, i) => event.key === String(i + 1))
    if (!tab || event.metaKey || event.ctrlKey || event.altKey) return
    if (document.activeElement?.matches(FIELDS) || document.querySelector('dialog[open]')) return
    event.preventDefault()
    const href = resolve(tab.path)
    goto(href, { replace: currentPath === href })
  }

  function onkeydown(event: KeyboardEvent) {
    blurOnEscape(event)
    switchTab(event)
  }
</script>

<svelte:window {onkeydown} />

<!-- sized and centered on 100vw, which counts a classic scrollbar, so the layout does not shrink or shift when one appears; 1568px is the 1376px content plus the widest side padding -->
<div class="ml-[max(0px,calc(50vw-784px))] w-[min(100vw,1568px)] px-4 py-4 sm:px-8 lg:px-16 xl:px-24 print:hidden">
  <header class="flex flex-wrap items-center justify-between gap-3 pt-2 pb-4">
    <h1 class="font-logo text-2xl font-bold">zennia</h1>
    <!-- equal columns as wide as the widest tab; below md the five tabs only fit as icons -->
    <nav class="grid auto-cols-fr grid-flow-col gap-2" data-sveltekit-preload-code="eager">
      {#each tabs as { path, label, icon: TabIcon }, i (path)}
        <a
          class="tab"
          href={resolve(path)}
          aria-current={currentPath === resolve(path) ? 'page' : undefined}
          title="{label} ({i + 1})"
          aria-keyshortcuts={String(i + 1)}
        >
          <TabIcon /><span class="max-md:sr-only">{label}</span>
        </a>
      {/each}
    </nav>
  </header>

  <main>
    {#if app.status === 'ready'}
      {#if app.error}
        <p class="my-4 text-bad" role="alert">
          {app.error}
          <button onclick={() => app.clearError()}>Dismiss</button>
        </p>
      {/if}
      {#if app.conflict}
        <div class="my-4" role="alert">
          <p class="mb-2">This Google account already has data. Signing in discards the data in this browser.</p>
          <div class="flex gap-2">
            <button class="action" onclick={() => app.resolveConflict(true)}>Sign in and discard</button>
            <button onclick={() => app.resolveConflict(false)}>Keep my data</button>
          </div>
        </div>
      {/if}
      {#if loadingRoute}
        <Loading />
      {:else}
        {@render children()}
      {/if}
    {:else if app.status === 'failed'}
      <p class="mt-6 mb-4 text-bad" role="alert">Could not load your data: {app.error}</p>
      <button onclick={() => app.init()}><RotateCw />Try again</button>
    {:else}
      <Loading />
    {/if}
  </main>
</div>

{#if app.sheetWords}
  <PrintSheet words={app.sheetWords} onclose={() => (app.sheetWords = null)} />
{/if}
