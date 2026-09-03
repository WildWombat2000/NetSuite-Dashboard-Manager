const status = document.getElementById('status');
const openBtn = document.getElementById('open');
document.getElementById('library').addEventListener('click', () => chrome.runtime.openOptionsPage());

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const tab = tabs[0];
  if (!tab || !/^https:\/\/[^/]*netsuite\.com\//.test(tab.url || '')) {
    status.textContent = 'Open a NetSuite dashboard (Home or a center tab) to use the panel.';
    return;
  }
  chrome.tabs.sendMessage(tab.id, { type: 'ndm:ping' }, (res) => {
    if (chrome.runtime.lastError || !res || !res.dashboard) {
      status.textContent = 'This NetSuite page is not a dashboard. Go to Home or a center tab (card.nl).';
      return;
    }
    status.textContent = 'Dashboard detected.';
    openBtn.disabled = false;
    openBtn.addEventListener('click', () => { chrome.tabs.sendMessage(tab.id, { type: 'ndm:toggle' }); window.close(); });
  });
});
