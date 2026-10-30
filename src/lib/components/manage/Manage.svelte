<script lang="ts">
  import Icon from '../Icon.svelte'
  import { closeOnBackdrop } from './dialog'
  import Help from './Help.svelte'
  import TagChip from './TagChip.svelte'
  import TagInput from './TagInput.svelte'
  import { importAnkiDeck } from '../../data/anki'
  import { downloadText, exportFilename, exportJSON, importJSON } from '../../data/io'
  import { toDisplayRomaji } from '../../core/romaji'
  import { THEMES, type ThemePreference } from '../../data/theme'
  import type { Word } from '../../core/types'
  import {
    addTag,
    allTags,
    cleanTags,
    deleteTag,
    filterByTags,
    importSummary,
    makeWord,
    mergeWords,
    needsMeaning,
    removeTag,
    renameTag,
    sameTag,
    searchWords,
    SORT_OPTIONS,
    setDisabled,
    sortWords,
    updateWord,
    validateTag,
    validateWord,
    type SanitizeResult,
    type SortDirection,
    type SortKey,
  } from '../../data/words'

  let {
    words = $bindable(),
    theme = $bindable(),
    onprint,
  }: { words: Word[]; theme: ThemePreference; onprint: (words: Word[]) => void } = $props()

  let japanese = $state('')
  let hiragana = $state('')
  let meaning = $state('')
  let newTags = $state<string[]>([])
  let editingId = $state<string | null>(null)
  let editJapanese = $state('')
  let editHiragana = $state('')
  let editMeaning = $state('')
  let editTags = $state<string[]>([])
  let editError = $state('')
  let dialogEl = $state<HTMLDialogElement>()
  let error = $state('')
  let message = $state('')
  let japaneseEl = $state<HTMLInputElement>()

  function resetForm() {
    japanese = ''
    hiragana = ''
    meaning = ''
    newTags = []
    error = ''
  }

  function save(event: Event) {
    event.preventDefault()
    const fields = { japanese, hiragana, meaning, tags: newTags }
    error = validateWord(fields)
    if (error) return
    words = [makeWord(fields), ...words]
    message = 'Word added.'
    resetForm()
    japaneseEl?.focus()
  }

  function edit(word: Word) {
    editingId = word.id
    editJapanese = word.japanese
    editHiragana = word.hiragana
    editMeaning = word.meaning
    editTags = [...word.tags]
    editError = ''
    message = ''
    dialogEl?.showModal()
  }

  function saveEdit(event: Event) {
    event.preventDefault()
    const fields = { japanese: editJapanese, hiragana: editHiragana, meaning: editMeaning, tags: editTags }
    editError = validateWord(fields)
    if (editError) return
    words = words.map((w) => (w.id === editingId ? updateWord(w, fields) : w))
    message = 'Word updated.'
    dialogEl?.close()
  }

  function remove(word: Word) {
    if (!confirm(`Delete "${word.japanese}"?`)) return
    words = words.filter((w) => w.id !== word.id)
    message = 'Word deleted.'
  }

  function toggle(word: Word) {
    words = words.map((w) => (w.id === word.id ? setDisabled(w, !w.disabled) : w))
  }

  // selection (ids that no longer exist are ignored)
  let selected = $state<Set<string>>(new Set())
  let query = $state('')
  let sortKey = $state<SortKey>('status')
  let sortDirection = $state<SortDirection>('asc')
  // the tag filter: only tags still in use count, so deleting the last word with a tag drops it from the filter
  const tags = $derived(allTags(words))
  let activeTags = $state<string[]>([])
  const filterTags = $derived(activeTags.filter((a) => tags.some((t) => sameTag(t, a))))
  const visibleWords = $derived(sortWords(searchWords(filterByTags(words, filterTags), query), sortKey, sortDirection))
  const selectedWords = $derived(words.filter((w) => selected.has(w.id)))
  const allSelected = $derived(visibleWords.length > 0 && visibleWords.every((w) => selected.has(w.id)))

  // bulk actions only ever touch what the user can see, so changing the filter clears the selection
  function onSearch() {
    selected = new Set()
  }

  function toggleFilterTag(tag: string) {
    activeTags = filterTags.some((t) => sameTag(t, tag)) ? filterTags.filter((t) => !sameTag(t, tag)) : [...filterTags, tag]
    selected = new Set()
  }

  // clicking a tag on a word narrows the list to it (it never undoes: the active filter has the X)
  function filterByTag(tag: string) {
    if (!filterTags.some((t) => sameTag(t, tag))) toggleFilterTag(tag)
  }

  // renaming a tag, inline in the Tags section
  let renaming = $state<string | null>(null)
  let renameDraft = $state('')
  let renameError = $state('')

  function startRename(tag: string) {
    renaming = tag
    renameDraft = tag
    renameError = ''
  }

  function confirmRename(event: Event) {
    event.preventDefault()
    if (renaming === null) return
    renameError = validateTag(renameDraft)
    if (renameError) return
    const from = renaming
    const to = renameDraft.trim()
    const merges = !sameTag(from, to) && tags.some((t) => sameTag(t, to))
    if (merges && !confirm(`"${to}" already exists. Merge "${from}" into it?`)) return
    words = renameTag(words, from, to)
    // a merge keeps the spelling already in use, so read the final name back from the pool
    const name = allTags(words).find((t) => sameTag(t, to)) ?? to
    activeTags = cleanTags(filterTags.map((t) => (sameTag(t, from) ? name : t)))
    message = merges ? `Merged "${from}" into "${name}".` : `Renamed "${from}" to "${name}".`
    renaming = null
  }

  function deleteTagEverywhere(tag: string) {
    if (!confirm(`Remove the tag "${tag}" from all words?`)) return
    words = deleteTag(words, tag)
    // the list may grow if the tag was filtering it, so the selection must not outlive it
    activeTags = activeTags.filter((t) => !sameTag(t, tag))
    selected = new Set()
    message = `Tag "${tag}" removed from all words.`
  }

  // tags on the selected words, from a dialog opened by the tag button; a tag counts as on only when
  // every selected word has it, and each change applies to the whole selection straight away
  let tagDialogEl = $state<HTMLDialogElement>()
  const commonTags = $derived(tags.filter((t) => selectedWords.length > 0 && selectedWords.every((w) => w.tags.some((x) => sameTag(x, t)))))

  // tags seen while the dialog is open stay listed after being taken off, so × only deselects them
  let dialogTags = $state<string[]>([])
  const dialogChoices = $derived(cleanTags([...tags, ...dialogTags]))

  function setCommonTags(next: string[]) {
    dialogTags = cleanTags([...dialogTags, ...next])
    for (const tag of next) if (!commonTags.some((t) => sameTag(t, tag))) words = addTag(words, selected, tag)
    for (const tag of commonTags) if (!next.some((t) => sameTag(t, tag))) words = removeTag(words, selected, tag)
  }

  function openTagDialog() {
    dialogTags = [...tags]
    tagDialogEl?.showModal()
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
    words = words.map((w) => (selected.has(w.id) ? setDisabled(w, disabled) : w))
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
    downloadText(exportFilename(), exportJSON(selectedWords))
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
      const result = mergeWords(words, incoming)
      words = result.words
      message = importSummary(result, skipped)
      resetForm()
    } catch (e) {
      error = e instanceof Error ? e.message : 'Could not import the file.'
    }
  }

  const ROW = 'flex flex-wrap items-center gap-2'
  // buttons share the whole row evenly
  const WIDE = `${ROW} *:flex-1 *:text-center`
  const ICON = 'inline-flex p-1.5'
  const DIM = 'opacity-45'

  // only the buttons that change state animate on a theme switch; the third one would fade its background alone
  let previousTheme = $state<ThemePreference>()

  function chooseTheme(next: ThemePreference) {
    previousTheme = theme
    theme = next
  }
</script>

<h2 class="section-title">Theme</h2>
<div class={WIDE} role="group" aria-label="Theme">
  {#each THEMES as t (t.id)}
    <button
      class="duration-300"
      data-animate={t.id === theme || t.id === previousTheme ? '' : undefined}
      class:primary={theme === t.id}
      aria-pressed={theme === t.id}
      onclick={() => chooseTheme(t.id)}
    >{t.label}</button>
  {/each}
</div>

<h2 class="section-title">New word</h2>
<form class="grid gap-2" onsubmit={save}>
  <input type="text" class="field" lang="ja" placeholder="Japanese (e.g. 食べる)" bind:value={japanese} bind:this={japaneseEl} />
  <input type="text" class="field" lang="ja" placeholder="Hiragana (e.g. たべる)" bind:value={hiragana} />
  <input type="text" class="field" placeholder="Meaning (e.g. to eat)" bind:value={meaning} />
  <TagInput bind:tags={newTags} suggestions={tags} />
  <div class={WIDE}>
    <button class="primary" type="submit">Add</button>
  </div>
</form>

<dialog class="w-[min(420px,calc(100vw-32px))]" bind:this={dialogEl} onclose={() => (editingId = null)} use:closeOnBackdrop aria-label="Edit word">
  <form class="grid gap-2" onsubmit={saveEdit}>
    <h2 class="mt-0 mb-2">Edit word</h2>
    <input type="text" class="field" lang="ja" placeholder="Japanese (e.g. 食べる)" bind:value={editJapanese} />
    <input type="text" class="field" lang="ja" placeholder="Hiragana (e.g. たべる)" bind:value={editHiragana} />
    <input type="text" class="field" placeholder="Meaning (e.g. to eat)" bind:value={editMeaning} />
    {#key editingId}
      <TagInput bind:tags={editTags} suggestions={tags} />
    {/key}
    {#if editError}<p class="my-4 text-bad" role="alert">{editError}</p>{/if}
    <div class={ROW}>
      <button class="primary" type="submit">Save</button>
      <button type="button" onclick={() => dialogEl?.close()}>Cancel</button>
    </div>
  </form>
</dialog>

<dialog class="w-[min(420px,calc(100vw-32px))]" bind:this={tagDialogEl} use:closeOnBackdrop aria-label="Tag selected words">
  <div class="grid gap-2">
    <h2 class="mt-0 mb-2">Tag {selectedWords.length} selected word(s)</h2>
    <TagInput bind:tags={() => commonTags, setCommonTags} suggestions={dialogChoices} />
    <div class={ROW}>
      <button class="primary" type="button" onclick={() => tagDialogEl?.close()}>Done</button>
    </div>
  </div>
</dialog>

{#if error}<p class="my-4 text-bad" role="alert">{error}</p>{/if}
{#if message}<p class="my-4 text-muted" role="status">{message}</p>{/if}

<!-- the wrapper carries the divider because the title has a help icon -->
<div class="mt-6 mb-3 flex items-center gap-1.5 border-b-2 border-ink pb-2">
  <h2 class="m-0">Import and export</h2>
  <Help />
</div>
<div class={WIDE}>
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
  <Icon>
    <path d="M2 12c1.5-3.5 5-7 10-7s8.5 3.5 10 7c-1.5 3.5-5 7-10 7S3.5 15.5 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </Icon>
{/snippet}
{#snippet eyeOffIcon()}
  <Icon>
    <path d="M3 3l18 18M10.6 5.1A9.7 9.7 0 0 1 12 5c5 0 8.5 3.5 10 7a14 14 0 0 1-3 4.2M6.6 6.6A14 14 0 0 0 2 12c1.5 3.5 5 7 10 7a9.8 9.8 0 0 0 4.4-1M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  </Icon>
{/snippet}
{#snippet trashIcon()}
  <Icon>
    <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v5M14 11v5" />
  </Icon>
{/snippet}

<h2 class="section-title">Tags ({tags.length})</h2>
{#if tags.length === 0}
  <p class="my-4 text-muted">No tags yet. Add them when you add or edit a word, or with the tag button on selected words.</p>
{:else}
  <ul>
    {#each tags as tag (tag)}
      <li class="flex items-center gap-3 py-2.5">
        {#if renaming !== null && sameTag(renaming, tag)}
          <form class="flex flex-1 items-center gap-1.5" onsubmit={confirmRename}>
            <input type="text" class="field min-w-0 flex-1" aria-label={`New name for ${tag}`} bind:value={renameDraft} oninput={() => (renameError = '')} />
            <button class="primary" type="submit">Save</button>
            <button type="button" onclick={() => (renaming = null)}>Cancel</button>
          </form>
        {:else}
          <TagChip {tag} />
          <span class="text-muted">{filterByTags(words, [tag]).length} word(s)</span>
          <span class="dot-leader min-w-4 flex-1" aria-hidden="true"></span>
          <button class={ICON} onclick={() => startRename(tag)} aria-label={`Rename tag ${tag}`} title="Rename tag">
            <Icon>
              <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
            </Icon>
          </button>
          <button class="danger {ICON}" onclick={() => deleteTagEverywhere(tag)} aria-label={`Remove tag ${tag} from all words`} title="Remove tag from all words">
            {@render trashIcon()}
          </button>
        {/if}
      </li>
    {/each}
  </ul>
  {#if renaming !== null && renameError}<p class="my-4 text-bad" role="alert">{renameError}</p>{/if}
{/if}

<h2 class="section-title">Words ({visibleWords.length === words.length ? words.length : `${visibleWords.length} of ${words.length}`})</h2>
{#if words.length === 0}
  <p class="my-4 text-muted">No words yet.</p>
{:else}
  <div class="mb-2 flex flex-wrap items-center gap-2">
    <input
      type="search"
      class="field min-w-50 flex-1 appearance-none bg-surface px-3 py-2.5"
      placeholder="Search by word, reading, romaji or meaning"
      aria-label="Search words"
      bind:value={query}
      oninput={onSearch}
    />
    <div class="flex items-center gap-2">
      <select class="field chevron bg-surface" bind:value={sortKey} aria-label="Sort by">
        {#each SORT_OPTIONS as option (option.key)}
          <option value={option.key}>{option.label}</option>
        {/each}
      </select>
    </div>
  </div>
  {#if filterTags.length > 0}
    <div class="mb-2 flex flex-wrap items-center gap-1.5" role="group" aria-label="Active tag filter">
      <span class="text-muted">Tagged:</span>
      {#each filterTags as tag (tag)}
        <TagChip {tag} onremove={() => toggleFilterTag(tag)} />
      {/each}
    </div>
  {/if}
  <div class="{ROW} mb-2">
    <label class="flex items-center gap-1.5">
      <input type="checkbox" checked={allSelected} onchange={toggleSelectAll} />
      Select all
    </label>
    <span class="text-muted">{selectedWords.length} selected</span>
    <!-- keeps the space reserved so the layout does not shift when a selection appears -->
    <div class="ml-auto flex gap-2" class:invisible={selectedWords.length === 0}>
      <button class={ICON} onclick={() => onprint(selectedWords)} aria-label="Print writing sheet" title="Print writing sheet">
        <Icon>
          <path d="M7 9V3h10v6M7 17H4v-6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v6h-3M7 14h10v7H7z" />
        </Icon>
      </button>
      <button class={ICON} onclick={openTagDialog} aria-label="Tag selected" title="Tag selected">
        <Icon>
          <path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9zM8 8h.01" />
        </Icon>
      </button>
      <button class={ICON} onclick={() => setSelectedDisabled(false)} aria-label="Enable selected" title="Enable selected">
        {@render eyeIcon()}
      </button>
      <button class={ICON} onclick={() => setSelectedDisabled(true)} aria-label="Disable selected" title="Disable selected">
        {@render eyeOffIcon()}
      </button>
      <button class="danger {ICON}" onclick={removeSelected} aria-label="Delete selected" title="Delete selected">
        {@render trashIcon()}
      </button>
    </div>
    <button
      class="no-hover {ICON}"
      onclick={() => (sortDirection = sortDirection === 'asc' ? 'desc' : 'asc')}
      aria-label={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
      title={sortDirection === 'asc' ? 'Ascending (click to reverse)' : 'Descending (click to reverse)'}
    >
      <Icon>
        {#if sortDirection === 'asc'}
          <path d="M12 19V5M5 12l7-7 7 7" />
        {:else}
          <path d="M12 5v14M5 12l7 7 7-7" />
        {/if}
      </Icon>
    </button>
  </div>
  {#if visibleWords.length === 0}
    <p class="my-4 text-muted">No words match your search or tag filter.</p>
  {/if}
  <ul>
    {#each visibleWords as word (word.id)}
      <li class="flex items-center gap-3 py-2.5">
        <input
          type="checkbox"
          checked={selected.has(word.id)}
          onchange={() => toggleSelected(word.id)}
          aria-label={`Select ${word.japanese}`}
        />
        <span class={["text-[1.3rem]", word.disabled && DIM]} lang="ja">{word.japanese}</span>
        <span class={["text-[0.9rem] text-muted", word.disabled && DIM]} lang="ja">{word.hiragana} · {toDisplayRomaji(word.hiragana)}</span>
        {#if needsMeaning(word)}
          <span class={["min-w-0 truncate text-warn italic", word.disabled && DIM]} title="Add a meaning to practice this word by meaning">needs meaning</span>
        {:else}
          <span class={["min-w-0 truncate", word.disabled && DIM]}>{word.meaning}</span>
        {/if}
        {#each word.tags as tag (tag)}<TagChip {tag} onclick={() => filterByTag(tag)} />{/each}
        <span class="dot-leader min-w-4 flex-1" aria-hidden="true"></span>
        <button
          class={ICON}
          onclick={() => toggle(word)}
          aria-pressed={!word.disabled}
          aria-label={word.disabled ? 'Enable' : 'Disable'}
          title={word.disabled ? 'Enable' : 'Disable'}
        >
          {#if word.disabled}{@render eyeOffIcon()}{:else}{@render eyeIcon()}{/if}
        </button>
        <button class={ICON} onclick={() => edit(word)} aria-label="Edit" title="Edit">
          <Icon>
            <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
          </Icon>
        </button>
        <button class="danger {ICON}" onclick={() => remove(word)} aria-label="Delete" title="Delete">
          {@render trashIcon()}
        </button>
      </li>
    {/each}
  </ul>
{/if}
