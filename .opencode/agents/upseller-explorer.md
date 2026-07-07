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

### Padrões de código
- Funções declaradas com `function nome()` no escopo global
- Estado global: `_currentRemapDialog`, `_personalizadasAdicionadas`, `window.__upsCancelMacro`
- Comunicação: `chrome.runtime.sendMessage` / `chrome.tabs.sendMessage`
- Diálogos: overlay `position:fixed` com `z-index: 999999`
- Persistência: `chrome.storage.local` e `chrome.storage.session`

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
