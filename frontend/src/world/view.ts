/**
 * The world's viewport arithmetic — pure, so it can be tested without a DOM
 * and reasoned about without React.
 *
 * The rule the whole file exists to enforce: **integer scales only**
 * (art-bible.md §1). A fractional scale puts pixel edges between device
 * pixels and every sprite in the world goes soft, so every function here
 * floors rather than fits exactly, and accepts the leftover.
 *
 * Two domains, and keeping them apart is the other job here:
 *
 *   the river, its settlements and its coins   96 x 128 art units, f(Budget)
 *   the meadow around them                     fills the frame, f(cell)
 *
 * `WORLD_W` and `WORLD_H` are constants because FR-015/SC-007 require river
 * geometry to be a pure function of the Budget, not of the browser window.
 * The field has no such obligation — it is a hash of the cell coordinate, so
 * it can extend as far as there is frame to fill and still be identical on
 * every reload. A bigger screen shows more *field*, never more river.
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
/**
 * How far past the world's edge you may drag, in art units — the width of the
 * meadow border. Enough that there is somewhere to go, not so much that the
 * river can be lost off the side of the screen.
 */
export const PAN_MARGIN = 16

/**
 * Where an untouched world rests below the frame's top edge, in art units.
 *
 * Deliberately NOT `PAN_MARGIN`. That is how far you may drag *past* the
 * world's edge; this is where it settles when nobody has dragged it, and the
 * two answer to opposite pressures. It has to be more than zero, or art row 0
 * sits under the control rail and at scale 3 that is the spring's own "Edit
 * income" target. It has to stay small, or a month that now grows downward
 * pushes its lower villages under the action bar fixed to the bottom of the
 * page — `Select Food`, unreachable at 320x568. Both are measured by
 * `scripts/responsive_check.py`, at six widths, and this sits between them.
 */
export const REST_TOP = 6

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

/** Largest integer scale that shows the whole world at once — the "fit" view. */
export function containScale(stage: Box, world: Box): number {
  return clamp(
    Math.floor(Math.min(stage.w / world.w, stage.h / world.h)),
    MIN_SCALE,
    MAX_SCALE,
  )
}

/**
 * The window onto the world: all of the space it was given, always.
 *
 * It used to be `min(world, stage)`, shrink-wrapped so no gutter could open
 * inside it. That was right while the world was the only thing drawn, and it
 * is what made zooming out a *shrink* — the world got smaller inside a frame
 * that shrank with it, and everything around it went back to being page.
 * Filling the stage means what surrounds the world is field, not night.
 */
export function frameOf(_worldPx: Box, stage: Box): Box {
  return { w: stage.w, h: stage.h }
}

/**
 * How far the world may be dragged on one axis, and which way it settles when
 * there is nothing to choose.
 *
 * `anchor` is the difference between the two axes: across, a river down the
 * middle of the frame is the picture; down, the river starts at the spring and
 * reading it means starting there. Top-anchoring is also what keeps the
 * certified 390x844 box at [3, 110, 384, 512] while the frame around it grows.
 */
export function panRange(
  world: number,
  frame: number,
  scale: number,
  anchor: 'centre' | 'start',
  inset = 0,
): { lo: number; hi: number; locked: boolean } {
  const m = PAN_MARGIN * scale
  const hi = m
  // The far edge is the edge of what can be SEEN, not of what is painted.
  // Clamping to the frame stops the drag while the last village is still
  // behind the panel — reachable in principle, unreachable in fact.
  const lo = frame - inset - m - world
  if (lo > hi) {
    // Nothing to drag on this axis, so the only question is where it settles.
    // `inset` is space the frame owns and a person cannot see into: settle in
    // what is visible, not in the middle of what is painted.
    const at = anchor === 'centre' ? Math.round((frame - inset - world) / 2) : 0
    return { lo: at, hi: at, locked: true }
  }
  return { lo, hi, locked: false }
}

export function clampPan(
  pan: Pan,
  worldPx: Box,
  frame: Box,
  scale: number,
  insetRight = 0,
  /** Vertical reach; defaults to the world box for callers that have no month. */
  reachPx = worldPx.h,
): Pan {
  const x = panRange(worldPx.w, frame.w, scale, 'centre', insetRight)
  const y = panRange(Math.max(reachPx, worldPx.h), frame.h, scale, 'start')
  return { x: clamp(pan.x, x.lo, x.hi), y: clamp(pan.y, y.lo, y.hi) }
}

/**
 * Where the world sits before anyone drags it.
 *
 * `insetRight` is space the frame owns but a person cannot see into — a panel
 * floating over the field. The field still fills the whole frame, because the
 * point of full-bleed is that there is no edge; but the *river* centres in
 * what is actually visible. Without it the world centres under the panel and
 * the top-right village — Housing, at every budget — sits behind it.
 */
export function restingPan(
  worldPx: Box,
  frame: Box,
  scale: number,
  insetRight = 0,
): Pan {
  return clampPan(
    // Rest inside the meadow border, not flush against the frame.
    //
    // `y: 0` was fine while the world was always shorter than its frame: it
    // was locked, `clampPan` overrode it with the centred anchor, and the top
    // of the frame stayed empty. A world that grows with the month is taller
    // than the frame and unlocked, so `y: 0` put art row 0 exactly under the
    // control rail — and at scale 3 that is where the spring's "Edit income"
    // target sits, covered and unreachable without a drag nobody knows to make.
    //
    // `clampPan` caps this at the drag margin, so the value only ever asks.
    // A locked axis is unaffected: `panRange` pins both ends to its own anchor
    // and this is discarded.
    { x: Math.round((frame.w - insetRight - worldPx.w) / 2), y: REST_TOP * scale },
    worldPx,
    frame,
    scale,
    insetRight,
  )
}

export type View = {
  scale: number
  /**
   * How far down the camera may travel, in CSS px — the world box, or the
   * drawn month if it is taller.
   *
   * Distinct from `worldPx` on purpose. The world's own coordinate space is
   * 96 x 128 and stays that way (FR-015); this is the camera's reach, and a
   * camera that cannot reach pixels that are on the page is a camera bug, not
   * a layout opinion. When a month outgrows the canvas the layout is wrong —
   * but stranding the bottom of it behind a clamp is wrong twice.
   */
  reachPx: number
  /** The scale that fills the width — the default view. */
  fit: number
  worldPx: Box
  frame: Box
  /** Zoom bounds, already resolved against this stage. */
  minScale: number
  maxScale: number
  /** True on an axis with room to drag. */
  pannable: { x: boolean; y: boolean }
}

/**
 * One call, so scale and box can never disagree.
 *
 * `request` is an absolute scale, or `null` for "follow the width". Storing
 * the request absolutely rather than as an offset means a window resize cannot
 * silently walk someone's chosen zoom up or down — it can only clamp it, and
 * clamping is visible.
 */
export function resolveView(
  stage: Box,
  world: Box,
  request: number | null,
  insetRight = 0,
  /** The drawn month's own depth in art units; defaults to the world box. */
  contentH = world.h,
): View {
  // Fit the width a person can see, not the width that is painted. The field
  // still fills the whole frame — `frameOf` is untouched — but opening the app
  // at a scale that puts the top-right village behind a floating panel is a
  // picture of the river with the largest expense hidden in it.
  const fit = fitScale(Math.max(1, stage.w - insetRight), world.w)
  const maxScale = Math.min(MAX_SCALE, fit + MAX_ZOOM_IN)
  // Zooming out below fit is the point, not an edge case: it is how a phone
  // gets to see a big world. The floor is the art's own legibility limit.
  const minScale = Math.min(MIN_SCALE, fit)
  const scale = clamp(request ?? fit, minScale, maxScale)
  const worldPx = { w: world.w * scale, h: world.h * scale }
  const reachPx = Math.max(worldPx.h, Math.max(contentH, world.h) * scale)
  const frame = frameOf(worldPx, stage)
  return {
    scale,
    fit,
    worldPx,
    reachPx,
    frame,
    minScale,
    maxScale,
    pannable: {
      x: !panRange(worldPx.w, frame.w, scale, 'centre', insetRight).locked,
      y: !panRange(reachPx, frame.h, scale, 'start').locked,
    },
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

/**
 * Fit is a toggle, not a one-way door.
 *
 * A 96x128 portrait world cannot fill a landscape frame while staying fully
 * visible, so "show me the whole month" always lands well below the opening
 * scale. Stepping back at +1 a press made that a ten-press journey with
 * nothing labelled "back", so the same button returns you.
 */
export function fitToggleTarget(view: View, stage: Box, world: Box): number {
  const contain = containScale(stage, world)
  return view.scale <= contain ? view.fit : contain
}

/**
 * The rectangle the field must cover, in art units relative to the world's own
 * origin — negative at the top-left, because the meadow starts before the
 * world does.
 *
 * Derived from the pan *bounds* rather than the current offset, so it is
 * constant for a given scale and frame: the field is generated once per zoom
 * level instead of once per pointer move, and no unpainted edge can be dragged
 * into view.
 */
export function fieldBounds(view: View, insetRight = 0): { x0: number; y0: number; w: number; h: number } {
  const { scale, worldPx, frame } = view
  const rx = panRange(worldPx.w, frame.w, scale, 'centre', insetRight)
  const ry = panRange(view.reachPx, frame.h, scale, 'start')
  // The frame's own edges, in art units, at the two extremes of each axis.
  // Taken from the range rather than assuming the spare space is shared evenly
  // — down, it is not: the world anchors to the top and all of it is below.
  const x0 = Math.floor(-rx.hi / scale)
  const y0 = Math.floor(-ry.hi / scale)
  return {
    x0,
    y0,
    w: Math.ceil((-rx.lo + frame.w) / scale) - x0,
    h: Math.ceil((-ry.lo + frame.h) / scale) - y0,
  }
}
