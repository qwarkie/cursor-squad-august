#!/usr/bin/env python3
"""
Does any declared gradient interpolate?

    python3 scripts/gradient_check.py http://localhost:4173
    python3 scripts/gradient_check.py https://<deployment>

The URL is required. It had a default and Pollen showed the default was the
defect: a well-known dev port means a no-argument run judges whatever happens
to be listening, and `npm run walk` bare reported an alpha scrim on a build
where it had been gone for two commits — it had reached another checkout's dev
server. Printing the judged URL is not enough of a mitigation; Pollen had that
line in their terminal, from Vite reporting a port collision, and still nearly
published a result measured against someone else's app. A plausible URL never
looks wrong. So this exits with usage instead, which turns a silent wrong
answer into a loud missing one.

art-bible §7 forbids colour outside the twenty and smoothing anywhere. A CSS
gradient with distinct colours at distinct positions violates both by
construction: `linear-gradient(grassLit, grass, grassDark)` on the empty field
emitted 58 distinct greens, 57 of them off-palette, on the first screen a judge
saw (fixed at 768ac6b).

Two checks were withdrawn before this one, and this exists because of how they
failed:

  a rendered-pixel census      red forever on correct art — text always
                               anti-aliases, so a correct build measured 184
                               "off-palette" values, every one a glyph edge
  a stop-syntax parser         red on correct art too — `.scrim` is a
                               legitimate conic gradient whose coincident
                               `0deg` stops a naive rule reads as interpolating

So this parses nothing and censuses nothing. It re-renders each declared
gradient ALONE on a blank 64x64 tile and counts what that one declaration
emits. No text is in the frame, so the anti-aliasing that defeats a census
cannot reach it; no syntax is interpreted, so a spelling it has not seen
cannot defeat it. A hard-stop gradient emits the colours it names. An
interpolating one emits a ramp.

The tile is painted on a magenta backdrop first: transparent stops are
legitimate (`.scrim` is half transparent by design), and without a known
backdrop the probe screenshots the page behind it — the same declaration
measured 2 colours over the empty field and 34 over the seeded world, which
was content showing through, not the gradient. Found by running it against a
second state, which is how every instrument failed tonight.

Proven in both directions, which is the standard on this board:

  768ac6b~1   the empty field   155 colours from one declaration   FAIL
  ce46e40     `.scrim` dither     2 colours                        PASS

And it is not vacuous: a build declaring no gradients is reported as
"0 examined" rather than passing quietly, and the run fails if the app did
not render at all.
"""
import io
import sys

from PIL import Image
from playwright.sync_api import sync_playwright

# A hard-stop declaration emits the colours it names; the most any of ours
# names is four. A ramp emits dozens. Nothing observed has landed between.
MAX_HARD_STOP_COLOURS = 8
TILE = 64

# Transparent stops are legitimate — the `.scrim` checkerboard is half
# transparent by design — so the tile needs a known opaque backdrop underneath
# it. Without one the probe screenshots whatever the page happens to have
# behind it: the same declaration measured 2 colours over the empty field and
# 34 over the seeded world, which was the page showing through, not the
# gradient. Magenta because nothing in the twenty is near it.
BACKDROP = "rgb(255, 0, 255)"

PROBE = """(css) => new Promise((resolve) => {
  const d = document.createElement('div')
  d.style.cssText = 'position:fixed;left:0;top:0;width:%dpx;height:%dpx;z-index:2147483647'
  d.style.backgroundColor = css.backdrop
  d.style.backgroundImage = css.image
  if (css.size && css.size !== 'auto') d.style.backgroundSize = css.size
  d.setAttribute('data-gradient-probe', '')
  document.body.appendChild(d)
  requestAnimationFrame(() => requestAnimationFrame(() => resolve(true)))
})""" % (TILE, TILE)

COLLECT = """() => {
  const out = []
  const push = (style, where) => {
    if (style.backgroundImage && style.backgroundImage.includes('gradient')) {
      out.push({ image: style.backgroundImage, size: style.backgroundSize, where })
    }
  }
  for (const el of document.querySelectorAll('*')) {
    const name = el.tagName.toLowerCase() +
      (el.className ? '.' + String(el.className).trim().split(/\\s+/).join('.') : '')
    push(getComputedStyle(el), name)
    for (const pseudo of ['::before', '::after']) push(getComputedStyle(el, pseudo), name + pseudo)
  }
  const seen = new Set()
  return out.filter((g) => !seen.has(g.image) && seen.add(g.image))
}"""


def colours_emitted(page, gradient):
    page.evaluate(PROBE, {**gradient, "backdrop": BACKDROP})
    shot = page.locator("[data-gradient-probe]").screenshot()
    page.evaluate("() => document.querySelector('[data-gradient-probe]').remove()")
    tile = Image.open(io.BytesIO(shot)).convert("RGB")
    return len({tile.getpixel((x, y)) for x in range(tile.width) for y in range(tile.height)})


def main(base):
    findings, examined = [], 0
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_context(
            viewport={"width": 390, "height": 844}, device_scale_factor=1, reduced_motion="reduce"
        ).new_page()
        try:
            page.goto(base, wait_until="networkidle")
            page.evaluate("localStorage.clear()")
            page.reload(wait_until="networkidle")
        except Exception as err:  # noqa: BLE001 - the message is the finding
            print(f"FAIL  {base} did not load — nothing was measured\n      {err}".split("\nCall log")[0])
            browser.close()
            return 1

        # A gradient check that says PASS because the app never rendered has
        # answered nothing. Require the opening frame before measuring.
        if page.get_by_role("button", name="Add Income").count() == 0:
            print("FAIL  the app did not render — nothing was measured")
            browser.close()
            return 1

        states = [
            ("empty field", lambda: None),
            ("income sheet", lambda: page.get_by_role("button", name="Add Income").click()),
            ("seeded world", lambda: (page.reload(wait_until="networkidle"),
                                      page.get_by_role("button", name="Load demo budget").click())),
            ("category sheet", lambda: page.get_by_role("button", name="Add category").click()),
        ]
        for name, enter in states:
            enter()
            page.wait_for_timeout(500)
            for gradient in page.evaluate(COLLECT):
                examined += 1
                findings.append((name, gradient, colours_emitted(page, gradient)))
        browser.close()

    print(f"gradient check — {base}\n")
    for state, gradient, count in findings:
        verdict = "INTERPOLATES" if count > MAX_HARD_STOP_COLOURS else "hard stops"
        print(f"  {state:15} {gradient['where'][:38]:38} {count:4} colours  {verdict}")
    print()
    print(f"  {examined} gradient declaration(s) examined across {len(states)} states")

    bad = [f for f in findings if f[2] > MAX_HARD_STOP_COLOURS]
    if bad:
        print(f"\nFAIL  {len(bad)} declaration(s) interpolate — off-palette by construction")
        return 1
    if examined == 0:
        print("\nPASS  no gradients declared — nothing to interpolate")
        return 0
    print("\nPASS  every declared gradient emits only the colours it names")
    return 0


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("usage: gradient_check.py <url>\n")
        print("  the URL is required on purpose — a default judges whatever is")
        print("  listening on a well-known port, which has already produced one")
        print("  wrong answer on this repo. see scripts/README.md")
        sys.exit(2)
    sys.exit(main(sys.argv[1]))
