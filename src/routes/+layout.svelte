<script lang="ts">
  import '../app.css'
  import { onMount } from 'svelte'
  import { asset, resolve } from '$app/paths'
  import { page } from '$app/state'
  import PrintSheet from '#lib/components/print/PrintSheet.svelte'
  import { getDb } from '#lib/data/db/client.ts'
  import { createRepo } from '#lib/data/db/repo.ts'
  import { resolveTheme } from '#lib/data/theme.ts'
  import { App, setApp } from '#lib/state.svelte.ts'

  let { children } = $props()

  const app = setApp(new App(createRepo(getDb)))
  onMount(() => app.init())

  const tabsAfterManage = [
    { path: '/stats', label: 'Stats' },
    { path: '/settings', label: 'Settings' },
  ] as const

  const manageSections = [
    { path: '/manage/words', label: 'Words' },
    { path: '/manage/kana', label: 'Kana' },
  ] as const

  let manageOpen = $state(false)
  let manageEl = $state<HTMLElement>()

  // the menu closes on any navigation
  $effect(() => {
    void page.url.pathname
    manageOpen = false
  })

  $effect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    // browsers evaluate prefers-color-scheme as light while the print dialog is open, which would flip the "system" theme
    let printing = false
    const apply = () => {
      if (printing) return
      const resolved = resolveTheme(app.settings.theme, query.matches)
      const root = document.documentElement
      if (root.dataset.theme !== resolved) {
        // hundreds of buttons would animate their colors at once and freeze the page
        root.dataset.themeSwitching = ''
        requestAnimationFrame(() => requestAnimationFrame(() => delete root.dataset.themeSwitching))
      }
      root.dataset.theme = resolved
      document.querySelector<HTMLLinkElement>('link[rel="icon"]')!.href = asset(resolved === 'dark' ? 'favicon-dark.png' : 'favicon.png')
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
</script>

<svelte:window
  onclick={(e) => manageOpen && !manageEl?.contains(e.target as Node) && (manageOpen = false)}
  onkeydown={(e) => e.key === 'Escape' && (manageOpen = false)}
/>

<div class="mx-auto max-w-260 p-2 print:hidden">
  <header class="flex flex-wrap items-center justify-between gap-3 pt-2.5 pb-4">
    <h1 class="font-serif text-[2.6rem] leading-none font-bold">zennia</h1>
    <nav class="flex gap-2">
      <a class="tab w-[6.5em]" href={resolve('/practice')} aria-current={page.url.pathname === resolve('/practice') ? 'page' : undefined}>Practice</a>
      <div class="relative" role="presentation" bind:this={manageEl} onmouseenter={() => (manageOpen = true)} onmouseleave={() => (manageOpen = false)}>
        <button
          class="tab w-[6.5em]"
          aria-current={page.url.pathname.startsWith(resolve('/manage')) ? 'page' : undefined}
          aria-expanded={manageOpen}
          aria-haspopup="true"
          onclick={() => (manageOpen = true)}
        >
          Manage
        </button>
        {#if manageOpen}
          <ul class="absolute top-full right-0 left-0 z-10 m-0 grid list-none gap-0 bg-surface p-0 shadow-[0_10px_14px_-6px_rgb(0_0_0/0.18)]">
            {#each manageSections as { path, label } (path)}
              <li>
                <a class="tab block" href={resolve(path)} aria-current={page.url.pathname === resolve(path) ? 'page' : undefined}>{label}</a>
              </li>
            {/each}
          </ul>
        {/if}
      </div>
      {#each tabsAfterManage as { path, label } (path)}
        <a class="tab w-[6.5em]" href={resolve(path)} aria-current={page.url.pathname === resolve(path) ? 'page' : undefined}>{label}</a>
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
      {@render children()}
    {:else if app.status === 'failed'}
      <p class="my-4 text-bad" role="alert">Could not load your data: {app.error}</p>
      <button onclick={() => app.init()}>Try again</button>
    {:else}
      <p class="my-4 text-muted" role="status">Loading…</p>
    {/if}
  </main>
</div>

{#if app.sheetWords}
  <PrintSheet words={app.sheetWords} onclose={() => (app.sheetWords = null)} />
{/if}
