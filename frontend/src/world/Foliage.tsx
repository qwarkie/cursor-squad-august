import { PixelSprite } from '../pixel'
import { BUSH, TREE, WORLD_FPS } from './objects'
import { PAL } from './palette'
import { grove, type GroveInput } from './grove'

type Props = {
  model: GroveInput
  worldH: number
  /** CSS pixels per art pixel. */
  scale: number
}

/**
 * Foliage on the open field — the answer to a world that reads as a flat green
 * rectangle once the river and villages are drawn.
 *
 * Placement lives in `grove.ts` and is pure: this component turns art cells
 * into CSS pixels and nothing else. Trees sway at `WORLD_FPS` like every other
 * discrete object; bushes are a single frame on purpose, so the undergrowth
 * stays still while the canopies move.
 *
 * Decorative, so every sprite carries `alt=""` — the world already has its
 * label on the SVG (art-bible.md §3), and a screen reader announcing thirty
 * trees would bury it.
 */
export function Foliage({ model, worldH, scale }: Props) {
  return (
    <>
      {grove(model, worldH).map((spot) => (
        // `data-foliage` names the thing rather than where it currently sits.
        // Without it a check has to identify a tree by its size or its
        // coordinates — both facts that already live in objects.ts and
        // grove.ts, and both mechanisms rather than the property. Redraw TREE
        // one pixel wider and a size-based check goes red on correct art.
        // Same reasoning as `data-tributary` in River.tsx.
        <span
          key={`${spot.kind}-${spot.x}-${spot.y}`}
          data-foliage={spot.kind}
          className="absolute block"
          style={{ left: spot.x * scale, top: spot.y * scale }}
        >
          {spot.kind === 'tree' ? (
            <PixelSprite art={TREE} palette={PAL} scale={scale} fps={WORLD_FPS} alt="" />
          ) : (
            <PixelSprite art={BUSH} palette={PAL} scale={scale} alt="" />
          )}
        </span>
      ))}
    </>
  )
}
