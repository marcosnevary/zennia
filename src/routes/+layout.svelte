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
    const apply = () => {
      const resolved = resolveTheme(app.theme, query.matches)
      document.documentElement.dataset.theme = resolved
      document.querySelector<HTMLLinkElement>('link[rel="icon"]')!.href = asset(resolved === 'dark' ? 'favicon-dark.png' : 'favicon.png')
    }
    apply()
    query.addEventListener('change', apply)
    return () => query.removeEventListener('change', apply)
  })
</script>

<div class="app">
  <header>
    <h1>zennia</h1>
    <nav>
      {#each tabs as { path, label } (path)}
        <a class="tab" href={resolve(path)} aria-current={page.url.pathname === resolve(path) ? 'page' : undefined}>{label}</a>
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

<style>
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    padding-top: 10px;
    padding-bottom: 16px;
    border-bottom: 2px solid var(--text);
  }
  h1 {
    font-family: 'Libron', Georgia, serif;
    font-weight: 700;
    font-size: 1.8rem;
    margin: 0;
  }
  nav {
    display: flex;
    gap: 8px;
  }
  nav a {
    /* fixed width so the bold active tab does not resize the bar */
    width: 6.5em;
  }
</style>
