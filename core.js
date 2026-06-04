// ========== ESTADO GLOBAL ==========
let _personalizadasAdicionadas = 0;
var _currentRemapDialog = null;

/*
 * UpSeller Moreira — v1.4.0
 * =========================
 * Automações para UpSeller:
 *   - Remapeamento de Variantes
 *   - Tabela de Medidas + Descrições
 *   - Preços Especiais em Massa
 *   - Recorte de Imagem Quadrada
 *   - Multi-Aba
 *   - Presets de Configuração (Overlay)
 * Feito por Thales Moreira.
 */

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function esperarBotao(texto, timeoutMs) {
  timeoutMs = timeoutMs || 8000;
  var start = Date.now();
  return new Promise(function(resolve) {
    function check() {
      var btn = findButtonByText(texto);
      if (btn && !btn.disabled) { resolve(btn); return; }
      if (Date.now() - start > timeoutMs) { resolve(null); return; }
      setTimeout(check, 200);
    }
    check();
  });
}

function esperarElemento(seletor, timeoutMs) {
  timeoutMs = timeoutMs || 8000;
  var start = Date.now();
  return new Promise(function(resolve) {
    function check() {
      var el = document.querySelector(seletor);
      if (el && el.offsetHeight > 0) { resolve(el); return; }
      if (Date.now() - start > timeoutMs) { resolve(null); return; }
      setTimeout(check, 200);
    }
    check();
  });
}

function esperarBotaoContem(texto, timeoutMs) {
  timeoutMs = timeoutMs || 8000;
  var start = Date.now();
  return new Promise(function(resolve) {
    function check() {
      var buttons = document.querySelectorAll('button');
      for (var i = 0; i < buttons.length; i++) {
        if (buttons[i].textContent.trim().includes(texto) && !buttons[i].disabled) {
resolve(buttons[i]); return;
        }
      }
      if (Date.now() - start > timeoutMs) { resolve(null); return; }
      setTimeout(check, 200);
    }
    check();
  });
}

function nativeClick(el) {
  el.click();
}

function findMainDialog() {
  const all = document.querySelectorAll('.ant-modal-content');
  for (const d of all) {
    if (d.textContent.includes('Passo 2') || d.textContent.includes('Mapear Valores de Variante')) {
      return d;
    }
  }
  return all[0];
}

function findButtonByText(text) {
  const buttons = document.querySelectorAll('button');
  for (const btn of buttons) {
    if (btn.textContent.trim() === text) return btn;
  }
  return null;
}

function findTextContainer(text) {
  const all = document.querySelectorAll('*');
  for (const el of all) {
    if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') continue;
    const trimmed = el.textContent.trim();
    if (!trimmed.includes(text)) continue;
    const children = el.querySelectorAll('*');
    let hasChild = false;
    for (const child of children) {
      if (child !== el && child.textContent.trim().includes(text)) {
        hasChild = true;
        break;
      }
    }
    if (!hasChild) return el;
  }
  return null;
}

function capitalizarTitulo() {
  const btn = document.querySelector('.icon_capital');
  if (btn) btn.click();
}


