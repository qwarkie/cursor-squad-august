import { useEffect, useRef, useState } from 'react'

/**
 * The header figure lands on its new value over 200ms instead of snapping
 * (art-bible.md §5, "Header number — 200ms count-up").
 *
 * The point is ordering, not decoration: the exact figure settles *before* the
 * river finishes re-sizing at 300ms, so a judge reads the number first and then
 * watches the world agree with it. A number that jumps while the water is still
 * moving reads as two unrelated things changing.
 */
const DEFAULT_MS = 200

/**
 * Ease-out, rounded to whole dollars. Exported and pure so the one property
 * that matters — that it ends on exactly the target, never a rounding of it —
 * is testable without a DOM.
 */
export function countUpValue(from: number, to: number, t: number): number {
  if (t <= 0) return from
  if (t >= 1) return to
  const eased = 1 - (1 - t) * (1 - t)
  return Math.round(from + (to - from) * eased)
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function useCountUp(target: number, durationMs = DEFAULT_MS): number {
  const [display, setDisplay] = useState(target)
  // What is currently on screen, so a change mid-flight counts up from where
  // the eye is rather than from where the last animation started.
  const shown = useRef(target)

  useEffect(() => {
    shown.current = display
  }, [display])

  useEffect(() => {
    const from = shown.current
    if (from === target) return

    // Under reduced motion the figure still updates — it just arrives at once.
    // The value carries the meaning; the counting does not.
    if (prefersReducedMotion()) {
      setDisplay(target)
      return
    }

    let raf = 0
    let start: number | null = null
    const step = (now: number) => {
      if (start === null) start = now
      const t = Math.min(1, (now - start) / durationMs)
      setDisplay(countUpValue(from, target, t))
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, durationMs])

  return display
}
