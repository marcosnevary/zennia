<script lang="ts">
  import { resolve } from '$app/paths'
  import { defaultKanaSelection } from '../../core/kana'
  import { toDisplayRomaji } from '../../core/romaji'
  import PracticeCard from './PracticeCard.svelte'
  import Scoreboard from './Scoreboard.svelte'
  import { checkParts, describePool, joinAnswers, mixedMode, type PracticeItem } from '../../data/practice-modes'
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

  // the outcome of each part, shown with the verdict when both are practiced
  const note = $derived.by(() => {
    if (focus !== 'both' || current?.kind !== 'word' || !session.verdict) return undefined
    const { reading, meaning } = checkParts(typed, current.word, focus)
    return `Romaji: ${reading} · Meaning: ${meaning ? 'correct' : 'incorrect'}`
  })

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

{#if !current}
  <p class="mt-6 mb-4 text-muted">
    Nothing to practice. Select kana or activate words in <a href={resolve('/manage')}>Manage</a>.
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
  <Scoreboard hits={session.hits} total={session.total} streak={session.streak} bestStreak={session.bestStreak} />
  <!-- same 16px inset as the score above -->
  <p class="mx-4 mt-3 text-center text-[0.9rem] text-muted">Practicing {describePool(mode.pool)}</p>
{/if}
