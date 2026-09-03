// In-page management panel (Shadow DOM) shown on every NetSuite dashboard page.
import { NsClient } from '../nsclient.js';
import { parseDashboardDoc, listDashboardTabs, discoverDashboards, tabLabel, tabName, typeInfo, validatePackage, summarizePortlet, LAYOUTS } from '../model.js';
import { captureDashboard, captureBundle } from '../capture.js';
import { planImport, executePlan, describeStep, suggestBundleMapping } from '../apply.js';
import { diffPackages, describeDiff } from '../diff.js';
import { listLibrary, saveToLibrary, getLibraryPackage, deleteFromLibrary, downloadJson, downloadText, safeFilename, readJsonFile, getSettings, saveSettings } from '../storage.js';
import { generateSdf } from '../sdf.js';
import { CENTERS } from '../sdf-codes.js';
import { makeResolvers } from '../resolvers.js';

const h = (tag, attrs = {}, ...children) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') el.className = v;
    else if (k === 'style') el.setAttribute('style', v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (v === true) el.setAttribute(k, '');
    else if (v !== false && v != null) el.setAttribute(k, v);
  }
  for (const c of children.flat()) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c)));
  return el;
};

class Panel {
  constructor() {
    this.client = new NsClient();
    this.info = parseDashboardDoc(document);
    this.tabs = listDashboardTabs(document);
    this.dashboardId = Number(this.info.dashboardId);
    this.dashboardName = tabName(this.dashboardId, this.tabs);
    this.settings = { autoBackup: true, pauseMs: 120 };
    this.pendingImport = null; // {pkg, plan}
    this.bundle = null; // bundle wizard state
    this.activeTab = 'dashboard';
  }

  async mount() {
    this.settings = await getSettings().catch(() => this.settings);
    // Include dashboards nested under menu categories (sub-tabs), not just top-level tab links.
    discoverDashboards(this.client, document).then((tabs) => {
      this.tabs = tabs;
      this.dashboardName = tabName(this.dashboardId, this.tabs);
      if (this.panel && !this.panel.hidden) this.render();
    }).catch(() => {});
    const host = h('div', { id: 'ndm-host' });
    document.documentElement.appendChild(host);
    this.root = host.attachShadow({ mode: 'open' });
    const css = await fetch(chrome.runtime.getURL('src/ui/panel.css')).then((r) => r.text());
    const style = document.createElement('style');
    style.textContent = css;
    this.root.appendChild(style);
    this.launcher = h('button', { class: 'ndm-launcher', type: 'button', onclick: () => this.toggle() }, 'Dashboard Manager');
    this.panel = h('div', { class: 'ndm-panel', hidden: true });
    this.root.append(this.launcher, this.panel);
    window.addEventListener('ndm:toggle', () => this.toggle());
    this.render();
  }

  toggle(force) {
    const show = force != null ? force : this.panel.hidden;
    this.panel.hidden = !show;
    this.launcher.hidden = show;
    if (show) this.render();
  }

  // ---------------------------------------------------------------- rendering
  render() {
    this.panel.replaceChildren(
      h('div', { class: 'ndm-head' },
        h('h1', {}, 'NetSuite Dashboard Manager'),
        h('button', { type: 'button', onclick: () => chrome.runtime.sendMessage({ type: 'ndm:open-options' }) }, 'Library'),
        h('button', { type: 'button', onclick: () => this.toggle(false) }, 'Close')),
      h('div', { class: 'ndm-tabs' }, ...[
        ['dashboard', 'Dashboard'], ['import', 'Import'], ['library', 'Saved'], ['compare', 'Compare'], ['admin', 'Admin'],
      ].map(([id, label]) => h('button', { type: 'button', class: this.activeTab === id ? 'active' : '', onclick: () => { this.activeTab = id; this.render(); } }, label))),
      this.body = h('div', { class: 'ndm-body' }),
    );
    const views = { dashboard: () => this.viewDashboard(), import: () => this.viewImport(), library: () => this.viewLibrary(), compare: () => this.viewCompare(), admin: () => this.viewAdmin() };
    views[this.activeTab]();
  }

  /** One persistent log element for the whole session; re-renders move it, never recreate it. */
  logBox() {
    if (!this.log) this.log = h('div', { class: 'ndm-log' });
    return this.log;
  }
  say(msg, cls = 'info') {
    const box = this.logBox();
    box.append(h('div', { class: cls }, msg));
    box.scrollTop = box.scrollHeight;
  }
  clearLog() { if (this.log) this.log.replaceChildren(); }

  progressBar() {
    if (!this.bar) this.bar = h('div', { class: 'ndm-progress' }, h('div'));
    return this.bar;
  }
  setProgress(frac) { if (this.bar) this.bar.firstChild.style.width = `${Math.round(frac * 100)}%`; }

  async run(label, fn) {
    try { await fn(); } catch (e) {
      console.error('[NDM]', e);
      const msg = e instanceof Error ? `${e.message}${e.stack ? `\n${String(e.stack).split('\n').slice(1, 3).join('\n')}` : ''}` : (e == null ? 'unknown error (null)' : typeof e === 'object' ? JSON.stringify(e).slice(0, 300) : String(e));
      this.say(`${label} failed: ${msg}`, 'err');
    }
  }

  // ---------------------------------------------------------------- Dashboard tab
  viewDashboard() {
    const info = parseDashboardDoc(document);
    this.info = info;
    const byType = {};
    for (const p of info.portlets) byType[p.type] = (byType[p.type] || 0) + 1;
    const targetSel = h('select', {}, ...this.tabs.filter((t) => t.id !== this.dashboardId).map((t) => h('option', { value: t.id }, tabLabel(t))));
    const modeSel = h('select', {}, h('option', { value: 'merge' }, 'Merge: add to what is there'), h('option', { value: 'replace' }, 'Replace: remove existing portlets first'));

    this.body.replaceChildren(
      h('div', { class: 'ndm-section' },
        h('h2', {}, 'This dashboard'),
        h('dl', { class: 'ndm-kv' },
          h('dt', {}, 'Tab'), h('dd', {}, `${this.dashboardName} (id ${this.dashboardId})`),
          h('dt', {}, 'Account'), h('dd', {}, this.client.accountId || location.host),
          h('dt', {}, 'Layout'), h('dd', {}, info.layout),
          h('dt', {}, 'Portlets'), h('dd', {}, `${info.portlets.length} visible`),
          h('dt', {}, 'Locked'), h('dd', {}, info.locked ? 'Yes (published, locked)' : 'No')),
        h('div', { class: 'ndm-row' },
          h('button', { class: 'ndm-btn', type: 'button', onclick: () => this.run('Export', () => this.exportCurrent(false)) }, 'Export to file'),
          h('button', { class: 'ndm-btn secondary', type: 'button', onclick: () => this.run('Save', () => this.exportCurrent(true)) }, 'Save to library'),
          h('button', { class: 'ndm-btn secondary', type: 'button', onclick: () => this.run('Backup', () => this.backup('manual')) }, 'Backup now')),
        h('div', { class: 'ndm-row' },
          h('button', { class: 'ndm-btn secondary', type: 'button', onclick: () => this.run('Export all', () => this.exportAllTabs()) }, 'Export all tabs (bundle)'),
          h('span', { class: 'ndm-muted' }, `${this.tabs.length} dashboards visible to this role (${this.tabs.filter((t) => t.path && t.path.includes(' › ')).length} under menu categories)`))),
      h('div', { class: 'ndm-section' },
        h('h2', {}, 'Copy this dashboard to another tab'),
        h('div', { class: 'ndm-row' }, targetSel, modeSel),
        h('div', { class: 'ndm-row' },
          h('button', { class: 'ndm-btn', type: 'button', onclick: () => this.run('Copy', () => this.copyToTab(Number(targetSel.value), modeSel.value)) }, 'Preview copy'),
          h('span', { class: 'ndm-muted' }, 'Runs the same import flow; you confirm before anything changes.'))),
      h('div', { class: 'ndm-section' },
        h('h2', {}, 'Portlets'),
        h('ul', { class: 'ndm-list' }, ...info.portlets.map((p) => h('li', {},
          h('span', { class: 'ndm-pill' }, `${p.column}.${p.order}`),
          h('div', { class: 'ndm-flex1' },
            h('div', { class: 'ndm-title ndm-truncate' }, p.title || typeInfo(p.type).label),
            h('div', { class: 'ndm-muted' }, `${typeInfo(p.type).label} · slot ${p.id}${p.state !== 'normal' ? ` · ${p.state}` : ''}${p.locked ? ' · locked' : ''}`)))))),
      h('div', { class: 'ndm-section' },
        h('h2', {}, 'Bulk tools'),
        h('div', { class: 'ndm-row' },
          h('button', { class: 'ndm-btn secondary small', type: 'button', onclick: () => this.run('Minimise', () => this.bulkMinimize(true)) }, 'Minimise all'),
          h('button', { class: 'ndm-btn secondary small', type: 'button', onclick: () => this.run('Expand', () => this.bulkMinimize(false)) }, 'Expand all'),
          h('button', { class: 'ndm-btn danger small', type: 'button', onclick: () => this.run('Clear', () => this.clearDashboard()) }, 'Remove all portlets'),
          h('button', { class: 'ndm-btn secondary small', type: 'button', onclick: () => location.reload() }, 'Reload page')),
        h('div', { class: 'ndm-muted', style: 'margin-top:6px' }, 'Destructive tools take an automatic backup into the library first.')),
      h('div', { class: 'ndm-section' }, h('h2', {}, 'Activity'), this.progressBar(), this.logBox()),
    );
  }

  async captureCurrent(includeSettings = true) {
    this.say(`Capturing ${this.dashboardName}…`);
    const pkg = await captureDashboard(this.client, this.dashboardId, {
      doc: document, includeSettings, tabs: this.tabs,
      onProgress: (p) => { if (p.total) this.setProgress(p.index / p.total); },
    });
    this.setProgress(1);
    const errs = pkg.dashboard.portlets.filter((p) => p.settings.kind === 'error');
    this.say(`Captured ${pkg.dashboard.portlets.length} portlets (${errs.length} with settings errors)`, errs.length ? 'skip' : 'ok');
    for (const p of errs) this.say(`  ${p.title || p.type}: ${p.settings.error}`, 'skip');
    return pkg;
  }

  async exportCurrent(toLibrary) {
    const pkg = await this.captureCurrent(true);
    if (toLibrary) {
      const name = prompt('Name for this saved dashboard:', `${this.dashboardName} – ${new Date().toLocaleDateString()}`);
      if (name == null) return;
      await saveToLibrary({ name, kind: 'export', pkg });
      this.say(`Saved "${name}" to the library`, 'ok');
    } else {
      const file = `${safeFilename(`${this.client.accountId || 'netsuite'}-${this.dashboardName}`)}.nsdash.json`;
      downloadJson(pkg, file);
      this.say(`Downloaded ${file}`, 'ok');
    }
  }

  async exportAllTabs() {
    const ids = this.tabs.map((t) => t.id);
    this.say(`Capturing ${ids.length} tabs…`);
    const bundle = await captureBundle(this.client, ids, { doc: document, tabs: this.tabs, onProgress: () => {} });
    const file = `${safeFilename(`${this.client.accountId || 'netsuite'}-all-dashboards`)}.nsdash-bundle.json`;
    downloadJson(bundle, file);
    this.say(`Downloaded ${file} (${bundle.dashboards.length} dashboards)`, 'ok');
  }

  async backup(reason) {
    const pkg = await this.captureCurrent(true);
    const entry = await saveToLibrary({ name: `Backup ${this.dashboardName} ${new Date().toLocaleString()}`, kind: 'backup', pkg, notes: reason });
    this.say(`Backup saved to library (${entry.name})`, 'ok');
    return entry;
  }

  async bulkMinimize(minimized) {
    const info = parseDashboardDoc(document);
    const targets = info.portlets.filter((p) => (p.state === 'minimized') !== minimized && p.type !== 'settings');
    if (!targets.length) return this.say('Nothing to change');
    if (!confirm(`${minimized ? 'Minimise' : 'Expand'} ${targets.length} portlets on ${this.dashboardName}?`)) return;
    let i = 0;
    for (const p of targets) {
      i += 1; this.setProgress(i / targets.length);
      try { await this.client.setPortletMinimized(this.dashboardId, p.id, minimized); this.say(`${minimized ? 'Minimised' : 'Expanded'} ${p.title}`, 'ok'); }
      catch (e) { this.say(`${p.title}: ${e.message}`, 'err'); }
    }
    this.say('Done. Reload the page to see the result.', 'ok');
  }

  async clearDashboard() {
    const info = parseDashboardDoc(document);
    const targets = info.portlets.filter((p) => p.type !== 'settings');
    if (!targets.length) return this.say('Dashboard is already empty');
    if (!confirm(`Remove ${targets.length} portlets from ${this.dashboardName}? A backup is saved first and can be restored from the Saved tab.`)) return;
    await this.backup('before clear');
    let i = 0;
    for (const p of targets) {
      i += 1; this.setProgress(i / targets.length);
      try { await this.client.setPortletVisibility(this.dashboardId, p.id, false); this.say(`Removed ${p.title}`, 'ok'); }
      catch (e) { this.say(`${p.title}: ${e.message}`, 'err'); }
    }
    this.say('Done. Reload the page to see the result.', 'ok');
  }

  async copyToTab(targetId, mode) {
    const pkg = await this.captureCurrent(true);
    const plan = await planImport(this.client, pkg, targetId, { mode });
    this.pendingImport = { pkg, plan, label: `Copy ${this.dashboardName} → ${tabName(targetId, this.tabs)}` };
    this.activeTab = 'import';
    this.render();
  }

  // ---------------------------------------------------------------- Import tab
  async viewImport() {
    const fileInput = h('input', { type: 'file', accept: '.json,application/json' });
    const modeSel = h('select', {}, h('option', { value: 'merge' }, 'Merge: add to what is there'), h('option', { value: 'replace' }, 'Replace: remove existing portlets first'));
    const layoutChk = h('input', { type: 'checkbox', checked: true });
    const orderChk = h('input', { type: 'checkbox', checked: true });
    const backupChk = h('input', { type: 'checkbox', checked: this.settings.autoBackup !== false });
    const libSel = h('select', {}, h('option', { value: '' }, '— pick a saved dashboard —'));
    listLibrary().then((items) => { for (const it of items) libSel.append(h('option', { value: it.id }, `${it.kind === 'backup' ? '[backup] ' : ''}${it.name}`)); }).catch(() => {});

    const preview = async () => {
      let pkg = null;
      let label = '';
      if (fileInput.files && fileInput.files[0]) { pkg = await readJsonFile(fileInput.files[0]); label = fileInput.files[0].name; }
      else if (libSel.value) { pkg = await getLibraryPackage(libSel.value); label = libSel.selectedOptions[0].textContent; }
      if (!pkg) return this.say('Choose a file or a saved dashboard first', 'skip');
      if (pkg.format === 'netsuite-dashboard-bundle') {
        // Multi-tab bundle: open the mapping wizard instead of a single plan.
        this.pendingImport = null;
        this.bundle = {
          label, bundle: pkg,
          mappings: suggestBundleMapping(pkg, this.tabs),
          mode: modeSel.value, applyLayout: layoutChk.checked, fixOrder: orderChk.checked, autoBackup: backupChk.checked,
          plans: null, results: null,
        };
        this.render();
        return;
      }
      const errs = validatePackage(pkg);
      if (errs.length) return this.say(`Invalid package: ${errs.join('; ')}`, 'err');
      this.say(`Planning import of "${pkg.source.dashboardName}" from ${pkg.source.host} into ${this.dashboardName}…`);
      const plan = await planImport(this.client, pkg, this.dashboardId, { mode: modeSel.value, doc: document, applyLayout: layoutChk.checked, fixOrder: orderChk.checked });
      this.pendingImport = { pkg, plan, label: `Import "${pkg.source.dashboardName}" → ${this.dashboardName}`, autoBackup: backupChk.checked };
      this.render();
    };

    this.body.replaceChildren(
      h('div', { class: 'ndm-section' },
        h('h2', {}, `Import into ${this.dashboardName}`),
        h('div', { class: 'ndm-row' }, h('span', { style: 'width:70px' }, 'File'), fileInput),
        h('div', { class: 'ndm-row' }, h('span', { style: 'width:70px' }, 'or saved'), libSel),
        h('div', { class: 'ndm-row' }, h('span', { style: 'width:70px' }, 'Mode'), modeSel),
        h('div', { class: 'ndm-row' },
          h('label', { class: 'ndm-check' }, layoutChk, 'Copy column layout'),
          h('label', { class: 'ndm-check' }, orderChk, 'Fix ordering after adding'),
          h('label', { class: 'ndm-check' }, backupChk, 'Back up first')),
        h('div', { class: 'ndm-row' }, h('button', { class: 'ndm-btn', type: 'button', onclick: () => this.run('Preview', preview) }, 'Preview plan')),
        h('div', { class: 'ndm-muted', style: 'margin-top:6px' }, 'Single-dashboard files are planned against this tab. Multi-tab bundles open a wizard that maps each exported tab to one of yours.')),
      this.bundle ? this.renderBundleWizard() : null,
      this.pendingImport ? this.renderPlan() : (this.bundle ? null : h('div', { class: 'ndm-muted' }, 'Nothing planned yet. Pick a package and preview; nothing changes until you click Apply.')),
      h('div', { class: 'ndm-section' }, h('h2', {}, 'Activity'), this.progressBar(), this.logBox()),
    );
  }

  // ---------------------------------------------------------------- Bundle wizard
  renderBundleWizard() {
    const b = this.bundle;
    const tabOptions = () => [h('option', { value: '' }, '— skip —'), ...this.tabs.map((t) => h('option', { value: t.id }, tabLabel(t)))];
    const invalidate = () => { b.plans = null; b.results = null; };
    const rows = b.mappings.map((m, i) => {
      try { return renderRow(m, i); } catch (e) { console.error('[NDM] bundle row', e); return h('li', {}, h('span', { class: 'ndm-pill err' }, 'row error'), h('span', { class: 'ndm-muted' }, `${m.pkg?.source?.dashboardName || '?'}: ${e && e.message || e}`)); }
    });
    function renderRow(m, i) {
      const chk = h('input', { type: 'checkbox', checked: !!m.include, onchange: (e) => { m.include = e.target.checked; if (m.include && m.targetId == null) { m.targetId = this.dashboardId; m.reason = 'chosen: this tab'; } invalidate(); this.render(); } });
      const sel = h('select', { disabled: !m.include, onchange: (e) => { m.targetId = e.target.value === '' ? null : Number(e.target.value); m.include = m.targetId != null; m.reason = 'chosen'; invalidate(); this.render(); } }, ...tabOptions());
      sel.value = m.targetId == null ? '' : String(m.targetId);
      const plan = b.plans && b.plans[i];
      const res = b.results && b.results[i];
      const placeable = plan && !plan.error ? plan.summary.adds : null;
      const verdict = !m.available && !m.include ? h('span', { class: 'ndm-pill err' }, 'not available here')
        : plan && plan.error ? h('span', { class: 'ndm-pill err' }, 'could not plan')
        : plan && placeable === 0 ? h('span', { class: 'ndm-pill warn' }, b.mode === 'merge' ? 'nothing to add: all portlets already present (use Replace to overwrite)' : 'nothing to add')
        : plan ? h('span', { class: 'ndm-pill ok' }, `${placeable} of ${m.pkg.dashboard.portlets.length} will import`)
        : h('span', { class: 'ndm-pill ok' }, m.available ? 'available' : 'redirected');
      return h('li', { style: m.include ? '' : 'opacity:.6' },
        chk,
        h('div', { class: 'ndm-flex1' },
          h('div', { class: 'ndm-row', style: 'margin-top:0' },
            h('span', { class: 'ndm-title' }, `${m.pkg.source.dashboardName} (${m.pkg.source.dashboardId})`),
            verdict,
            h('span', { class: 'ndm-muted' }, `${m.pkg.dashboard.portlets.length} portlets · ${m.pkg.dashboard.layout}`)),
          h('div', { class: 'ndm-row', style: 'margin-top:4px' },
            h('span', { class: 'ndm-muted' }, 'import into'), sel,
            h('span', { class: 'ndm-muted' }, m.reason)),
          plan ? h('div', { class: 'ndm-row', style: 'margin-top:4px' },
            h('span', { class: 'ndm-pill ok' }, `${plan.summary.adds} add`), h('span', { class: 'ndm-pill' }, `${plan.summary.settings} configure`),
            h('span', { class: 'ndm-pill warn' }, `${plan.summary.hides} remove`), h('span', { class: 'ndm-pill err' }, `${plan.summary.skips} skipped`),
            plan.summary.layoutChange ? h('span', { class: 'ndm-pill' }, 'layout change') : null) : null,
          plan && plan.warnings.length ? h('div', { class: 'ndm-warn' }, ...plan.warnings.map((w) => h('div', {}, w))) : null,
          plan ? h('details', {}, h('summary', { class: 'ndm-muted' }, `${plan.steps.length} steps`), h('div', { class: 'ndm-steps' }, ...plan.steps.map((st, k) => h('div', { class: st.kind === 'skip' ? 'skip' : '' }, `${k + 1}. ${describeStep(st)}`)))) : null,
          plan && plan.error ? h('div', { class: 'ndm-warn' }, plan.error) : null,
          res ? h('div', { class: 'ndm-row', style: 'margin-top:4px' },
            h('span', { class: `ndm-pill ${res.failed ? 'err' : 'ok'}` }, res.failed ? `${res.failed} failed` : 'done'),
            h('a', { href: `${location.origin}/app/center/card.nl?sc=${m.targetId}`, target: '_blank' }, 'open tab')) : null));
    }
    const mapped = b.mappings.filter((m) => m.include && m.targetId != null);
    const dupTargets = mapped.map((m) => m.targetId).filter((id, i, a) => a.indexOf(id) !== i);
    const selectAvailable = () => { for (const m of b.mappings) { m.include = m.available; if (!m.available) m.targetId = null; } invalidate(); this.render(); };
    const clearAll = () => { for (const m of b.mappings) m.include = false; invalidate(); this.render(); };
    const previewAll = async () => {
      b.results = null;
      b.plans = [];
      for (const m of b.mappings) {
        if (!m.include || m.targetId == null) { b.plans.push(null); continue; }
        this.say(`Planning ${m.pkg.source.dashboardName} → ${tabName(m.targetId, this.tabs)}…`);
        try {
          const plan = await planImport(this.client, m.pkg, m.targetId, { mode: b.mode, doc: document, applyLayout: b.applyLayout, fixOrder: b.fixOrder });
          b.plans.push(plan);
        } catch (e) { console.error('[NDM] plan', e); b.plans.push({ error: `Could not plan: ${e && e.message || e}`, steps: [], warnings: [], summary: { adds: 0, settings: 0, hides: 0, skips: 0 } }); }
      }
      const empty = b.mappings.filter((m, i) => { const p = b.plans[i]; return p && !p.error && p.summary.adds === 0 && p.summary.hides === 0; }).length;
      const errs = b.plans.filter((p) => p && p.error).length;
      this.say(`Bundle preview ready: ${b.plans.filter((p) => p && !p.error).length} tab(s) planned${empty ? `, ${empty} with nothing to add${b.mode === 'merge' ? ' (already present; choose Replace to overwrite)' : ''}` : ''}${errs ? `, ${errs} could not be planned` : ''}. Review, then Apply selected.`, errs ? 'skip' : 'ok');
      this.render();
    };
    const applyAll = async () => {
      if (!b.plans) return this.say('Preview first', 'skip');
      const pairs = b.mappings.map((m, i) => ({ m, plan: b.plans[i] })).filter((p) => p.m.include && p.plan && !p.plan.error);
      if (!pairs.length) return this.say('Nothing mapped', 'skip');
      const total = pairs.reduce((n, p) => n + p.plan.summary.adds, 0);
      if (!confirm(`Import ${pairs.length} dashboard(s) (${total} portlets) from "${b.label}" into: ${pairs.map((p) => tabName(p.m.targetId, this.tabs)).join(', ')}?\n\nMode: ${b.mode}. ${b.autoBackup ? 'Each target is backed up first.' : 'No backups.'}\n\nProceed?`)) return;
      this.clearLog();
      b.results = b.mappings.map(() => null);
      for (const { m, plan } of pairs) {
        const idx = b.mappings.indexOf(m);
        const target = tabName(m.targetId, this.tabs);
        try {
          if (b.autoBackup) {
            this.say(`Backing up ${target}…`);
            const snap = await captureDashboard(this.client, m.targetId, { doc: document, includeSettings: true, tabs: this.tabs });
            await saveToLibrary({ name: `Backup ${target} ${new Date().toLocaleString()}`, kind: 'backup', pkg: snap, notes: 'before bundle import' });
          }
          this.say(`Importing ${m.pkg.source.dashboardName} → ${target}…`);
          const res = await executePlan(this.client, plan, {
            pauseMs: this.settings.pauseMs,
            onProgress: (p) => { this.setProgress(p.index / p.total); if (p.phase === 'done') this.say(`  ${p.index}/${p.total} ${p.result.message}`, p.result.ok ? (p.result.skipped ? 'skip' : 'ok') : 'err'); },
          });
          const failed = res.results.filter((r) => !r.ok).length;
          b.results[idx] = { failed };
          this.say(`${target}: ${failed ? `${failed} step(s) failed` : 'done'}`, failed ? 'err' : 'ok');
        } catch (e) {
          b.results[idx] = { failed: 1 };
          this.say(`${target}: ${e.message}`, 'err');
        }
      }
      this.say('Bundle import finished. Open each tab (links above) or reload this page.', 'ok');
      this.render();
    };
    return h('div', { class: 'ndm-section' },
      h('h2', {}, `Bundle: ${b.label}`),
      h('div', { class: 'ndm-muted' }, `${b.mappings.length} dashboards exported from ${b.bundle.dashboards[0]?.source.host || 'another account'}. Tabs that exist in this account (same id or name) are pre-selected; tabs you do not have are unselected and can be redirected to another tab if you want their content.`),
      h('div', { class: 'ndm-row' },
        h('button', { class: 'ndm-btn secondary small', type: 'button', onclick: selectAvailable }, `Select all available (${b.mappings.filter((m) => m.available).length})`),
        h('button', { class: 'ndm-btn secondary small', type: 'button', onclick: clearAll }, 'Clear'),
        h('span', { class: 'ndm-muted' }, 'Mode'),
        (() => { const s = h('select', { onchange: (e) => { b.mode = e.target.value; invalidate(); this.render(); } }, h('option', { value: 'merge' }, 'Merge: add to what is there'), h('option', { value: 'replace' }, 'Replace: remove existing portlets first')); s.value = b.mode; return s; })()),
      h('ul', { class: 'ndm-list' }, ...rows),
      dupTargets.length ? h('div', { class: 'ndm-warn' }, 'Two exported dashboards point at the same target tab; the second import will merge into the first (or fail on slot capacity).') : null,
      h('div', { class: 'ndm-row' },
        h('button', { class: 'ndm-btn', type: 'button', disabled: !mapped.length, onclick: () => this.run('Preview selected', previewAll) }, 'Preview selected'),
        h('button', { class: 'ndm-btn', type: 'button', disabled: !b.plans || !mapped.length, onclick: () => this.run('Apply selected', applyAll) }, 'Apply selected'),
        h('button', { class: 'ndm-btn secondary', type: 'button', onclick: () => { this.bundle = null; this.render(); } }, 'Discard'),
        h('span', { class: 'ndm-muted' }, `${mapped.length} of ${b.mappings.length} selected`)));
  }

  renderPlan() {
    const { plan, label, pkg } = this.pendingImport;
    const s = plan.summary;
    const apply = async (dryRun) => {
      if (!dryRun) {
        const msg = `${label}\n\n${s.adds} portlet(s) added, ${s.hides} removed, ${s.settings} configured${s.layoutChange ? ', layout changed' : ''}.\n\nProceed?`;
        if (!confirm(msg)) return;
        if (this.pendingImport.autoBackup !== false && plan.targetDashboardId === this.dashboardId) await this.backup('before import');
      }
      this.clearLog();
      this.say(dryRun ? 'Dry run (no changes are made):' : 'Applying…');
      const res = await executePlan(this.client, plan, {
        dryRun, pauseMs: this.settings.pauseMs,
        onProgress: (p) => { this.setProgress(p.index / p.total); if (p.phase === 'done') this.say(`${p.index}/${p.total} ${p.result.message}`, p.result.ok ? (p.result.skipped ? 'skip' : 'ok') : 'err'); },
      });
      const failed = res.results.filter((r) => !r.ok).length;
      this.say(dryRun ? 'Dry run complete.' : failed ? `Finished with ${failed} failed step(s). Reload to see the dashboard.` : 'Import complete. Reload the page to see the new dashboard.', failed ? 'err' : 'ok');
      if (!dryRun && plan.targetDashboardId !== this.dashboardId) this.say(`Open the target tab: ${location.origin}/app/center/card.nl?sc=${plan.targetDashboardId}`, 'info');
      if (!dryRun) this.pendingImport = null;
    };
    return h('div', { class: 'ndm-section' },
      h('h2', {}, 'Plan'),
      h('div', { class: 'ndm-title' }, label),
      h('div', { class: 'ndm-muted' }, `Source: ${pkg.source.host} · ${pkg.source.dashboardName} · exported ${new Date(pkg.exportedAt).toLocaleString()} · layout ${pkg.dashboard.layout}`),
      h('div', { class: 'ndm-row' },
        h('span', { class: 'ndm-pill ok' }, `${s.adds} add`), h('span', { class: 'ndm-pill' }, `${s.settings} configure`),
        h('span', { class: 'ndm-pill warn' }, `${s.hides} remove`), h('span', { class: 'ndm-pill err' }, `${s.skips} skipped`)),
      plan.warnings.length ? h('div', { class: 'ndm-warn' }, ...plan.warnings.map((w) => h('div', {}, w))) : null,
      h('div', { class: 'ndm-steps', style: 'margin-top:8px' }, ...plan.steps.map((st, i) => h('div', { class: st.kind === 'skip' ? 'skip' : '' }, `${i + 1}. ${describeStep(st)}`))),
      h('div', { class: 'ndm-row' },
        h('button', { class: 'ndm-btn', type: 'button', onclick: () => this.run('Apply', () => apply(false)) }, 'Apply'),
        h('button', { class: 'ndm-btn secondary', type: 'button', onclick: () => this.run('Dry run', () => apply(true)) }, 'Dry run'),
        h('button', { class: 'ndm-btn secondary', type: 'button', onclick: () => { this.pendingImport = null; this.render(); } }, 'Discard')));
  }

  // ---------------------------------------------------------------- Library tab
  async viewLibrary() {
    const items = await listLibrary().catch(() => []);
    this.body.replaceChildren(
      h('div', { class: 'ndm-section' },
        h('h2', {}, 'Saved dashboards and backups'),
        items.length ? h('ul', { class: 'ndm-list' }, ...items.map((it) => h('li', {},
          h('div', { class: 'ndm-flex1' },
            h('div', { class: 'ndm-title ndm-truncate' }, it.name),
            h('div', { class: 'ndm-muted' }, `${it.kind} · ${new Date(it.createdAt).toLocaleString()} · ${it.source ? `${it.source.host} / ${it.source.dashboardName}` : ''} · ${it.portletCount} portlets`),
            h('div', { class: 'ndm-row' },
              h('button', { class: 'ndm-btn small', type: 'button', onclick: () => this.run('Restore', () => this.importFromLibrary(it, it.kind === 'backup' ? 'replace' : 'merge')) }, it.kind === 'backup' ? 'Restore here' : 'Import here'),
              h('button', { class: 'ndm-btn secondary small', type: 'button', onclick: () => this.run('Download', async () => downloadJson(await getLibraryPackage(it.id), `${safeFilename(it.name)}.nsdash.json`)) }, 'Download'),
              h('button', { class: 'ndm-btn secondary small', type: 'button', onclick: () => this.run('Compare', async () => { this.compareWith = await getLibraryPackage(it.id); this.compareLabel = it.name; this.activeTab = 'compare'; this.render(); }) }, 'Compare'),
              h('button', { class: 'ndm-btn danger small', type: 'button', onclick: () => this.run('Delete', async () => { if (confirm(`Delete "${it.name}"?`)) { await deleteFromLibrary(it.id); this.render(); } }) }, 'Delete')))))) : h('div', { class: 'ndm-muted' }, 'Nothing saved yet. Use "Save to library" or "Backup now" on the Dashboard tab.')),
      h('div', { class: 'ndm-section' }, h('h2', {}, 'Activity'), this.progressBar(), this.logBox()),
    );
  }

  async importFromLibrary(item, mode) {
    const pkg = await getLibraryPackage(item.id);
    if (!pkg) return this.say('Package not found', 'err');
    if (pkg.format === 'netsuite-dashboard-bundle') return this.say('Bundles: use the Import tab and pick a dashboard', 'skip');
    const plan = await planImport(this.client, pkg, this.dashboardId, { mode, doc: document });
    this.pendingImport = { pkg, plan, label: `${item.kind === 'backup' ? 'Restore' : 'Import'} "${item.name}" → ${this.dashboardName} (${mode})` };
    this.activeTab = 'import';
    this.render();
  }

  // ---------------------------------------------------------------- Compare tab
  async viewCompare() {
    const fileInput = h('input', { type: 'file', accept: '.json,application/json' });
    const out = h('div');
    const runCompare = async () => {
      let other = this.compareWith;
      if (fileInput.files && fileInput.files[0]) { other = await readJsonFile(fileInput.files[0]); this.compareLabel = fileInput.files[0].name; }
      if (!other) return this.say('Pick a file or choose "Compare" on a saved dashboard', 'skip');
      if (other.format === 'netsuite-dashboard-bundle') other = other.dashboards.find((d) => Number(d.source.dashboardId) === this.dashboardId) || other.dashboards[0];
      const current = await this.captureCurrent(true);
      const d = diffPackages(current, other);
      out.replaceChildren(
        h('div', { class: 'ndm-muted' }, `Current ${this.dashboardName} → ${this.compareLabel || 'other'}: + added in other, - missing in other, ~ changed`),
        h('div', { class: 'ndm-steps', style: 'margin-top:6px' }, ...describeDiff(d).map((l) => h('div', { class: l.startsWith('+') ? 'ok' : l.startsWith('-') ? 'skip' : '' }, l))),
        ...d.changed.filter((c) => c.fields.length).map((c) => h('details', { style: 'margin-top:6px' }, h('summary', {}, `${c.a.title || c.a.type}: ${c.fields.length} setting(s)`),
          h('div', { class: 'ndm-steps' }, ...c.fields.map((f) => h('div', {}, `${f.field}: ${f.from ?? '∅'} → ${f.to ?? '∅'}`))))));
    };
    this.body.replaceChildren(
      h('div', { class: 'ndm-section' },
        h('h2', {}, 'Compare with this dashboard'),
        h('div', { class: 'ndm-row' }, fileInput, h('button', { class: 'ndm-btn', type: 'button', onclick: () => this.run('Compare', runCompare) }, 'Compare')),
        this.compareWith ? h('div', { class: 'ndm-muted' }, `Selected from library: ${this.compareLabel}`) : null,
        out),
      h('div', { class: 'ndm-section' }, h('h2', {}, 'Activity'), this.progressBar(), this.logBox()),
    );
  }

  // ---------------------------------------------------------------- Admin tab
  viewAdmin() {
    const name = h('input', { type: 'text', value: `${this.dashboardName} dashboard`.slice(0, 30), maxlength: 30 });
    const scriptId = h('input', { type: 'text', value: `custpubdashboard_${safeFilename(this.dashboardName).toLowerCase()}` });
    const center = h('select', {}, ...CENTERS.map((c) => h('option', { value: c }, c)));
    const roles = h('input', { type: 'text', placeholder: 'ACCOUNTANT, customrole_sales_mgr', style: 'width:100%' });
    const mode = h('select', {}, h('option', { value: 'UNLOCKED' }, 'Unlocked'), h('option', { value: 'ADD_MOVE' }, 'Add/Move content'), h('option', { value: 'LOCKED' }, 'Locked'));
    const allTabs = h('input', { type: 'checkbox' });
    const resolve = h('input', { type: 'checkbox', checked: true });
    const gen = async () => {
      let pkgs;
      if (allTabs.checked) { const b = await captureBundle(this.client, this.tabs.map((t) => t.id), { doc: document, tabs: this.tabs }); pkgs = b.dashboards; }
      else pkgs = [await this.captureCurrent(true)];
      this.say('Generating SDF XML…');
      const res = await generateSdf(pkgs, {
        scriptId: scriptId.value.trim(), name: name.value.trim(), center: center.value, mode: mode.value,
        roles: roles.value.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean),
        resolvers: resolve.checked ? makeResolvers(this.client) : {},
      });
      downloadText(res.xml, `${scriptId.value.trim() || 'custpubdashboard'}.xml`, 'application/xml');
      this.say(`Downloaded ${scriptId.value}.xml — ${res.todos.length} TODO(s), ${res.skipped.length} portlet(s) skipped`, res.todos.length ? 'skip' : 'ok');
      for (const t of res.todos) this.say(`  TODO ${t}`, 'skip');
      for (const t of res.skipped) this.say(`  skipped ${t}`, 'skip');
    };
    this.body.replaceChildren(
      h('div', { class: 'ndm-section' },
        h('h2', {}, 'Publish to roles (NetSuite native)'),
        h('div', { class: 'ndm-muted' }, 'NetSuite can publish your current dashboards to every user of selected roles in your center. Use the extension import first to shape the dashboard, then publish.'),
        h('div', { class: 'ndm-row' },
          h('a', { class: 'ndm-btn', href: '/app/center/setup/savedashboard.nl', target: '_blank' }, 'Open Publish Dashboard'),
          h('a', { class: 'ndm-btn secondary', href: '/app/center/setup/savedashboards.nl', target: '_blank' }, 'Published dashboards list'))),
      h('div', { class: 'ndm-section' },
        h('h2', {}, 'Generate SDF publisheddashboard XML'),
        h('div', { class: 'ndm-muted' }, 'Creates an Objects/*.xml file for a SuiteCloud project so the dashboard can be deployed to other accounts (sandbox, production, other subsidiaries). Unresolvable references are left as TODO comments.'),
        h('div', { class: 'ndm-kv', style: 'margin-top:8px' },
          h('dt', {}, 'Name'), h('dd', {}, name),
          h('dt', {}, 'Script id'), h('dd', {}, scriptId),
          h('dt', {}, 'Center'), h('dd', {}, center),
          h('dt', {}, 'Roles'), h('dd', {}, roles),
          h('dt', {}, 'Mode'), h('dd', {}, mode)),
        h('div', { class: 'ndm-row' },
          h('label', { class: 'ndm-check' }, allTabs, 'Include all tabs'),
          h('label', { class: 'ndm-check' }, resolve, 'Look up script ids (admin, slower)')),
        h('div', { class: 'ndm-row' }, h('button', { class: 'ndm-btn', type: 'button', onclick: () => this.run('SDF', gen) }, 'Generate XML'))),
      h('div', { class: 'ndm-section' },
        h('h2', {}, 'Settings'),
        h('div', { class: 'ndm-row' },
          h('label', { class: 'ndm-check' }, h('input', { type: 'checkbox', checked: this.settings.autoBackup !== false, onchange: (e) => saveSettings({ autoBackup: e.target.checked }).then(() => { this.settings.autoBackup = e.target.checked; }) }), 'Back up before imports'),
          h('label', { class: 'ndm-check' }, 'Pause between calls (ms) ', h('input', { type: 'text', value: this.settings.pauseMs, style: 'width:70px', onchange: (e) => { const v = Number(e.target.value) || 0; saveSettings({ pauseMs: v }).then(() => { this.settings.pauseMs = v; }); } })))),
      h('div', { class: 'ndm-section' }, h('h2', {}, 'Activity'), this.progressBar(), this.logBox()),
    );
  }
}

let instance = null;
export function mount() {
  if (instance) return instance;
  instance = new Panel();
  instance.mount().catch((e) => console.error('[NDM] mount failed', e));
  return instance;
}
