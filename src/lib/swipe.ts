import { useEffect, useRef } from 'react'

// Edge swipes on a phone, like an app: from the left edge to the right goes back, from the right edge to the left
// opens Messages. Only from the very edge, so swiping a message or a shelf stays free for other things.

/** In Safari (not the installed app), the left edge already belongs to the browser's own back swipe. */
export const browserOwnsLeftEdge = () =>
  typeof window !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent) && !window.matchMedia('(display-mode: standalone)').matches

export function useEdgeSwipe(side: 'left' | 'right', action: (() => void) | null) {
  const latest = useRef(action)
  latest.current = action
  const on = Boolean(action)
  useEffect(() => {
    if (!on) return
    const EDGE = side === 'left' ? 40 : 28
    let start: { x: number; y: number } | null = null
    function down(e: TouchEvent) {
      const t = e.touches[0]
      const atEdge = side === 'left' ? t.clientX < EDGE : t.clientX > window.innerWidth - EDGE
      // Not while a pop-up is open.
      start = e.touches.length === 1 && atEdge && !document.querySelector('.sheet-back') ? { x: t.clientX, y: t.clientY } : null
    }
    function move(e: TouchEvent) {
      if (!start) return
      const t = e.touches[0]
      const dx = side === 'left' ? t.clientX - start.x : start.x - t.clientX
      const dy = Math.abs(t.clientY - start.y)
      if (dy > 40 && dy > dx) start = null
      else if (dx > 56 && dy < dx * 0.6) {
        start = null
        latest.current?.()
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
  }, [on, side])
}
