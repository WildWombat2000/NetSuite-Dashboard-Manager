// Compare two dashboard packages (or a package against the live dashboard).
import { portletSignature, summarizePortlet } from './model.js';

export function diffPackages(a, b) {
  const A = a.dashboard, B = b.dashboard;
  const out = {
    layout: A.layout === B.layout ? null : { from: A.layout, to: B.layout },
    added: [], removed: [], changed: [], unchanged: [],
  };
  const bLeft = [...B.portlets];
  for (const pa of A.portlets) {
    const sig = portletSignature(pa);
    let idx = bLeft.findIndex((pb) => portletSignature(pb) === sig);
    if (idx < 0) idx = bLeft.findIndex((pb) => pb.type === pa.type && pb.title && pb.title === pa.title);
    if (idx < 0) { out.removed.push(pa); continue; }
    const pb = bLeft.splice(idx, 1)[0];
    const fields = settingsDiff(pa, pb);
    const moved = pa.column !== pb.column || pa.order !== pb.order;
    const stateChanged = pa.state !== pb.state;
    if (fields.length || moved || stateChanged) out.changed.push({ a: pa, b: pb, fields, moved, stateChanged });
    else out.unchanged.push({ a: pa, b: pb });
  }
  out.added = bLeft;
  return out;
}

function entriesMap(p) {
  const m = new Map();
  const s = p.settings || {};
  if (s.kind === 'form') for (const [k, v] of s.entries || []) if (!/^inpt_|_display$|_formattedValue$/.test(k)) m.set(k, (m.get(k) ? m.get(k) + '\x00' : '') + v);
  if (s.kind === 'reminders') { m.set('headlineItems', (s.headlineItems || []).join(',')); m.set('standardItems', (s.standardItems || []).join(',')); m.set('zeroResults', String(!!s.zeroResults)); }
  return m;
}

export function settingsDiff(pa, pb) {
  const ma = entriesMap(pa), mb = entriesMap(pb);
  const keys = new Set([...ma.keys(), ...mb.keys()]);
  const out = [];
  for (const k of keys) {
    const va = ma.get(k), vb = mb.get(k);
    if (va !== vb) out.push({ field: k, from: va, to: vb });
  }
  return out;
}

export function describeDiff(d) {
  const lines = [];
  if (d.layout) lines.push(`Layout: ${d.layout.from} → ${d.layout.to}`);
  for (const p of d.added) lines.push(`+ ${p.title || p.type} (${summarizePortlet(p)})`);
  for (const p of d.removed) lines.push(`- ${p.title || p.type} (${summarizePortlet(p)})`);
  for (const c of d.changed) {
    const why = [];
    if (c.moved) why.push(`moved ${c.a.column}/${c.a.order} → ${c.b.column}/${c.b.order}`);
    if (c.stateChanged) why.push(`${c.a.state} → ${c.b.state}`);
    if (c.fields.length) why.push(`${c.fields.length} setting(s) differ`);
    lines.push(`~ ${c.a.title || c.a.type}: ${why.join(', ')}`);
  }
  if (!lines.length) lines.push('No differences');
  return lines;
}
