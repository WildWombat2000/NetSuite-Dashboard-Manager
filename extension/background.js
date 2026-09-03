// Minimal service worker: relays toolbar actions to the content script.
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === 'ndm:open-options') {
    chrome.runtime.openOptionsPage();
    sendResponse({ ok: true });
  }
  return false;
});
