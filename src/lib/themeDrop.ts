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
      { transform: 'translateY(-110px) scale(.7, 1.2)', opacity: 0 },
      { transform: 'translateY(-90px) scale(.75, 1.2)', opacity: 1, offset: 0.15 },
      { transform: 'translateY(0) scale(.85, 1.25)', opacity: 1, offset: 0.8 },
      { transform: 'translateY(2px) scale(1.7, .45)', opacity: 1 },
    ],
    { duration: 420, easing: 'cubic-bezier(.55, 0, 1, .45)', fill: 'forwards' },
  )

  fall.finished.then(() => {
    drop.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'forwards' })
    // Ripples: three rings spreading out, one after the other.
    for (let i = 0; i < 3; i++) {
      const ring = dot(20, { border: `2px solid ${hex}`, boxSizing: 'border-box' })
      ring.animate([{ transform: 'scale(.4)', opacity: 0.9 }, { transform: `scale(${5 + i * 2.5})`, opacity: 0 }], {
        duration: 900,
        delay: i * 120,
        easing: 'cubic-bezier(.2, .7, .3, 1)',
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
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${far * 0.6}px at ${x}px ${y}px)`, `circle(${far}px at ${x}px ${y}px)`] },
        { duration: 800, delay: 120, easing: 'cubic-bezier(.65, 0, .35, 1)', fill: 'both', pseudoElement: '::view-transition-new(root)' },
      )
    })
    t.finished.then(() => {
      // The plop: the swatch you picked bounces once the color has landed.
      from.animate([{ scale: 1 }, { scale: 1.3 }, { scale: 0.92 }, { scale: 1 }], { duration: 500, easing: KINETIC })
      setTimeout(() => layer.remove(), 600)
    })
  })
}
