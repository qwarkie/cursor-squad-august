import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'

import type { RiverModel } from '../engine'

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
}

/**
 * T007 — the world shell. A solid grass field at the right integer scale is
 * the acceptance bar on its own: everything else (river, sprites, terminal
 * states) composes inside this box without changing its size or position.
 */
export function World({ children }: Props) {
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
    </div>
  )
}
