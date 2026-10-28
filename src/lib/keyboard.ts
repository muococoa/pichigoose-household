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
    // The part of the page you can actually see. The chat sits exactly in it, so its header
    // stays at the top while the keyboard is open, like WhatsApp.
    root.style.setProperty('--vvh', `${Math.round(vv.height)}px`)
    root.style.setProperty('--vvtop', `${Math.round(vv.offsetTop)}px`)
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
    // The chat already keeps its field above the keyboard.
    if (el.closest('.chat-screen')) return
    window.setTimeout(() => {
      update()
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }, 300)
  })
}
