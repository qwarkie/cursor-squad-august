import type { ReactNode } from 'react'

import type { RiverModel } from '../engine'
import { GrassField } from './GrassField'
import { Foliage } from './Foliage'
import { WORLD_H, WORLD_W } from './path'
import { RANK_ART_W, tributaryEnd, trunkWidthAt } from './geometry'
import { maxHamletHeight } from './hamlet'
import { fieldBounds } from './view'
import { useWorldView } from './useWorldView'

/**
 * How far down the drawn month actually goes, in art units.
 *
 * NOT the world's height. `WORLD_H` is the coordinate space the river is
 * composed in and it stays fixed (FR-015) — this is how far the camera has to
 * be able to travel to reach what is already on the page.
 *
 * At seven categories and up the model puts settlements below art-y 128, and
 * the pan clamp — which knew only about the world box — stranded them: at
 * twelve, sixty-six pixels of the month were drawn and could not be dragged
 * to. Spacing them properly is spec §3 and is not this; letting a person see
 * what the app drew for them is the camera's own job, and the camera is here.
 */
function drawnDepth(model: RiverModel): number {
  let deepest = WORLD_H
  const mouth = model.segments[model.segments.length - 1]
  if (mouth) deepest = Math.max(deepest, mouth.toY)
  for (const trib of model.tributaries) {
    const end = tributaryEnd(trib.atY, trib.side, trunkWidthAt(model, trib.atY))
    deepest = Math.max(
      deepest,
      end.y + maxHamletHeight(trib.settlements, RANK_ART_W) / 2,
    )
  }
  return Math.ceil(deepest)
}

/**
 * The world grid, per art-bible.md §1. Everything in the SVG draws in this
 * coordinate space; the DOM overlay for sprites scales it to CSS pixels.
 *
 * The width lives in path.ts — the trunk's centre line is derived from it, so
 * a second copy here could drift and put the river off its own field.
 *
 * These are constants and must stay constants. Growing the world with the
 * viewport would make outlet positions (geometry.ts) and foliage placement
 * (grove.ts) functions of the browser window; FR-015/SC-007 require them to be
 * a pure function of the Budget. A bigger screen shows more of the world, not
 * more world.
 */
export { WORLD_H, WORLD_W }

type Props = {
  model: RiverModel
  /** The SVG river (trunk + tributaries) — a child so world/River.tsx can own its own render obligations without World.tsx reaching into engine geometry itself. */
  children?: ReactNode
  /**
   * DOM sprites (settlements, terminal-state art) — CSS pixels, not
   * art-pixels (art-bible.md §1), so this is a render prop rather than a
   * plain child: the caller needs `scale` to place anything correctly and
   * World.tsx is the only place that owns it.
   */
  overlay?: (scale: number) => ReactNode
}

/**
 * T007 — the world shell, and the window onto it.
 *
 * Three boxes, and the distinction between them is the whole feature:
 *
 *   stage  what the page gives us. Measured, so the world fills its column.
 *   frame  the window. Clips; never wider than the stage or the world.
 *   world  96x128 art units at an integer scale. May be larger than the frame,
 *          and usually is above 600px — which is what there is to drag.
 *
 * `data-scale` sits on the world, not the frame, because that is the element
 * whose box must equal the viewBox times the scale — the invariant
 * scripts/responsive_check.py asserts at six widths.
 */
export function World({ model, children, overlay }: Props) {
  const {
    stageRef,
    frameRef,
    insetRef,
    inset,
    view,
    pan,
    dragging,
    pannable,
    canZoomIn,
    canZoomOut,
    canFit,
    fitLabel,
    zoomIn,
    zoomOut,
    toggleFit,
    handlers,
  } = useWorldView(WORLD_W, WORLD_H, drawnDepth(model))

  const { scale, worldPx, frame } = view
  const width = worldPx.w
  const height = worldPx.h
  // The meadow is not the world: it fills the frame at every scale and every
  // pan, so zooming out reveals field rather than page. Constant per zoom
  // level, so the grass is generated once and not once per pointer move.
  const field = fieldBounds(view, inset)

  return (
    <div ref={stageRef} className="relative w-full">
      {/* A probe, not a parse: its width IS `--world-inset-right`, so the view's
          ResizeObserver fires when the layout declares or changes the rail.
          Setting a custom property resizes nothing, so without a box to watch
          the value is read once at mount — before the layout has measured its
          own rail — and is 0 forever after. Outside the frame, so it cannot
          reach any world fingerprint. */}
      <span
        ref={insetRef}
        data-world-inset=""
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 block"
        style={{ height: 0, width: 'var(--world-inset-right, 0px)', visibility: 'hidden' }}
      />
      <div
        ref={frameRef}
        // The window onto the world, named rather than inferred.
        //
        // Every script that needs it walks up from `[data-scale]` looking for
        // an ancestor whose `overflow` is not `visible` — and `App`'s root
        // carries `overflow-x-hidden` while being as tall as the document, so
        // that walk found a "frame" 1440x2038 for a 1440x900 window and had to
        // be patched with a viewport intersection to compensate. The clipping
        // element is mine; it can say so. Same reasoning as `data-field`,
        // `data-foliage` and `data-scale`: ask for a marker, not a heuristic.
        data-frame=""
        className="relative mx-auto overflow-hidden rounded"
        style={{
          width: frame.w,
          height: frame.h,
          backgroundColor: 'var(--color-grass)',
          // Claim only the axis there is somewhere to go on. A world that can
          // slide sideways but not down leaves `pan-y` to the page, so the
          // list below it stays reachable with a finger on a phone — taking
          // the whole gesture would strand it.
          touchAction: view.pannable.y ? 'none' : view.pannable.x ? 'pan-y' : 'auto',
          cursor: pannable ? (dragging ? 'grabbing' : 'grab') : 'default',
        }}
        {...handlers}
      >
        <div
          className="absolute left-0 top-0"
          style={{
            width,
            height,
            // Rounded: a fractional offset lands the art grid between device
            // pixels and undoes the integer scale it is riding on.
            transform: `translate3d(${Math.round(pan.x)}px, ${Math.round(pan.y)}px, 0)`,
            imageRendering: 'pixelated',
          }}
          data-scale={scale}
        >
          {/* Generated field, not a fill: grass.ts scatters blades, shadow specks
              and lit patches from a hash of the *absolute* cell coordinate, so
              it is identical on every load (FR-015), seamless when the window
              grows, and costs one data URL rather than several hundred rects.
              It hangs outside the world box on every side — that is the point:
              the field has no edge, the budget does. */}
          <div
            // Named, so a probe can say what it is excluding instead of
            // inferring it. Two layers of this world are SUPPOSED to run off
            // the edge of the frame — this field and the foliage — and every
            // script that asks "what is the lowest thing drawn" has to know
            // that. Both @Fizz and @Pollen shipped the same false positive
            // from guessing at it: the field is not "the biggest sprite", it
            // is this one.
            data-field="grass"
            className="pointer-events-none absolute"
            aria-hidden="true"
            style={{
              left: field.x0 * scale,
              top: field.y0 * scale,
              width: field.w * scale,
              height: field.h * scale,
            }}
          >
            <GrassField
              x0={field.x0}
              y0={field.y0}
              width={field.w}
              height={field.h}
              scale={scale}
            />
          </div>

          {/* Foliage sits under the SVG on purpose. grove.ts keeps it clear of the
              water by construction, and drawing it below the river means that if a
              keep-out is ever wrong the water covers the tree rather than the tree
              covering the water — the river always wins. Spots come back in
              absolute art units, so they place against the world's own origin
              and need no wrapper of their own. */}
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <Foliage model={model} region={field} scale={scale} />
          </div>

          <svg
            viewBox={`0 0 ${WORLD_W} ${WORLD_H}`}
            width={width}
            height={height}
            shapeRendering="crispEdges"
            className="absolute inset-0 block"
            role="img"
            aria-label="A river of money flowing through a green field"
          >
            {children}
          </svg>
          {overlay && (
            <div className="pointer-events-none absolute inset-0" aria-hidden="true">
              {overlay(scale)}
            </div>
          )}
        </div>

        {/* Outside the world layer on purpose: everything inside `[data-scale]`
            is fingerprinted as world geometry by scripts/walk_demo.py, and a
            control is not scenery.

            Bottom-right only from `lg`, where the layout reserves that corner.
            Below it the action bar is fixed across the bottom and an open sheet
            rises over it, and both painted straight over these: on screen, 44px,
            `cursor: pointer`, and unreachable at 390 and 768 — measured with
            `elementFromPoint`, which is the only thing that can see it. The top
            of the frame is clear at every width because the header is outside
            it. */}
        <div
          data-world-control=""
          className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2 lg:top-auto lg:bottom-0 lg:items-end"
        >
          {pannable ? (
            <span
              className="font-pixel select-none rounded px-2 py-1 text-[8px] leading-none"
              style={{
                background: 'var(--color-ink)',
                color: 'var(--color-paper)',
              }}
              aria-hidden="true"
            >
              drag to explore
            </span>
          ) : (
            <span />
          )}
          <span className="flex gap-2">
            <ZoomButton label="Zoom out" onClick={zoomOut} disabled={!canZoomOut}>
              −
            </ZoomButton>
            <ZoomButton label={fitLabel} onClick={toggleFit} disabled={!canFit}>
              ⤢
            </ZoomButton>
            <ZoomButton label="Zoom in" onClick={zoomIn} disabled={!canZoomIn}>
              +
            </ZoomButton>
          </span>
        </div>
      </div>
    </div>
  )
}

/**
 * Real, named buttons — unlike the sprite hit areas, which are `aria-hidden`
 * because the category list already carries their action. Nothing else in the
 * app can zoom, and "fit" is the keyboard-and-screen-reader equivalent of
 * dragging to the far edge, so these have to be in the accessibility tree.
 */
function ZoomButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="pointer-events-auto flex cursor-pointer items-center justify-center font-pixel text-[12px] leading-none disabled:cursor-default"
      style={{
        // FR-018 — 44 CSS px is the floor for anything a thumb has to find.
        minWidth: 44,
        minHeight: 44,
        // Solid, not translucent: art-bible.md §7 forbids alpha-composited
        // paint, and scripts/walk_demo.py asserts it — a 82%-opacity chip over
        // the field failed three checks before this line was a flat colour.
        // Disabled is a second flat colour rather than `opacity-40`, which over
        // a bright field reads as a smudge rather than as an unavailable
        // control.
        background: disabled ? 'var(--color-night)' : 'var(--color-ink)',
        color: disabled ? 'var(--color-slate)' : 'var(--color-paper)',
        border: `2px solid ${disabled ? 'var(--color-slate)' : 'var(--color-paper)'}`,
      }}
    >
      {children}
    </button>
  )
}
