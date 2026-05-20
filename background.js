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

chrome.runtime.onInstalled.addListener(atualizarMenus);
chrome.storage.onChanged.addListener((changes) => {
  if (changes.biblioteca || changes.bibliotecaPrecos || changes.ultimaSelecionada || changes.ultimosPrecos) {
    atualizarMenus();
  }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
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
});

// ===== ATALHOS GLOBAIS (chrome://extensions/shortcuts) =====
chrome.commands.onCommand.addListener((command) => {
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
});

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

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
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
          Object.assign({}, saved); // restore state
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
});

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
