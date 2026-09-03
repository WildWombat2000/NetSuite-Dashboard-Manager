// Thin, dependency-free client for the undocumented NetSuite dashboard backend.
// See docs/netsuite-dashboard-internals.md for the observed contract.
//
// Everything runs with the user's existing session cookies (same-origin fetch from the
// content script). Nothing here talks to any server other than the NetSuite origin the
// page was loaded from.

const CARD = '/app/center/card.nl';

export class NsError extends Error {
  constructor(message, detail) {
    super(message);
    this.name = 'NsError';
    this.detail = detail;
  }
}

/** NetSuite JSON responses are followed by HTML comments; parse tolerantly. */
export function tolerantJson(text) {
  let s = String(text).replace(/^\uFEFF/, '');
  // Fast path.
  try { return JSON.parse(s); } catch (_) { /* fall through */ }
  // Strip control characters that sometimes leak into HTML fragments.
  s = s.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, ' ');
  for (let i = 0; i < 6; i++) {
    try {
      return JSON.parse(s);
    } catch (e) {
      const m = /position (\d+)/.exec(e.message);
      if (!m) break;
      const cut = Number(m[1]);
      if (!cut || cut >= s.length) break;
      s = s.slice(0, cut);
    }
  }
  // Last resort: take the outermost braces.
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start >= 0 && end > start) return JSON.parse(s.slice(start, end + 1));
  throw new NsError('Response was not JSON', { head: String(text).slice(0, 300) });
}

export function looksLikeHtmlError(text) {
  const head = String(text).slice(0, 2000);
  return /<title>\s*(Error|Notice|Warning)\s*<\/title>/i.test(head) || /uir-error|nlerror/i.test(head);
}

/** Extract the human readable message from a NetSuite HTML error/notice page. */
export function htmlErrorMessage(text) {
  try {
    const doc = new DOMParser().parseFromString(text, 'text/html');
    const el = doc.querySelector('.uir-error-text, .nlerror, .errortext, #div__alert, .uir-alert-box, td.text, .text');
    const msg = (el && el.textContent.trim()) || doc.title || 'Unknown NetSuite error';
    return msg.replace(/\s+/g, ' ').slice(0, 400);
  } catch (_) {
    return 'Unknown NetSuite error';
  }
}

export class NsClient {
  /**
   * @param {object} opts
   * @param {string} [opts.origin]  e.g. https://1234567.app.netsuite.com
   * @param {Document} [opts.doc]   document that carries the #ns-csrf-token element
   */
  constructor({ origin = location.origin, doc = document } = {}) {
    this.origin = origin;
    this.doc = doc;
  }

  /** {name:'_csrf', value:'...'} */
  get csrf() {
    const el = this.doc.getElementById('ns-csrf-token');
    if (!el) throw new NsError('CSRF token element (#ns-csrf-token) not found on this page');
    return JSON.parse(el.textContent);
  }

  get accountId() {
    const m = /^([^.]+)\.app\.netsuite\.com$/i.exec(new URL(this.origin).host);
    return m ? m[1] : null;
  }

  url(path, params) {
    const u = new URL(path, this.origin);
    if (params) for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null) u.searchParams.set(k, String(v));
    return u.toString();
  }

  async fetchText(path, init = {}) {
    const res = await fetch(path.startsWith('http') ? path : this.origin + path, { credentials: 'include', ...init });
    const text = await res.text();
    return { res, text };
  }

  async fetchHtml(path) {
    const { res, text } = await this.fetchText(path);
    if (!res.ok) throw new NsError(`GET ${path} failed: HTTP ${res.status}`);
    return new DOMParser().parseFromString(text, 'text/html');
  }

  // ---- dashboard backend -------------------------------------------------------------

  /**
   * Generic backend call mirroring NS.DashboardBackend.
   * @param {number|string} dashboardId
   * @param {'dashboard'|'portlet'|'plugin'} target
   * @param {string} action
   * @param {object} params
   * @param {{method?:'GET'|'POST', raw?:boolean}} opts
   */
  async backend(dashboardId, target, action, params = {}, { method = 'GET', raw = false } = {}) {
    let merged = { dashboardid: dashboardId, 'action-target': target, action, ...params };
    for (let attempt = 1; attempt <= 6; attempt++) {
      const body = new URLSearchParams();
      for (const [k, v] of Object.entries(merged)) if (v !== undefined && v !== null) body.set(k, typeof v === 'boolean' ? String(v) : String(v));
      let res, text;
      if (method === 'POST') {
        const t = this.csrf;
        body.set(t.name, t.value);
        ({ res, text } = await this.fetchText(CARD, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest' },
          body: body.toString(),
        }));
      } else {
        body.set('_', String(Date.now()));
        ({ res, text } = await this.fetchText(`${CARD}?${body.toString()}`, { headers: { 'X-Requested-With': 'XMLHttpRequest' } }));
      }
      if (raw) return text;
      if (looksLikeHtmlError(text)) throw new NsError(`${target}/${action} failed: ${htmlErrorMessage(text)}`, { http: res.status, action, params });
      let json;
      try {
        json = tolerantJson(text);
      } catch (e) {
        throw new NsError(`${target}/${action} returned non-JSON (HTTP ${res.status})`, { head: text.slice(0, 300) });
      }
      if (json && json.status === 'pending' && attempt < 6) {
        await sleep(Number(json.wait) || 1000);
        merged = { ...merged, ...(json.params || {}) };
        continue;
      }
      if (json && json.status && json.status !== 'ok') {
        throw new NsError(`${target}/${action}: ${json.errorTitle || json.status}${json.errorText ? ' - ' + json.errorText : ''}`, json);
      }
      return json;
    }
    throw new NsError(`${target}/${action}: server kept answering "pending"`);
  }

  dashboardAction(dashboardId, action, params, opts) { return this.backend(dashboardId, 'dashboard', action, params, opts); }
  portletAction(dashboardId, portletId, action, params = {}, opts) { return this.backend(dashboardId, 'portlet', action, { portletid: portletId, ...params }, opts); }
  pluginAction(dashboardId, plugin, action, params = {}, opts) { return this.backend(dashboardId, 'plugin', action, { plugin, ...params }, opts); }

  /** Every slot known to the dashboard, grouped. */
  async getAvailablePortlets(dashboardId) {
    const json = await this.pluginAction(dashboardId, 'content-manager', 'get-available-portlets');
    return json.portletData || { groups: [] };
  }

  /** Render a portlet wrapper (works for unused slots as well). */
  async loadPortlet(dashboardId, portletId) {
    return this.portletAction(dashboardId, portletId, 'load');
  }

  setLayout(dashboardId, layout) {
    return this.pluginAction(dashboardId, 'column-layout-manager', 'setLayout', { layout });
  }

  setPortletVisibility(dashboardId, portletId, visible, column, order) {
    const p = { portletid: portletId, visible: !!visible };
    if (visible) { p.column = column; p.order = order; }
    return this.dashboardAction(dashboardId, 'set-portlet-visibility', p, { method: 'POST' });
  }

  setPortletPlacement(dashboardId, portletId, column, order, originalColumn = column, originalOrder = order) {
    return this.dashboardAction(dashboardId, 'set-portlet-placement', { portletid: portletId, column, order, originalColumn, originalOrder }, { method: 'POST' });
  }

  setPortletMinimized(dashboardId, portletId, minimized) {
    return this.dashboardAction(dashboardId, 'set-portlet-minimized', { portletid: portletId, minimized: !!minimized }, { method: 'POST' });
  }

  /** SuiteApp dashboard portlets are allocated dynamically. Returns {portletId}. */
  allocateDashboardApp(dashboardId, { column, order, scriptId, deploymentId }) {
    return this.dashboardAction(dashboardId, 'get-first-free-dashboard-app-portlet-id',
      { visible: true, column, order, scriptId, deploymentId }, { method: 'POST' });
  }

  getUsedDashApps(dashboardId) {
    return this.dashboardAction(dashboardId, 'get-used-dash-apps', {}).catch(() => null);
  }

  // ---- classic forms -----------------------------------------------------------------

  /**
   * GET a classic NetSuite form page and serialise it the way a browser submit would.
   * @returns {{action:string, method:string, entries:Array<[string,string]>, doc:Document, form:HTMLFormElement}}
   */
  async fetchForm(path, formName = 'main_form') {
    const { res, text } = await this.fetchText(path);
    if (!res.ok) throw new NsError(`GET ${path}: HTTP ${res.status}`);
    if (looksLikeHtmlError(text)) throw new NsError(`GET ${path}: ${htmlErrorMessage(text)}`);
    const doc = new DOMParser().parseFromString(text, 'text/html');
    const form = doc.forms[formName] || [...doc.forms].find((f) => f.elements.length > 5);
    if (!form) throw new NsError(`No form found at ${path}`, { title: doc.title });
    return { action: form.getAttribute('action') || path.split('?')[0], method: (form.method || 'post').toUpperCase(), entries: serializeForm(form), doc, form, title: doc.title };
  }

  /** POST url-encoded entries to a classic form action. Throws on NetSuite error pages. */
  async postForm(action, entries) {
    const body = new URLSearchParams();
    for (const [k, v] of entries) body.append(k, v == null ? '' : String(v));
    const { res, text } = await this.fetchText(action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
      body: body.toString(),
      redirect: 'follow',
    });
    if (!res.ok) throw new NsError(`POST ${action}: HTTP ${res.status}`, { head: text.slice(0, 300) });
    if (looksLikeHtmlError(text)) throw new NsError(`POST ${action}: ${htmlErrorMessage(text)}`, { head: text.slice(0, 500) });
    return text;
  }

  /** Full HTML of a dashboard tab, without navigating. */
  fetchDashboardPage(dashboardId) {
    return this.fetchHtml(`${CARD}?sc=${encodeURIComponent(dashboardId)}`);
  }
}

/** Browser-equivalent serialisation of a form (what FormData would send), preserving order. */
export function serializeForm(form) {
  const out = [];
  for (const el of form.elements) {
    if (!el.name || el.disabled) continue;
    const tag = el.tagName;
    const type = (el.type || '').toLowerCase();
    if (tag === 'BUTTON' || type === 'button' || type === 'reset' || type === 'image' || type === 'file') continue;
    if (type === 'submit') continue; // added explicitly by the caller when needed
    if (type === 'checkbox' || type === 'radio') { if (el.checked) out.push([el.name, el.value]); continue; }
    if (tag === 'SELECT') { for (const o of el.selectedOptions) out.push([el.name, o.value]); continue; }
    out.push([el.name, el.value]);
  }
  return out;
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
