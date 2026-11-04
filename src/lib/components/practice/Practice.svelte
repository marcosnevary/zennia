<script lang="ts">
  import { resolve } from '$app/paths'
  import { defaultKanaSelection } from '../../core/kana'
  import type { Verdict } from '../../core/types'
  import PracticeCard from './PracticeCard.svelte'
  import { checkParts, joinAnswers, mixedMode, rightAnswer, type PracticeItem } from '../../data/practice-modes'
  import { drawOdds, nextRound, startSession, submit as submitAnswer } from '../../data/practice-session'
  import { getApp } from '../../state.svelte'

  const app = getApp()

  const kanaSelection = $derived(app.settings.kanaSelection ?? defaultKanaSelection())
  const focus = $derived(app.settings.wordsFocus)
  const mode = $derived(mixedMode(app.words, kanaSelection, app.stats, focus, app.recorder))

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

  /** The outcome of each field once checked, shown on the field itself. */
  const parts = $derived.by((): { reading: Verdict | null; meaning: Verdict | null } => {
    if (!current || !session.verdict) return { reading: null, meaning: null }
    if (current.kind === 'kana') return { reading: session.verdict, meaning: null }
    const { reading, meaning } = checkParts(typed, current.word, focus)
    return { reading, meaning: meaning === null ? null : meaning ? 'correct' : 'incorrect' }
  })

  // the fields show the parts by color, so screen readers get them in words when both are practiced
  const note = $derived(
    parts.reading && parts.meaning ? `Reading: ${parts.reading} · Meaning: ${parts.meaning}` : undefined,
  )

  function focusField() {
    queueMicrotask(() => (askReading ? inputEl : meaningEl)?.focus({ preventScroll: true }))
  }

  function submit(event: Event) {
    event.preventDefault()
    const advancing = session.verdict !== null
    session = submitAnswer(session, typed, mode)
    if (advancing) {
      answer = ''
      meaningAnswer = ''
      focusField()
    } else {
      inputEl?.blur()
      meaningEl?.blur()
    }
  }

  // Check takes the focus off the fields, so Enter and Space reach the page and still move on to the next round;
  // before Check, Enter on the page brings the focus back to the answer
  function onWindowKeydown(event: KeyboardEvent) {
    if (event.target !== document.body) return
    if (session.verdict !== null && (event.key === ' ' || event.key === 'Enter')) {
      submit(event)
    } else if (session.verdict === null && event.key === 'Enter') {
      event.preventDefault()
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

<svelte:window onkeydown={onWindowKeydown} />

{#if !current}
  <p class="mt-6 mb-4 text-muted">
    Nothing to practice. Select kana in <a href={resolve('/kana')}>Kana</a> or activate words in
    <a href={resolve('/vocabulary')}>Vocabulary</a>.
  </p>
{:else}
  <PracticeCard
    prompt={current.kind === 'word' ? current.word.japanese : current.kana.symbol}
    verdict={session.verdict}
    rightAnswer={rightAnswer(current)}
    {note}
    readingVerdict={parts.reading}
    meaningVerdict={parts.meaning}
    hits={session.hits}
    total={session.total}
    {askReading}
    {askMeaning}
    bind:answer
    bind:inputEl
    bind:meaningAnswer
    bind:meaningEl
    onsubmit={submit}
    {onkeydown}
  />
{/if}
