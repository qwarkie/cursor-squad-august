"""Measures rename + undo against a running build. Exits non-zero on any red."""
import sys
from playwright.sync_api import sync_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:4290"
results = []

def check(name, ok, detail=""):
    results.append((bool(ok), name))
    print(f"  {'PASS' if ok else 'FAIL'}  {name}{'  — ' + str(detail) if detail else ''}")

with sync_playwright() as pw:
    b = pw.chromium.launch()
    page = b.new_page(viewport={"width": 390, "height": 844})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(URL, wait_until="networkidle")
    page.evaluate("localStorage.clear()")
    page.reload(wait_until="networkidle")

    # --- the trade-off row must not move the world, ever ---
    WORLD_OFFSET = ("() => { const s = document.querySelector('svg');"
                    " return s ? s.getBoundingClientRect().top + scrollY : null }")
    page.get_by_role("button", name="Load demo budget").click()
    page.wait_for_timeout(500)
    world_before = page.evaluate(WORLD_OFFSET)

    # The fixture has to be in place before any of this means anything: five
    # rows loaded means the demo button worked and this really is Money River.
    # A red that fires before the feature is ever reached proves nothing about
    # the feature.
    rows = page.evaluate("document.querySelectorAll('main ul li').length")
    if rows != 5:
        print(f"  STOP  the seeded month did not load ({rows} rows) — fixture, not feature")
        b.close()
        sys.exit(2)

    undo = page.locator("[data-undo]")
    if undo.count() == 0:
        check("an Undo control exists", False,
              "absent from the served build — this build predates the feature")
        print(f"\n0/1  (stopped: nothing to measure)")
        b.close()
        sys.exit(1)
    check("an Undo control exists", undo.count() == 1)
    check("it is enabled once there is a step back", undo.is_enabled(),
          f"aria-label={undo.get_attribute('aria-label')!r}")

    def undo_box():
        return page.evaluate("""() => { const el = document.querySelector('[data-undo]');
            if (!el) return null; const r = el.getBoundingClientRect();
            return {top:r.top, bottom:r.bottom, w:r.width, h:r.height,
                    inViewport: r.bottom > 0 && r.top < innerHeight} }""")

    box = undo_box()
    check("its touch target is >= 44px, hit-tested", box["w"] >= 44 and box["h"] >= 44,
          f"{box['w']:.0f}x{box['h']:.0f}")

    # --- rename ---
    page.get_by_role("button", name="Entertainment").first.click()
    page.wait_for_timeout(400)
    name_field = page.get_by_label("Category name")
    check("the sheet title is an editable field", name_field.count() == 1,
          f"value={name_field.input_value()!r}")

    box = name_field.bounding_box()
    check("the rename target is >= 44px tall (hit-tested)", box["height"] >= 44,
          f"{box['width']:.0f}x{box['height']:.0f}")

    sheet_h_before = page.evaluate(
        "document.querySelector('.sheet-in').getBoundingClientRect().height")

    name_field.fill("")
    name_field.type("Fun", delay=30)
    page.wait_for_timeout(300)
    labels = page.evaluate(
        "[...document.querySelectorAll('main ul li button span.truncate')].map(e => e.textContent)")
    check("the list shows the new name", "Fun" in labels, labels)
    check("renaming did not move the category", labels.index("Fun") == 3 if "Fun" in labels else False,
          f"index {labels.index('Fun') if 'Fun' in labels else '-'} of {labels}")

    sheet_h_after = page.evaluate(
        "document.querySelector('.sheet-in').getBoundingClientRect().height")
    check("the sheet did not grow a row", abs(sheet_h_after - sheet_h_before) < 1,
          f"{sheet_h_before:.0f} -> {sheet_h_after:.0f}")

    # rename must not disturb geometry — the amounts are untouched
    remaining = page.evaluate(
        "[...document.querySelectorAll('header span')].map(e=>e.textContent).join('|')")
    check("the figures are unchanged by a rename", "$0" in remaining, remaining[:90])

    # --- undo the rename ---
    page.locator("[data-undo]").click()
    page.wait_for_timeout(400)
    labels = page.evaluate(
        "[...document.querySelectorAll('main ul li button span.truncate')].map(e => e.textContent)")
    check("undo restores the old name in one step, not per keystroke",
          "Entertainment" in labels and "Fun" not in labels, labels)
    check("the open sheet followed the undo",
          page.get_by_label("Category name").input_value() == "Entertainment"
          if page.get_by_label("Category name").count() else True)

    # --- undo a remove: the sharpest hole ---
    page.get_by_role("button", name="Close").click()
    page.wait_for_timeout(300)
    page.get_by_role("button", name="Transport").first.click()
    page.wait_for_timeout(400)
    page.get_by_role("button", name="Remove Transport").click()
    page.wait_for_timeout(400)
    labels = page.evaluate(
        "[...document.querySelectorAll('main ul li button span.truncate')].map(e => e.textContent)")
    check("remove really removed it", "Transport" not in labels, labels)
    # Presence is not reachability, and this is the check that was wrong.
    # In the trade-off row above the world, Undo passed a DOM query and sat at
    # top:-72 — off the screen, because removing leaves the page scrolled down
    # at the list. A control you cannot see is worse than one that is missing:
    # it reports as shipped. Assert the viewport, not the document.
    box = undo_box()
    check("Undo is ON SCREEN at the moment you would reach for it",
          box["inViewport"],
          f"top {box['top']:.0f}, bottom {box['bottom']:.0f} in an {page.viewport_size['height']}px viewport")

    page.locator("[data-undo]").click()
    page.wait_for_timeout(500)
    labels = page.evaluate(
        "[...document.querySelectorAll('main ul li button span.truncate')].map(e => e.textContent)")
    check("undo brings the category back IN ITS OLD POSITION",
          labels == ["Housing", "Food", "Transport", "Entertainment", "Savings"], labels)

    # --- the world must not have shifted through any of it ---
    world_after = page.evaluate(WORLD_OFFSET)
    # Document-relative on both reads. The page is scrolled by this point,
    # so viewport-relative tops describe two different origins — correct
    # arithmetic on the wrong quantity.
    check("the world never moved through any of it",
          abs(world_after - world_before) < 1, f"{world_before:.1f} -> {world_after:.1f}")

    # Three buttons in a bar built for two.
    bar = page.evaluate("""() => [...document.querySelectorAll('.fixed.inset-x-0.bottom-0 button')]
        .map(b => ({label: b.textContent.trim(), w: Math.round(b.getBoundingClientRect().width),
                    h: Math.round(b.getBoundingClientRect().height)}))""")
    check("every action-bar button is still >= 44px wide and tall",
          all(b["w"] >= 44 and b["h"] >= 44 for b in bar), bar)

    # --- undo the reset ---
    page.on("dialog", lambda d: d.accept())
    page.get_by_role("button", name="Reset").click()
    page.wait_for_timeout(500)
    check("reset emptied the field",
          page.get_by_role("button", name="Add Income").count() == 1)
    check("Undo is reachable from the empty field after a reset",
          page.locator("[data-undo]").count() == 1,
          page.locator("[data-undo]").get_attribute("aria-label") if page.locator("[data-undo]").count() else "absent")
    page.locator("[data-undo]").click()
    page.wait_for_timeout(500)
    labels = page.evaluate(
        "[...document.querySelectorAll('main ul li button span.truncate')].map(e => e.textContent)")
    check("undoing the reset brings the whole month back",
          labels == ["Housing", "Food", "Transport", "Entertainment", "Savings"], labels)

    # And the opening frame must stay bare for someone arriving for the first
    # time — the control is absent, not present and greyed out.
    page.evaluate("localStorage.clear()")
    page.reload(wait_until="networkidle")
    page.wait_for_timeout(300)
    check("a genuine first load shows no Undo at all",
          page.locator("[data-undo]").count() == 0
          and page.get_by_role("button", name="Add Income").count() == 1)

    # --- the list must clear the open sheet, whatever anyone adds to it ---
    # This was two hardcoded numbers and they went stale the moment the sheet
    # grew reorder controls: a 378px sheet against a 360px clearance hid the
    # last category by 2px. Measured per kind, because an expense sheet carries
    # an icon picker a savings one does not.
    page.evaluate("localStorage.clear()"); page.reload(wait_until="networkidle")
    page.set_viewport_size({"width": 390, "height": 844})
    page.get_by_role("button", name="Load demo budget").click(); page.wait_for_timeout(400)
    for target, kind in (("Savings", "savings"), ("Entertainment", "expense")):
        page.get_by_role("button", name=target).first.click(); page.wait_for_timeout(500)
        sheet_top = page.evaluate("document.querySelector('.sheet-in').getBoundingClientRect().top")
        sheet_h = page.evaluate("document.querySelector('.sheet-in').getBoundingClientRect().height")
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)"); page.wait_for_timeout(400)
        bottom = page.evaluate(
            "[...document.querySelectorAll('main ul li')].at(-1).getBoundingClientRect().bottom")
        check(f"the last category clears the {kind} sheet",
              bottom <= sheet_top + 0.5,
              f"sheet {sheet_h:.0f}px tall, last row bottom {bottom:.0f} vs sheet top {sheet_top:.0f}")
        page.get_by_role("button", name="Close").click(); page.wait_for_timeout(300)

    # --- no horizontal scroll at 390 and 320 ---
    for w in (390, 320):
        page.set_viewport_size({"width": w, "height": 844})
        page.wait_for_timeout(300)
        over = page.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth")
        check(f"no horizontal scroll at {w}px", not over)

    # --- the desktop chrome: one column of controls, not a stretched phone ---
    # At 1440x900 this was a 1440px-wide action bar with two 700px buttons, the
    # category list 894px down (below the fold on a 768px laptop) and a 1270px
    # document in a 900px window. The world is Pollen's lane and is deliberately
    # not asserted here — only the chrome around it.
    for w, h in ((1440, 900), (1024, 768)):
        page.set_viewport_size({"width": w, "height": h})
        page.evaluate("localStorage.clear()"); page.reload(wait_until="networkidle")
        page.get_by_role("button", name="Load demo budget").click(); page.wait_for_timeout(500)
        m = page.evaluate("""() => {
          const bar = document.querySelector('[data-actions]');
          const br = bar.getBoundingClientRect();
          const lr = document.querySelector('main ul').getBoundingClientRect();
          const wr = document.querySelector('svg').getBoundingClientRect();
          return {barW: br.width, barLeft: br.left, listTop: lr.top, worldH: wr.height,
                  vw: innerWidth, vh: innerHeight,
                  doc: document.documentElement.scrollHeight,
                  btns: [...bar.querySelectorAll('button')].map(b => Math.round(b.getBoundingClientRect().width))}
        }""")
        # `scrollWidth > clientWidth` cannot see this. App's root carries
        # `overflow-x-hidden`, so anything pushed past the right edge is
        # CLIPPED rather than scrolled: scrollWidth reads exactly the viewport
        # width while the rail sits 206px off-screen. The no-horizontal-scroll
        # check passed on a layout with the category amounts and the Reset
        # button cut off. Ask each element where its right edge is instead.
        for name, sel in (("category list", "main ul"), ("actions", "[data-actions]")):
            r = page.evaluate(
                "sel => { const b = document.querySelector(sel).getBoundingClientRect();"
                " return {left: b.left, right: b.right} }", sel)
            check(f"{w}: the {name} is inside the window",
                  r["right"] <= m["vw"] + 0.5 and r["left"] >= -0.5,
                  f"spans {r['left']:.0f}..{r['right']:.0f} in {m['vw']}px")

        check(f"{w}: the actions do not span the viewport",
              m["barW"] < m["vw"] * 0.5, f"bar {m['barW']:.0f} of {m['vw']} — {m['btns']}")
        check(f"{w}: the category list is above the fold",
              m["listTop"] < m["vh"], f"list top {m['listTop']:.0f} in {m['vh']}px")
        # Two different failures produce one overflow, and only one of them is
        # the chrome's. The world is a fixed 96x128 art grid at an integer
        # scale; at 1024x768 it alone stands 768px tall and nothing the layout
        # does around it can make the page fit. Attribute it, or this red gets
        # read as "the desktop layout is broken" against a rail that fits.
        chrome = m["doc"] - m["worldH"]
        if m["doc"] > m["vh"] + 1 and m["worldH"] >= m["vh"]:
            check(f"{w}: the chrome fits the window", chrome <= m["vh"] + 1,
                  f"chrome {chrome:.0f}px fits, but the world is {m['worldH']:.0f}px "
                  f"tall in a {m['vh']}px window — the world's own scale, not this layout "
                  f"(fit-don't-cap is #68, world/World.tsx)")
        else:
            check(f"{w}: the page fits the window", m["doc"] <= m["vh"] + 1,
                  f"document {m['doc']}px in {m['vh']}px")
        # Exactly one of each control, whatever the CSS is hiding.
        page.get_by_role("button", name="Food").first.click(); page.wait_for_timeout(500)
        sr = page.evaluate("document.querySelector('.sheet-in').getBoundingClientRect().width")
        check(f"{w}: the sheet docks rather than spanning the screen",
              sr < m["vw"] * 0.5, f"sheet {sr:.0f} of {m['vw']}")
        # The controls rail floats over the field from `lg`. Ask the browser
        # what is actually under each world control's centre — a rect check
        # says all three are on screen at 44x44 and says nothing about the
        # panel sitting on top of them, which is exactly what happened: they
        # rendered, they measured, and elementFromPoint returned the panel.
        occluded = page.evaluate("""() => {
          const names = ['Zoom out', 'Zoom in', 'Fit'];
          return [...document.querySelectorAll('button[aria-label]')]
            .filter(b => names.some(n => b.getAttribute('aria-label').startsWith(n)))
            .map(b => {
              const r = b.getBoundingClientRect();
              const hit = document.elementFromPoint((r.left+r.right)/2, (r.top+r.bottom)/2);
              return {label: b.getAttribute('aria-label').slice(0, 20),
                      reached: hit === b || b.contains(hit)};
            });
        }""")
        check(f"{w}: every world control is clickable, not just present",
              len(occluded) > 0 and all(c["reached"] for c in occluded),
              occluded if occluded else "no zoom/fit controls found")

        check(f"{w}: exactly one Undo control in the DOM",
              page.locator("[data-undo]").count() == 1,
              page.locator("[data-undo]").count())
        page.get_by_role("button", name="Close").click(); page.wait_for_timeout(300)

    check("no page errors", not errors, errors[:2])
    b.close()

bad = [n for ok, n in results if not ok]
print(f"\n{len(results) - len(bad)}/{len(results)}")
sys.exit(1 if bad else 0)
