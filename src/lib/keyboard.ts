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

// (v2: heights saved before this were sometimes measured mid-push and came out too small.)
const REMEMBER = 'pichigoose.keyboard.v2'
const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

function isField(el: Element | null): el is HTMLElement {
  if (!el || !(el instanceof HTMLElement)) return false
  if (el instanceof HTMLTextAreaElement) return true
  if (el instanceof HTMLInputElement) return !['checkbox', 'radio', 'button', 'submit', 'range', 'color', 'file'].includes(el.type)
  return el.isContentEditable
}

/**
 * Focuses a field without iPhone pushing the whole page up to show it. For a moment the field is
 * moved far up out of sight, so iPhone thinks it's already visible and leaves the page alone; our
 * own layout then lifts bars and pop-ups above the keyboard in one smooth movement.
 */
export function focusField(el: HTMLElement | null) {
  if (!el) return
  if (!isIOS || document.activeElement === el) {
    el.focus({ preventScroll: true })
    return
  }
  // Without any animation: a field that slides in (Shopping's add field) mustn't fly in from up there.
  const before = el.style.transform
  const beforeTransition = el.style.transition
  el.style.transition = 'none'
  el.style.transform = 'translateY(-2000px)'
  el.focus({ preventScroll: true })
  requestAnimationFrame(() => {
    el.style.transform = before
    void el.offsetWidth
    el.style.transition = beforeTransition
  })
}

/** Use as `ref={autoFocusField}` instead of `autoFocus`, for fields that open with the keyboard up. */
export function autoFocusField(el: HTMLElement | null) {
  if (el) focusField(el)
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

  // Where the keyboard is going (the CSS value glides there over a moment).
  let target = 0
  function set(px: number) {
    target = px
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
    // iPhone sometimes leaves the page pushed up after the keyboard closes. Put it back.
    if (!open && (window.scrollY || vv.offsetTop)) window.scrollTo(0, 0)
  }

  vv?.addEventListener('resize', update)
  vv?.addEventListener('scroll', update)
  update()

  // Tapping a field: focus it ourselves, the way that keeps iPhone from pushing the page up
  // (only for a real tap, not when a scroll happens to end on a field).
  let tapped: EventTarget | null = null
  document.addEventListener('touchstart', (e) => {
    tapped = e.touches.length === 1 ? e.target : null
  }, { passive: true })
  document.addEventListener('touchmove', () => {
    tapped = null
  }, { passive: true })
  document.addEventListener('touchend', (e) => {
    const el = e.target as Element | null
    if (!isIOS || el !== tapped || !isField(el) || el === document.activeElement) return
    if ((el as HTMLInputElement).disabled || (el as HTMLInputElement).readOnly) return
    if (el instanceof HTMLInputElement && ['date', 'time', 'datetime-local', 'month', 'week'].includes(el.type)) return
    e.preventDefault()
    focusField(el)
  }, { passive: false })

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
    // Floating bars already sit above the keyboard. A field inside a page or a pop-up may need its page (or
    // pop-up) scrolled so it isn't hidden behind the keyboard, or behind a pop-up's pinned buttons; that
    // scroll glides. Checked again once the keyboard's real height is known. A reply's "Replying to" sits
    // right above its field, so it comes into view with it.
    if (el.closest('.add-bar, .composer, .typing-bar')) return
    const reveal = () => {
      if (document.activeElement !== el) return
      const sheet = el.closest('.sheet') as HTMLElement | null
      const scroller = sheet ?? (el.closest('.scroll') as HTMLElement | null)
      if (!scroller) return
      const actions = sheet?.querySelector<HTMLElement>('.sheet-actions')
      const pinned = actions && !actions.contains(el) ? (actions.firstElementChild as HTMLElement | null)?.offsetHeight ?? 0 : 0
      const visibleBottom = window.innerHeight - target - (pinned ? pinned + 30 : 0) - 16
      const r = el.getBoundingClientRect()
      if (r.bottom > visibleBottom) scroller.scrollBy({ top: r.bottom - visibleBottom, behavior: 'smooth' })
    }
    window.setTimeout(reveal, 60)
    window.setTimeout(reveal, 450)
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
