/*
 * UpSeller Moreira — Entry Point
 * Inicializa observers/injectors.
 * Módulos carregados na ordem do manifest.json (core → overlay → extras → automacao → entry).
 */

// ========== INITIAL INJECTIONS ==========
setTimeout(function() {
  if (location.href.includes('/tiktok/discount-promotions-edit-product/')) {
    try { injetarBotaoTikTok(); } catch(e) {}
  } else if (location.href.includes('/tiktok/active')) {
    // Button is injected when modal opens via observer
  } else if (location.href.includes('/temu/edit/')) {
    try { injetarBotaoTemu(); } catch(e) {}
    try { initSKUAutoTemu(); } catch(e) {}
  } else if (location.href.includes('/tiktok/edit/')) {
    try { injetarBotaoTikTokEdit(); } catch(e) {}
  } else if (location.href.includes('/shopee/discount-promotions-edit/')) {
    try { injetarBotaoShopeePromocao(); } catch(e) {}
  } else if (location.href.includes('/shopee/edit/')) {
    try { injetarBotaoShopee(); } catch(e) {}
  } else if (!location.href.includes('/tiktok/marketing/') && !location.href.includes('/shopee/') && !location.href.includes('/mercado/')) {
    try { injetarBotaoImagemMassa(); } catch(e) {}
    try { injetarBotaoOverlay(); } catch(e) {}
  }
  try { injetarBotaoSkuNoAnuncio(); } catch(e) {}
}, 3000);

const observer = new MutationObserver(function() {
  if (location.href.includes('/tiktok/discount-promotions-edit-product/')) {
    if (!document.getElementById('ups-tiktok-btn')) {
      setTimeout(function() { try { injetarBotaoTikTok(); } catch(e) {} }, 500);
    }
  } else if (location.href.includes('/tiktok/active')) {
    var modal = document.querySelector('.my_list_discount_price_modal');
    if (modal && !document.getElementById('ups-tiktok-active-btn')) {
      setTimeout(function() { try { injetarBotaoTikTokActive(); } catch(e) {} }, 500);
    } else if (!modal) {
      try { removerBotaoTikTokActive(); } catch(e) {}
    }
  } else if (location.href.includes('/temu/edit/')) {
    if (!document.getElementById('ups-temu-btn')) {
      setTimeout(function() { try { injetarBotaoTemu(); } catch(e) {} }, 500);
    }
    if (!document.getElementById('ups-temu-btn-massa') && document.getElementById('ups-temu-btn')) {
      setTimeout(function() { try { injetarBotaoTemuMassa(document.getElementById('ups-temu-btn')); } catch(e) {} }, 500);
    }
  } else if (location.href.includes('/tiktok/edit/')) {
    if (!document.getElementById('ups-tiktok-edit-btn')) {
      setTimeout(function() { try { injetarBotaoTikTokEdit(); } catch(e) {} }, 500);
    }
  } else if (!location.href.includes('/tiktok/marketing/') && !location.href.includes('/shopee/') && !location.href.includes('/mercado/')) {
    if (!document.getElementById('ups-floating-btn')) {
      setTimeout(function() { try { injetarBotaoOverlay(); } catch(e) {} }, 500);
    }
    if (!document.getElementById('ups-floating-btn-preco')) {
      setTimeout(function() { try { injetarBotaoPrecoEspecial(document.getElementById('ups-floating-btn')); } catch(e) {} }, 500);
    }
  } else if (location.href.includes('/shopee/active')) {
    var saModal = document.querySelector('.ant-modal-wrap');
    if (saModal && !document.getElementById('ups-shopee-active-btn')) {
      setTimeout(function() { try { injetarBotaoShopeeActive(); } catch(e) {} }, 500);
    } else if (!saModal) {
      try { removerBotaoShopeeActive(); } catch(e) {}
    }
  } else if (location.href.includes('/shopee/discount-promotions-edit/')) {
    if (!document.getElementById('ups-shopee-promocao-btn')) {
      setTimeout(function() { try { injetarBotaoShopeePromocao(); } catch(e) {} }, 500);
    }
  } else if (location.href.includes('/shopee/edit/')) {
    if (!document.getElementById('ups-floating-btn-shopee')) {
      setTimeout(function() { try { injetarBotaoShopee(); } catch(e) {} }, 500);
    }
  }
});
observer.observe(document.body, { childList: true, subtree: true });

// ========== DRAFTS SUPPORT ==========
if (window.location.pathname.includes('/shein/drafts')) {
  setTimeout(monitorToolbarDrafts, 2000);
  setTimeout(monitorModalEditarAtributos, 2000);
}

// ========== KEYBOARD SHORTCUTS ==========
document.addEventListener('keydown', function(e) {
  // Ctrl+Shift+S → Publicar
  if (e.ctrlKey && e.shiftKey && (e.key === 's' || e.key === 'S')) {
    e.preventDefault();
    mostrarFeedback('Publicando...', '#4078f2');
    var btn = Array.from(document.querySelectorAll('button')).find(function(b) {
      return b.textContent.trim() === 'Publicar' && !b.disabled;
    });
    if (btn) btn.click();
    return;
  }

  // Ctrl+S → Salvar
  if (e.ctrlKey && (e.key === 's' || e.key === 'S')) {
    e.preventDefault();
    mostrarFeedback('Salvando...', '#28a745');
    var btn = Array.from(document.querySelectorAll('button')).find(function(b) {
      return b.textContent.trim() === 'Salvar' && !b.disabled;
    });
    if (btn) btn.click();
  }
});
