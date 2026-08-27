#!/usr/bin/env python3
"""
T029 — the mechanical half of the demo walk.

Walks quickstart.md's demo path at 390 x 844 against any URL and exits non-zero
if anything measurable is wrong. This asserts numbers, DOM and geometry only;
whether the metaphor *reads* is a person's judgement and is deliberately not
attempted here (see the split on issue #42).

    python3 scripts/walk_demo.py                       # http://localhost:5173
    python3 scripts/walk_demo.py https://example.app    # the live deployment

Needs Playwright's Chromium: pip install playwright && playwright install chromium
"""
import sys
from playwright.sync_api import sync_playwright

VIEWPORT = {"width": 390, "height": 844}
SEED = {"income": 4200, "housing": 1500, "food": 650, "remaining_after_housing": 2700}

results = []


def check(name, ok, detail=""):
    results.append((bool(ok), name, detail))
    print(f"  {'PASS' if ok else 'FAIL'}  {name}{'  — ' + str(detail) if detail else ''}")
    return bool(ok)


def river_shapes(pg):
    """Every drawn river shape with the two things that decide how it reads."""
    return pg.evaluate("""() => [...document.querySelectorAll('svg path, svg line, svg ellipse, svg rect')]
        .map(el => {
          const cs = getComputedStyle(el)
          return {
            tag: el.tagName,
            d: el.getAttribute('d') || [el.getAttribute('x1'), el.getAttribute('y1'),
                                        el.getAttribute('x2'), el.getAttribute('y2')].join(','),
            width: parseFloat(cs.strokeWidth) || 0,
            rendering: cs.shapeRendering,
            linecap: cs.strokeLinecap,
            opacity: cs.strokeOpacity,
          }
        })""")


def geometry_fingerprint(pg):
    """Everything that must be identical across two loads of one budget (SC-007)."""
    return pg.evaluate("""() => {
        const shapes = [...document.querySelectorAll('svg path, svg line, svg ellipse')]
          .map(el => el.tagName + '|' + (el.getAttribute('d') || '') + '|' +
               [el.getAttribute('x1'),el.getAttribute('y1'),el.getAttribute('x2'),el.getAttribute('y2')].join(',') +
               '|' + (el.getAttribute('stroke-width') || ''))
        const world = document.querySelector('[data-scale]')
        const box = world ? world.getBoundingClientRect() : null
        const sprites = [...document.querySelectorAll('[data-scale] span, [data-scale] div')]
          .filter(e => getComputedStyle(e).backgroundImage.startsWith('url('))
          .map(e => { const r = e.getBoundingClientRect()
                      return [Math.round(r.left - (box?box.left:0)), Math.round(r.top - (box?box.top:0)),
                              Math.round(r.width), Math.round(r.height)].join(',') })
        return { shapes, sprites, scale: world ? world.dataset.scale : null }
    }""")


def sprite_labels(pg):
    return pg.eval_on_selector_all(
        "[data-scale] [aria-label]", "els => els.map(e => e.getAttribute('aria-label'))"
    )


def body(pg):
    return pg.inner_text("body")


def walk(url):
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        pg = browser.new_page(viewport=VIEWPORT, device_scale_factor=2, has_touch=True)
        console_errors, page_errors = [], []
        pg.on("console", lambda m: console_errors.append(m.text) if m.type == "error" else None)
        pg.on("pageerror", lambda e: page_errors.append(str(e)))
        pg.on("dialog", lambda d: d.accept())

        print(f"\nWalking {url} at {VIEWPORT['width']}x{VIEWPORT['height']}\n")

        pg.goto(url, wait_until="networkidle")
        pg.evaluate("localStorage.clear()")
        pg.reload(wait_until="networkidle")

        # ---- 1. the empty field -------------------------------------------------
        print("1. empty field")
        check("no river is drawn before any income", len(river_shapes(pg)) == 0,
              f"{len(river_shapes(pg))} shapes")
        add_income = pg.get_by_role("button", name="Add Income")
        check("Add Income is present", add_income.count() > 0)
        if add_income.count():
            box = add_income.first.bounding_box()
            check("Add Income is at least 44x44 (FR-018)", box and box["height"] >= 44,
                  f"{box['width']:.0f}x{box['height']:.0f}" if box else "no box")
        check("Load demo budget is present", pg.get_by_text("Load demo budget").count() > 0)

        # ---- 2. the seeded month ------------------------------------------------
        print("\n2. seeded month (US5 scenario 1)")
        pg.get_by_text("Load demo budget").first.click()
        pg.wait_for_timeout(900)
        text = body(pg)
        check("income reads $4,200", "$4,200" in text)
        check("the seeded month is balanced, not a warning (T023)",
              "balanced" in text.lower() and "over budget" not in text.lower())
        check("remaining reads $0", "$0" in text)

        shapes = river_shapes(pg)
        check("the river is drawn", len(shapes) > 0, f"{len(shapes)} shapes")

        # ---- 3. the trunk narrows ------------------------------------------------
        print("\n3. the trunk narrows (US2 / FR-006)")
        # Each trunk segment draws twice on the same `d` — the water at the
        # model's width and a highlight at ~30% of it — so widths are grouped by
        # path data and the widest of each group is the segment. Reading every
        # <path> instead interleaves the highlights and looks non-monotonic.
        widest = {}
        order = []
        for shape in shapes:
            if shape["tag"] != "path" or shape["width"] <= 0:
                continue
            key = shape["d"]
            if key not in widest:
                order.append(key)
            widest[key] = max(widest.get(key, 0), shape["width"])
        widths = [widest[k] for k in order]
        non_increasing = all(a >= b for a, b in zip(widths, widths[1:])) if len(widths) > 1 else False
        check("trunk segment widths are monotonically non-increasing", non_increasing, widths)
        check("the trunk starts at full width and ends narrower (FR-006)",
              len(widths) > 1 and widths[0] > widths[-1], f"{widths[0] if widths else '-'} -> {widths[-1] if widths else '-'}")

        # ---- 4. settlements ------------------------------------------------------
        print("\n4. settlements (T016 / FR-007)")
        labels = sprite_labels(pg)
        check("the largest expense shows 6 houses", any("Houses, 6" in l for l in labels), labels)
        check("it shows 3 residents", any("Residents, 3" in l for l in labels))
        check("savings ends in a reservoir", any("reservoir" in l.lower() for l in labels))

        # ---- 5. pixel art is not smoothed ---------------------------------------
        print("\n5. the river must not be smooth (art-bible §1, non-negotiable #2)")
        smooth = [s for s in shapes if s["rendering"] not in ("crispedges", "crispEdges")]
        check("every river shape carries shape-rendering=crispEdges", not smooth,
              f"{len(smooth)} of {len(shapes)} shapes are anti-aliased")
        round_caps = [s for s in shapes if s["linecap"] == "round"]
        check("no river shape uses a round line cap", not round_caps,
              f"{len(round_caps)} round-capped")

        # ---- 6. SC-007 determinism ----------------------------------------------
        print("\n6. two loads, identical geometry (SC-007 / FR-015)")
        first = geometry_fingerprint(pg)
        pg.reload(wait_until="networkidle")
        pg.wait_for_timeout(900)
        second = geometry_fingerprint(pg)
        check("river geometry is identical across two loads", first["shapes"] == second["shapes"],
              f"{len(first['shapes'])} vs {len(second['shapes'])} shapes")
        check("sprite placement is identical across two loads", first["sprites"] == second["sprites"],
              f"{len(first['sprites'])} vs {len(second['sprites'])} sprites")
        check("the budget survived the reload (US5 scenario 3)", "$4,200" in body(pg))

        # ---- 7. no horizontal scroll --------------------------------------------
        print("\n7. layout (SC-008)")
        for w in (390, 320):
            pg.set_viewport_size({"width": w, "height": 844})
            pg.wait_for_timeout(400)
            sw = pg.evaluate("document.documentElement.scrollWidth")
            cw = pg.evaluate("document.documentElement.clientWidth")
            check(f"no horizontal scroll at {w}px", sw <= cw, f"scrollWidth {sw} vs client {cw}")
        pg.set_viewport_size(VIEWPORT)

        # ---- 8. the console ------------------------------------------------------
        print("\n8. console")
        check("no page errors", not page_errors, page_errors[:3])
        check("no console errors", not console_errors, console_errors[:3])

        browser.close()


def main():
    url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5173"
    try:
        walk(url)
    except Exception as exc:  # a crashed walk is a failed walk, not a green one
        print(f"\nWALK CRASHED: {type(exc).__name__}: {exc}")
        sys.exit(2)

    failed = [r for r in results if not r[0]]
    print(f"\n{'=' * 60}")
    print(f"{len(results) - len(failed)}/{len(results)} checks passed")
    if failed:
        print("\nFAILED:")
        for _, name, detail in failed:
            print(f"  - {name}" + (f"  ({detail})" if detail else ""))
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
