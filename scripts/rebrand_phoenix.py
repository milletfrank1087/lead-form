"""Rebrand the apply funnel from Fynex to Phoenix, matching the CRM's own naming.

Only user-visible brand strings change. Internal identifiers that are stored or sent are deliberately
left alone because renaming them would break data already written:
  * the auth cookie `fynex_dash_auth` and the `fynex_dash_pw` sessionStorage key (a rename logs every
    operator out and orphans the saved value),
  * the localStorage draft key `fynex:apply-draft:v1` (a rename discards every in-progress application),
  * the CSV download filename (cosmetic, but it is a file people may have bookmarked habits around -
    it IS renamed, since nothing reads it back).
Old mockups under mockups/ are design history, not the live funnel, and are left untouched.
"""
import pathlib

ROOT = pathlib.Path(".")
SKIP_DIRS = {"node_modules", "dist", ".git", "mockups"}

# (file, [(old, new), ...]) - exact strings, so prose like "partner application" is never touched.
EDITS = {
    "src/config/brand.ts": [
        ('name: "Fynex Network"', 'name: "Phoenix Network"'),
        ('shortName: "Fynex"', 'shortName: "Phoenix"'),
        ('legalEntity: "FynexNetwork LLC"', 'legalEntity: "Phoenix Network LLC"'),
    ],
    "index.html": [
        ("Fynex Network — Get paid to prove you're American",
         "Phoenix Network — Get paid to prove you're American"),
    ],
    "server.js": [
        ("'Fynex American Verifier',", "'Phoenix American Verifier',"),
        ("JourneyLog.startup(PORT, 'Fynex Verifier Funnel', 'EN', trackingSummary)",
         "JourneyLog.startup(PORT, 'Phoenix Verifier Funnel', 'EN', trackingSummary)"),
    ],
    "lib/logger.js": [
        ("const brand = 'FYNEX NETWORK';", "const brand = 'PHOENIX NETWORK';"),
    ],
    "lib/tracking/index.js": [
        ("'Fynex American Verifier',", "'Phoenix American Verifier',"),
        ("contentName: 'Fynex American Verifier',", "contentName: 'Phoenix American Verifier',"),
    ],
    "public/tracking.js": [
        ("'Fynex American Verifier'", "'Phoenix American Verifier'"),
        ("'Fynex American Verifier',", "'Phoenix American Verifier',"),
    ],
    "public/dashboard.html": [
        ("Fynex Network</title>", "Phoenix Network</title>"),
        ("Fynex Lead Ops", "Phoenix Lead Ops"),
    ],
    "public/dashboard.js": [
        ("`fynex-leads-", "`phoenix-leads-"),
    ],
    "src/lib/wizard/handoff.ts": [
        ('"Hi Fynex — I\'ve just submitted my application.",',
         '"Hi Phoenix — I\'ve just submitted my application.",'),
    ],
    "test-submission.md": [
        ("`fynexnetwork.com`", "`phoenixnetwork.online`"),
    ],
}


def main():
    changed = []
    for rel, pairs in EDITS.items():
        p = ROOT / rel
        if not p.is_file():
            print("MISSING FILE:", rel)
            continue
        t0 = p.read_text(encoding="utf-8")
        t = t0
        for old, new in pairs:
            if old in t:
                t = t.replace(old, new)
        if t != t0:
            p.write_text(t, encoding="utf-8")
            changed.append(rel)
            print("updated:", rel)
        else:
            print("no change:", rel)
    print("\nfiles changed:", len(changed))


if __name__ == "__main__":
    main()
