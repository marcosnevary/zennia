# UI Guidelines — Auditoria de Interface

Use este documento para analisar a interface do projeto e apontar pontos de melhoria.
Para cada problema encontrado, informe: **arquivo/componente**, **regra violada**, **sugestão concreta** (com valores/código quando possível) e **prioridade** (alta / média / baixa).
Estas são diretrizes, não leis: aponte desvios, mas considere o contexto antes de recomendar mudanças.

---

## 1. Affordances e signifiers

- [ ] Elementos interativos parecem interativos (cursor, hover, cor, container).
- [ ] Itens relacionados estão agrupados visualmente (container, proximidade).
- [ ] Item selecionado/ativo é claramente diferenciado (ex.: nav ativa, tab selecionada).
- [ ] Itens inativos/desabilitados usam texto acinzentado e não respondem a clique.
- [ ] Ícones sem texto têm tooltip ou `aria-label`.

## 2. Hierarquia visual

- [ ] A informação mais importante está no topo, maior e em negrito.
- [ ] Informação secundária (datas, metadados) é menor e fica abaixo.
- [ ] Hierarquia é criada por contraste (tamanho, peso, cor), não só por posição.
- [ ] Dado-chave (ex.: preço, status) se destaca por cor/alinhamento.
- [ ] Imagens são usadas quando ajudam a escanear o conteúdo.
- [ ] Ícones substituem texto redundante quando possível (ex.: origem → destino).

## 3. Espaçamento e layout

- [ ] Todos os espaçamentos, tamanhos e paddings são múltiplos de **4px**.
- [ ] Espaçamento consistente entre blocos (referência: **32px**); elementos relacionados ficam mais próximos entre si.
- [ ] Há espaço em branco suficiente — nada parece apertado.
- [ ] Conteúdo repetitivo (listas, galerias, cards) segue um grid: 12 col desktop / 8 tablet / 4 mobile.
- [ ] Sem valores "mágicos" soltos (ex.: `13px`, `27px`) — preferir tokens/variáveis.

## 4. Tipografia

- [ ] Apenas **uma** família de fonte (sans-serif).
- [ ] Sites/landing pages: no máximo **6 tamanhos** de fonte.
- [ ] Dashboards: tamanhos geralmente **≤ 24px**.
- [ ] Títulos grandes: `letter-spacing` entre **-2% e -3%** e `line-height` entre **110% e 120%**.
- [ ] Tamanhos de fonte definidos como tokens, não espalhados pelo código.

## 5. Cor

- [ ] Existe **uma cor primária** com variações claras (fundos) e escuras (texto).
- [ ] Cores definidas como tokens/variáveis (escala de cor), não hex soltos.
- [ ] Cores semânticas usadas com consistência: azul = info/confiança, vermelho = erro/perigo, amarelo = aviso, verde = sucesso.
- [ ] Cor é usada com propósito, não só decoração.
- [ ] Contraste de texto atende WCAG AA (4.5:1 texto normal, 3:1 texto grande).

## 6. Dark mode (se houver)

- [ ] Bordas com baixo contraste (sutis, não brancas/claras demais).
- [ ] Profundidade criada com superfícies mais claras que o fundo, não com sombras.
- [ ] Chips/badges/cores fortes com saturação e brilho reduzidos.

## 7. Sombras (light mode)

- [ ] Sombras com baixa opacidade e blur alto.
- [ ] Cards com sombra sutil; popovers/modais/dropdowns com sombra mais forte.
- [ ] Nenhuma sombra chama mais atenção que o conteúdo.

## 8. Ícones e botões

- [ ] Tamanho do ícone = `line-height` do texto ao lado (ex.: 24px).
- [ ] Ícones de um mesmo estilo/biblioteca.
- [ ] Padding de botão: horizontal ≈ **2× o vertical**.
- [ ] Hierarquia clara entre botão primário, secundário e ghost.
- [ ] Links de navegação lateral funcionam como ghost buttons (fundo só no hover/ativo).

## 9. Feedback e estados

- [ ] Botões têm: **default, hover, active/pressed, disabled** (e **loading** quando aplicável).
- [ ] Inputs têm: **focus**, **erro** (borda vermelha + mensagem), e **warning** quando aplicável.
- [ ] Estados de focus visíveis para navegação por teclado.
- [ ] Carregamento de dados mostra spinner/skeleton.
- [ ] Ações concluídas mostram confirmação (toast, mensagem de sucesso).
- [ ] Estados vazios (empty states) são tratados.

## 10. Microinterações

- [ ] Ações sem resultado visível dão confirmação (ex.: "Copiado!" ao copiar).
- [ ] Transições suaves e curtas (~150–300ms) em hover/abrir/fechar.
- [ ] Respeita `prefers-reduced-motion`.

## 11. Texto sobre imagem

- [ ] Texto sobre imagem é legível.
- [ ] Preferir **gradiente linear** (imagem → fundo legível) em vez de overlay escuro chapado.
- [ ] Opcional: blur progressivo sobre o gradiente.

---

## Formato da resposta esperada

1. **Resumo geral** (2–3 frases sobre o estado da interface).
2. **Problemas encontrados**, agrupados por prioridade, cada um com local, regra, sugestão e exemplo de código.
3. **Quick wins**: as 3–5 mudanças de maior impacto com menor esforço.
