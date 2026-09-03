#!/usr/bin/env python3
"""Build the Chrome Web Store upload zip from the extension/ folder.

Usage:  python scripts/package.py            -> dist/netsuite-dashboard-manager-<version>.zip

Only files Chrome needs are included (package.json, tests and docs are excluded). The manifest is
validated for the Web Store's hard limits before zipping.
"""
import json
import pathlib
import sys
import zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
EXT = ROOT / "extension"
DIST = ROOT / "dist"
EXCLUDE = {"package.json", "package-lock.json"}
EXCLUDE_DIRS = {"node_modules", "__pycache__"}


def main() -> int:
    manifest = json.loads((EXT / "manifest.json").read_text(encoding="utf-8"))
    problems = []
    if len(manifest.get("name", "")) > 75:
        problems.append("manifest.name must be 75 characters or fewer")
    if len(manifest.get("description", "")) > 132:
        problems.append(f"manifest.description must be 132 characters or fewer (is {len(manifest['description'])})")
    if manifest.get("manifest_version") != 3:
        problems.append("manifest_version must be 3")
    for size in ("16", "48", "128"):
        if not (EXT / manifest["icons"][size]).exists():
            problems.append(f"missing icon {manifest['icons'][size]}")
    if problems:
        print("Manifest problems:\n - " + "\n - ".join(problems))
        return 1

    DIST.mkdir(exist_ok=True)
    out = DIST / f"netsuite-dashboard-manager-{manifest['version']}.zip"
    count = 0
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as zf:
        for path in sorted(EXT.rglob("*")):
            if path.is_dir():
                continue
            rel = path.relative_to(EXT)
            if rel.name in EXCLUDE or any(part in EXCLUDE_DIRS for part in rel.parts):
                continue
            zf.write(path, rel.as_posix())
            count += 1
    print(f"wrote {out} ({count} files, {out.stat().st_size // 1024} KB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
