<script lang="ts">
  import { resolve } from '$app/paths'
  import { defaultKanaSelection, type KanaScript } from '../../core/kana'
  import { toDisplayRomaji } from '../../core/romaji'
  import PracticeCard from './PracticeCard.svelte'
  import Scoreboard from './Scoreboard.svelte'
  import { checkParts, joinAnswers, mixedMode, type PracticeItem, type WordsFocus } from '../../data/practice-modes'
  import {
    resolveScope,
    scopedKanaSelection,
    scopedWords,
    scopeIncludesScript,
    scopeIncludesTag,
    scopeIncludesUntagged,
    type PracticeScope,
  } from '../../data/practice-scope'
  import { drawOdds, nextRound, resetScore, startSession, submit as submitAnswer } from '../../data/practice-session'
  import { allTags, sameTag } from '../../data/words'
  import { getApp } from '../../state.svelte'

  const app = getApp()

  const SCRIPTS: { id: KanaScript; label: string }[] = [
    { id: 'hiragana', label: 'Hiragana' },
    { id: 'katakana', label: 'Katakana' },
  ]

  const FOCUSES: { id: WordsFocus; label: string }[] = [
    { id: 'reading', label: 'Romaji' },
    { id: 'meaning', label: 'Meaning' },
    { id: 'both', label: 'Both' },
  ]

  const scope = $derived(app.settings.practiceScope)
  const tags = $derived(allTags(app.words))
  const kanaSelection = $derived(scopedKanaSelection(app.settings.kanaSelection ?? defaultKanaSelection(), scope))
  const words = $derived(scopedWords(app.words, scope))

  let focus = $state<WordsFocus>(app.settings.wordsFocus)
  const mode = $derived(mixedMode(words, kanaSelection, app.stats, focus, app.recorder))

  let session = $state(startSession<PracticeItem>())
  const odds = $derived(
    drawOdds(session, mode).map(({ item, chance }) => ({
      label: item.kind === 'word' ? `${item.word.japanese} · ${item.word.hiragana}` : item.kana.symbol,
      chance,
    })),
  )
  let answer = $state('')
  let meaningAnswer = $state('')
  let inputEl = $state<HTMLInputElement>()
  let meaningEl = $state<HTMLInputElement>()

  // the focus only applies to words: a kana is always answered by its reading
  const current = $derived(session.current)
  const askReading = $derived(current?.kind === 'kana' || focus !== 'meaning')
  const askMeaning = $derived(current?.kind === 'word' && focus !== 'reading')

  /** What the session checks: the typed texts of the fields shown. */
  const typed = $derived(
    current?.kind !== 'word' || focus === 'reading'
      ? answer
      : focus === 'both'
        ? joinAnswers(answer, meaningAnswer)
        : meaningAnswer,
  )

  // the outcome of each part, shown with the verdict when both are practiced
  const note = $derived.by(() => {
    if (focus !== 'both' || current?.kind !== 'word' || !session.verdict) return undefined
    const { reading, meaning } = checkParts(typed, current.word, focus)
    return `Romaji: ${reading} · Meaning: ${meaning ? 'correct' : 'incorrect'}`
  })

  function focusField() {
    queueMicrotask(() => (askReading ? inputEl : meaningEl)?.focus({ preventScroll: true }))
  }

  /** A fresh round and score, for when what is practiced changes. */
  function restart() {
    answer = ''
    meaningAnswer = ''
    session = nextRound(startSession<PracticeItem>(), mode)
  }

  function chooseFocus(next: WordsFocus) {
    if (next === focus) return
    focus = next
    app.setWordsFocus(next)
    restart()
    focusField()
  }

  function changeScope(change: (scope: PracticeScope) => PracticeScope) {
    app.setPracticeScope(change(resolveScope(scope, tags)))
    restart()
  }

  function toggleScript(script: KanaScript) {
    changeScope((s) => ({
      ...s,
      scripts: s.scripts.includes(script) ? s.scripts.filter((x) => x !== script) : [...s.scripts, script],
    }))
  }

  function toggleTag(tag: string) {
    changeScope((s) => ({
      ...s,
      tags: s.tags.some((t) => sameTag(t, tag)) ? s.tags.filter((t) => !sameTag(t, tag)) : [...s.tags, tag],
    }))
  }

  function toggleUntagged() {
    changeScope((s) => ({ ...s, untagged: !s.untagged }))
  }

  function submit(event: Event) {
    event.preventDefault()
    const advancing = session.verdict !== null
    session = submitAnswer(session, typed, mode)
    if (advancing) {
      answer = ''
      meaningAnswer = ''
      focusField()
    }
  }

  // Space works like Enter in the romaji field (spaces are ignored when comparing anyway); with both fields
  // either moves on to the meaning, which is where a typed answer ends. A meaning keeps its spaces.
  function onkeydown(event: KeyboardEvent) {
    if (event.key !== ' ' && event.key !== 'Enter') return
    if (focus === 'both' && current?.kind === 'word' && session.verdict === null) {
      event.preventDefault()
      meaningEl?.focus()
    } else {
      submit(event)
    }
  }

  function draw() {
    session = nextRound(session, mode)
  }

  draw()
</script>

{#snippet chip(label: string, on: boolean, onclick: () => void)}
  <button class:primary={on} aria-pressed={on} {onclick}>{label}</button>
{/snippet}

<div class="mt-4 flex flex-col gap-2">
  <div class="flex flex-wrap justify-center gap-2" role="group" aria-label="What to practice">
    {#each SCRIPTS as s (s.id)}
      {@render chip(s.label, scopeIncludesScript(scope, s.id), () => toggleScript(s.id))}
    {/each}
    {#each tags as tag (tag)}
      {@render chip(tag, scopeIncludesTag(scope, tag), () => toggleTag(tag))}
    {/each}
    {@render chip('Untagged', scopeIncludesUntagged(scope), toggleUntagged)}
  </div>
  <div class="flex flex-wrap items-center justify-center gap-2" role="group" aria-label="How to answer words">
    <span class="text-[0.85rem] text-muted">Words:</span>
    {#each FOCUSES as f (f.id)}
      {@render chip(f.label, focus === f.id, () => chooseFocus(f.id))}
    {/each}
  </div>
</div>

{#if !current}
  <p class="my-4 text-muted">
    Nothing to practice with this selection. Choose something above, or <a href={resolve('/manage')}>manage your words and kana</a>.
  </p>
{:else}
  <PracticeCard
    prompt={current.kind === 'word' ? current.word.japanese : current.kana.symbol}
    verdict={session.verdict}
    reading={current.kind === 'word'
      ? `${current.word.hiragana} · ${toDisplayRomaji(current.word.hiragana)}`
      : `${current.kana.symbol} · ${toDisplayRomaji(current.kana.hiragana)}`}
    detail={current.kind === 'word' ? current.word.meaning || '(no meaning saved)' : undefined}
    {note}
    {askReading}
    {askMeaning}
    bind:answer
    bind:inputEl
    bind:meaningAnswer
    bind:meaningEl
    onsubmit={submit}
    {onkeydown}
  />
  <Scoreboard
    hits={session.hits}
    total={session.total}
    streak={session.streak}
    bestStreak={session.bestStreak}
    {odds}
    onreset={() => (session = resetScore(session))}
  />
{/if}
