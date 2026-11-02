<script lang="ts">
  import ChevronDown from '@lucide/svelte/icons/chevron-down'
  import Plus from '@lucide/svelte/icons/plus'
  import Search from '@lucide/svelte/icons/search'
  import TagInput from './TagInput.svelte'
  import { closeOnBackdrop } from './dialog'
  import { plural } from '../../core/plural'
  import { toDisplayRomaji } from '../../core/romaji'
  import { loadDictionary, lookUp, parseRomajiList, type Candidate, type RomajiItem } from '../../data/dictionary'
  import { importSummary, makeWord, wordReading } from '../../data/words'
  import { getApp } from '../../state.svelte'

  let { tags }: { tags: string[] } = $props()

  const app = getApp()

  interface Row {
    item: RomajiItem
    candidates: Candidate[]
    choice: number
    selected: boolean
  }

  let dialogEl = $state<HTMLDialogElement>()
  let text = $state('')
  let batchTags = $state<string[]>([])
  let rows = $state<Row[]>([])
  let loading = $state(false)
  let error = $state('')
  let message = $state('')

  const chosen = $derived(rows.filter((r) => r.selected))
  const found = $derived(rows.filter((r) => r.candidates.length > 0))
  const notFound = $derived(rows.filter((r) => r.candidates.length === 0))
  const differs = (row: Row) => row.candidates[row.choice]?.verdict === 'almost'
  const allSelected = $derived(found.every((r) => r.selected))

  function toggleSelectAll() {
    const next = !allSelected
    for (const row of found) row.selected = next
  }

  // the candidate select inside a row does its own thing, so a click on it must not also toggle the row
  function onRowClick(event: MouseEvent, row: Row) {
    if (!(event.target as Element).closest('select')) row.selected = !row.selected
  }

  // a double click would otherwise highlight the word under the pointer
  function onRowMouseDown(event: MouseEvent) {
    if (event.detail > 1) event.preventDefault()
  }

  function onRowKey(event: KeyboardEvent, row: Row) {
    if (event.target !== event.currentTarget || event.key !== ' ') return
    row.selected = !row.selected
    event.preventDefault()
  }

  export function open() {
    text = ''
    batchTags = []
    rows = []
    error = ''
    message = ''
    dialogEl?.showModal()
  }

  async function look(event: Event) {
    event.preventDefault()
    loading = true
    error = ''
    message = ''
    try {
      const dictionary = await loadDictionary()
      rows = parseRomajiList(text).map((item) => {
        const candidates = lookUp(dictionary, item)
        return { item, candidates, choice: 0, selected: candidates.length > 0 }
      })
    } catch {
      error = 'Could not load the dictionary. Check your connection and try again.'
    } finally {
      loading = false
    }
  }

  function add() {
    const result = app.importWords(
      chosen.map((row) => {
        const { japanese, hiragana, meaning } = row.candidates[row.choice]
        return makeWord({ japanese, hiragana, meaning, tags: batchTags })
      }),
    )
    message = importSummary(result, 0)
    text = ''
    rows = []
  }
</script>

<dialog class="w-[min(720px,calc(100vw-32px))]" bind:this={dialogEl} use:closeOnBackdrop aria-label="Add from romaji">
  <div class="grid gap-2">
    <h2 class="mt-0 mb-2">Add from romaji</h2>
    {#if rows.length === 0}
      <form class="grid gap-2" onsubmit={look}>
        <textarea
          class="field resize-none field-sizing-content"
          rows="1"
          placeholder="Words in romaji (e.g. neko, taberu, hashi)"
          aria-label="Words in romaji"
          bind:value={text}
        ></textarea>
        <p class="text-muted">Separate the words with commas or new lines. A hint in parentheses, e.g. hashi (chopsticks), picks the word whose meaning contains it.</p>
        <TagInput bind:tags={batchTags} suggestions={tags} />
        {#if error}<p class="text-bad" role="alert">{error}</p>{/if}
        {#if message}<p role="status">{message}</p>{/if}
        <div class="dialog-actions">
          <button class="action" type="submit" disabled={loading || parseRomajiList(text).length === 0}><Search />{loading ? 'Looking up…' : 'Look up'}</button>
          <button type="button" onclick={() => dialogEl?.close()}>Close</button>
        </div>
      </form>
    {:else}
      {#if found.length}
        <!-- on top of the list, which scrolls up behind it -->
        <div class="relative z-10 flex flex-wrap items-center gap-2">
          <label class="flex items-center gap-2">
            <input type="checkbox" checked={allSelected} onchange={toggleSelectAll} />
            {found.length === 1 ? 'Select' : 'Select all'} {found.length} {plural(found.length, 'word')}
          </label>
          <span class="text-muted">{chosen.length} selected</span>
        </div>
        <!-- reaches up behind the 40px select-all row and the 8px gap below it -->
        <ul class="scroll-list-12 [--scroll-list-cap:50dvh] [--scroll-list-under:48px]">
          {#each found as row (row.item)}
            {@const candidate = row.candidates[row.choice]}
            {@const warn = differs(row) && 'text-warn'}
            <li>
              <div
                class="select-row min-h-12"
                role="checkbox"
                tabindex="0"
                aria-checked={row.selected}
                aria-label={`Add ${candidate.japanese}${warn ? ' (vowel length differs from what you typed)' : ''}`}
                onclick={(event) => onRowClick(event, row)}
                onmousedown={onRowMouseDown}
                onkeydown={(event) => onRowKey(event, row)}
              >
                <span class={['text-lg', warn]} lang="ja">{candidate.japanese}</span>
                <span class={['text-sm', warn || 'text-muted']} lang="ja">{wordReading(candidate)}</span>
                <span class={['min-w-0 truncate', warn]}>{candidate.meaning}</span>
                {#if row.candidates.length > 1}
                  <span class="min-w-4 flex-1" aria-hidden="true"></span>
                  <!-- an invisible native select covers the chevron, so the list that opens is the native one; it is clipped to the chevron because a select's own width and padding would push the list sideways -->
                  <span class="relative inline-flex shrink-0 overflow-hidden rounded-control has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-action">
                    <ChevronDown />
                    <select class="absolute inset-0 size-full cursor-pointer p-0 opacity-0" lang="ja" bind:value={row.choice} aria-label={`Word for ${row.item.romaji}`}>
                      {#each row.candidates as c, i (i)}
                        <option value={i}>{c.japanese} · {c.hiragana} · {c.meaning}</option>
                      {/each}
                    </select>
                  </span>
                {/if}
              </div>
            </li>
          {/each}
        </ul>
      {/if}
      {#if found.some(differs) || notFound.length}
        <ul class="grid gap-1 text-sm">
          {#if found.some(differs)}
            <li class="flex items-baseline gap-2 text-warn"><span class="size-3 shrink-0 rounded-pill bg-warn" aria-hidden="true"></span>Vowel length differs from what you typed: check the reading</li>
          {/if}
          {#if notFound.length}
            <li class="flex items-baseline gap-2 text-bad"><span class="size-3 shrink-0 rounded-pill bg-bad" aria-hidden="true"></span>Not found in the dictionary: {notFound.map((r) => r.item.romaji).join(', ')}</li>
          {/if}
        </ul>
      {/if}
      <p class="text-sm text-muted">Dictionary data: JMdict (EDRDG), CC BY-SA 4.0.</p>
      <div class="dialog-actions">
        <button class="action" type="button" onclick={add} disabled={chosen.length === 0}><Plus />Add {chosen.length} {plural(chosen.length, 'word')}</button>
        <button type="button" onclick={() => (rows = [])}>Back</button>
      </div>
    {/if}
  </div>
</dialog>
