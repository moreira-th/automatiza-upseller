# UpSeller Moreira — Resumo do Projeto

## Estrutura

```
upseller-unificado/
├── manifest.json          — MV3: nome, permissões, comandos de teclado, content_script
├── background.js          — Service worker: menus de contexto, atalhos globais, coordenação multi-aba
├── popup.html             — Popup com abas (CSS inline)
├── popup.js               — Lógica do popup: abas, grid de medidas, preços, progresso
├── icons/                 — Ícones 16/48/128
│
├── state.js               — Estado global: _currentRemapDialog, _personalizadasAdicionadas
├── common.js              — sleep, esperarElemento, nativeClick, findMainDialog, normalizarCor...
├── message-router.js      — chrome.runtime.onMessage.addListener — todos os handlers num só lugar
├── main.js                — Entry point: MutationObserver + setTimeout > injectors + drafts
│
├── remapeamento.js        — stepSelecionarTamanho, stepConfirmar, stepMapearVariantes, runAutomation...
├── medidas.js             — abrirDialogMedidas (overlay), preencherGuiaTamanhos, upsDialog...
├── precos.js              — setPrecosCompletos, abrirDialogPrecos (overlay)
├── editar-massa.js        — encontrarColunasMassa, subespecificacaoMassa, setColunaEmMassa...
├── sku.js                 — gerarSkuEmMassa, injetarBotaoSkuNoAnuncio (auto-trigger 500ms)
├── atributos.js           — expandirAtributos, esperarAtributosExpandirem, lerAtributos, aplicarAtributo...
├── cores.js               — traduzirCorEnPt, mostrarDialogoConfirmarCores, aplicarCoresNaPagina...
├── imagem.js              — recortarImagemQuadradaEmMassa, ajustarCoresERecortar, upload...
├── overlay.js             — criarOverlayProgresso, overlay multi-aba
├── drafts.js              — monitorToolbarDrafts, upsExecutarAtributosPopup, clickInMain...
├── injectors.js           — injetarBotaoOverlay, injetarBotaoPrecoEspecial (botões flutuantes)
│
└── RESUMO.md              — Este arquivo
```

## Fluxo de Comunicação

```
popup ──chrome.tabs.sendMessage──▶ remap-content.js
                                    ↑
background.js ──────────────────────┘
  (context menu / Alt+Z / Alt+X)
```

- **Popup → Content Script**: `chrome.tabs.sendMessage(tab.id, { action: '...', ...dados })`
- **Background → Content Script**: `chrome.tabs.sendMessage(tab.id, { action: '...' })`
- **Content Script → Popup**: `chrome.runtime.sendMessage({ action: 'progress', ... })`
- **NUNCA** use `window.postMessage` — o mundo isolado do content script não recebe mensagens da página no Chrome MV3.

## Responsabilidades dos Arquivos

### `manifest.json`
- `name`, `permissions`, `host_permissions`
- `content_scripts`: injeta 15 módulos em ordem (state → common → ... → main.js) em `https://app.upseller.com/pt/products/shein/edit/*` e `drafts*`
- `commands`: atalhos de teclado (`Alt+Z` = `executar-macro`, `Alt+X` = `aplicar-precos`)

### `background.js`
- `chrome.contextMenus`: menu de contexto com itens planos (sem submenus)
- `chrome.commands.onCommand`: handlers para `executar-macro` e `aplicar-precos`
- `chrome.contextMenus.onClicked`: envia mensagens para o content script
- Coordenação multi-aba (tile/gather tabs, processamento paralelo/sequencial)
- **Service worker é stateless** — dados persistentes em `chrome.storage.local`

### `popup.html` / `popup.js`
- Overlay de medidas (Automatiza Shein) com abas
- `restaurarUltimosPrecos()` / `salvarUltimosPrecos()`: persiste/restaura dados de preços
- Export/Import seletivo por categoria

### Content Scripts (15 módulos carregados em ordem)

| # | Módulo | Responsabilidade |
|---|--------|------------------|
| 1 | `state.js` | Variáveis globais compartilhadas |
| 2 | `common.js` | Utilitários: sleep, esperarElemento, nativeClick, findMainDialog, normalizarCor, capitalizarTitulo... |
| 3 | `remapeamento.js` | Remapeamento: stepSelecionarTamanho, stepMapearVariantes, runAutomation... |
| 4 | `medidas.js` | Overlay "Automatiza Shein" + guia de tamanhos + upsDialog |
| 5 | `precos.js` | Preço especial: setPrecosCompletos, abrirDialogPrecos |
| 6 | `editar-massa.js` | Editar em massa: subespecificacaoMassa, setColunaEmMassa... |
| 7 | `sku.js` | SKU: gerarSkuEmMassa + auto-trigger 500ms |
| 8 | `atributos.js` | Atributos: expandirAtributos, lerAtributos, aplicarAtributo... |
| 9 | `cores.js` | Cores: traduzirCorEnPt, confirmarCores, aplicarCoresNaPagina... |
| 10 | `imagem.js` | Imagem: recortarImagemQuadradaEmMassa, ajustarCoresERecortar... |
| 11 | `overlay.js` | Overlays de progresso: criarOverlayProgresso, overlay multi-aba |
| 12 | `drafts.js` | Drafts: monitorToolbarDrafts, atributos em massa... |
| 13 | `injectors.js` | Botões flutuantes: injetarBotaoOverlay, injetarBotaoPrecoEspecial |
| 14 | `message-router.js` | chrome.runtime.onMessage centralizado — dispatchers para todos os módulos |
| 15 | `main.js` | Entry point: MutationObserver + setTimeout para injectors + drafts |

## Padrão: Diálogos In-Page (Overlay Modal)

Para criar um novo diálogo:

1. Crie uma `<div>` fixa com `z-index: 999999`, fundo semi-transparente
2. Use `id` único para o overlay (ex: `upseller-meu-dialog-overlay`)
3. Remova o existente se já houver (`document.getElementById(...).remove()`)
4. Anexe ao `document.body`
5. Para ações confirmadas, leia dados do `chrome.storage.local` e execute via handlers do content script

## vxe-table (Virtual Scrolling) — Cuidados

- Apenas ~10–14 linhas visíveis por vez
- `setPrecosCompletos` usa scroll assíncrono (`await sleep(150)`) com saltos de 80px
- Classes do corpo: `col_2` (Cor), `col_3` (Tamanho), `col_7` (Preço Especial)
- Classes do cabeçalho: `col_38`–`col_46`

## Como Adicionar uma Nova Funcionalidade

### 1. Criar módulo (`novo-modulo.js`)
```js
// ========== NOVO MÓDULO ==========
async function minhaNovaFuncao() {
  // acessa funções de common.js, state.js diretamente
  // (todas estão no escopo global, ordem definida no manifest.json)
}
```

### 2. Handler no message-router (`message-router.js`)
```js
if (request.action === 'minha-nova-acao') {
  minhaNovaFuncao().then(r => sendResponse(r)).catch(e => sendResponse({ error: e.message }));
  return true;
}
```

### 3. Adicionar ao manifest.json
No `content_scripts[0].js`, adicione o novo módulo ANTES de `message-router.js`:
```json
"js": ["state.js", "common.js", ..., "novo-modulo.js", ..., "message-router.js", "main.js"]
```

### 4. (Opcional) Comando de teclado em `manifest.json`
```json
"commands": {
  "minha-funcao": {
    "suggested_key": { "default": "Alt+M" },
    "description": "Descrição do atalho"
  }
}
```

### 5. Handler no `background.js`
```js
if (command === "minha-funcao") {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;
    chrome.tabs.sendMessage(tabs[0].id, { action: 'minha-nova-acao' });
  });
}
```

### 6. (Opcional) Item no menu de contexto (`background.js`)
```js
chrome.contextMenus.create({
  id: "meuItem",
  title: "🔧 Meu Item",
  contexts: ["all"],
  documentUrlPatterns: ["https://*.upseller.com/pt/products/*"]
});
```

### 5. (Opcional) Botão/UI no popup (`popup.html` + `popup.js`)
- Adicione uma nova `div.tab-content` no `popup.html`
- Adicione lógica no `popup.js`

### 7. Recarregue a extensão em `chrome://extensions`

## Persistência (chrome.storage.local)

Chaves em uso:

| Chave | Formato | Onde é usada |
|-------|---------|-------------|
| `biblioteca` | `{ [nome]: { descricao, PP: {b,c}, P: {b,c}, ... } }` | Medidas, abrirDialogMedidas |
| `ultimaSelecionada` | `string` (nome da tabela) | Medidas, contexto, abrirDialogMedidas |
| `ultimosPrecos` | `{ bulkPrice: string, overrides: { [tamanho]: string } }` | Preços, abrirDialogPrecos |
