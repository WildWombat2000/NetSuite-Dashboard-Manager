# NetSuite dashboard internals (observed 2026.2, UI build 2026.2.12.30154)

Everything below was observed read-only in a live NetSuite session on the modern ("ns-dashboard")
dashboard. It is undocumented, so treat it as version-sensitive and re-verify after each NetSuite
release. The extension isolates all of it behind `extension/src/nsclient.js`.

## 1. Page anatomy

Dashboard pages are `/app/center/card.nl?sc=<tabId>`. `sc` is the center-tab id and is also the
`dashboardid` used by every XHR (`-29` = Home, `-7` Transactions, `-8` Lists, `-9` Reports,
`-11` Support, `-190` Commerce; positive ids = custom center tabs).

```html
<div class="ns-dashboard-container"
     data-column-count="2"
     data-dashboard-type="HOME"
     data-dashboard-identity='{"dashboardid":-29}'
     data-dashboard-locked="false"
     data-backend-url="/app/center/card.nl">
  <div id="dashboard-column-1" class="ns-dashboard-column" data-column-order="1" data-column-type="wide">
    <div class="ns-portlet-wrapper ns-portlet-window-state-normal"      <!-- or -minimized / -maximalized -->
         data-portlet-type="searchresults"
         data-portlet-id="-14050"
         data-portlet-actions='{"setup":{"name":"setup","args":["/app/center/setup/customsearch.nl?portletid=-14050&sectionid=-29&qelem=servercontentneg14050","customsearchsetup","560","420","Custom Search"]},
                                "editCustomize":{"name":"openWindow","args":["/app/common/search/search.nl?id=6532&portletpref=-14050&sc=-29&e=T","_self","",""]},
                                "close":"close","minimize":"minimize", ...}'
         data-portlet-locked="false" data-portlet-tags="[]">
      <div class="ns-portlet-header"><h2 class="ns-portlet-header-text">Purchasing Tracking Items</h2></div>
      <div class="ns-portlet-body"><div class="ns-portlet-content" data-portlet-class="SearchResultPortlet"></div></div>
    </div>
  </div>
  <div id="dashboard-column-2" class="ns-dashboard-column" data-column-order="2" data-column-type="narrow"></div>
</div>
```

* Layout picker: `#ns-dashboard-layout-plugin[data-current-layout]` (lower-case) and, inside
  `.ns-dashboard-layout-plugin-content`, `span[data-action="changeColumnLayout"][data-action-args="TWO_COLUMN"]`
  whose `img` carries `ns-selected` for the current layout. Values: `SINGLE_COLUMN`, `TWO_COLUMN`,
  `TWO_COLUMN_RIGHT`, `THREE_COLUMN` (identical to the SDF `layout` enum).
* Portlet wrappers are server-rendered in the HTML of `card.nl?sc=…`, so another tab's dashboard can be
  inventoried with a plain GET without navigating. Portlet *content* is loaded lazily.
* CSRF token: `<script id="ns-csrf-token">{"name":"_csrf","value":"…"}</script>` (JSON in innerText).
  Every POST must include `_csrf=<value>` in the body.
* Page globals (main world only): `NS.Dashboard.getInstance()`, `NS.DashboardBackend`, `NS.Portlet`,
  `NS.getCSRFToken()`. The extension does not depend on them.
* Tab list for the current role: `a[href*="card.nl?sc="]` in the navigation menu (label + id).

## 2. The dashboard backend (`/app/center/card.nl`)

All dashboard XHRs go to `card.nl` with `dashboardid=<id>` plus an `action-target`:

| action-target | extra params | action | method | purpose |
|---|---|---|---|---|
| `portlet` | `portletid` | `load` | GET | Render a portlet: `{portletid, wrapper, version, status}`; also works for unused slots |
| `portlet` | `portletid` | `refresh&maximized=F` | GET | Re-render content: `{portletid,title,updatetime,version,content,status}` |
| `portlet` | `portletid` | `show` | GET | Render after a visibility change (returns `wrapper`) |
| `portlet` | `portletid` | `setup` | GET | Reminders only: JSON setup model (`allItems`, `selectedHeadlineItems`, …) |
| `portlet` | `portletid` | `reminderSave` | POST | Reminders: `headlineItems`, `standardItems` (JSON arrays of item ids), `zeroResults` |
| `portlet` | `portletid` | `reminderSaveOrder` | POST | Reminders: order only |
| `portlet` | `portletid` | `get-portlet-settings` | GET | Only some portlet classes; others return an HTML error page |
| `dashboard` | — | `set-portlet-visibility` | POST | `portletid, visible=true/false, column, order` (add / remove) |
| `dashboard` | — | `set-portlet-placement` | POST | `portletid, column, order, originalColumn, originalOrder` (drag-drop) |
| `dashboard` | — | `set-portlet-minimized` | POST | `portletid, minimized=true/false` |
| `dashboard` | — | `set-portlet-maximalize` | POST | `portletid, maximalized=true/false` |
| `dashboard` | — | `get-first-free-dashboard-app-portlet-id` | POST | `visible,column,order,scriptId,deploymentId` → `{portletId}` (SuiteApp portlets) |
| `dashboard` | — | `get-used-dash-apps`, `get-dash-apps-info` | GET | SuiteApp slot bookkeeping |
| `plugin` | `plugin=column-layout-manager` | `setLayout` | GET | `layout=THREE_COLUMN` … (the UI reloads the page afterwards) |
| `plugin` | `plugin=content-manager` | `get-available-portlets` | GET | `{portletData:{groups:[{type:STANDARD_CONTENT\|DASHBOARD_APPS\|CURRENTLY_USED, items:[{id, typeName, columnPreference, description, help, used}]}], freeSlots:[…], scripts:[…]}}` |

The generic client in the page builds requests as
`{url:'/app/center/card.nl', type:requestType, dataType:'json', data:{dashboardid, 'action-target', action, ...params, _csrf(for POST)}}`.

Responses are JSON **followed by HTML comments** (`<!-- … All SQL was faster than 100 ms -->`), so parse
with a tolerant parser (truncate at the position reported by `JSON.parse`). Errors come back as HTML
pages, or as `{status:"error", errorTitle, errorText}`; `{status:"pending", wait, params}` means
"retry after `wait` ms with `params` merged".

## 3. Slots

Each dashboard has a fixed pool of portlet *slots* per type. A visible portlet is "a slot made visible
plus its settings". Slot ids are negative on standard tabs and positive on custom tabs.

Home (`-29`) in the observed account:

| typeName | slots |
|---|---|
| `searchresults` (Custom Search) | `-60`, `-14050` … `-14054` |
| `trendgraph` | `-7212` … `-7216` |
| `enhsnapshots` (Report Snapshot) | `-3900` … `-3909` |
| `scriptportlet` (Custom Portlet / Dashboard App) | `-1200` … `-1205` (+ dynamic `-1000…-1005` for SuiteApp portlets) |
| `snapshots` (KPI) | `-62` |
| `kpireport` (KPI Scorecard) | `-7712` |
| `kpimeter` | `-80` … `-82` |
| `shortcuts` | `-58` |
| `reminders` | `-63` |
| `settings` | `-52` |
| `calendar` | `-56`, `-661`, `-672` … `-674` |
| `list` | `-50` (Phone Calls), `-57` (Tasks), `-59`, `-9029` |
| `quicksearch` | `-51` |
| `searchform` | `-9129` |
| `recentrecords` | `-9329` |
| `lastlogin` (My Login Audit) | `-32000` |
| `analytics` | `-8030` … `-8034`, `-8155` … `-8159` |
| `rsssource` | `-77`, `-78` |
| `quickadd` | `-10000` |
| `smtlinks`, `newfeatures`, `reconcilesummary` | `-39001`, `-53`, `-34001` |

Custom tab 124 exposed `enhsnapshots 1321…1330`, `trendgraph 1331…1335`, `scriptportlet 1336`,
`searchresults 1337…1341`, `tasklinks 1339`. `get-available-portlets` lists every slot for a dashboard;
subtract the ids currently rendered to find the free ones (`used` is computed client-side and is always
`false` in the raw response).

## 4. Portlet settings are classic NetSuite forms

The "Set Up" action of every portlet opens a classic form whose URL is in
`data-portlet-actions.setup.args[0]`. GET returns a form named `main_form`; POST the same fields back to
save. Field names embed the slot token `neg<abs(id)>` (negative ids) or `<id>` (positive ids).

| type | setup URL | key fields |
|---|---|---|
| `searchresults` | `/app/center/setup/customsearch.nl?portletid&sectionid&qelem` | `setting_SEARCHRESULTS_ID_neg14050` (saved search internal id), `_CUSTOM_TITLE_`, `_SIZE_`, `_DD_` (`NEWPAGE`…), `_DLE_` (`T`), `_CHARTTHEME_`, `_BACKGROUND_TYPE_` |
| `list` | `/app/center/setup/listsearch.nl` | `setting_LIST_TYPE_neg59` (e.g. `Custom3346`), `_SIZE_`, `_DLE_` |
| `trendgraph` | `/app/center/setup/trendgraph.nl` | `setting_TRENDGRAPH_KPI_`, `_KPI2_`, `_KPI3_`, `_SEARCHKEY[n]_`, `_COLOR[n]_`, `_CHART_TYPE_`, `_TYPE_` (`WEEKLY`…), `_AVG_`, `_AVGWINDOW_`, `_LAST_POINT_`, `_INCLUDES_ZERO_`, `_CHARTTHEME_`, `_BACKGROUND_TYPE_`, `_CUSTOM_TITLE_` |
| `snapshots` (KPI) | `/app/center/setup/snapshots.nl?kpigrp=KPI&sectionid&portletid&qelem` | line machine `stdfields`, `stdflags`, `stdtypes`, `stdlabels`, `stddata` (`\x01`-delimited columns, `\x02`-delimited rows), `nextstdidx`, `custKPI`, `custKPI_labels`, `cacheEnable`, trend-graph popup prefs |
| `kpimeter` | `/app/center/setup/kpimetersetup.nl` | line machine `std*` (kpi key, range, period, highlight, compare) |
| `kpireport` (Scorecard) | `/app/center/setup/kpireport.nl` | `setting_KPIREPORT_ID_`, `_RESTRICT_`, `_ORIENTATION_`, `_TREND_`, `_SHOWDATES_` |
| `enhsnapshots` (Report Snapshot) | `/app/center/setup/enhsnapshots.nl?e=T&id&portletid&sectionid&qelem` | `enhancedsnapshot` (`ENHANCED:SALES_BY_REP`), `enhancedgraphlayout`, `enhanceddaterange`, `enhancedisgraph`, `enhancedorderbydesc`, `enhancedtopx`, `enhanceddefinition`, theme/background |
| `scriptportlet` (Custom Portlet) | `/app/center/setup/scriptportletsetup.nl` | `scriptsource` = `<scripttype>_<script>` (e.g. `2436_1`), `scripttype`, `script`. Script parameters live in a second form at the same path with `?scriptsettings=T` (fields named `custscript_*`, plus hidden `scripttype`, `script`, `scriptsettings=T`); that form only exists once a script is assigned and its URL appears as the wrapper's `parameters` action |
| `shortcuts` | `/app/center/setup/shortcuts.nl?sectionid&qelem` (no portletid) | line machine `shortcut*` (`shortcutdata`: seq, enable, label, url, newwindow) |
| `calendar` | `/app/center/setup/eventsportletsetup.nl` | `setting_CALENDAR_SHOWEVENTS_`, `_SHOWTASKS_`, `_SHOWCALLS_`, `_DEFAULTAGENDALIMIT_`, `_MAXIMUMACTIVITIES_`, … |
| `lastlogin` | `/app/center/setup/lastlogin.nl` | `setting_LASTLOGIN_SHOW*_` checkboxes |
| `quicksearch` | `/app/center/setup/quicksearch.nl?sectionid&qelem` | `setting_QUICKSEARCH_TYPE_`, `_GENERIC_DFLT_`, `_TRANSACTION_DFLT_` |
| `searchform` | `/app/center/setup/searchform.nl` | `setting_SEARCHFORM_ID_` |
| `rsssource`, `quickadd` | `/app/center/setup/rsssetup.nl`, `/app/center/setup/quickadd.nl` | form only renders once the slot is in use |
| `analytics` | `/app/common/report/analyticsportletsetup.nl` | modern UIF app, no classic form: not replayable |
| `reminders` | JSON via `portletAction(id,'setup')` | save with `reminderSave` |
| `recentrecords`, `newfeatures`, `smtlinks`, `reconcilesummary`, `settings`, `tasklinks` | — | placement only |

Boilerplate present in every classic form: `_csrf`, `_eml_nkey_`, `type=PortletSettings`, `sc`,
`portletid`, `qelem=servercontent<token>`, `submitted`, `entryformquerystring`, `nsapi*` timing
fields, `submitter=Save`. To replay a form on another slot or dashboard: rename the slot token in field
names and values, set `sc`/`sectionid`/`portletid`/`qelem` for the target, take fresh `_csrf` and
`_eml_nkey_` from a GET of the target form, set `submitted=T`, and POST as
`application/x-www-form-urlencoded`.

Checkboxes post `name=T` when checked plus a companion `<name>_send` hidden field (`T` when checked,
empty otherwise) that NetSuite uses to detect an unchecked box. Keep both.

Two behaviours of slots matter for import ordering:

* A slot keeps its configuration when hidden (a hidden custom-portlet slot still had "3CX Dashboard"
  assigned), so `get-available-portlets` "free" slots may carry stale settings; always replay settings
  after showing a slot rather than assuming it is blank.
* The setup and parameters forms of a **hidden** slot answer HTTP 500 "Notice: You do not have
  permission to perform this operation". Make the slot visible (`set-portlet-visibility`) before
  fetching or posting its forms; this is why the import engine shows first and configures second.

## 5. Publishing (admin only)

* Form: `/app/center/setup/savedashboard.nl` ("Publish Dashboard"); list:
  `/app/center/setup/savedashboards.nl` ("Saved Dashboards": Name, Applies for roles in, Notes, From Bundle);
  edit: `savedashboard.nl?id=<n>&e=T`.
* Fields: `dashname`, `package`, `scriptid`, `dashnotes`, `dashlockshortcuts`, `dashlocknewbar`;
  role line machine `rolemaps*` (`selectrole`, `overwrite`); tab line machine `sectionmaps*`
  (`sectionshow`, `dashmode` = `UNLOCKED` / `LOCKED` / add-move, `sectionkey` = tab id).
  `sectionmapsdata` is `\x02`-separated rows of `\x01`-separated `show|mode|key`, e.g.
  `T\x01UNLOCKED\x01-29\x02F\x01\x01-77…`.
* Publishing snapshots the publisher's *current* dashboards for the ticked tabs into a published
  dashboard record applied to roles in the same center. It is role-based only; there is no per-user
  target and no per-user copy, which is why an in-browser copy tool is needed.

## 6. What is NOT available

* No SuiteQL, REST or SuiteScript access to dashboard layout or portlet preferences
  (`publisheddashboard` is not a record type; SuiteQL answers `Invalid search type`).
* The only officially portable representation is the SDF `publisheddashboard` XML object
  (see `sdf-publisheddashboard-reference.md`). It targets roles, not users, and cannot override existing
  users' dashboards.
