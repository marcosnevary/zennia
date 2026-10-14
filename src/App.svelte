<script lang="ts">
  import Practice from './lib/Practice.svelte'
  import Manage from './lib/Manage.svelte'
  import { loadWords, saveWords } from './lib/storage'
  import type { Word } from './lib/types'

  let words = $state<Word[]>(loadWords())
  let tab = $state<'practice' | 'manage'>('practice')

  // salva a cada mudança na pool (snapshot lê a lista inteira, inclusive edições internas)
  $effect(() => {
    saveWords($state.snapshot(words) as Word[])
  })
</script>

<header>
  <h1>Nihongo</h1>
  <nav>
    <button class:primary={tab === 'practice'} onclick={() => (tab = 'practice')}>Prática</button>
    <button class:primary={tab === 'manage'} onclick={() => (tab = 'manage')}>
      Palavras ({words.length})
    </button>
  </nav>
</header>

<main>
  {#if tab === 'practice'}
    <Practice {words} onmanage={() => (tab = 'manage')} />
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
