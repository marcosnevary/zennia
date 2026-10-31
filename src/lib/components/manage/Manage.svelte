<script lang="ts">
  import Icon from '../Icon.svelte'
  import { closeOnBackdrop } from './dialog'
  import KanaSelector from './KanaSelector.svelte'
  import Pagination from '../Pagination.svelte'
  import TagChip from './TagChip.svelte'
  import TagInput from './TagInput.svelte'
  import TagsDialog from './TagsDialog.svelte'
  import { paginate } from '../../data/pagination'
  import { toDisplayRomaji } from '../../core/romaji'
  import { defaultKanaSelection } from '../../core/kana'
  import type { Word } from '../../core/types'
  import { getApp } from '../../state.svelte'
  import {
    addTag,
    allTags,
    cleanTags,
    deleteTag,
    filterByTags,
    makeWord,
    needsMeaning,
    removeTag,
    renameTag,
    sameTag,
    searchWords,
    SORT_OPTIONS,
    setDisabled,
    sortWords,
    updateWord,
    validateWord,
    type SortDirection,
    type SortKey,
    type WordErrors,
  } from '../../data/words'

  const app = getApp()
  const words = $derived(app.words)

  let japanese = $state('')
  let hiragana = $state('')
  let meaning = $state('')
  let newTags = $state<string[]>([])
  let editingId = $state<string | null>(null)
  let editJapanese = $state('')
  let editHiragana = $state('')
  let editMeaning = $state('')
  let editTags = $state<string[]>([])
  let editErrors = $state<WordErrors>({})
  let dialogEl = $state<HTMLDialogElement>()
  let errors = $state<WordErrors>({})
  let japaneseEl = $state<HTMLInputElement>()

  let { section }: { section: 'words' | 'kana' } = $props()

  function resetForm() {
    japanese = ''
    hiragana = ''
    meaning = ''
    newTags = []
    errors = {}
  }

  function save(event: Event) {
    event.preventDefault()
    const fields = { japanese, hiragana, meaning, tags: newTags }
    errors = validateWord(fields)
    if (Object.keys(errors).length) return
    app.setWords([makeWord(fields), ...words])
    resetForm()
    japaneseEl?.focus()
  }

  function edit(word: Word) {
    editingId = word.id
    editJapanese = word.japanese
    editHiragana = word.hiragana
    editMeaning = word.meaning
    editTags = [...word.tags]
    editErrors = {}
    dialogEl?.showModal()
  }

  function saveEdit(event: Event) {
    event.preventDefault()
    const fields = { japanese: editJapanese, hiragana: editHiragana, meaning: editMeaning, tags: editTags }
    editErrors = validateWord(fields)
    if (Object.keys(editErrors).length) return
    app.setWords(words.map((w) => (w.id === editingId ? updateWord(w, fields) : w)))
    dialogEl?.close()
  }

  function remove(word: Word) {
    if (!confirm(`Delete "${word.japanese}"?`)) return
    app.setWords(words.filter((w) => w.id !== word.id))
  }

  function toggle(word: Word) {
    app.setWords(words.map((w) => (w.id === word.id ? setDisabled(w, !w.disabled) : w)))
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
  let pageNumber = $state(1)
  const current = $derived(paginate(visibleWords, pageNumber))
  const selectedWords = $derived(words.filter((w) => selected.has(w.id)))
  const allSelected = $derived(visibleWords.length > 0 && visibleWords.every((w) => selected.has(w.id)))

  // bulk actions only ever touch what the user can see, so changing the filter clears the selection
  function onSearch() {
    selected = new Set()
    pageNumber = 1
  }

  function toggleFilterTag(tag: string) {
    activeTags = filterTags.some((t) => sameTag(t, tag)) ? filterTags.filter((t) => !sameTag(t, tag)) : [...filterTags, tag]
    selected = new Set()
    pageNumber = 1
  }

  // clicking a tag on a word narrows the list to it (it never undoes: the active filter has the X)
  function filterByTag(tag: string) {
    if (!filterTags.some((t) => sameTag(t, tag))) toggleFilterTag(tag)
  }

  let tagsDialog = $state<TagsDialog>()

  function renameTagEverywhere(from: string, to: string) {
    app.setWords(renameTag(words, from, to))
    // a merge keeps the spelling already in use, so read the final name back from the pool
    const name = allTags(words).find((t) => sameTag(t, to)) ?? to
    activeTags = cleanTags(filterTags.map((t) => (sameTag(t, from) ? name : t)))
  }

  function deleteTagEverywhere(tag: string) {
    app.setWords(deleteTag(words, tag))
    // the list may grow if the tag was filtering it, so the selection must not outlive it
    activeTags = activeTags.filter((t) => !sameTag(t, tag))
    selected = new Set()
    pageNumber = 1
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
    for (const tag of next) if (!commonTags.some((t) => sameTag(t, tag))) app.setWords(addTag(words, selected, tag))
    for (const tag of commonTags) if (!next.some((t) => sameTag(t, tag))) app.setWords(removeTag(words, selected, tag))
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
    app.setWords(words.map((w) => (selected.has(w.id) ? setDisabled(w, disabled) : w)))
    selected = new Set()
  }

  function removeSelected() {
    const count = selectedWords.length
    if (!confirm(`Delete ${count} selected word(s)?`)) return
    app.setWords(words.filter((w) => !selected.has(w.id)))
    selected = new Set()
  }

  const ROW = 'flex flex-wrap items-center gap-2'
  // buttons share the whole row evenly
  const WIDE = `${ROW} *:flex-1 *:text-center`
  const ICON = 'inline-flex p-1.5'
  const DIM = 'opacity-45'
</script>

<div>

<dialog class="w-[min(420px,calc(100vw-32px))]" bind:this={dialogEl} onclose={() => (editingId = null)} use:closeOnBackdrop aria-label="Edit word">
  <form class="grid gap-2" onsubmit={saveEdit}>
    <h2 class="mt-0 mb-2">Edit word</h2>
    <input type="text" class="field" lang="ja" placeholder="Japanese (e.g. 食べる)" bind:value={editJapanese} aria-invalid={!!editErrors.japanese} oninput={() => (editErrors.japanese = '')} />
    {@render fieldError(editErrors.japanese)}
    <input type="text" class="field" lang="ja" placeholder="Hiragana (e.g. たべる)" bind:value={editHiragana} aria-invalid={!!editErrors.hiragana} oninput={() => (editErrors.hiragana = '')} />
    {@render fieldError(editErrors.hiragana)}
    <input type="text" class="field" placeholder="Meaning (e.g. to eat)" bind:value={editMeaning} aria-invalid={!!editErrors.meaning} oninput={() => (editErrors.meaning = '')} />
    {@render fieldError(editErrors.meaning)}
    {#key editingId}
      <TagInput bind:tags={editTags} suggestions={tags} />
    {/key}
    <div class={ROW}>
      <button class="action" type="submit">Save</button>
      <button type="button" onclick={() => dialogEl?.close()}>Cancel</button>
    </div>
  </form>
</dialog>

<dialog class="w-[min(420px,calc(100vw-32px))]" bind:this={tagDialogEl} use:closeOnBackdrop aria-label="Tag selected words">
  <div class="grid gap-2">
    <h2 class="mt-0 mb-2">Tag {selectedWords.length} selected word(s)</h2>
    <TagInput bind:tags={() => commonTags, setCommonTags} suggestions={dialogChoices} />
    <div class={ROW}>
      <button class="action" type="button" onclick={() => tagDialogEl?.close()}>Done</button>
    </div>
  </div>
</dialog>

<TagsDialog
  bind:this={tagsDialog}
  {tags}
  {words}
  active={filterTags}
  ontoggle={toggleFilterTag}
  onrename={renameTagEverywhere}
  ondelete={deleteTagEverywhere}
/>

{#snippet fieldError(message: string | undefined)}
  {#if message}<p class="text-bad" role="alert">{message}</p>{/if}
{/snippet}
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
{#snippet tagIcon()}
  <Icon>
    <path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9zM8 8h.01" />
  </Icon>
{/snippet}
{#snippet trashIcon()}
  <Icon>
    <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v5M14 11v5" />
  </Icon>
{/snippet}

{#if section === 'words'}
<div class="grid items-start gap-x-8 gap-y-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,3fr)]">
<div>
<h2 class="section-title">New word</h2>
<form class="grid gap-2" onsubmit={save}>
  <input type="text" class="field" lang="ja" placeholder="Japanese (e.g. 食べる)" bind:value={japanese} bind:this={japaneseEl} aria-invalid={!!errors.japanese} oninput={() => (errors.japanese = '')} />
  {@render fieldError(errors.japanese)}
  <input type="text" class="field" lang="ja" placeholder="Hiragana (e.g. たべる)" bind:value={hiragana} aria-invalid={!!errors.hiragana} oninput={() => (errors.hiragana = '')} />
  {@render fieldError(errors.hiragana)}
  <input type="text" class="field" placeholder="Meaning (e.g. to eat)" bind:value={meaning} aria-invalid={!!errors.meaning} oninput={() => (errors.meaning = '')} />
  {@render fieldError(errors.meaning)}
  <TagInput bind:tags={newTags} suggestions={tags} />
  <div class={WIDE}>
    <button class="action" type="submit">Add</button>
  </div>
</form>
</div>
<div>
<h2 class="section-title">Words ({visibleWords.length === words.length ? words.length : `${visibleWords.length} of ${words.length}`})</h2>
{#if words.length === 0}
  <p class="my-4 text-muted">No words yet.</p>
{:else}
  <div class="mb-2 flex flex-wrap items-center gap-2">
    <input
      type="search"
      class="field min-w-50 flex-1 appearance-none bg-surface py-2.5"
      placeholder="Search by word, reading, romaji or meaning"
      aria-label="Search words"
      bind:value={query}
      oninput={onSearch}
    />
    <div class="flex items-center gap-2">
      <button class="field inline-flex items-center gap-1.5 font-ui" onclick={() => tagsDialog?.open()}>
        {@render tagIcon()}
        Tags{filterTags.length ? ` (${filterTags.length})` : ''}
      </button>
      <select class="field chevron" bind:value={sortKey} onchange={() => (pageNumber = 1)} aria-label="Sort by">
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
      Select all {visibleWords.length} {visibleWords.length === words.length ? 'words' : 'results'}
    </label>
    <span class="text-muted">{selectedWords.length} selected</span>
    <!-- keeps the space reserved so the layout does not shift when a selection appears -->
    <div class="ml-auto flex gap-2" class:invisible={selectedWords.length === 0}>
      <button class={ICON} onclick={() => (app.sheetWords = selectedWords)} aria-label="Print writing sheet" title="Print writing sheet">
        <Icon>
          <path d="M7 9V3h10v6M7 17H4v-6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v6h-3M7 14h10v7H7z" />
        </Icon>
      </button>
      <button class={ICON} onclick={openTagDialog} aria-label="Tag selected" title="Tag selected">
        {@render tagIcon()}
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
      class={ICON}
      onclick={() => {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc'
        pageNumber = 1
      }}
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
    {#each current.items as word (word.id)}
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
  <Pagination page={current.page} pageCount={current.pageCount} label="Word pages" onchange={(n) => (pageNumber = n)} />
{/if}
</div>
</div>
{/if}

{#if section === 'kana'}
<KanaSelector selected={app.settings.kanaSelection ?? defaultKanaSelection()} onchange={(keys) => app.setKanaSelection(keys)} />
{/if}
</div>
