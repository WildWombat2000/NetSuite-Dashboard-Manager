# NetSuite Dashboard Manager (browser extension)

Copy, export, import, back up, compare and publish NetSuite dashboards: the Home page and any
standard or custom center tab.

NetSuite only lets you push a dashboard to whole **roles** (Publish Dashboard), and only to roles in
your own center. There is no way to copy a dashboard to one colleague, move it between tabs, back it
up, or diff it. This extension does all of that from inside the NetSuite pages you already have open,
using the same backend calls the dashboard UI itself makes when you personalise it.

## Features

| Feature | Where | What it does |
|---|---|---|
| **Export to file** | Dashboard tab | Captures layout, every visible portlet, its position, minimised state and full configuration (saved search, KPIs, trend graph, shortcuts, calendar, …) into a portable `*.nsdash.json` file |
| **Import** | Import tab | Recreates a package on the current user's dashboard: sets layout, allocates free portlet slots, replays each portlet's setup form, minimises, fixes ordering. Preview and dry-run before anything changes; automatic backup first |
| **Copy to another tab** | Dashboard tab | Same flow, targeting another center tab of the same user (Home → "Sales", custom tab → custom tab) |
| **Merge / Replace** | Import | Merge adds on top of what is there; Replace removes existing portlets first (Settings portlet is always kept) |
| **Backups & library** | Saved tab / Library page | Named snapshots stored in the browser (`chrome.storage.local`); restore, download, rename, delete |
| **Compare** | Compare tab | Diff the live dashboard against a file or a saved snapshot: added/removed/moved portlets and changed settings |
| **Bulk tools** | Dashboard tab | Minimise all, expand all, remove all (with backup), export every tab as one bundle |
| **SDF export** | Admin tab | Generates a SuiteCloud `publisheddashboard` XML object so administrators can deploy the dashboard to other accounts or roles with `suitecloud object:deploy`; unresolvable references become `TODO` comments |
| **Publish helper** | Admin tab | Shortcuts to NetSuite's native Publish Dashboard and the published dashboards list |

## Installation (unpacked)

1. Open `chrome://extensions` (or `edge://extensions`), enable **Developer mode**.
2. **Load unpacked** → select the `extension/` folder of this repository.
3. Open any NetSuite dashboard (`/app/center/card.nl?sc=…`). A **Dashboard Manager** button appears
   bottom-right. The toolbar icon opens the same panel and the library page.

No build step, no external dependencies, no network calls other than to the NetSuite origin the
page is already on.

## Sharing a dashboard with a colleague

1. You: open the dashboard, click **Dashboard Manager → Export to file**. Send the `.nsdash.json` file.
2. Colleague: install the extension, open *their* Home (or the tab to fill), **Import → File →
   Preview plan**. The plan lists every step; **Dry run** prints what would be sent; **Apply** runs it
   (a backup of their current dashboard is saved to the library first).
3. Reload the page. Portlets the target role cannot use are reported as skipped, not silently dropped.

Because import runs as the recipient, the result is exactly what NetSuite would have produced had they
clicked through Personalize Dashboard and each portlet's Set Up window themselves: permissions,
saved-search access and role restrictions all still apply.

## What is and is not copied

| Portlet | Captured / replayed |
|---|---|
| Custom Search, List, Trend Graph, KPI (Key Performance Indicators), KPI Meter, KPI Scorecard, Report Snapshot, Custom Portlet, Shortcuts, Calendar, My Login Audit, Quick Search, Search Form, RSS, Quick Add | Full setup form replayed (all fields, including the multi-line "machine" data of KPI and Shortcuts) |
| Reminders | Selected headline/standard reminders and zero-result flag; per-reminder day thresholds and highlight rules are not exposed by NetSuite's JSON and must be redone |
| SuiteApp "Dashboard App" portlets | Allocated via NetSuite's dashboard-app slot API using script/deployment ids |
| Analytics (workbook) portlets | Placed, but configuration cannot be read from the UI: set the workbook by hand |
| Settings, Recent Records, New Release, SMT Links, Bank Rec Summary | Placement only (nothing to configure) |

Cross-account imports work as long as the referenced saved searches / scorecards / scripts exist with
the **same internal ids** in the target account (true for sandbox refreshes). Otherwise the portlet is
added and NetSuite's own form validation reports the missing reference; fix the reference and re-run
the plan for that portlet. SDF export references objects by script id and is the right tool for
account-to-account moves.

## Slot capacity

NetSuite gives each dashboard a fixed pool of slots per portlet type (Home: 6 custom searches,
5 trend graphs, 10 report snapshots, 6 custom portlets, 1 KPI, 1 scorecard, 3 KPI meters, …). The
plan reports when a package needs more slots than the target has; use Replace mode or remove portlets
first. Custom tabs have their own (different) pools.

## Repository layout

```
extension/
  manifest.json          MV3 manifest (content script on card.nl, popup, options page)
  content.js             loader → src/ui/panel.js
  src/nsclient.js        NetSuite backend client (card.nl actions, classic forms, tolerant JSON)
  src/model.js           package format, portlet type registry, DOM parsing
  src/capture.js         dashboard → package (settings captured by reading setup forms)
  src/apply.js           package → plan → execution (visibility, placement, form replay)
  src/diff.js            package comparison
  src/storage.js         library in chrome.storage.local, file download/upload helpers
  src/sdf.js             publisheddashboard XML generator (+ sdf-codes.js, resolvers.js)
  src/ui/panel.js|css    in-page Shadow DOM panel
  options.html|js        library manager, inspector, compare, SDF from saved package
  popup.html|js          toolbar popup
docs/
  netsuite-dashboard-internals.md      observed dashboard backend contract (the basis of the client)
  sdf-publisheddashboard-reference.md  complete SDF object/enumeration reference
  design.md                            architecture, decisions, risks, test plan
```

## Safety model

* Nothing is changed until you click **Apply** and confirm. **Preview** and **Dry run** only read.
* Imports into the current dashboard take an automatic backup first (configurable).
* All writes are the exact requests the NetSuite UI sends (`set-portlet-visibility`,
  `set-portlet-placement`, `set-portlet-minimized`, layout plugin, and POSTs of the portlet setup
  forms with a fresh CSRF token). No SuiteScript is deployed, no records are created.
* Locked (published) dashboards are detected and warned about; NetSuite rejects writes to them.

## Known limitations

* Built against NetSuite 2026.2's dashboard. The backend contract is undocumented; a release that
  changes `card.nl` actions or form field names will surface as failed steps in the log, never as
  silent partial writes. `docs/netsuite-dashboard-internals.md` records what to re-verify.
* Reminders day thresholds, Analytics portlet configuration and Dashboard App parameters are not
  readable from the UI and are flagged in the plan.
* The SDF date-range/period code mapping is best effort where NetSuite's UI codes are not documented;
  generated XML flags every unverified value with a `TODO` comment and SDF validation rejects wrong
  values loudly.
* Publishing to roles remains a NetSuite admin action; the extension links to it rather than
  submitting the Publish Dashboard form on your behalf.
