// Local library of dashboard packages (exports, backups) in chrome.storage.local.
// Index is kept small; each package lives under its own key.

const INDEX_KEY = 'ndm:library';
const PKG_PREFIX = 'ndm:pkg:';

function storage() {
  if (typeof chrome === 'undefined' || !chrome.storage) throw new Error('chrome.storage is not available in this context');
  return chrome.storage.local;
}

function get(keys) { return new Promise((res, rej) => storage().get(keys, (v) => chrome.runtime.lastError ? rej(chrome.runtime.lastError) : res(v))); }
function set(obj) { return new Promise((res, rej) => storage().set(obj, () => chrome.runtime.lastError ? rej(chrome.runtime.lastError) : res())); }
function remove(keys) { return new Promise((res, rej) => storage().remove(keys, () => chrome.runtime.lastError ? rej(chrome.runtime.lastError) : res())); }

export async function listLibrary() {
  const v = await get(INDEX_KEY);
  return (v[INDEX_KEY] || []).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export async function saveToLibrary({ name, kind = 'export', pkg, notes = '' }) {
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const index = await listLibrary();
  const entry = {
    id, name, kind, notes,
    createdAt: new Date().toISOString(),
    source: pkg.source || null,
    layout: pkg.dashboard && pkg.dashboard.layout,
    portletCount: pkg.dashboard ? pkg.dashboard.portlets.length : (pkg.dashboards ? pkg.dashboards.reduce((n, d) => n + d.dashboard.portlets.length, 0) : 0),
    bundle: pkg.format === 'netsuite-dashboard-bundle',
    sizeBytes: JSON.stringify(pkg).length,
  };
  index.unshift(entry);
  await set({ [INDEX_KEY]: index, [PKG_PREFIX + id]: pkg });
  return entry;
}

export async function getLibraryPackage(id) {
  const v = await get(PKG_PREFIX + id);
  return v[PKG_PREFIX + id] || null;
}

export async function deleteFromLibrary(id) {
  const index = (await listLibrary()).filter((e) => e.id !== id);
  await set({ [INDEX_KEY]: index });
  await remove(PKG_PREFIX + id);
}

export async function renameLibraryItem(id, name, notes) {
  const index = await listLibrary();
  const e = index.find((x) => x.id === id);
  if (!e) return;
  e.name = name;
  if (notes != null) e.notes = notes;
  await set({ [INDEX_KEY]: index });
}

export async function getSettings() {
  const v = await get('ndm:settings');
  return { autoBackup: true, pauseMs: 120, panelCollapsed: false, ...(v['ndm:settings'] || {}) };
}

export async function saveSettings(patch) {
  const cur = await getSettings();
  await set({ 'ndm:settings': { ...cur, ...patch } });
}

// ---- files -------------------------------------------------------------------------

export function downloadJson(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  triggerDownload(blob, filename);
}

export function downloadText(text, filename, type = 'text/plain') {
  triggerDownload(new Blob([text], { type }), filename);
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
}

export function safeFilename(s) {
  return String(s || 'dashboard').replace(/[^\w.-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80) || 'dashboard';
}

export function readJsonFile(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => { try { resolve(JSON.parse(String(r.result))); } catch (e) { reject(new Error('File is not valid JSON')); } };
    r.onerror = () => reject(r.error || new Error('Could not read file'));
    r.readAsText(file);
  });
}
