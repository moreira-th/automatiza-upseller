---
name: teste-upseller
description: Testar funcionalidades no UpSeller via Playwright. Use para abrir anúncio, testar fetch de imagem, clicar em botões ou verificar estado da página.
---

## Quando usar
- "Testa no anúncio X"
- "Testa o link da tabela"
- "Abre o navegador e testa"
- "Verifica se a imagem carrega"

## Fluxo de teste

### 1. Abrir página de edição
```javascript
// Navegar para o produto
await page.goto('https://app.upseller.com/pt/products/shein/edit/{PRODUCT_ID}');
// Aguardar carregamento
await page.getByText('Informação Básica').first().waitFor({ state: 'visible' });
```

### 2. Testar fetch de URL
```javascript
const result = await page.evaluate(async (url) => {
  try {
    const r = await fetch(url);
    return { ok: r.ok, status: r.status, type: r.headers.get('content-type') };
  } catch(e) { return { error: e.message }; }
}, 'https://...');
```

### 3. Testar função específica
```javascript
const result = await page.evaluate(() => {
  // Simular o que a função faria
  const dialog = document.querySelector('.ant-modal-content');
  if (!dialog) return 'no dialog';
  
  const rows = dialog.querySelectorAll('tr');
  for (const row of rows) {
    const fc = row.querySelector('td:first-child');
    if (fc && fc.textContent.trim() === 'Tamanho') {
      return { found: true, text: fc.textContent };
    }
  }
  return { found: false };
});
```

### 4. Interagir com a UI
```javascript
// Clicar em botão
await page.getByText('Remapeamento de Variante').first().click();
await page.waitForTimeout(2000);

// Selecionar dropdown
await page.getByRole('combobox').click();
await page.getByRole('option', { name: 'Tamanho' }).click();

// Clicar Confirmar
await page.getByRole('button', { name: 'Confirmar' }).click();
```

### 5. Verificar estado via snapshot
```javascript
const snapshot = await page.accessibility.snapshot();
// Analisar estrutura YAML retornada
// Procurar por refs, textos, estados de elementos
```

## URLs de teste comuns

| Propósito | URL |
|-----------|-----|
| Produto com variantes | `https://app.upseller.com/pt/products/shein/edit/598752940662043` |
| Produto alternativo | `https://app.upseller.com/pt/products/shein/edit/4409247925342130` |
| Drafts | `https://app.upseller.com/pt/products/shein/drafts` |

## Padrões de verificação

| O que verificar | Como |
|----------------|------|
| Imagem carrega | `fetch(url)` → 200 + `img.onload` |
| Dropdown abre | `querySelector('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')` |
| Seleção aplicada | `querySelector('.ant-select-selection-selected-value')` mostra valor |
| Botão clicável | `el.offsetHeight > 0 && !el.disabled` |
| Overlay visível | `document.getElementById('upseller-medidas-overlay')` existe |
