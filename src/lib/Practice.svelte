<script lang="ts">
  import WordPractice from './WordPractice.svelte'
  import KanaPractice from './KanaPractice.svelte'
  import type { Word } from './types'

  let { words, onmanage }: { words: Word[]; onmanage: () => void } = $props()

  let mode = $state<'words' | 'kana'>('words')
</script>

<div class="modes" role="group" aria-label="Practice mode">
  <button class:primary={mode === 'words'} onclick={() => (mode = 'words')}>Words</button>
  <button class:primary={mode === 'kana'} onclick={() => (mode = 'kana')}>Hiragana &amp; Katakana</button>
</div>

{#if mode === 'words'}
  <WordPractice {words} {onmanage} />
{:else}
  <KanaPractice />
{/if}

<style>
  .modes {
    display: flex;
    gap: 8px;
    margin-top: 16px;
  }
</style>
