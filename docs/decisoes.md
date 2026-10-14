# Nihongo: decisões do projeto

App web pessoal para praticar vocabulário de japonês: mostra uma palavra, o usuário digita a leitura em romaji e o app diz se acertou, com a resposta correta e o significado.

Princípios: começar pequeno, funcionalidade antes de interface (a interface vai mudar bastante), palavras cadastradas manualmente pelo usuário.

## Estado atual

MVP pronto e rodando localmente (`npm run dev`). Stack: Svelte 5 + Vite + TypeScript + wanakana + localStorage, sem backend. Deploy planejado na Vercel.

## Funcionalidades do MVP

- **Prática:** mostra a palavra em japonês, caixa de romaji, botão Verificar; resultado com correto/quase/incorreto, hiragana, romaji gerado e significado; botão Próxima.
- **Sorteio:** palavra aleatória da pool, sem repetir a anterior em sequência.
- **Gerenciar palavras:** adicionar, editar e excluir dentro do app.
- **Importar e exportar:** JSON, com opção de mesclar ou substituir.
- **Persistência:** localStorage, sem backend.

O significado é texto livre, então vários significados ficam no mesmo campo.

## Regras de correção

A correção compara o som, não o texto: o que foi digitado vira hiragana (wanakana) e é comparado com o hiragana cadastrado.

| Situação | Resultado |
| --- | --- |
| `shi/si`, `chi/ti`, `tsu/tu`, `fu/hu`, `ji/zi` | Correto |
| Macron (`ō`, `ū`): vale qualquer expansão (おう ou おお) | Correto |
| Maiúsculas e espaços extras; `nn` no fim da palavra como ん | Correto |
| Só o comprimento de uma vogal difere (`tokyo` em vez de `toukyou`) | "Quase" (conta como erro) |
| Qualquer outra diferença | Incorreto |

Por que o comprimento da vogal não é ignorado: ele muda a palavra (おばさん tia / おばあさん avó, ゆき neve / ゆうき coragem, ビル prédio / ビール cerveja).

Katakana é convertido para hiragana antes de comparar. O `ー` vira a mesma vogal anterior (`コーヒー` = `koohii`), porque a wanakana, por padrão, converte `ー` em `う` na linha do o.

## Modelo de dados

```json
{ "id": "uuid", "japanese": "食べる", "hiragana": "たべる", "meaning": "comer" }
```

O romaji não é salvo: é gerado na hora a partir do hiragana (`toRomaji`). Motivos: um campo a menos para preencher e nenhum risco de divergir do hiragana. O hiragana é cadastrado manualmente, pois kanji não converte de forma confiável (várias leituras); gerá-lo automaticamente (kuroshiro) ficou fora do MVP.

## Importar e exportar

JSON é o formato principal, com campo `version` para migrações. CSV fica para depois, só importação, quando houver necessidade de cadastro em lote (UTF-8 com BOM para o Excel; PapaParse). Import/export ficam em módulo isolado (`src/lib/io.ts`).

## Stack e arquitetura

- **Svelte 5 + Vite (sem SvelteKit):** menos código que React, CSS escopado, app de uma página só. Usar sempre a sintaxe de runes (`$state`, `$derived`, `$effect`), não a do Svelte 4.
- **TypeScript leve:** tipo `Word` e tipos nas funções de `storage` e import/export.
- **wanakana:** `toHiragana` para corrigir e `toRomaji` para exibir.
- **localStorage:** acesso isolado em `src/lib/storage.ts`; trocar por IndexedDB ou backend só mexe nesse arquivo.
- **Estilo:** CSS simples; a interface vai mudar.

## Deploy

Vercel (detecta o Vite, deploy a cada push, previews por branch). Alternativas avaliadas: Netlify (equivalente) e GitHub Pages (exige `base` no Vite e Actions, sem backend). Cuidado: o localStorage é separado por domínio; exporte o JSON como backup antes de trocar de URL.

## Backlog

- Repetição espaçada (SRS) com estatísticas de acertos e erros por palavra
- Tags e categorias com filtro (ex.: JLPT N5, verbos)
- Modo inverso: significado para japonês ou romaji
- Importação de CSV
- Opção "ignorar comprimento de vogal" nas configurações
- Campo opcional de romaji próprio
- Botão "sugerir hiragana" a partir do japonês (kuroshiro/kuromoji, carregado sob demanda)
- Sincronização entre dispositivos (login e backend)
- PWA para uso no celular
