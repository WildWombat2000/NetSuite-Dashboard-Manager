# Handoff: create the Chrome Web Store item for "NetSuite Dashboard Manager"

Audience: an agent (or person) operating the Chrome Web Store Developer Dashboard at
https://chrome.google.com/webstore/devconsole while signed in as reuben.joyce@alinepumps.com.
Everything below is self-contained; no other context is needed.

## 0. Files you will upload (all in the local repository folder)

Repository root: `C:\Users\ReubenJoyceAline\Downloads\NetSuite Dashboard Manager Extension`
(same content on GitHub: https://github.com/WildWombat2000/NetSuite-Dashboard-Manager)

| Purpose | Path |
|---|---|
| Extension package to upload | `dist\netsuite-dashboard-manager-0.1.3.zip` (rebuild with `python scripts\package.py` if missing) |
| Store icon 128×128 | `store\icon\icon-128.png` |
| Screenshots 1280×800 (upload in this order) | `store\screenshots\1-dashboard.png`, `store\screenshots\2-import.png`, `store\screenshots\3-admin.png`, `store\screenshots\4-compare.png`, `store\screenshots\5-bundle.png` |
| Small promo tile 440×280 (optional) | `store\promo-440x280.png` |
| Privacy policy (public URL, paste as text) | `https://github.com/WildWombat2000/NetSuite-Dashboard-Manager/blob/main/store/privacy-policy.md` |

## 1. Outcome wanted

A new **draft item** in the developer dashboard with the package uploaded, the Store listing tab
complete, the Privacy practices tab complete, Distribution set, and all tabs showing no errors.
**Do not click "Submit for review"** unless Reuben explicitly says to submit; leave it as a saved
draft and report back with the item id (the long id in the console URL) and any warnings.

If the dashboard asks for the one-time developer registration fee ($5 USD) or to accept the
Developer Agreement, stop and ask Reuben to do that step himself, then continue.

## 2. Step by step

### 2.1 Create the item
1. Developer Dashboard → **+ New item** (top right).
2. Upload `dist\netsuite-dashboard-manager-0.1.3.zip`. Wait for "Package uploaded" and the manifest
   summary (name "NetSuite Dashboard Manager", version 0.1.3). If the console reports a manifest
   error, copy the exact message back to Reuben; do not edit the zip.
3. Click **Save draft** after each tab below.

### 2.2 Store listing tab

Fill exactly:

- **Title from package**: (read-only, "NetSuite Dashboard Manager")
- **Summary from package**: (read-only)
- **Description**: paste the block in section 3 verbatim.
- **Category**: Productivity → **Workflow & Planning** (if the sub-category picker differs, choose the
  closest Productivity option).
- **Language**: English.
- **Store icon**: upload `store\icon\icon-128.png`.
- **Screenshots**: upload the five PNGs listed above, in order 1 → 5.
- **Small promo tile**: upload `store\promo-440x280.png` (optional; skip if the size is rejected).
- **Marquee promo tile**: leave empty.
- **Official URL**: leave empty (no verified site).
- **Homepage URL**: `https://github.com/WildWombat2000/NetSuite-Dashboard-Manager`
- **Support URL**: `https://github.com/WildWombat2000/NetSuite-Dashboard-Manager/issues`
- **Mature content**: No.

### 2.3 Privacy practices tab

- **Single purpose description** (paste):

  > The extension has a single purpose: managing NetSuite dashboard layouts. It captures a NetSuite dashboard (layout, portlets and their configuration) so it can be exported, imported by another user, copied to another tab, backed up, restored or compared. It runs only on NetSuite dashboard pages and only performs the same personalisation actions the NetSuite UI offers.

- **Permission justifications** (one box per permission; paste the matching text):

  - `storage`:
    > Saves dashboard snapshots/backups and two user preferences locally in the browser (chrome.storage.local). Nothing is sent anywhere.
  - `unlimitedStorage`:
    > A single dashboard snapshot is 20–80 KB and users keep many automatic backups; the 10 MB default quota is reachable within weeks of normal use, which would silently break backups.
  - **Host permission** `https://*.netsuite.com/*`:
    > The extension must read the dashboard page and call the NetSuite dashboard endpoints on the user's own NetSuite account. Each customer's account lives on its own subdomain (for example 1234567.app.netsuite.com), so a wildcard host is required. Content scripts run only on /app/center/card.nl* (dashboard pages); the wider pattern lets the extension's own pages read published-object script ids from the same account. No host other than the user's NetSuite origin is ever contacted.
  - **Remote code**: select **No, I am not using remote code**. Justification if a box appears:
    > All code is packaged in the extension. No eval, no remotely loaded scripts.

- **Data usage**: tick **only** "Website content" (the dashboard configuration read from the NetSuite
  page, processed locally). Leave unticked: personally identifiable information, health, financial and
  payment, authentication, personal communications, location, web history, user activity.

- **Certifications** (tick all three):
  - I do not sell or transfer user data to third parties, outside of the approved use cases.
  - I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
  - I do not use or transfer user data to determine creditworthiness or for lending purposes.

- **Privacy policy URL**: `https://github.com/WildWombat2000/NetSuite-Dashboard-Manager/blob/main/store/privacy-policy.md`

### 2.4 Distribution tab

- **Visibility**: **Unlisted** (anyone with the link can install; not searchable). Reuben can switch to
  Public later.
- **Payments**: Free of charge.
- **Regions**: All regions.

### 2.5 Test instructions for reviewers (Store listing or Privacy tab, field "Test instructions"/"Notes for reviewer" if present)

Paste:

> This extension only activates on NetSuite dashboard pages (https://<account>.app.netsuite.com/app/center/card.nl). A NetSuite login is required to see it working; no public demo account exists. Without NetSuite, the extension UI can be exercised from the open-source repository: run `python -m http.server 8765` in the repo root and open http://localhost:8765/tests/ui-harness.html?demo=1&open=1 which stubs the NetSuite page and the extension APIs. Source: https://github.com/WildWombat2000/NetSuite-Dashboard-Manager. The extension makes no network requests other than to the NetSuite origin of the page it runs on.

### 2.6 Finish

- Click **Save draft** on every tab; confirm the left-hand checklist shows no red items.
- Do **not** press **Submit for review**. Report back: item id, any warnings, and anything the console
  asked for that is not covered here.

## 3. Description text (paste into Store listing → Description)

NetSuite lets you personalise your Home page and centre-tab dashboards, but gives you no way to hand that dashboard to a colleague. The built-in Publish Dashboard pushes to whole roles, only within your own centre, and can silently overwrite everyone. There is no export, no backup, no diff.

NetSuite Dashboard Manager fixes that from inside the NetSuite pages you already have open.

WHAT IT DOES
• Export a dashboard to a file: layout, every portlet, position, minimised state and full configuration (custom searches, KPIs, KPI meters, scorecards, trend graphs, report snapshots, shortcuts, calendar, lists, reminders, custom portlets and SuiteApp portlets).
• Import a file onto your own dashboard. You see the full plan first, can dry-run it, and a backup of your current dashboard is saved before anything changes.
• Copy a dashboard from one tab to another (Home → a custom centre tab, or between custom tabs).
• Merge or Replace: add on top of what is there, or start from a clean slate (the Settings portlet is always kept so you can never lock yourself out).
• Library of snapshots and automatic backups, with one-click restore.
• Compare the live dashboard with a file or a snapshot: added, removed, moved and reconfigured portlets.
• Bulk tools: minimise all, expand all, remove all, export every tab as one bundle.
• For administrators: generate a SuiteCloud Development Framework publisheddashboard XML object to deploy a dashboard to another account, and quick links to NetSuite's native Publish Dashboard.

HOW IT WORKS
The extension drives exactly the same requests the NetSuite dashboard makes when you personalise it by hand, under your own login. Your NetSuite permissions still apply: a colleague importing your dashboard only gets the portlets and searches their role is allowed to see, and anything that cannot be placed is listed with the reason instead of failing silently.

PRIVACY
No data leaves your browser except requests to the NetSuite page you are on. Snapshots are stored locally in your browser. There is no server, no analytics and no tracking. Full policy: https://github.com/WildWombat2000/NetSuite-Dashboard-Manager/blob/main/store/privacy-policy.md

OPEN SOURCE
Source code, documentation of the NetSuite dashboard internals it relies on, and the issue tracker: https://github.com/WildWombat2000/NetSuite-Dashboard-Manager

NOTES
• Built and verified against NetSuite 2026.2's dashboard. NetSuite's dashboard backend is undocumented; if a NetSuite release changes it, individual steps fail loudly in the activity log rather than making partial changes.
• Analytics (workbook) portlets and per-reminder day thresholds cannot be read from the NetSuite UI and are flagged for manual set-up after import.
• This is an independent, community tool and is not affiliated with or endorsed by Oracle or NetSuite.

## 4. Things that will go wrong and what to do

| Symptom | Action |
|---|---|
| "Pay registration fee" / Developer Agreement | Stop; Reuben does it; then continue. |
| Zip rejected for manifest reasons | Copy the exact message to Reuben. Do not repackage by hand. |
| Screenshot rejected (size/alpha) | They are 1280×800 RGB PNG already; retry once, then report. |
| Console requires an "Official URL" verified site | Leave empty; it is optional. |
| Console asks whether the item is "Made for Kids" or similar | Answer No. |
| Anything asking for a NetSuite login/credentials | Never enter credentials; use the test-instructions text above. |
