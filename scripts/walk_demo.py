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
import re
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


def tappable_height(pg, selector):
    """
    How tall a control actually is *to a thumb*, and whether the screen clipped it.

    Reading `getBoundingClientRect()` is wrong for any control that expands its
    hit area with a pseudo-element: the box reports the text, not the target. This
    walks `elementFromPoint` outward from the centre instead, which is what a tap
    actually resolves against — and reports when the scan stopped at the viewport
    edge rather than at the control's own boundary, because an expanded area that
    runs off-screen is not reachable however large it was specified.
    """
    return pg.evaluate("""(sel) => {
        const el = document.querySelector(sel)
        if (!el) return null
        const r = el.getBoundingClientRect()
        const cx = Math.round(r.left + r.width / 2)
        const cy = Math.round(r.top + r.height / 2)
        // `t.contains(el)` would be true for every *ancestor*, so a point over the
        // header but not over the control would score as a hit and the scan would
        // walk the whole header — reporting its height, and `clipped` for any
        // top-anchored header regardless of what the control does. Descendants
        // only: that is what a tap on this control actually resolves to.
        const hits = (y) => {
          const t = document.elementFromPoint(cx, y)
          return !!t && (t === el || el.contains(t))
        }
        if (!hits(cy)) return { box: r.height, tappable: 0, clipped: false }
        let top = cy, bottom = cy
        while (top - 1 >= 0 && hits(top - 1)) top -= 1
        while (bottom + 1 < window.innerHeight && hits(bottom + 1)) bottom += 1
        return { box: r.height, tappable: bottom - top + 1, clipped: top === 0 }
    }""", selector)


def trunk_widths(pg):
    """
    The trunk's stroke widths, spring to mouth.

    Each segment draws twice on the same `d` — the water at the model's width and
    a highlight at ~30% of it — so widths are grouped by path data and the widest
    of each group is the segment. Reading every <path> instead interleaves the
    highlights and reports a monotonic trunk as non-monotonic.
    """
    widest, order = {}, []
    for shape in river_shapes(pg):
        if shape["tag"] != "path" or shape["width"] <= 0:
            continue
        if shape["d"] not in widest:
            order.append(shape["d"])
        widest[shape["d"]] = max(widest.get(shape["d"], 0), shape["width"])
    return [widest[k] for k in order]


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
        widths = trunk_widths(pg)
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

        # ---- 5b. category colour on the stroke (art-bible §2) --------------------
        #
        # The stroke is one of the three places the category colour must live, and
        # the only one of the three in the world layer. When it was moved off, the
        # trunk and all five tributaries rendered in the same two water blues and
        # the middle of the river read as one braided blob — SC-002, with the
        # geometry completely unchanged. Every geometric check still passed.
        #
        # This asserts the cause, not the effect. Whether the narrowing *reads*
        # to a stranger is a person's judgement and stays with the human walk.
        print("\n5b. category colour rides the tributary stroke (art-bible §2)")
        strokes = pg.evaluate("""() => {
            const water = ['rgb(43, 127, 212)', 'rgb(92, 179, 255)', 'rgb(23, 83, 143)']
            const seen = [...document.querySelectorAll('svg line')]
              .map(e => getComputedStyle(e).stroke)
              .filter(s => s && s !== 'none' && !s.startsWith('rgba(0, 0, 0, 0'))
            return {
              all: [...new Set(seen)],
              categorical: [...new Set(seen.filter(s => !water.includes(s)))],
            }
        }""")
        check("each tributary strokes in its own category colour, not the trunk's water",
              len(strokes["categorical"]) >= 5,
              f"{len(strokes['categorical'])} non-water stroke colours: {strokes['categorical']}")

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

        # ---- 7. editing the income (US1 scenario 3) ------------------------------
        #
        # The scenario a walk written from the task list never asks: T010 built the
        # income sheet and T026 wired the page, so both closed green while the
        # trigger for an already-existing budget belonged to neither. FR-002 says
        # "enter *and later edit*"; this is the half that went missing.
        print("\n7. editing the income (US1 scenario 3 / FR-002)")
        pg.evaluate("window.__walkMarker = 'alive'")
        before = trunk_widths(pg)
        income_button = pg.get_by_role("button", name=re.compile("Edit income"))
        check("the income figure is editable from the running app", income_button.count() > 0)
        if income_button.count():
            hit = tappable_height(pg, '[aria-label^="Edit income"]')
            detail = (f"{hit['tappable']} px tappable (box {hit['box']:.0f} px)"
                      + (", scan hit the top of the screen" if hit and hit["clipped"] else "")
                      ) if hit else "not measurable"
            check("the income control is at least 44px tall (FR-018)",
                  hit and hit["tappable"] >= 44 and not hit["clipped"], detail)
            income_button.first.click()
            pg.wait_for_timeout(400)
            pg.fill("#income", "6000")
            pg.get_by_role("button", name=re.compile("Start the river|Save|Update")).first.click()
            pg.wait_for_timeout(900)

            after = trunk_widths(pg)
            check("the header shows the new income", "$6,000" in body(pg))
            check("the trunk widens below the branches",
                  len(after) == len(before) and any(a > b for a, b in zip(after[1:], before[1:])),
                  f"{before} -> {after}")
            check("no page reload (FR-010)", pg.evaluate("window.__walkMarker") == "alive")

            # put it back, so what follows starts from the seeded month again
            income_button.first.click()
            pg.wait_for_timeout(400)
            pg.fill("#income", "4200")
            pg.get_by_role("button", name=re.compile("Start the river|Save|Update")).first.click()
            pg.wait_for_timeout(700)
            check("restoring the income restores the balanced month", "balanced" in body(pg).lower())

        # ---- 8. reshaping a category (US3 scenario 2) ----------------------------
        print("\n8. reshaping a category (US3 scenario 2 / FR-011)")
        food = pg.get_by_role("button", name=re.compile(r"^Food"))
        if check("a tributary row is tappable", food.count() > 0):
            food.first.click()
            pg.wait_for_timeout(500)
            minus = pg.get_by_role("button", name=re.compile("Reduce Food"))
            if check("the sheet offers a $50 decrement", minus.count() > 0):
                mbox = minus.first.bounding_box()
                check("the decrement is at least 44x44 (FR-018)",
                      mbox and mbox["width"] >= 44 and mbox["height"] >= 44,
                      f"{mbox['width']:.0f}x{mbox['height']:.0f}" if mbox else "no box")
                minus.first.click(); pg.wait_for_timeout(250)
                minus.first.click(); pg.wait_for_timeout(700)
                text = body(pg)
                check("two presses move the amount by $100", "$550" in text)
                check("the trade-off sentence names category, delta and remaining",
                      "Food" in text and "\u2212$100" in text and "+$100" in text,
                      "expected 'Food \u2212$100 \u2192 Remaining +$100'")
            close = pg.get_by_role("button", name="Close")
            if close.count():
                close.first.click(); pg.wait_for_timeout(400)

        # ---- 9. overspend and recover (US4 scenarios 1 and 2) --------------------
        print("\n9. the river runs dry (US4 scenarios 1 and 2 / FR-012)")
        housing = pg.get_by_role("button", name=re.compile(r"^Housing"))
        if housing.count():
            housing.first.click(); pg.wait_for_timeout(500)
            plus = pg.get_by_role("button", name=re.compile("Increase Housing"))
            presses = 0
            while presses < 12 and "over budget" not in body(pg).lower():
                plus.first.click(); pg.wait_for_timeout(180); presses += 1
            text = body(pg)
            check("overspending is signalled in words, not colour alone (FR-012)",
                  "over budget" in text.lower(), f"after {presses} presses of +$50")
            check("the overspent figure is negative", "\u2212$" in text or "-$" in text)
            # `[role="alert"]` as a CSS selector finds the node in the DOM; it does
            # not tell you the node is in the accessibility tree. The overspend
            # mark renders inside World.tsx's sprite overlay, which is correctly
            # `aria-hidden="true"` because sprites are decorative — so that alert
            # is inert and `get_by_role("alert")` returns nothing. Honey caught it.
            #
            # FR-012 is satisfied by the header, which carries the state as
            # ordinary text outside the overlay. That is what gets asserted.
            reachable = pg.evaluate("""() => {
                const hidden = [...document.querySelectorAll('[aria-hidden="true"]')]
                return [...document.querySelectorAll('*')]
                  .filter(e => e.children.length === 0 && /over budget/i.test(e.textContent || ''))
                  .map(e => ({ hidden: hidden.some(h => h.contains(e)) }))
            }""")
            live_nodes = [n for n in reachable if not n["hidden"]]
            check("the overspent state reaches assistive tech, not just the DOM",
                  len(live_nodes) > 0,
                  f"{len(live_nodes)} of {len(reachable)} 'over budget' nodes outside aria-hidden")

            minus_h = pg.get_by_role("button", name=re.compile("Reduce Housing"))
            for _ in range(presses):
                minus_h.first.click(); pg.wait_for_timeout(180)
            pg.wait_for_timeout(500)
            check("reducing the category clears the warning (US4 scenario 2)",
                  "over budget" not in body(pg).lower())
            close = pg.get_by_role("button", name="Close")
            if close.count():
                close.first.click(); pg.wait_for_timeout(400)

        # ---- 10. no horizontal scroll --------------------------------------------
        print("\n10. layout (SC-008)")
        for w in (390, 320):
            pg.set_viewport_size({"width": w, "height": 844})
            pg.wait_for_timeout(400)
            sw = pg.evaluate("document.documentElement.scrollWidth")
            cw = pg.evaluate("document.documentElement.clientWidth")
            check(f"no horizontal scroll at {w}px", sw <= cw, f"scrollWidth {sw} vs client {cw}")
        pg.set_viewport_size(VIEWPORT)

        # ---- 8. the console ------------------------------------------------------
        print("\n11. console")
        check("no page errors", not page_errors, page_errors[:3])
        check("no console errors", not console_errors, console_errors[:3])

        # ---- 12. reset (US5 scenario 2) ------------------------------------------
        # Last, because it destroys the state every check above reads.
        print("\n12. reset (US5 scenario 2)")
        reset = pg.get_by_role("button", name=re.compile(r"^Reset"))
        if check("a reset control exists", reset.count() > 0):
            reset.first.click()
            pg.wait_for_timeout(900)
            check("reset returns the empty field with no river left over",
                  len(river_shapes(pg)) == 0, f"{len(river_shapes(pg))} shapes remain")
            check("Add Income is offered again",
                  pg.get_by_role("button", name="Add Income").count() > 0)

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
