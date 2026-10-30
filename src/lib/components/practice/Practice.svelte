<script lang="ts">
  import { resolve } from '$app/paths'
  import { defaultKanaSelection, type KanaScript } from '../../core/kana'
  import { toDisplayRomaji } from '../../core/romaji'
  import Icon from '../Icon.svelte'
  import PracticeCard from './PracticeCard.svelte'
  import PracticeOptions from './PracticeOptions.svelte'
  import Scoreboard from './Scoreboard.svelte'
  import { checkParts, joinAnswers, mixedMode, type PracticeItem, type WordsFocus } from '../../data/practice-modes'
  import { resolveScope, scopedKanaSelection, scopedWords, scopeSummary, type PracticeScope } from '../../data/practice-scope'
  import { drawOdds, nextRound, resetScore, startSession, submit as submitAnswer } from '../../data/practice-session'
  import { allTags, sameTag } from '../../data/words'
  import { getApp } from '../../state.svelte'

  const app = getApp()

  const FOCUS_LABELS: Record<WordsFocus, string> = { reading: 'Romaji', meaning: 'Meaning', both: 'Both' }

  let options = $state<PracticeOptions>()

  const scope = $derived(app.settings.practiceScope)
  const tags = $derived(allTags(app.words))
  const kanaSelection = $derived(scopedKanaSelection(app.settings.kanaSelection ?? defaultKanaSelection(), scope))
  const words = $derived(scopedWords(app.words, scope))

  let focus = $state<WordsFocus>(app.settings.wordsFocus)
  const summary = $derived(`${scopeSummary(scope, tags)} · Words: ${FOCUS_LABELS[focus]}`)
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

<PracticeOptions
  bind:this={options}
  {scope}
  {tags}
  {focus}
  ontogglescript={toggleScript}
  ontoggletag={toggleTag}
  ontoggleuntagged={toggleUntagged}
  onchoosefocus={chooseFocus}
/>

<div class="mt-4 flex items-center justify-center gap-3">
  <span class="min-w-0 truncate text-[0.9rem] text-muted">{summary}</span>
  <button class="inline-flex items-center gap-1.5" onclick={() => options?.open()}>
    <Icon>
      <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />
    </Icon>
    Customize
  </button>
</div>

{#if !current}
  <p class="my-4 text-muted">
    Nothing to practice with this selection.
    <button onclick={() => options?.open()}>Customize</button>
    or <a href={resolve('/manage')}>manage your words and kana</a>.
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
