// Live lookups (GET only) used to turn internal ids into SDF script ids.
// Each resolver returns a string or null and never throws.

const cache = new Map();

async function memo(key, fn) {
  if (cache.has(key)) return cache.get(key);
  let v = null;
  try { v = await fn(); } catch (_) { v = null; }
  cache.set(key, v);
  return v;
}

function readScriptId(doc) {
  const input = doc.querySelector('input[name="scriptid"], input#scriptid');
  if (input && input.value) return input.value.trim();
  const span = doc.querySelector('#scriptid_fs, #scriptid_val, [data-field-name="scriptid"], span#scriptid');
  if (span && span.textContent.trim()) return span.textContent.trim();
  const inl = [...doc.scripts].filter((s) => !s.src).map((s) => s.textContent).join('\n');
  const m = /['"]scriptid['"]\s*[:,]\s*['"]([a-z0-9_]+)['"]/i.exec(inl);
  return m ? m[1] : null;
}

export function makeResolvers(client) {
  return {
    /** Saved search internal id -> customsearch_xxx */
    savedSearchScriptId: (id) => memo(`search:${id}`, async () => {
      const doc = await client.fetchHtml(`/app/common/search/search.nl?id=${encodeURIComponent(id)}&e=T`);
      const sid = readScriptId(doc);
      return sid && /^customsearch/i.test(sid) ? sid : null;
    }),
    /** Center tab internal id -> custcentertab_xxx */
    centerTabScriptId: (id) => memo(`tab:${id}`, async () => {
      const doc = await client.fetchHtml(`/app/common/custom/centertab.nl?id=${encodeURIComponent(id)}&e=T`);
      const sid = readScriptId(doc);
      return sid && /^custcentertab/i.test(sid) ? sid : null;
    }),
    /** Custom record list type "Custom123" -> customrecord_xxx */
    listTypeRef: (code) => memo(`rectype:${code}`, async () => {
      const id = String(code).replace(/^Custom/i, '');
      const doc = await client.fetchHtml(`/app/common/custom/custrecord.nl?id=${encodeURIComponent(id)}&e=T`);
      const sid = readScriptId(doc);
      return sid && /^customrecord/i.test(sid) ? sid : null;
    }),
    /** Custom portlet -> customscript_x.customdeploy_y (best effort from the script record page). */
    customPortletRef: (p) => memo(`portlet:${p.slotId}:${(p.settings && p.settings.entries || []).map((e) => e.join('=')).join('&')}`, async () => {
      const e = (p.settings && p.settings.entries) || [];
      const scriptType = (e.find(([k]) => k === 'scripttype') || [])[1];
      if (!scriptType) return null;
      const doc = await client.fetchHtml(`/app/common/scripting/script.nl?id=${encodeURIComponent(scriptType)}`);
      const sid = readScriptId(doc);
      if (!sid) return null;
      // Deployment script id: first deployment row of the script record's Deployments sublist.
      const dep = doc.querySelector('a[href*="scriptrecord.nl?id="] , #scriptdeployments_splits a');
      const depText = dep && dep.textContent.trim();
      return depText && /^customdeploy/i.test(depText) ? `${sid}.${depText}` : `${sid}.customdeploy_TODO`;
    }),
  };
}
