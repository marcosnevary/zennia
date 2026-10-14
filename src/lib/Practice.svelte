<script lang="ts">
  import { checkAnswer, toDisplayRomaji } from './romaji'
  import type { Verdict, Word } from './types'

  let { words, onmanage }: { words: Word[]; onmanage: () => void } = $props()

  let current = $state<Word | null>(null)
  let answer = $state('')
  let verdict = $state<Verdict | null>(null)
  let inputEl = $state<HTMLInputElement>()
  let lastId: string | null = null
  let hits = $state(0)
  let total = $state(0)

  function next() {
    // sorteia uma palavra, evitando repetir a anterior quando há outras
    const pool = words.length > 1 ? words.filter((w) => w.id !== lastId) : words
    current = pool.length ? pool[Math.floor(Math.random() * pool.length)] : null
    lastId = current?.id ?? null
    answer = ''
    verdict = null
    queueMicrotask(() => inputEl?.focus())
  }

  function submit(event: Event) {
    event.preventDefault()
    if (!current) return
    if (verdict) return next()
    if (!answer.trim()) return
    verdict = checkAnswer(answer, current.hiragana)
    total++
    if (verdict === 'correct') hits++
  }

  next()
</script>

{#if !current}
  <p class="muted">
    Nenhuma palavra cadastrada ainda.
    <button onclick={onmanage}>Adicionar palavras</button>
  </p>
{:else}
  <section class="card">
    <p class="word" lang="ja">{current.japanese}</p>

    <form onsubmit={submit}>
      <input
        type="text"
        bind:this={inputEl}
        bind:value={answer}
        readonly={verdict !== null}
        placeholder="Digite em romaji"
        autocomplete="off"
        autocapitalize="off"
        autocorrect="off"
        spellcheck="false"
      />
      <button class="primary" type="submit">{verdict ? 'Próxima' : 'Verificar'}</button>
    </form>

    {#if verdict}
      <div class="result {verdict}" role="status">
        <strong>
          {#if verdict === 'correct'}Correto!
          {:else if verdict === 'almost'}Quase: só o comprimento de uma vogal difere.
          {:else}Incorreto.{/if}
        </strong>
        <p class="answer" lang="ja">{current.hiragana} · {toDisplayRomaji(current.hiragana)}</p>
        <p>{current.meaning || '(sem significado cadastrado)'}</p>
      </div>
    {/if}
  </section>

  <p class="muted score">Acertos: {hits} de {total}</p>
{/if}

<style>
  .card {
    margin-top: 24px;
    padding: 24px 16px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    text-align: center;
  }
  .word {
    margin: 0 0 20px;
    font-size: 3rem;
    line-height: 1.2;
  }
  form {
    display: flex;
    gap: 8px;
  }
  .result {
    margin-top: 16px;
    padding: 12px;
    border-radius: 8px;
    text-align: left;
  }
  .result p {
    margin: 4px 0 0;
  }
  .answer {
    font-size: 1.2rem;
  }
  .correct {
    background: var(--ok-bg);
    color: var(--ok);
  }
  .almost {
    background: var(--warn-bg);
    color: var(--warn);
  }
  .incorrect {
    background: var(--bad-bg);
    color: var(--bad);
  }
  .score {
    text-align: center;
  }
</style>
