<script lang="ts">
  import { isKana } from 'wanakana'
  import { downloadText, exportJSON, importJSON } from './io'
  import { toDisplayRomaji } from './romaji'
  import type { Word } from './types'
  import { mergeWords, newId } from './words'

  let { words = $bindable() }: { words: Word[] } = $props()

  let japanese = $state('')
  let hiragana = $state('')
  let meaning = $state('')
  let editingId = $state<string | null>(null)
  let error = $state('')
  let message = $state('')
  let importMode = $state<'merge' | 'replace'>('merge')
  let japaneseEl = $state<HTMLInputElement>()

  function resetForm() {
    japanese = ''
    hiragana = ''
    meaning = ''
    editingId = null
    error = ''
  }

  function save(event: Event) {
    event.preventDefault()
    const j = japanese.trim()
    const h = hiragana.trim()
    const m = meaning.trim()
    if (!j || !h) {
      error = 'Preencha a palavra em japonês e o hiragana.'
      return
    }
    if (!isKana(h)) {
      error = 'O hiragana deve conter apenas kana (hiragana, katakana ou ー).'
      return
    }
    if (editingId) {
      words = words.map((w) => (w.id === editingId ? { ...w, japanese: j, hiragana: h, meaning: m } : w))
      message = 'Palavra atualizada.'
    } else {
      words = [{ id: newId(), japanese: j, hiragana: h, meaning: m }, ...words]
      message = 'Palavra adicionada.'
    }
    resetForm()
    japaneseEl?.focus()
  }

  function edit(word: Word) {
    editingId = word.id
    japanese = word.japanese
    hiragana = word.hiragana
    meaning = word.meaning
    error = ''
    message = ''
    japaneseEl?.focus()
  }

  function remove(word: Word) {
    if (!confirm(`Excluir "${word.japanese}"?`)) return
    words = words.filter((w) => w.id !== word.id)
    if (editingId === word.id) resetForm()
    message = 'Palavra excluída.'
  }

  function exportWords() {
    const date = new Date().toISOString().slice(0, 10)
    downloadText(`nihongo-palavras-${date}.json`, exportJSON(words))
    message = `${words.length} palavras exportadas.`
  }

  async function importFile(event: Event) {
    const input = event.currentTarget as HTMLInputElement
    const file = input.files?.[0]
    input.value = ''
    if (!file) return
    error = ''
    try {
      const { words: incoming, skipped } = importJSON(await file.text())
      const skippedNote = skipped ? ` ${skipped} item(ns) inválido(s) ignorado(s).` : ''
      if (importMode === 'replace') {
        if (!confirm(`Substituir as ${words.length} palavras atuais por ${incoming.length} do arquivo?`)) return
        words = incoming
        message = `Pool substituída: ${incoming.length} palavras.${skippedNote}`
      } else {
        const result = mergeWords(words, incoming)
        words = result.words
        message = `${result.added} adicionada(s), ${result.duplicates} já existia(m).${skippedNote}`
      }
      resetForm()
    } catch (e) {
      error = e instanceof Error ? e.message : 'Não foi possível importar o arquivo.'
    }
  }
</script>

<h2>{editingId ? 'Editar palavra' : 'Nova palavra'}</h2>
<form class="form" onsubmit={save}>
  <input type="text" lang="ja" placeholder="Japonês (ex.: 食べる)" bind:value={japanese} bind:this={japaneseEl} />
  <input type="text" lang="ja" placeholder="Hiragana (ex.: たべる)" bind:value={hiragana} />
  <input type="text" placeholder="Significado (ex.: comer)" bind:value={meaning} />
  <div class="row">
    <button class="primary" type="submit">{editingId ? 'Salvar' : 'Adicionar'}</button>
    {#if editingId}<button type="button" onclick={resetForm}>Cancelar</button>{/if}
  </div>
</form>

{#if error}<p class="error" role="alert">{error}</p>{/if}
{#if message}<p class="muted" role="status">{message}</p>{/if}

<h2>Importar e exportar</h2>
<div class="row">
  <button onclick={exportWords} disabled={words.length === 0}>Exportar JSON</button>
  <label class="file">
    Importar JSON
    <input type="file" accept="application/json,.json" onchange={importFile} hidden />
  </label>
  <select bind:value={importMode} aria-label="Modo de importação">
    <option value="merge">Mesclar com a pool</option>
    <option value="replace">Substituir a pool</option>
  </select>
</div>

<h2>Palavras ({words.length})</h2>
{#if words.length === 0}
  <p class="muted">Nenhuma palavra ainda.</p>
{:else}
  <ul class="list">
    {#each words as word (word.id)}
      <li>
        <div class="info">
          <span class="jp" lang="ja">{word.japanese}</span>
          <span class="muted" lang="ja">{word.hiragana} · {toDisplayRomaji(word.hiragana)}</span>
          <span>{word.meaning}</span>
        </div>
        <div class="row">
          <button onclick={() => edit(word)}>Editar</button>
          <button class="danger" onclick={() => remove(word)}>Excluir</button>
        </div>
      </li>
    {/each}
  </ul>
{/if}

<style>
  .form {
    display: grid;
    gap: 8px;
  }
  .row {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    align-items: center;
  }
  .file {
    padding: 9px 14px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    cursor: pointer;
  }
  select {
    padding: 9px 10px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
  }
  .error {
    color: var(--bad);
  }
  .list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 8px;
  }
  li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    padding: 10px 12px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
  }
  .info {
    display: grid;
    gap: 2px;
  }
  .jp {
    font-size: 1.3rem;
  }
</style>
