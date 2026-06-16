// ===== DESCRIÇÃO (injetada no site) =====
function preencherDescricaoNoSite(texto) {
  const textarea = document.querySelector('.ant-form-item-control textarea.ant-input');
  if (textarea && texto) {
    textarea.focus();
    var nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    nativeSetter.call(textarea, texto);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.dispatchEvent(new Event('change', { bubbles: true }));
    textarea.blur();
    textarea.scrollTop = 0;
  } else {
    alert("Campo de descrição não encontrado nesta página!");
  }
}

// ===== MENU DE CONTEXTO =====
function atualizarMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.storage.local.get(["biblioteca", "bibliotecaPrecos", "ultimaSelecionada", "ultimosPrecos"], (res) => {
      const biblioteca = res.biblioteca || {};
      const bibPrecos = res.bibliotecaPrecos || {};
      const ativa = res.ultimaSelecionada || "Nenhuma";
      const precos = res.ultimosPrecos;
      const temPrecos = precos && precos.bulkPrice;

      // --- Remapeamento (topo) ---
      chrome.contextMenus.create({
        id: "remapearVariante",
        title: "🔄 Remapeamento - Remapear Variante",
        contexts: ["all"],
        documentUrlPatterns: ["https://*.upseller.com/pt/products/shein/edit/*"]
      });

      // --- Separador ---
      chrome.contextMenus.create({
        id: "separador0",
        type: "separator",
        contexts: ["all"],
        documentUrlPatterns: ["https://*.upseller.com/pt/products/*"]
      });

      // --- Medidas - Preencher + Descrições ---
      chrome.contextMenus.create({
        id: "executarMacroDireito",
        title: "✅ Preencher Medidas",
        contexts: ["all"],
        documentUrlPatterns: ["https://*.upseller.com/pt/products/*"]
      });
      chrome.contextMenus.create({
        id: "separador2",
        type: "separator",
        contexts: ["all"],
        documentUrlPatterns: ["https://*.upseller.com/pt/products/*"]
      });
      for (let nome in biblioteca) {
        if (biblioteca[nome].descricao && biblioteca[nome].descricao.trim() !== "") {
          chrome.contextMenus.create({
            id: "desc_" + nome,
            title: "📏 Descrição: " + nome,
            contexts: ["all"],
            documentUrlPatterns: ["https://*.upseller.com/pt/products/*"]
          });
        }
      }

      // --- Separador ---
      chrome.contextMenus.create({
        id: "separador3",
        type: "separator",
        contexts: ["all"],
        documentUrlPatterns: ["https://*.upseller.com/pt/products/*"]
      });

      // --- Preços: Últimos ---
      chrome.contextMenus.create({
        id: "aplicarPrecos",
        title: temPrecos ? `💰 Preços - Aplicar (R$ ${precos.bulkPrice})` : "💰 Preços - Aplicar Últimos",
        contexts: ["all"],
        documentUrlPatterns: ["https://*.upseller.com/pt/products/*"]
      });

      // --- Preços: Presets por categoria (biblioteca) ---
      for (let nome in biblioteca) {
        if (biblioteca[nome].precos) {
          chrome.contextMenus.create({
            id: "preco_bib_" + nome,
            title: "💰 " + nome + " (R$ " + biblioteca[nome].precos.bulkPrice + ")",
            contexts: ["all"],
            documentUrlPatterns: ["https://*.upseller.com/pt/products/*"]
          });
        }
      }

      // --- Preços: Presets avulsos ---
      for (let nome in bibPrecos) {
        chrome.contextMenus.create({
          id: "preco_avulso_" + nome,
          title: "💰 " + nome + " (R$ " + bibPrecos[nome].bulkPrice + ")",
          contexts: ["all"],
          documentUrlPatterns: ["https://*.upseller.com/pt/products/*"]
        });
      }
    });
  });
}

try { chrome.runtime.onInstalled.addListener(atualizarMenus); } catch (e) {}
try { chrome.storage.onChanged.addListener((changes) => {
  if (changes.biblioteca || changes.bibliotecaPrecos || changes.ultimaSelecionada || changes.ultimosPrecos) {
    atualizarMenus();
  }
}); } catch (e) {}

try { chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "executarMacroDireito") {
    chrome.tabs.sendMessage(tab.id, { action: 'open-medidas-dialog' }, () => {
      if (chrome.runtime.lastError) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => { alert("Erro: extensão não carregada nesta página."); }
        });
      }
    });
  } else if (info.menuItemId.startsWith("desc_")) {
    const nomeTabela = info.menuItemId.replace("desc_", "");
    chrome.storage.local.set({ ultimaSelecionada: nomeTabela }, () => {
      chrome.storage.local.get(["biblioteca"], (res) => {
        const texto = res.biblioteca[nomeTabela]?.descricao;
        if (texto) {
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: preencherDescricaoNoSite,
            args: [texto]
          });
        }
      });
    });
  } else if (info.menuItemId === "remapearVariante") {
    chrome.tabs.sendMessage(tab.id, { action: 'start-remap-full' }, () => {
      if (chrome.runtime.lastError) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => { alert("Erro: extensão não carregada nesta página. Recarregue a página e tente novamente."); }
        });
      }
    });
  } else if (info.menuItemId === "aplicarPrecos") {
    chrome.tabs.sendMessage(tab.id, { action: 'open-precos-dialog' }, () => {
      if (chrome.runtime.lastError) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => { alert("Erro: extensão não carregada nesta página."); }
        });
      }
    });
  } else if (info.menuItemId.startsWith("preco_")) {
    const parts = info.menuItemId.replace("preco_", "").split("_");
    const tipo = parts.shift();
    const nome = parts.join("_");
    chrome.storage.local.get(["biblioteca", "bibliotecaPrecos"], (res) => {
      let dados = null;
      if (tipo === "bib") {
        dados = (res.biblioteca || {})[nome]?.precos;
      } else {
        dados = (res.bibliotecaPrecos || {})[nome];
      }
      if (!dados) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => { alert("Preço \"" + nome + "\" não encontrado."); }
        });
        return;
      }
      chrome.tabs.sendMessage(tab.id, {
        action: 'set-precos-completos',
        bulkPrice: dados.bulkPrice,
        overrides: dados.overrides || {}
      }, (resp) => {
        if (chrome.runtime.lastError) {
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => { alert("Erro: extensão não carregada nesta página."); }
          });
        } else if (resp && resp.error) {
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (msg) => { alert(msg); },
            args: [resp.error]
          });
        } else {
          chrome.storage.local.set({ ultimosPrecos: { bulkPrice: dados.bulkPrice, overrides: dados.overrides || {} } });
        }
      });
    });
  }
}); } catch (e) {}

// ===== ATALHOS GLOBAIS (chrome://extensions/shortcuts) =====
try { chrome.commands.onCommand.addListener((command) => {
  if (command === "executar-macro") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) return;
      chrome.tabs.sendMessage(tabs[0].id, { action: 'open-medidas-dialog' }, () => {
        if (chrome.runtime.lastError) {
          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: () => { alert("Erro: extensão não carregada nesta página."); }
          });
        }
      });
    });
  }
  if (command === "aplicar-precos") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) return;
      chrome.tabs.sendMessage(tabs[0].id, { action: 'open-precos-dialog' }, () => {
        if (chrome.runtime.lastError) {
          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: () => { alert("Erro: extensão não carregada nesta página."); }
          });
        }
      });
    });
  }
}); } catch (e) {}

// ===== REMAPEAMENTO / MEDIDAS MULTI-ABA =====
let processingTabs = false;
let tabQueue = [];
let currentTabIndex = 0;
let multiProcessType = 'remap';
let multiMedidasConfig = null;
let keepAliveInterval = null;

const SESSION_KEY = 'multiTabState';
const SESSION_KEY_PARALLEL = 'multiTabParallel';

// Estado do modo paralelo (cascata)
let cascadeWindows = [];
let originalWindowId = null;
let parallelTotal = 0;
let parallelCompleted = 0;
let tabOriginalIndexes = {};
let baseReturnIndex = null;
let returnedCount = 0;
let draftsAnchorIndex = null;

function salvarEstadoMulti() {
  chrome.storage.session.set({
    [SESSION_KEY]: {
      processingTabs,
      tabQueue,
      currentTabIndex,
      multiProcessType,
      multiMedidasConfig
    }
  }).catch(() => {});
}

function limparEstadoMulti() {
  chrome.storage.session.remove(SESSION_KEY).catch(() => {});
}

try { chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'start-multi') {
    chrome.tabs.query({ url: 'https://app.upseller.com/pt/products/shein/edit/*' }, (tabs) => {
      tabQueue = tabs.map(t => t.id);
      if (tabQueue.length === 0) {
        chrome.runtime.sendMessage({ action: 'multi-error', message: 'Nenhuma aba de edição encontrada' });
        return;
      }
      processingTabs = true;
      multiProcessType = 'remap';
      currentTabIndex = 0;
      salvarEstadoMulti();
      chrome.runtime.sendMessage({
        action: 'multi-progress',
        tab: 0,
        total: tabQueue.length,
        message: `Aba 1 de ${tabQueue.length}`
      });
      processTab(currentTabIndex);
    });
    return true;
  }

  if (msg.action === 'start-multi-medidas') {
    var sourceWindowId = sender.tab ? sender.tab.windowId : null;
    chrome.tabs.query({ url: 'https://app.upseller.com/pt/products/shein/edit/*' }, async (tabs) => {
      tabQueue = tabs.map(t => t.id);
      if (tabQueue.length === 0) {
        chrome.runtime.sendMessage({ action: 'multi-error', message: 'Nenhuma aba de edição encontrada' });
        return;
      }
      multiMedidasConfig = msg.config;
      multiProcessType = 'medidas';
      var modo = msg.config.multiModo || 'cascata';

      if (modo === 'sequencial' || tabQueue.length <= 1) {
        processingTabs = true;
        currentTabIndex = 0;
        salvarEstadoMulti();
        startKeepAlive();
        chrome.runtime.sendMessage({
          action: 'multi-progress',
          tab: 0,
          total: tabQueue.length,
          message: `Aba 1 de ${tabQueue.length}`
        });
        processTabMedidas(currentTabIndex);
      } else {
        try {
          await tileTabs(tabQueue, sourceWindowId);
        } catch (e) {
          chrome.runtime.sendMessage({ action: 'multi-error', message: 'Erro ao distribuir janelas: ' + e.message });
          return;
        }
        processingTabs = true;
        startKeepAlive();
        chrome.runtime.sendMessage({
          action: 'multi-progress',
          tab: 0,
          total: tabQueue.length,
          message: `Paralelo: ${tabQueue.length} abas`
        });
        // Mostrar overlay de progresso em todas as tabs
        tabQueue.forEach(function(tabId, idx) {
          chrome.tabs.sendMessage(tabId, {
            action: 'show-multi-overlay',
            tab: idx + 1,
            total: tabQueue.length
          }, function() { void chrome.runtime.lastError; });
        });
        await sleep(500);
        // Dispara macro em todas as tabs simultaneamente
        tabQueue.forEach(function(tabId) {
          chrome.tabs.sendMessage(tabId, {
            action: 'executar-macro-full',
            config: msg.config
          }, function() { void chrome.runtime.lastError; });
        });
      }
    });
    return true;
  }

  if (msg.action === 'completed' || msg.action === 'error') {
    // Modo paralelo (cascata) — retorna cada tab independentemente
    if (cascadeWindows.length > 0 && parallelTotal > 0) {
      (async function() {
        var tabId = sender.tab ? sender.tab.id : null;
        var tabWinId = sender.tab ? sender.tab.windowId : null;

        if (!processingTabs) {
          chrome.storage.session.get(SESSION_KEY_PARALLEL, async (res) => {
            var p = res[SESSION_KEY_PARALLEL];
            if (p) {
              cascadeWindows = p.cascadeWindows || [];
              originalWindowId = p.originalWindowId;
              tabQueue = p.tabQueue || [];
              tabOriginalIndexes = p.tabOriginalIndexes || {};
              parallelTotal = tabQueue.length;
              parallelCompleted = p.parallelCompleted || 0;
              baseReturnIndex = p.baseReturnIndex;
              returnedCount = p.returnedCount || 0;
              draftsAnchorIndex = p.draftsAnchorIndex;
            }
            await moveCompletedTab(tabId, tabWinId);
          });
          return;
        }

        await moveCompletedTab(tabId, tabWinId);
      })();
      return;
    }

    // Modo sequencial (comportamento atual)
    if (!processingTabs) {
      chrome.storage.session.get(SESSION_KEY, (res) => {
        var saved = res[SESSION_KEY];
        if (saved && saved.processingTabs && tabQueue && tabQueue.includes(sender.tab.id)) {
          processingTabs = saved.processingTabs;
          tabQueue = saved.tabQueue;
          currentTabIndex = saved.currentTabIndex;
          multiProcessType = saved.multiProcessType;
          multiMedidasConfig = saved.multiMedidasConfig;
          processNextTab();
        } else if (saved && saved.processingTabs) {
          chrome.storage.session.remove(SESSION_KEY);
        }
      });
      return;
    }
    if (tabQueue && tabQueue.includes(sender.tab.id)) {
      processNextTab();
    }
  }

  if (msg.action === 'cores-confirmed') {
    if (cascadeWindows.length > 1) {
      chrome.tabs.get(sender.tab.id).then(function(tab) {
        var idx = cascadeWindows.lastIndexOf(tab.windowId);
        if (idx >= 0 && idx + 1 < cascadeWindows.length) {
          chrome.windows.update(cascadeWindows[idx + 1], { focused: true });
        }
      }).catch(function() { /* tab/window gone */ });
    }
  }

  if (msg.action === 'cancel-multi') {
    processingTabs = false;
    stopKeepAlive();
    limparEstadoMulti();
    // Modo paralelo: cancelar todas as tabs e reagrupar
    if (cascadeWindows.length > 0) {
      tabQueue.forEach(function(tid) {
        chrome.tabs.sendMessage(tid, { action: 'abort-macro' }).catch(function() {});
      });
      gatherTabs().then(function() {
        chrome.storage.session.remove(SESSION_KEY_PARALLEL, function() {});
      });
      cascadeWindows = [];
      parallelTotal = 0;
      parallelCompleted = 0;
      tabOriginalIndexes = {};
      baseReturnIndex = null;
      returnedCount = 0;
      draftsAnchorIndex = null;
      tabQueue = [];
      chrome.runtime.sendMessage({ action: 'multi-cancelled' });
      sendResponse({ status: 'cancelled' });
      return true;
    }
    // Abort current tab execution (sequencial)
    if (tabQueue && tabQueue.length > 0 && currentTabIndex < tabQueue.length) {
      chrome.tabs.sendMessage(tabQueue[currentTabIndex], { action: 'abort-macro' }).catch(function() {});
    }
    tabQueue.forEach(function(tid) {
      chrome.tabs.sendMessage(tid, { action: 'multi-cancelled' }).catch(function() {});
    });
    tabQueue = [];
    chrome.runtime.sendMessage({ action: 'multi-cancelled', total: currentTabIndex });
    sendResponse({ status: 'cancelled' });
    return true;
  }

  if (msg.action === 'ups-mass-upload') {
    // Inject upload code into page's MAIN world (bypass CSP & isolated world)
    const tabId = sender.tab ? sender.tab.id : null;
    if (!tabId) { sendResponse({ error: 'no tab' }); return true; }
    
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      world: 'MAIN',
        func: (dataUrl, fileName, source) => {
        function upsShowDialog(msg, isError) {
          var d = document.createElement('div');
          d.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:9999999;background:' + (isError ? '#dc3545' : '#28a745') + ';color:#fff;padding:12px 20px;border-radius:6px;font-size:14px;font-family:sans-serif;box-shadow:0 2px 10px rgba(0,0,0,0.3);max-width:400px;text-align:center;';
          d.textContent = msg;
          document.body.appendChild(d);
          setTimeout(function() { d.remove(); }, 2000);
        }
        async function doUpload() {
          const ext = (fileName || 'imagem.png').split('.').pop().replace(/[^a-z0-9]/gi, '') || 'png';
          var file;
          try {
            var resp = await fetch(dataUrl);
            if (!resp.ok) throw new Error('Falha ao processar arquivo: HTTP ' + resp.status);
            var blob = await resp.blob();
            file = new File([blob], fileName, { type: blob.type || 'image/png' });
          } catch(e) {
            upsShowDialog('Erro ao processar imagem: ' + e.message, true);
            return;
          }
          try {
            var signResp = await fetch('https://app.upseller.com/api/media/file/upload/generate-sign', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ module: 'product', spaceCode: 'ListingImage', fileName: fileName, suffix: '.' + ext })
            });
            var signData = await signResp.json();
            if (signData.code !== 0) throw new Error(signData.msg || 'generate-sign error');
            var cdnUrl = signData.data.url;
            
            var uploadResp = await fetch(signData.data.sign, {
              method: 'PUT',
              headers: { 'Content-Type': file.type || 'image/png' },
              body: file
            });
            if (!uploadResp.ok) throw new Error('upload CDN: HTTP ' + uploadResp.status);
            
            var cbResp = await fetch('https://app.upseller.com/api/media/file/upload/callback', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ fileKey: signData.data.fileKey, size: file.size, suffix: '.' + ext })
            });
            var cbData = await cbResp.json();
            if (cbData.code !== 0) throw new Error(cbData.msg || 'callback error');
            
            // Find vxe-table and push
            var tables = document.querySelectorAll('table.vxe-table--body');
            var mediaTable = null;
            for (var i = 0; i < tables.length; i++) {
              if (tables[i].querySelector('.anticon-plus')) { mediaTable = tables[i]; break; }
            }
            if (!mediaTable) { upsShowDialog('Tabela de mídia não encontrada', true); return; }
            
            var el = mediaTable;
            var vxeVm = null;
            while (el) {
              if (el.__vue__ && el.__vue__.tableData) { vxeVm = el.__vue__; break; }
              el = el.parentElement;
            }
            if (!vxeVm) { upsShowDialog('Dados da tabela não encontrados', true); return; }
            
            var tableData = vxeVm.tableData;
            var concluidas = 0;
            for (var j = 0; j < tableData.length; j++) {
              var row = tableData[j];
              if (!row.detailsImgs || !Array.isArray(row.detailsImgs)) continue;
              var maxSort = 0;
              for (var s = 0; s < row.detailsImgs.length; s++) {
                if (row.detailsImgs[s].sort > maxSort) maxSort = row.detailsImgs[s].sort;
              }
              row.detailsImgs.splice(row.detailsImgs.length, 0, {
                imageItemId: null, groupCode: null,
                imageUrl: cdnUrl, imageMediumUrl: cdnUrl, imageSmallUrl: cdnUrl,
                sort: maxSort + 1,
                imageType: 'DETAIL', url: cdnUrl,
                imgInfo: { width: 800, height: 800 }
              });
              concluidas++;
            }
            vxeVm.$forceUpdate();
            upsShowDialog('Imagem adicionada em ' + tableData.length + ' cores');
            document.body.dispatchEvent(new CustomEvent('ups-upload-done', { detail: { url: cdnUrl, source: source } }));
          } catch(e) {
            upsShowDialog('Upload falhou: ' + e.message);
          }
        }
        doUpload();
      },
      args: [msg.dataUrl, msg.fileName, msg.source || 'file']
    }).catch(err => {
      console.error('ups-mass-upload injection error:', err);
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        world: 'MAIN',
        func: (errMsg) => { var d = document.createElement('div'); d.innerHTML = '<div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.4);z-index:9999999;display:flex;align-items:center;justify-content:center;"><div style="background:#fff;border-radius:10px;padding:24px;width:360px;max-width:90vw;box-shadow:0 8px 32px rgba(0,0,0,0.25);font-family:sans-serif;text-align:center;"><div style="font-size:15px;color:#333;margin-bottom:16px;line-height:1.5;">' + errMsg + '</div><button onclick="this.closest(\'[style*=\\"position:fixed\\"]\').remove()" style="padding:8px 24px;border:none;border-radius:6px;cursor:pointer;font-size:13px;background:#4078f2;color:#fff;font-weight:600;">OK</button></div></div>'; document.body.appendChild(d); },
        args: [err.message]
      });
    });
    
    sendResponse({ status: 'injected' });
    return true;
  }
  
  if (msg.action === 'download-image') {
    fetch(msg.url)
      .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.blob(); })
      .then(blob => {
        const reader = new FileReader();
        reader.onload = () => sendResponse({ dataUrl: reader.result });
        reader.onerror = () => sendResponse({ error: 'Failed to read blob' });
        reader.readAsDataURL(blob);
      })
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }

  if (msg.action === 'progress' && processingTabs && tabQueue.length > 0) {
    if (cascadeWindows.length > 0) {
      tabQueue.forEach(function(tid) {
        chrome.tabs.sendMessage(tid, { action: 'update-multi-overlay', message: msg.message });
      });
    } else {
      tabQueue.forEach(function(tid) {
        chrome.tabs.sendMessage(tid, {
          action: 'update-multi-overlay',
          tab: currentTabIndex + 1,
          total: tabQueue.length,
          message: msg.message
        });
      });
    }
  }

  if (msg.type === 'ups-click-main') {
    const tabId = sender.tab ? sender.tab.id : null;
    if (tabId && msg.selector) {
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        world: 'MAIN',
        func: (sel) => {
          var el = document.querySelector(sel);
          if (el) { el.removeAttribute('data-ups'); el.click(); }
        },
        args: [msg.selector]
      }).catch(function(){ });
    }
    return false;
  }

  if (msg.type === 'ups-hover-main') {
    const tabId = sender.tab ? sender.tab.id : null;
    if (tabId && msg.selector) {
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        world: 'MAIN',
        func: (sel) => {
          var el = document.querySelector(sel);
          if (el) {
            el.removeAttribute('data-ups-h');
            el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, cancelable: true }));
            el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, cancelable: true }));
          }
        },
        args: [msg.selector]
      }).catch(function(){ });
    }
    return false;
  }

  if (msg.type === 'ups-cores-main') {
    const tabId = sender.tab ? sender.tab.id : null;
    if (tabId) {
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        world: 'MAIN',
        func: () => {
          var tables = document.querySelectorAll('table.vxe-table--body');
          var vxeVm = null;
          for (var i = 0; i < tables.length; i++) {
            if (tables[i].querySelector('.anticon-plus')) {
              var el = tables[i];
              while (el) {
                if (el.__vue__ && el.__vue__.tableData) { vxeVm = el.__vue__; break; }
                el = el.parentElement;
              }
              break;
            }
          }
          if (!vxeVm) { window.dispatchEvent(new CustomEvent('ups-cores-done', { detail: { error: 'vxeVm nao encontrado' } })); return; }
          
          var rows = vxeVm.tableData;
          var cores = 0;
          for (var i = 0; i < rows.length; i++) {
            var row = rows[i];
            if (!row.detailsImgs || row.detailsImgs.length === 0) continue;
            var capa = row.detailsImgs[0];
            
            // Imagem de Cores
            var pieceImg = row.pieceImg;
            pieceImg.imageUrl = capa.imageUrl;
            pieceImg.url = capa.url || capa.imageUrl;
            if (capa.imgInfo) pieceImg.imgInfo = capa.imgInfo;
            
            // Imagem Quadrada
            var squareImg = row.squareImg;
            squareImg.imageUrl = capa.imageUrl;
            squareImg.url = capa.url || capa.imageUrl;
            if (capa.imgInfo) squareImg.imgInfo = capa.imgInfo;
            
            cores++;
          }
          window.dispatchEvent(new CustomEvent('ups-cores-done', { detail: { count: cores } }));
        }
      }).catch(function(e){ console.error('ups:cores error', e); });
    }
    return false;
  }

  if (msg.action === 'export-data') {
    try {
      const jsonStr = JSON.stringify(msg.data, null, 2);
      // Usar FileReader + data URL ao invés de URL.createObjectURL
      const reader = new FileReader();
      reader.onload = function() {
        chrome.downloads.download({ url: reader.result, filename: msg.filename, saveAs: true }, (id) => {
          if (chrome.runtime.lastError) console.error('[BG] download error:', chrome.runtime.lastError.message);
          else console.log('[BG] download id:', id);
        });
      };
      reader.onerror = function(e) { console.error('[BG] FileReader error:', e); };
      reader.readAsDataURL(new Blob([jsonStr], { type: 'application/json' }));
    } catch(e) { console.error('[BG] export error:', e); }
  }
}); } catch (e) {}

function startKeepAlive() {
  if (keepAliveInterval) clearInterval(keepAliveInterval);
  keepAliveInterval = setInterval(() => {
    chrome.storage.local.get(null, () => {});
  }, 20000);
}

function stopKeepAlive() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }
}

function processTab(index) {
  const tabId = tabQueue[index];
  chrome.tabs.update(tabId, { active: true }, () => {
    setTimeout(() => {
      chrome.tabs.sendMessage(tabId, {
        action: 'show-multi-overlay',
        tab: index + 1,
        total: tabQueue.length
      });
      setTimeout(() => {
        chrome.tabs.sendMessage(tabId, { action: 'start-remap-full' }, (response) => {
          if (chrome.runtime.lastError) {
            chrome.runtime.sendMessage({
              action: 'multi-error',
              message: `Aba ${index + 1}: ${chrome.runtime.lastError.message}`
            });
            processNextTab();
          }
        });
      }, 500);
    }, 1500);
  });
}

function processTabMedidas(index) {
  const tabId = tabQueue[index];
  chrome.tabs.update(tabId, { active: true }, () => {
    setTimeout(() => {
      chrome.tabs.sendMessage(tabId, {
        action: 'show-multi-overlay',
        tab: index + 1,
        total: tabQueue.length
      });
      setTimeout(() => {
        chrome.tabs.sendMessage(tabId, {
          action: 'executar-macro-full',
          config: multiMedidasConfig
        }, (response) => {
          if (chrome.runtime.lastError) {
            chrome.runtime.sendMessage({
              action: 'multi-error',
              message: `Aba ${index + 1}: ${chrome.runtime.lastError.message}`
            });
            processNextTab();
          }
        });
      }, 500);
    }, 1500);
  });
}

function processNextTab() {
  currentTabIndex++;
  if (currentTabIndex >= tabQueue.length) {
    processingTabs = false;
    limparEstadoMulti();
    chrome.runtime.sendMessage({ action: 'multi-complete', total: tabQueue.length });
    hideOverlayAllTabs(tabQueue.length);
  } else {
    salvarEstadoMulti();
    chrome.runtime.sendMessage({
      action: 'multi-progress',
      tab: currentTabIndex,
      total: tabQueue.length,
      message: `Aba ${currentTabIndex + 1} de ${tabQueue.length}`
    });
    if (multiProcessType === 'medidas') {
      processTabMedidas(currentTabIndex);
    } else {
      processTab(currentTabIndex);
    }
  }
}

function hideOverlayAllTabs(total) {
  tabQueue.forEach(tid => {
    chrome.tabs.sendMessage(tid, { action: 'hide-multi-overlay', total }, () => {
      if (chrome.runtime.lastError) {
        chrome.scripting.executeScript({
          target: { tabId: tid },
          func: () => {
            const el = document.getElementById('upseller-multi-overlay');
            if (el) el.remove();
          }
        }).catch(() => {});
      }
    });
  });
}

// ===== TILE / PARALELO =====

function sleep(ms) {
  return new Promise(function(resolve) { setTimeout(resolve, ms); });
}

async function moveCompletedTab(tabId, tabWinId) {
  if (!tabId) return;

  if (tabWinId && tabWinId !== originalWindowId) {
    var targetIdx = baseReturnIndex + returnedCount;
    try {
      await chrome.tabs.move(tabId, { windowId: originalWindowId, index: targetIdx });
    } catch (e) { /* skip */ }
  }
  returnedCount++;
  parallelCompleted++;

  // Focus next pending window (skip original window and completed ones)
  if (parallelCompleted < parallelTotal) {
    for (var wi = 0; wi < cascadeWindows.length; wi++) {
      if (cascadeWindows[wi] === originalWindowId || cascadeWindows[wi] === tabWinId) continue;
      try {
        var wTabs = await chrome.tabs.query({ windowId: cascadeWindows[wi] });
        if (wTabs.length > 0) {
          chrome.windows.update(cascadeWindows[wi], { focused: true });
          break;
        }
      } catch (e) { /* skip */ }
    }
  }

  var stateUpdate = {};
  stateUpdate[SESSION_KEY_PARALLEL] = {
    cascadeWindows: cascadeWindows, originalWindowId: originalWindowId,
    tabQueue: tabQueue, tabOriginalIndexes: tabOriginalIndexes,
    baseReturnIndex: baseReturnIndex, returnedCount: returnedCount,
    parallelCompleted: parallelCompleted, draftsAnchorIndex: draftsAnchorIndex
  };
  chrome.storage.session.set(stateUpdate, function() {});

  if (parallelCompleted >= parallelTotal) {
    await cleanupParallel();
  }
}

async function cleanupParallel() {
  for (var ci = 0; ci < cascadeWindows.length; ci++) {
    if (cascadeWindows[ci] === originalWindowId) continue;
    try {
      var remaining = await chrome.tabs.query({ windowId: cascadeWindows[ci] });
      if (remaining.length === 0) await chrome.windows.remove(cascadeWindows[ci]);
    } catch (e) { /* ignore */ }
  }
  try {
    await chrome.windows.update(originalWindowId, { state: 'maximized' });
  } catch (e) { /* ignore */ }

  stopKeepAlive();
  chrome.storage.session.remove(SESSION_KEY_PARALLEL, function() {});
  chrome.runtime.sendMessage({ action: 'multi-complete', total: parallelTotal });
  hideOverlayAllTabs(parallelTotal);

  cascadeWindows = [];
  parallelTotal = 0;
  parallelCompleted = 0;
  originalWindowId = null;
  tabOriginalIndexes = {};
  baseReturnIndex = null;
  returnedCount = 0;
  draftsAnchorIndex = null;
}

async function tileTabs(tabIds, sourceWindowId) {
  var displays = await chrome.system.display.getInfo();
  var display = displays.find(function(d) { return d.isPrimary; }) || displays[0];
  var baseLeft = display.workArea.left;
  var baseTop = display.workArea.top;
  var CASCADE_OFFSET = 40;
  var WIDTH = 1024;
  var HEIGHT = 600;

  originalWindowId = sourceWindowId;
  if (!originalWindowId) {
    var currentWin = await chrome.windows.getLastFocused();
    originalWindowId = currentWin.id;
  }
  cascadeWindows = [];
  parallelTotal = tabIds.length;
  parallelCompleted = 0;
  baseReturnIndex = null;
  returnedCount = 0;
  draftsAnchorIndex = null;

  var allCurrentTabs = await chrome.tabs.query({ windowId: originalWindowId });
  for (var ai = 0; ai < allCurrentTabs.length; ai++) {
    if (allCurrentTabs[ai].url && allCurrentTabs[ai].url.indexOf('/pt/products/shein/drafts') !== -1) {
      draftsAnchorIndex = allCurrentTabs[ai].index;
      baseReturnIndex = draftsAnchorIndex + 1;
      break;
    }
  }
  if (baseReturnIndex === null) baseReturnIndex = 0;

  tabOriginalIndexes = {};
  for (var aj = 0; aj < allCurrentTabs.length; aj++) {
    if (tabIds.includes(allCurrentTabs[aj].id)) {
      tabOriginalIndexes[allCurrentTabs[aj].id] = allCurrentTabs[aj].index;
    }
  }

  var state = { cascadeWindows: [], originalWindowId: originalWindowId, tabQueue: tabIds, tabOriginalIndexes: tabOriginalIndexes, baseReturnIndex: baseReturnIndex, returnedCount: 0, parallelCompleted: 0, draftsAnchorIndex: draftsAnchorIndex };

  for (var i = 0; i < tabIds.length; i++) {
    var left = baseLeft + CASCADE_OFFSET * i;
    var top = baseTop + CASCADE_OFFSET * i;

    if (i === 0) {
      await chrome.windows.update(originalWindowId, { state: 'normal' });
      await chrome.windows.update(originalWindowId, { left: left, top: top, width: WIDTH, height: HEIGHT });
      cascadeWindows.push(originalWindowId);
    } else {
      var win = await chrome.windows.create({
        tabId: tabIds[i],
        left: left, top: top,
        width: WIDTH, height: HEIGHT,
        focused: false
      });
      cascadeWindows.push(win.id);
      await sleep(200);
    }

    chrome.tabs.update(tabIds[i], { autoDiscardable: false }).catch(function() {});
  }

  state.cascadeWindows = cascadeWindows;
  var storageObj = {};
  storageObj[SESSION_KEY_PARALLEL] = state;
  chrome.storage.session.set(storageObj, function() {});
}

async function gatherTabs() {
  var allTabs = [];
  for (var wi = 0; wi < cascadeWindows.length; wi++) {
    try {
      var tabs = await chrome.tabs.query({ windowId: cascadeWindows[wi] });
      allTabs.push.apply(allTabs, tabs.filter(function(t) { return tabQueue.includes(t.id); }));
    } catch (e) { /* window gone */ }
  }

  for (var ti = 0; ti < allTabs.length; ti++) {
    if (allTabs[ti].windowId === originalWindowId) continue;
    try {
      var savedIdx = tabOriginalIndexes[allTabs[ti].id];
      await chrome.tabs.move(allTabs[ti].id, { windowId: originalWindowId, index: savedIdx !== undefined ? savedIdx : -1 });
    } catch (e) { /* skip */ }
  }

  for (var ci = 0; ci < cascadeWindows.length; ci++) {
    if (cascadeWindows[ci] === originalWindowId) continue;
    try {
      var remaining = await chrome.tabs.query({ windowId: cascadeWindows[ci] });
      if (remaining.length === 0) await chrome.windows.remove(cascadeWindows[ci]);
    } catch (e) { /* ignore */ }
  }

  try {
    await chrome.windows.update(originalWindowId, { state: 'maximized' });
  } catch (e) { /* ignore */ }

  cascadeWindows = [];
  parallelTotal = 0;
  parallelCompleted = 0;
  originalWindowId = null;
  tabOriginalIndexes = {};
  baseReturnIndex = null;
  returnedCount = 0;
  draftsAnchorIndex = null;
}

function broadcastToAll(message) {
  tabQueue.forEach(function(tid) {
    chrome.tabs.sendMessage(tid, message).catch(function() {});
  });
}
