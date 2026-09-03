// Domain model: dashboard package format, portlet type registry, DOM parsing helpers.

export const PACKAGE_FORMAT = 'netsuite-dashboard-package';
export const PACKAGE_VERSION = 1;

export const LAYOUTS = ['SINGLE_COLUMN', 'TWO_COLUMN', 'TWO_COLUMN_RIGHT', 'THREE_COLUMN'];

/** Column order (1-based) -> SDF column element name, per layout. */
export const LAYOUT_COLUMNS = {
  SINGLE_COLUMN: ['centercolumn'],
  TWO_COLUMN: ['leftcolumn', 'centercolumn'],
  TWO_COLUMN_RIGHT: ['centercolumn', 'rightcolumn'],
  THREE_COLUMN: ['leftcolumn', 'centercolumn', 'rightcolumn'],
};

export const STANDARD_TABS = {
  '-29': 'Home', '-7': 'Transactions', '-8': 'Lists', '-9': 'Reports', '-11': 'Support', '-190': 'Commerce',
  '-22': 'Activities', '-24': 'Customers', '-25': 'Vendors', '-26': 'Employees', '-27': 'Partners',
  '-56': 'Financial', '-62': 'Sales', '-63': 'Marketing', '-69': 'Opportunities', '-77': 'Leads', '-78': 'Forecast', '-10': 'Setup', '-90': 'Customization',
};

/**
 * Portlet type registry. `settings` describes how configuration is captured/applied:
 *  - 'form'      : classic setup form reachable from data-portlet-actions.setup (replayable)
 *  - 'reminders' : JSON setup + reminderSave action
 *  - 'none'      : nothing to configure (placement only)
 *  - 'manual'    : has configuration but no replayable form (user must redo it by hand)
 * `sdf` is the publisheddashboard XML element (null = not supported by SDF).
 */
export const PORTLET_TYPES = {
  searchresults: { label: 'Custom Search', settings: 'form', sdf: 'customsearch', width: 'WIDE' },
  list: { label: 'List', settings: 'form', sdf: 'list', width: 'WIDE' },
  trendgraph: { label: 'Trend Graph', settings: 'form', sdf: 'trendgraph', width: 'WIDE' },
  snapshots: { label: 'Key Performance Indicators', settings: 'form', sdf: 'kpi', width: 'WIDE' },
  kpimeter: { label: 'KPI Meter', settings: 'form', sdf: 'kpimeter', width: 'NARROW' },
  kpireport: { label: 'KPI Scorecard', settings: 'form', sdf: 'kpiscorecard', width: 'WIDE' },
  enhsnapshots: { label: 'Report Snapshot', settings: 'form', sdf: 'reportsnapshot', width: 'NARROW' },
  scriptportlet: { label: 'Custom Portlet', settings: 'form', sdf: 'customportlet', width: 'WIDE' },
  shortcuts: { label: 'Shortcuts', settings: 'form', sdf: 'links', width: 'WIDE' },
  calendar: { label: 'Calendar', settings: 'form', sdf: 'calendar', width: 'NARROW' },
  lastlogin: { label: 'My Login Audit', settings: 'form', sdf: 'myloginaudit', width: 'NARROW' },
  quicksearch: { label: 'Quick Search', settings: 'form', sdf: 'quicksearch', width: 'NARROW' },
  searchform: { label: 'Search Form', settings: 'form', sdf: 'searchform', width: 'NARROW' },
  rsssource: { label: 'RSS/Atom Feed', settings: 'form', sdf: null, width: 'WIDE' },
  quickadd: { label: 'Quick Add', settings: 'form', sdf: null, width: 'NARROW' },
  reminders: { label: 'Reminders', settings: 'reminders', sdf: 'reminders', width: 'NARROW' },
  analytics: { label: 'Analytics', settings: 'manual', sdf: 'analytics', width: 'WIDE' },
  settings: { label: 'Settings', settings: 'none', sdf: 'settings', width: 'NARROW' },
  recentrecords: { label: 'Recent Records', settings: 'none', sdf: 'recentrecords', width: 'NARROW' },
  newfeatures: { label: 'New Release', settings: 'none', sdf: null, width: 'WIDE' },
  smtlinks: { label: 'Site Management Tools Links', settings: 'none', sdf: null, width: 'WIDE' },
  reconcilesummary: { label: 'Bank Reconciliation Summary', settings: 'none', sdf: null, width: 'WIDE' },
  tasklinks: { label: 'Task Links', settings: 'none', sdf: null, width: 'WIDE' },
  recentreports: { label: 'Recent Reports', settings: 'none', sdf: 'recentreports', width: 'NARROW' },
  eventscheduler: { label: 'Event Scheduler', settings: 'none', sdf: 'eventscheduler', width: 'NARROW' },
  tasks: { label: 'Tasks', settings: 'form', sdf: 'tasks', width: 'WIDE' },
};

export function typeInfo(type) {
  return PORTLET_TYPES[type] || { label: type, settings: 'form', sdf: null, width: 'WIDE' };
}

/** Field-name token NetSuite embeds for a slot: neg14050 for -14050, 1337 for 1337. */
export function slotToken(id) {
  const n = Number(id);
  return n < 0 ? `neg${Math.abs(n)}` : String(n);
}

// ---- DOM parsing --------------------------------------------------------------------

function safeJson(s, fallback) {
  try { return JSON.parse(s); } catch (_) { return fallback; }
}

export function parsePortletWrapper(el) {
  const actions = safeJson(el.getAttribute('data-portlet-actions') || '{}', {});
  const setup = actions.setup && Array.isArray(actions.setup.args) ? actions.setup.args[0] : null;
  const edit = ['editCustomize', 'editcustomize', 'customize'].map((k) => actions[k]).find((a) => a && Array.isArray(a.args));
  const params = actions.parameters && Array.isArray(actions.parameters.args) ? actions.parameters.args[0] : null;
  const state = (el.className.match(/ns-portlet-window-state-(\w+)/) || [])[1] || 'normal';
  const content = el.querySelector('[data-portlet-class]');
  return {
    id: Number(el.getAttribute('data-portlet-id')),
    type: el.getAttribute('data-portlet-type') || 'unknown',
    title: (el.querySelector('.ns-portlet-header-text')?.textContent || '').trim(),
    state,
    locked: el.getAttribute('data-portlet-locked') === 'true',
    portletClass: content ? content.getAttribute('data-portlet-class') : null,
    setupUrl: setup,
    parametersUrl: params,
    editUrl: edit ? edit.args[0] : null,
    actionNames: Object.keys(actions),
  };
}

/** Parse a rendered dashboard page (live document or fetched HTML). */
export function parseDashboardDoc(doc) {
  const container = doc.querySelector('.ns-dashboard-container');
  if (!container) throw new Error('Not a NetSuite dashboard page (no .ns-dashboard-container)');
  const identity = safeJson(container.getAttribute('data-dashboard-identity') || '{}', {});
  const columns = [...doc.querySelectorAll('.ns-dashboard-column')].map((c) => ({
    order: Number(c.getAttribute('data-column-order')) || 0,
    width: (c.getAttribute('data-column-type') || '').toUpperCase() || null,
    id: c.id,
  })).sort((a, b) => a.order - b.order);

  let layout = null;
  const sel = doc.querySelector('.ns-dashboard-layout-plugin-content .ns-selected');
  if (sel) layout = sel.closest('[data-action-args]')?.getAttribute('data-action-args') || null;
  if (!layout) {
    const cur = doc.querySelector('#ns-dashboard-layout-plugin')?.getAttribute('data-current-layout');
    if (cur) layout = cur.toUpperCase();
  }
  if (!layout) layout = columns.length === 3 ? 'THREE_COLUMN' : columns.length === 1 ? 'SINGLE_COLUMN' : (columns[0]?.width === 'NARROW' ? 'TWO_COLUMN' : 'TWO_COLUMN_RIGHT');

  const portlets = [];
  for (const col of doc.querySelectorAll('.ns-dashboard-column')) {
    const order = Number(col.getAttribute('data-column-order')) || 0;
    let i = 0;
    for (const w of col.querySelectorAll(':scope > .ns-portlet-wrapper')) {
      i += 1;
      portlets.push({ ...parsePortletWrapper(w), column: order, order: i });
    }
  }
  const title = (doc.querySelector('.uir-page-title-firstline, h1.uir-page-title, .ns-page-title')?.textContent || doc.title || '').trim();
  return {
    dashboardId: identity.dashboardid ?? null,
    dashboardType: container.getAttribute('data-dashboard-type') || null,
    locked: container.getAttribute('data-dashboard-locked') === 'true',
    layout,
    columns,
    portlets,
    title: title.replace(/\s*-\s*NetSuite.*$/, ''),
  };
}

/** Center tabs reachable from the nav of a dashboard page: [{id, name}]. */
export function listDashboardTabs(doc) {
  const seen = new Map();
  for (const a of doc.querySelectorAll('a[href*="card.nl?sc="], a[href*="card.nl?"][href*="sc="]')) {
    const m = /[?&]sc=(-?\d+)/.exec(a.getAttribute('href') || '');
    if (!m) continue;
    const id = Number(m[1]);
    const name = (a.textContent || '').trim();
    if (!seen.has(id) || (!seen.get(id).name && name)) seen.set(id, { id, name: name || STANDARD_TABS[String(id)] || `Tab ${id}` });
  }
  if (!seen.has(-29)) seen.set(-29, { id: -29, name: 'Home' });
  return [...seen.values()].sort((a, b) => (a.id === -29 ? -1 : b.id === -29 ? 1 : a.name.localeCompare(b.name)));
}

/**
 * Dashboards reachable through the navigation menu data (`NLNavMenuData.nl`), including
 * dashboards nested under menu categories ("sub-tabs" such as Purchasing › Dashboard) that are not
 * rendered as top-level tab links. Returns [{id, name, path, parent}].
 */
export function dashboardsFromNavMenu(menuJson) {
  const out = new Map();
  const walk = (items, trail) => {
    for (const it of items || []) {
      const label = String(it.label || '').trim();
      const m = /card\.nl\?(?:[^"'\s]*&)?sc=(-?\d+)/.exec(String(it.url || ''));
      if (m) {
        const id = Number(m[1]);
        const path = [...trail, label].filter(Boolean).join(' › ');
        const cur = out.get(id);
        if (!cur || path.length < cur.path.length) out.set(id, { id, name: label || STANDARD_TABS[String(id)] || `Tab ${id}`, path, parent: trail[trail.length - 1] || null });
      }
      if (Array.isArray(it.submenu) && it.submenu.length) walk(it.submenu, [...trail, label]);
    }
  };
  const rootItems = Array.isArray(menuJson) ? menuJson : (menuJson && (menuJson.menu || menuJson.items || menuJson.submenu)) || [];
  walk(rootItems, []);
  return [...out.values()];
}

/**
 * Full dashboard inventory for the current role: top-level tabs from the page plus nested
 * dashboards from the navigation menu. Never throws; falls back to the DOM list.
 */
export async function discoverDashboards(client, doc) {
  const tabs = new Map(listDashboardTabs(doc).map((t) => [t.id, { ...t, path: t.name }]));
  try {
    const { res, text } = await client.fetchText('/app/center/NLNavMenuData.nl');
    if (res.ok) {
      let json = null;
      try { json = JSON.parse(text); } catch (_) { const s = text.indexOf('['); const e = text.lastIndexOf(']'); if (s >= 0 && e > s) json = JSON.parse(text.slice(s, e + 1)); }
      for (const d of dashboardsFromNavMenu(json)) {
        const cur = tabs.get(d.id);
        if (!cur) tabs.set(d.id, d);
        else if (d.path && d.path.includes(' › ') && !cur.path.includes(' › ') && cur.name !== d.name) cur.path = d.path;
        else if (!cur.name || /^Tab -?\d+$/.test(cur.name)) { cur.name = d.name; cur.path = d.path; }
      }
    }
  } catch (_) { /* menu data unavailable: keep DOM tabs */ }
  if (!tabs.has(-29)) tabs.set(-29, { id: -29, name: 'Home', path: 'Home' });
  return [...tabs.values()].sort((a, b) => (a.id === -29 ? -1 : b.id === -29 ? 1 : (a.path || a.name).localeCompare(b.path || b.name)));
}

export function tabLabel(t) {
  return t ? `${t.path || t.name} (${t.id})` : '';
}

export function tabName(id, tabs) {
  const t = (tabs || []).find((x) => Number(x.id) === Number(id));
  return t ? t.name : STANDARD_TABS[String(id)] || `Tab ${id}`;
}

// ---- package -----------------------------------------------------------------------

export function newPackage({ source, dashboard, notes }) {
  return {
    format: PACKAGE_FORMAT,
    version: PACKAGE_VERSION,
    exportedAt: new Date().toISOString(),
    generator: 'NetSuite Dashboard Manager 0.1.3',
    notes: notes || '',
    source,
    dashboard,
  };
}

export function validatePackage(pkg) {
  const errors = [];
  if (!pkg || typeof pkg !== 'object') return ['Not an object'];
  if (pkg.format !== PACKAGE_FORMAT) errors.push(`Unexpected format "${pkg.format}"`);
  if (Number(pkg.version) > PACKAGE_VERSION) errors.push(`Package version ${pkg.version} is newer than this extension supports (${PACKAGE_VERSION})`);
  if (!pkg.dashboard || !Array.isArray(pkg.dashboard.portlets)) errors.push('Missing dashboard.portlets');
  if (pkg.dashboard && !LAYOUTS.includes(pkg.dashboard.layout)) errors.push(`Unknown layout ${pkg.dashboard && pkg.dashboard.layout}`);
  return errors;
}

/** Stable short signature used to match portlets across dashboards (type + main reference). */
export function portletSignature(p) {
  const refs = (p.settings && p.settings.refs) || {};
  const main = refs.savedSearchId || refs.listType || refs.scriptSource || refs.scorecardId || refs.snapshot || refs.kpis || refs.searchFormId || '';
  return `${p.type}:${main}`.toLowerCase();
}

export function summarizePortlet(p) {
  const refs = (p.settings && p.settings.refs) || {};
  const bits = [];
  if (refs.savedSearchName) bits.push(refs.savedSearchName);
  else if (refs.savedSearchId) bits.push(`search #${refs.savedSearchId}`);
  if (refs.listTypeName) bits.push(refs.listTypeName);
  if (refs.scriptName) bits.push(refs.scriptName);
  if (refs.scorecardName) bits.push(refs.scorecardName);
  if (refs.snapshotName) bits.push(refs.snapshotName);
  if (refs.kpis) bits.push(refs.kpis);
  if (refs.shortcutCount != null) bits.push(`${refs.shortcutCount} shortcuts`);
  if (refs.kpiCount != null) bits.push(`${refs.kpiCount} KPIs`);
  if (refs.reminderCount != null) bits.push(`${refs.reminderCount} reminders`);
  if (p.app) bits.push(`SuiteApp script ${p.app.scriptId}/${p.app.deploymentId}`);
  return bits.join(' · ');
}
