"""Reorder acceptance: does moving a category actually redraw the river?

Two directions are required for this to mean anything. Run it against a build
without the control and it must fail at the selector; run it against a build
with the control and it must pass. A check that only ever ran green proves
nothing about the feature, only about the checker.

    python3 scripts/reorder_check.py http://localhost:4319
"""
import re
import os
import sys
from playwright.sync_api import sync_playwright

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from walk_demo import trunk_widths

URL = sys.argv[1]
fails = []


ran = [0]


def check(name, ok, detail=""):
    ran[0] += 1
    print(f"  {'PASS' if ok else 'FAIL'}  {name}{'  — ' + detail if detail else ''}")
    if not ok:
        fails.append(name)
    return bool(ok)


def branch_ys(pg):
    """Which category leaves the trunk at which height, top to bottom.

    The heights themselves are derived from position, not amount, so the *set*
    of heights is invariant under reordering by design — asserting on it would
    fail on a working feature. What order actually controls is the pairing:
    which category owns which outlet, and therefore how much the trunk is still
    carrying below it.
    """
    return pg.evaluate("""() => [...document.querySelectorAll('[data-tributary]')]
        .map(e => [e.getAttribute('data-tributary'),
                   Math.round(e.getBoundingClientRect().top)])""")


with sync_playwright() as p:
    br = p.chromium.launch()
    pg = br.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=3,
                     reduced_motion="reduce")
    pg.goto(URL, wait_until="networkidle")

    # Matched loosely on purpose: the label has been "Load demo budget" and
    # "Load the demo month" at different points, and an exact name that stops
    # matching turns this whole run into a silent pass over an empty field.
    demo = pg.get_by_role("button", name=re.compile("demo", re.I))
    if demo.count():
        demo.first.click()
        pg.wait_for_timeout(400)
    elif pg.locator("main ul li button").count() == 0:
        print("  no demo control and no categories — nothing to order, and this")
        print("  run would otherwise report a red that is about the fixture.")
        br.close()
        sys.exit(2)

    print("\n1. the control exists where the sheet already is")
    rows = pg.locator("main ul li button")
    n = rows.count()
    check("the demo has categories to order", n >= 3, f"{n} rows")
    if n < 3:
        br.close()
        sys.exit(1)

    third = rows.nth(2).inner_text().split("\n")[0].strip()
    rows.nth(2).click()
    pg.wait_for_timeout(250)

    up = pg.get_by_role("button", name=f"Take {third} earlier")
    down = pg.get_by_role("button", name=f"Take {third} later")
    check("an earlier control is on the open sheet", up.count() == 1, f"'{third}'")
    check("a later control is on the open sheet", down.count() == 1)
    if not up.count():
        print("\n  This build has no reorder control. That is the red direction.")
        br.close()
        sys.exit(1)

    print("\n2. position is stated, not just offered")
    ordinal = re.search(r"Taken (\w+) of (\d+)", pg.inner_text("body"))
    check("the sheet says where in the order you are", ordinal is not None,
          ordinal.group(0) if ordinal else "no ordinal text in the page")

    print("\n3. moving redraws the river")
    before_y, before_w = branch_ys(pg), trunk_widths(pg)
    before_remaining = pg.locator("header").inner_text()
    check("the river was drawn before the move", len(before_y) >= 3, f"{len(before_y)} tributaries")
    up.click()
    pg.wait_for_timeout(450)
    after_y, after_w = branch_ys(pg), trunk_widths(pg)

    moved = [a for a, b in zip(before_y, after_y) if a != b]
    check("the category at each outlet changed", len(moved) >= 2,
          f"{[i for i, _ in before_y]} -> {[i for i, _ in after_y]}")
    check("the outlets themselves stayed put — spacing is positional, not by amount",
          [y for _, y in before_y] == [y for _, y in after_y])
    check("the trunk carries a different amount below each branch",
          before_w != after_w, f"{before_w} -> {after_w}")
    check("the same number of tributaries — a move is not a delete",
          len(before_y) == len(after_y), f"{len(before_y)} vs {len(after_y)}")

    print("\n4. the arithmetic did not change")
    check("remaining is untouched by reordering",
          pg.locator("header").inner_text() == before_remaining)

    print("\n5. the ends are closed")
    first = pg.locator("main ul li button").first.inner_text().split("\n")[0].strip()
    pg.locator("main ul li button").first.click()
    pg.wait_for_timeout(250)
    top_up = pg.get_by_role("button", name=f"Take {first} earlier")
    check("nothing above the first", top_up.count() == 1 and top_up.is_disabled(),
          f"'{first}'")

    print("\n6. it survives a reload")
    order = pg.locator("main ul li button").all_inner_texts()
    pg.reload(wait_until="networkidle")
    pg.wait_for_timeout(400)
    check("the reordered budget is what comes back",
          pg.locator("main ul li button").all_inner_texts() == order)

    br.close()

EXPECTED_CHECKS = 12   # see walk_demo.py: a vanished section shrinks the total silently
print(f"\n{'FAILED: ' + ', '.join(fails) if fails else 'all reorder checks passed'}")
if not fails and ran[0] < EXPECTED_CHECKS:
    print(f"ONLY {ran[0]} CHECKS RAN, EXPECTED {EXPECTED_CHECKS} — a section was skipped.")
    sys.exit(1)
sys.exit(1 if fails else 0)
