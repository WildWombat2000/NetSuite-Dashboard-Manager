// Generate a SuiteCloud Development Framework `publisheddashboard` object from captured packages.
// The XML follows docs/sdf-publisheddashboard-reference.md. Anything that cannot be derived
// from the live account (script ids, unmapped codes) is emitted as a TODO comment so the
// administrator can finish the object before `suitecloud object:deploy`.

import { LAYOUT_COLUMNS, typeInfo } from './model.js';
import { SLOT } from './capture.js';
import {
  DATE_RANGE_CODES, PERIOD_RANGE_CODES, SNAPSHOT_PERIOD_CODES, HIGHLIGHT_CODES, STANDARD_CENTERTABS,
  themeCode, drilldownCode, chartTypeCode, topxCode,
} from './sdf-codes.js';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const bool = (v) => (v === true || v === 'T' || v === 'true' || v === '1' ? 'T' : 'F');

class Xml {
  constructor() { this.lines = []; this.depth = 0; }
  pad() { return '    '.repeat(this.depth); }
  open(tag, attrs = {}) {
    const a = Object.entries(attrs).map(([k, v]) => ` ${k}="${esc(v)}"`).join('');
    this.lines.push(`${this.pad()}<${tag}${a}>`);
    this.depth += 1;
  }
  close(tag) { this.depth -= 1; this.lines.push(`${this.pad()}</${tag}>`); }
  leaf(tag, value) { if (value === undefined || value === null) return; this.lines.push(`${this.pad()}<${tag}>${esc(value)}</${tag}>`); }
  comment(text) { this.lines.push(`${this.pad()}<!-- ${String(text).replace(/--/g, '- -')} -->`); }
  toString() { return this.lines.join('\n') + '\n'; }
}

function entryValue(entries, name) {
  const e = (entries || []).find(([k]) => k === name);
  return e ? e[1] : undefined;
}
function slotField(entries, base) { return entryValue(entries, base.replace('#', SLOT)); }
function lineMachine(entries, prefix) {
  const fields = (entryValue(entries, `${prefix}fields`) || '').split('\x01');
  const data = entryValue(entries, `${prefix}data`) || '';
  if (!data) return [];
  return data.split('\x02').filter(Boolean).map((row) => {
    const cols = row.split('\x01');
    const o = {};
    fields.forEach((f, i) => { o[f] = cols[i]; });
    return o;
  });
}

/**
 * @param {Array} pkgs                one package per center tab
 * @param {object} o
 * @param {string} o.scriptId         custpubdashboard_xxx
 * @param {string} o.name             <= 30 chars
 * @param {string} o.center           role_centertype or [scriptid=custcenter_x]
 * @param {string[]} o.roles          generic_role names or customrole_* script ids
 * @param {string} [o.mode]           UNLOCKED | LOCKED | ADD_MOVE
 * @param {object} [o.resolvers]      async lookups: savedSearchScriptId(id), centerTabScriptId(tabId), customPortletRef(pkgPortlet), listTypeRef(code)
 */
export async function generateSdf(pkgs, o) {
  const x = new Xml();
  const todos = [];
  const skipped = [];
  const r = o.resolvers || {};
  const todo = (msg) => { todos.push(msg); x.comment(`TODO: ${msg}`); };

  x.open('publisheddashboard', { scriptid: o.scriptId || 'custpubdashboard_export' });
  x.leaf('center', o.center || 'BASIC');
  x.leaf('locknewbar', bool(o.lockNewBar));
  x.leaf('lockshortcuts', bool(o.lockShortcuts));
  x.leaf('name', String(o.name || 'Exported dashboard').slice(0, 30));
  if (o.notes) x.leaf('notes', String(o.notes).slice(0, 4000)); else x.lines.push(`${x.pad()}<notes/>`);
  x.open('roles');
  if (!o.roles || !o.roles.length) todo('add at least one role entry: roles / role / role = generic_role name or [scriptid=customrole_x]');
  for (const role of o.roles || []) {
    x.open('role');
    x.leaf('role', /^customrole/i.test(role) ? `[scriptid=${role}]` : role);
    x.close('role');
  }
  x.close('roles');

  x.open('dashboards');
  for (const pkg of pkgs) {
    const d = pkg.dashboard;
    const tabId = pkg.source && pkg.source.dashboardId;
    x.open('dashboard');
    let centertab = STANDARD_CENTERTABS[String(tabId)];
    if (!centertab && tabId != null) {
      const sid = r.centerTabScriptId ? await safe(() => r.centerTabScriptId(tabId)) : null;
      if (sid) centertab = `[scriptid=${sid}]`;
    }
    if (!centertab) {
      centertab = `[scriptid=custcentertab_TODO_${tabId}]`;
      todo(`centertab: set the script id of center tab ${tabId} (${pkg.source && pkg.source.dashboardName || ''})`);
    }
    x.leaf('centertab', centertab);
    x.leaf('layout', d.layout);
    x.leaf('mode', o.mode || 'UNLOCKED');

    const cols = LAYOUT_COLUMNS[d.layout] || LAYOUT_COLUMNS.TWO_COLUMN_RIGHT;
    for (let c = 1; c <= cols.length; c++) {
      x.open(cols[c - 1]);
      const inCol = d.portlets.filter((p) => Number(p.column) === c).sort((a, b) => a.order - b.order);
      for (const p of inCol) {
        await emitPortlet(x, p, r, todo, skipped);
      }
      x.close(cols[c - 1]);
    }
    x.close('dashboard');
  }
  x.close('dashboards');
  x.close('publisheddashboard');
  return { xml: x.toString(), todos, skipped };
}

async function safe(fn) { try { return await fn(); } catch (_) { return null; } }

async function savedSearchRef(id, r, todo, what) {
  if (id == null || id === '') return null;
  const n = Number(id);
  if (!Number.isNaN(n) && n < 0) return String(n); // standard system search: numeric id is accepted
  const sid = r.savedSearchScriptId ? await safe(() => r.savedSearchScriptId(id)) : null;
  if (sid) return `[scriptid=${sid}]`;
  todo(`${what}: replace customsearch_TODO_${id} with the script id of saved search ${id}`);
  return `[scriptid=customsearch_TODO_${id}]`;
}

function mapCode(table, code, todo, what) {
  if (code == null || code === '') return null;
  const v = table[String(code).toUpperCase()];
  if (v) return v;
  todo(`${what}: verify "${code}" against the SDF enumeration (no known mapping)`);
  return String(code).toUpperCase();
}

async function emitPortlet(x, p, r, todo, skipped) {
  const s = p.settings || {};
  const e = s.entries || [];
  const min = p.state === 'minimized' ? 'T' : 'F';
  const label = `${typeInfo(p.type).label}${p.title ? ` "${p.title}"` : ''}`;
  const skip = (why) => { skipped.push(`${label}: ${why}`); x.comment(`skipped ${label}: ${why}`); };

  if (p.app) return skip('SuiteApp dashboard portlets cannot be expressed in publisheddashboard XML');

  switch (p.type) {
    case 'searchresults': {
      x.open('customsearch');
      x.leaf('savedsearch', await savedSearchRef(slotField(e, 'setting_SEARCHRESULTS_ID_#'), r, todo, label));
      x.leaf('resultssize', slotField(e, 'setting_SEARCHRESULTS_SIZE_#') || '10');
      x.leaf('isminimized', min);
      x.leaf('drilldown', drilldownCode(slotField(e, 'setting_SEARCHRESULTS_DD_#')) || 'NEW_PAGE');
      x.leaf('charttheme', themeCode(slotField(e, 'setting_SEARCHRESULTS_CHARTTHEME_#')) || 'GLOBAL_THEME');
      x.leaf('backgroundtype', themeCode(slotField(e, 'setting_SEARCHRESULTS_BACKGROUND_TYPE_#')) || 'GLOBAL_BACKGROUND');
      x.leaf('allowinlineediting', bool(slotField(e, 'setting_SEARCHRESULTS_DLE_#')));
      const t = slotField(e, 'setting_SEARCHRESULTS_CUSTOM_TITLE_#');
      if (t) x.leaf('title', String(t).slice(0, 40));
      x.close('customsearch');
      return;
    }
    case 'list': {
      const code = slotField(e, 'setting_LIST_TYPE_#');
      let type = code;
      if (/^Custom\d+$/i.test(code || '')) {
        const ref = r.listTypeRef ? await safe(() => r.listTypeRef(code)) : null;
        type = ref ? `[scriptid=${ref}]` : `[scriptid=customrecord_TODO_${code.replace(/^Custom/i, '')}]`;
        if (!ref) todo(`${label}: set the custom record script id for list type ${code}`);
      } else if (code) type = String(code).toUpperCase();
      x.open('list');
      x.leaf('type', type);
      x.leaf('size', slotField(e, 'setting_LIST_SIZE_#') || '5');
      x.leaf('isminimized', min);
      x.leaf('allowinlineediting', bool(slotField(e, 'setting_LIST_DLE_#')));
      x.close('list');
      return;
    }
    case 'trendgraph': {
      x.open('trendgraph');
      const k1 = slotField(e, 'setting_TRENDGRAPH_KPI_#');
      const k2 = slotField(e, 'setting_TRENDGRAPH_KPI2_#');
      const k3 = slotField(e, 'setting_TRENDGRAPH_KPI3_#');
      x.leaf('kpi', k1 || 'SALES');
      if (!k1) todo(`${label}: no KPI captured`);
      x.leaf('trendtype', (slotField(e, 'setting_TRENDGRAPH_TYPE_#') || 'MONTHLY').toUpperCase());
      x.leaf('movingaverageperiod', slotField(e, 'setting_TRENDGRAPH_AVGWINDOW_#') || '2');
      if (k1 && /^CUSTOM/i.test(k1)) x.leaf('savedsearch', await savedSearchRef(slotField(e, 'setting_TRENDGRAPH_SEARCHKEY_#'), r, todo, label));
      if (k2) { x.leaf('kpi2', k2); if (/^CUSTOM/i.test(k2)) x.leaf('savedsearch2', await savedSearchRef(slotField(e, 'setting_TRENDGRAPH_SEARCHKEY2_#'), r, todo, label)); }
      if (k3) { x.leaf('kpi3', k3); if (/^CUSTOM/i.test(k3)) x.leaf('savedsearch3', await savedSearchRef(slotField(e, 'setting_TRENDGRAPH_SEARCHKEY3_#'), r, todo, label)); }
      x.leaf('isminimized', min);
      x.leaf('backgroundtype', themeCode(slotField(e, 'setting_TRENDGRAPH_BACKGROUND_TYPE_#')) || 'GLOBAL_BACKGROUND');
      x.leaf('charttheme', themeCode(slotField(e, 'setting_TRENDGRAPH_CHARTTHEME_#'), true) || 'GLOBAL_THEME');
      for (const [i, suffix] of [['', ''], ['2', '2'], ['3', '3']]) {
        const c = slotField(e, `setting_TRENDGRAPH_COLOR${i}_#`);
        if (c) x.leaf(`customseriescolor${suffix}`, c);
      }
      x.leaf('defaultcharttype', chartTypeCode(slotField(e, 'setting_TRENDGRAPH_CHART_TYPE_#')) || 'AREA');
      x.leaf('includezeroonyaxis', bool(slotField(e, 'setting_TRENDGRAPH_INCLUDES_ZERO_#')));
      x.leaf('showmovingaverage', bool(slotField(e, 'setting_TRENDGRAPH_AVG_#')));
      x.leaf('showlastdatapoint', bool(slotField(e, 'setting_TRENDGRAPH_LAST_POINT_#')));
      x.close('trendgraph');
      return;
    }
    case 'snapshots': {
      const rows = lineMachine(e, 'std').filter((row) => row.stdactive !== 'F');
      x.open('keyperformanceindicators');
      x.leaf('isminimized', min);
      x.leaf('cacheddata', bool(entryValue(e, 'cacheEnable')));
      x.open('kpis');
      for (const row of rows) {
        x.open('kpi');
        const custom = row.bCustom === 'T' || /^CUSTOM/i.test(row.stdkey || '');
        x.leaf('kpi', row.stdkey);
        if (custom) x.leaf('savedsearch', await savedSearchRef(row.stdsavedsearch, r, todo, `${label} / ${row.stdname}`));
        x.leaf('daterange', mapCode(DATE_RANGE_CODES, row.stddaterange, todo, `${label} / ${row.stdname} daterange`) || 'TODAY');
        if (row.stdperiod) x.leaf('periodrange', mapCode(PERIOD_RANGE_CODES, row.stdperiod, todo, `${label} / ${row.stdname} periodrange`));
        const compare = row.stdcompare === 'T';
        x.leaf('compare', bool(compare));
        if (compare) {
          if (row.stdcomparedaterange) x.leaf('comparedaterange', mapCode(DATE_RANGE_CODES, row.stdcomparedaterange, todo, `${label} / ${row.stdname} comparedaterange`));
          if (row.stdcompareperiod) x.leaf('compareperiodrange', mapCode(PERIOD_RANGE_CODES, row.stdcompareperiod, todo, `${label} / ${row.stdname} compareperiodrange`));
        }
        x.leaf('headline', bool(row.stdheadline));
        if (row.stdhighlightoption) x.leaf('highlightif', mapCode(HIGHLIGHT_CODES, row.stdhighlightoption, todo, `${label} / ${row.stdname} highlightif`));
        if (row.stdhighlightmarker) x.leaf('threshold', String(row.stdhighlightmarker).replace(/[^0-9.\-]/g, ''));
        x.close('kpi');
      }
      x.close('kpis');
      x.close('keyperformanceindicators');
      return;
    }
    case 'kpimeter': {
      const rows = lineMachine(e, 'std');
      x.open('kpimeter');
      x.leaf('kpi', (rows[0] && rows[0].stdkey) || 'SALES');
      if (!rows.length) todo(`${label}: no KPI captured`);
      x.leaf('isminimized', min);
      x.close('kpimeter');
      return;
    }
    case 'kpireport': {
      const disp = s.display || {};
      x.open('kpireport');
      x.leaf('isminimized', min);
      const orient = disp[`inpt_setting_KPIREPORT_ORIENTATION_${SLOT}`];
      if (orient) x.leaf('orientation', orient);
      const id = slotField(e, 'setting_KPIREPORT_ID_#');
      if (id) { x.leaf('reportid', id); if (Number(id) > 0) todo(`${label}: reportid ${id} is an account-specific internal id; custom scorecards may need a [scriptid=custkpiscorecard_x] reference`); }
      const restrict = disp[`inpt_setting_KPIREPORT_RESTRICT_${SLOT}`];
      if (restrict) x.leaf('restrict', restrict);
      x.leaf('showdates', bool(slotField(e, 'setting_KPIREPORT_SHOWDATES_#')));
      x.leaf('trend', bool(slotField(e, 'setting_KPIREPORT_TREND_#')));
      x.close('kpireport');
      return;
    }
    case 'enhsnapshots': {
      const snap = String(entryValue(e, 'enhancedsnapshot') || '').replace(/^ENHANCED:/, '');
      x.open('enhsnapshots');
      x.leaf('backgroundtype', themeCode(slotField(e, 'setting_ENHSNAPSHOTS_BACKGROUND_TYPE_#')) || 'GLOBAL_BACKGROUND');
      x.leaf('charttheme', themeCode(slotField(e, 'setting_ENHSNAPSHOTS_CHARTTHEME_#')) || 'GLOBAL_THEME');
      const color = entryValue(e, 'color'); if (color) x.leaf('color', color);
      x.leaf('custom', bool(entryValue(e, 'enhancedcustom')));
      const dr = entryValue(e, 'enhanceddaterange'); if (dr) x.leaf('daterange', mapCode(DATE_RANGE_CODES, dr, todo, `${label} daterange`));
      const pr = entryValue(e, 'enhancedperiodrange'); if (pr) x.leaf('periodrange', mapCode(SNAPSHOT_PERIOD_CODES, pr, todo, `${label} periodrange`));
      x.leaf('graphlayout', chartTypeCode(entryValue(e, 'enhancedgraphlayout')) || 'COLUMN');
      x.leaf('isgraph', bool(entryValue(e, 'enhancedisgraph')));
      x.leaf('isminimized', min);
      const nd = entryValue(e, 'enhancedisnewdaterange'); if (nd) x.leaf('isnewdaterange', mapCode(DATE_RANGE_CODES, nd, todo, `${label} isnewdaterange`));
      const orderby = entryValue(e, 'enhancedorderby'); if (orderby) x.leaf('orderby', orderby);
      x.leaf('orderdesc', bool(entryValue(e, 'enhancedorderbydesc')));
      if (snap) x.leaf('snapshot', snap); else todo(`${label}: no snapshot captured`);
      const topx = topxCode(entryValue(e, 'enhancedtopx')); if (topx) { x.leaf('topx', topx); x.leaf('listtopx', topx); }
      x.close('enhsnapshots');
      return;
    }
    case 'scriptportlet': {
      const ref = r.customPortletRef ? await safe(() => r.customPortletRef(p)) : null;
      x.open('customportlet');
      if (ref) x.leaf('source', `[scriptid=${ref}]`);
      else {
        x.leaf('source', `[scriptid=customscript_TODO.customdeploy_TODO]`);
        todo(`${label}: set the portlet script deployment reference (script source ${entryValue(e, 'scriptsource') || '?'}, "${(s.display || {}).inpt_scriptsource || ''}")`);
      }
      x.leaf('isminimized', min);
      x.close('customportlet');
      return;
    }
    case 'calendar': {
      x.open('calendar');
      x.leaf('numberofrecordsinagenda', slotField(e, 'setting_CALENDAR_MAXIMUMACTIVITIES_#') || '7');
      x.leaf('isminimized', min);
      x.leaf('showevents', bool(slotField(e, 'setting_CALENDAR_SHOWEVENTS_#')));
      x.leaf('showblockingtasks', bool(slotField(e, 'setting_CALENDAR_SHOWTASKS_#')));
      x.leaf('shownonblockingtasks', bool(slotField(e, 'setting_CALENDAR_SHOWNONBLOCKTASKS_#')));
      x.leaf('showblockingcalls', bool(slotField(e, 'setting_CALENDAR_SHOWCALLS_#')));
      x.leaf('shownonblockingcalls', bool(slotField(e, 'setting_CALENDAR_SHOWNONBLOCKCALLS_#')));
      x.leaf('showcanceledevents', bool(slotField(e, 'setting_CALENDAR_SHOWCANCELLEDEVENTS_#')));
      x.leaf('showweekendsinmonthlyview', bool(slotField(e, 'setting_CALENDAR_SHOW_WEEKENDS_ON_MONTH_VIEW_#')));
      const agenda = slotField(e, 'setting_CALENDAR_DEFAULTAGENDALIMIT_#');
      x.leaf('recordstodisplayinagenda', agenda === 'todayonly' ? 'TODAY_ONLY' : agenda ? 'UPCOMING' : 'TODAY_ONLY');
      x.leaf('showcampaignevents', bool(slotField(e, 'setting_CALENDAR_SHOWCAMPAIGNEVENTS_#')));
      x.close('calendar');
      return;
    }
    case 'lastlogin': {
      x.open('lastlogin');
      x.leaf('isminimized', min);
      for (const [k, v] of e) {
        const m = /^setting_LASTLOGIN_(SHOW[A-Z]+)_\{\{SLOT\}\}$/.exec(k);
        if (m) x.leaf(m[1].toLowerCase(), bool(v));
      }
      x.close('lastlogin');
      return;
    }
    case 'quicksearch': {
      x.open('quicksearch');
      x.leaf('searchtype', (slotField(e, 'setting_QUICKSEARCH_TYPE_#') || 'GENERIC').toUpperCase());
      x.leaf('isminimized', min);
      const g = slotField(e, 'setting_QUICKSEARCH_GENERIC_DFLT_#'); if (g) x.leaf('defaultgeneraltype', String(g).toUpperCase());
      const t = slotField(e, 'setting_QUICKSEARCH_TRANSACTION_DFLT_#'); if (t) x.leaf('defaulttransactiontype', String(t).toUpperCase());
      x.close('quicksearch');
      return;
    }
    case 'searchform': {
      x.open('searchform');
      x.leaf('savedsearch', await savedSearchRef(slotField(e, 'setting_SEARCHFORM_ID_#'), r, todo, label));
      x.leaf('isminimized', min);
      x.close('searchform');
      return;
    }
    case 'reminders': {
      x.open('reminders');
      x.leaf('isminimized', min);
      x.leaf('showzeroresults', bool(s.zeroResults));
      for (const [group, ids] of [['headline', s.headlineItems || []], ['other', s.standardItems || []]]) {
        if (!ids.length) continue;
        x.open(group);
        for (const id of ids) {
          x.open('reminder');
          const m = /^SEARCH(\d+)$/i.exec(String(id));
          x.leaf('id', m ? await savedSearchRef(m[1], r, todo, `${label} reminder ${s.labels && s.labels[id] || id}`) : String(id));
          x.close('reminder');
        }
        x.close(group);
      }
      todo(`${label}: per-reminder day thresholds and highlighting rules are not captured; add days / highlightingrules elements by hand if used`);
      x.close('reminders');
      return;
    }
    case 'analytics':
      x.open('analytics');
      x.leaf('portlettype', 'CHART');
      x.leaf('visualization', '[scriptid=custworkbook_TODO.custchart_TODO]');
      x.leaf('isminimized', min);
      if (p.title) x.leaf('name', String(p.title).slice(0, 50));
      x.close('analytics');
      todo(`${label}: analytics portlet configuration is not readable from the UI; set portlettype/visualization by hand`);
      return;
    case 'shortcuts': case 'settings': case 'recentrecords': case 'recentreports': case 'tasklinks': case 'eventscheduler': {
      const el = p.type === 'eventscheduler' ? 'scheduler' : p.type;
      x.open(el); x.leaf('isminimized', min); x.close(el);
      if (p.type === 'shortcuts') todo('Shortcuts: SDF only places the portlet; the links themselves are per-user (use the extension import to copy them)');
      return;
    }
    default:
      return skip('not supported by the publisheddashboard SDF object');
  }
}
