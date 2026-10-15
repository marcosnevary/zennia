<script lang="ts">
  import Help from './Help.svelte'
  import { isKana } from 'wanakana'
  import { importAnkiDeck } from '../../data/anki'
  import { downloadText, exportJSON, importJSON } from '../../data/io'
  import { toDisplayRomaji } from '../../core/romaji'
  import type { Word } from '../../core/types'
  import { mergeWords, newId, SORT_OPTIONS, sortWords, type SanitizeResult, type SortDirection, type SortKey } from '../../data/words'

  let { words = $bindable() }: { words: Word[] } = $props()

  let japanese = $state('')
  let hiragana = $state('')
  let meaning = $state('')
  let editingId = $state<string | null>(null)
  let editJapanese = $state('')
  let editHiragana = $state('')
  let editMeaning = $state('')
  let editError = $state('')
  let dialogEl = $state<HTMLDialogElement>()
  let error = $state('')
  let message = $state('')
  let japaneseEl = $state<HTMLInputElement>()

  function resetForm() {
    japanese = ''
    hiragana = ''
    meaning = ''
    error = ''
  }

  function validate(j: string, h: string): string {
    if (!j || !h) return 'Fill in the Japanese word and the hiragana.'
    if (!isKana(h)) return 'The hiragana field must contain only kana (hiragana, katakana or ー).'
    return ''
  }

  function save(event: Event) {
    event.preventDefault()
    const j = japanese.trim()
    const h = hiragana.trim()
    error = validate(j, h)
    if (error) return
    words = [{ id: newId(), japanese: j, hiragana: h, meaning: meaning.trim() }, ...words]
    message = 'Word added.'
    resetForm()
    japaneseEl?.focus()
  }

  function edit(word: Word) {
    editingId = word.id
    editJapanese = word.japanese
    editHiragana = word.hiragana
    editMeaning = word.meaning
    editError = ''
    message = ''
    dialogEl?.showModal()
  }

  function saveEdit(event: Event) {
    event.preventDefault()
    const j = editJapanese.trim()
    const h = editHiragana.trim()
    editError = validate(j, h)
    if (editError) return
    words = words.map((w) => (w.id === editingId ? { ...w, japanese: j, hiragana: h, meaning: editMeaning.trim() } : w))
    message = 'Word updated.'
    dialogEl?.close()
  }

  function onDialogClick(event: MouseEvent) {
    // clicks on the backdrop target the <dialog> itself
    const dialog = event.currentTarget as HTMLDialogElement
    if (event.target === dialog) dialog.close()
  }

  function remove(word: Word) {
    if (!confirm(`Delete "${word.japanese}"?`)) return
    words = words.filter((w) => w.id !== word.id)
    message = 'Word deleted.'
  }

  function toggle(word: Word) {
    words = words.map((w) => (w.id === word.id ? { ...w, disabled: !w.disabled } : w))
  }

  // selection (ids that no longer exist are ignored)
  let selected = $state<Set<string>>(new Set())
  let query = $state('')
  let sortKey = $state<SortKey>('list')
  let sortDirection = $state<SortDirection>('asc')
  const visibleWords = $derived.by(() => {
    const q = query.trim().toLowerCase()
    const matches = !q
      ? words
      : words.filter((w) =>
          [w.japanese, w.hiragana, toDisplayRomaji(w.hiragana), w.meaning].some((field) => field.toLowerCase().includes(q)),
        )
    return sortWords(matches, sortKey, sortDirection)
  })
  const selectedWords = $derived(words.filter((w) => selected.has(w.id)))
  const allSelected = $derived(visibleWords.length > 0 && visibleWords.every((w) => selected.has(w.id)))

  // bulk actions only ever touch what the user can see, so changing the filter clears the selection
  function onSearch() {
    selected = new Set()
  }

  function toggleSelected(id: string) {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    selected = next
  }

  function toggleSelectAll() {
    selected = allSelected ? new Set() : new Set(visibleWords.map((w) => w.id))
  }

  function setSelectedDisabled(disabled: boolean) {
    const count = selectedWords.length
    words = words.map((w) => {
      if (!selected.has(w.id)) return w
      const { disabled: _, ...rest } = w
      return disabled ? { ...rest, disabled: true } : rest
    })
    message = `${count} word(s) ${disabled ? 'disabled' : 'enabled'}.`
    selected = new Set()
  }

  function removeSelected() {
    const count = selectedWords.length
    if (!confirm(`Delete ${count} selected word(s)?`)) return
    words = words.filter((w) => !selected.has(w.id))
    message = `${count} word(s) deleted.`
    selected = new Set()
  }

  function exportWords() {
    const date = new Date().toISOString().slice(0, 10)
    downloadText(`zennia-words-${date}.json`, exportJSON(selectedWords))
    message = `${selectedWords.length} selected word(s) exported.`
  }

  function importFile(event: Event) {
    return runImport(event, importJSON)
  }

  function importAnki(event: Event) {
    return runImport(event, importAnkiDeck)
  }

  async function runImport(event: Event, parse: (text: string) => SanitizeResult) {
    const input = event.currentTarget as HTMLInputElement
    const file = input.files?.[0]
    input.value = ''
    if (!file) return
    error = ''
    try {
      const { words: incoming, skipped } = parse(await file.text())
      const skippedNote = skipped ? ` ${skipped} invalid item(s) ignored.` : ''
      const result = mergeWords(words, incoming)
      words = result.words
      message = `${result.added} added, ${result.duplicates} already existed.${skippedNote}`
      resetForm()
    } catch (e) {
      error = e instanceof Error ? e.message : 'Could not import the file.'
    }
  }
</script>

<h2>New word</h2>
<form class="form" onsubmit={save}>
  <input type="text" lang="ja" placeholder="Japanese (e.g. 食べる)" bind:value={japanese} bind:this={japaneseEl} />
  <input type="text" lang="ja" placeholder="Hiragana (e.g. たべる)" bind:value={hiragana} />
  <input type="text" placeholder="Meaning (e.g. to eat)" bind:value={meaning} />
  <div class="row wide">
    <button class="primary" type="submit">Add</button>
  </div>
</form>

<dialog bind:this={dialogEl} onclose={() => (editingId = null)} onclick={onDialogClick} aria-label="Edit word">
  <form class="form" onsubmit={saveEdit}>
    <h2>Edit word</h2>
    <input type="text" lang="ja" placeholder="Japanese (e.g. 食べる)" bind:value={editJapanese} />
    <input type="text" lang="ja" placeholder="Hiragana (e.g. たべる)" bind:value={editHiragana} />
    <input type="text" placeholder="Meaning (e.g. to eat)" bind:value={editMeaning} />
    {#if editError}<p class="error" role="alert">{editError}</p>{/if}
    <div class="row">
      <button class="primary" type="submit">Save</button>
      <button type="button" onclick={() => dialogEl?.close()}>Cancel</button>
    </div>
  </form>
</dialog>

{#if error}<p class="error" role="alert">{error}</p>{/if}
{#if message}<p class="muted" role="status">{message}</p>{/if}

<div class="heading">
  <h2>Import and export</h2>
  <Help />
</div>
<div class="row wide">
  <button
    onclick={exportWords}
    disabled={selectedWords.length === 0}
    title={selectedWords.length === 0 ? 'Select words in the list to export them' : undefined}
  >
    Export JSON{selectedWords.length > 0 ? ` (${selectedWords.length})` : ''}
  </button>
  <label class="file">
    Import JSON
    <input type="file" accept="application/json,.json" onchange={importFile} hidden />
  </label>
  <label class="file" title="Anki: Export → Notes in Plain Text. Columns: word, hiragana, meaning">
    Import Anki deck (.txt)
    <input type="file" accept="text/plain,.txt,.tsv" onchange={importAnki} hidden />
  </label>
</div>

{#snippet eyeIcon()}
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M2 12c1.5-3.5 5-7 10-7s8.5 3.5 10 7c-1.5 3.5-5 7-10 7S3.5 15.5 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
{/snippet}
{#snippet eyeOffIcon()}
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M3 3l18 18M10.6 5.1A9.7 9.7 0 0 1 12 5c5 0 8.5 3.5 10 7a14 14 0 0 1-3 4.2M6.6 6.6A14 14 0 0 0 2 12c1.5 3.5 5 7 10 7a9.8 9.8 0 0 0 4.4-1M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  </svg>
{/snippet}
{#snippet trashIcon()}
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v5M14 11v5" />
  </svg>
{/snippet}

<h2>Words ({visibleWords.length === words.length ? words.length : `${visibleWords.length} of ${words.length}`})</h2>
{#if words.length === 0}
  <p class="muted">No words yet.</p>
{:else}
  <div class="toolbar">
    <input
      type="search"
      class="search"
      placeholder="Search by word, reading, romaji or meaning"
      aria-label="Search words"
      bind:value={query}
      oninput={onSearch}
    />
    <div class="sort">
      <select bind:value={sortKey} aria-label="Sort by">
        {#each SORT_OPTIONS as option (option.key)}
          <option value={option.key}>{option.label}</option>
        {/each}
      </select>
    </div>
  </div>
  <div class="row bulk">
    <label class="check">
      <input type="checkbox" checked={allSelected} onchange={toggleSelectAll} />
      Select all
    </label>
    <span class="muted">{selectedWords.length} selected</span>
    <div class="bulk-actions" class:hidden={selectedWords.length === 0}>
      <button class="icon" onclick={() => setSelectedDisabled(false)} aria-label="Enable selected" title="Enable selected">
        {@render eyeIcon()}
      </button>
      <button class="icon" onclick={() => setSelectedDisabled(true)} aria-label="Disable selected" title="Disable selected">
        {@render eyeOffIcon()}
      </button>
      <button class="icon danger" onclick={removeSelected} aria-label="Delete selected" title="Delete selected">
        {@render trashIcon()}
      </button>
    </div>
    <button
      class="icon no-hover"
      onclick={() => (sortDirection = sortDirection === 'asc' ? 'desc' : 'asc')}
      aria-label={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
      title={sortDirection === 'asc' ? 'Ascending (click to reverse)' : 'Descending (click to reverse)'}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        {#if sortDirection === 'asc'}
          <path d="M12 19V5M5 12l7-7 7 7" />
        {:else}
          <path d="M12 5v14M5 12l7 7 7-7" />
        {/if}
      </svg>
    </button>
  </div>
  {#if visibleWords.length === 0}
    <p class="muted">No words match your search.</p>
  {/if}
  <ul class="list">
    {#each visibleWords as word (word.id)}
      <li class:off={word.disabled}>
        <input
          type="checkbox"
          checked={selected.has(word.id)}
          onchange={() => toggleSelected(word.id)}
          aria-label={`Select ${word.japanese}`}
        />
        <span class="jp" lang="ja">{word.japanese}</span>
        <span class="reading muted" lang="ja">{word.hiragana} · {toDisplayRomaji(word.hiragana)}</span>
        <span class="meaning">{word.meaning}</span>
        <span class="leader" aria-hidden="true"></span>
        <button
          class="icon"
          onclick={() => toggle(word)}
          aria-pressed={!word.disabled}
          aria-label={word.disabled ? 'Enable' : 'Disable'}
          title={word.disabled ? 'Enable' : 'Disable'}
        >
          {#if word.disabled}{@render eyeOffIcon()}{:else}{@render eyeIcon()}{/if}
        </button>
        <button class="icon" onclick={() => edit(word)} aria-label="Edit" title="Edit">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
          </svg>
        </button>
        <button class="icon danger" onclick={() => remove(word)} aria-label="Delete" title="Delete">
          {@render trashIcon()}
        </button>
      </li>
    {/each}
  </ul>
{/if}

<style>
  .form {
    display: grid;
    gap: 8px;
  }
  /* section titles get a divider underneath; the heading wrapper carries it when the title has a help icon */
  h2 {
    padding-bottom: 8px;
    margin-bottom: 12px;
    border-bottom: 2px solid var(--text);
  }
  .heading {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 24px 0 12px;
    padding-bottom: 8px;
    border-bottom: 2px solid var(--text);
  }
  .heading h2,
  dialog h2 {
    padding: 0;
    border: none;
  }
  .heading h2 {
    margin: 0;
  }
  dialog h2 {
    margin-bottom: 8px;
  }
  /* buttons share the whole row evenly */
  .wide > * {
    flex: 1;
    text-align: center;
  }
  .row {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    align-items: center;
  }
  select {
    /* custom chevron so the arrow keeps its distance from the border */
    padding: 9px 36px 9px 10px;
    appearance: none;
    background-color: var(--surface);
    background-image:
      linear-gradient(45deg, transparent 50%, var(--text) 50%),
      linear-gradient(135deg, var(--text) 50%, transparent 50%);
    background-position:
      calc(100% - 19px) 50%,
      calc(100% - 13px) 50%;
    background-size: 6px 6px;
    background-repeat: no-repeat;
  }
  dialog {
    width: min(420px, calc(100vw - 32px));
    padding: 16px;
    background: var(--bg, var(--surface));
    color: inherit;
  }
  dialog::backdrop {
    background: rgb(0 0 0 / 0.5);
  }
  dialog h2 {
    margin-top: 0;
  }
  /* every field in Settings gets the same square border; focus recolors it instead of stacking an outline */
  input[type='text'],
  .search,
  select {
    border: 2px solid var(--muted);
  }
  .search {
    appearance: none;
  }
  input[type='text']:focus-visible,
  .search:focus-visible,
  select:focus-visible {
    outline: none;
    border-color: var(--accent);
  }
  .error {
    color: var(--bad);
  }
  .list {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  li {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 0;
  }
  li.off .jp,
  li.off .reading,
  li.off .meaning {
    opacity: 0.45;
  }
  /* row of small, widely spaced square dots between the word and the buttons, as in Stats */
  .leader {
    flex: 1;
    min-width: 16px;
    height: 2px;
    background: linear-gradient(90deg, var(--muted) 2px, transparent 2px) left center / 8px 2px repeat-x;
  }
  .reading {
    font-size: 0.9rem;
  }
  .meaning {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .search {
    width: 100%;
    padding: 10px 12px;
    margin-bottom: 8px;
    background: var(--surface);
  }
  .toolbar {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    align-items: center;
    margin-bottom: 8px;
  }
  .toolbar .search {
    flex: 1;
    min-width: 200px;
    width: auto;
    margin-bottom: 0;
  }
  .sort {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .bulk {
    margin-bottom: 8px;
  }
  .bulk-actions {
    display: flex;
    gap: 8px;
    margin-left: auto;
  }
  /* keeps the space reserved so the layout does not shift when a selection appears */
  .bulk-actions.hidden {
    visibility: hidden;
  }
  .check {
    display: flex;
    gap: 6px;
    align-items: center;
  }
  button.icon {
    display: inline-flex;
    padding: 6px;
  }
  button.icon svg {
    width: 20px;
    height: 20px;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .jp {
    font-size: 1.3rem;
  }
</style>
