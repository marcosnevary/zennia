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

  const tabs = [
    { path: '/practice', label: 'Practice' },
    { path: '/manage/words', label: 'Words' },
    { path: '/manage/kana', label: 'Kana' },
    { path: '/stats', label: 'Stats' },
    { path: '/settings', label: 'Settings' },
  ] as const

  $effect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    // browsers evaluate prefers-color-scheme as light while the print dialog is open, which would flip the "system" theme
    let printing = false
    const apply = () => {
      if (printing) return
      const resolved = resolveTheme(app.settings.theme, query.matches)
      document.documentElement.dataset.theme = resolved
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

<div class="mx-auto max-w-360 p-4 print:hidden">
  <header class="flex flex-wrap items-center justify-between gap-3 pt-2.5 pb-4">
    <h1 class="font-serif text-[2.6rem] leading-none font-bold">zennia</h1>
    <nav class="flex flex-wrap gap-2">
      {#each tabs as { path, label } (path)}
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
      <p class="mt-6 mb-4 text-bad" role="alert">Could not load your data: {app.error}</p>
      <button onclick={() => app.init()}>Try again</button>
    {:else}
      <p class="mt-6 mb-4 text-muted" role="status">Loading…</p>
    {/if}
  </main>
</div>

{#if app.sheetWords}
  <PrintSheet words={app.sheetWords} onclose={() => (app.sheetWords = null)} />
{/if}
