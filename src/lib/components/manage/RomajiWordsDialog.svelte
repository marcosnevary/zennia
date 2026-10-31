<script lang="ts">
  import TagInput from './TagInput.svelte'
  import { closeOnBackdrop } from './dialog'
  import { loadDictionary, lookUp, parseRomajiList, type Candidate, type RomajiItem } from '../../data/dictionary'
  import { importSummary, makeWord, validateWord, type WordFields } from '../../data/words'
  import { getApp } from '../../state.svelte'

  let { tags }: { tags: string[] } = $props()

  const app = getApp()

  interface Row {
    item: RomajiItem
    candidates: Candidate[]
    choice: number
    meaning: string
    selected: boolean
  }

  let dialogEl = $state<HTMLDialogElement>()
  let text = $state('')
  let batchTags = $state<string[]>([])
  let rows = $state<Row[]>([])
  let loading = $state(false)
  let error = $state('')
  let message = $state('')

  const fields = (row: Row): WordFields => {
    const { japanese, hiragana } = row.candidates[row.choice]
    return { japanese, hiragana, meaning: row.meaning, tags: batchTags }
  }
  const chosen = $derived(rows.filter((r) => r.selected))
  const invalid = (row: Row) => row.selected && Object.keys(validateWord(fields(row))).length > 0

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
        return { item, candidates, choice: 0, meaning: candidates[0]?.meaning ?? '', selected: candidates.length > 0 }
      })
    } catch {
      error = 'Could not load the dictionary. Check your connection and try again.'
    } finally {
      loading = false
    }
  }

  function choose(row: Row) {
    row.meaning = row.candidates[row.choice].meaning
  }

  function add() {
    const result = app.importWords(chosen.map((row) => makeWord(fields(row))))
    message = importSummary(result, 0)
    text = ''
    rows = []
  }
</script>

<dialog class="w-[min(640px,calc(100vw-32px))]" bind:this={dialogEl} use:closeOnBackdrop aria-label="Add from romaji">
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
        <div class="flex flex-wrap items-center gap-2">
          <button class="action" type="submit" disabled={loading || parseRomajiList(text).length === 0}>{loading ? 'Looking up…' : 'Look up'}</button>
          <button type="button" onclick={() => dialogEl?.close()}>Close</button>
        </div>
      </form>
    {:else}
      <ul class="max-h-[55vh] overflow-y-auto">
        {#each rows as row (row.item)}
          {@const candidate = row.candidates[row.choice]}
          <li class="grid gap-1.5 py-2.5">
            <div class="flex items-center gap-3">
              <input type="checkbox" bind:checked={row.selected} disabled={!candidate} aria-label={`Add ${row.item.romaji}`} />
              <span class="font-semibold">{row.item.romaji}</span>
              {#if !candidate}
                <span class="text-muted italic">not found</span>
              {:else if row.candidates.length === 1}
                <span lang="ja"><span class="text-[1.3rem]">{candidate.japanese}</span> <span class="text-[0.9rem] text-muted">{candidate.hiragana}</span></span>
              {:else}
                <select class="field chevron min-w-0 flex-1" lang="ja" bind:value={row.choice} onchange={() => choose(row)} aria-label={`Word for ${row.item.romaji}`}>
                  {#each row.candidates as c, i (i)}
                    <option value={i}>{c.japanese} · {c.hiragana} · {c.meaning}</option>
                  {/each}
                </select>
              {/if}
            </div>
            {#if candidate}
              {#if candidate.verdict === 'almost'}
                <p class="text-warn">The vowel length differs from what you typed: check the reading.</p>
              {/if}
              <input type="text" class="field" placeholder="Meaning" bind:value={row.meaning} aria-label={`Meaning of ${row.item.romaji}`} aria-invalid={invalid(row)} />
            {/if}
          </li>
        {/each}
      </ul>
      <p class="text-[0.85rem] text-muted">Dictionary data: JMdict (EDRDG), CC BY-SA 4.0.</p>
      <div class="flex flex-wrap items-center gap-2">
        <button class="action" type="button" onclick={add} disabled={chosen.length === 0 || rows.some(invalid)}>Add {chosen.length} word(s)</button>
        <button type="button" onclick={() => (rows = [])}>Back</button>
      </div>
    {/if}
  </div>
</dialog>
