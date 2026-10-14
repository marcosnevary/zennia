<script lang="ts">
  import WordPractice from './WordPractice.svelte'
  import KanaPractice from './KanaPractice.svelte'
  import type { Stats, Word } from './types'

  let { words, stats = $bindable(), onmanage }: { words: Word[]; stats: Stats; onmanage: () => void } = $props()

  let mode = $state<'words' | 'kana'>('words')
</script>

<div class="modes" role="group" aria-label="Practice mode">
  <button class:primary={mode === 'words'} onclick={() => (mode = 'words')}>Words</button>
  <button class:primary={mode === 'kana'} onclick={() => (mode = 'kana')}>Hiragana &amp; Katakana</button>
</div>

{#if mode === 'words'}
  <WordPractice {words} bind:stats {onmanage} />
{:else}
  <KanaPractice bind:stats />
{/if}

<style>
  .modes {
    display: flex;
    justify-content: center;
    gap: 8px;
    margin-top: 16px;
  }
</style>
