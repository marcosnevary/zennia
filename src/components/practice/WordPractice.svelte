<script lang="ts">
  import { toDisplayRomaji } from '../../core/romaji'
  import PracticeCard from './PracticeCard.svelte'
  import Scoreboard from './Scoreboard.svelte'
  import { wordsMode } from '../../data/practice-modes'
  import { nextRound, resetScore, startSession, submit as submitAnswer } from '../../data/practice-session'
  import type { Stats, Word } from '../../core/types'

  let { words, stats = $bindable(), onmanage }: { words: Word[]; stats: Stats; onmanage: () => void } = $props()

  const mode = $derived(wordsMode(words, stats))

  let session = $state(startSession<Word>())
  let answer = $state('')
  let inputEl = $state<HTMLInputElement>()

  function draw() {
    session = nextRound(session, mode)
  }

  function submit(event: Event) {
    event.preventDefault()
    const advancing = session.verdict !== null
    session = submitAnswer(session, answer, mode)
    if (advancing) {
      answer = ''
      queueMicrotask(() => inputEl?.focus())
    }
  }

  // Space works like Enter (spaces are ignored when comparing anyway)
  function onkeydown(event: KeyboardEvent) {
    if (event.key === ' ') submit(event)
  }

  draw()
</script>

{#if !session.current}
  <p class="muted">
    {words.length ? 'All words are disabled.' : 'No words saved yet.'}
    <button onclick={onmanage}>{words.length ? 'Manage words' : 'Add words'}</button>
  </p>
{:else}
  <PracticeCard
    prompt={session.current.japanese}
    verdict={session.verdict}
    reading="{session.current.hiragana} · {toDisplayRomaji(session.current.hiragana)}"
    detail={session.current.meaning || '(no meaning saved)'}
    bind:answer
    bind:inputEl
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
