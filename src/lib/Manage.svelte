<script lang="ts">
  import { isKana } from 'wanakana'
  import { downloadText, exportJSON, importJSON } from './io'
  import { toDisplayRomaji } from './romaji'
  import type { Word } from './types'
  import { mergeWords, newId } from './words'

  let { words = $bindable() }: { words: Word[] } = $props()

  let japanese = $state('')
  let hiragana = $state('')
  let meaning = $state('')
  let editingId = $state<string | null>(null)
  let error = $state('')
  let message = $state('')
  let importMode = $state<'merge' | 'replace'>('merge')
  let japaneseEl = $state<HTMLInputElement>()

  function resetForm() {
    japanese = ''
    hiragana = ''
    meaning = ''
    editingId = null
    error = ''
  }

  function save(event: Event) {
    event.preventDefault()
    const j = japanese.trim()
    const h = hiragana.trim()
    const m = meaning.trim()
    if (!j || !h) {
      error = 'Fill in the Japanese word and the hiragana.'
      return
    }
    if (!isKana(h)) {
      error = 'The hiragana field must contain only kana (hiragana, katakana or ー).'
      return
    }
    if (editingId) {
      words = words.map((w) => (w.id === editingId ? { ...w, japanese: j, hiragana: h, meaning: m } : w))
      message = 'Word updated.'
    } else {
      words = [{ id: newId(), japanese: j, hiragana: h, meaning: m }, ...words]
      message = 'Word added.'
    }
    resetForm()
    japaneseEl?.focus()
  }

  function edit(word: Word) {
    editingId = word.id
    japanese = word.japanese
    hiragana = word.hiragana
    meaning = word.meaning
    error = ''
    message = ''
    japaneseEl?.focus()
  }

  function remove(word: Word) {
    if (!confirm(`Delete "${word.japanese}"?`)) return
    words = words.filter((w) => w.id !== word.id)
    if (editingId === word.id) resetForm()
    message = 'Word deleted.'
  }

  function exportWords() {
    const date = new Date().toISOString().slice(0, 10)
    downloadText(`nihongo-words-${date}.json`, exportJSON(words))
    message = `${words.length} word(s) exported.`
  }

  async function importFile(event: Event) {
    const input = event.currentTarget as HTMLInputElement
    const file = input.files?.[0]
    input.value = ''
    if (!file) return
    error = ''
    try {
      const { words: incoming, skipped } = importJSON(await file.text())
      const skippedNote = skipped ? ` ${skipped} invalid item(s) ignored.` : ''
      if (importMode === 'replace') {
        if (!confirm(`Replace the current ${words.length} word(s) with the ${incoming.length} from the file?`)) return
        words = incoming
        message = `Pool replaced: ${incoming.length} word(s).${skippedNote}`
      } else {
        const result = mergeWords(words, incoming)
        words = result.words
        message = `${result.added} added, ${result.duplicates} already existed.${skippedNote}`
      }
      resetForm()
    } catch (e) {
      error = e instanceof Error ? e.message : 'Could not import the file.'
    }
  }
</script>

<h2>{editingId ? 'Edit word' : 'New word'}</h2>
<form class="form" onsubmit={save}>
  <input type="text" lang="ja" placeholder="Japanese (e.g. 食べる)" bind:value={japanese} bind:this={japaneseEl} />
  <input type="text" lang="ja" placeholder="Hiragana (e.g. たべる)" bind:value={hiragana} />
  <input type="text" placeholder="Meaning (e.g. to eat)" bind:value={meaning} />
  <div class="row">
    <button class="primary" type="submit">{editingId ? 'Save' : 'Add'}</button>
    {#if editingId}<button type="button" onclick={resetForm}>Cancel</button>{/if}
  </div>
</form>

{#if error}<p class="error" role="alert">{error}</p>{/if}
{#if message}<p class="muted" role="status">{message}</p>{/if}

<h2>Import and export</h2>
<div class="row">
  <button onclick={exportWords} disabled={words.length === 0}>Export JSON</button>
  <label class="file">
    Import JSON
    <input type="file" accept="application/json,.json" onchange={importFile} hidden />
  </label>
  <select bind:value={importMode} aria-label="Import mode">
    <option value="merge">Merge with the pool</option>
    <option value="replace">Replace the pool</option>
  </select>
</div>

<h2>Words ({words.length})</h2>
{#if words.length === 0}
  <p class="muted">No words yet.</p>
{:else}
  <ul class="list">
    {#each words as word (word.id)}
      <li>
        <div class="info">
          <span class="jp" lang="ja">{word.japanese}</span>
          <span class="muted" lang="ja">{word.hiragana} · {toDisplayRomaji(word.hiragana)}</span>
          <span>{word.meaning}</span>
        </div>
        <div class="row">
          <button onclick={() => edit(word)}>Edit</button>
          <button class="danger" onclick={() => remove(word)}>Delete</button>
        </div>
      </li>
    {/each}
  </ul>
{/if}

<style>
  .form {
    display: grid;
    gap: 8px;
  }
  .row {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    align-items: center;
  }
  .file {
    padding: 9px 14px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    cursor: pointer;
  }
  select {
    padding: 9px 10px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
  }
  .error {
    color: var(--bad);
  }
  .list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 8px;
  }
  li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    padding: 10px 12px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
  }
  .info {
    display: grid;
    gap: 2px;
  }
  .jp {
    font-size: 1.3rem;
  }
</style>
