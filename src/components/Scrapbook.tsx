// The scrapbook building blocks: ink headlines, stamps, sticky notes, tape, checkboxes,
// stickers, Pichi's postage stamp and the bottom sheet.

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import pichi from '../../assets/pichi-painted.jpg'

/** Turns any text into a stable number, so each headline and stamp gets its own texture offset. */
function seed(text: string) {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return Math.abs(h)
}

/** The dry-ink SVG filter, from the hi-fi HTML. Rendered once in the app. */
export function InkFilter() {
  return (
    <svg width="0" height="0" aria-hidden style={{ position: 'absolute' }}>
      <filter id="dry-ink" x="-20%" y="-60%" width="140%" height="220%">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale="1.3" xChannelSelector="R" yChannelSelector="G" result="rough" />
        <feMorphology in="rough" operator="erode" radius="0.85" result="core" />
        <feComponentTransfer in="n" result="spk">
          <feFuncA type="discrete" tableValues="0 0 1 1 1 1" />
        </feComponentTransfer>
        <feComposite in="rough" in2="spk" operator="in" result="edge" />
        <feMerge>
          <feMergeNode in="core" />
          <feMergeNode in="edge" />
        </feMerge>
      </filter>
    </svg>
  )
}

type HandProps = { children: string; size?: number; lineHeight?: number; color?: string; as?: 'span' | 'h1' | 'h2'; style?: CSSProperties }

/** A handwritten headline in dry ink. Each one uses a different part of the ink mask. */
export function Hand({ children, size = 42, lineHeight, color, as: Tag = 'span', style }: HandProps) {
  const s = seed(children)
  const pos = `-${s % 380}px -${(s >> 8) % 380}px`
  return (
    <Tag
      className="hand"
      style={{
        fontSize: size,
        lineHeight: `${lineHeight ?? Math.round(size * 1.05)}px`,
        color,
        WebkitMaskPosition: pos,
        maskPosition: pos,
        display: 'inline-block',
        ...style,
        // The padding and negative margin keep the ink effect from clipping letters. Never override them.
        padding: '.25em .15em',
        margin: '-.25em -.15em',
      }}
    >
      {children}
    </Tag>
  )
}

export const STAMP_COLORS = { nora: '#A8335A', claude: '#63586B', locked: '#4E6B39', draft: '#8C5A3C', open: '#3B6FA0' }

export function Stamp({ children, color = STAMP_COLORS.locked, rotate = -3 }: { children: string; color?: string; rotate?: number }) {
  const s = seed(children)
  const pos = `-${s % 260}px -${(s >> 8) % 260}px`
  return (
    <span className="stamp" style={{ color, transform: `rotate(${rotate}deg)`, WebkitMaskPosition: pos, maskPosition: pos }}>
      {children}
    </span>
  )
}

export type TapeKind = 'tp' | 'ty' | 'tm' | 'tb' | 'tdots' | 'tblocks' | 'ttri' | 'tcheck'

export function Tape({ kind, style }: { kind: TapeKind; style?: CSSProperties }) {
  return <div className={`tape ${kind}`} style={style} />
}

/** The hand-drawn check, kept in one place so Nora can improve it later. */
export function CheckMark({ on = true }: { on?: boolean }) {
  return (
    <svg viewBox="0 0 28 28" width="28" height="28" aria-hidden className={`check-mark${on ? ' on' : ''}`}>
      <path
        d="M5 15.5 C7 17, 9 19.8, 10.6 22.4 C13.5 15, 17.5 9, 24 3.5"
        fill="none"
        stroke="#D34471"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
      />
    </svg>
  )
}

export function Box({ checked, rotate = 0 }: { checked: boolean; rotate?: number }) {
  return (
    <span className="box" style={{ transform: `rotate(${rotate}deg)` }}>
      <CheckMark on={checked} />
    </span>
  )
}

// How long the pen stroke takes before the row moves (to Bought, or to the bottom).
const TICK_MS = 300

/** A tappable checkbox. The check is drawn like a pen mark first, then the change is saved. */
export function Check({ checked, onChange, label, rotate }: { checked: boolean; onChange: () => void; label: string; rotate?: number }) {
  const [shown, setShown] = useState<boolean | null>(null)
  const busy = useRef(false)
  function tap() {
    if (busy.current) return
    busy.current = true
    setShown(!checked)
    window.setTimeout(() => {
      onChange()
      setShown(null)
      busy.current = false
    }, TICK_MS)
  }
  const on = shown ?? checked
  return (
    <button type="button" className="check-btn" role="checkbox" aria-checked={on} aria-label={label} onClick={tap}>
      <Box checked={on} rotate={rotate} />
    </button>
  )
}

/** Text crossed out with a hero-pink pen line that draws across. */
export function Struck({ on, children }: { on: boolean; children: ReactNode }) {
  return <span className={`struck${on ? ' on' : ''}`}>{children}</span>
}

/** Rotation that stays the same for the same id, between -max and max degrees. */
export function tilt(id: string, max = 2) {
  const s = seed(id)
  return Math.round(((s % 1000) / 1000) * max * 2 * 10 - max * 10) / 10
}

/** Pichi in her postage stamp frame. Nora's painting, never redrawn. */
export function PichiStamp({ width = 58, height = 70, rotate = -5 }: { width?: number; height?: number; rotate?: number }) {
  return (
    <div className="postage" style={{ transform: `rotate(${rotate}deg)` }}>
      <div className="in">
        <img src={pichi} alt="Pichi" style={{ width, height, objectFit: 'cover' }} />
      </div>
    </div>
  )
}

/** Pichi as a polaroid, held up with tape. */
export function PichiPolaroid({ width = 150, rotate = -3, tape = 'tp' as TapeKind }) {
  return (
    <div
      style={{
        position: 'relative',
        background: '#FFFFFF',
        padding: '10px 10px 34px',
        transform: `rotate(${rotate}deg)`,
        boxShadow: '2px 3px 0 rgba(30,26,48,.13)',
        width: width + 20,
      }}
    >
      <Tape kind={tape} style={{ top: -11, left: '50%', marginLeft: -42, transform: 'rotate(-4deg)' }} />
      <img src={pichi} alt="Pichi" style={{ display: 'block', width, height: width * 1.2, objectFit: 'cover' }} />
    </div>
  )
}

type SheetProps = { open: boolean; onClose: () => void; title?: string; children: ReactNode; labelledBy?: string }

/** A bottom sheet of notebook paper. */
export function Sheet({ open, onClose, title, children }: SheetProps) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return createPortal(
    <div className="sheet-back" onClick={onClose}>
      <div ref={ref} className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="grab" />
        {title && (
          <div style={{ marginBottom: 14 }}>
            <Hand size={34} lineHeight={36}>
              {title}
            </Hand>
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body,
  )
}

/** A small "···" menu. It opens below its button, or above when there's no room, and never leaves the screen. */
export function Menu({ label, items, children }: { label: string; items: { label: string; onClick: () => void; danger?: boolean }[]; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [place, setPlace] = useState<CSSProperties>({ visibility: 'hidden' })
  const ref = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: Event) => {
      const t = e.target as Node
      if (!ref.current?.contains(t) && !menuRef.current?.contains(t)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    window.addEventListener('resize', () => setOpen(false), { once: true })
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  useLayoutEffect(() => {
    if (!open || !ref.current || !menuRef.current) return
    const gap = 8
    const edge = 12
    const button = ref.current.getBoundingClientRect()
    const menu = menuRef.current.getBoundingClientRect()
    const below = button.bottom + gap
    const fitsBelow = below + menu.height <= window.innerHeight - edge
    const top = fitsBelow ? below : Math.max(edge, button.top - gap - menu.height)
    const left = Math.min(Math.max(edge, button.right - menu.width), window.innerWidth - edge - menu.width)
    setPlace({ top, left })
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" aria-label={label} aria-expanded={open} onClick={() => setOpen((o) => !o)} style={{ padding: 8, margin: -8, display: 'flex', color: '#63586B' }}>
        {children}
      </button>
      {open &&
        createPortal(
          <div ref={menuRef} className="menu" role="menu" style={{ position: 'fixed', right: 'auto', ...place }}>
            {items.map((it) => (
              <button
                key={it.label}
                type="button"
                role="menuitem"
                className={it.danger ? 'danger' : undefined}
                onClick={() => {
                  setOpen(false)
                  it.onClick()
                }}
              >
                {it.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  )
}

let toastSetter: ((text: string | null) => void) | null = null
let toastTimer: number | undefined

export function showToast(text: string) {
  toastSetter?.(text)
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => toastSetter?.(null), 1800)
}

export function ToastHost() {
  const [text, setText] = useState<string | null>(null)
  useEffect(() => {
    toastSetter = setText
    return () => {
      toastSetter = null
    }
  }, [])
  return text ? (
    <div className="toast" role="status">
      {text}
    </div>
  ) : null
}
