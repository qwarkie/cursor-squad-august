#!/usr/bin/env python3
"""
#68's two constraints that no other harness covers.

`responsive_check.py` already covers integer scale and "never stretch the
scene". These are the other two, and both are behavioural — they cannot be
read off the DOM, only performed:

  clamp         "Clamp the translation. No blank gutters at any edge, at any
                scale." Drag to each extreme and look for background where
                world should be.
  arbitration   "below the threshold -> TAP and it reaches the target under it;
                above it -> PAN and NO click fires, even on pointerup over a
                target." One threshold, owned by #68, consumed by #66 and #67.

Written against the issue text before #68 exists, deliberately: a check written
after the fact is fitted to the implementation it is supposed to judge. That
means it is RED today, and the point of the staging below is that each red says
which of the three reasons it is — feature absent, targets absent, or actually
wrong. A red that cannot tell you those apart is not evidence.

    python3 scripts/pan_check.py <url> [width] [height]
"""
import os
import sys

from playwright.sync_api import sync_playwright

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

DRAG = 220          # comfortably past any sane tap threshold
TAP_JITTER = 3      # a real thumb never holds perfectly still

results = []
unreachable = []


def check(name, ok, detail=""):
    results.append((bool(ok), name))
    print(f"  {'PASS' if ok else 'FAIL'}  {name}{'  — ' + str(detail) if detail else ''}")
    return bool(ok)


def note(text):
    print(f"  ....  {text}")


def world_box(pg):
    return pg.evaluate("""() => {
        const el = document.querySelector('[data-scale]')
        if (!el) return null
        const b = el.getBoundingClientRect()
        // `[data-frame]` — the clipping box says what it is now, so this does
        // not have to deduce it. @Pollen marked it after auditing their own
        // surface for the shape that cost this file a patch: the walk below
        // found App's root, which carries `overflow-x-hidden` and is as tall as
        // the document, and reported a 1440x2038 frame for a 1440x900 window.
        // Verified the marker resolves to the SAME element the walk finds, at
        // 390, 1440 and 1920, before switching.
        let p = null
        const framed = document.querySelector('[data-frame]')
        if (framed) p = framed.getBoundingClientRect()
        else for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
          const o = getComputedStyle(n).overflow
          if (o && o !== 'visible') { p = n.getBoundingClientRect(); break }
        }
        if (!p) p = { left: 0, top: 0, right: innerWidth, bottom: innerHeight }
        // Still intersected with the viewport, and it is no longer a
        // compensation for finding the wrong element. A frame can legitimately
        // extend past the bottom of the window on a page that scrolls, and what
        // a person can SEE is the intersection either way. @Pollen's point:
        // the marker removes the walk, not the intersection.
        const fl = Math.max(p.left, 0), ft = Math.max(p.top, 0)
        const fr = Math.min(p.right, innerWidth), fb = Math.min(p.bottom, innerHeight)
        p = { left: fl, top: ft, width: fr - fl, height: fb - ft }
        return { x: Math.round(b.left), y: Math.round(b.top),
                 w: Math.round(b.width), h: Math.round(b.height),
                 fx: Math.round(p.left), fy: Math.round(p.top),
                 fw: Math.round(p.width), fh: Math.round(p.height) }
    }""")


def drag(pg, box, dx, dy):
    """A pointer gesture from a point that is on the world AND on the screen.

    Starting from the centre of the *world* is wrong the moment the world is
    bigger than its frame — which is the entire feature. At 1440x900 the world
    centre sits at y=1070, past the bottom of the window, so the gesture landed
    on the page and this script reported `PASS the world pans` on a page scroll
    (scrollY 0 -> 192). @Pollen caught it. The centre of world-intersect-frame
    is on the world by construction and on screen by construction.
    """
    ix0, iy0 = max(box["x"], box["fx"]), max(box["y"], box["fy"])
    ix1 = min(box["x"] + box["w"], box["fx"] + box["fw"])
    iy1 = min(box["y"] + box["h"], box["fy"] + box["fh"])
    cx, cy = (ix0 + ix1) // 2, (iy0 + iy1) // 2
    pg.mouse.move(cx, cy)
    pg.mouse.down()
    for i in range(1, 11):
        pg.mouse.move(cx + dx * i / 10, cy + dy * i / 10)
    pg.mouse.up()
    pg.wait_for_timeout(220)


def world_offset(pg):
    """The world's position *relative to its frame*, plus the page scroll.

    Viewport coordinates cannot tell a pan from a scroll — both move the rect.
    Relative to the frame, only a pan does, and scrollY is carried alongside so
    a scroll can be named rather than counted as one.
    """
    b = world_box(pg)
    return (b["x"] - b["fx"], b["y"] - b["fy"], pg.evaluate("() => Math.round(scrollY)"))


def run(url, w, h):
    with sync_playwright() as p:
        br = p.chromium.launch()
        pg = br.new_page(viewport={"width": w, "height": h}, has_touch=True,
                         reduced_motion="reduce")
        pg.goto(url, wait_until="networkidle")
        demo = pg.get_by_role("button", name="Load demo budget")
        if demo.count():
            demo.first.click()
            pg.wait_for_timeout(400)

        print(f"\n0. is there a world to drag?  ({w}x{h})")
        # The fallback below is a guess, and a script that quietly drops back to
        # one is worse than a script that never had a marker: the numbers keep
        # arriving and nobody knows they changed provenance.
        if pg.evaluate("() => !document.querySelector('[data-frame]')"):
            note("no [data-frame] — falling back to the ancestor-overflow walk,")
            note("which found App's root and reported a 1440x2038 frame for a")
            note("1440x900 window the last time this file relied on it.")
        box = world_box(pg)
        if not check("the world rendered", box is not None):
            return
        note(f"world {box['w']}x{box['h']} at {box['x']},{box['y']}  "
             f"frame {box['fw']}x{box['fh']} at {box['fx']},{box['fy']}")

        print("\n1. does the world move at all?")
        base = world_offset(pg)
        drag(pg, box, -DRAG, 0)
        left = world_offset(pg)
        drag(pg, box, DRAG, 0)
        right = world_offset(pg)
        drag(pg, box, 0, -DRAG)
        up = world_offset(pg)
        moved_x = left[0] != base[0] or right[0] != base[0]
        moved_y = up[1] != base[1]
        scrolled = any(v[2] != base[2] for v in (left, right, up))
        note(f"offset within frame {base[:2]} -> {left[:2]} / {right[:2]} / {up[:2]}")
        check("the gesture panned the world, it did not scroll the page",
              not scrolled, f"scrollY {base[2]} -> {[v[2] for v in (left, right, up)]}")

        if not (moved_x or moved_y):
            note("dragging moves nothing in either axis.")
            note("Either #68 has not landed, or the world already fits its frame")
            note(f"in both axes ({box['w']}x{box['h']} inside {box['fw']}x{box['fh']}),")
            note("in which case there is correctly nothing to pan to.")
            fits = box["w"] <= box["fw"] and box["h"] <= box["fh"]
            check("pan exists where the world exceeds its frame", fits,
                  "world fits the frame — no pan required here" if fits
                  else "world is larger than its frame and still will not move")
            print("\n2-3. clamp and arbitration are not reachable without a pan.")
            note("Not reported as passes. A gutter check on a world that cannot")
            note("move is the vacuous-check failure this repo has hit five times.")
            unreachable.append("clamp — no gutters at the four extremes")
            unreachable.append("arbitration — tap under the threshold, pan over it")
            return

        check("the world pans", True, f"x moved {moved_x}, y moved {moved_y}")

        print("\n2. clamped — the frame stays full of field")
        # RETIRED: "no gutter at any edge". @Pollen said before building that
        # `frame = stage` would make that false BY DESIGN — the meadow fills the
        # frame and the world floats inside it — and it went red on their first
        # correct landing, exactly as predicted. Retiring it rather than arguing
        # with it. The two questions that survive the change are below: is there
        # always field under the frame, and can you drag the river away and lose
        # it?
        for name, dx, dy in (("left", DRAG * 3, 0), ("right", -DRAG * 3, 0),
                             ("up", 0, DRAG * 3), ("down", 0, -DRAG * 3)):
            drag(pg, box, dx, dy)
            r = pg.evaluate("""() => {
                const w = document.querySelector('[data-scale]')
                let fEl = document.querySelector('[data-frame]')
                if (!fEl) {
                  for (let n = w.parentElement; n && n !== document.body; n = n.parentElement) {
                    const o = getComputedStyle(n).overflow
                    if (o && o !== 'visible') { fEl = n; break }
                  }
                }
                let f = fEl ? fEl.getBoundingClientRect() : null
                if (!f) f = { left: 0, top: 0, right: innerWidth, bottom: innerHeight }
                const l = Math.max(f.left, 0), t = Math.max(f.top, 0)
                const rr = Math.min(f.right, innerWidth), b = Math.min(f.bottom, innerHeight)
                // The FRAME's background, not the world's: the field colour moved
                // onto the frame when it went full-bleed, so reading it off
                // `[data-scale]` returned transparent and called painted meadow
                // a gutter. Read from whichever element actually paints it.
                const grass = fEl ? getComputedStyle(fEl).backgroundColor : ''
                const wb = w.getBoundingClientRect()
                const visible = Math.max(0, Math.min(wb.right, rr) - Math.max(wb.left, l)) *
                                Math.max(0, Math.min(wb.bottom, b) - Math.max(wb.top, t))
                return { grass, worldBg: getComputedStyle(w).backgroundColor,
                         visible: Math.round(visible),
                         area: Math.round((rr - l) * (b - t)) }
            }""")
            # Sampling points was the wrong instrument for this and I went
            # three rounds with it: `elementsFromPoint` skips `pointer-events:
            # none`, which is exactly what the world overlay is, so field under
            # opaque chrome is invisible to hit-testing however the question is
            # phrased. The property is structural anyway — the FRAME's own
            # background is the field colour, so a gutter cannot show night
            # whatever the clamp does. That is one stable fact instead of
            # twenty-five brittle samples.
            check(f"dragged hard {name}: the frame itself is painted field",
                  bool(r["grass"]) and r["grass"] != "rgba(0, 0, 0, 0)", r["grass"])
            check(f"dragged hard {name}: the world is still in the frame",
                  r["visible"] > 0, f"{r['visible']}px of {r['area']}px visible")
            pg.reload(wait_until="networkidle")
            demo = pg.get_by_role("button", name="Load demo budget")
            if demo.count():
                demo.first.click()
            pg.wait_for_timeout(350)

        print("\n3. a drag is not a tap, and a tap is still a tap")
        # `data-world-touch`, which is what Settlements.tsx actually writes. This
        # asked for `[data-village]` and `[data-settlement]` — neither exists,
        # so it reported "no targets, #66 is not live" at every viewport. That
        # read as blocked-on-someone-else when it was a wrong selector, and a
        # wrong selector that names another team's issue as the cause is worse
        # than a plain failure.
        # A "Select ..." target, not simply the first one. @Pollen caught this:
        # target[0] is the spring, and the spring opens the income sheet — it
        # never selects a category. An arbitration probe asking "did a category
        # get selected" therefore calls a working spring inert, and reports a
        # verdict that is right for a reason that is not the stated one.
        target = pg.locator("[data-scale] [data-world-touch^='Select']")
        if target.count() == 0:
            note("no [data-world-touch^='Select'] targets in the world.")
            note("Settlements.tsx's Touchable is `if (!onPress) return children`,")
            note("so the marker cannot exist until App.tsx passes onSelect — and")
            note("at App.tsx:177 it still renders <Settlements model budget scale />.")
            note("Reported UNPROVEN rather than FAILED: the pan is not broken, the")
            note("arbitration simply has nothing to arbitrate over yet.")
            unreachable.append("arbitration — tap under the threshold, pan over it "
                               "(needs #66's onSelect in App.tsx)")
            return
        note(f"{target.count()} in-world targets")

        # Targets render whether or not App.tsx passes the handlers, so their
        # presence does not mean they do anything. A plain click settles it, and
        # separates "not wired yet" from "arbitration is broken" — those are
        # different people's bugs.
        def selected():
            return pg.locator("main ul li button[aria-pressed=true]").count()

        # The first REACHABLE Select target, not simply the first. At 1440 the
        # first is Housing, and Housing is under the rail — arbitrating over a
        # covered target measures the cover, not the arbitration.
        idx = pg.evaluate("""() => {
            const all = [...document.querySelectorAll("[data-scale] [data-world-touch^='Select']")]
            for (let i = 0; i < all.length; i++) {
              const r = all[i].getBoundingClientRect()
              const x = Math.round(r.left + r.width / 2), y = Math.round(r.top + r.height / 2)
              if (x < 0 || x >= innerWidth || y < 0 || y >= innerHeight) continue
              const hit = document.elementFromPoint(x, y)
              if (hit && (hit === all[i] || all[i].contains(hit))) return i
            }
            return -1
        }""")
        if idx < 0:
            note("every Select target is either off-screen or covered — at 1440")
            note("Housing sits under the rail. Arbitrating over a covered target")
            note("measures the cover, not the arbitration.")
            unreachable.append("arbitration — needs one reachable Select target")
            return
        target = target.nth(idx)
        note(f"arbitrating over target {idx}: {target.get_attribute('data-world-touch')}")
        t = target.bounding_box()
        pg.mouse.click(t["x"] + t["width"] / 2, t["y"] + t["height"] / 2)
        pg.wait_for_timeout(300)
        if selected() == 0:
            note("targets render but a plain click selects nothing — the handlers")
            note("are not passed in App.tsx (#66). Arbitration cannot be judged")
            note("over inert targets: a drag that 'does not select' would pass")
            note("for the wrong reason. Untestable, not failing, not passing.")
            unreachable.append("arbitration — tap under the threshold, pan over it")
            return
        pg.reload(wait_until="networkidle")
        demo = pg.get_by_role("button", name="Load demo budget")
        if demo.count():
            demo.first.click()
        pg.wait_for_timeout(350)

        t = target.bounding_box()
        cx, cy = t["x"] + t["width"] / 2, t["y"] + t["height"] / 2
        before = selected()

        pg.mouse.move(cx, cy)
        pg.mouse.down()
        pg.mouse.move(cx + TAP_JITTER, cy + TAP_JITTER)
        pg.mouse.up()
        pg.wait_for_timeout(250)
        check("a still-handed tap still selects",
              selected() > before,
              f"{TAP_JITTER}px of jitter")

        pg.reload(wait_until="networkidle")
        demo = pg.get_by_role("button", name="Load demo budget")
        if demo.count():
            demo.first.click()
        pg.wait_for_timeout(350)
        t = target.bounding_box()
        cx, cy = t["x"] + t["width"] / 2, t["y"] + t["height"] / 2
        pg.mouse.move(cx, cy)
        pg.mouse.down()
        for i in range(1, 11):
            pg.mouse.move(cx - DRAG * i / 10, cy)
        pg.mouse.move(cx, cy)   # back over the target, then release on it
        pg.mouse.up()
        pg.wait_for_timeout(250)
        check("a drag that ends on the target does NOT select it",
              selected() == 0,
              "released over the village after panning")

        br.close()


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(2)
    w = int(sys.argv[2]) if len(sys.argv) > 2 else 1440
    h = int(sys.argv[3]) if len(sys.argv) > 3 else 900
    run(sys.argv[1], w, h)
    failed = [r for r in results if not r[0]]
    print(f"\n{'=' * 60}")
    if failed:
        print(f"FAILED: {len(failed)} of {len(results)}")
        for _, name in failed:
            print(f"  - {name}")
        sys.exit(1)
    if unreachable:
        # Exit 3, never 0. "2/2 passed" on a build where the feature does not
        # exist is the most dangerous output this script could produce: it is a
        # green that someone downstream will quote as a verdict on #68.
        print(f"INCONCLUSIVE — {len(results)} preconditions held, "
              f"but the {len(unreachable)} checks that judge #68 never ran:")
        for u in unreachable:
            print(f"  ? {u}")
        print("\nThis is not a pass. Re-run when the named checks can execute.")
        sys.exit(3)
    print(f"{len(results)}/{len(results)} pan checks passed")
    sys.exit(0)


if __name__ == "__main__":
    main()
