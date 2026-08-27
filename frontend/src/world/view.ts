/**
 * The world's viewport arithmetic — pure, so it can be tested without a DOM
 * and reasoned about without React.
 *
 * The rule the whole file exists to enforce: **integer scales only**
 * (art-bible.md §1). A fractional scale puts pixel edges between device
 * pixels and every sprite in the world goes soft, so every function here
 * floors rather than fits exactly, and accepts the leftover.
 *
 * World size stays a constant (`WORLD_W` x `WORLD_H` art units). Growing it
 * with the viewport would make river geometry a function of the browser
 * window, and FR-015/SC-007 require it to be a pure function of the Budget.
 * The viewport changes how much of the world you can see at once, never how
 * much world there is.
 */

export type Box = { w: number; h: number }
export type Pan = { x: number; y: number }

/** Below x3 the 1px details in the art (window frames, blades) stop resolving. */
export const MIN_SCALE = 3
/** Above x24 a single art pixel is a thumb-tip and the field stops reading as a map. */
export const MAX_SCALE = 24
/** How far past fit-to-width a person may zoom in. Integer steps. */
export const MAX_ZOOM_IN = 8
/** Movement, in CSS px, that turns a press into a drag rather than a tap. */
export const DRAG_SLOP = 5

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi)

/**
 * Largest integer scale whose world is no wider than the space it is given.
 *
 * This is the rule the old four-row scale table was already following — at the
 * lower bound of each of its bands (320/390/480/600) it returns exactly the
 * value the table did (3/4/5/6). The table's only real content was the cap at
 * x6, which is why the app stopped responding to width at 600px.
 */
export function fitScale(stageW: number, worldW: number): number {
  return clamp(Math.floor(stageW / worldW), MIN_SCALE, MAX_SCALE)
}

/** Largest integer scale that shows the whole world at once — the "fit all" view. */
export function containScale(stage: Box, world: Box): number {
  return clamp(
    Math.floor(Math.min(stage.w / world.w, stage.h / world.h)),
    MIN_SCALE,
    MAX_SCALE,
  )
}

/**
 * The window onto the world. Never larger than the world itself, so a gutter
 * of background can never open up inside the frame, and never larger than the
 * space available, so the world is a window rather than a page section.
 */
export function frameOf(worldPx: Box, stage: Box): Box {
  return { w: Math.min(worldPx.w, stage.w), h: Math.min(worldPx.h, stage.h) }
}

/**
 * Pan offsets are negative or zero: the world hangs off the top-left of its
 * frame and is dragged back. Clamping to `min(0, frame - world)` means an axis
 * with nothing to spare pins at 0 rather than drifting into empty space.
 */
export function clampPan(pan: Pan, worldPx: Box, frame: Box): Pan {
  return {
    x: clamp(pan.x, Math.min(0, frame.w - worldPx.w), 0),
    y: clamp(pan.y, Math.min(0, frame.h - worldPx.h), 0),
  }
}

export type View = {
  scale: number
  /** The scale that fills the width — the default view. */
  fit: number
  worldPx: Box
  frame: Box
  /** Zoom bounds, already resolved against this stage. */
  minScale: number
  maxScale: number
  /** True on an axis the world overflows — the only axis worth dragging. */
  pannable: { x: boolean; y: boolean }
}

/**
 * One call, so scale and box can never disagree.
 *
 * `request` is an absolute scale, or `null` for "follow the width". Storing
 * the request absolutely rather than as an offset means a window resize
 * cannot silently walk someone's chosen zoom up or down — it can only clamp
 * it, and clamping is visible.
 */
export function resolveView(stage: Box, world: Box, request: number | null): View {
  const fit = fitScale(stage.w, world.w)
  const minScale = Math.min(fit, containScale(stage, world))
  const maxScale = Math.min(MAX_SCALE, fit + MAX_ZOOM_IN)
  const scale = clamp(request ?? fit, minScale, maxScale)
  const worldPx = { w: world.w * scale, h: world.h * scale }
  const frame = frameOf(worldPx, stage)
  return {
    scale,
    fit,
    worldPx,
    frame,
    minScale,
    maxScale,
    pannable: { x: worldPx.w > frame.w, y: worldPx.h > frame.h },
  }
}

/**
 * Zooming should keep what you are looking at where it is. Without this the
 * frame centre slides toward the world's top-left on every step and a person
 * zooming into the reservoir arrives at the spring.
 */
export function panAfterZoom(pan: Pan, frame: Box, from: number, to: number): Pan {
  const k = to / from
  return {
    x: (pan.x - frame.w / 2) * k + frame.w / 2,
    y: (pan.y - frame.h / 2) * k + frame.h / 2,
  }
}
