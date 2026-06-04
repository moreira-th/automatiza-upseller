// ========== SKU ==========
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

  var debounceTimer = null;
  inp.addEventListener('input', function() {
    if (!inp.value.trim()) return;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function() {
      gerarSkuEmMassa();
    }, 500);
  });

  const btn = document.createElement('span');
  btn.id = 'ups-gerar-sku-btn';
  btn.textContent = '⚡';
  btn.title = 'Gerar SKU';
  btn.style.cssText = 'cursor:pointer;font-size:14px;position:absolute;left:6px;top:50%;transform:translateY(-50%);user-select:none;line-height:1;z-index:1;border:1px solid #bbb;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;background:#f5f5f5;';
  btn.addEventListener('click', function(e) {
    e.stopPropagation();
    e.preventDefault();
    gerarSkuEmMassa();
  });
  inp.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      clearTimeout(debounceTimer);
      gerarSkuEmMassa();
    }
  });
  container.appendChild(btn);
}
// ========== ATRIBUTOS ==========
function expandirAtributos() {
  var btn = document.querySelector('.is_more.pointer');
  if (!btn) return false;
  var txt = btn.innerText ? btn.innerText.trim().toLowerCase() : '';
  if (txt === 'menos atributos') return true; // already expanded
  if (txt !== 'mais atributos') return false; // different state
  btn.scrollIntoView({ block: 'center' });
  btn.click();
  return true;
}
async function esperarAtributosExpandirem() {
  for (var w = 0; w < 30; w++) {
    await sleep(200);
    var forms = document.querySelectorAll('.ant-form-item');
    var btn = document.querySelector('.is_more.pointer');
    if (forms.length > 5) return true;
    if (btn && btn.innerText.trim().toLowerCase() === 'menos atributos') return true;
  }
  return false;
}
async function lerAtributos() {
  expandirAtributos();
  await esperarAtributosExpandirem();
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
// ========== CORES ==========
function normalizarCor(s) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
}
function traduzirCorEnPt(name) {
  // Split compound names into words for partial matching
  var lower = name.toLowerCase().trim();
  var words = lower.split(/[\s\/\-]+/);
  var candidates = [];

  // Helper: add candidate if not already present
  function add() { for (var i = 0; i < arguments.length; i++) { if (candidates.indexOf(arguments[i]) === -1) candidates.push(arguments[i]); } }

  // Build translation candidates based on words found
  // Blues
  if (words.indexOf('blue') !== -1) {
    if (words.indexOf('light') !== -1) add('Azul bebê');
    else if (words.indexOf('dark') !== -1) add('Azul Escuro');
    else if (words.indexOf('navy') !== -1) add('Azul Marinho');
    else if (words.indexOf('royal') !== -1) add('Azul Royal');
    else if (words.indexOf('sky') !== -1 || words.indexOf('baby') !== -1) add('Azul bebê');
    else if (words.indexOf('dusty') !== -1 || words.indexOf('powder') !== -1) add('Azul Empoeirado');
    else if (words.indexOf('cadet') !== -1) add('Azul cadete');
    else if (words.indexOf('mint') !== -1) add('Azul menta');
    else if (words.indexOf('petroleum') !== -1 || words.indexOf('petroleo') !== -1) add('Azul petróleo');
    else if (words.indexOf('and') !== -1 && lower.indexOf('white') !== -1) add('Azul e Branco');
    else if (words.indexOf('and') !== -1 && lower.indexOf('black') !== -1) add('azul e preto');
    else add('Azul');
  }
  if (lower === 'navy') add('Azul Marinho');

  // Reds
  if (words.indexOf('red') !== -1) {
    if (words.indexOf('dark') !== -1) add('Vermelho Escuro');
    else if (words.indexOf('wine') !== -1 || words.indexOf('burgundy') !== -1) add('Vinho', 'Bordô', 'Marsala');
    else if (words.indexOf('and') !== -1 && lower.indexOf('white') !== -1) add('Vermelho e Branco');
    else if (words.indexOf('and') !== -1 && lower.indexOf('black') !== -1 || lower.indexOf('preto') !== -1) add('Vermelho e preto');
    else add('Vermelho');
  }

  // Greens
  if (words.indexOf('green') !== -1) {
    if (words.indexOf('dark') !== -1) add('Verde Escuro');
    else if (words.indexOf('light') !== -1) add('Verde Claro');
    else if (words.indexOf('mint') !== -1) add('Verde Menta');
    else if (words.indexOf('olive') !== -1) add('Verde Oliva');
    else if (words.indexOf('military') !== -1 || words.indexOf('army') !== -1) add('Verde Militar');
    else if (words.indexOf('lime') !== -1) add('Verde Limão');
    else add('Verde');
  }

  // Pinks
  if (words.indexOf('pink') !== -1) {
    if (words.indexOf('hot') !== -1 || words.indexOf('fuchsia') !== -1 || words.indexOf('fucsia') !== -1) add('Rosa chiclete', 'Fúcsia');
    else if (words.indexOf('baby') !== -1 || words.indexOf('light') !== -1) add('Rosa Bebê');
    else if (words.indexOf('dusty') !== -1 || words.indexOf('powder') !== -1) add('Rosa empoeirado');
    else if (words.indexOf('rose') !== -1) add('Rosê');
    else if (words.indexOf('coral') !== -1) add('Coral');
    else add('Pink', 'Rosa');
  }
  if (words.indexOf('fuchsia') !== -1 || words.indexOf('fucsia') !== -1) add('Fúcsia');
  if (words.indexOf('rose') !== -1 || words.indexOf('rosé') !== -1 || words.indexOf('rosê') !== -1) add('Rosê');
  if (lower.indexOf('hotpink') !== -1) add('Rosa chiclete', 'Fúcsia');
  if (lower.indexOf('babypink') !== -1) add('Rosa Bebê');

  // Purples
  if (words.indexOf('purple') !== -1) {
    if (words.indexOf('dusty') !== -1 || words.indexOf('powder') !== -1) add('Roxo empoeirado');
    else add('Roxo');
  }
  if (words.indexOf('lavender') !== -1) add('Lavanda');
  if (words.indexOf('violet') !== -1 || words.indexOf('violeta') !== -1) add('Violeta');
  if (words.indexOf('mauve') !== -1 || words.indexOf('malva') !== -1) add('Malva');
  if (lower === 'lilac') add('Lavanda', 'Malva', 'Violeta');

  // Yellows
  if (words.indexOf('yellow') !== -1) {
    if (words.indexOf('mustard') !== -1 || words.indexOf('mostarda') !== -1) add('Amarelo mostarda');
    else if (words.indexOf('light') !== -1) add('Luz amarela', 'Ganso amarelo');
    else add('Amarelo');
  }
  if (words.indexOf('mustard') !== -1 || words.indexOf('mostarda') !== -1) add('Amarelo mostarda');

  // Oranges
  if (words.indexOf('orange') !== -1) {
    if (words.indexOf('burnt') !== -1 || words.indexOf('burned') !== -1 || words.indexOf('queimado') !== -1) add('Laranja Queimado');
    else if (words.indexOf('dark') !== -1) add('Laranja Queimado');
    else add('Laranja');
  }

  // Browns
  if (words.indexOf('brown') !== -1) {
    if (words.indexOf('light') !== -1) add('Marrom Claro');
    else if (words.indexOf('dark') !== -1) add('Chocolate', 'Marrom');
    else add('Marrom');
  }
  if (words.indexOf('coffee') !== -1 || words.indexOf('café') !== -1) add('Café');
  if (words.indexOf('chocolate') !== -1) add('Chocolate');
  if (words.indexOf('tan') !== -1 || words.indexOf('caramel') !== -1) add('Caramelo', 'Castanho', 'Bege');
  if (words.indexOf('camel') !== -1) add('Caramelo');

  // Neutrals
  if (words.indexOf('white') !== -1 || lower.indexOf('branco') !== -1) {
    if (words.indexOf('off') !== -1) add('Creme');
    else add('Branco');
  }
  if (words.indexOf('black') !== -1 || lower.indexOf('preto') !== -1) add('Preto');
  if (words.indexOf('grey') !== -1 || words.indexOf('gray') !== -1) {
    if (words.indexOf('light') !== -1) add('Cinza Claro');
    else if (words.indexOf('dark') !== -1) add('Chumbo', 'Cinza Escuro');
    else add('Cinza');
  }
  if (words.indexOf('silver') !== -1 || words.indexOf('prata') !== -1) add('Prata');
  if (words.indexOf('gold') !== -1 || words.indexOf('golden') !== -1 || words.indexOf('dourado') !== -1) add('Dourado');
  if (words.indexOf('bronze') !== -1) add('Bronze');
  if (words.indexOf('champagne') !== -1 || words.indexOf('champanhe') !== -1) add('Champanhe');
  if (words.indexOf('cream') !== -1 || words.indexOf('creme') !== -1 || lower.indexOf('marfim') !== -1 || lower.indexOf('ivory') !== -1) add('Creme');

  // Wine / Burgundy
  if (words.indexOf('burgundy') !== -1 || words.indexOf('bordeaux') !== -1) add('Bordô', 'Vinho', 'Marsala');
  if (words.indexOf('wine') !== -1) add('Vinho', 'Bordô', 'Marsala');
  if (words.indexOf('marsala') !== -1) add('Marsala');

  // Others
  if (words.indexOf('coral') !== -1) add('Coral');
  if (words.indexOf('watermelon') !== -1 || words.indexOf('melancia') !== -1) add('Melancia');
  if (words.indexOf('ginger') !== -1 || words.indexOf('gengibre') !== -1) add('Gengibre');
  if (words.indexOf('khaki') !== -1 || words.indexOf('caqui') !== -1) add('Caqui');
  if (words.indexOf('apricot') !== -1 || words.indexOf('peach') !== -1 || words.indexOf('pêssego') !== -1 || words.indexOf('pessego') !== -1) add('Pêssego');
  if (words.indexOf('multicolor') !== -1 || words.indexOf('multicolorido') !== -1 || words.indexOf('multi') !== -1) add('Multicolorido');
  if (words.indexOf('transparent') !== -1 || words.indexOf('transparente') !== -1) add('Transparente');
  if (words.indexOf('lead') !== -1 || words.indexOf('chumbo') !== -1) add('Chumbo');
  if (words.indexOf('beige') !== -1 || words.indexOf('bege') !== -1) add('Bege');
  if (words.indexOf('damask') !== -1 || words.indexOf('damasco') !== -1) add('Damasco');
  if (words.indexOf('plum') !== -1 || lower.indexOf('ameixa') !== -1) add('Vinho', 'Marsala', 'Bordô');

  // If no candidates found, return empty
  return candidates;
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
async function esperarAtualizacaoCores(teveRemap) {
  var coresAntigas = lerCoresEspecificacaoPrincipal();
  if (!teveRemap || coresAntigas.length === 0) return coresAntigas;
  var nomesAntigos = coresAntigas.map(function(c) { return c.nome; }).sort().join(',');
  for (var t = 0; t < 3; t++) {
    await sleep(250);
    var novas = lerCoresEspecificacaoPrincipal();
    var nomesNovos = novas.map(function(c) { return c.nome; }).sort().join(',');
    if (nomesNovos !== nomesAntigos) {
      await sleep(250);
      return novas;
    }
  }
  return lerCoresEspecificacaoPrincipal();
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
    ${coresAtuais.sort((a, b) => (a.nome || '').toLowerCase().localeCompare((b.nome || '').toLowerCase())).map((c, i) => `
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
      chrome.runtime.sendMessage({ action: 'cores-confirmed' }, () => { void chrome.runtime.lastError; });
      resolve({ confirmou: true, cores: coletarCores() });
    };
    document.getElementById('ups-cor-pular').onclick = () => {
      div.remove();
      resolve({ confirmou: false, cores: [] });
    };
  });
}
async function aplicarCoresNaPagina(cores) {
  var forms = document.querySelectorAll('.ant-form-item');
  var section = null;
  for (var si = 0; si < forms.length; si++) {
    var s = forms[si];
    var lbl = s.querySelector('.ant-form-item-label');
    if (lbl && lbl.textContent.trim().includes('Especificação Principal')) { section = s; break; }
  }
  if (!section) return;

  for (var ci = 0; ci < cores.length; ci++) {
    var cor = cores[ci];
    if (!cor.nome) continue;
    var nomeExato = cor.nome.trim();
    var norm = normalizarCor(nomeExato);

    var wrappers = section.querySelectorAll('.ant-checkbox-wrapper');
    var matchWrapper = null;

    for (var wi = 0; wi < wrappers.length; wi++) {
      var w = wrappers[wi];
      var cb = w.querySelector('.ant-checkbox-input');
      var nomePagina = ((cb && cb.value) || w.textContent.trim()).trim();
      if (nomePagina === nomeExato) {
        matchWrapper = w;
        break;
      }
    }

    if (matchWrapper) {
      var cbMatch = matchWrapper.querySelector('.ant-checkbox-input');
      if (cbMatch && cbMatch.checked !== cor.checked) {
        matchWrapper.click();
        await sleep(100);
      }
    } else if (cor.checked) {
      var addBtn = Array.from(document.querySelectorAll('button')).find(function(b) {
        return b.textContent.trim() === 'Adicionar Opções';
      });
      if (!addBtn) continue;
      addBtn.click();
      await sleep(1000);
      var input = document.querySelector('.ant-popover-inner-content input.ant-input');
      if (input) {
        var nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        input.focus();
        nativeSetter.call(input, cor.nome);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        await sleep(300);
        var salvarBtn = document.querySelector('.ant-popover-inner-content button.my_ant_btn_primary');
        if (salvarBtn) {
          salvarBtn.click();
          await sleep(1000);
        }
      }
    }
  }
  if (window.__temEstadoSalvo) setTimeout(function() { window.__upsLoadingPreset = false; }, 100);
}
// ========== IMAGEM / MÍDIA ==========
function mostrarFeedback(msg, cor) {
  const existing = document.querySelector('.ups-feedback-toast');
  if (existing) existing.remove();
  const el = document.createElement('div');
  el.className = 'ups-feedback-toast';
  el.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:999999;background:' + (cor || '#333') + ';color:#fff;padding:12px 20px;border-radius:6px;font-size:14px;font-family:sans-serif;box-shadow:0 2px 10px rgba(0,0,0,0.3);transition:opacity .3s';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 1500);
}
async function recortarImagemQuadradaEmMassa() {
  const nativeBtn = Array.from(document.querySelectorAll('.my_btn.ant-btn')).find(el => el.textContent.includes('Recortar em massa'));
  if (!nativeBtn) throw new Error('Botão Recortar em massa não encontrado');
  nativeBtn.click();
  let dialog = null;
  for (let i = 0; i < 40; i++) {
    dialog = document.querySelector('.ant-modal-content');
    if (dialog && dialog.offsetHeight > 0 && dialog.textContent.includes('Recortar em massa')) break;
    await sleep(300);
  }
  if (!dialog || !dialog.textContent.includes('Recortar em massa')) throw new Error('Diálogo Recortar em massa não abriu');
  await sleep(500);
   const sections = dialog.querySelectorAll('[class*="img_list_box"]');
  let selecionadas = 0;
  function clickImgBoxByCaption(section, captionText) {
    const caption = Array.from(section.querySelectorAll('*')).find(el => el.textContent.trim() === captionText);
    if (!caption) return false;
    const container = caption.parentElement;
    if (!container) return false;
    const imgBox = container.querySelector('.img_box');
    if (!imgBox) return false;
    imgBox.click();
    return true;
  }
  function clickImgBoxBySrc(section, pattern) {
    const allImgs = section.querySelectorAll('img');
    for (const img of allImgs) {
      if (img.src && img.src.includes(pattern)) {
        const imgBox = img.closest('.img_box');
        if (imgBox) { imgBox.click(); return true; }
      }
    }
    return false;
  }
  for (const section of sections) {
    let clicked = false;
    if (clickImgBoxByCaption(section, 'Imagem Quadrada')) { clicked = true; }
    else { clicked = clickImgBoxBySrc(section, '_square.'); }
    
    if (clickImgBoxByCaption(section, 'Imagem de Cores')) { clicked = true; }
    else { clicked = clickImgBoxBySrc(section, '_piece.') || clicked; }
    
    if (clicked) { selecionadas++; await sleep(100); }
  }
  if (selecionadas === 0) throw new Error('Nenhuma imagem encontrada');
  const footer = dialog.querySelector('.ant-modal-footer');
  const cortarBtn = footer
    ? Array.from(footer.querySelectorAll('button')).find(b => b.textContent.trim() === 'Cortar')
    : Array.from(dialog.querySelectorAll('button')).find(b => b.textContent.trim() === 'Cortar');
  if (!cortarBtn) throw new Error('Botão Cortar não encontrado');
  cortarBtn.click();
  const aplicarBtn = await esperarBotaoContem('Aplicar', 120000);
  if (!aplicarBtn) throw new Error('Botão Aplicar não encontrado');
  aplicarBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  aplicarBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  aplicarBtn.click();
  return;
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
  op3.innerHTML = '<span>🖼</span> Ajustar Imagens (cores + recort.)';
  op3.addEventListener('mouseenter', () => op3.style.background = '#f5f5f5');
  op3.addEventListener('mouseleave', () => op3.style.background = '');
  op3.addEventListener('click', async (e) => {
    e.stopPropagation(); fecharDropdown();
    try {
      mostrarFeedback('Copiando cores e recortando...', '#4078f2');
      await ajustarCoresERecortar();
      mostrarFeedback('Imagens ajustadas com sucesso!', '#28a745');
    } catch(err) { mostrarFeedback('Erro: ' + err.message, '#dc3545'); }
  });

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
    const rawUrl = await upsDialog({ title: '🔗 Link da Tabela', message: 'Cole o link da imagem:', input: true, placeholder: 'https://...', okText: 'Enviar', cancel: true, recentLinks: links });
    if (!rawUrl || !rawUrl.trim()) return;
    // Sanitize URL: trim whitespace, remove invisible chars, remove surrounding quotes/brackets
    const url = rawUrl.trim().replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/^['"\\(\\[]+|['"\\)\\]]+$/g, '');
    if (!url) return;
    console.log('[Ups] Link da tabela URL:', url);
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
function uploadImagemViaBackground(dataUrl, fileName, source) {
  chrome.runtime.sendMessage({
    action: 'ups-mass-upload',
    dataUrl: dataUrl,
    fileName: fileName,
    source: source || 'file'
  });
}
function upsCopiarCoresDetalheAsync() {
  return new Promise(function(resolve, reject) {
    window.addEventListener('ups-cores-done', function(e) {
      if (e.detail.error) reject(new Error(e.detail.error));
      else resolve(e.detail.count);
    }, { once: true });
    chrome.runtime.sendMessage({ type: 'ups-cores-main' });
  });
}
async function ajustarCoresERecortar() {
  await upsCopiarCoresDetalheAsync();
  await recortarImagemQuadradaEmMassa();
}
// ===== DRAFTS =====
function clickInMain(el, cb) {
  if (!el) return;
  var uid = '_ups_' + Date.now();
  el.setAttribute('data-ups', uid);
  chrome.runtime.sendMessage({ type: 'ups-hover-main', selector: '[data-ups="' + uid + '"]' }, function() {
    void chrome.runtime.lastError; // ignore port closed
    setTimeout(function() {
      chrome.runtime.sendMessage({ type: 'ups-click-main', selector: '[data-ups="' + uid + '"]' }, function() {
        void chrome.runtime.lastError; // ignore port closed
        el.removeAttribute('data-ups');
        if (cb) cb();
      });
    }, 150);
  });
}
function showUpsNotification(msg) {
  var existing = document.getElementById('ups-notification');
  if (existing) existing.remove();
  var el = document.createElement('div');
  el.id = 'ups-notification';
  el.style.cssText = 'position:fixed;top:24px;left:50%;transform:translateX(-50%);z-index:9999999;padding:8px 20px;border-radius:6px;background:#fff;border:1px solid #e8e8e8;box-shadow:0 4px 16px rgba(0,0,0,0.15);font-size:13px;color:#333;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;display:flex;align-items:center;gap:8px;';
  el.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#faad14" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>' + msg;
  document.body.appendChild(el);
  setTimeout(function() { if (el.parentNode) el.remove(); }, 3000);
}
function monitorToolbarDrafts() {
  setInterval(() => {
    const container = document.querySelector('.list_btn');
    if (!container) return;
    if (document.getElementById('ups-atr-massa-toolbar-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'ups-atr-massa-toolbar-btn';
    btn.type = 'button';
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;pointer-events:none;"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg> Atributos em Massa';
    btn.title = 'Editar Atributos em Massa nos produtos selecionados';
    btn.style.cssText = 'display:inline-flex;align-items:center;gap:4px;padding:4px 8px;border-radius:4px;background:transparent;color:#4078f2;border:1px solid #4078f2;cursor:pointer;font-size:12px;font-weight:400;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;transition:all .2s;line-height:1.4;margin-left:8px;z-index:999;pointer-events:auto;';
    btn.addEventListener('mouseenter', () => {
      btn.style.background = 'rgba(64,120,242,0.05)';
      btn.style.borderColor = '#4078f2';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'transparent';
      btn.style.borderColor = '#4078f2';
    });

    container.appendChild(btn);

    let running = false;
    btn.addEventListener('click', () => {
      if (running) return;
      const selectedCount = parseInt(document.querySelector('.checked')?.textContent || '0');
      if (selectedCount === 0) {
        showUpsNotification('Selecione pelo menos um produto para usar Atributos em Massa.');
        return;
      }
      running = true;
      btn.style.opacity = '0.6';
      btn.style.cursor = 'default';
      // 1) Open "Ações em Massa" dropdown via MAIN world click
      const acoesLink = Array.from(document.querySelectorAll('.list_btn .ant-dropdown-trigger')).find(el => el.textContent.trim().includes('Ações'));
      if (!acoesLink) {
        running = false;
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
        return;
      }
      const origHref = acoesLink.getAttribute('href');
      if (origHref && origHref.startsWith('javascript:')) {
        acoesLink.removeAttribute('href');
      }
      clickInMain(acoesLink, function() {
        // 2) Find menu item with retry, then click "Editar Atributos"
        let attempts = 0;
        const findAndClick = () => {
          const menuItem = Array.from(document.querySelectorAll('.ant-dropdown-menu-item')).find(el => el.textContent.trim() === 'Editar Atributos');
          if (menuItem) {
            clickInMain(menuItem, function() {
              // 3) Wait for modal to open, then show our overlay
              setTimeout(() => {
                const modal = document.querySelector('.ant-modal-root.my_modal.my_tab_modal');
                if (modal) {
                  setTimeout(function() { abrirDialogAtributosDrafts(); }, 500);
                }
                running = false;
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
              }, 2000);
            });
          } else if (attempts < 15) {
            attempts++;
            setTimeout(findAndClick, 400);
          } else {
            running = false;
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
            showUpsNotification('Não foi possível abrir o menu. Tente novamente.');
          }
        };
        setTimeout(findAndClick, 200);
      });
    });
  }, 1500);
}
function monitorModalEditarAtributos() {
  setInterval(() => {
    const modal = document.querySelector('.ant-modal-root.my_modal.my_tab_modal');
    if (modal && !document.getElementById('ups-drafts-atr-btn')) {
      injetarBotaoAtributosDrafts(modal);
    } else if (!modal) {
      const btn = document.getElementById('ups-drafts-atr-btn');
      if (btn) btn.remove();
      const overlay = document.getElementById('ups-drafts-atr-overlay');
      if (overlay) overlay.remove();
    }
  }, 1500);
}
function injetarBotaoAtributosDrafts(modal) {
  const content = modal.querySelector('.ant-modal-content');
  if (!content) return;
  const btn = document.createElement('div');
  btn.id = 'ups-drafts-atr-btn';
  btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg> Atributos em Massa';
  btn.title = 'Aplicar Presets de Atributos em todas as categorias';
  btn.style.cssText = 'position:absolute;top:16px;right:48px;z-index:999999;display:inline-flex;align-items:center;gap:4px;padding:4px 8px;border-radius:4px;background:transparent;color:#4078f2;border:1px solid #4078f2;cursor:pointer;font-size:12px;font-weight:400;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;transition:all .2s;line-height:1.4;';
  btn.addEventListener('mouseenter', () => {
    btn.style.background = 'rgba(64,120,242,0.05)';
    btn.style.borderColor = '#4078f2';
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.background = 'transparent';
    btn.style.borderColor = '#4078f2';
  });
  const header = content.querySelector('.ant-modal-header');
  if (header) {
    header.style.position = 'relative';
    header.appendChild(btn);
  }
  btn.onclick = () => abrirDialogAtributosDrafts();
}
function abrirDialogAtributosDrafts() {
  const existing = document.getElementById('ups-drafts-atr-overlay');
  if (existing) existing.remove();

  const cats = document.querySelectorAll('.ant-modal-root .category_item');
  const qtd = cats.length;

  const linhas = Array.from(cats).map((cat, i) => {
    const name = (cat.querySelector('.f_title')?.textContent || 'Categoria ' + (i + 1)).trim();
    const count = cat.querySelector('.f_blue b')?.textContent || '';
    return '<div style="display:flex;align-items:center;gap:6px;padding:5px 4px;border-bottom:1px solid #f0f0f0;">' +
      '<input type="checkbox" id="ups-dc-' + i + '" checked style="flex-shrink:0;">' +
      '<span style="flex:1;font-size:12px;color:#333;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + name.replace(/"/g, '&quot;') + '">' + name + (count ? ' <b>(' + count + ')</b>' : '') + '</span>' +
      '<select id="ups-dps-' + i + '" style="width:160px;padding:4px;border:1px solid #ccc;border-radius:4px;font-size:11px;flex-shrink:0;"><option value="">Preset...</option></select>' +
      '</div>';
  });

  const overlay = document.createElement('div');
  overlay.id = 'ups-drafts-atr-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.45);z-index:9999999;display:flex;align-items:center;justify-content:center;';
  overlay.innerHTML = '<div style="background:white;border-radius:8px;padding:16px;width:680px;max-width:90vw;max-height:80vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,0.25);font-family:sans-serif;">' +
    '<div style="font-size:14px;font-weight:700;margin-bottom:10px;color:#333;">Atributos em Massa - Editar Atributos</div>' +
    '<div style="margin-bottom:6px;display:flex;font-size:11px;font-weight:600;color:#888;padding:0 4px;"><span style="flex:1;">Categoria</span><span style="width:160px;text-align:center;">Preset</span></div>' +
    '<div style="max-height:360px;overflow-y:auto;border:1px solid #eee;border-radius:4px;margin-bottom:10px;">' + linhas.join('') + '</div>' +
    '<div style="display:flex;gap:8px;">' +
    '<button id="ups-drafts-executar" style="flex:1;padding:7px;border:none;border-radius:5px;background:#4078f2;color:white;font-size:13px;font-weight:600;cursor:pointer;">Executar</button>' +
    '<button id="ups-drafts-fechar" style="padding:7px 16px;border:1px solid #ccc;border-radius:5px;background:white;color:#666;font-size:13px;cursor:pointer;">Fechar</button>' +
    '</div></div>';
  document.body.appendChild(overlay);

  chrome.storage.local.get(["bibliotecaAtributos"], (res) => {
    const bibAtr = res.bibliotecaAtributos || {};
    __upsPresetsCache = bibAtr;
    for (let i = 0; i < qtd; i++) {
      const sel = document.getElementById('ups-dps-' + i);
      if (!sel) continue;
      Object.keys(bibAtr).forEach(nome => {
        const opt = document.createElement('option');
        opt.value = 'bib:' + nome;
        opt.textContent = nome + ' (' + Object.keys(bibAtr[nome]).length + ')';
        sel.appendChild(opt);
      });
    }
  });

  document.getElementById('ups-drafts-fechar').onclick = () => overlay.remove();
  document.getElementById('ups-drafts-executar').onclick = () => {
    var tasks = [];
    document.querySelectorAll('.ant-modal-root .category_item').forEach((cat, i) => {
      var cb = document.getElementById('ups-dc-' + i);
      var sel = document.getElementById('ups-dps-' + i);
      if (!cb || !cb.checked || !sel || !sel.value) return;
      tasks.push({ cat: cat, idx: i, presetVal: sel.value });
    });
    overlay.remove();
    upsExecutarAtributosPopup(tasks);
  };

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
}
async function upsExecutarAtributosPopup(tasks) {
  if (!tasks || !tasks.length) { upsToastDrafts('Nenhuma categoria com preset selecionado'); return; }
  criarOverlayProgresso();
  var uppStep = document.getElementById('upp-step');
  if (uppStep) uppStep.textContent = 'Preparando presets...';
  var cache = __upsPresetsCache;
  if (!cache) {
    cache = await new Promise(function(resolve) { chrome.storage.local.get(["bibliotecaAtributos"], function(r) { resolve(r.bibliotecaAtributos || {}); }); });
    __upsPresetsCache = cache;
  }
  var totalAplicadas = 0;
  var totalCats = 0;
  for (var t = 0; t < tasks.length; t++) {
    var tk = tasks[t];
    var parts = tk.presetVal.split(':');
    var tipo = parts[0];
    var nome = parts.slice(1).join(':');
    var dados = null;
    if (tipo === 'bib') dados = cache[nome];
    if (!dados) continue;
    if (uppStep) uppStep.textContent = 'Categoria ' + (t + 1) + ' de ' + tasks.length + ': ' + nome;
    var aplicadas = await upsProcessarCategoriaPopup(tk.cat, dados);
    totalAplicadas += aplicadas;
    totalCats++;
    var titleClose = tk.cat.querySelector('.category_title');
    if (titleClose) { upsClickElement(titleClose); await sleep(500); }
  }
  removerOverlayProgresso();
  upsToastDrafts(totalAplicadas + ' atributos aplicados em ' + totalCats + ' categorias');
}
async function upsProcessarCategoriaPopup(cat, dados) {
  var attrBox = cat.querySelector('.attr_box');
  if (!attrBox || attrBox.style.display === 'none') {
    var title = cat.querySelector('.category_title');
    if (title) {
      upsClickElement(title);
      for (var w = 0; w < 30; w++) {
        await sleep(300);
        attrBox = cat.querySelector('.attr_box');
        if (attrBox && attrBox.style.display !== 'none') break;
      }
    }
  }
  if (!attrBox || attrBox.style.display === 'none') return 0;
  // Esperar spinner sumir (conteúdo inicial carregado)
  for (var w = 0; w < 40; w++) {
    await sleep(300);
    var spinner = cat.querySelector('.ant-spin, .anticon-loading');
    if (!spinner) break;
  }
  // Clicar "Mais Atributos" se existir
  var mais = Array.from(cat.querySelectorAll('*')).find(function(el) { return el.textContent.trim() === 'Mais Atributos'; });
  if (mais) {
    upsClickElement(mais);
    await sleep(800);
    // Esperar novos forms carregarem
    for (var w = 0; w < 40; w++) {
      await sleep(300);
      var forms = cat.querySelectorAll('.ant-form-item');
      if (forms.length > 2) break; // Mais de 2 forms = carregou novos
      spinner = cat.querySelector('.ant-spin, .anticon-loading');
      if (!spinner && forms.length > 0) break;
    }
  }
  var forms = cat.querySelectorAll('.ant-form-item');
  if (!forms.length) return 0;
  var normal = function(s) { return s.replace(/[:\s]+/g, ' ').trim().toLowerCase(); };
  var keys = Object.keys(dados);
  var aplicadas = 0;
  for (var k = 0; k < keys.length; k++) {
    var key = keys[k];
    var value = dados[key];
    for (var f = 0; f < forms.length; f++) {
      var textEl = forms[f].querySelector('.my_checkbox_label .text_cont');
      if (!textEl) continue;
      if (normal(textEl.textContent) !== normal(key)) continue;
      var checkbox = forms[f].querySelector('.ant-checkbox-input');
      if (!checkbox) continue;
      var wrapper = checkbox.closest('.ant-checkbox-wrapper') || checkbox.closest('label') || checkbox.parentElement;
      if (!wrapper) continue;
       if (!checkbox.checked) {
         upsClickElement(wrapper);
         await sleep(400);
         if (!checkbox.checked) {
           var span = wrapper.querySelector('.ant-checkbox-inner');
           if (span) { upsClickElement(span); await sleep(300); }
           if (!checkbox.checked) break;
         }
       }
       var attrBoxField = forms[f].querySelector('.item_attr_box');
       if (attrBoxField) {
         // Compound composition field (Composição, etc.) in popup
         console.log('[UPS] Composição detectada:', key, 'Value:', value);
         var pairs = String(value).split(', ');
         console.log('[UPS] Pairs:', pairs);
         var existing = attrBoxField.children;
         console.log('[UPS] Existing rows:', existing.length);
         // Remove excess rows
         while (existing.length > pairs.length) {
           var lastRow = existing[existing.length - 1];
           var rmBtn = lastRow.querySelector('[class*="minus"]');
           if (rmBtn) { upsClickElement(rmBtn); await sleep(400); existing = attrBoxField.children; }
           else break;
         }
         for (var p = 0; p < pairs.length; p++) {
           var pair = pairs[p];
           console.log('[UPS] Processing pair', p + ':', pair);
           var lastSpace = pair.lastIndexOf(' ');
           var mat = lastSpace > 0 ? pair.substring(0, lastSpace).trim() : pair;
           var pct = lastSpace > 0 ? pair.substring(lastSpace + 1).trim() : '';
           console.log('[UPS] Pair', p, '-> material:', mat, 'percentage:', pct);
           existing = attrBoxField.children;
           var row = null;
           if (p < existing.length) {
             row = existing[p];
           } else {
             var lastRow = existing[existing.length - 1];
             var addBtn = lastRow.querySelector('[class*="plus"]');
             if (addBtn) { upsClickElement(addBtn); await sleep(600); existing = attrBoxField.children; }
             else break;
             row = existing[existing.length - 1];
           }
           if (!row) { console.log('[UPS] Row not found'); continue; }
           // Set select (material)
           var rowSelect = row.querySelector('.ant-select');
           console.log('[UPS] rowSelect found:', !!rowSelect);
           if (rowSelect && mat) {
             var openDd = document.querySelector('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
             if (openDd) {
               document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
               await sleep(300);
             }
             console.log('[UPS] Clicking rowSelect...');
             upsClickElement(rowSelect);
             await sleep(500);
             var comboBox = rowSelect.querySelector('[role="combobox"]');
             var ariaId = comboBox ? comboBox.getAttribute('aria-controls') : null;
             var dd = null;
             if (ariaId) dd = document.querySelector('#' + CSS.escape(ariaId) + ':not(.ant-select-dropdown-hidden)');
             if (!dd) dd = document.querySelector('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
             console.log('[UPS] Dropdown found:', !!dd);
             if (dd) {
               var optList = dd.querySelectorAll('li');
               console.log('[UPS] Options in dropdown:', optList.length);
               var optMatch = Array.from(optList).find(function(li) { return normal(li.textContent) === normal(mat); });
               console.log('[UPS] Option matched:', !!optMatch, '- material:', mat);
               if (optMatch) { 
                 console.log('[UPS] Clicking option:', optMatch.textContent);
                 upsClickElement(optMatch); 
                 await sleep(300); 
               }
             }
           }
           // Set input (percentage)
           var rowInput = row.querySelector('input.ant-input:not(.ant-select-search__field)');
           console.log('[UPS] rowInput found:', !!rowInput, 'pct:', pct);
           if (rowInput && pct) {
             rowInput.focus();
             rowInput.value = pct;
             rowInput.dispatchEvent(new Event('input', { bubbles: true }));
             rowInput.dispatchEvent(new Event('change', { bubbles: true }));
             rowInput.blur();
             console.log('[UPS] Input set to:', pct);
             aplicadas++;
           }
         }
         console.log('[UPS] Composição done. Aplicadas:', aplicadas);
         break;
       }
        var select = forms[f].querySelector('.ant-select:not(.ant-select-disabled)');
        var input = forms[f].querySelector('input:not([type="hidden"]):not([type="checkbox"]):not(.ant-checkbox-input):not([disabled])');
        if (select) {
          // Check if it's a multi-select
          var isMultiple = !!select.querySelector('.ant-select-selection--multiple');
          
           if (isMultiple) {
            // Multi-select: value is "opt1, opt2, opt3"
            console.log('[UPS] Multi-select detectado:', key, 'Value:', value);
            var values = String(value).split(', ');
            console.log('[UPS] Values to set:', values);
            
            // Remove existing choices (re-query after each click)
            var maxTries = 20;
            while (maxTries-- > 0) {
              var removes = select.querySelectorAll('.ant-select-selection__choice__remove');
              if (!removes.length) break;
              upsClickElement(removes[0]);
              await sleep(400);
            }
            
            // Add each value
            for (var v = 0; v < values.length; v++) {
              var val = values[v].trim();
              if (!val) continue;
              
              console.log('[UPS] Adicionando valor:', val);
              
              // Open dropdown
              var ddAberto = document.querySelector('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
              if (ddAberto) {
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
                await sleep(150);
              }
              
              upsClickElement(select);
              await sleep(400);
              
              var comboBox = select.querySelector('[role="combobox"]');
              var ariaId = comboBox ? comboBox.getAttribute('aria-controls') : null;
              var dd = null;
              if (ariaId) dd = document.querySelector('#' + CSS.escape(ariaId) + ':not(.ant-select-dropdown-hidden)');
              if (!dd) dd = document.querySelector('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
              
              if (dd) {
                var optList = dd.querySelectorAll('li');
                var optMatch = Array.from(optList).find(function(li) { return normal(li.textContent) === normal(val); });
                if (optMatch) {
                  console.log('[UPS] Opção encontrada e clicada:', val);
                  upsClickElement(optMatch);
                  await sleep(200);
                  aplicadas++;
                } else {
                  console.log('[UPS] Opção NÃO encontrada:', val);
                }
              }
              
              var esc = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
              document.dispatchEvent(esc);
              await sleep(150);
            }
            console.log('[UPS] Multi-select concluído. Aplicadas:', aplicadas);
          } else {
            // Single select
         var ddAberto = document.querySelector('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
         if (ddAberto) {
           document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
           await sleep(150);
         }
         upsClickElement(select);
         await sleep(400);
         var comboBox = select.querySelector('[role="combobox"]');
         var ariaId = comboBox ? comboBox.getAttribute('aria-controls') : null;
         var dd = null;
         if (ariaId) dd = document.querySelector('#' + CSS.escape(ariaId) + ':not(.ant-select-dropdown-hidden)');
         if (!dd) dd = document.querySelector('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
         if (dd) {
           var opts = dd.querySelectorAll('li');
           var opt = Array.from(opts).find(function(li) { return normal(li.textContent) === normal(value); });
           if (opt) {
             upsClickElement(opt);
             await sleep(200);
             aplicadas++;
           } else {
             upsClickElement(wrapper);
             await sleep(100);
           }
         }
          }
       } else if (input) {
        input.focus();
        input.value = value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.blur();
        aplicadas++;
      }
      break;
    }
    await sleep(100);
  }
  return aplicadas;
}
function upsClickElement(el) {
  try {
    var id = '_ups_ck_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    el.setAttribute('data-ups', id);
    chrome.runtime.sendMessage({ type: 'ups-click-main', selector: '[data-ups="' + id + '"]' });
  } catch(e) { console.error('ups:click error', e); }
}
function upsToastDrafts(msg) {
  var el = document.getElementById('ups-drafts-toast');
  if (el) el.remove();
  var toast = document.createElement('div');
  toast.id = 'ups-drafts-toast';
  toast.textContent = msg;
  toast.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#28a745;color:white;padding:10px 24px;border-radius:8px;font-size:14px;font-weight:600;z-index:99999999;box-shadow:0 4px 12px rgba(0,0,0,0.2);font-family:sans-serif;';
  document.body.appendChild(toast);
  setTimeout(function() { toast.remove(); }, 3000);
}
