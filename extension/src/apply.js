// Plan and execute the import of a dashboard package into the current user's dashboard.
//
// Import is a sequence of the same backend calls the NetSuite UI makes when a user personalises a
// dashboard: change layout, make slots visible in a column/order, replay each slot's setup form,
// minimise, and finally fix ordering. Every plan is inspectable and can be dry-run.

import { parseDashboardDoc, parsePortletWrapper, slotToken, typeInfo, LAYOUT_COLUMNS } from './model.js';
import { VOLATILE_FIELD, denormalizeToken, SLOT } from './capture.js';
import { NsError, sleep } from './nsclient.js';

/**
 * @typedef {object} PlanOptions
 * @property {'merge'|'replace'} [mode]       merge = add on top of what is there; replace = hide existing portlets first
 * @property {Document} [doc]                 live document of the target dashboard (avoids a refetch)
 * @property {boolean} [applyLayout]          copy the column layout (default true)
 * @property {boolean} [fixOrder]             send placement calls after inserting (default true)
 * @property {boolean} [preferSameSlot]       reuse identical slot ids when free (default true)
 * @property {Set<string>} [only]             restrict to these package portlet keys
 */

export async function planImport(client, pkg, targetDashboardId, opts = {}) {
  const { mode = 'merge', doc = null, applyLayout = true, fixOrder = true, preferSameSlot = true, only = null } = opts;
  const warnings = [];
  const steps = [];

  let targetDoc = doc;
  if (!targetDoc || Number(parseDashboardDoc(targetDoc).dashboardId) !== Number(targetDashboardId)) {
    targetDoc = await client.fetchDashboardPage(targetDashboardId);
  }
  const target = parseDashboardDoc(targetDoc);
  if (target.locked) warnings.push('Target dashboard is locked by a published dashboard; NetSuite may reject changes.');

  const avail = await client.getAvailablePortlets(targetDashboardId);
  const slotsByType = new Map();
  for (const g of avail.groups || []) {
    if (g.type !== 'STANDARD_CONTENT') continue;
    for (const it of g.items || []) {
      const t = it.typeName || it.portletType;
      if (!slotsByType.has(t)) slotsByType.set(t, []);
      slotsByType.get(t).push(Number(it.id ?? it.portletId));
    }
  }
  const displayed = new Set(target.portlets.map((p) => Number(p.id)));
  const willHide = new Set();

  if (mode === 'replace') {
    for (const p of target.portlets) {
      if (p.type === 'settings') continue; // keep Settings so the user is never stranded
      steps.push({ kind: 'hide', portletId: p.id, type: p.type, title: p.title });
      willHide.add(Number(p.id));
    }
  }

  const layout = pkg.dashboard.layout;
  const effectiveLayout = applyLayout && layout ? layout : target.layout;
  const targetColumns = LAYOUT_COLUMNS[effectiveLayout] || LAYOUT_COLUMNS.TWO_COLUMN_RIGHT;
  if (applyLayout && layout && layout !== target.layout) {
    steps.push({ kind: 'layout', layout, from: target.layout });
  }
  const columnMap = mapColumns(layout, effectiveLayout);
  if (!applyLayout && layout !== target.layout) warnings.push(`Layout differs (${layout} → ${target.layout}); portlets are mapped to columns of matching width.`);

  const used = new Set([...displayed].filter((id) => !willHide.has(id)));
  const isFree = (id) => slotsByType.size === 0 ? !used.has(id) : !used.has(id);
  const takeSlot = (type, preferredId) => {
    const pool = slotsByType.get(type) || [];
    if (preferSameSlot && preferredId != null && pool.includes(Number(preferredId)) && isFree(Number(preferredId))) {
      used.add(Number(preferredId));
      return Number(preferredId);
    }
    const id = pool.find((x) => isFree(x));
    if (id == null) return null;
    used.add(id);
    return id;
  };

  const sourcePortlets = [...pkg.dashboard.portlets]
    .filter((p) => !only || only.has(p.key))
    .sort((a, b) => a.column - b.column || a.order - b.order);

  const orderCounters = {};
  const norm = (s) => String(s || '').trim().toLowerCase();
  for (const p of sourcePortlets) {
    const column = columnMap[Math.max(1, Number(p.column) || 1)] || Math.min(Math.max(1, Number(p.column) || 1), targetColumns.length);
    orderCounters[column] = (orderCounters[column] || 0) + 1;
    const order = orderCounters[column];

    // Merge mode: a portlet of the same type with the same title is treated as already present.
    if (mode === 'merge') {
      const dup = target.portlets.find((t) => t.type === p.type && !willHide.has(Number(t.id)) && (norm(t.title) === norm(p.title) || (typeInfo(p.type).settings === 'none' && t.type === p.type)));
      if (dup) {
        steps.push({ kind: 'skip', srcKey: p.key, type: p.type, title: p.title, reason: `${typeInfo(p.type).label} "${dup.title}" is already on this dashboard (slot ${dup.id}); merge mode leaves it untouched.` });
        continue;
      }
    }

    if (p.app && p.app.scriptId != null) {
      steps.push({ kind: 'app', srcKey: p.key, type: p.type, title: p.title, column, order, scriptId: p.app.scriptId, deploymentId: p.app.deploymentId });
    } else {
      const slot = takeSlot(p.type, p.slotId);
      if (slot == null) {
        const total = (slotsByType.get(p.type) || []).length;
        steps.push({ kind: 'skip', srcKey: p.key, type: p.type, title: p.title, reason: total === 0
          ? `${typeInfo(p.type).label} portlets are not available on this tab.`
          : `All ${total} ${typeInfo(p.type).label} slot(s) are in use. Remove one or use Replace mode.` });
        continue;
      }
      steps.push({ kind: 'show', srcKey: p.key, portletId: slot, type: p.type, title: p.title, column, order });
    }

    const s = p.settings || { kind: 'none' };
    if (s.kind === 'form' && Array.isArray(s.entries) && s.entries.length) {
      steps.push({ kind: 'settings', srcKey: p.key, type: p.type, title: p.title, entries: s.entries, formAction: s.formAction });
    } else if (s.kind === 'reminders') {
      steps.push({ kind: 'reminders', srcKey: p.key, type: p.type, title: p.title, headlineItems: s.headlineItems || [], standardItems: s.standardItems || [], zeroResults: !!s.zeroResults });
    } else if (s.kind === 'manual') {
      warnings.push(`${p.title || typeInfo(p.type).label}: configuration must be redone manually after import (${s.note || 'no replayable form'}).`);
    } else if (s.kind === 'error') {
      warnings.push(`${p.title || p.type}: settings were not captured at export time (${s.error}); portlet will be added unconfigured.`);
    }
    if (p.state === 'minimized') steps.push({ kind: 'minimize', srcKey: p.key, type: p.type, title: p.title });
    if (fixOrder) steps.push({ kind: 'place', srcKey: p.key, type: p.type, title: p.title, column, order });
  }

  const summary = {
    adds: steps.filter((s) => s.kind === 'show' || s.kind === 'app').length,
    hides: steps.filter((s) => s.kind === 'hide').length,
    settings: steps.filter((s) => s.kind === 'settings' || s.kind === 'reminders').length,
    skips: steps.filter((s) => s.kind === 'skip').length,
    layoutChange: steps.some((s) => s.kind === 'layout'),
  };
  return { targetDashboardId: Number(targetDashboardId), target, steps, warnings, summary, mode };
}

/** Column widths per layout (1-based order): W = wide, N = narrow. */
const LAYOUT_WIDTHS = { SINGLE_COLUMN: ['W'], TWO_COLUMN: ['N', 'W'], TWO_COLUMN_RIGHT: ['W', 'N'], THREE_COLUMN: ['N', 'W', 'N'] };

/** Map source column order → target column order, preferring columns of the same width. */
export function mapColumns(fromLayout, toLayout) {
  const from = LAYOUT_WIDTHS[fromLayout] || LAYOUT_WIDTHS.TWO_COLUMN_RIGHT;
  const to = LAYOUT_WIDTHS[toLayout] || LAYOUT_WIDTHS.TWO_COLUMN_RIGHT;
  const map = {};
  if (fromLayout === toLayout) { from.forEach((_, i) => { map[i + 1] = i + 1; }); return map; }
  const taken = new Set();
  from.forEach((w, i) => {
    let j = to.findIndex((tw, idx) => tw === w && !taken.has(idx));
    if (j < 0) j = to.findIndex((tw) => tw === w);
    if (j < 0) j = w === 'W' ? to.indexOf('W') : to.length - 1;
    if (j < 0) j = 0;
    taken.add(j);
    map[i + 1] = j + 1;
  });
  return map;
}

/**
 * Execute a plan. Never throws for a single failing step; every step result is logged.
 * @returns {{ok:boolean, results:Array, ids:Object}}
 */
export async function executePlan(client, plan, { dryRun = false, onProgress = () => {}, pauseMs = 120, removeOnFailure = true } = {}) {
  const dash = plan.targetDashboardId;
  const ids = {}; // srcKey -> portletId
  const removed = new Set(); // srcKeys whose portlet was rolled back after a failed configuration
  const results = [];
  let i = 0;
  for (const step of plan.steps) {
    i += 1;
    const r = { index: i, step, ok: true, message: '' };
    onProgress({ index: i, total: plan.steps.length, step, phase: 'start' });
    try {
      if (step.kind === 'skip') { r.message = step.reason; r.skipped = true; }
      else if (dryRun) { r.message = describeStep(step, ids); r.dryRun = true; if (step.kind === 'show') ids[step.srcKey] = step.portletId; if (step.kind === 'app') ids[step.srcKey] = '(allocated at run time)'; }
      else if (step.srcKey && removed.has(step.srcKey)) { r.skipped = true; r.message = `Skipped: "${step.title}" was removed after its configuration failed`; }
      else r.message = await runStep(client, dash, step, ids);
    } catch (e) {
      r.ok = false;
      r.message = e instanceof NsError ? e.message : String(e && e.message || e);
      r.detail = e && e.detail;
      // A portlet whose configuration NetSuite rejected would otherwise sit on the dashboard as an
      // empty box; remove it again so the dashboard is left exactly as it was for that portlet.
      if (!dryRun && removeOnFailure && (step.kind === 'settings' || step.kind === 'reminders') && ids[step.srcKey] != null) {
        try {
          await client.setPortletVisibility(dash, ids[step.srcKey], false);
          removed.add(step.srcKey);
          r.rolledBack = true;
          r.message += ` — portlet removed again (slot ${ids[step.srcKey]})`;
        } catch (e2) {
          r.message += ` — and it could not be removed: ${e2 && e2.message || e2}`;
        }
      }
    }
    results.push(r);
    onProgress({ index: i, total: plan.steps.length, step, phase: 'done', result: r });
    if (!dryRun && pauseMs) await sleep(pauseMs);
  }
  return { ok: results.every((r) => r.ok), results, ids, removed: [...removed], dryRun };
}

/**
 * Suggest a target tab for each dashboard in a bundle: same tab id if the recipient has it,
 * else same name (case-insensitive), else null (= skip).
 */
export function suggestBundleMapping(bundle, tabs) {
  const byId = new Map(tabs.map((t) => [Number(t.id), t]));
  const byName = new Map(tabs.map((t) => [String(t.name || '').trim().toLowerCase(), t]));
  return (bundle.dashboards || []).map((pkg) => {
    const src = pkg.source || {};
    const id = Number(src.dashboardId);
    let target = byId.has(id) ? byId.get(id) : byName.get(String(src.dashboardName || '').trim().toLowerCase()) || null;
    return {
      pkg,
      targetId: target ? Number(target.id) : null,
      include: !!target,
      available: !!target,
      reason: target ? (Number(target.id) === id ? 'matches tab id' : 'matches tab name') : 'no matching tab in this account',
    };
  });
}

export function describeStep(step, ids = {}) {
  const id = step.portletId ?? ids[step.srcKey];
  switch (step.kind) {
    case 'layout': return `Set layout ${step.from || '?'} → ${step.layout}`;
    case 'hide': return `Remove "${step.title}" (${step.type} ${step.portletId})`;
    case 'show': return `Add "${step.title}" as ${step.type} slot ${step.portletId} in column ${step.column}, position ${step.order}`;
    case 'app': return `Add SuiteApp portlet "${step.title}" (script ${step.scriptId}/${step.deploymentId}) in column ${step.column}, position ${step.order}`;
    case 'settings': return `Configure "${step.title}" (${step.entries.length} form fields → slot ${id ?? '?'})`;
    case 'reminders': return `Configure reminders: ${step.headlineItems.length} headline + ${step.standardItems.length} standard`;
    case 'minimize': return `Minimise "${step.title}"`;
    case 'place': return `Place "${step.title}" at column ${step.column}, position ${step.order}`;
    case 'skip': return `Skip "${step.title}": ${step.reason}`;
    default: return step.kind;
  }
}

async function runStep(client, dash, step, ids) {
  switch (step.kind) {
    case 'layout':
      await client.setLayout(dash, step.layout);
      return `Layout set to ${step.layout}`;
    case 'hide':
      await client.setPortletVisibility(dash, step.portletId, false);
      return `Removed ${step.title}`;
    case 'show':
      await client.setPortletVisibility(dash, step.portletId, true, step.column, step.order);
      ids[step.srcKey] = step.portletId;
      await client.portletAction(dash, step.portletId, 'show').catch(() => null);
      return `Added slot ${step.portletId}`;
    case 'app': {
      const res = await client.allocateDashboardApp(dash, step);
      const pid = res && (res.portletId ?? res.portletid);
      if (pid == null) throw new NsError('NetSuite did not return a free Dashboard App slot', res);
      ids[step.srcKey] = Number(pid);
      await client.setPortletVisibility(dash, pid, true, step.column, step.order);
      await client.portletAction(dash, pid, 'show').catch(() => null);
      return `Allocated SuiteApp portlet slot ${pid}`;
    }
    case 'settings': {
      const id = ids[step.srcKey];
      if (id == null) throw new NsError('Portlet was not added, so its settings cannot be applied');
      return applySettings(client, dash, id, step);
    }
    case 'reminders': {
      const id = ids[step.srcKey];
      if (id == null) throw new NsError('Reminders portlet was not added');
      await client.portletAction(dash, id, 'reminderSave', {
        headlineItems: JSON.stringify(step.headlineItems), standardItems: JSON.stringify(step.standardItems), zeroResults: step.zeroResults,
      }, { method: 'POST' });
      return `Saved ${step.headlineItems.length + step.standardItems.length} reminders`;
    }
    case 'minimize': {
      const id = ids[step.srcKey];
      if (id == null) throw new NsError('Portlet was not added');
      await client.setPortletMinimized(dash, id, true);
      return 'Minimised';
    }
    case 'place': {
      const id = ids[step.srcKey];
      if (id == null) throw new NsError('Portlet was not added');
      await client.setPortletPlacement(dash, id, step.column, step.order);
      return `Placed at ${step.column}/${step.order}`;
    }
    default:
      throw new NsError(`Unknown step ${step.kind}`);
  }
}

/** Replay a captured setup form onto a target slot. */
async function applySettings(client, dash, portletId, step) {
  // Discover the setup URL for the target slot from its rendered wrapper (robust across types).
  const loaded = await client.loadPortlet(dash, portletId);
  const div = document.createElement('div');
  div.innerHTML = loaded.wrapper || '';
  const wrapper = div.querySelector('.ns-portlet-wrapper');
  const info = wrapper ? parsePortletWrapper(wrapper) : null;
  const setupUrl = info && info.setupUrl;
  if (!setupUrl) throw new NsError(`Slot ${portletId} exposes no Set Up form; settings not applied`);

  const form = await client.fetchForm(setupUrl);
  const token = slotToken(portletId);
  const merged = mergeFormEntries(form.entries, step.entries, token);
  const text = await client.postForm(form.action, merged);
  const err = detectFormError(text);
  if (err) throw new NsError(`NetSuite rejected the settings: ${err}`);
  return `Applied ${step.entries.length} settings to slot ${portletId}`;
}

/**
 * Overlay stored (normalised) entries on a freshly fetched target form.
 * Rules: keep target boilerplate; stored fields replace target fields of the same name (all occurrences);
 * a stored `<x>_send` companion means the checkbox `<x>` state is authoritative, so any target `<x>` is dropped.
 */
export function mergeFormEntries(targetEntries, storedEntries, token) {
  const stored = storedEntries.map(([k, v]) => [denormalizeToken(k, token), denormalizeToken(v, token)]);
  const storedNames = new Set(stored.map(([k]) => k));
  for (const [k] of stored) if (k.endsWith('_send')) storedNames.add(k.slice(0, -5));
  const out = [];
  for (const [k, v] of targetEntries) {
    if (VOLATILE_FIELD.test(k)) { out.push([k, v]); continue; }
    if (storedNames.has(k)) continue;
    out.push([k, v]);
  }
  for (const e of stored) out.push(e);
  // Mark as submitted the way the browser does.
  setEntry(out, 'submitted', 'T');
  if (!out.some(([k]) => k === 'submitter')) out.push(['submitter', 'Save']);
  return out;
}

function setEntry(entries, name, value) {
  const i = entries.findIndex(([k]) => k === name);
  if (i >= 0) entries[i] = [name, value]; else entries.push([name, value]);
}

/** Classic forms re-render with an alert box when validation fails. */
export function detectFormError(text) {
  if (!/main_form/.test(text)) return null; // popup closed / redirect page = success
  const doc = new DOMParser().parseFromString(text, 'text/html');
  const alert = doc.querySelector('.uir-alert-box, .nlerror, .errortext, #div__alert, .uir-error-text');
  if (alert && alert.textContent.trim()) return alert.textContent.replace(/\s+/g, ' ').trim().slice(0, 300);
  return null;
}

export { SLOT };
