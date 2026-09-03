# NetSuite SDF `publisheddashboard` XML Reference

Compiled 2026-09-03 from the Oracle NetSuite Help Center (SDF XML Reference and the
"Published Dashboards as XML Definitions" topic tree). Intended for code that GENERATES and
PARSES `publisheddashboard` object XML.

Conventions used in this document:

- **Schema page** = the `SDFxml_*.html` reference page for an element (authoritative for
  type / required / default / constraints).
- **Narrative page** = the `section_* / subsect_* / bridgehead_*` help topic with prose and an
  example. Where the two disagree, both are recorded and the schema page is preferred.
- "not documented" means the fetched page did not state it. Nothing below is inferred from
  outside the fetched pages unless explicitly marked *(inference)*.
- Boolean fields take the literal strings `T` / `F`.

---

## 1. Overview

| Item | Value |
|---|---|
| Object type (root element) | `publisheddashboard` |
| `scriptid` attribute | Required, up to 99 characters. Documented prefix/default: `custpubdashboard`. Convention: `custpubdashboard_[custom_name]` (examples: `custpubdashboard_custom`, `custpubdashboard_basic`, `custpubdashboard_reminders`). |
| File location in an SDF project | `Objects/` folder of the SuiteCloud project, one `.xml` file per object (standard SDF custom-object layout; the fetched dashboard pages do not restate the folder name). |
| What it models | Settings for a collection of dashboards in the target account. One object is bound to **one Center** and can be applied to **multiple roles** of that Center. Each child `dashboard` controls the portlet layout of one **Center Tab** (Home, Activities, Transactions, Lists, Reports, or a custom tab) in that Center. |
| UI equivalent | Settings portlet > Publish Dashboard. |
| Feature dependencies | None listed on the `publisheddashboard` schema page. Individual list values and portlets carry feature dependencies (recorded per list/portlet below); a feature-dependent value used in a mandatory list field must be declared as a required feature in `manifest.xml`. |

### Limitations (from `section_1515963216.html`)

- The **Override Existing User's Settings** column of the Apply to Roles list is **not supported**.
  SDF cannot override dashboards or dashboard settings for existing users. Workaround documented
  by Oracle: after deployment, create a new employee, give it a role that is associated with the
  published dashboard and has the Publish Dashboard permission, log in as that user, edit the
  published dashboard in the UI and publish with Override Existing User's Settings enabled.
- Roles listed in `roles` **must belong to the Center** named in `center`.
- `center` may be a standard center (`role_centertype` list, section 5.1) or a custom center
  (`[scriptid=custcenter_...]`).
- Script IDs of Center Links are not portable through SuiteBundler but are supported in SDF
  (generated on the target account). App ID / Publisher ID for Center Type, Center Tab, Center
  Category and Center Link are not portable through SuiteBundler.
- Analytics portlets are not supported by bundles (SDF only).
- Some fields are translatable (see Translatable Fields Supported in SDF Custom Objects,
  `section_156951732735.html#subsect_157659429943`); the dashboard pages do not enumerate which.

---

## 2. Full element tree

### 2.1 Tree with cardinality

```
publisheddashboard  @scriptid (required)
├── name                    string(30)                REQUIRED
├── center                  list                      REQUIRED   role_centertype | [scriptid=custcenter_*]
├── lockshortcuts           boolean                   optional   default F
├── locknewbar              boolean                   optional   default F
├── notes                   string(4000)              optional
├── dashboards              COLLECTION                (container)
│   └── dashboard  (repeatable)                        DEFAULT group
│       ├── centertab       list                      REQUIRED   generic_centertab | [scriptid=custcentertab_*]
│       ├── mode            list                      REQUIRED   dashboard_mode, default UNLOCKED
│       ├── layout          list                      REQUIRED   dashboard_layout, default TWO_COLUMN
│       ├── leftcolumn      COLLECTION of portlets    allowed for TWO_COLUMN, THREE_COLUMN
│       ├── centercolumn    COLLECTION of portlets    allowed for every layout
│       └── rightcolumn     COLLECTION of portlets    allowed for TWO_COLUMN_RIGHT, THREE_COLUMN
└── roles                   COLLECTION                (container)
    └── role  (repeatable)                             DEFAULT group
        └── role            list                      REQUIRED   generic_role | [scriptid=customrole_*]
```

Every column (`leftcolumn`, `centercolumn`, `rightcolumn`) is a COLLECTION whose children are the
24 portlet elements listed in section 2.5. The schema pages for `leftcolumn` and `rightcolumn`
state they are "equivalent to the `centercolumn` field group structure"; all elements supported
by `centercolumn` are supported by the other two.

### 2.2 `publisheddashboard` (schema page `SDFxml_2517460692.html`)

Attributes

| Name | Type | Req | Notes |
|---|---|---|---|
| `scriptid` | string | Required | Up to 99 characters. Default value `custpubdashboard`. |

Fields

| Name | Type | Req | Notes |
|---|---|---|---|
| `name` | single-select list (string custom type) | Required | Up to 30 characters. |
| `center` | single-select list | Required | References the `center` custom type (`[scriptid=custcenter_*]`); other values: `role_centertype` list (section 5.1). |
| `lockshortcuts` | boolean | Optional | Default `F`. |
| `locknewbar` | boolean | Optional | Default `F`. |
| `notes` | single-select list (string custom type) | Optional | Up to 4000 characters. Emitted as `<notes/>` when empty in Oracle's own example. |

Structured fields: `dashboards` (`SDFxml_821185897.html`), `roles` (`SDFxml_3076242075.html`).

### 2.3 `dashboards` / `dashboard`

`dashboards` (`SDFxml_821185897.html`): COLLECTION; child `dashboard` (repeatable).

`dashboard` (`SDFxml_1885140918.html`): DEFAULT field group.

| Name | Type | Req | Default | Values |
|---|---|---|---|---|
| `centertab` | single-select list | Required | — | References the `centertab` custom type (`[scriptid=custcentertab_*]`); other values: `generic_centertab` list (section 5.3). |
| `mode` | single-select list | Required | `UNLOCKED` | `dashboard_mode` list: `ADD_MOVE`, `LOCKED`, `UNLOCKED`. |
| `layout` | single-select list | Required | `TWO_COLUMN` | `dashboard_layout` list: `SINGLE_COLUMN`, `THREE_COLUMN`, `TWO_COLUMN`, `TWO_COLUMN_RIGHT`. |

Structured fields: `centercolumn` (`SDFxml_2507073638.html`), `leftcolumn` (`SDFxml_3389721581.html`), `rightcolumn` (`SDFxml_4206405773.html`).

Layout -> permitted column elements (narrative page):

| `layout` | Permitted column elements |
|---|---|
| `SINGLE_COLUMN` | `centercolumn` |
| `TWO_COLUMN` | `leftcolumn`, `centercolumn` |
| `TWO_COLUMN_RIGHT` | `centercolumn`, `rightcolumn` |
| `THREE_COLUMN` | `leftcolumn`, `centercolumn`, `rightcolumn` |

Column elements are optional containers (the Oracle example emits an empty
`<centercolumn>` with only a comment). What happens if a column not permitted by the layout is
present is not documented.

### 2.4 `roles` / `role`

`roles` (`SDFxml_3076242075.html`): COLLECTION; child `role` (repeatable).

`role` (`SDFxml_1504679754.html`): DEFAULT group with a single field, also named `role`:

| Name | Type | Req | Values |
|---|---|---|---|
| `role` | single-select list | Required | References the `role` custom type (`[scriptid=customrole_*]`); other values: `generic_role` list (section 5.4). |

Note the nesting: `<roles><role><role>ACCOUNTANT</role></role></roles>`.

### 2.5 Column contents (`centercolumn`, `SDFxml_2507073638.html`)

COLLECTION. Structured fields (24), in the order listed on the schema page:

| # | Element | Portlet (UI name) | Schema page |
|---|---|---|---|
| 1 | `analytics` | Analytics (workbook chart / pivot / table) | SDFxml_2602317317 |
| 2 | `calendar` | Calendar | SDFxml_33334530 |
| 3 | `customportlet` | Custom Portlet (portlet script deployment) | SDFxml_2254171991 |
| 4 | `customsearch` | Custom Search | SDFxml_4101733692 |
| 5 | `enhsnapshots` | Report Snapshot | SDFxml_2844836912 |
| 6 | `keyperformanceindicators` | Key Performance Indicators | SDFxml_2032650472 |
| 7 | `kpimeter` | KPI Meter | SDFxml_3695579850 |
| 8 | `kpireport` | KPI Scorecard | SDFxml_2389874139 |
| 9 | `lastlogin` | My Login Audit | SDFxml_282636250 |
| 10 | `list` | List | SDFxml_2940484860 |
| 11 | `pdganttchart` | Gantt Chart (project dashboard) | SDFxml_2693680880 |
| 12 | `pdinfo` | Project Info | SDFxml_2592360553 |
| 13 | `pdpl` | Project Profitability (P&L) | SDFxml_2232585245 |
| 14 | `pdquicklinks` | Project Links | SDFxml_368720903 |
| 15 | `quicksearch` | Quick Search | SDFxml_1855112627 |
| 16 | `recentrecords` | Recent Records | SDFxml_2359040977 |
| 17 | `recentreports` | Recent Reports | SDFxml_3776898258 |
| 18 | `reminders` | Reminders | SDFxml_474769753 |
| 19 | `scheduler` | Event Scheduler | SDFxml_937573525 |
| 20 | `searchform` | Search Form | SDFxml_1210102087 |
| 21 | `settings` | Settings | SDFxml_2316346497 |
| 22 | `shortcuts` | Shortcuts (schema only; no narrative page in the portlet index) | SDFxml_2470918358 |
| 23 | `tasklinks` | Links (Reports Links / Activities Links) **and** Tasks | SDFxml_2395641333 |
| 24 | `trendgraph` | Trend Graph | SDFxml_1317380448 |

The narrative portlet index lists 24 pages; two of them (Links Portlets, Tasks Portlets) both map
to `tasklinks`, and `shortcuts` exists only on the schema page. Net: 24 distinct portlet elements.

### 2.6 Element order

- **Fields inside an element**: no schema page states an order or `xs:sequence`. Oracle's own
  examples are inconsistent: the base example emits `center, name, dashboards, roles`; the
  reminders example emits `center, locknewbar, lockshortcuts, name, notes, roles, dashboards`.
  Portlet examples (`kpi`, `lastlogin`, `enhsnapshots`, `reminders`) are alphabetical, while the
  `trendgraph`, `analytics` and `customsearch` examples are not. Recommendation for a generator:
  emit fields in the order of the schema tables reproduced here (which is also the order the
  NetSuite object exporter uses in the reminders example: simple fields alphabetically, then
  structured groups); a parser must accept any order.
- **Portlets inside a column**: the columns are COLLECTIONs; document order of the portlet
  elements is the top-to-bottom order shown on the dashboard *(inference: not stated on the
  fetched pages, but there is no other ordinal field)*. Any portlet element may repeat where the
  UI allows multiples (e.g. up to 10 `analytics`, up to 5 `trendgraph`, several `customsearch`).
- **`dashboard` inside `dashboards`**: repeatable, one per `centertab`.

### 2.7 Skeleton (from the narrative page)

```xml
<publisheddashboard scriptid="custpubdashboard_basic">
    <center>BASIC</center>
    <name>Classic Center Published DB</name>
    <dashboards>
        <dashboard>
            <centertab>BASICCENTERHOMEHOME</centertab>
            <layout>THREE_COLUMN</layout>
            <mode>UNLOCKED</mode>
            <leftcolumn>
                <!-- portlets -->
            </leftcolumn>
            <centercolumn>
                <!-- portlets -->
            </centercolumn>
            <rightcolumn>
                <!-- portlets -->
            </rightcolumn>
        </dashboard>
        <dashboard>
            <centertab>[scriptid=custcentertab_basic_tab]</centertab>
            <layout>SINGLE_COLUMN</layout>
            <mode>LOCKED</mode>
            <centercolumn>
                <!-- portlets -->
            </centercolumn>
        </dashboard>
    </dashboards>
    <roles>
        <role>
            <role>ACCOUNTANT</role>
        </role>
        <role>
            <role>[scriptid=customrole_my_basic_role]</role>
        </role>
    </roles>
</publisheddashboard>
```

---

## 3. Portlet elements

Each subsection gives: element name, schema fields (type / required / default / values), notes
from the narrative page, discrepancies, and an example. All portlet elements are DEFAULT field
groups whose parent is a column element. Every portlet has an optional `isminimized` boolean
(default `F`) on its schema page, even where the narrative page omits it.

### 3.1 `analytics` - Analytics portlet

Narrative: `subsect_159119372291.html`. Schema: `SDFxml_2602317317.html`.

| Field | Type | Req | Default | Values / constraints |
|---|---|---|---|---|
| `portlettype` | list | Required | — | `portlet_analytics_portlettype`: `CHART`, `PIVOT`, `TABLE` |
| `visualization` | list (reference) | Required | — | Reference to a workbook `table`, `pivot` or `chart` custom type: `[scriptid=<workbook scriptid>.<viz scriptid>]`, e.g. `[scriptid=custworkbook1.custchart2135234234]`, `custpivot...`, `custview...` |
| `isminimized` | boolean | Optional | `F` | |
| `name` | string | Optional (schema) / Required (narrative) | — | Up to 50 characters |
| `height` | list | Optional | — | Available only when `portlettype = CHART`. `portlet_analytics_height`: `MEDIUM`, `SHORT`, `TALL` |
| `visiblerows` | integer | Optional | — | Available only when `portlettype = PIVOT` or `TABLE`. Must be <= 200 |

Notes: max 10 Analytics portlets per dashboard; one visualization per portlet; only custom
workbooks (not standard workbooks); not supported by bundles.

```xml
<analytics>
  <portlettype>CHART</portlettype>
  <visualization>[scriptid=custworkbook1.custchart2135234234]</visualization>
  <name>My Chart Portlet</name>
  <height>MEDIUM</height>
</analytics>
<analytics>
  <portlettype>PIVOT</portlettype>
  <visualization>[scriptid=custworkbook1.custpivot2135234234]</visualization>
  <name>My Pivot Table Portlet</name>
  <visiblerows>20</visiblerows>
</analytics>
<analytics>
  <portlettype>TABLE</portlettype>
  <visualization>[scriptid=custworkbook1.custview2135234234]</visualization>
  <name>My Table View Portlet</name>
  <visiblerows>20</visiblerows>
</analytics>
```

### 3.2 `calendar` - Calendar portlet

Narrative: `bridgehead_1516039427.html`. Schema: `SDFxml_33334530.html`.

| Field | Type | Req | Default | Values / constraints |
|---|---|---|---|---|
| `numberofrecordsinagenda` | integer | Required (schema; narrative says optional) | `7` | Must be >= 0 |
| `isminimized` | boolean | Optional | `F` | |
| `showevents` | boolean | Optional | `T` | |
| `showblockingtasks` | boolean | Optional | `T` | |
| `shownonblockingtasks` | boolean | Optional | `T` | |
| `showblockingcalls` | boolean | Optional | `T` | |
| `shownonblockingcalls` | boolean | Optional | `T` | |
| `showcanceledevents` | boolean | Optional | `F` | |
| `showweekendsinmonthlyview` | boolean | Optional | `T` | |
| `recordstodisplayinagenda` | list | Optional | `TODAY_ONLY` | `portlet_calendar_agenda`: `TODAY_ONLY`, `UPCOMING` |
| `showcampaignevents` | boolean | Optional | `F` | |
| `showresourceallocations` | boolean | Optional | `F` | Requires RESOURCEALLOCATIONS feature in manifest |

```xml
<calendar>
    <numberofrecordsinagenda>15</numberofrecordsinagenda>
    <isminimized>T</isminimized>
    <showevents>F</showevents>
</calendar>
```

### 3.3 `customportlet` - Custom (script) portlet

Narrative: `bridgehead_1516039455.html`. Schema: `SDFxml_2254171991.html`, `parameters`
`SDFxml_2472306086.html`, `parameter` `SDFxml_1875840555.html`.

| Field | Type | Req | Default | Values / constraints |
|---|---|---|---|---|
| `source` | list (reference) | Required | — | Reference to a `scriptdeployment` custom type: `[scriptid=<portlet script scriptid>.<deployment scriptid>]`, e.g. `[scriptid=customscript_myportlet.customdeploy_deployment]` |
| `isminimized` | boolean | Optional | `F` | |
| `parameters` | COLLECTION | Optional | — | Contains repeatable `parameter` |
| `parameters/parameter/id` | list (reference) | Required | — | Reference to a `scriptcustomfield` (script parameter) of the portlet script: `[scriptid=<script scriptid>.<custscript_param>]` |
| `parameters/parameter/value` | string | Required | — | Must match the parameter field type. Checkbox: `T`/`F`. List/record values may be references, e.g. `[scriptid=customrecord_id.somevalue]` |

Notes: if the concatenation of all parameters exceeds 999 bytes the deployment fails with the
generic "An error occurred during SDF custom object update" (no per-parameter validation
messages). The portlet script must be a SuiteScript Portlet script type (`portlet` object,
`SDFxml_320447915.html`; requires SERVERSIDESCRIPTING feature).

```xml
<customportlet>
    <source>[scriptid=customscript_myportlet.customdeploy_deployment]</source>
    <parameters>
        <parameter>
            <id>[scriptid=customscript_myportlet.custscript_myportlet_title]</id>
            <value>Financials</value>
        </parameter>
        <parameter>
            <id>[scriptid=customscript_myportlet.custscript_myportlet_something]</id>
            <value>[scriptid=customrecord_id.somevalue]</value>
        </parameter>
        <parameter>
            <id>[scriptid=customscript_myportlet.custscript_myportlet_checkbox]</id>
            <value>T</value>
        </parameter>
    </parameters>
</customportlet>
```

### 3.4 `customsearch` - Custom Search portlet

Narrative: `bridgehead_1516039459.html`. Schema: `SDFxml_4101733692.html`.

| Field | Type | Req | Default | Values / constraints |
|---|---|---|---|---|
| `savedsearch` | list (reference) | Required | — | `[scriptid=customsearch_*]` (savedsearch custom type) or a standard search ID from `portlet_customsearch_savedsearch` (section 5.9) |
| `resultssize` | integer | Required (schema; narrative says optional) | `10` | |
| `isminimized` | boolean | Optional | `F` | |
| `drilldown` | list | Optional | `NEW_PAGE` | `portlet_customsearch_drilldown`: `IN_PORTLET`, `NEW_PAGE` |
| `charttheme` | list | Optional | `GLOBAL_THEME` | `portlet_customsearch_charttheme`: `BASIC`, `COLORFUL`, `GLOBAL_THEME`, `MATCH_COLOR_THEME_BOLD`, `MATCH_COLOR_THEME_LIGHT` |
| `backgroundtype` | list | Optional | `GLOBAL_BACKGROUND` | `portlet_customsearch_backgroundtype`: `BANDS`, `GLOBAL_BACKGROUND`, `GRID`, `LINES` |
| `allowinlineediting` | boolean | Optional | `T` | Requires EXTREMELIST feature referenced in manifest (feature must be enabled for the field to appear) |
| `title` | string | Optional | — | Up to 40 characters |

```xml
<customsearch>
    <savedsearch>[scriptid=customsearch_my_search]</savedsearch>
    <resultssize>10</resultssize>
    <drilldown>NEW_PAGE</drilldown>
    <charttheme>GLOBAL_THEME</charttheme>
    <backgroundtype>GLOBAL_BACKGROUND</backgroundtype>
    <title>My Custom Saved Search Portlet</title>
    <allowinlineediting>T</allowinlineediting>
</customsearch>
```

### 3.5 `scheduler` - Event Scheduler portlet

Narrative: `subsect_160024535347.html`. Schema: `SDFxml_937573525.html`.

| Field | Type | Req | Default |
|---|---|---|---|
| `isminimized` | boolean | Optional | `F` |

```xml
<scheduler>
    <isminimized>F</isminimized>
</scheduler>
```

### 3.6 `keyperformanceindicators` - KPI portlet

Narrative: `bridgehead_1516039463.html`. Schema: `SDFxml_2032650472.html`, `kpis`
`SDFxml_1952366164.html`, `kpi` `SDFxml_1716063431.html`.

Top level:

| Field | Type | Req | Default | Notes |
|---|---|---|---|---|
| `isminimized` | boolean | Optional | `F` | |
| `cacheddata` | boolean | Optional | `F` | **Discrepancy:** schema page spells it `cacheddata`; the narrative example uses `<cachedata>`. A parser should accept both; a generator should prefer the schema spelling (`cacheddata`) and verify against a NetSuite-exported object. |
| `kpis` | COLLECTION | (container) | — | Repeatable `kpi` groups |

`kpis/kpi` (DEFAULT group; note the inner field is also named `kpi`):

| Field | Type | Req | Default | Values / conditions |
|---|---|---|---|---|
| `kpi` | list | Required | — | Any of: `snapshot_type_period_range_not_comparable`, `snapshot_type_period_range_comparable`, `snapshot_type_date_range_not_comparable`, `snapshot_type_date_range_comparable`, `snapshot_type_custom` (sections 5.11-5.15) |
| `daterange` | list | Required | — | `report_date_range` (section 5.17) |
| `comparedaterange` | list | Conditionally required | — | Available and mandatory when `kpi` is in date_range_comparable, period_range_comparable or custom, OR `compare = T`. Values: `report_date_range` |
| `compareperiodrange` | list | Conditionally required | — | Available and mandatory when `kpi` is in period_range_comparable or custom, OR `compare = T`. Values: `report_period_range` (section 5.18) |
| `savedsearch` | list (reference) | Conditionally required | — | Available and mandatory when `kpi` is a `snapshot_type_custom` value (`CUSTOM`, `CUSTOM2`..`CUSTOM10`). `[scriptid=customsearch_*]` |
| `periodrange` | list | Conditionally required | — | Available and mandatory when `kpi` is in period_range_comparable, period_range_not_comparable or custom. Values: `report_period_range` |
| `compare` | boolean | Conditionally required | `T` | Available and mandatory when `kpi` is in date_range_comparable, period_range_comparable or custom |
| `employees` | list | Optional | `ME_ONLY` | Available only when the dashboard's `center` is `SALESCENTER` or `SUPPORTCENTER`. `portlet_kpi_employees`: `ALL`, `ME_ONLY`, `MY_TEAM` |
| `headline` | boolean | Optional | `F` | |
| `highlightif` | list | Optional | — | `portlet_kpi_highlightif`: `ALWAYS`, `GREATER_THAN`, `LESS_THAN`, `VARIANCE_GREATER_THAN`, `VARIANCE_LESS_THAN` |
| `threshold` | float | Optional | — | Valid IEEE 754 floating point value |

Narrative notes:
- If Accounting Periods is enabled, `periodrange`/`daterange` are used according to the Report by
  Period preference; a `periodrange` must always be accompanied by a `daterange`. If Accounting
  Periods is disabled only `daterange` is used.
- Not all child elements are supported by all KPI types; SDF validates on deployment.
- Some KPI fields hold account-specific values that cannot be set in SDF and must be configured in
  the UI after deployment.

```xml
<keyperformanceindicators>
    <cachedata>F</cachedata>   <!-- narrative spelling; schema page says cacheddata -->
    <kpis>
        <kpi>
            <compare>T</compare>
            <comparedaterange>LAST_MONTH_TO_DATE</comparedaterange>
            <compareperiodrange>LAST_PERIOD</compareperiodrange>
            <daterange>TODAY</daterange>
            <headline>F</headline>
            <kpi>BANKBAL</kpi>
            <periodrange>THIS_PERIOD</periodrange>
        </kpi>
        <kpi>
            <compare>T</compare>
            <comparedaterange>LAST_WEEK</comparedaterange>
            <daterange>THIS_WEEK</daterange>
            <headline>F</headline>
            <highlightif>ALWAYS</highlightif>
            <kpi>CLOSEDCASES</kpi>
        </kpi>
        <kpi>
            <daterange>LAST_MONTH</daterange>
            <headline>F</headline>
            <kpi>UTILIZATION</kpi>
            <periodrange>THIS_PERIOD</periodrange>
        </kpi>
    </kpis>
</keyperformanceindicators>
```

### 3.7 `kpireport` - KPI Scorecard portlet

Narrative: `subsect_160024684911.html`. Schema: `SDFxml_2389874139.html`.

| Field | Type | Req | Default | Values / constraints |
|---|---|---|---|---|
| `isminimized` | boolean | Optional | `F` | |
| `reportid` | list | Optional | — | `portlet_kpireport_reportid` list page is **empty** in the help center. Narrative example uses the internal ID `-2` (Financial Ratios). Custom KPI scorecards: not documented on the fetched pages (the SDF `kpiscorecard` object exists; whether `[scriptid=custkpiscorecard_*]` is accepted here is not documented). |
| `restrict` | list | Optional | — | `portlet_kpireport_restrict`: `All`, `My Team`, `Only Mine` (mixed case, with spaces, exactly as listed) |
| `orientation` | list | Optional | — | `portlet_kpireport_orientation`: `Date Ranges on Left`, `KPIs on Left` (mixed case, with spaces) |
| `trend` | boolean | Optional | `F` | Show Trend Graph icon |
| `showdates` | boolean | Optional | `F` | Show Date Row |

```xml
<kpireport>
    <isminimized>F</isminimized>
    <orientation>KPIs on Left</orientation>
    <reportid>-2</reportid>
    <restrict>All</restrict>
    <showdates>T</showdates>
    <trend>T</trend>
</kpireport>
```

### 3.8 `kpimeter` - KPI Meter portlet

Narrative: `bridgehead_1516039465.html`. Schema: `SDFxml_3695579850.html`.

| Field | Type | Req | Default | Values |
|---|---|---|---|---|
| `kpi` | list | Required | — | Any of the five `snapshot_type_*` lists (sections 5.11-5.15) **plus** `portlet_kpimeter_combined_snapshots`: `ACTUAL_VS_FORECAST`, `ACTUAL_VS_QUOTA`, `FORECAST_VS_QUOTA`, `FORECAST_VS_QUOTA_ASA` |
| `isminimized` | boolean | Optional | `F` | |

The narrative says the meter shows one of the KPIs of a KPI portlet on the same dashboard or a
different KPI. No `savedsearch` sub-field is documented for custom KPIs on this element.

```xml
<kpimeter>
    <kpi>BANKBAL</kpi>
</kpimeter>
```

### 3.9 `tasklinks` - Links portlet (Reports Links / Activities Links) and Tasks portlet

Narrative: `subsect_160025245520.html` (Links) and `subsect_160025445319.html` (Tasks) both
document the same element. Schema: `SDFxml_2395641333.html`.

| Field | Type | Req | Default |
|---|---|---|---|
| `isminimized` | boolean | Optional | `F` |

Which flavour (Reports Links, Activities Links, Tasks) is rendered is not selectable in XML; it is
determined by the Center Tab the dashboard belongs to (not documented explicitly; the Links page
says it covers Reports Links and Activities Links portlets, the Tasks page says the portlet is
"predefined by a task record type").

```xml
<tasklinks>
    <isminimized>F</isminimized>
</tasklinks>
```

### 3.10 `list` - List portlet

Narrative: `bridgehead_1516039467.html`. Schema: `SDFxml_2940484860.html`.

| Field | Type | Req | Default | Values / constraints |
|---|---|---|---|---|
| `type` | list | Required | — | `portlet_list_type` (section 5.10) for standard types; narrative says custom record types are also allowed (reference form not shown on the page; by SDF convention `[scriptid=customrecord_*]` *(inference)*) |
| `size` | integer | Required (schema; narrative says optional) | `5` | 1 through 50 inclusive |
| `isminimized` | boolean | Optional | `F` | |
| `allowinlineediting` | boolean | Optional | `T` | |

The narrative mentions "saved search results related to the record type" can be chosen in the UI,
but no XML field for that is documented.

```xml
<list>
    <type>CUSTOMER</type>
    <size>25</size>
    <allowinlineediting>F</allowinlineediting>
</list>
```

### 3.11 `lastlogin` - My Login Audit portlet

Narrative: `subsect_161183406555.html`. Schema: `SDFxml_282636250.html`.

All fields boolean, optional. Schema page gives a default only for `isminimized` (`F`); the
defaults column below is taken from the narrative page's table.

| Field | Narrative default |
|---|---|
| `isminimized` | `F` |
| `showlastlogin` | `T` |
| `showlastotherservicelogin` | `F` |
| `showlastuilogin` | `F` |
| `showlastloginip` | `F` |
| `showlastuiloginip` | `F` |
| `showcurrentuilogin` | `F` |
| `showcurrentuiloginip` | `F` |
| `showsuccesstoday` | `T` |
| `showsuccessthisweek` | `F` |
| `showsuccessthismonth` | `F` |
| `showlastfailuretime` | `F` |
| `showlastfailureip` | `F` |
| `showfailurestoday` | `T` |
| `showfailuresthisweek` | `F` |
| `showfailuresthismonth` | `F` |
| `showpasswordchanged` | `T` |
| `showpasswordexpiration` | `T` |
| `showlastmobilelogin` | `T` |
| `showlastmobileloginip` | `F` |
| `showmobiletoday` | `F` |
| `showmobilethisweek` | `F` |
| `showmobilethismonth` | `F` |
| `showlastwebservicelogin` | `F` |
| `showlastwebserviceloginip` | `F` |
| `showwebservicetoday` | `F` |
| `showwebservicethisweek` | `F` |
| `showwebservicethismonth` | `F` |

```xml
<lastlogin>
    <isminimized>F</isminimized>
    <showcurrentuilogin>F</showcurrentuilogin>
    <showcurrentuiloginip>F</showcurrentuiloginip>
    <showfailuresthismonth>F</showfailuresthismonth>
    <showfailuresthisweek>F</showfailuresthisweek>
    <showfailurestoday>T</showfailurestoday>
    <showlastfailureip>F</showlastfailureip>
    <showlastfailuretime>F</showlastfailuretime>
    <showlastlogin>T</showlastlogin>
    <showlastloginip>F</showlastloginip>
    <showlastmobilelogin>T</showlastmobilelogin>
    <showlastmobileloginip>F</showlastmobileloginip>
    <showlastotherservicelogin>F</showlastotherservicelogin>
    <showlastuilogin>F</showlastuilogin>
    <showlastuiloginip>F</showlastuiloginip>
    <showlastwebservicelogin>F</showlastwebservicelogin>
    <showlastwebserviceloginip>F</showlastwebserviceloginip>
    <showmobilethismonth>F</showmobilethismonth>
    <showmobilethisweek>F</showmobilethisweek>
    <showmobiletoday>F</showmobiletoday>
    <showpasswordchanged>T</showpasswordchanged>
    <showpasswordexpiration>T</showpasswordexpiration>
    <showsuccessthismonth>F</showsuccessthismonth>
    <showsuccessthisweek>F</showsuccessthisweek>
    <showsuccesstoday>T</showsuccesstoday>
    <showwebservicethismonth>F</showwebservicethismonth>
    <showwebservicethisweek>F</showwebservicethisweek>
    <showwebservicetoday>F</showwebservicetoday>
</lastlogin>
```

### 3.12 `pdganttchart` - Gantt Chart portlet

Narrative: `subsect_163412492323.html`. Schema: `SDFxml_2693680880.html`.

| Field | Type | Req | Default |
|---|---|---|---|
| `isminimized` | boolean | Optional | `F` |

```xml
<pdganttchart>
    <isminimized>F</isminimized>
</pdganttchart>
```

### 3.13 `pdinfo` - Project Info portlet

Narrative: `subsect_163412524694.html`. Schema: `SDFxml_2592360553.html`.

| Field | Type | Req | Default |
|---|---|---|---|
| `isminimized` | boolean | Optional | `F` |

```xml
<pdinfo>
    <isminimized>F</isminimized>
</pdinfo>
```

### 3.14 `pdpl` - Project Profitability portlet

Narrative: `subsect_163412541892.html`. Schema: `SDFxml_2232585245.html`.
Requires the Advanced Project Profitability feature enabled in the account.

| Field | Type | Req | Default |
|---|---|---|---|
| `isminimized` | boolean | Optional | `F` |

```xml
<pdpl>
    <isminimized>F</isminimized>
</pdpl>
```

### 3.15 `pdquicklinks` - Project Links portlet

Narrative: `subsect_163412579455.html`. Schema: `SDFxml_368720903.html`.

| Field | Type | Req | Default |
|---|---|---|---|
| `isminimized` | boolean | Optional | `F` |

```xml
<pdquicklinks>
    <isminimized>F</isminimized>
</pdquicklinks>
```

### 3.16 `quicksearch` - Quick Search portlet

Narrative: `bridgehead_1516039469.html`. Schema: `SDFxml_1855112627.html`.

| Field | Type | Req | Default | Values |
|---|---|---|---|---|
| `searchtype` | list | Required | `GENERIC` | `portlet_quicksearch_type`: `GENERIC`, `TRANSACTION` |
| `isminimized` | boolean | Optional | `F` | |
| `defaultgeneraltype` | list | Optional | — | `portlet_quicksearch_generic` (section 5.20) or a `customrecordtype` reference `[scriptid=customrecord_*]` |
| `defaulttransactiontype` | list | Optional | — | `portlet_quicksearch_transaction` (section 5.21) |

**Discrepancy:** the narrative page's example contains misspelled element names
(`<defeaultgeneraltype>`, `<defeaulttansactiontype>` opened and `</defaulttransactiontype>`
closed). The schema page spells them `defaultgeneraltype` / `defaulttransactiontype`; use the
schema spelling. Quick Search portlets in SDF cannot search custom transactions.

```xml
<quicksearch>
    <searchtype>GENERIC</searchtype>
    <defaultgeneraltype>CAMPAIGN</defaultgeneraltype>
    <defaulttransactiontype>CASH_REFUND</defaulttransactiontype>
</quicksearch>
```

### 3.17 `recentrecords` - Recent Records portlet

Narrative: `subsect_160025413222.html`. Schema: `SDFxml_2359040977.html`.

| Field | Type | Req | Default |
|---|---|---|---|
| `isminimized` | boolean | Optional | `F` |

```xml
<recentrecords>
    <isminimized>F</isminimized>
</recentrecords>
```

### 3.18 `recentreports` - Recent Reports portlet

Narrative: `subsect_160025428242.html`. Schema: `SDFxml_3776898258.html`.

| Field | Type | Req | Default |
|---|---|---|---|
| `isminimized` | boolean | Optional | `F` |

```xml
<recentreports>
    <isminimized>F</isminimized>
</recentreports>
```

### 3.19 `enhsnapshots` - Report Snapshot portlet

Narrative: `subsect_161175642795.html`. Schema: `SDFxml_2844836912.html`.
All fields optional on the schema page; no defaults, constraints or conditions are documented
there. Types marked "string" are what the schema page says even where the narrative example
uses `T`/`F`.

| Field | Schema type | Values (list) | Narrative example / note |
|---|---|---|---|
| `isminimized` | boolean (default `F`) | | `F` |
| `snapshot` | list | `portlet_reportsnapshot_snapshot` (section 5.22) | `CAMPAIGN_ACTIVITY` |
| `charttype` | list | `portlet_reportsnapshot_charttype`: `AREA`, `BAR`, `COLUMN`, `LINE` | `AREA` |
| `backgroundtype` | list | `portlet_reportsnapshot_backgroundtype`: `BANDS`, `GLOBAL_BACKGROUND`, `GRID`, `LINES` | `GLOBAL_BACKGROUND` |
| `hierarchylevel` | string | | `3` |
| `charttheme` | list | `portlet_reportsnapshot_charttheme`: `BASIC`, `COLORFUL`, `GLOBAL_THEME`, `MATCH_COLOR_THEME_BOLD`, `MATCH_COLOR_THEME_LIGHT` | `GLOBAL_THEME` |
| `periodrange` | list | `portlet_reportsnapshot_reportperiodrange` (section 5.24) | `THIS_PERIOD` |
| `daterange` | list | `portlet_reportsnapshot_daterange` (section 5.23) | `THIS_MONTH_TO_DATE` |
| `topx` | list | `portlet_reportsnapshot_topx`: `BOTTOM_5`, `BOTTOM_10`, `BOTTOM_15`, `BOTTOM_25`, `BOTTOM_50`, `TOP_0`, `TOP_5`, `TOP_10`, `TOP_15`, `TOP_20`, `TOP_25`, `TOP_50` | `TOP_5` |
| `isgraph` | string | (`T`/`F` in example) | `T` |
| `compareperiodrange` | list | `portlet_reportsnapshot_reportperiodrange` | empty |
| `comparedaterange` | list | `portlet_reportsnapshot_daterange` | empty |
| `isnewdaterange` | list | `portlet_reportsnapshot_daterange` | empty |
| `custom` | string | (`T`/`F` in example) | `F` |
| `listtopx` | list | `portlet_reportsnapshot_topx` | `TOP_5` |
| `graphlayout` | list | `portlet_reportsnapshot_graphlayout`: `BAR`, `COLUMN`, `LINE`, `PIE` | `COLUMN` |
| `orderby` | string | | empty |
| `orderdesc` | string | (`T`/`F` in example) | `T` |
| `color` | string | | empty |
| `customsnapshot` | string | | empty (custom snapshot identifier; format not documented) |
| `comparedranges` | string | | empty |
| `comparedaterange2` | list | `portlet_reportsnapshot_daterange` | empty |

There is also a `portlet_reportsnapshot_displaytype` list (`GRAPH`, `LIST`) in the lists index,
but no `enhsnapshots` field on the schema page references it (the example uses `isgraph` T/F
instead).

```xml
<enhsnapshots>
    <backgroundtype>GLOBAL_BACKGROUND</backgroundtype>
    <charttheme>GLOBAL_THEME</charttheme>
    <charttype>AREA</charttype>
    <color></color>
    <comparedaterange></comparedaterange>
    <comparedaterange2></comparedaterange2>
    <comparedranges></comparedranges>
    <compareperiodrange></compareperiodrange>
    <custom>F</custom>
    <customsnapshot></customsnapshot>
    <daterange>THIS_MONTH_TO_DATE</daterange>
    <graphlayout>COLUMN</graphlayout>
    <hierarchylevel>3</hierarchylevel>
    <isgraph>T</isgraph>
    <isminimized>F</isminimized>
    <isnewdaterange></isnewdaterange>
    <listtopx>TOP_5</listtopx>
    <orderby></orderby>
    <orderdesc>T</orderdesc>
    <periodrange>THIS_PERIOD</periodrange>
    <snapshot>CAMPAIGN_ACTIVITY</snapshot>
    <topx>TOP_5</topx>
</enhsnapshots>
```

### 3.20 `reminders` - Reminders portlet

Narrative: `bridgehead_1536243891.html`. Schema: `SDFxml_474769753.html`; `headline`
`SDFxml_2674367704.html`; `other` `SDFxml_3603650706.html`; `reminder` `SDFxml_1175044432.html`
(under headline) / `SDFxml_715838527.html` (under other); `highlightingrules`
`SDFxml_3267379240.html` / `SDFxml_3773704632.html`; `rule` `SDFxml_2921584759.html`.

```
reminders
├── isminimized        boolean  optional  default F
├── showzeroresults    boolean  optional  default F   (show the reminder even when count is 0)
├── headline           COLLECTION  (prominent upper section)
│   └── reminder (repeatable)
│       ├── id                  list   REQUIRED
│       ├── days                integer optional default 5, range -9999999..99999999,
│       │                       available only when id is in reminders_standard_reminders_with_days
│       └── highlightingrules   COLLECTION
│           └── rule (repeatable)
│               ├── greaterthanorequalto  integer REQUIRED range -9999999..99999999
│               └── color                 list optional default YELLOW (reminders_highlighting_rules_colors)
└── other              COLLECTION  (standard lower section) - identical reminder structure
```

`reminder/id` values:
- Standard reminders **without** a day count: `reminders_standard_reminders_without_days` (section 5.25).
- Standard reminders **with** a day count (`days` applies): `reminders_standard_reminders_with_days` (section 5.26).
- Custom reminder: `[scriptid=customsearch_*]` referencing a `savedsearch` object whose
  "Available for Reminders" box is checked. The saved search object must be in the project
  (required for SuiteApps, optional for account customization projects) and must be
  NetSuite-generated XML (do not hand-edit). Valid reminders depend on role and enabled features.

`rule/color` values (`reminders_highlighting_rules_colors`): `BLUE`, `BROWN`, `CYAN`,
`DARKGREEN`, `DARKRED`, `GOLDENROD`, `GREEN`, `LIGHTBLUE`, `LIMEGREEN`, `MAROON`, `ORANGE`,
`PASTELGREEN`, `PINK`, `PURPLE`, `RED`, `YELLOW`. (The narrative page lists a shorter set
RED/BLUE/GREEN/YELLOW/ORANGE/PURPLE/GRAY; `GRAY` is **not** in the schema list - prefer the schema list.)

Full example (as published by Oracle, including the object wrapper):

```xml
<publisheddashboard scriptid="custpubdashboard_reminders">
    <center>ACCOUNTCENTER</center>
    <locknewbar>F</locknewbar>
    <lockshortcuts>F</lockshortcuts>
    <name>Reminders</name>
    <notes/>
    <roles>
        <role>
            <role>HUMAN_RESOURCES_GENERALIST</role>
        </role>
    </roles>
    <dashboards>
        <dashboard>
            <centertab>BASICCENTERHOMEHOME</centertab>
            <layout>THREE_COLUMN</layout>
            <mode>UNLOCKED</mode>
            <leftcolumn>
                <reminders>
                    <isminimized>F</isminimized>
                    <showzeroresults>T</showzeroresults>
                    <headline>
                        <reminder>
                            <days>5</days>
                            <id>EMPLOYEESWITHUPCOMINGANNIVERSARY</id>
                            <highlightingrules>
                                <rule>
                                    <color>BLUE</color>
                                    <greaterthanorequalto>1</greaterthanorequalto>
                                </rule>
                            </highlightingrules>
                        </reminder>
                        <reminder>
                            <days>7</days>
                            <id>EMPLOYEESWITHUPCOMINGBIRTHDAY</id>
                        </reminder>
                    </headline>
                    <other>
                        <reminder>
                            <id>[scriptid=customsearch_emps_kwolfe]</id>
                        </reminder>
                    </other>
                </reminders>
            </leftcolumn>
        </dashboard>
    </dashboards>
</publisheddashboard>
```

### 3.21 `searchform` - Search Form portlet

Narrative: `bridgehead_1516039471.html`. Schema: `SDFxml_1210102087.html`.

| Field | Type | Req | Default | Values |
|---|---|---|---|---|
| `savedsearch` | list (reference) | Required | — | `[scriptid=customsearch_*]`; the saved search must be defined as a **preferred search form** in the account |
| `isminimized` | boolean | Optional | `F` | |

```xml
<searchform>
    <savedsearch>[scriptid=customsearch_my_form]</savedsearch>
</searchform>
```

### 3.22 `settings` - Settings portlet

Narrative: `subsect_160025438364.html`. Schema: `SDFxml_2316346497.html`.

| Field | Type | Req | Default |
|---|---|---|---|
| `isminimized` | boolean | Optional | `F` |

```xml
<settings>
    <isminimized>F</isminimized>
</settings>
```

### 3.23 `shortcuts` - Shortcuts portlet (schema only)

Schema: `SDFxml_2470918358.html`. Not present in the narrative "Supported Published Dashboard
Object Portlets" index, but listed as a `centercolumn` structured field.

| Field | Type | Req | Default |
|---|---|---|---|
| `isminimized` | boolean | Optional | `F` |

```xml
<shortcuts>
    <isminimized>F</isminimized>
</shortcuts>
```

### 3.24 `trendgraph` - Trend Graph portlet

Narrative: `bridgehead_1516039474.html`. Schema: `SDFxml_1317380448.html`. Up to five trend
graph portlets per dashboard.

| Field | Type | Req | Default | Values / constraints |
|---|---|---|---|---|
| `kpi` | list | Required | — | `snapshot_type_trendgraph` (section 5.16) or `snapshot_type_custom` |
| `trendtype` | list | Required | — | `portlet_trendgraph_trendtype`: `DAILY`, `WEEKLY`, `MONTHLY`, `QUARTERLY`, `YEARLY` |
| `movingaverageperiod` | integer | Required | `2` | 1 through 10 inclusive |
| `savedsearch` | list (reference) | Conditionally required | — | Available/mandatory when `kpi` is a `snapshot_type_custom` value. `[scriptid=customsearch_*]` |
| `savedsearch2` | list (reference) | Conditionally required | — | Available/mandatory when `kpi2` is a `snapshot_type_custom` value |
| `savedsearch3` | list (reference) | Conditionally required | — | Available/mandatory when `kpi3` is a `snapshot_type_custom` value |
| `isminimized` | boolean | Optional | `F` | |
| `kpi2` | list | Optional | — | `snapshot_type_trendgraph` or `snapshot_type_custom` |
| `kpi3` | list | Optional | — | `snapshot_type_trendgraph` or `snapshot_type_custom` |
| `backgroundtype` | list | Optional | `GLOBAL_BACKGROUND` | `portlet_trendgraph_backgroundtype`: `BANDS`, `GLOBAL_BACKGROUND`, `GRID`, `LINES` |
| `charttheme` | list | Optional | `GLOBAL_THEME` | `portlet_trendgraph_charttheme`: `BASIC`, `COLORFUL`, `GLOBAL_THEME`, `MATCH_COLOR_THEME___BOLD`, `MATCH_COLOR_THEME___LIGHT` (three underscores, as listed on the trendgraph list page; the customsearch/reportsnapshot lists use a single underscore) |
| `customseriescolor` | rgb | Optional | — | 6-digit hex `#000000`..`#FFFFFF`; `#` prefix optional |
| `customseriescolor2` | rgb | Optional | — | same |
| `customseriescolor3` | rgb | Optional | — | same |
| `defaultcharttype` | list | Optional | `AREA` | `portlet_trendgraph_charttype`: `AREA`, `BAR`, `COLUMN`, `LINE` |
| `includezeroonyaxis` | boolean | Optional | `F` | |
| `showmovingaverage` | boolean | Optional | `T` | |
| `showlastdatapoint` | boolean | Optional | `T` | |

```xml
<trendgraph>
    <defaultcharttype>AREA</defaultcharttype>
    <kpi>ESTIMATES</kpi>
    <trendtype>MONTHLY</trendtype>
    <showmovingaverage>T</showmovingaverage>
    <movingaverageperiod>2</movingaverageperiod>
    <showlastdatapoint>T</showlastdatapoint>
    <includezeroonyaxis>F</includezeroonyaxis>
    <charttheme>GLOBAL_THEME</charttheme>
    <backgroundtype>GLOBAL_BACKGROUND</backgroundtype>
    <customseriescolor>#ABCDEF</customseriescolor>
</trendgraph>
```

---

## 4. Quick matrix: portlet element -> fields

| Element | Required fields | Optional fields |
|---|---|---|
| `analytics` | `portlettype`, `visualization` | `isminimized`, `name`, `height` (CHART), `visiblerows` (PIVOT/TABLE) |
| `calendar` | `numberofrecordsinagenda` | `isminimized`, `showevents`, `showblockingtasks`, `shownonblockingtasks`, `showblockingcalls`, `shownonblockingcalls`, `showcanceledevents`, `showweekendsinmonthlyview`, `recordstodisplayinagenda`, `showcampaignevents`, `showresourceallocations` |
| `customportlet` | `source` | `isminimized`, `parameters/parameter{id,value}` |
| `customsearch` | `savedsearch`, `resultssize` | `isminimized`, `drilldown`, `charttheme`, `backgroundtype`, `allowinlineediting`, `title` |
| `enhsnapshots` | (none) | all 22 fields listed in 3.19 |
| `keyperformanceindicators` | (`kpis/kpi/kpi`, `kpis/kpi/daterange` per KPI) | `isminimized`, `cacheddata`; per KPI: `compare`, `comparedaterange`, `compareperiodrange`, `periodrange`, `savedsearch`, `employees`, `headline`, `highlightif`, `threshold` |
| `kpimeter` | `kpi` | `isminimized` |
| `kpireport` | (none) | `isminimized`, `reportid`, `restrict`, `orientation`, `trend`, `showdates` |
| `lastlogin` | (none) | `isminimized` + 27 `show*` booleans |
| `list` | `type`, `size` | `isminimized`, `allowinlineediting` |
| `pdganttchart`, `pdinfo`, `pdpl`, `pdquicklinks`, `recentrecords`, `recentreports`, `scheduler`, `settings`, `shortcuts`, `tasklinks` | (none) | `isminimized` |
| `quicksearch` | `searchtype` | `isminimized`, `defaultgeneraltype`, `defaulttransactiontype` |
| `reminders` | (`reminder/id` per reminder; `rule/greaterthanorequalto` per rule) | `isminimized`, `showzeroresults`, `headline`, `other`, `reminder/days`, `rule/color` |
| `searchform` | `savedsearch` | `isminimized` |
| `trendgraph` | `kpi`, `trendtype`, `movingaverageperiod` (+ `savedsearch[2|3]` when kpi[2|3] is custom) | `isminimized`, `kpi2`, `kpi3`, `backgroundtype`, `charttheme`, `customseriescolor[2|3]`, `defaultcharttype`, `includezeroonyaxis`, `showmovingaverage`, `showlastdatapoint` |

---

## 5. Enumerations

### 5.1 `role_centertype` (values for `publisheddashboard/center`) - `SDFxml_3349140554.html`

```
ACCOUNTCENTER  BASIC  ENGINEERCENTER  EXECUTIVE  HR  MARKETCENTER  PARTNERCENTER
PROJECTCENTER  SALESCENTER  SHIPPINGCENTER  STOREMANAGER  SUPPORTCENTER  SYSADMINCENTER
```

Custom centers: `[scriptid=custcenter_*]` (`center` object, scriptid default `custcenter`, requires CUSTOMRECORDS).

### 5.2 `generic_centertype` (superset used by `centertab/center`, for context) - `SDFxml_2142594848.html`

```
ACCOUNTCENTER  ALL  BASIC  CUSTOMER  EMPLOYEE  ENGINEERCENTER  EXECUTIVE  HR  MARKETCENTER
OFFLINESALESCENTER  PARTNER  PARTNERCENTER  PROJECTCENTER  SALESCENTER  SHIPPINGCENTER
STOREMANAGER  SUITEAPPCONTROLCENTER  SUPPORTCENTER  SYSADMINCENTER  VENDOR  WEBSITE
```

### 5.3 `generic_centertab` (values for `dashboard/centertab`) - `SDFxml_2711749150.html`

Format of standard codes: `<CENTERTYPE>CENTER<TABNAME>` (e.g. `BASICCENTERHOMEHOME`,
`ACCOUNTCENTERCENTERFINANCIAL`). The `CUSTCENTERTAB-<n>` entries are internal-ID-style values
present in the published list. Custom tabs are referenced as `[scriptid=custcentertab_*]`
(`centertab` object, scriptid default `custcentertab`). Complete list (93 values):

```
ACCOUNTCENTERCENTERCUSTOMERS
ACCOUNTCENTERCENTERFINANCIAL
ACCOUNTCENTERCENTERPAYROLLANDHR
ACCOUNTCENTERCENTERREPORTS
ACCOUNTCENTERCENTERREVENUE
ACCOUNTCENTERCENTERSETUP
ACCOUNTCENTERCENTERVENDORS
BASICCENTERACTIVITIES
BASICCENTERCOMMERCE
BASICCENTERCUSTOMERDASHBOARD
BASICCENTERCUSTOMIZATION
BASICCENTERDOCUMENTS
BASICCENTERHOMEHOME
BASICCENTERLISTS
BASICCENTERPROJECTDASHBOARD
BASICCENTERREPORTS
BASICCENTERSETUP
BASICCENTERSUPPORT
BASICCENTERTRANSACTIONS
BASICCONTROLTOWERDASHBOARD
BASICVENDORDASHBOARD
CUSTCENTERTAB-100
CUSTCENTERTAB-120
CUSTCENTERTAB-121
CUSTCENTERTAB-122
CUSTCENTERTAB-123
CUSTCENTERTAB-125
CUSTCENTERTAB-130
CUSTCENTERTAB-131
CUSTCENTERTAB-141
CUSTCENTERTAB-142
CUSTCENTERTAB-143
CUSTCENTERTAB-144
CUSTCENTERTAB-145
CUSTCENTERTAB-148
CUSTOMERCENTERHOMEHOME
EMPLOYEECENTERHOMEHOME
ENGINEERCENTERCENTERISSUES
ENGINEERCENTERCENTERREPORTS
EXECUTIVECENTEREXPENSES
EXECUTIVECENTERFINANCIAL
EXECUTIVECENTERHR
EXECUTIVECENTERREPORTS
EXECUTIVECENTERSALESMARKETING
EXECUTIVECENTERSETUP
MARKETCENTERCENTERCAMPAIGNS
MARKETCENTERCENTERLEADS
MARKETCENTERCENTERREPORTS
MARKETCENTERCENTERSETUP
OFFLINESALESCENTERCENTERACTIVITIES
OFFLINESALESCENTERCENTERCUSTOMERS
OFFLINESALESCENTERCENTERHOME
OFFLINESALESCENTERCENTERLEADS
OFFLINESALESCENTERCENTEROPPORTUNITIES
OFFLINESALESCENTERCENTERPROSPECTS
ORDERMANAGEMENTDASHBOARD
PARTNERCENTERCENTERCASES
PARTNERCENTERCENTERCUSTOMERS
PARTNERCENTERCENTERREPORTS
PARTNERCENTERCENTERSETUP
PARTNERCENTERHOMEHOME
PROJECTCENTERCENTERACTIVITIES
PROJECTCENTERCENTERCRM
PROJECTCENTERCENTERHOMEHOME
PROJECTCENTERCENTERPROJECTS
PROJECTCENTERCENTERREPORTS
PROJECTCENTERCENTERRESOURCES
PROJECTCENTERCENTERTIMEEXPENSES
SALESCENTERCENTERCUSTOMERS
SALESCENTERCENTERFORECAST
SALESCENTERCENTERLEADS
SALESCENTERCENTEROPPORTUNITIES
SALESCENTERCENTERPROSPECTS
SALESCENTERCENTERREPORTS
SALESCENTERCENTERSETUP
SHIPPINGCENTERCENTERINVENTORY
SHIPPINGCENTERCENTERRECEIVING
SHIPPINGCENTERCENTERREPORTS
SHIPPINGCENTERCENTERSETUP
SHIPPINGCENTERCENTERSHIPPING
STOREMANAGERCENTERCONTACTS
STOREMANAGERCENTERREPORTS
STOREMANAGERCENTERSALES
STOREMANAGERCENTERSETUP
STOREMANAGERCENTERWEBSITE
SUPPORTCENTERCENTERCASES
SUPPORTCENTERCENTERCUSTOMERS
SUPPORTCENTERCENTERISSUES
SUPPORTCENTERCENTERREPORTS
SUPPORTCENTERCENTERSETUP
SYSADMINCENTERCENTERLISTS
SYSADMINCENTERCENTERSETUP
VENDORCENTERHOMEHOME
```

Observation: the Home tab of the classic/BASIC center is `BASICCENTERHOMEHOME` and Oracle's
reminders example uses it with `<center>ACCOUNTCENTER</center>`; the list contains no
`ACCOUNTCENTERCENTERHOME*` entry, so Home tabs of the standard centers appear to share the
`BASICCENTERHOMEHOME` code *(inference from the examples; not stated)*. Which tabs are valid for
which center is not documented on the list page; SDF validates on deployment.

### 5.4 `generic_role` (values for `roles/role/role`) - `SDFxml_2643926240.html`

Custom roles: `[scriptid=customrole_*]`. Standard values (61):

```
ACCOUNTANT
ACCOUNTANT__REVIEWER
ADMINISTRATOR
ADVANCED_PARTNER_CENTER
AP_CLERK
AR_CLERK
BOOKKEEPER
BUYER
CEO
CEO_HANDS_OFF
CHIEF_PEOPLE_OFFICER_CPO
CONSULTANT
CUSTOMER_CENTER
CUSTOMROLE41
CUSTOMROLE42
CUSTOMROLE43
CUSTOMROLE56
DATA_WAREHOUSE_INTEGRATOR
DEVELOPER
EMPLOYEE_CENTER
ENGINEER
ENGINEERING_MANAGER
FULL_ACCESS
HUMAN_RESOURCES_ADMINISTRATOR
HUMAN_RESOURCES_GENERALIST
INTRANET_MANAGER
ISSUE_ADMINISTRATOR
MARKETING_ADMINISTRATOR
MARKETING_ASSISTANT
MARKETING_MANAGER
NETSUITE_SUPPORT_CENTER
NETSUITE_SUPPORT_CENTER__BASIC
ONLINE_FORM_USER
PARTNER_CENTER
PAYROLL_MANAGER
PAYROLL_SETUP
PM_MANAGER
PRODUCT_MANAGER
QA_ENGINEER
QA_MANAGER
RESOURCE_MANAGER
REVENUE_ACCOUNTANT
REVENUE_MANAGER
SALES_ADMINISTRATOR
SALES_MANAGER
SALES_PERSON
SALES_VICE_PRESIDENT
SHOPPER
STORE_MANAGER
SUITEAPPRELEASEMANAGER
SUPPORT_ADMINISTRATOR
SUPPORT_MANAGER
SUPPORT_PERSON
SYSTEM_ADMINISTRATOR
TAX_ENGINE
VENDOR_CENTER
WAREHOUSE_MANAGER
WMS_LIMITED_ACCESS
_ALL_ROLES
specialized_user_crm
specialized_user_view
```

### 5.5 `dashboard_layout` - `SDFxml_1126447129.html`

`SINGLE_COLUMN`, `THREE_COLUMN`, `TWO_COLUMN`, `TWO_COLUMN_RIGHT` (default `TWO_COLUMN`).

### 5.6 `dashboard_mode` - `SDFxml_2875910423.html`

`ADD_MOVE`, `LOCKED`, `UNLOCKED` (default `UNLOCKED`).

### 5.7 `generic_portlet` (portlet type codes used by other objects such as `centertab/portlets`; for reference) - `SDFxml_1887060518.html`

```
ANALYTICS  CALENDAR  DASHBOARD_APP  KPIMETER  KPIREPORT  LASTLOGIN  LIST  QUICKADD  QUICKSEARCH
RECENTRECORDS  RECENTREPORTS  REMINDERS  RSSSOURCE  SCHEDULER  SCRIPTPORTLET  SEARCHFORM
SEARCHRESULTS  SETTINGS  SHORTCUTS  SNAPSHOTS  SYSTEMSTATUS  TASKLINKS  TIMELINE
```

`generic_portletcolumn`: `1`, `2`, `3`. Neither list is referenced by any `publisheddashboard`
field; they are included because the element names differ from the dashboard elements
(`SCRIPTPORTLET` ~ `customportlet`, `SEARCHRESULTS` ~ `customsearch`, `SNAPSHOTS` ~ `enhsnapshots`).

### 5.8 Analytics / calendar / customsearch / kpi / kpireport / kpimeter small lists

| List | Values |
|---|---|
| `portlet_analytics_portlettype` | `CHART`, `PIVOT`, `TABLE` |
| `portlet_analytics_height` | `MEDIUM`, `SHORT`, `TALL` |
| `portlet_calendar_agenda` | `TODAY_ONLY`, `UPCOMING` |
| `portlet_customsearch_drilldown` | `IN_PORTLET`, `NEW_PAGE` |
| `portlet_customsearch_charttheme` | `BASIC`, `COLORFUL`, `GLOBAL_THEME`, `MATCH_COLOR_THEME_BOLD`, `MATCH_COLOR_THEME_LIGHT` |
| `portlet_customsearch_backgroundtype` | `BANDS`, `GLOBAL_BACKGROUND`, `GRID`, `LINES` |
| `portlet_kpi_employees` | `ALL`, `ME_ONLY`, `MY_TEAM` |
| `portlet_kpi_highlightif` | `ALWAYS`, `GREATER_THAN`, `LESS_THAN`, `VARIANCE_GREATER_THAN`, `VARIANCE_LESS_THAN` |
| `portlet_kpimeter_combined_snapshots` | `ACTUAL_VS_FORECAST`, `ACTUAL_VS_QUOTA`, `FORECAST_VS_QUOTA`, `FORECAST_VS_QUOTA_ASA` |
| `portlet_kpireport_orientation` | `Date Ranges on Left`, `KPIs on Left` |
| `portlet_kpireport_restrict` | `All`, `My Team`, `Only Mine` |
| `portlet_kpireport_reportid` | (list page is empty in the help center) |
| `portlet_quicksearch_type` | `GENERIC`, `TRANSACTION` |
| `portlet_reportsnapshot_charttype` | `AREA`, `BAR`, `COLUMN`, `LINE` |
| `portlet_reportsnapshot_graphlayout` | `BAR`, `COLUMN`, `LINE`, `PIE` |
| `portlet_reportsnapshot_displaytype` | `GRAPH`, `LIST` |
| `portlet_reportsnapshot_charttheme` | `BASIC`, `COLORFUL`, `GLOBAL_THEME`, `MATCH_COLOR_THEME_BOLD`, `MATCH_COLOR_THEME_LIGHT` |
| `portlet_reportsnapshot_backgroundtype` | `BANDS`, `GLOBAL_BACKGROUND`, `GRID`, `LINES` |
| `portlet_reportsnapshot_topx` | `BOTTOM_10`, `BOTTOM_15`, `BOTTOM_25`, `BOTTOM_5`, `BOTTOM_50`, `TOP_0`, `TOP_10`, `TOP_15`, `TOP_20`, `TOP_25`, `TOP_5`, `TOP_50` |
| `portlet_trendgraph_trendtype` | `DAILY`, `MONTHLY`, `QUARTERLY`, `WEEKLY`, `YEARLY` |
| `portlet_trendgraph_charttype` | `AREA`, `BAR`, `COLUMN`, `LINE` |
| `portlet_trendgraph_charttheme` | `BASIC`, `COLORFUL`, `GLOBAL_THEME`, `MATCH_COLOR_THEME___BOLD`, `MATCH_COLOR_THEME___LIGHT` |
| `portlet_trendgraph_backgroundtype` | `BANDS`, `GLOBAL_BACKGROUND`, `GRID`, `LINES` |
| `reminders_highlighting_rules_colors` | `BLUE`, `BROWN`, `CYAN`, `DARKGREEN`, `DARKRED`, `GOLDENROD`, `GREEN`, `LIGHTBLUE`, `LIMEGREEN`, `MAROON`, `ORANGE`, `PASTELGREEN`, `PINK`, `PURPLE`, `RED`, `YELLOW` |
| `kpiscorecards_comparisons` (kpiscorecard object, not dashboard) | `RATIO_ABSOLUTE`, `RATIO_PERCENT`, `SUM`, `VARIANCE_ABSOLUTE`, `VARIANCE_PERCENT` |
| `kpiscorecards_highlight_conditions` (kpiscorecard object) | `ALWAYS`, `GREATER_THAN`, `LESS_THAN`, `MAGNITUDE_GREATER_THAN`, `MAGNITUDE_LESS_THAN` |
| `kpiscorecards_highlight_icons` (kpiscorecard object) | `BLUE_FLAG`, `BLUE_NEW`, `CHECKMARK`, `DOLLAR_SIGN_1`, `DOLLAR_SIGN_2`, `DOLLAR_SIGN_3`, `EXCLAMATION_MARK`, `FIREBALL`, `GREEN_FLAG`, `HEART`, `ORANGE_FLAG`, `RED_ARROW_LEFT`, `RED_ARROW_RIGHT`, `RED_FLAG`, `RED_NEW`, `STARBURST`, `STARBURST_NEW`, `X_MARK`, `YELLOW_FLAG` |
| `kpiscorecards_useperiods` (kpiscorecard object) | `F`, `T` (T requires ACCOUNTINGPERIODS) |

### 5.9 `portlet_customsearch_savedsearch` (standard searches usable in `customsearch/savedsearch`) - `SDFxml_3301900604.html`

Numeric (internal-ID style) values:

```
-4167 -4170 -4172 -4173 -4214 -4258 -4264 -4265 -4266 -4267 -4378 -4381 -4383 -4399 -4414
-4415 -4416 -4417 -4419 -4423 -4428 -4429 -47 -71 -82
```

Named values (many carry feature dependencies such as TIMESHEETS, SUPPORT, OPPORTUNITIES, ACCOUNTING; the list page does not map each value to its feature in the fetched text):

```
ALLOCATEORDER  ANALYTICSAUDITTRAILDETAILVIEW  COMMITORDER  CUSTOMERDASHBOARDVIEW
CUSTOMERSBYOSBALANCE  CUSTOMERSEARCH  CUSTOMERSTHISWEEKBYLEADSOURCE  CUSTOMERSTORENEWTHISMONTH
CUSTOMSEARCH61  DEFAULTSCRIPTNOTESPORTLETVIEW  DEPOSITSUMMARY  ESCALATEDCASES  FAILEDRECORDS
GLAUDITNUMBERINGHISTORY  GLIPGLIMPACT  GLIPGLMULTI  GLIPTRANSACTION  GOOGLEBASE
HIGHPRIORITYCASES  INFORMATIONITEMSVIEW  INVENTORYADJUSTMENTS  INVENTORYSTATUS
ISSUEDASHBOARDVIEW  LEADSTHISWEEKBYLEADSOURCE  MOBILEEXPENSEREPORTAWAITINGMYAPPROVAL
MOBILEEXPENSEREPORTNOTSUBMITTED  MOBILEEXPENSEREPORTOUTSTANDING  MOBILEEXPENSEREPORTREJECTED
MOBILETIMEENTRIES  MOBILETIMEENTRIES2  MYACTIVECUSTOMERS  MYACTIVELEADS  MYACTIVEPROSPECTS
MYCALLSTOCOMPLETE  MYNEWLEADSTHISWEEK  MYNEWPROSPECTSTHISWEEK  MYOPENORRECENTLYCLOSEDOPPORTUNITIES
MYOPPORTUNITIESTOCLOSE  MYTEAMSACTIVECUSTOMERS  MYTEAMSACTIVELEADS  MYTEAMSACTIVEPROSPECTS
MYUNCOMPLETEDTASKS  NEWCASESTODAY  NEWHIRESTHISMONTHBYHIREDATE  NEWHIRESTHISMONTHBYNAME  NEXTAG
OPENAPBALANCES  OPENARBALANCES  OPENESTIMATESANDORDERS  OPENSALESORDERS  OPPORTUNITYDASHBOARDVIEW
PARALLELBOOKSTRANSACTIONIMPACT  PHONECALLDASHBOARDVIEW  PRICEBOOKLIST  PRICELISTHISTORYBASESEARCH
PRICELISTHISTORYNOQUANTITYORPRICETYPE  PROSPECTSTHISWEEKBYLEADSOURCE  PURCHASEORDERRECEIPTPASTDUE
PURCHASEORDERSTORECEIVE  RECENTORUPCOMING  RESOURCEALLOCATIONSFORAPPROVAL
REVENUEARRANGEMENTSPENDINGAPPROVAL  REVENUERECOGNITIONERRORS  SALESORDERSHIPMENTPASTDUE
SALESORDERSTOFULFILL  SHOPPINGCOM  SHOPZILLA  STANDARDTASKPORTLETSEARCHDUEDATE
STANDARDTASKPORTLETSEARCHORDER  STATISTICALJOURNALIMPACTHISTORY  TASKDASHBOARDVIEW  TASKSTOREPLACE
THIRDPARTYCONVERSIONTRACKINGURL  TIMEBILLINGRULEFILTER  TIMEENTRIES  TIMEENTRYCHARGERULEFILTER
TODAYSSALESORDERS  TOPOPENESTIMATESTHISMONTH  TOPSALESREPTHISMONTH  TRANSACTIONIMPACT
TRANSACTIONIMPACTHISTORY  TRANSFERORDERRECEIPTPASTDUE  TRANSFERORDERSHIPMENTPASTDUE  USAGECHARGES
VENDORDASHBOARDVIEW  VENDORSBYOSBALANCE  WORKORDERBUILDPASTDUE  YAHOOSHOPPING
revenue_arrangements_on_project
```

### 5.10 `portlet_list_type` (values for `list/type`) - `SDFxml_3512630685.html`

```
ACCOUNTINGBOOK  ACCOUNTINGCONTEXT  ACCOUNTINGTRANSACTION  ACTIVITY  ALLOC  ALLOCATEORDERSCHEDULE
AMORTIZATIONSCHEDULE  AMORTIZATIONTEMPLATE  ASCHARGEDPROJECTREVENUERULE  BALANCETRXBYSEGMENTS
BANKIMPORTHISTORY  BILLINGACCOUNT  BILLINGACCOUNTBILLCYCLE  BILLINGACCOUNTBILLREQUEST
BILLINGRATECARD  BILLINGREVENUEEVENT  BILLOFDISTRIBUTION  BILLRUN  BILLRUNSCHEDULE  BINNUMBER
BOM  BUDGET  BUDGETEXCHANGERATE  BULKPROCERRORS  BUSINESSEVENTHISTORY
BUSINESSEVENTPROCESSINGDETAILS  CALENDAR  CALL  CAMPAIGN  CARDHOLDERAUTHENTICATIONEVENT  CASE
CCTRAN  CHARGE  CHARGERULE  CHARGERUN  CLASS  CLASSSEGMENTMAPPING  CMSCONTENT  CMSPAGE
CMSPAGETYPE  COMMERCECATALOG  COMMITORDERSCHEDULE  COMPETITOR  COMSEARCHBOOST
COMSEARCHBOOSTTYPE  COMSEARCHGROUPSYN  COMSEARCHONEWAYSYN  CONSOLEXCHANGERATE  CONTACT
CURRENCYRATETYPE  CUSTOMER  DEPARTMENT  DEPTSEGMENTMAPPING  DISTRIBUTIONNETWORK  DOCUMENT
DRIVERSLICENSE  EMPLOYEE  EMPLOYEECHANGE  EMPLOYEECHANGEREASON  EMPLOYEECHANGEREQUEST
EMPLOYEECHANGETYPE  EMPLOYEESTATUS  EMPLOYEETYPE  ENTITYACCOUNTMAPPING  ENTITYMSESUBSIDIARY
EXPENSEAMORTIZATIONEVENT  EXPENSEAMORTIZATIONRULE  EXPENSEPLAN  EXPENSEREPORTPOLICY
FAIRVALUEFORMULA  FAIRVALUEPRICE  FINANCIALINSTITUTION  FIXEDAMOUNTPROJECTREVENUERULE  FORECAST
FULFILLMENTEXCEPTIONREASON  GATEWAYNOTIFICATION  GENERICRESOURCE  GIFTCERTIFICATE
GLOBALACCOUNTMAPPING  GOAL  GOVERNMENTISSUEDIDTYPE  HCMJOB  INBOUNDSHIPMENT  INFOITEM
INVCOSTTEMPLATE  INVENTORYSTATUS  ISSUE  ITEM  ITEMACCOUNTMAPPING  ITEMCOLLECTION  ITEMDEMANDPLAN
ITEMPROCESSFAMILY  ITEMPROCESSGROUP  ITEMREVENUECATEGORY  ITEMSUPPLYPLAN  JOB  JOBREQUISITION
KUDOS  LABORBASEDPROJECTREVENUERULE  LATEORDERALLOCATION  LOCASSIGNCONF  LOCATION
LOCATIONCOSTINGGROUP  LOCSEGMENTMAPPING  MEMDOC  MEMDOCRESULTS  MERCHANDISEHIERARCHYLEVEL
MERCHANDISEHIERARCHYNODE  MERCHANDISEHIERARCHYVERSION  MFGCOSTTEMPLATE  MFGOPERATIONTASK
MFGROUTING  MSESUBSIDIARY  NEWSITEM  NEXUS  NOTIFICATION  OAUTHTOKEN  ONLINECASEFORM
ONLINELEADFORM  OPPRTNTY  ORDERALLOCATIONSTRATEGY  ORGANIZATIONVALUE  ORIGINATINGLEAD
OTHERGOVERNMENTISSUEDID  OUTBOUNDEMAILLOG  OUTBOUNDREQUEST  PARTNER  PASSPORT  PAYMENTEVENT
PAYMENTPROCESSINGPROFILE  PAYROLLBATCH  PAYROLLBATCH2  PCTCOMPLETEPROJECTREVENUERULE
PERFORMANCEMETRIC  PERFORMANCEREVIEW  PERFORMANCEREVIEWQUESTION  PERFORMANCEREVIEWRATINGSCALE
PERFORMANCEREVIEWSCHEDULE  PERFORMANCEREVIEWTEMPLATE  PICKSTRATEGY  PICKTASK
PLANDEFINITIONSCHEDULE  PLANNEDREVENUE  PLANNEDSTANDARDCOST  POSITION  PROJECTEXPENSETYPE
PROJECTREVENUERULE  PROJECTREVENUERULELIST  PROJECTTASK  PROJECTTASKANDCRMTASK  PROJECTTEMPLATE
PROMOTION  QUOTA  REGION  REPORT  REPORTRESULTS  REPORTSCHEDULE  REPOSITORYREFRESHSCHEDULE
RESALLOCATIONTIMEOFFCONFLICT  RESOURCEGROUP  RESTRICTION  REVENUEELEMENT  REVENUEPLAN  REVREC
REVRECOGNITIONSCHED  REVRECRULE  REVRECSCHEDULE  REVRECTEMPLATE  RSRCALLOCATION  SALESCAMPAIGN
SALESTERRITORY  SCRIPTNOTE  SCSnapshotRefreshSchedule  SOLUTION  STANDARDCOSTVERSION
SUBSCRIPTION  SUBSCRIPTIONCHANGEORDER  SUBSCRIPTIONLINE  SUBSCRIPTIONLINEREVISION  SUBSIDIARY
SUPPLYCHAINSNAPSHOT  SUPPORTTERRITORY  SYSTEMMEASURE  TASK  TAXTYPE  TERMINATIONREASON  TIME
TIMEAPPROVAL  TIMEOFFCHANGE  TIMEOFFPLAN  TIMEOFFREQUEST  TIMEOFFTYPE  TIMESHEET  TRANSACTION
UNDELIVEREDEMAIL  UNLOCKEDTIMEPERIOD  USAGE  USEROAUTHTOKEN  VENDOR  WAVE  WORKASSIGNMENT
WORKPLACE  ZONE
```

(Note the mixed-case value `SCSnapshotRefreshSchedule` - reproduce exactly.)

### 5.11 `snapshot_type_period_range_not_comparable` - `SDFxml_4060707650.html`

`UTILIZATION` (ADVANCEDJOBS)

### 5.12 `snapshot_type_period_range_comparable` - `SDFxml_3293710780.html`

(feature dependency in parentheses)

```
BANKBAL (ACCOUNTING)            COGS (INVENTORY)               CREDITCARDBAL (ACCOUNTING)
DEFERREDREVENUE (ACCOUNTING)    EQUITY (ACCOUNTING)            EXPENSES (ACCOUNTING)
FIXEDASSET (ACCOUNTING)         INCOME (ACCOUNTING)            INTTURNOVRPERPERIOD (SUPPLYCHAINCONTROLTOWER)
INVENTORY (INVENTORY)           LONGTERMLIAB (ACCOUNTING)      NETCASHFLOW (ACCOUNTING)
NEWBUSINESS                     NEWCUSTOMERS                   ONTIMERECEIPTS (SUPPLYCHAINCONTROLTOWER)
ONTIMESHIPMENTS (SUPPLYCHAINCONTROLTOWER)                      OPERATINGEXPENSES (ACCOUNTING)
OPERCASHFLOW (ACCOUNTING)       OTHERASSET (ACCOUNTING)        OTHERCURRENTASSET (ACCOUNTING)
OTHERCURRENTLIAB (ACCOUNTING)   PAYABLES (PAYABLES)            PAYROLL (PAYROLL)
PROFIT (ACCOUNTING)             RECEIVABLES (RECEIVABLES)      REVENUE (ACCOUNTING)
SALES (ACCOUNTING)              SALESCASHBASIS (ACCOUNTING)
```

### 5.13 `snapshot_type_date_range_not_comparable` - `SDFxml_2976316878.html`

`COMMISSIONS` (COMMISSIONS), `COMMISSIONSPARTNER` (PARTNERCOMMISSIONS)

### 5.14 `snapshot_type_date_range_comparable` - `SDFxml_2365274350.html`

```
ACCTUPTIME                      AGGREGATEDBOOKINGS             AVERAGEINVENTORY (SUPPLYCHAINCONTROLTOWER)
BOOKINGS                        BOOKINGSALT (ALTSALESAMOUNT)   CARTABANDON
CHECKOUTABANDON                 CLOSEDCASES (SUPPORT)          CLOSEDISSUES (ISSUEDB)
CURRENTLOGGEDINUSERS            CUSTOMERSWON                   ECOMMISSIONS (COMMISSIONS)
ECOMMISSIONSPARTNER (PARTNERCOMMISSIONS)                       EMPLOYEES
ESCALATEDCASES (SUPPORT)        ESTIMATES (ESTIMATES)          ESTIMATESRANGE (ESTIMATES)
ETECASEEOVERFIVE  ETECASEEOVERTWO  ETECASEVOVERFIVE  ETECASEVOVERTWO
ETECUSTEOVERFIVE  ETECUSTEOVERTWO  ETECUSTVOVERFIVE  ETECUSTVOVERTWO
ETESOEOVERFIVE    ETESOEOVERTWO    ETESOVOVERFIVE    ETESOVOVERTWO
FILLRATE (SALESCHANNELALLOCATION)                              FORECAST (SFA)
FORECASTASA (ALTSALESAMOUNT)    FORECASTOVERRIDE (SFA)         FORECASTOVERRIDEASA (ALTSALESAMOUNT)
HOSTEDSITETRAFFIC (WEBHOSTING)  NEWBUSINESSORD                 NEWBUSINESSORDALT (ALTSALESAMOUNT)
NEWCASES (SUPPORT)              NEWCUSTOMERSORD                NEWISSUES (ISSUEDB)
NEWLEADS (SFA)                  NEWLEADSGROSS (SFA)            NEWOPPORTUNITIES (OPPORTUNITIES)
NEWVISITORS (ADVWEBREPORTS)     OPENCASES (SUPPORT)            OPENISSUES (ISSUEDB)
OPPORTUNITIES (OPPORTUNITIES)   OPPORTUNITIESLOST (OPPORTUNITIES)
OPPORTUNITIESRANGE (OPPORTUNITIES)                             OPPORTUNITIESWON (OPPORTUNITIES)
ORDERS                          PAGETIMESOVERFIVE              PAGETIMESOVERTWO
PCOMMISSIONS (COMMISSIONS)      PCOMMISSIONSPARTNER (PARTNERCOMMISSIONS)
PIPELINE (SFA)                  PIPELINEASA (ALTSALESAMOUNT)   PIPELINEDEALS (SFA)
PIPELINEWEIGHTED (SFA)          PIPELINEWEIGHTEDASA (ALTSALESAMOUNT)
PROSPECTS (SFA)                 QUOTA (SFA)                    QUOTAASA (ALTSALESAMOUNT)
QUOTAREPS (SFA)                 RPAGETIMESOVERFIVE             RPAGETIMESOVERTWO
SITETRAFFIC (WEBSITE)           SPAGETIMESOVERFIVE             SPAGETIMESOVERTWO
TOTALBOOKINGS (SALESORDERS)     TOTALORDERS (SALESORDERS)      TOTALPIPEDEALS (SFA)
TOTALPIPELINE (SFA)             TOTALPIPELINEASA (ALTSALESAMOUNT)
TOTALPIPEWEIGHTED (SFA)         TOTALPIPEWEIGHTEDASA (ALTSALESAMOUNT)
VISITORTRAFFIC (ADVWEBREPORTS)  WEBORDERS (WEBSITE)            WEBREVENUE (WEBSITE)
```

### 5.15 `snapshot_type_custom` - `SDFxml_851294353.html`

`CUSTOM`, `CUSTOM2`, `CUSTOM3`, `CUSTOM4`, `CUSTOM5`, `CUSTOM6`, `CUSTOM7`, `CUSTOM8`,
`CUSTOM9`, `CUSTOM10`. Each custom slot requires a companion `savedsearch` (KPI portlet) /
`savedsearch`, `savedsearch2`, `savedsearch3` (trend graph) reference.

Related lists that appear in the lists index but are not referenced by any dashboard field:
`kpi_snapshots_custom` (same values as above), `kpi_snapshots_formula` (`FORMULACURRENCY`,
`FORMULANUMERIC`, `FORMULAPERCENT`), `kpi_snapshots_internal` (32 values, subset of 5.14 plus
`NEWBUSINESS`, `NEWCUSTOMERS`, `VENDORBALANCE`), `kpi_snapshots_daterange` (85 values; 5.14 plus
`PURCHASES`, `VENDOROPENPO`), `kpi_snapshots_daterange_or_period` (5.12 plus `UTILIZATION`,
`VENDORBALANCE`), `kpi_ranges_daterange` (subset of `report_date_range`),
`kpi_ranges_daterange_or_period` (`FISCAL_YEAR_BEFORE_LAST`, `LAST_FISCAL_YEAR`,
`THIS_FISCAL_YEAR`), `kpi_ranges_period` (27 values, subset of `report_period_range` without
`FISCAL_YEAR_BEFORE_LAST`, `LAST_FISCAL_YEAR`, `THIS_FISCAL_YEAR`), `kpi_ranges_daterange_report`
(a large list of month/week/quarter labels such as `10_MONTHS_AGO`, `APRIL_LAST_YEAR`,
`WEEK_1_THIS_MONTH__DAYS_1_TO_7`; used by the `kpiscorecard` object).

### 5.16 `snapshot_type_trendgraph` (values for `trendgraph/kpi`, `kpi2`, `kpi3`) - `SDFxml_1780664970.html`

Superset of 5.12 + 5.14 plus the project/receivables KPIs below.

```
ACCTUPTIME  AGGREGATEDBOOKINGS  AVERAGEINVENTORY (SUPPLYCHAINCONTROLTOWER)  BANKBAL (ACCOUNTING)
BOOKINGS  BOOKINGSALT (ALTSALESAMOUNT)  CARTABANDON  CHECKOUTABANDON  CLOSEDCASES (SUPPORT)
CLOSEDISSUES (ISSUEDB)  COGS (INVENTORY)  CREDITCARDBAL (ACCOUNTING)  CURRENTLOGGEDINUSERS
CUSTCONSOLAVGDL (CONSOLPAYMENTS)  CUSTCONSOLUNBLEDORDS (CONSOLPAYMENTS)
CUSTOMERAVGDAYSLATE (RECEIVABLES)  CUSTOMERAVGDAYSTOPAY (RECEIVABLES)  CUSTOMERRECEIVABLES (RECEIVABLES)
CUSTOMERSWON  CUSTUNBILLEDORDERS  DEFERREDREVENUE (ACCOUNTING)  ECOMMISSIONS (COMMISSIONS)
ECOMMISSIONSPARTNER (PARTNERCOMMISSIONS)  EMPLOYEES  EQUITY (ACCOUNTING)  ESCALATEDCASES (SUPPORT)
ESTIMATES (ESTIMATES)  ESTIMATESRANGE (ESTIMATES)
ETECASEEOVERFIVE  ETECASEEOVERTWO  ETECASEVOVERFIVE  ETECASEVOVERTWO
ETECUSTEOVERFIVE  ETECUSTEOVERTWO  ETECUSTVOVERFIVE  ETECUSTVOVERTWO
ETESOEOVERFIVE  ETESOEOVERTWO  ETESOVOVERFIVE  ETESOVOVERTWO
EXPENSES (ACCOUNTING)  FILLRATE (SALESCHANNELALLOCATION)  FIXEDASSET (ACCOUNTING)  FORECAST (SFA)
FORECASTASA (ALTSALESAMOUNT)  FORECASTOVERRIDE (SFA)  FORECASTOVERRIDEASA (ALTSALESAMOUNT)
HOSTEDSITETRAFFIC (WEBHOSTING)  INCOME (ACCOUNTING)  INTTURNOVRPERPERIOD (SUPPLYCHAINCONTROLTOWER)
INVENTORY (INVENTORY)  JOBAMOUNTRECOGNIZED (ADVANCEDJOBS)  JOBFORECASTCHARGES (CHARGEBASEDBILLING)
JOBINCURREDCOSTS (ADVANCEDJOBS)  LONGTERMLIAB (ACCOUNTING)  NETCASHFLOW (ACCOUNTING)  NEWBUSINESS
NEWBUSINESSORD  NEWBUSINESSORDALT (ALTSALESAMOUNT)  NEWCASES (SUPPORT)  NEWCUSTOMERS  NEWCUSTOMERSORD
NEWISSUES (ISSUEDB)  NEWLEADS (SFA)  NEWLEADSGROSS (SFA)  NEWOPPORTUNITIES (OPPORTUNITIES)
NEWVISITORS (ADVWEBREPORTS)  ONTIMERECEIPTS (SUPPLYCHAINCONTROLTOWER)  ONTIMESHIPMENTS (SUPPLYCHAINCONTROLTOWER)
OPENCASES (SUPPORT)  OPENISSUES (ISSUEDB)  OPERATINGEXPENSES (ACCOUNTING)  OPERCASHFLOW (ACCOUNTING)
OPPORTUNITIES (OPPORTUNITIES)  OPPORTUNITIESLOST (OPPORTUNITIES)  OPPORTUNITIESRANGE (OPPORTUNITIES)
OPPORTUNITIESWON (OPPORTUNITIES)  ORDERS  OTHERASSET (ACCOUNTING)  OTHERCURRENTASSET (ACCOUNTING)
OTHERCURRENTLIAB (ACCOUNTING)  PAGETIMESOVERFIVE  PAGETIMESOVERTWO  PAYABLES (PAYABLES)  PAYROLL (PAYROLL)
PCOMMISSIONS (COMMISSIONS)  PCOMMISSIONSPARTNER (PARTNERCOMMISSIONS)  PIPELINE (SFA)
PIPELINEASA (ALTSALESAMOUNT)  PIPELINEDEALS (SFA)  PIPELINEWEIGHTED (SFA)  PIPELINEWEIGHTEDASA (ALTSALESAMOUNT)
PROFIT (ACCOUNTING)  PROJECTHOURSWORKED (ADVANCEDJOBS)  PROJECTINVOICED (ADVANCEDJOBS)
PROJECTPROFITABILITY (ADVANCEDPROJECTACCOUNTING)  PROSPECTS (SFA)  PURCHASES (ACCOUNTING)  QUOTA (SFA)
QUOTAASA (ALTSALESAMOUNT)  QUOTAREPS (SFA)  RECEIVABLES (RECEIVABLES)  REVENUE (ACCOUNTING)
RPAGETIMESOVERFIVE  RPAGETIMESOVERTWO  SALES (ACCOUNTING)  SALESCASHBASIS (ACCOUNTING)  SITETRAFFIC (WEBSITE)
SPAGETIMESOVERFIVE  SPAGETIMESOVERTWO  TOTALBOOKINGS (SALESORDERS)  TOTALORDERS (SALESORDERS)
TOTALPIPEDEALS (SFA)  TOTALPIPELINE (SFA)  TOTALPIPELINEASA (ALTSALESAMOUNT)  TOTALPIPEWEIGHTED (SFA)
TOTALPIPEWEIGHTEDASA (ALTSALESAMOUNT)  VENDORBALANCE  VENDOROPENPO (PURCHASEORDERS)
VISITORTRAFFIC (ADVWEBREPORTS)  WEBORDERS (WEBSITE)  WEBREVENUE (WEBSITE)
```

### 5.17 `report_date_range` (values for `kpi/daterange`, `kpi/comparedaterange`) - `SDFxml_2714204436.html`

```
FISCAL_HALF_BEFORE_LAST
FISCAL_HALF_BEFORE_LAST_TO_DATE
FISCAL_QUARTER_BEFORE_LAST
FISCAL_QUARTER_BEFORE_LAST_TO_DATE
FISCAL_YEAR_BEFORE_LAST
FISCAL_YEAR_BEFORE_LAST_TO_DATE
FIVE_DAYS_AGO
FIVE_DAYS_FROM_NOW
FOUR_DAYS_AGO
FOUR_DAYS_FROM_NOW
FOUR_WEEKS_STARTING_THIS_WEEK
LAST_BUSINESS_WEEK
LAST_FISCAL_HALF
LAST_FISCAL_HALF_ONE_FISCAL_YEAR_AGO
LAST_FISCAL_HALF_TO_DATE
LAST_FISCAL_QUARTER
LAST_FISCAL_QUARTER_ONE_FISCAL_YEAR_AGO
LAST_FISCAL_QUARTER_TO_DATE
LAST_FISCAL_QUARTER_TWO_FISCAL_YEARS_AGO
LAST_FISCAL_YEAR
LAST_FISCAL_YEAR_TO_DATE
LAST_MONTH
LAST_MONTH_ONE_FISCAL_QUARTER_AGO
LAST_MONTH_ONE_FISCAL_YEAR_AGO
LAST_MONTH_TO_DATE
LAST_MONTH_TWO_FISCAL_QUARTERS_AGO
LAST_MONTH_TWO_FISCAL_YEARS_AGO
LAST_ROLLING_HALF
LAST_ROLLING_QUARTER
LAST_ROLLING_YEAR
LAST_WEEK
LAST_WEEK_TO_DATE
LAST_YEAR
LAST_YEAR_TO_DATE
MONTH_AFTER_NEXT
MONTH_AFTER_NEXT_TO_DATE
MONTH_BEFORE_LAST
MONTH_BEFORE_LAST_TO_DATE
NEXT_BUSINESS_WEEK
NEXT_FISCAL_HALF
NEXT_FISCAL_QUARTER
NEXT_FISCAL_YEAR
NEXT_FOUR_WEEKS
NEXT_MONTH
NEXT_ONE_HALF
NEXT_ONE_MONTH
NEXT_ONE_QUARTER
NEXT_ONE_WEEK__7_ROLLING_DAYS
NEXT_ONE_YEAR
NEXT_WEEK
NINETY_DAYS_AGO
NINETY_DAYS_FROM_NOW
ONE_YEAR_BEFORE_LAST
PREVIOUS_FISCAL_QUARTERS_LAST_FISCAL_YEAR
PREVIOUS_FISCAL_QUARTERS_THIS_FISCAL_YEAR
PREVIOUS_MONTHS_LAST_FISCAL_HALF
PREVIOUS_MONTHS_LAST_FISCAL_QUARTER
PREVIOUS_MONTHS_LAST_FISCAL_YEAR
PREVIOUS_MONTHS_SAME_FISCAL_HALF_LAST_FISCAL_YEAR
PREVIOUS_MONTHS_SAME_FISCAL_QUARTER_LAST_FISCAL_YEAR
PREVIOUS_MONTHS_THIS_FISCAL_HALF
PREVIOUS_MONTHS_THIS_FISCAL_QUARTER
PREVIOUS_MONTHS_THIS_FISCAL_YEAR
PREVIOUS_ONE_DAY
PREVIOUS_ONE_HALF
PREVIOUS_ONE_MONTH
PREVIOUS_ONE_QUARTER
PREVIOUS_ONE_WEEK
PREVIOUS_ONE_YEAR
PREVIOUS_ROLLING_HALF
PREVIOUS_ROLLING_QUARTER
PREVIOUS_ROLLING_YEAR
SAME_DAY_FISCAL_QUARTER_BEFORE_LAST
SAME_DAY_FISCAL_YEAR_BEFORE_LAST
SAME_DAY_LAST_FISCAL_QUARTER
SAME_DAY_LAST_FISCAL_YEAR
SAME_DAY_LAST_MONTH
SAME_DAY_LAST_WEEK
SAME_DAY_MONTH_BEFORE_LAST
SAME_DAY_WEEK_BEFORE_LAST
SAME_FISCAL_HALF_LAST_FISCAL_YEAR
SAME_FISCAL_HALF_LAST_FISCAL_YEAR_TO_DATE
SAME_FISCAL_QUARTER_FISCAL_YEAR_BEFORE_LAST
SAME_FISCAL_QUARTER_LAST_FISCAL_YEAR
SAME_FISCAL_QUARTER_LAST_FISCAL_YEAR_TO_DATE
SAME_MONTH_FISCAL_QUARTER_BEFORE_LAST
SAME_MONTH_FISCAL_YEAR_BEFORE_LAST
SAME_MONTH_LAST_FISCAL_QUARTER
SAME_MONTH_LAST_FISCAL_QUARTER_TO_DATE
SAME_MONTH_LAST_FISCAL_YEAR
SAME_MONTH_LAST_FISCAL_YEAR_TO_DATE
SAME_WEEK_FISCAL_YEAR_BEFORE_LAST
SAME_WEEK_LAST_FISCAL_YEAR
SIXTY_DAYS_AGO
SIXTY_DAYS_FROM_NOW
START_OF_FISCAL_HALF_BEFORE_LAST
START_OF_FISCAL_QUARTER_BEFORE_LAST
START_OF_FISCAL_YEAR_BEFORE_LAST
START_OF_LAST_BUSINESS_WEEK
START_OF_LAST_FISCAL_HALF
START_OF_LAST_FISCAL_HALF_ONE_FISCAL_YEAR_AGO
START_OF_LAST_FISCAL_QUARTER
START_OF_LAST_FISCAL_QUARTER_ONE_FISCAL_YEAR_AGO
START_OF_LAST_FISCAL_YEAR
START_OF_LAST_MONTH
START_OF_LAST_MONTH_ONE_FISCAL_QUARTER_AGO
START_OF_LAST_MONTH_ONE_FISCAL_YEAR_AGO
START_OF_LAST_ROLLING_HALF
START_OF_LAST_ROLLING_QUARTER
START_OF_LAST_ROLLING_YEAR
START_OF_LAST_WEEK
START_OF_MONTH_BEFORE_LAST
START_OF_NEXT_BUSINESS_WEEK
START_OF_NEXT_FISCAL_HALF
START_OF_NEXT_FISCAL_QUARTER
START_OF_NEXT_FISCAL_YEAR
START_OF_NEXT_MONTH
START_OF_NEXT_WEEK
START_OF_PREVIOUS_ROLLING_HALF
START_OF_PREVIOUS_ROLLING_QUARTER
START_OF_PREVIOUS_ROLLING_YEAR
START_OF_SAME_FISCAL_HALF_LAST_FISCAL_YEAR
START_OF_SAME_FISCAL_QUARTER_LAST_FISCAL_YEAR
START_OF_SAME_MONTH_LAST_FISCAL_QUARTER
START_OF_SAME_MONTH_LAST_FISCAL_YEAR
START_OF_THIS_BUSINESS_WEEK
START_OF_THIS_FISCAL_HALF
START_OF_THIS_FISCAL_QUARTER
START_OF_THIS_FISCAL_YEAR
START_OF_THIS_MONTH
START_OF_THIS_WEEK
START_OF_THIS_YEAR
START_OF_WEEK_BEFORE_LAST
TEN_DAYS_AGO
TEN_DAYS_FROM_NOW
THIRTY_DAYS_AGO
THIRTY_DAYS_FROM_NOW
THIS_BUSINESS_WEEK
THIS_FISCAL_HALF
THIS_FISCAL_HALF_TO_DATE
THIS_FISCAL_QUARTER
THIS_FISCAL_QUARTER_TO_DATE
THIS_FISCAL_YEAR
THIS_FISCAL_YEAR_TO_DATE
THIS_MONTH
THIS_MONTH_TO_DATE
THIS_ROLLING_HALF
THIS_ROLLING_QUARTER
THIS_ROLLING_YEAR
THIS_WEEK
THIS_WEEK_TO_DATE
THIS_YEAR
THIS_YEAR_TO_DATE
THREE_DAYS_AGO
THREE_DAYS_FROM_NOW
THREE_FISCAL_QUARTERS_AGO
THREE_FISCAL_QUARTERS_AGO_TO_DATE
THREE_FISCAL_YEARS_AGO
THREE_FISCAL_YEARS_AGO_TO_DATE
THREE_MONTHS_AGO
THREE_MONTHS_AGO_TO_DATE
TODAY
TODAY_TO_END_OF_THIS_MONTH
TOMORROW
TWO_DAYS_AGO
TWO_DAYS_FROM_NOW
WEEK_AFTER_NEXT
WEEK_AFTER_NEXT_TO_DATE
WEEK_BEFORE_LAST
WEEK_BEFORE_LAST_TO_DATE
YESTERDAY
```

### 5.18 `report_period_range` (values for `kpi/periodrange`, `kpi/compareperiodrange`) - `SDFxml_918205946.html`

```
FIRST_FISCAL_QUARTER_LAST_FY
FIRST_FISCAL_QUARTER_THIS_FY
FISCAL_QUARTER_BEFORE_LAST
FISCAL_YEAR_BEFORE_LAST
FOURTH_FISCAL_QUARTER_LAST_FY
FOURTH_FISCAL_QUARTER_THIS_FY
LAST_FISCAL_QUARTER
LAST_FISCAL_QUARTER_ONE_FISCAL_YEAR_AGO
LAST_FISCAL_QUARTER_TO_PERIOD
LAST_FISCAL_YEAR
LAST_FISCAL_YEAR_TO_PERIOD
LAST_PERIOD
LAST_PERIOD_ONE_FISCAL_QUARTER_AGO
LAST_PERIOD_ONE_FISCAL_YEAR_AGO
LAST_ROLLING_18_PERIODS
LAST_ROLLING_6_FISCAL_QUARTERS
PERIOD_BEFORE_LAST
SAME_FISCAL_QUARTER_LAST_FY
SAME_FISCAL_QUARTER_LAST_FY_TO_PERIOD
SAME_PERIOD_LAST_FISCAL_QUARTER
SAME_PERIOD_LAST_FY
SECOND_FISCAL_QUARTER_LAST_FY
SECOND_FISCAL_QUARTER_THIS_FY
THIRD_FISCAL_QUARTER_LAST_FY
THIRD_FISCAL_QUARTER_THIS_FY
THIS_FISCAL_QUARTER
THIS_FISCAL_QUARTER_TO_PERIOD
THIS_FISCAL_YEAR
THIS_FISCAL_YEAR_TO_PERIOD
THIS_PERIOD
```

### 5.19 Date-range nuance between lists

`portlet_reportsnapshot_daterange` (5.23) is `report_date_range` **without** the `START_OF_*`
entries and with `NEXT_ONE_WEEK_7_ROLLING_DAYS_` spelled with a trailing underscore (vs
`NEXT_ONE_WEEK__7_ROLLING_DAYS` with a double underscore in `report_date_range` and
`kpi_ranges_daterange`). `kpi_ranges_daterange` also omits `FISCAL_YEAR_BEFORE_LAST`,
`LAST_FISCAL_YEAR`, `THIS_FISCAL_YEAR` (they live in `kpi_ranges_daterange_or_period`). Reproduce
these spellings exactly per list.

### 5.20 `portlet_quicksearch_generic` (values for `quicksearch/defaultgeneraltype`) - `SDFxml_4096699072.html`

```
ACTIVITY  CAMPAIGN (MARKETING)  CASE_NUMBER (SUPPORT)  CONTACT  CUSTOMER  DOCUMENT  DOCUMENT_NUMBER
EMAIL  EMPLOYEE  EVENT  ISSUE_NUMBER (ISSUEDB)  ITEM  JOB  NAME (PROMOCODES)  NAME_ID  PARTNER (PRM)
PHONE  PHONE_CALL  PO_CHECK_NUMBER  PRODUCT_PAGE  PROJECT_TASK  SOLUTION (KNOWLEDGEBASE)  TASK
TRACKING_NUMBER  TRANSACTION_NUMBER  VENDOR (ACCOUNTING)  ZIP_POSTAL_CODE
```

Plus custom record types via `[scriptid=customrecord_*]`.

### 5.21 `portlet_quicksearch_transaction` (values for `quicksearch/defaulttransactiontype`) - `SDFxml_3818146003.html`

```
ASSEMBLY_BUILD  ASSEMBLY_UNBUILD  BALANCING_JOURNAL  BILL  BILL_CREDIT  BILL_PAYMENT
BIN_PUTAWAY_WORKSHEET  BIN_TRANSFER  BLANKET_PURCHASE_ORDER  CASH_REFUND  CASH_SALE  CCARD_REFUND
CHECK  COMMISSION  CREDIT_CARD  CREDIT_MEMO  CROSS_CHARGE_JOURNAL  CURRENCY_REVALUATION  CUSTOM
CUSTOMER_DEPOSIT  CUSTOMER_PAYMENT_AUTHORIZATION  CUSTOMER_REFUND  DEPOSIT  DEPOSIT_APPLICATION
DEPRECATED_CUSTOM_TRANSACTION  ESTIMATE  EXPENSE_REPORT  FINANCE_CHARGE  FULFILLMENT_REQUEST
GL_IMPACT_ADJUSTMENT  INBOUND_SHIPMENT  INVENTORY_ADJUSTMENT  INVENTORY_COST_REVALUATION
INVENTORY_COUNT  INVENTORY_DISTRIBUTION  INVENTORY_STATUS_CHANGE  INVENTORY_TRANSFER
INVENTORY_WORKSHEET  INVOICE  INVOICE_GROUP  ITEM_FULFILLMENT  ITEM_RECEIPT  JOURNAL
LIABILITY_ADJUSTMENT  NETTING_SETTLEMENT  OPPORTUNITY  ORDER_RESERVATION  OWNERSHIP_TRANSFER
PAYCHECK  PAYCHECK_JOURNAL  PAYMENT  PAYROLL_ADJUSTMENT  PAYROLL_LIABILITY_CHECK  PERIOD_END_JOURNAL
PURCHASE-TYPE_CUSTOM_TRANSACTION  PURCHASE_CONTRACT  PURCHASE_ORDER  REQUEST_FOR_QUOTE  REQUISITION
RETURN_AUTHORIZATION  REVENUE_ARRANGEMENT  REVENUE_COMMITMENT  REVENUE_COMMITMENT_REVERSAL
REVENUE_CONTRACT  SALES-TYPE_CUSTOM_TRANSACTION  SALES_ORDER  SALES_TAX_PAYMENT  STATEMENT_CHARGE
STORE_PICKUP_FULFILLMENT  SYSTEM_JOURNAL  TAX_LIABILITY_CHEQUE  TAX_LIABILITY_PAYMENT
TEGATA_PAYABLE  TEGATA_RECEIVABLE  TRANSFER  TRANSFER_ORDER  VENDOR_PREPAYMENT
VENDOR_PREPAYMENT_APPLICATION  VENDOR_REQUEST_FOR_QUOTE  VENDOR_RETURN_AUTHORIZATION  WAVE
WORK_ORDER  WORK_ORDER_CLOSE  WORK_ORDER_COMPLETION  WORK_ORDER_ISSUE
```

(Note the hyphens in `PURCHASE-TYPE_CUSTOM_TRANSACTION` and `SALES-TYPE_CUSTOM_TRANSACTION`.)

### 5.22 `portlet_reportsnapshot_snapshot` (values for `enhsnapshots/snapshot`) - `SDFxml_2983585301.html`

```
AR_AGING_SUM  CAMPAIGN_ACTIVITY  CAMPAIGN_ANALYSIS  CLOSE_CASE_SUM  COMPARATIVE_SALES
COMPARATIVE_SALES_ORD  COMPARATIVE_SALES_ORD_ASA  CUSTJOB_ACTIVITY_SUMMARY  CUSTOMER_BY_LEADSOURCE_SUM
CUSTOMER_BY_PARTNER_SUM  EARNED_VALUE  ESCALATED_CASE  FORECAST  FORECASTFORASA  FORECAST_BY_CUST
FORECAST_BY_ITEM_SUMMARY  FORECAST_OUT_BY_CUST  FORECAST_STATUS  INVENTORY_REV_SUMMARY
ITEM_PURCHASE_DOLLARS  ITEM_PURCHASE_QUANTITY  ITEM_SALES_DOLLARS  ITEM_SALES_ORD  ITEM_SALES_ORD_AGG
ITEM_SALES_QUANTITY  OPEN_CASE_SUM  OPEN_ESTIMATES  OPEN_ESTIMATESRANGE  OPEN_INVOICES
OPEN_OPPORTUNITIES  OPEN_OPPORTUNITIESRANGE  OPEN_SALES_ORDERS  PARTNER_ACTIVITY_SUMMARY  PIPELINE
PIPELINE_CUSTOMER  PIPELINE_CUSTOMER_TOTAL  PIPELINE_STATUS  PIPELINE_TOTAL  PIPELINE_TOTAL_STATUS
PROFIT_SUM_BY_CUST  PROSPECT_ANALYSIS_SUM  QUICK_REPORT  SALES_BY_CUST  SALES_BY_REP
SALES_FORECAST_SUM_SALESREP  SALES_MANAGEMENT_FORECAST  SALES_MANAGEMENT_FORECASTASA
SALES_MANAGEMENT_SALES  SALES_MANAGEMENT_SALESORD  SALES_MANAGEMENT_SALESORD_AGG  SALES_ORD_ALT_BY_REP
SALES_ORD_BY_CUST  SALES_ORD_BY_CUST_AGG  SALES_ORD_BY_PARTNER  SALES_ORD_BY_PROMO_CODE
SALES_ORD_BY_REP  SALES_ORD_BY_REP_AGG  SALES_SUMMARY_PARTNER  TIME_SUM_EMPLOYEE  TIME_SUM_ITEM
TIME_SUM_JOB  UTIL_EMPLOYEE  WEBSITE_HOSTEDITEM_HITS_ENTITY  WEBSITE_ITEM_HITS
WEBSITE_ITEM_HITS_ENTITY  WEBSITE_ITEM_HITS_VISITORS  WEBSITE_KEYWORDS_REVENUE
WEBSITE_KEYWORDS_VISITORS  WEBSITE_MEDIA_HITS  WEBSITE_MEDIA_HITS_VISITORS  WEBSITE_REFERRER_REVENUE
WEBSITE_REFERRER_VISITORS  WEBSITE_SITESEARCHHITS_SUMMARY  WEBSTORE_ITEM_ORDERS
WEBSTORE_ITEM_ORDERS_VISITORS
```

### 5.23 `portlet_reportsnapshot_daterange` (values for `enhsnapshots/daterange`, `comparedaterange`, `comparedaterange2`, `isnewdaterange`) - `SDFxml_3582925725.html`

```
FISCAL_HALF_BEFORE_LAST  FISCAL_HALF_BEFORE_LAST_TO_DATE  FISCAL_QUARTER_BEFORE_LAST
FISCAL_QUARTER_BEFORE_LAST_TO_DATE  FISCAL_YEAR_BEFORE_LAST  FISCAL_YEAR_BEFORE_LAST_TO_DATE
FIVE_DAYS_AGO  FIVE_DAYS_FROM_NOW  FOUR_DAYS_AGO  FOUR_DAYS_FROM_NOW  FOUR_WEEKS_STARTING_THIS_WEEK
LAST_BUSINESS_WEEK  LAST_FISCAL_HALF  LAST_FISCAL_HALF_ONE_FISCAL_YEAR_AGO  LAST_FISCAL_HALF_TO_DATE
LAST_FISCAL_QUARTER  LAST_FISCAL_QUARTER_ONE_FISCAL_YEAR_AGO  LAST_FISCAL_QUARTER_TO_DATE
LAST_FISCAL_QUARTER_TWO_FISCAL_YEARS_AGO  LAST_FISCAL_YEAR  LAST_FISCAL_YEAR_TO_DATE  LAST_MONTH
LAST_MONTH_ONE_FISCAL_QUARTER_AGO  LAST_MONTH_ONE_FISCAL_YEAR_AGO  LAST_MONTH_TO_DATE
LAST_MONTH_TWO_FISCAL_QUARTERS_AGO  LAST_MONTH_TWO_FISCAL_YEARS_AGO  LAST_ROLLING_HALF
LAST_ROLLING_QUARTER  LAST_ROLLING_YEAR  LAST_WEEK  LAST_WEEK_TO_DATE  LAST_YEAR  LAST_YEAR_TO_DATE
MONTH_AFTER_NEXT  MONTH_AFTER_NEXT_TO_DATE  MONTH_BEFORE_LAST  MONTH_BEFORE_LAST_TO_DATE
NEXT_BUSINESS_WEEK  NEXT_FISCAL_HALF  NEXT_FISCAL_QUARTER  NEXT_FISCAL_YEAR  NEXT_FOUR_WEEKS
NEXT_MONTH  NEXT_ONE_HALF  NEXT_ONE_MONTH  NEXT_ONE_QUARTER  NEXT_ONE_WEEK_7_ROLLING_DAYS_
NEXT_ONE_YEAR  NEXT_WEEK  NINETY_DAYS_AGO  NINETY_DAYS_FROM_NOW  ONE_YEAR_BEFORE_LAST
PREVIOUS_FISCAL_QUARTERS_LAST_FISCAL_YEAR  PREVIOUS_FISCAL_QUARTERS_THIS_FISCAL_YEAR
PREVIOUS_MONTHS_LAST_FISCAL_HALF  PREVIOUS_MONTHS_LAST_FISCAL_QUARTER  PREVIOUS_MONTHS_LAST_FISCAL_YEAR
PREVIOUS_MONTHS_SAME_FISCAL_HALF_LAST_FISCAL_YEAR  PREVIOUS_MONTHS_SAME_FISCAL_QUARTER_LAST_FISCAL_YEAR
PREVIOUS_MONTHS_THIS_FISCAL_HALF  PREVIOUS_MONTHS_THIS_FISCAL_QUARTER  PREVIOUS_MONTHS_THIS_FISCAL_YEAR
PREVIOUS_ONE_DAY  PREVIOUS_ONE_HALF  PREVIOUS_ONE_MONTH  PREVIOUS_ONE_QUARTER  PREVIOUS_ONE_WEEK
PREVIOUS_ONE_YEAR  PREVIOUS_ROLLING_HALF  PREVIOUS_ROLLING_QUARTER  PREVIOUS_ROLLING_YEAR
SAME_DAY_FISCAL_QUARTER_BEFORE_LAST  SAME_DAY_FISCAL_YEAR_BEFORE_LAST  SAME_DAY_LAST_FISCAL_QUARTER
SAME_DAY_LAST_FISCAL_YEAR  SAME_DAY_LAST_MONTH  SAME_DAY_LAST_WEEK  SAME_DAY_MONTH_BEFORE_LAST
SAME_DAY_WEEK_BEFORE_LAST  SAME_FISCAL_HALF_LAST_FISCAL_YEAR  SAME_FISCAL_HALF_LAST_FISCAL_YEAR_TO_DATE
SAME_FISCAL_QUARTER_FISCAL_YEAR_BEFORE_LAST  SAME_FISCAL_QUARTER_LAST_FISCAL_YEAR
SAME_FISCAL_QUARTER_LAST_FISCAL_YEAR_TO_DATE  SAME_MONTH_FISCAL_QUARTER_BEFORE_LAST
SAME_MONTH_FISCAL_YEAR_BEFORE_LAST  SAME_MONTH_LAST_FISCAL_QUARTER  SAME_MONTH_LAST_FISCAL_QUARTER_TO_DATE
SAME_MONTH_LAST_FISCAL_YEAR  SAME_MONTH_LAST_FISCAL_YEAR_TO_DATE  SAME_WEEK_FISCAL_YEAR_BEFORE_LAST
SAME_WEEK_LAST_FISCAL_YEAR  SIXTY_DAYS_AGO  SIXTY_DAYS_FROM_NOW  TEN_DAYS_AGO  TEN_DAYS_FROM_NOW
THIRTY_DAYS_AGO  THIRTY_DAYS_FROM_NOW  THIS_BUSINESS_WEEK  THIS_FISCAL_HALF  THIS_FISCAL_HALF_TO_DATE
THIS_FISCAL_QUARTER  THIS_FISCAL_QUARTER_TO_DATE  THIS_FISCAL_YEAR  THIS_FISCAL_YEAR_TO_DATE
THIS_MONTH  THIS_MONTH_TO_DATE  THIS_ROLLING_HALF  THIS_ROLLING_QUARTER  THIS_ROLLING_YEAR  THIS_WEEK
THIS_WEEK_TO_DATE  THIS_YEAR  THIS_YEAR_TO_DATE  THREE_DAYS_AGO  THREE_DAYS_FROM_NOW
THREE_FISCAL_QUARTERS_AGO  THREE_FISCAL_QUARTERS_AGO_TO_DATE  THREE_FISCAL_YEARS_AGO
THREE_FISCAL_YEARS_AGO_TO_DATE  THREE_MONTHS_AGO  THREE_MONTHS_AGO_TO_DATE  TODAY
TODAY_TO_END_OF_THIS_MONTH  TOMORROW  TWO_DAYS_AGO  TWO_DAYS_FROM_NOW  WEEK_AFTER_NEXT
WEEK_AFTER_NEXT_TO_DATE  WEEK_BEFORE_LAST  WEEK_BEFORE_LAST_TO_DATE  YESTERDAY
```

### 5.24 `portlet_reportsnapshot_reportperiodrange` (values for `enhsnapshots/periodrange`, `compareperiodrange`) - `SDFxml_4133998707.html`

Note the abbreviated spellings (`FQTR`, `FYEAR`) that differ from `report_period_range`:

```
1ST_FQTR_LAST_FYEAR  1ST_FQTR_THIS_FYEAR  2ND_FQTR_LAST_FYEAR  2ND_FQTR_THIS_FYEAR
3RD_FQTR_LAST_FYEAR  3RD_FQTR_THIS_FYEAR  4TH_FQTR_LAST_FYEAR  4TH_FQTR_THIS_FYEAR
FQTR_BEFORE_LAST  FYEAR_BEFORE_LAST  LAST_FISCAL_QUARTER  LAST_FISCAL_YEAR  LAST_FQTR_ONE_FYEAR_AGO
LAST_FQTR_TO_PERIOD  LAST_FYEAR_TO_PERIOD  LAST_PERIOD  LAST_PERIOD_ONE_FQTR_AGO
LAST_PERIOD_ONE_FYEAR_AGO  LAST_ROLLING_18_PERIODS  LAST_ROLLING_6_FQTRS  PERIOD_BEFORE_LAST
SAME_FQTR_LAST_FYEAR  SAME_FQTR_LAST_FYEAR_TO_PERIOD  SAME_PERIOD_LAST_FQTR  SAME_PERIOD_LAST_FYEAR
THIS_FISCAL_QUARTER  THIS_FISCAL_YEAR  THIS_FQTR_TO_PERIOD  THIS_FYEAR_TO_PERIOD  THIS_PERIOD
```

### 5.25 `reminders_standard_reminders_without_days` (values for `reminder/id`; `days` not applicable) - `SDFxml_1267802069.html`

```
AMORTIZATIONENTRIESPENDING (AMORTIZATION)  ASSEMBLIESTOBUILD (INVENTORY)  ASSEMBLIESTOORDER (WORKORDERS)
BILLCAPTUREREVIEW  BILLSTOAPPROVE (PAYABLES)  BUNDLESTOUPDATE  CAMPAIGNSTOEMAIL (MARKETING)
CAMPAIGNSTOPRINT (MARKETING)  CASESTORESPOND (SUPPORT)  CHECKSTOPRINT (ACCOUNTING)
COMMISSIONSREJECTED (COMMISSIONS)  CREDITCARDSTOAPPROVE (CCTRACKING)  CREDITMEMOSTOPRINT (RECEIVABLES)
CUSTOMERSTOBILL (BILLSCOSTS)  CUSTOMERSTORENEW (BUSINESS)  DIRECTDEPOSITSRETURNED  DIRECTDEPOSITSTOAPPROVE
DIRECTDEPOSITSTOPRINT (PAYROLL)  DOMAINCONFIGALERTS  EFTSRETURNED (EFT)  EFTSTOAPPROVE (EFT)
EMPLOYEESWITHFAILEDDIRECTDEPOSIT (PAYROLLSERVICE)  EMPLOYEESWITHPENDINGDIRECTDEPOSIT (PAYROLLSERVICE)
ESTIMATESTOPRINT (ESTIMATES)  EVENTSTORESPOND (CRM)  EXPENSEPLANSONHOLD (ADVANCEDREVENUERECOGNITION)
EXPENSEREPORTSTOAPPROVE (EXPREPORTS)  IMPORTEDEXPENSES  IMPORTSTOPROCESS  INCOMPLETECALLS (CRM)
INCOMPLETETASKS (CRM)  INVOICESREJECTED (RECEIVABLES)  INVOICESTOAPPROVE (WORKFLOW)
INVOICESTOAPPROVECREDITHOLD (RECEIVABLES)  INVOICESTOAPPROVEPAYMENTTERMS (RECEIVABLES)
INVOICESTOAPPROVEUNKNOWNTAX (RECEIVABLES)  INVOICESTOPRINT (RECEIVABLES)  ITEMSTOORDER (INVENTORY)
JOURNALSTOAPPROVE (ACCOUNTING)  JOURNALSTOAPPROVEBYYOU (ACCOUNTING)  MISSINGTIMESHEETS (WEEKLYTIMESHEETS)
MISSINGTIMESHEETSLM (WEEKLYTIMESHEETS)  PAYCHECKSTOPRINT (PAYROLL)  PAYMENTSTODEPOSIT (ACCOUNTING)
PAYROLLBATCHESTOCOMMIT (PAYROLL)  PAYROLLTRANSACTIONISSUESTOACKNOWLEDGE (PAYROLLSERVICE)
PAYROLLUPDATESTOCOMMIT (PAYROLLSERVICE)  PREPAYMENTSTOAPPROVE
PURCHASEORDERSRECEIPTPASTDUE (SUPPLYCHAINCONTROLTOWER)  PURCHASEORDERSTOBILL (ADVRECEIVING)
PURCHASEORDERSTOPRINT (PURCHASEORDERS)  PURCHASEORDERSTORECEIVE (PURCHASEORDERS)
PURCHASEREQUESTSTOAPPROVE (PURCHASEREQS)  RECEIPTSTOPRINT (ACCOUNTING)  REJECTEDPURCHASEORDERS (PURCHASEORDERS)
REJECTEDVENDORRETURNS (VENDORRETURNAUTHS)  REQUISITIONSTOAPPROVE (REQUISITIONS)
RESOURCEALLOCATIONSTOAPPROVE (RESOURCEALLOCATIONS)  RETURNAUTHNSTOPRINT (RETURNAUTHS)
RETURNAUTHSREQUIRINGREVENUECOMMITMENTREVERSALS (REVENUECOMMITMENTS)  RETURNAUTHSTOAPPROVE (RETURNAUTHS)
RETURNAUTHSTORECEIVE  RETURNAUTHSTOREFUND  REVENUEARRANGEMENTSNOTCOMPLIANT (ADVANCEDREVENUERECOGNITION)
REVENUEARRANGEMENTSPENDINGAPPROVAL (ADVANCEDREVENUERECOGNITION)  REVRECENTRIESPENDING (REVENUERECOGNITION)
REVRECPLANSONHOLD (ADVANCEDREVENUERECOGNITION)  SALESORDERSHIPMENTPASTDUE (SUPPLYCHAINCONTROLTOWER)
SALESORDERSREQUIRINGREVENUECOMMITMENTS (REVENUECOMMITMENTS)  SALESORDERSTOAPPROVE (SALESORDERS)
SALESORDERSTOFULFULL  SALESORDERSTOPRINT (SALESORDERS)  SALESORDERSTOPROCESS  SHIPMENTSTOPACK (PICKPACKSHIP)
SHIPMENTSTOSHIP (PICKPACKSHIP)  SOLUTIONSTOAPPROVE (KNOWLEDGEBASE)  SYSTEMALERTSTOACKNOWLEDGE (BUSINESS)
TASKSDUETODAY (CRM)  TEAMMISSINGWEEKLYTIMESHEETS (WEEKLYTIMESHEETS)
TEAMMISSINGWEEKLYTIMESHEETSLASTMONTH (WEEKLYTIMESHEETS)  TIMEENTRIESTOAPPROVE (TIMESHEETS)
TIMERECORDSREJECTED (TIMETRACKING)  TIMERECORDSTOAPPROVE (TIMETRACKING)  TIMESHEETSTOAPPROVE (TIMESHEETS)
TRANSFERORDERRECEIPTPASTDUE (SUPPLYCHAINCONTROLTOWER)  TRANSFERORDERSHIPMENTPASTDUE (SUPPLYCHAINCONTROLTOWER)
TRANSFERORDERSTOAPPROVE (MULTILOCINVT)  VENDORRETURNAUTHSTOAPPROVE (VENDORRETURNAUTHS)
VENDORRETURNAUTHSTOREFUND  VENDORRETURNAUTHSTORETURN (VENDORRETURNAUTHS)
WORKORDERBUILDPASTDUE (SUPPLYCHAINCONTROLTOWER)  WORKORDERSTOBUILD (WORKORDERS)  WORKORDERSTOCLOSE (MFGWORKINPROCESS)
```

(`SALESORDERSTOFULFULL` is spelled that way on the list page.)

### 5.26 `reminders_standard_reminders_with_days` (values for `reminder/id`; `days` applies) - `SDFxml_649272728.html`

```
ALLOCATIONSCHEDULESDUE (EXPENSEALLOCATION)  BILLPAYMENTSTOAPPROVE  BILLSTOPAY (PAYABLES)
EMPLOYEESTOPAY (PAYROLL)  EMPLOYEESTOREVIEW (PAYROLL)  EMPLOYEESWITHEXPIRINGAUTHORIZATION
EMPLOYEESWITHEXPIRINGVISA  EMPLOYEESWITHUPCOMINGANNIVERSARY (PAYROLL)  EMPLOYEESWITHUPCOMINGBIRTHDAY (PAYROLL)
MEMORIZEDTRANSACTIONSDUE  OPPORTUNITIESTOCLOSE (OPPORTUNITIES)  OVERDUEADVANCEDJOBS (ADVANCEDJOBS)
OVERDUECALLS (CRM)  OVERDUEINVOICES (RECEIVABLES)  OVERDUESTANDARDJOBS  OVERDUETASKS (CRM)
PERIODSTOCLOSE (ACCOUNTINGPERIODS)  SALESORDERSTOBILL  SALESORDERSTOPROCESSINVOICE
```

---

## 6. References and IDs

### 6.1 `[scriptid=...]` reference syntax

| Where | Target object | Form | Example |
|---|---|---|---|
| `publisheddashboard/center` | `center` (custom center) | `[scriptid=custcenter_x]` | — (standard: `role_centertype` name) |
| `dashboard/centertab` | `centertab` | `[scriptid=custcentertab_x]` | `[scriptid=custcentertab_basic_tab]` |
| `roles/role/role` | `role` | `[scriptid=customrole_x]` | `[scriptid=customrole_my_basic_role]` |
| `customsearch/savedsearch`, `searchform/savedsearch`, `kpi/savedsearch`, `trendgraph/savedsearch[2|3]`, `reminder/id` | `savedsearch` | `[scriptid=customsearch_x]` | `[scriptid=customsearch_emps_kwolfe]` |
| `analytics/visualization` | workbook `chart` / `pivot` / `table` (dataset-workbook child) | `[scriptid=<workbook>.<viz>]` | `[scriptid=custworkbook1.custchart2135234234]`, `...custpivot...`, `...custview...` |
| `customportlet/source` | `scriptdeployment` of a `portlet` script | `[scriptid=<script>.<deploy>]` | `[scriptid=customscript_myportlet.customdeploy_deployment]` |
| `parameter/id` | `scriptcustomfield` (script parameter) | `[scriptid=<script>.<custscript_x>]` | `[scriptid=customscript_myportlet.custscript_myportlet_title]` |
| `parameter/value` (list/record parameters) | custom record instance | `[scriptid=<customrecord_x>.<instance>]` | `[scriptid=customrecord_id.somevalue]` |
| `quicksearch/defaultgeneraltype` | `customrecordtype` | `[scriptid=customrecord_x]` | (form implied by "accepts references to the customrecordtype custom type") |
| `list/type` | custom record type | not shown on page; presumably `[scriptid=customrecord_x]` *(inference)* | — |

Any object referenced with `[scriptid=...]` must exist in the project or be declared as a
dependency in `manifest.xml` (for reminders the narrative page says the `savedsearch` object must
be in the project for SuiteApps). Any feature-dependent enumeration value used in a mandatory
field requires the feature in the manifest.

### 6.2 Places where internal IDs (not script IDs) appear

- `kpireport/reportid`: numeric internal ID of the KPI scorecard (Oracle example `-2` =
  Financial Ratios). The `portlet_kpireport_reportid` list page is empty, so the accepted set is
  not documented.
- `portlet_customsearch_savedsearch` contains negative numeric IDs (`-4167`, `-47`, `-71`, `-82`,
  ...) for standard system searches, usable directly in `customsearch/savedsearch`.
- `generic_centertab` contains `CUSTCENTERTAB-100` ... `CUSTCENTERTAB-148` and `generic_role`
  contains `CUSTOMROLE41`, `CUSTOMROLE42`, `CUSTOMROLE43`, `CUSTOMROLE56` - these are
  internal-ID-style tokens for specific standard-but-customizable tabs/roles; they are literal
  list values, not `[scriptid=...]` references.
- `enhsnapshots/customsnapshot`, `orderby`, `color`, `comparedranges`, `hierarchylevel`: free
  strings; formats not documented.

### 6.3 Human-readable list values

Two lists use mixed-case, space-containing tokens that must be emitted exactly:
`portlet_kpireport_orientation` (`KPIs on Left`, `Date Ranges on Left`) and
`portlet_kpireport_restrict` (`All`, `My Team`, `Only Mine`).

### 6.4 Known documentation discrepancies (parser should be lenient, generator should follow schema)

| Element | Narrative page | Schema page |
|---|---|---|
| `keyperformanceindicators` | `<cachedata>` | `cacheddata` |
| `quicksearch` | `defeaultgeneraltype`, `defeaulttansactiontype` | `defaultgeneraltype`, `defaulttransactiontype` |
| `calendar/numberofrecordsinagenda` | optional | required, default 7 |
| `customsearch/resultssize` | optional | required, default 10 |
| `list/size` | optional | required, 1-50, default 5 |
| `analytics/name` | required | optional, max 50 |
| `rule/color` | RED, BLUE, GREEN, YELLOW, ORANGE, PURPLE, GRAY | 16-value list without GRAY (section 5.8) |
| `trendgraph` | 10 fields | 19 fields (adds `kpi2`, `kpi3`, `savedsearch`, `savedsearch2`, `savedsearch3`, `customseriescolor2/3`, `isminimized`; `movingaverageperiod` required) |
| `kpireport/trend`, `showdates` | example `T` | default `F` |
| `lastlogin` defaults | per-field defaults given | only `isminimized` default documented |
| `enhsnapshots` types | `T`/`F` used for `isgraph`, `custom`, `orderdesc` | typed as `string` |

### 6.5 Schema browser

The `system.netsuite.com/.../srbrowser/.../sdf_xml/...` URLs (tried `Browser2025_2/sdf_xml/publisheddashboard.html`
and `.../sdf_xml/index.html`) return 404; web searches surfaced no SDF-XML schema browser for
`publisheddashboard`. Element ordering / minOccurs / maxOccurs beyond what the help-center schema
pages state is therefore **not documented** here.

---

## 7. Sources

Base URL: `https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/`

Narrative pages
- section_1515963216.html - Published Dashboards as XML Definitions
- section_1516039369.html - Supported Published Dashboard Object Portlets
- subsect_159119372291.html - Analytics Portlets
- bridgehead_1516039427.html - Calendar Portlets
- bridgehead_1516039455.html - Custom Portlets
- bridgehead_1516039459.html - Custom Search Portlets
- subsect_160024535347.html - Event Scheduler Portlets
- bridgehead_1516039463.html - Key Performance Indicator Portlets
- subsect_160024684911.html - KPI Scorecard Portlets
- bridgehead_1516039465.html - KPI Meter Portlets
- subsect_160025245520.html - Links Portlets
- bridgehead_1516039467.html - List Portlets
- subsect_161183406555.html - My Login Audit Portlets
- subsect_163412492323.html - Gantt Chart Portlets
- subsect_163412524694.html - Project Info Portlets
- subsect_163412541892.html - Project Profitability Portlets
- subsect_163412579455.html - Project Links Portlets
- bridgehead_1516039469.html - Quick Search Portlets
- subsect_160025413222.html - Recent Records Portlets
- subsect_160025428242.html - Recent Reports Portlets
- subsect_161175642795.html - Report Snapshot Portlets
- bridgehead_1536243891.html - Reminders Portlets
- bridgehead_1516039471.html - Search Form Portlets
- subsect_160025438364.html - Settings Portlets
- subsect_160025445319.html - Tasks Portlets
- bridgehead_1516039474.html - Trend Graph Portlets

Schema (SDF XML Reference) pages - object tree
- SDFxml_2517460692.html - publisheddashboard
- SDFxml_821185897.html - dashboards
- SDFxml_1885140918.html - dashboard
- SDFxml_2507073638.html - centercolumn
- SDFxml_3389721581.html - leftcolumn
- SDFxml_4206405773.html - rightcolumn
- SDFxml_3076242075.html - roles
- SDFxml_1504679754.html - role
- SDFxml_2602317317.html - analytics
- SDFxml_33334530.html - calendar
- SDFxml_2254171991.html - customportlet
- SDFxml_2472306086.html - parameters
- SDFxml_1875840555.html - parameter
- SDFxml_4101733692.html - customsearch
- SDFxml_2844836912.html - enhsnapshots
- SDFxml_2032650472.html - keyperformanceindicators
- SDFxml_1952366164.html - kpis
- SDFxml_1716063431.html - kpi
- SDFxml_3695579850.html - kpimeter
- SDFxml_2389874139.html - kpireport
- SDFxml_282636250.html - lastlogin
- SDFxml_2940484860.html - list
- SDFxml_2693680880.html - pdganttchart
- SDFxml_2592360553.html - pdinfo
- SDFxml_2232585245.html - pdpl
- SDFxml_368720903.html - pdquicklinks
- SDFxml_1855112627.html - quicksearch
- SDFxml_2359040977.html - recentrecords
- SDFxml_3776898258.html - recentreports
- SDFxml_474769753.html - reminders
- SDFxml_2674367704.html - headline
- SDFxml_3603650706.html - other
- SDFxml_1175044432.html - reminder (headline)
- SDFxml_715838527.html - reminder (other)
- SDFxml_3267379240.html - highlightingrules
- SDFxml_2921584759.html - rule
- SDFxml_937573525.html - scheduler
- SDFxml_1210102087.html - searchform
- SDFxml_2316346497.html - settings
- SDFxml_2470918358.html - shortcuts
- SDFxml_2395641333.html - tasklinks
- SDFxml_1317380448.html - trendgraph
- SDFxml_320447915.html - portlet (script object referenced by customportlet)
- SDFxml_4252709751.html - center (custom object)
- SDFxml_300019872.html - centertab (custom object)
- SDFxml.html - SDF XML Reference index

Schema pages - lists
- SDFxml_2405618192.html - Lists For SDF Custom Object XML Definitions (index)
- SDFxml_3349140554.html - role_centertype
- SDFxml_2142594848.html - generic_centertype
- SDFxml_2711749150.html - generic_centertab
- SDFxml_2643926240.html - generic_role
- SDFxml_1126447129.html - dashboard_layout
- SDFxml_2875910423.html - dashboard_mode
- SDFxml_1887060518.html - generic_portlet
- SDFxml_3739632340.html - generic_portletcolumn
- SDFxml_683597284.html - portlet_analytics_height
- SDFxml_527363778.html - portlet_analytics_portlettype
- SDFxml_3752970729.html - portlet_calendar_agenda
- SDFxml_2527135182.html - portlet_customsearch_backgroundtype
- SDFxml_2659671127.html - portlet_customsearch_charttheme
- SDFxml_2343654866.html - portlet_customsearch_drilldown
- SDFxml_3301900604.html - portlet_customsearch_savedsearch
- SDFxml_183999684.html - portlet_kpi_employees
- SDFxml_911706287.html - portlet_kpi_highlightif
- SDFxml_3874536687.html - portlet_kpimeter_combined_snapshots
- SDFxml_728013899.html - portlet_kpireport_orientation
- SDFxml_3416951729.html - portlet_kpireport_reportid (empty)
- SDFxml_2846398273.html - portlet_kpireport_restrict
- SDFxml_3512630685.html - portlet_list_type
- SDFxml_4096699072.html - portlet_quicksearch_generic
- SDFxml_3818146003.html - portlet_quicksearch_transaction
- SDFxml_2842454316.html - portlet_quicksearch_type
- SDFxml_1869667612.html - portlet_reportsnapshot_backgroundtype
- SDFxml_696504512.html - portlet_reportsnapshot_charttheme
- SDFxml_1912180571.html - portlet_reportsnapshot_charttype
- SDFxml_3582925725.html - portlet_reportsnapshot_daterange
- SDFxml_3974630140.html - portlet_reportsnapshot_displaytype
- SDFxml_3442820147.html - portlet_reportsnapshot_graphlayout
- SDFxml_4133998707.html - portlet_reportsnapshot_reportperiodrange
- SDFxml_2983585301.html - portlet_reportsnapshot_snapshot
- SDFxml_1237256740.html - portlet_reportsnapshot_topx
- SDFxml_2155751992.html - portlet_trendgraph_backgroundtype
- SDFxml_1736438083.html - portlet_trendgraph_charttheme
- SDFxml_2304465081.html - portlet_trendgraph_charttype
- SDFxml_1278880659.html - portlet_trendgraph_trendtype
- SDFxml_4060707650.html - snapshot_type_period_range_not_comparable
- SDFxml_3293710780.html - snapshot_type_period_range_comparable
- SDFxml_2976316878.html - snapshot_type_date_range_not_comparable
- SDFxml_2365274350.html - snapshot_type_date_range_comparable
- SDFxml_851294353.html - snapshot_type_custom
- SDFxml_1780664970.html - snapshot_type_trendgraph
- SDFxml_2714204436.html - report_date_range
- SDFxml_918205946.html - report_period_range
- SDFxml_525837872.html - kpi_ranges_daterange
- SDFxml_1457857726.html - kpi_ranges_daterange_or_period
- SDFxml_3631453108.html - kpi_ranges_daterange_report
- SDFxml_3285054601.html - kpi_ranges_period
- SDFxml_1785263143.html - kpi_snapshots_custom
- SDFxml_3888946032.html - kpi_snapshots_daterange
- SDFxml_844814466.html - kpi_snapshots_daterange_or_period
- SDFxml_2776189892.html - kpi_snapshots_formula
- SDFxml_227008527.html - kpi_snapshots_internal
- SDFxml_2793204002.html - kpiscorecards_comparisons
- SDFxml_3942907409.html - kpiscorecards_highlight_conditions
- SDFxml_33723258.html - kpiscorecards_highlight_icons
- SDFxml_1915405215.html - kpiscorecards_useperiods
- SDFxml_1267802069.html - reminders_standard_reminders_without_days
- SDFxml_649272728.html - reminders_standard_reminders_with_days
- SDFxml_1925733839.html - reminders_highlighting_rules_colors

Attempted, not available
- https://system.netsuite.com/help/helpcenter/en_US/srbrowser/Browser2025_2/sdf_xml/publisheddashboard.html (404)
- https://system.netsuite.com/help/helpcenter/en_US/srbrowser/Browser2025_2/sdf_xml/index.html (404)
