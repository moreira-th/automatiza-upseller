/*
 * UpSeller Moreira — Temu Automation
 * Carregado em todas as páginas, ativado apenas em /pt/products/temu/
 * Depende de: core.js, overlay.js
 */

// ===== STORAGE KEYS =====
var TEMU_PRESETS_KEY = 'bibliotecaPresetsOverlayTemu';
var TEMU_ATTR_KEY = 'bibliotecaAtributosTemu';
var TEMU_ULTIMO_ESTADO = 'ultimoEstadoTemu';
var TEMU_ULTIMOS_PRECOS = 'ultimosPrecosTemu';

// ===== VARIANT TABLE COLUMN MAPPER =====
function encontrarColunasTemu() {
  var headerCells = document.querySelectorAll('#sales .vxe-header--column');
  var map = {};
  for (var i = 0; i < headerCells.length; i++) {
    var cell = headerCells[i];
    var txt = (cell.textContent || '').trim().toLowerCase();
    var cls = Array.from(cell.classList).find(function(c) { return c.startsWith('col_'); });
    if (!cls) continue;

    if (txt.startsWith('sku')) map.sku = cls;
    else if (txt.startsWith('quantidade')) map.quantidade = cls;
    else if (txt.startsWith('preço base')) map.precoBase = cls;
    else if (txt.startsWith('preço de lista')) map.precoLista = cls;
    else if (txt.startsWith('peso(g)')) map.peso = cls;
    else if (txt.startsWith('tamanho do pacote')) map.pacote = cls;
    else if (txt.startsWith('código de barras')) map.barras = cls;
  }
  return map;
}

// ===== DESCRIÇÃO =====
async function preencherDescricaoTemu(texto) {
  if (!texto) return;
  var textarea = document.querySelector('#description textarea');
  if (!textarea) return;
  var nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
  textarea.focus();
  nativeSetter.call(textarea, texto);
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  textarea.dispatchEvent(new Event('change', { bubbles: true }));
  textarea.blur();
  textarea.scrollTop = 0;
}

// ===== TÓPICOS (BULLET POINTS) =====
async function preencherTopicosTemu(topicos) {
  if (!topicos || !topicos.length) return;
  var labels = document.querySelectorAll('#description .ant-form-item-label label');
  var topicLabel = null;
  labels.forEach(function(l) {
    if (l.textContent.trim() === 'Tópico') topicLabel = l;
  });
  if (!topicLabel) return;
  var formItem = topicLabel.closest('.ant-form-item');
  if (!formItem) return;

  // Clicar "Adicionar Mais" até ter campos suficientes
  var addMoreBtn = formItem.parentElement.querySelector('button.ant-btn-link');
  while (true) {
    var inputs = formItem.querySelectorAll('textarea.ant-input, input.ant-input:not([type="hidden"])');
    if (inputs.length >= topicos.length) break;
    if (!addMoreBtn) break;
    addMoreBtn.click();
    await sleep(300);
  }

  var inputs = formItem.querySelectorAll('textarea.ant-input, input.ant-input:not([type="hidden"])');
  if (!inputs.length) return;
  var nativeTA = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
  var nativeInput = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  for (var i = 0; i < topicos.length && i < inputs.length; i++) {
    if (inputs[i].disabled) continue;
    var setter = inputs[i].tagName === 'TEXTAREA' ? nativeTA : nativeInput;
    inputs[i].focus();
    setter.call(inputs[i], topicos[i]);
    inputs[i].dispatchEvent(new Event('input', { bubbles: true }));
    inputs[i].dispatchEvent(new Event('change', { bubbles: true }));
    inputs[i].blur();
  }
}

// ===== EXECUTAR MACRO TEMU =====
async function executarTemu(dados) {
  window.__upsCancelMacro = false;
  criarOverlayProgresso();
  var step = 0;
  var totalSteps = 7;
  var ups = function(msg) {
    step++;
    atualizarOverlayProgresso({ message: msg, step: step, total: totalSteps });
    chrome.runtime.sendMessage({ action: 'progress', message: msg, step: step, total: totalSteps });
  };

  try {
    // 1. Editar em Massa
    if (dados.macroAtivo && dados.emMassa) {
      ups('Editando em massa...');
      if (dados.emMassa.quantidade) await setColunaEmMassaTemu('quantidade', dados.emMassa.quantidade);
      if (dados.emMassa.precoBase) await setColunaEmMassaTemu('precoBase', dados.emMassa.precoBase);
      if (dados.emMassa.precoLista) await setColunaEmMassaTemu('precoLista', dados.emMassa.precoLista);
      if (dados.emMassa.peso) await setColunaEmMassaTemu('peso', dados.emMassa.peso);
      if (dados.emMassa.pacote) await setColunaEmMassaTemu('pacote', dados.emMassa.pacote);
    } else {
      step++; atualizarOverlayProgresso({ message: 'Editar em Massa: ignorado', step: step, total: totalSteps });
    }
    if (window.__upsCancelMacro) throw new Error('Cancelado');

    // 2. Preço Especial
    if (dados.precoAtivo !== false) {
      ups('Aplicando preços...');
      if (dados.bulkPrice) {
        await setPrecosTemu(dados.bulkPrice, dados.listPrice);
      }
    } else {
      step++; atualizarOverlayProgresso({ message: 'Preço: ignorado', step: step, total: totalSteps });
    }
    if (window.__upsCancelMacro) throw new Error('Cancelado');

    // 3. SKU
    if (dados.sku) {
      ups('Gerando SKUs...');
      await gerarSkuEmMassaTemu();
    } else {
      step++; atualizarOverlayProgresso({ message: 'SKU: ignorado', step: step, total: totalSteps });
    }
    if (window.__upsCancelMacro) throw new Error('Cancelado');

    // 4. Descrição e Medidas
    var nomeTabela = dados.selectedTable;
    if (nomeTabela && dados.medidasAtivo !== false) {
      ups('Preenchendo descrição...');
      var bib = await new Promise(function(resolve) {
        chrome.storage.local.get(['biblioteca'], function(r) { resolve(r.biblioteca || {}); });
      });
      var tabela = bib[nomeTabela];
      if (tabela && tabela.descricao) {
        await preencherDescricaoTemu(tabela.descricao);
        await preencherTopicosTemu(tabela.topicos);
      }
      step++; atualizarOverlayProgresso({ message: 'Atributos: ignorado', step: step, total: totalSteps });
    } else {
      step++; atualizarOverlayProgresso({ message: 'Descrição: ignorado', step: step, total: totalSteps });
    }
    if (window.__upsCancelMacro) throw new Error('Cancelado');

    // 5. Atributos
    var attrNome = dados.attrPreset;
    if (attrNome && dados.atributosAtivo !== false) {
      ups('Aplicando atributos...');
      var attrs = await new Promise(function(resolve) {
        chrome.storage.local.get([TEMU_ATTR_KEY], function(r) { resolve(r[TEMU_ATTR_KEY] || {}); });
      });
      var attrDados = attrs[attrNome];
      if (attrDados) await aplicarAtributosTemu(attrDados);
    } else {
      step++; atualizarOverlayProgresso({ message: 'Atributos: ignorado', step: step, total: totalSteps });
    }
    if (window.__upsCancelMacro) throw new Error('Cancelado');

    // 6. Guia de Tamanhos
    if (nomeTabela && dados.medidasAtivo !== false) {
      ups('Preenchendo guia de tamanhos...');
      var bib2 = await new Promise(function(resolve) {
        chrome.storage.local.get(['biblioteca'], function(r) { resolve(r.biblioteca || {}); });
      });
      var tabela2 = bib2[nomeTabela];
      if (tabela2) {
        var result = await preencherGuiaTamanhosTemu(tabela2);
        if (result.missing && result.missing.length > 0) {
          alert('Tamanhos sem medida: ' + result.missing.join(', '));
        }
      }
    } else {
      step++; atualizarOverlayProgresso({ message: 'Guia de Tamanhos: ignorado', step: step, total: totalSteps });
    }
    if (window.__upsCancelMacro) throw new Error('Cancelado');

    // 7. País de Origem
    if (dados.paisOrigem) {
      ups('Selecionando País de Origem...');
      var safetySection = document.querySelector('#safety');
      if (safetySection) {
        var selects = safetySection.querySelectorAll('.ant-select');
        if (selects.length > 0) {
          var selectPais = selects[0];
          var rendered = selectPais.querySelector('.ant-select-selection__rendered');
          var currentText = rendered ? rendered.textContent.trim() : '';
          if (currentText.indexOf('Brazil') === -1) {
            var dd = await abrirDropdownTemu(selectPais);
            if (dd) {
              var options = dd.querySelectorAll('.ant-select-dropdown-menu-item');
              for (var pi = 0; pi < options.length; pi++) {
                if (options[pi].textContent.indexOf('Brazil') !== -1) {
                  options[pi].click();
                  await sleep(300);
                  break;
                }
              }
            }
          } else {
            ups('País de Origem já é Brazil');
          }
        }
      }
    } else {
      step++; atualizarOverlayProgresso({ message: 'País de Origem: ignorado', step: step, total: totalSteps });
    }

  } catch (err) {
    mostrarErroOverlayProgresso('Erro: ' + (err.message || err));
    await sleep(3000);
  }

  // Delay de 1s com a overlay de progresso visível
  atualizarOverlayProgresso({ message: 'Concluído!', step: 7, total: 7 });
  await sleep(1000);

  removerOverlayProgresso();

  // Scroll horizontal da tabela de variantes de volta ao início
  var scrollContainer = document.querySelector('#sales .vxe-table--body-wrapper, #sales .vxe-body--wrapper');
  if (scrollContainer) scrollContainer.scrollLeft = 0;
}

// ===== ATRIBUTOS (mundo MAIN via background) =====
// ===== ATRIBUTOS - salvar com opções disponíveis =====
function capturarAtributosComOpcoes() {
  var dados = {};
  var items = document.querySelectorAll('#attributes .ant-form-item');
  items.forEach(function(item) {
    var label = item.querySelector('.ant-form-item-label label');
    if (!label) return;
    var labelText = label.textContent.trim().replace('*', '').trim();
    if (!labelText) return;
    var selectVal = item.querySelector('.ant-select-selection-selected-value');
    var numInput = item.querySelector('input.ant-input-number-input');
    if (selectVal) {
      dados[labelText] = selectVal.textContent.trim();
      if (numInput && numInput.value) {
        dados[labelText + ' %'] = numInput.value;
      }
    } else if (numInput) {
      dados[labelText] = numInput.value;
    }
  });
  return dados;
}

// ===== ATRIBUTOS (replicando padrão Shein) =====
async function abrirDropdownTemu(select) {
  var openDd = document.querySelector('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
  if (openDd) {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    await sleep(150);
  }
  select.click();
  await sleep(400);
  var comboBox = select.querySelector('[role="combobox"]');
  var ariaId = comboBox ? comboBox.getAttribute('aria-controls') : null;
  var dropdown = null;
  if (ariaId) {
    dropdown = document.querySelector('#' + CSS.escape(ariaId) + ':not(.ant-select-dropdown-hidden)');
  }
  if (!dropdown) {
    dropdown = document.querySelector('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
  }
  return dropdown;
}

async function aplicarAtributosTemu(dados) {
  if (!dados || !Object.keys(dados).length) return;
  var attrSection = document.querySelector('#attributes');
  if (!attrSection) return;

  var maisBtn = Array.from(attrSection.querySelectorAll('*')).find(function(el) {
    return el.innerText && el.innerText.trim().toLowerCase() === 'mais atributos';
  });
  if (maisBtn) {
    maisBtn.click();
    await sleep(1500);
    // Clicar novamente se ainda tiver "mais atributos" (pode ter mais de um nível)
    var maisBtn2 = Array.from(attrSection.querySelectorAll('*')).find(function(el) {
      return el.innerText && el.innerText.trim().toLowerCase() === 'mais atributos';
    });
    if (maisBtn2) { maisBtn2.click(); await sleep(1000); }
  }

  var lastCount = 0;
  var formItems;
  for (var w = 0; w < 30; w++) {
    formItems = attrSection.querySelectorAll('.ant-form-item');
    if (formItems.length > 2 && formItems.length === lastCount) break;
    lastCount = formItems.length;
    await sleep(300);
  }

  var normal = function(s) { return s.replace(/[:\s]+/g, ' ').trim().toLowerCase(); };
  var ns = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;

  // Zerar todos os atributos antes de aplicar novos
  var allItems = attrSection.querySelectorAll('.ant-form-item');
  for (var r = 0; r < allItems.length; r++) {
    var rLabel = allItems[r].querySelector('.ant-form-item-label label');
    if (!rLabel) continue;
    var rLabelText = normal(rLabel.textContent);
    if (!rLabelText) continue;

    // Composição: remover linhas extras e limpar primeira
    var rPlusBtn = allItems[r].querySelector('.anticon-plus-circle');
    if (rPlusBtn) {
      var rRows = allItems[r].querySelectorAll('.flex_a_i_c');
      for (var x = rRows.length - 1; x > 0; x--) {
        rRows[x].remove();
        await sleep(100);
      }
      var firstRow = allItems[r].querySelector('.flex_a_i_c');
      if (firstRow) {
        var clearBtn = firstRow.querySelector('.ant-select-selection__clear');
        if (clearBtn) { clearBtn.click(); await sleep(150); }
        var rInput = firstRow.querySelector('input.ant-input');
        if (rInput) {
          rInput.focus();
          ns.call(rInput, '');
          rInput.dispatchEvent(new Event('input', { bubbles: true }));
          rInput.dispatchEvent(new Event('change', { bubbles: true }));
          rInput.blur();
        }
      }
      continue;
    }

    // Select: limpar seleção
    var rSelect = allItems[r].querySelector('.ant-select');
    if (rSelect) {
      var rClearBtn = rSelect.querySelector('.ant-select-selection__clear');
      if (rClearBtn) { rClearBtn.click(); await sleep(150); }
      continue;
    }

    // Input: limpar valor
    var rNumInput = allItems[r].querySelector('input.ant-input-number-input');
    var rTextInput = allItems[r].querySelector('input.ant-input');
    var rTarget = rNumInput || rTextInput;
    if (rTarget) {
      rTarget.focus();
      ns.call(rTarget, '');
      rTarget.dispatchEvent(new Event('input', { bubbles: true }));
      rTarget.dispatchEvent(new Event('change', { bubbles: true }));
      rTarget.blur();
    }
  }
  await sleep(300);

  var applied = 0, skipped = 0, failed = 0;

  for (var campo in dados) {
    if (!dados.hasOwnProperty(campo)) continue;
    var valor = dados[campo];
    if (!valor) continue;
    var targetLabel = normal(campo);
    var targetValue = normal(valor);

    var items = attrSection.querySelectorAll('.ant-form-item');
    for (var i = 0; i < items.length; i++) {
      var label = items[i].querySelector('.ant-form-item-label label');
      if (!label) continue;
      var labelText = normal(label.textContent);
      if (labelText !== targetLabel) continue;

      // Campo composto (Composição): múltiplas linhas com select + input + botão +
      var plusBtn = items[i].querySelector('.anticon-plus-circle');
      if (plusBtn) {
        var pairs = valor.split(', ');
        var rows = items[i].querySelectorAll('.flex_a_i_c');
        for (var p = 0; p < pairs.length; p++) {
          var pair = pairs[p].trim();
          var mat, pct;
          if (pair.indexOf('|') !== -1) {
            var parts = pair.split('|');
            mat = parts[0].trim();
            pct = parts[1] ? parts[1].trim() : '';
          } else {
            mat = pair;
            pct = '';
          }

          // Add new row if needed
          if (p > 0) {
            var currentRows = items[i].querySelectorAll('.flex_a_i_c');
            if (currentRows.length <= p) {
              plusBtn.click();
              await sleep(500);
              rows = items[i].querySelectorAll('.flex_a_i_c');
            }
          }

          var row = rows[p];
          if (!row) continue;

          console.log('[TEMU-ATTR] Composição row', p, '- mat:', mat, '| pct:', pct);

          // Fill select (material) - mesmo padrão dos outros selects
          var rowSelect = row.querySelector('.w_p50.ant-select');
          if (!rowSelect) rowSelect = row.querySelectorAll('.ant-select')[0];
          console.log('[TEMU-ATTR] rowSelect found:', !!rowSelect);
          if (rowSelect && mat) {
            var dd = await abrirDropdownTemu(rowSelect);
            console.log('[TEMU-ATTR] dropdown opened:', !!dd);
            if (dd) {
              var opt = Array.from(dd.querySelectorAll('li')).find(function(li) {
                return normal(li.textContent) === normal(mat);
              });
              console.log('[TEMU-ATTR] option found:', !!opt, 'for', mat);
              if (opt) { opt.click(); await sleep(300); }
              else {
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
                await sleep(150);
              }
            }
          }

          // Fill input (percentage)
          var rowInput = row.querySelector('input.ant-input');
          console.log('[TEMU-ATTR] rowInput found:', !!rowInput, 'value:', rowInput?.value);
          if (rowInput && pct) {
            rowInput.focus();
            ns.call(rowInput, pct);
            rowInput.dispatchEvent(new Event('input', { bubbles: true }));
            rowInput.dispatchEvent(new Event('change', { bubbles: true }));
            rowInput.blur();
          }
        }
        applied++;
        break;
      }

      var select = items[i].querySelector('.ant-select');
      if (!select) { failed++; break; }

      var currentVal = select.querySelector('.ant-select-selection-selected-value');
      if (currentVal && normal(currentVal.textContent) === targetValue) { skipped++; break; }

      // Open dropdown (Shein pattern)
      var dd = await abrirDropdownTemu(select);
      if (!dd) { failed++; break; }

      // Find option in <li> elements
      var opt = Array.from(dd.querySelectorAll('li')).find(function(li) {
        return normal(li.textContent) === targetValue;
      });

      if (opt) {
        opt.click();
        await sleep(300);
        applied++;
      } else {
        // Close dropdown
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
        await sleep(150);
        failed++;
      }
      break;
    }
  }

  console.log('[TEMU-ATTR]', applied, 'aplicados,', skipped, 'pulados,', failed, 'falharam');
}

// ===== GUIA DE TAMANHOS (vxe-table, colunas dinâmicas) =====
async function preencherGuiaTamanhosTemu(dados) {
  if (!dados) return { missing: [] };

  // Scroll size chart into view first (lazy-loaded vxe-table)
  var section = document.querySelector('#sizeChart');
  if (section) section.scrollIntoView({ behavior: 'auto', block: 'center' });
  await sleep(300);

  // Detectar colunas dinamicamente pelo header (col_* varia por anúncio)
  var headerRow = document.querySelector('#sizeChart .vxe-header--row');
  if (!headerRow) return { missing: [] };
  var ths = headerRow.querySelectorAll('th');
  var tamCol = '', brCol = '', chestCol = '', lengthCol = '';
  for (var h = 0; h < ths.length; h++) {
    var cls = Array.from(ths[h].classList).find(function(c) { return c.startsWith('col_'); }) || '';
    var txt = (ths[h].textContent || '').trim().toLowerCase();
    if (txt === 'tamanho' && !tamCol) tamCol = cls;
    else if (txt === 'br tamanho' || txt === 'br. tamanho') brCol = cls;
    else if (txt === 'chest') chestCol = cls;
    else if (txt === 'length') lengthCol = cls;
  }
  if (!tamCol || !chestCol || !lengthCol) return { missing: [] };

  var rows = document.querySelectorAll('#sizeChart .vxe-body--row');
  if (!rows || !rows.length) return { missing: [] };

  var nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  var faltantes = [];

  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];

    var tamEl = row.querySelector('.' + tamCol + ' .vxe-cell');
    var tamText = (tamEl ? tamEl.textContent.trim() : '').toUpperCase().replace('Y', '').trim();
    if (!tamText) continue;

    if (dados[tamText] && (dados[tamText].b || dados[tamText].c)) {
      // BR Tamanho — copia o texto do Tamanho
      if (brCol) {
        var inputBR = row.querySelector('.' + brCol + ' input.ant-input');
        if (inputBR && !inputBR.disabled && (!inputBR.value || !inputBR.value.trim())) {
          inputBR.focus();
          nativeSetter.call(inputBR, tamText);
          inputBR.dispatchEvent(new Event('input', { bubbles: true }));
          inputBR.dispatchEvent(new Event('change', { bubbles: true }));
          inputBR.blur();
        }
      }
      // Chest = Largura (b)
      var inputChest = row.querySelector('.' + chestCol + ' input.ant-input-number-input');
      if (inputChest && !inputChest.disabled && dados[tamText].b) {
        inputChest.focus();
        nativeSetter.call(inputChest, String(dados[tamText].b));
        inputChest.dispatchEvent(new Event('input', { bubbles: true }));
        inputChest.dispatchEvent(new Event('change', { bubbles: true }));
        inputChest.blur();
      }
      // Length = Altura (c)
      var inputLength = row.querySelector('.' + lengthCol + ' input.ant-input-number-input');
      if (inputLength && !inputLength.disabled && dados[tamText].c) {
        inputLength.focus();
        nativeSetter.call(inputLength, String(dados[tamText].c));
        inputLength.dispatchEvent(new Event('input', { bubbles: true }));
        inputLength.dispatchEvent(new Event('change', { bubbles: true }));
        inputLength.blur();
      }
    } else {
      faltantes.push(tamText);
    }
  }

  return { missing: faltantes };
}

// ===== MASS EDIT COLUMN =====
async function setColunaEmMassaTemu(coluna, valor) {
  var colMap = encontrarColunasTemu();
  var nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;

  // Pacote: single column with 3 inputs (C×L×A)
  if (coluna === 'pacote') {
    var cls = colMap.pacote;
    if (!cls) return;
    var rows = document.querySelectorAll('#sales .vxe-body--row');
    var partes = String(valor).split(/[x×]/);
    for (var r = 0; r < rows.length; r++) {
      var inputs = rows[r].querySelectorAll('.' + cls + ' input.ant-input-number-input');
      for (var p = 0; p < 3 && p < partes.length && p < inputs.length; p++) {
        if (inputs[p].disabled) continue;
        inputs[p].focus();
        nativeSetter.call(inputs[p], partes[p].trim());
        inputs[p].dispatchEvent(new Event('input', { bubbles: true }));
        inputs[p].dispatchEvent(new Event('change', { bubbles: true }));
        inputs[p].blur();
      }
    }
    return;
  }

  var cls = colMap[coluna];
  if (!cls) return;

  var inputs = document.querySelectorAll('#sales .vxe-body--row .' + cls + ' input.ant-input-number-input, #sales .vxe-body--row .' + cls + ' input.ant-input');
  if (!inputs.length) return;

  for (var i = 0; i < inputs.length; i++) {
    if (inputs[i].disabled) continue;
    inputs[i].focus();
    nativeSetter.call(inputs[i], String(valor));
    inputs[i].dispatchEvent(new Event('input', { bubbles: true }));
    inputs[i].dispatchEvent(new Event('change', { bubbles: true }));
    inputs[i].blur();
  }
}

// ===== PRECOS =====
async function setPrecosTemu(bulkPrice, listPrice) {
  var rows = document.querySelectorAll('#sales .vxe-body--row');
  if (!rows.length) return;
  var colMap = encontrarColunasTemu();
  var clsPrecoBase = colMap.precoBase;
  var clsPrecoLista = colMap.precoLista;
  if (!clsPrecoBase) return;
  var nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;

  for (var i = 0; i < rows.length; i++) {
    // Preço Base
    var inputBase = rows[i].querySelector('.' + clsPrecoBase + ' input.ant-input-number-input');
    if (inputBase && !inputBase.disabled && bulkPrice) {
      inputBase.focus();
      nativeSetter.call(inputBase, String(bulkPrice));
      inputBase.dispatchEvent(new Event('input', { bubbles: true }));
      inputBase.dispatchEvent(new Event('change', { bubbles: true }));
      inputBase.blur();
    }

    // Preço de Lista
    if (clsPrecoLista && listPrice) {
      var inputLista = rows[i].querySelector('.' + clsPrecoLista + ' input.ant-input-number-input');
      if (inputLista && !inputLista.disabled) {
        inputLista.focus();
        nativeSetter.call(inputLista, String(listPrice));
        inputLista.dispatchEvent(new Event('input', { bubbles: true }));
        inputLista.dispatchEvent(new Event('change', { bubbles: true }));
        inputLista.blur();
      }
    }
  }
}

// ===== SKU MASS GENERATION (clica botão Gerar) =====
async function gerarSkuEmMassaTemu() {
  // Click the "Gerar" button/span in the SKU column header
  var headerCells = document.querySelectorAll('#sales .vxe-header--column');
  for (var i = 0; i < headerCells.length; i++) {
    var txt = (headerCells[i].textContent || '').trim().toLowerCase();
    if (txt.startsWith('sku')) {
      var gerarBtn = headerCells[i].querySelector('button, .my_txt_btn, [class*="gerar"], span');
      // Filter: only clickable elements with "Gerar" or "gerar" text
      var allClicks = headerCells[i].querySelectorAll('button, span');
      for (var c = 0; c < allClicks.length; c++) {
        var el = allClicks[c];
        var elTxt = (el.textContent || '').trim().toLowerCase();
        if (elTxt.startsWith('gerar') || elTxt.startsWith('gera')) {
          el.click();
          await sleep(800);
          return;
        }
      }
    }
  }

  // Fallback: fill empty SKU inputs manually
  var colMap = encontrarColunasTemu();
  var cls = colMap.sku;
  if (!cls) return;
  var inputs = document.querySelectorAll('#sales .vxe-body--row .' + cls + ' input.ant-input');
  if (!inputs.length) return;
  var nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  for (var j = 0; j < inputs.length; j++) {
    if (inputs[j].value && inputs[j].value.trim()) continue;
    if (inputs[j].disabled) continue;
    var sku = 'SKU' + (j + 1).toString().padStart(3, '0');
    inputs[j].focus();
    nativeSetter.call(inputs[j], sku);
    inputs[j].dispatchEvent(new Event('input', { bubbles: true }));
    inputs[j].dispatchEvent(new Event('change', { bubbles: true }));
    inputs[j].blur();
  }
}

// ===== OVERLAY =====
function abrirDialogTemu() {
  var existing = document.getElementById('ups-temu-overlay');
  if (existing) existing.remove();

  var overlay = document.createElement('div');
  overlay.id = 'ups-temu-overlay';
  overlay.innerHTML = `
<div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.45);z-index:999999;display:flex;align-items:center;justify-content:center;">
<div style="background:white;border-radius:8px;padding:24px;width:540px;max-width:95vw;max-height:90vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,0.25);font-family:sans-serif;">
<div style="font-size:18px;font-weight:bold;margin-bottom:16px;">Automação Temu - UpSeller</div>

<style>
.ups-ac { margin-bottom:8px;border-radius:8px;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,0.08);overflow:hidden; }
.ups-ac-h { display:flex;align-items:center;gap:10px;padding:10px 14px;cursor:pointer;user-select:none;font-size:14px;font-weight:600;background:linear-gradient(135deg,#f8f9fa,#e9ecef);transition:background .2s; }
.ups-ac-h:hover { background:linear-gradient(135deg,#e9ecef,#dee2e6); }
.ups-ac-body { max-height:0;overflow:hidden;transition:max-height .35s ease; }
.ups-ac-body-inner { padding:12px 14px;border-top:1px solid #e9ecef; }
.ups-ac-ar { font-size:10px;color:#888;transition:transform .2s;margin-right:6px; }
.ups-tag { display:inline-flex;align-items:center;gap:3px;background:#e8f5e9;border:1px solid #c8e6c9;border-radius:4px;padding:2px 6px;font-size:12px;font-weight:500;line-height:1.4; }
.ups-tag-rm { cursor:pointer;font-size:14px;color:#999;line-height:1;margin-left:2px; }
.ups-tag-rm:hover { color:#dc3545; }
#ups-tm-toggle + span { transition:.3s; display:inline-block; width:36px;height:20px;border-radius:20px;background:#ccc;vertical-align:middle; }
#ups-tm-toggle:checked + span { background:#28a745; }
#ups-tm-toggle:checked + span::before { transform:translateX(16px); }
#ups-tm-toggle + span::before { content:""; position:absolute; width:16px;height:16px;border-radius:50%;background:white;top:2px;left:2px;transition:.3s; }
#ups-tp-s-macro,#ups-tp-s-multi { background:#ccc; }
#ups-tp-t-macro:checked + #ups-tp-s-macro { background:#28a745; }
#ups-tp-t-macro:checked + #ups-tp-s-macro::before { transform:translateX(16px); }
#ups-tp-s-macro::before { content:""; position:absolute; width:16px;height:16px;border-radius:50%;background:white;top:2px;left:2px;transition:.3s; }
#ups-tp-t-multi:checked + #ups-tp-s-multi { background:#ff9800; }
#ups-tp-t-multi:checked + #ups-tp-s-multi::before { transform:translateX(16px); }
#ups-tp-s-multi::before { content:""; position:absolute; width:16px;height:16px;border-radius:50%;background:white;top:2px;left:2px;transition:.3s; }
/* Accordion toggle switches */
#ups-ac-tpp-mt,#ups-ac-tpp-preco,#ups-ac-tpp-attr{ background:#ccc; }
#ups-ac-t-mt:checked + #ups-ac-tpp-mt { background:#28a745; }
#ups-ac-t-mt:checked + #ups-ac-tpp-mt::before { transform:translateX(16px); }
#ups-ac-tpp-mt::before{ content:""; position:absolute; width:16px;height:16px;border-radius:50%;background:white;top:2px;left:2px;transition:.3s; }
#ups-ac-t-preco:checked + #ups-ac-tpp-preco { background:#28a745; }
#ups-ac-t-preco:checked + #ups-ac-tpp-preco::before { transform:translateX(16px); }
#ups-ac-tpp-preco::before{ content:""; position:absolute; width:16px;height:16px;border-radius:50%;background:white;top:2px;left:2px;transition:.3s; }
#ups-ac-t-attr:checked + #ups-ac-tpp-attr { background:#28a745; }
#ups-ac-t-attr:checked + #ups-ac-tpp-attr::before { transform:translateX(16px); }
#ups-ac-tpp-attr::before{ content:""; position:absolute; width:16px;height:16px;border-radius:50%;background:white;top:2px;left:2px;transition:.3s; }
</style>

<label style="font-size:12px;font-weight:600;display:block;margin-bottom:3px;">Carregar Salvo</label>
<div style="display:flex;gap:4px;margin-bottom:10px;">
<select id="ups-tp-ps" style="flex:1;padding:6px;border:1px solid #ccc;border-radius:4px;font-size:13px;box-sizing:border-box;"><option value="">Selecionar...</option></select>
<button id="ups-tp-salvar" style="padding:4px 10px;border:1px solid #28a745;border-radius:4px;cursor:pointer;font-size:12px;background:#28a745;color:white;white-space:nowrap;">💾 Salvar</button>
<button id="ups-tp-excluir" style="padding:4px 10px;border:1px solid #dc3545;border-radius:4px;cursor:pointer;font-size:12px;background:white;color:#dc3545;white-space:nowrap;">🗑</button>
</div>

<!-- MEDIDAS ACCORDION -->
<div class="ups-ac">
  <div class="ups-ac-h" data-ac-target="ups-tp-ac-b-mt" id="ups-tp-ac-h-mt">
    <span>📏 Medidas</span>
    <span class="ups-ac-ar" style="transition:transform .2s;">▶</span>
    <label style="position:relative;display:inline-block;width:36px;height:20px;margin-left:auto;cursor:pointer;" onclick="event.stopPropagation()">
      <input type="checkbox" id="ups-ac-t-mt" checked style="opacity:0;width:0;height:0;margin:0;">
      <span id="ups-ac-tpp-mt" style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;border-radius:20px;transition:.3s;"></span>
    </label>
  </div>
  <div class="ups-ac-body" id="ups-tp-ac-b-mt"><div class="ups-ac-body-inner">
    <label style="font-size:13px;font-weight:600;display:block;margin-bottom:8px;">Tabela de Medidas</label>
    <div style="display:flex;gap:4px;margin-bottom:12px;align-items:center;">
      <select id="ups-tp-mt" style="flex:1;padding:8px;border:1px solid #ccc;border-radius:4px;font-size:14px;box-sizing:border-box;"><option value="">Selecionar...</option></select>
      <button id="ups-tp-editar-medida" style="padding:8px 10px;border:1px solid #4078f2;border-radius:4px;cursor:pointer;font-size:14px;background:white;color:#4078f2;white-space:nowrap;" title="Editar tabela">✏️</button>
      <button id="ups-tp-nova-medida" style="padding:8px 10px;border:1px solid #28a745;border-radius:4px;cursor:pointer;font-size:14px;background:white;color:#28a745;white-space:nowrap;" title="Criar tabela">➕</button>
      <button id="ups-tp-excluir-medida" style="padding:8px 10px;border:1px solid #dc3545;border-radius:4px;cursor:pointer;font-size:14px;background:white;color:#dc3545;white-space:nowrap;display:none;" title="Deletar tabela">🗑️</button>
    </div>
    <div id="ups-tp-mt-display" style="padding:10px;background:#f9f9f9;border:1px solid #e0e0e0;border-radius:4px;font-size:12px;color:#666;max-height:250px;overflow-y:auto;"></div>
  </div></div>
</div>

<!-- PREÇO ACCORDION -->
<div class="ups-ac">
  <div class="ups-ac-h" data-ac-target="ups-tp-ac-b-preco" id="ups-tp-ac-h-preco">
    <span>💰 Preço</span>
    <span class="ups-ac-ar" style="transition:transform .2s;">▶</span>
    <label style="position:relative;display:inline-block;width:36px;height:20px;margin-left:auto;cursor:pointer;" onclick="event.stopPropagation()">
      <input type="checkbox" id="ups-ac-t-preco" checked style="opacity:0;width:0;height:0;margin:0;">
      <span id="ups-ac-tpp-preco" style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;border-radius:20px;transition:.3s;"></span>
    </label>
  </div>
  <div class="ups-ac-body" id="ups-tp-ac-b-preco"><div class="ups-ac-body-inner">
    <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Preço Base (R$) <span style="color:#888;font-weight:400;font-size:11px;">— Preço Especial</span></label>
    <input id="ups-tp-pb" type="text" placeholder="Ex: 19,90" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:4px;font-size:14px;box-sizing:border-box;margin-bottom:10px;">

    <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Preço de Lista (R$) <span style="color:#888;font-weight:400;font-size:11px;">— Preço Cheio</span></label>
    <input id="ups-tp-pl" type="text" placeholder="Ex: 109,90" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:4px;font-size:14px;box-sizing:border-box;margin-bottom:0;">
  </div></div>
</div>

<!-- EDITAR EM MASSA ACCORDION -->
<div class="ups-ac">
  <div class="ups-ac-h" data-ac-target="ups-tp-ac-b-macro" id="ups-tp-ac-h-macro">
    <span>🛠 Editar em Massa</span>
    <span class="ups-ac-ar" style="transition:transform .2s;">▶</span>
    <label style="position:relative;display:inline-block;width:36px;height:20px;margin-left:auto;cursor:pointer;">
      <input type="checkbox" id="ups-tp-t-macro" checked style="opacity:0;width:0;height:0;margin:0;">
      <span id="ups-tp-s-macro" style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;border-radius:20px;"></span>
    </label>
  </div>
  <div class="ups-ac-body" id="ups-tp-ac-b-macro"><div class="ups-ac-body-inner">
    <label style="font-size:12px;font-weight:600;display:block;margin-bottom:3px;">Carregar Macro Salvo</label>
    <div style="display:flex;gap:4px;margin-bottom:10px;">
      <select id="ups-tp-ms" style="flex:1;padding:6px;border:1px solid #ccc;border-radius:4px;font-size:13px;box-sizing:border-box;"><option value="">Selecionar...</option></select>
      <button id="ups-tp-m-salvar" style="padding:4px 10px;border:1px solid #28a745;border-radius:4px;cursor:pointer;font-size:12px;background:#28a745;color:white;white-space:nowrap;">💾 Salvar</button>
      <button id="ups-tp-m-excluir" style="padding:4px 10px;border:1px solid #dc3545;border-radius:4px;cursor:pointer;font-size:12px;background:white;color:#dc3545;white-space:nowrap;">🗑</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;">
      <div>
        <label style="font-size:12px;font-weight:600;display:block;margin-bottom:2px;">Quantidade</label>
        <input id="ups-tp-eq" type="text" placeholder="Ex: 10000" style="width:100%;padding:6px;border:1px solid #ccc;border-radius:4px;font-size:13px;box-sizing:border-box;">
      </div>
      <div>
        <label style="font-size:12px;font-weight:600;display:block;margin-bottom:2px;">Preço Base (R$)</label>
        <input id="ups-tp-epb" type="text" placeholder="Ex: 29,90" style="width:100%;padding:6px;border:1px solid #ccc;border-radius:4px;font-size:13px;box-sizing:border-box;">
      </div>
      <div>
        <label style="font-size:12px;font-weight:600;display:block;margin-bottom:2px;">Preço Lista (R$)</label>
        <input id="ups-tp-epl" type="text" placeholder="Ex: 109,90" style="width:100%;padding:6px;border:1px solid #ccc;border-radius:4px;font-size:13px;box-sizing:border-box;">
      </div>
      <div>
        <label style="font-size:12px;font-weight:600;display:block;margin-bottom:2px;">Peso(g)</label>
        <input id="ups-tp-ew" type="text" placeholder="Ex: 200" style="width:100%;padding:6px;border:1px solid #ccc;border-radius:4px;font-size:13px;box-sizing:border-box;">
      </div>
      <div style="grid-column:span 2;">
        <label style="font-size:12px;font-weight:600;display:block;margin-bottom:2px;">Pacote(cm) (CxLxA)</label>
        <input id="ups-tp-epkg" type="text" placeholder="28x36x12" style="width:100%;padding:6px;border:1px solid #ccc;border-radius:4px;font-size:13px;box-sizing:border-box;">
      </div>
    </div>
    <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;">
      <label style="font-size:13px;font-weight:600;display:flex;align-items:center;gap:4px;white-space:nowrap;">
        <input type="checkbox" id="ups-tp-sku" style="margin:0;"> Gerar SKU
      </label>
      <label style="font-size:13px;font-weight:600;display:flex;align-items:center;gap:4px;white-space:nowrap;">
        <input type="checkbox" id="ups-tp-epais" style="margin:0;"> País de Origem
      </label>
    </div>
  </div></div>
</div>

<!-- ATRIBUTOS ACCORDION -->
<div class="ups-ac">
  <div class="ups-ac-h" data-ac-target="ups-tp-ac-b-attr" id="ups-tp-ac-h-attr">
    <span>🏷 Atributos</span>
    <span class="ups-ac-ar" style="transition:transform .2s;">▶</span>
    <label style="position:relative;display:inline-block;width:36px;height:20px;margin-left:auto;cursor:pointer;" onclick="event.stopPropagation()">
      <input type="checkbox" id="ups-ac-t-attr" checked style="opacity:0;width:0;height:0;margin:0;">
      <span id="ups-ac-tpp-attr" style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;border-radius:20px;transition:.3s;"></span>
    </label>
  </div>
  <div class="ups-ac-body" id="ups-tp-ac-b-attr"><div class="ups-ac-body-inner">
    <label style="font-size:12px;font-weight:600;display:block;margin-bottom:3px;">Presets de Atributos</label>
    <select id="ups-tp-as" style="width:100%;padding:4px;border:1px solid #ccc;border-radius:4px;font-size:11px;box-sizing:border-box;margin-bottom:4px;"><option value="">Carregar Salvo...</option></select>
    <div style="display:flex;gap:3px;">
      <input id="ups-tp-a-nome" type="text" placeholder="Nome do preset" style="flex:1;padding:4px;border:1px solid #ccc;border-radius:4px;font-size:11px;">
      <button id="ups-tp-a-salvar" style="padding:4px 10px;background:#4078f2;color:white;border:none;border-radius:4px;cursor:pointer;font-size:14px;line-height:1;">💾</button>
    </div>
    <button id="ups-tp-a-excluir" style="display:none;width:100%;margin-top:4px;padding:3px;border:1px solid #dc3545;color:#dc3545;border-radius:4px;cursor:pointer;font-size:11px;background:white;">× Excluir</button>
    <div style="font-size:11px;color:#666;margin-top:4px;">Salva os atributos manualmente configurados para aplicar em anúncios futuros da mesma categoria.</div>
  </div></div>
</div>

<!-- MULTI-ABA ACCORDION -->
<div class="ups-ac">
  <div class="ups-ac-h" data-ac-target="ups-tp-ac-b-multi" id="ups-tp-ac-h-multi">
    <span>🔄 Multi-Aba</span>
    <span class="ups-ac-ar" style="transition:transform .2s;">▶</span>
    <label style="position:relative;display:inline-block;width:36px;height:20px;margin-left:auto;cursor:pointer;">
      <input type="checkbox" id="ups-tp-t-multi" style="opacity:0;width:0;height:0;margin:0;">
      <span id="ups-tp-s-multi" style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;border-radius:20px;"></span>
    </label>
  </div>
  <div class="ups-ac-body" id="ups-tp-ac-b-multi"><div class="ups-ac-body-inner">
    <div style="display:flex;align-items:center;gap:8px;">
      <button id="ups-tp-multi-toggle" style="padding:6px 14px;border:1px solid #ccc;border-radius:4px;cursor:pointer;font-size:12px;background:#fff;font-weight:600;">SEQUENCIAL</button>
      <span style="font-size:12px;color:#666;">Modo atual: <b id="ups-tp-multi-label">Sequencial</b></span>
    </div>
    <p style="font-size:11px;color:#999;margin:8px 0 0;">PARALELO: abas lado a lado em janelas próprias. SEQUENCIAL: uma aba por vez.</p>
  </div></div>
</div>

<div style="display:flex;gap:8px;justify-content:flex-end;border-top:1px solid #eee;padding-top:12px;margin-top:12px;">
  <button id="ups-tp-cancelar" style="padding:8px 20px;border:1px solid #ccc;border-radius:4px;cursor:pointer;font-size:13px;background:white;">Cancelar</button>
  <button id="ups-tp-executar" style="padding:8px 20px;background:#28a745;color:white;border:none;border-radius:4px;cursor:pointer;font-weight:bold;font-size:13px;">APLICAR TUDO</button>
</div>
</div>
</div>`;
  document.body.appendChild(overlay);

  // Click outside to close
  overlay.addEventListener('click', function(e) {
    var contentBox = overlay.querySelector('div[style*="background:white"]');
    if (contentBox && !contentBox.contains(e.target)) {
      salvarEstadoTemu();
      overlay.remove();
    }
  });

  // ===== ACCORDION BINDING =====
  function toggleAc(hdr) {
    var bodyId = hdr.getAttribute('data-ac-target');
    var body = document.getElementById(bodyId);
    if (!body) return;
    var arrow = hdr.querySelector('.ups-ac-ar');
    if (body.style.maxHeight) {
      body.style.maxHeight = null;
      if (arrow) arrow.style.transform = 'rotate(0deg)';
    } else {
      body.style.maxHeight = body.scrollHeight + 'px';
      if (arrow) arrow.style.transform = 'rotate(90deg)';
    }
  }
  var headers = overlay.querySelectorAll('.ups-ac-h[data-ac-target]');
  headers.forEach(function(h) {
    h.addEventListener('click', function() { toggleAc(h); });
    h.style.cursor = 'pointer';
  });

  var el = sel;

  // ===== CONFIRM CUSTOM =====
  function confirmarExtensao(msg) {
    return new Promise(function(resolve) {
      var div = document.createElement('div');
      div.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.45);z-index:99999999;display:flex;align-items:center;justify-content:center;font-family:sans-serif;';
      div.innerHTML = '<div style="background:white;border-radius:8px;padding:20px;width:320px;max-width:90vw;box-shadow:0 8px 32px rgba(0,0,0,0.25);text-align:center;">' +
        '<div style="font-size:14px;font-weight:600;margin-bottom:16px;color:#333;">' + msg + '</div>' +
        '<div style="display:flex;gap:8px;justify-content:center;">' +
        '<button id="ups-confirm-cancel" style="padding:8px 20px;border:1px solid #ccc;border-radius:4px;cursor:pointer;font-size:13px;background:white;color:#333;">Cancelar</button>' +
        '<button id="ups-confirm-ok" style="padding:8px 20px;background:#dc3545;color:white;border:none;border-radius:4px;cursor:pointer;font-weight:bold;font-size:13px;">Excluir</button>' +
        '</div></div>';
      document.body.appendChild(div);
      div.querySelector('#ups-confirm-cancel').onclick = function() { div.remove(); resolve(false); };
      div.querySelector('#ups-confirm-ok').onclick = function() { div.remove(); resolve(true); };
      div.addEventListener('click', function(e) { if (e.target === div) { div.remove(); resolve(false); } });
    });
  }

  // ===== MEASURE TABLE FUNCTIONS =====
  function carregarBibliotecaTabelas() {
    try {
      if (!chrome || !chrome.storage) { mostrarFeedback('Storage indisponível', '#dc3545'); return; }
    } catch(e) { return; }
    chrome.storage.local.get(['biblioteca', 'ultimaSelecionada'], function(res) {
      var bib = res.biblioteca || {};
      var ultima = res.ultimaSelecionada || '';
      var sel = el('#ups-tp-mt');
      sel.innerHTML = '<option value="">Selecionar...</option>';
      Object.keys(bib).sort().forEach(function(nome) {
        var opt = document.createElement('option');
        opt.value = nome;
        opt.textContent = nome;
        if (nome === ultima) opt.selected = true;
        sel.appendChild(opt);
      });

      if (ultima && bib[ultima]) {
        mostrarMedidasSelecionadas(bib, ultima);
      } else {
        el('#ups-tp-mt-display').innerHTML = '<span style="color:#999;">Selecione uma tabela.</span>';
        el('#ups-tp-excluir-medida').style.display = 'none';
      }
    });
  }

  function mostrarMedidasSelecionadas(bib, nome) {
    if (!bib[nome]) return;
    var dados = bib[nome];
    var display = el('#ups-tp-mt-display');
    var excluded = new Set(['descricao','topicos','macros','precos','emMassa','sku','crop','confirmarCores','ativar','sub','quantidade','preco','peso','pacote','paisOrigem']);
    var tamanhos = Object.keys(dados).filter(function(k) {
      return !excluded.has(k) && typeof dados[k] === 'object' && dados[k] !== null && !Array.isArray(dados[k]);
    });
    var desc = dados.descricao || '';
    var topicos = dados.topicos || [];
    var h = '';
    if (desc) h += '<div style="margin-bottom:8px;font-style:italic;color:#555;font-size:12px;">' + desc + '</div>';
    if (topicos.length) {
      h += '<div style="margin-bottom:8px;font-size:12px;">';
      for (var ti = 0; ti < topicos.length; ti++) {
        h += '<div style="color:#555;margin-bottom:2px;"><b>' + (ti + 1) + '.</b> ' + topicos[ti] + '</div>';
      }
      h += '</div>';
    }
    if (!tamanhos.length && !desc && !topicos.length) {
      display.innerHTML = '<span style="color:#999;">Nenhum dado configurado.</span>';
      return;
    }
    if (tamanhos.length) {
      h += '<table style="width:100%;border-collapse:collapse;font-family:sans-serif;"><thead><tr style="background:#eee;">';
      h += '<th style="padding:4px 8px;border:1px solid #ccc;font-size:12px;text-align:left;">Tamanho</th>';
      h += '<th style="padding:4px 8px;border:1px solid #ccc;font-size:12px;text-align:left;">Largura</th>';
      h += '<th style="padding:4px 8px;border:1px solid #ccc;font-size:12px;text-align:left;">Altura</th>';
      h += '</tr></thead><tbody>';
      for (var i = 0; i < tamanhos.length; i++) {
        var t = tamanhos[i];
        h += '<tr><td style="padding:4px 8px;border:1px solid #ccc;font-size:12px;font-weight:bold;text-transform:uppercase;">' + t + '</td>';
        h += '<td style="padding:4px 8px;border:1px solid #ccc;font-size:12px;">' + (dados[t].b || '-') + '</td>';
        h += '<td style="padding:4px 8px;border:1px solid #ccc;font-size:12px;">' + (dados[t].c || '-') + '</td></tr>';
      }
      h += '</tbody></table>';
    }
    display.innerHTML = h;
    // Show delete button
    var delBtn = el('#ups-tp-excluir-medida');
    if (delBtn) delBtn.style.display = 'inline-block';
  }

  el('#ups-tp-mt').addEventListener('change', function() {
    var nome = this.value;
    var delBtn = el('#ups-tp-excluir-medida');
    if (!nome) {
      el('#ups-tp-mt-display').innerHTML = '<span style="color:#999;">Selecione uma tabela.</span>';
      if (delBtn) delBtn.style.display = 'none';
      return;
    }
    if (delBtn) delBtn.style.display = 'inline-block';
    chrome.storage.local.get(['biblioteca'], function(res) {
      var bib = res.biblioteca || {};
      mostrarMedidasSelecionadas(bib, nome);
    });
  });

  el('#ups-tp-editar-medida').addEventListener('click', function() {
    var nome = el('#ups-tp-mt').value;
    if (!nome) { mostrarFeedback('Selecione uma tabela para editar.', '#dc3545'); return; }
    chrome.storage.local.get(['biblioteca'], function(res) {
      var bib = res.biblioteca || {};
      var chavesFixas = new Set(['descricao','topicos','macros','precos','emMassa','sku','crop','confirmarCores','ativar','sub','quantidade','preco','peso','pacote','paisOrigem']);
      function atualizarSelectMedidas(novoNome) {
        chrome.storage.local.get(['biblioteca', 'ultimaSelecionada'], function(r2) {
          var bib2 = r2.biblioteca || {};
          var sel2 = el('#ups-tp-mt');
          sel2.innerHTML = '<option value="">Selecionar...</option>';
          Object.keys(bib2).sort().forEach(function(n) {
            var opt = document.createElement('option');
            opt.value = n; opt.textContent = n;
            if (n === novoNome) opt.selected = true;
            sel2.appendChild(opt);
          });
        });
      }
      function atualizarDesc(novoNome) {
        chrome.storage.local.get(['biblioteca'], function(r2) {
          var bib2 = r2.biblioteca || {};
          mostrarMedidasSelecionadas(bib2, novoNome);
        });
      }
      if (typeof abrirPopupEditarMedidas === 'function') {
        abrirPopupEditarMedidas(nome, bib, chavesFixas, atualizarSelectMedidas, atualizarDesc);
      } else {
        alert('Função de edição de medidas não disponível.');
      }
    });
  });

  el('#ups-tp-nova-medida').addEventListener('click', function() {
    chrome.storage.local.get(['biblioteca'], function(res) {
      var bib = res.biblioteca || {};
      var chavesFixas = new Set(['descricao','topicos','macros','precos','emMassa','sku','crop','confirmarCores','ativar','sub','quantidade','preco','peso','pacote','paisOrigem']);
      function atualizarSelectMedidas(novoNome) {
        chrome.storage.local.get(['biblioteca', 'ultimaSelecionada'], function(r2) {
          var bib2 = r2.biblioteca || {};
          var sel2 = el('#ups-tp-mt');
          sel2.innerHTML = '<option value="">Selecionar...</option>';
          Object.keys(bib2).sort().forEach(function(n) {
            var opt = document.createElement('option');
            opt.value = n; opt.textContent = n;
            if (n === novoNome) opt.selected = true;
            sel2.appendChild(opt);
          });
        });
      }
      function atualizarDesc(novoNome) {
        chrome.storage.local.get(['biblioteca'], function(r2) {
          var bib2 = r2.biblioteca || {};
          mostrarMedidasSelecionadas(bib2, novoNome);
        });
      }
      if (typeof abrirPopupEditarMedidas === 'function') {
        abrirPopupEditarMedidas(null, bib, chavesFixas, atualizarSelectMedidas, atualizarDesc);
      } else {
        alert('Função de edição de medidas não disponível.');
      }
    });
  });

  el('#ups-tp-excluir-medida').addEventListener('click', async function() {
    var nome = el('#ups-tp-mt').value;
    if (!nome) { alert('Selecione uma tabela para excluir.'); return; }
    if (!await confirmarExtensao('Excluir tabela "' + nome + '"?')) return;
    chrome.storage.local.get(['biblioteca'], function(res) {
      var bib = res.biblioteca || {};
      delete bib[nome];
      chrome.storage.local.set({ biblioteca: bib }, function() {
        carregarBibliotecaTabelas();
      });
    });
  });

  // ===== PRESET DO OVERLAY INTEIRO =====
  function lerEstadoOverlayTemu() {
    return {
      selectedTable: el('#ups-tp-mt').value,
      bulkPrice: el('#ups-tp-pb').value,
      listPrice: el('#ups-tp-pl').value,
      medidasAtivo: (el('#ups-ac-t-mt') || {}).checked !== false,
      precoAtivo: (el('#ups-ac-t-preco') || {}).checked !== false,
      macroAtivo: el('#ups-tp-t-macro').checked,
      atributosAtivo: (el('#ups-ac-t-attr') || {}).checked !== false,
      emMassa: {
        quantidade: el('#ups-tp-eq').value,
        precoBase: el('#ups-tp-epb').value,
        precoLista: el('#ups-tp-epl').value,
        peso: el('#ups-tp-ew').value,
        pacote: el('#ups-tp-epkg').value
      },
      sku: el('#ups-tp-sku').checked,
      paisOrigem: el('#ups-tp-epais').checked,
      attrPreset: el('#ups-tp-as').value,
      macroPreset: el('#ups-tp-ms').value,
      multiAtivo: el('#ups-tp-t-multi').checked,
      multiModo: el('#ups-tp-multi-label').textContent.trim().toLowerCase() === 'paralelo' ? 'paralelo' : 'sequencial'
    };
  }

  function restaurarEstadoOverlayTemu(dados) {
    if (!dados) return;
    if (dados.selectedTable) el('#ups-tp-mt').value = dados.selectedTable;
    if (dados.bulkPrice) el('#ups-tp-pb').value = dados.bulkPrice;
    if (dados.listPrice) el('#ups-tp-pl').value = dados.listPrice;
    el('#ups-tp-t-macro').checked = dados.macroAtivo !== false;
    if (dados.medidasAtivo !== undefined) (el('#ups-ac-t-mt') || {}).checked = dados.medidasAtivo;
    if (dados.precoAtivo !== undefined) (el('#ups-ac-t-preco') || {}).checked = dados.precoAtivo;
    if (dados.atributosAtivo !== undefined) (el('#ups-ac-t-attr') || {}).checked = dados.atributosAtivo;
    if (dados.emMassa) {
      el('#ups-tp-eq').value = dados.emMassa.quantidade || '';
      el('#ups-tp-epb').value = dados.emMassa.precoBase || '';
      el('#ups-tp-epl').value = dados.emMassa.precoLista || '';
      el('#ups-tp-ew').value = dados.emMassa.peso || '';
      el('#ups-tp-epkg').value = dados.emMassa.pacote || '';
    }
    el('#ups-tp-sku').checked = !!dados.sku;
    el('#ups-tp-epais').checked = !!dados.paisOrigem;
    if (dados.attrPreset) {
      // will apply after dropdown loads
      setTimeout(function() { el('#ups-tp-as').value = dados.attrPreset; }, 200);
    }
    if (dados.macroPreset) {
      setTimeout(function() { el('#ups-tp-ms').value = dados.macroPreset; }, 200);
    }
    if (dados.multiModo === 'paralelo') {
      el('#ups-tp-multi-toggle').textContent = 'PARALELO';
      el('#ups-tp-multi-label').textContent = 'Paralelo';
    }
  }

  function salvarEstadoTemu() {
    var estado = lerEstadoOverlayTemu();
    chrome.storage.local.set({ [TEMU_ULTIMO_ESTADO]: estado });
  }

  function restaurarEstadoTemu() {
    chrome.storage.local.get([TEMU_ULTIMO_ESTADO], function(res) {
      if (res[TEMU_ULTIMO_ESTADO]) {
        restaurarEstadoOverlayTemu(res[TEMU_ULTIMO_ESTADO]);
      }
    });
  }

  function salvarPresetTemu() {
    var nome = prompt('Nome do preset:');
    if (!nome) return;
    var estado = lerEstadoOverlayTemu();
    chrome.storage.local.get([TEMU_PRESETS_KEY], function(res) {
      var presets = res[TEMU_PRESETS_KEY] || {};
      presets[nome] = estado;
      chrome.storage.local.set({ [TEMU_PRESETS_KEY]: presets }, function() {
        preencherListaPresetsTemu();
        el('#ups-tp-ps').value = nome;
        mostrarFeedback('Preset "' + nome + '" salvo.');
      });
    });
  }

  async function excluirPresetTemu() {
    var nome = el('#ups-tp-ps').value;
    if (!nome) { alert('Selecione um preset para excluir.'); return; }
    if (!await confirmarExtensao('Excluir preset "' + nome + '"?')) return;
    chrome.storage.local.get([TEMU_PRESETS_KEY], function(res) {
      var presets = res[TEMU_PRESETS_KEY] || {};
      delete presets[nome];
      chrome.storage.local.set({ [TEMU_PRESETS_KEY]: presets }, function() {
        preencherListaPresetsTemu();
        mostrarFeedback('Preset excluído.');
      });
    });
  }

  function preencherListaPresetsTemu() {
    chrome.storage.local.get([TEMU_PRESETS_KEY], function(res) {
      var presets = res[TEMU_PRESETS_KEY] || {};
      var sel = el('#ups-tp-ps');
      sel.innerHTML = '<option value="">Selecionar...</option>';
      Object.keys(presets).sort().forEach(function(nome) {
        var opt = document.createElement('option');
        opt.value = nome;
        opt.textContent = nome;
        sel.appendChild(opt);
      });
    });
  }

  el('#ups-tp-ps').addEventListener('change', function() {
    var nome = this.value;
    if (!nome) return;
    chrome.storage.local.get([TEMU_PRESETS_KEY], function(res) {
      var presets = res[TEMU_PRESETS_KEY] || {};
      var dados = presets[nome];
      if (dados) restaurarEstadoOverlayTemu(dados);
    });
  });

  el('#ups-tp-salvar').addEventListener('click', salvarPresetTemu);
  el('#ups-tp-excluir').addEventListener('click', excluirPresetTemu);

  // ===== MACRO PRESET =====
  function salvarMacroPresetTemu() {
    var nome = prompt('Nome da macro:');
    if (!nome) return;
    var estado = {
      emMassa: {
        quantidade: el('#ups-tp-eq').value,
        precoBase: el('#ups-tp-epb').value,
        precoLista: el('#ups-tp-epl').value,
        peso: el('#ups-tp-ew').value,
        pacote: el('#ups-tp-epkg').value
      },
      sku: el('#ups-tp-sku').checked,
      paisOrigem: el('#ups-tp-epais').checked
    };
    chrome.storage.local.get(['bibliotecaMacrosTemu'], function(res) {
      var macros = res.bibliotecaMacrosTemu || {};
      macros[nome] = estado;
      chrome.storage.local.set({ bibliotecaMacrosTemu: macros }, function() {
        preencherListaMacrosTemu();
        el('#ups-tp-ms').value = nome;
        mostrarFeedback('Macro "' + nome + '" salva.');
      });
    });
  }

  async function excluirMacroPresetTemu() {
    var nome = el('#ups-tp-ms').value;
    if (!nome) { alert('Selecione uma macro para excluir.'); return; }
    if (!await confirmarExtensao('Excluir macro "' + nome + '"?')) return;
    chrome.storage.local.get(['bibliotecaMacrosTemu'], function(res) {
      var macros = res.bibliotecaMacrosTemu || {};
      delete macros[nome];
      chrome.storage.local.set({ bibliotecaMacrosTemu: macros }, function() {
        preencherListaMacrosTemu();
        mostrarFeedback('Macro excluída.');
      });
    });
  }

  function preencherListaMacrosTemu() {
    chrome.storage.local.get(['bibliotecaMacrosTemu'], function(res) {
      var macros = res.bibliotecaMacrosTemu || {};
      var sel = el('#ups-tp-ms');
      sel.innerHTML = '<option value="">Selecionar...</option>';
      Object.keys(macros).sort().forEach(function(nome) {
        var opt = document.createElement('option');
        opt.value = nome;
        opt.textContent = nome;
        sel.appendChild(opt);
      });
    });
  }

  el('#ups-tp-ms').addEventListener('change', function() {
    var nome = this.value;
    if (!nome) return;
    chrome.storage.local.get(['bibliotecaMacrosTemu'], function(res) {
      var macros = res.bibliotecaMacrosTemu || {};
      var dados = macros[nome];
      if (!dados) return;
      if (dados.emMassa) {
        el('#ups-tp-eq').value = dados.emMassa.quantidade || '';
        el('#ups-tp-epb').value = dados.emMassa.precoBase || '';
        el('#ups-tp-epl').value = dados.emMassa.precoLista || '';
        el('#ups-tp-ew').value = dados.emMassa.peso || '';
        el('#ups-tp-epkg').value = dados.emMassa.pacote || '';
      }
      el('#ups-tp-sku').checked = !!dados.sku;
      el('#ups-tp-epais').checked = !!dados.paisOrigem;
    });
  });

  el('#ups-tp-m-salvar').addEventListener('click', salvarMacroPresetTemu);
  el('#ups-tp-m-excluir').addEventListener('click', excluirMacroPresetTemu);

  // ===== ATRIBUTOS =====
  function preencherListaAtributosTemu() {
    chrome.storage.local.get([TEMU_ATTR_KEY], function(res) {
      var attrs = res[TEMU_ATTR_KEY] || {};
      var sel = el('#ups-tp-as');
      sel.innerHTML = '<option value="">Selecionar...</option>';
      Object.keys(attrs).sort().forEach(function(nome) {
        var opt = document.createElement('option');
        opt.value = nome;
        opt.textContent = nome;
        sel.appendChild(opt);
      });
    });
  }

  el('#ups-tp-a-salvar').addEventListener('click', function() {
    var nome = el('#ups-tp-a-nome').value.trim();
    if (!nome) { nome = prompt('Nome do preset de atributos:'); if (!nome) return; }
    console.log('[TEMU-ATTR-C] Salvando preset:', nome);

    // Expand "Mais Atributos" before saving
    var attrSection = document.querySelector('#attributes');
    if (attrSection) {
      var maisBtn = Array.from(attrSection.querySelectorAll('*')).find(function(el) {
        return el.innerText && el.innerText.trim().toLowerCase() === 'mais atributos';
      });
      if (maisBtn) maisBtn.click();
    }
    setTimeout(function() {
      var dados = {};
      var items = document.querySelectorAll('#attributes .ant-form-item');
      items.forEach(function(item) {
        var label = item.querySelector('.ant-form-item-label label');
        if (!label) return;
        var labelText = label.textContent.trim().replace('*', '').trim();
        if (!labelText) return;

        // Campo composto (Composição): múltiplos selects + inputs + botão +
        var plusBtn = item.querySelector('.anticon-plus-circle');
        if (plusBtn) {
          var rows = item.querySelectorAll('.flex_a_i_c');
          var pairs = [];
          rows.forEach(function(row) {
            // Primeiro select é o material (w_p50), segundo é a unidade (%)
            var selects = row.querySelectorAll('.ant-select');
            var matSelect = selects[0]; // primeiro select = material
            var inp = row.querySelector('input.ant-input');
            
            var matVal = matSelect ? matSelect.querySelector('.ant-select-selection-selected-value') : null;
            var mat = matVal ? matVal.textContent.trim() : '';
            var pct = inp ? inp.value.trim() : '';
            
            console.log('[TEMU-ATTR-SAVE] Composição row - mat:', mat, '| pct:', pct);
            
            if (mat && mat !== '%') {
              pairs.push(mat + '|' + (pct || ''));
            }
          });
          if (pairs.length) dados[labelText] = pairs.join(', ');
          console.log('[TEMU-ATTR-SAVE] Composição final:', dados[labelText]);
          return;
        }

        var selectVal = item.querySelector('.ant-select-selection-selected-value');
        var numInput = item.querySelector('input.ant-input-number-input');
        if (selectVal) {
          dados[labelText] = selectVal.textContent.trim();
        } else if (numInput) {
          dados[labelText] = numInput.value;
        } else {
          var textInput = item.querySelector('input.ant-input');
          if (textInput) dados[labelText] = textInput.value;
        }
      });
      console.log('[TEMU-ATTR-C] Capturados:', Object.keys(dados).length, 'campos:', Object.keys(dados).slice(0,5));
      chrome.storage.local.get([TEMU_ATTR_KEY], function(res) {
        var attrs = res[TEMU_ATTR_KEY] || {};
        attrs[nome] = dados;
        chrome.storage.local.set({ [TEMU_ATTR_KEY]: attrs }, function() {
          preencherListaAtributosTemu();
          el('#ups-tp-as').value = nome;
          el('#ups-tp-a-nome').value = '';
          el('#ups-tp-a-excluir').style.display = 'block';
          var count = Object.keys(dados).length;
          mostrarFeedback(count + ' atributos de "' + nome + '" salvos.');
        });
      });
    }, 600);
  });

  el('#ups-tp-as').addEventListener('change', function() {
    var nome = this.value;
    el('#ups-tp-a-excluir').style.display = nome ? 'block' : 'none';
  });

  el('#ups-tp-a-excluir').addEventListener('click', async function() {
    var nome = el('#ups-tp-as').value;
    if (!nome) { alert('Selecione um preset para excluir.'); return; }
    if (!await confirmarExtensao('Excluir preset "' + nome + '"?')) return;
    chrome.storage.local.get([TEMU_ATTR_KEY], function(res) {
      var attrs = res[TEMU_ATTR_KEY] || {};
      delete attrs[nome];
      chrome.storage.local.set({ [TEMU_ATTR_KEY]: attrs }, function() {
        preencherListaAtributosTemu();
        mostrarFeedback('Preset excluído.');
      });
    });
  });

  // ===== MULTI-ABA TOGGLE =====
  el('#ups-tp-multi-toggle').addEventListener('click', function() {
    var label = el('#ups-tp-multi-label');
    if (label.textContent.trim() === 'Paralelo') {
      this.textContent = 'SEQUENCIAL';
      label.textContent = 'Sequencial';
    } else {
      this.textContent = 'PARALELO';
      label.textContent = 'Paralelo';
    }
  });

  // ===== EXECUTE BUTTON =====
  el('#ups-tp-executar').addEventListener('click', function() {
    salvarEstadoTemu();
    var dados = lerEstadoOverlayTemu();
    el('#ups-temu-overlay').remove();

    if (dados.multiAtivo) {
      // Multi-aba via background
      chrome.runtime.sendMessage({
        action: 'executar-temu-multi',
        dados: dados
      });
    } else {
      executarTemu(dados);
    }
  });

  // ===== CANCEL BUTTON =====
  el('#ups-tp-cancelar').addEventListener('click', function() {
    salvarEstadoTemu();
    var overlay = document.getElementById('ups-temu-overlay');
    if (overlay) overlay.remove();
  });

  // ===== INIT =====
  try { preencherListaPresetsTemu(); } catch(e) {}
  try { preencherListaMacrosTemu(); } catch(e) {}
  try { preencherListaAtributosTemu(); } catch(e) {}
  try { carregarBibliotecaTabelas(); } catch(e) {}
  try { restaurarEstadoTemu(); } catch(e) {}
}

// ===== SKU PRINCIPAL AUTO (digita → clica Gerar) =====
var __skuTimerTemu = null;
function initSKUAutoTemu() {
  if (window.__skuAutoTemuAtivo) return;
  window.__skuAutoTemuAtivo = true;

  function onClickGerar(delay) {
    clearTimeout(__skuTimerTemu);
    __skuTimerTemu = setTimeout(function() {
      var headers = document.querySelectorAll('#sales .vxe-header--column');
      for (var i = 0; i < headers.length; i++) {
        var txt = (headers[i].textContent || '').trim().toLowerCase();
        if (txt.startsWith('sku')) {
          var allClicks = headers[i].querySelectorAll('button, span');
          for (var c = 0; c < allClicks.length; c++) {
            var el = allClicks[c];
            var elTxt = (el.textContent || '').trim().toLowerCase();
            if (elTxt.startsWith('gerar') || elTxt.startsWith('gera')) {
              el.click(); return;
            }
          }
        }
      }
    }, delay || 600);
  }

  function conectarInput() {
    var labels = document.querySelectorAll('#basic .ant-form-item-label label');
    for (var i = 0; i < labels.length; i++) {
      if (labels[i].textContent.trim() === 'SKU Principal') {
        var item = labels[i].closest('.ant-form-item');
        var input = item ? item.querySelector('input.ant-input') : null;
        if (input && !input.__skuAutoBound) {
          input.__skuAutoBound = true;
          input.addEventListener('input', function() { onClickGerar(500); });
          input.addEventListener('change', function() { onClickGerar(300); });
        }
        return;
      }
    }
    // Input not found yet — retry in 2s
    setTimeout(conectarInput, 2000);
  }

  setTimeout(conectarInput, 2000);
}

// ===== HELPERS =====
function sel(id) {
  return document.querySelector(id);
}

// ===== MESSAGE ROUTER =====
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  // Temu-specific messages
  if (request.action === 'fill-size-guide-temu') {
    preencherGuiaTamanhosTemu(request.dados).then(function(result) {
      sendResponse(result);
    }).catch(function(err) {
      sendResponse({ error: err.message });
    });
    return true;
  }

  if (request.action === 'fill-desc-temu') {
    preencherDescricaoTemu(request.texto);
    preencherTopicosTemu(request.topicos);
    sendResponse({ status: 'ok' });
    return true;
  }

  if (request.action === 'set-precos-temu') {
    setPrecosTemu(request.bulkPrice, request.listPrice).then(function() {
      if (request.bulkPrice) {
        chrome.storage.local.set({ [TEMU_ULTIMOS_PRECOS]: { bulkPrice: request.bulkPrice, listPrice: request.listPrice } });
      }
      sendResponse({ status: 'ok' });
    }).catch(function(err) {
      sendResponse({ error: err.message });
    });
    return true;
  }

  if (request.action === 'executar-temu-macro') {
    executarTemu(request.dados).then(function() {
      sendResponse({ status: 'ok' });
      chrome.runtime.sendMessage({ action: 'completed' });
    }).catch(function(err) {
      sendResponse({ error: err.message });
      chrome.runtime.sendMessage({ action: 'error', message: err.message });
    });
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
    var stepEl = document.getElementById('umo-step');
    var barEl = document.getElementById('umo-bar');
    var pctEl = document.getElementById('umo-pct');
    if (stepEl) stepEl.textContent = request.total + ' produtos processados!';
    if (barEl) barEl.style.width = '100%';
    if (pctEl) pctEl.textContent = '100%';
    setTimeout(function() { removerOverlayMulti(); }, 300);
    sendResponse({ status: 'ok' });
    return true;
  }

  if (request.action === 'multi-cancelled') {
    var tabEl2 = document.getElementById('umo-tab');
    var stepEl2 = document.getElementById('umo-step');
    var barEl2 = document.getElementById('umo-bar');
    var pctEl2 = document.getElementById('umo-pct');
    var cancelBtn = document.getElementById('umo-cancel');
    if (tabEl2) tabEl2.textContent = 'Cancelado';
    if (stepEl2) stepEl2.textContent = 'Processamento interrompido';
    if (barEl2) barEl2.style.background = '#dc3545';
    if (pctEl2) pctEl2.textContent = '\u2014';
    if (cancelBtn) cancelBtn.style.display = 'none';
    removerOverlayProgresso();
    setTimeout(function() { removerOverlayMulti(); }, 2000);
    sendResponse({ status: 'ok' });
    return true;
  }

  if (request.action === 'abort-macro') {
    window.__upsCancelMacro = true;
    var cancelBtn2 = document.getElementById('umo-cancel');
    if (cancelBtn2) { cancelBtn2.textContent = 'Cancelando...'; cancelBtn2.disabled = true; cancelBtn2.style.opacity = '0.6'; }
    sendResponse({ status: 'ok' });
    return true;
  }

  if (request.action === 'open-temu-dialog') {
    abrirDialogTemu();
    sendResponse({ status: 'opened' });
    return true;
  }

  if (request.action === 'open-temu-mass-dialog') {
    abrirDialogTemuMassa();
    sendResponse({ status: 'opened' });
    return true;
  }

  return false;
});

// ===== POPUP EDIÇÃO EM MASSA (ALT+X na Temu) =====
function abrirDialogTemuMassa() {
  var existing = document.getElementById('ups-temu-mass-overlay');
  if (existing) existing.remove();

  var overlay = document.createElement('div');
  overlay.id = 'ups-temu-mass-overlay';
  overlay.innerHTML = '<div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.45);z-index:999999;display:flex;align-items:center;justify-content:center;">' +
    '<div style="background:white;border-radius:8px;padding:24px;width:420px;max-width:95vw;box-shadow:0 8px 32px rgba(0,0,0,0.25);font-family:sans-serif;">' +
    '<div style="font-size:18px;font-weight:bold;margin-bottom:16px;">Editar em Massa - Temu</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;">' +
      '<div><label style="font-size:12px;font-weight:600;display:block;margin-bottom:2px;">Quantidade</label><input id="ups-tem-eq" type="text" placeholder="Ex: 10000" style="width:100%;padding:6px;border:1px solid #ccc;border-radius:4px;font-size:13px;box-sizing:border-box;"></div>' +
      '<div><label style="font-size:12px;font-weight:600;display:block;margin-bottom:2px;">Preço Base (R$)</label><input id="ups-tem-epb" type="text" placeholder="Ex: 29,90" style="width:100%;padding:6px;border:1px solid #ccc;border-radius:4px;font-size:13px;box-sizing:border-box;"></div>' +
      '<div><label style="font-size:12px;font-weight:600;display:block;margin-bottom:2px;">Preço Lista (R$)</label><input id="ups-tem-epl" type="text" placeholder="Ex: 109,90" style="width:100%;padding:6px;border:1px solid #ccc;border-radius:4px;font-size:13px;box-sizing:border-box;"></div>' +
      '<div><label style="font-size:12px;font-weight:600;display:block;margin-bottom:2px;">Peso(g)</label><input id="ups-tem-ew" type="text" placeholder="Ex: 200" style="width:100%;padding:6px;border:1px solid #ccc;border-radius:4px;font-size:13px;box-sizing:border-box;"></div>' +
      '<div style="grid-column:span 2;"><label style="font-size:12px;font-weight:600;display:block;margin-bottom:2px;">Pacote(cm) (CxLxA)</label><input id="ups-tem-epkg" type="text" placeholder="28x36x12" style="width:100%;padding:6px;border:1px solid #ccc;border-radius:4px;font-size:13px;box-sizing:border-box;"></div>' +
    '</div>' +
    '<div style="display:flex;gap:12px;align-items:center;margin-bottom:12px;">' +
      '<label style="font-size:13px;font-weight:600;display:flex;align-items:center;gap:4px;white-space:nowrap;"><input type="checkbox" id="ups-tem-sku" style="margin:0;"> Gerar SKU</label>' +
      '<label style="font-size:13px;font-weight:600;display:flex;align-items:center;gap:4px;white-space:nowrap;"><input type="checkbox" id="ups-tem-epais" style="margin:0;"> País de Origem</label>' +
    '</div>' +
    '<div style="display:flex;gap:8px;justify-content:flex-end;border-top:1px solid #eee;padding-top:12px;">' +
      '<button id="ups-tem-cancelar" style="padding:8px 20px;border:1px solid #ccc;border-radius:4px;cursor:pointer;font-size:13px;background:white;">Cancelar</button>' +
      '<button id="ups-tem-executar" style="padding:8px 20px;background:#28a745;color:white;border:none;border-radius:4px;cursor:pointer;font-weight:bold;font-size:13px;">APLICAR</button>' +
    '</div>' +
    '</div></div>';
  document.body.appendChild(overlay);

  // Restaurar último estado
  chrome.storage.local.get(['ultimoEstadoTemuMassa'], function(res) {
    var d = res.ultimoEstadoTemuMassa || {};
    if (d.quantidade) document.getElementById('ups-tem-eq').value = d.quantidade;
    if (d.precoBase) document.getElementById('ups-tem-epb').value = d.precoBase;
    if (d.precoLista) document.getElementById('ups-tem-epl').value = d.precoLista;
    if (d.peso) document.getElementById('ups-tem-ew').value = d.peso;
    if (d.pacote) document.getElementById('ups-tem-epkg').value = d.pacote;
    if (d.sku) document.getElementById('ups-tem-sku').checked = true;
    if (d.paisOrigem) document.getElementById('ups-tem-epais').checked = true;
  });

  document.getElementById('ups-tem-cancelar').addEventListener('click', function() {
    salvarEstadoTemuMassa();
    overlay.remove();
  });

  document.getElementById('ups-tem-executar').addEventListener('click', async function() {
    var q = document.getElementById('ups-tem-eq').value.trim();
    var pb = document.getElementById('ups-tem-epb').value.trim();
    var pl = document.getElementById('ups-tem-epl').value.trim();
    var w = document.getElementById('ups-tem-ew').value.trim();
    var pkg = document.getElementById('ups-tem-epkg').value.trim();
    var sku = document.getElementById('ups-tem-sku').checked;
    var pais = document.getElementById('ups-tem-epais').checked;

    salvarEstadoTemuMassa();
    overlay.remove();
    await sleep(200);

    criarOverlayProgresso();
    var step = 0; var total = 0;
    if (q) total++; if (pb) total++; if (pl) total++; if (w) total++; if (pkg) total++; if (sku) total++; if (pais) total++;
    if (total === 0) { removerOverlayProgresso(); return; }
    var ups = function(msg) {
      step++;
      atualizarOverlayProgresso({ message: msg, step: step, total: total });
    };

    try {
      if (q) { ups('Quantidade: ' + q); await setColunaEmMassaTemu('quantidade', q); }
      if (pb) { ups('Preço Base: ' + pb); await setColunaEmMassaTemu('precoBase', pb); }
      if (pl) { ups('Preço Lista: ' + pl); await setColunaEmMassaTemu('precoLista', pl); }
      if (w) { ups('Peso: ' + w); await setColunaEmMassaTemu('peso', w); }
      if (pkg) { ups('Pacote: ' + pkg); await setColunaEmMassaTemu('pacote', pkg); }
      if (sku) { ups('Gerando SKUs...'); await gerarSkuEmMassaTemu(); }
      if (pais) {
        ups('País de Origem: Brazil');
        var safetySection = document.querySelector('#safety');
        if (safetySection) {
          var selects = safetySection.querySelectorAll('.ant-select');
          if (selects.length > 0) {
            var selectPais = selects[0];
            var rendered = selectPais.querySelector('.ant-select-selection__rendered');
            var currentText = rendered ? rendered.textContent.trim() : '';
            if (currentText.indexOf('Brazil') === -1) {
              var dd = await abrirDropdownTemu(selectPais);
             if (dd) {
                var options = dd.querySelectorAll('.ant-select-dropdown-menu-item');
                for (var pi = 0; pi < options.length; pi++) {
                  if (options[pi].textContent.indexOf('Brazil') !== -1) { options[pi].click(); await sleep(300); break; }
                }
              }
            }
          }
        }
      }
    } catch (err) {
      mostrarErroOverlayProgresso('Erro: ' + (err.message || err));
      await sleep(3000);
    }
    removerOverlayProgresso();

    var scrollContainer = document.querySelector('#sales .vxe-table--body-wrapper, #sales .vxe-body--wrapper');
    if (scrollContainer) scrollContainer.scrollLeft = 0;
  });

  overlay.addEventListener('click', function(e) {
    var contentBox = overlay.querySelector('div[style*="background:white"]');
    if (contentBox && !contentBox.contains(e.target)) {
      salvarEstadoTemuMassa();
      overlay.remove();
    }
  });
}

function salvarEstadoTemuMassa() {
  chrome.storage.local.set({ ultimoEstadoTemuMassa: {
    quantidade: document.getElementById('ups-tem-eq') ? document.getElementById('ups-tem-eq').value : '',
    precoBase: document.getElementById('ups-tem-epb') ? document.getElementById('ups-tem-epb').value : '',
    precoLista: document.getElementById('ups-tem-epl') ? document.getElementById('ups-tem-epl').value : '',
    peso: document.getElementById('ups-tem-ew') ? document.getElementById('ups-tem-ew').value : '',
    pacote: document.getElementById('ups-tem-epkg') ? document.getElementById('ups-tem-epkg').value : '',
    sku: document.getElementById('ups-tem-sku') ? document.getElementById('ups-tem-sku').checked : false,
    paisOrigem: document.getElementById('ups-tem-epais') ? document.getElementById('ups-tem-epais').checked : false
  }});
}

// ===== APLICAR COR (Copiar Imagem → Variantes com o mesmo Cor) =====
function aplicarCorNaVariante(btnEl) {
  var row = btnEl.closest('.variant_row');
  if (!row) return Promise.resolve(false);

  var rows = document.querySelectorAll('#media .variant_row');
  var idx = -1;
  for (var i = 0; i < rows.length; i++) {
    if (rows[i] === row) { idx = i; break; }
  }
  if (idx === -1) return Promise.resolve(false);

  return new Promise(function(resolve) {
    chrome.runtime.sendMessage({ action: 'aplicar-cor-abrir', rowIdx: idx }, function(res1) {
      if (!res1 || !res1.ok) { resolve(false); return; }
      setTimeout(function() {
        chrome.runtime.sendMessage({ action: 'aplicar-cor-selecionar', rowIdx: idx }, function(res2) {
          resolve(res2 && res2.ok);
        });
      }, 200);
    });
  });
}

function injetarBotoesAplicarCor() {
  var variantRows = document.querySelectorAll('#media .variant_row');
  variantRows.forEach(function(row) {
    if (row.querySelector('.ups-aplicar-cor')) return;
    var header = row.querySelector('.img_title');
    if (!header) return;
    var leftSide = header.children[0];
    if (!leftSide) return;

    var btn = document.createElement('button');
    btn.className = 'ups-aplicar-cor ant-btn ant-btn-link my_ant_btn_primary';
    btn.type = 'button';
    btn.style.cssText = 'margin-left:8px;border:1px solid #d9d9d9;border-radius:4px;';
    btn.innerHTML = '<span>Copiar Variante</span>';
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      aplicarCorNaVariante(this).then(function(ok) {
        mostrarFeedback(ok ? 'Imagens copiadas!' : 'Erro ao copiar', ok ? '#28a745' : '#dc3545');
      });
    });
    leftSide.appendChild(btn);
  });
}

function observarMidiaTemu() {
  var el = document.querySelector('#media .variant_img_list') || document.querySelector('#media');
  if (!el) return;

  // Observer + polling + scroll
  var timer = null;
  function schedule() {
    if (timer) return;
    timer = setTimeout(function() { timer = null; injetarBotoesAplicarCor(); }, 200);
  }
  new MutationObserver(schedule).observe(el, { childList: true, subtree: true, attributes: false });
  el.addEventListener('scroll', schedule, { passive: true });

  // Polling inicial e periódico
  injetarBotoesAplicarCor();
  setInterval(injetarBotoesAplicarCor, 3000);
}

if (window.location.href.includes('/temu/')) {
  var _midiaRetry = 0;
  var _midiaTimer = setInterval(function() {
    var el = document.querySelector('#media .variant_img_list') || document.querySelector('#media');
    if (el) {
      clearInterval(_midiaTimer);
      observarMidiaTemu();
    } else if (++_midiaRetry > 60) {
      clearInterval(_midiaTimer);
    }
  }, 500);
}
