<script lang="ts">
  import Icon from '../Icon.svelte'
  import TagChip from './TagChip.svelte'
  import { closeOnBackdrop } from './dialog'
  import type { Word } from '../../core/types'
  import { filterByTags, matchTags, sameTag, validateTag } from '../../data/words'

  let {
    tags,
    words,
    active,
    ontoggle,
    onrename,
    ondelete,
  }: {
    tags: string[]
    words: Word[]
    active: string[]
    ontoggle: (tag: string) => void
    onrename: (from: string, to: string) => void
    ondelete: (tag: string) => void
  } = $props()

  let dialogEl = $state<HTMLDialogElement>()
  let query = $state('')
  const visibleTags = $derived(matchTags(tags, query))

  let renaming = $state<string | null>(null)
  let renameDraft = $state('')
  let renameError = $state('')

  export function open() {
    query = ''
    renaming = null
    dialogEl?.showModal()
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
    renaming = null
  }

  function remove(tag: string) {
    if (!confirm(`Remove the tag "${tag}" from all words?`)) return
    ondelete(tag)
  }

  const ICON = 'inline-flex p-1.5'
</script>

<dialog class="w-[min(420px,calc(100vw-32px))]" bind:this={dialogEl} use:closeOnBackdrop aria-label="Tags">
  <div class="grid gap-2">
    <h2 class="mt-0 mb-2">Tags ({tags.length})</h2>
    {#if tags.length === 0}
      <p class="my-4 text-muted">No tags yet. Add them when you add or edit a word, or with the tag button on selected words.</p>
    {:else}
      <input
        type="search"
        class="field appearance-none bg-surface py-2.5"
        placeholder="Search tags"
        aria-label="Search tags"
        bind:value={query}
      />
      {#if visibleTags.length === 0}
        <p class="my-4 text-muted">No tags match your search.</p>
      {/if}
      <ul class="max-h-[60vh] overflow-y-auto">
        {#each visibleTags as tag (tag)}
          <li class="flex items-center gap-3 py-2.5">
            {#if renaming !== null && sameTag(renaming, tag)}
              <form class="flex flex-1 items-center gap-1.5" onsubmit={confirmRename}>
                <input type="text" class="field min-w-0 flex-1" aria-label={`New name for ${tag}`} bind:value={renameDraft} oninput={() => (renameError = '')} />
                <button class="action" type="submit">Save</button>
                <button type="button" onclick={() => (renaming = null)}>Cancel</button>
              </form>
            {:else}
              <label class="flex items-center gap-3">
                <input type="checkbox" checked={active.some((t) => sameTag(t, tag))} onchange={() => ontoggle(tag)} aria-label={`Filter by ${tag}`} />
                <TagChip {tag} />
                <span class="text-muted">{filterByTags(words, [tag]).length} word(s)</span>
              </label>
              <span class="dot-leader min-w-4 flex-1" aria-hidden="true"></span>
              <button class={ICON} onclick={() => startRename(tag)} aria-label={`Rename tag ${tag}`} title="Rename tag">
                <Icon>
                  <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
                </Icon>
              </button>
              <button class="danger {ICON}" onclick={() => remove(tag)} aria-label={`Remove tag ${tag} from all words`} title="Remove tag from all words">
                <Icon>
                  <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v5M14 11v5" />
                </Icon>
              </button>
            {/if}
          </li>
        {/each}
      </ul>
      {#if renaming !== null && renameError}<p class="text-bad" role="alert">{renameError}</p>{/if}
    {/if}
    <div class="flex flex-wrap items-center gap-2">
      <button class="action" type="button" onclick={() => dialogEl?.close()}>Done</button>
    </div>
  </div>
</dialog>
