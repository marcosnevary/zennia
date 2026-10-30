<script lang="ts">
  import type { KanaScript } from '../../core/kana'
  import { closeOnBackdrop } from '../manage/dialog'
  import type { WordsFocus } from '../../data/practice-modes'
  import { scopeIncludesScript, scopeIncludesTag, scopeIncludesUntagged, type PracticeScope } from '../../data/practice-scope'

  let {
    scope,
    tags,
    focus,
    wordCount,
    kanaCount,
    ontogglescript,
    ontoggletag,
    ontoggleuntagged,
    onchoosefocus,
  }: {
    scope: PracticeScope | null
    tags: string[]
    focus: WordsFocus
    wordCount: number
    kanaCount: number
    ontogglescript: (script: KanaScript) => void
    ontoggletag: (tag: string) => void
    ontoggleuntagged: () => void
    onchoosefocus: (focus: WordsFocus) => void
  } = $props()

  const SCRIPTS: { id: KanaScript; label: string }[] = [
    { id: 'hiragana', label: 'Hiragana' },
    { id: 'katakana', label: 'Katakana' },
  ]

  const FOCUSES: { id: WordsFocus; label: string }[] = [
    { id: 'reading', label: 'Romaji' },
    { id: 'meaning', label: 'Meaning' },
    { id: 'both', label: 'Both' },
  ]

  let dialogEl = $state<HTMLDialogElement>()

  export function open() {
    dialogEl?.showModal()
  }
</script>

{#snippet chip(label: string, on: boolean, onclick: () => void)}
  <button class:primary={on} aria-pressed={on} {onclick}>{label}</button>
{/snippet}

<dialog class="w-[min(420px,calc(100vw-32px))]" bind:this={dialogEl} use:closeOnBackdrop aria-label="Customize practice">
  <div class="grid gap-2">
    <h2 class="mt-0 mb-2">Customize practice</h2>

    <h3 class="mt-2 text-[0.9rem] font-bold text-muted">Scripts</h3>
    <div class="flex flex-wrap gap-2" role="group" aria-label="Which scripts to include">
      {#each SCRIPTS as s (s.id)}
        {@render chip(s.label, scopeIncludesScript(scope, s.id), () => ontogglescript(s.id))}
      {/each}
    </div>

    <h3 class="mt-2 text-[0.9rem] font-bold text-muted">Tags</h3>
    <div class="flex flex-wrap gap-2" role="group" aria-label="Which tags to include">
      {#each tags as tag (tag)}
        {@render chip(tag, scopeIncludesTag(scope, tag), () => ontoggletag(tag))}
      {/each}
      {@render chip('Untagged', scopeIncludesUntagged(scope), ontoggleuntagged)}
    </div>

    <h3 class="mt-2 text-[0.9rem] font-bold text-muted">Answer words by</h3>
    <div class="flex" role="group" aria-label="How to answer words">
      {#each FOCUSES as f (f.id)}
        <button class="flex-1" class:primary={focus === f.id} aria-pressed={focus === f.id} onclick={() => onchoosefocus(f.id)}>
          {f.label}
        </button>
      {/each}
    </div>

    <div class="mt-2 flex flex-wrap items-center justify-between gap-2">
      <p class="m-0 text-[0.9rem] text-muted" aria-live="polite">
        {wordCount} {wordCount === 1 ? 'word' : 'words'} · {kanaCount} kana
      </p>
      <button class="primary" type="button" onclick={() => dialogEl?.close()}>Done</button>
    </div>
  </div>
</dialog>
