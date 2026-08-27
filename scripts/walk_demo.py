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
import urllib.request
from playwright.sync_api import sync_playwright

VIEWPORT = {"width": 390, "height": 844}
SEED = {"income": 4200, "housing": 1500, "food": 650, "remaining_after_housing": 2700}

results = []


def check(name, ok, detail=""):
    results.append((bool(ok), name, detail))
    print(f"  {'PASS' if ok else 'FAIL'}  {name}{'  — ' + str(detail) if detail else ''}")
    return bool(ok)


def marker_in_build(url):
    """
    Is `data-foliage` present in the served bundle at all?

    Two different failures produce the identical red — zero foliage nodes because
    the build predates the marker, and zero because the foliage is genuinely gone.
    Someone reading "0 nodes" against a bundle that demonstrably contains trees
    would conclude they vanished: a true report about the wrong question, which is
    the failure this whole file exists to avoid.

    The discriminator is the attribute name, deliberately, and not a row of sprite
    art. `data-foliage` is already this check's own key, so using it here writes no
    fact twice; a literal like the canopy's `kheeeek` would duplicate objects.ts and
    go quietly wrong the next time anyone redraws a bush.

    Returns True / False, or None when it cannot be determined — a dev server with
    no hashed bundle, or a fetch that failed. None never becomes a verdict.
    """
    try:
        page = urllib.request.urlopen(url, timeout=15).read().decode("utf-8", "replace")
        asset = re.search(r"assets/index-[A-Za-z0-9_-]+\.js", page)
        if not asset:
            return None
        js = urllib.request.urlopen(url.rstrip("/") + "/" + asset.group(0), timeout=25)
        return "data-foliage" in js.read().decode("utf-8", "replace")
    except Exception:
        return None


def paint_audit(pg):
    """
    Declared paint, not rendered pixels.

    A pixel census cannot express the palette rule: text always anti-aliases, so
    it reports hundreds of off-palette values on correct art — red forever, which
    says as much about the product as a check that is green on nothing.

    The two violations found tonight were both provable from CSS instead:

        linear-gradient(a 0%, b 45%, c 100%)   interpolates between the stops
        rgba(0, 0, 0, 0.5)                     composites toward a colour that is
                                               not in the palette, so every pixel
                                               behind it lands between values

    Neither needs a screenshot, and neither can be confused by a glyph edge. The
    palette is read from the app's own custom properties rather than transcribed,
    so this cannot drift from `index.css`.

    Only the alpha half is asserted. Deciding whether a gradient interpolates
    needs its stop positions parsed across %, deg and clamped zero-stops, and the
    first version of that rule was red on the dithered scrim — a correct build —
    because a conic that forces hard edges with `0deg` stops does not declare two
    positions per stop. Gradients are counted and printed so a person can look;
    they are not failed on, because a check that is red on correct art says
    nothing about the product. The gradient class needs a stop parser I trust.
    """
    return pg.evaluate(r"""() => {
        const root = getComputedStyle(document.documentElement)
        const palette = new Set()
        for (const name of Array.from(root).filter(n => n.startsWith('--color-'))) {
          const hex = root.getPropertyValue(name).trim()
          const n = parseInt(hex.slice(1), 16)
          if (!Number.isNaN(n)) palette.add(`${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`)
        }

        // Alpha has two spellings and only one of them is legacy. Tailwind v4
        // compiles `bg-black/50` to `oklab(0 0 0 / 0.5)` — a modern colour
        // function with slash-alpha — so a parser that only understands
        // `rgba(r, g, b, a)` reads it as opaque and reports the scrim as clean.
        const alphaOf = (paint) => {
          if (!paint) return 1
          const slash = /\/\s*([0-9.]+)(%?)\s*\)/.exec(paint)
          if (slash) return parseFloat(slash[1]) / (slash[2] ? 100 : 1)
          const legacy = /^rgba\(([^)]+)\)/.exec(paint)
          if (legacy) {
            const parts = legacy[1].split(',').map(v => parseFloat(v))
            return parts.length > 3 ? parts[3] : 1
          }
          return 1
        }

        // Does a gradient interpolate, or does it band?
        //
        // CSS clamps every colour stop to be no earlier than the one before it,
        // which is how a hard edge is written: `night 25%, transparent 0deg`
        // puts the transparent stop exactly on 25%, so the two colours meet with
        // nothing between them. The gradients that ramp are the ones whose
        // adjacent stops differ in colour AND in clamped position.
        //
        // The first version of this rule asserted "every stop declares two
        // positions" and went red on the dithered scrim, which is correct art.
        // This reads the semantics rather than a spelling.
        const classifyGradient = (bg) => {
          const splitTop = (str) => {
            const out = []; let depth = 0, cur = ''
            for (const ch of str) {
              if (ch === '(') depth++
              if (ch === ')') depth--
              if (ch === ',' && depth === 0) { out.push(cur); cur = '' } else cur += ch
            }
            if (cur.trim()) out.push(cur)
            return out.map(t => t.trim())
          }
          const toPct = (tok) => {
            const m = /^(-?[\d.]+)(%|deg|turn|rad|px)$/.exec(tok)
            if (!m) return null
            const v = parseFloat(m[1])
            if (m[2] === '%') return v
            if (m[2] === 'deg') return v / 3.6
            if (m[2] === 'turn') return v * 100
            if (m[2] === 'rad') return v * 100 / (2 * Math.PI)
            return null            // px cannot be normalised without a length
          }
          const inner = bg.slice(bg.indexOf('(') + 1, bg.lastIndexOf(')'))
          const stops = []
          let unhandled = false
          for (const part of splitTop(inner)) {
            const cm = /^(rgba?\([^)]*\)|#[0-9a-f]{3,8}|transparent|[a-z]+)/i.exec(part)
            if (!cm) continue                       // "to bottom", an angle, etc.
            const colour = cm[1] === 'transparent' ? 'rgba(0, 0, 0, 0)' : cm[1]
            const rest = part.slice(cm[1].length).trim()
            const toks = rest ? rest.split(/\s+/) : []
            if (toks.length === 0) { unhandled = true; continue }
            for (const t of toks) {
              const pct = toPct(t)
              if (pct === null) { unhandled = true; continue }
              stops.push({ colour, pct })
            }
          }
          if (unhandled || stops.length < 2) return 'unhandled'
          let running = -Infinity
          for (const st of stops) { st.pct = Math.max(st.pct, running); running = st.pct }
          for (let i = 1; i < stops.length; i++) {
            if (stops[i].colour !== stops[i - 1].colour && stops[i].pct !== stops[i - 1].pct) {
              return 'interpolates'
            }
          }
          return 'bands'
        }

        const alpha = [], soft = [], unknown = []
        const els = [...document.querySelectorAll('*')]
        for (const el of els) {
          const cs = getComputedStyle(el)
          const label = el.tagName.toLowerCase() +
            (typeof el.className === 'string' && el.className ? '.' + el.className.split(' ')[0] : '')

          for (const paint of [cs.backgroundColor, cs.fill, cs.stroke]) {
            const a = alphaOf(paint)
            // Fully transparent paints nothing; opaque is checked against the
            // palette elsewhere. Partial alpha is the composite that lands
            // between palette values, and it is the violation.
            if (a > 0 && a < 1) alpha.push(`${label} ${paint}`)
          }

          const bg = cs.backgroundImage || ''
          if (bg.includes('gradient')) {
            const verdict = classifyGradient(bg)
            if (verdict === 'interpolates') soft.push(`${label} ${bg.slice(0, 60)}`)
            else if (verdict === 'unhandled') unknown.push(`${label} ${bg.slice(0, 60)}`)
          }
        }
        return { scanned: els.length, alpha, soft, unknown }
    }""")


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
        // Anything riding `offset-path` is where it is because of the clock, so
        // its rectangle is not world geometry and must not be fingerprinted —
        // sampling two loads a second apart would report a false difference.
        // What IS deterministic about it is how many there are and how they are
        // timed, which comes from the model, so that gets fingerprinted instead.
        const all = [...document.querySelectorAll('[data-scale] span, [data-scale] div')]
          .filter(e => getComputedStyle(e).backgroundImage.startsWith('url('))
        // The sprite carries the background image; its *wrapper* carries the
        // offset-path. Testing only the element itself finds nothing and silently
        // fingerprints moving coins as if they were fixed scenery.
        const riding = e => {
          for (let n = e; n && n !== document.body; n = n.parentElement) {
            const op = getComputedStyle(n).offsetPath
            if (op && op !== 'none') return true
          }
          return false
        }
        const sprites = all.filter(e => !riding(e))
          .map(e => { const r = e.getBoundingClientRect()
                      return [Math.round(r.left - (box?box.left:0)), Math.round(r.top - (box?box.top:0)),
                              Math.round(r.width), Math.round(r.height)].join(',') })
        const flowing = all.filter(riding).map(e => {
          const cs = getComputedStyle(e)
          return [cs.animationDuration, cs.animationDelay, cs.offsetRotate, cs.offsetPath.length].join(',')
        }).sort()
        return { shapes, sprites, flowing, scale: world ? world.dataset.scale : null }
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
        # An absence is only meaningful if the page is alive. "0 river shapes" is
        # also true of a blank screen, a crashed bundle and a 404, so every
        # absence assertion in this file pairs with something that must be there.
        alive = pg.get_by_role("button", name="Add Income").count() > 0
        check("no river is drawn before any income", alive and len(river_shapes(pg)) == 0,
              f"{len(river_shapes(pg))} shapes"
              + ("" if alive else " — but the empty field did not render, so this proves nothing"))
        add_income = pg.get_by_role("button", name="Add Income")
        check("Add Income is present", add_income.count() > 0)
        if add_income.count():
            box = add_income.first.bounding_box()
            check("Add Income is at least 44x44 (FR-018)", box and box["height"] >= 44,
                  f"{box['width']:.0f}x{box['height']:.0f}" if box else "no box")
        check("Load demo budget is present", pg.get_by_text("Load demo budget").count() > 0)

        paint = paint_audit(pg)
        check("the opening frame declares no alpha-composited paint (art-bible §7)",
              paint["scanned"] > 0 and not paint["alpha"],
              f"scanned {paint['scanned']} elements · {len(paint['alpha'])} partial-alpha "
              f"{paint['alpha'][:1]} · {len(paint['soft'])} interpolating + "
              f"{len(paint['unknown'])} unclassifiable gradients seen "
              f"(reported — scripts/gradient_check.py asserts that class)")

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

        paint = paint_audit(pg)
        check("the world declares no alpha-composited paint (art-bible §7)",
              paint["scanned"] > 0 and not paint["alpha"],
              f"scanned {paint['scanned']} elements · {len(paint['alpha'])} partial-alpha "
              f"{paint['alpha'][:1]} · {len(paint['soft'])} interpolating + "
              f"{len(paint['unknown'])} unclassifiable gradients seen "
              f"(reported — scripts/gradient_check.py asserts that class)")

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

        # ---- 4b. the open field is planted ---------------------------------------
        #
        # Found by `data-foliage`, not by sprite size. A tree is 7x9 and a bush 5x4,
        # but those numbers already live in objects.ts — writing them here would be
        # the same fact in two places, which is the defect this repo hit five ways in
        # one night. Size is also the mechanism: redraw TREE one pixel wider and a
        # size-based check goes red on correct art, exactly as the `svg line` stroke
        # assertion did through three refactors.
        #
        # Kinds are counted separately on Praetor's point: a total would stay green
        # if every tree vanished and only bushes remained — the shape of the guard
        # that went red on one of the two sprites it was written for.
        print("\n4b. the open field is planted (#59)")
        flora = pg.evaluate("""() => {
            const world = document.querySelector('[data-scale]')
            if (!world) return { world: false }
            const nodes = [...world.querySelectorAll('[data-foliage]')]
            const kinds = {}
            for (const el of nodes) {
              const k = el.getAttribute('data-foliage') || '?'
              kinds[k] = (kinds[k] || 0) + 1
            }
            const sprites = [...world.querySelectorAll('span,div')]
              .filter(e => getComputedStyle(e).backgroundImage.startsWith('url('))
            return { world: true, total: nodes.length, kinds, sprites: sprites.length }
        }""")

        if not flora.get("world"):
            check("the open field carries foliage", False, "no world box — nothing was measured")
        elif flora["sprites"] == 0:
            # Zero foliage on a screen with zero sprites says nothing about foliage.
            check("the open field carries foliage", False,
                  "the world rendered no sprites at all — nothing was measured")
        else:
            kinds = flora["kinds"]
            detail = f"{flora['total']} nodes across {len(kinds)} kinds {kinds}"
            if flora["total"] == 0:
                # Say which of the two reds this is, so nobody reads a
                # not-yet-deployed marker as vanished trees.
                marker = marker_in_build(url)
                if marker is False:
                    detail += " — and `data-foliage` is absent from the served bundle, so this build predates the marker; NOT a foliage regression"
                elif marker is True:
                    detail += " — and `data-foliage` IS in the served bundle, so the foliage is genuinely missing"
                else:
                    detail += " — could not read the served bundle, so which of the two reds this is was not determined"
            check("the open field carries foliage", flora["total"] > 0, detail)
            check("every kind of foliage that renders, renders at least one",
                  len(kinds) >= 2 and all(n >= 1 for n in kinds.values()),
                  detail if len(kinds) >= 2 else f"only {len(kinds)} kind present {kinds}")

        # ---- 5. pixel art is not smoothed ---------------------------------------
        print("\n5. the river must not be smooth (art-bible §1, non-negotiable #2)")
        # Both of these are "no bad ones found" checks, so both pass on an empty
        # set — measured on the empty field, where the river does not exist yet,
        # they report PASS with nothing to be crisp and nothing to be capped. A
        # world that failed to render at all would score them green. Requiring
        # the evidence to be non-empty is what makes them checks rather than
        # descriptions of an absence.
        smooth = [s for s in shapes if s["rendering"] not in ("crispedges", "crispEdges")]
        check("every river shape carries shape-rendering=crispEdges", shapes and not smooth,
              f"{len(smooth)} of {len(shapes)} shapes are anti-aliased"
              if shapes else "no river shapes to check — vacuous pass prevented")
        round_caps = [s for s in shapes if s["linecap"] == "round"]
        check("no river shape uses a round line cap", shapes and not round_caps,
              f"{len(round_caps)} round-capped of {len(shapes)}"
              if shapes else "no river shapes to check — vacuous pass prevented")

        # ---- 5b. the branches are distinguishable (art-bible §2) ----------------
        #
        # The property is that each tributary can be told apart by its category
        # colour. It is deliberately NOT "the stroke is coloured": that mechanism
        # has changed twice — stroked lines, then rasterised water bands — and an
        # assertion about the mechanism fails on a refactor and passes on a
        # regression. Honey made that point and it is right.
        #
        # But it is also not "the colour appears anywhere": the signboards and the
        # category list carry all five colours as DOM backgrounds, so an
        # anywhere-check passes while the branches themselves are invisible water
        # on water. The water is SVG and the labels are DOM, so the honest test is
        # whether the colours reach the layer the river is drawn in, however that
        # layer chooses to paint them.
        print("\n5b. the branches are distinguishable by category colour (art-bible §2)")
        colour = pg.evaluate("""() => {
            const CATEGORY = {
              'rgb(192, 57, 43)': 'brick', 'rgb(224, 140, 58)': 'wheat',
              'rgb(107, 122, 153)': 'slate', 'rgb(138, 79, 168)': 'plum',
              'rgb(47, 168, 138)': 'teal',
            }
            const WATER = [43, 127, 212]
            const num = s => (s.match(/-?\\d+(\\.\\d+)?/g) || []).map(Number)
            const dist = rgb => {
              const [r, g, b] = rgb
              return Math.sqrt((r-WATER[0])**2 + (g-WATER[1])**2 + (b-WATER[2])**2)
            }
            // Scoped to the marked tributary groups, not the whole SVG: a
            // category-coloured element anywhere else in the river layer would
            // otherwise satisfy this while the branches stayed water on water.
            const groups = [...document.querySelectorAll('[data-tributary]')]
            const branches = groups.map(g => {
              let rim = 0, body = 0, hue = null
              for (const el of g.querySelectorAll('*')) {
                const f = getComputedStyle(el).fill
                const box = el.getBBox ? el.getBBox() : null
                const area = box ? box.width * box.height : 0
                if (CATEGORY[f]) { rim += area; hue = hue || CATEGORY[f] }
                else if (f && f.startsWith('rgb')) {
                  const d = dist(num(f))
                  if (d < 60) body += area
                }
              }
              const rgbOf = { brick:[192,57,43], wheat:[224,140,58], slate:[107,122,153],
                              plum:[138,79,168], teal:[47,168,138] }
              return { id: g.dataset.tributary, hue,
                       distance: hue ? +dist(rgbOf[hue]).toFixed(1) : null,
                       rimRatio: (rim + body) ? +(rim / (rim + body)).toFixed(3) : 0 }
            })
            return { count: groups.length, branches,
                     hues: [...new Set(branches.map(b => b.hue).filter(Boolean))].sort() }
        }""")
        check("each tributary is distinguishable by its category colour in the river layer",
              colour["count"] > 0 and len(colour["hues"]) >= 5,
              f"{len(colour['hues'])} hues across {colour['count']} marked tributaries {colour['hues']}"
              if colour["count"] else "no [data-tributary] groups found — nothing was measured")

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
        check("what rides the river is identically timed across two loads (FR-015)",
              first["flowing"] == second["flowing"],
              f"{len(first['flowing'])} vs {len(second['flowing'])} riding the path")
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
            sheet_paint = paint_audit(pg)
            check("the income sheet declares no alpha-composited paint (art-bible §7)",
                  sheet_paint["scanned"] > 0 and not sheet_paint["alpha"],
                  f"{len(sheet_paint['alpha'])} partial-alpha {sheet_paint['alpha'][:2]} · "
                  f"{len(sheet_paint['soft'])} interpolating {sheet_paint['soft'][:1]} · "
                      f"{len(sheet_paint['unknown'])} unclassifiable")
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
                sheet_paint = paint_audit(pg)
                check("an open sheet declares no alpha-composited paint (art-bible §7)",
                      sheet_paint["scanned"] > 0 and not sheet_paint["alpha"],
                      f"{len(sheet_paint['alpha'])} partial-alpha {sheet_paint['alpha'][:2]} · "
                      f"{len(sheet_paint['soft'])} interpolating {sheet_paint['soft'][:1]} · "
                      f"{len(sheet_paint['unknown'])} unclassifiable")
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
            recovered = body(pg)
            check("reducing the category clears the warning (US4 scenario 2)",
                  "$4,200" in recovered and "over budget" not in recovered.lower(),
                  "" if "$4,200" in recovered else "the budget vanished — absence of the warning proves nothing")
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
            back = pg.get_by_role("button", name="Add Income").count() > 0
            check("reset returns the empty field with no river left over",
                  back and len(river_shapes(pg)) == 0,
                  f"{len(river_shapes(pg))} shapes remain"
                  + ("" if back else " — and Add Income is gone, so this is a broken screen, not an empty field"))
            check("Add Income is offered again",
                  pg.get_by_role("button", name="Add Income").count() > 0)

        browser.close()


def main():
    if len(sys.argv) < 2:
        # A default target is a hardcoded target wearing an argument's clothes.
        # Taking the URL as an argument is what let this harness certify two
        # different deployments without an edit; defaulting to a well-known dev
        # port quietly undoes that, and 5173 is routinely another checkout's
        # server. Honey got an alpha-scrim report on a build where the scrim had
        # been gone for two commits, and Pollen nearly published a fresh-clone
        # result measured against someone else's app. Printing the URL does not
        # close it — both had the line and a plausible URL never looks wrong.
        # A loud missing argument beats a silent wrong answer.
        print(__doc__)
        print("error: a URL is required — this walk will not guess what to judge")
        sys.exit(2)
    url = sys.argv[1]
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
