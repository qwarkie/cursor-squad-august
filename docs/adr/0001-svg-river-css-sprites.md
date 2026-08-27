# ADR-0001: SVG for the river, CSS sprites for everything else — no canvas renderer

**Status**: Accepted · **Date**: 2026-08-26 · **Feature**: [001-money-river](../../specs/001-money-river/spec.md)

**Supersedes**: an earlier draft of this ADR that accepted PixelJS. That draft was written while `pixi.js`, `@pixi/react`, and `pixi-filters` were in `frontend/package.json`. They were removed the same afternoon and a working DOM/SVG implementation was built in their place. This file now records the decision that actually holds.

## Context

The hackathon brief is explicit:

> Use CSS/SVG or a small sprite sheet; avoid Three.js and complex game engines.

The constitution is nearly as explicit:

> No new runtime dependency that the demo path does not require.

The demo path needs a river that flows continuously, coins riding that flow, tributary and trunk widths that resize live on every amount change, and a dozen animating 8-bit sprites — at ≥30 fps on a phone at 390 × 844 (SC-004).

The case for a WebGL renderer rested on one claim: that hundreds of independently animating DOM nodes stall mobile Safari, because each one costs layout and paint every frame. **That claim does not hold against the implementation that exists.** `frontend/src/pixel/` animates sprites with a CSS `steps()` keyframe walking `background-position`, and moves coins with `offset-path` plus `offset-distance`. Both run on the **compositor**, off the main thread: no layout, no paint, no timer, and no React re-render per frame. The cost model the argument assumed is not the cost model in play.

## Decision

**Three layers, no canvas renderer.**

| Layer | Technique | Files |
|---|---|---|
| The river — trunk, tributaries, pool | One inline **SVG**, paths stroked at the width the engine computes | `frontend/src/world/` |
| Objects — houses, residents, coins, reservoir | **`PixelSprite`**: text art → RGBA → one `data:` URL strip, scaled with `image-rendering: pixelated` | `frontend/src/pixel/` |
| Chrome — header, bottom sheet, buttons | React + Tailwind DOM | `frontend/src/components/` |

Coins ride the river by sitting on the same path via `offset-path`.

Runtime dependencies stay at four: `motion`, `zustand`, `@fontsource/press-start-2p`, and React itself. No renderer, no noise library, no asset pipeline, no `public/` assets.

## Why SVG for the river specifically

The river is the one thing sprites cannot do, because its width is continuous data rather than fixed art. An SVG `<path>` carries that directly: **`stroke-width` is the flow width the engine computes**, and animating it is one property on one element. A trunk that narrows below each branch is three stroked paths with three different `stroke-width` values — which is the product's whole thesis, expressed in three numbers.

Crispness comes from `shape-rendering="crispEdges"`, which turns off anti-aliasing and gives the stair-stepped edge that reads as 8-bit. Without it the river is the one smooth-edged object in a hard-edged world, and it looks like a bug.

## Why not a canvas renderer

- ~400 KB gzip for a frame loop that the compositor already provides for free.
- `@pixi/react` 8 on React 19 is a recent, thinly-proven pairing — the least-certain part of a stack under a 90-minute clock.
- A canvas has no DOM, so every touch target, label, and focus ring becomes hand-rolled. The brief requires 44 × 44 px targets and readable numbers.
- Most decisively: a working, tested implementation of the alternative already exists — `raster.ts` is pure and unit-tested, and the suite is green at 21 tests. Replacing working code with an unproven dependency mid-clock inverts Principle IV, which says finish the slice rather than deepen it.

Three.js remains rejected for the reason the brief gives.

## Why not sprites for the river too

A sprite is fixed art at a fixed size. Encoding a continuously variable width as sprites means either re-rasterising a `data:` URL on every slider step — which reallocates a canvas per frame and is exactly the main-thread cost being avoided — or quantising width to a handful of pre-built sprites, which throws away the fine-grained response that makes the slider feel connected to the world.

## Consequences

**Accepted:**

- Two coordinate systems in one screen. The SVG works in **art-pixels** via its `viewBox`; DOM `offset-path` works in **CSS pixels** of the containing block. The same curve therefore needs two path strings that differ by the scale factor. A single helper emits both — see [art-bible.md](../../specs/001-money-river/art-bible.md) §1. Getting this wrong desynchronises the coins from the water, which looks broken and is easy to miss on desktop.
- `offset-rotate: 0deg` must be set on every element riding a path. The default is `auto`, which rotates the sprite along the curve and shears the pixel grid into diagonal mush.
- SVG filters are not an option for post-effects — no CRT scanlines, no bloom. Acceptable; both were polish and first on the cut list anyway.
- Very high particle counts remain untested at this scale. Mitigation: coin density is already a tunable in the model, and cutting it is third on the published cut list.

**Gained:**

- Four runtime dependencies instead of eleven, and roughly 400 KB less to ship.
- Sprites are text in `.ts` files. A stranger adds a house in twelve lines with no paint program, and the pull request diff shows the change as pixels ([Principle III](../../.specify/memory/constitution.md)).
- `raster.ts` is DOM-free, so it is unit-tested in Node rather than verified by eye.
- Reduced motion is one media query over all of it, already in `index.css`, rather than a per-object flag inside a frame loop.

## Revisit if

Coin density has to rise past what the compositor sustains on a mid-range phone, **and** cutting density has already been rejected as a scope decision. The fallback is a single `<canvas>` for particles only, with the river and sprites left exactly as they are — a strictly additive change, not a rewrite.
