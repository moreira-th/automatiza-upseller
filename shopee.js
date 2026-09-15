/*
 * UpSeller Moreira — Shopee Module
 * Popup de automação para páginas de edição de anúncios Shopee.
 * Interface idêntica à Shein. Macros serão implementadas depois.
 */

(function() {
  if (!/\/pt\/products\/shopee\/edit\//.test(location.href)) return;

  var LT = ['PP','P','M','G','GG','EGG','G1','G2','G3','G4','G5','2','4','6','8','10','12','14','16'];

  // ========== FLOATING BUTTON ==========
  function injectButton() {
    if (document.getElementById("ups-shopee-btn")) return;
    var cardHead = document.querySelector("#basic .ant-card-head");
    if (!cardHead) return;
    var btn = document.createElement("div");
    btn.id = "ups-shopee-btn";
    btn.style.cssText = "position:fixed;z-index:999999999;cursor:pointer;width:40px;height:40px;border-radius:50%;background:#4078f2;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;";
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="white" style="width:24px;height:24px;display:block;margin:auto;"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z"/></svg>';
    btn.title = "Automatiza Shopee - Upseller";
    btn.addEventListener("click", abrirDialogShopee);
    function posTop() { var r = cardHead.getBoundingClientRect(); btn.style.top = (r.top + 208) + "px"; }
    function posRight() { var ref = document.querySelector(".edit_back_top_inner"); if (ref) { btn.style.right = (parseFloat(window.getComputedStyle(ref).right) - 4) + "px"; } else { btn.style.right = "124px"; } }
    function posAll() { posTop(); posRight(); }
    posAll();
    window.addEventListener("resize", posRight);
    var dpr = window.devicePixelRatio;
    setInterval(function() { if (window.devicePixelRatio !== dpr) { dpr = window.devicePixelRatio; posAll(); } }, 1000);
    document.body.appendChild(btn);
    injectPrecoBtn(btn);
  }

  function injectPrecoBtn(refBtn) {
    if (document.getElementById("ups-shopee-btn-preco")) return;
    var btn2 = document.createElement("div");
    btn2.id = "ups-shopee-btn-preco";
    btn2.style.cssText = "position:fixed;z-index:999999999;cursor:pointer;width:40px;height:40px;border-radius:50%;background:#28a745;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:bold;color:#fff;";
    btn2.textContent = "$";
    btn2.title = "Preço Shopee (ALT+X)";
    btn2.addEventListener("click", abrirModalPrecoShopee);
    function posTop2() { var r = refBtn.getBoundingClientRect(); btn2.style.top = (r.bottom + 8) + "px"; }
    function posRight2() { btn2.style.right = refBtn.style.right; }
    function posAll2() { posTop2(); posRight2(); }
    posAll2();
    window.addEventListener("resize", posRight2);
    setInterval(function() { posAll2(); }, 1000);
    document.body.appendChild(btn2);
  }

  setTimeout(injectButton, 3000);

  var observer = new MutationObserver(function() {
    if (!document.getElementById("ups-shopee-btn")) {
      setTimeout(injectButton, 500);
    }
    if (!document.getElementById("ups-shopee-btn-preco") && document.getElementById("ups-shopee-btn")) {
      setTimeout(function() { injectPrecoBtn(document.getElementById("ups-shopee-btn")); }, 500);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // ===== AUTO-GERAR SKU + REMOVER IMAGEM MASSA =====
  function iniciarSkuAutoShopee() {
    var inp = Array.from(document.querySelectorAll("input.ant-input")).find(function(i) {
      var fi = i.closest(".ant-form-item");
      if (!fi) return false;
      var lb = fi.querySelector(".ant-form-item-label");
      return lb && lb.textContent.trim() === "SKU Principal";
    });
    if (!inp) { setTimeout(iniciarSkuAutoShopee, 2000); return; }
    if (inp.dataset.upsSkuShopee) return;
    inp.dataset.upsSkuShopee = "1";
    var dt = null;
    inp.addEventListener("input", function() {
      if (!inp.value.trim()) return;
      clearTimeout(dt);
      dt = setTimeout(function() { if (typeof gerarSkuEmMassa === "function") gerarSkuEmMassa(); }, 500);
    });
  }
  setTimeout(iniciarSkuAutoShopee, 3000);

  // Auto-Gerar SKU quando Cor é alterada
  function iniciarCorAutoShopee() {
    var cards = document.querySelectorAll('.variants_attr_card');
    var corCard = null;
    for (var i = 0; i < cards.length; i++) {
      var t = cards[i].querySelector('.ant-card-head-title');
      if (t && t.textContent.includes('Cor')) { corCard = cards[i]; break; }
    }
    if (!corCard) { setTimeout(iniciarCorAutoShopee, 2000); return; }
    if (corCard.dataset.upsCorWatch) return;
    corCard.dataset.upsCorWatch = '1';
    var debounce;
    var observer2 = new MutationObserver(function(mutations) {
      if (window.__upsCorDialogOpen) return;
      var relevante = false;
      mutations.forEach(function(m) {
        if (m.type === 'attributes' && m.attributeName === 'class' && m.target.closest('.ant-checkbox-wrapper')) relevante = true;
        if (m.type === 'childList') {
          m.addedNodes.forEach(function(n) { if (n.nodeType === 1 && (n.querySelector('.ant-checkbox-wrapper') || n.className && n.className.includes('ant-checkbox'))) relevante = true; });
          m.removedNodes.forEach(function(n) { if (n.nodeType === 1 && (n.querySelector('.ant-checkbox-wrapper') || n.className && n.className.includes('ant-checkbox'))) relevante = true; });
        }
      });
      if (!relevante) return;
      clearTimeout(debounce);
      debounce = setTimeout(function() {
        if (typeof gerarSkuEmMassa === 'function') gerarSkuEmMassa();
      }, 800);
    });
    observer2.observe(corCard, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  }
  setTimeout(iniciarCorAutoShopee, 4000);

  function remImgMassa() { var b = document.getElementById("ups-img-massa-btn"); if (b) b.remove(); }
  setInterval(remImgMassa, 2000);
  remImgMassa();

  function remSheinBtn() { var s = document.getElementById("ups-floating-btn"); if (s) s.remove(); var p = document.getElementById("ups-floating-btn-preco"); if (p) p.remove(); }
  setInterval(remSheinBtn, 2000);
  remSheinBtn();

  // ========== MAIN DIALOG (copied from Shein, multi-aba + atributos preserved) ==========

  function encontrarColunasShopee() {
    var cols = {};
    var variantTable = document.querySelector('#sales table, .variants_attr_card ~ .vxe-table');
    if (!variantTable) variantTable = document.querySelector('.vxe-table');
    var headers = variantTable ? variantTable.querySelectorAll('.vxe-header--column') : document.querySelectorAll('.vxe-header--column');
    headers.forEach(function(h) {
      var text = h.textContent.replace(/[*\s]+/g, ' ').trim().toLowerCase();
      var cls = Array.from(h.classList).find(function(c) { return c.match(/^col_\d+$/); });
      if (!cls) return;
      if (text.includes('cor') && !text.includes('tamanho') && !text.includes('preço') && !text.includes('desconto')) cols.cor = cls;
      else if (text.includes('tamanho')) cols.tamanho = cls;
      else if (text.includes('sku')) cols.sku = cls;
      else if (text.includes('preço') && !text.includes('desconto')) cols.preco = cls;
      else if (h.querySelector('.vxe-cell--checkbox') && !text.includes('método') && !text.includes('envio')) cols.checkbox = cls;
      else if (text.includes('desconto')) cols.desc = cls;
      else if (text.includes('quantidade') && !text.includes('promoção') && !text.includes('promocao')) cols.qtd = cls;
      else if (text.includes('gtin')) cols.gtin = cls;
    });
    return cols;
  }

  // Percorre TODAS as linhas da "Lista de Variantes" (página /edit) rolando do topo ao
  // fim. Com virtual scroll, apenas algumas linhas estão no DOM por vez; por isso é
  // necessário rolar. Chamado com uma função fn(row) que age sobre cada linha visível.
  async function varrerLinhasShopee(fn) {
    var table = document.querySelector('#sales table, .variants_attr_card ~ .vxe-table, .vxe-table');
    if (!table) return;
    var bodyWrapper = table.querySelector('.vxe-table--body-wrapper');
    if (!bodyWrapper) {
      // Sem wrapper de scroll: aplica nas linhas atuais e encerra
      table.querySelectorAll('.vxe-body--row').forEach(function(r) { try { fn(r); } catch(e) {} });
      return;
    }
    // Começa do topo
    bodyWrapper.scrollLeft = 0;
    bodyWrapper.scrollTop = 0;
    await sleep(200);

    var maxScroll = Math.max(0, bodyWrapper.scrollHeight - bodyWrapper.clientHeight);
    var scrollStep = Math.max(bodyWrapper.clientHeight - 40, 80);
    var processos = {};  // evita reprocessar a mesma linha (virtual scroll reutiliza rows)

    function processar() {
      bodyWrapper.querySelectorAll('.vxe-body--row').forEach(function(r) {
        var rid = r.getAttribute('rowid') || r.getAttribute('data-row-key');
        if (rid && processos[rid]) return;
        try { fn(r); } catch(e) {}
        if (rid) processos[rid] = true;
      });
    }

    processar();
    var pos = scrollStep;
    while (pos < maxScroll) {
      bodyWrapper.scrollTop = pos;
      await sleep(200);
      processar();
      pos += scrollStep;
    }
    bodyWrapper.scrollTop = maxScroll;
    await sleep(200);
    processar();

    // Volta ao topo
    bodyWrapper.scrollLeft = 0;
    bodyWrapper.scrollTop = 0;
    await sleep(200);
  }

  function linhaBloqueada(row) {
    var chk = row.querySelector('.vxe-cell--checkbox');
    return chk && (chk.classList.contains('is--disabled') || chk.closest('.vxe-body--column').classList.contains('is--disabled'));
  }

  function gerarGtinShopee() {
    var cols = encontrarColunasShopee();
    if (!cols.gtin) return 0;
    var rows = document.querySelectorAll('.vxe-body--row');
    if (!rows.length) return 0;
    var prefixos = ['789', '790'];
    var count = 0;
    rows.forEach(function(row) {
      var inp = row.querySelector('.' + cols.gtin + ' input');
      if (!inp || inp.disabled || inp.value.trim()) return;
      var prefix = prefixos[Math.floor(Math.random() * prefixos.length)];
      var digits = prefix.split('').map(Number);
      for (var i = 0; i < 9; i++) digits.push(Math.floor(Math.random() * 10));
      var sum = 0;
      for (var i = 0; i < 12; i++) sum += digits[i] * (i % 2 === 0 ? 1 : 3);
      var check = (10 - (sum % 10)) % 10;
      digits.push(check);
      var codigo = digits.join('');
      var nsg = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      inp.focus();
      nsg.call(inp, codigo);
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      inp.dispatchEvent(new Event('change', { bubbles: true }));
      inp.blur();
      count++;
    });
    return count;
  }

  function garantirConfigPacoteAnuncio() {
    // Garante que o dropdown "Configurações de Pacote" esteja em "Configurações por Anúncio".
    // Assim os campos Peso do Pacote e Tamanho da Embalagem ficam editáveis em nível de anúncio.
    var item = null;
    var items = document.querySelectorAll('.ant-form-item');
    for (var i = 0; i < items.length; i++) {
      var label = items[i].querySelector('.ant-form-item-label, label');
      var lt = label ? (label.textContent || '').replace(/\s+/g, ' ').trim() : '';
      if (lt.indexOf('Configurações de Pacote') !== -1) { item = items[i]; break; }
    }
    if (!item) return false;
    var select = item.querySelector('.ant-select');
    if (!select) return false;
    var selected = select.querySelector('.ant-select-selection-selected-value');
    var current = selected ? (selected.textContent || '').trim() : '';
    if (current === 'Configurações por Anúncio') return true;
    // Abre o dropdown e clica na opção "Configurações por Anúncio"
    select.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    select.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    setTimeout(function() {
      var dd = document.querySelector('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
      if (!dd) return;
      var opts = dd.querySelectorAll('.ant-select-dropdown-menu-item, [role="option"]');
      for (var o = 0; o < opts.length; o++) {
        if ((opts[o].textContent || '').trim() === 'Configurações por Anúncio') {
          opts[o].dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
          opts[o].dispatchEvent(new MouseEvent('click', { bubbles: true }));
          break;
        }
      }
    }, 200);
    return true;
  }

  async function subespecificacaoShopee(sizesStr) {
    var target = sizesStr.split(/[,;\s]+/).map(function(s) { return s.trim().toUpperCase(); }).filter(Boolean);
    if (!target.length) return;
    var card = null;
    var cards = document.querySelectorAll('.variants_attr_card');
    for (var i = 0; i < cards.length; i++) {
      var t = cards[i].querySelector('.ant-card-head-title');
      if (t && t.textContent.includes('Tamanho')) { card = cards[i]; break; }
    }
    if (!card) return;

    var allChecks = card.querySelectorAll('.ant-checkbox-wrapper');
    allChecks.forEach(function(wrap) {
      var inp = wrap.querySelector('input[type=checkbox]');
      var txt = wrap.textContent.trim().toUpperCase();
      if (inp) {
        if (target.includes(txt) && !inp.checked) wrap.click();
        else if (!target.includes(txt) && inp.checked) wrap.click();
      }
    });

    for (var si = 0; si < target.length; si++) {
      var sz = target[si];
      var found = false;
      var wraps = card.querySelectorAll('.ant-checkbox-wrapper');
      wraps.forEach(function(w) { if (w.textContent.trim().toUpperCase() === sz) found = true; });
      if (found) continue;

      var addBtn = card.querySelector('button.ant-btn-link');
      if (!addBtn) break;
      addBtn.click();
      await sleep(600);
      var pop = document.querySelector('.ant-popover:not(.ant-popover-hidden)');
      if (!pop) continue;
      var inp = pop.querySelector('input.ant-input');
      if (inp) {
        var ns3 = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        inp.focus();
        ns3.call(inp, sz);
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        inp.dispatchEvent(new Event('change', { bubbles: true }));
      }
      var btns = pop.querySelectorAll('button');
      btns.forEach(function(b) { if (b.textContent.trim() === 'Salvar') b.click(); });
      await sleep(800);
    }
  }

  function mostrarDialogoConfirmarCoresShopee() {
    return new Promise(function(resolve) {
      var existing = document.getElementById('ups-cor-dialog');
      if (existing) existing.remove();
      var card = null;
      var cards = document.querySelectorAll('.variants_attr_card');
      for (var i = 0; i < cards.length; i++) {
        var t = cards[i].querySelector('.ant-card-head-title');
        if (t && t.textContent.includes('Cor')) { card = cards[i]; break; }
      }
      if (!card) { resolve({ confirmou: false }); return; }

      var allChecks = card.querySelectorAll('.ant-checkbox-wrapper');
      var cores = [];
      allChecks.forEach(function(w) {
        var inp = w.querySelector('input[type=checkbox]');
        var txt = w.textContent.trim();
        if (inp) cores.push({ nome: txt, checked: inp.checked, elem: w });
      });
      if (!cores.length) { resolve({ confirmou: false }); return; }

      cores.sort(function(a, b) { if (a.checked && !b.checked) return -1; if (!a.checked && b.checked) return 1; return (a.nome || '').toLowerCase().localeCompare((b.nome || '').toLowerCase()); });

      var div = document.createElement('div');
      div.id = 'ups-cor-dialog';
      div.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999999;display:flex;align-items:center;justify-content:center;';
      div.innerHTML =
        '<div style="background:white;border-radius:12px;padding:24px;width:640px;max-width:95vw;box-shadow:0 8px 32px rgba(0,0,0,0.3);font-family:sans-serif;">' +
        '<div style="font-size:16px;font-weight:600;margin-bottom:4px;">🎨 Confirmar Cores</div>' +
        '<div style="font-size:13px;color:#555;margin-bottom:12px;">Selecione as cores que deseja manter marcadas nas Variantes:</div>' +
        '<div id="ups-cor-lista" style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;max-height:260px;overflow-y:auto;margin-bottom:12px;padding:4px 0;">' +
        cores.map(function(c, ii) { return '<label style="display:flex;align-items:center;gap:5px;padding:5px 6px;font-size:13px;cursor:pointer;border-radius:4px;border:1px solid #e0e0e0;background:' + (c.checked ? '#e8f5e9' : '#fafafa') + ';" data-idx="' + ii + '"><input type="checkbox" class="ups-cor-chk"' + (c.checked ? ' checked' : '') + ' style="margin:0;"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + c.nome + '</span></label>'; }).join('') +
        '</div>' +
        '<div style="display:flex;gap:6px;margin-bottom:8px;">' +
        '<input id="ups-cor-input" type="text" placeholder="Adicionar cor..." style="flex:1;padding:7px;border:1px solid #ccc;border-radius:4px;font-size:13px;">' +
        '<button id="ups-cor-add" style="padding:7px 14px;background:#4078f2;color:white;border:none;border-radius:4px;cursor:pointer;font-size:13px;font-weight:600;">+</button>' +
        '</div>' +
        '<div id="ups-cor-hoje" style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px;min-height:0;"></div>' +
        '<div style="display:flex;gap:8px;justify-content:flex-end;">' +
        '<button id="ups-cor-pular" style="padding:7px 16px;border:1px solid #ccc;border-radius:6px;cursor:pointer;font-size:13px;background:white;">Pular Etapa</button>' +
        '<button id="ups-cor-confirmar" style="padding:7px 20px;background:#28a745;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:bold;font-size:13px;">Confirmar</button>' +
        '</div></div>';
      document.body.appendChild(div);

      function renderChipsHoje() {
        chrome.storage.local.get('manualCores', function(res) {
          var map = res.manualCores || {};
          var hoje = new Date().toISOString().slice(0, 10);
          var el = document.getElementById('ups-cor-hoje');
          if (!el) return;
          var chaves = Object.keys(map).filter(function(k) { return map[k] === hoje; });
          if (!chaves.length) { el.style.display = 'none'; el.innerHTML = ''; return; }
          el.style.display = 'flex';
          el.innerHTML = chaves.map(function(k) { return '<span class="ups-cor-chip" data-nome="' + k.replace(/"/g, '&quot;') + '" style="display:inline-block;padding:3px 10px;background:#e3f2fd;border:1px solid #90caf9;border-radius:12px;font-size:12px;cursor:pointer;color:#1565c0;line-height:1.5;">' + k + '</span>'; }).join('');
          el.querySelectorAll('.ups-cor-chip').forEach(function(chip) {
            chip.onclick = function() {
              var inp = document.getElementById('ups-cor-input');
              if (inp) { inp.value = this.getAttribute('data-nome'); document.getElementById('ups-cor-add').click(); }
            };
          });
        });
      }
      renderChipsHoje();

      function toast(msg) {
        var t2 = document.createElement('div'); t2.textContent = msg;
        t2.style.cssText = 'position:fixed;top:24px;left:50%;transform:translateX(-50%);background:#28a745;color:#fff;padding:8px 20px;border-radius:6px;font-size:14px;z-index:10000000;opacity:0;transition:opacity .3s;pointer-events:none;';
        document.body.appendChild(t2);
        requestAnimationFrame(function() { t2.style.opacity = '1'; });
        setTimeout(function() { t2.style.opacity = '0'; setTimeout(function() { t2.remove(); }, 300); }, 2000);
      }

      div.querySelectorAll('.ups-cor-chk').forEach(function(chk) {
        chk.addEventListener('change', function() { var lb = chk.closest('label'); if (lb) lb.style.background = chk.checked ? '#e8f5e9' : '#fafafa'; });
      });

      document.getElementById('ups-cor-add').onclick = function() {
        var inp = document.getElementById('ups-cor-input');
        var nomeRaw = inp.value.trim();
        if (!nomeRaw) return;
        var lista = document.getElementById('ups-cor-lista');
        var existe = Array.from(lista.querySelectorAll('label')).some(function(lb) { return lb.querySelector('span').textContent.trim() === nomeRaw; });
        if (!existe) {
          var addBtnRef = card.querySelector('button.ant-btn-link');
          if (addBtnRef) addBtnRef.click();
          setTimeout(function() {
            var pop = document.querySelector('.ant-popover:not(.ant-popover-hidden)');
            if (pop) {
              var pi = pop.querySelector('input.ant-input');
              if (pi) {
                var ns3 = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                pi.focus(); ns3.call(pi, nomeRaw);
                pi.dispatchEvent(new Event('input', { bubbles: true })); pi.dispatchEvent(new Event('change', { bubbles: true }));
              }
              var pbtns = pop.querySelectorAll('button'); pbtns.forEach(function(b) { if (b.textContent.trim() === 'Salvar') b.click(); });
            }
          }, 400);
          var lb = document.createElement('label');
          lb.style.cssText = 'display:flex;align-items:center;gap:5px;padding:5px 6px;font-size:13px;cursor:pointer;border-radius:4px;border:1px solid #e0e0e0;background:#e8f5e9;';
          lb.innerHTML = '<input type="checkbox" class="ups-cor-chk" checked style="margin:0;"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + nomeRaw + '</span>';
          lb.querySelector('.ups-cor-chk').addEventListener('change', function() { lb.style.background = this.checked ? '#e8f5e9' : '#fafafa'; });
          lista.appendChild(lb); toast(nomeRaw + ' adicionada');
          var hoje = new Date().toISOString().slice(0, 10);
          chrome.storage.local.get('manualCores', function(res2) {
            var map2 = res2.manualCores || {};
            map2[nomeRaw] = hoje;
            var seteDias = Date.now() - 7 * 24 * 60 * 60 * 1000;
            for (var k2 in map2) { if (new Date(map2[k2]).getTime() < seteDias) delete map2[k2]; }
            chrome.storage.local.set({ manualCores: map2 }, function() { if (typeof renderChipsHoje === 'function') renderChipsHoje(); });
          });
        } else {
          var target = Array.from(lista.querySelectorAll('label')).find(function(lb) { return lb.querySelector('span').textContent.trim() === nomeRaw; });
          if (target) { var ck = target.querySelector('.ups-cor-chk'); if (ck && !ck.checked) { ck.checked = true; target.style.background = '#e8f5e9'; toast(nomeRaw + ' marcada'); } }
        }
        inp.value = '';
      };
      document.getElementById('ups-cor-input').addEventListener('keydown', function(e) { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('ups-cor-add').click(); } });

      document.getElementById('ups-cor-pular').onclick = function() { div.remove(); resolve({ confirmou: false }); };
      div.addEventListener('click', function(e) { if (e.target === div) { div.remove(); resolve({ confirmou: false }); } });

      document.getElementById('ups-cor-confirmar').onclick = function() {
        var labels = div.querySelectorAll('#ups-cor-lista > label');
        var conf = [];
        labels.forEach(function(lb) { var ck = lb.querySelector('.ups-cor-chk'); if (ck.checked) conf.push(lb.querySelector('span').textContent.trim()); });
        div.remove();
        var allCurrent = card.querySelectorAll('.ant-checkbox-wrapper');
        allCurrent.forEach(function(wrap) {
          var inp = wrap.querySelector('input[type=checkbox]'); var txt = wrap.textContent.trim(); if (!inp) return;
          var deve = conf.indexOf(txt) !== -1;
          if (deve && !inp.checked) wrap.click();
          else if (!deve && inp.checked) wrap.click();
        });
        resolve({ confirmou: true, cores: conf });
      };
    });
  }

  async function subespecificacaoCorShopee(coresStr) {
    var target = coresStr.split(/[,;\s]+/).map(function(s) { return s.trim(); }).filter(Boolean);
    if (!target.length) return;
    var card = null;
    var cards = document.querySelectorAll('.variants_attr_card');
    for (var i = 0; i < cards.length; i++) {
      var t = cards[i].querySelector('.ant-card-head-title');
      if (t && t.textContent.includes('Cor')) { card = cards[i]; break; }
    }
    if (!card) return;

    var allChecks = card.querySelectorAll('.ant-checkbox-wrapper');
    allChecks.forEach(function(wrap) {
      var inp = wrap.querySelector('input[type=checkbox]');
      var txt = wrap.textContent.trim();
      if (inp) {
        var match = target.some(function(c) { return txt.toLowerCase().includes(c.toLowerCase()); });
        if (match && !inp.checked) wrap.click();
        else if (!match && inp.checked) wrap.click();
      }
    });

    for (var si = 0; si < target.length; si++) {
      var sz = target[si];
      var found = false;
      var wraps = card.querySelectorAll('.ant-checkbox-wrapper');
      wraps.forEach(function(w) { if (w.textContent.trim().toLowerCase().includes(sz.toLowerCase())) found = true; });
      if (found) continue;

      var addBtn = card.querySelector('button.ant-btn-link');
      if (!addBtn) break;
      addBtn.click();
      await sleep(600);
      var pop = document.querySelector('.ant-popover:not(.ant-popover-hidden)');
      if (!pop) continue;
      var inp = pop.querySelector('input.ant-input');
      if (inp) {
        var ns3 = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        inp.focus();
        ns3.call(inp, sz);
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        inp.dispatchEvent(new Event('change', { bubbles: true }));
      }
      var btns = pop.querySelectorAll('button');
      btns.forEach(function(b) { if (b.textContent.trim() === 'Salvar') b.click(); });
      await sleep(800);
    }
  }

  // ===== RENOMEAR CORES (usando banco da aba CORES: bibliotecaRemapCustom) =====
  // Substitui o nome das cores MARCADAS na seção COR pelo valor cadastrado (em CAPSLOCK),
  // replicando o fluxo NATIVO do lápis "Editar" (clicar no ícone → popover → Salvar).
  // Usa polling rápido para aguardar o popover, tornando o processo bem mais veloz.
  async function renomearCoresShopee() {
    return new Promise(function(resolve) {
      chrome.storage.local.get(['bibliotecaRemapCustom'], async function(res) {
        var remapCustom = res.bibliotecaRemapCustom || {};
        if (!Object.keys(remapCustom).length) { resolve(0); return; }

        var card = null;
        var cards = document.querySelectorAll('.variants_attr_card');
        for (var i = 0; i < cards.length; i++) {
          var t = cards[i].querySelector('.ant-card-head-title');
          if (t && t.textContent.includes('Cor')) { card = cards[i]; break; }
        }
        if (!card) { resolve(0); return; }

        var normalizar = function(s) { return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim(); };

        // Espera (polling curto) um popover visível com input; timeout ~1.2s
        function esperarPopover() {
          return new Promise(function(r) {
            var inicio = Date.now();
            (function poll() {
              var pop = document.querySelector('.ant-popover:not(.ant-popover-hidden)');
              var inp = pop && pop.querySelector('input');
              if (inp) { r({ pop: pop, inp: inp }); return; }
              if (Date.now() - inicio > 1000) { r(null); return; }
              setTimeout(poll, 60);
            })();
          });
        }

        var contador = 0;
        // Renomeia apenas as cores MARCADAS (checkbox checked) que têm mapeamento.
        var wrappers = card.querySelectorAll('.ant-checkbox-wrapper');
        var marcadas = [];
        wrappers.forEach(function(w) {
          var cb = w.querySelector('input[type=checkbox]');
          var nome = w.textContent.trim();
          if (cb && cb.checked) marcadas.push({ nome: nome, w: w });
        });

        for (var mi = 0; mi < marcadas.length; mi++) {
          var marca = marcadas[mi];
          var nome = marca.nome;
          var dest = remapCustom[nome] || remapCustom[Object.keys(remapCustom).find(function(k){ return normalizar(k) === normalizar(nome); })];
          if (!dest) continue;

          // Encontra o contêiner <li> que tem o .edit_icon (lápis) desta cor
          var el = marca.w, container = null;
          while (el && el !== card) { if (el.querySelector('.edit_icon')) { container = el; break; } el = el.parentElement; }
          if (!container) continue;

          var editIcon = container.querySelector('.edit_icon');
          editIcon.click();

          // Aguarda o popover abrir (rápido, com polling)
          var pv = await esperarPopover();
          if (!pv) continue;

          var novel = dest.toUpperCase();
          var nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          pv.inp.focus();
          nativeSetter.call(pv.inp, novel);
          pv.inp.dispatchEvent(new Event('input', { bubbles: true }));
          pv.inp.dispatchEvent(new Event('change', { bubbles: true }));
          pv.inp.blur();

          var salvar = Array.from(pv.pop.querySelectorAll('button')).find(function(b) { return b.textContent.trim() === 'Salvar'; });
          if (salvar) { salvar.click(); contador++; }

          // Pequena pausa para o site processar o rename (UI) antes da próxima
          await sleep(150);
        }

        resolve(contador);
      });
    });
  }

function abrirDialogShopee() {
  var preencherListaPresets, lerEstadoOverlay, aplicarPresetOverlay, salvarPresetOverlay, salvarEstadoMedidas;
  const existing = document.getElementById('upseller-shopee-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'upseller-shopee-overlay';
  overlay.innerHTML = `
<div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.45);z-index:999999;display:flex;align-items:center;justify-content:center;">
<div style="background:white;border-radius:8px;padding:20px;width:90vw;min-width:540px;max-width:680px;box-shadow:0 8px 32px rgba(0,0,0,0.25);font-family:sans-serif;max-height:85vh;overflow-y:auto;">
<div style="font-size:18px;font-weight:bold;margin-bottom:10px;text-align:center;">Automação Shopee - Upseller</div>

<div style="display:flex;gap:4px;margin-bottom:10px;">
<select id="ups-op-select" style="flex:1;padding:6px;border:1px solid #ccc;border-radius:4px;font-size:12px;box-sizing:border-box;"><option value="">📋 Carregar Nova Configuração...</option></select>
<button id="ups-op-salvar" style="width:36px;height:36px;padding:0;background:white;color:#4078f2;border:1px solid #4078f2;border-radius:4px;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;" title="Salvar/Renomear">💾</button>
<button id="ups-op-excluir" style="padding:4px 10px;border:1px solid #dc3545;border-radius:4px;cursor:pointer;font-size:12px;background:white;color:#dc3545;white-space:nowrap;line-height:1;display:flex;align-items:center;justify-content:center;" title="Excluir"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc3545" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></button>
<span style="position:relative;display:flex;align-items:stretch;">
<button id="ups-op-dados" style="padding:4px 10px;border:1px solid #4078f2;border-radius:4px;cursor:pointer;font-size:14px;background:white;color:#4078f2;line-height:1;display:flex;align-items:center;justify-content:center;" title="Exportar/Importar dados"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4078f2" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg></button>
<div id="ups-op-dados-menu" style="display:none;position:absolute;top:100%;right:0;margin-top:4px;background:white;border:1px solid #ddd;border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,0.12);z-index:100;min-width:150px;overflow:hidden;">
<div style="padding:8px 14px;cursor:pointer;font-size:13px;display:flex;align-items:center;gap:8px;transition:background .15s;" onmouseover="this.style.background='#f0f4ff'" onmouseout="this.style.background=''" id="ups-op-export-action"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4078f2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Exportar Dados</div>
<div style="padding:8px 14px;cursor:pointer;font-size:13px;display:flex;align-items:center;gap:8px;border-top:1px solid #eee;transition:background .15s;" onmouseover="this.style.background='#f0f4ff'" onmouseout="this.style.background=''" id="ups-op-import-action"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4078f2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Importar Dados</div>
</div>
</span>
</div>

<style>
.ups-ac { margin-bottom:8px;border-radius:8px;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,0.08);overflow:hidden; }
.ups-ac-h { display:flex;align-items:center;gap:10px;padding:10px 14px;cursor:pointer;user-select:none;font-size:14px;font-weight:600;background:linear-gradient(135deg,#f8f9fa,#e9ecef);transition:background .2s; }
.ups-ac-h:hover { background:linear-gradient(135deg,#e9ecef,#dee2e6); }
.ups-ac-body { max-height:0;overflow:hidden;transition:max-height .35s ease; }
.ups-ac-body-inner { padding:12px 14px;border-top:1px solid #e9ecef; }
.ups-ac-ar { font-size:10px;color:#888;transition:transform .2s;margin-right:6px; }
#ups-ac-s-mt,#ups-ac-s-mp,#ups-ac-s-multi,#ups-ac-s-atr { background:#ccc; }
#ups-ac-t-mt:checked + #ups-ac-s-mt,
#ups-ac-t-mp:checked + #ups-ac-s-mp,
#ups-ac-t-multi:checked + #ups-ac-s-multi,
#ups-ac-t-atr:checked + #ups-ac-s-atr { background:#28a745; }
#ups-ac-t-mt:checked + #ups-ac-s-mt::before,
#ups-ac-t-mp:checked + #ups-ac-s-mp::before,
#ups-ac-t-multi:checked + #ups-ac-s-multi::before,
#ups-ac-t-atr:checked + #ups-ac-s-atr::before { transform:translateX(16px); }
#ups-ac-s-mt::before,
#ups-ac-s-mp::before,
#ups-ac-s-multi::before,
#ups-ac-s-atr::before,
#ups-ma-slider::before {
  content:""; position:absolute; width:16px; height:16px; border-radius:50%;
  background:white; top:2px; left:2px; transition:.3s;
}
#ups-ma-slider { background:#ccc; }
#ups-ma-ativar:checked + #ups-ma-slider { background:#28a745; }
#ups-ma-ativar:checked + #ups-ma-slider::before { transform:translateX(16px); }
#ups-ma-sub-ativar:not(:checked) + span { background:#ccc; }
#ups-ma-sub-ativar:checked + span { background:#28a745; }
#ups-ma-sub-ativar:checked + span::before,
#ups-ma-sub-ativar:not(:checked) + span::before { content:""; position:absolute; width:12px;height:12px;border-radius:50%;background:white;top:2px;left:2px;transition:.3s; }
#ups-ma-sub-ativar:checked + span::before { transform:translateX(14px); }

.ups-tag { display:inline-flex;align-items:center;gap:3px;background:#e8f5e9;border:1px solid #c8e6c9;border-radius:4px;padding:2px 6px;font-size:12px;font-weight:500;line-height:1.4; }
.ups-tag-rm { cursor:pointer;font-size:14px;color:#999;line-height:1;margin-left:2px; }
.ups-tag-rm:hover { color:#dc3545; }
</style>

<div class="ups-ac" data-ups-open="0">
<div class="ups-ac-h" data-ups-body="ups-ab-1">
<span>📏 Medidas</span>
<span class="ups-ac-ar" style="transition:transform .2s;">▶</span>
<label style="position:relative;display:inline-block;width:36px;height:20px;margin-left:auto;cursor:pointer;" onclick="event.stopPropagation()">
<input type="checkbox" id="ups-ac-t-mt" checked style="opacity:0;width:0;height:0;margin:0;">
<span id="ups-ac-s-mt" style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;border-radius:20px;transition:.3s;"></span>
</label>
</div>
<div class="ups-ac-body" id="ups-ab-1">
<div class="ups-ac-body-inner">
<div id="ups-mm-body"></div>
</div>
</div>
</div>

<div class="ups-ac">
<div class="ups-ac-h" data-ups-body="ups-ab-2">
<span>💰 Preço com Desconto</span>
<span class="ups-ac-ar">▶</span>
<label style="position:relative;display:inline-block;width:36px;height:20px;margin-left:auto;cursor:pointer;" onclick="event.stopPropagation()">
<input type="checkbox" id="ups-ac-t-mp" checked style="opacity:0;width:0;height:0;margin:0;">
<span id="ups-ac-s-mp" style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;border-radius:20px;transition:.3s;"></span>
</label>
</div>
<div class="ups-ac-body" id="ups-ab-2">
<div class="ups-ac-body-inner">
<select id="ups-mp-carregar" style="width:100%;padding:4px;border:1px solid #ccc;border-radius:4px;font-size:11px;box-sizing:border-box;margin-bottom:4px;"><option value="">Carregar Salvo...</option></select>
<div style="display:flex;gap:3px;margin-bottom:4px;">
<input id="ups-mp-nome-salvar" type="text" placeholder="Nome" style="flex:1;padding:4px;border:1px solid #ccc;border-radius:4px;font-size:11px;">
<button id="ups-mp-salvar" style="padding:4px 10px;background:#4078f2;color:white;border:none;border-radius:4px;cursor:pointer;font-size:14px;line-height:1;">💾</button>
</div>
<button id="ups-mp-excluir" style="display:none;width:100%;margin-bottom:4px;padding:3px;border:1px solid #dc3545;color:#dc3545;border-radius:4px;cursor:pointer;font-size:11px;background:white;">× Excluir</button>
<input id="ups-mp-nb" type="text" placeholder="Preço massa R$" style="width:100%;padding:5px;border:1px solid #ccc;border-radius:4px;font-size:12px;box-sizing:border-box;margin-bottom:4px;">
<div style="position:relative;display:flex;gap:3px;margin-bottom:4px;">
<input id="ups-mp-nt" type="text" placeholder="Ex: PP" style="flex:1;padding:4px 6px;border:1px solid #ccc;border-radius:4px;font-size:11px;box-sizing:border-box;text-transform:uppercase;">
<input id="ups-mp-nv" type="text" placeholder="R$" style="width:90px;padding:4px;border:1px solid #ccc;border-radius:4px;font-size:11px;">
<button id="ups-mp-na" style="padding:4px 10px;background:#4078f2;color:white;border:none;border-radius:4px;cursor:pointer;font-size:14px;line-height:1;">+</button>
</div>
<div id="ups-mp-no" style="font-size:11px;min-height:14px;color:#666;"></div>
</div>
</div>
</div>

<div class="ups-ac">
<div class="ups-ac-h" data-ups-body="ups-ab-4">
<span>🛠 Editar em Massa</span>
<span class="ups-ac-ar">▶</span>
<label style="position:relative;display:inline-block;width:36px;height:20px;margin-left:auto;cursor:pointer;" onclick="event.stopPropagation()">
<input type="checkbox" id="ups-ma-ativar" checked style="opacity:0;width:0;height:0;margin:0;">
<span id="ups-ma-slider" style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;border-radius:20px;transition:.3s;"></span>
</label>
</div>
<div class="ups-ac-body" id="ups-ab-4">
<div class="ups-ac-body-inner">
<label style="font-size:12px;font-weight:600;display:block;margin-bottom:3px;">Macros Salvos</label>
<select id="ups-ma-select" style="width:100%;padding:4px;border:1px solid #ccc;border-radius:4px;font-size:11px;box-sizing:border-box;"><option value="">Carregar Salvo...</option></select>
<div style="display:flex;gap:3px;margin-top:4px;">
<input id="ups-ma-nome-salvar" type="text" placeholder="Nome do macro" style="flex:1;padding:4px;border:1px solid #ccc;border-radius:4px;font-size:11px;">
<button id="ups-ma-salvar" style="padding:4px 10px;background:#4078f2;color:white;border:none;border-radius:4px;cursor:pointer;font-size:14px;line-height:1;">💾</button>
</div>
<button id="ups-ma-excluir" style="display:none;width:100%;margin-top:4px;padding:3px;border:1px solid #dc3545;color:#dc3545;border-radius:4px;cursor:pointer;font-size:11px;background:white;">× Excluir</button>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
<div>
<label style="font-size:12px;font-weight:600;display:block;margin-bottom:2px;">Quantidade</label>
<input id="ups-ma-eq" type="text" placeholder="Ex: 100" style="width:100%;padding:6px;border:1px solid #ccc;border-radius:4px;font-size:13px;box-sizing:border-box;">
</div>
<div>
<label style="font-size:12px;font-weight:600;display:block;margin-bottom:2px;">Preço(R$) (regular)</label>
<input id="ups-ma-ep" type="text" placeholder="Ex: 89,90" style="width:100%;padding:6px;border:1px solid #ccc;border-radius:4px;font-size:13px;box-sizing:border-box;">
</div>
<div>
<label style="font-size:12px;font-weight:600;display:block;margin-bottom:2px;">Peso(g)</label>
<input id="ups-ma-ew" type="text" placeholder="Ex: 200" style="width:100%;padding:6px;border:1px solid #ccc;border-radius:4px;font-size:13px;box-sizing:border-box;">
</div>
<div>
<label style="font-size:12px;font-weight:600;display:block;margin-bottom:2px;">Pacote(cm) (CxLxA)</label>
<input id="ups-ma-epkg" type="text" placeholder="21x12x21" style="width:100%;padding:6px;border:1px solid #ccc;border-radius:4px;font-size:13px;box-sizing:border-box;">
</div>
</div>
    <div style="display:flex;gap:8px;align-items:center;margin-bottom:4px;">
    <label style="font-size:12px;font-weight:600;">Subespecificação</label>
    <label style="position:relative;display:inline-block;width:30px;height:16px;cursor:pointer;">
    <input type="checkbox" id="ups-ma-sub-ativar" checked style="opacity:0;width:0;height:0;margin:0;">
    <span style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;border-radius:16px;transition:.3s;"></span>
    </label>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:4px;padding:5px 6px;border:1px solid #ccc;border-radius:4px;min-height:32px;align-items:center;cursor:text;" id="ups-ma-sub-wrapper" onclick="document.getElementById('ups-ma-sub-input').focus()">
    <input type="hidden" id="ups-ma-sub" value="">
    <div id="ups-ma-sub-tags" style="display:flex;flex-wrap:wrap;gap:4px;align-items:center;"></div>
    <input id="ups-ma-sub-input" type="text" placeholder="Tamanhos (vírgula ou Enter)" style="border:none;outline:none;flex:1;min-width:80px;padding:0;font-size:13px;background:transparent;">
    </div>
    <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px;">
    <label style="font-size:13px;font-weight:600;display:flex;align-items:center;gap:4px;white-space:nowrap;">
    <input type="checkbox" id="ups-ma-sku" style="margin:0;"> Gerar SKU
    </label>
    <label style="font-size:13px;font-weight:600;display:flex;align-items:center;gap:4px;white-space:nowrap;">
    <input type="checkbox" id="ups-ma-gtin" style="margin:0;"> Gerar GTIN
    </label>
    <label style="font-size:13px;font-weight:600;display:flex;align-items:center;gap:4px;white-space:nowrap;">
    <input type="checkbox" id="ups-ma-confirmar-cor" style="margin:0;"> Confirmar cores?
    </label>
    <label style="font-size:13px;font-weight:600;display:flex;align-items:center;gap:4px;white-space:nowrap;">
    <input type="checkbox" id="ups-ma-remap-cor" style="margin:0;"> Renomear C
    </label>
    </div>
    </div>
    </div>
    </div>

<div class="ups-ac">
<div class="ups-ac-h" data-ups-body="ups-ab-5">
<span>🏷 Atributos</span>
<span class="ups-ac-ar">▶</span>
<label style="position:relative;display:inline-block;width:36px;height:20px;margin-left:auto;cursor:pointer;" onclick="event.stopPropagation()">
<input type="checkbox" id="ups-ac-t-atr" checked style="opacity:0;width:0;height:0;margin:0;">
<span id="ups-ac-s-atr" style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;border-radius:20px;transition:.3s;"></span>
</label>
</div>
<div class="ups-ac-body" id="ups-ab-5">
<div class="ups-ac-body-inner">
<label style="font-size:12px;font-weight:600;display:block;margin-bottom:3px;">Presets de Atributos</label>
<select id="ups-atr-carregar" style="width:100%;padding:4px;border:1px solid #ccc;border-radius:4px;font-size:11px;box-sizing:border-box;"><option value="">Carregar Salvo...</option></select>
<div style="display:flex;gap:3px;margin-top:4px;">
<input id="ups-atr-nome" type="text" placeholder="Nome do preset" style="flex:1;padding:4px;border:1px solid #ccc;border-radius:4px;font-size:11px;">
<button id="ups-atr-salvar" style="padding:4px 10px;background:#4078f2;color:white;border:none;border-radius:4px;cursor:pointer;font-size:14px;line-height:1;">💾</button>
</div>
<button id="ups-atr-excluir" style="display:none;width:100%;margin-top:4px;padding:3px;border:1px solid #dc3545;color:#dc3545;border-radius:4px;cursor:pointer;font-size:11px;background:white;">× Excluir</button>
<div style="font-size:11px;color:#666;margin-top:4px;">Salva os atributos manualmente configurados para aplicar em anúncios futuros da mesma categoria.</div>
</div>
</div>
</div>

<div class="ups-ac">
<div class="ups-ac-h" data-ups-body="ups-ab-3">
<span>🔄 Multi-Aba</span>
<span class="ups-ac-ar">▶</span>
<label style="position:relative;display:inline-block;width:36px;height:20px;margin-left:auto;cursor:pointer;" onclick="event.stopPropagation()">
<input type="checkbox" id="ups-ac-t-multi" style="opacity:0;width:0;height:0;margin:0;">
<span id="ups-ac-s-multi" style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;border-radius:20px;transition:.3s;"></span>
</label>
</div>
<div class="ups-ac-body" id="ups-ab-3">
<div class="ups-ac-body-inner">
<div style="margin-bottom:6px;">
  <div style="display:flex;align-items:center;justify-content:center;gap:8px;">
    <span id="ups-multi-label-seq" style="font-size:12px;font-weight:600;color:#888;transition:color .25s;">SEQUENCIAL</span>
    <div id="ups-multi-toggle" style="position:relative;width:44px;height:22px;background:#4caf50;border-radius:11px;cursor:pointer;transition:background .25s;" data-modo="cascata">
      <div id="ups-multi-knob" style="position:absolute;top:2px;right:2px;width:18px;height:18px;background:white;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,0.2);transition:all .25s;"></div>
    </div>
    <span id="ups-multi-label-par" style="font-size:12px;font-weight:600;color:#4caf50;transition:color .25s;">PARALELO</span>
  </div>
  <div id="ups-multi-desc" style="font-size:11px;color:#666;margin-top:4px;line-height:1.4;text-align:center;">Distribui as abas em janelas separadas e executa todas ao mesmo tempo.</div>
</div>
<div style="font-size:12px;color:#999;line-height:1.5;">Aplica as configuracoes desta overlay em todas as abas de edicao abertas automaticamente.</div>
</div>
</div>
</div>

<div style="display:flex;gap:8px;justify-content:flex-end;border-top:1px solid #eee;padding-top:10px;margin-top:8px;">
<button id="ups-mc" style="padding:7px 16px;border:1px solid #ccc;border-radius:4px;cursor:pointer;font-size:13px;background:white;">Cancelar</button>
  <button id="ups-mk" style="padding:7px 16px;background:#28a745;color:white;border:none;border-radius:4px;cursor:pointer;font-weight:bold;font-size:13px;">EXECUTAR</button>
</div>
</div>`;
  document.body.appendChild(overlay);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay.firstElementChild) {
      salvarEstadoMedidas();
      overlay.remove();
    }
  });

  // Accordion: click header to toggle body (smooth slide), close others
  function abrirAc(bodyEl) {
    bodyEl.style.maxHeight = bodyEl.scrollHeight + 'px';
  }
  function fecharAc(bodyEl) {
    bodyEl.style.maxHeight = '0';
  }
  document.querySelectorAll('.ups-ac-h').forEach(h => {
    h.addEventListener('click', () => {
      const bodyId = h.getAttribute('data-ups-body');
      const item = h.closest('.ups-ac');
      const isOpen = item.getAttribute('data-ups-open') === '1';
      if (isOpen) {
        item.setAttribute('data-ups-open', '0');
        fecharAc(document.getElementById(bodyId));
        h.querySelector('.ups-ac-ar').textContent = '▶';
      } else {
        item.setAttribute('data-ups-open', '1');
        document.querySelectorAll('.ups-ac[data-ups-open="1"]').forEach(openItem => {
          if (openItem !== item) {
            openItem.setAttribute('data-ups-open', '0');
            fecharAc(document.getElementById(openItem.querySelector('.ups-ac-h').getAttribute('data-ups-body')));
            openItem.querySelector('.ups-ac-ar').textContent = '▶';
          }
        });
        abrirAc(document.getElementById(bodyId));
        h.querySelector('.ups-ac-ar').textContent = '▼';
      }
    });
  });

  // Toggle Paralelo / Sequencial
  var multiToggle = document.getElementById('ups-multi-toggle');
  if (multiToggle) {
    multiToggle.onclick = function() {
      var current = this.getAttribute('data-modo');
      var next = current === 'cascata' ? 'sequencial' : 'cascata';
      this.setAttribute('data-modo', next);
      var isCascata = next === 'cascata';
      var knob = document.getElementById('ups-multi-knob');
      var labelSeq = document.getElementById('ups-multi-label-seq');
      var labelPar = document.getElementById('ups-multi-label-par');
      var desc = document.getElementById('ups-multi-desc');
      if (isCascata) {
        this.style.background = '#4caf50';
        knob.style.left = 'auto'; knob.style.right = '2px';
        labelSeq.style.color = '#888'; labelPar.style.color = '#4caf50';
        if (desc) desc.textContent = 'Distribui as abas em janelas separadas e executa todas ao mesmo tempo.';
      } else {
        this.style.background = '#ff9800';
        knob.style.left = '2px'; knob.style.right = 'auto';
        labelSeq.style.color = '#ff9800'; labelPar.style.color = '#888';
        if (desc) desc.textContent = 'Processa uma aba por vez, na mesma janela.';
      }
    };
  }

  const body = document.getElementById('ups-mm-body');
  let selectedTable = '';
  let precoTabela = null;
  let precoUltimo = null;
  const listaTam = ["PP","P","M","G","GG","EGG","G1","G2","G3","G4","G5","2","4","6","8","10","12","14","16"];

  // --- Novo preço: overrides locais ---
  window.__upsNovoPrecoOverrides = {};

  function renderOverridesNovo(overrides) {
    const c = document.getElementById('ups-mp-no');
    if (!c) return;
    const keys = Object.keys(overrides);
    if (keys.length === 0) { c.innerHTML = '<span style="color:#999;font-size:11px;">Nenhum</span>'; return; }
    c.innerHTML = keys.map(t =>
      '<span style="display:inline-flex;align-items:center;background:#e8f5e9;border:1px solid #c8e6c9;border-radius:3px;padding:1px 6px;font-size:11px;margin:2px;gap:2px;">' +
      '<b>' + t + '</b>: R$ ' + overrides[t] +
      ' <span data-ov-del="' + t + '" style="cursor:pointer;color:#dc3545;margin-left:2px;font-size:13px;font-weight:bold;padding:0 2px;">×</span></span>'
    ).join('');
    c.removeEventListener('click', c._ovClickHandler);
    c._ovClickHandler = function(e) {
      var del = e.target.closest('[data-ov-del]');
      if (del) { delete overrides[del.getAttribute('data-ov-del')]; renderOverridesNovo(overrides); }
    };
    c.addEventListener('click', c._ovClickHandler);
  }

  function extrairTamanhosDaTabela() {
    // Ler direto do storage (evita problemas com scroll virtual do VXE)
    return new Promise((resolve) => {
      chrome.storage.local.get(["biblioteca", "ultimaSelecionada"], (res) => {
        const bib = res.biblioteca || {};
        const sel = res.ultimaSelecionada || '';
        const dados = bib[sel];
        if (dados) {
          const chavesFixas = new Set(['descricao','topicos','macros','precos','emMassa','sku','ativar','sub','quantidade','preco','peso','pacote','paisOrigem']);
          const tamanhos = Object.keys(dados).filter(k => !chavesFixas.has(k) && dados[k] && typeof dados[k] === 'object' && (dados[k].b || dados[k].c));
          console.log('[UPS-med] Tamanhos do storage:', tamanhos);
          resolve(tamanhos.sort((a, b) => {
            const order = ["PP","P","M","G","GG","EGG","G1","G2","G3","G4","G5","2","4","6","8","10","12","14","16"];
            const ai = order.indexOf(a), bi = order.indexOf(b);
            if (ai !== -1 && bi !== -1) return ai - bi;
            if (ai !== -1) return -1;
            if (bi !== -1) return 1;
            return a.localeCompare(b);
          }));
          return;
        }
        // Fallback: ler do DOM
        const table = document.querySelector('.vxe-table');
        console.log('[UPS-med] Fallback DOM - Tabela:', !!table);
        if (!table) { resolve([]); return; }
        const allHeaders = table.querySelectorAll('.vxe-header--column');
        let tamCol = 'col_3';
        allHeaders.forEach((cell) => {
          const txt = cell.textContent.trim().toLowerCase();
          if (!txt) return;
          const cls = Array.from(cell.classList).find(c => c.startsWith('col_'));
          if (!cls) return;
          if (txt === 'tamanho' || (txt.includes('tamanho') && !txt.includes('pacote')) || ['variação', 'grade'].some(k => txt.includes(k))) tamCol = cls;
        });
        const listaTamanhos = ["PP","P","M","G","GG","EGG","G1","G2","G3","G4","G5","2","4","6","8","10","12","14","16"];
        const rows = table.querySelectorAll('.vxe-body--row');
        const encontrados = new Set();
        rows.forEach(row => {
          try {
            const tamEl = row.querySelector('.' + tamCol);
            if (!tamEl) return;
            const tamText = tamEl.textContent.trim().toUpperCase();
            const tam = listaTamanhos.reduce((found, t) => tamText.includes(t) ? (t.length > found.length ? t : found) : found, '');
            if (tam) encontrados.add(tam);
          } catch (e) { /* skip */ }
        });
        resolve(Array.from(encontrados).sort((a, b) => {
          const order = ["PP","P","M","G","GG","EGG","G1","G2","G3","G4","G5","2","4","6","8","10","12","14","16"];
          return order.indexOf(a) - order.indexOf(b);
        }));
      });
    });
  }

  document.getElementById('ups-mp-na').onclick = () => {
    const tam = document.getElementById('ups-mp-nt').value.trim().toUpperCase();
    const val = document.getElementById('ups-mp-nv').value.trim();
    if (!tam || !val) return;
    const overrides = window.__upsNovoPrecoOverrides || {};
    overrides[tam] = val;
    window.__upsNovoPrecoOverrides = overrides;
    document.getElementById('ups-mp-nt').value = '';
    document.getElementById('ups-mp-nv').value = '';
    document.getElementById('ups-mp-nt').focus();
    renderOverridesNovo(overrides);
  };

  // --- Feedback toast ---
  function mostrarToastFeedback(msg) {
    const existing = document.getElementById('ups-ma-feedback');
    if (existing) existing.remove();
    const div = document.createElement('div');
    div.id = 'ups-ma-feedback';
    div.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#28a745;color:white;padding:10px 24px;border-radius:8px;font-size:14px;font-weight:600;z-index:9999999;box-shadow:0 4px 12px rgba(0,0,0,0.2);font-family:sans-serif;';
    div.textContent = msg;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 2500);
  }

  // --- Carregar/Salvar presets de preço ---
  function preencherSelectSalvosMedidas(forceSelect) {
    const select = document.getElementById('ups-mp-carregar');
    const valAtual = select.value;
    select.innerHTML = '<option value="">Carregar Salvo...</option>';
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
      const target = forceSelect || valAtual;
      if (target && [...select.options].some(o => o.value === target)) select.value = target;
    });
  }

  function carregarPresetNoNovo(tipo, nome, cb) {
    if (!tipo || !nome) return;
    chrome.storage.local.get(["biblioteca", "bibliotecaPrecos"], (res) => {
      let dados = null;
      if (tipo === 'bib') {
        dados = (res.biblioteca || {})[nome]?.precos;
      } else {
        dados = (res.bibliotecaPrecos || {})[nome];
      }
      if (!dados) { if (cb) cb(); return; }
      document.getElementById('ups-mp-nb').value = dados.bulkPrice;
      const overrides = {};
      if (dados.overrides) Object.keys(dados.overrides).forEach(k => { overrides[k] = dados.overrides[k]; });
      window.__upsNovoPrecoOverrides = overrides;
      renderOverridesNovo(overrides);
      document.getElementById('ups-mp-nome-salvar').value = nome;
      document.getElementById('ups-mp-excluir').style.display = 'block';
      mostrarToastFeedback('Preço "' + nome + '" carregado!');
      // Carregar Em Massa vinculado (se existir)
      if (tipo === 'bib') {
        const macros = (res.biblioteca || {})[nome]?.macros;
        if (macros && macros.emMassa) {
          const em = macros.emMassa;
          if (em.quantidade) document.getElementById('ups-ma-eq').value = em.quantidade;
          if (em.preco) document.getElementById('ups-ma-ep').value = em.preco;
          if (em.peso) document.getElementById('ups-ma-ew').value = em.peso;
          if (em.pacote) document.getElementById('ups-ma-epkg').value = em.pacote;
        }
      }
      if (cb) cb();
    });
  }

  function salvarPresetMedidas() {
    const nome = document.getElementById('ups-mp-nome-salvar').value.trim();
    const bulkPrice = document.getElementById('ups-mp-nb').value.trim();
    if (!nome) return;
    if (!bulkPrice) return;
    const dados = { bulkPrice, overrides: { ...(window.__upsNovoPrecoOverrides || {}) } };
    chrome.storage.local.get(["biblioteca", "bibliotecaPrecos"], (res) => {
      const bib = res.biblioteca || {};
      const bibPrecos = res.bibliotecaPrecos || {};
      if (bib[nome]) {
        bib[nome].precos = dados;
        chrome.storage.local.set({ biblioteca: bib }, () => {
          preencherSelectSalvosMedidas();
          setTimeout(() => {
            document.getElementById('ups-mp-carregar').value = 'bib:' + nome;
          }, 500);
          document.getElementById('ups-mp-excluir').style.display = 'block';
          document.getElementById('ups-mp-nome-salvar').value = '';
          mostrarToastFeedback('Preço "' + nome + '" vinculado à tabela!');
        });
      } else if (bibPrecos[nome]) {
        bibPrecos[nome] = dados;
        chrome.storage.local.set({ bibliotecaPrecos: bibPrecos }, () => {
          preencherSelectSalvosMedidas();
          setTimeout(() => {
            document.getElementById('ups-mp-carregar').value = 'avulso:' + nome;
          }, 500);
          document.getElementById('ups-mp-excluir').style.display = 'block';
          document.getElementById('ups-mp-nome-salvar').value = '';
          mostrarToastFeedback('Preço "' + nome + '" atualizado!');
        });
      } else {
        bibPrecos[nome] = dados;
        chrome.storage.local.set({ bibliotecaPrecos: bibPrecos }, () => {
          preencherSelectSalvosMedidas();
          setTimeout(() => {
            document.getElementById('ups-mp-carregar').value = 'avulso:' + nome;
          }, 500);
          document.getElementById('ups-mp-excluir').style.display = 'block';
          document.getElementById('ups-mp-nome-salvar').value = '';
          mostrarToastFeedback('Preço "' + nome + '" salvo!');
        });
      }
    });
  }

  function deletarPresetMedidas() {
    const select = document.getElementById('ups-mp-carregar');
    const val = select.value;
    if (!val) return;
    const [tipo, ...nomeParts] = val.split(':');
    const nome = nomeParts.join(':');
    const existing = document.getElementById('ups-preco-confirm-rm');
    if (existing) existing.remove();
    const div = document.createElement('div');
    div.id = 'ups-preco-confirm-rm';
    div.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.3);z-index:9999999;display:flex;align-items:center;justify-content:center;';
    div.innerHTML = '<div style="background:white;border-radius:12px;padding:24px;width:300px;box-shadow:0 8px 32px rgba(0,0,0,0.25);text-align:center;font-family:sans-serif;">' +
      '<div style="font-size:15px;font-weight:bold;margin-bottom:12px;">Excluir "' + nome + '"?</div>' +
      '<div style="display:flex;gap:8px;justify-content:center;">' +
      '<button id="ups-preco-rm-cancelar" style="padding:7px 20px;border:1px solid #ccc;border-radius:6px;cursor:pointer;font-size:13px;background:white;">Cancelar</button>' +
      '<button id="ups-preco-rm-confirmar" style="padding:7px 20px;background:#dc3545;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:bold;font-size:13px;">Excluir</button>' +
      '</div></div>';
    document.body.appendChild(div);
    document.getElementById('ups-preco-rm-cancelar').onclick = () => div.remove();
    document.getElementById('ups-preco-rm-confirmar').onclick = () => {
      div.remove();
      chrome.storage.local.get(["biblioteca", "bibliotecaPrecos"], (res) => {
        if (tipo === 'bib') {
          const bib = res.biblioteca || {};
          if (bib[nome]) delete bib[nome].precos;
          chrome.storage.local.set({ biblioteca: bib }, () => {
            preencherSelectSalvosMedidas();
            document.getElementById('ups-mp-excluir').style.display = 'none';
            document.getElementById('ups-mp-nome-salvar').value = '';
            mostrarToastFeedback('Preço "' + nome + '" excluído!');
          });
        } else {
          const bibPrecos = res.bibliotecaPrecos || {};
          delete bibPrecos[nome];
          chrome.storage.local.set({ bibliotecaPrecos: bibPrecos }, () => {
            preencherSelectSalvosMedidas();
            document.getElementById('ups-mp-excluir').style.display = 'none';
            document.getElementById('ups-mp-nome-salvar').value = '';
            mostrarToastFeedback('Preço "' + nome + '" excluído!');
          });
        }
      });
    };
  }

  function expandirAcordeao(bodyId) {
    const body = document.getElementById(bodyId);
    if (!body) return;
    const item = body.closest('.ups-ac');
    document.querySelectorAll('.ups-ac[data-ups-open="1"]').forEach(openItem => {
      if (openItem !== item) {
        openItem.setAttribute('data-ups-open', '0');
        const b = document.getElementById(openItem.querySelector('.ups-ac-h').getAttribute('data-ups-body'));
        if (b) fecharAc(b);
        openItem.querySelector('.ups-ac-ar').textContent = '▶';
      }
    });
    item.setAttribute('data-ups-open', '1');
    abrirAc(body);
    item.querySelector('.ups-ac-ar').textContent = '▼';
  }

  var mpCarregar = document.getElementById('ups-mp-carregar');
  if (mpCarregar) mpCarregar.onchange = (e) => {
    const val = e.target.value;
    if (!val) return;
    const [tipo, ...nomeParts] = val.split(':');
    carregarPresetNoNovo(tipo, nomeParts.join(':'), () => expandirAcordeao('ups-ab-2'));
  };

  var mpSalvar = document.getElementById('ups-mp-salvar');
  if (mpSalvar) mpSalvar.onclick = salvarPresetMedidas;
  var mpExcluir = document.getElementById('ups-mp-excluir');
  if (mpExcluir) mpExcluir.onclick = deletarPresetMedidas;

  chrome.storage.local.get(["biblioteca", "bibliotecaAtributos", "ultimaSelecionada", "bibliotecaPrecos", "ultimosPrecos", "ultimosMacros", "ultimoEstadoMedidas"], (res) => {
    try {
      if (!body) return;
      const bib = res.biblioteca || {};
    const nomes = Object.keys(bib).filter(n =>
      Object.keys(bib[n]).some(k => listaTam.includes(k))
    );
    const ativa = res.ultimaSelecionada || '';
    const ultimos = res.ultimosPrecos;

    selectedTable = (ativa && bib[ativa]) ? ativa : (nomes.length > 0 ? nomes[0] : '');
    const chavesFixas = new Set(['descricao','topicos','macros','precos','emMassa','sku','ativar','sub','quantidade','preco','peso','pacote','paisOrigem']);

    body.innerHTML = `
<label style="font-size:13px;font-weight:600;display:block;margin-bottom:8px;">Tabela de Medidas</label>
<div style="display:flex;gap:4px;margin-bottom:12px;align-items:center;">
<select id="ups-mt" style="flex:1;padding:8px;border:1px solid #ccc;border-radius:4px;font-size:14px;box-sizing:border-box;">
${nomes.length > 0 ? nomes.map(n => `<option value="${n}"${n === selectedTable ? ' selected' : ''}>${n}</option>`).join('') : '<option value="">Nenhuma tabela salva</option>'}
</select>
<button id="ups-mt-editar" style="padding:8px 10px;border:1px solid #4078f2;border-radius:4px;cursor:pointer;font-size:14px;background:white;color:#4078f2;white-space:nowrap;line-height:1;display:flex;align-items:center;justify-content:center;" title="Editar tabela">✏️</button>
<button id="ups-mt-novo" style="padding:8px 10px;border:1px solid #28a745;border-radius:4px;cursor:pointer;font-size:14px;background:white;color:#28a745;white-space:nowrap;line-height:1;display:flex;align-items:center;justify-content:center;" title="Criar tabela">➕</button>
<button id="ups-mt-rm" style="padding:8px 10px;border:1px solid #dc3545;border-radius:4px;cursor:pointer;font-size:14px;background:white;color:#dc3545;white-space:nowrap;line-height:1;display:flex;align-items:center;justify-content:center;${!selectedTable || !bib[selectedTable] ? 'display:none;' : ''}" title="Deletar tabela"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc3545" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></button>
</div>
<div id="ups-mt-display" style="padding:10px;background:#f9f9f9;border:1px solid #e0e0e0;border-radius:4px;font-size:12px;color:#666;"></div>`;

    if (nomes.length === 0) {
      document.getElementById('ups-mk').style.display = 'none';
    }

    preencherSelectSalvosMedidas();

    function atualizarPrecos(nome) {
      if (window.__upsLoadingPreset) return;
      chrome.storage.local.get(["biblioteca"], (res) => {
        const bibAtualizada = res.biblioteca || {};
        const dados = bibAtualizada[nome];
        precoTabela = (dados && dados.precos) || null;
        precoUltimo = (ultimos && ultimos.bulkPrice) ? ultimos : null;
        const src = precoTabela || precoUltimo;
        if (src) {
          document.getElementById('ups-mp-nb').value = src.bulkPrice || '';
          const overrides = {};
          if (src.overrides) Object.keys(src.overrides).forEach(k => { overrides[k] = src.overrides[k]; });
          window.__upsNovoPrecoOverrides = overrides;
          renderOverridesNovo(overrides);
          document.getElementById('ups-ac-t-mp').checked = true;
          document.getElementById('ups-mp-nome-salvar').value = nome;
          document.getElementById('ups-mp-excluir').style.display = precoTabela ? 'block' : 'none';
        } else {
          document.getElementById('ups-mp-nb').value = '';
          window.__upsNovoPrecoOverrides = {};
          renderOverridesNovo({});
          document.getElementById('ups-mp-nome-salvar').value = '';
          document.getElementById('ups-mp-excluir').style.display = 'none';
        }
      });
    }

    function renderDisplayMedidas(nome) {
      console.log('[UPS-med] renderDisplayMedidas chamada com:', nome);
      const display = document.getElementById('ups-mt-display');
      console.log('[UPS-med] display element:', !!display);
      if (!nome) {
        display.innerHTML = '<span style="color:#999;">(nenhuma tabela selecionada)</span>';
        return;
      }

      chrome.storage.local.get(["biblioteca"], (res) => {
        console.log('[UPS-med] storage callback - biblioteca keys:', Object.keys(res.biblioteca || {}));
        const bibAtualizada = res.biblioteca || {};
        const dados = bibAtualizada[nome];
        console.log('[UPS-med] dados para', nome, ':', dados ? 'OK' : 'NULO');

        if (!dados) {
          display.innerHTML = '<span style="color:#999;">(nenhuma tabela selecionada)</span>';
          return;
        }

        let tamanhos = Object.keys(dados).filter(k => !chavesFixas.has(k) && dados[k] && typeof dados[k] === 'object' && (dados[k].b || dados[k].c));
        console.log('[UPS-med] tamanhos filtrados:', tamanhos);
        if (tamanhos.length === 0) {
          display.innerHTML = '<span style="color:#999;">(sem tamanhos)</span>';
          return;
        }

        const ordemLetras = ['PP','P','M','G','GG','EGG','G1','G2','G3','G4','G5'];
        const ordemIndex = {};
        ordemLetras.forEach((s, i) => { ordemIndex[s.toUpperCase()] = i; });

        tamanhos.sort((a, b) => {
          const aNum = /^\d+$/.test(a);
          const bNum = /^\d+$/.test(b);
          if (aNum && bNum) return parseInt(a, 10) - parseInt(b, 10);
          if (aNum) return -1;
          if (bNum) return 1;
          const ai = ordemIndex[a.toUpperCase()];
          const bi = ordemIndex[b.toUpperCase()];
          if (ai !== undefined && bi !== undefined) return ai - bi;
          if (ai !== undefined) return -1;
          if (bi !== undefined) return 1;
          return a.localeCompare(b);
        });

        const desc = dados.descricao ? `<div style="margin-bottom:8px;font-style:italic;color:#999;font-size:12px;">${dados.descricao}</div>` : '';
        const thead = `<thead><tr style="background:#eee;"><th style="padding:4px 8px;border:1px solid #ccc;font-size:12px;text-align:left;">Tamanho</th><th style="padding:4px 8px;border:1px solid #ccc;font-size:12px;text-align:left;">Largura</th><th style="padding:4px 8px;border:1px solid #ccc;font-size:12px;text-align:left;">Altura</th></tr></thead>`;
        const tbody = tamanhos.map(t => {
          const larg = dados[t].b || '—';
          const alt = dados[t].c || '—';
          return `<tr><td style="padding:4px 8px;border:1px solid #ccc;font-size:12px;font-weight:bold;text-transform:uppercase;">${t}</td><td style="padding:4px 8px;border:1px solid #ccc;font-size:12px;">${larg}</td><td style="padding:4px 8px;border:1px solid #ccc;font-size:12px;">${alt}</td></tr>`;
        }).join('');
        display.innerHTML = desc + `<table style="width:100%;border-collapse:collapse;font-family:sans-serif;">${thead}<tbody>${tbody}</tbody></table>`;
      });
    }

    const select = document.getElementById('ups-mt');
    console.log('[UPS-med] select ups-mt:', !!select, 'value:', select ? select.value : 'N/A');

    function atualizarDesc(nome) {
      console.log('[UPS-med] atualizarDesc chamada com:', nome, 'select.value:', select ? select.value : 'N/A');
      if (!nome || typeof nome === 'object') nome = select.value;
      console.log('[UPS-med] nome resolvido:', nome);
      if (window.__upsLoadingPreset) { console.log('[UPS-med] bloqueado por __upsLoadingPreset'); return; }
      
      if (!nome) {
        document.getElementById('ups-mt-rm').style.display = 'none';
        document.getElementById('ups-mt-editar').disabled = true;
        renderDisplayMedidas(null);
        return;
      }
      
      // Buscar dados diretamente do storage
      chrome.storage.local.get(["biblioteca"], (res) => {
        if (window.__upsLoadingPreset) return;
        const bibAtualizada = res.biblioteca || {};
        const dados = bibAtualizada[nome];
        
        if (!dados) {
          document.getElementById('ups-mt-rm').style.display = 'none';
          document.getElementById('ups-mt-editar').disabled = true;
          renderDisplayMedidas(null);
          return;
        }
        
        selectedTable = nome;
        document.getElementById('ups-mt-rm').style.display = '';
        document.getElementById('ups-mt-editar').disabled = false;
        renderDisplayMedidas(nome);
        atualizarPrecos(nome);

        if (dados && dados.macros) {
          if (dados.macros.sub) document.getElementById('ups-ma-sub').value = dados.macros.sub;
          atualizarTagsSub();
          if (dados.macros.emMassa) {
            document.getElementById('ups-ma-eq').value = dados.macros.emMassa.quantidade || '';
            document.getElementById('ups-ma-ep').value = dados.macros.emMassa.preco || '';
            document.getElementById('ups-ma-ew').value = dados.macros.emMassa.peso || '';
            document.getElementById('ups-ma-epkg').value = dados.macros.emMassa.pacote || '';
          }
          document.getElementById('ups-ma-sku').checked = !!dados.macros.sku;
          document.getElementById('ups-ma-gtin').checked = !!dados.macros.gtin;
          document.getElementById('ups-ma-ativar').checked = dados.macros.ativar !== false;
          document.getElementById('ups-ma-nome-salvar').value = nome;
          document.getElementById('ups-ma-excluir').style.display = 'block';
        } else {
          document.getElementById('ups-ma-sub').value = '';
          atualizarTagsSub();
          document.getElementById('ups-ma-eq').value = '';
          document.getElementById('ups-ma-ep').value = '';
          document.getElementById('ups-ma-ew').value = '';
          document.getElementById('ups-ma-epkg').value = '';
          document.getElementById('ups-ma-sku').checked = false;
          document.getElementById('ups-ma-gtin').checked = false;
          document.getElementById('ups-ma-nome-salvar').value = '';
          document.getElementById('ups-ma-excluir').style.display = 'none';
        }
      });
    }

    window.__temEstadoSalvo = res.ultimoEstadoMedidas && Object.keys(res.ultimoEstadoMedidas).length > 0;
    console.log('[UPS-med] nomes:', nomes.length, 'selectedTable:', selectedTable, '__temEstadoSalvo:', window.__temEstadoSalvo);
    if (nomes.length > 0) {
      select.addEventListener('change', function(e) {
        console.log('[UPS-med] CHANGE disparado! value:', e.target.value);
        atualizarDesc(e.target.value);
      });
      if (!window.__temEstadoSalvo) atualizarDesc(selectedTable);
    } else {
      console.log('[UPS-med] Nenhuma tabela para adicionar listener');
    }

    function atualizarSelectMedidas(selecionar) {
      const sel = document.getElementById('ups-mt');
      if (!sel) return;
      
      chrome.storage.local.get(["biblioteca"], (res) => {
        const bibAtualizada = res.biblioteca || {};
        const atual = sel.value;
        const todos = Object.keys(bibAtualizada).filter(n => {
          const e = bibAtualizada[n];
          return Object.keys(e).some(k => !chavesFixas.has(k) && e[k] && typeof e[k] === 'object' && (e[k].b || e[k].c));
        });
        sel.innerHTML = todos.map(n => `<option value="${n}"${n === (selecionar || atual) ? ' selected' : ''}>${n}</option>`).join('');
        if (todos.length === 0) {
          sel.innerHTML = '<option value="">Nenhuma tabela salva</option>';
          document.getElementById('ups-mk').style.display = 'none';
        } else {
          document.getElementById('ups-mk').style.display = '';
        }
        // Atualizar `bib` em memória também
        Object.assign(bib, bibAtualizada);
      });
    }

    document.getElementById('ups-mt-editar').onclick = function() {
      const nome = select.value;
      if (!nome) return;
      abrirPopupEditarMedidas(nome, bib, chavesFixas, atualizarSelectMedidas, atualizarDesc);
    };

    document.getElementById('ups-mt-novo').onclick = function() {
      abrirPopupEditarMedidas(null, bib, chavesFixas, atualizarSelectMedidas, atualizarDesc);
    };

    document.getElementById('ups-mt-rm').onclick = function() {
      const nome = select.value;
      if (!nome || !bib[nome]) return;
      const div = document.createElement('div');
      div.id = 'ups-mt-confirm-rm';
      div.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.3);z-index:9999999;display:flex;align-items:center;justify-content:center;';
      div.innerHTML = '<div style="background:white;border-radius:12px;padding:24px;width:300px;box-shadow:0 8px 32px rgba(0,0,0,0.25);text-align:center;font-family:sans-serif;">' +
        '<div style="font-size:15px;font-weight:bold;margin-bottom:12px;">Excluir "' + nome + '"?</div>' +
        '<div style="display:flex;gap:8px;justify-content:center;">' +
        '<button id="ups-mt-rm-cancel" style="padding:7px 20px;border:1px solid #ccc;border-radius:6px;cursor:pointer;font-size:13px;background:white;">Cancelar</button>' +
        '<button id="ups-mt-rm-confirm" style="padding:7px 20px;background:#dc3545;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:bold;font-size:13px;">Excluir</button>' +
        '</div></div>';
      document.body.appendChild(div);
      document.getElementById('ups-mt-rm-cancel').onclick = () => div.remove();
      document.getElementById('ups-mt-rm-confirm').onclick = () => {
        div.remove();
        chrome.storage.local.get(["biblioteca"], (r) => {
          const b = r.biblioteca || {};
          if (b[nome]) {
            delete b[nome];
            chrome.storage.local.set({ biblioteca: b }, () => {
              if (bib[nome]) delete bib[nome];
              select.value = '';
              atualizarSelectMedidas('');
              atualizarDesc('');
              mostrarFeedback('Tabela "' + nome + '" excluída!', '#28a745');
            });
          }
        });
      };
    };

    const tagInput = document.getElementById('ups-ma-sub-input');
    if (tagInput) {
      tagInput.addEventListener('keydown', (e) => {
        if (e.key === ',' || e.key === 'Enter' || e.key === 'Tab' || e.key === ' ') {
          e.preventDefault();
          const val = tagInput.value.trim();
          if (val) {
            const hidden = document.getElementById('ups-ma-sub');
            const current = hidden.value ? hidden.value.split(',').map(s => s.trim()).filter(Boolean) : [];
            if (!current.includes(val.toUpperCase())) {
              current.push(val.toUpperCase());
              hidden.value = current.join(',');
            }
            tagInput.value = '';
            atualizarTagsSub();
          }
        }
        if (e.key === 'Backspace' && tagInput.value === '') {
          const hidden = document.getElementById('ups-ma-sub');
          const current = hidden.value ? hidden.value.split(',').map(s => s.trim()).filter(Boolean) : [];
          if (current.length > 0) {
            current.pop();
            hidden.value = current.join(',');
            atualizarTagsSub();
          }
        }
      });
      tagInput.addEventListener('blur', () => {
        const val = tagInput.value.trim();
        if (val) {
          const hidden = document.getElementById('ups-ma-sub');
          const current = hidden.value ? hidden.value.split(',').map(s => s.trim()).filter(Boolean) : [];
          if (!current.includes(val.toUpperCase())) {
            current.push(val.toUpperCase());
            hidden.value = current.join(',');
          }
          tagInput.value = '';
          atualizarTagsSub();
        }
      });
    }


    if (window.__temEstadoSalvo) window.__upsLoadingPreset = true;
    try { restaurarEstadoMedidas(res.ultimoEstadoMedidas); } catch(e) {}
    // Render the table display for saved state (renderDisplayMedidas not accessible inside restaurarEstadoMedidas)
    if (res.ultimoEstadoMedidas && res.ultimoEstadoMedidas.selectedTable) {
      const sel = document.getElementById('ups-mt');
      if (sel) {
        sel.value = res.ultimoEstadoMedidas.selectedTable;
        selectedTable = res.ultimoEstadoMedidas.selectedTable;
        renderDisplayMedidas(selectedTable);
      }
    }
    if (!window.__temEstadoSalvo) {
      const savedMacros = res.ultimosMacros;
      if (savedMacros) {
        if (savedMacros.sub) document.getElementById('ups-ma-sub').value = savedMacros.sub;
        if (savedMacros.emMassa) {
          document.getElementById('ups-ma-eq').value = savedMacros.emMassa.quantidade || '';
          document.getElementById('ups-ma-ep').value = savedMacros.emMassa.preco || '';
          document.getElementById('ups-ma-ew').value = savedMacros.emMassa.peso || '';
          document.getElementById('ups-ma-epkg').value = savedMacros.emMassa.pacote || '';
        }
        document.getElementById('ups-ma-sku').checked = !!savedMacros.sku;
        document.getElementById('ups-ma-gtin').checked = !!savedMacros.gtin;
        document.getElementById('ups-ma-ativar').checked = savedMacros.ativar !== false;
      }
    }

    preencherListaPresets = function() {
      chrome.storage.local.get(['bibliotecaPresetsOverlay'], (v) => {
        const presets = v.bibliotecaPresetsOverlay || {};
        const sel = document.getElementById('ups-op-select');
        const atual = window.__upsRestorePresetSelect || sel.value;
        window.__upsRestorePresetSelect = null;
        sel.innerHTML = '<option value="">Carregar Nova Configuração...</option>' + Object.keys(presets).map(n => `<option value="${n}"${n === atual ? ' selected' : ''}>${n}</option>`).join('');
        if (atual && [...sel.options].some(o => o.value === atual)) {
          sel.value = atual;
        }
      });
    }
    preencherListaPresets();
    lerEstadoOverlay = function() {
      return {
        selectedTable: selectedTable,
        bulkPrice: document.getElementById('ups-mp-nb').value.trim(),
        overrides: JSON.parse(JSON.stringify(window.__upsNovoPrecoOverrides || {})),
        ativarPreco: document.getElementById('ups-ac-t-mp').checked,
        medidasAtivo: document.getElementById('ups-ac-t-mt').checked,
        sub: document.getElementById('ups-ma-sub').value.trim(),
        emMassa: {
          quantidade: document.getElementById('ups-ma-eq').value.trim(),
          preco: document.getElementById('ups-ma-ep').value.trim(),
          peso: document.getElementById('ups-ma-ew').value.trim(),
          pacote: document.getElementById('ups-ma-epkg').value.trim()
        },
        sku: document.getElementById('ups-ma-sku').checked,
        gtin: document.getElementById('ups-ma-gtin').checked,
        ativar: document.getElementById('ups-ma-ativar').checked,
        atrPreset: document.getElementById('ups-atr-carregar').value,
        atributosAtivo: document.getElementById('ups-ac-t-atr').checked,
        mpCarregar: document.getElementById('ups-mp-carregar').value,
        mpNomeSalvar: document.getElementById('ups-mp-nome-salvar').value,
        maSelect: document.getElementById('ups-ma-select').value,
        maNomeSalvar: document.getElementById('ups-ma-nome-salvar').value,
      };
    }
    aplicarPresetOverlay = function(dados) {
      if (!dados) return;
      window.__upsLoadingPreset = true;
      if (dados.selectedTable) {
        const sel = document.getElementById('ups-mt');
        if (sel && [...sel.options].some(o => o.value === dados.selectedTable)) {
          sel.value = dados.selectedTable;
          selectedTable = dados.selectedTable;
          atualizarDesc(dados.selectedTable);
        }
      }
      // Restore price preset select
      if (dados.mpCarregar) {
        const sel = document.getElementById('ups-mp-carregar');
        if (sel && [...sel.options].some(o => o.value === dados.mpCarregar)) {
          sel.value = dados.mpCarregar;
        }
      } else {
        document.getElementById('ups-mp-carregar').value = '';
      }
      document.getElementById('ups-mp-nome-salvar').value = dados.mpNomeSalvar || '';
      document.getElementById('ups-mp-excluir').style.display = dados.mpNomeSalvar ? 'block' : 'none';
      document.getElementById('ups-mp-nb').value = dados.bulkPrice || '';
      if (dados.overrides) {
        window.__upsNovoPrecoOverrides = JSON.parse(JSON.stringify(dados.overrides));
        renderOverridesNovo(window.__upsNovoPrecoOverrides);
      }
      if (dados.emMassa) {
        document.getElementById('ups-ma-eq').value = dados.emMassa.quantidade || '';
        document.getElementById('ups-ma-ep').value = dados.emMassa.preco || '';
        document.getElementById('ups-ma-ew').value = dados.emMassa.peso || '';
        document.getElementById('ups-ma-epkg').value = dados.emMassa.pacote || '';
      }
      document.getElementById('ups-ma-sku').checked = !!dados.sku;
      document.getElementById('ups-ac-t-mp').checked = dados.ativarPreco !== false;
      document.getElementById('ups-ac-t-mt').checked = dados.medidasAtivo !== false;
      document.getElementById('ups-ma-sub').value = dados.sub || '';
      atualizarTagsSub();
      document.getElementById('ups-ma-ativar').checked = dados.ativar !== false;
      document.getElementById('ups-ac-t-atr').checked = dados.atributosAtivo !== false;
      setTimeout(() => { window.__upsLoadingPreset = false; }, 100);
    }

    salvarPresetOverlay = function(nome) {
      if (!nome) return;
      chrome.storage.local.get(['bibliotecaPresetsOverlay'], (v) => {
        const presets = v.bibliotecaPresetsOverlay || {};
        const isUpdate = !!presets[nome];
        presets[nome] = lerEstadoOverlay();
        chrome.storage.local.set({ bibliotecaPresetsOverlay: presets }, () => {
          preencherListaPresets();
          document.getElementById('ups-op-select').value = nome;
          upsDialog({ title: isUpdate ? '✅ Atualizado' : '✅ Salvo', message: 'Preset "' + nome + '" ' + (isUpdate ? 'atualizado' : 'salvo') + ' com sucesso!' });
        });
      });
    }

    preencherListaPresets();

    // ===== Macro presets =====
    function preencherSelectMacrosMedidas(forceSelect) {
      const s = document.getElementById('ups-ma-select');
      const valAtual = s.value;
      s.innerHTML = '<option value="">Selecionar...</option>';
      chrome.storage.local.get(["biblioteca", "bibliotecaMacros"], (res) => {
        const bib = res.biblioteca || {};
        const bibMacros = res.bibliotecaMacros || {};
        Object.keys(bib).forEach(nome => {
          if (bib[nome].macros) {
            const opt = document.createElement('option');
            opt.value = 'bib:' + nome;
            opt.textContent = '📏 ' + nome;
            s.appendChild(opt);
          }
        });
        Object.keys(bibMacros).forEach(nome => {
          const opt = document.createElement('option');
          opt.value = 'avulso:' + nome;
          opt.textContent = '⚙ ' + nome;
          s.appendChild(opt);
        });
        const target = forceSelect || valAtual;
        if (target && [...s.options].some(o => o.value === target)) s.value = target;
      });
    }

    function carregarMacroNoDialogMedidas(tipo, nome) {
      if (!tipo || !nome) return;
      chrome.storage.local.get(["biblioteca", "bibliotecaMacros"], (res) => {
        let dados = null;
        if (tipo === 'bib') dados = (res.biblioteca || {})[nome]?.macros;
        else dados = (res.bibliotecaMacros || {})[nome];
        if (!dados) return;
        if (window.__upsLoadingPreset) return;
        document.getElementById('ups-ma-excluir').style.display = 'block';
        document.getElementById('ups-ma-nome-salvar').value = nome;
        if (dados.sub) document.getElementById('ups-ma-sub').value = dados.sub;
        atualizarTagsSub();
        if (dados.emMassa) {
          document.getElementById('ups-ma-eq').value = dados.emMassa.quantidade || '';
          document.getElementById('ups-ma-ep').value = dados.emMassa.preco || '';
          document.getElementById('ups-ma-ew').value = dados.emMassa.peso || '';
          document.getElementById('ups-ma-epkg').value = dados.emMassa.pacote || '';
        }
      document.getElementById('ups-ma-sku').checked = !!dados.sku;
      document.getElementById('ups-ma-gtin').checked = !!dados.gtin;
        document.getElementById('ups-ma-gtin').checked = !!dados.gtin;
        document.getElementById('ups-ma-ativar').checked = dados.ativar !== false;
        mostrarToastFeedback('Macro "' + nome + '" carregada!');
      });
    }

    function salvarMacroDialogMedidas() {
      const nome = document.getElementById('ups-ma-nome-salvar').value.trim();
      if (!nome) return;
      const dados = {
        sub: document.getElementById('ups-ma-sub').value.trim(),
        emMassa: {
          quantidade: document.getElementById('ups-ma-eq').value.trim(),
          preco: document.getElementById('ups-ma-ep').value.trim(),
          peso: document.getElementById('ups-ma-ew').value.trim(),
          pacote: document.getElementById('ups-ma-epkg').value.trim()
        },
        sku: document.getElementById('ups-ma-sku').checked,
        gtin: document.getElementById('ups-ma-gtin').checked,
        ativar: document.getElementById('ups-ma-ativar').checked
      };
      chrome.storage.local.get(["biblioteca", "bibliotecaMacros"], (res) => {
        const bib = res.biblioteca || {};
        const bibMacros = res.bibliotecaMacros || {};
        if (bib[nome]) {
          bib[nome].macros = dados;
          chrome.storage.local.set({ biblioteca: bib }, () => {
            preencherSelectMacrosMedidas();
            setTimeout(() => {
              document.getElementById('ups-ma-select').value = 'bib:' + nome;
            }, 500);
            document.getElementById('ups-ma-excluir').style.display = 'block';
            document.getElementById('ups-ma-nome-salvar').value = '';
            mostrarToastFeedback('Macro "' + nome + '" vinculada à tabela!');
          });
        } else if (bibMacros[nome]) {
          bibMacros[nome] = dados;
          chrome.storage.local.set({ bibliotecaMacros: bibMacros }, () => {
            preencherSelectMacrosMedidas();
            setTimeout(() => {
              document.getElementById('ups-ma-select').value = 'avulso:' + nome;
            }, 500);
            document.getElementById('ups-ma-excluir').style.display = 'block';
            document.getElementById('ups-ma-nome-salvar').value = '';
            mostrarToastFeedback('Macro "' + nome + '" atualizada!');
          });
        } else {
          bibMacros[nome] = dados;
          chrome.storage.local.set({ bibliotecaMacros: bibMacros }, () => {
            preencherSelectMacrosMedidas();
            setTimeout(() => {
              document.getElementById('ups-ma-select').value = 'avulso:' + nome;
            }, 500);
            document.getElementById('ups-ma-excluir').style.display = 'block';
            document.getElementById('ups-ma-nome-salvar').value = '';
            mostrarToastFeedback('Macro "' + nome + '" salva!');
          });
        }
      });
    }

    function deletarMacroDialogMedidas() {
      const val = document.getElementById('ups-ma-select').value;
      if (!val) return;
      const [tipo, ...nomeParts] = val.split(':');
      const nome = nomeParts.join(':');
      const existing = document.getElementById('ups-macro-confirm-rm');
      if (existing) existing.remove();
      const div = document.createElement('div');
      div.id = 'ups-macro-confirm-rm';
      div.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.3);z-index:9999999;display:flex;align-items:center;justify-content:center;';
      div.innerHTML = '<div style="background:white;border-radius:12px;padding:24px;width:300px;box-shadow:0 8px 32px rgba(0,0,0,0.25);text-align:center;font-family:sans-serif;">' +
        '<div style="font-size:15px;font-weight:bold;margin-bottom:12px;">Excluir "' + nome + '"?</div>' +
        '<div style="display:flex;gap:8px;justify-content:center;">' +
        '<button id="ups-macro-rm-cancelar" style="padding:7px 20px;border:1px solid #ccc;border-radius:6px;cursor:pointer;font-size:13px;background:white;">Cancelar</button>' +
        '<button id="ups-macro-rm-confirmar" style="padding:7px 20px;background:#dc3545;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:bold;font-size:13px;">Excluir</button>' +
        '</div></div>';
      document.body.appendChild(div);
      document.getElementById('ups-macro-rm-cancelar').onclick = () => div.remove();
      document.getElementById('ups-macro-rm-confirmar').onclick = () => {
        div.remove();
        chrome.storage.local.get(["biblioteca", "bibliotecaMacros"], (res) => {
          if (tipo === 'bib') {
    const bib = res.biblioteca || {};
    // Migrate old biblioteca[nome].atributos → bibliotecaAtributos and clean up
    const bibAtr = res.bibliotecaAtributos || {};
    let migrated = false;
    Object.keys(bib).forEach(nome => {
      if (bib[nome].atributos && Object.keys(bib[nome].atributos).length) {
        if (!bibAtr[nome]) bibAtr[nome] = bib[nome].atributos;
        delete bib[nome].atributos;
        migrated = true;
      }
      // Remove empty orphan entries (no size keys, no descricao, no macros, no precos)
      const hasData = Object.keys(bib[nome]).some(k => listaTam.includes(k));
      if (!hasData) { delete bib[nome]; migrated = true; }
    });
    if (migrated) {
      chrome.storage.local.set({ biblioteca: bib, bibliotecaAtributos: bibAtr });
    }
            if (bib[nome]) delete bib[nome].macros;
            chrome.storage.local.set({ biblioteca: bib }, () => { preencherSelectMacrosMedidas(); });
          } else {
            const bibMacros = res.bibliotecaMacros || {};
            delete bibMacros[nome];
            chrome.storage.local.set({ bibliotecaMacros: bibMacros }, () => { preencherSelectMacrosMedidas(); });
          }
        });
      };
    }

    document.getElementById('ups-ma-select').onchange = (e) => {
      const val = e.target.value;
      if (!val) {
        document.getElementById('ups-ma-excluir').style.display = 'none';
        return;
      }
      const [tipo, ...nomeParts] = val.split(':');
      carregarMacroNoDialogMedidas(tipo, nomeParts.join(':'));
    };
    document.getElementById('ups-ma-salvar').onclick = salvarMacroDialogMedidas;
    document.getElementById('ups-ma-excluir').onclick = deletarMacroDialogMedidas;
    preencherSelectMacrosMedidas();
    document.getElementById('ups-atr-carregar').onchange = (e) => {
      const val = e.target.value;
      if (!val) { document.getElementById('ups-atr-excluir').style.display = 'none'; return; }
      const [tipo, ...nomeParts] = val.split(':');
      carregarPresetAtributos(tipo, nomeParts.join(':'));
    };
    document.getElementById('ups-atr-salvar').onclick = salvarPresetAtributos;
    document.getElementById('ups-atr-excluir').onclick = deletarPresetAtributos;
    preencherSelectAtributos();

    document.getElementById('ups-op-dados').onclick = (e) => {
      e.stopPropagation();
      const menu = document.getElementById('ups-op-dados-menu');
      if (menu) menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
    };
    const fecharMenu = (e) => {
      const menu = document.getElementById('ups-op-dados-menu');
      if (menu) menu.style.display = 'none';
    };
    document.removeEventListener('click', fecharMenu);
    document.addEventListener('click', fecharMenu);

    const CATEGORIAS_EXPORT = [
      { id: 'Overlay', rotulo: 'Presets do Usuário', desc: 'Presets, última tabela selecionada e estado da overlay', keys: ['bibliotecaPresetsOverlay','ultimaSelecionada','ultimoEstadoMedidas'] },
      { id: 'Medidas', rotulo: 'Medidas e Descrição', desc: 'Tabelas com largura/altura por tamanho', keys: ['biblioteca'] },
      { id: 'PrecoEspecial', rotulo: 'Preço com Desconto', desc: 'Preços salvos e último preço aplicado', keys: ['bibliotecaPrecos','ultimosPrecos'] },
      { id: 'EditarMassa', rotulo: 'Editar em Massa', desc: 'Macros e último macro executado', keys: ['bibliotecaMacros','ultimosMacros'] },
      { id: 'Atributos', rotulo: 'Atributos', desc: 'Atributos customizados salvos', keys: ['bibliotecaAtributos'] },
      { id: 'LinksRecentes', rotulo: 'Links Recentes', desc: 'Últimos links de imagem usados', keys: ['ultimosLinks'] },
      { id: 'RemapCustom', rotulo: 'Remap de Cores', desc: 'Remapeamento customizado de cores', keys: ['bibliotecaRemapCustom'] }
    ];

    function abrirDialogoSelecao(titulo, categorias, textoConfirmar, onConfirmar) {
      const existing = document.getElementById('ups-dlg-sel');
      if (existing) existing.remove();
      const overlay = document.createElement('div');
      overlay.id = 'ups-dlg-sel';
      overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.4);z-index:9999999;display:flex;align-items:center;justify-content:center;';
      var html = '<div style="background:white;border-radius:8px;padding:20px;width:420px;max-width:95vw;max-height:85vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,0.25);font-family:sans-serif;">';
      html += '<div style="font-size:15px;font-weight:bold;margin-bottom:4px;">' + titulo + '</div>';
      html += '<div style="font-size:11px;color:#999;margin-bottom:12px;">Marque os dados que deseja incluir</div>';
      html += '<label style="display:flex;align-items:center;gap:6px;font-size:12px;font-weight:600;cursor:pointer;margin-bottom:10px;color:#4078f2;"><input type="checkbox" id="ups-dlg-sel-all" style="cursor:pointer;" checked>Selecionar Todos</label>';
      for (var ci = 0; ci < categorias.length; ci++) {
        var cat = categorias[ci];
        var dis = cat.desabilitado ? 'disabled' : '';
        var chk = cat.marcado ? 'checked' : '';
        var op = cat.desabilitado ? 'opacity:0.45;' : '';
        html += '<label class="ups-dlg-sel-label" style="display:flex;align-items:flex-start;gap:6px;margin-bottom:8px;cursor:pointer;' + op + '">';
        html += '<input type="checkbox" class="ups-dlg-sel-cat" data-id="' + cat.id + '" ' + chk + ' ' + dis + ' style="margin-top:2px;cursor:pointer;">';
        html += '<div><div style="font-size:12px;font-weight:600;">' + cat.rotulo + '</div>';
        if (cat.desc) html += '<div style="font-size:10px;color:#888;">' + cat.desc + '</div>';
        html += '</div></label>';
      }
      html += '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px;">';
      html += '<button id="ups-dlg-sel-cancel" style="padding:6px 16px;border:1px solid #ccc;border-radius:6px;cursor:pointer;font-size:12px;background:white;">Cancelar</button>';
      html += '<button id="ups-dlg-sel-ok" style="padding:6px 16px;border:none;border-radius:6px;cursor:pointer;font-size:12px;background:#4078f2;color:white;font-weight:bold;">' + textoConfirmar + '</button></div></div>';
      overlay.innerHTML = html;
      document.body.appendChild(overlay);
      var checks = overlay.querySelectorAll('.ups-dlg-sel-cat');
      var allCb = overlay.querySelector('#ups-dlg-sel-all');
      allCb.onchange = function() { checks.forEach(function(cb) { if (!cb.disabled) cb.checked = allCb.checked; }); };
      checks.forEach(function(cb) { cb.onchange = function() {
        var allOn = true;
        checks.forEach(function(c) { if (!c.disabled && !c.checked) allOn = false; });
        allCb.checked = allOn;
      }; });
      overlay.querySelector('#ups-dlg-sel-cancel').onclick = function() { overlay.remove(); };
      overlay.querySelector('#ups-dlg-sel-ok').onclick = function() {
        var ids = [];
        checks.forEach(function(cb) { if (cb.checked && !cb.disabled) ids.push(cb.getAttribute('data-id')); });
        overlay.remove();
        if (ids.length > 0) onConfirmar(ids);
      };
      overlay.addEventListener('click', function(ev) { if (ev.target === overlay) overlay.remove(); });
    }

    document.getElementById('ups-op-export-action').onclick = function() {
      var allKeys = [];
      CATEGORIAS_EXPORT.forEach(function(c) { allKeys.push.apply(allKeys, c.keys); });
      chrome.storage.local.get(allKeys, function(res) {
        var categorias = CATEGORIAS_EXPORT.map(function(c) { return { id: c.id, rotulo: c.rotulo, desc: c.desc, marcado: true, desabilitado: false }; });
        abrirDialogoSelecao('Exportar Dados', categorias, 'Exportar', function(idsSelecionados) {
          var hoje = new Date();
          var dia = String(hoje.getDate()).padStart(2, '0');
          var mes = String(hoje.getMonth() + 1).padStart(2, '0');
          var ano = hoje.getFullYear();
          var exportData = {};
          for (var i = 0; i < idsSelecionados.length; i++) {
            var cat = CATEGORIAS_EXPORT.find(function(c) { return c.id === idsSelecionados[i]; });
            if (!cat) continue;
            for (var k = 0; k < cat.keys.length; k++) {
              var key = cat.keys[k];
              exportData[key] = res[key] !== undefined ? res[key] : (key === 'ultimaSelecionada' ? '' : {});
            }
          }
          chrome.runtime.sendMessage({ action: 'export-data', data: exportData, filename: 'upseller-backup_' + dia + '-' + mes + '-' + ano + '.json' });
        });
      });
    };

    var importInput = document.createElement('input');
    importInput.type = 'file';
    importInput.accept = '.json';
    importInput.style.display = 'none';
    document.body.appendChild(importInput);
    document.getElementById('ups-op-import-action').onclick = function() { importInput.click(); };
    importInput.onchange = function(e) {
      var arquivo = e.target.files[0];
      if (!arquivo) return;
      var reader = new FileReader();
      reader.onload = function(ev) {
        try {
          var dados = JSON.parse(ev.target.result);
          var categorias = CATEGORIAS_EXPORT.map(function(c) {
            var tem = false;
            for (var k = 0; k < c.keys.length; k++) {
              var val = dados[c.keys[k]];
              if (val !== undefined && val !== null && val !== '' && (typeof val !== 'object' || Object.keys(val).length > 0)) { tem = true; break; }
            }
            return { id: c.id, rotulo: c.rotulo, desc: c.desc, marcado: tem, desabilitado: !tem };
          });
          var algum = categorias.some(function(c) { return c.marcado; });
          if (!algum) { e.target.value = ''; mostrarToastFeedback('Arquivo não contém dados reconhecidos.'); return; }
          abrirDialogoSelecao('Importar Dados', categorias, 'Importar', function(idsSelecionados) {
            var setData = {};
            for (var i = 0; i < idsSelecionados.length; i++) {
              var cat = CATEGORIAS_EXPORT.find(function(c) { return c.id === idsSelecionados[i]; });
              if (!cat) continue;
              for (var k = 0; k < cat.keys.length; k++) {
                if (dados[cat.keys[k]] !== undefined) setData[cat.keys[k]] = dados[cat.keys[k]];
              }
            }
            if (setData.biblioteca && setData.bibliotecaAtributos) {
              var bibAtr = setData.bibliotecaAtributos;
              Object.keys(setData.biblioteca).forEach(function(nome) {
                if (setData.biblioteca[nome].atributos && Object.keys(setData.biblioteca[nome].atributos).length) {
                  if (!bibAtr[nome]) bibAtr[nome] = setData.biblioteca[nome].atributos;
                  delete setData.biblioteca[nome].atributos;
        }

              });
              setData.bibliotecaAtributos = bibAtr;
            } else if (setData.biblioteca) {
              Object.keys(setData.biblioteca).forEach(function(nome) {
                if (setData.biblioteca[nome].atributos) delete setData.biblioteca[nome].atributos;
              });
            }
            chrome.storage.local.set(setData, function() {
              try {
                e.target.value = '';
                preencherListaPresets();
                preencherSelectSalvosMedidas();
                preencherSelectMacrosMedidas();
                preencherSelectAtributos();
                mostrarToastFeedback('Backup restaurado com sucesso!');
              } catch (err2) { mostrarToastFeedback('Erro ao aplicar backup: ' + err2.message); }
            });
          });
        } catch (err) { mostrarToastFeedback('Erro ao importar: ' + err.message); }
      };
      reader.readAsText(arquivo);
    };
  } catch(e) {
    console.error('ups: abrirDialogMedidas import error', e);
  }
  });

    function preencherSelectAtributos() {
      const select = document.getElementById('ups-atr-carregar');
      const currentVal = select.value;
      select.innerHTML = '<option value="">Carregar Salvo...</option>';
      chrome.storage.local.get(["bibliotecaAtributos"], (res) => {
        const bibAtr = res.bibliotecaAtributos || {};
        Object.keys(bibAtr).forEach(nome => {
          const opt = document.createElement('option');
          opt.value = 'bib:' + nome;
          opt.textContent = '🏷 ' + nome + ' (' + Object.keys(bibAtr[nome]).length + ' attr)';
          select.appendChild(opt);
        });
        const restore = window.__upsAtrPresetRestore;
        if (restore && [...select.options].some(o => o.value === restore)) {
          select.value = restore;
        } else if (currentVal && [...select.options].some(o => o.value === currentVal)) {
          select.value = currentVal;
        }
        window.__upsAtrPresetRestore = null;
        if (select.value) {
          const [restoreTipo, ...restoreNomeParts] = select.value.split(':');
          carregarPresetAtributos(restoreTipo, restoreNomeParts.join(':'), true);
        }
      });
    }

    async function carregarPresetAtributos(tipo, nome, silent) {
      if (!tipo || !nome) return;
      chrome.storage.local.get(["bibliotecaAtributos"], (res) => {
        const bibAtr = res.bibliotecaAtributos || {};
        let dados = null;
        if (tipo === 'bib') dados = bibAtr[nome];
        else return;
        if (!dados) return;
        document.getElementById('ups-atr-nome').value = nome;
        document.getElementById('ups-atr-excluir').style.display = 'block';
        if (!silent) mostrarToastFeedback('Preset "' + nome + '" selecionado (' + Object.keys(dados).length + ' attr)');
      });
    }

    async function salvarPresetAtributos() {
      const nome = document.getElementById('ups-atr-nome').value.trim();
      if (!nome) { mostrarToastFeedback('Digite um nome para o preset'); return; }
      const attrs = await lerAtributos();
      const count = Object.keys(attrs).length;
      if (!count) { mostrarToastFeedback('Nenhum atributo configurado'); return; }
      chrome.storage.local.get(["bibliotecaAtributos"], (res) => {
        const bibAtr = res.bibliotecaAtributos || {};
        bibAtr[nome] = attrs;
        chrome.storage.local.set({ bibliotecaAtributos: bibAtr }, () => {
          preencherSelectAtributos();
          setTimeout(() => {
            document.getElementById('ups-atr-carregar').value = 'bib:' + nome;
            carregarPresetAtributos('bib', nome);
          }, 100);
          document.getElementById('ups-atr-nome').value = '';
          mostrarToastFeedback('Atributos salvos como "' + nome + '" (' + count + ' attr)');
        });
      });
    }

    function deletarPresetAtributos() {
      const nome = document.getElementById('ups-atr-nome').value.trim();
      if (!nome) return;
      chrome.storage.local.get(["bibliotecaAtributos"], (res) => {
        const bibAtr = res.bibliotecaAtributos || {};
        if (bibAtr[nome]) delete bibAtr[nome];
        chrome.storage.local.set({ bibliotecaAtributos: bibAtr }, () => {
          document.getElementById('ups-atr-nome').value = '';
          document.getElementById('ups-atr-excluir').style.display = 'none';
          preencherSelectAtributos();
          mostrarToastFeedback('Atributos excluídos');
        });
      });
  }

  salvarEstadoMedidas = function() {
    chrome.storage.local.set({
      ultimoEstadoMedidas: {
        selectedTable,
        toggles: {
          mt: document.getElementById('ups-ac-t-mt').checked,
          mp: document.getElementById('ups-ac-t-mp').checked,
          multi: document.getElementById('ups-ac-t-multi').checked,
          ativar: document.getElementById('ups-ma-ativar').checked,
          atr: document.getElementById('ups-ac-t-atr').checked
        },
        atrPreset: document.getElementById('ups-atr-carregar').value,
        bulkPrice: document.getElementById('ups-mp-nb').value.trim(),
        overrides: window.__upsNovoPrecoOverrides || {},
        macroSub: document.getElementById('ups-ma-sub').value.trim(),
        macroQtd: document.getElementById('ups-ma-eq').value.trim(),
        macroPreco: document.getElementById('ups-ma-ep').value.trim(),
        macroPeso: document.getElementById('ups-ma-ew').value.trim(),
        macroPacote: document.getElementById('ups-ma-epkg').value.trim(),
        macroSubAtivar: document.getElementById('ups-ma-sub-ativar').checked,
        macroSku: document.getElementById('ups-ma-sku').checked,
        macroGtin: document.getElementById('ups-ma-gtin').checked,
        macroConfirmarCor: document.getElementById('ups-ma-confirmar-cor').checked,
        macroRemapCor: document.getElementById('ups-ma-remap-cor').checked,
        presetSelect: document.getElementById('ups-op-select').value
      }
    });
  }

  // Tag input for subespecificação sizes
  function atualizarTagsSub() {
    const hidden = document.getElementById('ups-ma-sub');
    const container = document.getElementById('ups-ma-sub-tags');
    if (!hidden || !container) return;
    const values = hidden.value.split(',').map(s => s.trim()).filter(Boolean);
    container.innerHTML = values.map(v => `<span class="ups-tag">${v}<span class="ups-tag-rm" data-tag="${v}">×</span></span>`).join('');
    container.querySelectorAll('.ups-tag-rm').forEach(el => {
      el.onclick = (e) => {
        e.stopPropagation();
        const rem = el.getAttribute('data-tag');
        const current = document.getElementById('ups-ma-sub').value.split(',').map(s => s.trim()).filter(Boolean);
        document.getElementById('ups-ma-sub').value = current.filter(s => s !== rem).join(',');
        atualizarTagsSub();
      };
    });
  }

  function atualizarMultiHabilitado() {
    const slider = document.getElementById('ups-ac-t-multi');
    const label = slider?.parentElement;
    if (!slider) return;
    if (label) label.style.opacity = '1';
    slider.disabled = false;
  }

  function restaurarEstadoMedidas(estado) {
    if (!estado) return;
    if (estado.selectedTable) {
      const sel = document.getElementById('ups-mt');
      if (sel && [...sel.options].some(o => o.value === estado.selectedTable)) {
        sel.value = estado.selectedTable;
        selectedTable = estado.selectedTable;
      }
    }
    if (estado.atrPreset) {
      window.__upsAtrPresetRestore = estado.atrPreset;
    }
    if (estado.bulkPrice !== undefined) document.getElementById('ups-mp-nb').value = estado.bulkPrice;
    window.__upsNovoPrecoOverrides = estado.overrides ? { ...estado.overrides } : {};
    renderOverridesNovo(window.__upsNovoPrecoOverrides);
    if (estado.macroSub !== undefined) document.getElementById('ups-ma-sub').value = estado.macroSub;
    atualizarTagsSub();
    if (estado.macroQtd !== undefined) document.getElementById('ups-ma-eq').value = estado.macroQtd || '';
    if (estado.macroPreco !== undefined) document.getElementById('ups-ma-ep').value = estado.macroPreco || '';
    if (estado.macroPeso !== undefined) document.getElementById('ups-ma-ew').value = estado.macroPeso || '';
    if (estado.macroPacote !== undefined) document.getElementById('ups-ma-epkg').value = estado.macroPacote || '';
    if (estado.macroSku !== undefined) document.getElementById('ups-ma-sku').checked = !!estado.macroSku;
    if (estado.macroGtin !== undefined) document.getElementById('ups-ma-gtin').checked = !!estado.macroGtin;
    if (estado.macroConfirmarCor !== undefined) document.getElementById('ups-ma-confirmar-cor').checked = !!estado.macroConfirmarCor;
    if (estado.macroRemapCor !== undefined) document.getElementById('ups-ma-remap-cor').checked = !!estado.macroRemapCor;
    if (estado.macroSubAtivar !== undefined) document.getElementById('ups-ma-sub-ativar').checked = !!estado.macroSubAtivar;
    if (estado.presetSelect) {
      window.__upsRestorePresetSelect = estado.presetSelect;
    }
    if (estado.toggles) {
      setTimeout(() => {
        document.getElementById('ups-ac-t-mt').checked = estado.toggles.mt !== false;
        document.getElementById('ups-ac-t-mp').checked = estado.toggles.mp !== false;
        document.getElementById('ups-ac-t-multi').checked = false;
        document.getElementById('ups-ma-ativar').checked = estado.toggles.ativar !== false;
        document.getElementById('ups-ac-t-atr').checked = estado.toggles.atr === true;
      }, 50);
    }
    atualizarMultiHabilitado();
    window.__upsLoadingPreset = false;
  }



  document.getElementById('ups-mc').onclick = () => {
    salvarEstadoMedidas();
    overlay.remove();
  };

  document.getElementById('ups-op-select').addEventListener('change', function() {
    const nome = this.value;
    if (!nome) return;
    chrome.storage.local.get(['bibliotecaPresetsOverlay'], (v) => {
      const dados = (v.bibliotecaPresetsOverlay || {})[nome];
      if (dados) aplicarPresetOverlay(dados);
    });
  });

  document.getElementById('ups-op-salvar').onclick = async () => {
    const sel = document.getElementById('ups-op-select');
    const atual = sel.value;
    const nome = await upsDialog({ title: '💾 Salvar Preset', message: 'Nome do preset:', input: true, placeholder: 'Meu preset...', value: atual, okText: 'Salvar', cancel: true });
    if (!nome || !nome.trim()) return;
    salvarPresetOverlay(nome.trim());
  };

  document.getElementById('ups-op-excluir').onclick = async () => {
    const sel = document.getElementById('ups-op-select');
    const nome = sel.value;
    if (!nome) return;
    const conf = await upsDialog({ title: 'Confirmar', message: 'Excluir preset "' + nome + '"?', okText: 'Excluir', cancel: true });
    if (!conf) return;
    chrome.storage.local.get(['bibliotecaPresetsOverlay'], (v) => {
      const presets = v.bibliotecaPresetsOverlay || {};
      delete presets[nome];
      chrome.storage.local.set({ bibliotecaPresetsOverlay: presets }, () => {
        preencherListaPresets();
        document.getElementById('ups-op-select').value = '';
      });
    });
  };

  document.getElementById('ups-ac-t-multi').addEventListener('change', function() {
    if (this.checked) {
      const modal = document.createElement('div');
      modal.id = 'ups-ma-confirm-modal';
      modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.45);z-index:9999999;display:flex;align-items:center;justify-content:center;font-family:sans-serif;';
      modal.innerHTML = `
<div style="background:white;border-radius:8px;padding:24px;width:360px;box-shadow:0 8px 32px rgba(0,0,0,0.25);">
  <div style="font-size:14px;font-weight:600;margin-bottom:8px;">Ativar Multi-Aba?</div>
  <div style="font-size:13px;color:#555;margin-bottom:16px;line-height:1.5;">Isso aplicará as configurações atuais em <b>todas as abas de edição</b> abertas automaticamente. Deseja continuar?</div>
  <div style="display:flex;gap:8px;justify-content:flex-end;">
    <button id="ups-ma-confirm-cancelar" style="padding:6px 16px;border:1px solid #ccc;border-radius:4px;cursor:pointer;background:white;font-size:13px;">Cancelar</button>
    <button id="ups-ma-confirm-confirmar" style="padding:6px 16px;background:#28a745;color:white;border:none;border-radius:4px;cursor:pointer;font-weight:bold;font-size:13px;">Confirmar</button>
  </div>
</div>`;
      document.body.appendChild(modal);
      document.getElementById('ups-ma-confirm-cancelar').onclick = () => {
        document.getElementById('ups-ac-t-multi').checked = false;
        modal.remove();
      };
      document.getElementById('ups-ma-confirm-confirmar').onclick = () => {
        modal.remove();
      };
    }
  });

    document.getElementById('ups-mk').onclick = async () => {
    if (!selectedTable) return;

    salvarEstadoMedidas();
    document.getElementById('upseller-shopee-overlay').style.display = 'none';

    var medidasAtivo = document.getElementById('ups-ac-t-mt').checked;
    var precoAtivo = document.getElementById('ups-ac-t-mp').checked;
    var multiAtivo = document.getElementById('ups-ac-t-multi').checked;
    var atributosAtivo = document.getElementById('ups-ac-t-atr').checked;
    var macroAtivo = document.getElementById('ups-ma-ativar').checked;
    var bulkPrice = document.getElementById('ups-mp-nb').value.trim();
    var overrides = window.__upsNovoPrecoOverrides || {};
    var precoCheio = document.getElementById('ups-ma-ep').value.trim();
      var temSku = document.getElementById('ups-ma-sku').checked;
      var temGtin = document.getElementById('ups-ma-gtin').checked;
      var confirmarCor = document.getElementById('ups-ma-confirmar-cor').checked;
      var renomearCor = document.getElementById('ups-ma-remap-cor').checked;
      var sub = document.getElementById('ups-ma-sub').value.trim();
      var eq = document.getElementById('ups-ma-eq').value.trim();
    var ew = document.getElementById('ups-ma-ew').value.trim();
    var epkg = document.getElementById('ups-ma-epkg').value.trim();

    if (multiAtivo) {
      var atrSel = document.getElementById('ups-atr-carregar');
      var atrPr = atrSel ? atrSel.value : '';
      var mt = document.getElementById('ups-multi-toggle');
      var mm = mt ? mt.getAttribute('data-modo') : 'cascata';
      var config = { selectedTable: selectedTable, atributosAtivo: atributosAtivo, atrPreset: atrPr, multiModo: mm,
        medidasAtivo: medidasAtivo, precoAtivo: precoAtivo, macroAtivo: macroAtivo,
        bulkPrice: bulkPrice, overrides: overrides, precoCheio: precoCheio,
        temSku: temSku, temGtin: temGtin, confirmarCor: confirmarCor, renomearCor: renomearCor, sub: sub,
        subAtivar: document.getElementById('ups-ma-sub-ativar').checked, eq: eq, ew: ew, epkg: epkg };
      (function sendMultiMsg(n) {
        chrome.runtime.sendMessage({ action: 'start-multi-shopee', config: config })
          .catch(function() {
            if (n < 3) setTimeout(function() { sendMultiMsg(n + 1); }, 1000);
          });
      })(0);
      return;
    }

    if (atributosAtivo) {
      criarOverlayProgresso();
      atualizarOverlayProgresso({ message: 'Aplicando atributos...', step: 1, total: 1 });
      try {
        chrome.storage.local.get(['bibliotecaAtributos'], function(res) {
          var a2 = document.getElementById('ups-atr-carregar');
          var av = a2 ? a2.value : '';
          if (av) {
            var p = av.split(':'); var n = p.slice(1).join(':');
            var ba = res.bibliotecaAtributos || {}; var d = ba[n];
            if (d && typeof d === 'object') {
              var ks = Object.keys(d); var ta = ks.length; var cnt = 0;
              async function an() {
                if (cnt >= ta) { atualizarOverlayProgresso({ message: '\u2713 Concluído!', step: 1, total: 1 }); setTimeout(function() { removerOverlayProgresso(); }, 1500); return; }
                var k = ks[cnt]; cnt++;
                atualizarOverlayProgresso({ message: k + ' (' + cnt + '/' + ta + ')', step: cnt, total: ta });
                if (typeof expandirAtributos === 'function') expandirAtributos();
                await sleep(300);
                if (typeof aplicarAtributo === 'function') await aplicarAtributo(k, d[k]);
                an();
              }
              an();
            } else { removerOverlayProgresso(); }
          } else { removerOverlayProgresso(); }
        });
      } catch(e) { removerOverlayProgresso(); }
    }

    var totalSteps = 0;
    if (medidasAtivo) totalSteps++;
    if (sub && macroAtivo) totalSteps++;
    if (confirmarCor && macroAtivo) totalSteps++;
    if (temSku && macroAtivo) totalSteps++;
    if (temGtin && macroAtivo) totalSteps++;
    if (eq && macroAtivo) totalSteps++;
    if (ew) totalSteps++;
    if (epkg) totalSteps++;
    if (precoAtivo && (precoCheio || bulkPrice)) totalSteps++;

    if (totalSteps === 0) { if (typeof mostrarFeedback === 'function') mostrarFeedback('Nada para aplicar.', '#4078f2'); return; }

    criarOverlayProgresso();
    var sc = 0;
    function ns2(msg) { sc++; atualizarOverlayProgresso({ message: msg, step: sc, total: totalSteps }); }
    var ns = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    var LT = ['PP','P','M','G','GG','EGG','G1','G2','G3','G4','G5','2','4','6','8','10','12','14','16'];

    try {
      if (medidasAtivo) {
        chrome.storage.local.get(['biblioteca'], function(res) {
          var b = res.biblioteca || {};
          var nm = selectedTable || Object.keys(b)[0] || '';
          if (nm && b[nm] && b[nm].descricao) {
            ns2('Descrição...');
            var ta = document.querySelector('.ant-form-item textarea.ant-input');
            if (ta) { var ns2t = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set; ta.focus(); ns2t.call(ta, b[nm].descricao); ta.dispatchEvent(new Event('input', { bubbles: true })); ta.dispatchEvent(new Event('change', { bubbles: true })); ta.blur(); }
          }
          am();
        });
      } else { am(); }

      async function am() {
        var c = encontrarColunasShopee();
        try {
        if (renomearCor && macroAtivo) { ns2('Renomeando cores...'); var _rc = await renomearCoresShopee(); await sleep(800); ns2('Cores renomeadas (' + _rc + ')'); }
        if (confirmarCor && macroAtivo) { ns2('Confirmando cores...'); window.__upsCorDialogOpen = true; await mostrarDialogoConfirmarCoresShopee(); window.__upsCorDialogOpen = false; ns2('Aguardando tabela...'); await sleep(1500); if (precoAtivo && (precoCheio || bulkPrice)) { var rp2 = document.querySelectorAll('.vxe-body--row'); rp2.forEach(function(r) { var chk = r.querySelector('.' + c.checkbox + ' .vxe-cell--checkbox'); if (chk && !chk.className.includes('is--disabled') && !chk.className.includes('is--checked')) chk.dispatchEvent(new Event('click', { bubbles: true })); }); } c = encontrarColunasShopee(); }
        } catch(e) {}
        try {
        if (sub && macroAtivo && document.getElementById('ups-ma-sub-ativar').checked) { ns2('Subespecificação (' + sub + ')...'); await subespecificacaoShopee(sub).catch(function(){}); }
        } catch(e) {}
        if (temSku && macroAtivo) { ns2('SKU...'); if (c.sku) { var g = document.querySelector('.' + c.sku + ' .my_txt_btn.f_12'); if (g) g.click(); } else if (typeof gerarSkuEmMassa === 'function') gerarSkuEmMassa(); }
        if (temGtin && macroAtivo) { ns2('GTIN...'); try { var ng = gerarGtinShopee(); } catch(e) {} }

        if (eq && macroAtivo) { ns2('Quantidade (' + eq + ')...'); try { await varrerLinhasShopee(function(r) { var cq = r.querySelector('.' + c.qtd + ' input'); if (cq && !cq.disabled) { cq.focus(); ns.call(cq, eq); cq.dispatchEvent(new Event('input', { bubbles: true })); cq.dispatchEvent(new Event('change', { bubbles: true })); cq.blur(); } }); } catch(e) {} }

        if ((ew || epkg) && garantirConfigPacoteAnuncio()) { ns2('Preparando pacote...'); await sleep(400); }

        if (ew) { ns2('Peso...'); var pv = parseFloat(ew.replace(',', '.')); if (!isNaN(pv)) { var pk = pv >= 1 ? (pv / 1000).toFixed(3).replace('.', ',') : String(pv).replace('.', ','); var items = document.querySelectorAll('.ant-form-item'); for (var pi = 0; pi < items.length; pi++) { var pl = items[pi].querySelector('.ant-form-item-label label'); var lt = (pl && pl.textContent || '').replace('*','').trim(); if (lt === 'Peso do Pacote') { var inp = items[pi].querySelector('.ant-input-number-input'); if (inp) { inp.focus(); ns.call(inp, pk); inp.dispatchEvent(new Event('input', { bubbles: true })); inp.dispatchEvent(new Event('change', { bubbles: true })); inp.blur(); } break; } } } }

        if (epkg) { ns2('Pacote...'); var ds = epkg.split(/[xX×]/).map(function(s) { return s.trim(); }); if (ds.length >= 3) { var items3 = document.querySelectorAll('.ant-form-item'); for (var pj = 0; pj < items3.length; pj++) { var pl3 = items3[pj].querySelector('.ant-form-item-label label'); var lt3 = (pl3 && pl3.textContent || '').replace('*','').trim(); if (lt3 === 'Tamanho da Embalagem') { var inps = items3[pj].querySelectorAll('.ant-input-number-input'); if (inps.length >= 3) { [{ t: 1, v: ds[0] }, { t: 0, v: ds[1] }, { t: 2, v: ds[2] }].forEach(function(d) { var ii = inps[d.t]; if (ii) { ii.focus(); ns.call(ii, d.v); ii.dispatchEvent(new Event('input', { bubbles: true })); ii.dispatchEvent(new Event('change', { bubbles: true })); ii.blur(); } }); } break; } } } }

        if (precoAtivo && (precoCheio || bulkPrice)) { try { ns2('Preços...'); chrome.storage.local.set({ ultimosPrecos: { bulkPrice: bulkPrice, precoCheio: precoCheio, overrides: overrides } }); await varrerLinhasShopee(function(r) { var chk = r.querySelector('.' + c.checkbox + ' .vxe-cell--checkbox'); if (chk && !chk.className.includes('is--disabled') && !chk.className.includes('is--checked')) chk.dispatchEvent(new Event('click', { bubbles: true })); }); setTimeout(async function() { await varrerLinhasShopee(function(r) { var tc = r.querySelector('.' + c.tamanho); var tt = (tc && tc.textContent || '').trim().toUpperCase(); var t = LT.reduce(function(f, x) { return tt.indexOf(x) !== -1 ? (x.length > f.length ? x : f) : f; }, ''); var pc = (macroAtivo ? precoCheio : '') || bulkPrice; if (pc) { var i35 = r.querySelector('.' + c.preco + ' input.ant-input-number-input'); if (i35 && !i35.disabled) { i35.focus(); ns.call(i35, pc.replace(',', '.')); i35.dispatchEvent(new Event('input', { bubbles: true })); i35.dispatchEvent(new Event('change', { bubbles: true })); i35.blur(); } } var dv = (overrides && overrides[t]) || bulkPrice || ''; if (!dv) return; var i37 = r.querySelector('.' + c.desc + ' input.ant-input-number-input'); if (i37 && !i37.disabled) { i37.focus(); ns.call(i37, String(dv).replace(',', '.')); i37.dispatchEvent(new Event('input', { bubbles: true })); i37.dispatchEvent(new Event('change', { bubbles: true })); i37.blur(); } }); }, 300);
        } catch(e) {}
        }

        ns2('Concluido!');
        chrome.storage.local.set({ ultimosMacros: { sub: sub, emMassa: { quantidade: eq, preco: precoCheio, peso: ew, pacote: epkg }, sku: temSku, gtin: temGtin, confirmarCor: confirmarCor, renomearCor: renomearCor, subAtivar: document.getElementById('ups-ma-sub-ativar').checked, ativar: macroAtivo } });
        setTimeout(function() { removerOverlayProgresso(); }, 1500);
      }
    } catch(e) {
      if (typeof removerOverlayProgresso === 'function') removerOverlayProgresso();
      if (typeof mostrarFeedback === 'function') mostrarFeedback('Erro: ' + e.message, '#dc3545');
    }
  };
  function finalizarMacroCancelada(selTable) {
    chrome.storage.local.set({ ultimaSelecionada: selTable });
    mostrarErroOverlayProgresso('⏸ Macro cancelada');
    setTimeout(() => removerOverlayProgresso(), 2000);
  }
}
function abrirPopupEditarMedidas(nomeExistente, bib, chavesFixas, atualizarSelectMedidas, atualizarDesc) {
  const existing = document.getElementById('ups-popup-medidas');
  if (existing) existing.remove();

  // Buscar dados mais recentes do storage
  chrome.storage.local.get(["biblioteca"], (res) => {
    const bibAtualizada = res.biblioteca || {};
    const dados = (nomeExistente && bibAtualizada[nomeExistente]) ? bibAtualizada[nomeExistente] : {};

    const div = document.createElement('div');
    div.id = 'ups-popup-medidas';
    div.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;z-index:9999999;font-family:sans-serif;';
    div.addEventListener('click', function(e) { if (e.target === div) div.remove(); });

    const inner = document.createElement('div');
    inner.style.cssText = 'background:white;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.25);width:520px;max-width:95vw;max-height:85vh;overflow-y:auto;padding:16px;';

    const titulo = nomeExistente ? `Editar "${nomeExistente}"` : 'Criar Nova Tabela de Medidas';

    inner.innerHTML = `
<div style="font-size:14px;font-weight:bold;margin-bottom:10px;">${titulo}</div>
<label style="font-size:11px;font-weight:600;display:block;margin-bottom:4px;">Nome da Tabela</label>
<input id="ups-pm-nome" type="text" value="${nomeExistente || ''}" placeholder="Ex: PP-16" style="width:100%;padding:4px;border:1px solid #ccc;border-radius:4px;font-size:11px;box-sizing:border-box;margin-bottom:6px;" ${nomeExistente ? 'disabled' : ''}>
<label style="font-size:11px;font-weight:600;display:block;margin-bottom:4px;">Descrição</label>
<textarea id="ups-pm-desc" placeholder="Descrição do produto (opcional)..." style="width:100%;padding:4px;border:1px solid #ccc;border-radius:4px;font-size:11px;box-sizing:border-box;margin-bottom:6px;height:40px;resize:vertical;font-family:sans-serif;">${(dados.descricao || '')}</textarea>
<label style="font-size:11px;font-weight:600;display:block;margin-bottom:4px;">Tópicos (Temu)</label>
<textarea id="ups-pm-topicos" placeholder="Um tópico por linha (opcional, apenas Temu)..." style="width:100%;padding:4px;border:1px solid #ccc;border-radius:4px;font-size:11px;box-sizing:border-box;margin-bottom:6px;height:40px;resize:vertical;font-family:sans-serif;">${((dados.topicos || []).join('\n'))}</textarea>
<label style="font-size:11px;font-weight:600;display:block;margin-bottom:4px;">Tamanhos</label>
<div id="ups-pm-grid" style="margin-bottom:6px;"></div>
<div style="display:flex;gap:4px;align-items:center;margin-bottom:8px;">
<input id="ups-pm-add-tam" type="text" placeholder="Tamanho" style="width:90px;padding:3px;border:1px solid #ccc;border-radius:4px;font-size:11px;text-transform:uppercase;">
<input id="ups-pm-add-larg" type="text" placeholder="Largura" style="width:80px;padding:3px;border:1px solid #ccc;border-radius:4px;font-size:11px;">
<input id="ups-pm-add-alt" type="text" placeholder="Altura" style="width:80px;padding:3px;border:1px solid #ccc;border-radius:4px;font-size:11px;">
<button id="ups-pm-add-btn" style="padding:3px 10px;background:#4078f2;color:white;border:none;border-radius:4px;cursor:pointer;font-weight:bold;font-size:12px;">+</button>
</div>
<div style="display:flex;gap:6px;justify-content:flex-end;">
<button id="ups-pm-cancelar" style="padding:5px 14px;border:1px solid #ccc;border-radius:6px;cursor:pointer;font-size:11px;background:white;height:28px;display:flex;align-items:center;">Cancelar</button>
<button id="ups-pm-salvar" style="padding:5px 14px;background:#28a745;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:bold;font-size:11px;height:28px;display:flex;align-items:center;">Salvar</button>
${nomeExistente ? '<button id="ups-pm-excluir" style="padding:5px 14px;background:#dc3545;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:bold;font-size:11px;height:28px;display:flex;align-items:center;">Excluir Tabela</button>' : ''}
</div>`;

    document.body.appendChild(div);
    div.appendChild(inner);

    const gridDiv = document.getElementById('ups-pm-grid');
    let tabela = { ...dados };

    function renderGrid() {
      const tamanhos = Object.keys(tabela).filter(k => !chavesFixas.has(k) && tabela[k] && typeof tabela[k] === 'object' && (tabela[k].b || tabela[k].c));
      if (tamanhos.length === 0) {
        gridDiv.innerHTML = '<div style="color:#999;font-size:11px;padding:4px 0;">Nenhum tamanho adicionado.</div>';
        return;
      }
      const ordemLetras = ['PP','P','M','G','GG','EGG','G1','G2','G3','G4','G5'];
      const ordemIndex = {};
      ordemLetras.forEach((s, i) => { ordemIndex[s.toUpperCase()] = i; });
      tamanhos.sort((a, b) => {
        const aNum = /^\d+$/.test(a);
        const bNum = /^\d+$/.test(b);
        if (aNum && bNum) return parseInt(a, 10) - parseInt(b, 10);
        if (aNum) return -1;
        if (bNum) return 1;
        const ai = ordemIndex[a.toUpperCase()];
        const bi = ordemIndex[b.toUpperCase()];
        if (ai !== undefined && bi !== undefined) return ai - bi;
        if (ai !== undefined) return -1;
        if (bi !== undefined) return 1;
        return a.localeCompare(b);
      });
      gridDiv.innerHTML = `<table style="width:100%;border-collapse:collapse;font-family:sans-serif;margin-bottom:6px;">
<thead><tr style="background:#eee;"><th style="padding:2px 6px;border:1px solid #ccc;font-size:11px;text-align:left;">Tamanho</th><th style="padding:2px 6px;border:1px solid #ccc;font-size:11px;text-align:left;">Largura</th><th style="padding:2px 6px;border:1px solid #ccc;font-size:11px;text-align:left;">Altura</th><th style="padding:2px 6px;border:1px solid #ccc;font-size:11px;text-align:center;width:30px;"></th></tr></thead>
<tbody>${tamanhos.map(t => `
<tr><td style="padding:2px 6px;border:1px solid #ccc;font-size:11px;font-weight:bold;text-transform:uppercase;">${t}</td>
<td style="padding:2px 6px;border:1px solid #ccc;"><input class="ups-pm-g-b" data-tam="${t}" type="text" value="${tabela[t].b || ''}" placeholder="Largura" style="width:60px;padding:2px 4px;border:1px solid #ccc;border-radius:2px;font-size:11px;box-sizing:border-box;"></td>
<td style="padding:2px 6px;border:1px solid #ccc;"><input class="ups-pm-g-c" data-tam="${t}" type="text" value="${tabela[t].c || ''}" placeholder="Altura" style="width:60px;padding:2px 4px;border:1px solid #ccc;border-radius:2px;font-size:11px;box-sizing:border-box;"></td>
<td style="padding:2px;border:1px solid #ccc;text-align:center;"><button data-tam="${t}" class="ups-pm-rm" style="padding:0px 6px;border:1px solid #dc3545;color:#dc3545;border-radius:2px;cursor:pointer;font-size:12px;background:white;line-height:1.2;">×</button></td></tr>`).join('')}
</tbody></table>`;

      gridDiv.querySelectorAll('.ups-pm-rm').forEach(btn => {
        btn.onclick = function() {
          const tam = this.getAttribute('data-tam');
          delete tabela[tam];
          renderGrid();
        };
      });
    }

    renderGrid();

    document.getElementById('ups-pm-add-tam').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('ups-pm-add-btn').click();
    });

    document.getElementById('ups-pm-add-btn').onclick = function() {
      const tam = document.getElementById('ups-pm-add-tam').value.trim().toUpperCase();
      const larg = document.getElementById('ups-pm-add-larg').value.trim();
      const alt = document.getElementById('ups-pm-add-alt').value.trim();
      if (!tam) return;
      tabela[tam] = { b: larg || '', c: alt || '' };
      renderGrid();
      document.getElementById('ups-pm-add-tam').value = '';
      document.getElementById('ups-pm-add-larg').value = '';
      document.getElementById('ups-pm-add-alt').value = '';
      document.getElementById('ups-pm-add-tam').focus();
    };

    document.getElementById('ups-pm-cancelar').onclick = () => div.remove();

    document.getElementById('ups-pm-salvar').onclick = function() {
      const nome = document.getElementById('ups-pm-nome').value.trim();
      if (!nome) { mostrarFeedback('Dê um nome para a tabela!', '#dc3545'); return; }
      if (nome.length < 2 || nome.length > 50) { mostrarFeedback('Nome deve ter entre 2 e 50 caracteres', '#dc3545'); return; }
      const desc = document.getElementById('ups-pm-desc').value.trim();
      const topicosRaw = document.getElementById('ups-pm-topicos').value.trim();
      const topicos = topicosRaw ? topicosRaw.split('\n').map(function(l) { return l.trim(); }).filter(Boolean) : [];

      // Coletar valores do grid
      const novaTabela = { descricao: desc, topicos: topicos };
      document.querySelectorAll('.ups-pm-g-b').forEach(inp => {
        const tam = inp.getAttribute('data-tam');
        const b = inp.value;
        const c = document.querySelector(`.ups-pm-g-c[data-tam="${tam}"]`).value;
        novaTabela[tam] = { b: b || '', c: c || '' };
      });

      // Preservar macros e preços se existirem
      if (nomeExistente && dados.macros) novaTabela.macros = dados.macros;
      if (nomeExistente && dados.precos) novaTabela.precos = dados.precos;

      chrome.storage.local.get(["biblioteca"], (r) => {
        const b = r.biblioteca || {};
        b[nome] = novaTabela;
        chrome.storage.local.set({ biblioteca: b, ultimaSelecionada: nome }, () => {
          bib[nome] = novaTabela;
          if (nomeExistente && nomeExistente !== nome && bib[nomeExistente]) {
            delete bib[nomeExistente];
          }
          atualizarSelectMedidas(nome);
          atualizarDesc(nome);
          div.remove();
          mostrarFeedback('Tabela "' + nome + '" salva!', '#28a745');
        });
      });
    };

    if (nomeExistente) {
      document.getElementById('ups-pm-excluir').onclick = function() {
        const confDiv = document.createElement('div');
        confDiv.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.3);z-index:9999998;display:flex;align-items:center;justify-content:center;';
        confDiv.innerHTML = '<div style="background:white;border-radius:12px;padding:24px;width:300px;box-shadow:0 8px 32px rgba(0,0,0,0.25);text-align:center;font-family:sans-serif;">' +
          '<div style="font-size:15px;font-weight:bold;margin-bottom:12px;">Excluir "' + nomeExistente + '"?</div>' +
          '<div style="display:flex;gap:8px;justify-content:center;">' +
          '<button id="ups-pm-conf-cancelar" style="padding:7px 20px;border:1px solid #ccc;border-radius:6px;cursor:pointer;font-size:13px;background:white;">Cancelar</button>' +
          '<button id="ups-pm-conf-excluir" style="padding:7px 20px;background:#dc3545;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:bold;font-size:13px;">Excluir</button>' +
          '</div></div>';
        document.body.appendChild(confDiv);
        document.getElementById('ups-pm-conf-cancelar').onclick = () => confDiv.remove();
        document.getElementById('ups-pm-conf-excluir').onclick = () => {
          confDiv.remove();
          chrome.storage.local.get(["biblioteca"], (r) => {
            const b = r.biblioteca || {};
            if (b[nomeExistente]) {
              delete b[nomeExistente];
              chrome.storage.local.set({ biblioteca: b }, () => {
                if (bib[nomeExistente]) delete bib[nomeExistente];
                atualizarSelectMedidas('');
                atualizarDesc('');
                div.remove();
                mostrarFeedback('Tabela "' + nomeExistente + '" excluída!', '#28a745');
              });
            }
    });
  };

      };
    }
  });
}
function upsDialog(opts) {
  const existing = document.getElementById('ups-dialog-overlay');
  if (existing) existing.remove();
  const resolve = new Promise((res) => {
    const overlay = document.createElement('div');
    overlay.id = 'ups-dialog-overlay';
    overlay.innerHTML = `
<div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.4);z-index:9999999;display:flex;align-items:center;justify-content:center;">
<div style="background:#fff;border-radius:10px;padding:24px;width:400px;max-width:90vw;box-shadow:0 8px 32px rgba(0,0,0,0.25);font-family:sans-serif;text-align:center;">
<div style="font-size:16px;font-weight:600;color:#333;margin-bottom:12px;">${opts.title || ''}</div>
<div style="font-size:14px;color:#555;margin-bottom:16px;line-height:1.5;">${opts.message}</div>
${opts.input ? '<input id="ups-dialog-input" type="text" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;font-size:14px;box-sizing:border-box;margin-bottom:12px;" placeholder="' + (opts.placeholder || '') + '" value="' + (opts.value || '') + '" data-bwignore="" data-1p-ignore="" autocomplete="off">' : ''}
<div style="display:flex;gap:8px;justify-content:center;">
${opts.cancel ? '<button id="ups-dialog-cancel" style="padding:8px 20px;border:1px solid #ccc;border-radius:6px;cursor:pointer;font-size:13px;background:#fff;color:#555;">Cancelar</button>' : ''}
<button id="ups-dialog-ok" style="padding:8px 20px;border:none;border-radius:6px;cursor:pointer;font-size:13px;background:#4078f2;color:#fff;font-weight:600;">${opts.okText || 'OK'}</button>
</div>
${opts.recentLinks && opts.recentLinks.length ? '<div style="margin-top:14px;padding-top:12px;border-top:1px solid #eee;"><div style="font-size:11px;color:#999;margin-bottom:6px;">Últimos adicionados</div><div id="ups-dialog-recents" style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap;">' + opts.recentLinks.map((item, i) => '<div style="position:relative;width:54px;height:72px;"><img src="' + item.url.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;') + '" data-index="' + i + '" style="width:54px;height:72px;object-fit:cover;border-radius:4px;cursor:pointer;display:block;" onerror="this.parentElement.style.display=\'none\'"><button data-index="' + i + '" style="position:absolute;top:0;right:0;width:16px;height:16px;border:none;background:rgba(0,0,0,0.4);color:#fff;font-size:11px;line-height:16px;text-align:center;cursor:pointer;padding:0;border-radius:0 4px 0 4px;">×</button></div>').join('') + '</div></div>' : ''}
</div>
</div>`;
    document.body.appendChild(overlay);
    document.getElementById('ups-dialog-ok').onclick = () => {
      const val = opts.input ? document.getElementById('ups-dialog-input').value : true;
      overlay.remove();
      res(val);
    };
    const cancelBtn = document.getElementById('ups-dialog-cancel');
    if (cancelBtn) cancelBtn.onclick = () => { overlay.remove(); res(null); };
    overlay.addEventListener('click', (e) => { if (e.target === overlay) { overlay.remove(); res(null); } });
    document.getElementById('ups-dialog-recents')?.querySelectorAll('img').forEach((img) => {
      img.onclick = () => {
        const input = document.getElementById('ups-dialog-input');
        if (input) input.value = opts.recentLinks[parseInt(img.dataset.index)].url;
      };
    });
    document.getElementById('ups-dialog-recents')?.querySelectorAll('button').forEach((btn) => {
      btn.onclick = () => {
        const idx = parseInt(btn.dataset.index);
        chrome.storage.local.get(['ultimosLinks'], (v) => {
          let links = v.ultimosLinks || [];
          links.splice(idx, 1);
          chrome.storage.local.set({ ultimosLinks: links });
        });
        btn.parentElement.remove();
      };
    });
  });
  return resolve;
}
// ========== PREÇOS ESPECIAIS ==========
async function setPrecosCompletos(bulkPrice, overrides) {
  const table = document.querySelector('.vxe-table');
  if (!table) return { error: 'Tabela de variantes não encontrada' };

  const allHeaders = table.querySelectorAll('.vxe-header--column');
  let tamCol = 'col_3', priceCol = 'col_7';
  allHeaders.forEach((cell) => {
    const txt = cell.textContent.trim().toLowerCase();
    if (!txt) return;
    const cls = Array.from(cell.classList).find(c => c.startsWith('col_'));
    if (!cls) return;
    if (txt === 'tamanho' || (txt.includes('tamanho') && !txt.includes('pacote')) || ['variação', 'grade'].some(k => txt.includes(k))) tamCol = cls;
    if (txt.includes('desconto')) priceCol = cls;
  });

  const bodyWrapper = table.querySelector('.vxe-table--body-wrapper');
  const maxScroll = bodyWrapper ? bodyWrapper.scrollHeight - bodyWrapper.clientHeight : 0;
  const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  const scrollStep = bodyWrapper ? Math.max(bodyWrapper.clientHeight - 40, 80) : 80;

  const listaTamanhos = ["PP","P","M","G","GG","EGG","G1","G2","G3","G4","G5","2","4","6","8","10","12","14","16"];

  function setRows() {
    const rows = table.querySelectorAll('.vxe-body--row');
    let count = 0;
    rows.forEach(row => {
      try {
        const tamEl = row.querySelector('.' + tamCol);
        if (!tamEl) return;
        const tamText = tamEl.textContent.trim().toUpperCase();
        const tam = listaTamanhos.reduce((found, t) => tamText.includes(t) ? (t.length > found.length ? t : found) : found, '');
        const input = row.querySelector('.' + priceCol + ' input.ant-input-number-input');
        if (!input || input.disabled) return;
        const val = (overrides[tam] || bulkPrice);
        if (input.value !== val) {
          input.focus();
          nativeSetter.call(input, val);
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          input.blur();
          count++;
        }
      } catch (e) { /* skip row on error */ }
    });
    return count;
  }

  let total = setRows();
  if (bodyWrapper && maxScroll > 0) {
    for (let pos = scrollStep; pos < maxScroll; pos += scrollStep) {
      bodyWrapper.scrollTop = pos;
      await sleep(200);
      total += setRows();
    }
    bodyWrapper.scrollTop = maxScroll;
    await sleep(200);
    total += setRows();
  }
  if (bodyWrapper) {
    bodyWrapper.scrollLeft = 0;
    bodyWrapper.scrollTop = 0;
  }
  return { success: true, total };
}

// ===== MODAL PREÇO SHOPEE (ALT+X) =====
function abrirModalPrecoShopee() {
  var exist = document.getElementById('ups-sp-modal');
  if (exist) exist.remove();

  var ns = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  var LT = ['PP','P','M','G','GG','EGG','G1','G2','G3','G4','G5','2','4','6','8','10','12','14','16'];

  chrome.storage.local.get(['ultimosPrecos', 'ultimosMacros'], function(res) {
    var saved = res.ultimosPrecos || {};
    var savedMacros = res.ultimosMacros || {};
    var ov = window.__upsShopeeOverrides = Object.assign({}, saved.overrides || {}, window.__upsShopeeOverrides || {});

    function renderOv() {
      var el = document.getElementById('sp-ov-tags');
      if (!el) return;
      var keys = Object.keys(ov);
      el.innerHTML = keys.length === 0 ? '<span style="color:#999;font-size:11px;">Nenhum</span>' :
        keys.map(function(k) {
          return '<span style="display:inline-block;background:#e8f5e9;border:1px solid #c8e6c9;border-radius:3px;padding:1px 6px;font-size:11px;margin:2px;">' +
            k + ': R$ ' + ov[k] +
            ' <span data-ov-del="' + k + '" style="cursor:pointer;color:#dc3545;margin-left:4px;font-size:14px;font-weight:bold;padding:0 3px;">×</span></span>';
        }).join('');
    }

    function pegarValores() {
      return {
        bulkPrice: document.getElementById('sp-mp-nb').value.trim(),
        precoAtivo: document.getElementById('sp-ac-t-mp').checked,
        macroAtivo: document.getElementById('sp-ma-ativar').checked,
        precoCheio: document.getElementById('sp-ma-ep').value.trim(),
        eq: document.getElementById('sp-ma-eq').value.trim(),
        ew: document.getElementById('sp-ma-ew').value.trim(),
        epkg: document.getElementById('sp-ma-epkg').value.trim(),
        sub: document.getElementById('sp-ma-sub').value,
        subAtivar: document.getElementById('sp-ma-sub-ativar').checked,
         temSku: document.getElementById('sp-ma-sku').checked,
         temGtin: document.getElementById('sp-ma-gtin').checked,
         confirmarCor: document.getElementById('sp-ma-confirmar-cor').checked,
         renomearCor: document.getElementById('sp-ma-remap-cor').checked
        };
    }

    var div = document.createElement('div');
    div.id = 'ups-sp-modal';
    div.innerHTML =
      '<div id="sp-backdrop" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.45);z-index:9999999;display:flex;align-items:center;justify-content:center;">' +
      '<div style="background:white;border-radius:8px;padding:20px;width:420px;max-height:90vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,0.25);font-family:sans-serif;">' +
      '<div style="font-size:16px;font-weight:bold;margin-bottom:12px;text-align:center;">Preço Shopee - UpSeller</div>' +

      // Preço com Desconto
      '<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:#f8f9fa;border-radius:6px;margin-bottom:8px;font-weight:600;font-size:13px;">' +
      '<span>💰 Preço com Desconto</span>' +
      '<label style="position:relative;display:inline-block;width:36px;height:20px;margin-left:auto;cursor:pointer;">' +
      '<input type="checkbox" id="sp-ac-t-mp" checked style="opacity:0;width:0;height:0;margin:0;">' +
      '<span style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;border-radius:20px;transition:.3s;"></span>' +
      '</label></div>' +
      '<div style="padding:0 4px;">' +
      '<input id="sp-mp-nb" type="text" value="' + (saved.bulkPrice || '').replace(/"/g, '&quot;') + '" placeholder="Preço massa R$" style="width:100%;padding:5px;border:1px solid #ccc;border-radius:4px;font-size:12px;box-sizing:border-box;margin-bottom:6px;">' +
      '<label style="font-size:11px;font-weight:600;display:block;margin-bottom:2px;">Preços por tamanho</label>' +
      '<div style="display:flex;gap:3px;margin-bottom:4px;">' +
      '<input id="sp-ov-tam" type="text" placeholder="Tamanho" style="flex:1;padding:4px;border:1px solid #ccc;border-radius:4px;font-size:11px;text-transform:uppercase;">' +
      '<input id="sp-ov-val" type="text" placeholder="R$" style="width:70px;padding:4px;border:1px solid #ccc;border-radius:4px;font-size:11px;">' +
      '<button id="sp-ov-add" style="padding:4px 10px;background:#4078f2;color:white;border:none;border-radius:4px;cursor:pointer;font-size:14px;line-height:1;">+</button>' +
      '</div>' +
      '<div id="sp-ov-tags" style="margin-bottom:4px;min-height:20px;"></div>' +
      '</div>' +

      // Editar em Massa
      '<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:#f8f9fa;border-radius:6px;margin-top:12px;margin-bottom:8px;font-weight:600;font-size:13px;">' +
      '<span>🛠 Editar em Massa</span>' +
      '<label style="position:relative;display:inline-block;width:36px;height:20px;margin-left:auto;cursor:pointer;">' +
      '<input type="checkbox" id="sp-ma-ativar" checked style="opacity:0;width:0;height:0;margin:0;">' +
      '<span style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;border-radius:20px;transition:.3s;"></span>' +
      '</label></div>' +
      '<div style="padding:0 4px;">' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px;">' +
      '<div><label style="font-size:11px;font-weight:600;display:block;margin-bottom:1px;">Quantidade</label><input id="sp-ma-eq" type="text" value="' + (savedMacros.emMassa && savedMacros.emMassa.quantidade || '').replace(/"/g, '&quot;') + '" placeholder="Ex: 100" style="width:100%;padding:5px;border:1px solid #ccc;border-radius:4px;font-size:12px;box-sizing:border-box;"></div>' +
      '<div><label style="font-size:11px;font-weight:600;display:block;margin-bottom:1px;">Preço(R$) regular</label><input id="sp-ma-ep" type="text" value="' + (saved.precoCheio || savedMacros.emMassa && savedMacros.emMassa.preco || saved.bulkPrice || '').replace(/"/g, '&quot;') + '" placeholder="Ex: 89,90" style="width:100%;padding:5px;border:1px solid #ccc;border-radius:4px;font-size:12px;box-sizing:border-box;"></div>' +
      '<div><label style="font-size:11px;font-weight:600;display:block;margin-bottom:1px;">Peso(g)</label><input id="sp-ma-ew" type="text" value="' + (savedMacros.emMassa && savedMacros.emMassa.peso || '').replace(/"/g, '&quot;') + '" placeholder="Ex: 200" style="width:100%;padding:5px;border:1px solid #ccc;border-radius:4px;font-size:12px;box-sizing:border-box;"></div>' +
      '<div><label style="font-size:11px;font-weight:600;display:block;margin-bottom:1px;">Pacote(cm) CxLxA</label><input id="sp-ma-epkg" type="text" value="' + (savedMacros.emMassa && savedMacros.emMassa.pacote || '').replace(/"/g, '&quot;') + '" placeholder="21x12x21" style="width:100%;padding:5px;border:1px solid #ccc;border-radius:4px;font-size:12px;box-sizing:border-box;"></div>' +
      '</div>' +
      // Subespecificação
      '<div style="display:flex;gap:6px;align-items:center;margin-bottom:4px;">' +
      '<label style="font-size:11px;font-weight:600;">Subespecificação</label>' +
      '<label style="position:relative;display:inline-block;width:30px;height:16px;cursor:pointer;">' +
      '<input type="checkbox" id="sp-ma-sub-ativar" ' + (savedMacros.subAtivar !== false ? 'checked' : '') + ' style="opacity:0;width:0;height:0;margin:0;">' +
      '<span style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;border-radius:16px;transition:.3s;"></span>' +
      '</label></div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:4px;padding:4px 5px;border:1px solid #ccc;border-radius:4px;min-height:28px;align-items:center;cursor:text;margin-bottom:6px;" onclick="document.getElementById(\'sp-ma-sub-input\').focus()">' +
      '<input type="hidden" id="sp-ma-sub" value="' + (savedMacros.sub || '').replace(/"/g, '&quot;') + '">' +
      '<div id="sp-ma-sub-tags" style="display:flex;flex-wrap:wrap;gap:3px;align-items:center;"></div>' +
      '<input id="sp-ma-sub-input" type="text" placeholder="PP,P,M,G" style="border:none;outline:none;flex:1;min-width:60px;padding:0;font-size:12px;background:transparent;">' +
      '</div>' +
      '<div style="display:flex;gap:8px;align-items:center;margin-bottom:0;">' +
      '<label style="font-size:12px;font-weight:600;display:flex;align-items:center;gap:3px;white-space:nowrap;"><input type="checkbox" id="sp-ma-sku" ' + (savedMacros.sku ? 'checked' : '') + ' style="margin:0;"> Gerar SKU</label>' +
      '<label style="font-size:12px;font-weight:600;display:flex;align-items:center;gap:3px;white-space:nowrap;"><input type="checkbox" id="sp-ma-gtin" ' + (savedMacros.gtin ? 'checked' : '') + ' style="margin:0;"> Gerar GTIN</label>' +
      '<label style="font-size:12px;font-weight:600;display:flex;align-items:center;gap:3px;white-space:nowrap;"><input type="checkbox" id="sp-ma-confirmar-cor" ' + (savedMacros.confirmarCor ? 'checked' : '') + ' style="margin:0;"> Confirmar cores?</label>' +
      '<label style="font-size:12px;font-weight:600;display:flex;align-items:center;gap:3px;white-space:nowrap;"><input type="checkbox" id="sp-ma-remap-cor" ' + (savedMacros.renomearCor ? 'checked' : '') + ' style="margin:0;"> Renomear C</label>' +
      '</div>' +
      '</div>' +

      // Botões
      '<div style="display:flex;gap:6px;justify-content:flex-end;margin-top:14px;">' +
      '<button id="sp-cancelar" style="padding:7px 16px;border:1px solid #ccc;border-radius:4px;cursor:pointer;font-size:13px;background:white;">Cancelar</button>' +
      '<button id="sp-aplicar" style="padding:7px 16px;background:#28a745;color:white;border:none;border-radius:4px;cursor:pointer;font-weight:bold;font-size:13px;">APLICAR</button>' +
      '</div></div></div>';

    document.body.appendChild(div);
    renderOv();

    // CSS toggles
    var style = document.createElement('style');
    style.textContent = '#sp-ac-t-mp:not(:checked) + span{background:#ccc}#sp-ac-t-mp:checked + span{background:#28a745}#sp-ac-t-mp:checked + span::before,#sp-ac-t-mp:not(:checked) + span::before{content:"";position:absolute;width:16px;height:16px;border-radius:50%;background:white;top:2px;left:2px;transition:.3s}#sp-ac-t-mp:checked + span::before{transform:translateX(16px)}#sp-ma-ativar:not(:checked) + span{background:#ccc}#sp-ma-ativar:checked + span{background:#28a745}#sp-ma-ativar:checked + span::before,#sp-ma-ativar:not(:checked) + span::before{content:"";position:absolute;width:16px;height:16px;border-radius:50%;background:white;top:2px;left:2px;transition:.3s}#sp-ma-ativar:checked + span::before{transform:translateX(16px)}#sp-ma-sub-ativar:not(:checked) + span{background:#ccc}#sp-ma-sub-ativar:checked + span{background:#28a745}#sp-ma-sub-ativar:checked + span::before,#sp-ma-sub-ativar:not(:checked) + span::before{content:"";position:absolute;width:12px;height:12px;border-radius:50%;background:white;top:2px;left:2px;transition:.3s}#sp-ma-sub-ativar:checked + span::before{transform:translateX(14px)}';
    div.appendChild(style);

    // Escape to close
    div.addEventListener('keydown', function(e) { if (e.key === 'Escape') { window.__upsShopeeOverrides = {}; div.remove(); } });

    // Override add
    document.getElementById('sp-ov-add').onclick = function() {
      var tam = document.getElementById('sp-ov-tam').value.trim().toUpperCase();
      var val = document.getElementById('sp-ov-val').value.trim();
      if (!tam || !val) return;
      ov[tam] = val;
      document.getElementById('sp-ov-tam').value = '';
      document.getElementById('sp-ov-val').value = '';
      document.getElementById('sp-ov-tam').focus();
      renderOv();
    };
    div.addEventListener('ovrender', renderOv);
    document.getElementById('sp-ov-tags').addEventListener('click', function(e) {
      var del = e.target.closest('[data-ov-del]');
      if (del) { delete ov[del.getAttribute('data-ov-del')]; renderOv(); }
    });

    // Subespecificação tags
    var subInput = document.getElementById('sp-ma-sub-input');
    var subHidden = document.getElementById('sp-ma-sub');
    var subTags = document.getElementById('sp-ma-sub-tags');
    function atualizarSubTags() {
      var vals = subHidden.value.split(',').map(function(s) { return s.trim().toUpperCase(); }).filter(Boolean);
      subTags.innerHTML = vals.map(function(v) {
        return '<span style="display:inline-block;background:#e3f2fd;border:1px solid #bbdefb;border-radius:3px;padding:1px 5px;font-size:11px;">' + v +
          ' <span style="cursor:pointer;color:#999;margin-left:2px;" data-tag="' + v + '">×</span></span>';
      }).join('');
      subTags.querySelectorAll('span[data-tag]').forEach(function(s) {
        s.onclick = function() {
          var t = this.getAttribute('data-tag');
          var curr = subHidden.value.split(',').map(function(x) { return x.trim().toUpperCase(); }).filter(Boolean);
          subHidden.value = curr.filter(function(x) { return x !== t; }).join(',');
          atualizarSubTags();
        };
      });
    }
    atualizarSubTags();
    subInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        var val = subInput.value.trim().toUpperCase().replace(/,/g, '');
        if (!val) return;
        var curr = subHidden.value.split(',').map(function(s) { return s.trim().toUpperCase(); }).filter(Boolean);
        if (curr.indexOf(val) === -1) curr.push(val);
        subHidden.value = curr.join(',');
        subInput.value = '';
        atualizarSubTags();
      }
    });
    subInput.addEventListener('blur', function() {
      var val = subInput.value.trim().toUpperCase().replace(/,/g, '');
      if (val) {
        var curr = subHidden.value.split(',').map(function(s) { return s.trim().toUpperCase(); }).filter(Boolean);
        if (curr.indexOf(val) === -1) curr.push(val);
        subHidden.value = curr.join(',');
        subInput.value = '';
        atualizarSubTags();
      }
    });

    // Cancelar / click outside
    document.getElementById('sp-cancelar').onclick = function() { window.__upsShopeeOverrides = {}; div.remove(); };
    document.getElementById('sp-backdrop').addEventListener('click', function(e) { if (e.target === e.currentTarget) { window.__upsShopeeOverrides = {}; div.remove(); } });

    // Aplicar
    document.getElementById('sp-aplicar').onclick = async function() {
      var vals = pegarValores();
      chrome.storage.local.set({
        ultimosPrecos: { bulkPrice: vals.bulkPrice, precoCheio: vals.precoCheio, overrides: ov },
        ultimosMacros: { sub: vals.sub, emMassa: { quantidade: vals.eq, preco: vals.precoCheio, peso: vals.ew, pacote: vals.epkg }, sku: vals.temSku, gtin: vals.temGtin, confirmarCor: vals.confirmarCor, renomearCor: vals.renomearCor, subAtivar: vals.subAtivar, ativar: vals.macroAtivo }
      });
      window.__upsShopeeOverrides = {};
      div.remove();

      var c = encontrarColunasShopee();
      if (!c.preco && !c.qtd && !c.gtin) {
        if (typeof mostrarFeedback === 'function') mostrarFeedback('Tabela não encontrada', '#dc3545');
        return;
      }

      var totalSteps = 0;
      if (vals.confirmarCor) totalSteps++;
      if (vals.sub && vals.subAtivar) totalSteps++;
      if (vals.temSku) totalSteps++;
      if (vals.eq) totalSteps++;
      if (vals.temGtin) totalSteps++;
      if (vals.ew) totalSteps++;
      if (vals.epkg) totalSteps++;
      if (vals.macroAtivo && vals.precoCheio) totalSteps++;
      if (vals.precoAtivo && vals.bulkPrice) totalSteps++;
      var sc = 0;
      function ns2(msg) { sc++; if (typeof atualizarOverlayProgresso === 'function') atualizarOverlayProgresso({ message: msg, step: sc, total: totalSteps }); }
      if (totalSteps > 0 && typeof criarOverlayProgresso === 'function') criarOverlayProgresso();

      var msg = [];
      // A5
      if (vals.precoAtivo && vals.bulkPrice) {
        var rp = document.querySelectorAll('.vxe-body--row');
        rp.forEach(function(r) {
          var chk = r.querySelector('.' + c.checkbox + ' .vxe-cell--checkbox');
          if (chk && !chk.className.includes('is--disabled') && !chk.className.includes('is--checked'))
            chk.dispatchEvent(new Event('click', { bubbles: true }));
        });
      }

      // Macros sequenciais
      if (vals.macroAtivo) {
        // Renomear Cores (antes de confirmar/subespecificar)
        if (vals.renomearCor) { ns2('Renomeando cores...'); var _rc = await renomearCoresShopee(); await sleep(800); ns2('Cores renomeadas (' + _rc + ')'); }
        // Cores primeiro (await!)
        if (vals.confirmarCor && typeof mostrarDialogoConfirmarCoresShopee === 'function') { ns2('Confirmando cores...'); window.__upsCorDialogOpen = true; await mostrarDialogoConfirmarCoresShopee(); window.__upsCorDialogOpen = false; ns2('Aguardando tabela...'); await sleep(1500); if (vals.precoAtivo && vals.bulkPrice) { ns2('Re-marcando linhas...'); var rp3 = document.querySelectorAll('.vxe-body--row'); rp3.forEach(function(r) { var chk = r.querySelector('.' + c.checkbox + ' .vxe-cell--checkbox'); if (chk && !chk.className.includes('is--disabled') && !chk.className.includes('is--checked')) chk.dispatchEvent(new Event('click', { bubbles: true })); }); } c = encontrarColunasShopee(); }

        // Subespecificação
        if (vals.sub && vals.subAtivar && typeof subespecificacaoShopee === 'function') { ns2('Subespecificação...'); subespecificacaoShopee(vals.sub); }

        // SKU
        if (vals.temSku) { ns2('SKU...'); if (c.sku) { var g = document.querySelector('.' + c.sku + ' .my_txt_btn.f_12'); if (g) { g.click(); msg.push('SKU'); } } else if (typeof gerarSkuEmMassa === 'function') gerarSkuEmMassa(); }

        // Quantidade
        if (vals.eq && c.qtd) { ns2('Quantidade (' + vals.eq + ')...');
          document.querySelectorAll('.vxe-body--row').forEach(function(r) {
            var cq = r.querySelector('.' + c.qtd + ' input');
            if (cq && !cq.disabled) { cq.focus(); ns.call(cq, vals.eq); cq.dispatchEvent(new Event('input', { bubbles: true })); cq.dispatchEvent(new Event('change', { bubbles: true })); cq.blur(); }
          });
          msg.push('Qtd=' + vals.eq);
        }

        // GTIN
        if (vals.temGtin && c.gtin && typeof gerarGtinShopee === 'function') { ns2('GTIN...');
          var ng = gerarGtinShopee();
          if (ng) msg.push(ng + 'x GTIN');
        }

        // Garantir modo "Configurações por Anúncio" antes de aplicar peso/pacote
        if ((vals.ew || vals.epkg) && garantirConfigPacoteAnuncio()) {
          ns2('Preparando pacote...');
          await sleep(400);
        }

        // Peso
        if (vals.ew) { ns2('Peso...');
          var pv = parseFloat(vals.ew.replace(',', '.'));
          if (!isNaN(pv)) {
            var pk = pv >= 1 ? (pv / 1000).toFixed(3).replace('.', ',') : String(pv).replace('.', ',');
            var items = document.querySelectorAll('.ant-form-item');
            for (var pi = 0; pi < items.length; pi++) {
              var pl = items[pi].querySelector('.ant-form-item-label label');
              var lt = (pl && pl.textContent || '').replace('*', '').trim();
              if (lt === 'Peso do Pacote') {
                var inp = items[pi].querySelector('.ant-input-number-input');
                if (inp) { inp.focus(); ns.call(inp, pk); inp.dispatchEvent(new Event('input', { bubbles: true })); inp.dispatchEvent(new Event('change', { bubbles: true })); inp.blur(); msg.push('Peso=' + pk + 'kg'); }
                break;
              }
            }
          }
        }

        // Pacote
        if (vals.epkg) { ns2('Pacote...');
          var ds = vals.epkg.split(/[xX×]/).map(function(s) { return s.trim(); });
          if (ds.length >= 3) {
            var items3 = document.querySelectorAll('.ant-form-item');
            for (var pj = 0; pj < items3.length; pj++) {
              var pl3 = items3[pj].querySelector('.ant-form-item-label label');
              var lt3 = (pl3 && pl3.textContent || '').replace('*', '').trim();
              if (lt3 === 'Tamanho da Embalagem') {
                var inps = items3[pj].querySelectorAll('.ant-input-number-input');
                if (inps.length >= 3) {
                  [{ t: 1, v: ds[0] }, { t: 0, v: ds[1] }, { t: 2, v: ds[2] }].forEach(function(d) { var ii = inps[d.t]; if (ii) { ii.focus(); ns.call(ii, d.v); ii.dispatchEvent(new Event('input', { bubbles: true })); ii.dispatchEvent(new Event('change', { bubbles: true })); ii.blur(); } });
                  msg.push('Pacote=' + vals.epkg);
                }
                break;
              }
            }
          }
        }

        // Preço(R$) regular (editar em massa)
        if (vals.precoCheio && c.preco) { ns2('Preço(R$) ' + vals.precoCheio + '...');
          var a4c = 0;
          document.querySelectorAll('.vxe-body--row').forEach(function(r) {
            var i35 = r.querySelector('.' + c.preco + ' input.ant-input-number-input');
            if (i35) { i35.focus(); ns.call(i35, vals.precoCheio); i35.dispatchEvent(new Event('input', { bubbles: true })); i35.dispatchEvent(new Event('change', { bubbles: true })); i35.blur(); a4c++; }
          });
          if (a4c) msg.push(a4c + 'x Preço Cheio');
        }
      }

      setTimeout(function() {
        // Preços - desconto (Preço com Desconto)
        if (vals.precoAtivo && vals.bulkPrice) { ns2('Preços...');
          var rp = document.querySelectorAll('.vxe-body--row');
          var a6c = 0;
          rp.forEach(function(r) {
            if (linhaBloqueada(r)) return;
            var tc = r.querySelector('.' + c.tamanho);
            var tt = (tc && tc.textContent || '').trim().toUpperCase();
            var t = LT.reduce(function(f, x) { return tt.indexOf(x) !== -1 ? (x.length > f.length ? x : f) : f; }, '');
            var dv = (ov && ov[t]) || vals.bulkPrice || '';
            if (!dv) return;
            var i37 = r.querySelector('.' + c.desc + ' input.ant-input-number-input');
            if (i37) { i37.focus(); ns.call(i37, String(dv)); i37.dispatchEvent(new Event('input', { bubbles: true })); i37.dispatchEvent(new Event('change', { bubbles: true })); i37.blur(); a6c++; }
          });
          if (a6c) msg.push(a6c + 'x Preço Desc');
        }
        if (typeof mostrarFeedback === 'function') {
          if (msg.length) mostrarFeedback(msg.join(' | '), '#28a745');
          else mostrarFeedback('Nada para aplicar', '#4078f2');
        }
        if (typeof removerOverlayProgresso === 'function') removerOverlayProgresso();
      }, 350);
    };
  });
}

async function executarShopeeMacro(config) {
  var c = encontrarColunasShopee();
  if (!c.preco && !c.qtd && !c.gtin) {
    throw new Error('Tabela não encontrada');
  }

  var ns = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  var LT = ['PP','P','M','G','GG','EGG','G1','G2','G3','G4','G5','2','4','6','8','10','12','14','16'];
  var vals = {
    bulkPrice: config.bulkPrice || '',
    precoAtivo: config.precoAtivo || false,
    macroAtivo: config.macroAtivo || false,
    precoCheio: config.precoCheio || '',
    eq: config.eq || '',
    ew: config.ew || '',
    epkg: config.epkg || '',
    sub: config.sub || '',
    subAtivar: config.subAtivar || false,
    temSku: config.temSku || false,
    temGtin: config.temGtin || false,
    confirmarCor: config.confirmarCor || false,
    renomearCor: config.renomearCor || false
  };
  var ov = config.overrides || {};

  // Marcar checkboxes se Preço com Desconto estiver ativo
  if (vals.precoAtivo && vals.bulkPrice) {
    var rp = document.querySelectorAll('.vxe-body--row');
    rp.forEach(function(r) {
      var chk = r.querySelector('.' + c.checkbox + ' .vxe-cell--checkbox');
      if (chk && !chk.className.includes('is--disabled') && !chk.className.includes('is--checked'))
        chk.dispatchEvent(new Event('click', { bubbles: true }));
    });
  }

  // Descrição (Medidas)
  if (config.medidasAtivo) {
    var bibData = await new Promise(function(resolve) { chrome.storage.local.get(['biblioteca'], resolve); });
    var bibDados = bibData.biblioteca && bibData.biblioteca[config.selectedTable];
    if (bibDados && bibDados.descricao) {
      var ta = document.querySelector('.ant-form-item textarea.ant-input');
      if (ta) {
        var ns2m = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
        ta.focus();
        ns2m.call(ta, bibDados.descricao);
        ta.dispatchEvent(new Event('input', { bubbles: true }));
        ta.dispatchEvent(new Event('change', { bubbles: true }));
        ta.blur();
      }
    }
  }

  // Macros sequenciais
  if (vals.macroAtivo) {
    // Renomear Cores (antes de confirmar/subespecificar)
    if (vals.renomearCor) { await renomearCoresShopee(); await sleep(800); }
    // Cores primeiro
    if (vals.confirmarCor && typeof mostrarDialogoConfirmarCoresShopee === 'function') {
      window.__upsCorDialogOpen = true;
      await mostrarDialogoConfirmarCoresShopee();
      window.__upsCorDialogOpen = false;
      await sleep(1500);
      if (vals.precoAtivo && vals.bulkPrice) {
        var rp3 = document.querySelectorAll('.vxe-body--row');
        rp3.forEach(function(r) {
          var chk = r.querySelector('.' + c.checkbox + ' .vxe-cell--checkbox');
          if (chk && !chk.className.includes('is--disabled') && !chk.className.includes('is--checked'))
            chk.dispatchEvent(new Event('click', { bubbles: true }));
        });
      }
      c = encontrarColunasShopee();
    }

    // Subespecificação
    if (vals.sub && vals.subAtivar && typeof subespecificacaoShopee === 'function') {
      subespecificacaoShopee(vals.sub);
    }

    // SKU
    if (vals.temSku) {
      if (c.sku) {
        var g = document.querySelector('.' + c.sku + ' .my_txt_btn.f_12');
        if (g) g.click();
      } else if (typeof gerarSkuEmMassa === 'function') {
        gerarSkuEmMassa();
      }
    }

    // Quantidade
    if (vals.eq && c.qtd) {
      await varrerLinhasShopee(function(r) {
        var cq = r.querySelector('.' + c.qtd + ' input');
        if (cq && !cq.disabled) {
          cq.focus();
          ns.call(cq, vals.eq);
          cq.dispatchEvent(new Event('input', { bubbles: true }));
          cq.dispatchEvent(new Event('change', { bubbles: true }));
          cq.blur();
        }
      });
    }

    // GTIN
    if (vals.temGtin && c.gtin && typeof gerarGtinShopee === 'function') {
      gerarGtinShopee();
    }

    // Garantir modo "Configurações por Anúncio" antes de aplicar peso/pacote
    if ((vals.ew || vals.epkg) && garantirConfigPacoteAnuncio()) {
      await sleep(400);
    }

    // Peso
    if (vals.ew) {
      var pv = parseFloat(vals.ew.replace(',', '.'));
      if (!isNaN(pv)) {
        var pk = pv >= 1 ? (pv / 1000).toFixed(3).replace('.', ',') : String(pv).replace('.', ',');
        var items = document.querySelectorAll('.ant-form-item');
        for (var pi = 0; pi < items.length; pi++) {
          var pl = items[pi].querySelector('.ant-form-item-label label');
          var lt = (pl && pl.textContent || '').replace('*', '').trim();
          if (lt === 'Peso do Pacote') {
            var inp = items[pi].querySelector('.ant-input-number-input');
            if (inp) {
              inp.focus();
              ns.call(inp, pk);
              inp.dispatchEvent(new Event('input', { bubbles: true }));
              inp.dispatchEvent(new Event('change', { bubbles: true }));
              inp.blur();
            }
            break;
          }
        }
      }
    }

    // Pacote
    if (vals.epkg) {
      var ds = vals.epkg.split(/[xX×]/).map(function(s) { return s.trim(); });
      if (ds.length >= 3) {
        var items3 = document.querySelectorAll('.ant-form-item');
        for (var pj = 0; pj < items3.length; pj++) {
          var pl3 = items3[pj].querySelector('.ant-form-item-label label');
          var lt3 = (pl3 && pl3.textContent || '').replace('*', '').trim();
          if (lt3 === 'Tamanho da Embalagem') {
            var inps = items3[pj].querySelectorAll('.ant-input-number-input');
            if (inps.length >= 3) {
              [{ t: 1, v: ds[0] }, { t: 0, v: ds[1] }, { t: 2, v: ds[2] }].forEach(function(d) {
                var ii = inps[d.t];
                if (ii) {
                  ii.focus();
                  ns.call(ii, d.v);
                  ii.dispatchEvent(new Event('input', { bubbles: true }));
                  ii.dispatchEvent(new Event('change', { bubbles: true }));
                  ii.blur();
                }
              });
            }
            break;
          }
        }
      }
    }

    // Preço(R$) regular (editar em massa)
    if (vals.precoCheio && c.preco) {
      await varrerLinhasShopee(function(r) {
        var i35 = r.querySelector('.' + c.preco + ' input.ant-input-number-input');
        if (i35) {
          i35.focus();
          ns.call(i35, vals.precoCheio);
          i35.dispatchEvent(new Event('input', { bubbles: true }));
          i35.dispatchEvent(new Event('change', { bubbles: true }));
          i35.blur();
        }
      });
    }
  }

  // Preços - desconto (Preço com Desconto)
  await new Promise(function(resolve) {
    setTimeout(async function() {
      if (vals.precoAtivo && vals.bulkPrice) {
        await varrerLinhasShopee(function(r) {
          if (linhaBloqueada(r)) return;
          var tc = r.querySelector('.' + c.tamanho);
          var tt = (tc && tc.textContent || '').trim().toUpperCase();
          var t = LT.reduce(function(f, x) { return tt.indexOf(x) !== -1 ? (x.length > f.length ? x : f) : f; }, '');
          var dv = (ov && ov[t]) || vals.bulkPrice || '';
          if (!dv) return;
          var i37 = r.querySelector('.' + c.desc + ' input.ant-input-number-input');
          if (i37) {
            i37.focus();
            ns.call(i37, String(dv));
            i37.dispatchEvent(new Event('input', { bubbles: true }));
            i37.dispatchEvent(new Event('change', { bubbles: true }));
            i37.blur();
          }
        });
      }
      resolve();
    }, 350);
  });
}

chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
  if (msg.action === 'open-shopee-precos-dialog') abrirModalPrecoShopee();

  if (msg.action === 'show-multi-overlay') {
    criarOverlayMulti(msg.tab, msg.total);
    sendResponse({ status: 'ok' });
    return true;
  }

  if (msg.action === 'hide-multi-overlay') {
    var stepEl = document.getElementById('umo-step');
    var barEl = document.getElementById('umo-bar');
    var pctEl = document.getElementById('umo-pct');
    if (stepEl) stepEl.textContent = msg.total + ' produtos processados!';
    if (barEl) barEl.style.width = '100%';
    if (pctEl) pctEl.textContent = '100%';
    setTimeout(function() { removerOverlayMulti(); }, 300);
    sendResponse({ status: 'ok' });
    return true;
  }

  if (msg.action === 'abort-macro') {
    window.__upsCancelMacro = true;
    var cancelBtn = document.getElementById('umo-cancel');
    if (cancelBtn) { cancelBtn.textContent = '⏹ Cancelando...'; cancelBtn.disabled = true; cancelBtn.style.opacity = '0.6'; }
    sendResponse({ status: 'ok' });
    return true;
  }

  if (msg.action === 'multi-cancelled') {
    var tabEl = document.getElementById('umo-tab');
    var stepEl = document.getElementById('umo-step');
    var barEl = document.getElementById('umo-bar');
    var pctEl = document.getElementById('umo-pct');
    var cancelBtn2 = document.getElementById('umo-cancel');
    if (tabEl) tabEl.textContent = '⏸ Cancelado';
    if (stepEl) stepEl.textContent = 'Processamento interrompido';
    if (barEl) barEl.style.background = '#dc3545';
    if (pctEl) pctEl.textContent = '—';
    if (cancelBtn2) cancelBtn2.style.display = 'none';
    removerOverlayProgresso();
    setTimeout(function() { removerOverlayMulti(); }, 2000);
    sendResponse({ status: 'ok' });
    return true;
  }

  if (msg.action === 'executar-shopee-macro') {
    executarShopeeMacro(msg.config).then(function() {
      sendResponse({ status: 'ok' });
      chrome.runtime.sendMessage({ action: 'completed' });
    }).catch(function(err) {
      sendResponse({ error: err.message });
      chrome.runtime.sendMessage({ action: 'error', message: err.message });
    });
    return true;
  }
});

function injetarBotaoShopee() {
  if (document.getElementById('ups-floating-btn-shopee')) return;
  var pageHeader = document.querySelector('.ant-page-header') || document.querySelector('#myEditBox .ant-layout');
  if (!pageHeader) return;
  var btn = document.createElement('div');
  btn.id = 'ups-floating-btn-shopee';
  btn.style.cssText = 'position:fixed;z-index:999999999;cursor:pointer;width:40px;height:40px;border-radius:50%;background:#4078f2;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;';
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="white" style="width:24px;height:24px;display:block;margin:auto;"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z"/></svg>';
  btn.title = 'Automatiza Shopee - UpSeller';
  btn.addEventListener('click', abrirDialogShopee);
  function posicionar() {
    var ref = document.querySelector('.edit_back_top_inner');
    if (ref) {
      var cssRight = parseFloat(window.getComputedStyle(ref).right);
      btn.style.right = (cssRight - 4) + 'px';
    } else {
      btn.style.right = '154px';
    }
    var r = pageHeader.getBoundingClientRect();
    btn.style.top = (r.top + 208) + 'px';
  }
  posicionar();
  window.addEventListener('resize', posicionar);
  document.body.appendChild(btn);
}

})();

// ===== SHOPEE ACTIVE (shopee/active) - Global scope =====

function removerBotaoShopeeActive() {
  var btn = document.getElementById('ups-shopee-active-btn');
  if (btn) btn.remove();
}

function extrairTamanhoShopeeActive(texto) {
  var m = texto.match(/&([^\s]+)/);
  if (m) return m[1];
  var tl = ['PP','P','M','G','GG','EGG','G1','G2','G3','G4','G5','XG','XGG','EXG','EXGG','EG','2XG','2XGG','3XG','3XGG'];
  tl.sort(function(a,b){return b.length - a.length;});
  for (var i = 0; i < tl.length; i++) { var re = new RegExp('\\b' + tl[i] + '\\b', 'i'); if (re.test(texto)) return tl[i]; }
  return '';
}

function getShopeeActiveModal() {
  return document.querySelector('.ant-modal-wrap');
}

function getShopeeActiveRows() {
  var modal = getShopeeActiveModal();
  if (!modal) return [];
  var root = modal.querySelector('.vxe-table--body-wrapper.body--wrapper') || modal.querySelector('.vxe-table--main-wrapper');
  return root ? root.querySelectorAll('.vxe-body--row') : modal.querySelectorAll('.vxe-body--row');
}

function getActiveScrollContainer() {
  var modal = getShopeeActiveModal();
  if (!modal) return null;
  // Prioriza o body-wrapper (o que tem rolagem real no modal "Editar Desconto");
  // o main-wrapper pode ficar com maxScroll=0 e impedir a rolagem de preencher todas as linhas.
  return modal.querySelector('.vxe-table--body-wrapper.body--wrapper') || modal.querySelector('.vxe-table--main-wrapper');
}

function coletarUmaLinhaActive(tds, tamanhos, uniq) {
  if (tds.length < 3) return;
  var txt = tds[0].textContent.replace(/\s+/g, ' ').trim();
  if (!txt || uniq[txt]) return;
  uniq[txt] = true;
  var size = extrairTamanhoShopeeActive(txt);
  if (!size || tamanhos[size]) return;
  var raw = tds[1].textContent.trim().replace(/[^\d.,]/g, '');
  if (raw.indexOf(',') !== -1) { raw = raw.replace(/\./g, '').replace(',', '.'); }
  var preco = parseFloat(raw) || 0;
  var inputs = tds[2].querySelectorAll('input');
  tamanhos[size] = { descontoAtual: inputs[0] ? inputs[0].value : '', pctAtual: inputs[1] ? inputs[1].value : '', precoBase: preco };
}

async function coletarTamanhosPrecosShopeeActive(progFn) {
  await sleep(200);
  var sc = getActiveScrollContainer();
  var tamanhos = {};
  var uniq = {};

  if (sc) {
    var maxScroll = Math.max(0, sc.scrollHeight - sc.clientHeight);
    var scrollStep = Math.max(200, sc.clientHeight * 3.0);
    var stallCount = 0;
    sc.scrollTop = 0;
    await sleep(200);

    while (true) {
      var trs = sc.querySelectorAll('.vxe-body--row');
      trs.forEach(function(r) { coletarUmaLinhaActive(r.querySelectorAll('td'), tamanhos, uniq); });
      if (progFn) progFn(Object.keys(tamanhos).length + ' tamanhos encontrados');
      if (sc.scrollTop >= maxScroll - 5) break;
      if (stallCount >= 3) break;
      var prev = sc.scrollTop;
      sc.scrollTop = Math.min(sc.scrollTop + scrollStep, maxScroll);
      if (sc.scrollTop === prev) { stallCount++; continue; }
      stallCount = 0;
      await sleep(100);
    }

    sc.scrollTop = 0;
  } else {
    var trs = getShopeeActiveRows();
    trs.forEach(function(r) { coletarUmaLinhaActive(r.querySelectorAll('td'), tamanhos, uniq); });
  }

  return tamanhos;
}

function salvarUltimoEstadoShopeeActive(regras) {
  try {
    var s = {};
    for (var k in regras) { s[k] = {}; if (regras[k].pct !== undefined) s[k].pct = regras[k].pct; if (regras[k].r$ !== undefined) s[k].r$ = regras[k].r$; if (regras[k].direcao) s[k].direcao = regras[k].direcao; }
    chrome.storage.local.set({ shopeeActiveLastState: s });
  } catch(e) {}
}

function carregarUltimoEstadoShopeeActive(callback) {
  try { chrome.storage.local.get('shopeeActiveLastState', function(d) { callback(d && d.shopeeActiveLastState ? d.shopeeActiveLastState : {}); }); } catch(e) { callback({}); }
}

function preencherUmaLinhaActive(r, regras, nsg, filled) {
  var tds = r.querySelectorAll('td');
  if (tds.length < 3) return 0;
  var txt = tds[0].textContent.replace(/\s+/g, ' ').trim();
  if (!txt || filled[txt]) return 0;
  filled[txt] = true;
  var size = extrairTamanhoShopeeActive(txt);
  if (!size) return 0;
  var regra = regras[size];
  if (!regra) return 0;
  var inputs = tds[2].querySelectorAll('input');
  var rsInput = inputs[0];
  var pctInput = inputs[1];
  if (!rsInput || rsInput.disabled) return 0;
  if (regra.pct !== undefined) {
    pctInput.focus();
    nsg.call(pctInput, String(regra.pct));
    pctInput.dispatchEvent(new Event('input', { bubbles: true }));
    pctInput.dispatchEvent(new Event('change', { bubbles: true }));
    pctInput.blur();
  } else if (regra.r$ !== undefined) {
    var fmt = regra.r$.toFixed(2).replace('.', ',');
    rsInput.focus();
    nsg.call(rsInput, fmt);
    rsInput.dispatchEvent(new Event('input', { bubbles: true }));
    rsInput.dispatchEvent(new Event('change', { bubbles: true }));
    rsInput.blur();
  }
  return 1;
}

async function setDescontoPorTamanhoShopeeActive(regras, progFn) {
  await sleep(200);
  var sc = getActiveScrollContainer();
  var nsg = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  var count = 0;
  var filled = {};

  if (sc) {
    var maxScroll = Math.max(0, sc.scrollHeight - sc.clientHeight);
    var scrollStep = Math.max(200, sc.clientHeight * 0.8);
    var stallCount = 0;
    sc.scrollTop = 0;
    await sleep(200);

    while (true) {
      var trs = sc.querySelectorAll('.vxe-body--row');
      trs.forEach(function(r) { count += preencherUmaLinhaActive(r, regras, nsg, filled); });
      if (progFn) progFn(count + ' variações preenchidas');
      if (sc.scrollTop >= maxScroll - 5) break;
      if (stallCount >= 3) break;
      var prev = sc.scrollTop;
      sc.scrollTop = Math.min(sc.scrollTop + scrollStep, maxScroll);
      if (sc.scrollTop === prev) { stallCount++; continue; }
      stallCount = 0;
      await sleep(200);
    }

    sc.scrollTop = 0;
  } else {
    var trs = getShopeeActiveRows();
    trs.forEach(function(r) { count += preencherUmaLinhaActive(r, regras, nsg, filled); });
  }

  if (progFn) progFn('Concluído! (' + count + ' variações)');
  return count;
}

function injetarBotaoShopeeActive() {
  if (document.getElementById('ups-shopee-active-btn')) return;
  var modal = document.querySelector('.ant-modal-wrap');
  if (!modal) return;
  var titleEl = modal.querySelector('.ant-modal-title');
  if (!titleEl || !titleEl.textContent.trim().includes('Editar Desconto')) return;
  var dialog = modal.querySelector('.ant-modal');
  var closeBtn = modal.querySelector('.ant-modal-close');
  if (!dialog || !closeBtn) return;

  // Cria o botão verde alinhado ao centro vertical do "X" (fechar), do lado de fora (direita) do modal.
  var btn = document.createElement('button');
  btn.id = 'ups-shopee-active-btn';
  btn.textContent = '$';
  btn.title = 'Aplicar desconto em massa';
  btn.style.cssText = 'position:fixed;z-index:999999;width:44px;height:44px;border-radius:50%;background:#28a745;color:white;border:none;font-size:22px;font-weight:bold;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;line-height:1;';
  btn.addEventListener('click', function(e) { e.stopPropagation(); abrirDialogShopeeActiveMass(); });
  document.body.appendChild(btn);

  function posicionarBtn() {
    var dR = dialog.getBoundingClientRect();
    var cR = closeBtn.getBoundingClientRect();
    // Centro vertical do X, menos metade da altura do botão (alinha os centros)
    var top = cR.top + cR.height / 2 - 22;
    // Fora do modal: à direita, com 28px de margem
    var left = dR.right + 28;
    btn.style.top = top + 'px';
    btn.style.left = left + 'px';
  }

  posicionarBtn();

  // Recalcula a posição quando o modal for movido/redimensionado/zoom (scroll, resize),
  // para que o botão permaneça alinhado ao "X".
  var mo = new MutationObserver(function() { posicionarBtn(); });
  mo.observe(modal, { attributes: true, childList: true, subtree: true, attributeFilter: ['style', 'class'] });
  window.addEventListener('resize', posicionarBtn);
  window.addEventListener('scroll', posicionarBtn, true);
}

function abrirDialogShopeeActiveMass() {
  var existing = document.getElementById('ups-shopee-active-overlay');
  if (existing) existing.remove();

  var overlay = document.createElement('div');
  overlay.id = 'ups-shopee-active-overlay';
  overlay.innerHTML =
    '<div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.45);z-index:999999;display:flex;align-items:center;justify-content:center;">' +
    '<div style="background:white;border-radius:8px;padding:24px;width:520px;max-width:95vw;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 8px 32px rgba(0,0,0,0.25);font-family:sans-serif;">' +
    '<div style="font-size:18px;font-weight:bold;margin-bottom:4px;">Desconto em Massa</div>' +
    '<div style="font-size:12px;color:#888;margin-bottom:12px;">Carregando tamanhos... <span id="ups-sa-loading" style="color:#4078f2;">⏳</span></div>' +
    '<div id="ups-sa-body" style="flex:1;overflow-y:auto;margin-bottom:12px;display:none;"></div>' +
    '<div id="ups-sa-footer" style="border-top:1px solid #eee;padding-top:12px;display:none;">' +
    '<div style="display:flex;gap:8px;justify-content:flex-end;">' +
    '<button id="ups-sa-cancelar" style="padding:8px 20px;border:1px solid #ccc;border-radius:4px;cursor:pointer;font-size:13px;background:white;">Cancelar</button>' +
    '<button id="ups-sa-executar" style="padding:8px 20px;background:#28a745;color:white;border:none;border-radius:4px;cursor:pointer;font-weight:bold;font-size:13px;">APLICAR</button>' +
    '</div></div></div></div>';
  document.body.appendChild(overlay);

  overlay.addEventListener('click', function(e) {
    var box = overlay.querySelector('div[style*="background:white"]');
    if (box && !box.contains(e.target)) overlay.remove();
  });
  document.getElementById('ups-sa-cancelar').addEventListener('click', function() { overlay.remove(); });

  coletarTamanhosPrecosShopeeActive(function(msg) {
    var el = document.getElementById('ups-sa-loading');
    if (el) el.textContent = msg;
  }).then(function(tamanhos) {
    var loadingEl = document.getElementById('ups-sa-loading');
    var body = document.getElementById('ups-sa-body');
    var footer = document.getElementById('ups-sa-footer');
    if (!body) return;

    var ORDEM = { 'pp':1,'p':2,'m':3,'g':4,'gg':5,'egg':6,'g1':7,'g2':8,'g3':9,'g4':10,'g5':11,'xg':12,'xgg':13,'exg':14,'exgg':15,'eg':16,'2xg':17,'2xgg':18,'3xg':19,'3xgg':20 };
    var chaves = Object.keys(tamanhos).sort(function(a, b) {
      var ai = ORDEM[a.toLowerCase().trim()], bi = ORDEM[b.toLowerCase().trim()];
      if (ai && bi) return ai - bi;
      if (ai) return -1; if (bi) return 1;
      var an = parseInt(a, 10), bn = parseInt(b, 10);
      if (!isNaN(an) && !isNaN(bn)) return an - bn;
      return a.localeCompare(b);
    });
    if (!chaves.length) { if (loadingEl) loadingEl.textContent = 'Nenhuma variação encontrada.'; return; }
    if (loadingEl) loadingEl.style.display = 'none';
    body.style.display = 'block';
    footer.style.display = 'block';

    var precoBaseExemplo = tamanhos[chaves[0]].precoBase || 0;
    var html = '<div style="font-size:12px;color:#888;margin-bottom:8px;">Preço Base: <b>R$ ' + precoBaseExemplo.toFixed(2).replace('.', ',') + '</b></div>';
    html += '<table style="width:100%;border-collapse:collapse;">' +
      '<thead><tr style="background:#f5f5f5;">' +
      '<th style="padding:6px 8px;border:1px solid #e0e0e0;font-size:11px;text-align:left;">Tamanho</th>' +
      '<th style="padding:6px 8px;border:1px solid #e0e0e0;font-size:11px;text-align:center;width:80px;">%</th>' +
      '<th style="padding:6px 8px;border:1px solid #e0e0e0;font-size:11px;text-align:center;width:100px;">R$ Desejado</th>' +
      '<th style="padding:6px 8px;border:1px solid #e0e0e0;font-size:11px;text-align:center;width:75px;">Prioridade</th>' +
      '<th style="padding:6px 8px;border:1px solid #e0e0e0;font-size:11px;text-align:center;width:80px;">Resultado</th>' +
      '</tr></thead><tbody>';

    for (var i = 0; i < chaves.length; i++) {
      var t = chaves[i];
      html += '<tr>' +
        '<td style="padding:6px 8px;border:1px solid #e0e0e0;font-size:14px;font-weight:600;text-transform:uppercase;">' + t + '</td>' +
        '<td style="padding:6px 8px;border:1px solid #e0e0e0;"><input id="ups-sa-pct-' + i + '" type="number" min="1" max="99" placeholder="%" value="' + (tamanhos[t].pctAtual || '') + '" style="width:100%;padding:4px;border:1px solid #ccc;border-radius:4px;font-size:13px;text-align:center;box-sizing:border-box;"></td>' +
        '<td style="padding:6px 8px;border:1px solid #e0e0e0;"><input id="ups-sa-r$-' + i + '" type="number" step="0.01" min="0" placeholder="R$" style="width:100%;padding:4px;border:1px solid #ccc;border-radius:4px;font-size:13px;text-align:center;box-sizing:border-box;"></td>' +
        '<td style="padding:6px 8px;border:1px solid #e0e0e0;text-align:center;white-space:nowrap;">' +
        '<span id="ups-sa-up-' + i + '" data-idx="' + i + '" style="cursor:pointer;padding:2px 6px;border-radius:3px;font-size:13px;color:#999;user-select:none;" title="Para cima (preço maior, menos desconto)">▲</span>' +
        '<span id="ups-sa-dn-' + i + '" data-idx="' + i + '" style="cursor:pointer;padding:2px 6px;border-radius:3px;font-size:13px;color:#999;user-select:none;margin-left:2px;" title="Para baixo (preço menor, mais desconto)">▼</span>' +
        '</td>' +
        '<td id="ups-sa-res-' + i + '" style="padding:6px 8px;border:1px solid #e0e0e0;font-size:12px;text-align:center;color:#666;">—</td>' +
        '</tr>';
    }
    html += '</tbody></table>' +
      '<div style="font-size:11px;color:#888;margin-top:6px;">Preencha % ou R$ Desejado. A direção ▲/▼ define se o valor é acima ou abaixo do alvo.</div>';
    body.innerHTML = html;

    var dirAtivo = {};

    carregarUltimoEstadoShopeeActive(function(ultimo) {
      for (var j = 0; j < chaves.length; j++) {
        var estado = ultimo[chaves[j]];
        if (!estado) continue;
        var inpPct = document.getElementById('ups-sa-pct-' + j);
        var inpRs = document.getElementById('ups-sa-r$-' + j);
        if (estado.pct && inpPct) inpPct.value = estado.pct;
        if (estado.r$ && inpRs) inpRs.value = estado.r$;
        if (estado.direcao && estado.r$) {
          dirAtivo[j] = estado.direcao;
          var upEl = document.getElementById('ups-sa-up-' + j);
          var dnEl = document.getElementById('ups-sa-dn-' + j);
          if (estado.direcao === 'up' && upEl) { upEl.style.color = '#fff'; upEl.style.background = '#28a745'; }
          if (estado.direcao === 'down' && dnEl) { dnEl.style.color = '#fff'; dnEl.style.background = '#4078f2'; }
        }
      }
      for (var r = 0; r < chaves.length; r++) {
        var fn = window['_upsSaRecalc_' + r];
        if (typeof fn === 'function') fn();
      }
    });

    for (var j = 0; j < chaves.length; j++) {
      (function(idx) {
        var inpPct = document.getElementById('ups-sa-pct-' + idx);
        var inpRs = document.getElementById('ups-sa-r$-' + idx);
        var resEl = document.getElementById('ups-sa-res-' + idx);
        var precoBase = tamanhos[chaves[idx]].precoBase || precoBaseExemplo;

        function calcPreco() {
          var dir = dirAtivo[idx] || null;
          var rsVal = inpRs.value.trim();
          if (rsVal) {
            var alvo = parseFloat(rsVal.replace(',', '.'));
            if (!isNaN(alvo) && alvo > 0) {
              // Usa a mesma lógica de cálculo do sistema real (melhorPctShopeePromocao),
              // que considera a direção ▲/▼: ▲ = resultado >= alvo (mais próximo p/ cima),
              // ▼ = resultado <= alvo (mais próximo p/ baixo).
              var pct = melhorPctShopeePromocao(precoBase, alvo, dir);
              if (pct !== null) {
                inpPct.value = pct;
                var res = precoBase * (100 - pct) / 100;
                resEl.textContent = 'R$ ' + res.toFixed(2).replace('.', ',');
                resEl.style.color = '#28a745';
                return;
              }
            }
          }
          if (inpPct.value.trim()) {
            var p = parseInt(inpPct.value, 10);
            if (!isNaN(p) && p >= 1 && p <= 99) {
              var r2 = precoBase * (100 - p) / 100;
              resEl.textContent = 'R$ ' + r2.toFixed(2).replace('.', ',');
              resEl.style.color = '#666';
              return;
            }
          }
          resEl.textContent = '—';
          resEl.style.color = '#666';
        }

        function toggleDir(d) {
          var upEl = document.getElementById('ups-sa-up-' + idx);
          var dnEl = document.getElementById('ups-sa-dn-' + idx);
          if (dirAtivo[idx] === d) {
            dirAtivo[idx] = null;
            upEl.style.color = '#999'; upEl.style.background = 'transparent';
            dnEl.style.color = '#999'; dnEl.style.background = 'transparent';
          } else {
            dirAtivo[idx] = d;
            if (d === 'up') { upEl.style.color = '#fff'; upEl.style.background = '#28a745'; dnEl.style.color = '#999'; dnEl.style.background = 'transparent'; }
            else { dnEl.style.color = '#fff'; dnEl.style.background = '#4078f2'; upEl.style.color = '#999'; upEl.style.background = 'transparent'; }
          }
          calcPreco();
        }

        window['_upsSaRecalc_' + idx] = calcPreco;
        document.getElementById('ups-sa-up-' + idx).addEventListener('click', function() { toggleDir('up'); });
        document.getElementById('ups-sa-dn-' + idx).addEventListener('click', function() { toggleDir('down'); });
        inpPct.addEventListener('input', function() { if (!inpRs.value.trim()) calcPreco(); });
        inpRs.addEventListener('input', function() { calcPreco(); });
        calcPreco();
      })(j);
    }

    document.getElementById('ups-sa-executar').addEventListener('click', async function() {
      var regras = {};
      for (var k = 0; k < chaves.length; k++) {
        var pctEl = document.getElementById('ups-sa-pct-' + k);
        var rsEl = document.getElementById('ups-sa-r$-' + k);
        var tam = chaves[k];
        var regra = { precoBase: tamanhos[tam].precoBase || precoBaseExemplo };
        if (pctEl && pctEl.value.trim()) { var p = parseInt(pctEl.value, 10); if (!isNaN(p) && p >= 1 && p <= 99) regra.pct = p; }
        if (rsEl && rsEl.value.trim()) { var r = parseFloat(rsEl.value.replace(',', '.')); if (!isNaN(r) && r > 0) regra.r$ = r; }
        if (dirAtivo[k]) regra.direcao = dirAtivo[k];
        if (regra.pct !== undefined || regra.r$ !== undefined) regras[tam] = regra;
      }
      salvarUltimoEstadoShopeeActive(regras);
      overlay.remove();
      await sleep(200);
      if (!Object.keys(regras).length) { if (typeof mostrarFeedback === 'function') mostrarFeedback('Nenhum valor válido.', '#dc3545'); return; }
      if (typeof criarOverlayProgresso === 'function') criarOverlayProgresso();
      var step = 0;
      var totalKeys = Object.keys(regras).length;
      if (typeof atualizarOverlayProgresso === 'function') atualizarOverlayProgresso({ message: 'Iniciando...', step: 1, total: totalKeys });
      try {
        await setDescontoPorTamanhoShopeeActive(regras, function(msg) { step++; if (typeof atualizarOverlayProgresso === 'function') atualizarOverlayProgresso({ message: msg, step: Math.min(step, totalKeys), total: totalKeys }); });
      } catch(err) { if (typeof mostrarErroOverlayProgresso === 'function') mostrarErroOverlayProgresso('Erro: ' + (err.message || err)); await sleep(3000); }
      if (typeof atualizarOverlayProgresso === 'function') atualizarOverlayProgresso({ message: 'Concluído!', step: totalKeys, total: totalKeys });
      await sleep(1000);
      if (typeof removerOverlayProgresso === 'function') removerOverlayProgresso();
    });
  });
}

// ========== SHOPEE PROMOÇÃO (discount-promotions-edit) ==========

function removerBotaoShopeePromocao() {
  var btn = document.getElementById('ups-shopee-promocao-btn');
  if (btn) btn.remove();
}

function getPromocaoScrollContainer() {
  return document.querySelector('.vxe-table--body-wrapper.body--wrapper');
}

function getShopeePromocaoRows() {
  var sc = getPromocaoScrollContainer();
  if (sc) return sc.querySelectorAll('.vxe-body--row');
  return document.querySelectorAll('.vxe-body--row');
}

function extrairTamanhoShopeePromocao(texto) {
  var partes = texto.split(',');
  if (partes.length < 2) return null;
  var sizes = { 'pp':1,'p':1,'m':1,'g':1,'gg':1,'egg':1,'g1':1,'g2':1,'g3':1,'g4':1,'g5':1,'xg':1,'xgg':1,'exg':1,'exgg':1,'eg':1,'2xg':1,'2xgg':1,'3xg':1,'3xgg':1,'4xg':1,'4xgg':1,'5xg':1,'5xgg':1,'6xg':1,'6xgg':1,'7xg':1,'7xgg':1,'8xg':1,'8xgg':1,'uniq':1,'tam':1,'tamanho':1 };
  var p0 = partes[0].trim().toLowerCase();
  var p1 = partes[1].trim().split(/\s/)[0].toLowerCase();
  if (sizes[p0]) return partes[0].trim();
  if (sizes[p1]) {
    var esp = partes[1].indexOf(' ');
    if (esp > 0) return partes[1].substring(0, esp);
    return partes[1].trim();
  }
  var depois = partes[1].trim();
  var esp2 = depois.indexOf(' ');
  if (esp2 > 0) return depois.substring(0, esp2);
  return depois;
}

function parsePrecoShopeePromocao(texto) {
  var limpo = texto.replace(/[R$\s]/g, '').replace(',', '.').trim();
  return parseFloat(limpo);
}

function coletarUmaLinhaPromocao(tds, tamanhos, uniq) {
  if (tds.length < 5) return;
  var vt = (tds[2].textContent || '').replace(/\s+/g, ' ').trim();
  if (!vt || uniq[vt]) return;
  uniq[vt] = true;
  var size = extrairTamanhoShopeePromocao(vt);
  if (!size || tamanhos[size]) return;
  var precoBase = parsePrecoShopeePromocao(tds[3].textContent);
  if (isNaN(precoBase) || precoBase <= 0) return;
  var inputs = tds[4].querySelectorAll('input');
  var pctAtual = '';
  for (var d = 0; d < inputs.length; d++) {
    if (inputs[d].getAttribute('role') !== 'spinbutton') { pctAtual = inputs[d].value; break; }
  }
  tamanhos[size] = { precoBase: precoBase, pctAtual: pctAtual };
}

async function coletarTamanhosPrecosShopeePromocao(progFn) {
  await sleep(300);
  var scrollContainer = getPromocaoScrollContainer();
  var tamanhos = {};
  var uniq = {};

  if (scrollContainer) {
    var maxScroll = Math.max(0, scrollContainer.scrollHeight - scrollContainer.clientHeight);
    var scrollStep = Math.max(200, scrollContainer.clientHeight * 3.0);
    var stallCount = 0;
    scrollContainer.scrollTop = 0;
    await sleep(200);

    while (true) {
      var trs = scrollContainer.querySelectorAll('.vxe-body--row');
      for (var i = 0; i < trs.length; i++) {
        coletarUmaLinhaPromocao(trs[i].querySelectorAll('td'), tamanhos, uniq);
      }
      if (typeof progFn === 'function') progFn('Coletando... (' + Object.keys(tamanhos).length + ' encontrados)');
      if (scrollContainer.scrollTop >= maxScroll - 5) break;
      if (stallCount >= 3) break;
      var prev2 = scrollContainer.scrollTop;
      scrollContainer.scrollTop = Math.min(scrollContainer.scrollTop + scrollStep, maxScroll);
      if (scrollContainer.scrollTop === prev2) { stallCount++; continue; }
      stallCount = 0;
      await sleep(100);
    }

    scrollContainer.scrollTop = 0;
  } else {
    var trs = getShopeePromocaoRows();
    for (var i = 0; i < trs.length; i++) {
      coletarUmaLinhaPromocao(trs[i].querySelectorAll('td'), tamanhos, uniq);
    }
  }

  return tamanhos;
}

function melhorPctShopeePromocao(precoBase, valorAlvo, direcao) {
  var melhor = null, melhorDiff = Infinity;
  for (var p = 1; p <= 99; p++) {
    var resultado = precoBase * (100 - p) / 100;
    if (direcao === 'up' && resultado < valorAlvo) continue;
    if (direcao === 'down' && resultado > valorAlvo) continue;
    var diff = Math.abs(resultado - valorAlvo);
    if (diff < melhorDiff) { melhorDiff = diff; melhor = p; }
  }
  return melhor;
}

function preencherUmaLinhaPromocao(tr, regras, ns) {
  var tds = tr.querySelectorAll('td');
  if (tds.length < 5) return 0;
  var vt = (tds[2].textContent || '').replace(/\s+/g, ' ').trim();
  if (!vt) return 0;
  var size = extrairTamanhoShopeePromocao(vt);
  if (!size) return 0;
  var regra = regras[size];
  if (!regra) return 0;
  var inputs = tds[4].querySelectorAll('input');
  var pctInput = null;
  for (var d = 0; d < inputs.length; d++) {
    if (inputs[d].getAttribute('role') !== 'spinbutton') { pctInput = inputs[d]; break; }
  }
  if (!pctInput) return 0;
  var pb = regra.precoBase || parsePrecoShopeePromocao(tds[3].textContent);
  var pct;
  if (regra.pct !== undefined) {
    pct = regra.pct;
  } else if (regra.r$) {
    var calcPct = melhorPctShopeePromocao(pb, regra.r$, regra.direcao || null);
    if (calcPct === null) return 0;
    pct = calcPct;
  } else return 0;
  pctInput.focus();
  ns.call(pctInput, String(pct));
  pctInput.dispatchEvent(new Event('input', { bubbles: true }));
  pctInput.dispatchEvent(new Event('change', { bubbles: true }));
  pctInput.blur();
  return 1;
}

async function setDescontoPorTamanhoShopeePromocao(regras, progFn) {
  await sleep(200);
  var scrollContainer = getPromocaoScrollContainer();
  var ns = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  var total = 0;

  if (scrollContainer) {
    var maxScroll = Math.max(0, scrollContainer.scrollHeight - scrollContainer.clientHeight);
    var scrollStep = Math.max(200, scrollContainer.clientHeight * 0.8);
    var stallCount = 0;
    scrollContainer.scrollTop = 0;
    await sleep(200);

    while (true) {
      var trs = scrollContainer.querySelectorAll('.vxe-body--row');
      for (var i = 0; i < trs.length; i++) {
        total += preencherUmaLinhaPromocao(trs[i], regras, ns);
      }
      if (typeof progFn === 'function') progFn('Preenchendo... (' + total + ' cél' + (total === 1 ? 'ula' : 'ulas') + ')');
      if (scrollContainer.scrollTop >= maxScroll - 5) break;
      if (stallCount >= 3) break;
      var prev2 = scrollContainer.scrollTop;
      scrollContainer.scrollTop = Math.min(scrollContainer.scrollTop + scrollStep, maxScroll);
      if (scrollContainer.scrollTop === prev2) { stallCount++; continue; }
      stallCount = 0;
      await sleep(200);
    }

    scrollContainer.scrollTop = 0;
  } else {
    var trs = getShopeePromocaoRows();
    for (var i = 0; i < trs.length; i++) {
      total += preencherUmaLinhaPromocao(trs[i], regras, ns);
    }
  }

  return total;
}

function abrirDialogShopeePromocaoMassa() {
  var existing = document.getElementById('ups-shopee-promocao-overlay');
  if (existing) existing.remove();

  var overlay = document.createElement('div');
  overlay.id = 'ups-shopee-promocao-overlay';
  overlay.innerHTML =
    '<div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.45);z-index:999999;display:flex;align-items:center;justify-content:center;">' +
    '<div style="background:white;border-radius:8px;padding:24px;width:520px;max-width:95vw;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 8px 32px rgba(0,0,0,0.25);font-family:sans-serif;">' +
    '<div style="font-size:18px;font-weight:bold;margin-bottom:4px;">Desconto Promocional - Shopee</div>' +
    '<div style="font-size:12px;color:#888;margin-bottom:12px;">Carregando tamanhos... <span id="ups-sp-loading" style="color:#4078f2;">⏳</span></div>' +
    '<div id="ups-sp-body" style="flex:1;overflow-y:auto;margin-bottom:12px;display:none;"></div>' +
    '<div id="ups-sp-footer" style="border-top:1px solid #eee;padding-top:12px;display:none;">' +
    '<div style="display:flex;gap:8px;justify-content:flex-end;">' +
    '<button id="ups-sp-cancelar" style="padding:8px 20px;border:1px solid #ccc;border-radius:4px;cursor:pointer;font-size:13px;background:white;">Cancelar</button>' +
    '<button id="ups-sp-executar" style="padding:8px 20px;background:#28a745;color:white;border:none;border-radius:4px;cursor:pointer;font-weight:bold;font-size:13px;">APLICAR</button>' +
    '</div></div></div></div>';
  document.body.appendChild(overlay);

  overlay.addEventListener('click', function(e) {
    var box = overlay.querySelector('div[style*="background:white"]');
    if (box && !box.contains(e.target)) overlay.remove();
  });
  document.getElementById('ups-sp-cancelar').addEventListener('click', function() { overlay.remove(); });

  coletarTamanhosPrecosShopeePromocao(function(msg) {
    var el = document.getElementById('ups-sp-loading');
    if (el) el.textContent = msg;
  }).then(function(tamanhos) {
    var loadingEl = document.getElementById('ups-sp-loading');
    var body = document.getElementById('ups-sp-body');
    var footer = document.getElementById('ups-sp-footer');
    if (!body) return;

    var ORDEM = { 'pp':1,'p':2,'m':3,'g':4,'gg':5,'egg':6,'g1':7,'g2':8,'g3':9,'g4':10,'g5':11,'xg':12,'xgg':13,'exg':14,'exgg':15,'eg':16,'2xg':17,'2xgg':18,'3xg':19,'3xgg':20 };
    var chaves = Object.keys(tamanhos).sort(function(a, b) {
      var ai = ORDEM[a.toLowerCase().trim()], bi = ORDEM[b.toLowerCase().trim()];
      if (ai && bi) return ai - bi;
      if (ai) return -1; if (bi) return 1;
      var an = parseInt(a, 10), bn = parseInt(b, 10);
      if (!isNaN(an) && !isNaN(bn)) return an - bn;
      return a.localeCompare(b);
    });
    if (!chaves.length) { if (loadingEl) loadingEl.textContent = 'Nenhuma variação encontrada.'; return; }
    if (loadingEl) loadingEl.style.display = 'none';
    body.style.display = 'block';
    footer.style.display = 'block';

    var precoBaseExemplo = tamanhos[chaves[0]].precoBase || 0;
    var html = '<div style="font-size:12px;color:#888;margin-bottom:8px;">Preço Base: <b>R$ ' + precoBaseExemplo.toFixed(2).replace('.', ',') + '</b></div>';
    html += '<table style="width:100%;border-collapse:collapse;">' +
      '<thead><tr style="background:#f5f5f5;">' +
      '<th style="padding:6px 8px;border:1px solid #e0e0e0;font-size:11px;text-align:left;">Tamanho</th>' +
      '<th style="padding:6px 8px;border:1px solid #e0e0e0;font-size:11px;text-align:center;width:80px;">%</th>' +
      '<th style="padding:6px 8px;border:1px solid #e0e0e0;font-size:11px;text-align:center;width:100px;">R$ Desejado</th>' +
      '<th style="padding:6px 8px;border:1px solid #e0e0e0;font-size:11px;text-align:center;width:75px;">Prioridade</th>' +
      '<th style="padding:6px 8px;border:1px solid #e0e0e0;font-size:11px;text-align:center;width:80px;">Resultado</th>' +
      '</tr></thead><tbody>';

    for (var i = 0; i < chaves.length; i++) {
      var t = chaves[i];
      html += '<tr>' +
        '<td style="padding:6px 8px;border:1px solid #e0e0e0;font-size:14px;font-weight:600;text-transform:uppercase;">' + t + '</td>' +
        '<td style="padding:6px 8px;border:1px solid #e0e0e0;"><input id="ups-sp-pct-' + i + '" type="number" min="1" max="99" placeholder="%" value="' + (tamanhos[t].pctAtual || '') + '" style="width:100%;padding:4px;border:1px solid #ccc;border-radius:4px;font-size:13px;text-align:center;box-sizing:border-box;"></td>' +
        '<td style="padding:6px 8px;border:1px solid #e0e0e0;"><input id="ups-sp-r$-' + i + '" type="number" step="0.01" min="0" placeholder="R$" style="width:100%;padding:4px;border:1px solid #ccc;border-radius:4px;font-size:13px;text-align:center;box-sizing:border-box;"></td>' +
        '<td style="padding:6px 8px;border:1px solid #e0e0e0;text-align:center;white-space:nowrap;">' +
        '<span id="ups-sp-up-' + i + '" data-idx="' + i + '" style="cursor:pointer;padding:2px 6px;border-radius:3px;font-size:13px;color:#999;user-select:none;" title="Para cima (preço maior, menos desconto)">▲</span>' +
        '<span id="ups-sp-dn-' + i + '" data-idx="' + i + '" style="cursor:pointer;padding:2px 6px;border-radius:3px;font-size:13px;color:#999;user-select:none;margin-left:2px;" title="Para baixo (preço menor, mais desconto)">▼</span>' +
        '</td>' +
        '<td id="ups-sp-res-' + i + '" style="padding:6px 8px;border:1px solid #e0e0e0;font-size:12px;text-align:center;color:#666;">—</td>' +
        '</tr>';
    }
    html += '</tbody></table>' +
      '<div style="font-size:11px;color:#888;margin-top:6px;">Preencha % ou R$ Desejado. ▲/▼ define direção do ajuste.</div>';
    body.innerHTML = html;

    var dirAtivo = {};

    for (var j = 0; j < chaves.length; j++) {
      (function(idx) {
        var inpPct = document.getElementById('ups-sp-pct-' + idx);
        var inpRs = document.getElementById('ups-sp-r$-' + idx);
        var resEl = document.getElementById('ups-sp-res-' + idx);
        var precoBase = tamanhos[chaves[idx]].precoBase || precoBaseExemplo;

        function calc() {
          var dir = dirAtivo[idx] || null;
          var rsVal = inpRs.value.trim();
          if (rsVal) {
            var alvo = parseFloat(rsVal.replace(',', '.'));
            if (!isNaN(alvo) && alvo > 0) {
              var pct = melhorPctShopeePromocao(precoBase, alvo, dir);
              if (pct !== null) {
                inpPct.value = pct;
                var res = precoBase * (100 - pct) / 100;
                resEl.textContent = 'R$ ' + res.toFixed(2).replace('.', ',');
                resEl.style.color = '#28a745';
                return;
              }
            }
          }
          if (inpPct.value.trim()) {
            var p = parseInt(inpPct.value, 10);
            if (!isNaN(p) && p >= 1 && p <= 99) {
              var r2 = precoBase * (100 - p) / 100;
              resEl.textContent = 'R$ ' + r2.toFixed(2).replace('.', ',');
              resEl.style.color = '#666';
              return;
            }
          }
          resEl.textContent = '—';
          resEl.style.color = '#666';
        }

        function toggleDir(d) {
          var upEl = document.getElementById('ups-sp-up-' + idx);
          var dnEl = document.getElementById('ups-sp-dn-' + idx);
          if (dirAtivo[idx] === d) {
            dirAtivo[idx] = null;
            upEl.style.color = '#999'; upEl.style.background = 'transparent';
            dnEl.style.color = '#999'; dnEl.style.background = 'transparent';
          } else {
            dirAtivo[idx] = d;
            if (d === 'up') { upEl.style.color = '#fff'; upEl.style.background = '#28a745'; dnEl.style.color = '#999'; dnEl.style.background = 'transparent'; }
            else { dnEl.style.color = '#fff'; dnEl.style.background = '#4078f2'; upEl.style.color = '#999'; upEl.style.background = 'transparent'; }
          }
          calc();
        }

        document.getElementById('ups-sp-up-' + idx).addEventListener('click', function() { toggleDir('up'); });
        document.getElementById('ups-sp-dn-' + idx).addEventListener('click', function() { toggleDir('down'); });
        inpPct.addEventListener('input', function() { if (!inpRs.value.trim()) calc(); });
        inpRs.addEventListener('input', function() { calc(); });
        calc();
      })(j);
    }

    document.getElementById('ups-sp-executar').addEventListener('click', async function() {
      var regras = {};
      for (var k = 0; k < chaves.length; k++) {
        var pctEl = document.getElementById('ups-sp-pct-' + k);
        var rsEl = document.getElementById('ups-sp-r$-' + k);
        var tam = chaves[k];
        var regra = { precoBase: tamanhos[tam].precoBase || precoBaseExemplo };
        if (pctEl && pctEl.value.trim()) { var p = parseInt(pctEl.value, 10); if (!isNaN(p) && p >= 1 && p <= 99) regra.pct = p; }
        if (rsEl && rsEl.value.trim()) { var r = parseFloat(rsEl.value.replace(',', '.')); if (!isNaN(r) && r > 0) regra.r$ = r; }
        if (dirAtivo[k]) regra.direcao = dirAtivo[k];
        if (regra.pct !== undefined || regra.r$ !== undefined) regras[tam] = regra;
      }
      overlay.remove();
      await sleep(200);
      if (!Object.keys(regras).length) { if (typeof mostrarFeedback === 'function') mostrarFeedback('Nenhum valor válido.', '#dc3545'); return; }
      if (typeof criarOverlayProgresso === 'function') criarOverlayProgresso();
      var step = 0;
      var totalKeys = Object.keys(regras).length;
      if (typeof atualizarOverlayProgresso === 'function') atualizarOverlayProgresso({ message: 'Iniciando...', step: 1, total: totalKeys });
      try {
        await setDescontoPorTamanhoShopeePromocao(regras, function(msg) { step++; if (typeof atualizarOverlayProgresso === 'function') atualizarOverlayProgresso({ message: msg, step: Math.min(step, totalKeys), total: totalKeys }); });
      } catch(err) { if (typeof mostrarErroOverlayProgresso === 'function') mostrarErroOverlayProgresso('Erro: ' + (err.message || err)); await sleep(3000); }
      if (typeof atualizarOverlayProgresso === 'function') atualizarOverlayProgresso({ message: 'Concluído!', step: totalKeys, total: totalKeys });
      await sleep(1000);
      if (typeof removerOverlayProgresso === 'function') removerOverlayProgresso();
    });
  });
}

function injetarBotaoShopeePromocao() {
  if (document.getElementById('ups-shopee-promocao-btn')) return;
  var pageHeader = document.querySelector('.ant-page-header');
  if (!pageHeader) return;
  var btn = document.createElement('div');
  btn.id = 'ups-shopee-promocao-btn';
  btn.style.cssText = 'position:fixed;z-index:999999;cursor:pointer;width:40px;height:40px;border-radius:50%;background:#28a745;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:bold;color:#fff;';
  btn.textContent = '$';
  btn.title = 'Desconto Promocional - Shopee';
  btn.addEventListener('click', abrirDialogShopeePromocaoMassa);

  function posicionar() {
    var r = pageHeader.getBoundingClientRect();
    btn.style.top = (r.bottom + 16) + 'px';
    btn.style.right = '154px';
  }
  posicionar();
  window.addEventListener('resize', posicionar);
  document.body.appendChild(btn);
}
