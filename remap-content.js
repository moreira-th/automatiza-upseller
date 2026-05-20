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

async function stepConfirmar() {
  const btn = findButtonByText('Confirmar');
  if (!btn) throw new Error('Botão Confirmar não encontrado');
  nativeClick(btn);
  await sleep(500);
}

async function stepMapearVariantes() {
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

  if (variantRows.length === 0) throw new Error('Nenhuma variante encontrada para mapear');

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
            if (!visibleDropdown) break;

            const items = visibleDropdown.querySelectorAll('li');
            let found = false;

            // Try to find matching value in dropdown
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
                  found = true;
                  break;
                }
              }
            }

            if (found) { mapped = true; await sleep(500); break; }
          }
        }
        if (mapped) break;
      }
      if (!mapped) await sleep(500);
    }

    if (!mapped) throw new Error(`Erro ao mapear "${name}"`);
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
  await sleep(1500);
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

async function runAutomation(sendProgress) {
  const steps = [
    { name: 'Abrir remapeamento de variantes', fn: stepAbrirRemapeamento },
    { name: 'Confirmar tipo (Passo 1)', fn: stepConfirmar },
    { name: 'Mapear cores e tamanhos', fn: stepMapearVariantes },
    { name: 'Salvar remapeamento', fn: stepSalvar },
    { name: 'Confirmar OK', fn: stepOK },
    { name: 'Fechar diálogo de sucesso', fn: stepFechar },
  ];
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
  if (!editLink) return alert('Link "Editar Guia de Tamanhos" não encontrado');
  editLink.click();

  let dialog = null;
  for (let i = 0; i < 20; i++) {
    dialog = document.querySelector('.ant-modal-content');
    if (dialog && dialog.textContent.includes('Editar Guia de Tamanhos')) break;
    await sleep(1000);
  }
  if (!dialog || !dialog.textContent.includes('Editar Guia de Tamanhos')) {
    return alert('Diálogo "Editar Guia de Tamanhos" não abriu');
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
  if (linhas.length === 0) return;

  const injetar = (input, val) => {
    if (input && val !== undefined && val !== '') {
      input.focus();
      input.value = val;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.blur();
    }
  };

  linhas.forEach(linha => {
    const celulaTamanho = linha.querySelector('.vxe-body--column:first-child .vxe-cell');
    if (!celulaTamanho) return;
    let tam = celulaTamanho.innerText.trim().toUpperCase().replace('Y', '').trim();
    if (dados[tam]) {
      const inputs = linha.querySelectorAll('input.ant-input-number-input');
      if (inputs.length >= 2) {
        injetar(inputs[0], dados[tam].b);
        injetar(inputs[1], dados[tam].c);
      }
    }
  });

  const saveBtn = dialog.querySelector('.ant-btn-primary');
  if (saveBtn) saveBtn.click();
}

function precisaRemapear() {
  const forms = document.querySelectorAll('.ant-form-item');
  for (const section of forms) {
    const label = section.querySelector('.ant-form-item-label');
    if (!label) continue;
    const text = label.textContent.trim();
    if (text.includes('Especificação Principal') || text.includes('Subespecificação')) {
      const checked = section.querySelectorAll('.ant-checkbox-checked').length;
      if (checked === 0) return true;
    }
  }
  return false;
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

  const listaTamanhos = ["PP","P","M","G","GG","G1","G2","G3","G4","G5","2","4","6","8","10","12","14","16"];

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
    for (let pos = 80; pos < maxScroll; pos += 80) {
      bodyWrapper.scrollTop = pos;
      await sleep(200);
      total += setRows();
    }
    bodyWrapper.scrollTop = maxScroll;
    await sleep(200);
    total += setRows();
    bodyWrapper.scrollTop = 0;
    await sleep(200);
    total += setRows();
  }
  return { success: true, total };
}

// ========== DIÁLOGO DE PREÇOS (in-page) ==========
function abrirDialogPrecos() {
  const existing = document.getElementById('upseller-precos-overlay');
  if (existing) existing.remove();

  const tamanhos = ["PP","P","M","G","GG","G1","G2","G3","G4","G5","2","4","6","8","10","12","14","16"];
  const overrides = {};

  const overlay = document.createElement('div');
  overlay.id = 'upseller-precos-overlay';
  overlay.innerHTML = `
<div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.45);z-index:999999;display:flex;align-items:center;justify-content:center;">
<div style="background:white;border-radius:8px;padding:24px;width:420px;max-width:95vw;box-shadow:0 8px 32px rgba(0,0,0,0.25);font-family:sans-serif;">
<div style="font-size:18px;font-weight:bold;margin-bottom:12px;">💰 Preço Especial</div>

<label style="font-size:12px;font-weight:600;display:block;margin-bottom:3px;">Carregar Salvo</label>
<select id="ups-ps" style="width:100%;padding:6px;border:1px solid #ccc;border-radius:4px;font-size:13px;margin-bottom:10px;box-sizing:border-box;"><option value="">Selecionar...</option></select>

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

<div style="display:flex;gap:8px;justify-content:flex-end;border-top:1px solid #eee;padding-top:12px;">
<button id="ups-pc" style="padding:8px 20px;border:1px solid #ccc;border-radius:4px;cursor:pointer;font-size:13px;background:white;">Cancelar</button>
<button id="ups-pk" style="padding:8px 20px;background:#28a745;color:white;border:none;border-radius:4px;cursor:pointer;font-weight:bold;font-size:13px;">APLICAR TUDO</button>
</div>
</div>
</div>`;
  document.body.appendChild(overlay);

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

  chrome.storage.local.get(["ultimosPrecos"], (res) => {
    const saved = res.ultimosPrecos;
    if (saved) {
      if (saved.bulkPrice) document.getElementById('ups-pb').value = saved.bulkPrice;
      if (saved.overrides) {
        Object.keys(saved.overrides).forEach(k => { overrides[k] = saved.overrides[k]; });
        renderOverridesLocal();
      }
    }
  });

  preencherSelectSalvos();

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

  document.getElementById('ups-pk').onclick = async () => {
    const bulkPrice = document.getElementById('ups-pb').value.trim();
    if (!bulkPrice) { alert('Informe o preço em massa'); return; }
    const result = await setPrecosCompletos(bulkPrice, overrides);
    if (result.error) { alert(result.error); return; }
    chrome.storage.local.set({ ultimosPrecos: { bulkPrice, overrides: { ...overrides } } });
    overlay.remove();
  };
}

// ========== DIÁLOGO DE MEDIDAS (in-page) ==========
function abrirDialogMedidas() {
  const existing = document.getElementById('upseller-medidas-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'upseller-medidas-overlay';
  overlay.innerHTML = `
<div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.45);z-index:999999;display:flex;align-items:center;justify-content:center;">
<div style="background:white;border-radius:8px;padding:20px;width:90vw;min-width:580px;max-width:700px;box-shadow:0 8px 32px rgba(0,0,0,0.25);font-family:sans-serif;">
<div style="font-size:18px;font-weight:bold;margin-bottom:12px;">📏 Preencher Medidas</div>
<div style="display:flex;gap:16px;">
<div style="flex:1;">
<div id="ups-mm-body"></div>
</div>
<div style="width:260px;flex-shrink:0;">
<div style="background:#e8f5e9;border:1px solid #c8e6c9;border-radius:6px;padding:10px 12px;">
<div style="font-size:14px;font-weight:600;margin-bottom:6px;">💰 Preço</div>
<label style="display:flex;align-items:center;gap:5px;margin-bottom:4px;font-size:12px;cursor:pointer;">
<input type="radio" name="ups-mp-mode" value="none" checked style="width:14px;height:14px;cursor:pointer;flex-shrink:0;"> Apenas medidas
</label>
<label style="display:flex;align-items:center;gap:5px;margin-bottom:4px;font-size:12px;cursor:pointer;" id="ups-mp-opt-tabela">
<input type="radio" name="ups-mp-mode" value="tabela" style="width:14px;height:14px;cursor:pointer;flex-shrink:0;">
<span id="ups-mp-label-tabela">Tabela</span>
</label>
<label style="display:flex;align-items:center;gap:5px;margin-bottom:4px;font-size:12px;cursor:pointer;" id="ups-mp-opt-ultimo">
<input type="radio" name="ups-mp-mode" value="ultimo" style="width:14px;height:14px;cursor:pointer;flex-shrink:0;">
<span id="ups-mp-label-ultimo">Último</span>
</label>
<label style="display:flex;align-items:center;gap:5px;margin-bottom:2px;font-size:12px;cursor:pointer;">
<input type="radio" name="ups-mp-mode" value="novo" style="width:14px;height:14px;cursor:pointer;flex-shrink:0;"> Definir novo
</label>
<select id="ups-mp-carregar" style="width:100%;padding:4px;border:1px solid #ccc;border-radius:4px;font-size:11px;box-sizing:border-box;margin-top:6px;"><option value="">Carregar Salvo...</option></select>
<div style="display:flex;gap:3px;margin-top:4px;">
<input id="ups-mp-nome-salvar" type="text" placeholder="Nome" style="flex:1;padding:4px;border:1px solid #ccc;border-radius:4px;font-size:11px;">
<button id="ups-mp-salvar" style="padding:3px 8px;background:#4078f2;color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px;">💾</button>
</div>
<button id="ups-mp-excluir" style="display:none;width:100%;margin-top:4px;padding:3px;border:1px solid #dc3545;color:#dc3545;border-radius:4px;cursor:pointer;font-size:11px;background:white;">× Excluir</button>
<div id="ups-mp-novo" style="display:none;margin-top:6px;padding-top:6px;border-top:1px solid #c8e6c9;">
<input id="ups-mp-nb" type="text" placeholder="Preço massa R$" style="width:100%;padding:5px;border:1px solid #ccc;border-radius:4px;font-size:12px;box-sizing:border-box;margin-bottom:4px;">
<div style="display:flex;gap:3px;margin-bottom:4px;">
<select id="ups-mp-nt" style="flex:1;padding:4px;border:1px solid #ccc;border-radius:4px;font-size:11px;"><option value="">Tam</option></select>
<input id="ups-mp-nv" type="text" placeholder="R$" style="width:50px;padding:4px;border:1px solid #ccc;border-radius:4px;font-size:11px;">
<button id="ups-mp-na" style="padding:3px 8px;background:#4078f2;color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px;">+</button>
</div>
<div id="ups-mp-no" style="font-size:11px;min-height:14px;color:#666;"></div>
</div>
</div>
<div style="margin-top:10px;padding-top:8px;border-top:1px solid #c8e6c9;">
<div style="font-size:13px;font-weight:600;margin-bottom:4px;">🔄 Remapeamento Multi-Aba</div>
<label id="ups-multi-label" style="display:flex;align-items:center;gap:5px;color:#aaa;cursor:default;user-select:none;font-size:12px;">
<input type="checkbox" id="ups-multi-chk" disabled style="cursor:default;">
<span id="ups-multi-txt">Executar em todas as abas abertas</span>
</label>
</div>
</div>
</div>
<div style="display:flex;gap:8px;justify-content:flex-end;border-top:1px solid #eee;padding-top:10px;margin-top:6px;">
<button id="ups-mc" style="padding:7px 16px;border:1px solid #ccc;border-radius:4px;cursor:pointer;font-size:13px;background:white;">Cancelar</button>
<button id="ups-mk" style="padding:7px 16px;background:#28a745;color:white;border:none;border-radius:4px;cursor:pointer;font-weight:bold;font-size:13px;">EXECUTAR</button>
</div>
</div>
</div>`;
  document.body.appendChild(overlay);

  const body = document.getElementById('ups-mm-body');
  let selectedTable = '';
  let precoTabela = null;
  let precoUltimo = null;
  const listaTam = ["PP","P","M","G","GG","G1","G2","G3","G4","G5","2","4","6","8","10","12","14","16"];

  // --- Novo preço: overrides locais ---
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

  // --- Carregar/Salvar presets de preço ---
  function preencherSelectSalvosMedidas() {
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
      if (valAtual && [...select.options].some(o => o.value === valAtual)) select.value = valAtual;
    });
  }

  function carregarPresetNoNovo(tipo, nome) {
    if (!tipo || !nome) return;
    chrome.storage.local.get(["biblioteca", "bibliotecaPrecos"], (res) => {
      let dados = null;
      if (tipo === 'bib') {
        dados = (res.biblioteca || {})[nome]?.precos;
      } else {
        dados = (res.bibliotecaPrecos || {})[nome];
      }
      if (!dados) return;
      document.getElementById('ups-mp-nb').value = dados.bulkPrice;
      const overrides = {};
      if (dados.overrides) Object.keys(dados.overrides).forEach(k => { overrides[k] = dados.overrides[k]; });
      window.__upsNovoPrecoOverrides = overrides;
      renderOverridesNovo(overrides);
      document.getElementById('ups-mp-nome-salvar').value = nome;
      document.getElementById('ups-mp-excluir').style.display = 'block';
      document.querySelector('input[name="ups-mp-mode"][value="novo"]').checked = true;
      document.getElementById('ups-mp-novo').style.display = 'block';
    });
  }

  function salvarPresetMedidas() {
    const nome = document.getElementById('ups-mp-nome-salvar').value.trim();
    const bulkPrice = document.getElementById('ups-mp-nb').value.trim();
    if (!nome) return alert('Dê um nome para salvar');
    if (!bulkPrice) return alert('Informe o preço em massa primeiro');
    const dados = { bulkPrice, overrides: { ...(window.__upsNovoPrecoOverrides || {}) } };
    chrome.storage.local.get(["biblioteca", "bibliotecaPrecos"], (res) => {
      const bib = res.biblioteca || {};
      const bibPrecos = res.bibliotecaPrecos || {};
      if (bib[nome]) {
        bib[nome].precos = dados;
        chrome.storage.local.set({ biblioteca: bib }, () => {
          preencherSelectSalvosMedidas();
          document.getElementById('ups-mp-excluir').style.display = 'block';
          alert('Preço salvo em "' + nome + '" (vinculado à tabela)');
        });
      } else {
        bibPrecos[nome] = dados;
        chrome.storage.local.set({ bibliotecaPrecos: bibPrecos }, () => {
          preencherSelectSalvosMedidas();
          document.getElementById('ups-mp-excluir').style.display = 'block';
          alert('Preço salvo como "' + nome + '" (avulso)');
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
    if (!confirm('Excluir "' + nome + '"?')) return;
    chrome.storage.local.get(["biblioteca", "bibliotecaPrecos"], (res) => {
      if (tipo === 'bib') {
        const bib = res.biblioteca || {};
        if (bib[nome]) delete bib[nome].precos;
        chrome.storage.local.set({ biblioteca: bib }, () => {
          preencherSelectSalvosMedidas();
          document.getElementById('ups-mp-excluir').style.display = 'none';
        });
      } else {
        const bibPrecos = res.bibliotecaPrecos || {};
        delete bibPrecos[nome];
        chrome.storage.local.set({ bibliotecaPrecos: bibPrecos }, () => {
          preencherSelectSalvosMedidas();
          document.getElementById('ups-mp-excluir').style.display = 'none';
        });
      }
    });
  }

  document.getElementById('ups-mp-carregar').onchange = (e) => {
    const val = e.target.value;
    if (!val) return;
    const [tipo, ...nomeParts] = val.split(':');
    carregarPresetNoNovo(tipo, nomeParts.join(':'));
  };

  document.getElementById('ups-mp-salvar').onclick = salvarPresetMedidas;
  document.getElementById('ups-mp-excluir').onclick = deletarPresetMedidas;

  // Toggle novo preço editor
  document.querySelectorAll('input[name="ups-mp-mode"]').forEach(r => {
    r.addEventListener('change', () => {
      document.getElementById('ups-mp-novo').style.display = r.value === 'novo' ? 'block' : 'none';
    });
  });

  // Dupla confirmação para multi-aba
  let multiConfirmTimer = null;
  const multiChk = document.getElementById('ups-multi-chk');
  const multiLabel = document.getElementById('ups-multi-label');
  const multiTxt = document.getElementById('ups-multi-txt');
  multiLabel.onclick = (e) => {
    if (e.target.tagName === 'INPUT') return;
    e.preventDefault();
    if (multiChk.checked) return;
    if (multiConfirmTimer) {
      clearTimeout(multiConfirmTimer);
      multiConfirmTimer = null;
      multiChk.checked = true;
      multiChk.disabled = false;
      multiLabel.style.color = '#28a745';
      multiLabel.style.cursor = 'pointer';
      multiTxt.textContent = 'Executar em todas as abas abertas';
      return;
    }
    multiTxt.textContent = '⚠ Cuidado!!! Clique para confirmar';
    multiLabel.style.color = '#e67e22';
    multiConfirmTimer = setTimeout(() => {
      multiConfirmTimer = null;
      multiTxt.textContent = 'Executar em todas as abas abertas';
      multiLabel.style.color = '#aaa';
    }, 3000);
  };
  multiChk.addEventListener('change', () => {
    if (!multiChk.checked) {
      multiChk.disabled = true;
      multiLabel.style.color = '#aaa';
      multiLabel.style.cursor = 'default';
      multiTxt.textContent = 'Executar em todas as abas abertas';
      if (multiConfirmTimer) { clearTimeout(multiConfirmTimer); multiConfirmTimer = null; }
    }
  });

  chrome.storage.local.get(["biblioteca", "ultimaSelecionada", "bibliotecaPrecos", "ultimosPrecos"], (res) => {
    const bib = res.biblioteca || {};
    const nomes = Object.keys(bib);
    const ativa = res.ultimaSelecionada || '';
    const ultimos = res.ultimosPrecos;

    if (nomes.length === 0) {
      body.innerHTML = '<div style="color:#999;padding:16px;text-align:center;">Nenhuma tabela salva. Crie uma na aba Medidas primeiro.</div>';
      document.getElementById('ups-mk').style.display = 'none';
      return;
    }

    selectedTable = ativa && bib[ativa] ? ativa : nomes[0];

    body.innerHTML = `
<label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Tabela de Medidas</label>
<select id="ups-mt" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:4px;font-size:14px;box-sizing:border-box;margin-bottom:12px;">
${nomes.map(n => `<option value="${n}"${n === selectedTable ? ' selected' : ''}>${n}</option>`).join('')}
</select>
<label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Descrição</label>
<div id="ups-md" style="padding:8px;background:#f5f5f5;border-radius:4px;font-size:13px;color:#666;margin-bottom:4px;min-height:20px;"></div>`;

    preencherSelectTamNovo();
    preencherSelectSalvosMedidas();

    function atualizarPrecos(nome) {
      const dados = bib[nome];
      precoTabela = (dados && dados.precos) || null;
      const labelTabela = document.getElementById('ups-mp-label-tabela');
      const optTabela = document.getElementById('ups-mp-opt-tabela');
      if (precoTabela) {
        optTabela.style.display = 'flex';
        let t = 'R$ ' + precoTabela.bulkPrice;
        const ov = precoTabela.overrides;
        if (ov && Object.keys(ov).length > 0) t += ' | ' + Object.entries(ov).map(([k, v]) => k + ': ' + v).join(' ');
        t += ' (Tabela)';
        labelTabela.textContent = t;
      } else {
        optTabela.style.display = 'none';
      }

      precoUltimo = (ultimos && ultimos.bulkPrice) ? ultimos : null;
      const labelUltimo = document.getElementById('ups-mp-label-ultimo');
      const optUltimo = document.getElementById('ups-mp-opt-ultimo');
      if (precoUltimo) {
        optUltimo.style.display = 'flex';
        let t = 'R$ ' + precoUltimo.bulkPrice;
        const ov = precoUltimo.overrides;
        if (ov && Object.keys(ov).length > 0) t += ' | ' + Object.entries(ov).map(([k, v]) => k + ': ' + v).join(' ');
        t += ' (Último)';
        labelUltimo.textContent = t;
      } else {
        optUltimo.style.display = 'none';
      }

      // Auto-select best option
      if (precoTabela) {
        document.querySelector('input[name="ups-mp-mode"][value="tabela"]').checked = true;
      } else if (precoUltimo) {
        document.querySelector('input[name="ups-mp-mode"][value="ultimo"]').checked = true;
      } else {
        document.querySelector('input[name="ups-mp-mode"][value="none"]').checked = true;
      }
      document.getElementById('ups-mp-novo').style.display = 'none';
      document.getElementById('ups-mp-nome-salvar').value = '';
      document.getElementById('ups-mp-excluir').style.display = 'none';
      window.__upsNovoPrecoOverrides = {};
      renderOverridesNovo({});
    }

    const select = document.getElementById('ups-mt');
    const descDiv = document.getElementById('ups-md');

    function atualizarDesc() {
      const nome = select.value;
      selectedTable = nome;
      const desc = (bib[nome] && bib[nome].descricao) || '';
      descDiv.textContent = desc || '(sem descrição)';
      atualizarPrecos(nome);
    }
    select.onchange = atualizarDesc;
    atualizarDesc();
  });

  document.getElementById('ups-mc').onclick = () => overlay.remove();

  document.getElementById('ups-mk').onclick = async () => {
    if (!selectedTable) return;

    document.getElementById('upseller-medidas-overlay').style.display = 'none';

    // Se multi-aba ativo, envia para background
    if (document.getElementById('ups-multi-chk').checked) {
      const mode = document.querySelector('input[name="ups-mp-mode"]:checked');
      let bulkPrice, overrides;
      if (mode && mode.value === 'tabela' && precoTabela) {
        bulkPrice = precoTabela.bulkPrice;
        overrides = precoTabela.overrides || {};
      } else if (mode && mode.value === 'ultimo' && precoUltimo) {
        bulkPrice = precoUltimo.bulkPrice;
        overrides = precoUltimo.overrides || {};
      } else {
        bulkPrice = document.getElementById('ups-mp-nb').value.trim();
        overrides = window.__upsNovoPrecoOverrides || {};
      }
      chrome.runtime.sendMessage({
        action: 'start-multi-medidas',
        config: { selectedTable, mode: mode ? mode.value : 'none', bulkPrice, overrides }
      });
      return;
    }

    window.__upsCancelMacro = false;
    criarOverlayProgresso();

    try {
      if (precisaRemapear()) {
        try {
          let remapStep = 0;
          await runAutomation((p) => {
            remapStep = p.step;
            atualizarOverlayProgresso({ message: 'Remapeando: ' + p.message, step: 1, total: 3 });
          });
        } catch (e) { /* ignore remap errors */ }
        if (window.__upsCancelMacro) { finalizarMacroCancelada(selectedTable); return; }
      }

      chrome.storage.local.get(["biblioteca"], async (res) => {
        try {
          const dados = res.biblioteca && res.biblioteca[selectedTable];
          if (dados) {
            atualizarOverlayProgresso({ message: 'Preenchendo guia de tamanhos...', step: 2, total: 3 });
            await preencherGuiaTamanhos(dados);
            if (window.__upsCancelMacro) { finalizarMacroCancelada(selectedTable); return; }

            if (dados.descricao) {
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
          }
          chrome.storage.local.set({ ultimaSelecionada: selectedTable });

          const mode = document.querySelector('input[name="ups-mp-mode"]:checked');
          const aplicarPreco = mode && mode.value !== 'none';
          if (aplicarPreco) {
            atualizarOverlayProgresso({ message: 'Aplicando preços...', step: 3, total: 3 });
            let bulkPrice, overrides;
            if (mode.value === 'novo') {
              bulkPrice = document.getElementById('ups-mp-nb').value.trim();
              overrides = window.__upsNovoPrecoOverrides || {};
              if (bulkPrice) chrome.storage.local.set({ ultimosPrecos: { bulkPrice, overrides: { ...overrides } } });
            } else if (mode.value === 'tabela' && precoTabela) {
              bulkPrice = precoTabela.bulkPrice;
              overrides = precoTabela.overrides || {};
              chrome.storage.local.set({ ultimosPrecos: { bulkPrice, overrides: { ...overrides } } });
            } else if (mode.value === 'ultimo' && precoUltimo) {
              bulkPrice = precoUltimo.bulkPrice;
              overrides = precoUltimo.overrides || {};
            }
            if (bulkPrice) {
              await setPrecosCompletos(bulkPrice, overrides);
            }
            if (window.__upsCancelMacro) { finalizarMacroCancelada(selectedTable); return; }
          }

          atualizarOverlayProgresso({ message: '✓ Macro concluída!', step: 3, total: 3 });
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

// ========== OVERLAY DE PROGRESSO (macro medidas) ==========
function criarOverlayProgresso() {
  const existing = document.getElementById('upseller-progress-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'upseller-progress-overlay';
  overlay.innerHTML = `
<div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:999999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;font-family:sans-serif;">
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
let multiTabInfo = { tab: 0, total: 0 };

function criarOverlayMulti(tab, total) {
  multiTabInfo = { tab, total };
  const existing = document.getElementById('upseller-multi-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'upseller-multi-overlay';
  overlay.innerHTML = `
<div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:999999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;font-family:sans-serif;pointer-events:none;">
  <div style="font-size:36px;">🔄</div>
  <div style="font-size:16px;font-weight:bold;color:#fff;">Remapeamento Multi-Aba</div>
  <div id="umo-tab" style="font-size:13px;color:#ccc;"></div>
  <div id="umo-step" style="font-size:12px;color:#888;text-align:center;padding:0 30px;"></div>
  <div style="width:260px;height:5px;background:rgba(255,255,255,0.15);border-radius:3px;overflow:hidden;margin-top:4px;">
    <div id="umo-bar" style="height:100%;width:0%;background:#4CAF50;border-radius:3px;transition:width 0.3s;"></div>
  </div>
  <div id="umo-pct" style="font-size:11px;color:#666;"></div>
</div>`;
  document.body.appendChild(overlay);
  document.getElementById('umo-tab').textContent = `Aba ${tab} de ${total}`;
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
    runAutomation((p) => {
      chrome.runtime.sendMessage({ action: 'progress', ...p });
      const overlayPct = p.step && p.total ? Math.round((p.step / p.total) * 100) : 0;
      atualizarOverlayMulti({ message: p.message, pct: overlayPct });
    }).then(() => {
      chrome.runtime.sendMessage({ action: 'completed' });
    }).catch((err) => {
      chrome.runtime.sendMessage({ action: 'error', message: err.message });
      const stepEl = document.getElementById('umo-step');
      const barEl = document.getElementById('umo-bar');
      const pctEl = document.getElementById('umo-pct');
      if (stepEl) { stepEl.textContent = 'Erro: ' + err.message; stepEl.style.color = '#ff6b6b'; }
      if (barEl) barEl.style.background = '#ff6b6b';
      if (pctEl) pctEl.textContent = 'Erro';
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

  if (request.action === 'executar-macro-full') {
    (async () => {
      try {
        if (precisaRemapear()) {
          try {
            await runAutomation((p) => {
              chrome.runtime.sendMessage({ action: 'progress', message: 'Remapeando: ' + p.message, step: p.step, total: p.total });
            });
          } catch (e) { /* silent */ }
        }
        const config = request.config || {};
        chrome.storage.local.get(["biblioteca"], async (res) => {
          try {
            const dados = res.biblioteca && res.biblioteca[config.selectedTable];
            if (dados) {
              await preencherGuiaTamanhos(dados);
              if (dados.descricao) {
                const ta = document.querySelector('.ant-form-item-control textarea.ant-input');
                if (ta) {
                  ta.focus();
                  ta.value = dados.descricao;
                  ta.dispatchEvent(new Event('input', { bubbles: true }));
                  ta.dispatchEvent(new Event('change', { bubbles: true }));
                  ta.blur();
                }
              }
            }
            const mode = config.mode;
            if (mode && mode !== 'none' && config.bulkPrice) {
              await setPrecosCompletos(config.bulkPrice, config.overrides || {});
            }
            chrome.runtime.sendMessage({ action: 'completed' });
          } catch (e) {
            chrome.runtime.sendMessage({ action: 'error', message: e.message });
          }
        });
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
