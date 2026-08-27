import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, MouseEvent as ReactMouseEvent } from 'react'

import {
  clampPan,
  fitToggleTarget,
  panAfterZoom,
  resolveView,
  restingPan,
  DRAG_SLOP,
  type Box,
  type Pan,
  type View,
} from './view'

/** Breathing room under the world, so the frame does not butt the window edge. */
const BOTTOM_GAP = 16
/** Under this the world stops being navigable and becomes a letterbox. */
const MIN_FRAME_H = 280

/**
 * The height available to the world, measured rather than guessed.
 *
 * This was a fraction of the viewport, which left ~140px of empty night below
 * the frame once the desktop layout moved the action bar into a side rail:
 * a constant fraction cannot know what else is on the page. `top` is taken at
 * rest (rect + scrollY) so scrolling cannot feed back into the frame's size —
 * only the chrome *above* the world decides it, and that does not move.
 */
/**
 * Space the layout floats a panel over, declared by the layout itself.
 *
 * Measured off a probe element whose width *is* `--world-inset-right`, rather
 * than parsed out of `getComputedStyle`. Two reasons, and the first is the one
 * that bit:
 *
 *   Declaring a custom property does not resize anything, so a `ResizeObserver`
 *   on the stage never fires and the value is read once, at mount, before the
 *   layout has measured its own rail. It read 404px correctly and spent 0
 *   forever. Giving the value a box makes it an event.
 *
 *   A custom property is a token stream, not a length: `calc(380px + 1.5rem)`
 *   comes back verbatim and `parseFloat` returns NaN. A box is already resolved.
 */
function insetOf(probe: HTMLElement | null): number {
  const w = probe?.getBoundingClientRect().width ?? 0
  return Number.isFinite(w) && w > 0 ? w : 0
}

function availableHeight(el: HTMLElement): number {
  const topAtRest = el.getBoundingClientRect().top + window.scrollY
  return Math.max(MIN_FRAME_H, Math.round(window.innerHeight - topAtRest - BOTTOM_GAP))
}

const distance = (a: Pan, b: Pan) => Math.hypot(a.x - b.x, a.y - b.y)

export type WorldView = {
  view: View
  pan: Pan
  dragging: boolean
  /** True when the world overflows its window on either axis. */
  pannable: boolean
  zoomIn: () => void
  zoomOut: () => void
  toggleFit: () => void
  canZoomIn: boolean
  canZoomOut: boolean
}

/**
 * The world as a window rather than a picture.
 *
 * Two measurements drive everything: the width the layout gives us (observed,
 * not read off `window`, so the world fills whatever column it is placed in)
 * and a share of the viewport height. The scale follows the width in integer
 * steps; anything the window cannot show is reachable by dragging.
 */
export function useWorldView(worldW: number, worldH: number, contentH = worldH) {
  const stageRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const insetRef = useRef<HTMLSpanElement>(null)

  const [inset, setInset] = useState(0)
  const [stage, setStage] = useState<Box>(() => ({
    w: typeof window === 'undefined' ? 390 : window.innerWidth,
    h: typeof window === 'undefined' ? 512 : Math.max(MIN_FRAME_H, window.innerHeight),
  }))
  const [request, setRequest] = useState<number | null>(null)
  const [pan, setPan] = useState<Pan>({ x: 0, y: 0 })
  /** Set once the world has been dragged or zoomed, so a resize can re-settle
      an untouched view without yanking one someone has positioned. */
  const touched = useRef(false)
  const [dragging, setDragging] = useState(false)

  const world = useMemo<Box>(() => ({ w: worldW, h: worldH }), [worldW, worldH])
  const view = useMemo(
    () => resolveView(stage, world, request, inset, contentH),
    [stage, world, request, inset, contentH],
  )
  const pannable = view.pannable.x || view.pannable.y

  // Measure the space the layout actually gives the world. `clientWidth` of the
  // stage rather than `window.innerWidth`: put the world in a 900px column
  // beside a list and it fills the column, not the screen.
  useLayoutEffect(() => {
    const el = stageRef.current
    if (!el) return
    const measure = () => {
      const w = el.clientWidth || window.innerWidth
      const h = availableHeight(el)
      const right = insetOf(insetRef.current)
      setInset((prev) => (prev === right ? prev : right))
      setStage((prev) => (prev.w === w && prev.h === h ? prev : { w, h }))
    }
    measure()
    const ro =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    ro?.observe(el)
    // The probe changes width the moment the layout declares its rail, which
    // is the only signal that a custom property was set at all.
    if (insetRef.current) ro?.observe(insetRef.current)
    window.addEventListener('resize', measure)
    return () => {
      ro?.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])

  // A resize can shrink the world out from under the current offset. Re-clamp
  // rather than leave a gutter open at the edge.
  useEffect(() => {
    setPan((p) => {
      const next = touched.current
        ? clampPan(p, view.worldPx, view.frame, view.scale, inset, view.reachPx)
        : restingPan(view.worldPx, view.frame, view.scale, inset)
      return next.x === p.x && next.y === p.y ? p : next
    })
    // `view` is memoised, so this settles in one pass: an unchanged clamp
    // returns the same object and React stops.
  }, [view, inset])

  /** Absolute, clamped, and centre-preserving — see `panAfterZoom`. */
  const zoomTo = useCallback(
    (target: number) => {
      const next = resolveView(stage, world, target, inset, contentH)
      if (next.scale === view.scale) return
      touched.current = true
      setRequest(next.scale)
      setPan(
        clampPan(
          panAfterZoom(pan, view.frame, view.scale, next.scale),
          next.worldPx,
          next.frame,
          next.scale,
          inset,
          next.reachPx,
        ),
      )
    },
    [stage, world, view, pan, inset, contentH],
  )

  const zoomIn = useCallback(() => zoomTo(view.scale + 1), [zoomTo, view.scale])
  const zoomOut = useCallback(() => zoomTo(view.scale - 1), [zoomTo, view.scale])
  const fitTarget = fitToggleTarget(view, { w: Math.max(1, stage.w - inset), h: stage.h }, world)
  const toggleFit = useCallback(() => zoomTo(fitTarget), [zoomTo, fitTarget])

  // ---- gestures ------------------------------------------------------------
  // One pointer drags, two pinch. Pointer events rather than touch events so a
  // mouse, a finger and a pen all take the same path — a tablet is the case
  // this whole feature exists for and it is both at once.
  const pointers = useRef(new Map<number, Pan>())
  const drag = useRef<{ id: number; from: Pan; origin: Pan; moved: boolean } | null>(null)
  const pinch = useRef<{ d0: number; scale0: number } | null>(null)
  const suppressClick = useRef(false)

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    suppressClick.current = false
    // The zoom controls sit inside the frame, and `setPointerCapture` below
    // retargets the whole gesture — including the resulting `click` — at the
    // frame. Capturing a press that started on a button therefore swallows it
    // silently: the button renders, reports 44px, and does nothing. Sprite hit
    // areas are deliberately not exempt; dragging across the world should work
    // wherever the finger lands on it.
    if ((e.target as Element | null)?.closest?.('[data-world-control]')) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      pinch.current = { d0: distance(a, b), scale0: view.scale }
      drag.current = null
      setDragging(false)
      return
    }
    if (!pannable || pointers.current.size !== 1) return
    // Deliberately NOT capturing the pointer yet. Capture retargets the
    // resulting `click` at the frame, so capturing on press swallows every tap
    // in the world the moment the world becomes pannable — the villages, the
    // reservoir and the trunk's running total all go dead above 600px while
    // still reporting a 44px target and a pointer cursor. Capture is taken in
    // `onPointerMove`, once the press has actually become a drag.
    drag.current = {
      id: e.pointerId,
      from: { x: e.clientX, y: e.clientY },
      origin: pan,
      moved: false,
    }
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (pinch.current && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()]
      const d = distance(a, b)
      if (pinch.current.d0 > 0) {
        // Rounded to an integer: the zoom is continuous under the finger but
        // the world only ever renders on whole pixels (art-bible.md §1).
        zoomTo(Math.round(pinch.current.scale0 * (d / pinch.current.d0)))
      }
      return
    }

    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    const dx = e.clientX - d.from.x
    const dy = e.clientY - d.from.y
    if (!d.moved && Math.hypot(dx, dy) < DRAG_SLOP) return
    if (!d.moved) {
      // It is a drag now, not a press. Take the pointer so it keeps tracking
      // outside the frame, and only now show the closed hand.
      d.moved = true
      e.currentTarget.setPointerCapture(e.pointerId)
      setDragging(true)
    }
    touched.current = true
    setPan(
      clampPan(
        { x: d.origin.x + dx, y: d.origin.y + dy },
        view.worldPx,
        view.frame,
        view.scale,
        inset,
        view.reachPx,
      ),
    )
  }

  const endPointer = (e: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) pinch.current = null
    const d = drag.current
    if (d && d.id === e.pointerId) {
      // A press that travelled is a drag, and the tap it would otherwise fire
      // on whatever is under the finger has to be swallowed.
      suppressClick.current = d.moved
      drag.current = null
      setDragging(false)
      if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId)
      }
    }
  }

  const onClickCapture = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (!suppressClick.current) return
    suppressClick.current = false
    e.stopPropagation()
    e.preventDefault()
  }

  const onDoubleClick = () => {
    if (view.scale >= view.maxScale) zoomTo(fitTarget)
    else zoomTo(view.scale + 2)
  }

  // Wheel has to be a native listener: React's is passive, so `preventDefault`
  // there is a no-op and the page scrolls behind the zoom. Only ctrl/meta+wheel
  // — which is also how a trackpad pinch arrives — so an ordinary scroll over
  // the world still scrolls the page.
  useEffect(() => {
    const el = frameRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      zoomTo(view.scale + (e.deltaY < 0 ? 1 : -1))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [zoomTo, view.scale])

  return {
    stageRef,
    frameRef,
    insetRef,
    inset,
    view,
    pan,
    dragging,
    pannable,
    atFit: view.scale === view.fit,
    canZoomIn: view.scale < view.maxScale,
    canZoomOut: view.scale > view.minScale,
    zoomIn,
    zoomOut,
    toggleFit,
    /** Same button both ways, so the label has to say which way it is pointing. */
    fitLabel:
      fitTarget > view.scale
        ? 'Fill the screen with the world'
        : 'Fit the whole month on screen',
    canFit: fitTarget !== view.scale,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endPointer,
      onPointerCancel: endPointer,
      onClickCapture,
      onDoubleClick,
    },
  }
}
