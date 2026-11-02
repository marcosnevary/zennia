<script lang="ts">
  import Check from '@lucide/svelte/icons/check'
  import Trash from '@lucide/svelte/icons/trash'
  import Pagination from '../Pagination.svelte'
  import TagChip from './TagChip.svelte'
  import { closeOnBackdrop } from './dialog'
  import type { Word } from '../../core/types'
  import { paginate } from '../../data/pagination'
  import { filterByTags, matchTags, sameTag, validateTag } from '../../data/words'

  let {
    tags,
    words,
    onrename,
    ondelete,
  }: {
    tags: string[]
    words: Word[]
    onrename: (from: string, to: string) => void
    ondelete: (tags: string[]) => void
  } = $props()

  let dialogEl = $state<HTMLDialogElement>()
  let query = $state('')
  const visibleTags = $derived(matchTags(tags, query))
  let pageNumber = $state(1)
  const current = $derived(paginate(visibleTags, pageNumber))

  // selection (tags that no longer exist are ignored)
  let selected = $state<string[]>([])
  const selectedTags = $derived(tags.filter((t) => isSelected(t)))
  const allSelected = $derived(visibleTags.length > 0 && visibleTags.every((t) => isSelected(t)))

  let renaming = $state<string | null>(null)
  let renameDraft = $state('')
  let renameError = $state('')

  export function open() {
    query = ''
    pageNumber = 1
    selected = []
    renaming = null
    dialogEl?.showModal()
  }

  function isSelected(tag: string): boolean {
    return selected.some((t) => sameTag(t, tag))
  }

  function toggleSelected(tag: string) {
    selected = isSelected(tag) ? selected.filter((t) => !sameTag(t, tag)) : [...selected, tag]
  }

  function toggleSelectAll() {
    selected = allSelected ? [] : [...visibleTags]
  }

  // bulk actions only ever touch what the user can see, so changing the search clears the selection
  function onSearch() {
    selected = []
    pageNumber = 1
  }

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
    onrename(from, to)
    selected = selected.filter((t) => !sameTag(t, from))
    renaming = null
  }

  function removeSelected() {
    if (!confirm(`Remove ${selectedTags.length} selected tag(s) from all words?`)) return
    ondelete(selectedTags)
    selected = []
  }


  // the double click's two clicks have already toggled the selection there and back, so it ends as it was;
  // a double click would otherwise highlight the tag under the pointer
  function onRowMouseDown(event: MouseEvent) {
    if (event.detail > 1) event.preventDefault()
  }

  // Enter stands in for the double click, the only other way to rename a tag
  function onRowKey(event: KeyboardEvent, tag: string) {
    if (event.target !== event.currentTarget) return
    if (event.key === ' ') toggleSelected(tag)
    else if (event.key === 'Enter') startRename(tag)
    else return
    event.preventDefault()
  }
</script>

<dialog class="w-[min(420px,calc(100vw-32px))]" bind:this={dialogEl} use:closeOnBackdrop aria-label="Tags">
  <div class="grid gap-2">
    <h2 class="mt-0 mb-2">Tags ({visibleTags.length === tags.length ? tags.length : `${visibleTags.length} of ${tags.length}`})</h2>
    {#if tags.length === 0}
      <p class="my-4 text-muted">No tags yet. Add them when you add or edit a word, or with the tag button on selected words.</p>
    {:else}
      <input
        type="search"
        class="field appearance-none"
        placeholder="Search tags"
        aria-label="Search tags"
        bind:value={query}
        oninput={onSearch}
      />
      <div class="flex flex-wrap items-center gap-2">
        <label class="flex items-center gap-2">
          <input type="checkbox" checked={allSelected} onchange={toggleSelectAll} />
          Select all {visibleTags.length} {visibleTags.length === tags.length ? 'tags' : 'results'}
        </label>
        <span class="text-muted">{selectedTags.length} selected</span>
        <!-- keeps the space reserved so the layout does not shift when a selection appears; the icon is 20px in a 40px button -->
        <button
          class="danger icon ml-auto size-10 items-center justify-center [&_svg]:size-5"
          class:invisible={selectedTags.length === 0}
          onclick={removeSelected}
          aria-label="Remove selected tags from all words"
          title="Remove selected tags from all words"
        >
          <Trash />
        </button>
      </div>
      {#if visibleTags.length === 0}
        <p class="my-4 text-muted">No tags match your search.</p>
      {/if}
      <ul class="grid gap-2">
        {#each current.items as tag (tag)}
          <li>
            {#if renaming !== null && sameTag(renaming, tag)}
              <form class="flex items-center gap-2" onsubmit={confirmRename}>
                <input type="text" class="field min-w-0 flex-1" aria-label={`New name for ${tag}`} bind:value={renameDraft} oninput={() => (renameError = '')} />
                <button class="action" type="submit"><Check />Save</button>
                <button type="button" onclick={() => (renaming = null)}>Cancel</button>
              </form>
            {:else}
              <div
                class={[
                  'flex min-h-10 cursor-pointer items-center gap-3 rounded-control px-3 py-1 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action motion-reduce:transition-none',
                  isSelected(tag) ? 'bg-action/10 hover:bg-action/15 active:bg-action/20' : 'hover:bg-tint active:bg-tint-pressed',
                ]}
                role="checkbox"
                tabindex="0"
                aria-checked={isSelected(tag)}
                aria-label={`Select ${tag}`}
                onclick={() => toggleSelected(tag)}
                ondblclick={() => startRename(tag)}
                onmousedown={onRowMouseDown}
                onkeydown={(event) => onRowKey(event, tag)}
              >
                <TagChip {tag} />
                <span class="min-w-4 flex-1" aria-hidden="true"></span>
                <span class="text-sm text-muted">{filterByTags(words, [tag]).length} word(s)</span>
              </div>
            {/if}
          </li>
        {/each}
      </ul>
      {#if renaming !== null && renameError}<p class="text-bad" role="alert">{renameError}</p>{/if}
      <Pagination page={current.page} pageCount={current.pageCount} label="Tag pages" onchange={(n) => (pageNumber = n)} />
    {/if}
    <div class="dialog-actions">
      <button class="action" type="button" onclick={() => dialogEl?.close()}><Check />Done</button>
    </div>
  </div>
</dialog>
