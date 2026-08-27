import { describe, expect, it } from 'vitest'

import {
  clampPan,
  containScale,
  fitScale,
  frameOf,
  panAfterZoom,
  resolveView,
  MAX_SCALE,
  MIN_SCALE,
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
  const frame = { w: 1440, h: 648 }

  it('pins an axis with nothing to spare at zero', () => {
    expect(clampPan({ x: -200, y: 0 }, world, frame).x).toBe(0)
    expect(clampPan({ x: 200, y: 0 }, world, frame).x).toBe(0)
  })

  it('never opens a gutter at either edge of an axis that overflows', () => {
    expect(clampPan({ x: 0, y: 500 }, world, frame).y).toBe(0)
    expect(clampPan({ x: 0, y: -99999 }, world, frame).y).toBe(frame.h - world.h)
  })

  it('leaves an offset inside the range alone', () => {
    expect(clampPan({ x: 0, y: -400 }, world, frame)).toEqual({ x: 0, y: -400 })
  })

  it('pins both axes when the world fits its frame exactly', () => {
    const fitted = { w: 384, h: 512 }
    expect(clampPan({ x: -50, y: -50 }, fitted, fitted)).toEqual({ x: 0, y: 0 })
  })
})

describe('frameOf', () => {
  it('is never larger than the world, so no gutter can open inside it', () => {
    const f = frameOf({ w: 384, h: 512 }, { w: 1440, h: 900 })
    expect(f).toEqual({ w: 384, h: 512 })
  })

  it('is never larger than the stage, so the world stays a window', () => {
    const f = frameOf({ w: 1440, h: 1920 }, { w: 1440, h: 648 })
    expect(f).toEqual({ w: 1440, h: 648 })
  })
})

describe('resolveView', () => {
  /** The certified viewport. scripts/baseline_390.py pins box [3, 110, 384, 512]. */
  it('leaves 390x844 exactly where it was: x4, 384x512, nothing to drag', () => {
    const view = resolveView({ w: 390, h: 608 }, WORLD, null)
    expect(view.scale).toBe(4)
    expect(view.worldPx).toEqual({ w: 384, h: 512 })
    expect(view.frame).toEqual({ w: 384, h: 512 })
    expect(view.pannable).toEqual({ x: false, y: false })
  })

  it('gives a desktop a world taller than its window — something to drag', () => {
    const view = resolveView({ w: 1440, h: 648 }, WORLD, null)
    expect(view.scale).toBe(15)
    expect(view.worldPx).toEqual({ w: 1440, h: 1920 })
    expect(view.frame).toEqual({ w: 1440, h: 648 })
    expect(view.pannable).toEqual({ x: false, y: true })
  })

  it('clamps a request rather than honouring it, in both directions', () => {
    const stage = { w: 1440, h: 648 }
    expect(resolveView(stage, WORLD, 999).scale).toBe(resolveView(stage, WORLD, null).maxScale)
    expect(resolveView(stage, WORLD, -999).scale).toBe(resolveView(stage, WORLD, null).minScale)
  })

  it('can always be zoomed back out to the whole world', () => {
    const stage = { w: 1440, h: 648 }
    expect(resolveView(stage, WORLD, containScale(stage, WORLD)).pannable).toEqual({
      x: false,
      y: false,
    })
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
