// Capture a dashboard (layout + portlets + every portlet's configuration) into a portable package.
import { parseDashboardDoc, listDashboardTabs, newPackage, slotToken, typeInfo, tabName } from './model.js';

export const SLOT = '{{SLOT}}';

/** Boilerplate form fields that must come from the *target* form at import time, never from the package. */
export const VOLATILE_FIELD = /^(_csrf|_eml_nkey_|nsapi[A-Za-z]+|nsbrowserenv|_multibtnstate_|selectedtab|_button|formdisplayview|whence|customwhence|externalid|id|submitted|submitter|cancel|_cancel|entryformquerystring|sc|portletid|qelem|sectionid|type|nlapiPI|nlapiSR|nlapiVF|nlapiFC|nlapiPS|nlapiVI|nlapiVD|nlapiPD|nlapiVL|nlapiRC|nlapiLI|nlapiLC|nlapiCT)$/;

const LINE_SEP = '\x02';
const COL_SEP = '\x01';

export function normalizeToken(str, token) {
  if (!token || !str) return str;
  return String(str).split(token).join(SLOT);
}

export function denormalizeToken(str, token) {
  if (!str) return str;
  return String(str).split(SLOT).join(token);
}

/**
 * Capture one dashboard.
 * @param {import('./nsclient.js').NsClient} client
 * @param {number} dashboardId
 * @param {{doc?:Document, includeSettings?:boolean, onProgress?:Function, tabs?:Array}} opts
 */
export async function captureDashboard(client, dashboardId, { doc = null, includeSettings = true, onProgress = () => {}, tabs = null } = {}) {
  let pageDoc = doc;
  if (!pageDoc || !sameDashboard(pageDoc, dashboardId)) {
    onProgress({ phase: 'page', message: `Loading dashboard ${dashboardId}` });
    pageDoc = await client.fetchDashboardPage(dashboardId);
  }
  const parsed = parseDashboardDoc(pageDoc);
  const tabList = tabs || listDashboardTabs(pageDoc);
  const name = tabName(dashboardId, tabList);

  let dashApps = null;
  if (parsed.portlets.some((p) => p.type === 'scriptportlet')) {
    dashApps = await client.getUsedDashApps(dashboardId);
  }

  const portlets = [];
  let n = 0;
  for (const p of parsed.portlets) {
    n += 1;
    onProgress({ phase: 'portlet', index: n, total: parsed.portlets.length, message: `${p.title || p.type} (${p.id})` });
    const entry = {
      key: `p${n}`,
      slotId: p.id,
      type: p.type,
      typeLabel: typeInfo(p.type).label,
      title: p.title,
      column: p.column,
      order: p.order,
      state: p.state,
      locked: p.locked,
      portletClass: p.portletClass,
      setupUrl: p.setupUrl,
      editUrl: p.editUrl,
      app: detectDashboardApp(p, dashApps),
      settings: { kind: 'none' },
    };
    if (includeSettings) {
      try {
        entry.settings = await captureSettings(client, dashboardId, p);
      } catch (e) {
        entry.settings = { kind: 'error', error: String(e && e.message || e) };
      }
    }
    portlets.push(entry);
  }

  const emlKey = readEmlKey(pageDoc);
  const source = {
    accountId: client.accountId,
    host: new URL(client.origin).host,
    dashboardId,
    dashboardName: name,
    dashboardType: parsed.dashboardType,
    roleId: emlKey ? emlKey.role : null,
    roleName: emlKey ? emlKey.roleName || null : null,
    entityId: emlKey ? emlKey.entity : null,
    companyName: emlKey ? emlKey.companyName || null : null,
    capturedFrom: location && location.href ? location.href.split('?')[0] : null,
  };

  return newPackage({
    source,
    dashboard: {
      layout: parsed.layout,
      columns: parsed.columns,
      locked: parsed.locked,
      portlets,
    },
  });
}

/** Capture several tabs into a bundle. */
export async function captureBundle(client, dashboardIds, opts = {}) {
  const dashboards = [];
  for (const id of dashboardIds) {
    dashboards.push(await captureDashboard(client, id, { ...opts, doc: opts.doc }));
  }
  return { format: 'netsuite-dashboard-bundle', version: 1, exportedAt: new Date().toISOString(), dashboards };
}

function sameDashboard(doc, dashboardId) {
  try { return Number(parseDashboardDoc(doc).dashboardId) === Number(dashboardId); } catch (_) { return false; }
}

/** Session identity: dashboards carry it in the session-status script URL, forms in _eml_nkey_. */
function readEmlKey(doc) {
  const el = doc.querySelector('input[name="_eml_nkey_"]');
  const v = el ? el.value : null;
  if (v) {
    const [company, entity, role] = v.split('~');
    return { company, entity, role };
  }
  for (const s of doc.scripts) {
    const src = s.getAttribute('src') || '';
    if (!/session_status_init/.test(src)) continue;
    try {
      const u = new URL(src, 'https://x');
      return {
        company: u.searchParams.get('companyId'), entity: u.searchParams.get('entityId'), role: u.searchParams.get('roleId'),
        roleName: u.searchParams.get('roleName'), companyName: u.searchParams.get('companyName'),
      };
    } catch (_) { /* ignore */ }
  }
  return null;
}

function detectDashboardApp(p, dashApps) {
  if (p.type !== 'scriptportlet' || !dashApps || typeof dashApps !== 'object') return null;
  const slots = dashApps.dashAppSlots || dashApps.info?.dashAppSlots || null;
  if (!slots) return null;
  const hit = slots[String(p.id)] || Object.values(slots).find((s) => s && Number(s.portletId ?? s.id) === Number(p.id));
  if (!hit) return null;
  const scriptId = hit.scriptId ?? hit.scriptid ?? hit.script ?? null;
  const deploymentId = hit.deploymentId ?? hit.deployid ?? hit.deployment ?? null;
  if (scriptId == null) return null;
  return { scriptId: Number(scriptId), deploymentId: deploymentId == null ? null : Number(deploymentId), raw: hit };
}

/** Read a portlet's configuration in a slot-independent form. */
export async function captureSettings(client, dashboardId, p) {
  const info = typeInfo(p.type);
  if (info.settings === 'none') return { kind: 'none' };
  if (info.settings === 'manual') return { kind: 'manual', note: `${info.label} portlets have no replayable setup form; reconfigure by hand after import.` };
  if (info.settings === 'reminders') return captureReminders(client, dashboardId, p);
  if (!p.setupUrl) return { kind: 'none', note: 'No Set Up action exposed for this portlet' };

  const form = await client.fetchForm(p.setupUrl);
  const token = slotToken(p.id);
  const entries = [];
  const display = {};
  for (const [name, value] of form.entries) {
    if (VOLATILE_FIELD.test(name)) continue;
    const nName = normalizeToken(name, token);
    const nValue = normalizeToken(value, token);
    entries.push([nName, nValue]);
    if (/^inpt_|_display$|_formattedValue$/.test(nName)) display[nName] = nValue;
  }
  const typeField = form.entries.find(([k]) => k === 'type');
  return {
    kind: 'form',
    formAction: form.action.replace(/^https?:\/\/[^/]+/, ''),
    formType: typeField ? typeField[1] : null,
    formTitle: form.title,
    entries,
    display,
    refs: extractRefs(p.type, entries, display),
  };
}

async function captureReminders(client, dashboardId, p) {
  const json = await client.portletAction(dashboardId, p.id, 'setup');
  const all = json.allItems || {};
  const headline = [];
  const standard = [];
  for (const [k, v] of Object.entries(json)) {
    if (!/selected/i.test(k)) continue;
    const ids = Array.isArray(v) ? v.map((x) => (x && typeof x === 'object' ? x.id : x)) : v && typeof v === 'object' ? Object.keys(v) : [];
    (/headline/i.test(k) ? headline : standard).push(...ids);
  }
  const labels = {};
  for (const id of [...headline, ...standard]) if (all[id]) labels[id] = all[id].value;
  const { allItems, ...rest } = json;
  return {
    kind: 'reminders',
    headlineItems: headline,
    standardItems: standard,
    zeroResults: !!(json.zeroResults ?? json.showZeroResults),
    labels,
    raw: rest,
    refs: { reminderCount: headline.length + standard.length },
  };
}

function val(entries, name) {
  const e = entries.find(([k]) => k === name);
  return e ? e[1] : undefined;
}

function parseLineMachine(entries, prefix) {
  const fields = (val(entries, `${prefix}fields`) || '').split(COL_SEP);
  const data = val(entries, `${prefix}data`) || '';
  if (!data) return [];
  return data.split(LINE_SEP).filter(Boolean).map((row) => {
    const cols = row.split(COL_SEP);
    const o = {};
    fields.forEach((f, i) => { o[f] = cols[i]; });
    return o;
  });
}

/** Human-meaningful references for display, matching and validation. */
export function extractRefs(type, entries, display) {
  const refs = {};
  const S = SLOT;
  switch (type) {
    case 'searchresults':
      refs.savedSearchId = val(entries, `setting_SEARCHRESULTS_ID_${S}`);
      refs.savedSearchName = display[`setting_SEARCHRESULTS_ID_${S}_display`];
      refs.customTitle = val(entries, `setting_SEARCHRESULTS_CUSTOM_TITLE_${S}`);
      refs.size = val(entries, `setting_SEARCHRESULTS_SIZE_${S}`);
      break;
    case 'list':
      refs.listType = val(entries, `setting_LIST_TYPE_${S}`);
      refs.listTypeName = display[`setting_LIST_TYPE_${S}_display`];
      break;
    case 'kpireport':
      refs.scorecardId = val(entries, `setting_KPIREPORT_ID_${S}`);
      refs.scorecardName = display[`inpt_setting_KPIREPORT_ID_${S}`];
      break;
    case 'scriptportlet':
      refs.scriptSource = val(entries, 'scriptsource');
      refs.scriptName = display.inpt_scriptsource;
      break;
    case 'trendgraph':
      refs.kpis = [1, 2, 3].map((i) => display[`inpt_setting_TRENDGRAPH_KPI${i === 1 ? '' : i}_${S}`]).filter((x) => x && x.trim()).join(' + ');
      break;
    case 'enhsnapshots':
      refs.snapshot = val(entries, 'enhancedsnapshot');
      refs.snapshotName = display.inpt_enhancedsnapshot;
      break;
    case 'searchform':
      refs.searchFormId = val(entries, `setting_SEARCHFORM_ID_${S}`);
      refs.searchFormName = display[`setting_SEARCHFORM_ID_${S}_display`];
      break;
    case 'shortcuts': {
      const rows = parseLineMachine(entries, 'shortcut');
      refs.shortcutCount = rows.length;
      refs.shortcuts = rows.map((r) => ({ enabled: r.shortcutenable === 'T', label: r.shortcutlabel, url: r.shortcuturl, newWindow: r.shortcutnewwindow === 'T' }));
      break;
    }
    case 'snapshots': {
      const rows = parseLineMachine(entries, 'std');
      refs.kpiCount = rows.length;
      refs.kpis = rows.map((r) => r.stdname).filter(Boolean).slice(0, 8).join(', ') + (rows.length > 8 ? ', …' : '');
      refs.customKpiIds = (val(entries, 'custKPI') || '').split(/[\x01,]/).filter(Boolean);
      break;
    }
    case 'kpimeter': {
      const rows = parseLineMachine(entries, 'std');
      refs.kpis = rows.map((r) => r.stdkey).filter(Boolean).join(', ');
      break;
    }
    default:
      break;
  }
  return refs;
}
