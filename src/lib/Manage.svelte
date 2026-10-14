<script lang="ts">
  import { isKana } from 'wanakana'
  import { importAnkiDeck } from './anki'
  import { downloadText, exportJSON, importJSON } from './io'
  import { toDisplayRomaji } from './romaji'
  import type { Word } from './types'
  import { mergeWords, newId, SORT_OPTIONS, sortWords, type SanitizeResult, type SortDirection, type SortKey } from './words'

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
  let helpEl = $state<HTMLDialogElement>()
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
    downloadText(`nihongo-words-${date}.json`, exportJSON(words))
    message = `${words.length} word(s) exported.`
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
  <div class="row">
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

<dialog class="help" bind:this={helpEl} onclick={onDialogClick} aria-label="Help: import and export">
  <h2>Import and export</h2>

  <h3>Export JSON</h3>
  <p>
    Downloads all your words (including disabled ones) as a <code>.json</code> file. Use it as a backup, or to move your
    words to another browser or device: your words are stored only in this browser, so a new address or a cleared browser
    means an empty list until you import the file again.
  </p>

  <h3>Import JSON</h3>
  <p>
    Loads a file created by <strong>Export JSON</strong>. A plain list of words also works, where each item has
    <code>japanese</code>, <code>hiragana</code> and optionally <code>meaning</code>. Imported words are
    <strong>added</strong> to your current list, nothing is replaced or deleted. Words you already have (same word and
    reading) are skipped, and invalid items are ignored. A summary is shown when it finishes.
  </p>

  <h3>Import Anki deck (.txt)</h3>
  <p>In Anki, export the deck like this:</p>
  <ol>
    <li>Select the deck and choose <strong>File → Export…</strong></li>
    <li>Set the format to <strong>Notes in Plain Text (.txt)</strong>.</li>
    <li>Enable <strong>Include HTML and media references</strong> (required to read the furigana).</li>
    <li>Export, then pick the file with <strong>Import Anki deck</strong>.</li>
  </ol>
  <p>How the cards are read:</p>
  <ul>
    <li>The <strong>front</strong> of the card becomes the Japanese word.</li>
    <li>
      The <strong>reading</strong> comes from the furigana on the back. Words written only in kana are their own reading.
    </li>
    <li>The <strong>meaning</strong> is taken from the first block of text on the back.</li>
    <li>
      Cards whose reading cannot be turned into kana, and repeated word + reading pairs, are skipped. The summary tells you
      how many.
    </li>
  </ul>
  <p class="muted">
    This works best with decks that show furigana on the back of the card. If most cards are skipped, check that HTML was
    included in the export.
  </p>

  <div class="row">
    <button class="primary" type="button" onclick={() => helpEl?.close()}>Close</button>
  </div>
</dialog>

{#if error}<p class="error" role="alert">{error}</p>{/if}
{#if message}<p class="muted" role="status">{message}</p>{/if}

<h2>Import and export</h2>
<div class="row">
  <button onclick={exportWords} disabled={words.length === 0}>Export JSON</button>
  <label class="file">
    Import JSON
    <input type="file" accept="application/json,.json" onchange={importFile} hidden />
  </label>
  <label class="file" title="Anki: Export Notes → Notes in Plain Text, with HTML enabled">
    Import Anki deck (.txt)
    <input type="file" accept="text/plain,.txt,.tsv" onchange={importAnki} hidden />
  </label>
  <button class="icon" onclick={() => helpEl?.showModal()} aria-label="How import and export work" title="How import and export work">
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01" />
    </svg>
  </button>
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
      <button
        onclick={() => (sortDirection = sortDirection === 'asc' ? 'desc' : 'asc')}
        aria-label={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
        title={sortDirection === 'asc' ? 'Ascending (click to reverse)' : 'Descending (click to reverse)'}
      >
        {sortDirection === 'asc' ? '↑ Ascending' : '↓ Descending'}
      </button>
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
  </div>
  {#if visibleWords.length === 0}
    <p class="muted">No words match your search.</p>
  {/if}
  <ul class="list">
    {#each visibleWords as word (word.id)}
      <li class={word.disabled ? 'off' : 'on'}>
        <input
          type="checkbox"
          checked={selected.has(word.id)}
          onchange={() => toggleSelected(word.id)}
          aria-label={`Select ${word.japanese}`}
        />
        <div class="info">
          <span class="jp" lang="ja">{word.japanese}</span>
          <span class="badge">{word.disabled ? '✕ Disabled' : '✓ Active'}</span>
          <span class="muted" lang="ja">{word.hiragana} · {toDisplayRomaji(word.hiragana)}</span>
          <span>{word.meaning}</span>
        </div>
        <div class="actions">
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
  dialog {
    width: min(420px, calc(100vw - 32px));
    padding: 16px;
    background: var(--bg, var(--surface));
    color: inherit;
    border: 1px solid var(--border);
    border-radius: 12px;
  }
  dialog::backdrop {
    background: rgb(0 0 0 / 0.5);
  }
  dialog h2 {
    margin-top: 0;
  }
  dialog.help {
    width: min(560px, calc(100vw - 32px));
  }
  dialog.help h3 {
    margin: 16px 0 4px;
  }
  dialog.help p,
  dialog.help ul,
  dialog.help ol {
    margin: 4px 0 8px;
  }
  .error {
    color: var(--bad);
  }
  .list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
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
  .search {
    width: 100%;
    padding: 10px 12px;
    margin-bottom: 8px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
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
  .sort button {
    /* fixed width so the toolbar does not shift when the direction flips */
    width: 9.5em;
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
  li.on {
    background: var(--on-bg);
    border-left: 5px solid var(--on);
  }
  li.off {
    background: var(--off-bg);
    border-left: 5px solid var(--off);
  }
  .badge {
    justify-self: start;
    font-size: 0.75rem;
    font-weight: 600;
  }
  li.on .badge {
    color: var(--on);
  }
  li.off .badge {
    color: var(--off);
  }
  .info {
    flex: 1;
    display: grid;
    gap: 2px;
  }
  .actions {
    display: flex;
    flex-direction: column;
    gap: 4px;
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
