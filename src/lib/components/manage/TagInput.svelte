<script lang="ts">
  import TagChip from './TagChip.svelte'
  import { cleanTags, sameTag, validateTag } from '../../data/words'

  let { tags = $bindable(), suggestions }: { tags: string[]; suggestions: string[] } = $props()

  let draft = $state('')
  let error = $state('')

  const collator = new Intl.Collator(undefined, { sensitivity: 'base' })
  // every tag in use plus the ones just typed for this word, once each and in alphabetical order
  const choices = $derived(cleanTags([...suggestions, ...tags]).sort(collator.compare))

  function has(tag: string): boolean {
    return tags.some((t) => sameTag(t, tag))
  }

  function toggle(tag: string) {
    tags = has(tag) ? tags.filter((t) => !sameTag(t, tag)) : cleanTags([...tags, tag])
  }

  // adds the typed tag, with the spelling already in use when there is one
  function commit() {
    if (!draft.trim()) {
      error = ''
      return
    }
    error = validateTag(draft)
    if (error) return
    const spelling = choices.find((c) => sameTag(c, draft)) ?? draft
    tags = cleanTags([...tags, spelling])
    draft = ''
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key !== 'Enter' && event.key !== ',') return
    // Enter must not submit the surrounding form
    event.preventDefault()
    commit()
  }
</script>

<div class="grid gap-1.5">
  <input
    type="text"
    class="border-2 border-muted focus-visible:border-accent focus-visible:outline-none"
    placeholder="New tag (type it and press Enter)"
    bind:value={draft}
    oninput={() => (error = '')}
    onkeydown={onKeydown}
    onblur={commit}
  />
  {#if error}<p class="text-bad" role="alert">{error}</p>{/if}
  {#if choices.length > 0}
    <ul class="flex flex-wrap gap-1.5" aria-label="Tags: + adds one to the word, × removes it">
      {#each choices as tag (tag)}
        <li>
          {#if has(tag)}
            <TagChip {tag} onremove={() => toggle(tag)} />
          {:else}
            <TagChip {tag} onadd={() => toggle(tag)} />
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</div>
