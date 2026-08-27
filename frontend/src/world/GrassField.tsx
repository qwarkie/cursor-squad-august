import { PixelSprite } from '../pixel'
import { grassField } from './grass'
import { PAL } from './palette'

type Props = {
  width: number
  height: number
  /** CSS pixels per art pixel — the world's integer scale, nothing else. */
  scale: number
}

/**
 * Slower than the 4-8 fps art-bible.md §5 sets for object frames, and
 * deliberately: an object animating at 4 fps is alive, but a whole field
 * changing every 250 ms is a strobe. At 2.5 fps a blade takes 1.6 s to
 * complete its lean, which reads as wind at the edge of attention.
 */
const WIND_FPS = 2.5

/**
 * The grass field, drawn under everything. One `PixelSprite`, so the wind
 * runs as a `background-position` `steps()` keyframe on the compositor —
 * no timers, no React re-renders, and it stops dead under
 * `prefers-reduced-motion` with the rest of the world.
 */
export function GrassField({ width, height, scale }: Props) {
  return (
    <PixelSprite
      art={grassField(width, height)}
      palette={PAL}
      scale={scale}
      fps={WIND_FPS}
      className="absolute inset-0 block"
    />
  )
}
