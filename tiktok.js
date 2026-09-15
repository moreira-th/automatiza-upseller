/*
 * UpSeller Moreira — TikTok Automation
 * Carregado em /products/tiktok/discount-promotions-edit-product/
 * Depende de: core.js, overlay.js
 */

function encontrarColunaDescontoTikTok() {
  var headerTable = document.querySelectorAll('table')[0];
  if (!headerTable) return -1;
  var ths = headerTable.querySelectorAll('th');
  for (var i = 0; i < ths.length; i++) {
    if (ths[i].textContent.includes('Desconto Promocional')) return i;
  }
  return -1;
}

function getScrollContainer() {
  return document.querySelector('.vxe-table--body-wrapper') ||
         document.querySelector('.vxe-body--wrapper');
}

function parsePreco(texto) {
  var limpo = texto.replace(/[R$\s‎\.]/g, '').replace(',', '.').trim();
  return parseFloat(limpo);
}

function fmtR$(valor) {
  if (valor === null || valor === undefined || isNaN(valor)) return '';
  return 'R$ ' + valor.toFixed(2).replace('.', ',');
}

function textoFaixaPrecos(tam) {
  if (!tam) return 'R$ 0,00';
  var precos = tam.precosBase && tam.precosBase.length ? tam.precosBase.slice() : [];
  if (tam.precoBase && precos.indexOf(tam.precoBase) === -1) precos.push(tam.precoBase);
  if (!precos.length) return fmtR$(tam.precoBase) || 'R$ 0,00';
  var min = Math.min.apply(null, precos), max = Math.max.apply(null, precos);
  if (min === max) return fmtR$(min);
  return fmtR$(min) + ' a ' + fmtR$(max);
}

function getVisibleVariationRows() {
  var colIdx = encontrarColunaDescontoTikTok();
  if (colIdx < 0) return [];
  var wrapper = getScrollContainer();
  if (!wrapper) return [];
  var rows = wrapper.querySelectorAll('.vxe-body--row');
  var result = [];
  for (var i = 0; i < rows.length; i++) {
    var cells = rows[i].querySelectorAll('td');
    if (cells.length <= colIdx) continue;
    var nameCell = cells[1];
    if (!nameCell) continue;
    var name = nameCell.textContent.trim().replace(/\s+/g, ' ');
    if (name.indexOf('Tamanho:') === -1) continue;
    var input = cells[colIdx].querySelector('input');
    if (!input || input.disabled) continue;
    var size = '';
    var m = name.match(/Tamanho:\s*(\S+)/);
    if (m) size = m[1];
    var preco = parsePreco(cells[2] ? cells[2].textContent : '');
    result.push({ row: rows[i], input: input, name: name, size: size, preco: preco });
  }
  return result;
}

function calcularMelhorPorcentagem(precoBase, valorAlvo, direcao) {
  var melhor = null, melhorDiff = Infinity;

  for (var p = 1; p <= 99; p++) {
    var resultado = precoBase * (100 - p) / 100;
    if (direcao === 'up' && resultado < valorAlvo) continue;
    if (direcao === 'down' && resultado > valorAlvo) continue;
    var diff = Math.abs(resultado - valorAlvo);
    if (diff < melhorDiff) { melhorDiff = diff; melhor = p; }
  }

  return melhor;
}

function precoParaPorcentagem(precoBase, valorAlvo, direcao) {
  var pct = calcularMelhorPorcentagem(precoBase, valorAlvo, direcao);
  if (pct === null) return null;
  return { pct: pct, resultado: precoBase * (100 - pct) / 100 };
}

async function coletarTamanhosPrecosTikTok(progFn) {
  var wrapper = getScrollContainer();
  if (!wrapper) return {};
  var maxScroll = wrapper.scrollHeight - wrapper.clientHeight;
  var scrollStep = wrapper.clientHeight * 3.0;
  var tamanhos = {};
  var stallCount = 0;

  wrapper.scrollTop = 0;
  await sleep(300);

  while (true) {
    var rows = getVisibleVariationRows();
    for (var i = 0; i < rows.length; i++) {
      if (!rows[i].size) continue;
      var tam = tamanhos[rows[i].size];
      if (!tam) {
        tam = { descontoAtual: rows[i].input.value, precoBase: rows[i].preco, precosBase: [] };
        if (rows[i].preco) tam.precosBase.push(rows[i].preco);
        tamanhos[rows[i].size] = tam;
      } else {
        if (rows[i].preco && tam.precosBase.indexOf(rows[i].preco) === -1) tam.precosBase.push(rows[i].preco);
      }
    }

    if (progFn && wrapper.scrollTop < maxScroll) {
      progFn('Coletando tamanhos... (' + Object.keys(tamanhos).length + ' encontrados)');
    }

    if (wrapper.scrollTop >= maxScroll - 5) break;
    if (stallCount >= 3) break;

    var prevScroll = wrapper.scrollTop;
    wrapper.scrollTop = Math.min(wrapper.scrollTop + scrollStep, maxScroll);
    if (wrapper.scrollTop === prevScroll) { stallCount++; continue; }
    stallCount = 0;
    await sleep(50);
  }

  wrapper.scrollTop = 0;
  await sleep(300);
  return tamanhos;
}

async function coletarSizesSelecionadosTikTok(progFn) {
  // Try vxe-table internal API first (instant)
  var tableEl = document.querySelector('.vxe-table');
  try {
    var vm = tableEl && (tableEl.__vue__ || tableEl.__vxe_table__);
    if (vm && typeof vm.getCheckboxRecords === 'function') {
      var checked = vm.getCheckboxRecords();
      if (checked && checked.length) {
        // Build a set of row IDs from checked records
        var ids = {};
        (function findIds(arr) {
          for (var k = 0; k < arr.length; k++) {
            var rec = arr[k];
            if (rec._VXE_ID || rec.id || rec.rowId) ids[rec._VXE_ID || rec.id || rec.rowId] = true;
            if (rec.children && rec.children.length) findIds(rec.children);
          }
        })(checked);
        if (Object.keys(ids).length) return ids;
      }
    }
  } catch(e) { /* fallback to scroll method */ }

  var wrapper = getScrollContainer();
  if (!wrapper) return {};
  var maxScroll = wrapper.scrollHeight - wrapper.clientHeight;
  var scanStep = wrapper.clientHeight * 0.8;
  var stallCount = 0;
  var selectedRowIds = {};

  wrapper.scrollTop = 0;
  await sleep(200);

  var currentProductChecked = false;

  while (true) {
    var allRows = wrapper.querySelectorAll('.vxe-body--row');

    for (var r = 0; r < allRows.length; r++) {
      var chk = allRows[r].querySelector('.vxe-cell--checkbox');
      if (!chk) continue;
      var rowid = allRows[r].getAttribute('rowid');
      if (!rowid) continue;

      if (!chk.classList.contains('is--disabled')) {
        currentProductChecked = chk.classList.contains('is--checked');
      } else if (currentProductChecked) {
        selectedRowIds[rowid] = true;
      }
    }

    if (progFn && wrapper.scrollTop < maxScroll) progFn('Verificando selecionados... (' + Object.keys(selectedRowIds).length + ')');
    if (wrapper.scrollTop >= maxScroll - 5) break;
    if (stallCount >= 3) break;

    var prevScroll = wrapper.scrollTop;
    wrapper.scrollTop = Math.min(wrapper.scrollTop + scanStep, maxScroll);
    if (wrapper.scrollTop === prevScroll) { stallCount++; continue; }
    stallCount = 0;
    await sleep(150);
  }

  wrapper.scrollTop = 0;
  await sleep(200);
  return selectedRowIds;
}

async function setDescontoPorTamanhoTikTok(regras, progFn, apenasSelecionados) {
  var wrapper = getScrollContainer();
  if (!wrapper) return;
  var maxScroll = wrapper.scrollHeight - wrapper.clientHeight;
  var scrollStep = wrapper.clientHeight * 0.8;
  var nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  var totalPreenchidos = 0;
  var stallCount = 0;

  var selectedRowIds = null;
  if (apenasSelecionados) {
    if (progFn) progFn('Vasculhando anúncios selecionados...');
    selectedRowIds = await coletarSizesSelecionadosTikTok(progFn);
  }

  var filledRowIds = {};

  while (true) {
    var rows = getVisibleVariationRows();
    var filledNow = 0;

    for (var i = 0; i < rows.length; i++) {
      var rowId = rows[i].row.getAttribute('rowid');
      if (!rowId || filledRowIds[rowId]) continue;
      if (apenasSelecionados && !selectedRowIds[rowId]) {
        filledRowIds[rowId] = true;
        continue;
      }
      var regra = regras[rows[i].size];
      if (!regra) continue;

      var precoBase = rows[i].preco || regra.precoBase;
      var pctFinal;
      if (regra.pct !== undefined) {
        pctFinal = regra.pct;
      } else if (regra.r$) {
        var calc = precoParaPorcentagem(precoBase, regra.r$, regra.direcao);
        if (!calc) continue;
        pctFinal = calc.pct;
      } else continue;

      rows[i].input.focus();
      nativeSetter.call(rows[i].input, String(pctFinal));
      rows[i].input.dispatchEvent(new Event('input', { bubbles: true }));
      rows[i].input.dispatchEvent(new Event('change', { bubbles: true }));
      rows[i].input.blur();
      filledRowIds[rowId] = true;
      filledNow++;
      await sleep(20);
    }

    totalPreenchidos += filledNow;
    if (progFn) progFn('Preenchendo... (' + totalPreenchidos + ' cél' + (totalPreenchidos === 1 ? 'ula' : 'ulas') + ')');

    if (wrapper.scrollTop >= maxScroll - 5) break;
    if (stallCount >= 3) break;

    var prevScroll = wrapper.scrollTop;
    wrapper.scrollTop = Math.min(wrapper.scrollTop + scrollStep, maxScroll);
    if (wrapper.scrollTop === prevScroll) { stallCount++; continue; }
    stallCount = 0;
    await sleep(200);
  }

  wrapper.scrollTop = 0;
}

function abrirDialogTikTokMassa() {
  var existing = document.getElementById('ups-tiktok-mass-overlay');
  if (existing) existing.remove();

  var overlay = document.createElement('div');
  overlay.id = 'ups-tiktok-mass-overlay';
  overlay.innerHTML =
    '<div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.45);z-index:999999;display:flex;align-items:center;justify-content:center;">' +
    '<div style="background:white;border-radius:8px;padding:24px;width:520px;max-width:95vw;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 8px 32px rgba(0,0,0,0.25);font-family:sans-serif;">' +
    '<div style="font-size:18px;font-weight:bold;margin-bottom:4px;">Desconto Promocional - TikTok</div>' +
    '<div style="font-size:12px;color:#888;margin-bottom:12px;">Carregando tamanhos... <span id="ups-tk-loading" style="color:#4078f2;">⏳</span></div>' +
    '<div id="ups-tk-body" style="flex:1;overflow-y:auto;margin-bottom:12px;display:none;"></div>' +
    '<div id="ups-tk-footer" style="border-top:1px solid #eee;padding-top:12px;display:none;">' +
    '<div style="display:flex;gap:8px;justify-content:flex-end;">' +
    '<button id="ups-tk-cancelar" style="padding:8px 20px;border:1px solid #ccc;border-radius:4px;cursor:pointer;font-size:13px;background:white;">Cancelar</button>' +
    '<button id="ups-tk-executar" style="padding:8px 20px;background:#28a745;color:white;border:none;border-radius:4px;cursor:pointer;font-weight:bold;font-size:13px;">APLICAR</button>' +
    '</div></div></div></div>';
  document.body.appendChild(overlay);

  overlay.addEventListener('click', function(e) {
    var contentBox = overlay.querySelector('div[style*="background:white"]');
    if (contentBox && !contentBox.contains(e.target)) overlay.remove();
  });

  document.getElementById('ups-tk-cancelar').addEventListener('click', function() { overlay.remove(); });

  coletarTamanhosPrecosTikTok(function(msg) {
    var el = document.getElementById('ups-tk-loading');
    if (el) el.textContent = msg;
  }).then(function(tamanhos) {
    var loadingEl = document.getElementById('ups-tk-loading');
    var body = document.getElementById('ups-tk-body');
    var footer = document.getElementById('ups-tk-footer');
    if (!body) return;

    var ORDEM_TAM = { 'pp': 1, 'p': 2, 'm': 3, 'g': 4, 'gg': 5, 'egg': 6, 'g1': 7, 'g2': 8, 'g3': 9, 'g4': 10, 'g5': 11, 'xg': 12, 'xgg': 13, 'exg': 14, 'exgg': 15, 'eg': 16, '2xg': 17, '2xgg': 18, '3xg': 19, '3xgg': 20 };
    var chaves = Object.keys(tamanhos).sort(function(a, b) {
      var ai = ORDEM_TAM[a.toLowerCase().trim()], bi = ORDEM_TAM[b.toLowerCase().trim()];
      if (ai && bi) return ai - bi;
      if (ai) return -1; if (bi) return 1;
      var an = parseInt(a, 10), bn = parseInt(b, 10);
      if (!isNaN(an) && !isNaN(bn)) return an - bn;
      return a.localeCompare(b);
    });
    if (!chaves.length) {
      if (loadingEl) loadingEl.textContent = 'Nenhuma variação encontrada.';
      return;
    }

    if (loadingEl) loadingEl.style.display = 'none';
    body.style.display = 'block';
    footer.style.display = 'block';

    var precoBaseExemplo = tamanhos[chaves[0]].precoBase || 0;
    var html = '<div style="font-size:12px;color:#888;margin-bottom:8px;">Preços Base: <b>' + textoFaixaPrecos(tamanhos[chaves[0]]) + '</b></div>';
    html += '<table style="width:100%;border-collapse:collapse;">';
    html += '<thead><tr style="background:#f5f5f5;">' +
      '<th style="padding:6px 8px;border:1px solid #e0e0e0;font-size:11px;text-align:left;">Tamanho</th>' +
      '<th style="padding:6px 8px;border:1px solid #e0e0e0;font-size:11px;text-align:center;width:80px;">%</th>' +
      '<th style="padding:6px 8px;border:1px solid #e0e0e0;font-size:11px;text-align:center;width:100px;">R$ Desejado</th>' +
      '<th style="padding:6px 8px;border:1px solid #e0e0e0;font-size:11px;text-align:center;width:75px;">Prioridade</th>' +
      '<th style="padding:6px 8px;border:1px solid #e0e0e0;font-size:11px;text-align:center;width:80px;">Resultado</th>' +
      '</tr></thead><tbody>';

    for (var i = 0; i < chaves.length; i++) {
      var t = chaves[i];
      html += '<tr>' +
        '<td style="padding:6px 8px;border:1px solid #e0e0e0;font-size:14px;font-weight:600;text-transform:uppercase;">' + t + '</td>' +
        '<td style="padding:6px 8px;border:1px solid #e0e0e0;"><input id="ups-tk-pct-' + i + '" type="number" min="1" max="99" placeholder="%" value="' + (tamanhos[t].descontoAtual || '') + '" style="width:100%;padding:4px;border:1px solid #ccc;border-radius:4px;font-size:13px;text-align:center;box-sizing:border-box;"></td>' +
        '<td style="padding:6px 8px;border:1px solid #e0e0e0;"><input id="ups-tk-r$-' + i + '" type="number" step="0.01" min="0" placeholder="R$" style="width:100%;padding:4px;border:1px solid #ccc;border-radius:4px;font-size:13px;text-align:center;box-sizing:border-box;"></td>' +
        '<td style="padding:6px 8px;border:1px solid #e0e0e0;text-align:center;white-space:nowrap;">' +
        '<span id="ups-tk-up-' + i + '" data-idx="' + i + '" style="cursor:pointer;padding:2px 6px;border-radius:3px;font-size:13px;color:#999;user-select:none;" title="Para cima (preço maior, menos desconto)">▲</span>' +
        '<span id="ups-tk-dn-' + i + '" data-idx="' + i + '" style="cursor:pointer;padding:2px 6px;border-radius:3px;font-size:13px;color:#999;user-select:none;margin-left:2px;" title="Para baixo (preço menor, mais desconto)">▼</span>' +
        '</td>' +
        '<td id="ups-tk-res-' + i + '" style="padding:6px 8px;border:1px solid #e0e0e0;font-size:12px;text-align:center;color:#666;">—</td>' +
        '</tr>';
    }
    html += '</tbody></table>';
    html += '<div style="font-size:11px;color:#888;margin-top:6px;">Preencha % ou R$ Desejado. Clique ▲ (acima do alvo) ou ▼ (abaixo do alvo) para ajustar a direção.</div>';
    html += '<div style="margin-top:8px;padding-top:6px;border-top:1px solid #f0f0f0;">' +
      '<label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;color:#555;user-select:none;">' +
      '<input type="checkbox" id="ups-tk-sel" style="margin:0;cursor:pointer;">' +
      '<span>Somente Selecionados <span style="color:#999;font-weight:400;">— aplica apenas aos anúncios marcados na página</span></span>' +
      '</label></div>';
    body.innerHTML = html;

    // Active direction per row
    var dirAtivo = {};

    // Bind auto-calc
    for (var j = 0; j < chaves.length; j++) {
      (function(idx) {
        var inpPct = document.getElementById('ups-tk-pct-' + idx);
        var inpRs = document.getElementById('ups-tk-r$-' + idx);
        var resEl = document.getElementById('ups-tk-res-' + idx);
        var precoBase = tamanhos[chaves[idx]].precoBase || precoBaseExemplo;

        function atualizar() {
          var direcao = dirAtivo[idx] || null;
          var rsVal = inpRs.value.trim();
          if (rsVal) {
            var alvo = parseFloat(rsVal.replace(',', '.'));
            if (!isNaN(alvo) && alvo > 0) {
              var calc = precoParaPorcentagem(precoBase, alvo, direcao);
              if (calc) {
                inpPct.value = calc.pct;
                resEl.textContent = 'R$ ' + calc.resultado.toFixed(2).replace('.', ',');
                resEl.style.color = '#28a745';
                return;
              }
            }
          }
          if (inpPct.value.trim()) {
            var p = parseInt(inpPct.value, 10);
            if (!isNaN(p) && p >= 1 && p <= 99) {
              var r = precoBase * (100 - p) / 100;
              resEl.textContent = 'R$ ' + r.toFixed(2).replace('.', ',');
              resEl.style.color = '#666';
              return;
            }
          }
          resEl.textContent = '—';
          resEl.style.color = '#666';
        }

        function toggleDirLocal(dir) {
          var upEl = document.getElementById('ups-tk-up-' + idx);
          var dnEl = document.getElementById('ups-tk-dn-' + idx);
          if (dirAtivo[idx] === dir) {
            dirAtivo[idx] = null;
            upEl.style.color = '#999'; upEl.style.background = 'transparent';
            dnEl.style.color = '#999'; dnEl.style.background = 'transparent';
          } else {
            dirAtivo[idx] = dir;
            if (dir === 'up') { upEl.style.color = '#fff'; upEl.style.background = '#28a745'; dnEl.style.color = '#999'; dnEl.style.background = 'transparent'; }
            else { dnEl.style.color = '#fff'; dnEl.style.background = '#4078f2'; upEl.style.color = '#999'; upEl.style.background = 'transparent'; }
          }
          atualizar();
        }

        document.getElementById('ups-tk-up-' + idx).addEventListener('click', function() { toggleDirLocal('up'); });
        document.getElementById('ups-tk-dn-' + idx).addEventListener('click', function() { toggleDirLocal('down'); });
        inpPct.addEventListener('input', function() { if (!inpRs.value.trim()) atualizar(); });
        inpRs.addEventListener('input', function() { atualizar(); });
      })(j);
    }

    // APPLY
    document.getElementById('ups-tk-executar').addEventListener('click', async function() {
      var regras = {};
      for (var k = 0; k < chaves.length; k++) {
        var pctEl = document.getElementById('ups-tk-pct-' + k);
        var rsEl = document.getElementById('ups-tk-r$-' + k);
        var tamanho = chaves[k];

        var regra = { precoBase: tamanhos[tamanho].precoBase || precoBaseExemplo };

        var rsValor = (rsEl && rsEl.value.trim()) ? parseFloat(rsEl.value.replace(',', '.')) : NaN;
        if (!isNaN(rsValor) && rsValor > 0) {
          // R$ desejado tem prioridade: recalcula a % por preço base de cada anúncio
          regra.r$ = rsValor;
        } else if (pctEl && pctEl.value.trim()) {
          var p = parseInt(pctEl.value, 10);
          if (!isNaN(p) && p >= 1 && p <= 99) regra.pct = p;
        }

        if (dirAtivo[k]) regra.direcao = dirAtivo[k];

        if (regra.pct !== undefined || regra.r$ !== undefined) {
          regras[tamanho] = regra;
        }
      }

      var apenasSelecionados = document.getElementById('ups-tk-sel').checked;

      overlay.remove();
      await sleep(200);

      if (!Object.keys(regras).length) {
        mostrarFeedback('Nenhum valor válido para aplicar.', '#dc3545');
        return;
      }

      criarOverlayProgresso();
      var step = 0;
      var total = Object.keys(regras).length;
      atualizarOverlayProgresso({ message: 'Iniciando...', step: 1, total: total });

      try {
        await setDescontoPorTamanhoTikTok(regras, function(msg) {
          step++;
          atualizarOverlayProgresso({ message: msg, step: Math.min(step, total), total: total });
        }, apenasSelecionados);
      } catch (err) {
        mostrarErroOverlayProgresso('Erro: ' + (err.message || err));
        await sleep(3000);
      }

      atualizarOverlayProgresso({ message: 'Concluído!', step: total, total: total });
      await sleep(1000);
      removerOverlayProgresso();
    });
  });
}

// ===== ACTIVE MODAL (tiktok/active) =====

function getModalScrollContainer() {
  var modal = document.querySelector('.my_list_discount_price_modal');
  if (!modal) return null;
  return modal.querySelector('.vxe-table--body-wrapper, .vxe-body--wrapper');
}

function getVisibleActiveRows() {
  var wrapper = getModalScrollContainer();
  if (!wrapper) return [];
  var rows = wrapper.querySelectorAll('.vxe-body--row');
  var result = [];
  var tamanhosLista = ['PP','P','M','G','GG','EGG','G1','G2','G3','G4','G5','XG','XGG','EXG','EXGG','EG','2XG','2XGG','3XG','3XGG'];
  tamanhosLista.sort(function(a,b){return b.length - a.length;});

  for (var i = 0; i < rows.length; i++) {
    var cells = rows[i].querySelectorAll('td');
    if (cells.length < 3) continue;
    var fullText = cells[0].textContent.replace(/\s+/g, ' ').trim();
    if (!fullText) continue;

    var size = '';
    for (var t = 0; t < tamanhosLista.length; t++) {
      var re = new RegExp('\\b' + tamanhosLista[t] + '\\b', 'i');
      if (re.test(fullText)) { size = tamanhosLista[t]; break; }
    }
    if (!size) continue;

    var preco = parsePreco(cells[1].textContent.trim());
    var input = cells[2].querySelector('input');
    if (!input || input.disabled) continue;
    result.push({ row: rows[i], input: input, nome: fullText, size: size, preco: preco });
  }
  return result;
}

async function coletarTamanhosPrecosTikTokActive(progFn) {
  var wrapper = getModalScrollContainer();
  if (!wrapper) return {};
  var maxScroll = wrapper.scrollHeight - wrapper.clientHeight;
  var scrollStep = Math.max(Math.floor(wrapper.clientHeight * 0.3), 30);
  var tamanhos = {};
  var stallCount = 0;

  wrapper.scrollTop = 0;
  await sleep(100);

  while (true) {
    var rows = getVisibleActiveRows();
    for (var i = 0; i < rows.length; i++) {
      if (!rows[i].size) continue;
      var tam = tamanhos[rows[i].size];
      if (!tam) {
        tam = { descontoAtual: rows[i].input.value, precoBase: rows[i].preco, precosBase: [] };
        if (rows[i].preco) tam.precosBase.push(rows[i].preco);
        tamanhos[rows[i].size] = tam;
      } else {
        if (rows[i].preco && tam.precosBase.indexOf(rows[i].preco) === -1) tam.precosBase.push(rows[i].preco);
      }
    }

    if (progFn && wrapper.scrollTop < maxScroll) {
      progFn('Coletando tamanhos... (' + Object.keys(tamanhos).length + ' encontrados)');
    }

    if (wrapper.scrollTop >= maxScroll - 5) break;
    if (stallCount >= 3) break;

    var prevScroll = wrapper.scrollTop;
    wrapper.scrollTop = Math.min(wrapper.scrollTop + scrollStep, maxScroll);
    if (wrapper.scrollTop === prevScroll) { stallCount++; continue; }
    stallCount = 0;
    await sleep(80);
  }

  wrapper.scrollTop = 0;
  await sleep(100);
  return tamanhos;
}

async function setDescontoPorTamanhoTikTokActive(regras, progFn) {
  var wrapper = getModalScrollContainer();
  if (!wrapper) return;
  var maxScroll = wrapper.scrollHeight - wrapper.clientHeight;
  var scrollStep = Math.max(Math.floor(wrapper.clientHeight * 0.3), 30);
  var nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  var totalPreenchidos = 0;
  var stallCount = 0;
  var filledRowIds = {};

  while (true) {
    var rows = getVisibleActiveRows();
    var filledNow = 0;

    for (var i = 0; i < rows.length; i++) {
      var rowId = rows[i].row.getAttribute('rowid') || (rows[i].nome + '|' + rows[i].size);
      if (filledRowIds[rowId]) continue;
      var regra = regras[rows[i].size];
      if (!regra) continue;

      var precoBase = rows[i].preco || regra.precoBase;
      var pctFinal;
      if (regra.pct !== undefined) {
        pctFinal = regra.pct;
      } else if (regra.r$) {
        var calc = precoParaPorcentagem(precoBase, regra.r$, regra.direcao);
        if (!calc) continue;
        pctFinal = calc.pct;
      } else continue;

      rows[i].input.focus();
      nativeSetter.call(rows[i].input, String(pctFinal));
      rows[i].input.dispatchEvent(new Event('input', { bubbles: true }));
      rows[i].input.dispatchEvent(new Event('change', { bubbles: true }));
      rows[i].input.blur();
      filledRowIds[rowId] = true;
      filledNow++;
      await sleep(50);
    }

    totalPreenchidos += filledNow;
    if (progFn) progFn('Preenchendo... (' + totalPreenchidos + ' cél' + (totalPreenchidos === 1 ? 'ula' : 'ulas') + ')');

    if (wrapper.scrollTop >= maxScroll - 5) break;
    if (stallCount >= 3) break;

    var prevScroll = wrapper.scrollTop;
    wrapper.scrollTop = Math.min(wrapper.scrollTop + scrollStep, maxScroll);
    if (wrapper.scrollTop === prevScroll) { stallCount++; continue; }
    stallCount = 0;
    await sleep(800);
  }

  wrapper.scrollTop = Math.max(0, maxScroll - 40);
  await sleep(500);
  wrapper.scrollTop = maxScroll;
  await sleep(500);

  var finalRows = getVisibleActiveRows();
  var finalFilled = 0;
  for (var i = 0; i < finalRows.length; i++) {
    var rowId = finalRows[i].row.getAttribute('rowid') || (finalRows[i].nome + '|' + finalRows[i].size);
    if (filledRowIds[rowId]) continue;
    var regra = regras[finalRows[i].size];
    if (!regra) continue;

    var precoBase = finalRows[i].preco || regra.precoBase;
    var pctFinal;
    if (regra.pct !== undefined) {
      pctFinal = regra.pct;
    } else if (regra.r$) {
      var calc = precoParaPorcentagem(precoBase, regra.r$, regra.direcao);
      if (!calc) continue;
      pctFinal = calc.pct;
    } else continue;

    finalRows[i].input.focus();
    nativeSetter.call(finalRows[i].input, String(pctFinal));
    finalRows[i].input.dispatchEvent(new Event('input', { bubbles: true }));
    finalRows[i].input.dispatchEvent(new Event('change', { bubbles: true }));
    finalRows[i].input.blur();
    filledRowIds[rowId] = true;
    finalFilled++;
    await sleep(50);
  }

  totalPreenchidos += finalFilled;
  if (progFn && finalFilled) progFn('Preenchendo... (' + totalPreenchidos + ' cél' + (totalPreenchidos === 1 ? 'ula' : 'ulas') + ')');

  wrapper.scrollTop = 0;
}

function salvarUltimoEstadoActive(regras) {
  try {
    var simples = {};
    for (var k in regras) {
      simples[k] = {};
      if (regras[k].pct !== undefined) simples[k].pct = regras[k].pct;
      if (regras[k].r$ !== undefined) simples[k].r$ = regras[k].r$;
      if (regras[k].direcao) simples[k].direcao = regras[k].direcao;
    }
    chrome.storage.local.set({ tiktokActiveLastState: simples });
  } catch(e) {}
}

function carregarUltimoEstadoActive(callback) {
  try {
    chrome.storage.local.get('tiktokActiveLastState', function(data) {
      callback(data && data.tiktokActiveLastState ? data.tiktokActiveLastState : {});
    });
  } catch(e) { callback({}); }
}

function abrirDialogTikTokMassaActive() {
  var existing = document.getElementById('ups-tiktok-mass-overlay');
  if (existing) existing.remove();

  var overlay = document.createElement('div');
  overlay.id = 'ups-tiktok-mass-overlay';
  overlay.innerHTML =
    '<div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.45);z-index:999999;display:flex;align-items:center;justify-content:center;">' +
    '<div style="background:white;border-radius:8px;padding:24px;width:520px;max-width:95vw;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 8px 32px rgba(0,0,0,0.25);font-family:sans-serif;">' +
    '<div style="font-size:18px;font-weight:bold;margin-bottom:4px;">Desconto Promocional</div>' +
    '<div style="font-size:12px;color:#888;margin-bottom:12px;">Carregando tamanhos... <span id="ups-tk-loading" style="color:#4078f2;">⏳</span></div>' +
    '<div id="ups-tk-body" style="flex:1;overflow-y:auto;margin-bottom:12px;display:none;"></div>' +
    '<div id="ups-tk-footer" style="border-top:1px solid #eee;padding-top:12px;display:none;">' +
    '<div style="display:flex;gap:8px;justify-content:flex-end;">' +
    '<button id="ups-tk-cancelar" style="padding:8px 20px;border:1px solid #ccc;border-radius:4px;cursor:pointer;font-size:13px;background:white;">Cancelar</button>' +
    '<button id="ups-tk-executar" style="padding:8px 20px;background:#28a745;color:white;border:none;border-radius:4px;cursor:pointer;font-weight:bold;font-size:13px;">APLICAR</button>' +
    '</div></div></div></div>';
  document.body.appendChild(overlay);

  overlay.addEventListener('click', function(e) {
    var contentBox = overlay.querySelector('div[style*="background:white"]');
    if (contentBox && !contentBox.contains(e.target)) overlay.remove();
  });

  document.getElementById('ups-tk-cancelar').addEventListener('click', function() { overlay.remove(); });

  coletarTamanhosPrecosTikTokActive(function(msg) {
    var el = document.getElementById('ups-tk-loading');
    if (el) el.textContent = msg;
  }).then(function(tamanhos) {
    var loadingEl = document.getElementById('ups-tk-loading');
    var body = document.getElementById('ups-tk-body');
    var footer = document.getElementById('ups-tk-footer');
    if (!body) return;

    var ORDEM_TAM = { 'pp': 1, 'p': 2, 'm': 3, 'g': 4, 'gg': 5, 'egg': 6, 'g1': 7, 'g2': 8, 'g3': 9, 'g4': 10, 'g5': 11, 'xg': 12, 'xgg': 13, 'exg': 14, 'exgg': 15, 'eg': 16, '2xg': 17, '2xgg': 18, '3xg': 19, '3xgg': 20 };
    var chaves = Object.keys(tamanhos).sort(function(a, b) {
      var ai = ORDEM_TAM[a.toLowerCase().trim()], bi = ORDEM_TAM[b.toLowerCase().trim()];
      if (ai && bi) return ai - bi;
      if (ai) return -1; if (bi) return 1;
      var an = parseInt(a, 10), bn = parseInt(b, 10);
      if (!isNaN(an) && !isNaN(bn)) return an - bn;
      return a.localeCompare(b);
    });
    if (!chaves.length) {
      if (loadingEl) loadingEl.textContent = 'Nenhuma variação encontrada.';
      return;
    }

    if (loadingEl) loadingEl.style.display = 'none';
    body.style.display = 'block';
    footer.style.display = 'block';

    var precoBaseExemplo = tamanhos[chaves[0]].precoBase || 0;
    var html = '<div style="font-size:12px;color:#888;margin-bottom:8px;">Preços Base: <b>' + textoFaixaPrecos(tamanhos[chaves[0]]) + '</b></div>';
    html += '<table style="width:100%;border-collapse:collapse;">';
    html += '<thead><tr style="background:#f5f5f5;">' +
      '<th style="padding:6px 8px;border:1px solid #e0e0e0;font-size:11px;text-align:left;">Tamanho</th>' +
      '<th style="padding:6px 8px;border:1px solid #e0e0e0;font-size:11px;text-align:center;width:80px;">%</th>' +
      '<th style="padding:6px 8px;border:1px solid #e0e0e0;font-size:11px;text-align:center;width:100px;">R$ Desejado</th>' +
      '<th style="padding:6px 8px;border:1px solid #e0e0e0;font-size:11px;text-align:center;width:75px;">Prioridade</th>' +
      '<th style="padding:6px 8px;border:1px solid #e0e0e0;font-size:11px;text-align:center;width:80px;">Resultado</th>' +
      '</tr></thead><tbody>';

    for (var i = 0; i < chaves.length; i++) {
      var t = chaves[i];
      html += '<tr>' +
        '<td style="padding:6px 8px;border:1px solid #e0e0e0;font-size:14px;font-weight:600;text-transform:uppercase;">' + t + '</td>' +
        '<td style="padding:6px 8px;border:1px solid #e0e0e0;"><input id="ups-tk-pct-' + i + '" type="number" min="1" max="99" placeholder="%" value="' + (tamanhos[t].descontoAtual || '') + '" style="width:100%;padding:4px;border:1px solid #ccc;border-radius:4px;font-size:13px;text-align:center;box-sizing:border-box;"></td>' +
        '<td style="padding:6px 8px;border:1px solid #e0e0e0;"><input id="ups-tk-r$-' + i + '" type="number" step="0.01" min="0" placeholder="R$" style="width:100%;padding:4px;border:1px solid #ccc;border-radius:4px;font-size:13px;text-align:center;box-sizing:border-box;"></td>' +
        '<td style="padding:6px 8px;border:1px solid #e0e0e0;text-align:center;white-space:nowrap;">' +
        '<span id="ups-tk-up-' + i + '" data-idx="' + i + '" style="cursor:pointer;padding:2px 6px;border-radius:3px;font-size:13px;color:#999;user-select:none;" title="Para cima (preço maior, menos desconto)">▲</span>' +
        '<span id="ups-tk-dn-' + i + '" data-idx="' + i + '" style="cursor:pointer;padding:2px 6px;border-radius:3px;font-size:13px;color:#999;user-select:none;margin-left:2px;" title="Para baixo (preço menor, mais desconto)">▼</span>' +
        '</td>' +
        '<td id="ups-tk-res-' + i + '" style="padding:6px 8px;border:1px solid #e0e0e0;font-size:12px;text-align:center;color:#666;">—</td>' +
        '</tr>';
    }
    html += '</tbody></table>';
    html += '<div style="font-size:11px;color:#888;margin-top:6px;">Preencha % ou R$ Desejado. Clique ▲ (acima do alvo) ou ▼ (abaixo do alvo) para ajustar a direção.</div>';
    body.innerHTML = html;

    var dirAtivo = {};

    // Restore last state
    carregarUltimoEstadoActive(function(ultimo) {
      for (var j = 0; j < chaves.length; j++) {
        var t = chaves[j];
        var estado = ultimo[t];
        if (!estado) continue;
        var inpPct = document.getElementById('ups-tk-pct-' + j);
        var inpRs = document.getElementById('ups-tk-r$-' + j);
        if (estado.pct && inpPct) inpPct.value = estado.pct;
        if (estado.r$ && inpRs) inpRs.value = estado.r$;
        if (estado.direcao && estado.r$) {
          dirAtivo[j] = estado.direcao;
          var upEl = document.getElementById('ups-tk-up-' + j);
          var dnEl = document.getElementById('ups-tk-dn-' + j);
          if (estado.direcao === 'up' && upEl) { upEl.style.color = '#fff'; upEl.style.background = '#28a745'; }
          if (estado.direcao === 'down' && dnEl) { dnEl.style.color = '#fff'; dnEl.style.background = '#4078f2'; }
        }
      }
      // Recalc after restore
      for (var r = 0; r < chaves.length; r++) {
        var fn = window['_upsTkRecalc_' + r];
        if (typeof fn === 'function') fn();
      }
    });

    // Bind auto-calc
    for (var j = 0; j < chaves.length; j++) {
      (function(idx) {
        var inpPct = document.getElementById('ups-tk-pct-' + idx);
        var inpRs = document.getElementById('ups-tk-r$-' + idx);
        var resEl = document.getElementById('ups-tk-res-' + idx);
        var precoBase = tamanhos[chaves[idx]].precoBase || precoBaseExemplo;

        function atualizar() {
          var direcao = dirAtivo[idx] || null;
          var rsVal = inpRs.value.trim();
          if (rsVal) {
            var alvo = parseFloat(rsVal.replace(',', '.'));
            if (!isNaN(alvo) && alvo > 0) {
              var calc = precoParaPorcentagem(precoBase, alvo, direcao);
              if (calc) {
                inpPct.value = calc.pct;
                resEl.textContent = 'R$ ' + calc.resultado.toFixed(2).replace('.', ',');
                resEl.style.color = '#28a745';
                return;
              }
            }
          }
          if (inpPct.value.trim()) {
            var p = parseInt(inpPct.value, 10);
            if (!isNaN(p) && p >= 1 && p <= 99) {
              var r = precoBase * (100 - p) / 100;
              resEl.textContent = 'R$ ' + r.toFixed(2).replace('.', ',');
              resEl.style.color = '#666';
              return;
            }
          }
          resEl.textContent = '—';
          resEl.style.color = '#666';
        }

        function toggleDirLocal(dir) {
          var upEl = document.getElementById('ups-tk-up-' + idx);
          var dnEl = document.getElementById('ups-tk-dn-' + idx);
          if (dirAtivo[idx] === dir) {
            dirAtivo[idx] = null;
            upEl.style.color = '#999'; upEl.style.background = 'transparent';
            dnEl.style.color = '#999'; dnEl.style.background = 'transparent';
          } else {
            dirAtivo[idx] = dir;
            if (dir === 'up') { upEl.style.color = '#fff'; upEl.style.background = '#28a745'; dnEl.style.color = '#999'; dnEl.style.background = 'transparent'; }
            else { dnEl.style.color = '#fff'; dnEl.style.background = '#4078f2'; upEl.style.color = '#999'; upEl.style.background = 'transparent'; }
          }
          atualizar();
        }

        window['_upsTkRecalc_' + idx] = atualizar;
        document.getElementById('ups-tk-up-' + idx).addEventListener('click', function() { toggleDirLocal('up'); });
        document.getElementById('ups-tk-dn-' + idx).addEventListener('click', function() { toggleDirLocal('down'); });
        inpPct.addEventListener('input', function() { if (!inpRs.value.trim()) atualizar(); });
        inpRs.addEventListener('input', function() { atualizar(); });

        // Trigger initial calc
        atualizar();
      })(j);
    }

    // Save and close on body click (clicking outside)
    document.getElementById('ups-tk-executar').addEventListener('click', async function() {
      var regras = {};
      for (var k = 0; k < chaves.length; k++) {
        var pctEl = document.getElementById('ups-tk-pct-' + k);
        var rsEl = document.getElementById('ups-tk-r$-' + k);
        var tamanho = chaves[k];
        var regra = { precoBase: tamanhos[tamanho].precoBase || precoBaseExemplo };
        var rsValor = (rsEl && rsEl.value.trim()) ? parseFloat(rsEl.value.replace(',', '.')) : NaN;
        if (!isNaN(rsValor) && rsValor > 0) {
          regra.r$ = rsValor;
        } else if (pctEl && pctEl.value.trim()) {
          var p = parseInt(pctEl.value, 10);
          if (!isNaN(p) && p >= 1 && p <= 99) regra.pct = p;
        }
        if (dirAtivo[k]) regra.direcao = dirAtivo[k];
        if (regra.pct !== undefined || regra.r$ !== undefined) {
          regras[tamanho] = regra;
        }
      }

      // Save last state
      salvarUltimoEstadoActive(regras);

      overlay.remove();
      await sleep(200);

      if (!Object.keys(regras).length) {
        mostrarFeedback('Nenhum valor válido para aplicar.', '#dc3545');
        return;
      }

      criarOverlayProgresso();
      var step = 0;
      var total = Object.keys(regras).length;
      atualizarOverlayProgresso({ message: 'Iniciando...', step: 1, total: total });

      try {
        await setDescontoPorTamanhoTikTokActive(regras, function(msg) {
          step++;
          atualizarOverlayProgresso({ message: msg, step: Math.min(step, total), total: total });
        });
      } catch (err) {
        mostrarErroOverlayProgresso('Erro: ' + (err.message || err));
        await sleep(3000);
      }

      atualizarOverlayProgresso({ message: 'Concluído!', step: total, total: total });
      await sleep(1000);
      removerOverlayProgresso();
    });
  });
}

function injetarBotaoTikTokActive() {
  if (document.getElementById('ups-tiktok-active-btn')) return;
  var overlay = document.querySelector('.my_list_discount_price_modal');
  var modal = document.querySelector('.ant-modal');
  var closeBtn = document.querySelector('.ant-modal-close');
  if (!overlay || !modal || !closeBtn) return;

  var modalRect = modal.getBoundingClientRect();
  var closeRect = closeBtn.getBoundingClientRect();

  var btn = document.createElement('button');
  btn.id = 'ups-tiktok-active-btn';
  btn.textContent = '$';
  btn.title = 'Aplicar desconto em massa';
  btn.style.cssText = 'position:fixed;top:' + closeRect.top + 'px;left:' + (modalRect.right + 8) + 'px;' +
    'z-index:1000;width:44px;height:44px;border-radius:50%;' +
    'background:#28a745;color:white;border:none;' +
    'font-size:22px;font-weight:bold;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.25);' +
    'display:flex;align-items:center;justify-content:center;line-height:1;';
  btn.addEventListener('click', function(e) {
    e.stopPropagation();
    abrirDialogTikTokMassaActive();
  });
  overlay.appendChild(btn);
}

function removerBotaoTikTokActive() {
  var btn = document.getElementById('ups-tiktok-active-btn');
  if (btn) btn.remove();
}

// ===== TIKTOK EDIT PAGE (/tiktok/edit/) =====

var TIKTOK_EDIT_ULTIMO_ESTADO = 'ultimoEstadoTikTokEdit';
var TIKTOK_EDIT_PRESETS_KEY = 'bibliotecaPresetsTikTokEdit';
var TIKTOK_EDIT_ATTR_KEY = 'bibliotecaAtributosTikTokEdit';

function encontrarColunasTikTokEdit() {
  var headerCells = document.querySelectorAll('.vxe-header--column');
  var map = {};
  for (var i = 0; i < headerCells.length; i++) {
    var cell = headerCells[i];
    var txt = (cell.textContent || '').trim().toLowerCase();
    var cls = Array.from(cell.classList).find(function(c) { return c.startsWith('col_'); });
    if (!cls) continue;
    if (txt.includes('sku')) map.sku = cls;
    else if (txt.includes('quantidade')) map.qtd = cls;
    else if (txt.includes('preço') || txt.includes('preco')) map.preco = cls;
    else if (txt.includes('código') || txt.includes('codigo')) map.barcode = cls;
  }
  return map;
}

function setColunaTikTokEdit(colClass, value) {
  var ns = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  var rows = document.querySelectorAll('.vxe-body--row');
  var c = 0;
  rows.forEach(function(row) {
    var cell = row.querySelector('td.' + colClass);
    if (!cell) return;
    var input = cell.querySelector('input');
    if (!input || input.disabled) return;
    input.focus();
    ns.call(input, String(value));
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.blur();
    c++;
  });
  return c;
}

function gerarSkuTikTokEdit() {
  var header = document.querySelector('.vxe-header--row');
  if (!header) return false;
  var skuTh = Array.from(header.querySelectorAll('th')).find(function(th) {
    return th.textContent.toLowerCase().includes('sku');
  });
  if (!skuTh) return false;
  var els = skuTh.querySelectorAll('span, a, button');
  for (var i = 0; i < els.length; i++) {
    if (els[i].textContent.trim() === 'Gerar') { els[i].click(); return true; }
  }
  return false;
}

function setDescricaoTikTokEdit(texto) {
  var editor = document.querySelector('.tox-tinymce');
  if (!editor) return false;
  var iframe = editor.querySelector('iframe');
  if (iframe) {
    try {
      var doc = iframe.contentDocument || iframe.contentWindow.document;
      doc.body.innerHTML = '<p>' + texto.replace(/\n/g, '</p><p>') + '</p>';
      return true;
    } catch(e) {}
  }
  return false;
}

function setFormItemTikTokEdit(label, value) {
  var ns = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  var items = document.querySelectorAll('.ant-form-item');
  for (var i = 0; i < items.length; i++) {
    var lbl = items[i].querySelector('.ant-form-item-label');
    if (!lbl || !lbl.textContent.trim().toLowerCase().includes(label.toLowerCase())) continue;
    var input = items[i].querySelector('input:not([type="hidden"]):not([type="radio"])');
    if (input) {
      input.focus();
      ns.call(input, String(value));
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.blur();
      return true;
    }
  }
  return false;
}

function capturarAtributosTikTokEdit() {
  var dados = {};
  var attrCard = null;
  var cards = document.querySelectorAll('.ant-card');
  for (var c = 0; c < cards.length; c++) {
    var title = cards[c].querySelector('.ant-card-head-title');
    if (title && title.textContent.trim() === 'Atributos') { attrCard = cards[c]; break; }
  }
  if (!attrCard) return dados;
  var items = attrCard.querySelectorAll('.ant-form-item');
  items.forEach(function(item) {
    var label = item.querySelector('.ant-form-item-label label');
    if (!label) return;
    var raw = label.textContent.trim().replace('*', '').trim();
    var labelText = raw.replace(/\s*\(.*\)\s*/, '').trim();
    if (!labelText || labelText === 'Marca') return;
    var selectVal = item.querySelector('.ant-select-selection-selected-value');
    if (selectVal && selectVal.textContent.trim()) {
      dados[labelText] = selectVal.textContent.trim();
    }
  });
  return dados;
}

async function aplicarAtributosTikTokEdit(dados) {
  if (!dados || !Object.keys(dados).length) return;
  var attrCard = null;
  var cards = document.querySelectorAll('.ant-card');
  for (var c = 0; c < cards.length; c++) {
    var title = cards[c].querySelector('.ant-card-head-title');
    if (title && title.textContent.trim() === 'Atributos') { attrCard = cards[c]; break; }
  }
  if (!attrCard) return;

  var maisBtn = Array.from(attrCard.querySelectorAll('*')).find(function(el) {
    return el.innerText && el.innerText.trim().toLowerCase() === 'mais atributos';
  });
  if (maisBtn) {
    maisBtn.click();
    await sleep(1500);
    var maisBtn2 = Array.from(attrCard.querySelectorAll('*')).find(function(el) {
      return el.innerText && el.innerText.trim().toLowerCase() === 'mais atributos';
    });
    if (maisBtn2) { maisBtn2.click(); await sleep(1000); }
  }

  var lastCount = 0;
  var formItems;
  for (var w = 0; w < 30; w++) {
    formItems = attrCard.querySelectorAll('.ant-form-item');
    if (formItems.length > 1 && formItems.length === lastCount) break;
    lastCount = formItems.length;
    await sleep(300);
  }

  var normal = function(s) { return s.replace(/[:\s]+/g, ' ').trim().toLowerCase(); };
  var cleanLabel = function(s) { return s.replace(/\s*\(.*\)\s*/, ' ').replace(/[:\s]+/g, ' ').trim().toLowerCase(); };

  for (var r = 0; r < formItems.length; r++) {
    var rLabel = formItems[r].querySelector('.ant-form-item-label label');
    if (!rLabel) continue;
    var rSelect = formItems[r].querySelector('.ant-select');
    if (rSelect) {
      var rClearBtn = rSelect.querySelector('.ant-select-selection__clear');
      if (rClearBtn) { rClearBtn.click(); await sleep(150); }
    }
  }
  await sleep(300);

  var applied = 0;
  for (var campo in dados) {
    if (!dados.hasOwnProperty(campo)) continue;
    var valor = dados[campo];
    if (!valor) continue;
    var targetLabel = cleanLabel(campo);
    var targetValue = normal(valor);
    var items = attrCard.querySelectorAll('.ant-form-item');
    for (var i = 0; i < items.length; i++) {
      var label = items[i].querySelector('.ant-form-item-label label');
      if (!label) continue;
      var labelText = cleanLabel(label.textContent);
      if (labelText !== targetLabel) continue;
      var select = items[i].querySelector('.ant-select');
      if (!select) break;
      var currentVal = select.querySelector('.ant-select-selection-selected-value');
      if (currentVal && normal(currentVal.textContent) === targetValue) { applied++; break; }
      var openDd = document.querySelector('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
      if (openDd) { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); await sleep(150); }
      select.click();
      await sleep(400);
      var dd = document.querySelector('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
      if (!dd) break;
      var opt = Array.from(dd.querySelectorAll('li')).find(function(li) {
        return normal(li.textContent) === targetValue;
      });
      if (opt) { opt.click(); applied++; await sleep(300); }
      else { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); await sleep(150); }
      break;
    }
  }
  return applied;
}

async function executarTikTokEdit(dados) {
  var msg = [];

  // Descricao
  if (dados.descAtivo && dados.descricao) {
    if (setDescricaoTikTokEdit(dados.descricao)) msg.push('Descrição');
  }

  // Atributos
  if (dados.attrAtivo && dados.attrDados && Object.keys(dados.attrDados).length) {
    await aplicarAtributosTikTokEdit(dados.attrDados);
    msg.push('Atributos');
  }

  // Editar em Massa
  if (dados.macroAtivo && dados.emMassa) {
    var m = dados.emMassa;
    var cols = encontrarColunasTikTokEdit();
    if (m.sku && cols.sku) {
      var n = setColunaTikTokEdit(cols.sku, m.sku);
      if (n > 0) msg.push('SKU (' + n + ')');
    }
    if (m.quantidade && cols.qtd) {
      var n = setColunaTikTokEdit(cols.qtd, m.quantidade);
      if (n > 0) msg.push('Qtd (' + n + ')');
    }
    if (m.preco && cols.preco) {
      var n = setColunaTikTokEdit(cols.preco, m.preco.replace(',', '.'));
      if (n > 0) msg.push('Preço (' + n + ')');
    }
    if (m.gerarSku) {
      if (gerarSkuTikTokEdit()) msg.push('SKU gerado');
    }
    if (m.peso) {
      if (setFormItemTikTokEdit('Peso do Pacote', m.peso.replace(',', '.'))) msg.push('Peso');
    }
    if (m.pacote) {
      var dims = m.pacote.split(/[xX×]/).map(function(s) { return s.trim(); });
      if (dims.length === 3) {
        if (setFormItemTikTokEdit('Largura', dims[0])) msg.push('Largura');
        if (setFormItemTikTokEdit('Comprimento', dims[1])) msg.push('Comprimento');
        if (setFormItemTikTokEdit('Altura', dims[2])) msg.push('Altura');
      }
    }
  }

  return msg;
}

// ===== BOTÃO =====

function injetarBotaoTikTokEdit() {
  if (document.getElementById('ups-tiktok-edit-btn')) return;
  var cardHead = document.querySelector('#basic .ant-card-head');
  if (!cardHead) return;

  var btn = document.createElement('div');
  btn.id = 'ups-tiktok-edit-btn';
  btn.style.cssText = 'position:fixed;z-index:999999999;cursor:pointer;width:40px;height:40px;border-radius:50%;background:#4078f2;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;';
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="white" style="width:24px;height:24px;display:block;margin:auto;"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z"/></svg>';
  btn.title = 'Editar em Massa - TikTok';
  btn.addEventListener('click', abrirDialogTikTokEdit);

  function posicionarTop() {
    var r = cardHead.getBoundingClientRect();
    btn.style.top = (r.top + 258) + 'px';
  }
  function posicionarRight() {
    var ref = document.querySelector('.edit_back_top_inner');
    if (ref) {
      var cssRight = parseFloat(window.getComputedStyle(ref).right);
      btn.style.right = (cssRight - 4) + 'px';
    } else {
      btn.style.right = '124px';
    }
  }
  function posicionarCompleto() { posicionarTop(); posicionarRight(); }
  posicionarCompleto();
  window.addEventListener('resize', posicionarRight);
  var ultimaDPR = window.devicePixelRatio;
  setInterval(function() {
    if (window.devicePixelRatio !== ultimaDPR) {
      ultimaDPR = window.devicePixelRatio;
      posicionarCompleto();
    }
  }, 1000);

  document.body.appendChild(btn);
}

function removerBotaoTikTokEdit() {
  var btn = document.getElementById('ups-tiktok-edit-btn');
  if (btn) btn.remove();
}

// ===== OVERLAY =====

function abrirDialogTikTokEdit() {
  var existing = document.getElementById('ups-tiktok-edit-overlay');
  if (existing) existing.remove();

  var overlay = document.createElement('div');
  overlay.id = 'ups-tiktok-edit-overlay';
  overlay.innerHTML = `
<div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.45);z-index:999999;display:flex;align-items:center;justify-content:center;">
<div style="background:white;border-radius:8px;padding:24px;width:540px;max-width:95vw;max-height:90vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,0.25);font-family:sans-serif;">
<div style="font-size:18px;font-weight:bold;margin-bottom:16px;">Automação TikTok - UpSeller</div>

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
#ups-tk-tm-toggle + span { transition:.3s; display:inline-block; width:36px;height:20px;border-radius:20px;background:#ccc;vertical-align:middle; }
#ups-tk-tm-toggle:checked + span { background:#28a745; }
#ups-tk-tm-toggle:checked + span::before { transform:translateX(16px); }
#ups-tk-tm-toggle + span::before { content:""; position:absolute; width:16px;height:16px;border-radius:50%;background:white;top:2px;left:2px;transition:.3s; }
#ups-tk-s-desc,#ups-tk-s-macro,#ups-tk-s-multi{ background:#ccc; display:inline-block;width:36px;height:20px;border-radius:20px;vertical-align:middle;position:relative; }
#ups-tk-t-desc:checked + #ups-tk-s-desc { background:#28a745; }
#ups-tk-t-desc:checked + #ups-tk-s-desc::before { transform:translateX(16px); }
#ups-tk-s-desc::before { content:""; position:absolute; width:16px;height:16px;border-radius:50%;background:white;top:2px;left:2px;transition:.3s; }
#ups-tk-t-macro:checked + #ups-tk-s-macro { background:#28a745; }
#ups-tk-t-macro:checked + #ups-tk-s-macro::before { transform:translateX(16px); }
#ups-tk-s-macro::before { content:""; position:absolute; width:16px;height:16px;border-radius:50%;background:white;top:2px;left:2px;transition:.3s; }
#ups-tk-t-multi:checked + #ups-tk-s-multi { background:#ff9800; }
#ups-tk-t-multi:checked + #ups-tk-s-multi::before { transform:translateX(16px); }
#ups-tk-s-multi::before { content:""; position:absolute; width:16px;height:16px;border-radius:50%;background:white;top:2px;left:2px;transition:.3s; }
/* Accordion toggle switches */
#ups-tk-tpp-desc,#ups-tk-tpp-attr{ background:#ccc; }
#ups-ac-tk-desc:checked + #ups-tk-tpp-desc { background:#28a745; }
#ups-ac-tk-desc:checked + #ups-tk-tpp-desc::before { transform:translateX(16px); }
#ups-tk-tpp-desc::before{ content:""; position:absolute; width:16px;height:16px;border-radius:50%;background:white;top:2px;left:2px;transition:.3s; }
#ups-ac-tk-attr:checked + #ups-tk-tpp-attr { background:#28a745; }
#ups-ac-tk-attr:checked + #ups-tk-tpp-attr::before { transform:translateX(16px); }
#ups-tk-tpp-attr::before{ content:""; position:absolute; width:16px;height:16px;border-radius:50%;background:white;top:2px;left:2px;transition:.3s; }
</style>

<label style="font-size:12px;font-weight:600;display:block;margin-bottom:3px;">Carregar Salvo</label>
<div style="display:flex;gap:4px;margin-bottom:10px;">
<select id="ups-tk-ps" style="flex:1;padding:6px;border:1px solid #ccc;border-radius:4px;font-size:13px;box-sizing:border-box;"><option value="">Selecionar...</option></select>
<button id="ups-tk-salvar" style="padding:4px 10px;border:1px solid #28a745;border-radius:4px;cursor:pointer;font-size:12px;background:#28a745;color:white;white-space:nowrap;">💾 Salvar</button>
<button id="ups-tk-excluir" style="padding:4px 10px;border:1px solid #dc3545;border-radius:4px;cursor:pointer;font-size:12px;background:white;color:#dc3545;white-space:nowrap;">🗑</button>
</div>

<!-- DESCRIÇÃO ACCORDION -->
<div class="ups-ac">
  <div class="ups-ac-h" data-ac-target="ups-tk-ac-b-desc" id="ups-tk-ac-h-desc">
    <span>✏️ Descrição</span>
    <span class="ups-ac-ar" style="transition:transform .2s;">▶</span>
    <label style="position:relative;display:inline-block;width:36px;height:20px;margin-left:auto;cursor:pointer;" onclick="event.stopPropagation()">
      <input type="checkbox" id="ups-ac-tk-desc" checked style="opacity:0;width:0;height:0;margin:0;">
      <span id="ups-tk-tpp-desc" style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;border-radius:20px;transition:.3s;"></span>
    </label>
  </div>
  <div class="ups-ac-body" id="ups-tk-ac-b-desc"><div class="ups-ac-body-inner">
    <div style="margin-bottom:8px;">
      <select id="ups-tk-ds" style="width:100%;padding:4px;border:1px solid #ccc;border-radius:4px;font-size:11px;box-sizing:border-box;"><option value="">Selecionar...</option></select>
    </div>
    <div id="ups-tk-d-display" style="padding:10px;background:#f9f9f9;border:1px solid #e0e0e0;border-radius:4px;font-size:12px;color:#666;overflow-y:auto;margin-bottom:8px;display:none;"></div>
    <textarea id="ups-tk-desc" rows="5" style="width:100%;padding:4px;border:1px solid #ccc;border-radius:4px;font-size:11px;resize:vertical;box-sizing:border-box;font-family:sans-serif;" placeholder="Descrição do produto (opcional)..."></textarea>
  </div></div>
</div>

<!-- ATRIBUTOS ACCORDION -->
<div class="ups-ac">
  <div class="ups-ac-h" data-ac-target="ups-tk-ac-b-attr" id="ups-tk-ac-h-attr">
    <span>🏷 Atributos</span>
    <span class="ups-ac-ar" style="transition:transform .2s;">▶</span>
    <label style="position:relative;display:inline-block;width:36px;height:20px;margin-left:auto;cursor:pointer;" onclick="event.stopPropagation()">
      <input type="checkbox" id="ups-ac-tk-attr" checked style="opacity:0;width:0;height:0;margin:0;">
      <span id="ups-tk-tpp-attr" style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;border-radius:20px;transition:.3s;"></span>
    </label>
  </div>
  <div class="ups-ac-body" id="ups-tk-ac-b-attr"><div class="ups-ac-body-inner">
    <label style="font-size:12px;font-weight:600;display:block;margin-bottom:3px;">Presets de Atributos</label>
    <select id="ups-tk-as" style="width:100%;padding:4px;border:1px solid #ccc;border-radius:4px;font-size:11px;box-sizing:border-box;margin-bottom:4px;"><option value="">Carregar Salvo...</option></select>
    <div style="display:flex;gap:3px;">
      <input id="ups-tk-a-nome" type="text" placeholder="Nome do preset" style="flex:1;padding:4px;border:1px solid #ccc;border-radius:4px;font-size:11px;">
      <button id="ups-tk-a-salvar" style="padding:4px 10px;background:#4078f2;color:white;border:none;border-radius:4px;cursor:pointer;font-size:14px;line-height:1;">💾</button>
    </div>
    <button id="ups-tk-a-excluir" style="display:none;width:100%;margin-top:4px;padding:3px;border:1px solid #dc3545;color:#dc3545;border-radius:4px;cursor:pointer;font-size:11px;background:white;">× Excluir</button>
    <div style="font-size:11px;color:#666;margin-top:4px;">Salva os atributos manualmente configurados para aplicar em anúncios futuros da mesma categoria.</div>
  </div></div>
</div>

<!-- EDITAR EM MASSA ACCORDION -->
<div class="ups-ac">
  <div class="ups-ac-h" data-ac-target="ups-tk-ac-b-macro" id="ups-tk-ac-h-macro">
    <span>🛠 Editar em Massa</span>
    <span class="ups-ac-ar" style="transition:transform .2s;">▶</span>
    <label style="position:relative;display:inline-block;width:36px;height:20px;margin-left:auto;cursor:pointer;">
      <input type="checkbox" id="ups-tk-t-macro" checked style="opacity:0;width:0;height:0;margin:0;">
      <span id="ups-tk-s-macro" style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;border-radius:20px;"></span>
    </label>
  </div>
  <div class="ups-ac-body" id="ups-tk-ac-b-macro"><div class="ups-ac-body-inner">
    <label style="font-size:12px;font-weight:600;display:block;margin-bottom:3px;">Carregar Macro Salvo</label>
    <div style="display:flex;gap:4px;margin-bottom:10px;">
      <select id="ups-tk-ms" style="flex:1;padding:6px;border:1px solid #ccc;border-radius:4px;font-size:13px;box-sizing:border-box;"><option value="">Selecionar...</option></select>
      <button id="ups-tk-m-salvar" style="padding:4px 10px;border:1px solid #28a745;border-radius:4px;cursor:pointer;font-size:12px;background:#28a745;color:white;white-space:nowrap;">💾 Salvar</button>
      <button id="ups-tk-m-excluir" style="padding:4px 10px;border:1px solid #dc3545;border-radius:4px;cursor:pointer;font-size:12px;background:white;color:#dc3545;white-space:nowrap;">🗑</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;">
      <div><label style="font-size:12px;font-weight:600;display:block;margin-bottom:2px;">SKU</label>
      <div style="display:flex;gap:4px;"><input id="ups-tk-e-sku" type="text" placeholder="Valor" style="flex:1;padding:6px;border:1px solid #ccc;border-radius:4px;font-size:13px;box-sizing:border-box;"><button id="ups-tk-sku-gerar" style="padding:4px 10px;border:1px solid #4078f2;border-radius:4px;cursor:pointer;font-size:12px;background:white;color:#4078f2;white-space:nowrap;">Gerar</button></div></div>
      <div><label style="font-size:12px;font-weight:600;display:block;margin-bottom:2px;">Quantidade</label>
      <input id="ups-tk-eq" type="text" placeholder="Ex: 10000" style="width:100%;padding:6px;border:1px solid #ccc;border-radius:4px;font-size:13px;box-sizing:border-box;"></div>
      <div><label style="font-size:12px;font-weight:600;display:block;margin-bottom:2px;">Preço (R$)</label>
      <input id="ups-tk-ep" type="text" placeholder="Ex: 89,90" style="width:100%;padding:6px;border:1px solid #ccc;border-radius:4px;font-size:13px;box-sizing:border-box;"></div>
      <div><label style="font-size:12px;font-weight:600;display:block;margin-bottom:2px;">Peso(kg)</label>
      <input id="ups-tk-ew" type="text" placeholder="Ex: 0,350" style="width:100%;padding:6px;border:1px solid #ccc;border-radius:4px;font-size:13px;box-sizing:border-box;"></div>
      <div style="grid-column:span 2;"><label style="font-size:12px;font-weight:600;display:block;margin-bottom:2px;">Pacote(cm) (LxAxC)</label>
      <input id="ups-tk-epkg" type="text" placeholder="25x22x3" style="width:100%;padding:6px;border:1px solid #ccc;border-radius:4px;font-size:13px;box-sizing:border-box;"></div>
    </div>
    <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;">
      <label style="font-size:13px;font-weight:600;display:flex;align-items:center;gap:4px;white-space:nowrap;"><input type="checkbox" id="ups-tk-e-sku-cb" style="margin:0;"> Gerar SKU</label>
    </div>
  </div></div>
</div>

<!-- MULTI-ABA ACCORDION -->
<div class="ups-ac">
  <div class="ups-ac-h" data-ac-target="ups-tk-ac-b-multi" id="ups-tk-ac-h-multi">
    <span>🔄 Multi-Aba</span>
    <span class="ups-ac-ar" style="transition:transform .2s;">▶</span>
    <label style="position:relative;display:inline-block;width:36px;height:20px;margin-left:auto;cursor:pointer;">
      <input type="checkbox" id="ups-tk-t-multi" style="opacity:0;width:0;height:0;margin:0;">
      <span id="ups-tk-s-multi" style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;border-radius:20px;"></span>
    </label>
  </div>
  <div class="ups-ac-body" id="ups-tk-ac-b-multi"><div class="ups-ac-body-inner">
    <div style="display:flex;align-items:center;gap:8px;">
      <button id="ups-tk-multi-toggle" style="padding:6px 14px;border:1px solid #ccc;border-radius:4px;cursor:pointer;font-size:12px;background:#fff;font-weight:600;">SEQUENCIAL</button>
      <span style="font-size:12px;color:#666;">Modo atual: <b id="ups-tk-multi-label">Sequencial</b></span>
    </div>
    <p style="font-size:11px;color:#999;margin:8px 0 0;">PARALELO: abas lado a lado em janelas próprias. SEQUENCIAL: uma aba por vez.</p>
  </div></div>
</div>

<div style="display:flex;gap:8px;justify-content:flex-end;border-top:1px solid #eee;padding-top:12px;margin-top:12px;">
  <button id="ups-tk-cancelar" style="padding:8px 20px;border:1px solid #ccc;border-radius:4px;cursor:pointer;font-size:13px;background:white;">Cancelar</button>
  <button id="ups-tk-executar" style="padding:8px 20px;background:#28a745;color:white;border:none;border-radius:4px;cursor:pointer;font-weight:bold;font-size:13px;">APLICAR TUDO</button>
</div>
</div>
</div>`;

  document.body.appendChild(overlay);

  function el(id) { return document.getElementById(id); }

  // Click outside to close
  overlay.addEventListener('click', function(e) {
    var contentBox = overlay.querySelector('div[style*="background:white"]');
    if (contentBox && !contentBox.contains(e.target)) {
      salvarEstadoTikTok();
      overlay.remove();
    }
  });

  // ===== ACCORDION BINDING =====
  function toggleAc(hdr) {
    var bodyId = hdr.getAttribute('data-ac-target');
    var body = document.getElementById(bodyId);
    if (!body) return;
    var arrow = hdr.querySelector('.ups-ac-ar');
    var isOpen = !!body.style.maxHeight;
    if (isOpen) {
      body.style.maxHeight = null;
      if (arrow) arrow.style.transform = 'rotate(0deg)';
    } else {
      var allBodies = overlay.querySelectorAll('.ups-ac-body');
      allBodies.forEach(function(b) {
        b.style.maxHeight = null;
        var h = b.previousElementSibling;
        if (h) { var a = h.querySelector('.ups-ac-ar'); if (a) a.style.transform = 'rotate(0deg)'; }
      });
      body.style.maxHeight = body.scrollHeight + 'px';
      if (arrow) arrow.style.transform = 'rotate(90deg)';
    }
  }
  var headers = overlay.querySelectorAll('.ups-ac-h[data-ac-target]');
  headers.forEach(function(h) {
    h.addEventListener('click', function() { toggleAc(h); });
    h.style.cursor = 'pointer';
  });
  // Auto-abrir apenas o primeiro accordion
  setTimeout(function() {
    if (headers.length) {
      var h = headers[0];
      var bodyId = h.getAttribute('data-ac-target');
      var body = document.getElementById(bodyId);
      if (body && !body.style.maxHeight) {
        body.style.maxHeight = body.scrollHeight + 'px';
        var arrow = h.querySelector('.ups-ac-ar');
        if (arrow) arrow.style.transform = 'rotate(90deg)';
      }
    }
  }, 50);

  // ===== CONFIRM CUSTOM =====
  function confirmarExtensao(msg) {
    return new Promise(function(resolve) {
      var div = document.createElement('div');
      div.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.45);z-index:99999999;display:flex;align-items:center;justify-content:center;font-family:sans-serif;';
      div.innerHTML = '<div style="background:white;border-radius:8px;padding:20px;width:320px;max-width:90vw;box-shadow:0 8px 32px rgba(0,0,0,0.25);text-align:center;">' +
        '<div style="font-size:14px;font-weight:600;margin-bottom:16px;color:#333;">' + msg + '</div>' +
        '<div style="display:flex;gap:8px;justify-content:center;">' +
        '<button id="ups-tk-confirm-cancel" style="padding:8px 20px;border:1px solid #ccc;border-radius:4px;cursor:pointer;font-size:13px;background:white;color:#333;">Cancelar</button>' +
        '<button id="ups-tk-confirm-ok" style="padding:8px 20px;background:#dc3545;color:white;border:none;border-radius:4px;cursor:pointer;font-weight:bold;font-size:13px;">Excluir</button>' +
        '</div></div>';
      document.body.appendChild(div);
      div.querySelector('#ups-tk-confirm-cancel').onclick = function() { div.remove(); resolve(false); };
      div.querySelector('#ups-tk-confirm-ok').onclick = function() { div.remove(); resolve(true); };
      div.addEventListener('click', function(e) { if (e.target === div) { div.remove(); resolve(false); } });
    });
  }

  function mostrarTabelaDescricaoTikTok(dados) {
    if (!dados) { el('ups-tk-d-display').style.display = 'none'; return; }
    var excluded = new Set(['descricao','topicos','macros','precos','emMassa','sku','crop','confirmarCores','ativar','sub','quantidade','preco','peso','pacote','paisOrigem']);
    var tamanhos = Object.keys(dados).filter(function(k) {
      if (excluded.has(k)) return false;
      if (typeof dados[k] !== 'object' || dados[k] === null || Array.isArray(dados[k])) return false;
      return dados[k].b || dados[k].c;
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
      el('ups-tk-d-display').style.display = 'none';
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
        h += '<td style="padding:4px 8px;border:1px solid #ccc;font-size:12px;">' + (dados[t].b || '') + '</td>';
        h += '<td style="padding:4px 8px;border:1px solid #ccc;font-size:12px;">' + (dados[t].c || '') + '</td></tr>';
      }
      h += '</tbody></table>';
    }
    el('ups-tk-d-display').innerHTML = h;
    el('ups-tk-d-display').style.display = 'block';
    var acBody = el('ups-tk-ac-b-desc');
    if (acBody && acBody.style.maxHeight) {
      requestAnimationFrame(function() { acBody.style.maxHeight = acBody.scrollHeight + 'px'; });
    }
  }

  // ===== PRESET SYSTEM (overlay inteiro) =====
  function lerEstadoOverlayTikTok() {
    return {
      descAtivo: (el('ups-ac-tk-desc') || {}).checked !== false,
      descricao: el('ups-tk-desc').value,
      attrAtivo: (el('ups-ac-tk-attr') || {}).checked !== false,
      attrPreset: el('ups-tk-as').value,
      macroAtivo: el('ups-tk-t-macro').checked,
      emMassa: {
        sku: el('ups-tk-e-sku').value,
        quantidade: el('ups-tk-eq').value,
        preco: el('ups-tk-ep').value,
        peso: el('ups-tk-ew').value,
        pacote: el('ups-tk-epkg').value
      },
      gerarSku: el('ups-tk-e-sku-cb').checked,
      macroPreset: el('ups-tk-ms').value,
      multiAtivo: el('ups-tk-t-multi').checked,
      multiModo: el('ups-tk-multi-label').textContent.trim().toLowerCase() === 'paralelo' ? 'paralelo' : 'sequencial'
    };
  }

  function restaurarEstadoOverlayTikTok(dados) {
    if (!dados) return;
    if (dados.descAtivo !== undefined) (el('ups-ac-tk-desc') || {}).checked = dados.descAtivo;
    if (dados.descricao) el('ups-tk-desc').value = dados.descricao;
    if (dados.attrAtivo !== undefined) (el('ups-ac-tk-attr') || {}).checked = dados.attrAtivo;
    el('ups-tk-t-macro').checked = dados.macroAtivo !== false;
    if (dados.emMassa) {
      el('ups-tk-e-sku').value = dados.emMassa.sku || '';
      el('ups-tk-eq').value = dados.emMassa.quantidade || '';
      el('ups-tk-ep').value = dados.emMassa.preco || '';
      el('ups-tk-ew').value = dados.emMassa.peso || '';
      el('ups-tk-epkg').value = dados.emMassa.pacote || '';
    }
    el('ups-tk-e-sku-cb').checked = !!dados.gerarSku;
    if (dados.attrPreset) setTimeout(function() { el('ups-tk-as').value = dados.attrPreset; }, 200);
    if (dados.macroPreset) setTimeout(function() { el('ups-tk-ms').value = dados.macroPreset; }, 200);
    if (dados.multiModo === 'paralelo') {
      el('ups-tk-multi-toggle').textContent = 'PARALELO';
      el('ups-tk-multi-label').textContent = 'Paralelo';
    }
  }

  function salvarEstadoTikTok() {
    var estado = lerEstadoOverlayTikTok();
    chrome.storage.local.set({ [TIKTOK_EDIT_ULTIMO_ESTADO]: estado });
  }

  function restaurarEstadoTikTok() {
    chrome.storage.local.get([TIKTOK_EDIT_ULTIMO_ESTADO], function(res) {
      if (res[TIKTOK_EDIT_ULTIMO_ESTADO]) {
        restaurarEstadoOverlayTikTok(res[TIKTOK_EDIT_ULTIMO_ESTADO]);
      }
    });
  }

  function salvarPresetTikTok() {
    var nome = prompt('Nome do preset:');
    if (!nome) return;
    var estado = lerEstadoOverlayTikTok();
    chrome.storage.local.get([TIKTOK_EDIT_PRESETS_KEY], function(res) {
      var presets = res[TIKTOK_EDIT_PRESETS_KEY] || {};
      presets[nome] = estado;
      chrome.storage.local.set({ [TIKTOK_EDIT_PRESETS_KEY]: presets }, function() {
        preencherListaPresetsTikTok();
        el('ups-tk-ps').value = nome;
        mostrarFeedback('Preset "' + nome + '" salvo.');
      });
    });
  }

  async function excluirPresetTikTok() {
    var nome = el('ups-tk-ps').value;
    if (!nome) { alert('Selecione um preset para excluir.'); return; }
    if (!await confirmarExtensao('Excluir preset "' + nome + '"?')) return;
    chrome.storage.local.get([TIKTOK_EDIT_PRESETS_KEY], function(res) {
      var presets = res[TIKTOK_EDIT_PRESETS_KEY] || {};
      delete presets[nome];
      chrome.storage.local.set({ [TIKTOK_EDIT_PRESETS_KEY]: presets }, function() {
        preencherListaPresetsTikTok();
        mostrarFeedback('Preset excluído.');
      });
    });
  }

  function preencherListaPresetsTikTok() {
    chrome.storage.local.get([TIKTOK_EDIT_PRESETS_KEY], function(res) {
      var presets = res[TIKTOK_EDIT_PRESETS_KEY] || {};
      var sel = el('ups-tk-ps');
      sel.innerHTML = '<option value="">Selecionar...</option>';
      Object.keys(presets).sort().forEach(function(nome) {
        var opt = document.createElement('option');
        opt.value = nome;
        opt.textContent = nome;
        sel.appendChild(opt);
      });
    });
  }

  el('ups-tk-ps').addEventListener('change', function() {
    var nome = this.value;
    if (!nome) return;
    chrome.storage.local.get([TIKTOK_EDIT_PRESETS_KEY], function(res) {
      var presets = res[TIKTOK_EDIT_PRESETS_KEY] || {};
      var dados = presets[nome];
      if (dados) restaurarEstadoOverlayTikTok(dados);
    });
  });

  el('ups-tk-salvar').addEventListener('click', salvarPresetTikTok);
  el('ups-tk-excluir').addEventListener('click', excluirPresetTikTok);

  // ===== DESCRIÇÃO PRESETS (biblioteca compartilhada + específicos TikTok) =====
  function preencherListaDescricoesTikTok() {
    chrome.storage.local.get(['biblioteca'], function(res) {
      var bib = res.biblioteca || {};
      var sel = el('ups-tk-ds');
      sel.innerHTML = '<option value="">Selecionar...</option>';
      var nomes = Object.keys(bib);
      console.log('[TikTok] biblioteca keys:', nomes, 'total:', nomes.length);
      if (nomes.length) {
        nomes.sort().forEach(function(nome) {
          var opt = document.createElement('option');
          opt.value = nome;
          opt.textContent = nome;
          sel.appendChild(opt);
        });
      }
    });
  }

  el('ups-tk-ds').addEventListener('change', function() {
    var nome = this.value;
    if (!nome) { el('ups-tk-d-display').style.display = 'none'; return; }
    chrome.storage.local.get(['biblioteca'], function(res) {
      var bib = res.biblioteca || {};
      var dados = bib[nome];
      if (!dados) return;
      if (dados.descricao) el('ups-tk-desc').value = dados.descricao;
      if (typeof mostrarTabelaDescricaoTikTok === 'function') {
        mostrarTabelaDescricaoTikTok(dados);
      }
    });
  });

  // ===== MACRO PRESET =====
  function salvarMacroPresetTikTok() {
    var nome = prompt('Nome da macro:');
    if (!nome) return;
    var estado = {
      emMassa: {
        sku: el('ups-tk-e-sku').value,
        quantidade: el('ups-tk-eq').value,
        preco: el('ups-tk-ep').value,
        peso: el('ups-tk-ew').value,
        pacote: el('ups-tk-epkg').value
      },
      gerarSku: el('ups-tk-e-sku-cb').checked
    };
    chrome.storage.local.get(['bibliotecaMacrosTikTokEdit'], function(res) {
      var macros = res.bibliotecaMacrosTikTokEdit || {};
      macros[nome] = estado;
      chrome.storage.local.set({ bibliotecaMacrosTikTokEdit: macros }, function() {
        preencherListaMacrosTikTok();
        el('ups-tk-ms').value = nome;
        mostrarFeedback('Macro "' + nome + '" salva.');
      });
    });
  }

  async function excluirMacroPresetTikTok() {
    var nome = el('ups-tk-ms').value;
    if (!nome) { alert('Selecione uma macro para excluir.'); return; }
    if (!await confirmarExtensao('Excluir macro "' + nome + '"?')) return;
    chrome.storage.local.get(['bibliotecaMacrosTikTokEdit'], function(res) {
      var macros = res.bibliotecaMacrosTikTokEdit || {};
      delete macros[nome];
      chrome.storage.local.set({ bibliotecaMacrosTikTokEdit: macros }, function() {
        preencherListaMacrosTikTok();
        mostrarFeedback('Macro excluída.');
      });
    });
  }

  function preencherListaMacrosTikTok() {
    chrome.storage.local.get(['bibliotecaMacrosTikTokEdit'], function(res) {
      var macros = res.bibliotecaMacrosTikTokEdit || {};
      var sel = el('ups-tk-ms');
      sel.innerHTML = '<option value="">Selecionar...</option>';
      Object.keys(macros).sort().forEach(function(nome) {
        var opt = document.createElement('option');
        opt.value = nome;
        opt.textContent = nome;
        sel.appendChild(opt);
      });
    });
  }

  el('ups-tk-ms').addEventListener('change', function() {
    var nome = this.value;
    if (!nome) return;
    chrome.storage.local.get(['bibliotecaMacrosTikTokEdit'], function(res) {
      var macros = res.bibliotecaMacrosTikTokEdit || {};
      var dados = macros[nome];
      if (!dados) return;
      if (dados.emMassa) {
        el('ups-tk-e-sku').value = dados.emMassa.sku || '';
        el('ups-tk-eq').value = dados.emMassa.quantidade || '';
        el('ups-tk-ep').value = dados.emMassa.preco || '';
        el('ups-tk-ew').value = dados.emMassa.peso || '';
        el('ups-tk-epkg').value = dados.emMassa.pacote || '';
      }
      el('ups-tk-e-sku-cb').checked = !!dados.gerarSku;
    });
  });

  el('ups-tk-m-salvar').addEventListener('click', salvarMacroPresetTikTok);
  el('ups-tk-m-excluir').addEventListener('click', excluirMacroPresetTikTok);

  // ===== SKU Gerar =====
  el('ups-tk-sku-gerar').addEventListener('click', function() {
    var ok = gerarSkuTikTokEdit();
    mostrarFeedback(ok ? 'SKU gerado!' : 'Erro ao gerar SKU', ok ? '#28a745' : '#dc3545');
  });

  // ===== ATRIBUTOS =====
  function preencherListaAtributosTikTok() {
    chrome.storage.local.get([TIKTOK_EDIT_ATTR_KEY], function(res) {
      var attrs = res[TIKTOK_EDIT_ATTR_KEY] || {};
      var sel = el('ups-tk-as');
      sel.innerHTML = '<option value="">Carregar Salvo...</option>';
      Object.keys(attrs).sort().forEach(function(nome) {
        var opt = document.createElement('option');
        opt.value = nome;
        opt.textContent = nome;
        sel.appendChild(opt);
      });
    });
  }

  el('ups-tk-a-salvar').addEventListener('click', function() {
    var nome = el('ups-tk-a-nome').value.trim();
    if (!nome) { nome = prompt('Nome do preset de atributos:'); if (!nome) return; }
    var maisBtn = Array.from(document.querySelectorAll('*')).find(function(el) {
      return el.innerText && el.innerText.trim().toLowerCase() === 'mais atributos';
    });
    if (maisBtn) maisBtn.click();
    setTimeout(function() {
      var dados = capturarAtributosTikTokEdit();
      chrome.storage.local.get([TIKTOK_EDIT_ATTR_KEY], function(res) {
        var attrs = res[TIKTOK_EDIT_ATTR_KEY] || {};
        attrs[nome] = dados;
        chrome.storage.local.set({ [TIKTOK_EDIT_ATTR_KEY]: attrs }, function() {
          preencherListaAtributosTikTok();
          el('ups-tk-as').value = nome;
          el('ups-tk-a-nome').value = '';
          el('ups-tk-a-excluir').style.display = 'block';
          mostrarFeedback(Object.keys(dados).length + ' atributos de "' + nome + '" salvos.');
        });
      });
    }, 600);
  });

  el('ups-tk-as').addEventListener('change', function() {
    var nome = this.value;
    el('ups-tk-a-excluir').style.display = nome ? 'block' : 'none';
  });

  el('ups-tk-a-excluir').addEventListener('click', async function() {
    var nome = el('ups-tk-as').value;
    if (!nome) { alert('Selecione um preset para excluir.'); return; }
    if (!await confirmarExtensao('Excluir preset "' + nome + '"?')) return;
    chrome.storage.local.get([TIKTOK_EDIT_ATTR_KEY], function(res) {
      var attrs = res[TIKTOK_EDIT_ATTR_KEY] || {};
      delete attrs[nome];
      chrome.storage.local.set({ [TIKTOK_EDIT_ATTR_KEY]: attrs }, function() {
        preencherListaAtributosTikTok();
        mostrarFeedback('Preset excluído.');
      });
    });
  });

  // ===== MULTI-ABA TOGGLE =====
  el('ups-tk-multi-toggle').addEventListener('click', function() {
    var label = el('ups-tk-multi-label');
    if (label.textContent.trim() === 'Paralelo') {
      this.textContent = 'SEQUENCIAL';
      label.textContent = 'Sequencial';
    } else {
      this.textContent = 'PARALELO';
      label.textContent = 'Paralelo';
    }
  });

  // ===== EXECUTE BUTTON =====
  el('ups-tk-executar').addEventListener('click', function() {
    salvarEstadoTikTok();
    var dados = lerEstadoOverlayTikTok();
    el('ups-tiktok-edit-overlay').remove();

    function executar(d) {
      executarTikTokEdit(d).then(function(msg) {
        mostrarFeedback(msg.length > 0 ? '✅ ' + msg.join(' | ') : 'Nada para aplicar', '#28a745');
      });
    }

    if (dados.multiAtivo) {
      chrome.runtime.sendMessage({
        action: 'executar-tiktok-edit-multi',
        dados: dados
      });
    } else if (dados.attrAtivo && el('ups-tk-as').value) {
      chrome.storage.local.get([TIKTOK_EDIT_ATTR_KEY], function(res) {
        var attrs = res[TIKTOK_EDIT_ATTR_KEY] || {};
        dados.attrDados = attrs[el('ups-tk-as').value] || null;
        executar(dados);
      });
    } else {
      executar(dados);
    }
  });

  // ===== CANCEL BUTTON =====
  el('ups-tk-cancelar').addEventListener('click', function() {
    salvarEstadoTikTok();
    var o = document.getElementById('ups-tiktok-edit-overlay');
    if (o) o.remove();
  });

  // ===== INIT =====
  try { preencherListaPresetsTikTok(); } catch(e) {}
  try { preencherListaDescricoesTikTok(); } catch(e) {}
  try { preencherListaAtributosTikTok(); } catch(e) {}
  try { preencherListaMacrosTikTok(); } catch(e) {}
  try { restaurarEstadoTikTok(); } catch(e) {}

  // Auto-carregar descrição da biblioteca compartilhada (Shein/Temu)
  try {
    setTimeout(function() {
      if (!el('ups-tk-desc').value) {
        chrome.storage.local.get(['biblioteca', 'ultimaSelecionada'], function(res) {
          var bib = res.biblioteca || {};
          var nome = res.ultimaSelecionada || '';
          if (nome && bib[nome] && bib[nome].descricao) {
            el('ups-tk-desc').value = bib[nome].descricao;
            mostrarTabelaDescricaoTikTok(bib[nome]);
          } else {
            var nomes = Object.keys(bib);
            for (var i = 0; i < nomes.length; i++) {
              if (bib[nomes[i]] && bib[nomes[i]].descricao) {
                el('ups-tk-desc').value = bib[nomes[i]].descricao;
                mostrarTabelaDescricaoTikTok(bib[nomes[i]]);
                break;
              }
            }
          }
        });
      }
    }, 300);
  } catch(e) {}
}

// ===== MESSAGE ROUTER =====
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'open-tiktok-mass-dialog') {
    abrirDialogTikTokMassa();
    sendResponse({ status: 'opened' });
    return true;
  }
  if (request.action === 'open-tiktok-active-dialog') {
    abrirDialogTikTokMassaActive();
    sendResponse({ status: 'opened' });
    return true;
  }
  if (request.action === 'executar-tiktok-edit') {
    var dados = request.dados || {};
    if (dados.attrAtivo && dados.attrPreset) {
      chrome.storage.local.get([TIKTOK_EDIT_ATTR_KEY], function(res) {
        var attrs = res[TIKTOK_EDIT_ATTR_KEY] || {};
        dados.attrDados = attrs[dados.attrPreset] || null;
        executarTikTokEdit(dados).then(function(msg) {
          sendResponse({ ok: true, msg: msg });
        });
      });
    } else {
      executarTikTokEdit(dados).then(function(msg) {
        sendResponse({ ok: true, msg: msg });
      });
    }
    return true;
  }
  return false;
});
