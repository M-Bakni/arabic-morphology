#!/usr/bin/env python3
"""Check the dataset and site/verbs.json against the mazini conjugator.

For every non-empty cell of the four data/csv tables (root × pattern), conjugate
the verb with mazini and report:

  reject          mazini refuses the root × pattern combination
  lemma           the site's vocalised lemma is not among mazini's past-3ms forms
  type            the site's classification label differs from mazini's
  trans           the site's transitivity marker differs from the CSV cell
  site_count      the site has zero or several rows for the cell
  dup_root        a root appears twice in one table
  root_letters    the radical columns do not spell the root column

Usage:  pip install mazini && python3 scripts/audit_mazini.py
Exit status is 1 when anything is reported.
"""

from __future__ import annotations

import collections
import csv
import glob
import json
import os
import re
import sys

from mazini import MaziniError, conjugate

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
CSV_GLOB = os.path.join(ROOT, "data", "csv", "*.csv")
SITE = os.path.join(ROOT, "site", "verbs.json")
MARKER = {"l": "ل", "m": "م", "k": "ك"}
_DIACRITICS = re.compile("[ً-ْٰ]")


def strip(s: str) -> str:
    return _DIACRITICS.sub("", s)


def main() -> int:
    site = json.load(open(SITE, encoding="utf-8"))
    f = {n: i for i, n in enumerate(site["fields"])}
    by_cell: dict[tuple[str, str], list[list[str]]] = collections.defaultdict(list)
    for r in site["rows"]:
        pat = "فَعْلَلَ" if r[f["pattern"]] == "فعلل" else r[f["pattern"]]
        by_cell[(r[f["root"]], pat)].append(r)

    problems: list[tuple[str, str]] = []
    cells = 0
    for path in sorted(glob.glob(CSV_GLOB)):
        table = os.path.basename(path)
        seen: set[str] = set()
        with open(path, encoding="utf-8-sig") as fh:
            reader = csv.reader(fh)
            header = next(reader)
            nrad = 4 if "الرابع" in "".join(header) else 3
            patterns = header[1 + nrad :]
            for row in reader:
                root = row[0]
                if "".join(row[1 : 1 + nrad]) != root:
                    problems.append(("root_letters", f"{table}: {root} {row[1:1 + nrad]}"))
                if root in seen:
                    problems.append(("dup_root", f"{table}: {root}"))
                seen.add(root)
                for pattern, cell in zip(patterns, row[1 + nrad :]):
                    cell = cell.strip()
                    if not cell:
                        continue
                    cells += 1
                    site_rows = by_cell.get((root, pattern), [])
                    if len(site_rows) != 1:
                        problems.append(("site_count", f"{root} {pattern}: {len(site_rows)} site rows"))
                    try:
                        v = conjugate(root, "فعلل" if pattern == "فَعْلَلَ" else pattern)
                    except MaziniError as e:
                        problems.append(("reject", f"{root} {pattern}: {e.code}: {e}"))
                        continue
                    lemmas = [x.form for x in v.slots.get("past_3ms", [])]
                    for s in site_rows:
                        if s[f["verb"]] not in lemmas:
                            problems.append(("lemma", f"{root} {pattern}: site {s[f['verb']]} mazini {lemmas}"))
                        if s[f["type"]] and strip(s[f["type"]]) != strip(v.classification):
                            problems.append(("type", f"{root} {pattern}: site {s[f['type']]} mazini {v.classification}"))
                        if MARKER[s[f["trans"]]] != cell:
                            problems.append(("trans", f"{root} {pattern}: csv {cell} site {s[f['trans']]}"))

    print(f"{cells} cells checked, {len(site['rows'])} site rows")
    counts = collections.Counter(kind for kind, _ in problems)
    for kind, msg in problems:
        print(f"{kind}\t{msg}")
    print(dict(counts) if problems else "no differences")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
