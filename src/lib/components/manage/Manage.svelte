<script lang="ts">
  import ArrowDown from '@lucide/svelte/icons/arrow-down'
  import ArrowUp from '@lucide/svelte/icons/arrow-up'
  import Check from '@lucide/svelte/icons/check'
  import Eye from '@lucide/svelte/icons/eye'
  import EyeOff from '@lucide/svelte/icons/eye-off'
  import ListPlus from '@lucide/svelte/icons/list-plus'
  import Plus from '@lucide/svelte/icons/plus'
  import Printer from '@lucide/svelte/icons/printer'
  import Tag from '@lucide/svelte/icons/tag'
  import Tags from '@lucide/svelte/icons/tags'
  import Trash from '@lucide/svelte/icons/trash'
  import { closeOnBackdrop } from './dialog'
  import KanaSelector from './KanaSelector.svelte'
  import Pagination from '../Pagination.svelte'
  import RomajiWordsDialog from './RomajiWordsDialog.svelte'
  import Switch from '../Switch.svelte'
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

  function toggle(word: Word) {
    app.setWords(words.map((w) => (w.id === word.id ? setDisabled(w, !w.disabled) : w)))
  }

  // selection (ids that no longer exist are ignored)
  let selected = $state<Set<string>>(new Set())
  let query = $state('')
  const sortKey = $derived(app.settings.wordsSort)
  const sortDirection = $derived(app.settings.wordsSortDirection)
  // the tag filter: only tags still in use count, so deleting the last word with a tag drops it from the filter
  const tags = $derived(allTags(words))
  let activeTags = $state<string[]>([])
  const filterTags = $derived(activeTags.filter((a) => tags.some((t) => sameTag(t, a))))
  const visibleWords = $derived(sortWords(searchWords(filterByTags(words, filterTags), query), sortKey, sortDirection))
  const activeWordCount = $derived(visibleWords.filter((w) => !w.disabled).length)
  let pageNumber = $state(1)
  const current = $derived(paginate(visibleWords, pageNumber))

  function setSort(key: SortKey, direction: SortDirection) {
    app.setWordsSort(key, direction)
    pageNumber = 1
  }

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
  let romajiDialog = $state<RomajiWordsDialog>()

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

  // the buttons and tag chips inside a card do their own thing, so a click on them must not also select or edit it
  function onButton(event: MouseEvent): boolean {
    return !!(event.target as Element).closest('button')
  }

  function onCardClick(event: MouseEvent, id: string) {
    if (!onButton(event)) toggleSelected(id)
  }

  // the double click's two clicks have already toggled the selection there and back, so it ends as it was
  function onCardDoubleClick(event: MouseEvent, word: Word) {
    if (!onButton(event)) edit(word)
  }

  // a double click would otherwise highlight the word under the pointer
  function onCardMouseDown(event: MouseEvent) {
    if (event.detail > 1) event.preventDefault()
  }

  // Enter stands in for the double click, the only other way to edit a word
  function onCardKey(event: KeyboardEvent, word: Word) {
    if (event.target !== event.currentTarget) return
    if (event.key === ' ') toggleSelected(word.id)
    else if (event.key === 'Enter') edit(word)
    else return
    event.preventDefault()
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
    <div class="dialog-actions">
      <button class="action" type="submit"><Check />Save</button>
      <button type="button" onclick={() => dialogEl?.close()}>Cancel</button>
    </div>
  </form>
</dialog>

<dialog class="w-[min(420px,calc(100vw-32px))]" bind:this={tagDialogEl} use:closeOnBackdrop aria-label="Tag selected words">
  <div class="grid gap-2">
    <h2 class="mt-0 mb-2">Tag {selectedWords.length} selected word(s)</h2>
    <TagInput bind:tags={() => commonTags, setCommonTags} suggestions={dialogChoices} />
    <div class="dialog-actions">
      <button class="action" type="button" onclick={() => tagDialogEl?.close()}><Check />Done</button>
    </div>
  </div>
</dialog>

<TagsDialog
  bind:this={tagsDialog}
  {tags}
  {words}
  onrename={renameTagEverywhere}
  ondelete={deleteTagEverywhere}
/>

<RomajiWordsDialog bind:this={romajiDialog} {tags} />

{#snippet fieldError(message: string | undefined)}
  {#if message}<p class="text-bad" role="alert">{message}</p>{/if}
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
    <button class="action" type="submit"><Plus />Add</button>
  </div>
</form>
<div class="mt-2 {WIDE}">
  <button type="button" class="field" onclick={() => romajiDialog?.open()}><ListPlus />Add from romaji</button>
</div>
</div>
<div>
<h2 class="section-title">Words ({visibleWords.length === words.length ? words.length : `${visibleWords.length} of ${words.length}`})</h2>
{#if words.length === 0}
  <p class="my-4 text-muted">No words yet.</p>
{:else}
  <div class="mb-2 flex flex-wrap items-center gap-2">
    <input
      type="search"
      class="field min-w-50 flex-1 appearance-none"
      placeholder="Search by word, reading, romaji or meaning"
      aria-label="Search words"
      bind:value={query}
      oninput={onSearch}
    />
    <div class="flex items-center gap-2">
      <button class="field" onclick={() => tagsDialog?.open()}><Tags />Tags</button>
      <select
        class="field chevron"
        value={sortKey}
        onchange={(e) => setSort(e.currentTarget.value as SortKey, sortDirection)}
        aria-label="Sort by"
      >
        {#each SORT_OPTIONS as option (option.key)}
          <option value={option.key}>{option.label}</option>
        {/each}
      </select>
    </div>
  </div>
  {#if filterTags.length > 0}
    <div class="mb-2 flex flex-wrap items-center gap-2" role="group" aria-label="Active tag filter">
      <span class="text-muted">Tagged:</span>
      {#each filterTags as tag (tag)}
        <TagChip {tag} onremove={() => toggleFilterTag(tag)} />
      {/each}
    </div>
  {/if}
  <div class="{ROW} mb-2">
    <label class="flex items-center gap-2">
      <input type="checkbox" checked={allSelected} onchange={toggleSelectAll} />
      Select all {visibleWords.length} {visibleWords.length === words.length ? 'words' : 'results'}
    </label>
    <span class="text-muted">{activeWordCount} active · {selectedWords.length} selected</span>
    <!-- keeps the space reserved so the layout does not shift when a selection appears; the icons are 20px in 40px buttons -->
    <div class="ml-auto flex gap-2 *:size-10 *:items-center *:justify-center [&_svg]:size-5" class:invisible={selectedWords.length === 0}>
      <button class="icon" onclick={() => (app.sheetWords = selectedWords)} aria-label="Print writing sheet" title="Print writing sheet">
        <Printer />
      </button>
      <button class="icon" onclick={openTagDialog} aria-label="Tag selected" title="Tag selected">
        <Tag />
      </button>
      <button class="icon" onclick={() => setSelectedDisabled(false)} aria-label="Enable selected" title="Enable selected">
        <Eye />
      </button>
      <button class="icon" onclick={() => setSelectedDisabled(true)} aria-label="Disable selected" title="Disable selected">
        <EyeOff />
      </button>
      <button class="danger icon" onclick={removeSelected} aria-label="Delete selected" title="Delete selected">
        <Trash />
      </button>
    </div>
    <button
      class="icon"
      onclick={() => setSort(sortKey, sortDirection === 'asc' ? 'desc' : 'asc')}
      aria-label={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
      title={sortDirection === 'asc' ? 'Ascending (click to reverse)' : 'Descending (click to reverse)'}
    >
      {#if sortDirection === 'asc'}<ArrowUp />{:else}<ArrowDown />{/if}
    </button>
  </div>
  {#if visibleWords.length === 0}
    <p class="my-4 text-muted">No words match your search or tag filter.</p>
  {/if}
  <ul class="grid gap-2">
    {#each current.items as word (word.id)}
      <li>
        <div
          class={[
            'flex cursor-pointer items-center gap-3 rounded-control px-3 py-1 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action motion-reduce:transition-none',
            selected.has(word.id) ? 'bg-action/10 hover:bg-action/15 active:not-has-[button:active]:bg-action/20' : 'hover:bg-tint active:not-has-[button:active]:bg-tint-pressed',
          ]}
          role="checkbox"
          tabindex="0"
          aria-checked={selected.has(word.id)}
          aria-label={`Select ${word.japanese}`}
          onclick={(event) => onCardClick(event, word.id)}
          ondblclick={(event) => onCardDoubleClick(event, word)}
          onmousedown={onCardMouseDown}
          onkeydown={(event) => onCardKey(event, word)}
        >
          <span class={["text-lg", word.disabled && DIM]} lang="ja">{word.japanese}</span>
          <span class={["text-sm text-muted", word.disabled && DIM]} lang="ja">{word.japanese === word.hiragana ? '' : `${word.hiragana} · `}{toDisplayRomaji(word.hiragana)}</span>
          {#if needsMeaning(word)}
            <span class={["min-w-0 truncate text-warn italic", word.disabled && DIM]} title="Add a meaning to practice this word by meaning">Needs meaning</span>
          {:else}
            <span class={["min-w-0 truncate", word.disabled && DIM]}>{word.meaning}</span>
          {/if}
          {#if word.tags.length > 0}
            <span class="flex gap-1">{#each word.tags as tag (tag)}<TagChip {tag} onclick={() => filterByTag(tag)} />{/each}</span>
          {/if}
          <span class="min-w-4 flex-1" aria-hidden="true"></span>
          <Switch checked={!word.disabled} onchange={() => toggle(word)} label="Enabled" title={word.disabled ? 'Enable' : 'Disable'} />
        </div>
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
