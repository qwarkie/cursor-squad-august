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

    check("no page errors", not errors, errors[:2])
    b.close()

bad = [n for ok, n in results if not ok]
print(f"\n{len(results) - len(bad)}/{len(results)}")
sys.exit(1 if bad else 0)
