const STORAGE_KEY = 'tabTilerWindows';

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'tile') {
    handleTile(msg.windowId, msg.urlFilter).then(sendResponse);
    return true; // keep channel open for async response
  }
  if (msg.action === 'gather') {
    handleGather().then(sendResponse);
    return true;
  }
});

async function handleTile(windowId, urlFilter) {
  try {
    let tabs = await chrome.tabs.query({ windowId });
    if (tabs.length === 0) return { ok: false, error: 'No tabs' };

    if (urlFilter) {
      const lower = urlFilter.toLowerCase();
      tabs = tabs.filter(t => t.url && t.url.toLowerCase().includes(lower));
      if (tabs.length === 0) return { ok: false, error: `No tabs matching "${urlFilter}"` };
    }

    const displays = await chrome.system.display.getInfo();
    const display = displays.find(d => d.isPrimary) || displays[0];
    const { width: screenW, height: screenH } = display.workArea;

    const cols = Math.ceil(Math.sqrt(tabs.length));
    const rows = Math.ceil(tabs.length / cols);
    const tileW = Math.floor(screenW / cols);
    const tileH = Math.floor(screenH / rows);

    const windowIds = [];

    for (let i = 0; i < tabs.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const left = display.workArea.left + col * tileW;
      const top = display.workArea.top + row * tileH;

      let win;
      if (i === 0) {
        win = await chrome.windows.update(windowId, { state: 'normal' });
        win = await chrome.windows.update(windowId, {
          left, top, width: tileW, height: tileH
        });
      } else {
        win = await chrome.windows.create({
          tabId: tabs[i].id,
          left, top, width: tileW, height: tileH,
          focused: false
        });
      }
      await chrome.tabs.update(tabs[i].id, { autoDiscardable: false });
      windowIds.push(win.id);
    }

    await chrome.storage.local.set({ [STORAGE_KEY]: windowIds });
    return { ok: true, count: tabs.length };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function handleGather() {
  try {
    const { [STORAGE_KEY]: windowIds } = await chrome.storage.local.get(STORAGE_KEY);
    let allTabs = [];

    if (windowIds && windowIds.length > 0) {
      for (const wid of windowIds) {
        try {
          const tabs = await chrome.tabs.query({ windowId: wid });
          allTabs.push(...tabs);
        } catch { /* window gone */ }
      }
    }

    if (allTabs.length === 0) {
      const allWindows = await chrome.windows.getAll({ populate: true });
      for (const win of allWindows) {
        if (win.tabs) allTabs.push(...win.tabs);
      }
    }

    const seen = new Set();
    allTabs = allTabs.filter(t => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });

    if (allTabs.length === 0) {
      await chrome.storage.local.remove(STORAGE_KEY);
      return { ok: false, error: 'No tabs to gather' };
    }

    let targetId = allTabs[0].windowId;
    let targetWin;
    try {
      targetWin = await chrome.windows.get(targetId);
    } catch {
      targetWin = await chrome.windows.create({ state: 'maximized' });
      targetId = targetWin.id;
    }

    for (const tab of allTabs) {
      if (tab.windowId === targetId) continue;
      try {
        await chrome.tabs.move(tab.id, { windowId: targetId, index: -1 });
      } catch { /* skip */ }
    }

    const winIds = new Set(allTabs.map(t => t.windowId));
    for (const wid of winIds) {
      if (wid === targetId) continue;
      try {
        const tabs = await chrome.tabs.query({ windowId: wid });
        if (tabs.length === 0) await chrome.windows.remove(wid);
      } catch { /* ignore */ }
    }

    await chrome.windows.update(targetId, { state: 'maximized' });
    await chrome.storage.local.remove(STORAGE_KEY);
    return { ok: true, count: allTabs.length };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
