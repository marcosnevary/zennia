<script lang="ts">
  import { toDisplayRomaji } from '../../core/romaji'
  import PracticeCard from './PracticeCard.svelte'
  import Scoreboard from './Scoreboard.svelte'
  import { checkParts, joinAnswers, wordsMode, type WordsFocus } from '../../data/practice-modes'
  import { nextRound, resetScore, startSession, submit as submitAnswer } from '../../data/practice-session'
  import { loadWordsFocus, saveWordsFocus } from '../../data/storage'
  import type { Stats, Word } from '../../core/types'

  let { words, stats = $bindable(), onmanage }: { words: Word[]; stats: Stats; onmanage: () => void } = $props()

  const FOCUSES: { id: WordsFocus; label: string }[] = [
    { id: 'reading', label: 'Romaji' },
    { id: 'meaning', label: 'Meaning' },
    { id: 'both', label: 'Both' },
  ]

  let focus = $state<WordsFocus>(loadWordsFocus())
  const mode = $derived(wordsMode(words, stats, focus))
  const askReading = $derived(focus !== 'meaning')
  const askMeaning = $derived(focus !== 'reading')

  let session = $state(startSession<Word>())
  let answer = $state('')
  let meaningAnswer = $state('')
  let inputEl = $state<HTMLInputElement>()
  let meaningEl = $state<HTMLInputElement>()

  /** What the session checks: the typed texts of the fields shown. */
  const typed = $derived(
    focus === 'both' ? joinAnswers(answer, meaningAnswer) : focus === 'meaning' ? meaningAnswer : answer,
  )

  // the outcome of each part, shown with the verdict when both are practiced
  const note = $derived.by(() => {
    if (focus !== 'both' || !session.current || !session.verdict) return undefined
    const { reading, meaning } = checkParts(typed, session.current, focus)
    return `Romaji: ${reading} · Meaning: ${meaning ? 'correct' : 'incorrect'}`
  })

  function focusField() {
    queueMicrotask(() => (askReading ? inputEl : meaningEl)?.focus())
  }

  function chooseFocus(next: WordsFocus) {
    if (next === focus) return
    focus = next
    saveWordsFocus(next)
    answer = ''
    meaningAnswer = ''
    session = startSession<Word>()
    draw()
    focusField()
  }

  function draw() {
    session = nextRound(session, mode)
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
    if (focus === 'both' && session.verdict === null) {
      event.preventDefault()
      meaningEl?.focus()
    } else {
      submit(event)
    }
  }

  draw()
</script>

<div class="focus" role="group" aria-label="What to practice">
  {#each FOCUSES as f (f.id)}
    <button class:primary={focus === f.id} aria-pressed={focus === f.id} onclick={() => chooseFocus(f.id)}>{f.label}</button>
  {/each}
</div>

{#if !session.current}
  <p class="muted">
    {#if !words.length}
      No words saved yet.
    {:else if words.some((w) => !w.disabled)}
      None of the enabled words has a meaning yet.
    {:else}
      All words are disabled.
    {/if}
    <button onclick={onmanage}>{words.length ? 'Manage words' : 'Add words'}</button>
  </p>
{:else}
  <PracticeCard
    prompt={session.current.japanese}
    verdict={session.verdict}
    reading="{session.current.hiragana} · {toDisplayRomaji(session.current.hiragana)}"
    detail={session.current.meaning || '(no meaning saved)'}
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
    onreset={() => (session = resetScore(session))}
  />
{/if}

<style>
  .focus {
    display: flex;
    gap: 8px;
    margin-top: 16px;
  }
</style>
