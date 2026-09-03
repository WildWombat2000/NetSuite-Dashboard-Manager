import { listLibrary, saveToLibrary, getLibraryPackage, deleteFromLibrary, renameLibraryItem, downloadJson, downloadText, safeFilename, readJsonFile } from './src/storage.js';
import { validatePackage, summarizePortlet, typeInfo } from './src/model.js';
import { diffPackages, describeDiff } from './src/diff.js';
import { generateSdf } from './src/sdf.js';
import { CENTERS } from './src/sdf-codes.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

async function refresh() {
  const items = await listLibrary();
  const tbody = $('#libTable tbody');
  tbody.innerHTML = items.map((it) => `
    <tr data-id="${it.id}">
      <td><b>${esc(it.name)}</b>${it.notes ? `<div class="muted">${esc(it.notes)}</div>` : ''}</td>
      <td>${esc(it.kind)}${it.bundle ? ' (bundle)' : ''}</td>
      <td>${it.source ? `${esc(it.source.host)}<br>${esc(it.source.dashboardName)} (${it.source.dashboardId})` : ''}</td>
      <td>${it.portletCount}</td>
      <td>${new Date(it.createdAt).toLocaleString()}</td>
      <td>
        <button data-act="inspect" class="secondary">Inspect</button>
        <button data-act="download" class="secondary">Download</button>
        <button data-act="rename" class="secondary">Rename</button>
        <button data-act="delete" class="danger">Delete</button>
      </td>
    </tr>`).join('') || '<tr><td colspan="6" class="muted">Library is empty.</td></tr>';
  for (const sel of ['#cmpA', '#cmpB', '#sdfPkg']) {
    $(sel).innerHTML = items.filter((i) => !i.bundle).map((it) => `<option value="${it.id}">${esc(it.name)}</option>`).join('');
  }
}

$('#libTable').addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-act]');
  if (!btn) return;
  const id = btn.closest('tr').dataset.id;
  const items = await listLibrary();
  const it = items.find((x) => x.id === id);
  const act = btn.dataset.act;
  if (act === 'delete') { if (confirm(`Delete "${it.name}"?`)) { await deleteFromLibrary(id); refresh(); } }
  if (act === 'download') downloadJson(await getLibraryPackage(id), `${safeFilename(it.name)}.nsdash.json`);
  if (act === 'rename') { const n = prompt('New name', it.name); if (n) { await renameLibraryItem(id, n); refresh(); } }
  if (act === 'inspect') inspect(await getLibraryPackage(id), it);
});

function inspect(pkg, it) {
  const dashboards = pkg.format === 'netsuite-dashboard-bundle' ? pkg.dashboards : [pkg];
  $('#inspect').innerHTML = dashboards.map((d) => `
    <details open><summary>${esc(d.source.dashboardName)} · ${esc(d.dashboard.layout)} · ${d.dashboard.portlets.length} portlets</summary>
    <table><thead><tr><th>Pos</th><th>Portlet</th><th>Type</th><th>Settings</th></tr></thead><tbody>
      ${d.dashboard.portlets.map((p) => `<tr><td>${p.column}.${p.order}</td><td><b>${esc(p.title)}</b><div class="muted">${esc(summarizePortlet(p))}</div></td><td>${esc(typeInfo(p.type).label)}<div class="muted">slot ${p.slotId}${p.state !== 'normal' ? ` · ${p.state}` : ''}</div></td>
        <td>${p.settings.kind === 'form' ? `<details><summary>${p.settings.entries.length} fields</summary><pre>${esc(p.settings.entries.filter(([k]) => !/^inpt_|_display$|_formattedValue$/.test(k)).map(([k, v]) => `${k} = ${v}`).join('\n'))}</pre></details>` : esc(p.settings.kind + (p.settings.error ? `: ${p.settings.error}` : p.settings.note ? `: ${p.settings.note}` : ''))}</td></tr>`).join('')}
    </tbody></table></details>`).join('');
}

$('#importBtn').addEventListener('click', async () => {
  const f = $('#importFile').files[0];
  if (!f) return alert('Choose a .nsdash.json file first');
  try {
    const pkg = await readJsonFile(f);
    const errs = pkg.format === 'netsuite-dashboard-bundle' ? [] : validatePackage(pkg);
    if (errs.length) return alert(`Not a valid package: ${errs.join('; ')}`);
    const name = prompt('Name in library', f.name.replace(/\.nsdash(-bundle)?\.json$/i, ''));
    if (!name) return;
    await saveToLibrary({ name, kind: 'export', pkg });
    refresh();
  } catch (e) { alert(e.message); }
});

$('#cmpBtn').addEventListener('click', async () => {
  const a = await getLibraryPackage($('#cmpA').value);
  const b = await getLibraryPackage($('#cmpB').value);
  if (!a || !b) return;
  const d = diffPackages(a, b);
  const out = $('#cmpOut');
  out.hidden = false;
  out.textContent = describeDiff(d).join('\n') + '\n\n' + d.changed.filter((c) => c.fields.length).map((c) => `${c.a.title}:\n${c.fields.map((f) => `  ${f.field}: ${f.from ?? '∅'} → ${f.to ?? '∅'}`).join('\n')}`).join('\n');
});

$('#sdfCenter').innerHTML = CENTERS.map((c) => `<option>${c}</option>`).join('');
$('#sdfBtn').addEventListener('click', async () => {
  const pkg = await getLibraryPackage($('#sdfPkg').value);
  if (!pkg) return;
  const res = await generateSdf([pkg], {
    scriptId: $('#sdfScriptId').value.trim() || 'custpubdashboard_export',
    name: $('#sdfName').value.trim() || pkg.source.dashboardName,
    center: $('#sdfCenter').value,
    roles: $('#sdfRoles').value.split(/[,\s]+/).filter(Boolean),
  });
  const out = $('#sdfOut');
  out.hidden = false;
  out.textContent = res.xml + (res.todos.length ? `\n<!-- ${res.todos.length} TODO(s) above -->` : '');
  downloadText(res.xml, `${$('#sdfScriptId').value.trim() || 'custpubdashboard_export'}.xml`, 'application/xml');
});

refresh();
