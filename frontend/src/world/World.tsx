import type { ReactNode } from 'react'

import type { RiverModel } from '../engine'
import { GrassField } from './GrassField'
import { Foliage } from './Foliage'
import { WORLD_H, WORLD_W } from './path'
import { useWorldView } from './useWorldView'

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
  } = useWorldView(WORLD_W, WORLD_H)

  const { scale, worldPx, frame } = view
  const width = worldPx.w
  const height = worldPx.h

  return (
    <div ref={stageRef} className="w-full">
      <div
        ref={frameRef}
        className="relative mx-auto overflow-hidden rounded"
        style={{
          width: frame.w,
          height: frame.h,
          backgroundColor: 'var(--color-grass)',
          // Only claim the touch gesture on an axis there is somewhere to go.
          // A world that fits its frame must let the page scroll under the
          // finger, or the list below it becomes unreachable on a phone.
          touchAction: pannable ? 'none' : 'auto',
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
              and lit patches from a hash of the cell coordinates, so it is
              identical on every load (FR-015) and costs one data URL rather than
              several hundred rects. backgroundColor above stays as the fallback. */}
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <GrassField width={WORLD_W} height={WORLD_H} scale={scale} />
          </div>

          {/* Foliage sits under the SVG on purpose. grove.ts keeps it clear of the
              water by construction, and drawing it below the river means that if a
              keep-out is ever wrong the water covers the tree rather than the tree
              covering the water — the river always wins. */}
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <Foliage model={model} worldH={WORLD_H} scale={scale} />
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
            control is not scenery. */}
        <div
          data-world-control=""
          className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-2"
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
      className="pointer-events-auto flex cursor-pointer items-center justify-center font-pixel text-[12px] leading-none disabled:cursor-default disabled:opacity-40"
      style={{
        // FR-018 — 44 CSS px is the floor for anything a thumb has to find.
        minWidth: 44,
        minHeight: 44,
        // Solid, not translucent: art-bible.md §7 forbids alpha-composited
        // paint, and scripts/walk_demo.py asserts it — a 82%-opacity chip over
        // the field failed three checks before this line was a flat colour.
        background: 'var(--color-ink)',
        color: 'var(--color-paper)',
        border: '2px solid var(--color-paper)',
      }}
    >
      {children}
    </button>
  )
}
