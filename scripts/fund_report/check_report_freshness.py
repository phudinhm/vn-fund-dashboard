#!/usr/bin/env python
"""
Fail loudly when a fund's newest monthly report is too old.

The scheduled report job (update_fund_reports.yml) finds nothing to do for most
of the month, which is also what it does when Dragon Capital renames its files
and the probe silently stops matching. Without this check that failure would
look identical to "no new report yet" and Fund Analysis would go stale unseen.

A report for month M is published in the first days of M+1, so a fund is stale
once its newest period_end is older than MAX_AGE_DAYS (default 50).

Usage: python scripts/fund_report/check_report_freshness.py DCDS DCBF DCIP
"""
import csv
import sys
from datetime import date, datetime
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "public" / "data"
MAX_AGE_DAYS = 50


def latest_period(fund):
    path = DATA_DIR / fund / "tidied" / "tidy_assets.csv"
    latest = None
    with path.open(encoding="utf-8") as f:
        for row in csv.DictReader(f):
            p = (row.get("period_end") or "").strip()
            if len(p) == 10 and (latest is None or p > latest):
                latest = p
    return latest


def main(funds, today=None):
    today = today or date.today()
    stale = []
    for fund in funds:
        latest = latest_period(fund)
        if not latest:
            stale.append(f"{fund}: no periods found")
            continue
        age = (today - datetime.strptime(latest, "%Y-%m-%d").date()).days
        print(f"{fund}: newest report period {latest} ({age} days ago)")
        if age > MAX_AGE_DAYS:
            stale.append(f"{fund}: newest report {latest} is {age} days old")
    if stale:
        print("::error::Stale fund reports: " + "; ".join(stale))
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:] or ["DCDS", "DCBF", "DCIP"]))
