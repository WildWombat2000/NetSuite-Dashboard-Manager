// Content-script loader. Content scripts cannot be ES modules, so we dynamically import the
// real entry point (declared as a web-accessible resource) and hand it the page document.
(async () => {
  if (!document.querySelector('.ns-dashboard-container')) return; // not a dashboard page
  try {
    const mod = await import(chrome.runtime.getURL('src/ui/panel.js'));
    mod.mount();
  } catch (e) {
    console.error('[NetSuite Dashboard Manager] failed to start', e);
  }
})();

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === 'ndm:toggle') {
    window.dispatchEvent(new CustomEvent('ndm:toggle'));
    sendResponse({ ok: true });
  }
  if (msg && msg.type === 'ndm:ping') {
    sendResponse({ ok: true, dashboard: !!document.querySelector('.ns-dashboard-container') });
  }
  return false;
});
