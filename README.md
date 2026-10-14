# Nihongo

App web para praticar vocabulário de japonês: o app mostra uma palavra, você digita a leitura em romaji e ele diz se acertou, com a resposta correta e o significado.

Stack: Svelte 5 + Vite + TypeScript, wanakana, localStorage (sem backend).

## Rodar

```bash
npm install
npm run dev      # desenvolvimento
npm test         # testes da lógica de correção
npm run check    # checagem de tipos
npm run build    # build de produção em dist/
```

## Como funciona

- **Prática:** sorteia uma palavra; você digita o romaji e o app corrige comparando o som em hiragana.
- **Correção:** aceita `shi/si`, `chi/ti`, `tsu/tu`, `fu/hu`, `ji/zi`, macrons (`ō`), maiúsculas e espaços extras. Se só o comprimento de uma vogal difere (`tokyo` em vez de `toukyou`), o resultado é "quase" e conta como erro.
- **Palavras:** cadastre `japonês`, `hiragana` e `significado`. O romaji não é salvo: é gerado do hiragana.
- **Importar/exportar:** JSON com campo `version`. Importar pode mesclar (ignora duplicados) ou substituir a pool.
- **Dados:** ficam no localStorage do navegador, por domínio. Exporte o JSON de tempos em tempos como backup.

## Estrutura

```
src/
  App.svelte            abas e persistência
  lib/
    types.ts            Word, Verdict, WordsFile
    romaji.ts           normalização e correção (wanakana)
    words.ts            validação de dados externos e mesclagem
    storage.ts          único ponto de acesso aos dados (localStorage)
    io.ts               exportar/importar JSON
    Practice.svelte     tela de prática
    Manage.svelte       CRUD de palavras e import/export
```

Para trocar o localStorage por IndexedDB ou um backend, reescreva só `storage.ts`.

## Deploy na Vercel

1. Suba o projeto para um repositório no GitHub.
2. Na Vercel, importe o repositório. O Vite é detectado sozinho (build `npm run build`, saída `dist`).
3. Cada push gera um deploy; branches e PRs ganham URL de preview.

Lembrete: o localStorage é separado por domínio. Se a URL mudar, exporte o JSON antes e importe no novo endereço.
