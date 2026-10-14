# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

App web pessoal (em português) para praticar vocabulário de japonês: mostra uma palavra, o usuário digita a leitura em romaji e o app corrige. Svelte 5 + Vite + TypeScript + wanakana, dados só em localStorage (sem backend). Decisões e backlog completos em [docs/decisoes.md](docs/decisoes.md).

## Comandos

```bash
npm run dev      # servidor de desenvolvimento
npm test         # vitest run (todos os testes)
npx vitest run src/lib/romaji.test.ts -t "macron"   # um arquivo / um teste por nome
npm run check    # svelte-check (tsconfig.app.json) + tsc (tsconfig.node.json)
npm run build    # build de produção em dist/
```

Não há linter configurado. Os testes ficam em um único arquivo, [src/lib/romaji.test.ts](src/lib/romaji.test.ts), que cobre também `words.ts` (sanitize/merge).

## Arquitetura

- [src/App.svelte](src/App.svelte) é dono do estado `words` (`$state`) e o persiste com um `$effect` que chama `saveWords($state.snapshot(words))`. Duas abas: `Practice` (recebe `words`) e `Manage` (`bind:words`, faz o CRUD e import/export). Qualquer mudança na pool é salva automaticamente; não chame `saveWords` nos componentes.
- [src/lib/storage.ts](src/lib/storage.ts) é o **único** ponto de acesso ao localStorage (chave `nihongo:words`, formato `{ version: 1, words }`). Trocar por IndexedDB/backend deve mexer só nele. Leitura passa por `sanitizeWords`; falhas viram lista vazia / são ignoradas silenciosamente.
- [src/lib/words.ts](src/lib/words.ts): `sanitizeWords` valida qualquer dado externo (localStorage ou arquivo importado; aceita array ou `{ words }`, descarta itens sem `japanese`/`hiragana`, regenera ids duplicados). `mergeWords` deduplica por id ou por `japanese|hiragana`.
- [src/lib/io.ts](src/lib/io.ts): exportar/importar JSON (com `version` para migrações) e download pelo navegador.
- [src/lib/types.ts](src/lib/types.ts): `Word { id, japanese, hiragana, meaning }`, `Verdict`, `WordsFile`.

### Correção ([src/lib/romaji.ts](src/lib/romaji.ts))

O ponto mais sutil do projeto. A resposta é comparada **pelo som, em hiragana**, não pelo texto:

- `normalizeKana` converte para hiragana via wanakana com `convertLongVowelMark: false` e troca `ー` pela vogal anterior (a wanakana por padrão converte `ー` em `う` na linha do o, o que quebraria `コーヒー` = `koohii`).
- `checkAnswer` expande macrons em todas as grafias (`ō` → `ou`/`oo`, limitado a 256 candidatos), aceita `nn` final como ん e compara com o hiragana normalizado → `correct`.
- Se só o comprimento de vogal difere (comparação por `skeleton`), retorna `almost`, que **conta como erro**: o comprimento muda a palavra (おばさん/おばあさん). Não relaxe isso sem decisão do usuário.
- O romaji exibido (`toDisplayRomaji`) é sempre derivado do hiragana; **nunca é salvo** no modelo de dados. O hiragana é cadastrado manualmente (kanji não converte de forma confiável).

## Convenções

- Svelte 5: usar sempre runes (`$state`, `$derived`, `$effect`), não a sintaxe do Svelte 4. Sem SvelteKit.
- Código, comentários e textos da UI em português.
- Mensagens de commit em inglês, seguindo o padrão Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`...).
- A interface é provisória (CSS simples e escopado); prioridade é a funcionalidade.
- Deploy previsto na Vercel (Vite detectado automaticamente). O localStorage é por domínio, então mudar de URL exige exportar/importar o JSON.
