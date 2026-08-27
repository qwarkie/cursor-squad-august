#!/usr/bin/env python3
"""
The invariants that must hold at *every* width, not just at 390.

`walk_demo.py` walks the demo path at one viewport. That was the right scope
while the app was a phone app, but it means every desktop and tablet regression
is invisible to the 48 checks guarding this repo — and the world is about to
start responding to width. This is the gate for that work.

It deliberately asserts only what is width-*independent*. Layout is allowed to
differ between a phone and a desktop; what is not allowed is a fractional scale,
a stretched world box, a smoothed edge, a trunk that widens downstream, or a
control a thumb cannot hit. Those are wrong at any size.

    python3 scripts/responsive_check.py http://localhost:4173

Needs Playwright's Chromium: pip install playwright && playwright install chromium
"""
import os
import sys
from playwright.sync_api import sync_playwright

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from walk_demo import river_shapes, tappable_height, trunk_widths

WIDTHS = [
    ("phone small", 320, 568),
    ("phone", 390, 844),
    ("tablet portrait", 768, 1024),
    ("tablet landscape", 1024, 768),
    ("laptop", 1440, 900),
    ("desktop", 1920, 1080),
]

failures = []


def note(text):
    print(f"    ....  {text}")


def check(width_name, name, ok, detail=""):
    print(f"    {'PASS' if ok else 'FAIL'}  {name}{'  — ' + str(detail) if detail else ''}")
    if not ok:
        failures.append(f"{width_name}: {name}")
    return bool(ok)


def audit(pg, label):
    """Every assertion here is guarded against passing on an empty screen.

    Three checks in this repo have already been caught green on a page with no
    river on it. `crispEdges` over zero shapes is vacuously true, and so is
    `no round caps`, and so is a monotonic trunk of length 0.
    """
    world = pg.evaluate("""() => {
        const el = document.querySelector('[data-scale]')
        if (!el) return null
        const b = el.getBoundingClientRect()
        const svg = el.querySelector('svg[viewBox]')
        const vb = svg ? svg.getAttribute('viewBox').split(/[ ,]+/).map(Number) : null
        return {
          scale: el.getAttribute('data-scale'),
          w: b.width, h: b.height, left: b.left, right: b.right,
          vbW: vb ? vb[2] : null, vbH: vb ? vb[3] : null,
          overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        }
    }""")

    if not check(label, "the world rendered at all", world is not None,
                 "" if world else "no [data-scale] box — everything below is vacuous"):
        return
    if not check(label, "the world has area", world["w"] > 0 and world["h"] > 0,
                 f"{world['w']}x{world['h']}"):
        return

    raw = world["scale"]
    scale = float(raw)
    check(label, "the scale is a whole number", scale == int(scale) and scale >= 1, raw)

    # Derived from the SVG's own viewBox rather than a hardcoded 96x128: the
    # world is expected to get wider, and a constant here would start failing
    # on correct work the day it does.
    if world["vbW"]:
        exp_w, exp_h = world["vbW"] * scale, world["vbH"] * scale
        check(label, "the box is exactly viewBox x scale — not stretched to fit",
              abs(world["w"] - exp_w) < 1 and abs(world["h"] - exp_h) < 1,
              f"{round(world['w'])}x{round(world['h'])} vs {round(exp_w)}x{round(exp_h)}")
    else:
        check(label, "the world exposes a viewBox to measure against", False,
              "no svg[viewBox] inside the world box")

    # `scrollWidth - clientWidth` is structurally incapable of catching content
    # pushed off the right edge here: App's root carries `overflow-x-hidden`, so
    # anything past the edge is CLIPPED, not scrolled, and scrollWidth reads back
    # the viewport width however far out the content went. This check was green
    # at 1440 on 465ee26 while the right third of the rail — amounts, Undo and
    # Reset — was off the screen. @Honey found that in a screenshot. Kept because
    # a genuine scroll is still worth knowing about; it is no longer trusted to
    # answer the question below it.
    check(label, "nothing spills sideways", world["overflowX"] <= 1,
          f"{world['overflowX']}px of horizontal overflow")

    # The question that one could not express: is every control still ON the
    # screen? Controls inside the world are excluded — the world is deliberately
    # bigger than its frame once it pans, and its own targets travel with it.
    off = pg.evaluate("""() => {
        const out = []
        for (const el of document.querySelectorAll('button, [role=button], input')) {
          if (el.closest('[data-scale]')) continue
          const r = el.getBoundingClientRect()
          if (r.width <= 0 || r.height <= 0) continue
          if (r.left < -1 || r.right > innerWidth + 1) {
            const n = (el.getAttribute('aria-label') || el.textContent || el.tagName).trim()
            out.push(`${n.slice(0, 18)} @${Math.round(r.left)}..${Math.round(r.right)}`)
          }
        }
        return out
    }""")
    check(label, "every control is on the screen, not clipped off the edge",
          not off, off or f"all within 0..{pg.viewport_size['width']}")
    check(label, "the world is on screen", world["right"] > 0 and world["left"] < pg.viewport_size["width"],
          f"left {round(world['left'])} right {round(world['right'])}")

    shapes = [s for s in river_shapes(pg) if s["width"] > 0]
    if not check(label, "there are river shapes to judge", len(shapes) >= 3, f"{len(shapes)} shapes"):
        return
    soft = [s["rendering"] for s in shapes if s["rendering"] != "crispedges"]
    check(label, "every river shape is crisp", not soft, f"{len(soft)} smoothed: {set(soft)}")
    round_caps = [s for s in shapes if s["linecap"] == "round"]
    check(label, "no round caps — this is a pixel river", not round_caps, f"{len(round_caps)}")

    trunk = trunk_widths(pg)
    if check(label, "the trunk was measured", len(trunk) >= 2, f"{[round(w) for w in trunk]}"):
        widens = [(a, b) for a, b in zip(trunk, trunk[1:]) if b > a]
        check(label, "the trunk never widens downstream", not widens, widens or "monotonic")

    # Measured the way a tap resolves, not by the box: a control that expands
    # its hit area with a pseudo-element reports the text height in its rect and
    # would be flagged here wrongly. Batched into one evaluate so the selector
    # round-trip does not multiply by six viewports.
    small = pg.evaluate("""() => {
        const out = []
        const covered = []
        for (const el of document.querySelectorAll('button, [role=button], input')) {
          const r = el.getBoundingClientRect()
          if (r.width <= 0 || r.height <= 0) continue
          const cx = Math.round(r.left + r.width / 2)
          const cy = Math.round(r.top + r.height / 2)
          const hits = (y) => { const t = document.elementFromPoint(cx, y)
                                return !!t && (t === el || el.contains(t)) }
          let tappable = 0
          if (hits(cy)) {
            let top = cy, bottom = cy
            while (top - 1 >= 0 && hits(top - 1)) top -= 1
            while (bottom + 1 < innerHeight && hits(bottom + 1)) bottom += 1
            tappable = bottom - top + 1
          }
          const name = (el.getAttribute('aria-label') || el.getAttribute('data-world-touch')
                        || el.textContent || el.tagName).trim()
          // Two different failures, and `Math.max` used to merge them into one
          // that could not fail: a control painted over reports tappable 0, and
          // the rect height rescued it. @Honey's rail covered all three zoom
          // buttons at 1440 while every rect check stayed green.
          // Only meaningful for a point that is actually on the screen:
          // `elementFromPoint` returns null outside the viewport, so a row
          // below the fold looks exactly like a row painted over. Reported as
          // occlusion, that fires on every correct build at every width — the
          // cry-wolf failure. Off-screen is a different question and the
          // on-screen check above already asks it.
          const onScreen = cx >= 0 && cx < innerWidth && cy >= 0 && cy < innerHeight
          if (onScreen && tappable === 0) {
            const over = document.elementFromPoint(cx, cy)
            const overName = over ? (over.getAttribute('aria-label') || over.tagName) : 'nothing'
            covered.push(`${name.slice(0, 18)} <- ${overName.slice(0, 14)}`)
          }
          else if (Math.max(r.height, tappable) < 44) {
            out.push(`${name.slice(0, 20)} ${Math.round(Math.max(r.height, tappable))}px`)
          }
        }
        return { small: out, covered }
    }""")
    really_small = small["small"]

    # Occlusion, decided in one pass over live element references.
    #
    # An earlier version detected covered controls in one evaluate and then
    # re-found them by name in another to test whether scrolling freed them.
    # Matching by name is a heuristic, and worse, "not found" and "still
    # covered" both came back `false` — so a lookup miss was reported as a hard
    # defect. Three of those at 1024/1440/1920 turned out to be nothing at all.
    # Nothing leaves the browser now except the verdict.
    occ = pg.evaluate("""() => {
        const hard = [], soft = []
        const y0 = scrollY
        const reaches = (el) => {
          const r = el.getBoundingClientRect()
          const cx = Math.round(r.left + r.width / 2)
          const cy = Math.round(r.top + r.height / 2)
          if (cx < 0 || cx >= innerWidth || cy < 0 || cy >= innerHeight) return null
          const hit = document.elementFromPoint(cx, cy)
          return { ok: !!hit && (hit === el || el.contains(hit)), node: hit,
                   over: hit ? (hit.getAttribute('aria-label') ||
                                hit.getAttribute('data-world-touch') || hit.tagName) : 'nothing' }
        }
        for (const el of document.querySelectorAll('button, [role=button], input')) {
          const r = el.getBoundingClientRect()
          if (r.width <= 0 || r.height <= 0) continue
          const first = reaches(el)
          if (!first || first.ok) continue          // off screen, or fine
          // World targets used to be skipped wholesale, which left the world's
          // own controls with no occlusion gate at all — and that is where the
          // rail landed on #66's Housing village. The right exclusion was
          // "outside the viewport", which `reaches` already applies. What is
          // still legitimate is the world overlapping itself, so only a cover
          // from OUTSIDE the world counts against it.
          if (el.closest('[data-scale]') && first.node && first.node.closest('[data-scale]')) continue
          const name = (el.getAttribute('aria-label') || el.getAttribute('data-world-touch')
                        || el.textContent || el.tagName).trim()
          // Page scroll only — NEVER scrollIntoView. That scrolls the nearest
          // scrollable ancestor, which for a world target is the world's own
          // frame, and `scrollTo(0, y0)` restores the page but not that. The
          // measurement then changed what it was measuring: after probing one
          // covered village, all three zoom controls read COVERED on a build
          // where a clean page says they are reachable. I nearly reported
          // @Honey's just-fixed controls as broken again.
          const want = scrollY + (r.top + r.height / 2) - innerHeight / 2
          scrollTo(0, Math.max(0, want))
          const after = reaches(el)
          const entry = `${name.slice(0, 20)} <- ${first.over.slice(0, 14)}`
          if (after && after.ok) soft.push(entry)
          else hard.push(entry)
          scrollTo(0, y0)
        }
        scrollTo(0, y0)
        return { hard, soft }
    }""")
    check(label, "no control stays covered even after scrolling", not occ["hard"],
          occ["hard"] or "nothing stays covered")
    # Reported, not failed. A scrollable list under a fixed bar overlaps at rest
    # by design — that is what the bar's clearance padding is for — so failing
    # here would fire on every correct build and get the whole gate ignored.
    # Worth printing because "covered until you happen to scroll" is still how a
    # control goes unnoticed, and only a person can say which case it is.
    for entry in occ["soft"]:
        note(f"covered on arrival, a scroll frees it: {entry}")

    check(label, "every control clears 44px", not really_small, really_small or "all clear")


def main():
    if len(sys.argv) < 2:
        print("usage: python3 scripts/responsive_check.py <url>")
        sys.exit(2)
    url = sys.argv[1]
    with sync_playwright() as p:
        br = p.chromium.launch()
        for label, w, h in WIDTHS:
            print(f"\n{label}  {w}x{h}")
            pg = br.new_page(viewport={"width": w, "height": h}, has_touch=True,
                             reduced_motion="reduce")
            try:
                pg.goto(url, wait_until="networkidle")
                demo = pg.get_by_role("button", name="Load demo budget")
                if demo.count():
                    demo.first.click()
                    pg.wait_for_timeout(350)
                elif pg.locator("main ul li button").count() == 0:
                    check(label, "there is a budget to draw", False,
                          "no demo control and no categories — the run below would be vacuous")
                    pg.close()
                    continue
                audit(pg, label)
            except Exception as exc:
                check(label, "the page survived the walk", False, f"{type(exc).__name__}: {exc}")
            pg.close()
        br.close()

    print(f"\n{'=' * 60}")
    if failures:
        print(f"FAILED ({len(failures)}):")
        for f in failures:
            print(f"  - {f}")
        sys.exit(1)
    print("every width holds the invariants")
    sys.exit(0)


if __name__ == "__main__":
    main()
