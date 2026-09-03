// Offline unit tests. Run with:  node tests/run.mjs   (Node 18+; no dependencies)
// Browser-only globals (DOMParser, document) are stubbed minimally where a module needs them.
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = (f) => new URL(`../extension/src/${f}`, import.meta.url).href;

// Minimal DOM stand-ins so nsclient/apply can be imported under Node.
globalThis.location = { origin: 'https://1234567.app.netsuite.com', href: 'https://1234567.app.netsuite.com/app/center/card.nl?sc=-29' };
globalThis.document = { getElementById: () => null, createElement: () => ({ set innerHTML(v) { this._h = v; }, querySelector: () => null }) };
globalThis.DOMParser = class { parseFromString() { return { querySelector: () => null, title: '' }; } };

const { tolerantJson, serializeForm } = await import(src('nsclient.js'));
const { mergeFormEntries, planImport, executePlan, describeStep, mapColumns, detectFormError } = await import(src('apply.js'));
const { SLOT, extractRefs, normalizeToken } = await import(src('capture.js'));
const { slotToken, validatePackage, portletSignature, LAYOUT_COLUMNS } = await import(src('model.js'));
const { generateSdf } = await import(src('sdf.js'));
const { diffPackages } = await import(src('diff.js'));

let passed = 0, failed = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log(`ok   ${name}`); }
  catch (e) { failed++; console.log(`FAIL ${name}\n     ${e.message}`); }
}

// ---------------------------------------------------------------- tolerantJson
await test('tolerantJson strips NetSuite trailing HTML comments', () => {
  const t = '{"a":1,"status":"ok"}\n<!-- Host [ x ] URL [ /app/center/card.nl ] -->\n<!-- All SQL was faster than 100 ms -->\n';
  assert.deepEqual(tolerantJson(t), { a: 1, status: 'ok' });
});
await test('tolerantJson tolerates control characters and BOM', () => {
  assert.deepEqual(tolerantJson('﻿{"x":"ab"}<!-- c -->'), { x: 'a b' });
});
await test('tolerantJson rejects HTML', () => {
  assert.throws(() => tolerantJson('<!DOCTYPE html><html><title>Error</title></html>'));
});

// ---------------------------------------------------------------- slot tokens
await test('slotToken formats negative and positive ids', () => {
  assert.equal(slotToken(-14050), 'neg14050');
  assert.equal(slotToken(1337), '1337');
  assert.equal(normalizeToken('setting_SEARCHRESULTS_ID_neg14050_display', 'neg14050'), `setting_SEARCHRESULTS_ID_${SLOT}_display`);
});

// ---------------------------------------------------------------- merge
const targetForm = [
  ['submitter', 'Save'],
  ['setting_SEARCHRESULTS_ID_1341_display', ''], ['setting_SEARCHRESULTS_ID_1341', ''],
  ['setting_SEARCHRESULTS_CUSTOM_TITLE_1341', ''],
  ['setting_SEARCHRESULTS_SIZE_1341_formattedValue', '10'], ['setting_SEARCHRESULTS_SIZE_1341', '10'],
  ['inpt_setting_SEARCHRESULTS_DD_1341', 'To New Page'], ['setting_SEARCHRESULTS_DD_1341', 'NEWPAGE'],
  ['setting_SEARCHRESULTS_DLE_1341', 'T'], ['setting_SEARCHRESULTS_DLE_1341_send', 'T'],
  ['_eml_nkey_', '1234567~1~3~N'], ['type', 'PortletSettings'], ['id', ''], ['entryformquerystring', 'portletid=1341&sectionid=124'],
  ['_csrf', 'fresh-token'], ['sc', '124'], ['qelem', 'servercontent1341'], ['portletid', '1341'], ['submitted', ''],
];
const stored = [
  [`setting_SEARCHRESULTS_ID_${SLOT}_display`, 'Purchasing Tracking Items'], [`setting_SEARCHRESULTS_ID_${SLOT}`, '6532'],
  [`setting_SEARCHRESULTS_CUSTOM_TITLE_${SLOT}`, 'Mine'],
  [`setting_SEARCHRESULTS_SIZE_${SLOT}_formattedValue`, '20'], [`setting_SEARCHRESULTS_SIZE_${SLOT}`, '20'],
  [`inpt_setting_SEARCHRESULTS_DD_${SLOT}`, 'To New Page'], [`setting_SEARCHRESULTS_DD_${SLOT}`, 'NEWPAGE'],
  // checkbox unchecked at source: only the _send companion is present, empty
  [`setting_SEARCHRESULTS_DLE_${SLOT}_send`, ''],
];
await test('mergeFormEntries keeps target boilerplate, overlays stored fields, honours unchecked checkboxes', () => {
  const merged = mergeFormEntries(targetForm, stored, '1341');
  const m = new Map(merged);
  assert.equal(m.get('_csrf'), 'fresh-token');
  assert.equal(m.get('sc'), '124');
  assert.equal(m.get('portletid'), '1341');
  assert.equal(m.get('qelem'), 'servercontent1341');
  assert.equal(m.get('setting_SEARCHRESULTS_ID_1341'), '6532');
  assert.equal(m.get('setting_SEARCHRESULTS_SIZE_1341'), '20');
  assert.equal(m.get('setting_SEARCHRESULTS_CUSTOM_TITLE_1341'), 'Mine');
  assert.equal(m.get('submitted'), 'T');
  assert.equal(m.get('submitter'), 'Save');
  assert.ok(!merged.some(([k]) => k === 'setting_SEARCHRESULTS_DLE_1341'), 'unchecked checkbox must not be posted');
  assert.equal(m.get('setting_SEARCHRESULTS_DLE_1341_send'), '');
  assert.ok(!merged.some(([k]) => k.includes(SLOT)), 'no slot placeholders may remain');
  const names = merged.map(([k]) => k);
  assert.equal(new Set(names).size, names.length, 'no duplicate field names');
});

// ---------------------------------------------------------------- refs
await test('extractRefs parses the KPI line machine', () => {
  const entries = [
    ['stdfields', 'stdactive\x01stdname\x01stdkey\x01bCustom\x01stddaterange'],
    ['stddata', 'T\x01Sales\x01SALES\x01F\x01TM\x02T\x01My KPI\x01CUSTOM\x01T\x01TODAY'],
    ['custKPI', '123\x01456'],
  ];
  const refs = extractRefs('snapshots', entries, {});
  assert.equal(refs.kpiCount, 2);
  assert.equal(refs.kpis, 'Sales, My KPI');
  assert.deepEqual(refs.customKpiIds, ['123', '456']);
});
await test('extractRefs parses shortcuts', () => {
  const entries = [
    ['shortcutfields', 'shortcutseqnum\x01shortcutenable\x01shortcutlabel\x01shortcuturl\x01shortcutnewwindow'],
    ['shortcutdata', '1\x01T\x01Approve\x01/app/x.nl?a=1\x01T\x022\x01F\x01Other\x01\x01F'],
  ];
  const refs = extractRefs('shortcuts', entries, {});
  assert.equal(refs.shortcutCount, 2);
  assert.equal(refs.shortcuts[0].label, 'Approve');
  assert.equal(refs.shortcuts[1].enabled, false);
});

// ---------------------------------------------------------------- column mapping
await test('mapColumns matches widths across layouts', () => {
  assert.deepEqual(mapColumns('TWO_COLUMN_RIGHT', 'TWO_COLUMN'), { 1: 2, 2: 1 });
  assert.deepEqual(mapColumns('THREE_COLUMN', 'TWO_COLUMN_RIGHT'), { 1: 2, 2: 1, 3: 2 });
  assert.deepEqual(mapColumns('TWO_COLUMN', 'SINGLE_COLUMN'), { 1: 1, 2: 1 });
  assert.deepEqual(mapColumns('THREE_COLUMN', 'THREE_COLUMN'), { 1: 1, 2: 2, 3: 3 });
});

// ---------------------------------------------------------------- fixture package
const fixture = JSON.parse(readFileSync(path.join(here, 'fixtures', 'sample-home.nsdash.json'), 'utf8'));
await test('fixture validates', () => assert.deepEqual(validatePackage(fixture), []));

// ---------------------------------------------------------------- planImport with a stubbed client
function stubTarget({ layout = 'TWO_COLUMN', displayed = [], slots = {} }) {
  const cols = LAYOUT_COLUMNS[layout].length;
  const targetDoc = { __stub: true };
  const parsed = {
    dashboardId: 124, dashboardType: 'CUSTOM', locked: false, layout,
    columns: Array.from({ length: cols }, (_, i) => ({ order: i + 1, width: 'WIDE' })),
    portlets: displayed,
  };
  const client = {
    calls: [],
    fetchDashboardPage: async () => targetDoc,
    getAvailablePortlets: async () => ({ groups: [{ type: 'STANDARD_CONTENT', items: Object.entries(slots).flatMap(([type, ids]) => ids.map((id) => ({ id, typeName: type }))) }] }),
    setLayout: async (d, l) => { client.calls.push(['layout', l]); return {}; },
    setPortletVisibility: async (d, id, v, c, o) => { client.calls.push(['vis', id, v, c, o]); return {}; },
    setPortletPlacement: async (d, id, c, o) => { client.calls.push(['place', id, c, o]); return {}; },
    setPortletMinimized: async (d, id, m) => { client.calls.push(['min', id, m]); return {}; },
    allocateDashboardApp: async (d, s) => { client.calls.push(['app', s.scriptId, s.deploymentId]); return { portletId: -1004 }; },
    portletAction: async (d, id, action, params) => { client.calls.push(['portlet', id, action]); if (action === 'load') return { wrapper: '' }; return {}; },
  };
  return { client, parsed, targetDoc };
}


await test('planImport allocates slots, reports capacity, keeps Settings, applies layout', async () => {
  const { client, parsed, targetDoc } = stubTarget({
    layout: 'TWO_COLUMN',
    displayed: [{ id: 1337, type: 'searchresults', title: 'Existing', column: 1, order: 1, state: 'normal' }, { id: 9, type: 'settings', title: 'Settings', column: 2, order: 1, state: 'normal' }],
    slots: { searchresults: [1337, 1338], scriptportlet: [1336], shortcuts: [], settings: [9], snapshots: [], reminders: [], kpimeter: [], lastlogin: [], kpireport: [] },
  });
  const applyMod = await import(src('apply.js'));
  client.loadPortlet = async () => ({ wrapper: '' });
  const plan = await planWithStub(applyMod, client, fixture, 124, { mode: 'replace', doc: targetDoc, parsed });
  const kinds = plan.steps.map((s) => s.kind);
  assert.ok(kinds.includes('hide'), 'replace hides existing');
  assert.ok(!plan.steps.some((s) => s.kind === 'hide' && s.type === 'settings'), 'settings never hidden');
  assert.ok(plan.steps.some((s) => s.kind === 'layout' && s.layout === 'TWO_COLUMN_RIGHT'));
  const shows = plan.steps.filter((s) => s.kind === 'show');
  assert.equal(shows.filter((s) => s.type === 'searchresults').length, 2, 'two custom-search slots available after hide');
  assert.ok(plan.steps.some((s) => s.kind === 'skip' && /slot\(s\) are in use|not available/.test(s.reason)));
  assert.ok(plan.steps.some((s) => s.kind === 'app' && s.scriptId === 811));
  const res = await executePlan(client, plan, { dryRun: false, pauseMs: 0 });
  assert.ok(res.results.every((r) => r.ok || r.skipped || /Set Up form|not added/.test(r.message)), JSON.stringify(res.results.filter((r) => !r.ok).map((r) => r.message)));
  assert.ok(client.calls.some((c) => c[0] === 'layout'));
  assert.ok(client.calls.some((c) => c[0] === 'vis' && c[2] === false), 'hide calls issued');
  assert.ok(client.calls.some((c) => c[0] === 'app'));
  assert.ok(client.calls.some((c) => c[0] === 'min'));
  // Rollback: every portlet whose settings failed (stub exposes no Set Up form) must be hidden again
  // and its later place/minimise steps skipped.
  const failedSettings = res.results.filter((r) => r.step.kind === 'settings' && !r.ok);
  assert.ok(failedSettings.length > 0, 'stub should make settings fail');
  for (const f of failedSettings) {
    assert.ok(f.rolledBack, `settings failure should roll back: ${f.message}`);
    const shown = res.results.find((r) => r.step.kind === 'show' && r.step.srcKey === f.step.srcKey);
    if (shown) assert.ok(client.calls.some((c) => c[0] === 'vis' && c[1] === shown.step.portletId && c[2] === false), 'rolled-back slot hidden');
    const later = res.results.filter((r) => r.step.srcKey === f.step.srcKey && ['place', 'minimize'].includes(r.step.kind));
    assert.ok(later.every((r) => r.skipped), 'steps after a rollback are skipped');
  }
  assert.ok(res.removed.length === failedSettings.length);
});

await test('executePlan can be told not to roll back', async () => {
  const { client, parsed, targetDoc } = stubTarget({ layout: 'TWO_COLUMN_RIGHT', displayed: [], slots: { searchresults: [1337] } });
  client.loadPortlet = async () => ({ wrapper: '' });
  const applyMod = await import(src('apply.js'));
  const one = { ...fixture, dashboard: { ...fixture.dashboard, portlets: [fixture.dashboard.portlets[0]] } };
  const plan = await planWithStub(applyMod, client, one, 124, { mode: 'merge', doc: targetDoc, parsed });
  const res = await executePlan(client, plan, { pauseMs: 0, removeOnFailure: false });
  assert.ok(!client.calls.some((c) => c[0] === 'vis' && c[2] === false));
  assert.ok(res.results.some((r) => r.step.kind === 'place' && r.ok), 'place still runs without rollback');
});

await test('dashboardsFromNavMenu finds nested dashboards under categories', async () => {
  const { dashboardsFromNavMenu } = await import(src('model.js'));
  const menu = [
    { type: 'TAB', label: 'Home', url: '/app/center/card.nl?sc=-29', submenu: [] },
    { type: 'TAB', label: 'Aline Operations', url: '/app/center/card.nl?sc=112', submenu: [
      { type: 'CATEGORY', label: 'Purchasing', submenu: [{ type: 'TASK', label: 'Dashboard', url: 'https://x.app.netsuite.com/app/center/card.nl?sc=119&whence=', submenu: [] }, { type: 'TASK', label: 'Open POs', url: '/app/common/search/searchresults.nl?searchid=1', submenu: [] }] },
      { type: 'CATEGORY', label: 'Warehouse', submenu: [{ type: 'TASK', label: 'Dashboard', url: '/app/center/card.nl?sc=114', submenu: [] }] },
    ] },
    { type: 'TAB', label: 'Reports', url: '/app/center/card.nl?sc=-9', submenu: [] },
  ];
  const d = dashboardsFromNavMenu(menu).sort((a, b) => a.id - b.id);
  assert.deepEqual(d.map((x) => [x.id, x.path]), [[-29, 'Home'], [-9, 'Reports'], [112, 'Aline Operations'], [114, 'Aline Operations › Warehouse › Dashboard'], [119, 'Aline Operations › Purchasing › Dashboard']]);
  assert.equal(d.find((x) => x.id === 119).parent, 'Purchasing');
});

await test('suggestBundleMapping matches by id, then name, else unavailable', async () => {
  const { suggestBundleMapping } = await import(src('apply.js'));
  const mk = (id, name) => ({ source: { dashboardId: id, dashboardName: name }, dashboard: { layout: 'TWO_COLUMN', portlets: [] } });
  const bundle = { format: 'netsuite-dashboard-bundle', dashboards: [mk(-29, 'Home'), mk(124, 'EST'), mk(555, 'Warehouse'), mk(777, 'Sales')] };
  const tabs = [{ id: -29, name: 'Home' }, { id: 124, name: 'EST' }, { id: 91, name: 'sales' }];
  const m = suggestBundleMapping(bundle, tabs);
  assert.deepEqual(m.map((x) => [x.targetId, x.include, x.available]), [[-29, true, true], [124, true, true], [null, false, false], [91, true, true]]);
  assert.match(m[3].reason, /name/);
  assert.match(m[2].reason, /no matching tab/);
});

async function planWithStub(applyMod, client, pkg, target, opts) {
  // Provide a document whose parseDashboardDoc result is `opts.parsed` by giving it the DOM surface parseDashboardDoc reads.
  const doc = fakeDashboardDoc(opts.parsed);
  return applyMod.planImport(client, pkg, target, { ...opts, doc });
}

function fakeDashboardDoc(parsed) {
  const attr = (o) => ({ getAttribute: (k) => o[k] ?? null, className: o.className || '', id: o.id || '', querySelector: (sel) => o.children?.find((c) => c.matches?.(sel)) || null, querySelectorAll: (sel) => (o.children || []).filter((c) => !c.matches || c.matches(sel)), textContent: o.text || '', closest: () => null });
  const wrappers = parsed.portlets.map((p) => attr({
    'data-portlet-id': String(p.id), 'data-portlet-type': p.type, 'data-portlet-actions': '{}', 'data-portlet-locked': 'false',
    className: `ns-portlet-wrapper ns-portlet-window-state-${p.state || 'normal'}`, __col: p.column,
    children: [{ matches: (s) => s === '.ns-portlet-header-text', textContent: p.title }],
  }));
  wrappers.forEach((w, i) => { w.matches = (s) => s === ':scope > .ns-portlet-wrapper'; w.__p = parsed.portlets[i]; });
  const cols = parsed.columns.map((c) => { const el = attr({ 'data-column-order': String(c.order), 'data-column-type': (c.width || 'wide').toLowerCase(), id: `dashboard-column-${c.order}` }); el.querySelectorAll = () => wrappers.filter((w) => w.__p.column === c.order); el.matches = (s) => s === '.ns-dashboard-column'; return el; });
  const container = attr({ 'data-dashboard-identity': JSON.stringify({ dashboardid: parsed.dashboardId }), 'data-dashboard-type': parsed.dashboardType, 'data-dashboard-locked': String(parsed.locked) });
  const layoutSel = { closest: () => ({ getAttribute: () => parsed.layout }) };
  return {
    title: 'Stub',
    querySelector: (sel) => sel === '.ns-dashboard-container' ? container : sel.includes('.ns-selected') ? layoutSel : null,
    querySelectorAll: (sel) => sel === '.ns-dashboard-column' ? cols : [],
    scripts: [],
  };
}

// ---------------------------------------------------------------- SDF
await test('generateSdf produces well-formed publisheddashboard XML with TODOs for unresolved refs', async () => {
  const res = await generateSdf([fixture], { scriptId: 'custpubdashboard_test', name: 'Test dashboard', center: 'BASIC', roles: ['ACCOUNTANT', 'customrole_x'], mode: 'UNLOCKED' });
  const xml = res.xml;
  assert.ok(xml.startsWith('<publisheddashboard scriptid="custpubdashboard_test">'));
  assert.ok(xml.includes('<centertab>BASICCENTERHOMEHOME</centertab>'));
  assert.ok(xml.includes('<layout>TWO_COLUMN_RIGHT</layout>'));
  assert.ok(xml.includes('<centercolumn>') && xml.includes('<rightcolumn>') && !xml.includes('<leftcolumn>'));
  assert.ok(xml.includes('<customsearch>') && xml.includes('<resultssize>20</resultssize>'));
  assert.ok(xml.includes('<role>[scriptid=customrole_x]</role>') && xml.includes('<role>ACCOUNTANT</role>'));
  assert.ok(xml.includes('<keyperformanceindicators>') && xml.includes('<kpi>SALES</kpi>'));
  assert.ok(xml.includes('<shortcuts>'));
  assert.ok(res.todos.some((t) => /customsearch_TODO_6532/.test(t)), 'saved search without resolver becomes TODO');
  assert.ok(res.skipped.some((s) => /SuiteApp/.test(s)), 'dashboard apps are skipped with a note');
  // balanced tags (comments excluded)
  const body = xml.replace(/<!--[\s\S]*?-->/g, '');
  const opens = (body.match(/<([a-z]+)[ >]/g) || []).length;
  const closes = (body.match(/<\/[a-z]+>/g) || []).length;
  assert.equal(opens, closes, `unbalanced XML: ${opens} opens vs ${closes} closes`);
});
await test('generateSdf uses resolvers when provided', async () => {
  const res = await generateSdf([fixture], { scriptId: 'x', name: 'n', center: 'BASIC', roles: ['ACCOUNTANT'], resolvers: { savedSearchScriptId: async (id) => `customsearch_s${id}` } });
  assert.ok(res.xml.includes('<savedsearch>[scriptid=customsearch_s6532]</savedsearch>'));
  assert.ok(!res.todos.some((t) => /customsearch_TODO/.test(t)));
});

// ---------------------------------------------------------------- diff
await test('diffPackages detects changes', () => {
  const b = JSON.parse(JSON.stringify(fixture));
  b.dashboard.portlets[0].settings.entries.find(([k]) => k === `setting_SEARCHRESULTS_SIZE_${SLOT}`)[1] = '50';
  b.dashboard.portlets.pop();
  const d = diffPackages(fixture, b);
  assert.equal(d.removed.length, 1);
  assert.equal(d.changed.length, 1);
  assert.equal(d.changed[0].fields[0].to, '50');
});

// ---------------------------------------------------------------- misc
await test('describeStep and detectFormError', () => {
  assert.match(describeStep({ kind: 'show', title: 'X', type: 'list', portletId: -59, column: 1, order: 2 }), /slot -59/);
  assert.equal(detectFormError('<html><body><script>window.close()</script></body></html>'), null);
});
await test('portletSignature stable', () => {
  assert.equal(portletSignature(fixture.dashboard.portlets[0]), 'searchresults:6532');
});

// Optional: real captured package from the scratchpad (not committed).
const realPath = process.env.NDM_REAL_PACKAGE;
if (realPath && existsSync(realPath)) {
  const real = JSON.parse(readFileSync(realPath, 'utf8'));
  await test('real package: validates and generates SDF', async () => {
    assert.deepEqual(validatePackage(real), []);
    const res = await generateSdf([real], { scriptId: 'custpubdashboard_real', name: 'Real', center: 'BASIC', roles: ['ADMINISTRATOR'] });
    assert.ok(res.xml.length > 1000);
    console.log(`     real SDF: ${res.xml.split('\n').length} lines, ${res.todos.length} todos, ${res.skipped.length} skipped`);
  });
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
