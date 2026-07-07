const status = document.getElementById('status');

function log(msg, isError) {
  status.textContent = msg;
  status.style.color = isError ? '#c00' : '#666';
}

document.getElementById('tileBtn').addEventListener('click', async () => {
  log('Tiling...');
  const win = await chrome.windows.getCurrent();
  const urlFilter = document.getElementById('urlFilter').value.trim();
  const result = await chrome.runtime.sendMessage({ action: 'tile', windowId: win.id, urlFilter });
  if (result.ok) {
    log(`Tiled ${result.count} tabs!`);
    setTimeout(() => window.close(), 500);
  } else {
    log(`Error: ${result.error}`, true);
  }
});

document.getElementById('gatherBtn').addEventListener('click', async () => {
  log('Gathering...');
  const result = await chrome.runtime.sendMessage({ action: 'gather' });
  if (result.ok) {
    log(`Gathered ${result.count} tabs!`);
    setTimeout(() => window.close(), 500);
  } else {
    log(`Error: ${result.error}`, true);
  }
});
