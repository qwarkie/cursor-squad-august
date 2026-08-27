"""How much of the screen is the world, at every size someone will open this on?

The complaint is that it reads as a static frame rather than a place. That is a
measurable claim: what fraction of the viewport the world occupies, and how
much of what is left is doing nothing.
"""
import sys
from playwright.sync_api import sync_playwright

URL = sys.argv[1]
SIZES = [
    ("phone   iPhone 12", 390, 844),
    ("phone   small", 320, 568),
    ("tablet  portrait", 768, 1024),
    ("tablet  landscape", 1024, 768),
    ("laptop", 1440, 900),
    ("desktop", 1920, 1080),
]

print(f"{'target':22} {'viewport':>11} {'scale':>6} {'world box':>12} {'of vp':>7} "
      f"{'world/vh':>9} {'page h':>8}")
print("-" * 82)

with sync_playwright() as p:
    br = p.chromium.launch()
    for name, w, h in SIZES:
        pg = br.new_page(viewport={"width": w, "height": h}, reduced_motion="reduce")
        pg.goto(URL, wait_until="networkidle")
        d = pg.get_by_role("button", name="Load demo budget")
        if d.count():
            d.first.click()
            pg.wait_for_timeout(350)
        m = pg.evaluate("""() => {
            const el = document.querySelector('[data-scale]')
            if (!el) return null
            const b = el.getBoundingClientRect()
            const list = document.querySelector('main ul')
            const lb = list ? list.getBoundingClientRect() : null
            return {
              scale: +el.getAttribute('data-scale'),
              w: Math.round(b.width), h: Math.round(b.height),
              listW: lb ? Math.round(lb.width) : 0,
              pageH: Math.round(document.documentElement.scrollHeight),
              scrolls: document.documentElement.scrollHeight > innerHeight + 2,
            }
        }""")
        if not m:
            print(f"{name:22} {w}x{h:<6}  no world box")
            pg.close()
            continue
        area = (m["w"] * m["h"]) / (w * h) * 100
        print(f"{name:22} {str(w)+'x'+str(h):>11} {m['scale']:>6} "
              f"{str(m['w'])+'x'+str(m['h']):>12} {area:>6.0f}% "
              f"{m['h']/h*100:>8.0f}% {m['pageH']:>8}"
              f"{'  scrolls' if m['scrolls'] else ''}")
        pg.close()
    br.close()
