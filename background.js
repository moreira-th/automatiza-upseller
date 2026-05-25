// ===== DESCRIÇÃO (injetada no site) =====
function preencherDescricaoNoSite(texto) {
  const textarea = document.querySelector('.ant-form-item-control textarea.ant-input');
  if (textarea && texto) {
    textarea.focus();
    textarea.value = texto;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.dispatchEvent(new Event('change', { bubbles: true }));
    textarea.blur();
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
    chrome.tabs.query({ url: 'https://app.upseller.com/pt/products/shein/edit/*' }, (tabs) => {
      tabQueue = tabs.map(t => t.id);
      if (tabQueue.length === 0) {
        chrome.runtime.sendMessage({ action: 'multi-error', message: 'Nenhuma aba de edição encontrada' });
        return;
      }
      processingTabs = true;
      multiProcessType = 'medidas';
      multiMedidasConfig = msg.config;
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
    });
    return true;
  }

  if (msg.action === 'completed' || msg.action === 'error') {
    if (!processingTabs) {
      chrome.storage.session.get(SESSION_KEY, (res) => {
        const saved = res[SESSION_KEY];
        if (saved && saved.processingTabs) {
          processingTabs = saved.processingTabs;
          tabQueue = saved.tabQueue;
          currentTabIndex = saved.currentTabIndex;
          multiProcessType = saved.multiProcessType;
          multiMedidasConfig = saved.multiMedidasConfig;
          processNextTab();
        }
      });
      return;
    }
    processNextTab();
  }

  if (msg.action === 'cancel-multi') {
    processingTabs = false;
    stopKeepAlive();
    limparEstadoMulti();
    // Abort current tab execution
    if (tabQueue && tabQueue.length > 0 && currentTabIndex < tabQueue.length) {
      chrome.tabs.sendMessage(tabQueue[currentTabIndex], { action: 'abort-macro' }).catch(() => {});
    }
    tabQueue.forEach(tid => {
      chrome.tabs.sendMessage(tid, { action: 'multi-cancelled' }).catch(() => {});
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
    
    // Validate message size
    if (msg.dataUrl && msg.dataUrl.length > 900000) {
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        world: 'MAIN',
        func: () => { var d = document.createElement('div'); d.innerHTML = '<div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.4);z-index:9999999;display:flex;align-items:center;justify-content:center;"><div style="background:#fff;border-radius:10px;padding:24px;width:360px;max-width:90vw;box-shadow:0 8px 32px rgba(0,0,0,0.25);font-family:sans-serif;text-align:center;"><div style="font-size:15px;color:#333;margin-bottom:16px;line-height:1.5;">Arquivo muito grande. Máximo 5MB.</div><button onclick="this.closest(\'[style*=\\"position:fixed\\"]\').remove()" style="padding:8px 24px;border:none;border-radius:6px;cursor:pointer;font-size:13px;background:#4078f2;color:#fff;font-weight:600;">OK</button></div></div>'; document.body.appendChild(d); }
      });
      sendResponse({ error: 'message too large' });
      return true;
    }
    
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      world: 'MAIN',
        func: (dataUrl, fileName, source) => {
        function upsShowDialog(msg) {
          var d = document.createElement('div');
          d.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.4);z-index:9999999;display:flex;align-items:center;justify-content:center;';
          d.innerHTML = '<div style="background:#fff;border-radius:10px;padding:24px;width:360px;max-width:90vw;box-shadow:0 8px 32px rgba(0,0,0,0.25);font-family:sans-serif;text-align:center;">' +
            '<div style="font-size:15px;color:#333;margin-bottom:16px;line-height:1.5;">' + msg + '</div>' +
            '<button id="ups-ok-btn" style="padding:8px 24px;border:none;border-radius:6px;cursor:pointer;font-size:13px;background:#4078f2;color:#fff;font-weight:600;">OK</button></div>';
          d.querySelector('#ups-ok-btn').onclick = function() { d.remove(); };
          document.body.appendChild(d);
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
            upsShowDialog('Erro ao processar imagem: ' + e.message);
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
            if (!mediaTable) { upsShowDialog('Tabela de mídia não encontrada'); return; }
            
            var el = mediaTable;
            var vxeVm = null;
            while (el) {
              if (el.__vue__ && el.__vue__.tableData) { vxeVm = el.__vue__; break; }
              el = el.parentElement;
            }
            if (!vxeVm) { upsShowDialog('Dados da tabela não encontrados'); return; }
            
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

  if (msg.action === 'progress' && processingTabs && tabQueue.length > 0) {
    tabQueue.forEach(tid => {
      chrome.tabs.sendMessage(tid, {
        action: 'update-multi-overlay',
        tab: currentTabIndex + 1,
        total: tabQueue.length,
        message: msg.message
      });
    });
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
    const blob = new Blob([JSON.stringify(msg.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    chrome.downloads.download({ url, filename: msg.filename, saveAs: true });
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
