<script lang="ts">
  import '../app.css'
  import { asset, resolve } from '$app/paths'
  import { page } from '$app/state'
  import PrintSheet from '#lib/components/print/PrintSheet.svelte'
  import type { Stats, Word } from '#lib/core/types.ts'
  import { saveStats, saveTheme, saveWords } from '#lib/data/storage.ts'
  import { resolveTheme } from '#lib/data/theme.ts'
  import { app } from '#lib/state.svelte.ts'

  let { children } = $props()

  const tabs = [
    { path: '/kana', label: 'Kana' },
    { path: '/words', label: 'Words' },
    { path: '/stats', label: 'Stats' },
    { path: '/manage', label: 'Settings' },
  ] as const

  // saves on every change to the pool (snapshot reads the whole list, including nested edits)
  $effect(() => {
    saveWords($state.snapshot(app.words) as Word[])
  })

  $effect(() => {
    saveStats($state.snapshot(app.stats) as Stats)
  })

  $effect(() => {
    saveTheme(app.theme)
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    // browsers evaluate prefers-color-scheme as light while the print dialog is open, which would flip the "system" theme
    let printing = false
    const apply = () => {
      if (printing) return
      const resolved = resolveTheme(app.theme, query.matches)
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

<div class="mx-auto max-w-260 p-4 print:hidden">
  <header class="flex flex-wrap items-center justify-between gap-3 border-b-2 border-ink pt-2.5 pb-4">
    <h1 class="font-serif text-[1.8rem] font-bold">zennia</h1>
    <nav class="flex gap-2">
      {#each tabs as { path, label } (path)}
        <a class="tab w-[6.5em]" href={resolve(path)} aria-current={page.url.pathname === resolve(path) ? 'page' : undefined}>{label}</a>
      {/each}
    </nav>
  </header>

  <main>
    {@render children()}
  </main>
</div>

{#if app.sheetWords}
  <PrintSheet words={app.sheetWords} onclose={() => (app.sheetWords = null)} />
{/if}
