import { useEffect, useRef, useState, type RefObject } from 'react'

// Switching between lists (Shopping) and rooms (Pantry), like the bottom menu (Nora, 29 Oct): the soft pink
// highlight slides from one washi tab to the next with a springy stretch, and you can swipe the page left or
// right to get to the next one.

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** The washi tape you land on gives a springy bounce, like the bottom menu (Nora, 29 Oct). */
export function useTapeBounce(row: RefObject<HTMLElement | null>, current: string | null) {
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    if (reducedMotion()) return
    const tape = row.current?.querySelector<HTMLElement>('[aria-pressed="true"]')
    tape?.animate(
      [{ scale: '1' }, { scale: '1.14 1.12', offset: 0.3 }, { scale: '.95 .96', offset: 0.62 }, { scale: '1.02', offset: 0.84 }, { scale: '1' }],
      { duration: 560, easing: 'ease-out' },
    )
  }, [row, current])
}

/** Swipe the page left (next) or right (previous), anywhere but the left edge (that one goes back), and not on
 *  fields, the menu, the add bar or a pop-up. */
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
