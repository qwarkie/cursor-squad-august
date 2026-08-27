import { describe, expect, it } from 'vitest'

import {
  clampPan,
  containScale,
  fieldBounds,
  fitScale,
  fitToggleTarget,
  frameOf,
  panAfterZoom,
  resolveView,
  restingPan,
  MAX_SCALE,
  MIN_SCALE,
  PAN_MARGIN,
  REST_TOP,
} from './view'

const WORLD = { w: 96, h: 128 }

describe('fitScale', () => {
  /**
   * The claim the whole change rests on: the old four-row scale table
   * (<390 -> 3, <480 -> 4, <600 -> 5, else 6) was fit-to-width with a cap.
   * At the lower bound of every band it returns exactly what the table did,
   * so removing the cap cannot move any viewport at or below 600px — which
   * is where the demo path and the certified 390x844 reference live.
   */
  it.each([
    [320, 3],
    [390, 4],
    [480, 5],
    [600, 6],
  ])('agrees with the old scale table at %ipx -> x%i', (width, expected) => {
    expect(fitScale(width, WORLD.w)).toBe(expected)
  })

  it.each([
    [768, 8],
    [1024, 10],
    [1440, 15],
    [1920, 20],
  ])('keeps climbing above the old cap: %ipx -> x%i', (width, expected) => {
    expect(fitScale(width, WORLD.w)).toBe(expected)
  })

  it('is always an integer, at every width from a phone to an ultrawide', () => {
    for (let w = 240; w <= 3840; w += 7) {
      const s = fitScale(w, WORLD.w)
      expect(Number.isInteger(s)).toBe(true)
      expect(s).toBeGreaterThanOrEqual(MIN_SCALE)
      expect(s).toBeLessThanOrEqual(MAX_SCALE)
    }
  })

  it('never overflows the space it was given, once past the minimum', () => {
    for (let w = MIN_SCALE * WORLD.w; w <= 3840; w += 13) {
      expect(fitScale(w, WORLD.w) * WORLD.w).toBeLessThanOrEqual(w)
    }
  })
})

describe('containScale', () => {
  it('shows the whole world at once', () => {
    const stage = { w: 1440, h: 648 }
    const s = containScale(stage, WORLD)
    expect(WORLD.w * s).toBeLessThanOrEqual(stage.w)
    expect(WORLD.h * s).toBeLessThanOrEqual(stage.h)
  })

  it('is no larger than fit-to-width on a landscape stage', () => {
    for (const stage of [
      { w: 1440, h: 648 },
      { w: 1024, h: 553 },
      { w: 768, h: 737 },
    ]) {
      expect(containScale(stage, WORLD)).toBeLessThanOrEqual(fitScale(stage.w, WORLD.w))
    }
  })
})

describe('clampPan', () => {
  const world = { w: 1440, h: 1920 }
  const frame = { w: 1440, h: 900 }
  const scale = 15
  const m = PAN_MARGIN * scale

  it('lets you drag a margin of meadow into view, and no further', () => {
    expect(clampPan({ x: 0, y: 9999 }, world, frame, scale).y).toBe(m)
    expect(clampPan({ x: 0, y: -9999 }, world, frame, scale).y).toBe(frame.h - m - world.h)
  })

  it('leaves an offset inside the range alone', () => {
    expect(clampPan({ x: 0, y: -400 }, world, frame, scale)).toEqual({ x: 0, y: -400 })
  })

  it('locks an axis where the world plus both margins already fits', () => {
    const small = { w: 288, h: 384 }
    const wide = { w: 1440, h: 900 }
    // Across it settles centred; down it settles at the top, where the spring is.
    expect(clampPan({ x: -500, y: -500 }, small, wide, 3)).toEqual({
      x: Math.round((wide.w - small.w) / 2),
      y: 0,
    })
  })
})

describe('restingPan', () => {
  it('keeps the certified 390x844 world box where it was pinned', () => {
    // frame is now the whole stage, not shrink-wrapped to the world — the box
    // must still land at x=3, y=0 relative to it, or baseline_390 moves.
    const view = resolveView({ w: 390, h: 718 }, WORLD, null)
    expect(view.worldPx).toEqual({ w: 384, h: 512 })
    expect(restingPan(view.worldPx, view.frame, view.scale)).toEqual({ x: 3, y: 0 })
  })

  it('centres the river in what is visible, not under a panel floating over it', () => {
    // The Housing village is top-right at every budget, which is exactly where
    // a right-hand rail sits. Centred on the full frame it goes behind it.
    const view = resolveView({ w: 1440, h: 790 }, WORLD, 6)
    const RAIL = 380
    const centred = restingPan(view.worldPx, view.frame, view.scale)
    const inset = restingPan(view.worldPx, view.frame, view.scale, RAIL)
    expect(inset.x).toBeLessThan(centred.x)
    // ...and the world's right edge now clears the rail.
    expect(inset.x + view.worldPx.w).toBeLessThanOrEqual(view.frame.w - RAIL)
  })

  it('ignores an inset it cannot honour rather than shoving the world off-frame', () => {
    const view = resolveView({ w: 1440, h: 790 }, WORLD, 15)
    const p = restingPan(view.worldPx, view.frame, view.scale, 380)
    expect(p).toEqual(clampPan(p, view.worldPx, view.frame, view.scale))
  })

  it('starts at the spring, not the middle, when there is room below', () => {
    const view = resolveView({ w: 960, h: 774 }, WORLD, null)
    const y = restingPan(view.worldPx, view.frame, view.scale).y
    // The claim is "at the top", not a literal 0. It used to be flush with the
    // frame, which put art row 0 — and at scale 3 the spring's own tap target —
    // underneath the control rail. It now rests inside the meadow border, which
    // is the top of the vertical range and still nowhere near the middle.
    expect(y).toBe(REST_TOP * view.scale)
    const centred = Math.round((view.frame.h - view.worldPx.h) / 2)
    expect(y).toBeGreaterThan(centred)
  })

  it('does not rest flush against the frame on a world taller than it', () => {
    // The shape of the `Edit income <- Zoom out` regression, and no more than
    // that: whether a specific control clears a specific rail is occlusion, and
    // `scripts/responsive_check.py` measures it with `elementFromPoint` at six
    // widths. Restating the rail's pixel geometry here would duplicate that
    // badly and rot the first time the rail is restyled.
    const view = resolveView({ w: 320, h: 568 }, { w: 96, h: 190 }, null)
    expect(restingPan(view.worldPx, view.frame, view.scale).y).toBeGreaterThan(0)
  })
})

describe('frameOf', () => {
  it('fills the stage even when the world is smaller — that space is field', () => {
    expect(frameOf({ w: 384, h: 512 }, { w: 1440, h: 900 })).toEqual({ w: 1440, h: 900 })
  })

  it('fills the stage when the world is larger — that overflow is the drag', () => {
    expect(frameOf({ w: 1440, h: 1920 }, { w: 1440, h: 648 })).toEqual({ w: 1440, h: 648 })
  })
})

describe('fieldBounds', () => {
  it('always covers the frame, however far out you zoom', () => {
    for (const request of [null, 3, 4, 6, 10, 15, 20]) {
      const view = resolveView({ w: 1440, h: 900 }, WORLD, request)
      const b = fieldBounds(view)
      expect(b.w * view.scale).toBeGreaterThanOrEqual(view.frame.w)
      expect(b.h * view.scale).toBeGreaterThanOrEqual(view.frame.h)
    }
  })

  it('always covers the world itself, at every scale', () => {
    for (const request of [null, 3, 4, 6, 10, 15, 20]) {
      const b = fieldBounds(resolveView({ w: 1440, h: 900 }, WORLD, request))
      expect(b.x0).toBeLessThanOrEqual(0)
      expect(b.y0).toBeLessThanOrEqual(0)
      expect(b.x0 + b.w).toBeGreaterThanOrEqual(WORLD.w)
      expect(b.y0 + b.h).toBeGreaterThanOrEqual(WORLD.h)
    }
  })

  it('leaves a margin to drag into on an axis that can be dragged', () => {
    const b = fieldBounds(resolveView({ w: 1440, h: 900 }, WORLD, null))
    expect(b.x0).toBeLessThanOrEqual(-PAN_MARGIN)
    expect(b.y0).toBeLessThanOrEqual(-PAN_MARGIN)
  })

  it('covers every reachable pan, so no unpainted edge can be dragged in', () => {
    const view = resolveView({ w: 1440, h: 900 }, WORLD, 3)
    const b = fieldBounds(view)
    for (const corner of [
      { x: -99999, y: -99999 },
      { x: 99999, y: 99999 },
    ]) {
      const p = clampPan(corner, view.worldPx, view.frame, view.scale)
      // The frame's own edges, expressed in art units relative to the world.
      expect(-p.x / view.scale).toBeGreaterThanOrEqual(b.x0)
      expect((-p.x + view.frame.w) / view.scale).toBeLessThanOrEqual(b.x0 + b.w)
      expect(-p.y / view.scale).toBeGreaterThanOrEqual(b.y0)
      expect((-p.y + view.frame.h) / view.scale).toBeLessThanOrEqual(b.y0 + b.h)
    }
  })
})

describe('resolveView', () => {
  /** The certified viewport. scripts/baseline_390.py pins box [3, 110, 384, 512]. */
  it('leaves 390x844 exactly where it was: x4, 384x512, nothing to drag', () => {
    const view = resolveView({ w: 390, h: 718 }, WORLD, null)
    expect(view.scale).toBe(4)
    expect(view.worldPx).toEqual({ w: 384, h: 512 })
    expect(view.frame).toEqual({ w: 390, h: 718 })
    // Down is locked, so the page keeps its scroll under a finger on a phone.
    expect(view.pannable.y).toBe(false)
  })

  it('gives a desktop a world taller than its window — something to drag', () => {
    const view = resolveView({ w: 1440, h: 648 }, WORLD, null)
    expect(view.scale).toBe(15)
    expect(view.worldPx).toEqual({ w: 1440, h: 1920 })
    expect(view.frame).toEqual({ w: 1440, h: 648 })
    expect(view.pannable.y).toBe(true)
  })

  it('clamps a request rather than honouring it, in both directions', () => {
    const stage = { w: 1440, h: 648 }
    expect(resolveView(stage, WORLD, 999).scale).toBe(resolveView(stage, WORLD, null).maxScale)
    expect(resolveView(stage, WORLD, -999).scale).toBe(MIN_SCALE)
  })

  it('can always be zoomed back out to the whole world', () => {
    const stage = { w: 1440, h: 648 }
    const fitted = resolveView(stage, WORLD, containScale(stage, WORLD))
    expect(fitted.worldPx.w).toBeLessThanOrEqual(fitted.frame.w)
    expect(fitted.worldPx.h).toBeLessThanOrEqual(fitted.frame.h)
  })

  it('lets a phone zoom out below fit — that is how a phone sees a big world', () => {
    const phone = resolveView({ w: 390, h: 718 }, WORLD, null)
    expect(phone.minScale).toBeLessThan(phone.scale)
  })

  it('is deterministic — the same stage resolves the same view', () => {
    const a = resolveView({ w: 1024, h: 553 }, WORLD, null)
    const b = resolveView({ w: 1024, h: 553 }, WORLD, null)
    expect(a).toEqual(b)
  })
})

describe('panAfterZoom', () => {
  it('keeps the point under the middle of the window where it was', () => {
    const frame = { w: 1440, h: 648 }
    // The world point at the frame centre before the zoom...
    const before = { x: 0, y: -600 }
    const centreWorldY = (-before.y + frame.h / 2) / 15
    const after = panAfterZoom(before, frame, 15, 16)
    // ...must still be at the frame centre after it.
    expect((-after.y + frame.h / 2) / 16).toBeCloseTo(centreWorldY, 6)
  })

  it('is a no-op when the scale does not change', () => {
    const frame = { w: 384, h: 512 }
    expect(panAfterZoom({ x: -10, y: -20 }, frame, 4, 4)).toEqual({ x: -10, y: -20 })
  })
})

describe('fitToggleTarget', () => {
  const stage = { w: 1440, h: 774 }

  /**
   * The regression this exists to prevent: Fit lands on x5 at 1440 and x6 at
   * 1920 — 576x768, byte for byte the static frame the feature was built to
   * remove. At +1 a step, getting back was ten presses of a button labelled
   * something else.
   */
  it('goes back to the opening view from the fitted one, in one press', () => {
    const opened = resolveView(stage, WORLD, null)
    const fitted = resolveView(stage, WORLD, fitToggleTarget(opened, stage, WORLD))
    expect(fitted.scale).toBeLessThan(opened.scale)
    expect(fitToggleTarget(fitted, stage, WORLD)).toBe(opened.scale)
  })

  it('shows the whole month from a zoomed-in view, not just from the opening one', () => {
    const zoomed = resolveView(stage, WORLD, 20)
    const after = resolveView(stage, WORLD, fitToggleTarget(zoomed, stage, WORLD))
    expect(after.worldPx.w).toBeLessThanOrEqual(after.frame.w)
    expect(after.worldPx.h).toBeLessThanOrEqual(after.frame.h)
  })

  it('round-trips: fitted -> opened -> fitted', () => {
    const a = resolveView(stage, WORLD, null)
    const b = resolveView(stage, WORLD, fitToggleTarget(a, stage, WORLD))
    const c = resolveView(stage, WORLD, fitToggleTarget(b, stage, WORLD))
    expect(c.scale).toBe(a.scale)
  })

  it('has nothing to offer on a phone, where fit and fill are the same view', () => {
    const phone = { w: 390, h: 718 }
    const view = resolveView(phone, WORLD, null)
    expect(fitToggleTarget(view, phone, WORLD)).toBe(view.scale)
  })
})

describe('the camera\u2019s reach', () => {
  const stage = { w: 390, h: 718 }

  it('is the world box when the month fits inside it', () => {
    const view = resolveView(stage, WORLD, null)
    expect(view.reachPx).toBe(view.worldPx.h)
  })

  /**
   * Seven categories and up put settlements below art-y 128. The pan clamp
   * knew only about the world box, so at twelve, sixty-six CSS pixels of a
   * month were drawn and could not be dragged to. Spacing them is spec §3;
   * being able to SEE what was drawn is the camera's own job.
   */
  it('follows the drawn month when it runs past the world box', () => {
    const view = resolveView(stage, WORLD, null, 0, 196)
    expect(view.reachPx).toBe(196 * view.scale)
    expect(view.reachPx).toBeGreaterThan(view.worldPx.h)
  })

  it('lets the pan reach the bottom of a month that outgrew the canvas', () => {
    const deep = resolveView(stage, WORLD, null, 0, 196)
    const shallow = resolveView(stage, WORLD, null)
    const far = (v: typeof deep) =>
      clampPan({ x: 0, y: -99999 }, v.worldPx, v.frame, v.scale, 0, v.reachPx).y
    expect(far(deep)).toBeLessThan(far(shallow))
    // Far enough that the last drawn row clears the bottom of the frame.
    expect(-far(deep) + deep.frame.h).toBeGreaterThanOrEqual(196 * deep.scale)
  })

  it('never shortens the reach below the world box, whatever it is told', () => {
    const view = resolveView(stage, WORLD, null, 0, 10)
    expect(view.reachPx).toBe(view.worldPx.h)
  })

  it('leaves the certified viewport alone — the seeded month fits', () => {
    const view = resolveView({ w: 390, h: 718 }, WORLD, null, 0, 128)
    expect(view.worldPx).toEqual({ w: 384, h: 512 })
    expect(view.reachPx).toBe(512)
  })
})
