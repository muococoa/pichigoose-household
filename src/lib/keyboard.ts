// Keeps inputs visible above the on-screen keyboard, moving together with it.
//
// On iPhone the keyboard covers the page instead of shrinking it, so we expose its height as the
// CSS variable --kb, and fixed bars and sheets move up by that much. iPhone only tells the page the
// keyboard's real height once it has finished sliding in, which made everything jump up late. So
// the moment a field is tapped we already move up by the height the keyboard had last time, with
// the same kind of motion as the keyboard (--kb-move), and correct it once the real height arrives.
// Closing works the same way: everything slides down as soon as the field lets go.
// On Android the page itself shrinks (interactive-widget=resizes-content in index.html), so --kb
// stays 0 there.

const REMEMBER = 'pichigoose.keyboard'
const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

function isField(el: Element | null): el is HTMLElement {
  if (!el || !(el instanceof HTMLElement)) return false
  if (el instanceof HTMLTextAreaElement) return true
  if (el instanceof HTMLInputElement) return !['checkbox', 'radio', 'button', 'submit', 'range', 'color', 'file'].includes(el.type)
  return el.isContentEditable
}

function remembered() {
  try {
    const n = Number(localStorage.getItem(REMEMBER))
    if (n > 150) return n
  } catch {
    // Storage blocked: fall back to a typical height.
  }
  return Math.round(window.innerHeight * 0.42)
}

export function watchKeyboard() {
  const vv = window.visualViewport
  const root = document.documentElement
  // While we're ahead of the keyboard, the page still says "no keyboard" for a moment; don't listen to that.
  let aheadUntil = 0

  function set(px: number) {
    root.style.setProperty('--kb', `${px}px`)
    if (px > 0) root.dataset.kb = 'open'
    else delete root.dataset.kb
  }

  function update() {
    if (!vv) return
    const covered = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
    // Small differences are browser toolbars, not a keyboard.
    const open = covered > 80
    root.style.setProperty('--vvtop', `${Math.round(vv.offsetTop)}px`)
    if (!open && Date.now() < aheadUntil && isField(document.activeElement)) return
    if (open) {
      try {
        localStorage.setItem(REMEMBER, String(Math.round(covered)))
      } catch {
        // Fine, we'll guess next time.
      }
    }
    set(open ? Math.round(covered) : 0)
    // Bars, sheets and the chat already sit right on the keyboard, so iPhone's own push-up of the
    // whole page isn't needed there and only makes things jump. Undo it.
    if (open && vv.offsetTop > 0 && (document.activeElement as HTMLElement | null)?.closest?.('.add-bar, .composer, .sheet-back')) window.scrollTo(0, 0)
    // iPhone sometimes leaves the page pushed up after the keyboard closes. Put it back.
    if (!open && (window.scrollY || vv.offsetTop)) window.scrollTo(0, 0)
  }

  vv?.addEventListener('resize', update)
  vv?.addEventListener('scroll', update)
  update()

  document.addEventListener('focusin', (e) => {
    const el = e.target as Element | null
    if (!isField(el)) return
    // Move up together with the keyboard instead of after it.
    if (isIOS && root.dataset.kb !== 'open') {
      aheadUntil = Date.now() + 900
      set(remembered())
    }
    // If no keyboard came after all (a hardware keyboard on an iPad), settle back down.
    window.setTimeout(update, 950)
    // Bars and sheets already sit above the keyboard. Only a field inside the page itself may need
    // its page scrolled a little so it isn't hidden, and that scroll glides.
    if (el.closest('.add-bar, .composer, .sheet-back')) return
    window.setTimeout(() => {
      const scroller = el.closest('.scroll') as HTMLElement | null
      if (!scroller) return
      const kb = parseFloat(getComputedStyle(root).getPropertyValue('--kb')) || 0
      const visibleBottom = window.innerHeight - kb - 16
      const r = el.getBoundingClientRect()
      if (r.bottom > visibleBottom) scroller.scrollBy({ top: r.bottom - visibleBottom, behavior: 'smooth' })
    }, 60)
  })

  // Letting go of a field: slide down right away, unless focus just moved to another field.
  document.addEventListener('focusout', () => {
    if (!isIOS) return
    window.setTimeout(() => {
      if (isField(document.activeElement)) return
      aheadUntil = 0
      set(0)
    }, 0)
  })
}
