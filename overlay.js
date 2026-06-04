// ========== OVERLAY ==========
function criarOverlayProgresso() {
  const existing = document.getElementById('upseller-progress-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'upseller-progress-overlay';
  overlay.innerHTML = `
<div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:999999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;font-family:sans-serif;">
  <div style="font-size:36px;">⚙️</div>
  <div style="font-size:16px;font-weight:bold;color:#fff;">Executando Macro</div>
  <div id="upp-step" style="font-size:13px;color:#ccc;text-align:center;padding:0 30px;"></div>
  <div style="width:260px;height:5px;background:rgba(255,255,255,0.15);border-radius:3px;overflow:hidden;margin-top:4px;">
    <div id="upp-bar" style="height:100%;width:0%;background:#4CAF50;border-radius:3px;transition:width 0.3s;"></div>
 </div>
  <div id="upp-ctr" style="font-size:11px;color:#aaa;"></div>
  <button id="upp-cancel" style="margin-top:8px;padding:8px 24px;background:#dc3545;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:bold;font-size:14px;">⏹ Cancelar</button>
</div>`;
  document.body.appendChild(overlay);

  document.getElementById('upp-cancel').onclick = () => {
    window.__upsCancelMacro = true;
    const btn = document.getElementById('upp-cancel');
    if (btn) { btn.textContent = 'Cancelando...'; btn.disabled = true; btn.style.opacity = '0.6'; }
  };
}
function atualizarOverlayProgresso(dados) {
  const stepEl = document.getElementById('upp-step');
  const barEl = document.getElementById('upp-bar');
  const ctrEl = document.getElementById('upp-ctr');
  if (dados.message && stepEl) stepEl.textContent = dados.message;
  if (dados.step !== undefined && dados.total !== undefined && barEl) {
    barEl.style.width = (dados.step / dados.total * 100) + '%';
  }
  if (dados.step !== undefined && dados.total !== undefined && ctrEl) {
    ctrEl.textContent = 'Passo ' + dados.step + ' de ' + dados.total;
  }
}
function mostrarErroOverlayProgresso(msg) {
  const stepEl = document.getElementById('upp-step');
  const barEl = document.getElementById('upp-bar');
  const ctrEl = document.getElementById('upp-ctr');
  const cancelBtn = document.getElementById('upp-cancel');
  if (stepEl) { stepEl.textContent = msg; stepEl.style.color = '#ff6b6b'; }
  if (barEl) barEl.style.background = '#ff6b6b';
  if (ctrEl) ctrEl.textContent = '';
  if (cancelBtn) cancelBtn.style.display = 'none';
}
function removerOverlayProgresso() {
  const el = document.getElementById('upseller-progress-overlay');
  if (el) {
    const inner = el.querySelector('div');
    if (inner) { inner.style.transition = 'opacity 0.4s'; inner.style.opacity = '0'; }
    setTimeout(() => el.remove(), 400);
  }
}
function criarOverlayMulti(tab, total) {
  const existing = document.getElementById('upseller-multi-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'upseller-multi-overlay';
  overlay.innerHTML = `
<div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:999999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;font-family:sans-serif;">
  <div style="font-size:36px;pointer-events:none;">🔄</div>
  <div style="font-size:16px;font-weight:bold;color:#fff;pointer-events:none;">Remapeamento Multi-Aba</div>
  <div id="umo-tab" style="font-size:13px;color:#ccc;pointer-events:none;"></div>
  <div id="umo-step" style="font-size:12px;color:#888;text-align:center;padding:0 30px;pointer-events:none;"></div>
  <div style="width:260px;height:5px;background:rgba(255,255,255,0.15);border-radius:3px;overflow:hidden;margin-top:4px;pointer-events:none;">
    <div id="umo-bar" style="height:100%;width:0%;background:#4CAF50;border-radius:3px;transition:width 0.3s;"></div>
 </div>
  <div id="umo-pct" style="font-size:11px;color:#666;pointer-events:none;"></div>
  <button id="umo-cancel" style="margin-top:8px;padding:8px 24px;background:#dc3545;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:bold;font-size:14px;pointer-events:auto;">⏹ Cancelar</button>
</div>`;
  document.body.appendChild(overlay);
  document.getElementById('umo-tab').textContent = `Aba ${tab} de ${total}`;
  document.getElementById('umo-cancel').onclick = () => {
    chrome.runtime.sendMessage({ action: 'cancel-multi' });
  };
}
function atualizarOverlayMulti(dados) {
  const tabEl = document.getElementById('umo-tab');
  const stepEl = document.getElementById('umo-step');
  const barEl = document.getElementById('umo-bar');
  const pctEl = document.getElementById('umo-pct');
  if (dados.tab !== undefined && tabEl) tabEl.textContent = `Aba ${dados.tab} de ${dados.total}`;
  if (dados.message && stepEl) stepEl.textContent = dados.message;
  if (dados.pct !== undefined && barEl) barEl.style.width = dados.pct + '%';
  if (dados.pct !== undefined && pctEl) pctEl.textContent = dados.pct + '%';
}
function removerOverlayMulti() {
  const el = document.getElementById('upseller-multi-overlay');
  if (el) {
    el.querySelector('div') && (el.querySelector('div').style.transition = 'opacity 0.4s', el.querySelector('div').style.opacity = '0');
    setTimeout(() => el.remove(), 400);
  }
}
// ========== BOTÕES INJETADOS ==========
function injetarBotaoOverlay() {
  if (document.getElementById('ups-floating-btn')) return;
  const cardHead = document.querySelector('#basic .ant-card-head');
  if (!cardHead) return;
  const btn = document.createElement('div');
  btn.id = 'ups-floating-btn';
  btn.style.cssText = 'position:fixed;z-index:999999999;cursor:pointer;width:40px;height:40px;border-radius:50%;background:#4078f2;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;';
  btn.innerHTML = `<svg viewBox="0 0 24 24" fill="white" style="width:24px;height:24px;display:block;margin:auto;"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z"/></svg>`;
  btn.title = 'Automatiza Shein - UpSeller';
  btn.addEventListener('click', abrirDialogMedidas);
  function posicionarTop() {
    const r = cardHead.getBoundingClientRect();
    btn.style.top = (r.top + 208) + 'px';
  }
  function posicionarRight() {
    const ref = document.querySelector('.edit_back_top_inner');
    if (ref) {
      const cssRight = parseFloat(window.getComputedStyle(ref).right);
      btn.style.right = (cssRight - 4) + 'px';
    } else {
      btn.style.right = '124px';
    }
  }
  function posicionarCompleto() { posicionarTop(); posicionarRight(); }
  posicionarCompleto();
  window.addEventListener('resize', posicionarRight);
  let ultimaDPR = window.devicePixelRatio;
  setInterval(() => {
    if (window.devicePixelRatio !== ultimaDPR) {
      ultimaDPR = window.devicePixelRatio;
      posicionarCompleto();
    }
  }, 1000);
  document.body.appendChild(btn);
  injetarBotaoPrecoEspecial(btn);
}
function injetarBotaoPrecoEspecial(refBtn) {
  if (document.getElementById('ups-floating-btn-preco')) return;
  const btn2 = document.createElement('div');
  btn2.id = 'ups-floating-btn-preco';
  btn2.style.cssText = 'position:fixed;z-index:999999999;cursor:pointer;width:40px;height:40px;border-radius:50%;background:#28a745;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:bold;color:#fff;margin-top:8px;';
  btn2.innerHTML = '$';
  btn2.title = 'Preço Especial';
  btn2.addEventListener('click', abrirDialogPrecos);
  function posicionarTop() {
    const r = refBtn.getBoundingClientRect();
    btn2.style.top = (r.bottom + 8) + 'px';
  }
  function posicionarRight() {
    btn2.style.right = refBtn.style.right;
  }
  function posicionarCompleto() { posicionarTop(); posicionarRight(); }
  posicionarCompleto();
  window.addEventListener('resize', posicionarRight);
  setInterval(() => { posicionarCompleto(); }, 1000);
  document.body.appendChild(btn2);
}
