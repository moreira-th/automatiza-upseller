# UpSeller Moreira — Resumo do Projeto

## Estrutura

```
upseller-unificado/
├── manifest.json          — MV3: nome, permissões, comandos de teclado, content_script
├── background.js          — Service worker: menus de contexto, atalhos globais, coordenação multi-aba
├── popup.html             — Popup com 4 abas (CSS inline)
├── popup.js               — Lógica do popup: abas, grid de medidas, preços, progresso
├── remap-content.js       — Content script injetado em edit/*: automação da página + diálogos in-page
├── icons/                 — Ícones 16/48/128
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
- `content_scripts`: injeta `remap-content.js` em `https://app.upseller.com/pt/products/shein/edit/*`
- `commands`: atalhos de teclado (`Alt+Z` = `executar-macro`, `Alt+X` = `aplicar-precos`)

### `background.js`
- `chrome.contextMenus`: menu de contexto com itens planos (sem submenus)
- `chrome.commands.onCommand`: handlers para `executar-macro` e `aplicar-precos`
- `chrome.contextMenus.onClicked`: envia mensagens para o content script
- Coordenação multi-aba (remapeamento em lote)
- **Service worker é stateless** — dados persistentes em `chrome.storage.local`

### `popup.html` / `popup.js`
- 4 abas: Remapeamento, Biblioteca, Medidas, Preços
- Cada aba com sua lógica em `popup.js`
- `restaurarUltimosPrecos()` / `salvarUltimosPrecos()`: persiste/restaura dados de preços

### `remap-content.js`
- Funções principais de automação:
  - `runAutomation(callback)`: remapeamento completo (selecionar especificações, remapear, tamanhos)
  - `preencherGuiaTamanhos(dados)`: preenche o popover de guia de tamanhos
  - `setPrecosCompletos(bulkPrice, overrides)`: preço especial em massa com scroll virtual
  - `abrirDialogPrecos()`: overlay modal in-page para preços
  - `abrirDialogMedidas()`: overlay modal in-page para medidas
- Handlers `chrome.runtime.onMessage`: `start-remap-full`, `fill-size-guide`, `remap-and-measure`, `set-precos-completos`, `open-precos-dialog`, `open-medidas-dialog`

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

### 1. Handler no content script (`remap-content.js`)
```js
if (request.action === 'minha-nova-acao') {
  // fazer algo na página
  sendResponse({ status: 'ok' });
  return true;
}
```

### 2. (Opcional) Comando de teclado em `manifest.json`
```json
"commands": {
  "minha-funcao": {
    "suggested_key": { "default": "Alt+M" },
    "description": "Descrição do atalho"
  }
}
```

### 3. Handler no `background.js`
```js
if (command === "minha-funcao") {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;
    chrome.tabs.sendMessage(tabs[0].id, { action: 'minha-nova-acao' });
  });
}
```

### 4. (Opcional) Item no menu de contexto (`background.js`)
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

### 6. Recarregue a extensão em `chrome://extensions`

## Persistência (chrome.storage.local)

Chaves em uso:

| Chave | Formato | Onde é usada |
|-------|---------|-------------|
| `biblioteca` | `{ [nome]: { descricao, PP: {b,c}, P: {b,c}, ... } }` | Medidas, abrirDialogMedidas |
| `ultimaSelecionada` | `string` (nome da tabela) | Medidas, contexto, abrirDialogMedidas |
| `ultimosPrecos` | `{ bulkPrice: string, overrides: { [tamanho]: string } }` | Preços, abrirDialogPrecos |
