function getSite() {
  const h = window.location.hostname;
  if (h.includes('temu.com')) return 'temu';
  if (h.includes('shein.com')) return 'shein';
  return 'unknown';
}
const SITE = getSite();

function cacheKey() {
  return window.location.origin + window.location.pathname;
}
let extractCache = { key: null, data: null };

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function getProductInfo() {
  const title = document.querySelector('h1')?.textContent?.trim() || document.title;

  let itemId = '';

  const scripts = document.querySelectorAll('script');
  for (const s of scripts) {
    const m = (s.textContent || '').match(/"itemId"\s*:\s*"([^"]+)"/);
    if (m) { itemId = m[1]; break; }
  }

  if (!itemId) {
    const m = window.location.pathname.match(/-p-(\d+)\.html/);
    if (m) itemId = m[1];
  }

  return { title, itemId };
}

function sheinColorVariants() {
  const items = document.querySelectorAll('div[role="radio"].radio-container[aria-label]');
  const results = [];
  items.forEach(el => {
    const label = el.getAttribute('aria-label');
    if (!label) return;
    const img = el.querySelector('.radio-inner img, img');
    const thumbnail = img ? (img.src || img.getAttribute('data-src') || '') : '';
    const available = el.getAttribute('aria-disabled') !== 'true';
    results.push({
      label,
      index: results.length,
      thumbnail: thumbnail.startsWith('//') ? 'https:' + thumbnail : thumbnail || null,
      isSelected: el.getAttribute('aria-checked') === 'true',
      available
    });
  });
  return results;
}

function sheinClickColor(index) {
  const items = document.querySelectorAll('div[role="radio"].radio-container[aria-label]');
  let ci = 0;
  for (const el of items) {
    if (ci === index) {
      el.scrollIntoView({ block: 'center' });
      el.click();
      return true;
    }
    ci++;
  }
  return false;
}

function sheinGallery() {
  const bestUrls = new Map();

  function qualityScore(raw) {
    if (!raw.includes('_thumbnail')) return 100000;
    var m = raw.match(/_thumbnail_(\d+)(?:x(\d+))?/);
    if (m) {
      var w = parseInt(m[1]) || 0;
      var h = parseInt(m[2]) || 0;
      return w * (h || w);
    }
    return 500;
  }

  function highQualityUrl(raw) {
    return raw.replace(/_thumbnail_\d+(?:x\d+)?/, '_thumbnail_900x').replace(/\.webp(\?|$)/gi, '.jpg$1');
  }

  function add(raw) {
    if (!raw) return;
    if (raw.startsWith('//')) raw = 'https:' + raw;
    if (raw.indexOf('bg-grey') !== -1) return;
    var base = raw.replace(/_(?:thumbnail[^/]*|thumb)(?:\.[a-z]+)?$/, '');
    if (!base) return;
    var score = qualityScore(raw);
    var existing = bestUrls.get(base);
    if (!existing || score > existing.score) {
      bestUrls.set(base, { url: raw, score: score });
    }
  }

  document.querySelectorAll('.normal-picture__content-list').forEach(function(container) {
    var crop = container.querySelector('.crop-image-container');
    if (!crop) return;
    var img = crop.querySelector('img');
    if (img) {
      var ds = img.getAttribute('data-src');
      if (ds) { add(ds); return; }
      if (img.src && img.src.indexOf('bg-grey') === -1) { add(img.src); return; }
    }
    var beforeCrop = crop.getAttribute('data-before-crop-src');
    if (beforeCrop) add(beforeCrop);
  });

  document.querySelectorAll('ul.thumbs-picture li img').forEach(function(img) {
    add(img.getAttribute('data-src') || img.src || '');
  });

  if (bestUrls.size === 0) {
    var large = document.querySelector('.crop-image-container.fsp-element img, div.swiper-item img');
    if (large) add(large.src || large.getAttribute('data-src') || '');
  }

  return Array.from(bestUrls.values()).map(function(v) {
    var url = v.url;
    if (v.score < 810000) {
      url = highQualityUrl(v.url);
    }
    return url.replace(/\.webp(\?|$)/gi, '.jpg$1');
  });
}

function temuColorVariants() {
  const newItems = document.querySelectorAll('._20PH8eAG div[role="radio"][aria-label]');
  if (newItems.length > 0) {
    const results = [];
    let idx = 0;
    newItems.forEach(el => {
      const label = el.getAttribute('aria-label');
      if (!label) return;
      const isSelected = (el.className + '').indexOf('_363EuJDX') !== -1;
      const available = el.getAttribute('aria-disabled') !== 'true';
      let thumb = null;
      const img = el.querySelector('img');
      if (img) thumb = img.getAttribute('data-src') || img.src || '';
      results.push({ label, index: idx, thumbnail: thumb, isSelected, available });
      idx++;
    });
    return results;
  }

  const items = document.querySelectorAll('div[role="button"][aria-label]');
  const results = [];
  if (items.length > 0) {
    const corLabel = document.querySelector('._3xAeViXW');
    const selectedName = corLabel ? corLabel.textContent.trim().replace(/^Cor[:\s]*/i, '').trim() : '';
    items.forEach(el => {
      const label = el.getAttribute('aria-label');
      if (!label) return;
      const hasBg = !!el.querySelector('[style*="background-image"]');
      if (!hasBg) return;
      const rect = el.getBoundingClientRect();
      if (rect.width > 80 || rect.height > 80) return;
      const bg = el.querySelector('[style*="background-image"]');
      let thumb = null;
      if (bg) {
        const m = bg.style.backgroundImage.match(/url\(["']?([^"']+)["']?\)/);
        if (m) thumb = m[1];
      }
      const cls = el.className || '';
      const available = cls.indexOf('fndtZHjj') === -1 && el.getAttribute('aria-disabled') !== 'true';
      results.push({ label, index: results.length, thumbnail: thumb, isSelected: label === selectedName, available });
    });
  }

  if (results.length === 0) {
    const corEl = document.querySelector('._3xAeViXW, [class*="sku-select"] [class*="title"], [class*="product"] [class*="color"]');
    if (corEl) {
      const name = corEl.textContent.trim().replace(/^Cor[:\s]*/i, '').replace(/[【】\[\]]/g, '').trim();
      if (name) results.push({ label: name, index: 0, thumbnail: null, isSelected: true, available: true });
    }
  }

  if (results.length === 0) {
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let textNode;
    while ((textNode = walk.nextNode())) {
      const text = textNode.textContent || '';
      const m = text.match(/Cor[\s:：]+[【\[]?([^】\[\]]+)[】\]\]]?/i);
      if (m) {
        const label = m[1].trim();
        if (label && label.length <= 30) {
          results.push({ label: label, index: 0, thumbnail: null, isSelected: true, available: true });
          break;
        }
      }
    }
  }

  return results;
}

function temuClickColor(index) {
  const newItems = document.querySelectorAll('._20PH8eAG div[role="radio"][aria-label]');
  if (newItems.length > 0) {
    let ci = 0;
    for (const el of newItems) {
      const label = el.getAttribute('aria-label');
      if (!label) continue;
      if (el.getAttribute('aria-disabled') === 'true') { ci++; continue; }
      if (ci === index) {
        el.scrollIntoView({ block: 'center' });
        el.click();
        return true;
      }
      ci++;
    }
    return false;
  }

  let ci = 0;
  const items = document.querySelectorAll('div[role="button"][aria-label]');
  for (const el of items) {
    const hasBg = !!el.querySelector('[style*="background-image"]');
    const label = el.getAttribute('aria-label');
    if (!hasBg || !label) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width > 80 || rect.height > 80) continue;
    const cls = el.className || '';
    if (el.getAttribute('aria-disabled') === 'true' || cls.indexOf('fndtZHjj') !== -1) { ci++; continue; }
    if (ci === index) {
      el.scrollIntoView({ block: 'center' });
      el.click();
      return true;
    }
    ci++;
  }
  return false;
}

function temuGallery() {
  const seen = new Set();
  const result = [];

  function addFromUrl(rawUrl) {
    let u = rawUrl.split('?')[0].split('!')[0];
    let m = u.match(/product\/fancy\/([^?]+)/);
    if (m && !seen.has(m[1])) {
      seen.add(m[1]); result.push('https://img.kwcdn.com/product/fancy/' + m[1]); return;
    }
    m = u.match(/product\/algo_check\/auto\/([^?]+)/);
    if (m && !seen.has(m[1])) {
      seen.add(m[1]); result.push('https://img.kwcdn.com/' + m[0]); return;
    }
    m = u.match(/product\/Fancyalgo\/VirtualModelMatting\/([^?]+)/);
    if (m && !seen.has(m[1])) {
      seen.add(m[1]); result.push('https://img.kwcdn.com/product/Fancyalgo/VirtualModelMatting/' + m[1]); return;
    }
    m = u.match(/product\/open\/([^?]+)/);
    if (m && !seen.has(m[1])) {
      seen.add(m[1]); result.push('https://img.kwcdn.com/product/open/' + m[1]); return;
    }
    m = u.match(/product\/([a-f0-9]{10,11})\/([^/?]+_\d+x\d+\.\w+)/);
    if (m && !seen.has(m[2])) {
      seen.add(m[2]); result.push('https://img.kwcdn.com/product/' + m[1] + '/' + m[2]); return;
    }
    m = u.match(/local-image\/s132\/[^/]+\/(.+)/);
    if (m && !seen.has(m[1])) {
      seen.add(m[1]); result.push('https://img.kwcdn.com/' + m[0]);
    }
  }

  document.querySelectorAll('div[role="listbox"] div[role="option"]').forEach(opt => {
    let url = '';
    const img = opt.querySelector('img');
    if (img) {
      url = img.getAttribute('data-src') || img.src || '';
    }
    if (!url || url.startsWith('data:')) {
      const bg = opt.querySelector('[style*="background-image"]');
      if (bg) {
        const mm = bg.style.backgroundImage.match(/url\(["']?([^"']+)["']?\)/);
        if (mm) url = mm[1];
      }
    }
    if (url && url.startsWith('data:')) url = '';
    if (url) addFromUrl(url);
  });

  const listboxEl = document.querySelector('div[role="listbox"]');
  let galleryRoot = listboxEl;
  for (let i = 0; i < 4 && galleryRoot && galleryRoot !== document.body; i++) {
    galleryRoot = galleryRoot.parentElement;
  }
  if (galleryRoot) {
    galleryRoot.querySelectorAll('img[src*="kwcdn"]').forEach(img => {
      if (!img.offsetParent) return;
      const rect = img.getBoundingClientRect();
      if (rect.width < 200 || rect.height < 200) return;
      addFromUrl(img.src || '');
    });
  }

  return result;
}

function getColorVariants() {
  if (SITE === 'shein') return sheinColorVariants();
  return temuColorVariants();
}

function clickColorVariant(index) {
  if (SITE === 'shein') return sheinClickColor(index);
  return temuClickColor(index);
}

function extractGalleryImages() {
  if (SITE === 'shein') return sheinGallery();
  return temuGallery();
}

async function extractAllVariants() {
  const key = cacheKey();
  if (extractCache.key === key && extractCache.data) return extractCache.data;

  const variants = getColorVariants();
  const currentImages = extractGalleryImages();
  const info = getProductInfo();

  if (variants.length <= 1) {
    const data = { allImages: [{ variant: variants[0] || { label: 'Atual', index: 0 }, images: currentImages }], info };
    extractCache = { key, data };
    return data;
  }

  const startIdx = variants.findIndex(v => v.isSelected);
  const result = [];
  const currentUrls = new Set(currentImages.map(i => i));

  for (let i = 0; i < variants.length; i++) {
    if (!variants[i].available) {
      result.push({ variant: variants[i], images: [], error: 'Indisponível' });
      continue;
    }
    if (i === startIdx) {
      result.push({ variant: variants[i], images: currentImages });
    } else {
      clickColorVariant(i);
      await sleep(800);
      const images = extractGalleryImages();
      if (SITE !== 'shein' && images.length && images.every(img => currentUrls.has(img))) {
        result.push({ variant: variants[i], images: [], error: 'Indisponível' });
      } else {
        result.push({ variant: variants[i], images: images.length ? images : [] });
      }
    }
  }

  if (startIdx >= 0 && startIdx !== 0) {
    clickColorVariant(startIdx);
    await sleep(500);
  }

  const data = { allImages: result, info };
  extractCache = { key, data };
  return data;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'ping') {
    sendResponse({ ok: true, url: window.location.href, title: document.title, site: SITE });
    return true;
  }
  if (request.action === 'triggerCopiar') {
    handleExtractAndShow();
    sendResponse({ ok: true });
    return true;
  }
  if (request.action === 'extractAllVariants') {
    extractAllVariants().then(result => sendResponse(result));
    return true;
  }
  if (request.action === 'checkCache') {
    const key = cacheKey();
    sendResponse({ hasCache: extractCache.key === key && extractCache.data !== null });
    return true;
  }
});

async function handleExtractAndShow() {
  showLoadingOverlay();
  try {
    const data = await extractAllVariants();
    removeLoadingOverlay();
    if (!data || !data.allImages || data.allImages.length === 0) {
      alert('Nenhuma cor/imagem encontrada neste produto.');
      return;
    }
    showReviewModal(data);
  } catch (e) {
    removeLoadingOverlay();
    alert('Erro ao extrair: ' + (e && e.message ? e.message : e));
    console.error('[ListingCopier] Extraction failed:', e);
  }
}

function showLoadingOverlay() {
  if (document.getElementById('lc-loading-overlay')) return;
  const el = document.createElement('div');
  el.id = 'lc-loading-overlay';
  Object.assign(el.style, {
    position: 'fixed', inset: '0', zIndex: 1000000,
    background: 'rgba(0,0,0,0.4)', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    fontFamily: 'system-ui,sans-serif'
  });
  el.innerHTML = '<div style="background:#fff;padding:24px 40px;border-radius:12px;font-size:16px;font-weight:600;color:#333;box-shadow:0 4px 24px rgba(0,0,0,0.2);">Extraindo dados do anúncio...</div>';
  document.body.appendChild(el);
}

function removeLoadingOverlay() {
  const el = document.getElementById('lc-loading-overlay');
  if (el) el.remove();
}

function injectFloatingButton() {
  if (document.getElementById('listing-copier-floating-btn')) return;

  const btn = document.createElement('button');
  btn.id = 'listing-copier-floating-btn';
  btn.title = 'Copiar anúncio para revisão (Ctrl+Shift+C)';
  btn.innerHTML = `<img src="${chrome.runtime.getURL('icons/icon128.png')}" alt="Copiar" style="width:28px;height:28px">`;
  Object.assign(btn.style, {
    position: 'fixed', top: '220px', right: '16px', zIndex: 999998,
    width: '48px', height: '48px', borderRadius: '50%',
    background: '#3498db', border: '2px solid #fff', cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '0', transition: 'transform 0.15s, box-shadow 0.15s'
  });
  btn.addEventListener('mouseenter', () => {
    btn.style.transform = 'scale(1.1)'; btn.style.boxShadow = '0 4px 16px rgba(0,0,0,0.4)';
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.transform = 'scale(1)'; btn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
  });
  btn.addEventListener('click', async () => {
    btn.style.transform = 'scale(0.9)';
    btn.disabled = true;
    await handleExtractAndShow();
    btn.disabled = false;
    btn.style.transform = 'scale(1)';
  });

  document.body.appendChild(btn);
}

function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function showReviewModal(data) {
  if (document.getElementById('lc-review-overlay')) return;

  var info = data.info || {};
  var allImages = data.allImages || [];

  var html = '<div id="lc-review-overlay" style="position:fixed;inset:0;z-index:1000000;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;">';
  html += '<div style="background:#fff;border-radius:12px;width:90%;max-width:960px;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 8px 40px rgba(0,0,0,0.3);font-family:system-ui,sans-serif;color:#1a1a2e;font-size:14px;">';

  html += '<div style="display:flex;align-items:center;padding:14px 20px;border-bottom:1px solid #eee;flex-shrink:0;background:#fafbfc;">';
  html += '<div style="flex:1;min-width:0;">';
  html += '<div style="font-weight:700;font-size:15px;">Listing Copier - Revisão do Anúncio</div>';
  html += '</div>';
  html += '<button id="lc-close-btn" style="background:none;border:none;font-size:22px;cursor:pointer;color:#999;padding:0 4px;line-height:1;">&times;</button>';
  html += '</div>';

  html += '<div style="flex:1;overflow-y:auto;padding:16px 20px;">';

  html += '<div style="background:#f8f9fa;border-radius:8px;padding:14px 16px;margin-bottom:16px;">';
  html += '<div style="font-size:12px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Informações do Produto</div>';
  html += '<div style="font-size:14px;font-weight:600;color:#1a1a2e;margin-bottom:4px;word-break:break-word;">' + escHtml(info.title || '-') + '</div>';
  html += '<div style="font-size:12px;font-family:monospace;color:#888;">SKU/ID: ' + escHtml(info.itemId || '-') + '</div>';
  html += '</div>';

  var coresComImagem = allImages.filter(function(d) { return d.images && d.images.length > 0; });

  if (allImages.length > 0) {
    html += '<div style="font-size:13px;font-weight:600;color:#1a1a2e;margin-bottom:10px;">Cores e Links (' + allImages.length + ' cores)</div>';
    html += '<table style="width:100%;border-collapse:collapse;font-size:12px;">';
    html += '<thead><tr style="text-align:left;border-bottom:2px solid #e0e0e0;">';
    html += '<th style="padding:8px 10px;color:#888;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Cor</th>';
    html += '<th style="padding:8px 10px;color:#888;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Links das imagens</th>';
    html += '<th style="padding:8px 4px;width:28px;"></th>';
    html += '</tr></thead><tbody>';

    allImages.forEach(function(d, vId) {
      var v = d.variant || {};
      var label = v.label ? v.label.replace(/[【】\[\]]/g, '').trim() : 'Sem nome';

      html += '<tr data-lc-row="' + vId + '" style="border-bottom:1px solid #f0f0f0;vertical-align:top;">';
      html += '<td style="padding:8px 10px;">';
      html += '<div style="display:flex;align-items:center;gap:8px;font-weight:600;">';
      if (v.thumbnail) {
        html += '<img src="' + escHtml(v.thumbnail) + '" style="width:22px;height:22px;border-radius:4px;object-fit:cover;border:1px solid #ddd;flex-shrink:0;" onerror="this.style.display=\'none\'">';
      }
      html += '<input data-lc-editcor="' + vId + '" value="' + escHtml(label) + '" style="border:1px solid #ddd;border-radius:4px;padding:3px 6px;font-size:12px;font-weight:600;width:110px;background:#fff;color:#1a1a2e;">';
      if (d.error) html += '<span style="color:#e74c3c;font-weight:400;font-size:11px;"> (' + escHtml(d.error) + ')</span>';
      html += '</div></td>';
      html += '<td style="padding:8px 10px;">';
      if (d.images && d.images.length > 0) {
        html += '<div style="display:flex;flex-direction:column;gap:3px;max-height:120px;overflow-y:auto;">';
        d.images.forEach(function(imgUrl) {
          html += '<a href="' + escHtml(imgUrl) + '" target="_blank" style="color:#3498db;text-decoration:none;font-size:11px;word-break:break-all;">' + escHtml(imgUrl) + '</a>';
        });
        html += '</div>';
      } else {
        html += '<span style="color:#e74c3c;font-size:11px;">' + (d.error || 'Sem imagens') + '</span>';
      }
      html += '</td>';
      html += '<td style="padding:8px 4px;text-align:center;">';
      html += '<button data-lc-del="' + vId + '" style="background:none;border:none;cursor:pointer;color:#ccc;font-size:16px;padding:0;line-height:1;" title="Remover cor">\u00D7</button>';
      html += '</td></tr>';
    });

    html += '</tbody></table>';
  } else {
    html += '<div style="padding:30px;text-align:center;color:#999;">Nenhuma cor encontrada</div>';
  }

  html += '</div>';

  html += '<div style="padding:12px 20px;border-top:1px solid #eee;display:flex;align-items:center;justify-content:flex-end;gap:10px;flex-shrink:0;background:#fafbfc;">';
  html += '<button id="lc-send-btn" style="background:#3498db;color:#fff;border:none;padding:10px 24px;border-radius:8px;font-weight:600;font-size:13px;cursor:pointer;white-space:nowrap;transition:background 0.2s;" onmouseover="this.style.background=\'#2980b9\'" onmouseout="this.style.background=\'#3498db\'">📤 Enviar para Revisão</button>';
  html += '</div>';

  html += '</div></div>';

  document.body.insertAdjacentHTML('beforeend', html);

  var overlay = document.getElementById('lc-review-overlay');
  var coresRemovidas = {};

  function atualizarContadorCores() {
    var rows = overlay.querySelectorAll('tbody tr[data-lc-row]');
    var visiveis = 0;
    rows.forEach(function(r) { if (r.style.display !== 'none') visiveis++; });
    var titulo = overlay.querySelector('div[style*="Cores e Links"]');
    if (titulo) titulo.textContent = 'Cores e Links (' + visiveis + ' cores)';
  }

  overlay.querySelectorAll('[data-lc-del]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var vId = btn.getAttribute('data-lc-del');
      var row = overlay.querySelector('tr[data-lc-row="' + vId + '"]');
      if (row) {
        row.style.display = 'none';
        coresRemovidas[vId] = true;
        atualizarContadorCores();
      }
    });
    btn.addEventListener('mouseenter', function() { btn.style.color = '#e74c3c'; });
    btn.addEventListener('mouseleave', function() { btn.style.color = '#ccc'; });
  });

  overlay.querySelectorAll('[data-lc-editcor]').forEach(function(input) {
    input.addEventListener('input', function() {
      var vId = parseInt(input.getAttribute('data-lc-editcor'));
      var d = allImages[vId];
      if (d && d.variant) {
        d.variant.label = input.value.trim();
      }
    });
  });

  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) overlay.remove();
  });
  document.getElementById('lc-close-btn').addEventListener('click', function() {
    overlay.remove();
  });

  document.getElementById('lc-send-btn').addEventListener('click', function() {
    var btn = document.getElementById('lc-send-btn');
    btn.textContent = '⏳ Enviando...';
    btn.disabled = true;
    btn.style.opacity = '0.7';

    var dadosFiltrados = {
      info: info,
      allImages: allImages.filter(function(_, idx) { return !coresRemovidas[idx]; }),
      site: SITE
    };

    try {
      chrome.runtime.sendMessage({ action: 'enviarParaRevisao', data: dadosFiltrados }, function(res) {
        console.log('[ListingCopier] Resposta do background:', res);
        if (chrome.runtime.lastError) {
          console.error('[ListingCopier] Erro ao enviar:', chrome.runtime.lastError.message);
          btn.textContent = '⚠ ' + chrome.runtime.lastError.message;
          btn.style.background = '#e74c3c';
          btn.disabled = false;
          btn.style.opacity = '1';
          return;
        }
        if (res && res.ok) {
          btn.textContent = '✔ Enviado!';
          btn.style.background = '#27ae60';
          setTimeout(function() { overlay.remove(); }, 800);
        } else {
          btn.textContent = '⚠ ' + (res && res.error ? res.error : 'Erro');
          btn.style.background = '#e74c3c';
          btn.disabled = false;
          btn.style.opacity = '1';
          setTimeout(function() {
            btn.textContent = '📤 Enviar para Revisão';
            btn.style.background = '#3498db';
          }, 3000);
        }
      });
    } catch(e) {
      console.error('[ListingCopier] Exception:', e);
      btn.textContent = '⚠ Erro';
      btn.style.background = '#e74c3c';
      btn.disabled = false;
      btn.style.opacity = '1';
    }
  });
}

injectFloatingButton();
console.log('[ListingCopier] Content script loaded, site:', SITE, new Date().toISOString());
