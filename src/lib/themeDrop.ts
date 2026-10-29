import { applyTheme, THEMES } from './theme'

// Changing the theme (Nora, 29 Oct): a drop of the new color falls onto the swatch you tapped, ripples spread out
// on the paper, then the new color floods the whole screen from that point and settles with a little plop.
// Phones without view transitions (and people who turn motion off) just get the new color.

const KINETIC = 'cubic-bezier(.34, 1.56, .64, 1)'

/** `done` runs once the new color is on (save it then: saving re-applies the theme from the profile right away). */
export function dropTheme(id: string, from: HTMLElement, done: () => void) {
  const hex = THEMES.find((x) => x.id === id)?.hex ?? '#D34471'
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches
  const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void>; finished: Promise<void> } }
  if (still || !doc.startViewTransition) {
    applyTheme(id)
    done()
    return
  }

  const r = from.getBoundingClientRect()
  const x = r.left + r.width / 2
  const y = r.top + r.height / 2
  const layer = document.createElement('div')
  layer.className = 'theme-drop'
  document.body.append(layer)
  const dot = (size: number, style: Partial<CSSStyleDeclaration>) => {
    const el = document.createElement('i')
    Object.assign(el.style, { width: `${size}px`, height: `${size}px`, left: `${x - size / 2}px`, top: `${y - size / 2}px` }, style)
    layer.append(el)
    return el
  }

  // The drop: falls from above, stretching as it goes, and squashes flat as it lands.
  const drop = dot(16, { background: hex, borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%' })
  const fall = drop.animate(
    [
      { transform: 'translateY(-110px) scale(.8, 1.1)', opacity: 0 },
      { transform: 'translateY(-96px) scale(.8, 1.15)', opacity: 1, offset: 0.12 },
      { transform: 'translateY(0) scale(.85, 1.2)', opacity: 1, offset: 0.86 },
      { transform: 'translateY(1px) scale(1.4, .6)', opacity: 1 },
    ],
    // Falls like a drop: slow at first, faster near the paper (one easy curve, no sudden stops).
    { duration: 480, easing: 'cubic-bezier(.45, 0, .8, .4)', fill: 'forwards' },
  )

  fall.finished.then(() => {
    drop.animate([{ opacity: 1, transform: 'translateY(1px) scale(1.4, .6)' }, { opacity: 0, transform: 'translateY(1px) scale(2.2, .3)' }], { duration: 260, easing: 'ease-out', fill: 'forwards' })
    // Ripples: three rings spreading out, one after the other.
    for (let i = 0; i < 3; i++) {
      const ring = dot(20, { border: `2px solid ${hex}`, boxSizing: 'border-box' })
      ring.animate([{ transform: 'scale(.5)', opacity: 0.75 }, { transform: `scale(${5 + i * 2.5})`, opacity: 0 }], {
        duration: 1200,
        delay: i * 150,
        easing: 'cubic-bezier(.16, 1, .3, 1)',
        fill: 'both',
      })
    }

    // The flood: the new theme opens as a circle from the drop out to the far corner.
    const far = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))
    const t = doc.startViewTransition!(() => {
      applyTheme(id)
      done()
    })
    t.ready.then(() => {
      document.documentElement.animate(
        // One smooth curve from the drop to the corners: quick at first, then slowing gently as it fills.
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${far}px at ${x}px ${y}px)`] },
        { duration: 1100, delay: 60, easing: 'cubic-bezier(.4, 0, .2, 1)', fill: 'both', pseudoElement: '::view-transition-new(root)' },
      )
    })
    t.finished.then(() => {
      // The plop: the swatch you picked bounces once the color has landed.
      from.animate([{ scale: 1 }, { scale: 1.18 }, { scale: 0.96 }, { scale: 1 }], { duration: 600, easing: KINETIC })
      setTimeout(() => layer.remove(), 600)
    })
  })
}
