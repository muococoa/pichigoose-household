import { useEffect, type RefObject } from 'react'

// Pulling past the top or bottom of a page: the paper gives, more the further you pull but
// harder and harder, like a rubber band, and springs back with a small overshoot when let go.
// It replaces the browser's own stretch, so it feels the same on iPhone and Android, and it
// works even when the page is short enough not to scroll. Touch only.
//
// Pulled down far enough at the top, it also refreshes: an ink circle draws itself in the gap
// as you pull, spins while everything new loads, and the paper springs back.

const LIMIT = 140 // px the paper can never go past
const REFRESH_AT = 64 // px of pull that counts as "refresh"
const HOLD = 56 // px the paper waits at while refreshing
const SPRING = 'transform .5s cubic-bezier(.34, 1.56, .64, 1)'

/** Rubber band: easy at first, harder and harder. */
function give(distance: number) {
  return LIMIT * (1 - 1 / ((distance * 0.55) / LIMIT + 1))
}

export function useBounce(
  ref: RefObject<HTMLElement | null>,
  ink: RefObject<HTMLElement | null>,
  onRefresh?: () => Promise<unknown>,
) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let origin: number | null = null // where the pull started
    let pull = 0
    let refreshing = false

    const atTop = () => el.scrollTop <= 0
    const atBottom = () => el.scrollTop + el.clientHeight >= el.scrollHeight - 1

    function set(y: number) {
      pull = y
      el!.style.transform = y ? `translateY(${y}px)` : ''
      // The circle draws itself as the pull gets closer to "refresh".
      const circle = ink.current
      if (circle && onRefresh && !refreshing) {
        const progress = y > 0 ? Math.min(1, y / REFRESH_AT) : 0
        circle.style.opacity = String(Math.min(1, progress * 1.4))
        circle.style.setProperty('--drawn', String(1 - progress))
      }
    }

    function start() {
      if (refreshing) return
      origin = null
      el!.style.transition = 'none'
    }

    function move(e: TouchEvent) {
      if (refreshing || e.touches.length !== 1) return
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

    async function end() {
      origin = null
      if (refreshing || !pull) return
      el!.style.transition = SPRING
      if (onRefresh && pull >= REFRESH_AT) {
        refreshing = true
        el!.style.transform = `translateY(${HOLD}px)`
        ink.current?.classList.add('spinning')
        // Long enough to see that something happened, even when the network is quick.
        await Promise.all([onRefresh().catch(() => undefined), new Promise((r) => setTimeout(r, 700))])
        ink.current?.classList.remove('spinning')
        refreshing = false
        if (ink.current) ink.current.style.opacity = '0'
      }
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
  }, [ref, ink, onRefresh])
}
