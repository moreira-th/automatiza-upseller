let listingData = null;

const mainContent = document.getElementById('mainContent');
const btnCopiar = document.getElementById('btnCopiar');
const siteTag = document.getElementById('siteTag');
const toast = document.getElementById('toast');

function showToast(msg, duration) {
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(function() { toast.classList.remove('show'); }, duration || 2500);
}

function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function buildContent(data) {
  var info = data.info || {};
  var allImages = data.allImages || [];
  var site = info.itemId && info.itemId.match(/^\d+$/) ? 'shein' : 'temu';

  siteTag.textContent = site.toUpperCase();
  siteTag.className = 'badge site-tag ' + site;

  var html = '';

  html += '<div class="card">';
  html += '<div class="card-header">📋 Informações do Produto</div>';
  html += '<div class="card-body">';

  html += '<div class="info-row"><span class="info-label">Título:</span><span class="info-value">' + escHtml(info.title || '-') + '</span></div>';
  html += '<div class="info-row"><span class="info-label">SKU / ID:</span><span class="info-value id">' + escHtml(info.itemId || '-') + '</span></div>';

  html += '</div></div>';

  var coresComImagem = allImages.filter(function(d) { return d.images && d.images.length > 0; });
  var coresIndisponiveis = allImages.filter(function(d) { return !d.images || !d.images.length; });

  html += '<div class="card">';
  html += '<div class="card-header">🎨 Cores e Links das Imagens <span style="font-weight:400;color:#999;margin-left:8px;">(' + allImages.length + ' cores)</span></div>';
  html += '<div class="card-body" style="padding:0;">';

  if (allImages.length === 0) {
    html += '<div style="padding:20px;text-align:center;color:#999;">Nenhuma cor encontrada</div>';
  } else {
    html += '<table class="color-table">';
    html += '<thead><tr><th style="width:180px;">Cor</th><th>Links das imagens</th></tr></thead>';
    html += '<tbody>';

    allImages.forEach(function(d) {
      var v = d.variant || {};
      var label = v.label || 'Sem nome';

      html += '<tr>';
      html += '<td>';
      html += '<div class="color-swatch">';
      if (v.thumbnail) {
        html += '<img src="' + escHtml(v.thumbnail) + '" alt="" onerror="this.style.display=\'none\'">';
      } else {
        html += '<span class="dot" style="background:#ddd;"></span>';
      }
      html += '<span>' + escHtml(label) + '</span>';
      if (d.error) {
        html += '<span class="unavailable"> (' + escHtml(d.error) + ')</span>';
      }
      html += '</div>';
      html += '</td>';

      html += '<td>';
      if (d.images && d.images.length > 0) {
        html += '<ul class="link-list">';
        html += '<span class="link-count">' + d.images.length + ' imagem(ns)</span>';
        d.images.forEach(function(imgUrl) {
          html += '<li><a href="' + escHtml(imgUrl) + '" target="_blank" rel="noopener">' + escHtml(imgUrl) + '</a></li>';
        });
        html += '</ul>';
      } else {
        html += '<span class="unavailable">' + (d.error || 'Sem imagens') + '</span>';
      }
      html += '</td>';
      html += '</tr>';
    });

    html += '</tbody></table>';
  }

  html += '</div></div>';

  btnCopiar.disabled = coresComImagem.length === 0;

  return html;
}

function carregarOuExibirVazio(data) {
  if (!data || !data.info || (!data.allImages || data.allImages.length === 0 && !data.info.title)) {
    mainContent.innerHTML = '<div class="empty-state"><div class="icon">📦</div><h2>Nenhum anúncio carregado</h2><p>Navegue até um produto na Shein ou Temu<br>e clique no botão verde flutuante (ou Ctrl+Shift+C).</p></div>';
    btnCopiar.disabled = true;
    siteTag.textContent = '';
    siteTag.className = 'badge';
    return;
  }

  listingData = data;
  mainContent.innerHTML = buildContent(data);
}

btnCopiar.addEventListener('click', function() {
  if (!listingData) return;

  var info = listingData.info || {};
  var allImages = listingData.allImages || [];

  var title = info.title || '';
  var itemId = info.itemId || '';

  var linhas = [];

  allImages.forEach(function(d) {
    var v = d.variant || {};
    var label = (v.label || '').replace(/[\[\]【】]/g, '').trim();
    if (d.error) label += ' (' + d.error + ')';

    if (d.images && d.images.length > 0) {
      var links = d.images.join(', ');
      linhas.push([itemId, title, label, links].join('\t'));
    } else {
      linhas.push([itemId, title, label, (d.error || 'Sem imagens')].join('\t'));
    }
  });

  var conteudo = linhas.join('\n');

  var headerLinha = ['SKU / ID', 'Título', 'Cor', 'Links das Imagens'].join('\t');
  var conteudoCompleto = headerLinha + '\n' + conteudo;

  navigator.clipboard.writeText(conteudoCompleto).then(function() {
    btnCopiar.textContent = '✔ Copiado!';
    btnCopiar.classList.add('btn-copied');
    showToast('Dados copiados para a área de transferência! Cole na planilha.', 3000);
    setTimeout(function() {
      btnCopiar.textContent = '📋 Copiar para planilha';
      btnCopiar.classList.remove('btn-copied');
    }, 2000);
  }).catch(function() {
    showToast('Erro ao copiar. Tente novamente.', 3000);
  });
});

chrome.runtime.sendMessage({ action: 'getListingData' }, function(res) {
  carregarOuExibirVazio(res ? res.data : null);
});

chrome.storage.onChanged.addListener(function(changes, areaName) {
  if (areaName === 'local' && changes.listingCopierData) {
    carregarOuExibirVazio(changes.listingCopierData.newValue);
  }
});
