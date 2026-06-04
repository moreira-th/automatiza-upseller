/*
 * UpSeller Moreira — Entry Point
 * Inicializa observers/injectors.
 * Módulos carregados na ordem do manifest.json (core → overlay → extras → automacao → entry).
 */

// ========== INITIAL INJECTIONS ==========
setTimeout(function() {
  try { injetarBotaoImagemMassa(); } catch(e) {}
  try { injetarBotaoOverlay(); } catch(e) {}
  try { injetarBotaoSkuNoAnuncio(); } catch(e) {}
}, 3000);

const observer = new MutationObserver(function() {
  if (!document.getElementById('ups-floating-btn')) {
    setTimeout(function() { try { injetarBotaoOverlay(); } catch(e) {} }, 500);
  }
  if (!document.getElementById('ups-floating-btn-preco')) {
    setTimeout(function() { try { injetarBotaoPrecoEspecial(document.getElementById('ups-floating-btn')); } catch(e) {} }, 500);
  }
  if (!document.getElementById('ups-gerar-sku-btn')) {
    setTimeout(function() { try { injetarBotaoSkuNoAnuncio(); } catch(e) {} }, 500);
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
