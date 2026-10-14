<script lang="ts">
  import Practice from './lib/Practice.svelte'
  import Manage from './lib/Manage.svelte'
  import StatsView from './lib/Stats.svelte'
  import { loadStats, loadWords, saveStats, saveWords } from './lib/storage'
  import type { Stats, Word } from './lib/types'

  let words = $state<Word[]>(loadWords())
  let stats = $state<Stats>(loadStats())
  let tab = $state<'practice' | 'manage' | 'stats'>('practice')

  // saves on every change to the pool (snapshot reads the whole list, including nested edits)
  $effect(() => {
    saveWords($state.snapshot(words) as Word[])
  })

  $effect(() => {
    saveStats($state.snapshot(stats) as Stats)
  })
</script>

<header>
  <h1>Nihongo</h1>
  <nav>
    <button class:primary={tab === 'practice'} onclick={() => (tab = 'practice')}>Practice</button>
    <button class:primary={tab === 'manage'} onclick={() => (tab = 'manage')}>
      Words ({words.length})
    </button>
    <button class:primary={tab === 'stats'} onclick={() => (tab = 'stats')}>Stats</button>
  </nav>
</header>

<main>
  {#if tab === 'practice'}
    <Practice {words} bind:stats onmanage={() => (tab = 'manage')} />
  {:else if tab === 'stats'}
    <StatsView {words} bind:stats />
  {:else}
    <Manage bind:words />
  {/if}
</main>

<style>
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }
  h1 {
    font-size: 1.4rem;
    margin: 0;
  }
  nav {
    display: flex;
    gap: 8px;
  }
</style>
