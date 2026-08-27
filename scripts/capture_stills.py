#!/usr/bin/env python3
"""
Re-capture the demo's contingency stills from a deployed URL.

    python3 scripts/capture_stills.py https://cursor-squad-august-live.vercel.app
    python3 scripts/capture_stills.py https://<host> --expect index-BO7g_gsl.js

The URL is a required argument and there is no default. A default is a
hardcoded target wearing an argument's clothes: `walk_demo.py` had one, it
judged whatever was listening on a well-known port, and it produced two wrong
answers before it was removed.

Every frame in a set comes from one bundle. The bundle name is read once,
printed, and re-checked after the last frame -- so a deploy landing mid-run
aborts instead of committing a set silently mixed across two builds. That is
the failure this script exists to prevent: the stills went stale three times,
and the third time the images were right and the host had moved underneath
them.

Prints the provenance stamp to paste into docs/screenshots/README.md. The
stamp is a historical fact; nothing here claims the stills are current.
"""
import argparse
import re
import sys
import urllib.request

OUT = "docs/screenshots"
SHOTS = ["01-empty-field", "02-seeded-balanced", "03-category-sheet", "04-overspent"]
BUNDLE = re.compile(r"assets/index-[A-Za-z0-9_-]+\.js")


def bundle_of(url: str) -> str:
    with urllib.request.urlopen(url, timeout=15) as r:
        html = r.read().decode("utf-8", "replace")
    found = BUNDLE.search(html)
    if not found:
        sys.exit(f"no bundle reference found at {url} -- nothing was measured")
    return found.group(0).split("/")[-1]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("url", help="the deployed URL to capture from")
    ap.add_argument("--expect", help="bundle filename this run must find, e.g. index-BO7g_gsl.js")
    args = ap.parse_args()
    url = args.url.rstrip("/")

    before = bundle_of(url)
    print(f"capturing from {url}")
    print(f"serving        {before}")
    if args.expect and before != args.expect:
        sys.exit(f"FAIL expected {args.expect}, found {before} -- the host moved")

    from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        b = p.chromium.launch(headless=True)
        ctx = b.new_context(
            viewport={"width": 390, "height": 844},
            device_scale_factor=2,
            is_mobile=True,
            has_touch=True,
            reduced_motion="reduce",
        )
        pg = ctx.new_page()
        errs: list[str] = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        pg.on("dialog", lambda d: d.accept())

        pg.goto(url, wait_until="networkidle")
        pg.wait_for_timeout(1100)
        pg.screenshot(path=f"{OUT}/{SHOTS[0]}.png")

        pg.get_by_role("button", name="Load demo budget").click()
        pg.wait_for_timeout(1600)
        pg.screenshot(path=f"{OUT}/{SHOTS[1]}.png")

        pg.get_by_role("button", name="Food").first.click()
        pg.wait_for_timeout(900)
        pg.screenshot(path=f"{OUT}/{SHOTS[2]}.png")

        plus = [x for x in pg.locator("button").all() if x.inner_text().strip() == "+"][0]
        for _ in range(8):
            plus.click()
            pg.wait_for_timeout(170)
        pg.wait_for_timeout(1200)
        pg.screenshot(path=f"{OUT}/{SHOTS[3]}.png")

        ctx.close()
        b.close()

    after = bundle_of(url)
    if after != before:
        sys.exit(f"FAIL the host deployed mid-run: {before} -> {after}. Set discarded, re-run.")
    if errs:
        sys.exit(f"FAIL page errors during capture: {errs[:3]}")

    from datetime import date

    print("\npaste into docs/screenshots/README.md:\n")
    print(f"    captured from   {url}")
    print(f"    serving         assets/{before}")
    print(f"    on              {date.today().isoformat()}")
    print("    how             headless Chromium, 390 x 844, deviceScaleFactor 2, touch on")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
