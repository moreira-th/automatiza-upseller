function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function nativeClick(el) {
  el.click();
}

function findMainDialog() {
  const all = document.querySelectorAll('.ant-modal-content');
  for (const d of all) {
    if (d.textContent.includes('Passo 2') || d.textContent.includes('Mapear Valores de Variante')) {
      return d;
    }
  }
  return all[0];
}

function findButtonByText(text) {
  const buttons = document.querySelectorAll('button');
  for (const btn of buttons) {
    if (btn.textContent.trim() === text) return btn;
  }
  return null;
}

function findTextContainer(text) {
  const all = document.querySelectorAll('*');
  for (const el of all) {
    if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') continue;
    const trimmed = el.textContent.trim();
    if (!trimmed.includes(text)) continue;
    const children = el.querySelectorAll('*');
    let hasChild = false;
    for (const child of children) {
      if (child !== el && child.textContent.trim().includes(text)) {
        hasChild = true;
        break;
      }
    }
    if (!hasChild) return el;
  }
  return null;
}

let _personalizadasAdicionadas = 0;

async function stepSelecionarTamanho() {
  const dialog = findMainDialog();
  if (!dialog) throw new Error('Diálogo não encontrado para selecionar Tamanho');

  // Find the row where the first cell text is "Tamanho"
  const rows = dialog.querySelectorAll('tr');
  let tamanhoRow = null;
  for (const row of rows) {
    const firstCell = row.querySelector('td:first-child, th:first-child');
    if (firstCell && firstCell.textContent.trim() === 'Tamanho') {
      tamanhoRow = row;
      break;
    }
  }
  if (!tamanhoRow) return; // já selecionado ou não encontrado

  const selectWrapper = tamanhoRow.querySelector('.ant-select');
  if (!selectWrapper) return;

  // Abrir dropdown
  selectWrapper.click();
  await sleep(500);

  const dropdown = document.querySelector('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
  if (!dropdown) return;

  const option = Array.from(dropdown.querySelectorAll('li')).find(li => li.textContent.trim() === 'Tamanho');
  if (!option) return;

  option.click();
  await sleep(500);
}

async function stepConfirmar() {
  const btn = findButtonByText('Confirmar');
  if (!btn) throw new Error('Botão Confirmar não encontrado');
  nativeClick(btn);
  await sleep(500);
}

async function stepConfirmarCriacao() {
  const btn = findButtonByText('OK');
  if (!btn) return;
  await sleep(1000);
  nativeClick(btn);
  await sleep(1000);
}

async function stepMapearVariantes() {
  _personalizadasAdicionadas = 0;
  const mainDialog = findMainDialog();
  if (!mainDialog) throw new Error('Diálogo principal não encontrado');

  // Collect all rows with .ant-select (both Cor and Tamanho)
  let variantRows = [];
  for (let attempt = 0; attempt < 15; attempt++) {
    variantRows = [];
    const seen = new Set();
    const tables = mainDialog.querySelectorAll('table');
    for (const table of tables) {
      for (const row of table.rows) {
        const cells = row.querySelectorAll('td, th');
        if (cells.length >= 2) {
          const val = cells[0].textContent.trim();
          if (val && !seen.has(val) && cells[1].querySelector('.ant-select')) {
            const skip = ['Remover', 'Variante Original', 'Variante Shein', 'Ações', 'Variação', 'Cor', 'Tamanho'];
            if (!skip.includes(val)) {
              seen.add(val);
              variantRows.push({ name: val, row, cell: cells[1] });
            }
          }
        }
      }
    }
    if (variantRows.length > 0) break;
    await sleep(1000);
  }

  if (variantRows.length === 0) {
    console.warn('Nenhuma variante encontrada para mapear, prosseguindo');
    return;
  }

  let failures = [];
  nextVariant:
  for (const { name } of variantRows) {
    let mapped = false;
    for (let attempt = 0; attempt < 5 && !mapped; attempt++) {
      const dlg = findMainDialog();
      const tables = dlg.querySelectorAll('table');
      for (const table of tables) {
        for (const row of table.rows) {
          const cells = row.querySelectorAll('td, th');
          if (cells.length >= 2 && cells[0].textContent.trim() === name) {
            const selectEl = cells[1].querySelector('.ant-select');
            if (!selectEl) { mapped = true; break; }

            // Open dropdown
            nativeClick(selectEl);
            await sleep(300);

            const dropdowns = document.querySelectorAll('.ant-select-dropdown');
            let visibleDropdown = null;
            for (const dd of dropdowns) {
              if (!dd.classList.contains('ant-select-dropdown-hidden') && dd.style.display !== 'none') {
                visibleDropdown = dd;
                break;
              }
            }
            if (!visibleDropdown) {
              await sleep(500);
              continue;
            }

            const items = visibleDropdown.querySelectorAll('li');
            let found = false;

            // Try to find matching value in dropdown (exact match: case, accent, space)
            for (const item of items) {
              if (item.textContent.trim() === name) {
                nativeClick(item);
                found = true;
                break;
              }
            }

            // If not found, select "Valor de Variante Personalizada"
            if (!found) {
              for (const item of items) {
                if (item.textContent.trim() === 'Valor de Variante Personalizada') {
                  nativeClick(item);
                  await sleep(1000);
                  // Find the text input that appears and set its value
                  const input = selectEl.closest('td, th')?.querySelector('input[type="text"], textarea');
                  if (input) {
                    input.value = name;
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                  }
                  _personalizadasAdicionadas++;
                  found = true;
                  break;
                }
              }
            }

            if (found) { mapped = true; await sleep(500); break; }
            // Dropdown was visible but option not available — close and skip remaining attempts
            nativeClick(selectEl);
            await sleep(200);
            attempt = 5;
          }
        }
        if (mapped) break;
        if (attempt > 4) break;
      }
      if (!mapped && attempt <= 4) await sleep(500);
    }

    if (!mapped) {
      failures.push(name);
      console.warn(`Não foi possível mapear "${name}", continuando`);
    }
  }

  if (failures.length > 0) {
    console.warn('Variantes não mapeadas:', failures.join(', '));
  }
}

async function stepSalvar() {
  const mainDialog = findMainDialog();
  if (!mainDialog) throw new Error('Diálogo não encontrado');
  const buttons = mainDialog.querySelectorAll('button');
  for (const btn of buttons) {
    if (btn.textContent.trim() === 'Salvar') {
      nativeClick(btn);
      await sleep(2000);
      return;
    }
  }
  throw new Error('Botão Salvar não encontrado');
}

async function stepOK() {
  const btn = findButtonByText('OK');
  if (!btn) return;
  await sleep(2000);
  nativeClick(btn);
  await sleep(1500 + 1000 * _personalizadasAdicionadas);
}

async function stepFechar() {
  const btn = findButtonByText('Fechar');
  if (!btn) return;
  await sleep(2000);
  nativeClick(btn);
  await sleep(1000);
}

async function stepAbrirRemapeamento() {
  const remapLink = findTextContainer('Remapeamento de Variante');
  if (!remapLink) throw new Error('Link "Remapeamento de Variante" não encontrado');
  nativeClick(remapLink);
  // Wait for dialog to open
  for (let attempt = 0; attempt < 15; attempt++) {
    if (findMainDialog() || document.querySelector('.ant-modal-content')) {
      await sleep(1000);
      return;
    }
    await sleep(1000);
  }
  throw new Error('Diálogo de remapeamento não abriu após clicar no link');
}

function temSubespecificacao() {
  const forms = document.querySelectorAll('.ant-form-item');
  for (const section of forms) {
    const label = section.querySelector('.ant-form-item-label');
    if (label && label.textContent.trim().includes('Subespecificação')) {
      return section.querySelectorAll('.ant-checkbox-wrapper').length > 0;
    }
  }
  return false;
}

function precisaRemapear() {
  const forms = document.querySelectorAll('.ant-form-item');
  for (const section of forms) {
    const label = section.querySelector('.ant-form-item-label');
    if (!label) continue;
    const text = label.textContent.trim();
    if (text.includes('Especificação Principal')) {
      const checked = section.querySelectorAll('.ant-checkbox-checked').length;
      if (checked === 0) return true;
    }
    if (text.includes('Subespecificação')) {
      const hasCheckboxes = section.querySelectorAll('.ant-checkbox-wrapper').length > 0;
      if (hasCheckboxes) {
        const checked = section.querySelectorAll('.ant-checkbox-checked').length;
        if (checked === 0) return true;
      }
    }
  }
  return false;
}

async function runAutomation(sendProgress) {
  const hasSizes = temSubespecificacao();
  const steps = [
    { name: 'Abrir remapeamento de variantes', fn: stepAbrirRemapeamento },
  ];
  if (hasSizes) {
    steps.push({ name: 'Selecionar Tamanho', fn: stepSelecionarTamanho });
  }
  steps.push(
    { name: 'Confirmar tipo (Passo 1)', fn: stepConfirmar },
    { name: 'Confirmar criação de variantes', fn: stepConfirmarCriacao },
    { name: 'Mapear variantes', fn: stepMapearVariantes },
    { name: 'Salvar remapeamento', fn: stepSalvar },
    { name: 'Confirmar OK', fn: stepOK },
    { name: 'Fechar diálogo de sucesso', fn: stepFechar },
  );
  for (let i = 0; i < steps.length; i++) {
    sendProgress({ step: i + 1, total: steps.length, message: steps[i].name });
    await steps[i].fn();
  }
}

async function preencherGuiaTamanhos(dados) {
  const editLink = Array.from(document.querySelectorAll('*')).find(el => {
    if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') return false;
    if (el.textContent.trim() !== 'Editar Guia de Tamanhos') return false;
    return !Array.from(el.querySelectorAll('*')).some(c => c !== el && c.textContent.trim().includes('Editar Guia de Tamanhos'));
  });
  if (!editLink) return { missing: [] };
  editLink.click();

  let dialog = null;
  for (let i = 0; i < 20; i++) {
    dialog = document.querySelector('.ant-modal-content');
    if (dialog && dialog.textContent.includes('Editar Guia de Tamanhos')) break;
    await sleep(1000);
  }
  if (!dialog || !dialog.textContent.includes('Editar Guia de Tamanhos')) {
    return { missing: [] };
  }

  const selectWrapper = dialog.querySelector('.ant-select');
  if (selectWrapper) {
    selectWrapper.click();
    await sleep(500);
    const dropdown = document.querySelector('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
    if (dropdown) {
      const option = Array.from(dropdown.querySelectorAll('li')).find(li => li.textContent.trim() === 'Tamanho');
      if (option) {
        option.click();
        await sleep(500);
      }
    }
  }

  const linhas = dialog.querySelectorAll('.vxe-table--body-wrapper .vxe-body--row');
  if (linhas.length === 0) return { missing: [] };

  const injetar = (input, val) => {
    if (input && val !== undefined && val !== '') {
      input.focus();
      input.value = val;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.blur();
    }
  };

  const faltantes = [];

  linhas.forEach(linha => {
    const celulaTamanho = linha.querySelector('.vxe-body--column:first-child .vxe-cell');
    if (!celulaTamanho) return;
    let tam = celulaTamanho.innerText.trim().toUpperCase().replace('Y', '').trim();
    if (dados[tam] && (dados[tam].b || dados[tam].c)) {
      const inputs = linha.querySelectorAll('input.ant-input-number-input');
      if (inputs.length >= 2) {
        injetar(inputs[0], dados[tam].b);
        injetar(inputs[1], dados[tam].c);
      }
    } else {
      faltantes.push(tam);
    }
  });

  if (faltantes.length > 0) {
    const closeBtn = dialog.querySelector('.ant-modal-close');
    if (closeBtn) closeBtn.click();
    await sleep(500);
    return { missing: faltantes };
  }

  const saveBtn = dialog.querySelector('.ant-btn-primary');
  if (saveBtn) saveBtn.click();

  return { missing: [] };
}

// ========== PREÇOS ESPECIAIS ==========
async function setPrecosCompletos(bulkPrice, overrides) {
  const table = document.querySelector('.vxe-table');
  if (!table) return { error: 'Tabela de variantes não encontrada' };

  const allHeaders = table.querySelectorAll('.vxe-header--column');
  let tamCol = 'col_3', priceCol = 'col_7';
  allHeaders.forEach((cell) => {
    const txt = cell.textContent.trim().toLowerCase();
    if (!txt) return;
    const cls = Array.from(cell.classList).find(c => c.startsWith('col_'));
    if (!cls) return;
    if (txt === 'tamanho' || (txt.includes('tamanho') && !txt.includes('pacote')) || ['variação', 'grade'].some(k => txt.includes(k))) tamCol = cls;
    if (txt.includes('preço especial') || txt.includes('preco especial')) priceCol = cls;
  });

  const bodyWrapper = table.querySelector('.vxe-table--body-wrapper');
  const maxScroll = bodyWrapper ? bodyWrapper.scrollHeight - bodyWrapper.clientHeight : 0;
  const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  const scrollStep = bodyWrapper ? Math.max(bodyWrapper.clientHeight - 40, 80) : 80;

  const listaTamanhos = ["PP","P","M","G","GG","EGG","G1","G2","G3","G4","G5","2","4","6","8","10","12","14","16"];

  function setRows() {
    const rows = table.querySelectorAll('.vxe-body--row');
    let count = 0;
    rows.forEach(row => {
      try {
        const tamEl = row.querySelector('.' + tamCol);
        if (!tamEl) return;
        const tamText = tamEl.textContent.trim().toUpperCase();
        const tam = listaTamanhos.reduce((found, t) => tamText.includes(t) ? (t.length > found.length ? t : found) : found, '');
        const input = row.querySelector('.' + priceCol + ' input.ant-input-number-input');
        if (!input) return;
        const val = (overrides[tam] || bulkPrice);
        if (input.value !== val) {
          input.focus();
          nativeSetter.call(input, val);
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          input.blur();
          count++;
        }
      } catch (e) { /* skip row on error */ }
    });
    return count;
  }

  let total = setRows();
  if (bodyWrapper && maxScroll > 0) {
    for (let pos = scrollStep; pos < maxScroll; pos += scrollStep) {
      bodyWrapper.scrollTop = pos;
      await sleep(300);
      total += setRows();
    }
    bodyWrapper.scrollTop = maxScroll;
    await sleep(300);
    total += setRows();
    bodyWrapper.scrollTop = 0;
    await sleep(400);
    total += setRows();
  }
  if (bodyWrapper) {
    bodyWrapper.scrollLeft = 0;
    setTimeout(() => { bodyWrapper.scrollLeft = 0; }, 500);
  }
  return { success: true, total };
}

// ========== NOVAS FUNÇÕES AUXILIARES ==========
function encontrarColunasMassa() {
  const table = document.querySelector('.vxe-table');
  if (!table) return {};
  const allHeaders = table.querySelectorAll('.vxe-header--column');
  const map = {};
  allHeaders.forEach(cell => {
    const txt = cell.textContent.trim().toLowerCase();
    const cls = Array.from(cell.classList).find(c => c.startsWith('col_'));
    if (!cls) return;
    if (txt.includes('quantidade')) map.quant = cls;
    else if (txt.includes('preço') && !txt.includes('especial')) map.preco = cls;
    else if (txt.includes('peso')) map.peso = cls;
    else if (txt.includes('pacote')) map.pacote = cls;
  });
  return map;
}
async function setColunaEmMassa(colClass, value, inputSelector) {
  const table = document.querySelector('.vxe-table');
  if (!table) return { error: 'Tabela não encontrada' };
  if (value === '' || value == null) return { error: 'Valor vazio' };

  const values = Array.isArray(value) ? value : [value];
  const bodyWrapper = table.querySelector('.vxe-table--body-wrapper');
  const maxScroll = bodyWrapper ? bodyWrapper.scrollHeight - bodyWrapper.clientHeight : 0;
  const scrollStep = bodyWrapper ? Math.max(bodyWrapper.clientHeight - 40, 80) : 80;
  const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;

  function setRows() {
    const rows = table.querySelectorAll('.vxe-body--row');
    let count = 0;
    rows.forEach(row => {
      try {
        const cell = row.querySelector('.' + colClass);
        if (!cell) return;
        const inputs = inputSelector ? cell.querySelectorAll(inputSelector) : cell.querySelectorAll('input');
        if (!inputs.length) return;
        const max = Math.min(values.length, inputs.length);
        for (let i = 0; i < max; i++) {
          const inp = inputs[i];
          if (inp.value !== values[i]) {
            inp.focus();
            nativeSetter.call(inp, values[i]);
            inp.dispatchEvent(new Event('input', { bubbles: true }));
            inp.dispatchEvent(new Event('change', { bubbles: true }));
            inp.blur();
            count++;
          }
        }
      } catch (e) { /* skip row */ }
    });
    return count;
  }

  await sleep(500);
  let total = setRows();
  if (bodyWrapper && maxScroll > 0) {
    for (let pos = scrollStep; pos < maxScroll; pos += scrollStep) {
      bodyWrapper.scrollTop = pos;
      await sleep(300);
      total += setRows();
    }
    bodyWrapper.scrollTop = maxScroll;
    await sleep(300);
    total += setRows();
    // Final pass: scroll back to top to catch rows that were rendering during the first pass
    bodyWrapper.scrollTop = 0;
    await sleep(400);
    total += setRows();
  }
  if (bodyWrapper) {
    bodyWrapper.scrollLeft = 0;
    setTimeout(() => { bodyWrapper.scrollLeft = 0; }, 500);
  }
  return { success: true, count: total };
}

async function abrirSubespecificacaoSeNecessario() {
  const forms = document.querySelectorAll('.ant-form-item');
  for (const section of forms) {
    const label = section.querySelector('.ant-form-item-label');
    if (!label || !label.textContent.trim().includes('Subespecificação')) continue;
    if (section.querySelectorAll('.ant-checkbox-wrapper').length > 0) return;
    const btn = section.querySelector('button');
    if (btn) { btn.click(); await sleep(3000); }
    return;
  }
}

async function subespecificacaoMassa(tamanhosStr) {
  if (!tamanhosStr || !tamanhosStr.trim()) return { error: 'Nenhum tamanho informado' };
  const sizes = tamanhosStr.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
  if (!sizes.length) return { error: 'Nenhum tamanho informado' };

  await abrirSubespecificacaoSeNecessario();

  // Map para normalizar tamanhos (remove Y para comparação)
  function normalizeSize(s) {
    return s.replace(/Y$/, '');
  }

  const formItems = document.querySelectorAll('.ant-form-item');
  let subItem = null;
  formItems.forEach(fi => {
    const label = fi.querySelector('.ant-form-item-label');
    if (label && label.textContent.trim().includes('Subespecificação')) subItem = fi;
  });
  if (!subItem) return { error: 'Seção Subespecificação não encontrada' };

  // Wait for all checkboxes to be rendered
  await sleep(1000);

  const checkboxes = subItem.querySelectorAll('.ant-checkbox-input');
  let count = 0, uncheckedCount = 0;
  const uncheckedSizes = [];
  const matchedSizes = new Set();

  for (let c = 0; c < checkboxes.length; c++) {
    const cb = checkboxes[c];
    let cbSize = cb.value.trim().toUpperCase();
    // Tenta encontrar pelo wrapper text se value não bater
    if (!sizes.includes(cbSize)) {
      const wrapper = cb.closest('.ant-checkbox-wrapper') || cb.closest('label');
      if (wrapper) {
        const wrapperText = wrapper.textContent.trim().toUpperCase();
        if (sizes.includes(wrapperText)) cbSize = wrapperText;
      }
    }
    // Comparação normalizada: "6" casa com "6Y", "4" casa com "4Y", etc.
    const cbNorm = normalizeSize(cbSize);
    const targetState = !!cbSize && (sizes.includes(cbSize) || sizes.some(s => normalizeSize(s) === cbNorm));

    if (!targetState) {
      if (cbSize) uncheckedSizes.push(cbSize);
      if (cb.checked) {
        const wrapper = cb.closest('.ant-checkbox-wrapper') || cb.closest('label') || cb.parentElement;
        if (wrapper) { wrapper.click(); await sleep(50); }
        uncheckedCount++;
      }
      continue;
    }

    // targetState = true — deve marcar
    const matchedSize = sizes.find(s => s === cbSize || normalizeSize(s) === cbNorm);
    if (!matchedSize) continue;
    if (matchedSizes.has(matchedSize)) continue; // pula duplicata (ex: "p" minúsculo)
    matchedSizes.add(matchedSize);

    if (!cb.checked) {
      const wrapper = cb.closest('.ant-checkbox-wrapper') || cb.closest('label') || cb.parentElement;
      if (wrapper) { wrapper.click(); await sleep(50); }
      count++;
    }
  }

  // Remove variant rows for unchecked sizes from the table
  if (uncheckedSizes.length > 0) {
    const rows = document.querySelectorAll('.vxe-body--row');
    rows.forEach(row => {
      const cells = row.querySelectorAll('.vxe-body--column');
      let shouldRemove = false;
      cells.forEach(cell => {
        const text = cell.textContent.trim().toUpperCase();
        if (uncheckedSizes.includes(text)) {
          shouldRemove = true;
        }
      });
      if (shouldRemove) {
        row.remove();
      }
    });
  }

  return { success: true, count, uncheckedCount };
}

async function gerarSkuEmMassa() {
  const headerCells = document.querySelectorAll('.vxe-header--column');
  let skuHeader = null;
  headerCells.forEach(cell => {
    if (cell.textContent.includes('SKU')) skuHeader = cell;
  });
  if (!skuHeader) return { error: 'Header SKU não encontrado' };

  const spans = skuHeader.querySelectorAll('span.my_txt_btn.f_12');
  let gerarSpan = null;
  spans.forEach(s => {
    if (s.textContent.trim() === 'Gerar') gerarSpan = s;
  });
  if (!gerarSpan) return { error: 'Botão Gerar não encontrado' };
  gerarSpan.click();
  await sleep(1000);
  return { success: true };
}

// ========== DIÁLOGO DE PREÇOS (in-page) ==========
function abrirDialogPrecos() {
  const existing = document.getElementById('upseller-precos-overlay');
  if (existing) existing.remove();

  const tamanhos = ["PP","P","M","G","GG","EGG","G1","G2","G3","G4","G5","2","4","6","8","10","12","14","16"];
  const overrides = {};

  const overlay = document.createElement('div');
  overlay.id = 'upseller-precos-overlay';
  overlay.innerHTML = `
<div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.45);z-index:999999;display:flex;align-items:center;justify-content:center;">
<div style="background:white;border-radius:8px;padding:24px;width:520px;max-width:95vw;max-height:90vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,0.25);font-family:sans-serif;">
<div style="font-size:18px;font-weight:bold;margin-bottom:12px;display:flex;align-items:center;gap:8px;">
<span>💰 Preço Especial</span>
<label style="position:relative;display:inline-block;width:36px;height:20px;margin-left:auto;cursor:pointer;">
<input type="checkbox" id="ups-ativar-preco" checked style="opacity:0;width:0;height:0;margin:0;">
<span style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;border-radius:20px;transition:.3s;" id="ups-slider-preco"></span>
</label>
</div>
<style id="ups-toggle-style">
#ups-slider-preco, #ups-slider-macro { background:#ccc; }
#ups-ativar-preco:checked + #ups-slider-preco { background:#28a745; }
#ups-ativar-preco:checked + #ups-slider-preco::before { transform:translateX(16px); }
#ups-slider-preco::before {
  content:""; position:absolute; width:16px; height:16px; border-radius:50%;
  background:white; top:2px; left:2px; transition:.3s;
}
#ups-ativar-macro:checked + #ups-slider-macro { background:#28a745; }
#ups-ativar-macro:checked + #ups-slider-macro::before { transform:translateX(16px); }
#ups-slider-macro::before {
  content:""; position:absolute; width:16px; height:16px; border-radius:50%;
  background:white; top:2px; left:2px; transition:.3s;
}
.ups-ac { margin-bottom:8px;border-radius:8px;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,0.08);overflow:hidden; }
.ups-ac-h { display:flex;align-items:center;gap:10px;padding:10px 14px;cursor:pointer;user-select:none;font-size:14px;font-weight:600;background:linear-gradient(135deg,#f8f9fa,#e9ecef);transition:background .2s; }
.ups-ac-h:hover { background:linear-gradient(135deg,#e9ecef,#dee2e6); }
.ups-ac-body { max-height:0;overflow:hidden;transition:max-height .35s ease; }
.ups-ac-body-inner { padding:12px 14px;border-top:1px solid #e9ecef; }
.ups-ac-ar { font-size:10px;color:#888;transition:transform .2s;margin-right:6px; }
#ups-ac-s-mt,#ups-ac-s-mp,#ups-ac-s-multi { background:#ccc; }
#ups-ac-t-mt:checked + #ups-ac-s-mt,
#ups-ac-t-mp:checked + #ups-ac-s-mp,
#ups-ac-t-multi:checked + #ups-ac-s-multi { background:#28a745; }
#ups-ac-t-mt:checked + #ups-ac-s-mt::before,
#ups-ac-t-mp:checked + #ups-ac-s-mp::before,
#ups-ac-t-multi:checked + #ups-ac-s-multi::before { transform:translateX(16px); }
#ups-ac-s-mt::before,
#ups-ac-s-mp::before,
#ups-ac-s-multi::before,
#ups-ma-slider::before {
  content:""; position:absolute; width:16px; height:16px; border-radius:50%;
  background:white; top:2px; left:2px; transition:.3s;
}
#ups-ma-slider { background:#ccc; }
.ups-tag { display:inline-flex;align-items:center;gap:3px;background:#e8f5e9;border:1px solid #c8e6c9;border-radius:4px;padding:2px 6px;font-size:12px;font-weight:500;line-height:1.4; }
.ups-tag-rm { cursor:pointer;font-size:14px;color:#999;line-height:1;margin-left:2px; }
.ups-tag-rm:hover { color:#dc3545; }
#ups-ma-ativar:checked + #ups-ma-slider { background:#28a745; }
#ups-ma-ativar:checked + #ups-ma-slider::before { transform:translateX(16px); }
</style>

<label style="font-size:12px;font-weight:600;display:block;margin-bottom:3px;">Carregar Salvo</label>
<div style="display:flex;gap:4px;margin-bottom:10px;">
<select id="ups-ps" style="flex:1;padding:6px;border:1px solid #ccc;border-radius:4px;font-size:13px;box-sizing:border-box;"><option value="">Selecionar...</option></select>
<button id="ups-p-salvar" style="padding:4px 10px;border:1px solid #28a745;border-radius:4px;cursor:pointer;font-size:12px;background:#28a745;color:white;white-space:nowrap;">💾 Salvar</button>
<button id="ups-p-excluir" style="padding:4px 10px;border:1px solid #dc3545;border-radius:4px;cursor:pointer;font-size:12px;background:white;color:#dc3545;white-space:nowrap;">🗑</button>
</div>

<label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Preço em Massa (R$)</label>
<input id="ups-pb" type="text" placeholder="Ex: 59,90" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:4px;font-size:14px;box-sizing:border-box;margin-bottom:12px;">

<label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Sobrescrever por Tamanho</label>
<div style="display:flex;gap:4px;margin-bottom:8px;">
<select id="ups-pt" style="flex:1;padding:6px;border:1px solid #ccc;border-radius:4px;font-size:13px;">
<option value="">Tamanho...</option>${tamanhos.map(t => `<option value="${t}">${t}</option>`).join('')}</select>
<input id="ups-pv" type="text" placeholder="R$" style="width:70px;padding:6px;border:1px solid #ccc;border-radius:4px;font-size:13px;">
<button id="ups-pa" style="padding:6px 14px;background:#4078f2;color:white;border:none;border-radius:4px;cursor:pointer;font-weight:bold;font-size:14px;">+</button>
</div>
<div id="ups-po" style="font-size:13px;margin-bottom:12px;min-height:24px;color:#999;"></div>

<hr style="border:none;border-top:1px solid #eee;margin:16px 0;">

<div style="font-size:15px;font-weight:bold;margin-bottom:10px;display:flex;align-items:center;gap:8px;">
<span>🛠 Editar em Massa</span>
<label style="position:relative;display:inline-block;width:36px;height:20px;margin-left:auto;cursor:pointer;">
<input type="checkbox" id="ups-ativar-macro" checked style="opacity:0;width:0;height:0;margin:0;">
<span style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;border-radius:20px;transition:.3s;" id="ups-slider-macro"></span>
</label>
</div>
<label style="font-size:12px;font-weight:600;display:block;margin-bottom:3px;">Carregar Macro Salvo</label>
<div style="display:flex;gap:4px;margin-bottom:10px;">
<select id="ups-ms" style="flex:1;padding:6px;border:1px solid #ccc;border-radius:4px;font-size:13px;box-sizing:border-box;"><option value="">Selecionar...</option></select>
<button id="ups-m-salvar" style="padding:4px 10px;border:1px solid #28a745;border-radius:4px;cursor:pointer;font-size:12px;background:#28a745;color:white;white-space:nowrap;">💾 Salvar</button>
<button id="ups-m-excluir" style="padding:4px 10px;border:1px solid #dc3545;border-radius:4px;cursor:pointer;font-size:12px;background:white;color:#dc3545;white-space:nowrap;">🗑</button>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;">
<div>
<label style="font-size:12px;font-weight:600;display:block;margin-bottom:2px;">Quantidade</label>
<input id="ups-eq" type="text" placeholder="Ex: 100" style="width:100%;padding:6px;border:1px solid #ccc;border-radius:4px;font-size:13px;box-sizing:border-box;">
</div>
<div>
<label style="font-size:12px;font-weight:600;display:block;margin-bottom:2px;">Preço(R$) (regular)</label>
<input id="ups-ep" type="text" placeholder="Ex: 89,90" style="width:100%;padding:6px;border:1px solid #ccc;border-radius:4px;font-size:13px;box-sizing:border-box;">
</div>
<div>
<label style="font-size:12px;font-weight:600;display:block;margin-bottom:2px;">Peso(g)</label>
<input id="ups-ew" type="text" placeholder="Ex: 200" style="width:100%;padding:6px;border:1px solid #ccc;border-radius:4px;font-size:13px;box-sizing:border-box;">
</div>
<div>
<label style="font-size:12px;font-weight:600;display:block;margin-bottom:2px;">Pacote(cm) (CxLxA)</label>
<input id="ups-epkg" type="text" placeholder="21x12x21" style="width:100%;padding:6px;border:1px solid #ccc;border-radius:4px;font-size:13px;box-sizing:border-box;">
</div>
</div>

<div style="margin-bottom:10px;">
<label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Subespecificação - Tamanhos para marcar</label>
<div style="display:flex;gap:6px;align-items:flex-start;">
<div style="flex:1;display:flex;flex-wrap:wrap;gap:4px;padding:5px 6px;border:1px solid #ccc;border-radius:4px;min-height:32px;align-items:center;cursor:text;" id="ups-ps-sub-wrapper" onclick="document.getElementById('ups-ps-sub-input').focus()">
<input type="hidden" id="ups-ps-sub" value="">
<div id="ups-ps-sub-tags" style="display:flex;flex-wrap:wrap;gap:4px;align-items:center;"></div>
<input id="ups-ps-sub-input" type="text" placeholder="Tamanhos (vírgula ou Enter)" style="border:none;outline:none;flex:1;min-width:80px;padding:0;font-size:13px;background:transparent;">
            </div>
            </div>
            <div style="display:flex;gap:6px;align-items:center;margin-top:4px;">
            <label style="font-size:13px;font-weight:600;display:flex;align-items:center;gap:4px;white-space:nowrap;">
            <input type="checkbox" id="ups-ps-sku" style="margin:0;"> Gerar SKU
            </label>
            <label style="font-size:13px;font-weight:600;display:flex;align-items:center;gap:4px;white-space:nowrap;">
            <input type="checkbox" id="ups-ps-crop" style="margin:0;"> Recortar Img Quadrada
            </label>
            <label style="font-size:13px;font-weight:600;display:flex;align-items:center;gap:4px;white-space:nowrap;">
            <input type="checkbox" id="ups-ps-confirmar-cores" style="margin:0;"> Confirmar cores?
            </label>
            </div>
            </div>

<div style="display:flex;gap:8px;justify-content:flex-end;border-top:1px solid #eee;padding-top:12px;">
<button id="ups-pc" style="padding:8px 20px;border:1px solid #ccc;border-radius:4px;cursor:pointer;font-size:13px;background:white;">Cancelar</button>
<button id="ups-pk" style="padding:8px 20px;background:#28a745;color:white;border:none;border-radius:4px;cursor:pointer;font-weight:bold;font-size:13px;">APLICAR TUDO</button>
</div>
</div>
</div>`;
  document.body.appendChild(overlay);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay.firstElementChild) {
      overlay.remove();
    }
  });

  function renderOverridesLocal() {
    const c = document.getElementById('ups-po');
    const keys = Object.keys(overrides);
    if (keys.length === 0) { c.innerHTML = '<span style="color:#999;">Nenhum override</span>'; return; }
    c.innerHTML = keys.map(t =>
      `<div style="display:flex;justify-content:space-between;align-items:center;padding:2px 0;color:#333;">
<span><b>${t}</b> → R$ ${overrides[t]}</span>
<span id="ups-rm-${t}" style="cursor:pointer;color:#dc3545;font-weight:bold;font-size:14px;">×</span></div>`
    ).join('');
    keys.forEach(t => {
      const el = document.getElementById('ups-rm-' + t);
      if (el) el.onclick = () => { delete overrides[t]; renderOverridesLocal(); };
    });
  }

  function carregarPresetNoDialog(tipo, nome) {
    chrome.storage.local.get(["biblioteca", "bibliotecaPrecos"], (res) => {
      let dados = null;
      if (tipo === 'bib') {
        dados = (res.biblioteca || {})[nome]?.precos;
      } else {
        dados = (res.bibliotecaPrecos || {})[nome];
      }
      if (!dados) return;
      if (dados.bulkPrice) document.getElementById('ups-pb').value = dados.bulkPrice;
      Object.keys(overrides).forEach(k => delete overrides[k]);
      if (dados.overrides) {
        Object.keys(dados.overrides).forEach(k => { overrides[k] = dados.overrides[k]; });
        renderOverridesLocal();
      }
    });
  }

  function carregarMacroNoDialog(tipo, nome) {
    chrome.storage.local.get(["biblioteca", "bibliotecaMacros"], (res) => {
      const bib = res.biblioteca || {};
      let dados = null;
      if (tipo === 'bib') {
        dados = bib[nome]?.macros;
      } else {
        dados = (res.bibliotecaMacros || {})[nome];
      }
      if (!dados) return;
      const em = dados.emMassa || dados;
      if (em.quantidade) document.getElementById('ups-eq').value = em.quantidade;
      if (em.preco) document.getElementById('ups-ep').value = em.preco;
      if (em.peso) document.getElementById('ups-ew').value = em.peso;
      if (em.pacote || dados.tamanhoPacote) document.getElementById('ups-epkg').value = em.pacote || dados.tamanhoPacote;
      if (dados.sub || dados.subespecificacao) {
        document.getElementById('ups-ps-sub').value = (dados.sub || dados.subespecificacao).toUpperCase();
        atualizarTagsSubPrecos();
      }
      document.getElementById('ups-ps-sku').checked = !!(dados.sku || dados.gerarSku);
      document.getElementById('ups-ps-crop').checked = !!dados.crop;
      if (dados.confirmarCores !== undefined) document.getElementById('ups-ps-confirmar-cores').checked = !!dados.confirmarCores;
    });
  }

  function preencherSelectSalvos() {
    const select = document.getElementById('ups-ps');
    select.innerHTML = '<option value="">Selecionar...</option>';
    chrome.storage.local.get(["biblioteca", "bibliotecaPrecos"], (res) => {
      const bib = res.biblioteca || {};
      const bibPrecos = res.bibliotecaPrecos || {};
      Object.keys(bib).forEach(nome => {
        if (bib[nome].precos) {
          const opt = document.createElement('option');
          opt.value = 'bib:' + nome;
          opt.textContent = '📏 ' + nome + ' (R$ ' + bib[nome].precos.bulkPrice + ')';
          select.appendChild(opt);
        }
      });
      Object.keys(bibPrecos).forEach(nome => {
        const opt = document.createElement('option');
        opt.value = 'avulso:' + nome;
        opt.textContent = '💰 ' + nome + ' (R$ ' + bibPrecos[nome].bulkPrice + ')';
        select.appendChild(opt);
      });
    });
  }

  async function salvarEstadoAtualComoPreset() {
    const nome = await upsDialog({ title: 'Salvar Preço', message: 'Nome para salvar preset de preço:', input: true, placeholder: 'Nome do preset', okText: 'Salvar', cancel: true });
    if (!nome) return;
    const bulkPrice = document.getElementById('ups-pb').value.trim();
    if (!bulkPrice) { upsDialog({ title: 'Aviso', message: 'Informe o preço em massa primeiro' }); return; }
    const dados = { bulkPrice, overrides: { ...overrides } };
    chrome.storage.local.get(["biblioteca", "bibliotecaPrecos"], (res) => {
      const bib = res.biblioteca || {};
      const bibPrecos = res.bibliotecaPrecos || {};
      if (bib[nome]) {
        bib[nome].precos = dados;
        chrome.storage.local.set({ biblioteca: bib }, () => {
          preencherSelectSalvos();
          upsDialog({ title: 'Pronto', message: 'Preço salvo em "' + nome + '" (vinculado à tabela)' });
        });
      } else {
        bibPrecos[nome] = dados;
        chrome.storage.local.set({ bibliotecaPrecos: bibPrecos }, () => {
          preencherSelectSalvos();
          upsDialog({ title: 'Pronto', message: 'Preço salvo como "' + nome + '" (avulso)' });
        });
      }
    });
  }

  async function salvarMacroAtual() {
    const nome = await upsDialog({ title: 'Salvar Macro', message: 'Nome para salvar este macro:', input: true, placeholder: 'Nome do macro', okText: 'Salvar', cancel: true });
    if (!nome || !nome.trim()) return;
    const dados = {
      sub: document.getElementById('ups-ps-sub').value.trim(),
      emMassa: {
        quantidade: document.getElementById('ups-eq').value.trim(),
        preco: document.getElementById('ups-ep').value.trim(),
        peso: document.getElementById('ups-ew').value.trim(),
        pacote: document.getElementById('ups-epkg').value.trim()
      },
      sku: document.getElementById('ups-ps-sku').checked,
      crop: document.getElementById('ups-ps-crop').checked,
      confirmarCores: document.getElementById('ups-ps-confirmar-cores').checked,
      ativar: document.getElementById('ups-ativar-macro').checked
    };
    chrome.storage.local.get(["biblioteca", "bibliotecaMacros"], (res) => {
      const bib = res.biblioteca || {};
      const bibMacros = res.bibliotecaMacros || {};
      if (bib[nome]) {
        bib[nome].macros = dados;
        chrome.storage.local.set({ biblioteca: bib }, () => {
          preencherSelectMacros();
          upsDialog({ title: 'Pronto', message: 'Macro salvo em "' + nome + '" (vinculado à tabela)' });
        });
      } else {
        bibMacros[nome] = dados;
        chrome.storage.local.set({ bibliotecaMacros: bibMacros }, () => {
          preencherSelectMacros();
          upsDialog({ title: 'Pronto', message: 'Macro salvo como "' + nome + '" (avulso)' });
        });
      }
    });
  }

  async function deletarPresetDialog() {
    const select = document.getElementById('ups-ps');
    const val = select.value;
    if (!val) return;
    const [tipo, ...nomeParts] = val.split(':');
    const nome = nomeParts.join(':');
    const conf = await upsDialog({ title: 'Confirmar', message: 'Excluir preset de preço "' + nome + '"?', okText: 'Excluir', cancel: true });
    if (!conf) return;
    chrome.storage.local.get(["biblioteca", "bibliotecaPrecos"], (res) => {
      if (tipo === 'bib') {
        const bib = res.biblioteca || {};
        if (bib[nome]) delete bib[nome].precos;
        chrome.storage.local.set({ biblioteca: bib }, preencherSelectSalvos);
      } else {
        const bibPrecos = res.bibliotecaPrecos || {};
        delete bibPrecos[nome];
        chrome.storage.local.set({ bibliotecaPrecos: bibPrecos }, preencherSelectSalvos);
      }
    });
  }

  async function deletarMacroDialog() {
    const select = document.getElementById('ups-ms');
    const val = select.value;
    if (!val) return;
    const [tipo, ...nomeParts] = val.split(':');
    const nome = nomeParts.join(':');
    const conf = await upsDialog({ title: 'Confirmar', message: 'Excluir macro "' + nome + '"?', okText: 'Excluir', cancel: true });
    if (!conf) return;
    chrome.storage.local.get(["biblioteca", "bibliotecaMacros"], (res) => {
      if (tipo === 'bib') {
        const bib = res.biblioteca || {};
        if (bib[nome]) delete bib[nome].macros;
        chrome.storage.local.set({ biblioteca: bib }, preencherSelectMacros);
      } else {
        const bibMacros = res.bibliotecaMacros || {};
        delete bibMacros[nome];
        chrome.storage.local.set({ bibliotecaMacros: bibMacros }, preencherSelectMacros);
      }
    });
  }

  function preencherSelectMacros() {
    const select = document.getElementById('ups-ms');
    const valAtual = select.value;
    select.innerHTML = '<option value="">Selecionar...</option>';
    chrome.storage.local.get(["biblioteca", "bibliotecaMacros"], (res) => {
      const bib = res.biblioteca || {};
      const bibMacros = res.bibliotecaMacros || {};
      Object.keys(bib).forEach(nome => {
        if (bib[nome].macros) {
          const opt = document.createElement('option');
          opt.value = 'bib:' + nome;
          opt.textContent = '📏 ' + nome;
          select.appendChild(opt);
        }
      });
      Object.keys(bibMacros).forEach(nome => {
        const opt = document.createElement('option');
        opt.value = 'avulso:' + nome;
        opt.textContent = '🛠 ' + nome;
        select.appendChild(opt);
      });
      if (valAtual && [...select.options].some(o => o.value === valAtual)) select.value = valAtual;
    });
  }

  chrome.storage.local.get(["ultimosPrecos", "ultimosMacros"], (res) => {
    const savedP = res.ultimosPrecos;
    if (savedP) {
      if (savedP.bulkPrice) document.getElementById('ups-pb').value = savedP.bulkPrice;
      if (savedP.overrides) {
        Object.keys(savedP.overrides).forEach(k => { overrides[k] = savedP.overrides[k]; });
        renderOverridesLocal();
      }
    }
    const savedM = res.ultimosMacros;
    if (savedM) {
      const em = savedM.emMassa || savedM;
      if (em.quantidade) document.getElementById('ups-eq').value = em.quantidade;
      if (em.preco) document.getElementById('ups-ep').value = em.preco;
      if (em.peso) document.getElementById('ups-ew').value = em.peso;
      if (em.pacote || savedM.tamanhoPacote) document.getElementById('ups-epkg').value = em.pacote || savedM.tamanhoPacote;
      if (savedM.sub || savedM.subespecificacao) {
        document.getElementById('ups-ps-sub').value = (savedM.sub || savedM.subespecificacao).toUpperCase();
        atualizarTagsSubPrecos();
      }
      document.getElementById('ups-ps-sku').checked = !!(savedM.sku || savedM.gerarSku);
      document.getElementById('ups-ps-crop').checked = !!savedM.crop;
      if (savedM.confirmarCores !== undefined) document.getElementById('ups-ps-confirmar-cores').checked = !!savedM.confirmarCores;
      document.getElementById('ups-ativar-macro').checked = savedM.ativar !== false;
    }
    if (savedP) {
      document.getElementById('ups-ativar-preco').checked = savedP.ativarPreco !== false;
    }
  });

  preencherSelectSalvos();
  preencherSelectMacros();

  function atualizarTagsSubPrecos() {
    const hidden = document.getElementById('ups-ps-sub');
    const container = document.getElementById('ups-ps-sub-tags');
    if (!hidden || !container) return;
    const values = hidden.value.split(',').map(s => s.trim()).filter(Boolean);
    container.innerHTML = values.map(v => `<span class="ups-tag">${v}<span class="ups-tag-rm" data-tag="${v}">×</span></span>`).join('');
    container.querySelectorAll('.ups-tag-rm').forEach(el => {
      el.onclick = (e) => {
        e.stopPropagation();
        const rem = el.getAttribute('data-tag');
        const current = document.getElementById('ups-ps-sub').value.split(',').map(s => s.trim()).filter(Boolean);
        document.getElementById('ups-ps-sub').value = current.filter(s => s !== rem).join(',');
        atualizarTagsSubPrecos();
      };
    });
  }

  const tagInput = document.getElementById('ups-ps-sub-input');
  if (tagInput) {
    tagInput.addEventListener('keydown', (e) => {
      if (e.key === ',' || e.key === 'Enter' || e.key === 'Tab' || e.key === ' ') {
        e.preventDefault();
        const val = tagInput.value.trim().toUpperCase();
        if (val) {
          const hidden = document.getElementById('ups-ps-sub');
          const current = hidden.value ? hidden.value.split(',').map(s => s.trim()).filter(Boolean) : [];
          if (!current.includes(val)) {
            current.push(val);
            hidden.value = current.join(',');
          }
          tagInput.value = '';
          atualizarTagsSubPrecos();
        }
      }
      if (e.key === 'Backspace' && tagInput.value === '') {
        const hidden = document.getElementById('ups-ps-sub');
        const current = hidden.value ? hidden.value.split(',').map(s => s.trim()).filter(Boolean) : [];
        if (current.length > 0) {
          current.pop();
          hidden.value = current.join(',');
          atualizarTagsSubPrecos();
        }
      }
    });
    tagInput.addEventListener('blur', () => {
      const val = tagInput.value.trim().toUpperCase();
      if (val) {
        const hidden = document.getElementById('ups-ps-sub');
        const current = hidden.value ? hidden.value.split(',').map(s => s.trim()).filter(Boolean) : [];
        if (!current.includes(val)) {
          current.push(val);
          hidden.value = current.join(',');
        }
        tagInput.value = '';
        atualizarTagsSubPrecos();
      }
    });
  }

  document.getElementById('ups-ps').onchange = (e) => {
    const val = e.target.value;
    if (!val) return;
    const [tipo, ...nomeParts] = val.split(':');
    carregarPresetNoDialog(tipo, nomeParts.join(':'));
  };

  document.getElementById('ups-pa').onclick = () => {
    const tam = document.getElementById('ups-pt').value;
    const val = document.getElementById('ups-pv').value.trim();
    if (!tam || !val) return;
    overrides[tam] = val;
    document.getElementById('ups-pt').value = '';
    document.getElementById('ups-pv').value = '';
    renderOverridesLocal();
  };

  document.getElementById('ups-pc').onclick = () => overlay.remove();

  document.getElementById('ups-p-salvar').onclick = salvarEstadoAtualComoPreset;
  document.getElementById('ups-p-excluir').onclick = deletarPresetDialog;

  document.getElementById('ups-ms').onchange = (e) => {
    const val = e.target.value;
    if (!val) return;
    const [tipo, ...nomeParts] = val.split(':');
    carregarMacroNoDialog(tipo, nomeParts.join(':'));
  };

  document.getElementById('ups-m-salvar').onclick = salvarMacroAtual;
  document.getElementById('ups-m-excluir').onclick = deletarMacroDialog;

  document.getElementById('ups-pk').onclick = async () => {
    // Read all values before removing overlay
    const macroAtivo = document.getElementById('ups-ativar-macro').checked;
    const precoAtivo = document.getElementById('ups-ativar-preco').checked;
    const subVal = document.getElementById('ups-ps-sub').value.trim();
    const eqVal = document.getElementById('ups-eq').value.trim();
    const epVal = document.getElementById('ups-ep').value.trim();
    const ewVal = document.getElementById('ups-ew').value.trim();
    const epkgVal = document.getElementById('ups-epkg').value.trim();
    const pbVal = document.getElementById('ups-pb').value.trim();
    const skuChecked = document.getElementById('ups-ps-sku').checked;
    const cropChecked = document.getElementById('ups-ps-crop').checked;
    const confirmarCoresChecked = document.getElementById('ups-ps-confirmar-cores').checked;

    overlay.remove();
    await sleep(100);
    const startTime = Date.now();
    const steps = [];

    if (macroAtivo && subVal) steps.push('sub');
    const hasEmMassa = macroAtivo && [eqVal, epVal, ewVal, epkgVal].some(v => v !== '');
    if (hasEmMassa) steps.push('emMassa');
    if (precoAtivo && pbVal) steps.push('preco');
    if (macroAtivo && skuChecked) steps.push('sku');
    if (macroAtivo && cropChecked) steps.push('crop');
    if (macroAtivo && confirmarCoresChecked && lerCoresEspecificacaoPrincipal().length > 0) steps.push('confirmarCores');

    let stepIdx = 0;

    // 0. Confirmar Cores (before sub)
    if (steps.includes('confirmarCores')) {
      stepIdx++;
      criarOverlayProgresso();
      atualizarOverlayProgresso({ message: 'Aguardando confirmação de cores...', step: stepIdx, total: steps.length });
      const coresPagina = lerCoresEspecificacaoPrincipal();
      if (coresPagina.length > 0) {
        const result = await mostrarDialogoConfirmarCores(coresPagina);
        if (result.confirmou) {
          await aplicarCoresNaPagina(result.cores);
          await sleep(500);
        }
      }
    }

    // 1. Subespecificação (must be first)
    if (steps.includes('sub')) {
      stepIdx++;
      criarOverlayProgresso();
      atualizarOverlayProgresso({ message: 'Aplicando Subespecificação...', step: stepIdx, total: steps.length });
      const subRes = await subespecificacaoMassa(subVal);
      if (subRes.error) { mostrarErroOverlayProgresso(subRes.error); return; }
      atualizarOverlayProgresso({ message: 'Subespecificação: ' + subRes.count + ' alterados', step: stepIdx, total: steps.length });
      await sleep(2000);
    }

    // 2. Editar em Massa columns (dynamic columns)
    if (steps.includes('emMassa')) {
      stepIdx++;
      criarOverlayProgresso();
      atualizarOverlayProgresso({ message: 'Aplicando Editar em Massa...', step: stepIdx, total: steps.length });
      const cols = encontrarColunasMassa();
      const emMassaOps = [
        { val: eqVal, col: cols.quant, sel: 'input.ant-input.ant-input-sm', name: 'Quantidade' },
        { val: epVal, col: cols.preco, sel: 'input.ant-input-number-input', name: 'Preço(R$)' },
        { val: ewVal, col: cols.peso, sel: 'input.ant-input-number-input', name: 'Peso(g)' },
        { val: epkgVal, col: cols.pacote, sel: 'input.ant-input-number-input', name: 'Pacote(cm)' }
      ];
      for (const op of emMassaOps) {
        if (!op.col || !op.val) continue;
        let setVal = op.val;
        if (op.name === 'Pacote(cm)') {
          const sep = op.val.includes('x') ? 'x' : ',';
          setVal = op.val.split(sep).map(s => s.trim());
        }
        atualizarOverlayProgresso({ message: 'Aplicando ' + op.name + '...', step: stepIdx, total: steps.length });
        const r = await setColunaEmMassa(op.col, setVal, op.sel);
        if (r.error) { mostrarErroOverlayProgresso(r.error); return; }
      }
    }

    // 3. Preço especial
    if (steps.includes('preco')) {
      stepIdx++;
      criarOverlayProgresso();
      atualizarOverlayProgresso({ message: 'Preenchendo preços especiais...', step: stepIdx, total: steps.length });
      const result = await setPrecosCompletos(pbVal, overrides);
      if (result.error) { mostrarErroOverlayProgresso(result.error); return; }
      atualizarOverlayProgresso({ message: 'Preços aplicados: ' + result.total + ' células', step: stepIdx, total: steps.length });
    }

    // 4. SKU Gerar
    if (steps.includes('sku')) {
      stepIdx++;
      criarOverlayProgresso();
      atualizarOverlayProgresso({ message: 'Gerando SKU...', step: stepIdx, total: steps.length });
      const skuRes = await gerarSkuEmMassa();
      if (skuRes.error) { mostrarErroOverlayProgresso(skuRes.error); return; }
      atualizarOverlayProgresso({ message: 'SKU gerado', step: stepIdx, total: steps.length });
    }

    // 5. Guia de Tamanhos (opcional - preenche medidas se houver dados salvos)
    chrome.storage.local.get(["biblioteca", "ultimoEstadoMedidas"], async (res) => {
      try {
        const bib = res.biblioteca || {};
        const estado = res.ultimoEstadoMedidas || {};
        const nomeTabela = estado.selectedTable || '';
        const dados = nomeTabela ? bib[nomeTabela] : null;
        if (dados && Object.keys(dados).some(k => ["PP","P","M","G","GG","EGG","G1","G2","G3","G4","G5","2","4","6","8","10","12","14","16"].includes(k))) {
          stepIdx++;
          criarOverlayProgresso();
          atualizarOverlayProgresso({ message: 'Preenchendo guia de tamanhos...', step: stepIdx, total: stepIdx });
          let preMissing = detectarTamanhosFaltantes(nomeTabela, dados);
          if (preMissing.length > 0) {
            atualizarOverlayProgresso({ message: 'Medidas faltantes detectadas...', step: stepIdx, total: stepIdx });
            const panelRes = await mostrarPainelMedidasFaltantes(preMissing, nomeTabela, dados);
            if (panelRes && panelRes.saved) {
              await preencherGuiaTamanhos(dados);
            }
          } else {
            await preencherGuiaTamanhos(dados);
          }
        }
        } catch (e) { /* silent */ }

      // Crop (after guia)
      if (steps.includes('crop')) {
        stepIdx++;
        criarOverlayProgresso();
        atualizarOverlayProgresso({ message: 'Recortando imagem quadrada...', step: stepIdx, total: steps.length });
        const overlayEl = document.getElementById('upseller-progress-overlay');
        if (overlayEl) overlayEl.style.display = 'none';
        try {
          await recortarImagemQuadradaEmMassa();
        } catch (e) {
          if (overlayEl) overlayEl.style.display = '';
          mostrarErroOverlayProgresso('Erro no recorte: ' + e.message);
          setTimeout(() => removerOverlayProgresso(), 3000);
          return;
        }
        if (overlayEl) overlayEl.style.display = '';
      }

      atualizarOverlayProgresso({ message: 'Concluído em ' + ((Date.now() - startTime) / 1000).toFixed(1) + 's', step: Math.max(stepIdx, 1), total: Math.max(stepIdx, 1) });
      await sleep(1200);
      removerOverlayProgresso();

      chrome.storage.local.set({
        ultimosPrecos: {
          bulkPrice: pbVal,
          overrides: { ...overrides },
          ativarPreco: precoAtivo
        },
        ultimosMacros: {
          sub: subVal,
          emMassa: {
            quantidade: eqVal,
            preco: epVal,
            peso: ewVal,
            pacote: epkgVal
          },
          sku: skuChecked,
          crop: cropChecked,
          confirmarCores: confirmarCoresChecked,
          ativar: macroAtivo
        }
      });
    });
  };
}

// ========== DETECTAR TAMANHOS FALTANTES NA TABELA DE VARIANTES ==========
function detectarTamanhosFaltantes(selectedTable, dados) {
  const table = document.querySelector('.vxe-table');
  if (!table) return [];

  const allHeaders = table.querySelectorAll('.vxe-header--column');
  let tamCol = 'col_3';
  allHeaders.forEach((cell) => {
    const txt = cell.textContent.trim().toLowerCase();
    if (!txt) return;
    const cls = Array.from(cell.classList).find(c => c.startsWith('col_'));
    if (!cls) return;
    if (txt === 'tamanho' || (txt.includes('tamanho') && !txt.includes('pacote')) || ['variação', 'grade'].some(k => txt.includes(k))) tamCol = cls;
  });

  const listaTamanhos = ["PP","P","M","G","GG","EGG","G1","G2","G3","G4","G5","2","4","6","8","10","12","14","16"];
  const rows = table.querySelectorAll('.vxe-body--row');
  const encontrados = new Set();

  rows.forEach(row => {
    try {
      const tamEl = row.querySelector('.' + tamCol);
      if (!tamEl) return;
      const tamText = tamEl.textContent.trim().toUpperCase();
      const tam = listaTamanhos.reduce((found, t) => tamText.includes(t) ? (t.length > found.length ? t : found) : found, '');
      if (tam) encontrados.add(tam);
    } catch (e) { /* skip */ }
  });

  const faltantes = [];
  encontrados.forEach(tam => {
    if (!dados[tam] || (!dados[tam].b && !dados[tam].c)) {
      faltantes.push(tam);
    }
  });
  return faltantes;
}

// ========== PAINEL DE MEDIDAS FALTANTES (overlay independente) ==========
function mostrarPainelMedidasFaltantes(faltantes, selectedTable, dados) {
  return new Promise((resolve) => {
    const existing = document.getElementById('upseller-missing-panel');
    if (existing) existing.remove();

    const panel = document.createElement('div');
    panel.id = 'upseller-missing-panel';
    panel.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.45);z-index:999999;display:flex;align-items:center;justify-content:center;font-family:sans-serif;';
    panel.innerHTML = `
<div style="background:white;border-radius:12px;padding:24px;width:480px;max-width:90vw;max-height:85vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,0.25);">
  <div style="font-size:16px;font-weight:bold;margin-bottom:6px;">📏 Medidas Faltantes</div>
  <div style="font-size:12px;color:#666;margin-bottom:14px;">Os tamanhos abaixo não possuem medidas salvas. Informe largura e altura (cm):</div>
  <div id="ups-mf-lista" style="margin-bottom:14px;">${faltantes.map(t => `
    <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;background:#f8f9fa;padding:8px;border-radius:6px;">
      <span style="font-weight:bold;font-size:14px;min-width:36px;">${t}</span>
      <div style="flex:1;">
        <label style="font-size:11px;color:#666;display:block;">Largura (cm)</label>
        <input id="ups-mf-b-${t}" type="text" placeholder="Ex: 30" style="width:100%;padding:5px;border:1px solid #ccc;border-radius:4px;font-size:13px;box-sizing:border-box;">
      </div>
      <div style="flex:1;">
        <label style="font-size:11px;color:#666;display:block;">Altura (cm)</label>
        <input id="ups-mf-c-${t}" type="text" placeholder="Ex: 20" style="width:100%;padding:5px;border:1px solid #ccc;border-radius:4px;font-size:13px;box-sizing:border-box;">
      </div>
    </div>`).join('')}</div>
  <div style="display:flex;gap:8px;justify-content:flex-end;">
    <button id="ups-mf-pular" style="padding:7px 16px;border:1px solid #ccc;border-radius:4px;cursor:pointer;font-size:13px;background:white;">Pular</button>
    <button id="ups-mf-salvar" style="padding:7px 16px;background:#28a745;color:white;border:none;border-radius:4px;cursor:pointer;font-weight:bold;font-size:13px;">Salvar e Continuar</button>
  </div>
</div>`;
    document.body.appendChild(panel);

    document.getElementById('ups-mf-salvar').onclick = () => {
      let salvou = false;
      faltantes.forEach(t => {
        const b = document.getElementById('ups-mf-b-' + t)?.value.trim();
        const c = document.getElementById('ups-mf-c-' + t)?.value.trim();
        if (b || c) {
          if (!dados[t]) dados[t] = {};
          if (b) dados[t].b = b;
          if (c) dados[t].c = c;
          salvou = true;
        }
      });
      if (salvou) {
        chrome.storage.local.get(["biblioteca"], (res) => {
          const bib = res.biblioteca || {};
          if (!bib[selectedTable]) bib[selectedTable] = {};
          Object.keys(dados).forEach(k => {
            if (k !== 'macros' && k !== 'precos' && k !== 'descricao') {
              bib[selectedTable][k] = dados[k];
            }
          });
          chrome.storage.local.set({ biblioteca: bib });
        });
      }
      panel.remove();
      resolve({ saved: salvou });
    };

    document.getElementById('ups-mf-pular').onclick = () => {
      panel.remove();
      resolve({});
    };
  });
}

// ========== FUNÇÕES DE ATRIBUTOS ==========
function expandirAtributos() {
  const all = document.querySelectorAll('*');
  for (const el of all) {
    if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') continue;
    if (el.textContent.trim() === 'Mais Atributos') {
      nativeClick(el);
      return true;
    }
  }
  return false;
}

function lerAtributos() {
  expandirAtributos();
  const attrLabels = document.querySelectorAll('.ant-form-item');
  const normal = s => s.replace(/[:\s]+/g, ' ').trim().toLowerCase();
  const attrs = {};
  attrLabels.forEach(item => {
    const label = item.querySelector('.ant-form-item-label label');
    if (!label) return;
    const labelText = normal(label.textContent);
    const knownBasic = ['Loja', 'Nome', 'Categoria', 'Descrição', 'N° do Anúncio', 'Link do Fornecedor', 'Marca', 'Atributos', 'Especificação Principal', 'Subespecificação'].map(normal);
    if (knownBasic.includes(labelText)) return;
    const input = item.querySelector('input:not([type="hidden"]):not([type="checkbox"])');
    const select = item.querySelector('.ant-select');
    const checkbox = item.querySelector('.ant-checkbox-input');
    const attrBox = item.querySelector('.attr_box');
    let value = '';
    if (attrBox) {
      // Compound composition field (Composição, etc.)
      const parts = [];
      Array.from(attrBox.children).forEach(row => {
        const rowSelect = row.querySelector('.ant-select');
        const rowInput = row.querySelector('input.ant-input');
        const mat = rowSelect ? (rowSelect.querySelector('.ant-select-selection-selected-value, .ant-select-selection__choice__content')?.textContent.trim() || '') : '';
        const pct = rowInput ? rowInput.value.trim() : '';
        if (mat && pct) parts.push(normal(mat) + ' ' + pct);
      });
      value = parts.join(', ');
    } else if (checkbox) {
      value = checkbox.checked ? 'checked' : '';
    } else if (select) {
      const multi = select.querySelectorAll('.ant-select-selection__choice__content');
      if (multi.length) {
        value = Array.from(multi).map(el => normal(el.textContent)).join(', ');
      } else {
        const single = select.querySelector('.ant-select-selection-selected-value');
        if (single) value = normal(single.textContent);
      }
    } else if (input) {
      value = input.value.trim();
    }
    if (value) attrs[labelText] = value;
  });
  return attrs;
}

async function limparAtributosCustomizados() {
  const normal = s => s.replace(/[:\s]+/g, ' ').trim().toLowerCase();
  const knownBasic = ['Loja', 'Nome', 'Categoria', 'Descrição', 'N° do Anúncio', 'Link do Fornecedor', 'Marca', 'Atributos', 'Especificação Principal', 'Subespecificação'].map(normal);
  
  // Coletar todos os campos customizados
  const formItems = document.querySelectorAll('.ant-form-item');
  
  for (const item of formItems) {
    const lbl = item.querySelector('.ant-form-item-label label');
    if (!lbl) continue;
    const labelText = normal(lbl.textContent);
    
    // Pular atributos básicos
    if (knownBasic.includes(labelText)) continue;
    
    try {
      // Para campos simples (não compostos), apenas limpar
      const attrBox = item.querySelector('.attr_box');
      if (attrBox) {
        // Campos compostos: usar aplicarAtributo com valor vazio depois
        // Por enquanto, apenas skip - aplicarAtributo vai lidar
        continue;
      }
      
      const checkbox = item.querySelector('.ant-checkbox-input');
      const select = item.querySelector('.ant-select');
      const input = item.querySelector('input:not([type="hidden"]):not([type="checkbox"])');
      
      if (checkbox && checkbox.checked) {
        const wrapper = checkbox.closest('.ant-checkbox-wrapper') || checkbox.closest('label') || checkbox.parentElement;
        if (wrapper) {
          wrapper.click();
          await sleep(100);
        }
      } else if (select) {
        const removes = select.querySelectorAll('.ant-select-selection__choice__remove');
        for (const removeBtn of removes) {
          removeBtn.click();
          await sleep(100);
        }
      } else if (input && input.value.trim()) {
        input.focus();
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.blur();
        await sleep(100);
      }
    } catch (e) {
      // Silenciosamente ignorar erros durante limpeza
    }
  }
}

async function abrirDropdownSelect(select) {
  const openDropdown = document.querySelector('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
  if (openDropdown) {
    const esc = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    document.dispatchEvent(esc);
    await sleep(150);
  }
  select.click();
  await sleep(300);
  const comboBox = select.querySelector('[role="combobox"]');
  const ariaId = comboBox ? comboBox.getAttribute('aria-controls') : null;
  let dropdown = null;
  if (ariaId) {
    dropdown = document.querySelector('#' + CSS.escape(ariaId) + ':not(.ant-select-dropdown-hidden)');
  }
  if (!dropdown) {
    dropdown = document.querySelector('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
  }
  return dropdown;
}

async function aplicarAtributo(label, value) {
  const normal = s => s.replace(/[:\s]+/g, ' ').trim().toLowerCase();
  const targetLabel = normal(label);
  const targetValue = normal(value);
  const formItems = document.querySelectorAll('.ant-form-item');
  for (const item of formItems) {
    const lbl = item.querySelector('.ant-form-item-label label');
    if (!lbl) continue;
    if (normal(lbl.textContent) !== targetLabel) continue;
    const attrBox = item.querySelector('.attr_box');
    if (attrBox) {
      // Compound composition field
      const pairs = targetValue.split(', ');
      let existing = attrBox.children;
      // Remove excess rows
      while (existing.length > pairs.length) {
        const lastRow = existing[existing.length - 1];
        const rmBtn = lastRow.querySelector('.anticon-minus-circle');
        if (rmBtn) { rmBtn.click(); await sleep(400); existing = attrBox.children; }
        else break;
      }
      for (let i = 0; i < pairs.length; i++) {
        const pair = pairs[i];
        const lastSpace = pair.lastIndexOf(' ');
        const mat = pair.substring(0, lastSpace);
        const pct = pair.substring(lastSpace + 1);
        existing = attrBox.children;
        let row;
        if (i < existing.length) {
          row = existing[i];
        } else {
          const lastRow = existing[existing.length - 1];
          const addBtn = lastRow.querySelector('.anticon-plus-circle');
          if (addBtn) { addBtn.click(); await sleep(600); existing = attrBox.children; }
          else break;
          row = existing[existing.length - 1];
        }
        // Set select (material)
        const rowSelect = row.querySelector('.ant-select');
        if (rowSelect && mat) {
          // Close open dropdowns
          const openDd = document.querySelector('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
          if (openDd) {
            const esc = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
            document.dispatchEvent(esc);
            await sleep(300);
          }
          rowSelect.click();
          await sleep(500);
          const comboBox = rowSelect.querySelector('[role="combobox"]');
          const ariaId = comboBox ? comboBox.getAttribute('aria-controls') : null;
          let dd = null;
          if (ariaId) dd = document.querySelector('#' + CSS.escape(ariaId) + ':not(.ant-select-dropdown-hidden)');
          if (!dd) dd = document.querySelector('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
          if (dd) {
            const opt = Array.from(dd.querySelectorAll('li')).find(li => normal(li.textContent) === mat);
            if (opt) { opt.click(); await sleep(300); }
          }
        }
        // Set input (percentage)
        const rowInput = row.querySelector('input.ant-input');
        if (rowInput && pct) {
          rowInput.focus();
          rowInput.value = pct;
          rowInput.dispatchEvent(new Event('input', { bubbles: true }));
          rowInput.dispatchEvent(new Event('change', { bubbles: true }));
          rowInput.blur();
        }
      }
      return true;
    }
    const select = item.querySelector('.ant-select');
    const input = item.querySelector('input:not([type="hidden"]):not([type="checkbox"])');
    const checkbox = item.querySelector('.ant-checkbox-input');
    if (checkbox && value === 'checked') {
      const wrapper = checkbox.closest('.ant-checkbox-wrapper') || checkbox.closest('label') || checkbox.parentElement;
      if (!checkbox.checked && wrapper) wrapper.click();
      return true;
    }
    if (select) {
      const isMultiple = !!select.querySelector('.ant-select-selection--multiple');
      if (isMultiple) {
        // Multi-select: value is "opt1, opt2, opt3"
        const values = targetValue.split(', ');
        const removes = select.querySelectorAll('.ant-select-selection__choice__remove');
        removes.forEach(el => el.click());
        await sleep(200);
        for (const val of values) {
          if (!val) continue;
          const dd = await abrirDropdownSelect(select);
          if (!dd) continue;
          const opt = Array.from(dd.querySelectorAll('li')).find(li => normal(li.textContent) === val);
          if (opt) { opt.click(); await sleep(200); }
          const esc = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
          document.dispatchEvent(esc);
          await sleep(150);
        }
        return true;
      }
      // Single-select
      const dd = await abrirDropdownSelect(select);
      if (!dd) return false;
      const opt = Array.from(dd.querySelectorAll('li')).find(li => normal(li.textContent) === targetValue);
      if (!opt) return false;
      opt.click();
      await sleep(200);
      return true;
    }
    if (input) {
      input.focus();
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.blur();
      return true;
    }
  }
  return false;
}

// ========== DIÁLOGO DE MEDIDAS (in-page) ==========
function abrirDialogMedidas() {
  var preencherListaPresets, lerEstadoOverlay, aplicarPresetOverlay, salvarPresetOverlay, salvarEstadoMedidas;
  const existing = document.getElementById('upseller-medidas-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'upseller-medidas-overlay';
  overlay.innerHTML = `
<div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.45);z-index:999999;display:flex;align-items:center;justify-content:center;">
<div style="background:white;border-radius:8px;padding:20px;width:90vw;min-width:540px;max-width:680px;box-shadow:0 8px 32px rgba(0,0,0,0.25);font-family:sans-serif;max-height:85vh;overflow-y:auto;">
<div style="font-size:18px;font-weight:bold;margin-bottom:10px;text-align:center;">Automatiza Shein - UpSeller</div>

<div style="display:flex;gap:4px;margin-bottom:10px;">
<select id="ups-op-select" style="flex:1;padding:6px;border:1px solid #ccc;border-radius:4px;font-size:12px;box-sizing:border-box;"><option value="">📋 Carregar Nova Configuração...</option></select>
<button id="ups-op-salvar" style="width:36px;height:36px;padding:0;background:white;color:#4078f2;border:1px solid #4078f2;border-radius:4px;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;" title="Salvar/Renomear">💾</button>
<button id="ups-op-excluir" style="padding:4px 10px;border:1px solid #dc3545;border-radius:4px;cursor:pointer;font-size:12px;background:white;color:#dc3545;white-space:nowrap;line-height:1;display:flex;align-items:center;justify-content:center;" title="Excluir"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc3545" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></button>
<span style="position:relative;display:flex;align-items:stretch;">
<button id="ups-op-dados" style="padding:4px 10px;border:1px solid #4078f2;border-radius:4px;cursor:pointer;font-size:14px;background:white;color:#4078f2;line-height:1;display:flex;align-items:center;justify-content:center;" title="Exportar/Importar dados"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4078f2" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg></button>
<div id="ups-op-dados-menu" style="display:none;position:absolute;top:100%;right:0;margin-top:4px;background:white;border:1px solid #ddd;border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,0.12);z-index:100;min-width:150px;overflow:hidden;">
<div style="padding:8px 14px;cursor:pointer;font-size:13px;display:flex;align-items:center;gap:8px;transition:background .15s;" onmouseover="this.style.background='#f0f4ff'" onmouseout="this.style.background=''" id="ups-op-export-action"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4078f2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Exportar Dados</div>
<div style="padding:8px 14px;cursor:pointer;font-size:13px;display:flex;align-items:center;gap:8px;border-top:1px solid #eee;transition:background .15s;" onmouseover="this.style.background='#f0f4ff'" onmouseout="this.style.background=''" id="ups-op-import-action"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4078f2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Importar Dados</div>
</div>
</span>
</div>

<style>
.ups-ac { margin-bottom:8px;border-radius:8px;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,0.08);overflow:hidden; }
.ups-ac-h { display:flex;align-items:center;gap:10px;padding:10px 14px;cursor:pointer;user-select:none;font-size:14px;font-weight:600;background:linear-gradient(135deg,#f8f9fa,#e9ecef);transition:background .2s; }
.ups-ac-h:hover { background:linear-gradient(135deg,#e9ecef,#dee2e6); }
.ups-ac-body { max-height:0;overflow:hidden;transition:max-height .35s ease; }
.ups-ac-body-inner { padding:12px 14px;border-top:1px solid #e9ecef; }
.ups-ac-ar { font-size:10px;color:#888;transition:transform .2s;margin-right:6px; }
#ups-ac-s-mt,#ups-ac-s-mp,#ups-ac-s-multi,#ups-ac-s-atr { background:#ccc; }
#ups-ac-t-mt:checked + #ups-ac-s-mt,
#ups-ac-t-mp:checked + #ups-ac-s-mp,
#ups-ac-t-multi:checked + #ups-ac-s-multi,
#ups-ac-t-atr:checked + #ups-ac-s-atr { background:#28a745; }
#ups-ac-t-mt:checked + #ups-ac-s-mt::before,
#ups-ac-t-mp:checked + #ups-ac-s-mp::before,
#ups-ac-t-multi:checked + #ups-ac-s-multi::before,
#ups-ac-t-atr:checked + #ups-ac-s-atr::before { transform:translateX(16px); }
#ups-ac-s-mt::before,
#ups-ac-s-mp::before,
#ups-ac-s-multi::before,
#ups-ac-s-atr::before,
#ups-ma-slider::before {
  content:""; position:absolute; width:16px; height:16px; border-radius:50%;
  background:white; top:2px; left:2px; transition:.3s;
}
#ups-ma-slider { background:#ccc; }
#ups-ma-ativar:checked + #ups-ma-slider { background:#28a745; }
#ups-ma-ativar:checked + #ups-ma-slider::before { transform:translateX(16px); }
.ups-tag { display:inline-flex;align-items:center;gap:3px;background:#e8f5e9;border:1px solid #c8e6c9;border-radius:4px;padding:2px 6px;font-size:12px;font-weight:500;line-height:1.4; }
.ups-tag-rm { cursor:pointer;font-size:14px;color:#999;line-height:1;margin-left:2px; }
.ups-tag-rm:hover { color:#dc3545; }
</style>

<div class="ups-ac" data-ups-open="0">
<div class="ups-ac-h" data-ups-body="ups-ab-1">
<span>📏 Medidas</span>
<span class="ups-ac-ar" style="transition:transform .2s;">▶</span>
<label style="position:relative;display:inline-block;width:36px;height:20px;margin-left:auto;cursor:pointer;" onclick="event.stopPropagation()">
<input type="checkbox" id="ups-ac-t-mt" checked style="opacity:0;width:0;height:0;margin:0;">
<span id="ups-ac-s-mt" style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;border-radius:20px;transition:.3s;"></span>
</label>
</div>
<div class="ups-ac-body" id="ups-ab-1">
<div class="ups-ac-body-inner">
<div id="ups-mm-body"></div>
</div>
</div>
</div>

<div class="ups-ac">
<div class="ups-ac-h" data-ups-body="ups-ab-2">
<span>💰 Preço Especial</span>
<span class="ups-ac-ar">▶</span>
<label style="position:relative;display:inline-block;width:36px;height:20px;margin-left:auto;cursor:pointer;" onclick="event.stopPropagation()">
<input type="checkbox" id="ups-ac-t-mp" checked style="opacity:0;width:0;height:0;margin:0;">
<span id="ups-ac-s-mp" style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;border-radius:20px;transition:.3s;"></span>
</label>
</div>
<div class="ups-ac-body" id="ups-ab-2">
<div class="ups-ac-body-inner">
<select id="ups-mp-carregar" style="width:100%;padding:4px;border:1px solid #ccc;border-radius:4px;font-size:11px;box-sizing:border-box;margin-bottom:4px;"><option value="">Carregar Salvo...</option></select>
<div style="display:flex;gap:3px;margin-bottom:4px;">
<input id="ups-mp-nome-salvar" type="text" placeholder="Nome" style="flex:1;padding:4px;border:1px solid #ccc;border-radius:4px;font-size:11px;">
<button id="ups-mp-salvar" style="padding:4px 10px;background:#4078f2;color:white;border:none;border-radius:4px;cursor:pointer;font-size:14px;line-height:1;">💾</button>
</div>
<button id="ups-mp-excluir" style="display:none;width:100%;margin-bottom:4px;padding:3px;border:1px solid #dc3545;color:#dc3545;border-radius:4px;cursor:pointer;font-size:11px;background:white;">× Excluir</button>
<input id="ups-mp-nb" type="text" placeholder="Preço massa R$" style="width:100%;padding:5px;border:1px solid #ccc;border-radius:4px;font-size:12px;box-sizing:border-box;margin-bottom:4px;">
<div style="display:flex;gap:3px;margin-bottom:4px;">
<select id="ups-mp-nt" style="flex:1;padding:4px;border:1px solid #ccc;border-radius:4px;font-size:11px;"><option value="">Tam</option></select>
<input id="ups-mp-nv" type="text" placeholder="R$" style="width:90px;padding:4px;border:1px solid #ccc;border-radius:4px;font-size:11px;">
<button id="ups-mp-na" style="padding:4px 10px;background:#4078f2;color:white;border:none;border-radius:4px;cursor:pointer;font-size:14px;line-height:1;">+</button>
</div>
<div id="ups-mp-no" style="font-size:11px;min-height:14px;color:#666;"></div>
</div>
</div>
</div>

<div class="ups-ac">
<div class="ups-ac-h" data-ups-body="ups-ab-4">
<span>🛠 Editar em Massa</span>
<span class="ups-ac-ar">▶</span>
<label style="position:relative;display:inline-block;width:36px;height:20px;margin-left:auto;cursor:pointer;" onclick="event.stopPropagation()">
<input type="checkbox" id="ups-ma-ativar" checked style="opacity:0;width:0;height:0;margin:0;">
<span id="ups-ma-slider" style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;border-radius:20px;transition:.3s;"></span>
</label>
</div>
<div class="ups-ac-body" id="ups-ab-4">
<div class="ups-ac-body-inner">
<label style="font-size:12px;font-weight:600;display:block;margin-bottom:3px;">Macros Salvos</label>
<select id="ups-ma-select" style="width:100%;padding:4px;border:1px solid #ccc;border-radius:4px;font-size:11px;box-sizing:border-box;"><option value="">Carregar Salvo...</option></select>
<div style="display:flex;gap:3px;margin-top:4px;">
<input id="ups-ma-nome-salvar" type="text" placeholder="Nome do macro" style="flex:1;padding:4px;border:1px solid #ccc;border-radius:4px;font-size:11px;">
<button id="ups-ma-salvar" style="padding:4px 10px;background:#4078f2;color:white;border:none;border-radius:4px;cursor:pointer;font-size:14px;line-height:1;">💾</button>
</div>
<button id="ups-ma-excluir" style="display:none;width:100%;margin-top:4px;padding:3px;border:1px solid #dc3545;color:#dc3545;border-radius:4px;cursor:pointer;font-size:11px;background:white;">× Excluir</button>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
<div>
<label style="font-size:12px;font-weight:600;display:block;margin-bottom:2px;">Quantidade</label>
<input id="ups-ma-eq" type="text" placeholder="Ex: 100" style="width:100%;padding:6px;border:1px solid #ccc;border-radius:4px;font-size:13px;box-sizing:border-box;">
</div>
<div>
<label style="font-size:12px;font-weight:600;display:block;margin-bottom:2px;">Preço(R$) (regular)</label>
<input id="ups-ma-ep" type="text" placeholder="Ex: 89,90" style="width:100%;padding:6px;border:1px solid #ccc;border-radius:4px;font-size:13px;box-sizing:border-box;">
</div>
<div>
<label style="font-size:12px;font-weight:600;display:block;margin-bottom:2px;">Peso(g)</label>
<input id="ups-ma-ew" type="text" placeholder="Ex: 200" style="width:100%;padding:6px;border:1px solid #ccc;border-radius:4px;font-size:13px;box-sizing:border-box;">
</div>
<div>
<label style="font-size:12px;font-weight:600;display:block;margin-bottom:2px;">Pacote(cm) (CxLxA)</label>
<input id="ups-ma-epkg" type="text" placeholder="21x12x21" style="width:100%;padding:6px;border:1px solid #ccc;border-radius:4px;font-size:13px;box-sizing:border-box;">
</div>
</div>
    <div style="display:flex;flex-wrap:wrap;gap:4px;padding:5px 6px;border:1px solid #ccc;border-radius:4px;min-height:32px;align-items:center;cursor:text;" id="ups-ma-sub-wrapper" onclick="document.getElementById('ups-ma-sub-input').focus()">
    <input type="hidden" id="ups-ma-sub" value="">
    <div id="ups-ma-sub-tags" style="display:flex;flex-wrap:wrap;gap:4px;align-items:center;"></div>
    <input id="ups-ma-sub-input" type="text" placeholder="Tamanhos (vírgula ou Enter)" style="border:none;outline:none;flex:1;min-width:80px;padding:0;font-size:13px;background:transparent;">
    </div>
    <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px;">
    <label style="font-size:13px;font-weight:600;display:flex;align-items:center;gap:4px;white-space:nowrap;">
    <input type="checkbox" id="ups-ma-sku" style="margin:0;"> Gerar SKU
    </label>
    <label style="font-size:13px;font-weight:600;display:flex;align-items:center;gap:4px;white-space:nowrap;">
    <input type="checkbox" id="ups-ma-crop" style="margin:0;"> Recortar Img Quadrada
    </label>
    <label style="font-size:13px;font-weight:600;display:flex;align-items:center;gap:4px;white-space:nowrap;">
    <input type="checkbox" id="ups-ma-confirmar-cores" style="margin:0;"> Confirmar cores?
    </label>
    </div>
    </div>
    </div>
    </div>

<div class="ups-ac">
<div class="ups-ac-h" data-ups-body="ups-ab-5">
<span>🏷 Atributos</span>
<span class="ups-ac-ar">▶</span>
<label style="position:relative;display:inline-block;width:36px;height:20px;margin-left:auto;cursor:pointer;" onclick="event.stopPropagation()">
<input type="checkbox" id="ups-ac-t-atr" checked style="opacity:0;width:0;height:0;margin:0;">
<span id="ups-ac-s-atr" style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;border-radius:20px;transition:.3s;"></span>
</label>
</div>
<div class="ups-ac-body" id="ups-ab-5">
<div class="ups-ac-body-inner">
<label style="font-size:12px;font-weight:600;display:block;margin-bottom:3px;">Presets de Atributos</label>
<select id="ups-atr-carregar" style="width:100%;padding:4px;border:1px solid #ccc;border-radius:4px;font-size:11px;box-sizing:border-box;"><option value="">Carregar Salvo...</option></select>
<div style="display:flex;gap:3px;margin-top:4px;">
<input id="ups-atr-nome" type="text" placeholder="Nome do preset" style="flex:1;padding:4px;border:1px solid #ccc;border-radius:4px;font-size:11px;">
<button id="ups-atr-salvar" style="padding:4px 10px;background:#4078f2;color:white;border:none;border-radius:4px;cursor:pointer;font-size:14px;line-height:1;">💾</button>
</div>
<button id="ups-atr-excluir" style="display:none;width:100%;margin-top:4px;padding:3px;border:1px solid #dc3545;color:#dc3545;border-radius:4px;cursor:pointer;font-size:11px;background:white;">× Excluir</button>
<div style="font-size:11px;color:#666;margin-top:4px;">Salva os atributos manualmente configurados para aplicar em anúncios futuros da mesma categoria.</div>
</div>
</div>
</div>

<div class="ups-ac">
<div class="ups-ac-h" data-ups-body="ups-ab-3">
<span>🔄 Multi-Aba</span>
<span class="ups-ac-ar">▶</span>
<label style="position:relative;display:inline-block;width:36px;height:20px;margin-left:auto;cursor:pointer;" onclick="event.stopPropagation()">
<input type="checkbox" id="ups-ac-t-multi" style="opacity:0;width:0;height:0;margin:0;">
<span id="ups-ac-s-multi" style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;border-radius:20px;transition:.3s;"></span>
</label>
</div>
<div class="ups-ac-body" id="ups-ab-3">
<div class="ups-ac-body-inner">
<div style="font-size:12px;color:#666;line-height:1.5;">Aplica as configurações desta overlay em todas as abas de edição abertas automaticamente.</div>
</div>
</div>
</div>

<div style="display:flex;gap:8px;justify-content:flex-end;border-top:1px solid #eee;padding-top:10px;margin-top:8px;">
<button id="ups-mc" style="padding:7px 16px;border:1px solid #ccc;border-radius:4px;cursor:pointer;font-size:13px;background:white;">Cancelar</button>
  <button id="ups-mk" style="padding:7px 16px;background:#28a745;color:white;border:none;border-radius:4px;cursor:pointer;font-weight:bold;font-size:13px;">EXECUTAR</button>
</div>
</div>`;
  document.body.appendChild(overlay);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay.firstElementChild) {
      salvarEstadoMedidas();
      overlay.remove();
    }
  });

  // Accordion: click header to toggle body (smooth slide), close others
  function abrirAc(bodyEl) {
    bodyEl.style.maxHeight = bodyEl.scrollHeight + 'px';
  }
  function fecharAc(bodyEl) {
    bodyEl.style.maxHeight = '0';
  }
  document.querySelectorAll('.ups-ac-h').forEach(h => {
    h.addEventListener('click', () => {
      const bodyId = h.getAttribute('data-ups-body');
      const item = h.closest('.ups-ac');
      const isOpen = item.getAttribute('data-ups-open') === '1';
      if (isOpen) {
        item.setAttribute('data-ups-open', '0');
        fecharAc(document.getElementById(bodyId));
        h.querySelector('.ups-ac-ar').textContent = '▶';
      } else {
        item.setAttribute('data-ups-open', '1');
        document.querySelectorAll('.ups-ac[data-ups-open="1"]').forEach(openItem => {
          if (openItem !== item) {
            openItem.setAttribute('data-ups-open', '0');
            fecharAc(document.getElementById(openItem.querySelector('.ups-ac-h').getAttribute('data-ups-body')));
            openItem.querySelector('.ups-ac-ar').textContent = '▶';
          }
        });
        abrirAc(document.getElementById(bodyId));
        h.querySelector('.ups-ac-ar').textContent = '▼';
      }
    });
  });

  const body = document.getElementById('ups-mm-body');
  let selectedTable = '';
  let precoTabela = null;
  let precoUltimo = null;
  const listaTam = ["PP","P","M","G","GG","EGG","G1","G2","G3","G4","G5","2","4","6","8","10","12","14","16"];

  // --- Novo preço: overrides locais ---
  window.__upsNovoPrecoOverrides = {};

  function renderOverridesNovo(overrides) {
    const c = document.getElementById('ups-mp-no');
    const keys = Object.keys(overrides);
    if (keys.length === 0) { c.innerHTML = '<span style="color:#999;">Nenhum override</span>'; return; }
    c.innerHTML = keys.map(t =>
      `<div style="display:flex;justify-content:space-between;align-items:center;padding:1px 0;color:#333;font-size:12px;">
<span><b>${t}</b> → R$ ${overrides[t]}</span>
<span id="ups-mp-rm-${t}" style="cursor:pointer;color:#dc3545;font-weight:bold;font-size:13px;">×</span></div>`
    ).join('');
    keys.forEach(t => {
      const el = document.getElementById('ups-mp-rm-' + t);
      if (el) el.onclick = () => { delete overrides[t]; renderOverridesNovo(overrides); };
    });
  }

  function preencherSelectTamNovo() {
    const sel = document.getElementById('ups-mp-nt');
    sel.innerHTML = '<option value="">Tam</option>';
    listaTam.forEach(t => { const o = document.createElement('option'); o.value = t; o.textContent = t; sel.appendChild(o); });
  }

  document.getElementById('ups-mp-na').onclick = () => {
    const tam = document.getElementById('ups-mp-nt').value;
    const val = document.getElementById('ups-mp-nv').value.trim();
    if (!tam || !val) return;
    const overrides = window.__upsNovoPrecoOverrides || {};
    overrides[tam] = val;
    window.__upsNovoPrecoOverrides = overrides;
    document.getElementById('ups-mp-nt').value = '';
    document.getElementById('ups-mp-nv').value = '';
    renderOverridesNovo(overrides);
  };

  // --- Feedback toast ---
  function mostrarToastFeedback(msg) {
    const existing = document.getElementById('ups-ma-feedback');
    if (existing) existing.remove();
    const div = document.createElement('div');
    div.id = 'ups-ma-feedback';
    div.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#28a745;color:white;padding:10px 24px;border-radius:8px;font-size:14px;font-weight:600;z-index:9999999;box-shadow:0 4px 12px rgba(0,0,0,0.2);font-family:sans-serif;';
    div.textContent = msg;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 2500);
  }

  // --- Carregar/Salvar presets de preço ---
  function preencherSelectSalvosMedidas(forceSelect) {
    const select = document.getElementById('ups-mp-carregar');
    const valAtual = select.value;
    select.innerHTML = '<option value="">Carregar Salvo...</option>';
    chrome.storage.local.get(["biblioteca", "bibliotecaPrecos"], (res) => {
      const bib = res.biblioteca || {};
      const bibPrecos = res.bibliotecaPrecos || {};
      Object.keys(bib).forEach(nome => {
        if (bib[nome].precos) {
          const opt = document.createElement('option');
          opt.value = 'bib:' + nome;
          opt.textContent = '📏 ' + nome;
          select.appendChild(opt);
        }
      });
      Object.keys(bibPrecos).forEach(nome => {
        const opt = document.createElement('option');
        opt.value = 'avulso:' + nome;
        opt.textContent = '💰 ' + nome;
        select.appendChild(opt);
      });
      const target = forceSelect || valAtual;
      if (target && [...select.options].some(o => o.value === target)) select.value = target;
    });
  }

  function carregarPresetNoNovo(tipo, nome, cb) {
    if (!tipo || !nome) return;
    chrome.storage.local.get(["biblioteca", "bibliotecaPrecos"], (res) => {
      let dados = null;
      if (tipo === 'bib') {
        dados = (res.biblioteca || {})[nome]?.precos;
      } else {
        dados = (res.bibliotecaPrecos || {})[nome];
      }
      if (!dados) { if (cb) cb(); return; }
      document.getElementById('ups-mp-nb').value = dados.bulkPrice;
      const overrides = {};
      if (dados.overrides) Object.keys(dados.overrides).forEach(k => { overrides[k] = dados.overrides[k]; });
      window.__upsNovoPrecoOverrides = overrides;
      renderOverridesNovo(overrides);
      document.getElementById('ups-mp-nome-salvar').value = nome;
      document.getElementById('ups-mp-excluir').style.display = 'block';
      mostrarToastFeedback('Preço "' + nome + '" carregado!');
      // Carregar Em Massa vinculado (se existir)
      if (tipo === 'bib') {
        const macros = (res.biblioteca || {})[nome]?.macros;
        if (macros && macros.emMassa) {
          const em = macros.emMassa;
          if (em.quantidade) document.getElementById('ups-ma-eq').value = em.quantidade;
          if (em.preco) document.getElementById('ups-ma-ep').value = em.preco;
          if (em.peso) document.getElementById('ups-ma-ew').value = em.peso;
          if (em.pacote) document.getElementById('ups-ma-epkg').value = em.pacote;
        }
      }
      if (cb) cb();
    });
  }

  function salvarPresetMedidas() {
    const nome = document.getElementById('ups-mp-nome-salvar').value.trim();
    const bulkPrice = document.getElementById('ups-mp-nb').value.trim();
    if (!nome) return;
    if (!bulkPrice) return;
    const dados = { bulkPrice, overrides: { ...(window.__upsNovoPrecoOverrides || {}) } };
    chrome.storage.local.get(["biblioteca", "bibliotecaPrecos"], (res) => {
      const bib = res.biblioteca || {};
      const bibPrecos = res.bibliotecaPrecos || {};
      if (bib[nome]) {
        bib[nome].precos = dados;
        chrome.storage.local.set({ biblioteca: bib }, () => {
          preencherSelectSalvosMedidas();
          setTimeout(() => {
            document.getElementById('ups-mp-carregar').value = 'bib:' + nome;
          }, 500);
          document.getElementById('ups-mp-excluir').style.display = 'block';
          document.getElementById('ups-mp-nome-salvar').value = '';
          mostrarToastFeedback('Preço "' + nome + '" vinculado à tabela!');
        });
      } else if (bibPrecos[nome]) {
        bibPrecos[nome] = dados;
        chrome.storage.local.set({ bibliotecaPrecos: bibPrecos }, () => {
          preencherSelectSalvosMedidas();
          setTimeout(() => {
            document.getElementById('ups-mp-carregar').value = 'avulso:' + nome;
          }, 500);
          document.getElementById('ups-mp-excluir').style.display = 'block';
          document.getElementById('ups-mp-nome-salvar').value = '';
          mostrarToastFeedback('Preço "' + nome + '" atualizado!');
        });
      } else {
        bibPrecos[nome] = dados;
        chrome.storage.local.set({ bibliotecaPrecos: bibPrecos }, () => {
          preencherSelectSalvosMedidas();
          setTimeout(() => {
            document.getElementById('ups-mp-carregar').value = 'avulso:' + nome;
          }, 500);
          document.getElementById('ups-mp-excluir').style.display = 'block';
          document.getElementById('ups-mp-nome-salvar').value = '';
          mostrarToastFeedback('Preço "' + nome + '" salvo!');
        });
      }
    });
  }

  function deletarPresetMedidas() {
    const select = document.getElementById('ups-mp-carregar');
    const val = select.value;
    if (!val) return;
    const [tipo, ...nomeParts] = val.split(':');
    const nome = nomeParts.join(':');
    const existing = document.getElementById('ups-preco-confirm-rm');
    if (existing) existing.remove();
    const div = document.createElement('div');
    div.id = 'ups-preco-confirm-rm';
    div.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.3);z-index:9999999;display:flex;align-items:center;justify-content:center;';
    div.innerHTML = '<div style="background:white;border-radius:12px;padding:24px;width:300px;box-shadow:0 8px 32px rgba(0,0,0,0.25);text-align:center;font-family:sans-serif;">' +
      '<div style="font-size:15px;font-weight:bold;margin-bottom:12px;">Excluir "' + nome + '"?</div>' +
      '<div style="display:flex;gap:8px;justify-content:center;">' +
      '<button id="ups-preco-rm-cancelar" style="padding:7px 20px;border:1px solid #ccc;border-radius:6px;cursor:pointer;font-size:13px;background:white;">Cancelar</button>' +
      '<button id="ups-preco-rm-confirmar" style="padding:7px 20px;background:#dc3545;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:bold;font-size:13px;">Excluir</button>' +
      '</div></div>';
    document.body.appendChild(div);
    document.getElementById('ups-preco-rm-cancelar').onclick = () => div.remove();
    document.getElementById('ups-preco-rm-confirmar').onclick = () => {
      div.remove();
      chrome.storage.local.get(["biblioteca", "bibliotecaPrecos"], (res) => {
        if (tipo === 'bib') {
          const bib = res.biblioteca || {};
          if (bib[nome]) delete bib[nome].precos;
          chrome.storage.local.set({ biblioteca: bib }, () => {
            preencherSelectSalvosMedidas();
            document.getElementById('ups-mp-excluir').style.display = 'none';
            document.getElementById('ups-mp-nome-salvar').value = '';
            mostrarToastFeedback('Preço "' + nome + '" excluído!');
          });
        } else {
          const bibPrecos = res.bibliotecaPrecos || {};
          delete bibPrecos[nome];
          chrome.storage.local.set({ bibliotecaPrecos: bibPrecos }, () => {
            preencherSelectSalvosMedidas();
            document.getElementById('ups-mp-excluir').style.display = 'none';
            document.getElementById('ups-mp-nome-salvar').value = '';
            mostrarToastFeedback('Preço "' + nome + '" excluído!');
          });
        }
      });
    };
  }

  function expandirAcordeao(bodyId) {
    const body = document.getElementById(bodyId);
    if (!body) return;
    const item = body.closest('.ups-ac');
    document.querySelectorAll('.ups-ac[data-ups-open="1"]').forEach(openItem => {
      if (openItem !== item) {
        openItem.setAttribute('data-ups-open', '0');
        const b = document.getElementById(openItem.querySelector('.ups-ac-h').getAttribute('data-ups-body'));
        if (b) fecharAc(b);
        openItem.querySelector('.ups-ac-ar').textContent = '▶';
      }
    });
    item.setAttribute('data-ups-open', '1');
    abrirAc(body);
    item.querySelector('.ups-ac-ar').textContent = '▼';
  }

  document.getElementById('ups-mp-carregar').onchange = (e) => {
    const val = e.target.value;
    if (!val) return;
    const [tipo, ...nomeParts] = val.split(':');
    carregarPresetNoNovo(tipo, nomeParts.join(':'), () => expandirAcordeao('ups-ab-2'));
  };

  document.getElementById('ups-mp-salvar').onclick = salvarPresetMedidas;
  document.getElementById('ups-mp-excluir').onclick = deletarPresetMedidas;

  chrome.storage.local.get(["biblioteca", "bibliotecaAtributos", "ultimaSelecionada", "bibliotecaPrecos", "ultimosPrecos", "ultimosMacros", "ultimoEstadoMedidas"], (res) => {
    const bib = res.biblioteca || {};
    const nomes = Object.keys(bib).filter(n =>
      Object.keys(bib[n]).some(k => listaTam.includes(k))
    );
    const ativa = res.ultimaSelecionada || '';
    const ultimos = res.ultimosPrecos;

    selectedTable = (ativa && bib[ativa]) ? ativa : (nomes.length > 0 ? nomes[0] : '');
    const chavesFixas = new Set(['descricao','macros','precos','emMassa','sku','crop','confirmarCores','ativar','sub','quantidade','preco','peso','pacote']);

    body.innerHTML = `
<label style="font-size:13px;font-weight:600;display:block;margin-bottom:8px;">Tabela de Medidas</label>
<div style="display:flex;gap:4px;margin-bottom:12px;align-items:center;">
<select id="ups-mt" style="flex:1;padding:8px;border:1px solid #ccc;border-radius:4px;font-size:14px;box-sizing:border-box;">
${nomes.length > 0 ? nomes.map(n => `<option value="${n}"${n === selectedTable ? ' selected' : ''}>${n}</option>`).join('') : '<option value="">Nenhuma tabela salva</option>'}
</select>
<button id="ups-mt-editar" style="padding:4px 10px;border:1px solid #4078f2;border-radius:4px;cursor:pointer;font-size:12px;background:white;color:#4078f2;white-space:nowrap;line-height:1;display:flex;align-items:center;justify-content:center;" title="Editar tabela">✏️</button>
<button id="ups-mt-novo" style="padding:4px 10px;border:1px solid #28a745;border-radius:4px;cursor:pointer;font-size:12px;background:white;color:#28a745;white-space:nowrap;line-height:1;display:flex;align-items:center;justify-content:center;" title="Criar tabela">➕</button>
<button id="ups-mt-rm" style="padding:4px 10px;border:1px solid #dc3545;border-radius:4px;cursor:pointer;font-size:12px;background:white;color:#dc3545;white-space:nowrap;line-height:1;display:flex;align-items:center;justify-content:center;${!selectedTable || !bib[selectedTable] ? 'display:none;' : ''}" title="Deletar tabela"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc3545" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></button>
</div>
<div id="ups-mt-display" style="padding:10px;background:#f9f9f9;border:1px solid #e0e0e0;border-radius:4px;font-size:12px;color:#666;"></div>`;

    if (nomes.length === 0) {
      document.getElementById('ups-mk').style.display = 'none';
    }

    preencherSelectTamNovo();
    preencherSelectSalvosMedidas();

    function atualizarPrecos(nome) {
      if (window.__upsLoadingPreset) return;
      chrome.storage.local.get(["biblioteca"], (res) => {
        const bibAtualizada = res.biblioteca || {};
        const dados = bibAtualizada[nome];
        precoTabela = (dados && dados.precos) || null;
        precoUltimo = (ultimos && ultimos.bulkPrice) ? ultimos : null;
        const src = precoTabela || precoUltimo;
        if (src) {
          document.getElementById('ups-mp-nb').value = src.bulkPrice || '';
          const overrides = {};
          if (src.overrides) Object.keys(src.overrides).forEach(k => { overrides[k] = src.overrides[k]; });
          window.__upsNovoPrecoOverrides = overrides;
          renderOverridesNovo(overrides);
          document.getElementById('ups-ac-t-mp').checked = true;
          document.getElementById('ups-mp-nome-salvar').value = nome;
          document.getElementById('ups-mp-excluir').style.display = precoTabela ? 'block' : 'none';
        } else {
          document.getElementById('ups-mp-nb').value = '';
          window.__upsNovoPrecoOverrides = {};
          renderOverridesNovo({});
          document.getElementById('ups-mp-nome-salvar').value = '';
          document.getElementById('ups-mp-excluir').style.display = 'none';
        }
      });
    }

    function renderDisplayMedidas(nome) {
      const display = document.getElementById('ups-mt-display');
      if (!nome) {
        display.innerHTML = '<span style="color:#999;">(nenhuma tabela selecionada)</span>';
        return;
      }

      chrome.storage.local.get(["biblioteca"], (res) => {
        const bibAtualizada = res.biblioteca || {};
        const dados = bibAtualizada[nome];

        if (!dados) {
          display.innerHTML = '<span style="color:#999;">(nenhuma tabela selecionada)</span>';
          return;
        }

        let tamanhos = Object.keys(dados).filter(k => !chavesFixas.has(k) && dados[k] && typeof dados[k] === 'object' && (dados[k].b || dados[k].c));
        if (tamanhos.length === 0) {
          display.innerHTML = '<span style="color:#999;">(sem tamanhos)</span>';
          return;
        }

        const ordemLetras = ['PP','P','M','G','GG','EGG','G1','G2','G3','G4','G5'];
        const ordemIndex = {};
        ordemLetras.forEach((s, i) => { ordemIndex[s.toUpperCase()] = i; });

        tamanhos.sort((a, b) => {
          const aNum = /^\d+$/.test(a);
          const bNum = /^\d+$/.test(b);
          if (aNum && bNum) return parseInt(a, 10) - parseInt(b, 10);
          if (aNum) return -1;
          if (bNum) return 1;
          const ai = ordemIndex[a.toUpperCase()];
          const bi = ordemIndex[b.toUpperCase()];
          if (ai !== undefined && bi !== undefined) return ai - bi;
          if (ai !== undefined) return -1;
          if (bi !== undefined) return 1;
          return a.localeCompare(b);
        });

        const desc = dados.descricao ? `<div style="margin-bottom:8px;font-style:italic;color:#999;font-size:12px;">${dados.descricao}</div>` : '';
        const thead = `<thead><tr style="background:#eee;"><th style="padding:4px 8px;border:1px solid #ccc;font-size:12px;text-align:left;">Tamanho</th><th style="padding:4px 8px;border:1px solid #ccc;font-size:12px;text-align:left;">Largura</th><th style="padding:4px 8px;border:1px solid #ccc;font-size:12px;text-align:left;">Altura</th></tr></thead>`;
        const tbody = tamanhos.map(t => {
          const larg = dados[t].b || '—';
          const alt = dados[t].c || '—';
          return `<tr><td style="padding:4px 8px;border:1px solid #ccc;font-size:12px;font-weight:bold;text-transform:uppercase;">${t}</td><td style="padding:4px 8px;border:1px solid #ccc;font-size:12px;">${larg}</td><td style="padding:4px 8px;border:1px solid #ccc;font-size:12px;">${alt}</td></tr>`;
        }).join('');
        display.innerHTML = desc + `<table style="width:100%;border-collapse:collapse;font-family:sans-serif;">${thead}<tbody>${tbody}</tbody></table>`;
      });
    }

    const select = document.getElementById('ups-mt');

    function atualizarDesc(nome) {
      if (!nome || typeof nome === 'object') nome = select.value;
      if (window.__upsLoadingPreset) return;
      
      if (!nome) {
        document.getElementById('ups-mt-rm').style.display = 'none';
        document.getElementById('ups-mt-editar').disabled = true;
        renderDisplayMedidas(null);
        return;
      }
      
      // Buscar dados diretamente do storage
      chrome.storage.local.get(["biblioteca"], (res) => {
        if (window.__upsLoadingPreset) return;
        const bibAtualizada = res.biblioteca || {};
        const dados = bibAtualizada[nome];
        
        if (!dados) {
          document.getElementById('ups-mt-rm').style.display = 'none';
          document.getElementById('ups-mt-editar').disabled = true;
          renderDisplayMedidas(null);
          return;
        }
        
        selectedTable = nome;
        document.getElementById('ups-mt-rm').style.display = '';
        document.getElementById('ups-mt-editar').disabled = false;
        renderDisplayMedidas(nome);
        atualizarPrecos(nome);

        if (dados && dados.macros) {
          if (dados.macros.sub) document.getElementById('ups-ma-sub').value = dados.macros.sub;
          atualizarTagsSub();
          if (dados.macros.emMassa) {
            document.getElementById('ups-ma-eq').value = dados.macros.emMassa.quantidade || '';
            document.getElementById('ups-ma-ep').value = dados.macros.emMassa.preco || '';
            document.getElementById('ups-ma-ew').value = dados.macros.emMassa.peso || '';
            document.getElementById('ups-ma-epkg').value = dados.macros.emMassa.pacote || '';
          }
          document.getElementById('ups-ma-sku').checked = !!dados.macros.sku;
          document.getElementById('ups-ma-crop').checked = !!dados.macros.crop;
          document.getElementById('ups-ma-ativar').checked = dados.macros.ativar !== false;
          document.getElementById('ups-ma-nome-salvar').value = nome;
          document.getElementById('ups-ma-excluir').style.display = 'block';
        } else {
          document.getElementById('ups-ma-sub').value = '';
          atualizarTagsSub();
          document.getElementById('ups-ma-eq').value = '';
          document.getElementById('ups-ma-ep').value = '';
          document.getElementById('ups-ma-ew').value = '';
          document.getElementById('ups-ma-epkg').value = '';
          document.getElementById('ups-ma-sku').checked = false;
          document.getElementById('ups-ma-crop').checked = false;
          document.getElementById('ups-ma-nome-salvar').value = '';
          document.getElementById('ups-ma-excluir').style.display = 'none';
        }
      });
    }

    window.__temEstadoSalvo = res.ultimoEstadoMedidas && Object.keys(res.ultimoEstadoMedidas).length > 0;
    if (nomes.length > 0) {
      select.addEventListener('change', atualizarDesc);
      if (!window.__temEstadoSalvo) atualizarDesc(selectedTable);
    }

    function atualizarSelectMedidas(selecionar) {
      const sel = document.getElementById('ups-mt');
      if (!sel) return;
      
      chrome.storage.local.get(["biblioteca"], (res) => {
        const bibAtualizada = res.biblioteca || {};
        const atual = sel.value;
        const todos = Object.keys(bibAtualizada).filter(n => {
          const e = bibAtualizada[n];
          return Object.keys(e).some(k => !chavesFixas.has(k) && e[k] && typeof e[k] === 'object' && (e[k].b || e[k].c));
        });
        sel.innerHTML = todos.map(n => `<option value="${n}"${n === (selecionar || atual) ? ' selected' : ''}>${n}</option>`).join('');
        if (todos.length === 0) {
          sel.innerHTML = '<option value="">Nenhuma tabela salva</option>';
          document.getElementById('ups-mk').style.display = 'none';
        } else {
          document.getElementById('ups-mk').style.display = '';
        }
        // Atualizar `bib` em memória também
        Object.assign(bib, bibAtualizada);
      });
    }

    document.getElementById('ups-mt-editar').onclick = function() {
      const nome = select.value;
      if (!nome) return;
      abrirPopupEditarMedidas(nome, bib, chavesFixas, atualizarSelectMedidas, atualizarDesc);
    };

    document.getElementById('ups-mt-novo').onclick = function() {
      abrirPopupEditarMedidas(null, bib, chavesFixas, atualizarSelectMedidas, atualizarDesc);
    };

    document.getElementById('ups-mt-rm').onclick = function() {
      const nome = select.value;
      if (!nome || !bib[nome]) return;
      const div = document.createElement('div');
      div.id = 'ups-mt-confirm-rm';
      div.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.3);z-index:9999999;display:flex;align-items:center;justify-content:center;';
      div.innerHTML = '<div style="background:white;border-radius:12px;padding:24px;width:300px;box-shadow:0 8px 32px rgba(0,0,0,0.25);text-align:center;font-family:sans-serif;">' +
        '<div style="font-size:15px;font-weight:bold;margin-bottom:12px;">Excluir "' + nome + '"?</div>' +
        '<div style="display:flex;gap:8px;justify-content:center;">' +
        '<button id="ups-mt-rm-cancel" style="padding:7px 20px;border:1px solid #ccc;border-radius:6px;cursor:pointer;font-size:13px;background:white;">Cancelar</button>' +
        '<button id="ups-mt-rm-confirm" style="padding:7px 20px;background:#dc3545;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:bold;font-size:13px;">Excluir</button>' +
        '</div></div>';
      document.body.appendChild(div);
      document.getElementById('ups-mt-rm-cancel').onclick = () => div.remove();
      document.getElementById('ups-mt-rm-confirm').onclick = () => {
        div.remove();
        chrome.storage.local.get(["biblioteca"], (r) => {
          const b = r.biblioteca || {};
          if (b[nome]) {
            delete b[nome];
            chrome.storage.local.set({ biblioteca: b }, () => {
              if (bib[nome]) delete bib[nome];
              select.value = '';
              atualizarSelectMedidas('');
              atualizarDesc('');
              mostrarFeedback('Tabela "' + nome + '" excluída!', '#28a745');
            });
          }
        });
      };
    };

    const tagInput = document.getElementById('ups-ma-sub-input');
    if (tagInput) {
      tagInput.addEventListener('keydown', (e) => {
        if (e.key === ',' || e.key === 'Enter' || e.key === 'Tab' || e.key === ' ') {
          e.preventDefault();
          const val = tagInput.value.trim();
          if (val) {
            const hidden = document.getElementById('ups-ma-sub');
            const current = hidden.value ? hidden.value.split(',').map(s => s.trim()).filter(Boolean) : [];
            if (!current.includes(val.toUpperCase())) {
              current.push(val.toUpperCase());
              hidden.value = current.join(',');
            }
            tagInput.value = '';
            atualizarTagsSub();
          }
        }
        if (e.key === 'Backspace' && tagInput.value === '') {
          const hidden = document.getElementById('ups-ma-sub');
          const current = hidden.value ? hidden.value.split(',').map(s => s.trim()).filter(Boolean) : [];
          if (current.length > 0) {
            current.pop();
            hidden.value = current.join(',');
            atualizarTagsSub();
          }
        }
      });
      tagInput.addEventListener('blur', () => {
        const val = tagInput.value.trim();
        if (val) {
          const hidden = document.getElementById('ups-ma-sub');
          const current = hidden.value ? hidden.value.split(',').map(s => s.trim()).filter(Boolean) : [];
          if (!current.includes(val.toUpperCase())) {
            current.push(val.toUpperCase());
            hidden.value = current.join(',');
          }
          tagInput.value = '';
          atualizarTagsSub();
        }
      });
    }


    if (window.__temEstadoSalvo) window.__upsLoadingPreset = true;
    try { restaurarEstadoMedidas(res.ultimoEstadoMedidas); } catch(e) {}
    // Render the table display for saved state (renderDisplayMedidas not accessible inside restaurarEstadoMedidas)
    if (res.ultimoEstadoMedidas && res.ultimoEstadoMedidas.selectedTable) {
      const sel = document.getElementById('ups-mt');
      if (sel) {
        sel.value = res.ultimoEstadoMedidas.selectedTable;
        selectedTable = res.ultimoEstadoMedidas.selectedTable;
        renderDisplayMedidas(selectedTable);
      }
    }
    if (!window.__temEstadoSalvo) {
      const savedMacros = res.ultimosMacros;
      if (savedMacros) {
        if (savedMacros.sub) document.getElementById('ups-ma-sub').value = savedMacros.sub;
        if (savedMacros.emMassa) {
          document.getElementById('ups-ma-eq').value = savedMacros.emMassa.quantidade || '';
          document.getElementById('ups-ma-ep').value = savedMacros.emMassa.preco || '';
          document.getElementById('ups-ma-ew').value = savedMacros.emMassa.peso || '';
          document.getElementById('ups-ma-epkg').value = savedMacros.emMassa.pacote || '';
        }
        document.getElementById('ups-ma-sku').checked = !!savedMacros.sku;
        document.getElementById('ups-ma-crop').checked = !!savedMacros.crop;
        document.getElementById('ups-ma-ativar').checked = savedMacros.ativar !== false;
      }
    }

    preencherListaPresets = function() {
      chrome.storage.local.get(['bibliotecaPresetsOverlay'], (v) => {
        const presets = v.bibliotecaPresetsOverlay || {};
        const sel = document.getElementById('ups-op-select');
        const atual = window.__upsRestorePresetSelect || sel.value;
        window.__upsRestorePresetSelect = null;
        sel.innerHTML = '<option value="">Carregar Nova Configuração...</option>' + Object.keys(presets).map(n => `<option value="${n}"${n === atual ? ' selected' : ''}>${n}</option>`).join('');
        if (atual && [...sel.options].some(o => o.value === atual)) {
          sel.value = atual;
        }
      });
    }
    preencherListaPresets();
    lerEstadoOverlay = function() {
      return {
        selectedTable: selectedTable,
        bulkPrice: document.getElementById('ups-mp-nb').value.trim(),
        overrides: JSON.parse(JSON.stringify(window.__upsNovoPrecoOverrides || {})),
        ativarPreco: document.getElementById('ups-ac-t-mp').checked,
        medidasAtivo: document.getElementById('ups-ac-t-mt').checked,
        sub: document.getElementById('ups-ma-sub').value.trim(),
        emMassa: {
          quantidade: document.getElementById('ups-ma-eq').value.trim(),
          preco: document.getElementById('ups-ma-ep').value.trim(),
          peso: document.getElementById('ups-ma-ew').value.trim(),
          pacote: document.getElementById('ups-ma-epkg').value.trim()
        },
        sku: document.getElementById('ups-ma-sku').checked,
        crop: document.getElementById('ups-ma-crop').checked,
        ativar: document.getElementById('ups-ma-ativar').checked,
        atrPreset: document.getElementById('ups-atr-carregar').value,
        atributosAtivo: document.getElementById('ups-ac-t-atr').checked,
        mpCarregar: document.getElementById('ups-mp-carregar').value,
        mpNomeSalvar: document.getElementById('ups-mp-nome-salvar').value,
        maSelect: document.getElementById('ups-ma-select').value,
        maNomeSalvar: document.getElementById('ups-ma-nome-salvar').value,
        confirmarCores: document.getElementById('ups-ma-confirmar-cores').checked
      };
    }
    aplicarPresetOverlay = function(dados) {
      if (!dados) return;
      window.__upsLoadingPreset = true;
      if (dados.selectedTable) {
        const sel = document.getElementById('ups-mt');
        if (sel && [...sel.options].some(o => o.value === dados.selectedTable)) {
          sel.value = dados.selectedTable;
          selectedTable = dados.selectedTable;
          atualizarDesc(dados.selectedTable);
        }
      }
      // Restore price preset select
      if (dados.mpCarregar) {
        const sel = document.getElementById('ups-mp-carregar');
        if (sel && [...sel.options].some(o => o.value === dados.mpCarregar)) {
          sel.value = dados.mpCarregar;
        }
      } else {
        document.getElementById('ups-mp-carregar').value = '';
      }
      document.getElementById('ups-mp-nome-salvar').value = dados.mpNomeSalvar || '';
      document.getElementById('ups-mp-excluir').style.display = dados.mpNomeSalvar ? 'block' : 'none';
      document.getElementById('ups-mp-nb').value = dados.bulkPrice || '';
      if (dados.overrides) {
        window.__upsNovoPrecoOverrides = JSON.parse(JSON.stringify(dados.overrides));
        renderOverridesNovo(window.__upsNovoPrecoOverrides);
      }
      if (dados.emMassa) {
        document.getElementById('ups-ma-eq').value = dados.emMassa.quantidade || '';
        document.getElementById('ups-ma-ep').value = dados.emMassa.preco || '';
        document.getElementById('ups-ma-ew').value = dados.emMassa.peso || '';
        document.getElementById('ups-ma-epkg').value = dados.emMassa.pacote || '';
      }
      document.getElementById('ups-ma-sku').checked = !!dados.sku;
      document.getElementById('ups-ma-crop').checked = !!dados.crop;
      document.getElementById('ups-ac-t-mp').checked = dados.ativarPreco !== false;
      document.getElementById('ups-ac-t-mt').checked = dados.medidasAtivo !== false;
      document.getElementById('ups-ma-sub').value = dados.sub || '';
      atualizarTagsSub();
      document.getElementById('ups-ma-ativar').checked = dados.ativar !== false;
      document.getElementById('ups-ac-t-atr').checked = dados.atributosAtivo !== false;
      if (dados.confirmarCores !== undefined) document.getElementById('ups-ma-confirmar-cores').checked = !!dados.confirmarCores;
      setTimeout(() => { window.__upsLoadingPreset = false; }, 100);
    }

    salvarPresetOverlay = function(nome) {
      if (!nome) return;
      chrome.storage.local.get(['bibliotecaPresetsOverlay'], (v) => {
        const presets = v.bibliotecaPresetsOverlay || {};
        const isUpdate = !!presets[nome];
        presets[nome] = lerEstadoOverlay();
        chrome.storage.local.set({ bibliotecaPresetsOverlay: presets }, () => {
          preencherListaPresets();
          document.getElementById('ups-op-select').value = nome;
          upsDialog({ title: isUpdate ? '✅ Atualizado' : '✅ Salvo', message: 'Preset "' + nome + '" ' + (isUpdate ? 'atualizado' : 'salvo') + ' com sucesso!' });
        });
      });
    }

    preencherListaPresets();

    // ===== Macro presets =====
    function preencherSelectMacrosMedidas(forceSelect) {
      const s = document.getElementById('ups-ma-select');
      const valAtual = s.value;
      s.innerHTML = '<option value="">Selecionar...</option>';
      chrome.storage.local.get(["biblioteca", "bibliotecaMacros"], (res) => {
        const bib = res.biblioteca || {};
        const bibMacros = res.bibliotecaMacros || {};
        Object.keys(bib).forEach(nome => {
          if (bib[nome].macros) {
            const opt = document.createElement('option');
            opt.value = 'bib:' + nome;
            opt.textContent = '📏 ' + nome;
            s.appendChild(opt);
          }
        });
        Object.keys(bibMacros).forEach(nome => {
          const opt = document.createElement('option');
          opt.value = 'avulso:' + nome;
          opt.textContent = '⚙ ' + nome;
          s.appendChild(opt);
        });
        const target = forceSelect || valAtual;
        if (target && [...s.options].some(o => o.value === target)) s.value = target;
      });
    }

    function carregarMacroNoDialogMedidas(tipo, nome) {
      if (!tipo || !nome) return;
      chrome.storage.local.get(["biblioteca", "bibliotecaMacros"], (res) => {
        let dados = null;
        if (tipo === 'bib') dados = (res.biblioteca || {})[nome]?.macros;
        else dados = (res.bibliotecaMacros || {})[nome];
        if (!dados) return;
        if (window.__upsLoadingPreset) return;
        document.getElementById('ups-ma-excluir').style.display = 'block';
        document.getElementById('ups-ma-nome-salvar').value = nome;
        if (dados.sub) document.getElementById('ups-ma-sub').value = dados.sub;
        atualizarTagsSub();
        if (dados.emMassa) {
          document.getElementById('ups-ma-eq').value = dados.emMassa.quantidade || '';
          document.getElementById('ups-ma-ep').value = dados.emMassa.preco || '';
          document.getElementById('ups-ma-ew').value = dados.emMassa.peso || '';
          document.getElementById('ups-ma-epkg').value = dados.emMassa.pacote || '';
        }
        document.getElementById('ups-ma-sku').checked = !!dados.sku;
        document.getElementById('ups-ma-crop').checked = !!dados.crop;
        document.getElementById('ups-ma-ativar').checked = dados.ativar !== false;
        mostrarToastFeedback('Macro "' + nome + '" carregada!');
      });
    }

    function salvarMacroDialogMedidas() {
      const nome = document.getElementById('ups-ma-nome-salvar').value.trim();
      if (!nome) return;
      const dados = {
        sub: document.getElementById('ups-ma-sub').value.trim(),
        emMassa: {
          quantidade: document.getElementById('ups-ma-eq').value.trim(),
          preco: document.getElementById('ups-ma-ep').value.trim(),
          peso: document.getElementById('ups-ma-ew').value.trim(),
          pacote: document.getElementById('ups-ma-epkg').value.trim()
        },
        sku: document.getElementById('ups-ma-sku').checked,
        crop: document.getElementById('ups-ma-crop').checked,
        ativar: document.getElementById('ups-ma-ativar').checked
      };
      chrome.storage.local.get(["biblioteca", "bibliotecaMacros"], (res) => {
        const bib = res.biblioteca || {};
        const bibMacros = res.bibliotecaMacros || {};
        if (bib[nome]) {
          bib[nome].macros = dados;
          chrome.storage.local.set({ biblioteca: bib }, () => {
            preencherSelectMacrosMedidas();
            setTimeout(() => {
              document.getElementById('ups-ma-select').value = 'bib:' + nome;
            }, 500);
            document.getElementById('ups-ma-excluir').style.display = 'block';
            document.getElementById('ups-ma-nome-salvar').value = '';
            mostrarToastFeedback('Macro "' + nome + '" vinculada à tabela!');
          });
        } else if (bibMacros[nome]) {
          bibMacros[nome] = dados;
          chrome.storage.local.set({ bibliotecaMacros: bibMacros }, () => {
            preencherSelectMacrosMedidas();
            setTimeout(() => {
              document.getElementById('ups-ma-select').value = 'avulso:' + nome;
            }, 500);
            document.getElementById('ups-ma-excluir').style.display = 'block';
            document.getElementById('ups-ma-nome-salvar').value = '';
            mostrarToastFeedback('Macro "' + nome + '" atualizada!');
          });
        } else {
          bibMacros[nome] = dados;
          chrome.storage.local.set({ bibliotecaMacros: bibMacros }, () => {
            preencherSelectMacrosMedidas();
            setTimeout(() => {
              document.getElementById('ups-ma-select').value = 'avulso:' + nome;
            }, 500);
            document.getElementById('ups-ma-excluir').style.display = 'block';
            document.getElementById('ups-ma-nome-salvar').value = '';
            mostrarToastFeedback('Macro "' + nome + '" salva!');
          });
        }
      });
    }

    function deletarMacroDialogMedidas() {
      const val = document.getElementById('ups-ma-select').value;
      if (!val) return;
      const [tipo, ...nomeParts] = val.split(':');
      const nome = nomeParts.join(':');
      const existing = document.getElementById('ups-macro-confirm-rm');
      if (existing) existing.remove();
      const div = document.createElement('div');
      div.id = 'ups-macro-confirm-rm';
      div.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.3);z-index:9999999;display:flex;align-items:center;justify-content:center;';
      div.innerHTML = '<div style="background:white;border-radius:12px;padding:24px;width:300px;box-shadow:0 8px 32px rgba(0,0,0,0.25);text-align:center;font-family:sans-serif;">' +
        '<div style="font-size:15px;font-weight:bold;margin-bottom:12px;">Excluir "' + nome + '"?</div>' +
        '<div style="display:flex;gap:8px;justify-content:center;">' +
        '<button id="ups-macro-rm-cancelar" style="padding:7px 20px;border:1px solid #ccc;border-radius:6px;cursor:pointer;font-size:13px;background:white;">Cancelar</button>' +
        '<button id="ups-macro-rm-confirmar" style="padding:7px 20px;background:#dc3545;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:bold;font-size:13px;">Excluir</button>' +
        '</div></div>';
      document.body.appendChild(div);
      document.getElementById('ups-macro-rm-cancelar').onclick = () => div.remove();
      document.getElementById('ups-macro-rm-confirmar').onclick = () => {
        div.remove();
        chrome.storage.local.get(["biblioteca", "bibliotecaMacros"], (res) => {
          if (tipo === 'bib') {
    const bib = res.biblioteca || {};
    // Migrate old biblioteca[nome].atributos → bibliotecaAtributos and clean up
    const bibAtr = res.bibliotecaAtributos || {};
    let migrated = false;
    Object.keys(bib).forEach(nome => {
      if (bib[nome].atributos && Object.keys(bib[nome].atributos).length) {
        if (!bibAtr[nome]) bibAtr[nome] = bib[nome].atributos;
        delete bib[nome].atributos;
        migrated = true;
      }
      // Remove empty orphan entries (no size keys, no descricao, no macros, no precos)
      const hasData = Object.keys(bib[nome]).some(k => listaTam.includes(k));
      if (!hasData) { delete bib[nome]; migrated = true; }
    });
    if (migrated) {
      chrome.storage.local.set({ biblioteca: bib, bibliotecaAtributos: bibAtr });
    }
            if (bib[nome]) delete bib[nome].macros;
            chrome.storage.local.set({ biblioteca: bib }, () => { preencherSelectMacrosMedidas(); });
          } else {
            const bibMacros = res.bibliotecaMacros || {};
            delete bibMacros[nome];
            chrome.storage.local.set({ bibliotecaMacros: bibMacros }, () => { preencherSelectMacrosMedidas(); });
          }
        });
      };
    }

    document.getElementById('ups-ma-select').onchange = (e) => {
      const val = e.target.value;
      if (!val) {
        document.getElementById('ups-ma-excluir').style.display = 'none';
        return;
      }
      const [tipo, ...nomeParts] = val.split(':');
      carregarMacroNoDialogMedidas(tipo, nomeParts.join(':'));
    };
    document.getElementById('ups-ma-salvar').onclick = salvarMacroDialogMedidas;
    document.getElementById('ups-ma-excluir').onclick = deletarMacroDialogMedidas;
    preencherSelectMacrosMedidas();
    document.getElementById('ups-atr-carregar').onchange = (e) => {
      const val = e.target.value;
      if (!val) { document.getElementById('ups-atr-excluir').style.display = 'none'; return; }
      const [tipo, ...nomeParts] = val.split(':');
      carregarPresetAtributos(tipo, nomeParts.join(':'));
    };
    document.getElementById('ups-atr-salvar').onclick = salvarPresetAtributos;
    document.getElementById('ups-atr-excluir').onclick = deletarPresetAtributos;
    preencherSelectAtributos();

    document.getElementById('ups-op-dados').onclick = (e) => {
      e.stopPropagation();
      const menu = document.getElementById('ups-op-dados-menu');
      if (menu) menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
    };
    const fecharMenu = (e) => {
      const menu = document.getElementById('ups-op-dados-menu');
      if (menu) menu.style.display = 'none';
    };
    document.removeEventListener('click', fecharMenu);
    document.addEventListener('click', fecharMenu);

    document.getElementById('ups-op-export-action').onclick = () => {
      chrome.storage.local.get(["biblioteca", "bibliotecaAtributos", "bibliotecaPrecos", "bibliotecaMacros", "bibliotecaPresetsOverlay", "ultimosPrecos", "ultimosMacros", "ultimaSelecionada", "ultimoEstadoMedidas", "multiMedidasConfig"], (res) => {
        const hoje = new Date();
        const dia = String(hoje.getDate()).padStart(2, '0');
        const mes = String(hoje.getMonth() + 1).padStart(2, '0');
        const ano = hoje.getFullYear();
        const exportData = {
          biblioteca: res.biblioteca || {},
          bibliotecaAtributos: res.bibliotecaAtributos || {},
          bibliotecaPrecos: res.bibliotecaPrecos || {},
          bibliotecaMacros: res.bibliotecaMacros || {},
          bibliotecaPresetsOverlay: res.bibliotecaPresetsOverlay || {},
          ultimosPrecos: res.ultimosPrecos || {},
          ultimosMacros: res.ultimosMacros || {},
          ultimaSelecionada: res.ultimaSelecionada || "",
          ultimoEstadoMedidas: res.ultimoEstadoMedidas || {},
          multiMedidasConfig: res.multiMedidasConfig || {}
        };
        chrome.runtime.sendMessage({ action: 'export-data', data: exportData, filename: `upseller-backup_${dia}-${mes}-${ano}.json` });
      });
    };

    const importInput = document.createElement('input');
    importInput.type = 'file';
    importInput.accept = '.json';
    importInput.style.display = 'none';
    document.body.appendChild(importInput);
    document.getElementById('ups-op-import-action').onclick = () => importInput.click();
    importInput.onchange = (e) => {
      const arquivo = e.target.files[0];
      if (!arquivo) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const dados = JSON.parse(ev.target.result);
          const bib = dados.biblioteca || {};
          const bibAtr = dados.bibliotecaAtributos || {};
          const bibPrecos = dados.bibliotecaPrecos || {};
          const bibMacros = dados.bibliotecaMacros || {};
          const bibOverlay = dados.bibliotecaPresetsOverlay || {};
          Object.keys(bib).forEach(nome => {
            if (bib[nome].atributos && Object.keys(bib[nome].atributos).length) {
              if (!bibAtr[nome]) bibAtr[nome] = bib[nome].atributos;
              delete bib[nome].atributos;
            }
          });
          chrome.storage.local.set({
            biblioteca: bib,
            bibliotecaAtributos: bibAtr,
            bibliotecaPrecos: bibPrecos,
            bibliotecaMacros: bibMacros,
            bibliotecaPresetsOverlay: bibOverlay,
            ultimosPrecos: dados.ultimosPrecos || {},
            ultimosMacros: dados.ultimosMacros || {},
            ultimaSelecionada: dados.ultimaSelecionada || "",
            ultimoEstadoMedidas: dados.ultimoEstadoMedidas || {},
            multiMedidasConfig: dados.multiMedidasConfig || {}
          }, () => {
            e.target.value = "";
            preencherListaPresets();
            preencherSelectSalvosMedidas();
            preencherSelectMacrosMedidas();
            preencherSelectAtributos();
            mostrarToastFeedback('Backup restaurado com sucesso!');
          });
        } catch (err) {
          mostrarToastFeedback('Erro ao importar: ' + err.message);
        }
      };
      reader.readAsText(arquivo);
    };
  });

    function preencherSelectAtributos() {
      const select = document.getElementById('ups-atr-carregar');
      const currentVal = select.value;
      select.innerHTML = '<option value="">Carregar Salvo...</option>';
      chrome.storage.local.get(["bibliotecaAtributos"], (res) => {
        const bibAtr = res.bibliotecaAtributos || {};
        Object.keys(bibAtr).forEach(nome => {
          const opt = document.createElement('option');
          opt.value = 'bib:' + nome;
          opt.textContent = '🏷 ' + nome + ' (' + Object.keys(bibAtr[nome]).length + ' attr)';
          select.appendChild(opt);
        });
        const restore = window.__upsAtrPresetRestore;
        if (restore && [...select.options].some(o => o.value === restore)) {
          select.value = restore;
        } else if (currentVal && [...select.options].some(o => o.value === currentVal)) {
          select.value = currentVal;
        }
        window.__upsAtrPresetRestore = null;
        if (select.value) {
          const [restoreTipo, ...restoreNomeParts] = select.value.split(':');
          carregarPresetAtributos(restoreTipo, restoreNomeParts.join(':'), true);
        }
      });
    }

    async function carregarPresetAtributos(tipo, nome, silent) {
      if (!tipo || !nome) return;
      chrome.storage.local.get(["bibliotecaAtributos"], (res) => {
        const bibAtr = res.bibliotecaAtributos || {};
        let dados = null;
        if (tipo === 'bib') dados = bibAtr[nome];
        else return;
        if (!dados) return;
        document.getElementById('ups-atr-nome').value = nome;
        document.getElementById('ups-atr-excluir').style.display = 'block';
        if (!silent) mostrarToastFeedback('Preset "' + nome + '" selecionado (' + Object.keys(dados).length + ' attr)');
      });
    }

    function salvarPresetAtributos() {
      const nome = document.getElementById('ups-atr-nome').value.trim();
      if (!nome) { mostrarToastFeedback('Digite um nome para o preset'); return; }
      const attrs = lerAtributos();
      const count = Object.keys(attrs).length;
      if (!count) { mostrarToastFeedback('Nenhum atributo configurado'); return; }
      chrome.storage.local.get(["bibliotecaAtributos"], (res) => {
        const bibAtr = res.bibliotecaAtributos || {};
        bibAtr[nome] = attrs;
        chrome.storage.local.set({ bibliotecaAtributos: bibAtr }, () => {
          preencherSelectAtributos();
          setTimeout(() => {
            document.getElementById('ups-atr-carregar').value = 'bib:' + nome;
            carregarPresetAtributos('bib', nome);
          }, 100);
          document.getElementById('ups-atr-nome').value = '';
          mostrarToastFeedback('Atributos salvos como "' + nome + '" (' + count + ' attr)');
        });
      });
    }

    function deletarPresetAtributos() {
      const nome = document.getElementById('ups-atr-nome').value.trim();
      if (!nome) return;
      chrome.storage.local.get(["bibliotecaAtributos"], (res) => {
        const bibAtr = res.bibliotecaAtributos || {};
        if (bibAtr[nome]) delete bibAtr[nome];
        chrome.storage.local.set({ bibliotecaAtributos: bibAtr }, () => {
          document.getElementById('ups-atr-nome').value = '';
          document.getElementById('ups-atr-excluir').style.display = 'none';
          preencherSelectAtributos();
          mostrarToastFeedback('Atributos excluídos');
        });
      });
  }

  salvarEstadoMedidas = function() {
    chrome.storage.local.set({
      ultimoEstadoMedidas: {
        selectedTable,
        toggles: {
          mt: document.getElementById('ups-ac-t-mt').checked,
          mp: document.getElementById('ups-ac-t-mp').checked,
          multi: document.getElementById('ups-ac-t-multi').checked,
          ativar: document.getElementById('ups-ma-ativar').checked,
          atr: document.getElementById('ups-ac-t-atr').checked
        },
        atrPreset: document.getElementById('ups-atr-carregar').value,
        bulkPrice: document.getElementById('ups-mp-nb').value.trim(),
        overrides: window.__upsNovoPrecoOverrides || {},
        macroSub: document.getElementById('ups-ma-sub').value.trim(),
        macroQtd: document.getElementById('ups-ma-eq').value.trim(),
        macroPreco: document.getElementById('ups-ma-ep').value.trim(),
        macroPeso: document.getElementById('ups-ma-ew').value.trim(),
        macroPacote: document.getElementById('ups-ma-epkg').value.trim(),
        macroSku: document.getElementById('ups-ma-sku').checked,
        macroCrop: document.getElementById('ups-ma-crop').checked,
        macroConfirmarCores: document.getElementById('ups-ma-confirmar-cores').checked,
        presetSelect: document.getElementById('ups-op-select').value
      }
    });
  }

  // Tag input for subespecificação sizes
  function atualizarTagsSub() {
    const hidden = document.getElementById('ups-ma-sub');
    const container = document.getElementById('ups-ma-sub-tags');
    if (!hidden || !container) return;
    const values = hidden.value.split(',').map(s => s.trim()).filter(Boolean);
    container.innerHTML = values.map(v => `<span class="ups-tag">${v}<span class="ups-tag-rm" data-tag="${v}">×</span></span>`).join('');
    container.querySelectorAll('.ups-tag-rm').forEach(el => {
      el.onclick = (e) => {
        e.stopPropagation();
        const rem = el.getAttribute('data-tag');
        const current = document.getElementById('ups-ma-sub').value.split(',').map(s => s.trim()).filter(Boolean);
        document.getElementById('ups-ma-sub').value = current.filter(s => s !== rem).join(',');
        atualizarTagsSub();
      };
    });
  }

  function atualizarMultiHabilitado() {
    const slider = document.getElementById('ups-ac-t-multi');
    const label = slider?.parentElement;
    if (!slider) return;
    if (label) label.style.opacity = '1';
    slider.disabled = false;
  }

  function restaurarEstadoMedidas(estado) {
    if (!estado) return;
    if (estado.selectedTable) {
      const sel = document.getElementById('ups-mt');
      if (sel && [...sel.options].some(o => o.value === estado.selectedTable)) {
        sel.value = estado.selectedTable;
        selectedTable = estado.selectedTable;
      }
    }
    if (estado.atrPreset) {
      window.__upsAtrPresetRestore = estado.atrPreset;
    }
    if (estado.bulkPrice !== undefined) document.getElementById('ups-mp-nb').value = estado.bulkPrice;
    window.__upsNovoPrecoOverrides = estado.overrides ? { ...estado.overrides } : {};
    renderOverridesNovo(window.__upsNovoPrecoOverrides);
    if (estado.macroSub !== undefined) document.getElementById('ups-ma-sub').value = estado.macroSub;
    atualizarTagsSub();
    if (estado.macroQtd !== undefined) document.getElementById('ups-ma-eq').value = estado.macroQtd || '';
    if (estado.macroPreco !== undefined) document.getElementById('ups-ma-ep').value = estado.macroPreco || '';
    if (estado.macroPeso !== undefined) document.getElementById('ups-ma-ew').value = estado.macroPeso || '';
    if (estado.macroPacote !== undefined) document.getElementById('ups-ma-epkg').value = estado.macroPacote || '';
    if (estado.macroSku !== undefined) document.getElementById('ups-ma-sku').checked = !!estado.macroSku;
    if (estado.macroCrop !== undefined) document.getElementById('ups-ma-crop').checked = !!estado.macroCrop;
    if (estado.macroConfirmarCores !== undefined) document.getElementById('ups-ma-confirmar-cores').checked = !!estado.macroConfirmarCores;
    if (estado.presetSelect) {
      window.__upsRestorePresetSelect = estado.presetSelect;
    }
    if (estado.toggles) {
      setTimeout(() => {
        document.getElementById('ups-ac-t-mt').checked = estado.toggles.mt !== false;
        document.getElementById('ups-ac-t-mp').checked = estado.toggles.mp !== false;
        document.getElementById('ups-ac-t-multi').checked = false;
        document.getElementById('ups-ma-ativar').checked = estado.toggles.ativar !== false;
        document.getElementById('ups-ac-t-atr').checked = estado.toggles.atr === true;
      }, 50);
    }
    atualizarMultiHabilitado();
  }



  document.getElementById('ups-mc').onclick = () => {
    salvarEstadoMedidas();
    overlay.remove();
  };

  document.getElementById('ups-op-select').addEventListener('change', function() {
    const nome = this.value;
    if (!nome) return;
    chrome.storage.local.get(['bibliotecaPresetsOverlay'], (v) => {
      const dados = (v.bibliotecaPresetsOverlay || {})[nome];
      if (dados) aplicarPresetOverlay(dados);
    });
  });

  document.getElementById('ups-op-salvar').onclick = async () => {
    const sel = document.getElementById('ups-op-select');
    const atual = sel.value;
    const nome = await upsDialog({ title: '💾 Salvar Preset', message: 'Nome do preset:', input: true, placeholder: 'Meu preset...', value: atual, okText: 'Salvar', cancel: true });
    if (!nome || !nome.trim()) return;
    salvarPresetOverlay(nome.trim());
  };

  document.getElementById('ups-op-excluir').onclick = async () => {
    const sel = document.getElementById('ups-op-select');
    const nome = sel.value;
    if (!nome) return;
    const conf = await upsDialog({ title: 'Confirmar', message: 'Excluir preset "' + nome + '"?', okText: 'Excluir', cancel: true });
    if (!conf) return;
    chrome.storage.local.get(['bibliotecaPresetsOverlay'], (v) => {
      const presets = v.bibliotecaPresetsOverlay || {};
      delete presets[nome];
      chrome.storage.local.set({ bibliotecaPresetsOverlay: presets }, () => {
        preencherListaPresets();
        document.getElementById('ups-op-select').value = '';
      });
    });
  };

  document.getElementById('ups-ac-t-multi').addEventListener('change', function() {
    if (this.checked) {
      const modal = document.createElement('div');
      modal.id = 'ups-ma-confirm-modal';
      modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.45);z-index:9999999;display:flex;align-items:center;justify-content:center;font-family:sans-serif;';
      modal.innerHTML = `
<div style="background:white;border-radius:8px;padding:24px;width:360px;box-shadow:0 8px 32px rgba(0,0,0,0.25);">
  <div style="font-size:14px;font-weight:600;margin-bottom:8px;">Ativar Multi-Aba?</div>
  <div style="font-size:13px;color:#555;margin-bottom:16px;line-height:1.5;">Isso aplicará as configurações atuais em <b>todas as abas de edição</b> abertas automaticamente. Deseja continuar?</div>
  <div style="display:flex;gap:8px;justify-content:flex-end;">
    <button id="ups-ma-confirm-cancelar" style="padding:6px 16px;border:1px solid #ccc;border-radius:4px;cursor:pointer;background:white;font-size:13px;">Cancelar</button>
    <button id="ups-ma-confirm-confirmar" style="padding:6px 16px;background:#28a745;color:white;border:none;border-radius:4px;cursor:pointer;font-weight:bold;font-size:13px;">Confirmar</button>
  </div>
</div>`;
      document.body.appendChild(modal);
      document.getElementById('ups-ma-confirm-cancelar').onclick = () => {
        document.getElementById('ups-ac-t-multi').checked = false;
        modal.remove();
      };
      document.getElementById('ups-ma-confirm-confirmar').onclick = () => {
        modal.remove();
      };
    }
  });

  document.getElementById('ups-mk').onclick = async () => {
    if (!selectedTable) return;

    salvarEstadoMedidas();
    document.getElementById('upseller-medidas-overlay').style.display = 'none';

    const medidasAtivo = document.getElementById('ups-ac-t-mt').checked;
    const precoAtivo = document.getElementById('ups-ac-t-mp').checked;
    const multiAtivo = document.getElementById('ups-ac-t-multi').checked;
    const atributosAtivo = document.getElementById('ups-ac-t-atr').checked;
    const aplicarPreco = precoAtivo && document.getElementById('ups-mp-nb').value.trim() !== '';
    const macroAtivo = document.getElementById('ups-ma-ativar').checked;
    const temSub = document.getElementById('ups-ma-sub').value.trim() !== '';
    const temEmMassa = document.getElementById('ups-ma-eq').value.trim() !== '' ||
                       document.getElementById('ups-ma-ep').value.trim() !== '' ||
                       document.getElementById('ups-ma-ew').value.trim() !== '' ||
                       document.getElementById('ups-ma-epkg').value.trim() !== '';
    const temSku = document.getElementById('ups-ma-sku').checked;
    const temCrop = document.getElementById('ups-ma-crop').checked;
    const temMacro = macroAtivo && (temSub || temEmMassa || temSku || temCrop);

    // Read price config
    const bulkPrice = document.getElementById('ups-mp-nb').value.trim();
    const overrides = window.__upsNovoPrecoOverrides || {};
    const confirmarCoresAtivo = document.getElementById('ups-ma-confirmar-cores').checked;

    // Se multi-aba ativo, envia para background
    if (multiAtivo) {
      const atrSelect = document.getElementById('ups-atr-carregar');
      const atrPreset = atrSelect ? atrSelect.value : '';
      chrome.runtime.sendMessage({
        action: 'start-multi-medidas',
        config: {
          selectedTable,
          bulkPrice,
          overrides,
          atributosAtivo,
          atrPreset,
          confirmarCores: macroAtivo && confirmarCoresAtivo,
          macro: temMacro ? {
            sub: document.getElementById('ups-ma-sub').value.trim(),
            emMassa: {
              quantidade: document.getElementById('ups-ma-eq').value.trim(),
              preco: document.getElementById('ups-ma-ep').value.trim(),
              peso: document.getElementById('ups-ma-ew').value.trim(),
              pacote: document.getElementById('ups-ma-epkg').value.trim()
            },
            sku: temSku,
            crop: temCrop
          } : null
        }
      });
      return;
    }

    window.__upsCancelMacro = false;
    criarOverlayProgresso();

    // Calcular total de passos dinamicamente (ordem: remap → sub → emMassa → preço → desc → capitalizar → atributos → sku → guia → crop)
    const needsRemap = medidasAtivo && precisaRemapear();
    let totalSteps = 0;
    if (needsRemap) totalSteps++;
    if (temSub && macroAtivo) totalSteps++;
    if (confirmarCoresAtivo && macroAtivo && lerCoresEspecificacaoPrincipal().length > 0) totalSteps++;
    if (temEmMassa && macroAtivo) totalSteps++;
    if (aplicarPreco) totalSteps++;
    if (medidasAtivo) totalSteps++; // desc
    if (medidasAtivo) totalSteps++; // capitalizar titulo
    if (atributosAtivo) totalSteps++; // atributos
    if (temSku && macroAtivo) totalSteps++;
    if (medidasAtivo) totalSteps++; // guia
    if (temCrop && macroAtivo) totalSteps++; // recortar img quadrada

    let stepCounter = 0;

    function nextStep(msg) {
      stepCounter++;
      atualizarOverlayProgresso({ message: msg, step: stepCounter, total: totalSteps });
    }

    try {
      // 1 — Remap
      if (needsRemap) {
        try {
          nextStep('Remapeando...');
          await runAutomation((p) => {
            atualizarOverlayProgresso({ message: 'Remapeando: ' + p.message, step: stepCounter, total: totalSteps });
          });
        } catch (e) { /* ignore remap errors */ }
        if (window.__upsCancelMacro) { finalizarMacroCancelada(selectedTable); return; }
      }

      chrome.storage.local.get(["biblioteca", "bibliotecaAtributos"], async (res) => {
        try {
          // 1.5 — Confirmar Cores (antes da Subespecificação)
          if (confirmarCoresAtivo && macroAtivo) {
            const coresPagina = lerCoresEspecificacaoPrincipal();
            if (coresPagina.length > 0) {
              nextStep('Aguardando confirmação de cores...');
              const result = await mostrarDialogoConfirmarCores(coresPagina);
              if (result.confirmou) {
                await aplicarCoresNaPagina(result.cores);
                await sleep(500);
              }
              if (window.__upsCancelMacro) { finalizarMacroCancelada(selectedTable); return; }
            }
          }

          // 2 — Subespecificação
          if (temSub && macroAtivo) {
            nextStep('Aplicando Subespecificação...');
            const subRes = await subespecificacaoMassa(document.getElementById('ups-ma-sub').value.trim());
            if (window.__upsCancelMacro) { finalizarMacroCancelada(selectedTable); return; }
            await sleep(subRes && subRes.uncheckedCount > 0 ? 3000 : 2000);
          }

          // 3 — Editar em Massa (quant, preço, peso, pacote)
          if (temEmMassa && macroAtivo) {
            nextStep('Aplicando Editar em Massa...');
            const cols = encontrarColunasMassa();
            const eq = document.getElementById('ups-ma-eq').value.trim();
            const ep = document.getElementById('ups-ma-ep').value.trim();
            const ew = document.getElementById('ups-ma-ew').value.trim();
            const epkg = document.getElementById('ups-ma-epkg').value.trim();
            if (eq && cols.quant) await setColunaEmMassa(cols.quant, eq, 'input.ant-input.ant-input-sm');
            if (ep && cols.preco) await setColunaEmMassa(cols.preco, ep, 'input.ant-input-number-input');
            if (ew && cols.peso) await setColunaEmMassa(cols.peso, ew, 'input.ant-input-number-input');
            if (epkg && cols.pacote) {
              const sep = epkg.includes('x') ? 'x' : ',';
              await setColunaEmMassa(cols.pacote, epkg.split(sep).map(s => s.trim()), 'input.ant-input-number-input');
            }
            if (window.__upsCancelMacro) { finalizarMacroCancelada(selectedTable); return; }
          }

          // 4 — Preço Especial
          if (aplicarPreco) {
            nextStep('Aplicando preços...');
            if (bulkPrice) {
              chrome.storage.local.set({ ultimosPrecos: { bulkPrice, overrides: { ...overrides } } });
              await setPrecosCompletos(bulkPrice, overrides);
            }
            if (window.__upsCancelMacro) { finalizarMacroCancelada(selectedTable); return; }
          }

          // 5 — Descrição
          if (medidasAtivo) {
            const dados = res.biblioteca && res.biblioteca[selectedTable];
            if (dados && dados.descricao) {
              nextStep('Preenchendo descrição...');
              const ta = document.querySelector('.ant-form-item-control textarea.ant-input');
              if (ta) {
                ta.focus();
                ta.value = dados.descricao;
                ta.dispatchEvent(new Event('input', { bubbles: true }));
                ta.dispatchEvent(new Event('change', { bubbles: true }));
                ta.blur();
              }
              if (window.__upsCancelMacro) { finalizarMacroCancelada(selectedTable); return; }
            }
            nextStep('Capitalizando título...');
            capitalizarTitulo();
            chrome.storage.local.set({ ultimaSelecionada: selectedTable });
          } else {
            chrome.storage.local.set({ ultimaSelecionada: selectedTable });
          }

          // 6 — Atributos
          if (atributosAtivo) {
            nextStep('Aplicando atributos...');
            expandirAtributos();
            await sleep(800);
            const atrSelect = document.getElementById('ups-atr-carregar');
            const atrVal = atrSelect ? atrSelect.value : '';
            if (atrVal) {
              const [tipo, ...nomeParts] = atrVal.split(':');
              const nome = nomeParts.join(':');
              let dados = null;
              if (tipo === 'bib') {
                const bibAtr = res.bibliotecaAtributos || {};
                dados = bibAtr[nome];
              }
              if (dados && typeof dados === 'object') {
                atualizarOverlayProgresso({ message: 'Limpando atributos antigos...' });
                await limparAtributosCustomizados();
                await sleep(300);
                atualizarOverlayProgresso({ message: 'Aplicando atributos...' });
                for (const key of Object.keys(dados)) {
                  await aplicarAtributo(key, dados[key]);
                  if (window.__upsCancelMacro) break;
                }
                if (window.__upsCancelMacro) { finalizarMacroCancelada(selectedTable); return; }
              }
            }
          }

          // 7 — Gerar SKU
          if (temSku && macroAtivo) {
            nextStep('Gerando SKU...');
            gerarSkuEmMassa();
            if (window.__upsCancelMacro) { finalizarMacroCancelada(selectedTable); return; }
          }

          // 7 — Guia de Tamanhos (last — may prompt for missing sizes)
          if (medidasAtivo) {
            nextStep('Preenchendo guia de tamanhos...');
            const dados = res.biblioteca && res.biblioteca[selectedTable];
            if (dados) {
              // Pre-check: detect sizes in variant table without saved measurements
              let preMissing = detectarTamanhosFaltantes(selectedTable, dados);
              if (preMissing.length > 0) {
                atualizarOverlayProgresso({ message: 'Medidas faltantes detectadas...' });
                const panelRes = await mostrarPainelMedidasFaltantes(preMissing, selectedTable, dados);
                if (window.__upsCancelMacro) { finalizarMacroCancelada(selectedTable); return; }
                if (!panelRes || !panelRes.saved) {
                  // user skipped — remove missing from dados so guia doesn't re-detect
                  const listaTamanhos = ["PP","P","M","G","GG","EGG","G1","G2","G3","G4","G5","2","4","6","8","10","12","14","16"];
                  preMissing.forEach(t => { if (dados[t] && !dados[t].b && !dados[t].c) delete dados[t]; });
                }
              }

              atualizarOverlayProgresso({ message: 'Preenchendo guia de tamanhos...' });
              const guiaRes = await preencherGuiaTamanhos(dados);
              if (window.__upsCancelMacro) { finalizarMacroCancelada(selectedTable); return; }
              if (guiaRes && guiaRes.missing && guiaRes.missing.length > 0) {
                const panelRes = await mostrarPainelMedidasFaltantes(guiaRes.missing, selectedTable, dados);
                if (panelRes && panelRes.saved) {
                  atualizarOverlayProgresso({ message: 'Reaplicando guia de tamanhos...' });
                  await preencherGuiaTamanhos(dados);
                  if (window.__upsCancelMacro) { finalizarMacroCancelada(selectedTable); return; }
                }
              }
            }
          }

          // 9 — Recortar Imagem Quadrada (must be last — triggers dialog)
          if (temCrop && macroAtivo) {
            nextStep('Recortando imagem quadrada...');
            const overlayEl = document.getElementById('upseller-progress-overlay');
            if (overlayEl) overlayEl.style.display = 'none';
            try {
              await recortarImagemQuadradaEmMassa();
            } catch (e) {
              if (overlayEl) overlayEl.style.display = '';
              mostrarErroOverlayProgresso('Erro no recorte: ' + e.message);
              setTimeout(() => removerOverlayProgresso(), 3000);
              return;
            }
            if (overlayEl) overlayEl.style.display = '';
            if (window.__upsCancelMacro) { finalizarMacroCancelada(selectedTable); return; }
          }

          // Save ultimosMacros
          chrome.storage.local.set({
            ultimosMacros: {
              sub: document.getElementById('ups-ma-sub').value.trim(),
              emMassa: {
                quantidade: document.getElementById('ups-ma-eq').value.trim(),
                preco: document.getElementById('ups-ma-ep').value.trim(),
                peso: document.getElementById('ups-ma-ew').value.trim(),
                pacote: document.getElementById('ups-ma-epkg').value.trim()
              },
              sku: temSku,
              crop: temCrop,
              ativar: macroAtivo
            }
          });

          atualizarOverlayProgresso({ message: '✓ Macro concluída!', step: stepCounter, total: totalSteps });
          setTimeout(() => removerOverlayProgresso(), 1500);
        } catch (e) {
          mostrarErroOverlayProgresso('Erro: ' + e.message);
          setTimeout(() => removerOverlayProgresso(), 3000);
        }
      });
    } catch (e) {
      mostrarErroOverlayProgresso('Erro: ' + e.message);
      setTimeout(() => removerOverlayProgresso(), 3000);
    }
  };

  function finalizarMacroCancelada(selTable) {
    chrome.storage.local.set({ ultimaSelecionada: selTable });
    mostrarErroOverlayProgresso('⏸ Macro cancelada');
    setTimeout(() => removerOverlayProgresso(), 2000);
  }
}

function normalizarCor(s) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
}

function lerCoresEspecificacaoPrincipal() {
  const forms = document.querySelectorAll('.ant-form-item');
  for (const section of forms) {
    const label = section.querySelector('.ant-form-item-label');
    if (!label || !label.textContent.trim().includes('Especificação Principal')) continue;
    const wrappers = section.querySelectorAll('.ant-checkbox-wrapper');
    return Array.from(wrappers).map(w => {
      const cb = w.querySelector('.ant-checkbox-input');
      const nome = (cb && cb.value) || w.textContent.trim();
      return { nome: nome.trim(), wrapper: w, checkbox: cb, checked: cb ? cb.checked : false };
    });
  }
  return [];
}

function mostrarDialogoConfirmarCores(coresAtuais) {
  return new Promise((resolve) => {
    const existing = document.getElementById('ups-cor-dialog');
    if (existing) existing.remove();
    const div = document.createElement('div');
    div.id = 'ups-cor-dialog';
    div.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999999;display:flex;align-items:center;justify-content:center;';
    div.innerHTML = `
<div style="background:white;border-radius:12px;padding:24px;width:640px;max-width:95vw;box-shadow:0 8px 32px rgba(0,0,0,0.3);font-family:sans-serif;">
  <div style="font-size:16px;font-weight:600;margin-bottom:4px;">🎨 Confirmar Cores</div>
  <div style="font-size:13px;color:#555;margin-bottom:12px;">Selecione as cores que deseja manter marcadas na Especificação Principal:</div>
  <div id="ups-cor-lista" style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;max-height:260px;overflow-y:auto;margin-bottom:12px;padding:4px 0;">
    ${coresAtuais.map((c, i) => `
      <label style="display:flex;align-items:center;gap:5px;padding:5px 6px;font-size:13px;cursor:pointer;border-radius:4px;border:1px solid #e0e0e0;background:${c.checked ? '#e8f5e9' : '#fafafa'};" data-idx="${i}">
        <input type="checkbox" class="ups-cor-chk" ${c.checked ? 'checked' : ''} style="margin:0;" data-idx="${i}">
        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${c.nome}</span>
      </label>
    `).join('')}
  </div>
  <div style="display:flex;gap:6px;margin-bottom:12px;">
    <input id="ups-cor-input" type="text" placeholder="Adicionar cor..." style="flex:1;padding:7px;border:1px solid #ccc;border-radius:4px;font-size:13px;">
    <button id="ups-cor-add" style="padding:7px 14px;background:#4078f2;color:white;border:none;border-radius:4px;cursor:pointer;font-size:13px;font-weight:600;">+</button>
  </div>
  <div style="display:flex;gap:8px;justify-content:flex-end;">
    <button id="ups-cor-pular" style="padding:7px 16px;border:1px solid #ccc;border-radius:6px;cursor:pointer;font-size:13px;background:white;">Pular Etapa</button>
    <button id="ups-cor-confirmar" style="padding:7px 20px;background:#28a745;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:bold;font-size:13px;">Confirmar</button>
  </div>
</div>`;
    document.body.appendChild(div);

    function mostrarToast(msg) {
      const t = document.createElement('div');
      t.textContent = msg;
      t.style.cssText = 'position:fixed;top:24px;left:50%;transform:translateX(-50%);background:#28a745;color:#fff;padding:8px 20px;border-radius:6px;font-size:14px;z-index:10000000;opacity:0;transition:opacity .3s;pointer-events:none;';
      document.body.appendChild(t);
      requestAnimationFrame(() => { t.style.opacity = '1'; });
      setTimeout(() => {
        t.style.opacity = '0';
        setTimeout(() => t.remove(), 300);
      }, 2000);
    }

    div.querySelectorAll('.ups-cor-chk').forEach(chk => {
      chk.addEventListener('change', () => {
        const label = chk.closest('label');
        if (label) label.style.background = chk.checked ? '#e8f5e9' : '#fafafa';
      });
    });

    function coletarCores() {
      const labels = div.querySelectorAll('#ups-cor-lista > label');
      return Array.from(labels).map(label => {
        const chk = label.querySelector('.ups-cor-chk');
        const text = label.querySelector('span').textContent.trim();
        return { nome: text, checked: chk.checked };
      });
    }

    document.getElementById('ups-cor-add').onclick = () => {
      const input = document.getElementById('ups-cor-input');
      const nomeRaw = input.value.trim();
      if (!nomeRaw) return;
      const lista = document.getElementById('ups-cor-lista');
      const existente = Array.from(lista.querySelectorAll('label')).some(label => {
        const text = label.querySelector('span').textContent.trim();
        return text === nomeRaw;
      });
      if (!existente) {
        const label = document.createElement('label');
        label.style.cssText = 'display:flex;align-items:center;gap:5px;padding:5px 6px;font-size:13px;cursor:pointer;border-radius:4px;border:1px solid #e0e0e0;background:#e8f5e9;';
        label.innerHTML = `<input type="checkbox" class="ups-cor-chk" checked style="margin:0;"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${nomeRaw}</span>`;
        label.querySelector('.ups-cor-chk').addEventListener('change', function() {
          label.style.background = this.checked ? '#e8f5e9' : '#fafafa';
        });
        lista.appendChild(label);
        mostrarToast(`${nomeRaw} adicionada`);
      } else {
        const target = Array.from(lista.querySelectorAll('label')).find(label => {
          const text = label.querySelector('span').textContent.trim();
          return text === nomeRaw;
        });
        if (target) {
          const chk = target.querySelector('.ups-cor-chk');
          if (chk && !chk.checked) {
            chk.checked = true;
            target.style.background = '#e8f5e9';
            mostrarToast(`${nomeRaw} marcada`);
          }
        }
      }
      input.value = '';
    };
    document.getElementById('ups-cor-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); document.getElementById('ups-cor-add').click(); }
    });

    document.getElementById('ups-cor-confirmar').onclick = () => {
      div.remove();
      resolve({ confirmou: true, cores: coletarCores() });
    };
    document.getElementById('ups-cor-pular').onclick = () => {
      div.remove();
      resolve({ confirmou: false, cores: [] });
    };
  });
}

async function aplicarCoresNaPagina(cores) {
  const forms = document.querySelectorAll('.ant-form-item');
  let section = null;
  for (const s of forms) {
    const lbl = s.querySelector('.ant-form-item-label');
    if (lbl && lbl.textContent.trim().includes('Especificação Principal')) { section = s; break; }
  }
  if (!section) return;

  for (const cor of cores) {
    if (!cor.nome) continue;
    const nomeExato = cor.nome.trim();
    const norm = normalizarCor(nomeExato);
    if (cor.checked) {
      const wrappers = section.querySelectorAll('.ant-checkbox-wrapper');
      for (const w of wrappers) {
        const cb = w.querySelector('.ant-checkbox-input');
        const nomePagina = ((cb && cb.value) || w.textContent.trim()).trim();
        if (normalizarCor(nomePagina) === norm && nomePagina !== nomeExato) {
          if (cb && cb.checked) {
            w.click();
            await sleep(100);
          }
        }
      }
    }
    let encontrou = false;
    const wrappers = section.querySelectorAll('.ant-checkbox-wrapper');
    for (const w of wrappers) {
      const cb = w.querySelector('.ant-checkbox-input');
      const nomePagina = ((cb && cb.value) || w.textContent.trim()).trim();
      if (nomePagina === nomeExato) {
        encontrou = true;
        if (cb && cb.checked !== cor.checked) {
          w.click();
          await sleep(100);
        }
      }
    }
    if (!encontrou && cor.checked) {
      const addBtn = Array.from(document.querySelectorAll('button')).find(b =>
        b.textContent.trim() === 'Adicionar Opções'
      );
      if (!addBtn) continue;
      addBtn.click();
      await sleep(1000);
      const input = document.querySelector('.ant-popover-inner-content input.ant-input');
      if (input) {
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        input.focus();
        nativeSetter.call(input, cor.nome);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        await sleep(300);
        const salvarBtn = document.querySelector('.ant-popover-inner-content button.my_ant_btn_primary');
        if (salvarBtn) {
          salvarBtn.click();
          await sleep(1000);
        }
      }
    }
  }
  if (window.__temEstadoSalvo) setTimeout(() => { window.__upsLoadingPreset = false; }, 100);
}

// ========== OVERLAY DE PROGRESSO (macro medidas) ==========
function criarOverlayProgresso() {
  const existing = document.getElementById('upseller-progress-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'upseller-progress-overlay';
  overlay.innerHTML = `
<div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:999999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;font-family:sans-serif;">
  <div style="font-size:36px;">⚙️</div>
  <div style="font-size:16px;font-weight:bold;color:#fff;">Executando Macro</div>
  <div id="upp-step" style="font-size:13px;color:#ccc;text-align:center;padding:0 30px;"></div>
  <div style="width:260px;height:5px;background:rgba(255,255,255,0.15);border-radius:3px;overflow:hidden;margin-top:4px;">
    <div id="upp-bar" style="height:100%;width:0%;background:#4CAF50;border-radius:3px;transition:width 0.3s;"></div>
 </div>
  <div id="upp-ctr" style="font-size:11px;color:#aaa;"></div>
  <button id="upp-cancel" style="margin-top:8px;padding:8px 24px;background:#dc3545;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:bold;font-size:14px;">⏹ Cancelar</button>
</div>`;
  document.body.appendChild(overlay);

  document.getElementById('upp-cancel').onclick = () => {
    window.__upsCancelMacro = true;
    const btn = document.getElementById('upp-cancel');
    if (btn) { btn.textContent = 'Cancelando...'; btn.disabled = true; btn.style.opacity = '0.6'; }
  };
}

function atualizarOverlayProgresso(dados) {
  const stepEl = document.getElementById('upp-step');
  const barEl = document.getElementById('upp-bar');
  const ctrEl = document.getElementById('upp-ctr');
  if (dados.message && stepEl) stepEl.textContent = dados.message;
  if (dados.step !== undefined && dados.total !== undefined && barEl) {
    barEl.style.width = (dados.step / dados.total * 100) + '%';
  }
  if (dados.step !== undefined && dados.total !== undefined && ctrEl) {
    ctrEl.textContent = 'Passo ' + dados.step + ' de ' + dados.total;
  }
}

function mostrarErroOverlayProgresso(msg) {
  const stepEl = document.getElementById('upp-step');
  const barEl = document.getElementById('upp-bar');
  const ctrEl = document.getElementById('upp-ctr');
  const cancelBtn = document.getElementById('upp-cancel');
  if (stepEl) { stepEl.textContent = msg; stepEl.style.color = '#ff6b6b'; }
  if (barEl) barEl.style.background = '#ff6b6b';
  if (ctrEl) ctrEl.textContent = '';
  if (cancelBtn) cancelBtn.style.display = 'none';
}

function removerOverlayProgresso() {
  const el = document.getElementById('upseller-progress-overlay');
  if (el) {
    const inner = el.querySelector('div');
    if (inner) { inner.style.transition = 'opacity 0.4s'; inner.style.opacity = '0'; }
    setTimeout(() => el.remove(), 400);
  }
}

// ========== OVERLAY MULTI-ABA (na página) ==========

function criarOverlayMulti(tab, total) {
  const existing = document.getElementById('upseller-multi-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'upseller-multi-overlay';
  overlay.innerHTML = `
<div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:999999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;font-family:sans-serif;">
  <div style="font-size:36px;pointer-events:none;">🔄</div>
  <div style="font-size:16px;font-weight:bold;color:#fff;pointer-events:none;">Remapeamento Multi-Aba</div>
  <div id="umo-tab" style="font-size:13px;color:#ccc;pointer-events:none;"></div>
  <div id="umo-step" style="font-size:12px;color:#888;text-align:center;padding:0 30px;pointer-events:none;"></div>
  <div style="width:260px;height:5px;background:rgba(255,255,255,0.15);border-radius:3px;overflow:hidden;margin-top:4px;pointer-events:none;">
    <div id="umo-bar" style="height:100%;width:0%;background:#4CAF50;border-radius:3px;transition:width 0.3s;"></div>
 </div>
  <div id="umo-pct" style="font-size:11px;color:#666;pointer-events:none;"></div>
  <button id="umo-cancel" style="margin-top:8px;padding:8px 24px;background:#dc3545;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:bold;font-size:14px;pointer-events:auto;">⏹ Cancelar</button>
</div>`;
  document.body.appendChild(overlay);
  document.getElementById('umo-tab').textContent = `Aba ${tab} de ${total}`;
  document.getElementById('umo-cancel').onclick = () => {
    chrome.runtime.sendMessage({ action: 'cancel-multi' });
  };
}

function atualizarOverlayMulti(dados) {
  const tabEl = document.getElementById('umo-tab');
  const stepEl = document.getElementById('umo-step');
  const barEl = document.getElementById('umo-bar');
  const pctEl = document.getElementById('umo-pct');
  if (dados.tab !== undefined && tabEl) tabEl.textContent = `Aba ${dados.tab} de ${dados.total}`;
  if (dados.message && stepEl) stepEl.textContent = dados.message;
  if (dados.pct !== undefined && barEl) barEl.style.width = dados.pct + '%';
  if (dados.pct !== undefined && pctEl) pctEl.textContent = dados.pct + '%';
}

function removerOverlayMulti() {
  const el = document.getElementById('upseller-multi-overlay');
  if (el) {
    el.querySelector('div') && (el.querySelector('div').style.transition = 'opacity 0.4s', el.querySelector('div').style.opacity = '0');
    setTimeout(() => el.remove(), 400);
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'start-remap-full') {
    criarOverlayProgresso();
    let step = 0;
    runAutomation((p) => {
      step++;
      atualizarOverlayProgresso({ message: p.message, step, total: p.total || step });
      chrome.runtime.sendMessage({ action: 'progress', ...p });
    }).then(() => {
      removerOverlayProgresso();
      chrome.runtime.sendMessage({ action: 'completed' });
    }).catch((err) => {
      mostrarErroOverlayProgresso('Erro: ' + err.message);
      chrome.runtime.sendMessage({ action: 'error', message: err.message });
    });
    sendResponse({ status: 'started' });
    return true;
  }

  if (request.action === 'show-multi-overlay') {
    criarOverlayMulti(request.tab, request.total);
    sendResponse({ status: 'ok' });
    return true;
  }

  if (request.action === 'update-multi-overlay') {
    atualizarOverlayMulti(request);
    sendResponse({ status: 'ok' });
    return true;
  }

  if (request.action === 'hide-multi-overlay') {
    const stepEl = document.getElementById('umo-step');
    const barEl = document.getElementById('umo-bar');
    const pctEl = document.getElementById('umo-pct');
    if (stepEl) stepEl.textContent = `✓ ${request.total} produtos processados!`;
    if (barEl) barEl.style.width = '100%';
    if (pctEl) pctEl.textContent = '100%';
    setTimeout(() => removerOverlayMulti(), 300);
    sendResponse({ status: 'ok' });
    return true;
  }

  if (request.action === 'multi-cancelled') {
    const tabEl = document.getElementById('umo-tab');
    const stepEl = document.getElementById('umo-step');
    const barEl = document.getElementById('umo-bar');
    const pctEl = document.getElementById('umo-pct');
    const cancelBtn = document.getElementById('umo-cancel');
    if (tabEl) tabEl.textContent = '⏸ Cancelado';
    if (stepEl) stepEl.textContent = 'Processamento interrompido';
    if (barEl) barEl.style.background = '#dc3545';
    if (pctEl) pctEl.textContent = '—';
    if (cancelBtn) cancelBtn.style.display = 'none';
    setTimeout(() => removerOverlayMulti(), 2000);
    sendResponse({ status: 'ok' });
    return true;
  }

  if (request.action === 'abort-macro') {
    window.__upsCancelMacro = true;
    const cancelBtn = document.getElementById('umo-cancel');
    if (cancelBtn) { cancelBtn.textContent = '⏹ Cancelando...'; cancelBtn.disabled = true; cancelBtn.style.opacity = '0.6'; }
    sendResponse({ status: 'ok' });
    return true;
  }

  if (request.action === 'executar-macro-full') {
    (async () => {
      try {
        const config = request.config || {};
        let progressStep = 0;
        let totalSteps = 1;
        const macro = config.macro;
        const hasMacro = macro && (macro.sub || (macro.emMassa && (macro.emMassa.quantidade || macro.emMassa.preco || macro.emMassa.peso || macro.emMassa.pacote)) || macro.sku || macro.crop);
        const hasAtributos = config.atributosAtivo && config.atrPreset;

        // Calculate total steps (ordem: remap → sub → emMassa → preço → desc → capitalizar → atributos → sku → guia → crop)
        if (precisaRemapear()) totalSteps++;
        if (hasMacro) {
          if (macro.sub) totalSteps++;
          if (macro.emMassa && (macro.emMassa.quantidade || macro.emMassa.preco || macro.emMassa.peso || macro.emMassa.pacote)) totalSteps++;
        }
        if (config.confirmarCores && lerCoresEspecificacaoPrincipal().length > 0) totalSteps++;
        if (config.bulkPrice) totalSteps++;
        totalSteps++; // desc
        totalSteps++; // capitalizar titulo
        if (hasAtributos) totalSteps++; // atributos
        if (hasMacro && macro.sku) totalSteps++;
        totalSteps++; // guia
        if (hasMacro && macro.crop) totalSteps++; // recortar img quadrada

        function stepDone(msg) {
          progressStep++;
          chrome.runtime.sendMessage({ action: 'progress', message: msg, step: progressStep, total: totalSteps });
        }

        if (precisaRemapear()) {
          try {
            stepDone('Remapeando...');
            await runAutomation((p) => {
              chrome.runtime.sendMessage({ action: 'progress', message: 'Remapeando: ' + p.message, step: progressStep, total: totalSteps });
            });
          } catch (e) { /* silent */ }
        }
        // Confirmar Cores (antes da Subespecificação)
        if (config.confirmarCores) {
          const coresPagina = lerCoresEspecificacaoPrincipal();
          if (coresPagina.length > 0) {
            stepDone('Aguardando confirmação de cores...');
            const result = await mostrarDialogoConfirmarCores(coresPagina);
            if (result.confirmou) {
              await aplicarCoresNaPagina(result.cores);
              await sleep(500);
            }
          }
        }

        // Macros (ordem: sub → emMassa)
        if (hasMacro) {
          if (macro.sub) {
            stepDone('Aplicando Subespecificação...');
            await subespecificacaoMassa(macro.sub);
            await sleep(2000);
          }
          if (macro.emMassa && (macro.emMassa.quantidade || macro.emMassa.preco || macro.emMassa.peso || macro.emMassa.pacote)) {
            stepDone('Aplicando Editar em Massa...');
            const cols = encontrarColunasMassa();
            if (macro.emMassa.quantidade && cols.quant) await setColunaEmMassa(cols.quant, macro.emMassa.quantidade, 'input.ant-input.ant-input-sm');
            if (macro.emMassa.preco && cols.preco) await setColunaEmMassa(cols.preco, macro.emMassa.preco, 'input.ant-input-number-input');
            if (macro.emMassa.peso && cols.peso) await setColunaEmMassa(cols.peso, macro.emMassa.peso, 'input.ant-input-number-input');
            if (macro.emMassa.pacote && cols.pacote) {
              const sep = macro.emMassa.pacote.includes('x') ? 'x' : ',';
              await setColunaEmMassa(cols.pacote, macro.emMassa.pacote.split(sep).map(s => s.trim()), 'input.ant-input-number-input');
            }
          }
        }

        if (config.bulkPrice) {
          stepDone('Aplicando preços...');
          await setPrecosCompletos(config.bulkPrice, config.overrides || {});
        }

        // Descrição
        const bibData = await new Promise(resolve => chrome.storage.local.get(["biblioteca"], resolve));
        const dadosDesc = bibData.biblioteca && bibData.biblioteca[config.selectedTable];
        if (dadosDesc && dadosDesc.descricao) {
          stepDone('Preenchendo descrição...');
          const ta = document.querySelector('.ant-form-item-control textarea.ant-input');
          if (ta) {
            ta.focus();
            ta.value = dadosDesc.descricao;
            ta.dispatchEvent(new Event('input', { bubbles: true }));
            ta.dispatchEvent(new Event('change', { bubbles: true }));
            ta.blur();
          }
        }
        stepDone('Capitalizando título...');
        capitalizarTitulo();

        if (hasMacro && macro.sku) {
          stepDone('Gerando SKU...');
          gerarSkuEmMassa();
        }

        // Atributos
        if (hasAtributos) {
          expandirAtributos();
          await sleep(1200);
          const [tipo, ...nomeParts] = config.atrPreset.split(':');
          const nomePreset = nomeParts.join(':');
          const bibAtr = await new Promise(resolve => chrome.storage.local.get(["bibliotecaAtributos", "bibliotecaPrecos", "bibliotecaMacros"], resolve));
          let dados = null;
          if (tipo === 'bib') dados = (bibAtr.bibliotecaAtributos || {})[nomePreset];
          if (dados && typeof dados === 'object') {
            stepDone('Limpando atributos antigos...');
            await limparAtributosCustomizados();
            await sleep(500);
            stepDone('Aplicando atributos...');
            for (const key of Object.keys(dados)) {
              await aplicarAtributo(key, dados[key]);
              await sleep(400);
            }
          }
        }

        // Guia de Tamanhos
        const dados = bibData.biblioteca && bibData.biblioteca[config.selectedTable];
        if (dados) {
          stepDone('Preenchendo guia de tamanhos...');
          await preencherGuiaTamanhos(dados);
        }

        // Recortar Imagem Quadrada (last action — triggers dialog)
        if (hasMacro && macro.crop) {
          stepDone('Recortando imagem quadrada...');
          try {
            await recortarImagemQuadradaEmMassa();
          } catch (e) {
            chrome.runtime.sendMessage({ action: 'error', message: 'Erro no recorte: ' + e.message });
            return;
          }
        }

        chrome.runtime.sendMessage({ action: 'completed' });
      } catch (e) {
        chrome.runtime.sendMessage({ action: 'error', message: e.message });
      }
    })();
    sendResponse({ status: 'started' });
    return true;
  }

  if (request.action === 'set-precos-completos') {
    setPrecosCompletos(request.bulkPrice, request.overrides || {}).then(result => {
      sendResponse(result);
    }).catch(err => {
      sendResponse({ error: err.message });
    });
    return true;
  }

  if (request.action === 'open-precos-dialog') {
    abrirDialogPrecos();
    sendResponse({ status: 'opened' });
    return true;
  }

  if (request.action === 'open-medidas-dialog') {
    abrirDialogMedidas();
    sendResponse({ status: 'opened' });
    return true;
  }
});

// ========== IMAGEM EM MASSA - MÍDIA DO ANÚNCIO ==========
function mostrarFeedback(msg, cor) {
  const existing = document.querySelector('.ups-feedback-toast');
  if (existing) existing.remove();
  const el = document.createElement('div');
  el.className = 'ups-feedback-toast';
  el.style.cssText = 'position:fixed;top:20px;right:20px;z-index:999999;background:' + (cor || '#333') + ';color:#fff;padding:12px 20px;border-radius:6px;font-size:14px;font-family:sans-serif;box-shadow:0 2px 10px rgba(0,0,0,0.3);transition:opacity .3s';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 3000);
}

async function recortarImagemQuadradaEmMassa() {
  const nativeBtn = Array.from(document.querySelectorAll('.my_btn.ant-btn')).find(el => el.textContent.includes('Recortar em massa'));
  if (!nativeBtn) throw new Error('Botão Recortar em massa não encontrado');
  nativeBtn.click();
  let dialog = null;
  for (let i = 0; i < 20; i++) {
    dialog = document.querySelector('.ant-modal-content');
    if (dialog && dialog.textContent.includes('Recortar em massa')) break;
    await sleep(300);
  }
  if (!dialog || !dialog.textContent.includes('Recortar em massa')) throw new Error('Diálogo Recortar em massa não abriu');
  await sleep(800);
  const sections = dialog.querySelectorAll('[class*="img_list_box"]');
  let selecionadas = 0;
  for (const section of sections) {
    let imgBox = null;
    const caption = Array.from(section.querySelectorAll('*')).find(el => el.textContent.trim() === 'Imagem Quadrada');
    if (caption) {
      const container = caption.parentElement;
      if (container) imgBox = container.querySelector('.img_box');
    }
    if (!imgBox) {
      const allImgs = section.querySelectorAll('img');
      for (const img of allImgs) {
        if (img.src && img.src.includes('_square.')) {
          imgBox = img.closest('.img_box');
          if (imgBox) break;
        }
      }
    }
    if (imgBox) { imgBox.click(); selecionadas++; await sleep(100); }
  }
  if (selecionadas === 0) throw new Error('Nenhuma imagem quadrada encontrada');
  const footer = dialog.querySelector('.ant-modal-footer');
  const cortarBtn = footer
    ? Array.from(footer.querySelectorAll('button')).find(b => b.textContent.trim() === 'Cortar')
    : Array.from(dialog.querySelectorAll('button')).find(b => b.textContent.trim() === 'Cortar');
  if (!cortarBtn) throw new Error('Botão Cortar não encontrado');
  cortarBtn.click();
  for (let i = 0; i < 120; i++) {
    await sleep(1000);
    const modal = document.querySelector('.ant-modal-content');
    if (!modal) continue;
    const aplicarBtn = Array.from(modal.querySelectorAll('button')).find(b => b.textContent.trim().includes('Aplicar'));
    if (aplicarBtn) {
      await sleep(500);
      aplicarBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      aplicarBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      aplicarBtn.click();
      return;
    }
  }
  throw new Error('Timeout aguardando processamento');
}

function abrirPopupEditarMedidas(nomeExistente, bib, chavesFixas, atualizarSelectMedidas, atualizarDesc) {
  const existing = document.getElementById('ups-popup-medidas');
  if (existing) existing.remove();

  // Buscar dados mais recentes do storage
  chrome.storage.local.get(["biblioteca"], (res) => {
    const bibAtualizada = res.biblioteca || {};
    const dados = (nomeExistente && bibAtualizada[nomeExistente]) ? bibAtualizada[nomeExistente] : {};

    const div = document.createElement('div');
    div.id = 'ups-popup-medidas';
    div.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:white;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.25);z-index:9999999;width:500px;max-height:80vh;overflow-y:auto;padding:12px;font-family:sans-serif;';

    const titulo = nomeExistente ? `Editar "${nomeExistente}"` : 'Criar Nova Tabela de Medidas';

    div.innerHTML = `
<div style="font-size:14px;font-weight:bold;margin-bottom:10px;">${titulo}</div>
<label style="font-size:11px;font-weight:600;display:block;margin-bottom:4px;">Nome da Tabela</label>
<input id="ups-pm-nome" type="text" value="${nomeExistente || ''}" placeholder="Ex: PP-16" style="width:100%;padding:4px;border:1px solid #ccc;border-radius:4px;font-size:11px;box-sizing:border-box;margin-bottom:6px;" ${nomeExistente ? 'disabled' : ''}>
<label style="font-size:11px;font-weight:600;display:block;margin-bottom:4px;">Descrição</label>
<textarea id="ups-pm-desc" placeholder="Descrição do produto (opcional)..." style="width:100%;padding:4px;border:1px solid #ccc;border-radius:4px;font-size:11px;box-sizing:border-box;margin-bottom:6px;height:40px;resize:vertical;font-family:sans-serif;">${(dados.descricao || '')}</textarea>
<label style="font-size:11px;font-weight:600;display:block;margin-bottom:4px;">Tamanhos</label>
<div id="ups-pm-grid" style="margin-bottom:6px;"></div>
<div style="display:flex;gap:4px;align-items:center;margin-bottom:8px;">
<input id="ups-pm-add-tam" type="text" placeholder="Tamanho" style="width:90px;padding:3px;border:1px solid #ccc;border-radius:4px;font-size:11px;text-transform:uppercase;">
<input id="ups-pm-add-larg" type="text" placeholder="Largura" style="width:80px;padding:3px;border:1px solid #ccc;border-radius:4px;font-size:11px;">
<input id="ups-pm-add-alt" type="text" placeholder="Altura" style="width:80px;padding:3px;border:1px solid #ccc;border-radius:4px;font-size:11px;">
<button id="ups-pm-add-btn" style="padding:3px 10px;background:#4078f2;color:white;border:none;border-radius:4px;cursor:pointer;font-weight:bold;font-size:12px;">+</button>
</div>
<div style="display:flex;gap:6px;justify-content:flex-end;">
<button id="ups-pm-cancelar" style="padding:5px 14px;border:1px solid #ccc;border-radius:6px;cursor:pointer;font-size:11px;background:white;height:28px;display:flex;align-items:center;">Cancelar</button>
<button id="ups-pm-salvar" style="padding:5px 14px;background:#28a745;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:bold;font-size:11px;height:28px;display:flex;align-items:center;">Salvar</button>
${nomeExistente ? '<button id="ups-pm-excluir" style="padding:5px 14px;background:#dc3545;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:bold;font-size:11px;height:28px;display:flex;align-items:center;">Excluir Tabela</button>' : ''}
</div>`;

    document.body.appendChild(div);

    const gridDiv = document.getElementById('ups-pm-grid');
    let tabela = { ...dados };

    function renderGrid() {
      const tamanhos = Object.keys(tabela).filter(k => !chavesFixas.has(k) && tabela[k] && typeof tabela[k] === 'object' && (tabela[k].b || tabela[k].c));
      if (tamanhos.length === 0) {
        gridDiv.innerHTML = '<div style="color:#999;font-size:11px;padding:4px 0;">Nenhum tamanho adicionado.</div>';
        return;
      }
      const ordemLetras = ['PP','P','M','G','GG','EGG','G1','G2','G3','G4','G5'];
      const ordemIndex = {};
      ordemLetras.forEach((s, i) => { ordemIndex[s.toUpperCase()] = i; });
      tamanhos.sort((a, b) => {
        const aNum = /^\d+$/.test(a);
        const bNum = /^\d+$/.test(b);
        if (aNum && bNum) return parseInt(a, 10) - parseInt(b, 10);
        if (aNum) return -1;
        if (bNum) return 1;
        const ai = ordemIndex[a.toUpperCase()];
        const bi = ordemIndex[b.toUpperCase()];
        if (ai !== undefined && bi !== undefined) return ai - bi;
        if (ai !== undefined) return -1;
        if (bi !== undefined) return 1;
        return a.localeCompare(b);
      });
      gridDiv.innerHTML = `<table style="width:100%;border-collapse:collapse;font-family:sans-serif;margin-bottom:6px;">
<thead><tr style="background:#eee;"><th style="padding:1px 6px;border:1px solid #ccc;font-size:10px;text-align:left;">Tamanho</th><th style="padding:1px 6px;border:1px solid #ccc;font-size:10px;text-align:left;">Largura</th><th style="padding:1px 6px;border:1px solid #ccc;font-size:10px;text-align:left;">Altura</th><th style="padding:1px 6px;border:1px solid #ccc;font-size:10px;text-align:center;width:30px;"></th></tr></thead>
<tbody>${tamanhos.map(t => `
<tr><td style="padding:1px 6px;border:1px solid #ccc;font-size:10px;font-weight:bold;text-transform:uppercase;">${t}</td>
<td style="padding:1px 6px;border:1px solid #ccc;font-size:10px;"><input class="ups-pm-g-b" data-tam="${t}" type="text" value="${tabela[t].b || ''}" placeholder="Largura" style="width:55px;padding:1px 3px;border:1px solid #ccc;border-radius:2px;font-size:10px;box-sizing:border-box;"></td>
<td style="padding:1px 6px;border:1px solid #ccc;font-size:10px;"><input class="ups-pm-g-c" data-tam="${t}" type="text" value="${tabela[t].c || ''}" placeholder="Altura" style="width:55px;padding:1px 3px;border:1px solid #ccc;border-radius:2px;font-size:10px;box-sizing:border-box;"></td>
<td style="padding:1px;border:1px solid #ccc;text-align:center;"><button data-tam="${t}" class="ups-pm-rm" style="padding:0px 4px;border:1px solid #dc3545;color:#dc3545;border-radius:2px;cursor:pointer;font-size:10px;background:white;line-height:1.2;">×</button></td></tr>`).join('')}
</tbody></table>`;

      gridDiv.querySelectorAll('.ups-pm-rm').forEach(btn => {
        btn.onclick = function() {
          const tam = this.getAttribute('data-tam');
          delete tabela[tam];
          renderGrid();
        };
      });
    }

    renderGrid();

    document.getElementById('ups-pm-add-tam').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('ups-pm-add-btn').click();
    });

    document.getElementById('ups-pm-add-btn').onclick = function() {
      const tam = document.getElementById('ups-pm-add-tam').value.trim().toUpperCase();
      const larg = document.getElementById('ups-pm-add-larg').value.trim();
      const alt = document.getElementById('ups-pm-add-alt').value.trim();
      if (!tam) return;
      tabela[tam] = { b: larg || '', c: alt || '' };
      renderGrid();
      document.getElementById('ups-pm-add-tam').value = '';
      document.getElementById('ups-pm-add-larg').value = '';
      document.getElementById('ups-pm-add-alt').value = '';
      document.getElementById('ups-pm-add-tam').focus();
    };

    document.getElementById('ups-pm-cancelar').onclick = () => div.remove();

    document.getElementById('ups-pm-salvar').onclick = function() {
      const nome = document.getElementById('ups-pm-nome').value.trim();
      if (!nome) { mostrarFeedback('Dê um nome para a tabela!', '#dc3545'); return; }
      if (!nome.match(/^[a-zA-Z0-9\s\-_À-ÿ]+$/)) { mostrarFeedback('Nome inválido', '#dc3545'); return; }
      const desc = document.getElementById('ups-pm-desc').value.trim();

      // Coletar valores do grid
      const novaTabela = { descricao: desc };
      document.querySelectorAll('.ups-pm-g-b').forEach(inp => {
        const tam = inp.getAttribute('data-tam');
        const b = inp.value;
        const c = document.querySelector(`.ups-pm-g-c[data-tam="${tam}"]`).value;
        novaTabela[tam] = { b: b || '', c: c || '' };
      });

      // Preservar macros e preços se existirem
      if (nomeExistente && dados.macros) novaTabela.macros = dados.macros;
      if (nomeExistente && dados.precos) novaTabela.precos = dados.precos;

      chrome.storage.local.get(["biblioteca"], (r) => {
        const b = r.biblioteca || {};
        b[nome] = novaTabela;
        chrome.storage.local.set({ biblioteca: b, ultimaSelecionada: nome }, () => {
          bib[nome] = novaTabela;
          if (nomeExistente && nomeExistente !== nome && bib[nomeExistente]) {
            delete bib[nomeExistente];
          }
          atualizarSelectMedidas(nome);
          atualizarDesc(nome);
          div.remove();
          mostrarFeedback('Tabela "' + nome + '" salva!', '#28a745');
        });
      });
    };

    if (nomeExistente) {
      document.getElementById('ups-pm-excluir').onclick = function() {
        const confDiv = document.createElement('div');
        confDiv.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.3);z-index:9999998;display:flex;align-items:center;justify-content:center;';
        confDiv.innerHTML = '<div style="background:white;border-radius:12px;padding:24px;width:300px;box-shadow:0 8px 32px rgba(0,0,0,0.25);text-align:center;font-family:sans-serif;">' +
          '<div style="font-size:15px;font-weight:bold;margin-bottom:12px;">Excluir "' + nomeExistente + '"?</div>' +
          '<div style="display:flex;gap:8px;justify-content:center;">' +
          '<button id="ups-pm-conf-cancelar" style="padding:7px 20px;border:1px solid #ccc;border-radius:6px;cursor:pointer;font-size:13px;background:white;">Cancelar</button>' +
          '<button id="ups-pm-conf-excluir" style="padding:7px 20px;background:#dc3545;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:bold;font-size:13px;">Excluir</button>' +
          '</div></div>';
        document.body.appendChild(confDiv);
        document.getElementById('ups-pm-conf-cancelar').onclick = () => confDiv.remove();
        document.getElementById('ups-pm-conf-excluir').onclick = () => {
          confDiv.remove();
          chrome.storage.local.get(["biblioteca"], (r) => {
            const b = r.biblioteca || {};
            if (b[nomeExistente]) {
              delete b[nomeExistente];
              chrome.storage.local.set({ biblioteca: b }, () => {
                if (bib[nomeExistente]) delete bib[nomeExistente];
                atualizarSelectMedidas('');
                atualizarDesc('');
                div.remove();
                mostrarFeedback('Tabela "' + nomeExistente + '" excluída!', '#28a745');
              });
            }
          });
        };
      };
    }
  });
}

function upsDialog(opts) {
  const existing = document.getElementById('ups-dialog-overlay');
  if (existing) existing.remove();
  const resolve = new Promise((res) => {
    const overlay = document.createElement('div');
    overlay.id = 'ups-dialog-overlay';
    overlay.innerHTML = `
<div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.4);z-index:9999999;display:flex;align-items:center;justify-content:center;">
<div style="background:#fff;border-radius:10px;padding:24px;width:400px;max-width:90vw;box-shadow:0 8px 32px rgba(0,0,0,0.25);font-family:sans-serif;text-align:center;">
<div style="font-size:16px;font-weight:600;color:#333;margin-bottom:12px;">${opts.title || ''}</div>
<div style="font-size:14px;color:#555;margin-bottom:16px;line-height:1.5;">${opts.message}</div>
${opts.input ? '<input id="ups-dialog-input" type="text" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;font-size:14px;box-sizing:border-box;margin-bottom:12px;text-transform:uppercase;" placeholder="' + (opts.placeholder || '') + '" value="' + (opts.value || '').toUpperCase() + '" data-bwignore="" data-1p-ignore="" autocomplete="off" oninput="this.value = this.value.toUpperCase()">' : ''}
<div style="display:flex;gap:8px;justify-content:center;">
${opts.cancel ? '<button id="ups-dialog-cancel" style="padding:8px 20px;border:1px solid #ccc;border-radius:6px;cursor:pointer;font-size:13px;background:#fff;color:#555;">Cancelar</button>' : ''}
<button id="ups-dialog-ok" style="padding:8px 20px;border:none;border-radius:6px;cursor:pointer;font-size:13px;background:#4078f2;color:#fff;font-weight:600;">${opts.okText || 'OK'}</button>
</div>
${opts.recentLinks && opts.recentLinks.length ? '<div style="margin-top:14px;padding-top:12px;border-top:1px solid #eee;"><div style="font-size:11px;color:#999;margin-bottom:6px;">Últimos adicionados</div><div id="ups-dialog-recents" style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap;">' + opts.recentLinks.map((item, i) => '<div style="position:relative;width:54px;height:72px;"><img src="' + item.url.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;') + '" data-index="' + i + '" style="width:54px;height:72px;object-fit:cover;border-radius:4px;cursor:pointer;display:block;" onerror="this.parentElement.style.display=\'none\'"><button data-index="' + i + '" style="position:absolute;top:0;right:0;width:16px;height:16px;border:none;background:rgba(0,0,0,0.4);color:#fff;font-size:11px;line-height:16px;text-align:center;cursor:pointer;padding:0;border-radius:0 4px 0 4px;">×</button></div>').join('') + '</div></div>' : ''}
</div>
</div>`;
    document.body.appendChild(overlay);
    document.getElementById('ups-dialog-ok').onclick = () => {
      const val = opts.input ? document.getElementById('ups-dialog-input').value : true;
      overlay.remove();
      res(val);
    };
    const cancelBtn = document.getElementById('ups-dialog-cancel');
    if (cancelBtn) cancelBtn.onclick = () => { overlay.remove(); res(null); };
    overlay.addEventListener('click', (e) => { if (e.target === overlay) { overlay.remove(); res(null); } });
    document.getElementById('ups-dialog-recents')?.querySelectorAll('img').forEach((img) => {
      img.onclick = () => {
        const input = document.getElementById('ups-dialog-input');
        if (input) input.value = opts.recentLinks[parseInt(img.dataset.index)].url;
      };
    });
    document.getElementById('ups-dialog-recents')?.querySelectorAll('button').forEach((btn) => {
      btn.onclick = () => {
        const idx = parseInt(btn.dataset.index);
        chrome.storage.local.get(['ultimosLinks'], (v) => {
          let links = v.ultimosLinks || [];
          links.splice(idx, 1);
          chrome.storage.local.set({ ultimosLinks: links });
        });
        btn.parentElement.remove();
      };
    });
  });
  return resolve;
}

function capitalizarTitulo() {
  const btn = document.querySelector('.icon_capital');
  if (btn) btn.click();
}

function injetarBotaoImagemMassa() {
  if (document.getElementById('ups-img-massa-btn')) return;

  const recortarSpan = Array.from(document.querySelectorAll('span')).find(s => s.textContent.trim() === 'Recortar em massa');
  if (!recortarSpan) { setTimeout(injetarBotaoImagemMassa, 2000); return; }

  // Create our element OUTSIDE the toolbar to avoid event delegation issues
  const el = document.createElement('div');
  el.id = 'ups-img-massa-btn';
  el.style.cssText = 'position:relative;display:inline-flex;align-items:center;gap:4px;margin-right:8px;font-size:13px;font-family:sans-serif;user-select:none;';

  const label = document.createElement('span');
  label.style.cssText = 'cursor:default;padding:4px 8px;background:#eaf7ff;border:1px solid #91d5ff;border-radius:4px;color:#1890ff;';
  label.textContent = '📷 Imagem em Massa ▼';

  el.appendChild(label);

  // Insert BEFORE the recortar button
  const recortarBtn = recortarSpan.closest('.my_btn');
  recortarBtn.parentElement.insertBefore(el, recortarBtn);

  // Prevent click from propagating to parent (which opens Recortar em massa dialog)
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
  });

  // Hidden file input
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.style.display = 'none';
  document.body.appendChild(fileInput);

  // Dropdown menu
  const menu = document.createElement('div');
  menu.id = 'ups-img-massa-dropdown';
  menu.style.cssText = 'display:none;position:fixed;z-index:999999;background:#fff;border:1px solid #d9d9d9;border-radius:4px;box-shadow:0 2px 8px rgba(0,0,0,0.15);min-width:190px;font-family:sans-serif;font-size:13px;';
  menu.addEventListener('click', (e) => e.stopPropagation());
  menu.addEventListener('mouseenter', () => { menu._hover = true; });
  menu.addEventListener('mouseleave', () => { menu._hover = false; fecharDropdown(); });

  const op1 = document.createElement('div');
  op1.style.cssText = 'padding:8px 12px;cursor:pointer;display:flex;align-items:center;gap:6px;';
  op1.innerHTML = '<span>📁</span> Do Meu Computador';
  op1.addEventListener('mouseenter', () => op1.style.background = '#f5f5f5');
  op1.addEventListener('mouseleave', () => op1.style.background = '');
  op1.addEventListener('click', (e) => { e.stopPropagation(); fecharDropdown(); fileInput.click(); });

  const op2 = document.createElement('div');
  op2.style.cssText = 'padding:8px 12px;cursor:pointer;display:flex;align-items:center;gap:6px;';
  op2.innerHTML = '<span>🔗</span> Link da Tabela';
  op2.addEventListener('mouseenter', () => op2.style.background = '#f5f5f5');
  op2.addEventListener('mouseleave', () => op2.style.background = '');
  op2.addEventListener('click', (e) => { e.stopPropagation(); fecharDropdown(); perguntarLinkTabela(); });

  const op3 = document.createElement('div');
  op3.style.cssText = 'padding:8px 12px;cursor:pointer;display:flex;align-items:center;gap:6px;';
  op3.innerHTML = '<span>🖼</span> Recortar Img Quadrada';
  op3.addEventListener('mouseenter', () => op3.style.background = '#f5f5f5');
  op3.addEventListener('mouseleave', () => op3.style.background = '');
  op3.addEventListener('click', async (e) => { e.stopPropagation(); fecharDropdown(); try { await recortarImagemQuadradaEmMassa(); mostrarFeedback('Imagens recortadas com sucesso!', '#28a745'); } catch(err) { mostrarFeedback('Erro: ' + err.message, '#dc3545'); } });

  menu.appendChild(op1);
  menu.appendChild(op2);
  menu.appendChild(op3);
  document.body.appendChild(menu);

  function abrirDropdown() {
    const rect = el.getBoundingClientRect();
    menu.style.display = 'block';
    menu.style.left = rect.left + 'px';
    menu.style.top = rect.bottom + 'px';
    menu._hover = false;
  }

  function fecharDropdown() {
    menu.style.display = 'none';
  }

  // Hover-based: show on mouseenter, hide on mouseleave (with delay for menu interaction)
  let hideTimer = null;
  el.addEventListener('mouseenter', () => {
    if (hideTimer) clearTimeout(hideTimer);
    abrirDropdown();
  });
  el.addEventListener('mouseleave', () => {
    hideTimer = setTimeout(() => {
      if (!menu._hover) fecharDropdown();
    }, 200);
  });

  fileInput.addEventListener('change', async () => {
    if (!fileInput.files || !fileInput.files[0]) return;
    const file = fileInput.files[0];
    fileInput.value = '';
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      mostrarFeedback('Arquivo muito grande (máx 5MB)', '#c0392b');
      return;
    }
    
    try {
      mostrarFeedback('Processando imagem...', '#2980b9');
      // Instead of data URL, pass file directly via background
      const reader = new FileReader();
      reader.onload = function(e) {
        const dataUrl = e.target.result;
        // Check if message is too large (1MB limit)
        if (dataUrl.length > 900000) {
          mostrarFeedback('Imagem muito grande para enviar. Tente uma menor.', '#c0392b');
          return;
        }
        uploadImagemViaBackground(dataUrl, file.name, 'file');
      };
      reader.readAsDataURL(file);
    } catch (e) {
      mostrarFeedback('Erro ao processar arquivo: ' + e.message, '#c0392b');
    }
  });

  // We'll do everything from the content script directly

  async function perguntarLinkTabela() {
    let links = [];
    try { links = await new Promise(r => chrome.storage.local.get(['ultimosLinks'], (v) => r(v.ultimosLinks || []))); } catch(e) {}
    links = links.map(item => typeof item === 'string' ? { type: 'url', url: item } : item).filter(item => item && item.url);
    const url = await upsDialog({ title: '🔗 Link da Tabela', message: 'Cole o link da imagem:', input: true, placeholder: 'https://...', okText: 'Enviar', cancel: true, recentLinks: links });
    if (!url || !url.trim()) return;
    try {
      mostrarFeedback('Baixando imagem do link...', '#2980b9');
      const response = await fetch(url);
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const blob = await response.blob();
      const ext = (blob.type.split('/')[1] || 'jpg').replace(/[^a-z0-9]/gi, '');
      const file = new File([blob], 'imagem.' + ext, { type: blob.type });
      
      const reader = new FileReader();
      reader.onload = function(e) {
        uploadImagemViaBackground(e.target.result, file.name, 'link');
      };
      reader.readAsDataURL(file);

      salvarLinkRecente(url);
    } catch (e) {
      mostrarFeedback('Erro ao baixar imagem: ' + e.message, '#c0392b');
    }
  }
}

function salvarLinkRecente(url) {
  if (!url) return;
  chrome.storage.local.get(['ultimosLinks'], (v) => {
    let links = v.ultimosLinks || [];
    links = links.map(item => typeof item === 'string' ? { type: 'url', url: item } : item).filter(item => item && item.url);
    if (links.some(item => item.url === url)) return;
    links.push({ type: 'url', url });
    if (links.length > 5) links.splice(0, links.length - 5);
    chrome.storage.local.set({ ultimosLinks: links });
  });
}

document.body.addEventListener('ups-upload-done', (e) => {
  if (e.detail.source === 'link') return;
  salvarLinkRecente(e.detail.url);
});

function uploadImagemViaBackground(dataUrl, fileName, source) {
  chrome.runtime.sendMessage({
    action: 'ups-mass-upload',
    dataUrl: dataUrl,
    fileName: fileName,
    source: source || 'file'
  });
}

function injetarBotaoSkuNoAnuncio() {
  if (document.getElementById('ups-gerar-sku-btn')) return;
  const inp = Array.from(document.querySelectorAll('input.ant-input')).find(i => {
    const formItem = i.closest('.ant-form-item');
    return formItem && formItem.textContent.includes('Anúncio');
  });
  if (!inp) { setTimeout(injetarBotaoSkuNoAnuncio, 2000); return; }
  const container = inp.parentElement;
  if (container.style.position !== 'relative') container.style.position = 'relative';
  inp.style.paddingLeft = '36px';
  const btn = document.createElement('span');
  btn.id = 'ups-gerar-sku-btn';
  btn.textContent = '⚡';
  btn.title = 'Gerar SKU';
  btn.style.cssText = 'cursor:pointer;font-size:14px;position:absolute;left:6px;top:50%;transform:translateY(-50%);user-select:none;line-height:1;z-index:1;border:1px solid #bbb;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;background:#f5f5f5;';
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    gerarSkuEmMassa();
  });
  inp.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      gerarSkuEmMassa();
    }
  });
  container.appendChild(btn);
}

function injetarBotaoOverlay() {
  if (document.getElementById('ups-floating-btn')) return;
  const cardHead = document.querySelector('#basic .ant-card-head');
  if (!cardHead) return;
  const btn = document.createElement('div');
  btn.id = 'ups-floating-btn';
  btn.style.cssText = 'position:fixed;z-index:999999999;cursor:pointer;width:40px;height:40px;border-radius:50%;background:#4078f2;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.3);';
  btn.innerHTML = `<div style="width:100%;height:100%;border-radius:50%;background:url('https://img.magnific.com/vetores-premium/robo-bonito-dos-desenhos-animados-vector-icon-ilustracao-conceito-superior-do-icone-do-robo-de-techology-isolado-vetor-superior-estilo-cartoon-plana_138676-1474.jpg?w=1060') center center/cover no-repeat;"></div>`;
  btn.title = 'Automatiza Shein - UpSeller';
  btn.addEventListener('click', abrirDialogMedidas);
  function posicionarTop() {
    const r = cardHead.getBoundingClientRect();
    btn.style.top = (r.top + 208) + 'px';
  }
  function posicionarRight() {
    const ref = document.querySelector('.edit_back_top_inner');
    if (ref) {
      const cssRight = parseFloat(window.getComputedStyle(ref).right);
      btn.style.right = (cssRight - 4) + 'px';
    } else {
      btn.style.right = '124px';
    }
  }
  function posicionarCompleto() { posicionarTop(); posicionarRight(); }
  posicionarCompleto();
  window.addEventListener('resize', posicionarRight);
  let ultimaDPR = window.devicePixelRatio;
  setInterval(() => {
    if (window.devicePixelRatio !== ultimaDPR) {
      ultimaDPR = window.devicePixelRatio;
      posicionarCompleto();
    }
  }, 1000);
  document.body.appendChild(btn);
}

// Inject buttons on page load
setTimeout(() => { injetarBotaoImagemMassa(); injetarBotaoOverlay(); injetarBotaoSkuNoAnuncio(); }, 3000);

// Watch for dynamic tab navigation (Mídia section loaded later)
const observer = new MutationObserver(() => {
  if (!document.getElementById('ups-img-massa-btn')) {
    setTimeout(injetarBotaoImagemMassa, 500);
  }
  if (!document.getElementById('ups-floating-btn')) {
    setTimeout(injetarBotaoOverlay, 500);
  }
  if (!document.getElementById('ups-gerar-sku-btn')) {
    setTimeout(injetarBotaoSkuNoAnuncio, 500);
  }
});
observer.observe(document.body, { childList: true, subtree: true });
