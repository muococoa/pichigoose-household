import { useEffect, useRef, useState, type RefObject } from 'react'

// Switching between lists (Shopping) and rooms (Pantry), like the bottom menu (Nora, 29 Oct): the soft pink
// highlight slides from one washi tab to the next with a springy stretch, and you can swipe the page left or
// right to get to the next one.

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** The soft highlight behind the chosen tab in `row` (the tab with aria-pressed="true"). */
export function TabHighlight({ row, current }: { row: RefObject<HTMLElement | null>; current: string | null }) {
  const [box, setBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const inner = useRef<HTMLSpanElement>(null)
  const first = useRef(true)

  // After the page is in place (the row's ref is set only once its children, this one included, are done).
  useEffect(() => {
    const el = row.current
    if (!el) return
    const measure = () => {
      const tab = el.querySelector<HTMLElement>('[aria-pressed="true"]')
      if (!tab) return setBox(null)
      const r = el.getBoundingClientRect()
      const t = tab.getBoundingClientRect()
      setBox({ x: t.left - r.left - 7, y: t.top - r.top - 5, w: t.width + 14, h: t.height + 10 })
    }
    measure()
    const watch = new ResizeObserver(measure)
    watch.observe(el)
    return () => watch.disconnect()
  }, [row, current])

  // A springy stretch as it moves, like the menu's highlight.
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    if (reducedMotion()) return
    inner.current?.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.18, .9)', offset: 0.35 }, { transform: 'scale(1)' }], { duration: 460, easing: 'ease-out' })
  }, [current])

  if (!box) return null
  return (
    <span className="tab-slide" style={{ transform: `translate(${box.x}px, ${box.y}px)`, width: box.w, height: box.h }} aria-hidden>
      <span ref={inner} />
    </span>
  )
}

/** Swipe the page left (next) or right (previous). Not from the very edges (those go back and to Messages),
 *  and not on fields, the menu, the add bar or a pop-up. */
export function useSwipeBetween(onPrev: (() => void) | null, onNext: (() => void) | null) {
  const latest = useRef({ onPrev, onNext })
  latest.current = { onPrev, onNext }
  useEffect(() => {
    let start: { x: number; y: number } | null = null
    function down(e: TouchEvent) {
      const t = e.touches[0]
      const target = e.target as HTMLElement
      const ok =
        e.touches.length === 1 &&
        t.clientX > 40 &&
        t.clientX < window.innerWidth - 28 &&
        !target.closest('input, textarea, .add-bar, .tabbar, .sheet-back, [data-noswipe]')
      start = ok ? { x: t.clientX, y: t.clientY } : null
    }
    function move(e: TouchEvent) {
      if (!start) return
      const t = e.touches[0]
      const dx = t.clientX - start.x
      const dy = Math.abs(t.clientY - start.y)
      if (dy > 30 && dy > Math.abs(dx)) start = null
      else if (Math.abs(dx) > 64 && dy < Math.abs(dx) * 0.5) {
        start = null
        if (dx < 0) latest.current.onNext?.()
        else latest.current.onPrev?.()
      }
    }
    const up = () => (start = null)
    document.addEventListener('touchstart', down, { passive: true })
    document.addEventListener('touchmove', move, { passive: true })
    document.addEventListener('touchend', up)
    document.addEventListener('touchcancel', up)
    return () => {
      document.removeEventListener('touchstart', down)
      document.removeEventListener('touchmove', move)
      document.removeEventListener('touchend', up)
      document.removeEventListener('touchcancel', up)
    }
  }, [])
}

/** Which way the page slides when you move to another list or room (kept until the next move). */
export function useSlideDirection(index: number) {
  const [state, setState] = useState({ index, dir: '' })
  if (state.index !== index) {
    const next = { index, dir: state.index < 0 || index < 0 ? '' : index > state.index ? 'slide-next' : 'slide-prev' }
    setState(next)
    return next.dir
  }
  return state.dir
}
