// ========== REMAPEAMENTO ==========
async function stepSelecionarTamanho() {
  var dialog = _currentRemapDialog || findMainDialog();
  if (!dialog) return;

  var tamanhoRow = null;
  for (var attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await sleep(500);
    const rows = dialog.querySelectorAll('tr');
    for (const row of rows) {
      const firstCell = row.querySelector('td:first-child, th:first-child');
      if (firstCell && firstCell.textContent.trim() === 'Tamanho') {
        tamanhoRow = row;
        break;
      }
    }
    if (tamanhoRow) break;
  }
  if (!tamanhoRow) return;

  var selectWrapper = tamanhoRow.querySelector('.ant-select');
  if (!selectWrapper) return;

  if (selectWrapper.scrollIntoView) selectWrapper.scrollIntoView({ block: 'center' });
  await sleep(200);

  // close any existing dropdown first
  var openDd = document.querySelector('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
  if (openDd) {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));
    await sleep(300);
  }

  selectWrapper.click();
  await sleep(600);

  for (var retry = 0; retry < 5; retry++) {
    if (retry > 0) {
      var prevDd = document.querySelector('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
      if (prevDd) {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));
        await sleep(300);
      }
      selectWrapper.click();
      await sleep(400);
    }
    // find dropdown by aria-controls of THIS select
    var combo = selectWrapper.querySelector('[role="combobox"]');
    var ariaId = combo ? combo.getAttribute('aria-controls') : null;
    var dd = null;
    if (ariaId) {
      dd = document.getElementById(ariaId);
    }
    if (!dd) {
      dd = document.querySelector('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
    }
    if (!dd) continue;

    // find "Tamanho" option
    var opt = Array.from(dd.querySelectorAll('li')).find(function(li) { return li.textContent.trim() === 'Tamanho'; });
    if (!opt) {
      opt = Array.from(dd.querySelectorAll('[role="option"], .ant-select-dropdown-menu-item')).find(function(el) { return el.textContent.trim() === 'Tamanho'; });
    }
    if (!opt) {
      var allChildren = dd.querySelectorAll('*');
      for (var ci = 0; ci < allChildren.length; ci++) {
        if (allChildren[ci].textContent.trim() === 'Tamanho' && allChildren[ci].children.length === 0) {
          opt = allChildren[ci];
          break;
        }
      }
    }
    if (!opt) continue;

    // click at the option's exact position
    var rect = opt.getBoundingClientRect();
    var cx = rect.left + rect.width / 2;
    var cy = rect.top + rect.height / 2;
    var elAtPoint = document.elementFromPoint(cx, cy);
    if (elAtPoint) {
      var evtBase = { bubbles: true, cancelable: true, composed: true, view: window, clientX: cx, clientY: cy, screenX: cx, screenY: cy, button: 0 };
      elAtPoint.dispatchEvent(new MouseEvent('mousedown', evtBase));
      elAtPoint.dispatchEvent(new MouseEvent('mouseup', evtBase));
      elAtPoint.dispatchEvent(new MouseEvent('click', evtBase));
    }
    opt.click();

    // poll for selection
    for (var pw = 0; pw < 20; pw++) {
      await sleep(150);
      var curSel = tamanhoRow.querySelector('.ant-select');
      if (!curSel) break;
      var selVal = curSel.querySelector('.ant-select-selection-selected-value');
      if (selVal && selVal.textContent.trim() === 'Tamanho') return;
      var dd2 = document.querySelector('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
      if (!dd2) break;
    }
  }
}
async function stepConfirmar() {
  var dialog = _currentRemapDialog || findMainDialog();
  if (!dialog) throw new Error('Diálogo não encontrado');
  const btns = dialog.querySelectorAll('button');
  const btn = Array.from(btns).find(b => b.textContent.trim() === 'Confirmar');
  if (!btn) throw new Error('Botão Confirmar não encontrado no dialog');
  nativeClick(btn);
  await sleep(500);
}
async function stepMapearVariantes() {
  _personalizadasAdicionadas = 0;
  var _customTarget = null;
  var remapCustom = {};
  try {
    var remapData = await new Promise(function(resolve) {
      chrome.storage.local.get(['bibliotecaRemapCustom'], function(res) {
        resolve(res.bibliotecaRemapCustom || {});
      });
    });
    for (var rk in remapData) remapCustom[normalizarCor(rk)] = remapData[rk];
  } catch(e) {}
  var mainDialog = _currentRemapDialog || findMainDialog();
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
    await sleep(600);
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
            await sleep(200);

            let visibleDropdown = null;
            for (let ddAttempt = 0; ddAttempt < 10; ddAttempt++) {
              const dropdowns = document.querySelectorAll('.ant-select-dropdown');
              for (const dd of dropdowns) {
                if (!dd.classList.contains('ant-select-dropdown-hidden') && dd.style.display !== 'none') {
                  visibleDropdown = dd;
                  break;
                }
              }
              if (visibleDropdown) break;
              await sleep(200);
            }
            if (!visibleDropdown) {
              await sleep(300);
              continue;
            }

            const items = visibleDropdown.querySelectorAll('li');
            let found = false;

            // Try custom remap first (user-defined from CORES tab — highest priority)
            if (!found && remapCustom) {
              var targetName = remapCustom[normalizarCor(name)];
              if (targetName) {
                _customTarget = targetName;
                var normTarget = normalizarCor(targetName);
                for (const item of items) {
                  if (normalizarCor(item.textContent) === normTarget) {
                    nativeClick(item);
                    found = true;
                    _customTarget = null;
                    break;
                  }
                }
                if (!found) {
                  for (const item of items) {
                    if (item.textContent.trim() === targetName) {
                      nativeClick(item);
                      found = true;
                      _customTarget = null;
                      break;
                    }
                  }
                }
              }
            }

            // Try exact match (only if no custom remap target pending)
            if (!found && !_customTarget) {
              for (const item of items) {
                if (item.textContent.trim() === name) {
                  nativeClick(item);
                  found = true;
                  break;
                }
              }
            }

            // If no exact match, try normalized match (ignore case, accents, punctuation)
            if (!found && !_customTarget) {
              const normName = normalizarCor(name);
              for (const item of items) {
                if (normalizarCor(item.textContent) === normName) {
                  nativeClick(item);
                  found = true;
                  break;
                }
              }
            }

            // If still not found, try English → Portuguese translation match
            if (!found && !_customTarget) {
              const traducoes = traduzirCorEnPt(name);
              for (let t = 0; t < traducoes.length && !found; t++) {
                const normTrad = normalizarCor(traducoes[t]);
                for (const item of items) {
                  if (normalizarCor(item.textContent) === normTrad) {
                    nativeClick(item);
                    found = true;
                    break;
                  }
                }
              }
            }

            // If still not found, select "Valor de Variante Personalizada"
            if (!found) {
              for (const item of items) {
                if (item.textContent.trim() === 'Valor de Variante Personalizada') {
                  nativeClick(item);
                  await sleep(1000);
                  // Find the text input that appears and set its value
                  const input = selectEl.closest('td, th')?.querySelector('input[type="text"], textarea');
                  if (input) {
                    var nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                    input.focus();
                    var val = (_customTarget || name).replace(/(^|[\/\s])([a-zà-ü])/g, function(m, sep, c) {
                      return sep + c.toUpperCase();
                    });
                    nativeSetter.call(input, val);
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                    input.blur();
                  }
                  _customTarget = null;
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
  var mainDialog = _currentRemapDialog || findMainDialog();
  if (!mainDialog) throw new Error('Diálogo não encontrado');
  const buttons = mainDialog.querySelectorAll('button');
  for (const btn of buttons) {
    if (btn.textContent.trim() === 'Salvar') {
      nativeClick(btn);
      return;
    }
  }
  throw new Error('Botão Salvar não encontrado');
}
async function stepOK() {
  const btn = await esperarBotao('OK', 10000);
  if (!btn) return;
  nativeClick(btn);
}
async function stepFechar() {
  const btn = await esperarBotao('Fechar', 10000);
  if (!btn) return;
  nativeClick(btn);
  _currentRemapDialog = null;
}
async function stepAbrirRemapeamento() {
  _currentRemapDialog = null;
  const remapLink = findTextContainer('Remapeamento de Variante');
  if (!remapLink) throw new Error('Link "Remapeamento de Variante" não encontrado');
  nativeClick(remapLink);
  const dialog = await esperarElemento('.ant-modal-content', 15000);
  if (!dialog) throw new Error('Diálogo de remapeamento não abriu após clicar no link');
  _currentRemapDialog = dialog;
  await sleep(500);
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
  const steps = [
    { name: 'Abrir remapeamento de variantes', fn: stepAbrirRemapeamento },
    { name: 'Selecionar Tamanho', fn: stepSelecionarTamanho },
  ];
  steps.push(
    { name: 'Confirmar tipo (Passo 1)', fn: stepConfirmar },
    { name: 'Mapear variantes', fn: stepMapearVariantes },
    { name: 'Salvar remapeamento', fn: stepSalvar },
  );
  for (let i = 0; i < steps.length; i++) {
    // Adiciona OK e Fechar dinamicamente se houver variantes personalizadas
    if (steps[i].name === 'Salvar remapeamento' && _personalizadasAdicionadas > 0) {
      steps.push(
        { name: 'Confirmar OK', fn: stepOK },
        { name: 'Fechar diálogo de sucesso', fn: stepFechar },
      );
    }
    sendProgress({ step: i + 1, total: steps.length, message: steps[i].name });
    await steps[i].fn();
  }
  sendProgress({ step: steps.length, total: steps.length, message: 'Remapeamento concluído' });
}
// ========== MEDIDAS ==========
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
    await sleep(500);
  }
  if (!dialog || !dialog.textContent.includes('Editar Guia de Tamanhos')) {
    return { missing: [] };
  }

  const selectWrapper = dialog.querySelector('.ant-select');
  if (selectWrapper) {
    selectWrapper.click();
    await sleep(600);
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
      var nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      input.focus();
      nativeSetter.call(input, val);
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
function abrirDialogMedidas() {
  var preencherListaPresets, lerEstadoOverlay, aplicarPresetOverlay, salvarPresetOverlay, salvarEstadoMedidas;
  const existing = document.getElementById('upseller-medidas-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'upseller-medidas-overlay';
  overlay.innerHTML = `
<div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.45);z-index:999999;display:flex;align-items:center;justify-content:center;">
<div style="background:white;border-radius:8px;padding:20px;width:90vw;min-width:540px;max-width:680px;box-shadow:0 8px 32px rgba(0,0,0,0.25);font-family:sans-serif;max-height:85vh;overflow-y:auto;">
<div style="font-size:18px;font-weight:bold;margin-bottom:10px;text-align:center;">Automação Shein - UpSeller</div>

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
#ups-ma-slider::before,
#ups-ma-sub-slider::before {
  content:""; position:absolute; width:16px; height:16px; border-radius:50%;
  background:white; top:2px; left:2px; transition:.3s;
}
#ups-ma-slider { background:#ccc; }
#ups-ma-ativar:checked + #ups-ma-slider { background:#28a745; }
#ups-ma-ativar:checked + #ups-ma-slider::before { transform:translateX(16px); }
#ups-ma-sub-slider { background:#ccc; }
#ups-ma-sub-ativar:checked + #ups-ma-sub-slider { background:#28a745; }
#ups-ma-sub-ativar:checked + #ups-ma-sub-slider::before { transform:translateX(16px); }
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
<div style="position:relative;display:flex;gap:3px;margin-bottom:4px;">
<input id="ups-mp-nt" type="text" placeholder="Ex: PP" style="flex:1;padding:4px 6px;border:1px solid #ccc;border-radius:4px;font-size:11px;box-sizing:border-box;text-transform:uppercase;">
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
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
    <label style="font-size:12px;font-weight:600;">Subespecificação</label>
    <label style="position:relative;display:inline-block;width:36px;height:20px;cursor:pointer;">
    <input type="checkbox" id="ups-ma-sub-ativar" checked style="opacity:0;width:0;height:0;margin:0;">
    <span id="ups-ma-sub-slider" style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;border-radius:20px;transition:.3s;"></span>
    </label>
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
    <input type="checkbox" id="ups-ma-crop" style="margin:0;"> Ajustar Imagens
    </label>
    <label style="font-size:13px;font-weight:600;display:flex;align-items:center;gap:4px;white-space:nowrap;">
    <input type="checkbox" id="ups-ma-confirmar-cores" style="margin:0;"> Confirmar cores?
    </label>
    <label style="font-size:13px;font-weight:600;display:flex;align-items:center;gap:4px;white-space:nowrap;">
    <input type="checkbox" id="ups-ma-remap" style="margin:0;"> Forçar remapeamento
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
<div style="margin-bottom:6px;">
  <div style="display:flex;align-items:center;justify-content:center;gap:8px;">
    <span id="ups-multi-label-seq" style="font-size:12px;font-weight:600;color:#888;transition:color .25s;">SEQUENCIAL</span>
    <div id="ups-multi-toggle" style="position:relative;width:44px;height:22px;background:#4caf50;border-radius:11px;cursor:pointer;transition:background .25s;" data-modo="cascata">
      <div id="ups-multi-knob" style="position:absolute;top:2px;right:2px;width:18px;height:18px;background:white;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,0.2);transition:all .25s;"></div>
    </div>
    <span id="ups-multi-label-par" style="font-size:12px;font-weight:600;color:#4caf50;transition:color .25s;">PARALELO</span>
  </div>
  <div id="ups-multi-desc" style="font-size:11px;color:#666;margin-top:4px;line-height:1.4;text-align:center;">Distribui as abas em janelas separadas e executa todas ao mesmo tempo.</div>
</div>
<div style="font-size:12px;color:#999;line-height:1.5;">Aplica as configuracoes desta overlay em todas as abas de edicao abertas automaticamente.</div>
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

  // Toggle Paralelo / Sequencial
  var multiToggle = document.getElementById('ups-multi-toggle');
  if (multiToggle) {
    multiToggle.onclick = function() {
      var current = this.getAttribute('data-modo');
      var next = current === 'cascata' ? 'sequencial' : 'cascata';
      this.setAttribute('data-modo', next);
      var isCascata = next === 'cascata';
      var knob = document.getElementById('ups-multi-knob');
      var labelSeq = document.getElementById('ups-multi-label-seq');
      var labelPar = document.getElementById('ups-multi-label-par');
      var desc = document.getElementById('ups-multi-desc');
      if (isCascata) {
        this.style.background = '#4caf50';
        knob.style.left = 'auto'; knob.style.right = '2px';
        labelSeq.style.color = '#888'; labelPar.style.color = '#4caf50';
        if (desc) desc.textContent = 'Distribui as abas em janelas separadas e executa todas ao mesmo tempo.';
      } else {
        this.style.background = '#ff9800';
        knob.style.left = '2px'; knob.style.right = 'auto';
        labelSeq.style.color = '#ff9800'; labelPar.style.color = '#888';
        if (desc) desc.textContent = 'Processa uma aba por vez, na mesma janela.';
      }
    };
  }

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
      `<span class="ups-tag"><b>${t}</b>: R$ ${overrides[t]} <span class="ups-tag-rm" data-ov-del="${t}">×</span></span>`
    ).join('');
    const handler = c._ovClickDel;
    if (handler) c.removeEventListener('click', handler);
    c._ovClickDel = function(e) {
      var del = e.target.closest('[data-ov-del]');
      if (del) { delete overrides[del.getAttribute('data-ov-del')]; renderOverridesNovo(overrides); }
    };
    c.addEventListener('click', c._ovClickDel);
  }

  function extrairTamanhosDaTabela() {
    // Ler direto do storage (evita problemas com scroll virtual do VXE)
    return new Promise((resolve) => {
      chrome.storage.local.get(["biblioteca", "ultimaSelecionada"], (res) => {
        const bib = res.biblioteca || {};
        const sel = res.ultimaSelecionada || '';
        const dados = bib[sel];
        if (dados) {
          const chavesFixas = new Set(['descricao','topicos','macros','precos','emMassa','sku','crop','confirmarCores','ativar','sub','quantidade','preco','peso','pacote','paisOrigem']);
          const tamanhos = Object.keys(dados).filter(k => !chavesFixas.has(k) && dados[k] && typeof dados[k] === 'object' && (dados[k].b || dados[k].c));
          console.log('[UPS-med] Tamanhos do storage:', tamanhos);
          resolve(tamanhos.sort((a, b) => {
            const order = ["PP","P","M","G","GG","EGG","G1","G2","G3","G4","G5","2","4","6","8","10","12","14","16"];
            const ai = order.indexOf(a), bi = order.indexOf(b);
            if (ai !== -1 && bi !== -1) return ai - bi;
            if (ai !== -1) return -1;
            if (bi !== -1) return 1;
            return a.localeCompare(b);
          }));
          return;
        }
        // Fallback: ler do DOM
        const table = document.querySelector('.vxe-table');
        console.log('[UPS-med] Fallback DOM - Tabela:', !!table);
        if (!table) { resolve([]); return; }
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
        resolve(Array.from(encontrados).sort((a, b) => {
          const order = ["PP","P","M","G","GG","EGG","G1","G2","G3","G4","G5","2","4","6","8","10","12","14","16"];
          return order.indexOf(a) - order.indexOf(b);
        }));
      });
    });
  }

  document.getElementById('ups-mp-na').onclick = () => {
    const tam = document.getElementById('ups-mp-nt').value.trim().toUpperCase();
    const val = document.getElementById('ups-mp-nv').value.trim();
    if (!tam || !val) return;
    const overrides = window.__upsNovoPrecoOverrides || {};
    overrides[tam] = val;
    window.__upsNovoPrecoOverrides = overrides;
    document.getElementById('ups-mp-nt').value = '';
    document.getElementById('ups-mp-nv').value = '';
    document.getElementById('ups-mp-nt').focus();
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

  var mpCarregar = document.getElementById('ups-mp-carregar');
  if (mpCarregar) mpCarregar.onchange = (e) => {
    const val = e.target.value;
    if (!val) return;
    const [tipo, ...nomeParts] = val.split(':');
    carregarPresetNoNovo(tipo, nomeParts.join(':'), () => expandirAcordeao('ups-ab-2'));
  };

  var mpSalvar = document.getElementById('ups-mp-salvar');
  if (mpSalvar) mpSalvar.onclick = salvarPresetMedidas;
  var mpExcluir = document.getElementById('ups-mp-excluir');
  if (mpExcluir) mpExcluir.onclick = deletarPresetMedidas;

  chrome.storage.local.get(["biblioteca", "bibliotecaAtributos", "ultimaSelecionada", "bibliotecaPrecos", "ultimosPrecos", "ultimosMacros", "ultimoEstadoMedidas"], (res) => {
    try {
      if (!body) return;
      const bib = res.biblioteca || {};
    const nomes = Object.keys(bib).filter(n =>
      Object.keys(bib[n]).some(k => listaTam.includes(k))
    );
    const ativa = res.ultimaSelecionada || '';
    const ultimos = res.ultimosPrecos;

    selectedTable = (ativa && bib[ativa]) ? ativa : (nomes.length > 0 ? nomes[0] : '');
    const chavesFixas = new Set(['descricao','topicos','macros','precos','emMassa','sku','crop','confirmarCores','ativar','sub','quantidade','preco','peso','pacote','paisOrigem']);

    body.innerHTML = `
<label style="font-size:13px;font-weight:600;display:block;margin-bottom:8px;">Tabela de Medidas</label>
<div style="display:flex;gap:4px;margin-bottom:12px;align-items:center;">
<select id="ups-mt" style="flex:1;padding:8px;border:1px solid #ccc;border-radius:4px;font-size:14px;box-sizing:border-box;">
${nomes.length > 0 ? nomes.map(n => `<option value="${n}"${n === selectedTable ? ' selected' : ''}>${n}</option>`).join('') : '<option value="">Nenhuma tabela salva</option>'}
</select>
<button id="ups-mt-editar" style="padding:8px 10px;border:1px solid #4078f2;border-radius:4px;cursor:pointer;font-size:14px;background:white;color:#4078f2;white-space:nowrap;line-height:1;display:flex;align-items:center;justify-content:center;" title="Editar tabela">✏️</button>
<button id="ups-mt-novo" style="padding:8px 10px;border:1px solid #28a745;border-radius:4px;cursor:pointer;font-size:14px;background:white;color:#28a745;white-space:nowrap;line-height:1;display:flex;align-items:center;justify-content:center;" title="Criar tabela">➕</button>
<button id="ups-mt-rm" style="padding:8px 10px;border:1px solid #dc3545;border-radius:4px;cursor:pointer;font-size:14px;background:white;color:#dc3545;white-space:nowrap;line-height:1;display:flex;align-items:center;justify-content:center;${!selectedTable || !bib[selectedTable] ? 'display:none;' : ''}" title="Deletar tabela"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc3545" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></button>
</div>
<div id="ups-mt-display" style="padding:10px;background:#f9f9f9;border:1px solid #e0e0e0;border-radius:4px;font-size:12px;color:#666;"></div>`;

    if (nomes.length === 0) {
      document.getElementById('ups-mk').style.display = 'none';
    }

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
      console.log('[UPS-med] renderDisplayMedidas chamada com:', nome);
      const display = document.getElementById('ups-mt-display');
      console.log('[UPS-med] display element:', !!display);
      if (!nome) {
        display.innerHTML = '<span style="color:#999;">(nenhuma tabela selecionada)</span>';
        return;
      }

      chrome.storage.local.get(["biblioteca"], (res) => {
        console.log('[UPS-med] storage callback - biblioteca keys:', Object.keys(res.biblioteca || {}));
        const bibAtualizada = res.biblioteca || {};
        const dados = bibAtualizada[nome];
        console.log('[UPS-med] dados para', nome, ':', dados ? 'OK' : 'NULO');

        if (!dados) {
          display.innerHTML = '<span style="color:#999;">(nenhuma tabela selecionada)</span>';
          return;
        }

        let tamanhos = Object.keys(dados).filter(k => !chavesFixas.has(k) && dados[k] && typeof dados[k] === 'object' && (dados[k].b || dados[k].c));
        console.log('[UPS-med] tamanhos filtrados:', tamanhos);
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
    console.log('[UPS-med] select ups-mt:', !!select, 'value:', select ? select.value : 'N/A');

    function atualizarDesc(nome) {
      console.log('[UPS-med] atualizarDesc chamada com:', nome, 'select.value:', select ? select.value : 'N/A');
      if (!nome || typeof nome === 'object') nome = select.value;
      console.log('[UPS-med] nome resolvido:', nome);
      if (window.__upsLoadingPreset) { console.log('[UPS-med] bloqueado por __upsLoadingPreset'); return; }
      
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
          if (dados.macros.subAtivo !== undefined) document.getElementById('ups-ma-sub-ativar').checked = !!dados.macros.subAtivo;
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
    console.log('[UPS-med] nomes:', nomes.length, 'selectedTable:', selectedTable, '__temEstadoSalvo:', window.__temEstadoSalvo);
    if (nomes.length > 0) {
      select.addEventListener('change', function(e) {
        console.log('[UPS-med] CHANGE disparado! value:', e.target.value);
        atualizarDesc(e.target.value);
      });
      if (!window.__temEstadoSalvo) atualizarDesc(selectedTable);
    } else {
      console.log('[UPS-med] Nenhuma tabela para adicionar listener');
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
        if (savedMacros.subAtivo !== undefined) document.getElementById('ups-ma-sub-ativar').checked = !!savedMacros.subAtivo;
        if (savedMacros.emMassa) {
          document.getElementById('ups-ma-eq').value = savedMacros.emMassa.quantidade || '';
          document.getElementById('ups-ma-ep').value = savedMacros.emMassa.preco || '';
          document.getElementById('ups-ma-ew').value = savedMacros.emMassa.peso || '';
          document.getElementById('ups-ma-epkg').value = savedMacros.emMassa.pacote || '';
        }
        document.getElementById('ups-ma-sku').checked = !!savedMacros.sku;
        document.getElementById('ups-ma-crop').checked = !!savedMacros.crop;
        if (savedMacros.confirmarCores !== undefined) document.getElementById('ups-ma-confirmar-cores').checked = !!savedMacros.confirmarCores;
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
        subAtivo: document.getElementById('ups-ma-sub-ativar').checked,
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
        confirmarCores: document.getElementById('ups-ma-confirmar-cores').checked,
        forcarRemap: document.getElementById('ups-ma-remap').checked
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
      if (dados.forcarRemap !== undefined) document.getElementById('ups-ma-remap').checked = !!dados.forcarRemap;
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
        if (dados.confirmarCores !== undefined) document.getElementById('ups-ma-confirmar-cores').checked = !!dados.confirmarCores;
        document.getElementById('ups-ma-ativar').checked = dados.ativar !== false;
        mostrarToastFeedback('Macro "' + nome + '" carregada!');
      });
    }

    function salvarMacroDialogMedidas() {
      const nome = document.getElementById('ups-ma-nome-salvar').value.trim();
      if (!nome) return;
      const dados = {
        sub: document.getElementById('ups-ma-sub').value.trim(),
        subAtivo: document.getElementById('ups-ma-sub-ativar').checked,
        emMassa: {
          quantidade: document.getElementById('ups-ma-eq').value.trim(),
          preco: document.getElementById('ups-ma-ep').value.trim(),
          peso: document.getElementById('ups-ma-ew').value.trim(),
          pacote: document.getElementById('ups-ma-epkg').value.trim()
        },
        sku: document.getElementById('ups-ma-sku').checked,
        crop: document.getElementById('ups-ma-crop').checked,
        confirmarCores: document.getElementById('ups-ma-confirmar-cores').checked,
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

    const CATEGORIAS_EXPORT = [
      { id: 'Overlay', rotulo: 'Presets do Usuário', desc: 'Presets, última tabela selecionada e estado da overlay', keys: ['bibliotecaPresetsOverlay','ultimaSelecionada','ultimoEstadoMedidas'] },
      { id: 'Medidas', rotulo: 'Medidas e Descrição', desc: 'Tabelas com largura/altura por tamanho', keys: ['biblioteca'] },
      { id: 'PrecoEspecial', rotulo: 'Preço Especial', desc: 'Preços salvos e último preço aplicado', keys: ['bibliotecaPrecos','ultimosPrecos'] },
      { id: 'EditarMassa', rotulo: 'Editar em Massa', desc: 'Macros e último macro executado', keys: ['bibliotecaMacros','ultimosMacros'] },
      { id: 'Atributos', rotulo: 'Atributos', desc: 'Atributos customizados salvos', keys: ['bibliotecaAtributos'] },
      { id: 'LinksRecentes', rotulo: 'Links Recentes', desc: 'Últimos links de imagem usados', keys: ['ultimosLinks'] },
      { id: 'RemapCustom', rotulo: 'Remap de Cores', desc: 'Remapeamento customizado de cores', keys: ['bibliotecaRemapCustom'] }
    ];

    function abrirDialogoSelecao(titulo, categorias, textoConfirmar, onConfirmar) {
      const existing = document.getElementById('ups-dlg-sel');
      if (existing) existing.remove();
      const overlay = document.createElement('div');
      overlay.id = 'ups-dlg-sel';
      overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.4);z-index:9999999;display:flex;align-items:center;justify-content:center;';
      var html = '<div style="background:white;border-radius:8px;padding:20px;width:420px;max-width:95vw;max-height:85vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,0.25);font-family:sans-serif;">';
      html += '<div style="font-size:15px;font-weight:bold;margin-bottom:4px;">' + titulo + '</div>';
      html += '<div style="font-size:11px;color:#999;margin-bottom:12px;">Marque os dados que deseja incluir</div>';
      html += '<label style="display:flex;align-items:center;gap:6px;font-size:12px;font-weight:600;cursor:pointer;margin-bottom:10px;color:#4078f2;"><input type="checkbox" id="ups-dlg-sel-all" style="cursor:pointer;" checked>Selecionar Todos</label>';
      for (var ci = 0; ci < categorias.length; ci++) {
        var cat = categorias[ci];
        var dis = cat.desabilitado ? 'disabled' : '';
        var chk = cat.marcado ? 'checked' : '';
        var op = cat.desabilitado ? 'opacity:0.45;' : '';
        html += '<label class="ups-dlg-sel-label" style="display:flex;align-items:flex-start;gap:6px;margin-bottom:8px;cursor:pointer;' + op + '">';
        html += '<input type="checkbox" class="ups-dlg-sel-cat" data-id="' + cat.id + '" ' + chk + ' ' + dis + ' style="margin-top:2px;cursor:pointer;">';
        html += '<div><div style="font-size:12px;font-weight:600;">' + cat.rotulo + '</div>';
        if (cat.desc) html += '<div style="font-size:10px;color:#888;">' + cat.desc + '</div>';
        html += '</div></label>';
      }
      html += '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px;">';
      html += '<button id="ups-dlg-sel-cancel" style="padding:6px 16px;border:1px solid #ccc;border-radius:6px;cursor:pointer;font-size:12px;background:white;">Cancelar</button>';
      html += '<button id="ups-dlg-sel-ok" style="padding:6px 16px;border:none;border-radius:6px;cursor:pointer;font-size:12px;background:#4078f2;color:white;font-weight:bold;">' + textoConfirmar + '</button></div></div>';
      overlay.innerHTML = html;
      document.body.appendChild(overlay);
      var checks = overlay.querySelectorAll('.ups-dlg-sel-cat');
      var allCb = overlay.querySelector('#ups-dlg-sel-all');
      allCb.onchange = function() { checks.forEach(function(cb) { if (!cb.disabled) cb.checked = allCb.checked; }); };
      checks.forEach(function(cb) { cb.onchange = function() {
        var allOn = true;
        checks.forEach(function(c) { if (!c.disabled && !c.checked) allOn = false; });
        allCb.checked = allOn;
      }; });
      overlay.querySelector('#ups-dlg-sel-cancel').onclick = function() { overlay.remove(); };
      overlay.querySelector('#ups-dlg-sel-ok').onclick = function() {
        var ids = [];
        checks.forEach(function(cb) { if (cb.checked && !cb.disabled) ids.push(cb.getAttribute('data-id')); });
        overlay.remove();
        if (ids.length > 0) onConfirmar(ids);
      };
      overlay.addEventListener('click', function(ev) { if (ev.target === overlay) overlay.remove(); });
    }

    document.getElementById('ups-op-export-action').onclick = function() {
      var allKeys = [];
      CATEGORIAS_EXPORT.forEach(function(c) { allKeys.push.apply(allKeys, c.keys); });
      chrome.storage.local.get(allKeys, function(res) {
        var categorias = CATEGORIAS_EXPORT.map(function(c) { return { id: c.id, rotulo: c.rotulo, desc: c.desc, marcado: true, desabilitado: false }; });
        abrirDialogoSelecao('Exportar Dados', categorias, 'Exportar', function(idsSelecionados) {
          var hoje = new Date();
          var dia = String(hoje.getDate()).padStart(2, '0');
          var mes = String(hoje.getMonth() + 1).padStart(2, '0');
          var ano = hoje.getFullYear();
          var exportData = {};
          for (var i = 0; i < idsSelecionados.length; i++) {
            var cat = CATEGORIAS_EXPORT.find(function(c) { return c.id === idsSelecionados[i]; });
            if (!cat) continue;
            for (var k = 0; k < cat.keys.length; k++) {
              var key = cat.keys[k];
              exportData[key] = res[key] !== undefined ? res[key] : (key === 'ultimaSelecionada' ? '' : {});
            }
          }
          chrome.runtime.sendMessage({ action: 'export-data', data: exportData, filename: 'upseller-backup_' + dia + '-' + mes + '-' + ano + '.json' });
        });
      });
    };

    var importInput = document.createElement('input');
    importInput.type = 'file';
    importInput.accept = '.json';
    importInput.style.display = 'none';
    document.body.appendChild(importInput);
    document.getElementById('ups-op-import-action').onclick = function() { importInput.click(); };
    importInput.onchange = function(e) {
      var arquivo = e.target.files[0];
      if (!arquivo) return;
      var reader = new FileReader();
      reader.onload = function(ev) {
        try {
          var dados = JSON.parse(ev.target.result);
          var categorias = CATEGORIAS_EXPORT.map(function(c) {
            var tem = false;
            for (var k = 0; k < c.keys.length; k++) {
              var val = dados[c.keys[k]];
              if (val !== undefined && val !== null && val !== '' && (typeof val !== 'object' || Object.keys(val).length > 0)) { tem = true; break; }
            }
            return { id: c.id, rotulo: c.rotulo, desc: c.desc, marcado: tem, desabilitado: !tem };
          });
          var algum = categorias.some(function(c) { return c.marcado; });
          if (!algum) { e.target.value = ''; mostrarToastFeedback('Arquivo não contém dados reconhecidos.'); return; }
          abrirDialogoSelecao('Importar Dados', categorias, 'Importar', function(idsSelecionados) {
            var setData = {};
            for (var i = 0; i < idsSelecionados.length; i++) {
              var cat = CATEGORIAS_EXPORT.find(function(c) { return c.id === idsSelecionados[i]; });
              if (!cat) continue;
              for (var k = 0; k < cat.keys.length; k++) {
                if (dados[cat.keys[k]] !== undefined) setData[cat.keys[k]] = dados[cat.keys[k]];
              }
            }
            if (setData.biblioteca && setData.bibliotecaAtributos) {
              var bibAtr = setData.bibliotecaAtributos;
              Object.keys(setData.biblioteca).forEach(function(nome) {
                if (setData.biblioteca[nome].atributos && Object.keys(setData.biblioteca[nome].atributos).length) {
                  if (!bibAtr[nome]) bibAtr[nome] = setData.biblioteca[nome].atributos;
                  delete setData.biblioteca[nome].atributos;
                }
              });
              setData.bibliotecaAtributos = bibAtr;
            } else if (setData.biblioteca) {
              Object.keys(setData.biblioteca).forEach(function(nome) {
                if (setData.biblioteca[nome].atributos) delete setData.biblioteca[nome].atributos;
              });
            }
            chrome.storage.local.set(setData, function() {
              try {
                e.target.value = '';
                preencherListaPresets();
                preencherSelectSalvosMedidas();
                preencherSelectMacrosMedidas();
                preencherSelectAtributos();
                mostrarToastFeedback('Backup restaurado com sucesso!');
              } catch (err2) { mostrarToastFeedback('Erro ao aplicar backup: ' + err2.message); }
            });
          });
        } catch (err) { mostrarToastFeedback('Erro ao importar: ' + err.message); }
      };
      reader.readAsText(arquivo);
    };
  } catch(e) {
    console.error('ups: abrirDialogMedidas import error', e);
  }
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

    async function salvarPresetAtributos() {
      const nome = document.getElementById('ups-atr-nome').value.trim();
      if (!nome) { mostrarToastFeedback('Digite um nome para o preset'); return; }
      const attrs = await lerAtributos();
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
        macroSubAtivo: document.getElementById('ups-ma-sub-ativar').checked,
        macroQtd: document.getElementById('ups-ma-eq').value.trim(),
        macroPreco: document.getElementById('ups-ma-ep').value.trim(),
        macroPeso: document.getElementById('ups-ma-ew').value.trim(),
        macroPacote: document.getElementById('ups-ma-epkg').value.trim(),
        macroSku: document.getElementById('ups-ma-sku').checked,
        macroCrop: document.getElementById('ups-ma-crop').checked,
        macroConfirmarCores: document.getElementById('ups-ma-confirmar-cores').checked,
        macroRemap: document.getElementById('ups-ma-remap').checked,
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
    if (estado.macroSubAtivo !== undefined) document.getElementById('ups-ma-sub-ativar').checked = !!estado.macroSubAtivo;
    atualizarTagsSub();
    if (estado.macroQtd !== undefined) document.getElementById('ups-ma-eq').value = estado.macroQtd || '';
    if (estado.macroPreco !== undefined) document.getElementById('ups-ma-ep').value = estado.macroPreco || '';
    if (estado.macroPeso !== undefined) document.getElementById('ups-ma-ew').value = estado.macroPeso || '';
    if (estado.macroPacote !== undefined) document.getElementById('ups-ma-epkg').value = estado.macroPacote || '';
    if (estado.macroSku !== undefined) document.getElementById('ups-ma-sku').checked = !!estado.macroSku;
    if (estado.macroCrop !== undefined) document.getElementById('ups-ma-crop').checked = !!estado.macroCrop;
    if (estado.macroConfirmarCores !== undefined) document.getElementById('ups-ma-confirmar-cores').checked = !!estado.macroConfirmarCores;
    if (estado.macroRemap !== undefined) document.getElementById('ups-ma-remap').checked = !!estado.macroRemap;
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
    window.__upsLoadingPreset = false;
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
    const subAtivo = document.getElementById('ups-ma-sub-ativar').checked;
    const temSub = subAtivo && document.getElementById('ups-ma-sub').value.trim() !== '';
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
      const multiToggle = document.getElementById('ups-multi-toggle');
      const multiModo = multiToggle ? multiToggle.getAttribute('data-modo') : 'cascata';
      chrome.runtime.sendMessage({
        action: 'start-multi-medidas',
        config: {
          selectedTable,
          bulkPrice,
          overrides,
          atributosAtivo,
          atrPreset,
          multiModo: multiModo,
          confirmarCores: macroAtivo && confirmarCoresAtivo,
          forcarRemap: macroAtivo && document.getElementById('ups-ma-remap').checked,
          macro: temMacro ? {
            sub: document.getElementById('ups-ma-sub').value.trim(),
            subAtivo: subAtivo,
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
    const forcarRemap = macroAtivo && document.getElementById('ups-ma-remap').checked;
    const needsRemap = forcarRemap || (medidasAtivo && precisaRemapear());
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
    if (temCrop && macroAtivo) totalSteps++; // ajustar img quadrada

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
          // Espera o diálogo de remapeamento fechar e a página recarregar
          for (let r = 0; r < 20; r++) {
            const dlg = document.querySelector('.ant-modal-content');
            if (!dlg) break;
            await sleep(250);
          }
        } catch (e) { /* ignore remap errors */ }
        if (window.__upsCancelMacro) { finalizarMacroCancelada(selectedTable); return; }
      }

      chrome.storage.local.get(["biblioteca", "bibliotecaAtributos"], async (res) => {
        try {
          // 1.5 — Confirmar Cores (antes da Subespecificação)
          if (confirmarCoresAtivo && macroAtivo) {
            const coresPagina = await esperarAtualizacaoCores(needsRemap);
            if (coresPagina.length > 0) {
              nextStep('Aguardando confirmação de cores...');
              const result = await mostrarDialogoConfirmarCores(coresPagina);
              if (result.confirmou) {
          await Promise.race([aplicarCoresNaPagina(result.cores), new Promise(function(_, reject) { setTimeout(function() { reject(new Error('timeout')); }, 30000); })]).catch(function() {});
                await sleep(250);
              }
              if (window.__upsCancelMacro) { finalizarMacroCancelada(selectedTable); return; }
            }
          }

          // 2 — Subespecificação
          if (temSub && macroAtivo) {
            nextStep('Aplicando Subespecificação...');
            const subRes = await subespecificacaoMassa(document.getElementById('ups-ma-sub').value.trim());
            if (window.__upsCancelMacro) { finalizarMacroCancelada(selectedTable); return; }
            var _rowsSub = document.querySelectorAll('.vxe-body--row').length;
            for (var _s = 0; _s < 20; _s++) { await sleep(500); var _nr = document.querySelectorAll('.vxe-body--row').length; if (_nr > _rowsSub * 1.2) break; if (_s >= 3 && _nr === _rowsSub) break; }
          }

          // 3 — Editar em Massa + Preço Especial (bulk: 1 scroll cycle)
          const cols = encontrarColunasMassa();
          const eq = document.getElementById('ups-ma-eq').value.trim();
          const ep = document.getElementById('ups-ma-ep').value.trim();
          const ew = document.getElementById('ups-ma-ew').value.trim();
          const epkg = document.getElementById('ups-ma-epkg').value.trim();

          var bulkCols = [];
          if (eq && cols.quant) bulkCols.push({fn: function(row, ns) { var cell = row.querySelector('.' + cols.quant); if (!cell) return false; var inp = cell.querySelector('input.ant-input.ant-input-sm'); if (!inp || inp.disabled || inp.value === eq) return false; inp.focus(); ns.call(inp, eq); inp.dispatchEvent(new Event('input', {bubbles:true})); inp.dispatchEvent(new Event('change', {bubbles:true})); inp.blur(); return true; }});
          if (ep && cols.preco) bulkCols.push({fn: function(row, ns) { var cell = row.querySelector('.' + cols.preco); if (!cell) return false; var inp = cell.querySelector('input.ant-input-number-input'); if (!inp || inp.disabled || inp.value === ep) return false; inp.focus(); ns.call(inp, ep); inp.dispatchEvent(new Event('input', {bubbles:true})); inp.dispatchEvent(new Event('change', {bubbles:true})); inp.blur(); return true; }});
          if (ew && cols.peso) bulkCols.push({fn: function(row, ns) { var cell = row.querySelector('.' + cols.peso); if (!cell) return false; var inp = cell.querySelector('input.ant-input-number-input'); if (!inp || inp.disabled || inp.value === ew) return false; inp.focus(); ns.call(inp, ew); inp.dispatchEvent(new Event('input', {bubbles:true})); inp.dispatchEvent(new Event('change', {bubbles:true})); inp.blur(); return true; }});
          if (epkg) {
            var pacoteCol = cols.pacote;
            if (!pacoteCol) { var _t = document.querySelector('.vxe-table'); if (_t) _t.querySelectorAll('.vxe-header--column').forEach(function(h) { if (h.textContent.trim().toLowerCase().includes('pacote')) pacoteCol = Array.from(h.classList).find(function(x) { return x.startsWith('col_'); }); }); }
            const sep = epkg.includes('x') ? 'x' : ',';
            var pkgParts = epkg.split(sep).map(function(s) { return s.trim(); });
            bulkCols.push({fn: function(row, ns) { var pc = pacoteCol; if (!pc) { var _cl = row.querySelectorAll('td, .vxe-body--column'); for (var _i = 0; _i < _cl.length; _i++) { if (_cl[_i].querySelectorAll('input.ant-input-number-input').length >= 3) { pc = Array.from(_cl[_i].classList).find(function(x) { return x.startsWith('col_'); }); break; } } } if (!pc) return false; var cell = row.querySelector('.' + pc); if (!cell) return false; var inputs = cell.querySelectorAll('input.ant-input-number-input'); if (inputs.length === 0) inputs = cell.querySelectorAll('input'); for (var i = 0; i < Math.min(pkgParts.length, inputs.length); i++) { if (!inputs[i].disabled && inputs[i].value !== pkgParts[i]) { inputs[i].focus(); ns.call(inputs[i], pkgParts[i]); inputs[i].dispatchEvent(new Event('input', {bubbles:true})); inputs[i].dispatchEvent(new Event('change', {bubbles:true})); inputs[i].blur(); } } return true; }});
          }
          // Preço Especial integrado no mesmo bulk
          if (aplicarPreco && bulkPrice) {
            var tamColPS = 'col_3', priceColPS = 'col_7';
            var allHeadersPS = document.querySelector('.vxe-table').querySelectorAll('.vxe-header--column');
            allHeadersPS.forEach(function(cell) { var t = cell.textContent.trim().toLowerCase(); if (!t) return; var c = Array.from(cell.classList).find(function(x) { return x.startsWith('col_'); }); if (!c) return; if (t === 'tamanho' || (t.indexOf('tamanho') !== -1 && t.indexOf('pacote') === -1) || ['variação','grade'].some(function(k){return t.indexOf(k)!==-1;})) tamColPS = c; if (t.indexOf('preço especial') !== -1 || t.indexOf('preco especial') !== -1) priceColPS = c; });
            if (priceColPS === 'col_7') { var _ePS = Array.from(allHeadersPS).some(function(h) { return h.textContent.trim().toLowerCase().includes('estado'); }); if (_ePS) priceColPS = 'col_8'; }
            var listaTam = ["PP","P","M","G","GG","EGG","G1","G2","G3","G4","G5","2","4","6","8","10","12","14","16"];
            if (priceColPS) bulkCols.push({fn: function(row, ns) { if (linhaBloqueada(row)) return false; var tamEl = row.querySelector('.' + tamColPS); if (!tamEl) return false; var val = bulkPrice; var tamText = tamEl.textContent.trim().toUpperCase(); var tam = listaTam.reduce(function(found, t) { return tamText.indexOf(t) !== -1 ? (t.length > found.length ? t : found) : found; }, ''); if (tam && overrides[tam]) val = overrides[tam]; var inp = row.querySelector('.' + priceColPS + ' input.ant-input-number-input'); if (!inp || inp.disabled) return false; if (inp.value === val) return false; inp.focus(); ns.call(inp, val); inp.dispatchEvent(new Event('input', {bubbles:true})); inp.dispatchEvent(new Event('change', {bubbles:true})); inp.blur(); return true; }});
          }
          if (bulkCols.length) {
            if (temEmMassa && macroAtivo) { await sleep(500); nextStep('Aplicando Editar em Massa...'); }
            if (aplicarPreco && bulkPrice) { nextStep('Aplicando preços...'); chrome.storage.local.set({ ultimosPrecos: { bulkPrice, overrides: { ...overrides } } }); }
            await setColunasEmMassaBulk(bulkCols);
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
                var nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
                nativeSetter.call(ta, dados.descricao);
                ta.dispatchEvent(new Event('input', { bubbles: true }));
                ta.dispatchEvent(new Event('change', { bubbles: true }));
                ta.blur();
                ta.scrollTop = 0;
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
            if (expandirAtributos()) { await esperarAtributosExpandirem(); }
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
            const _skuRes = await gerarSkuEmMassa();
            if (_skuRes && _skuRes.error) { mostrarFeedback('SKU: ' + _skuRes.error, '#dc3545'); }
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

          // 9 — Ajustar Imagem Quadrada (must be last — triggers dialog)
          if (temCrop && macroAtivo) {
            nextStep('Ajustando imagem quadrada...');
            try {
              await ajustarCoresERecortar();
            } catch (e) {
              mostrarErroOverlayProgresso('Erro no ajuste: ' + e.message);
              setTimeout(() => removerOverlayProgresso(), 3000);
              return;
            }
            if (window.__upsCancelMacro) { finalizarMacroCancelada(selectedTable); return; }
          }

          // Save ultimosMacros
          chrome.storage.local.set({
            ultimosMacros: {
              sub: document.getElementById('ups-ma-sub').value.trim(),
              subAtivo: document.getElementById('ups-ma-sub-ativar').checked,
              emMassa: {
                quantidade: document.getElementById('ups-ma-eq').value.trim(),
                preco: document.getElementById('ups-ma-ep').value.trim(),
                peso: document.getElementById('ups-ma-ew').value.trim(),
                pacote: document.getElementById('ups-ma-epkg').value.trim()
              },
              sku: temSku,
              crop: temCrop,
              confirmarCores: document.getElementById('ups-ma-confirmar-cores').checked,
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
function abrirPopupEditarMedidas(nomeExistente, bib, chavesFixas, atualizarSelectMedidas, atualizarDesc) {
  const existing = document.getElementById('ups-popup-medidas');
  if (existing) existing.remove();

  // Buscar dados mais recentes do storage
  chrome.storage.local.get(["biblioteca"], (res) => {
    const bibAtualizada = res.biblioteca || {};
    const dados = (nomeExistente && bibAtualizada[nomeExistente]) ? bibAtualizada[nomeExistente] : {};

    const div = document.createElement('div');
    div.id = 'ups-popup-medidas';
    div.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;z-index:9999999;font-family:sans-serif;';
    div.addEventListener('click', function(e) { if (e.target === div) div.remove(); });

    const inner = document.createElement('div');
    inner.style.cssText = 'background:white;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.25);width:520px;max-width:95vw;max-height:85vh;overflow-y:auto;padding:16px;';

    const titulo = nomeExistente ? `Editar "${nomeExistente}"` : 'Criar Nova Tabela de Medidas';

    inner.innerHTML = `
<div style="font-size:14px;font-weight:bold;margin-bottom:10px;">${titulo}</div>
<label style="font-size:11px;font-weight:600;display:block;margin-bottom:4px;">Nome da Tabela</label>
<input id="ups-pm-nome" type="text" value="${nomeExistente || ''}" placeholder="Ex: PP-16" style="width:100%;padding:4px;border:1px solid #ccc;border-radius:4px;font-size:11px;box-sizing:border-box;margin-bottom:6px;">
<label style="font-size:11px;font-weight:600;display:block;margin-bottom:4px;">Descrição</label>
<textarea id="ups-pm-desc" placeholder="Descrição do produto (opcional)..." style="width:100%;padding:4px;border:1px solid #ccc;border-radius:4px;font-size:11px;box-sizing:border-box;margin-bottom:6px;height:40px;resize:vertical;font-family:sans-serif;">${(dados.descricao || '')}</textarea>
<label style="font-size:11px;font-weight:600;display:block;margin-bottom:4px;">Tópicos (Temu)</label>
<textarea id="ups-pm-topicos" placeholder="Um tópico por linha (opcional, apenas Temu)..." style="width:100%;padding:4px;border:1px solid #ccc;border-radius:4px;font-size:11px;box-sizing:border-box;margin-bottom:6px;height:40px;resize:vertical;font-family:sans-serif;">${((dados.topicos || []).join('\n'))}</textarea>
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
    div.appendChild(inner);

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
<thead><tr style="background:#eee;"><th style="padding:2px 6px;border:1px solid #ccc;font-size:11px;text-align:left;">Tamanho</th><th style="padding:2px 6px;border:1px solid #ccc;font-size:11px;text-align:left;">Largura</th><th style="padding:2px 6px;border:1px solid #ccc;font-size:11px;text-align:left;">Altura</th><th style="padding:2px 6px;border:1px solid #ccc;font-size:11px;text-align:center;width:30px;"></th></tr></thead>
<tbody>${tamanhos.map(t => `
<tr><td style="padding:2px 6px;border:1px solid #ccc;font-size:11px;font-weight:bold;text-transform:uppercase;">${t}</td>
<td style="padding:2px 6px;border:1px solid #ccc;"><input class="ups-pm-g-b" data-tam="${t}" type="text" value="${tabela[t].b || ''}" placeholder="Largura" style="width:60px;padding:2px 4px;border:1px solid #ccc;border-radius:2px;font-size:11px;box-sizing:border-box;"></td>
<td style="padding:2px 6px;border:1px solid #ccc;"><input class="ups-pm-g-c" data-tam="${t}" type="text" value="${tabela[t].c || ''}" placeholder="Altura" style="width:60px;padding:2px 4px;border:1px solid #ccc;border-radius:2px;font-size:11px;box-sizing:border-box;"></td>
<td style="padding:2px;border:1px solid #ccc;text-align:center;"><button data-tam="${t}" class="ups-pm-rm" style="padding:0px 6px;border:1px solid #dc3545;color:#dc3545;border-radius:2px;cursor:pointer;font-size:12px;background:white;line-height:1.2;">×</button></td></tr>`).join('')}
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
      const topicosRaw = document.getElementById('ups-pm-topicos').value.trim();
      const topicos = topicosRaw ? topicosRaw.split('\n').map(function(l) { return l.trim(); }).filter(Boolean) : [];

      // Coletar valores do grid
      const novaTabela = { descricao: desc, topicos: topicos };
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
${opts.input ? '<input id="ups-dialog-input" type="text" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;font-size:14px;box-sizing:border-box;margin-bottom:12px;" placeholder="' + (opts.placeholder || '') + '" value="' + (opts.value || '') + '" data-bwignore="" data-1p-ignore="" autocomplete="off">' : ''}
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
        if (!input || input.disabled) return;
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
      await sleep(200);
      total += setRows();
    }
    bodyWrapper.scrollTop = maxScroll;
    await sleep(200);
    total += setRows();
  }
  if (bodyWrapper) {
    bodyWrapper.scrollLeft = 0;
    bodyWrapper.scrollTop = 0;
  }
  return { success: true, total };
}
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
#ups-slider-preco, #ups-slider-macro, #ups-ps-sub-slider { background:#ccc; }
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
#ups-ps-sub-ativar:checked + #ups-ps-sub-slider { background:#28a745; }
#ups-ps-sub-ativar:checked + #ups-ps-sub-slider::before { transform:translateX(16px); }
#ups-ps-sub-slider::before {
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
<div style="position:relative;display:flex;gap:4px;margin-bottom:8px;">
<input id="ups-pt" type="text" placeholder="Ex: PP" style="flex:1;padding:6px 8px;border:1px solid #ccc;border-radius:4px;font-size:13px;box-sizing:border-box;text-transform:uppercase;">
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
<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
<label style="font-size:13px;font-weight:600;">Subespecificação - Tamanhos para marcar</label>
<label style="position:relative;display:inline-block;width:36px;height:20px;cursor:pointer;">
<input type="checkbox" id="ups-ps-sub-ativar" checked style="opacity:0;width:0;height:0;margin:0;">
<span id="ups-ps-sub-slider" style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;border-radius:20px;transition:.3s;"></span>
</label>
</div>
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
            <input type="checkbox" id="ups-ps-crop" style="margin:0;"> Ajustar Imagens
            </label>
            <label style="font-size:13px;font-weight:600;display:flex;align-items:center;gap:4px;white-space:nowrap;">
            <input type="checkbox" id="ups-ps-confirmar-cores" style="margin:0;"> Confirmar cores?
            </label>
            <label style="font-size:13px;font-weight:600;display:flex;align-items:center;gap:4px;white-space:nowrap;">
            <input type="checkbox" id="ups-p-remap" style="margin:0;"> F. Remapeamento
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

  function salvarEstadoPS() {
    chrome.storage.local.set({
      ultimosPrecos: {
        bulkPrice: document.getElementById('ups-pb').value.trim(),
        overrides: { ...overrides },
        ativarPreco: document.getElementById('ups-ativar-preco').checked
      },
      ultimosMacros: {
        sub: document.getElementById('ups-ps-sub').value.trim(),
        subAtivo: document.getElementById('ups-ps-sub-ativar').checked,
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
      }
    });
  }

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay.firstElementChild) {
      salvarEstadoPS();
      overlay.remove();
    }
  });

  // Dropdown customizado de tamanhos
  function extrairTamanhosDaTabela() {
    // Ler direto do storage (evita problemas com scroll virtual do VXE)
    return new Promise((resolve) => {
      chrome.storage.local.get(["biblioteca", "ultimaSelecionada"], (res) => {
        const bib = res.biblioteca || {};
        const sel = res.ultimaSelecionada || '';
        const dados = bib[sel];
        if (dados) {
          const chavesFixas = new Set(['descricao','topicos','macros','precos','emMassa','sku','crop','confirmarCores','ativar','sub','quantidade','preco','peso','pacote','paisOrigem']);
          const tamanhos = Object.keys(dados).filter(k => !chavesFixas.has(k) && dados[k] && typeof dados[k] === 'object' && (dados[k].b || dados[k].c));
          console.log('[UPS-prec] Tamanhos do storage:', tamanhos);
          resolve(tamanhos.sort((a, b) => {
            const order = ["PP","P","M","G","GG","EGG","G1","G2","G3","G4","G5","2","4","6","8","10","12","14","16"];
            const ai = order.indexOf(a), bi = order.indexOf(b);
            if (ai !== -1 && bi !== -1) return ai - bi;
            if (ai !== -1) return -1;
            if (bi !== -1) return 1;
            return a.localeCompare(b);
          }));
          return;
        }
        // Fallback: ler do DOM
        const table = document.querySelector('.vxe-table');
        console.log('[UPS-prec] Fallback DOM - Tabela:', !!table);
        if (!table) { resolve([]); return; }
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
        resolve(Array.from(encontrados).sort((a, b) => {
          const order = ["PP","P","M","G","GG","EGG","G1","G2","G3","G4","G5","2","4","6","8","10","12","14","16"];
          return order.indexOf(a) - order.indexOf(b);
        }));
      });
    });
  }

  function renderOverridesLocal() {
    const c = document.getElementById('ups-po');
    const keys = Object.keys(overrides);
    if (keys.length === 0) { c.innerHTML = '<span style="color:#999;">Nenhum override</span>'; return; }
    c.innerHTML = keys.map(t =>
      `<span class="ups-tag"><b>${t}</b>: R$ ${overrides[t]} <span class="ups-tag-rm" data-ov-del="${t}">×</span></span>`
    ).join('');
    const handler = c._ovClickDel;
    if (handler) c.removeEventListener('click', handler);
    c._ovClickDel = function(e) {
      var del = e.target.closest('[data-ov-del]');
      if (del) { delete overrides[del.getAttribute('data-ov-del')]; renderOverridesLocal(); }
    };
    c.addEventListener('click', c._ovClickDel);
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
      if (dados.subAtivo !== undefined) document.getElementById('ups-ps-sub-ativar').checked = !!dados.subAtivo;
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
      subAtivo: document.getElementById('ups-ps-sub-ativar').checked,
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
      if (savedM.subAtivo !== undefined) document.getElementById('ups-ps-sub-ativar').checked = !!savedM.subAtivo;
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
    const tam = document.getElementById('ups-pt').value.trim().toUpperCase();
    const val = document.getElementById('ups-pv').value.trim();
    if (!tam || !val) return;
    overrides[tam] = val;
    document.getElementById('ups-pt').value = '';
    document.getElementById('ups-pv').value = '';
    document.getElementById('ups-pt').focus();
    renderOverridesLocal();
  };

  document.getElementById('ups-pc').onclick = () => { salvarEstadoPS(); overlay.remove(); };

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
    const subAtivo = document.getElementById('ups-ps-sub-ativar').checked;
    const subVal = subAtivo ? document.getElementById('ups-ps-sub').value.trim() : '';
    const eqVal = document.getElementById('ups-eq').value.trim();
    const epVal = document.getElementById('ups-ep').value.trim();
    const ewVal = document.getElementById('ups-ew').value.trim();
    const epkgVal = document.getElementById('ups-epkg').value.trim();
    const pbVal = document.getElementById('ups-pb').value.trim();
    const skuChecked = document.getElementById('ups-ps-sku').checked;
    const cropChecked = document.getElementById('ups-ps-crop').checked;
    const confirmarCoresChecked = document.getElementById('ups-ps-confirmar-cores').checked;
    const forcarRemap = document.getElementById('ups-p-remap').checked;

    overlay.remove();
    await sleep(100);
    const startTime = Date.now();
    const steps = [];

    if (macroAtivo && subVal) steps.push('sub');
    if (macroAtivo && [eqVal, epVal, ewVal, epkgVal].some(v => v !== '')) { steps.push('massa'); }
    if (precoAtivo && pbVal) steps.push('precoEspecial');
    if (macroAtivo && skuChecked) steps.push('sku');
    if (macroAtivo && cropChecked) steps.push('crop');
    if (macroAtivo && confirmarCoresChecked && lerCoresEspecificacaoPrincipal().length > 0) steps.push('confirmarCores');
    if (forcarRemap) steps.unshift('remap');

    let stepIdx = 0;

    // -1. Remapeamento (antes de tudo)
    if (steps.includes('remap')) {
      stepIdx++;
      criarOverlayProgresso();
      atualizarOverlayProgresso({ message: 'Remapeando...', step: stepIdx, total: steps.length });
      try {
        await runAutomation(() => {});
        for (let r = 0; r < 20; r++) {
          const dlg = document.querySelector('.ant-modal-content');
          if (!dlg) break;
          await sleep(250);
        }
      } catch (e) { /* silent */ }
    }

    // 0. Confirmar Cores (before sub)
    if (steps.includes('confirmarCores')) {
      stepIdx++;
      criarOverlayProgresso();
      atualizarOverlayProgresso({ message: 'Aguardando confirmação de cores...', step: stepIdx, total: steps.length });
      const coresPagina = lerCoresEspecificacaoPrincipal();
      if (coresPagina.length > 0) {
        const result = await mostrarDialogoConfirmarCores(coresPagina);
        if (result.confirmou) {
              aplicarCoresNaPagina(result.cores); // fire-and-forget, não bloqueia próxima etapa
          await sleep(250);
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
      var _rowsSub = document.querySelectorAll('.vxe-body--row').length;
      for (var _s = 0; _s < 20; _s++) { await sleep(500); var _nr = document.querySelectorAll('.vxe-body--row').length; if (_nr > _rowsSub * 1.2) break; if (_s >= 3 && _nr === _rowsSub) break; }
    }

    // 2. Editar em Massa + Preço Especial (single scroll cycle)
    var popupColsAll = [];
    var colsBulk = encontrarColunasMassa();

    // 2a. Editar em Massa (quantidade, preço regular, peso, pacote)
    if (steps.includes('massa')) {
      if (eqVal && colsBulk.quant) popupColsAll.push({fn: function(row, ns) { var c = row.querySelector('.' + colsBulk.quant); if (!c) return false; var inp = c.querySelector('input.ant-input.ant-input-sm'); if (!inp || inp.disabled || inp.value === eqVal) return false; inp.focus(); ns.call(inp, eqVal); inp.dispatchEvent(new Event('input', {bubbles:true})); inp.dispatchEvent(new Event('change', {bubbles:true})); inp.blur(); return true; }});
      if (epVal && colsBulk.preco) popupColsAll.push({fn: function(row, ns) { if (linhaBloqueada(row)) return false; var c = row.querySelector('.' + colsBulk.preco); if (!c) return false; var inp = c.querySelector('input.ant-input-number-input'); if (!inp || inp.disabled) return false; inp.focus(); ns.call(inp, epVal); inp.dispatchEvent(new Event('input', {bubbles:true})); inp.dispatchEvent(new Event('change', {bubbles:true})); inp.blur(); return true; }});
      if (ewVal && colsBulk.peso) popupColsAll.push({fn: function(row, ns) { var c = row.querySelector('.' + colsBulk.peso); if (!c) return false; var inp = c.querySelector('input.ant-input-number-input'); if (!inp || inp.disabled || inp.value === ewVal) return false; inp.focus(); ns.call(inp, ewVal); inp.dispatchEvent(new Event('input', {bubbles:true})); inp.dispatchEvent(new Event('change', {bubbles:true})); inp.blur(); return true; }});
      if (epkgVal) {
        var pacoteColM = colsBulk.pacote;
        if (!pacoteColM) { var _t = document.querySelector('.vxe-table'); if (_t) _t.querySelectorAll('.vxe-header--column').forEach(function(h) { if (h.textContent.trim().toLowerCase().includes('pacote')) pacoteColM = Array.from(h.classList).find(function(x) { return x.startsWith('col_'); }); }); }
        var sepP = epkgVal.indexOf('x') !== -1 ? 'x' : ',';
        var pkgP = epkgVal.split(sepP).map(function(s) { return s.trim(); });
        popupColsAll.push({fn: function(row, ns) { var pc = pacoteColM; if (!pc) { var _cl = row.querySelectorAll('td, .vxe-body--column'); for (var _i = 0; _i < _cl.length; _i++) { if (_cl[_i].querySelectorAll('input.ant-input-number-input').length >= 3) { pc = Array.from(_cl[_i].classList).find(function(x) { return x.startsWith('col_'); }); break; } } } if (!pc) return false; var c = row.querySelector('.' + pc); if (!c) return false; var inputs = c.querySelectorAll('input.ant-input-number-input'); if (inputs.length === 0) inputs = c.querySelectorAll('input'); for (var i = 0; i < Math.min(pkgP.length, inputs.length); i++) { if (!inputs[i].disabled && inputs[i].value !== pkgP[i]) { inputs[i].focus(); ns.call(inputs[i], pkgP[i]); inputs[i].dispatchEvent(new Event('input', {bubbles:true})); inputs[i].dispatchEvent(new Event('change', {bubbles:true})); inputs[i].blur(); } } return true; }});
      }
    }

    // 2b. Preço Especial (desconto)
    if (precoAtivo && pbVal) {
      var tamColPP = 'col_3', priceColPP = 'col_7';
      var allHPP = document.querySelector('.vxe-table').querySelectorAll('.vxe-header--column');
      allHPP.forEach(function(cell) { var t = cell.textContent.trim().toLowerCase(); if (!t) return; var cl = Array.from(cell.classList).find(function(x) { return x.indexOf('col_') === 0; }); if (!cl) return; if (t === 'tamanho' || (t.indexOf('tamanho') !== -1 && t.indexOf('pacote') === -1)) tamColPP = cl; if (t.indexOf('preço especial') !== -1 || t.indexOf('preco especial') !== -1) priceColPP = cl; });
      if (priceColPP === 'col_7') { var _ePP = Array.from(allHPP).some(function(h) { return h.textContent.trim().toLowerCase().includes('estado'); }); if (_ePP) priceColPP = 'col_8'; }
      var listaTPP = ["PP","P","M","G","GG","EGG","G1","G2","G3","G4","G5","2","4","6","8","10","12","14","16"];
      if (priceColPP) popupColsAll.push({fn: function(row, ns) { if (linhaBloqueada(row)) return false; var tamEl = row.querySelector('.' + tamColPP); if (!tamEl) return false; var val = pbVal; var tamText = tamEl.textContent.trim().toUpperCase(); var tam = listaTPP.reduce(function(found, t) { return tamText.indexOf(t) !== -1 ? (t.length > found.length ? t : found) : found; }, ''); if (tam && overrides[tam]) val = overrides[tam]; var inp = row.querySelector('.' + priceColPP + ' input.ant-input-number-input'); if (!inp || inp.disabled) return false; if (inp.value === val) return false; inp.focus(); ns.call(inp, val); inp.dispatchEvent(new Event('input', {bubbles:true})); inp.dispatchEvent(new Event('change', {bubbles:true})); inp.blur(); return true; }});
    }

    // 2. Single scroll cycle (Editar em Massa + Preço Especial juntos)
    if (popupColsAll.length) {
      stepIdx++;
      criarOverlayProgresso();
      var msgPartes = [];
      if (steps.includes('massa')) msgPartes.push('Editar em Massa');
      if (precoAtivo && pbVal) msgPartes.push('Preço Especial');
      atualizarOverlayProgresso({ message: 'Aplicando ' + msgPartes.join(' + ') + '...', step: stepIdx, total: steps.length });
      await setColunasEmMassaBulk(popupColsAll);
    }

    // 4. SKU Gerar
    if (steps.includes('sku')) {
      stepIdx++;
      criarOverlayProgresso();
      atualizarOverlayProgresso({ message: 'Gerando SKU...', step: stepIdx, total: steps.length });
      const skuRes = await gerarSkuEmMassa();
      if (skuRes.error) {
        // Não deixa a overlay travada: mostra o erro brevemente e remove.
        mostrarErroOverlayProgresso(skuRes.error);
        await sleep(2000);
        removerOverlayProgresso();
        return;
      }
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
        try {
          await ajustarCoresERecortar();
        } catch (e) {
          mostrarErroOverlayProgresso('Erro no recorte: ' + e.message);
          setTimeout(() => removerOverlayProgresso(), 3000);
          return;
        }
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
          subAtivo: subAtivo,
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
// ========== EDITAR EM MASSA ==========
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
    else if (txt.includes('preço') && !txt.includes('especial') && !txt.includes('desconto')) map.preco = cls;
    else if (txt.includes('peso')) map.peso = cls;
    else if (txt.includes('pacote')) map.pacote = cls;
    else if (txt.includes('estado')) map.estado = cls;
  });
  if (!map.pacote) {
    if (map.estado || map.quant === 'col_6') {
      map.pacote = 'col_10';
    } else if (map.quant === 'col_5') {
      map.pacote = 'col_9';
    } else {
      var _eh = Array.from(allHeaders).some(function(h) { return h.textContent.trim().toLowerCase().includes('estado'); });
      map.pacote = _eh ? 'col_10' : 'col_9';
    }
  }
  return map;
}

function linhaBloqueada(row) {
  var chk = row.querySelector('.vxe-cell--checkbox');
  return chk && (chk.classList.contains('is--disabled') || chk.closest('.vxe-body--column').classList.contains('is--disabled'));
}

async function setColunasEmMassaBulk(colunas) {
  if (!colunas || !colunas.length) return;

  const table = document.querySelector('.vxe-table');
  if (!table) { return; }

  const bodyWrapper = table.querySelector('.vxe-table--body-wrapper');
  const maxScroll = bodyWrapper ? bodyWrapper.scrollHeight - bodyWrapper.clientHeight : 0;
  const scrollStep = bodyWrapper ? Math.max(bodyWrapper.clientHeight - 40, 80) : 80;
  const ns = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  const maxX = bodyWrapper ? bodyWrapper.scrollWidth - bodyWrapper.clientWidth : 0;

  // Garantir que comece do topo: com virtual scroll, as linhas do início só existem no DOM na posição 0.
  if (bodyWrapper) { bodyWrapper.scrollLeft = 0; bodyWrapper.scrollTop = 0; }
  await sleep(200);

  function setRows() {
    const rows = table.querySelectorAll('.vxe-body--row');
    let count = 0;
    rows.forEach(row => {
      colunas.forEach(col => {
        try { if (col.fn && col.fn(row, ns)) { count++; } } catch(e) {}
      });
    });
    return count;
  }

  async function capturarDualAxis() {
    var c = setRows();
    if (maxX > 0) {
      bodyWrapper.scrollLeft = maxX;
      await sleep(150);
      c += setRows();
      bodyWrapper.scrollLeft = 0;
      await sleep(50);
    }
    return c;
  }

  let total = await capturarDualAxis();
  if (bodyWrapper && maxScroll > 0) {
    for (let pos = scrollStep; pos < maxScroll; pos += scrollStep) {
      bodyWrapper.scrollTop = pos;
      await sleep(200);
      total += await capturarDualAxis();
    }
    bodyWrapper.scrollTop = maxScroll;
    await sleep(200);
    total += await capturarDualAxis();
  }
  if (bodyWrapper) {
    bodyWrapper.scrollLeft = 0;
    bodyWrapper.scrollTop = 0;
  }
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
          if (inp.disabled) continue;
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

  let total = setRows();
  if (bodyWrapper && maxScroll > 0) {
    for (let pos = scrollStep; pos < maxScroll; pos += scrollStep) {
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
  if (bodyWrapper) {
    bodyWrapper.scrollLeft = 0;
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
// ================================================== MESSAGE ROUTER ==================================================


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'start-remap-full') {
    criarOverlayProgresso();
    let step = 0;
    runAutomation((p) => {
      step++;
      atualizarOverlayProgresso({ message: p.message, step, total: p.total || step });
      chrome.runtime.sendMessage({ action: 'progress', ...p });
    }).then(async () => {
      await sleep(1500);
      try {
        step++;
        atualizarOverlayProgresso({ message: 'Gerando SKU...', step: step, total: step });
        await gerarSkuEmMassa();
      } catch(e) { /* silent */ }
      atualizarOverlayProgresso({ message: '✓ Concluído', step: step, total: step });
      await sleep(500);
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
    removerOverlayProgresso();
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
        if (config.forcarRemap || precisaRemapear()) totalSteps++;
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
        if (hasMacro && macro.crop) totalSteps++; // ajustar img quadrada

        function stepDone(msg) {
          progressStep++;
          chrome.runtime.sendMessage({ action: 'progress', message: msg, step: progressStep, total: totalSteps });
        }

        var teveRemap = config.forcarRemap || precisaRemapear();
        if (teveRemap) {
          try {
            stepDone('Remapeando...');
            await runAutomation(() => {});
            // Espera o diálogo de remapeamento fechar e a página recarregar
            for (let r = 0; r < 20; r++) {
              const dlg = document.querySelector('.ant-modal-content');
              if (!dlg) break;
              await sleep(250);
            }
          } catch (e) { /* silent */ }
          if (window.__upsCancelMacro) { chrome.runtime.sendMessage({ action: 'error', message: 'Cancelado' }); return; }
        }
        // Confirmar Cores (antes da Subespecificação)
        if (config.confirmarCores) {
          const coresPagina = await esperarAtualizacaoCores(teveRemap);
          if (coresPagina.length > 0) {
            stepDone('Aguardando confirmação de cores...');
            const result = await mostrarDialogoConfirmarCores(coresPagina);
            if (result.confirmou) {
                aplicarCoresNaPagina(result.cores); // fire-and-forget, não bloqueia próxima etapa
              await sleep(250);
              }
          }
        }

        // Macros (ordem: sub → emMassa)
        if (hasMacro) {
          if (macro.sub && macro.subAtivo !== false) {
            stepDone('Aplicando Subespecificação...');
            await subespecificacaoMassa(macro.sub);
            if (window.__upsCancelMacro) { chrome.runtime.sendMessage({ action: 'error', message: 'Cancelado' }); return; }
            await sleep(2000);
          }
          if (macro.emMassa && (macro.emMassa.quantidade || macro.emMassa.preco || macro.emMassa.peso || macro.emMassa.pacote)) {
            await sleep(500);
            stepDone('Aplicando Editar em Massa...');
            const cols = encontrarColunasMassa();
            var mcCols = [];
            if (macro.emMassa.quantidade && cols.quant) mcCols.push({fn: function(row, ns) { var cell = row.querySelector('.' + cols.quant); if (!cell) return false; var inp = cell.querySelector('input.ant-input.ant-input-sm'); if (!inp || inp.disabled || inp.value === macro.emMassa.quantidade) return false; inp.focus(); ns.call(inp, macro.emMassa.quantidade); inp.dispatchEvent(new Event('input', {bubbles:true})); inp.dispatchEvent(new Event('change', {bubbles:true})); inp.blur(); return true; }});
            if (macro.emMassa.preco && cols.preco) mcCols.push({fn: function(row, ns) { var cell = row.querySelector('.' + cols.preco); if (!cell) return false; var inp = cell.querySelector('input.ant-input-number-input'); if (!inp || inp.disabled || inp.value === macro.emMassa.preco) return false; inp.focus(); ns.call(inp, macro.emMassa.preco); inp.dispatchEvent(new Event('input', {bubbles:true})); inp.dispatchEvent(new Event('change', {bubbles:true})); inp.blur(); return true; }});
            if (macro.emMassa.peso && cols.peso) mcCols.push({fn: function(row, ns) { var cell = row.querySelector('.' + cols.peso); if (!cell) return false; var inp = cell.querySelector('input.ant-input-number-input'); if (!inp || inp.disabled || inp.value === macro.emMassa.peso) return false; inp.focus(); ns.call(inp, macro.emMassa.peso); inp.dispatchEvent(new Event('input', {bubbles:true})); inp.dispatchEvent(new Event('change', {bubbles:true})); inp.blur(); return true; }});
            if (macro.emMassa.pacote) {
              var pacoteColMC = cols.pacote;
              if (!pacoteColMC) { var _t = document.querySelector('.vxe-table'); if (_t) _t.querySelectorAll('.vxe-header--column').forEach(function(h) { if (h.textContent.trim().toLowerCase().includes('pacote')) pacoteColMC = Array.from(h.classList).find(function(x) { return x.startsWith('col_'); }); }); }
              const sep = macro.emMassa.pacote.includes('x') ? 'x' : ',';
              var mpParts = macro.emMassa.pacote.split(sep).map(function(s) { return s.trim(); });
              mcCols.push({fn: function(row, ns) { var pc = pacoteColMC; if (!pc) { var _cl = row.querySelectorAll('td, .vxe-body--column'); for (var _i = 0; _i < _cl.length; _i++) { if (_cl[_i].querySelectorAll('input.ant-input-number-input').length >= 3) { pc = Array.from(_cl[_i].classList).find(function(x) { return x.startsWith('col_'); }); break; } } } if (!pc) return false; var cell = row.querySelector('.' + pc); if (!cell) return false; var inputs = cell.querySelectorAll('input.ant-input-number-input'); if (inputs.length === 0) inputs = cell.querySelectorAll('input'); for (var i = 0; i < Math.min(mpParts.length, inputs.length); i++) { if (!inputs[i].disabled && inputs[i].value !== mpParts[i]) { inputs[i].focus(); ns.call(inputs[i], mpParts[i]); inputs[i].dispatchEvent(new Event('input', {bubbles:true})); inputs[i].dispatchEvent(new Event('change', {bubbles:true})); inputs[i].blur(); } } return true; }});
            }
            // Preço Especial integrado
            if (config.bulkPrice) {
              var tamColM = 'col_3', priceColM = 'col_7';
              var allHeadersM = document.querySelector('.vxe-table').querySelectorAll('.vxe-header--column');
              allHeadersM.forEach(function(cell) { var t = cell.textContent.trim().toLowerCase(); if (!t) return; var c = Array.from(cell.classList).find(function(x) { return x.startsWith('col_'); }); if (!c) return; if (t === 'tamanho' || (t.indexOf('tamanho') !== -1 && t.indexOf('pacote') === -1)) tamColM = c; if (t.indexOf('preço especial') !== -1 || t.indexOf('preco especial') !== -1) priceColM = c; });
              if (priceColM === 'col_7') { var _eM = Array.from(allHeadersM).some(function(h) { return h.textContent.trim().toLowerCase().includes('estado'); }); if (_eM) priceColM = 'col_8'; }
              var listaTamM = ["PP","P","M","G","GG","EGG","G1","G2","G3","G4","G5","2","4","6","8","10","12","14","16"];
              var ov = config.overrides || {};
              if (priceColM) mcCols.push({fn: function(row, ns) { if (linhaBloqueada(row)) return false; var tamEl = row.querySelector('.' + tamColM); if (!tamEl) return false; var val = config.bulkPrice; var tamText = tamEl.textContent.trim().toUpperCase(); var tam = listaTamM.reduce(function(found, t) { return tamText.indexOf(t) !== -1 ? (t.length > found.length ? t : found) : found; }, ''); if (tam && ov[tam]) val = ov[tam]; var inp = row.querySelector('.' + priceColM + ' input.ant-input-number-input'); if (!inp || inp.disabled) return false; if (inp.value === val) return false; inp.focus(); ns.call(inp, val); inp.dispatchEvent(new Event('input', {bubbles:true})); inp.dispatchEvent(new Event('change', {bubbles:true})); inp.blur(); return true; }});
            }
            if (mcCols.length) await setColunasEmMassaBulk(mcCols);
          }
        }
        if (window.__upsCancelMacro) { chrome.runtime.sendMessage({ action: 'error', message: 'Cancelado' }); return; }

        // Descrição
        const bibData = await new Promise(resolve => chrome.storage.local.get(["biblioteca"], resolve));
        const dadosDesc = bibData.biblioteca && bibData.biblioteca[config.selectedTable];
        if (dadosDesc && dadosDesc.descricao) {
          stepDone('Preenchendo descrição...');
          const ta = document.querySelector('.ant-form-item-control textarea.ant-input');
          if (ta) {
            ta.focus();
            var nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
            nativeSetter.call(ta, dadosDesc.descricao);
            ta.dispatchEvent(new Event('input', { bubbles: true }));
            ta.dispatchEvent(new Event('change', { bubbles: true }));
            ta.blur();
            ta.scrollTop = 0;
          }
        }
        stepDone('Capitalizando título...');
        capitalizarTitulo();
        if (window.__upsCancelMacro) { chrome.runtime.sendMessage({ action: 'error', message: 'Cancelado' }); return; }

        if (hasMacro && macro.sku) {
          stepDone('Gerando SKU...');
          gerarSkuEmMassa();
        }

        // Atributos
        if (hasAtributos) {
          if (expandirAtributos()) { await esperarAtributosExpandirem(); }
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
              if (window.__upsCancelMacro) { chrome.runtime.sendMessage({ action: 'error', message: 'Cancelado' }); return; }
              await aplicarAtributo(key, dados[key]);
              await sleep(400);
            }
          }
        }
        if (window.__upsCancelMacro) { chrome.runtime.sendMessage({ action: 'error', message: 'Cancelado' }); return; }

        // Guia de Tamanhos
        const dados = bibData.biblioteca && bibData.biblioteca[config.selectedTable];
        if (dados) {
          stepDone('Preenchendo guia de tamanhos...');
          await preencherGuiaTamanhos(dados);
        }

        // Ajustar Imagem Quadrada (last action — triggers dialog)
        if (hasMacro && macro.crop) {
          stepDone('Ajustando imagem quadrada...');
          try {
            await ajustarCoresERecortar();
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

  if (request.action === 'fill-size-guide') {
    preencherGuiaTamanhos(request.dados).then(result => {
      sendResponse(result);
    }).catch(err => {
      sendResponse({ error: err.message });
    });
    return true;
  }
});
