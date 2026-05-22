const listaTamanhos = ["PP", "P", "M", "G", "GG", "G1", "G2", "G3", "G4", "G5", "2", "4", "6", "8", "10", "12", "14", "16"];

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

document.getElementById('btnExportar').onclick = () => {
  chrome.storage.local.get(["biblioteca", "bibliotecaAtributos", "bibliotecaPrecos", "bibliotecaMacros", "ultimosPrecos", "ultimosMacros", "ultimaSelecionada", "ultimoEstadoMedidas", "multiMedidasConfig"], (res) => {
    let nomeBase = document.getElementById('nomeTabela').value.trim();
    if (!nomeBase) nomeBase = "SHEIN_MEDIDAS";
    const hoje = new Date();
    const dia = String(hoje.getDate()).padStart(2, '0');
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const ano = hoje.getFullYear();
    const nomeArquivo = `${nomeBase}_${dia}-${mes}-${ano}.json`;
    const exportData = {
      biblioteca: res.biblioteca || {},
      bibliotecaAtributos: res.bibliotecaAtributos || {},
      bibliotecaPrecos: res.bibliotecaPrecos || {},
      bibliotecaMacros: res.bibliotecaMacros || {},
      ultimosPrecos: res.ultimosPrecos || {},
      ultimosMacros: res.ultimosMacros || {},
      ultimaSelecionada: res.ultimaSelecionada || "",
      ultimoEstadoMedidas: res.ultimoEstadoMedidas || {},
      multiMedidasConfig: res.multiMedidasConfig || {}
    };
    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    chrome.downloads.download({ url, filename: nomeArquivo, saveAs: true });
  });
};

document.getElementById('btnImportar').onclick = () => document.getElementById('fileInput').click();
document.getElementById('fileInput').onchange = (e) => {
  const arquivo = e.target.files[0];
  if (!arquivo) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const dadosRecuperados = JSON.parse(ev.target.result);
      const bib = dadosRecuperados.biblioteca || dadosRecuperados;
      const bibPrecos = dadosRecuperados.bibliotecaPrecos || {};
      const bibMacros = dadosRecuperados.bibliotecaMacros || {};
      const bibAtr = dadosRecuperados.bibliotecaAtributos || {};
      const ultimosPrecos = dadosRecuperados.ultimosPrecos || {};
      const ultimosMacros = dadosRecuperados.ultimosMacros || {};
      const ultimaSelecionada = dadosRecuperados.ultimaSelecionada || "";
      const ultimoEstadoMedidas = dadosRecuperados.ultimoEstadoMedidas || {};
      const multiMedidasConfig = dadosRecuperados.multiMedidasConfig || {};
      // Migrate old biblioteca[nome].atributos → bibliotecaAtributos
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
        ultimosPrecos,
        ultimosMacros,
        ultimaSelecionada,
        ultimoEstadoMedidas,
        multiMedidasConfig
      }, () => {
        e.target.value = "";
        atualizarSelect();
        preencherSelectPresets();
        setTimeout(() => { alert("Backup completo restaurado!"); }, 100);
      });
    } catch (err) {
      console.error("Erro na importação:", err);
      alert("Erro: O arquivo selecionado é inválido ou está corrompido.");
      e.target.value = "";
    }
  };
  reader.onerror = () => { alert("Erro ao ler o arquivo."); };
  reader.readAsText(arquivo);
};

// ========== TAB REMAPEAMENTO ==========
const stepInfo = document.getElementById('remapStepInfo');
const stepCount = document.getElementById('remapStepCount');
const progressFill = document.getElementById('remapProgressFill');
const btnSingle = document.getElementById('remapBtnSingle');
const btnMulti = document.getElementById('remapBtnMulti');

let running = false;
let multiMode = false;

function setRunning(r, isMulti) {
  running = r;
  multiMode = isMulti;
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
  if (!tab || !tab.url.includes('app.upseller.com/pt/products/shein/edit/')) {
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
