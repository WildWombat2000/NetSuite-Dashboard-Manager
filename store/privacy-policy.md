# Privacy Policy – NetSuite Dashboard Manager

_Last updated: 3 September 2026_

NetSuite Dashboard Manager is a browser extension that helps NetSuite users copy, export, import,
back up and compare their NetSuite dashboards.

## What the extension accesses

- **NetSuite pages you are already logged in to.** The extension runs only on NetSuite dashboard
  pages (`https://*.netsuite.com/app/center/card.nl*`). It reads the dashboard layout and the
  configuration of the portlets on it, and, only when you click **Apply** on a plan you have reviewed,
  sends the same requests to NetSuite that the NetSuite user interface sends when you personalise a
  dashboard yourself.
- **Files you choose.** Export writes a JSON file to your downloads folder. Import reads a JSON file
  you select.

## What the extension stores

- Dashboard snapshots and backups you choose to save are stored **locally in your browser**
  (`chrome.storage.local`) on the device where you saved them. They are never uploaded anywhere.
- Two preferences (automatic backup on/off, pause between calls).

## What the extension does NOT do

- It does not send any data to the developer or to any third party. There is no analytics, telemetry,
  advertising or remote server of any kind. The only network destination is the NetSuite origin of the
  page you are viewing, using your existing NetSuite session.
- It does not read, store or transmit your NetSuite credentials, session cookies or tokens beyond the
  browser's normal same-origin request behaviour on the NetSuite page itself.
- It does not access any website other than NetSuite.

## Exported files

An exported dashboard file contains the names and internal identifiers of the saved searches,
reports, KPIs, shortcuts and scripts referenced by your dashboard, plus the account id and dashboard
name it came from. Treat exported files as you would any internal business document: share them only
with colleagues who should see that information.

## Data retention and deletion

Everything the extension stores lives in your browser profile. Delete individual snapshots from the
Library page, or remove the extension to delete all of its data.

## Changes

Changes to this policy are published in the project repository:
https://github.com/WildWombat2000/NetSuite-Dashboard-Manager

## Contact

Questions: open an issue at https://github.com/WildWombat2000/NetSuite-Dashboard-Manager/issues
