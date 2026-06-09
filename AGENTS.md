# UpSeller Moreira — Guia para Agentes

## Arquitetura

- **5 módulos** carregados em ordem no `manifest.json`: `core.js` → `overlay.js` → `extras.js` → `automacao.js` → `entry.js`
- Escopo global, sem `import`/`export` — ordem importa (função definida antes é chamada depois)
- `core.js` (126 linhas): `sleep`, `esperarElemento`, `nativeClick`, `normalizarCor`, `capitalizarTitulo`, `mostrarFeedback`, estado global (`_currentRemapDialog`, `_personalizadasAdicionadas`)
- `overlay.js` (167 linhas): `criarOverlayProgresso`, overlay multi-aba, `injetarBotaoOverlay`, `injetarBotaoPrecoEspecial`
- `extras.js` (1435 linhas): `gerarSkuEmMassa`, `expandirAtributos`, `aplicarAtributo`, `traduzirCorEnPt`, `aplicarCoresNaPagina`, `recortarImagemQuadradaEmMassa`, `ajustarCoresERecortar`, drafts
- `automacao.js` (3960 linhas): `stepSelecionarTamanho`, `runAutomation`, `abrirDialogMedidas`, `setPrecosCompletos`, `subespecificacaoMassa`, `encontrarColunasMassa`, `setColunaEmMassa`, `chrome.runtime.onMessage` (roteador)
- `entry.js` (34 linhas): MutationObserver + init + atalhos Ctrl+S/Ctrl+Shift+S
- `background.js` (service worker): menus de contexto, multi-aba, upload de imagem, `cores-confirmed`
- **NÃO existe** mais `remap-content.js`, `state.js`, `common.js`, `message-router.js`, `main.js`, módulos individuais — foram consolidados em maio/2026

## Git

- Parent (`C:\Upseller Extensão`) e submódulo (`upseller-unificado/`) compartilham o mesmo remote: `moreira-th/automatiza-upseller`
- Submódulo não tem `.gitmodules` — o pointer é só no tree (`160000 commit` no `ls-tree`)
- **Push**: primeiro `git push` no submódulo (coloca commit no object DB), depois `git push --force` no parent (atualiza ref + submodule pointer)
- Sempre validar com `node -c upseller-unificado/NOME.js` antes de commitar
- Branch atual: `master`

## Padrões de Código

### React valueTracker — SEMPRE usar nativeSetter
O UpSeller usa React/Ant Design. Atribuição direta `input.value = X` **não funciona** — o valueTracker do React não detecta:
```js
var nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
input.focus();
nativeSetter.call(input, valor);
input.dispatchEvent(new Event('input', { bubbles: true }));
input.dispatchEvent(new Event('change', { bubbles: true }));
input.blur();  // React usa onBlur para commitar estado
```

### Polling > sleep fixo
Preferir `esperarElemento(seletor, timeout, intervalo)` e `esperarAtributosExpandirem()` sobre `sleep(N)`.

### Feedback visual
- `mostrarFeedback(msg)` (`extras.js`): toast centrado, 1.5s + 300ms fade
- `upsShowDialog(msg, isError)` (`background.js`): toast centrado, 2s auto-dismiss, verde/vermelho

### Cuidados

- NUNCA usar `window.postMessage` — conteúdo isolado no Chrome MV3
- Service Worker é stateless — dados em `chrome.storage.local` ou `chrome.storage.session`
- `expandirAtributos()` usa `el.innerText` (não `textContent`) — `textContent` inclui ancestors causando falsos positivos
- `aplicarCoresNaPagina()` é fire-and-forget (não `await`) — não compartilha DOM com etapas seguintes
- Multi-aba paralelo: estado em `chrome.storage.session` chave `multiTabParallel`

## Plataforma

- **Shein** (atual): `/pt/products/shein/edit/*` e `drafts*`
- **Shopee** (planejado): estrutura mapeada em `shopee-product.yml`, arquitetura em `platforms.js`

## Comandos

- Validar sintaxe: `node -c upseller-unificado/NOME.js`
- Carregar extensão: `chrome://extensions` → "Carregar sem compactação" → selecionar `upseller-unificado/`
- Playwright: configurado via `opencode.json` (`npx @playwright/mcp`)

## Skills e Agents

- `adicionar-feature`: checklist para checkbox/toggle/botão na overlay (HTML + leitura + salvar/restaurar ×4 + multi-aba)
- `debug-macro`: diagnóstico por sintoma → seção → arquivo
- `teste-upseller`: Playwright para testar fetch de imagem, clicks, snapshots na página de edição
- `upseller-explorer`: agente de busca em código nos 5 módulos
