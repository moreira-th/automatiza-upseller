---
name: debug-macro
description: Diagnosticar erros na macro da extensão UpSeller. Use quando a macro parar, botões não clicarem, overlay não abrir ou multi-aba falhar.
---

## Quando usar
- "Macro parou no step X"
- "Erro no remapeamento"
- "Botão não foi clicado"
- "Overlay não abriu"
- "Multi-aba não trocou de aba"

## Fluxo de diagnóstico

### 1. Verificar console (F12)
- Abrir DevTools na aba de edição
- Filtrar por `[Ups]` ou erros não capturados
- Verificar se há `ReferenceError` (função não definida = módulo fora de ordem)

### 2. Verificar handlers registrados
```javascript
// No console da página, testar se o message router responde:
chrome.runtime.sendMessage({ action: 'open-medidas-dialog' }, (r) => console.log(r));
```

### 3. Arquivos relevantes por seção
| Erro em | Arquivo |
|---------|---------|
| Remapeamento | `automacao.js` (funções `step*`, `runAutomation`) |
| Medidas/Overlay | `automacao.js` (`abrirDialogMedidas`) |
| Preços | `automacao.js` (`setPrecosCompletos`, `abrirDialogPrecos`) |
| Atributos | `extras.js` (`expandirAtributos`, `aplicarAtributo`) |
| Cores | `extras.js` (`traduzirCorEnPt`, `aplicarCoresNaPagina`) |
| Imagem | `extras.js` (`recortarImagemQuadradaEmMassa`) |
| SKU | `extras.js` (`gerarSkuEmMassa`) |
| Drafts | `extras.js` (`monitorToolbarDrafts`) |
| Multi-aba | `background.js` |

### 4. Testar função isoladamente via Playwright
- Navegar para `https://app.upseller.com/pt/products/shein/edit/{id}`
- Aguardar `Confirmar` ou `Remapeamento de Variante`
- Executar função via `page.evaluate` e verificar retorno

### 5. Verificar ordem de carregamento
- `manifest.json` → `content_scripts[0].js`
- Ordem correta: `core.js` → `overlay.js` → `extras.js` → `automacao.js` → `entry.js`
- Se `automacao.js` carrega antes de `core.js`, funções como `sleep` não existem

## Padrões comuns de erro

| Sintoma | Causa provável | Solução |
|---------|---------------|---------|
| `X is not defined` | Função em módulo não carregado | Verificar ordem no manifest |
| Menu abre mas opção não clica | Dropdown errado (aria-controls) | Verificar `stepSelecionarTamanho` |
| "Nenhum atributo configurado" | `await` faltando em `lerAtributos()` | Adicionar `await` |
| Caracteres estranhos na overlay | Encoding corrompido (PowerShell) | Re-extrair com Node.js UTF-8 |
| Sequencial não troca aba | `background.js` SW foi terminado | Verificar `chrome.storage.session` |
