import { useEffect, type RefObject } from 'react'

// Pulling past the top or bottom of a page: the paper gives a little and springs back with a
// small, punchy overshoot. It replaces the browser's own stretch, so it feels the same on
// iPhone and Android. Touch only; nothing changes with a mouse.

const MAX = 28 // px the paper can be pulled
const SPRING = 'transform .45s cubic-bezier(.34, 1.56, .64, 1)'

/** Harder to pull the further you go. */
function give(distance: number) {
  return MAX * (1 - Math.exp(-distance / 140))
}

export function useBounce(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let origin: number | null = null // where the pull started
    let pull = 0

    function atTop() {
      return el!.scrollTop <= 0
    }
    function atBottom() {
      return el!.scrollTop + el!.clientHeight >= el!.scrollHeight - 1
    }

    function set(y: number) {
      pull = y
      el!.style.transform = y ? `translateY(${y}px)` : ''
    }

    function start() {
      origin = null
      el!.style.transition = 'none'
    }

    function move(e: TouchEvent) {
      if (e.touches.length !== 1) return
      // Dragging a note on Arrange, or scrolling inside a text field: leave it alone.
      if ((e.target as HTMLElement).closest('[data-nobounce], textarea')) return
      const y = e.touches[0].clientY
      if (origin === null) {
        origin = y
        return
      }
      const dy = y - origin
      if ((dy > 0 && atTop()) || (dy < 0 && atBottom())) {
        e.preventDefault()
        set(Math.sign(dy) * give(Math.abs(dy)))
      } else {
        // Scrolling normally again: the pull starts fresh from here next time.
        if (pull) set(0)
        origin = y
      }
    }

    function end() {
      origin = null
      if (!pull) return
      el!.style.transition = SPRING
      set(0)
    }

    el.addEventListener('touchstart', start, { passive: true })
    el.addEventListener('touchmove', move, { passive: false })
    el.addEventListener('touchend', end)
    el.addEventListener('touchcancel', end)
    return () => {
      el.removeEventListener('touchstart', start)
      el.removeEventListener('touchmove', move)
      el.removeEventListener('touchend', end)
      el.removeEventListener('touchcancel', end)
    }
  }, [ref])
}
