<script lang="ts">
  import '@fontsource-variable/geist'
  import '../app.css'
  import BookOpen from '@lucide/svelte/icons/book-open'
  import ChartColumn from '@lucide/svelte/icons/chart-column'
  import Languages from '@lucide/svelte/icons/languages'
  import LogIn from '@lucide/svelte/icons/log-in'
  import PencilLine from '@lucide/svelte/icons/pencil-line'
  import RotateCw from '@lucide/svelte/icons/rotate-cw'
  import Settings from '@lucide/svelte/icons/settings'
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import { resolve } from '$app/paths'
  import { navigating, page } from '$app/state'
  import AccountMenu from '#lib/components/account/AccountMenu.svelte'
  import Loading from '#lib/components/Loading.svelte'
  import PrintSheet from '#lib/components/print/PrintSheet.svelte'
  import { getDb } from '#lib/data/db/client.ts'
  import { createRepo } from '#lib/data/db/repo.ts'
  import { resolveTheme } from '#lib/data/theme.ts'
  import { App, setApp } from '#lib/state.svelte.ts'

  let { children } = $props()

  const app = setApp(new App(createRepo(getDb)))
  onMount(() => app.init())

  // 0 with overlay scrollbars; the probe picks up the thin scrollbar app.css gives every element
  onMount(() => {
    const probe = document.createElement('div')
    probe.style.cssText = 'position: absolute; visibility: hidden; width: 100px; overflow: scroll'
    document.body.append(probe)
    document.documentElement.style.setProperty('--scrollbar-width', `${probe.offsetWidth - probe.clientWidth}px`)
    probe.remove()
  })

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

<div class="flex print:hidden">
  <aside class="sticky top-0 flex h-dvh w-16 shrink-0 flex-col gap-8 self-start px-3 py-6 md:w-56 md:px-4">
    <h1 class="font-logo text-2xl font-bold max-md:text-center md:px-4">
      <span class="md:hidden" aria-hidden="true">z</span><span class="max-md:sr-only">zennia</span>
    </h1>
    <!-- below md the rail only fits the icons -->
    <nav class="flex flex-col gap-2" data-sveltekit-preload-code="eager">
      {#each tabs as { path, label, icon: TabIcon }, i (path)}
        <a
          class="tab rounded-pill max-md:size-10 max-md:p-0 md:justify-start"
          href={resolve(path)}
          aria-current={currentPath === resolve(path) ? 'page' : undefined}
          title="{label} ({i + 1})"
          aria-keyshortcuts={String(i + 1)}
        >
          <TabIcon /><span class="max-md:sr-only">{label}</span>
        </a>
      {/each}
    </nav>
    {#if app.status === 'ready'}
      <div class="mt-auto flex flex-col gap-2">
        {#if app.account.anonymous}
          <!-- free to reach into the sidebar's padding, so the note never wraps -->
          <p class="-mx-4 text-center text-xs whitespace-nowrap text-muted opacity-70 max-md:hidden">Sign in to sync across devices.</p>
          <button class="action rounded-pill max-md:size-10 max-md:p-0" onclick={() => app.signIn()} title="Sign in with Google">
            <LogIn /><span class="max-md:sr-only">Sign in</span>
          </button>
        {:else}
          <AccountMenu />
        {/if}
      </div>
    {/if}
  </aside>

  <!-- sized on 100vw, which counts a classic scrollbar, so the content does not shrink or shift when one appears (shrink-0, or the
       flex row would take the scrollbar's width back out of it); 1568px is the 1376px content plus the widest side padding -->
  <div class="w-[calc(100vw-64px)] shrink-0 md:w-[calc(100vw-224px)]">
    <div class="mx-auto max-w-[1568px] px-4 py-6 sm:px-8 lg:px-16 xl:px-24">
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
  </div>
</div>

{#if app.sheetWords}
  <PrintSheet words={app.sheetWords} onclose={() => (app.sheetWords = null)} />
{/if}
