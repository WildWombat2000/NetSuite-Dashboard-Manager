# Design: NetSuite Dashboard Manager

## 1. Problem

NetSuite dashboards (Home and center tabs) are per-user preferences. The only distribution
mechanism is *Publish Dashboard*, which:

* targets roles, not people, and only roles in the publisher's own center;
* snapshots the publisher's current tabs at publish time (no file, no versioning, no diff);
* can overwrite every user of the role, or none;
* has no API: dashboards are not records, not searchable, not reachable from SuiteScript/SuiteQL/REST.

The only portable representation Oracle offers is the SDF `publisheddashboard` XML object, which is
again role-scoped and requires a SuiteCloud deployment.

Result: teams rebuild dashboards by hand, one portlet at a time, per user.

## 2. Approach

A Manifest V3 browser extension that runs on dashboard pages and drives the **same backend the
dashboard UI uses** (`/app/center/card.nl` actions and the classic portlet "Set Up" forms), under the
logged-in user's session. This gives:

* **Read**: a complete, faithful capture of a dashboard (layout, portlets, per-portlet configuration) by
  parsing the server-rendered wrappers and GETting each setup form.
* **Write**: recreation of a dashboard for *any user who runs the extension*, by replaying the exact
  requests a user's clicks would produce. Permissions, feature gates and role restrictions stay
  enforced server-side.
* **Portability**: a JSON package format (`netsuite-dashboard-package` v1) that is slot-independent
  (field names are normalised with a `{{SLOT}}` token) so it can land on any free slot of any tab.
* **Bridge to the official path**: SDF XML generation for administrators.

Reverse-engineering notes are in `netsuite-dashboard-internals.md`; nothing else in NetSuite exposes
this data (verified: SuiteQL rejects `publisheddashboard`, REST metadata has no such record type).

## 3. Architecture

```
content.js (isolated world)  ──dynamic import──►  src/ui/panel.js (Shadow DOM panel)
                                                     │
                       ┌─────────────────────────────┼──────────────────────────────┐
                       ▼                             ▼                              ▼
                 src/capture.js                 src/apply.js                    src/sdf.js
             dashboard → package        package → plan → execute        package → publisheddashboard
                       │                             │                              │
                       └───────────►  src/nsclient.js  ◄────────────────────────────┘
                                 card.nl actions · classic forms · tolerant JSON · CSRF
```

* `nsclient.js` is the only module that knows URLs, parameters and response quirks.
* `model.js` holds the package schema, the portlet-type registry (how each type is configured and its
  SDF element) and DOM parsing.
* `capture.js` and `apply.js` are symmetric: capture normalises slot tokens out, apply merges them
  back into a freshly fetched target form so CSRF/boilerplate are always current.
* `storage.js` keeps a library (exports + automatic backups) in `chrome.storage.local`.
* No page-world script injection is needed: content-script `fetch` is same-origin and carries the
  session cookies; the CSRF token is read from `#ns-csrf-token` in the DOM.

## 4. Key decisions

| Decision | Why |
|---|---|
| Replay whole setup forms instead of modelling each portlet's fields | Complete by construction (KPI/Shortcut "line machines" included), resilient to fields we have never seen, and identical to what the browser would post. Type-specific knowledge is only used for display (`refs`) and SDF |
| Slot-independent packages | Slot ids differ per tab (negative on standard tabs, positive on custom tabs) and per account; normalising `neg14050`→`{{SLOT}}` lets one package land anywhere |
| Plan → confirm → execute | Users see every step before anything changes; dry run prints the intended calls; per-step errors never abort the run |
| Automatic backup before import | Restores are just another import in Replace mode |
| Prefer identical slot ids when free | Keeps field names identical for same-shape dashboards (Home→Home), minimising surprises |
| Replace mode keeps the Settings portlet | A user must never lose access to Personalize Dashboard |
| SDF generation flags rather than guesses | SDF validation is strict; a `TODO` comment is better than a plausible wrong enum |
| Publishing stays a manual NetSuite action | Publishing overwrites other people's dashboards; the extension links to the native page instead of automating it |

## 5. Package format (v1)

```jsonc
{
  "format": "netsuite-dashboard-package", "version": 1, "exportedAt": "…",
  "source": { "accountId": "1234567", "host": "1234567.app.netsuite.com", "dashboardId": -29,
              "dashboardName": "Home", "dashboardType": "HOME", "roleId": "3", "entityId": "…" },
  "dashboard": {
    "layout": "TWO_COLUMN_RIGHT",
    "columns": [{ "order": 1, "width": "WIDE" }, { "order": 2, "width": "NARROW" }],
    "portlets": [{
      "key": "p1", "slotId": -14050, "type": "searchresults", "typeLabel": "Custom Search",
      "title": "Purchasing Tracking Items", "column": 1, "order": 1, "state": "normal", "locked": false,
      "settings": {
        "kind": "form", "formAction": "/app/center/setup/customsearch.nl", "formType": "PortletSettings",
        "entries": [["setting_SEARCHRESULTS_ID_{{SLOT}}", "6532"], ["setting_SEARCHRESULTS_SIZE_{{SLOT}}", "20"], …],
        "display": { "setting_SEARCHRESULTS_ID_{{SLOT}}_display": "Purchasing Tracking Items" },
        "refs": { "savedSearchId": "6532", "savedSearchName": "Purchasing Tracking Items", "size": "20" }
      },
      "app": null
    }]
  }
}
```

A bundle (`netsuite-dashboard-bundle`) is `{ dashboards: [package, …] }`, one per tab.

## 6. Import algorithm

1. Parse target page (live DOM or fetched HTML) → displayed portlets, layout, lock state.
2. `get-available-portlets` → slot pool per type; free = pool − displayed (− portlets being hidden in Replace mode).
3. Steps: `hide*` (Replace) → `layout` → per source portlet in column/order: `show` (or `app`) →
   `settings` / `reminders` → `minimize` → `place`. Portlets without a free slot become `skip` with a reason.
4. Execution: `set-portlet-visibility{visible:true,column,order}` → `portlet/show`; settings = GET the
   slot's wrapper (to find its Set Up URL), GET the form, merge stored entries with fresh boilerplate,
   POST, detect re-rendered validation errors; `set-portlet-minimized`; `set-portlet-placement`.
5. Every step logs success/failure; the page is reloaded by the user at the end.

## 7. Risks and mitigations

| Risk | Mitigation |
|---|---|
| NetSuite changes the undocumented backend | All knowledge in one module + a written contract to re-verify; failures are loud per step; dry run for diagnosis |
| Form field semantics differ between accounts (features on/off) | Stored fields overlay a *fresh* target form, so unknown target fields keep their defaults and stale source-only fields are simply ignored by NetSuite |
| Cross-account internal ids do not match | Reported by NetSuite's own validation; SDF path uses script ids |
| Concurrency with the user's own clicks | Panel advises reload; calls are sequential with a configurable pause |
| Locked/published dashboards | Detected from `data-dashboard-locked`; warned |

## 8. Test plan

Automated (node): syntax check of every module; unit tests for `tolerantJson`, `mergeFormEntries`,
`parseDashboardDoc` against saved HTML fixtures, `planImport` slot allocation, SDF generation on a
fixture package (see `tests/`).

Manual (sandbox account recommended):
1. Export Home → inspect JSON in the Library page (all portlets, settings kinds = form/reminders/none).
2. Import the export into an empty custom tab (Merge) → all supported portlets appear with identical
   configuration; compare tab reports no setting differences except slot-specific ones.
3. Replace-mode import back onto Home from the automatic backup → restores the original.
4. Cross-user: second user imports the file → identical dashboard where permissions allow; skipped
   portlets listed with reasons.
5. SDF: generate XML, `suitecloud project:validate` in a SuiteCloud project → only TODO items fail.

Live verification performed during development (read-only, NetSuite 2026.2): page anatomy, all
backend actions, all setup forms, publish form, slot pools for a standard and a custom tab. No write
was issued against the production account while building; write paths were exercised by dry run only.
