# Chrome Web Store listing – copy/paste material

## Product details

**Name** (max 75): NetSuite Dashboard Manager

**Summary** (max 132, shown under the name):
Copy, export, import, back up and compare NetSuite dashboards between users, tabs and accounts.

**Category**: Productivity → Workflow & Planning (alternatively Developer Tools)

**Language**: English

**Single purpose description** (required by the review team):
The extension has a single purpose: managing NetSuite dashboard layouts. It captures a NetSuite
dashboard (layout, portlets and their configuration) so it can be exported, imported by another user,
copied to another tab, backed up, restored or compared. It runs only on NetSuite dashboard pages and
only performs the same personalisation actions the NetSuite UI offers.

## Description (max 16,000 characters)

NetSuite lets you personalise your Home page and centre-tab dashboards, but gives you no way to hand
that dashboard to a colleague. The built-in Publish Dashboard pushes to whole roles, only within your
own centre, and can silently overwrite everyone. There is no export, no backup, no diff.

NetSuite Dashboard Manager fixes that from inside the NetSuite pages you already have open.

WHAT IT DOES
• Export a dashboard to a file: layout, every portlet, position, minimised state and full configuration
  (custom searches, KPIs, KPI meters, scorecards, trend graphs, report snapshots, shortcuts, calendar,
  lists, reminders, custom portlets and SuiteApp portlets).
• Import a file onto your own dashboard. You see the full plan first, can dry-run it, and a backup of
  your current dashboard is saved before anything changes.
• Copy a dashboard from one tab to another (Home → a custom centre tab, or between custom tabs).
• Merge or Replace: add on top of what is there, or start from a clean slate (the Settings portlet is
  always kept so you can never lock yourself out).
• Library of snapshots and automatic backups, with one-click restore.
• Compare the live dashboard with a file or a snapshot: added, removed, moved and reconfigured portlets.
• Bulk tools: minimise all, expand all, remove all, export every tab as one bundle.
• For administrators: generate a SuiteCloud Development Framework publisheddashboard XML object to
  deploy a dashboard to another account, and quick links to NetSuite's native Publish Dashboard.

HOW IT WORKS
The extension drives exactly the same requests the NetSuite dashboard makes when you personalise it
by hand, under your own login. Your NetSuite permissions still apply: a colleague importing your
dashboard only gets the portlets and searches their role is allowed to see, and anything that cannot
be placed is listed with the reason instead of failing silently.

PRIVACY
No data leaves your browser except requests to the NetSuite page you are on. Snapshots are stored
locally in your browser. There is no server, no analytics and no tracking. Full policy:
https://github.com/WildWombat2000/NetSuite-Dashboard-Manager/blob/main/store/privacy-policy.md

OPEN SOURCE
Source code, documentation of the NetSuite dashboard internals it relies on, and the issue tracker:
https://github.com/WildWombat2000/NetSuite-Dashboard-Manager

NOTES
• Built and verified against NetSuite 2026.2's dashboard. NetSuite's dashboard backend is undocumented;
  if a NetSuite release changes it, individual steps fail loudly in the activity log rather than making
  partial changes.
• Analytics (workbook) portlets and per-reminder day thresholds cannot be read from the NetSuite UI and
  are flagged for manual set-up after import.
• This is an independent, community tool and is not affiliated with or endorsed by Oracle or NetSuite.

## Privacy practices tab

**Single purpose**: see above.

**Permission justifications**

| Permission | Justification |
|---|---|
| `storage` | Saves dashboard snapshots/backups and two user preferences locally in the browser. |
| `unlimitedStorage` | A single dashboard snapshot is 20–80 KB and users keep many backups; the 10 MB default quota is reachable within weeks of normal use. |
| Host permission `https://*.netsuite.com/*` | The extension must read the dashboard page and call the NetSuite dashboard endpoints on the user's own NetSuite account (`<account>.app.netsuite.com`, which varies per customer). Content scripts are restricted to `/app/center/card.nl*`; the wider host pattern is needed so the options page can read published-object script ids from the same account. No other host is ever contacted. |
| Remote code | None. All code is packaged; no eval, no remote scripts. |

**Data usage disclosures**: tick "Website content" (dashboard configuration read from the NetSuite
page, processed locally). Do not tick personally identifiable information, authentication
information, financial information, health, location, web history, user activity or personal
communications: none are collected. Certify: data is not sold, not used for unrelated purposes, not
used for creditworthiness.

**Privacy policy URL**:
https://github.com/WildWombat2000/NetSuite-Dashboard-Manager/blob/main/store/privacy-policy.md

## Assets checklist

- [ ] Store icon 128×128 PNG: `store/icon/icon-128.png` (SVG source in `store/icon/icon.svg`).
- [ ] Five screenshots, 1280×800 PNG: `store/screenshots/1-dashboard.png` … `5-bundle.png`.
- [ ] Optional small promo tile 440×280, marquee 1400×560.
- [ ] Upload zip: `python scripts/package.py` → `dist/netsuite-dashboard-manager-<version>.zip`.

## Publishing steps

1. https://chrome.google.com/webstore/devconsole → pay the one-time developer registration fee if not
   done → New item → upload the zip.
2. Fill Store listing from this file; add screenshots.
3. Privacy practices tab: paste the single purpose, permission justifications, data disclosures and
   the privacy policy URL.
4. Distribution: Public (or Unlisted if you only want to share the link internally; Unlisted still
   passes review and is the usual choice for an internal business tool). Choose regions.
5. Submit for review. Extensions with a broad host permission typically take a few days; the reviewer
   may ask for a NetSuite test account. Offer a sandbox login through the "test instructions" field
   rather than production credentials.
6. After approval, bump `version` in `extension/manifest.json`, tag `vX.Y.Z` and push; CI builds the
   release zip automatically.
