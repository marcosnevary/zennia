<script lang="ts">
  import Icon from '../Icon.svelte'
  import TagChip from './TagChip.svelte'
  import TagInput from './TagInput.svelte'
  import { closeOnBackdrop } from './dialog'
  import { toDisplayRomaji } from '../../core/romaji'
  import { loadDictionary, lookUp, parseRomajiList, type Candidate, type RomajiItem } from '../../data/dictionary'
  import { importSummary, makeWord } from '../../data/words'
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

  const DIM = 'opacity-45'
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
        <div class="flex flex-wrap items-center justify-end gap-2">
          <button class="action" type="submit" disabled={loading || parseRomajiList(text).length === 0}>{loading ? 'Looking up…' : 'Look up'}</button>
          <button type="button" onclick={() => dialogEl?.close()}>Close</button>
        </div>
      </form>
    {:else}
      <!-- relative keeps the rows' sr-only text inside this scroll box, so the dialog itself never scrolls -->
      <ul class="relative max-h-[55vh] overflow-y-auto thin-scrollbar">
        {#each found as row (row.item)}
          {@const candidate = row.candidates[row.choice]}
          {@const warn = differs(row) && 'text-warn'}
          <li class="flex items-center gap-3 py-2.5">
            <input type="checkbox" bind:checked={row.selected} aria-label={`Add ${row.item.romaji}`} />
            <span class={['min-w-0 truncate text-[1.3rem]', warn, !row.selected && DIM]} lang="ja">{candidate.japanese}</span>
            <span class={['min-w-0 truncate text-[0.9rem]', warn || 'text-muted', !row.selected && DIM]} lang="ja">{candidate.hiragana} · {toDisplayRomaji(candidate.hiragana)}</span>
            <span class={['min-w-0 truncate', warn, !row.selected && DIM]}>{candidate.meaning}</span>
            {#if warn}<span class="sr-only">(vowel length differs from what you typed)</span>{/if}
            {#if batchTags.length}
              <span class="flex min-w-0 gap-1.5 overflow-hidden">{#each batchTags as tag (tag)}<TagChip {tag} />{/each}</span>
            {/if}
            {#if row.candidates.length > 1}
              <span class="dot-leader min-w-4 flex-1" aria-hidden="true"></span>
              <!-- an invisible native select covers the chevron, so the list that opens is the native one; it is clipped to the chevron because a select's own width and padding would push the list sideways -->
              <span class="relative -ml-2 inline-flex shrink-0 overflow-hidden has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent">
                <Icon><path d="M6 9l6 6 6-6" /></Icon>
                <select class="absolute inset-0 size-full cursor-pointer p-0 opacity-0" lang="ja" bind:value={row.choice} aria-label={`Word for ${row.item.romaji}`}>
                  {#each row.candidates as c, i (i)}
                    <option value={i}>{c.japanese} · {c.hiragana} · {c.meaning}</option>
                  {/each}
                </select>
              </span>
            {/if}
          </li>
        {/each}
      </ul>
      {#if found.some(differs) || notFound.length}
        <ul class="grid gap-1 text-[0.85rem]">
          {#if found.some(differs)}
            <li class="flex items-baseline gap-1.5 text-warn"><span class="size-2.5 shrink-0 bg-warn" aria-hidden="true"></span>Vowel length differs from what you typed: check the reading</li>
          {/if}
          {#if notFound.length}
            <li class="flex items-baseline gap-1.5 text-bad"><span class="size-2.5 shrink-0 bg-bad" aria-hidden="true"></span>Not found in the dictionary: {notFound.map((r) => r.item.romaji).join(', ')}</li>
          {/if}
        </ul>
      {/if}
      <p class="text-[0.85rem] text-muted">Dictionary data: JMdict (EDRDG), CC BY-SA 4.0.</p>
      <div class="flex flex-wrap items-center justify-end gap-2">
        <button class="action" type="button" onclick={add} disabled={chosen.length === 0}>Add {chosen.length} word(s)</button>
        <button type="button" onclick={() => (rows = [])}>Back</button>
      </div>
    {/if}
  </div>
</dialog>
