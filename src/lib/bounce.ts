import { useEffect, type RefObject } from 'react'

// Pulling past the top or bottom of a page uses the phone's own bounce (iPhone) or stretch
// (Android), the same smooth, springy feel as WhatsApp. Every page can bounce, even a short one
// (see .screen > .scroll::before in app.css).
//
// Pull to refresh sits on top of that: pulling down at the top slides a small ink circle down
// from the top edge, drawing itself as you pull. Let go past the line and it spins while
// everything new loads, then slides away.

const REFRESH_AT = 110 // px of finger travel that counts as "refresh"
const TRAVEL = 64 // how far the circle slides down at most

export function useBounce(
  ref: RefObject<HTMLElement | null>,
  ink: RefObject<HTMLElement | null>,
  onRefresh?: () => Promise<unknown>,
) {
  useEffect(() => {
    const el = ref.current
    if (!el || !onRefresh) return
    let startY: number | null = null
    let pull = 0
    let refreshing = false

    function show(distance: number) {
      const circle = ink.current
      if (!circle) return
      const progress = Math.min(1, distance / REFRESH_AT)
      // Follows the finger, slowing down near the end like a rubber band.
      const y = TRAVEL * (1 - 1 / (distance / 160 + 1)) * 1.6
      circle.style.transition = 'none'
      circle.style.opacity = String(Math.min(1, progress * 1.6))
      circle.style.transform = `translateY(${Math.min(y, TRAVEL)}px) rotate(${progress * 200}deg)`
      circle.style.setProperty('--drawn', String(1 - progress))
    }

    function hide() {
      const circle = ink.current
      if (!circle) return
      circle.style.transition = 'transform .35s cubic-bezier(.16, 1, .3, 1), opacity .25s ease'
      circle.style.opacity = '0'
      circle.style.transform = 'translateY(0)'
    }

    function start(e: TouchEvent) {
      if (refreshing || e.touches.length !== 1) return
      // Only a pull that starts with the page already at the top.
      startY = el!.scrollTop <= 0 ? e.touches[0].clientY : null
      pull = 0
    }

    function move(e: TouchEvent) {
      if (startY === null || refreshing) return
      if ((e.target as HTMLElement).closest('[data-nobounce], textarea')) return
      pull = Math.max(0, e.touches[0].clientY - startY)
      if (pull > 4) show(pull)
    }

    async function end() {
      if (startY === null || refreshing) return
      startY = null
      if (pull < REFRESH_AT) {
        hide()
        return
      }
      refreshing = true
      const circle = ink.current
      if (circle) {
        circle.style.transition = 'transform .3s cubic-bezier(.16, 1, .3, 1)'
        circle.style.transform = `translateY(${TRAVEL * 0.75}px)`
        circle.style.setProperty('--drawn', '0')
        circle.classList.add('spinning')
      }
      // Long enough to see that something happened, even when the network is quick.
      await Promise.all([onRefresh!().catch(() => undefined), new Promise((r) => setTimeout(r, 700))])
      circle?.classList.remove('spinning')
      refreshing = false
      hide()
    }

    el.addEventListener('touchstart', start, { passive: true })
    el.addEventListener('touchmove', move, { passive: true })
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
