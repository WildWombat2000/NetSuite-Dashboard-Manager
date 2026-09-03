# Chrome Web Store console – every field, with the text to enter

Console: https://chrome.google.com/webstore/devconsole → your item → tabs on the left.
Files referenced are relative to the repo root `C:\Users\ReubenJoyceAline\Downloads\NetSuite Dashboard Manager Extension`.

---

## Account (one-time, top-right → Account)

| Field | Value |
|---|---|
| Publisher display name | `Aline Pumps` (or `Reuben Joyce` if you prefer a personal publisher) |
| Contact email | `reuben.joyce@alinepumps.com` → click Verify and follow the email |
| Trader / non-trader (EU DSA) | **Non-trader** if published personally for free; **Trader** if published by the company (then the company address and phone become public on the listing) |
| Privacy policy (account-level field, if shown) | `https://github.com/WildWombat2000/NetSuite-Dashboard-Manager/blob/main/store/privacy-policy.md` |

---

## Package tab

| Field | Value |
|---|---|
| Upload new package | `dist\netsuite-dashboard-manager-0.1.3.zip` |
| (read-only after upload) Name / Version | NetSuite Dashboard Manager / 0.1.3 |

---

## Store listing tab

### Product details

**Title from package** (read-only)
```
NetSuite Dashboard Manager
```

**Summary from package** (read-only, comes from the manifest)
```
Copy, export, import, back up and compare NetSuite dashboards between users, tabs and accounts.
```

**Description**
```
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
```

| Field | Value |
|---|---|
| Category | **Productivity** → **Workflow & Planning** (pick the nearest Productivity sub-category if the list differs) |
| Language | **English** |

### Graphic assets

| Field | Value |
|---|---|
| Store icon (128×128) | `store\icon\icon-128.png` |
| Screenshots (1280×800, up to 5) | `store\screenshots\1-dashboard.png`, `2-import.png`, `3-admin.png`, `4-compare.png`, `5-bundle.png` in that order |
| Small promo tile (440×280) | `store\promo-440x280.png` (optional) |
| Marquee promo tile (1400×560) | leave empty |
| Global promo video (YouTube URL) | leave empty |

### Additional fields

| Field | Value |
|---|---|
| Official URL | leave as "None" (requires a Search Console–verified site) |
| Homepage URL | `https://github.com/WildWombat2000/NetSuite-Dashboard-Manager` |
| Support URL | `https://github.com/WildWombat2000/NetSuite-Dashboard-Manager/issues` |
| Mature content | unticked |

---

## Privacy practices tab

**Single purpose description**
```
The extension has a single purpose: managing NetSuite dashboard layouts. It captures a NetSuite dashboard (layout, portlets and their configuration) so it can be exported, imported by another user, copied to another tab, backed up, restored or compared. It runs only on NetSuite dashboard pages and only performs the same personalisation actions the NetSuite UI offers.
```

**Permission justification** (one box per permission the console lists)

`storage`
```
Saves dashboard snapshots/backups and two user preferences locally in the browser (chrome.storage.local). Nothing is transmitted anywhere.
```

`unlimitedStorage`
```
A single dashboard snapshot is 20–80 KB and users keep many automatic backups; the 10 MB default quota is reachable within weeks of normal use, which would silently break backups.
```

Host permission `https://*.netsuite.com/*`
```
The extension must read the dashboard page and call the NetSuite dashboard endpoints on the user's own NetSuite account. Every customer's account lives on its own subdomain (for example 1234567.app.netsuite.com), so a wildcard host is required. Content scripts run only on /app/center/card.nl* (dashboard pages); the wider pattern lets the extension's own pages read published-object script ids from the same account. No host other than the user's NetSuite origin is ever contacted.
```

**Are you using remote code?** → **No, I am not using remote code**. If a justification box still appears:
```
All code is packaged in the extension. No eval, no remotely loaded scripts.
```

**Data usage – "What user data do you plan to collect?"**

| Checkbox | Setting |
|---|---|
| Personally identifiable information | unticked |
| Health information | unticked |
| Financial and payment information | unticked |
| Authentication information | unticked |
| Personal communications | unticked |
| Location | unticked |
| Web history | unticked |
| User activity | unticked |
| Website content | **ticked** |

**Certifications** (tick all three)
- ☑ I do not sell or transfer user data to third parties, outside of the approved use cases
- ☑ I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- ☑ I do not use or transfer user data to determine creditworthiness or for lending purposes

**Privacy policy URL**
```
https://github.com/WildWombat2000/NetSuite-Dashboard-Manager/blob/main/store/privacy-policy.md
```

---

## Test instructions / Notes for reviewer
(The console shows this as "Test instructions" on the Privacy practices tab in current versions; older layouts put it on the Package tab.)
```
This extension only activates on NetSuite dashboard pages (https://<account>.app.netsuite.com/app/center/card.nl). A NetSuite login is required to see it working; no public demo account exists. Without NetSuite, the extension UI can be exercised from the open-source repository: run "python -m http.server 8765" in the repo root and open http://localhost:8765/tests/ui-harness.html?demo=1&open=1 which stubs the NetSuite page and the extension APIs. Source: https://github.com/WildWombat2000/NetSuite-Dashboard-Manager. The extension makes no network requests other than to the NetSuite origin of the page it runs on.
```

---

## Distribution tab

| Field | Value |
|---|---|
| Payments | **Free of charge** |
| Visibility | **Unlisted** (installable by link, not searchable). Switch to **Public** later if desired. |
| Distribution regions | **All regions** |
| Trusted testers (if using Private) | not needed |

---

## Final step

Click **Save draft** on every tab, confirm no red items in the left checklist, then **Submit for review**
(leave "Publish automatically after it has passed review" ticked unless you want to time the release).
