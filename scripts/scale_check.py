#!/usr/bin/env python3
"""
Does the world still work when the month is bigger than the demo?

Every gate in this directory measures the same seeded five-category budget.
@Pollen found eight categories broken on main — the lowest settlement 22 art-px
outside the world box, the mouth pool off the bottom entirely, the tally
floating mid-river — and had to hand-build a budget to see it. Nothing on the
board would have caught it, because nothing on the board had ever drawn one.

The spec asks for exactly this: "Test the visualization using small, medium and
large datasets", and "a large number of categories and expenses should still
produce a readable layout".

Budgets are seeded through localStorage rather than driven through the form,
so a run is one page load per size and stays deterministic.

    python3 scripts/scale_check.py <url>

Exit 1 if any size breaks an invariant. The sizes that are ALREADY broken on
main are reported as such rather than silently tolerated — see KNOWN below.
"""
import json
import os
import sys

from playwright.sync_api import sync_playwright

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from walk_demo import settle

STORAGE_KEY = "money-river:budget:v1"
COLORS = ["r", "f", "t", "m", "v", "y", "s", "d", "w", "p"]
SIZES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12]

results = []


def check(size, name, ok, detail=""):
    results.append((bool(ok), f"{size}: {name}"))
    print(f"    {'PASS' if ok else 'FAIL'}  {name}{'  — ' + str(detail) if detail else ''}")
    return bool(ok)


def budget_of(n, savings_last=True):
    """n categories that always fit an income, so `remaining` never goes negative
    and the overspend art is not what is under test here.

    `savings_last` matters more than it looks. @Pollen measured that the seeded
    demo — five categories ending in Savings — is the ROOMIEST size on the
    board: a reservoir plants no settlement, so the last row of the month is the
    shortest object in the world. Every gate here has been measuring that shape.

    My first version of this file generated the same shape, so it inherited the
    same luck. Both are run now: `savings_last=False` puts a full village at the
    bottom of the river, which is what an ordinary month looks like when the
    last thing you list is an expense.
    """
    income = 400 * (n + 1)
    savings_at = n - 1 if savings_last else 0
    return {
        "income": income,
        "categories": [
            {
                "id": f"c{i}",
                "label": f"Item {i + 1}",
                "amount": 300,
                "kind": "savings" if i == savings_at else "expense",
                "color": COLORS[i % len(COLORS)],
                **({} if i == savings_at else {"icon": "house"}),
            }
            for i in range(n)
        ],
        "updatedAt": "2026-08-27T00:00:00.000Z",
    }


def run(url, pg, n, savings_last=True):
    shape = "savings last" if savings_last else "expense last"
    print(f"\n{n} categories, {shape}")
    pg.goto(url, wait_until="networkidle")
    pg.evaluate("([k, v]) => localStorage.setItem(k, v)",
                [STORAGE_KEY, json.dumps(budget_of(n, savings_last))])
    pg.goto(url, wait_until="networkidle")
    settle(pg)

    m = pg.evaluate("""() => {
        const world = document.querySelector('[data-scale]')
        if (!world) return null
        const box = world.getBoundingClientRect()
        const rel = (r) => ({ top: r.top - box.top, bottom: r.bottom - box.top,
                              left: r.left - box.left, right: r.right - box.left })
        const svg = world.querySelector('svg')
        const water = svg ? [...svg.querySelectorAll('rect')].map((e) => rel(e.getBoundingClientRect())) : []
        // Settlement sprites only. The grass FIELD is deliberately larger than
        // the frame — that is the endless meadow — and foliage is planted out
        // into it on purpose, so both legitimately sit below the world box.
        // Including them reported 1, 2, 3, 5 and 6 categories broken on a build
        // where they are fine, which is the cry-wolf failure: a gate that is red
        // on every correct size teaches people to ignore the size that is not.
        const painted = [...world.querySelectorAll('span, div')]
          .filter((e) => getComputedStyle(e).backgroundImage.startsWith('url('))
        const areaOf = (e) => { const r = e.getBoundingClientRect(); return r.width * r.height }
        let field = null
        for (const e of painted) if (!field || areaOf(e) > areaOf(field)) field = e
        const sprites = painted
          .filter((e) => e !== field && !e.closest('[data-foliage]'))
          .map((e) => rel(e.getBoundingClientRect()))
        const boards = [...world.querySelectorAll('[data-signboard]')].map((e) => rel(e.getBoundingClientRect()))
        const tally = [...world.querySelectorAll('*')]
          .filter((e) => /left$/.test((e.textContent || '').trim()) && e.children.length === 0)
          .map((e) => rel(e.getBoundingClientRect()))
        const branches = [...world.querySelectorAll('[data-tributary]')].length
        return { h: box.height, w: box.width, water, sprites, boards, tally, branches,
                 scale: +world.dataset.scale }
    }""")

    tag = f"{n} cat, {'savings' if savings_last else 'expense'} last"
    if not check(tag, "the world rendered", m is not None):
        return
    art = m["scale"]
    below = lambda arr: [round(r["bottom"] / art, 1) for r in arr if r["bottom"] > m["h"] + 1]
    check(tag, "every branch is drawn", m["branches"] == max(0, n - 0), f"{m['branches']} tributaries")
    check(tag, "no water is drawn below the world", not below(m["water"]),
          f"{len(below(m['water']))} rects past the bottom, lowest {max(below(m['water']), default=0)} art-px over")
    check(tag, "no settlement is drawn below the world", not below(m["sprites"]),
          f"{len(below(m['sprites']))} sprites past the bottom, lowest "
          f"{max(below(m['sprites']), default=0)} art-px over")
    check(tag, "no signboard is drawn below the world", not below(m["boards"]))
    # Drawn is not the same as reachable. @Pollen found 66 art-pixels of a
    # twelve-category month on the page and behind the pan clamp — the camera
    # knew only about the world box, so anything the model drew below it could
    # not be dragged to. `scale_check` measured whether the month FITS and was
    # silent on whether a person can see it, which is a different question and
    # the one a user actually has.
    #
    # Asserted for every size, not just the tall ones: at six categories and
    # below the lowest row is already on screen and the drag is a no-op, so this
    # costs nothing there and catches a clamp regression the moment one appears.
    lowest = pg.evaluate("""() => {
        const w = document.querySelector('[data-scale]')
        const painted = [...w.querySelectorAll('span, div')]
          .filter((e) => getComputedStyle(e).backgroundImage.startsWith('url('))
        const areaOf = (e) => { const r = e.getBoundingClientRect(); return r.width * r.height }
        let field = null
        for (const e of painted) if (!field || areaOf(e) > areaOf(field)) field = e
        const rows = [...painted.filter((e) => e !== field && !e.closest('[data-foliage]')),
                      ...w.querySelectorAll('svg rect')]
        let bottom = -1e9
        for (const e of rows) { const r = e.getBoundingClientRect(); if (r.bottom > bottom) bottom = r.bottom }
        return { bottom, onScreen: bottom <= innerHeight + 1 }
    }""")
    if not lowest["onScreen"]:
        for _ in range(12):
            pg.mouse.move(195, 520)
            pg.mouse.down()
            for i in range(1, 9):
                pg.mouse.move(195, 520 - 45 * i)
            pg.mouse.up()
            pg.wait_for_timeout(70)
        reached = pg.evaluate("""() => {
            const w = document.querySelector('[data-scale]')
            const painted = [...w.querySelectorAll('span, div')]
              .filter((e) => getComputedStyle(e).backgroundImage.startsWith('url('))
            const areaOf = (e) => { const r = e.getBoundingClientRect(); return r.width * r.height }
            let field = null
            for (const e of painted) if (!field || areaOf(e) > areaOf(field)) field = e
            const rows = [...painted.filter((e) => e !== field && !e.closest('[data-foliage]')),
                          ...w.querySelectorAll('svg rect')]
            let bottom = -1e9
            for (const e of rows) { const r = e.getBoundingClientRect(); if (r.bottom > bottom) bottom = r.bottom }
            return bottom <= innerHeight + 1
        }""")
        check(tag, "everything drawn can be reached by panning", reached,
              "the bottom of the month is behind the clamp" if not reached
              else "off screen at rest, reachable by dragging")
    else:
        check(tag, "everything drawn can be reached by panning", True, "on screen at rest")

    if m["tally"]:
        t = m["tally"][0]
        lowest = max((r["bottom"] for r in m["water"]), default=0)
        check(tag, "the tally sits at the end of the river, not in it",
              t["top"] >= lowest - 2 * art,
              f"tally top {round(t['top'] / art, 1)} vs lowest water {round(lowest / art, 1)} art-px")
    else:
        check(tag, "the tally is on screen", False, "not found")


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(2)
    url = sys.argv[1]
    with sync_playwright() as p:
        br = p.chromium.launch()
        pg = br.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2,
                         reduced_motion="reduce")
        for savings_last in (True, False):
            for n in SIZES:
                label = f"{n} cat, {'savings' if savings_last else 'expense'} last"
                try:
                    run(url, pg, n, savings_last)
                except Exception as exc:
                    check(label, "the page survived", False, f"{type(exc).__name__}: {exc}")
        br.close()

    failed = [r for r in results if not r[0]]
    print(f"\n{'=' * 60}")
    print(f"{len(results) - len(failed)}/{len(results)} checks passed across {len(SIZES)} budget sizes")
    if failed:
        print("\nFAILED:")
        for _, name in failed:
            print(f"  - {name}")
        sys.exit(1)


if __name__ == "__main__":
    main()
