chrome.action.onClicked.addListener((tab) => {
  const url = tab.url || '';
  if (!url.includes('temu.com') && !url.includes('shein.com')) return;
  chrome.tabs.sendMessage(tab.id, { action: 'triggerCopiar' }).catch(() => {});
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'enviarParaRevisao') {
    const dados = msg.data;
    const info = dados.info || {};
    const allImages = dados.allImages || [];

    const variacoes = allImages.map(function(d) {
      const v = d.variant || {};
      return {
        cor: (v.label || '').replace(/[\[\]【】]/g, '').trim(),
        subcor: '',
        imagens: (d.images || []).map(function(url) {
          return url.replace(/\.webp(\?|$)/gi, '.jpg$1');
        })
      };
    });

    const anuncio = {
      id: 'ext_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
      idDoAnuncio: info.itemId || '',
      nome: info.title || '',
      descricao: '',
      skuPrincipal: info.itemId || '',
      categoria: '',
      palavraChave: '',
      origem: dados.site === 'shein' ? 'shein' : 'shein',
      _site: dados.site || 'shein',
      variacoes: variacoes,
      selecionado: false,
      dataImportacao: new Date().toISOString().split('T')[0]
    };

    function injetar(tabId) {
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: function(json) {
          var anuncio = JSON.parse(json);
          window.postMessage({ __lc_import: true, anuncio: anuncio }, '*');
        },
        args: [JSON.stringify(anuncio)]
      }, function() {
        if (chrome.runtime.lastError) {
          console.error('[LC BG] Erro:', chrome.runtime.lastError.message);
        }
      });
    }

    function injetarQuandoPronto(tabId) {
      chrome.tabs.get(tabId, function(tab) {
        if (chrome.runtime.lastError) return;
        if (tab.status === 'complete') {
          injetar(tabId);
        } else {
          function listener(id, info) {
            if (id === tabId && info.status === 'complete') {
              chrome.tabs.onUpdated.removeListener(listener);
              injetar(tabId);
            }
          }
          chrome.tabs.onUpdated.addListener(listener);
        }
      });
    }

    chrome.tabs.query({ url: 'http://localhost:3000/*' }, function(tabs) {
      if (tabs && tabs.length > 0) {
        var aba = tabs[0];
        var urlAtual = aba.url || '';
        if (urlAtual.includes('/anuncios')) {
          injetar(aba.id);
        } else {
          function listener(id, info) {
            if (id === aba.id && info.status === 'complete') {
              chrome.tabs.onUpdated.removeListener(listener);
              injetar(aba.id);
            }
          }
          chrome.tabs.onUpdated.addListener(listener);
          chrome.tabs.update(aba.id, { url: 'http://localhost:3000/anuncios' });
        }
      } else {
        chrome.tabs.create({ url: 'http://localhost:3000/anuncios', active: false }, function(tab) {
          injetarQuandoPronto(tab.id);
        });
      }
      sendResponse({ ok: true });
    });

    return true;
  }
});

chrome.commands.onCommand.addListener((command) => {
  if (command === 'copy-listing') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || !tabs[0]) return;
      const tab = tabs[0];
      const url = tab.url || '';
      if (!url.includes('temu.com') && !url.includes('shein.com')) return;
      chrome.tabs.sendMessage(tab.id, { action: 'triggerCopiar' }).catch(() => {});
    });
  }
});
