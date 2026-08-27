#!/usr/bin/env python3
"""
The 390x844 reference, taken before the world learns to move.

#68 requires that "390x844 must be unchanged — it is the demo path and the
certified viewport; if it moves, this is a regression, not a feature." That is
only a checkable claim if someone writes down what it is *beforehand*. Taken
afterwards it records whatever the change did, which is not a reference, and
the requirement quietly becomes unenforceable.

So this is captured from `main` before #68 lands, committed, and compared
against later.

    python3 scripts/baseline_390.py --capture <url>   # rewrite the reference
    python3 scripts/baseline_390.py <url>             # compare against it

What it pins and why:

  shapes   raw SVG attributes, in art units — a pan cannot change these at all,
           so any difference is the river itself being redrawn
  sprites  positions *relative to the world box*, so a legitimately panned or
           recentred world still matches and only real drift fails
  box      the world's rectangle in the viewport — at 390 the world fits, so it
           must not move; this is the half a pan would break
  trunk    the widths, because the harness has already been blind to these once

Deliberately not pinned: anything riding `offset-path` (clock-driven), and the
page height (chrome below the world is allowed to change).
"""
import json
import os
import sys

from playwright.sync_api import sync_playwright

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from walk_demo import geometry_fingerprint, trunk_widths

REF = os.path.join(os.path.dirname(os.path.abspath(__file__)), "baseline_390.json")
VIEWPORT = {"width": 390, "height": 844}


def measure(url):
    with sync_playwright() as p:
        br = p.chromium.launch()
        pg = br.new_page(viewport=VIEWPORT, device_scale_factor=3, reduced_motion="reduce")
        pg.goto(url, wait_until="networkidle")
        demo = pg.get_by_role("button", name="Load demo budget")
        if demo.count():
            demo.first.click()
            pg.wait_for_timeout(400)
        if pg.locator("main ul li button").count() == 0:
            br.close()
            raise SystemExit("no budget on screen — a baseline of an empty field is worthless")
        fp = geometry_fingerprint(pg)
        # Split the sprite census, because two different promises got tangled
        # in one number. Anything derived from the Budget must never move; the
        # field around it is allowed — and now required — to grow.
        kinds = pg.evaluate("""() => {
            const world = document.querySelector('[data-scale]')
            const all = [...world.querySelectorAll('span, div')]
              .filter(e => getComputedStyle(e).backgroundImage.startsWith('url('))
            const riding = (e) => {
              for (let n = e; n && n !== document.body; n = n.parentElement) {
                const op = getComputedStyle(n).offsetPath
                if (op && op !== 'none') return true
              }
              return false
            }
            const still = all.filter((e) => !riding(e))
            const box = world.getBoundingClientRect()
            const rect = (e) => { const r = e.getBoundingClientRect()
              return [Math.round(r.left - box.left), Math.round(r.top - box.top),
                      Math.round(r.width), Math.round(r.height)].join(',') }
            const area = (e) => { const r = e.getBoundingClientRect(); return r.width * r.height }
            const grass = still.find((e) => e.closest('[data-field]')) || null
            const foliage = still.filter((e) => e.closest('[data-foliage]'))
            const fixtures = still.filter((e) => !e.closest('[data-field]') && !e.closest('[data-foliage]'))
            return { fixtures: fixtures.map(rect).sort(),
                     foliage: foliage.length,
                     grass: grass ? rect(grass) : null }
        }""")
        box = pg.evaluate("""() => {
            const el = document.querySelector('[data-scale]')
            if (!el) return null
            const b = el.getBoundingClientRect()
            return [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)]
        }""")
        trunk = [round(w, 2) for w in trunk_widths(pg)]
        br.close()
    if not box:
        raise SystemExit("no world box — refusing to record a baseline of nothing")
    return {"shapes": fp["shapes"], "scale": fp["scale"], "box": box, "trunk": trunk,
            "fixtures": kinds["fixtures"], "foliage": kinds["foliage"], "grass": kinds["grass"]}


def main():
    args = [a for a in sys.argv[1:]]
    capture = "--capture" in args
    urls = [a for a in args if not a.startswith("--")]
    if not urls:
        print(__doc__)
        sys.exit(2)
    now = measure(urls[0])

    if capture:
        with open(REF, "w") as fh:
            json.dump(now, fh, indent=1, sort_keys=True)
        print(f"captured {len(now['shapes'])} shapes, {len(now['fixtures'])} budget-derived "
              f"sprites, {now['foliage']} foliage, scale x{now['scale']}, box {now['box']}, "
              f"trunk {now['trunk']}")
        print(f"-> {REF}")
        return

    if not os.path.exists(REF):
        print(f"no reference at {REF} — run --capture against a known-good build first")
        sys.exit(2)
    with open(REF) as fh:
        ref = json.load(fh)

    # `foliage` and `grass` are recorded and printed, never compared. The field
    # extent is a product decision that changed tonight and will change again;
    # pinning it would make this instrument argue with @Dmytro rather than
    # protect the river.
    print(f"  ....  field: {now['foliage']} foliage sprites, grass window {now['grass']}")
    if now["foliage"] != ref.get("foliage") or now["grass"] != ref.get("grass"):
        print(f"  ....  was:   {ref.get('foliage')} foliage, grass window {ref.get('grass')}")

    bad = []
    for key in ("scale", "box", "trunk", "shapes", "fixtures"):
        if now[key] != ref[key]:
            bad.append(key)
            if key in ("scale", "box", "trunk"):
                print(f"  FAIL  {key}: {ref[key]} -> {now[key]}")
            else:
                a, b = ref[key], now[key]
                print(f"  FAIL  {key}: {len(a)} -> {len(b)} entries")
                for x, y in list(zip(a, b))[:4]:
                    if x != y:
                        print(f"          {x}\n          {y}")
                        break
        else:
            print(f"  PASS  {key} unchanged"
                  + (f"  — {now[key]}" if key in ("scale", "box", "trunk") else
                     f"  — {len(now[key])} entries"))

    if bad:
        print(f"\n390x844 CHANGED: {', '.join(bad)}")
        print("If this was intentional, re-capture and say so in the commit — but #68")
        print("says the certified viewport does not move, so intentional is a decision,")
        print("not a formality.")
        sys.exit(1)
    print("\n390x844 is byte-identical to the reference")


if __name__ == "__main__":
    main()
