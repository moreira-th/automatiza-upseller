/*
 * UpSeller Moreira — Mercado Livre Automation
 * Carregado em /pt/products/mercado/edit/ e /pt/products/mercado/up-edit/
 * Depende de: core.js, overlay.js
 */

// ===== COPIAR VARIANTE (Mídia) =====
// Copia as imagens de uma variante para as variantes com o mesmo [Cor].
// O Mercado Livre tem uma SEGUNDA ETAPA: após abrir o dropdown "Copiar Imagem ao"
// e selecionar "Variantes com o mesmo [Cor]", um modal nativo é aberto pedindo
// "Limpar e Substituir Imagens" ou "Adicionar como Novas Imagens".
// A cópia real é feita pelo próprio site (doCopyImg/doCopyImageToOther do Vue).

function copiarVarianteMercado(btnEl) {
  var row = btnEl.closest('.variant_row');
  if (!row) return false;
  var rows = document.querySelectorAll('.variant_row');
  var idx = -1;
  for (var i = 0; i < rows.length; i++) {
    if (rows[i] === row) { idx = i; break; }
  }
  if (idx === -1) return false;
  // Delega ao background para abrir o dropdown e clicar em "Variantes com o mesmo [Cor]"
  // no mundo MAIN (onde o Vue do dropdown está acessível).
  chrome.runtime.sendMessage({ action: 'mercado-copiar-variante', rowIdx: idx });
  return true;
}

function injetarBotaoCopiarVarianteMercado() {
  var variantRows = document.querySelectorAll('.variant_row');
  variantRows.forEach(function(row) {
    if (row.querySelector('.ups-copiar-variante-mercado')) return;
    var header = row.querySelector('.img_title');
    if (!header) return;
    // A primeira metade do header contém "Adicionar Imagens" + "(X/X)".
    // Vamos inserir o botão logo após o contador (X/X), ao lado de "Adicionar Imagens".
    var leftSide = header.children[0];
    if (!leftSide) return;
    var btn = document.createElement('button');
    btn.className = 'ups-copiar-variante-mercado ant-btn ant-btn-link my_ant_btn_primary';
    btn.type = 'button';
    btn.style.cssText = 'margin-left:8px;border:1px solid #d9d9d9;border-radius:4px;vertical-align:middle;';
    btn.innerHTML = '<span>Copiar Variante</span>';
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      copiarVarianteMercado(this);
    });
    leftSide.appendChild(btn);
  });
}

function observarMidiaMercado() {
  var el = document.querySelector('.select_img_main') || document.querySelector('[class*="variant"]');
  if (!el) return;

  var timer = null;
  function schedule() {
    if (timer) return;
    timer = setTimeout(function() { timer = null; injetarBotaoCopiarVarianteMercado(); }, 200);
  }
  new MutationObserver(schedule).observe(el, { childList: true, subtree: true, attributes: false });
  el.addEventListener('scroll', schedule, { passive: true });

  injetarBotaoCopiarVarianteMercado();
  // Polling contínuo (não limitado) para lidar com DynamicScroller e navegação de abas
  setInterval(injetarBotaoCopiarVarianteMercado, 1500);
}

if (window.location.href.includes('/mercado/')) {
  var _mercadoTimer = setInterval(function() {
    var el = document.querySelector('.select_img_main') || document.querySelector('[class*="variant"]');
    if (el) {
      clearInterval(_mercadoTimer);
      observarMidiaMercado();
    }
    // Não limita as tentativas: continua tentando enquanto a página existir
  }, 500);
}
