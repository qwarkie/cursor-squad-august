import { useMemo } from 'react'

import type { Palette } from './raster'
import { spriteStrip } from './sprite'

/** One frame of art: rows of characters resolved through the palette. */
export type Art = readonly string[]

type Props = {
  /** A single frame, or several of identical size to cycle as an animation. */
  art: Art | readonly Art[]
  palette: Palette
  /** CSS pixels per art pixel. Integers keep the grid crisp. */
  scale?: number
  /** Frames per second, when `art` holds more than one frame. */
  fps?: number
  className?: string
  /** Leave empty for decorative sprites; the world always carries a text label. */
  alt?: string
}

const isMultiFrame = (art: Art | readonly Art[]): art is readonly Art[] =>
  Array.isArray(art[0])

export function PixelSprite({
  art,
  palette,
  scale = 4,
  fps = 6,
  className,
  alt = '',
}: Props) {
  const frames = useMemo<Art[]>(() => (isMultiFrame(art) ? [...art] : [art]), [art])
  const strip = useMemo(() => spriteStrip(frames, palette), [frames, palette])

  const width = strip.frameWidth * scale
  const height = strip.height * scale
  const stripWidth = width * strip.frames

  return (
    <span
      role={alt ? 'img' : 'presentation'}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
      className={className}
      style={{
        display: 'inline-block',
        width,
        height,
        imageRendering: 'pixelated',
        backgroundImage: `url(${strip.url})`,
        backgroundSize: `${stripWidth}px ${height}px`,
        backgroundRepeat: 'no-repeat',
        ...(strip.frames > 1
          ? {
              // steps() needs a literal, so the count is interpolated here
              // rather than read from a custom property.
              animation: `pixel-strip ${strip.frames / fps}s steps(${strip.frames}) infinite`,
              ['--pixel-strip-w' as string]: `${stripWidth}px`,
            }
          : null),
      }}
    />
  )
}
