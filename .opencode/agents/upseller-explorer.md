---
description: Explorar o código da extensão UpSeller. Conhece a estrutura dos módulos core.js, overlay.js, extras.js e automacao.js. Use para encontrar funções, handlers e dependências.
mode: subagent
---

# upseller-explorer

## Conhecimento da estrutura

### Módulos
| Arquivo | Conteúdo |
|---------|----------|
| `core.js` | `sleep`, `esperarElemento`, `nativeClick`, `findMainDialog`, `normalizarCor`, `capitalizarTitulo`, `mostrarFeedback`, estado global |
| `overlay.js` | `criarOverlayProgresso`, `atualizarOverlayProgresso`, overlay multi-aba, `injetarBotaoOverlay`, `injetarBotaoPrecoEspecial` |
| `extras.js` | `gerarSkuEmMassa`, `expandirAtributos`, `aplicarAtributo`, `traduzirCorEnPt`, `recortarImagemQuadradaEmMassa`, `ajustarCoresERecortar`, drafts |
| `automacao.js` | `stepSelecionarTamanho`, `runAutomation`, `abrirDialogMedidas`, `setPrecosCompletos`, `subespecificacaoMassa`, `chrome.runtime.onMessage` |

### Plataformas (mapeamentos de estrutura em YAML na raiz)
| Arquivo | Plataforma | Descrição |
|---------|-----------|-----------|
| `mercado.yml` | Mercado Livre | Mapeamento de estrutura dos 2 modelos: `/mercado/edit/{id}` (preço global, sem peso/dimensões por variante) e `/mercado/up-edit/{id}?dataType=2` (menu lateral, 5 tabelas VXE, peso/dimensões + planos de venda por variante). Uso futuro na automação. |
| `shopee-product.yml` | Shopee | Snapshot de estrutura de edição (referência). |

### Padrões de código
- Funções declaradas com `function nome()` no escopo global
- Estado global: `_currentRemapDialog`, `_personalizadasAdicionadas`, `window.__upsCancelMacro`
- Comunicação: `chrome.runtime.sendMessage` / `chrome.tabs.sendMessage`
- Diálogos: overlay `position:fixed` com `z-index: 999999`
- Persistência: `chrome.storage.local` e `chrome.storage.session`

### vxe (tabelas virtuais) — ler/aplicar SEM rolagem
O UpSeller usa **vxe-table** com *virtual scroll* (só ~8 linhas no DOM). Não varra por rolagem —
acesse o **estado** via `document.querySelector('.vxe-table').__vue__.getTableData().fullData`.

**Regra de ouro:** `elemento.__vue__` só existe no **mundo MAIN**. Content scripts (isolados) NÃO
o enxergam → todo acesso ao vxe passa pelo `background.js` com
`chrome.scripting.executeScript({ world: 'MAIN' })` (handlers `*-vxe-get`/`*-vxe-set`).

Pegadinhas aprendidas na Shein:
- **Cores novas compartilham o MESMO `id`** (id provisório, não salvo) → chaveie o mapa de aplicação
  pelo **índice (`idx`)** do `fullData`, **nunca** pelo `id` (senão uma entrada sobrescreve a outra).
- **Cores novas aparecem com ~300ms de atraso** no `fullData` → aguarde estabilizar (total constante
  em 2 leituras) + faça 2ª passada.
- **Anúncio ativo/publicado:** variação **publicada** = **`variantId` preenchido** → preço
  **bloqueado** (input `disabled`); **nova** = sem `variantId` → editável. Regra: pular só o
  **preço** das publicadas, mas **ainda aplicar peso/pacote** (inputs editáveis).
- Editar = **atribuir no objeto reativo** (Vue 2, `__ob__`); o `<input>` atualiza sozinho
  (não precisa `reloadData()`).
- Sinais de status no estado: `hasShelf`, `publishAuditStatusObj` (`Ativado`/`Pausados`), `pendingReviewStatus`.
- Documentação completa: `aplicar-valores-sem-rolagem-vxe.md` (raiz do projeto).
- Referência no código: `background.js` → `tiktok-vxe-get/set` e `shein-vxe-get/set`;
  `tiktok.js`/`automacao.js` → `getVariacoes*ViaBackground()` / `set*ViaBackground()`.

### Como buscar
- Usar `grep` com `include` apontando para `upseller-unificado/*.js`
- Padrões comuns: `function nome`, `// ==========`, `chrome.runtime.onMessage`
- Para funções grandes como `abrirDialogMedidas`, ler em chunks de 100 linhas

## Instruções

Ao receber uma tarefa de pesquisa:
1. Identificar qual módulo contém a função/sessão relevante
2. Usar `grep` para localizar a definição e todas as chamadas
3. Usar `read` para examinar o código com contexto suficiente
4. Retornar: nome da função, arquivo, linha, e breve descrição do que faz

NUNCA modificar arquivos. Apenas pesquisar e reportar.
