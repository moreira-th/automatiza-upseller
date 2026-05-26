const listaTamanhos = ["PP", "P", "M", "G", "GG", "EGG", "G1", "G2", "G3", "G4", "G5", "2", "4", "6", "8", "10", "12", "14", "16"];

// --- ABAS ---
function configurarAbas() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.tab-btn, .tab-content').forEach(el => el.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.add('active');
    };
  });
}

// --- FECHAR ---
if (document.getElementById('btnClose')) {
  document.getElementById('btnClose').onclick = () => window.close();
}

// ========== TAB MEDIDAS ==========
function gerarGrid() {
  const tbody = document.getElementById('gridMedidas');
  listaTamanhos.forEach(tam => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><b>${tam}</b></td>
      <td><input type="text" id="${tam.toLowerCase()}_b"></td>
      <td><input type="text" id="${tam.toLowerCase()}_c"></td>
    `;
    tbody.appendChild(row);
  });
}

function atualizarSelect(restaurarUltima = false) {
  chrome.storage.local.get(["biblioteca", "ultimaSelecionada"], (res) => {
    const select = document.getElementById('selectTabelas');
    const biblioteca = res.biblioteca || {};
    select.innerHTML = '<option value="">Carregar salva...</option>';
    for (let nome in biblioteca) {
      if (!Object.keys(biblioteca[nome]).some(k => listaTamanhos.includes(k))) continue;
      let opt = document.createElement('option');
      opt.value = nome;
      opt.innerText = nome;
      select.appendChild(opt);
    }
    if (restaurarUltima && res.ultimaSelecionada && biblioteca[res.ultimaSelecionada]) {
      select.value = res.ultimaSelecionada;
      carregarDados(res.ultimaSelecionada, biblioteca[res.ultimaSelecionada]);
    }
  });
}

function carregarDados(nome, dados) {
  listaTamanhos.forEach(tam => {
    const idB = tam.toLowerCase() + "_b";
    const idC = tam.toLowerCase() + "_c";
    if (document.getElementById(idB)) document.getElementById(idB).value = dados[tam]?.b || "";
    if (document.getElementById(idC)) document.getElementById(idC).value = dados[tam]?.c || "";
  });
  document.getElementById('nomeTabela').value = nome;
  document.getElementById('descTabela').value = dados.descricao || "";
}

document.getElementById('btnSalvar').onclick = () => {
  const nome = document.getElementById('nomeTabela').value.trim();
  const desc = document.getElementById('descTabela').value;
  if (!nome) return alert("Dá um nome para a tabela!");
  const novaTabela = { descricao: desc };
  listaTamanhos.forEach(tam => {
    novaTabela[tam] = {
      b: document.getElementById(tam.toLowerCase() + "_b").value,
      c: document.getElementById(tam.toLowerCase() + "_c").value
    };
  });
  chrome.storage.local.get(["biblioteca"], (res) => {
    const biblioteca = res.biblioteca || {};
    biblioteca[nome] = novaTabela;
    chrome.storage.local.set({ biblioteca, ultimaSelecionada: nome }, () => {
      alert("Tabela salva!");
      atualizarSelect();
    });
  });
};

document.getElementById('selectTabelas').onchange = (e) => {
  const nome = e.target.value;
  if (!nome) return;
  chrome.storage.local.get(["biblioteca"], (res) => {
    carregarDados(nome, res.biblioteca[nome]);
    chrome.storage.local.set({ ultimaSelecionada: nome });
  });
};

document.getElementById('btnExcluir').onclick = () => {
  const nome = document.getElementById('selectTabelas').value;
  if (!nome || !confirm(`Excluir "${nome}"?`)) return;
  chrome.storage.local.get(["biblioteca"], (res) => {
    const biblioteca = res.biblioteca || {};
    delete biblioteca[nome];
    chrome.storage.local.set({ biblioteca, ultimaSelecionada: "" }, () => atualizarSelect());
  });
};

document.getElementById('btnPreencher').onclick = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const dados = {};
  listaTamanhos.forEach(tam => {
    dados[tam] = {
      b: document.getElementById(tam.toLowerCase() + "_b").value,
      c: document.getElementById(tam.toLowerCase() + "_c").value
    };
  });
  chrome.tabs.sendMessage(tab.id, { action: 'fill-size-guide', dados }, () => {
    if (chrome.runtime.lastError) {
      alert('Erro: extensão não carregada nesta página. Recarregue a página.');
    } else {
      setTimeout(() => { window.close(); }, 100);
    }
  });
};

document.addEventListener('keydown', (e) => {
  if (e.altKey && (e.key === 'z' || e.key === 'Z')) {
    e.preventDefault();
    document.getElementById('btnPreencher').click();
  }
  if (e.altKey && (e.key === 'x' || e.key === 'X')) {
    e.preventDefault();
    document.getElementById('btnAplicarTudo').click();
  }
});

var CATEGORIAS_EXPORT = [
  { id: 'Overlay', rotulo: 'Presets do Usuário', desc: 'Presets, última tabela selecionada e estado da overlay', keys: ['bibliotecaPresetsOverlay','ultimaSelecionada','ultimoEstadoMedidas'] },
  { id: 'Medidas', rotulo: 'Medidas e Descrição', desc: 'Tabelas com largura/altura por tamanho', keys: ['biblioteca'] },
  { id: 'PrecoEspecial', rotulo: 'Preço Especial', desc: 'Preços salvos e último preço aplicado', keys: ['bibliotecaPrecos','ultimosPrecos'] },
  { id: 'EditarMassa', rotulo: 'Editar em Massa', desc: 'Macros e último macro executado', keys: ['bibliotecaMacros','ultimosMacros'] },
  { id: 'Atributos', rotulo: 'Atributos', desc: 'Atributos customizados salvos', keys: ['bibliotecaAtributos'] },
  { id: 'LinksRecentes', rotulo: 'Links Recentes', desc: 'Últimos links de imagem usados', keys: ['ultimosLinks'] }
];

function abrirDialogoSelecao(titulo, categorias, textoConfirmar, onConfirmar) {
  var existing = document.getElementById('ups-dlg-sel');
  if (existing) existing.remove();
  var overlay = document.createElement('div');
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

document.getElementById('btnExportar').onclick = function() {
  var allKeys = [];
  CATEGORIAS_EXPORT.forEach(function(c) { allKeys.push.apply(allKeys, c.keys); });
  chrome.storage.local.get(allKeys, function(res) {
    var categorias = CATEGORIAS_EXPORT.map(function(c) { return { id: c.id, rotulo: c.rotulo, desc: c.desc, marcado: true, desabilitado: false }; });
    abrirDialogoSelecao('Exportar Dados', categorias, 'Exportar', function(idsSelecionados) {
      var nomeBase = document.getElementById('nomeTabela').value.trim();
      if (!nomeBase) nomeBase = 'SHEIN_MEDIDAS';
      var hoje = new Date();
      var dia = String(hoje.getDate()).padStart(2, '0');
      var mes = String(hoje.getMonth() + 1).padStart(2, '0');
      var ano = hoje.getFullYear();
      var nomeArquivo = nomeBase + '_' + dia + '-' + mes + '-' + ano + '.json';
      var exportData = {};
      for (var i = 0; i < idsSelecionados.length; i++) {
        var cat = CATEGORIAS_EXPORT.find(function(c) { return c.id === idsSelecionados[i]; });
        if (!cat) continue;
        for (var k = 0; k < cat.keys.length; k++) {
          var key = cat.keys[k];
          exportData[key] = res[key] !== undefined ? res[key] : (key === 'ultimaSelecionada' ? '' : {});
        }
      }
      var jsonString = JSON.stringify(exportData, null, 2);
      var blob = new Blob([jsonString], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      chrome.downloads.download({ url: url, filename: nomeArquivo, saveAs: true });
    });
  });
};

document.getElementById('btnImportar').onclick = function() { document.getElementById('fileInput').click(); };
document.getElementById('fileInput').onchange = function(e) {
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
      if (!algum) { e.target.value = ''; alert('Arquivo não contém dados reconhecidos.'); return; }
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
          e.target.value = '';
          atualizarSelect();
          preencherSelectPresets();
          setTimeout(function() { alert('Backup completo restaurado!'); }, 100);
        });
      });
    } catch (err) {
      console.error('Erro na importação:', err);
      alert('Erro: O arquivo selecionado é inválido ou está corrompido.');
      e.target.value = '';
    }
  };
  reader.onerror = function() { alert('Erro ao ler o arquivo.'); };
  reader.readAsText(arquivo);
};

// ========== TAB REMAPEAMENTO ==========
const stepInfo = document.getElementById('remapStepInfo');
const stepCount = document.getElementById('remapStepCount');
const progressFill = document.getElementById('remapProgressFill');
const btnSingle = document.getElementById('remapBtnSingle');
const btnMulti = document.getElementById('remapBtnMulti');

let running = false;

function setRunning(r, isMulti) {
  running = r;
  btnSingle.disabled = r;
  btnMulti.disabled = r;
  btnSingle.textContent = r && !isMulti ? 'Executando...' : 'Processar Aba Atual';
  btnMulti.textContent = r && isMulti ? 'Executando...' : 'Processar Todas as Abas';
  btnSingle.className = r && !isMulti ? 'btn btn-primary running' : 'btn btn-primary';
  btnMulti.className = r && isMulti ? 'btn btn-secondary running' : 'btn btn-secondary';
}

function updateProgress(data) {
  const pct = data.step && data.total ? Math.round((data.step / data.total) * 100) : 0;
  progressFill.style.width = pct + '%';
  stepInfo.textContent = data.message || '';
  stepCount.textContent = data.step && data.total ? `Passo ${data.step} de ${data.total}` : '';
}

function setSuccess(msg) {
  stepInfo.className = 'step-info success';
  stepInfo.textContent = msg;
  stepCount.textContent = '';
  progressFill.style.width = '100%';
  setRunning(false);
}

function setError(msg) {
  stepInfo.className = 'step-info error';
  stepInfo.textContent = 'Erro: ' + msg;
  stepCount.textContent = '';
  setRunning(false);
}

btnSingle.addEventListener('click', async () => {
  if (running) return;
  setRunning(true, false);
  stepInfo.className = 'step-info';
  stepInfo.textContent = 'Iniciando...';
  stepCount.textContent = '';
  progressFill.style.width = '0%';
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || (!tab.url.includes('app.upseller.com/pt/products/shein/edit/') && !tab.url.includes('app.upseller.com/pt/products/shein/drafts'))) {
    setError('Abra um produto Shein em edição primeiro');
    return;
  }
  chrome.tabs.sendMessage(tab.id, { action: 'start-remap-full' }, (response) => {
    if (chrome.runtime.lastError) {
      setError(chrome.runtime.lastError.message);
    }
  });
});

btnMulti.addEventListener('click', () => {
  if (running) return;
  setRunning(true, true);
  stepInfo.className = 'step-info';
  stepInfo.textContent = 'Buscando abas de edição...';
  stepCount.textContent = '';
  progressFill.style.width = '0%';
  chrome.runtime.sendMessage({ action: 'start-multi' }, (response) => {
    if (chrome.runtime.lastError) {
      setError(chrome.runtime.lastError.message);
    }
  });
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'progress') updateProgress(msg);
  if (msg.action === 'completed') setSuccess('✓ Remapeamento concluído!');
  if (msg.action === 'error') setError(msg.message);
  if (msg.action === 'multi-progress') {
    stepInfo.textContent = msg.message;
    stepCount.textContent = '';
    progressFill.style.width = Math.round((msg.tab / msg.total) * 100) + '%';
  }
  if (msg.action === 'multi-complete') setSuccess(`✓ ${msg.total} produtos processados!`);
  if (msg.action === 'multi-error') setError(msg.message);
});

// ========== TAB PREÇOS ==========
const overrides = {};

function preencherSelectTam() {
  const select = document.getElementById('precoTamSelect');
  select.innerHTML = '<option value="">Tam...</option>';
  listaTamanhos.forEach(tam => {
    const opt = document.createElement('option');
    opt.value = tam;
    opt.textContent = tam;
    select.appendChild(opt);
  });
}

function renderOverrides() {
  const container = document.getElementById('overrideList');
  const keys = Object.keys(overrides);
  if (keys.length === 0) {
    container.innerHTML = '<span style="color:#999;">Nenhum override configurado</span>';
    return;
  }
  container.innerHTML = keys.map(tam =>
    `<div style="display:flex;justify-content:space-between;align-items:center;padding:2px 0;">
       <span><b>${tam}</b> → R$ ${overrides[tam]}</span>
       <span id="removeOverride_${tam}" style="cursor:pointer;color:var(--danger);font-weight:bold;font-size:13px;">×</span>
     </div>`
  ).join('');
  keys.forEach(tam => {
    const el = document.getElementById('removeOverride_' + tam);
    if (el) el.onclick = () => { delete overrides[tam]; renderOverrides(); };
  });
}

document.getElementById('btnAddOverride').onclick = () => {
  const tam = document.getElementById('precoTamSelect').value;
  const val = document.getElementById('precoTamValor').value.trim();
  if (!tam || !val) return;
  overrides[tam] = val;
  document.getElementById('precoTamSelect').value = '';
  document.getElementById('precoTamValor').value = '';
  renderOverrides();
};

function preencherSelectPresets() {
  const select = document.getElementById('precoSelectPreset');
  const nomeAtual = select.value;
  select.innerHTML = '<option value="">Selecionar...</option>';
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
    if (nomeAtual && [...select.options].some(o => o.value === nomeAtual)) {
      select.value = nomeAtual;
    }
    if (select.value) {
      document.getElementById('precoSaveName').value = select.options[select.selectedIndex].textContent.replace(/^[^\s]+\s/, '');
    }
  });
}

function carregarPreset(tipo, nome) {
  if (!tipo || !nome) return;
  chrome.storage.local.get(["biblioteca", "bibliotecaPrecos"], (res) => {
    let dados = null;
    if (tipo === 'bib') {
      dados = (res.biblioteca || {})[nome]?.precos;
    } else {
      dados = (res.bibliotecaPrecos || {})[nome];
    }
    if (!dados) return;
    if (dados.bulkPrice) document.getElementById('precoBulk').value = dados.bulkPrice;
    if (dados.overrides) {
      Object.keys(overrides).forEach(k => delete overrides[k]);
      Object.keys(dados.overrides).forEach(k => { overrides[k] = dados.overrides[k]; });
      renderOverrides();
    }
  });
}

function salvarPreset() {
  const nome = document.getElementById('precoSaveName').value.trim();
  if (!nome) return alert('Dê um nome para salvar');
  const bulkPrice = document.getElementById('precoBulk').value.trim();
  if (!bulkPrice) return alert('Informe o preço em massa primeiro');
  const dados = { bulkPrice, overrides: { ...overrides } };
  chrome.storage.local.get(["biblioteca", "bibliotecaPrecos"], (res) => {
    const bib = res.biblioteca || {};
    const bibPrecos = res.bibliotecaPrecos || {};
    const alvo = bib[nome] ? bib[nome] : null;
    const existing = alvo ? alvo.precos : bibPrecos[nome];
    if (existing) {
      dados.emMassa = existing.emMassa;
      dados.subespecificacao = existing.subespecificacao;
      dados.gerarSku = existing.gerarSku;
    }
    if (bib[nome]) {
      bib[nome].precos = dados;
      chrome.storage.local.set({ biblioteca: bib }, () => {
        preencherSelectPresets();
        alert('Preço salvo em "' + nome + '" (vinculado à tabela)');
      });
    } else {
      bibPrecos[nome] = dados;
      chrome.storage.local.set({ bibliotecaPrecos: bibPrecos }, () => {
        preencherSelectPresets();
        alert('Preço salvo como "' + nome + '" (avulso)');
      });
    }
  });
}

function deletarPreset() {
  const select = document.getElementById('precoSelectPreset');
  const val = select.value;
  if (!val) return;
  const [tipo, ...nomeParts] = val.split(':');
  const nome = nomeParts.join(':');
  if (!confirm('Excluir "' + nome + '"?')) return;
  chrome.storage.local.get(["biblioteca", "bibliotecaPrecos"], (res) => {
    if (tipo === 'bib') {
      const bib = res.biblioteca || {};
      if (bib[nome]) delete bib[nome].precos;
      chrome.storage.local.set({ biblioteca: bib }, preencherSelectPresets);
    } else {
      const bibPrecos = res.bibliotecaPrecos || {};
      delete bibPrecos[nome];
      chrome.storage.local.set({ bibliotecaPrecos: bibPrecos }, preencherSelectPresets);
    }
  });
}

document.getElementById('precoSelectPreset').onchange = (e) => {
  const val = e.target.value;
  if (!val) return;
  const [tipo, ...nomeParts] = val.split(':');
  const nome = nomeParts.join(':');
  document.getElementById('precoSaveName').value = nome;
  carregarPreset(tipo, nome);
};

document.getElementById('btnPrecoSave').onclick = salvarPreset;
document.getElementById('btnPrecoDelete').onclick = deletarPreset;

function salvarUltimosPrecos() {
  const bulkPrice = document.getElementById('precoBulk').value.trim();
  chrome.storage.local.set({
    ultimosPrecos: { bulkPrice, overrides: { ...overrides } }
  });
}

function restaurarUltimosPrecos() {
  chrome.storage.local.get(["ultimosPrecos"], (res) => {
    const saved = res.ultimosPrecos;
    if (!saved) return;
    if (saved.bulkPrice) document.getElementById('precoBulk').value = saved.bulkPrice;
    if (saved.overrides) {
      Object.keys(saved.overrides).forEach(k => { overrides[k] = saved.overrides[k]; });
      renderOverrides();
    }
  });
}

document.getElementById('btnAplicarTudo').onclick = async () => {
  const bulkPrice = document.getElementById('precoBulk').value.trim();
  if (!bulkPrice) return alert('Informe o preço em massa');
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url.includes('app.upseller.com')) {
    return alert('Abra um produto UpSeller primeiro');
  }
  chrome.tabs.sendMessage(tab.id, {
    action: 'set-precos-completos',
    bulkPrice,
    overrides
  }, (resp) => {
    if (chrome.runtime.lastError) { alert('Erro: ' + chrome.runtime.lastError.message); return; }
    if (resp && resp.error) { alert(resp.error); return; }
    salvarUltimosPrecos();
    alert('Preços aplicados!');
    window.close();
  });
};

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', () => {
  gerarGrid();
  configurarAbas();
  atualizarSelect(true);
  preencherSelectTam();
  preencherSelectPresets();
  restaurarUltimosPrecos();
});
