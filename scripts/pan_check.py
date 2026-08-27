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
        // The frame is whatever actually CLIPS the world, not its parent. A
        // parent in a flex column grows to fit its content, so measuring
        // against it reports "the world fits" at every scale — which made this
        // script's own precondition vacuous at x12, a world 1536 tall inside a
        // 900 viewport. Nearest ancestor that clips, else the viewport.
        let p = null
        for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
          const o = getComputedStyle(n).overflow
          if (o && o !== 'visible') { p = n.getBoundingClientRect(); break }
        }
        if (!p) p = { left: 0, top: 0, right: innerWidth, bottom: innerHeight }
        // ...and intersected with the viewport, because the page root carries
        // `overflow-x-hidden` and so matched the loop above while being as tall
        // as the whole document. A "frame" taller than the screen cannot clip
        // anything, and reported 1440x2038 for a 1440x900 window.
        const fl = Math.max(p.left, 0), ft = Math.max(p.top, 0)
        const fr = Math.min(p.right, innerWidth), fb = Math.min(p.bottom, innerHeight)
        p = { left: fl, top: ft, width: fr - fl, height: fb - ft }
        return { x: Math.round(b.left), y: Math.round(b.top),
                 w: Math.round(b.width), h: Math.round(b.height),
                 fx: Math.round(p.left), fy: Math.round(p.top),
                 fw: Math.round(p.width), fh: Math.round(p.height) }
    }""")


def drag(pg, box, dx, dy):
    """A pointer gesture from the middle of the world, in steps, like a hand."""
    cx, cy = box["x"] + box["w"] // 2, box["y"] + box["h"] // 2
    pg.mouse.move(cx, cy)
    pg.mouse.down()
    for i in range(1, 11):
        pg.mouse.move(cx + dx * i / 10, cy + dy * i / 10)
    pg.mouse.up()
    pg.wait_for_timeout(220)


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
        box = world_box(pg)
        if not check("the world rendered", box is not None):
            return
        note(f"world {box['w']}x{box['h']} at {box['x']},{box['y']}  "
             f"frame {box['fw']}x{box['fh']} at {box['fx']},{box['fy']}")

        print("\n1. does the world move at all?")
        drag(pg, box, -DRAG, 0)
        left = world_box(pg)
        drag(pg, box, DRAG, 0)
        right = world_box(pg)
        drag(pg, box, 0, -DRAG)
        up = world_box(pg)
        moved_x = left["x"] != box["x"] or right["x"] != box["x"]
        moved_y = up["y"] != box["y"]

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

        print("\n2. clamped — no blank gutters at the extremes")
        for name, dx, dy in (("left", DRAG * 3, 0), ("right", -DRAG * 3, 0),
                             ("top", 0, DRAG * 3), ("bottom", 0, -DRAG * 3)):
            drag(pg, box, dx, dy)
            b = world_box(pg)
            if name in ("left", "right") and not moved_x:
                continue
            if name in ("top", "bottom") and not moved_y:
                continue
            if name == "left":
                ok, d = b["x"] <= b["fx"], f"world left {b['x']} vs frame {b['fx']}"
            elif name == "right":
                ok, d = b["x"] + b["w"] >= b["fx"] + b["fw"], \
                    f"world right {b['x'] + b['w']} vs frame {b['fx'] + b['fw']}"
            elif name == "top":
                ok, d = b["y"] <= b["fy"], f"world top {b['y']} vs frame {b['fy']}"
            else:
                ok, d = b["y"] + b["h"] >= b["fy"] + b["fh"], \
                    f"world bottom {b['y'] + b['h']} vs frame {b['fy'] + b['fh']}"
            check(f"no gutter at the {name} edge", ok, d)
            pg.reload(wait_until="networkidle")
            demo = pg.get_by_role("button", name="Load demo budget")
            if demo.count():
                demo.first.click()
            pg.wait_for_timeout(350)

        print("\n3. a drag is not a tap, and a tap is still a tap")
        target = pg.locator("[data-scale] [data-village], [data-scale] [data-settlement]")
        if target.count() == 0:
            note("no village hit targets in the world — #66 is not live here, so")
            note("arbitration has nothing to arbitrate. Untestable, not passing.")
            unreachable.append("arbitration — tap under the threshold, pan over it")
            check("there are in-world targets to arbitrate over", False,
                  "add #66's props line and re-run")
            return

        t = target.first.bounding_box()
        cx, cy = t["x"] + t["width"] / 2, t["y"] + t["height"] / 2
        before = pg.locator("main ul li button[aria-pressed=true]").count()

        pg.mouse.move(cx, cy)
        pg.mouse.down()
        pg.mouse.move(cx + TAP_JITTER, cy + TAP_JITTER)
        pg.mouse.up()
        pg.wait_for_timeout(250)
        check("a still-handed tap still selects", 
              pg.locator("main ul li button[aria-pressed=true]").count() > before,
              f"{TAP_JITTER}px of jitter")

        pg.reload(wait_until="networkidle")
        demo = pg.get_by_role("button", name="Load demo budget")
        if demo.count():
            demo.first.click()
        pg.wait_for_timeout(350)
        t = target.first.bounding_box()
        cx, cy = t["x"] + t["width"] / 2, t["y"] + t["height"] / 2
        pg.mouse.move(cx, cy)
        pg.mouse.down()
        for i in range(1, 11):
            pg.mouse.move(cx - DRAG * i / 10, cy)
        pg.mouse.move(cx, cy)   # back over the target, then release on it
        pg.mouse.up()
        pg.wait_for_timeout(250)
        check("a drag that ends on the target does NOT select it",
              pg.locator("main ul li button[aria-pressed=true]").count() == 0,
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
        print("\nThis is not a pass. Re-run once #68 is live.")
        sys.exit(3)
    print(f"{len(results)}/{len(results)} pan checks passed")
    sys.exit(0)


if __name__ == "__main__":
    main()
