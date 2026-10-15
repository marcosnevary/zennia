<script lang="ts">
  import WordPractice from './components/practice/WordPractice.svelte'
  import KanaPractice from './components/practice/KanaPractice.svelte'
  import Manage from './components/manage/Manage.svelte'
  import StatsView from './components/stats/Stats.svelte'
  import PrintSheet from './components/print/PrintSheet.svelte'
  import { loadStats, loadWords, saveStats, saveWords } from './data/storage'
  import type { Stats, Word } from './core/types'

  let words = $state<Word[]>(loadWords())
  let stats = $state<Stats>(loadStats())
  let tab = $state<'words' | 'kana' | 'stats' | 'manage'>('kana')
  // words of the writing sheet being printed; it renders hidden and only shows up in the print dialog
  let sheetWords = $state<Word[] | null>(null)

  // saves on every change to the pool (snapshot reads the whole list, including nested edits)
  $effect(() => {
    saveWords($state.snapshot(words) as Word[])
  })

  $effect(() => {
    saveStats($state.snapshot(stats) as Stats)
  })
</script>

<div class="app">
<header>
  <h1>zennia</h1>
  <nav>
    <button class:primary={tab === 'kana'} onclick={() => (tab = 'kana')}>Kana</button>
    <button class:primary={tab === 'words'} onclick={() => (tab = 'words')}>Words</button>
    <button class:primary={tab === 'stats'} onclick={() => (tab = 'stats')}>Stats</button>
    <button class:primary={tab === 'manage'} onclick={() => (tab = 'manage')}>Settings</button>
  </nav>
</header>

<main>
  {#if tab === 'words'}
    <WordPractice {words} bind:stats onmanage={() => (tab = 'manage')} />
  {:else if tab === 'kana'}
    <KanaPractice bind:stats />
  {:else if tab === 'stats'}
    <StatsView {words} bind:stats />
  {:else}
    <Manage bind:words onprint={(selected) => (sheetWords = selected)} />
  {/if}
</main>
</div>

{#if sheetWords}
  <PrintSheet words={sheetWords} onclose={() => (sheetWords = null)} />
{/if}

<style>
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    padding-bottom: 16px;
    border-bottom: 2px solid var(--text);
  }
  h1 {
    font-size: 1.4rem;
    margin: 0;
  }
  nav {
    display: flex;
    gap: 8px;
  }
  nav button {
    /* fixed width so the bold active tab does not resize the bar */
    width: 6.5em;
  }
</style>
