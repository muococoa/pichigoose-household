// Keeps inputs visible above the on-screen keyboard.
//
// On iPhone the keyboard covers the page instead of shrinking it, so we measure it with
// visualViewport and expose its height as the CSS variable --kb. Fixed bars and sheets
// move up by that much, with an ease-out transition. On Android the page itself shrinks
// (interactive-widget=resizes-content in index.html), so --kb stays 0 there.

export function watchKeyboard() {
  const vv = window.visualViewport
  const root = document.documentElement

  function update() {
    if (!vv) return
    const covered = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
    // Small differences are browser toolbars, not a keyboard.
    const open = covered > 80
    root.style.setProperty('--kb', `${open ? Math.round(covered) : 0}px`)
    // Lets pop-ups grow to use all the room above the keyboard.
    if (open) root.dataset.kb = 'open'
    else delete root.dataset.kb
  }

  vv?.addEventListener('resize', update)
  vv?.addEventListener('scroll', update)
  update()

  // When a field gets focus, glide it into view once the keyboard has opened.
  document.addEventListener('focusin', (e) => {
    const el = e.target as HTMLElement | null
    if (!el || !el.matches('input, textarea')) return
    window.setTimeout(() => {
      update()
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }, 300)
  })
}
