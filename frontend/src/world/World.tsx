import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'

import type { RiverModel } from '../engine'
import { GrassField } from './GrassField'
import { Foliage } from './Foliage'

/**
 * The world grid, per art-bible.md §1. Everything in the SVG draws in this
 * coordinate space; the DOM overlay for sprites scales it to CSS pixels.
 */
export const WORLD_W = 96
export const WORLD_H = 128

/**
 * Integer scale factors only (art-bible.md §1 Scale table) — a fractional
 * scale puts pixel edges between device pixels and every sprite goes soft.
 */
function scaleForWidth(viewportWidth: number): number {
  if (viewportWidth < 390) return 3
  if (viewportWidth < 480) return 4
  if (viewportWidth < 600) return 5
  return 6
}

function useIntegerScale(): number {
  const [scale, setScale] = useState<number>(() =>
    typeof window === 'undefined' ? 4 : scaleForWidth(window.innerWidth),
  )

  useEffect(() => {
    const onResize = () => setScale(scaleForWidth(window.innerWidth))
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return scale
}

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
 * T007 — the world shell. A solid grass field at the right integer scale is
 * the acceptance bar on its own: everything else (river, sprites, terminal
 * states) composes inside this box without changing its size or position.
 */
export function World({ model, children, overlay }: Props) {
  const scale = useIntegerScale()
  const width = WORLD_W * scale
  const height = WORLD_H * scale

  return (
    <div
      className="relative mx-auto overflow-hidden rounded"
      style={{
        width,
        height,
        backgroundColor: 'var(--color-grass)',
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
  )
}
