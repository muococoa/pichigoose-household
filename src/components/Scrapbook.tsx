// The scrapbook building blocks: ink headlines, stamps, sticky notes, tape, checkboxes,
// stickers, Pichi's postage stamp and the bottom sheet.

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import pichi from '../../assets/pichi-painted.jpg'
import poseStandLeft from '../../assets/pichi/stand-left.webp'
import poseStandRight from '../../assets/pichi/stand-right.webp'
import poseHonk from '../../assets/pichi/honk.webp'
import poseRun from '../../assets/pichi/run.webp'
import poseWalk from '../../assets/pichi/walk.webp'
import doodleStandLeft from '../../assets/pichi/doodle-stand-left.webp'
import doodleStandRight from '../../assets/pichi/doodle-stand-right.webp'
import doodleHonk from '../../assets/pichi/doodle-honk.webp'
import doodleWalk from '../../assets/pichi/doodle-walk.webp'
import doodleRun from '../../assets/pichi/doodle-run.webp'
import paperWhite from '../../assets/paper-white.png'

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
      {/* The same dry-ink brush for big avatars. Values are in avatar units (a 40-unit circle), so
          at about 190 px each unit is 4.75 px and the brush matches the headline's grain. */}
      <filter id="ink-avatar" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="3.6" numOctaves="2" seed="7" result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale="0.32" xChannelSelector="R" yChannelSelector="G" result="rough" />
        <feMorphology in="rough" operator="erode" radius="0.12" result="core" />
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

export const STAMP_COLORS = { nora: 'var(--hero-dark)', claude: '#63586B', locked: '#4E6B39', draft: '#8C5A3C', open: '#3B6FA0' }

/** A stamp label. `motion` "in" stamps it down hard, "out" fades it away. */
export function Stamp({ children, color = STAMP_COLORS.locked, rotate = -3, motion }: { children: string; color?: string; rotate?: number; motion?: 'in' | 'out' }) {
  const s = seed(children)
  const pos = `-${s % 260}px -${(s >> 8) % 260}px`
  return (
    <span
      className={`stamp${motion ? ` stamp-${motion}` : ''}`}
      style={{ color, '--r': `${rotate}deg`, transform: 'rotate(var(--r))', WebkitMaskPosition: pos, maskPosition: pos } as CSSProperties}
    >
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
        style={{ stroke: 'var(--hero)' }}
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

// How long the tick plays in place (check, strike, fade) before the row moves to its new spot.
const TICK_MS = 550

/**
 * Ticking starts on the tap, in both directions: the check, the strikethrough and the fade all
 * play right where the row is. The change is saved once they finish, and only then does the row
 * move (to Bought, to the bottom, or under Done). Tapping again before then cancels it.
 */
export function Tick({ checked, onCommit, children }: { checked: boolean; onCommit: () => void; children: (on: boolean, toggle: () => void) => ReactNode }) {
  const [shown, setShown] = useState<boolean | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const on = shown ?? checked
  function toggle() {
    const next = !on
    setShown(next)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      if (next !== checked) onCommit()
      setShown(null)
    }, TICK_MS)
  }
  useEffect(() => () => window.clearTimeout(timer.current), [])
  return <>{children(on, toggle)}</>
}

/**
 * Tracks which labels (like "This week" or "Done") just appeared or just went away,
 * so they can stamp in and fade out. Nothing animates on the first render.
 */
export function useArrivals(keys: string[]) {
  const prev = useRef<string[] | null>(null)
  const [arrived, setArrived] = useState<string[]>([])
  const [leaving, setLeaving] = useState<string[]>([])
  const joined = keys.join('|')
  useEffect(() => {
    const before = prev.current
    prev.current = keys
    if (!before) return
    const added = keys.filter((k) => !before.includes(k))
    const removed = before.filter((k) => !keys.includes(k))
    if (added.length) setArrived(added)
    if (removed.length) setLeaving(removed)
    const timer = window.setTimeout(() => {
      setArrived([])
      setLeaving([])
    }, 320)
    return () => window.clearTimeout(timer)
    // The joined string says everything about the keys.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joined])
  return { arrived, leaving }
}

/** A tappable checkbox. */
export function Check({ checked, onToggle, label, rotate }: { checked: boolean; onToggle: () => void; label: string; rotate?: number }) {
  return (
    <button type="button" className="check-btn" role="checkbox" aria-checked={checked} aria-label={label} onClick={onToggle}>
      <Box checked={checked} rotate={rotate} />
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

/** Nora's poses of Pichi (her paintings, never redrawn), with see-through backgrounds. */
const POSES = {
  'stand-left': poseStandLeft,
  'stand-right': poseStandRight,
  honk: poseHonk,
  run: poseRun,
  walk: poseWalk,
}
export type Pose = keyof typeof POSES

/**
 * Pichi in a postage stamp, in any pose, on any background color, cropped however we like.
 * `zoom` 1 shows her whole; bigger zooms in. `focus` is the point to zoom toward, like "50% 20%" for her head.
 */
export function PoseStamp({
  pose,
  color,
  width = 70,
  height = 84,
  zoom = 1,
  focus = '50% 50%',
  rotate = -4,
  style,
}: {
  pose: Pose
  color: string
  width?: number
  height?: number
  zoom?: number
  focus?: string
  rotate?: number
  style?: CSSProperties
}) {
  return (
    <div className="postage" style={{ transform: `rotate(${rotate}deg)`, flex: 'none', ...style }}>
      <div className="in">
        <div
          role="img"
          aria-label="Pichi"
          style={{
            width,
            height,
            border: '2px solid #1E1A30',
            boxSizing: 'border-box',
            backgroundColor: color,
            backgroundImage: `url(${POSES[pose]})`,
            backgroundRepeat: 'no-repeat',
            backgroundSize: `${zoom * 88}% auto`,
            backgroundPosition: focus,
          }}
        />
      </div>
    </div>
  )
}

/** Pichi as a small round avatar, for the things she does herself (like putting oats on the list).
 *  Her painting, cropped to her head, never redrawn. */
export function PichiAvatar({ size = 34 }: { size?: number }) {
  return (
    <span
      role="img"
      aria-label="Pichi"
      className="av"
      style={{
        width: size,
        height: size,
        backgroundColor: '#F8E6A8',
        backgroundImage: `url(${POSES.walk})`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: '300% auto',
        backgroundPosition: '57% 1%',
      }}
    />
  )
}

/** An empty page: Pichi big in her stamp, centered, with the message under it. The stamp grows,
 *  but its frame (wavy edge, white border, ink line) stays the same thickness at any size. */
export function EmptyState({ pose, color, zoom = 1, focus = '50% 45%', rotate = -3, children }: { pose: Pose; color: string; zoom?: number; focus?: string; rotate?: number; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 22, padding: '28px 0 12px' }}>
      <PoseStamp pose={pose} color={color} width={190} height={224} zoom={zoom} focus={focus} rotate={rotate} />
      <p className="body" style={{ margin: 0, maxWidth: 290, textWrap: 'balance' }}>
        {children}
      </p>
    </div>
  )
}

/** Nora's ballpoint doodles of Pichi, drawn straight on the paper. */
const DOODLES = { 'stand-left': doodleStandLeft, 'stand-right': doodleStandRight, honk: doodleHonk, walk: doodleWalk, run: doodleRun }
export type DoodlePose = keyof typeof DOODLES

/**
 * Fills the empty paper at the bottom of a page with a doodle of Pichi standing on a squiggly ground
 * line, in the same ballpoint ink. It only shows when there's real room left; on a full page it stays
 * hidden, so it never pushes anything down (see .doodle-spot in app.css).
 */
export function DoodleSpot({ pose }: { pose: DoodlePose }) {
  return (
    <div className="doodle-spot" aria-hidden>
      <div className="doodle">
        {/* Nora's drawing used as a stencil, so it takes the ink color from CSS (the gray of the captions). */}
        <span className="doodle-ink" style={{ ['--doodle' as string]: `url(${DOODLES[pose]})` }} />
        <svg viewBox="0 0 240 22" width="240" height="22">
          <path d="M6 13c18-5 30 4 48 1s26-7 44-3 30 6 50 1 30-6 46-2 22 4 40 1" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M62 15l-3 5M70 14l2 5M166 12l-2 5M174 12l3 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  )
}

/** A paper clip holding a small note to the one behind it. Drawn as a loop of metal wire. */
export function PaperClip({ side = 'right', style }: { side?: 'left' | 'right'; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 16 40" width="14" height="36" aria-hidden className={`paper-clip${side === 'left' ? ' left' : ''}`} style={style}>
      <path
        d="M10.5 12V29.5a3.5 3.5 0 0 1-7 0V7.5a5 5 0 0 1 10 0V31a6.2 6.2 0 0 1-12.4 0V14"
        fill="none"
        stroke="#8F8A99"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M10.5 12V29.5a3.5 3.5 0 0 1-7 0V7.5a5 5 0 0 1 10 0" fill="none" stroke="#FFFFFF" strokeOpacity=".55" strokeWidth=".8" strokeLinecap="round" transform="translate(-.6 -.4)" />
    </svg>
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

type SheetProps = { open: boolean; onClose: () => void; title?: string; children: ReactNode; labelledBy?: string; small?: boolean }

// The pop-up paper, loaded up front so the first pop-up doesn't flash plain and then fill in.
const preload = new Image()
preload.src = paperWhite

const CLOSE_MS = 220

/** A bottom sheet of notebook paper. It slides up when it opens and drops away when it closes. */
export function Sheet({ open, onClose, title, children, small }: SheetProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [closing, setClosing] = useState(false)
  // While it drops away, keep showing what it showed last, even if the screen already moved on.
  const last = useRef<{ title?: string; children: ReactNode }>({ title, children })
  if (open) last.current = { title, children }

  const [mounted, setMounted] = useState(open)
  useEffect(() => {
    if (open) {
      setMounted(true)
      setClosing(false)
      return
    }
    if (!mounted) return
    setClosing(true)
    const timer = window.setTimeout(() => {
      setMounted(false)
      setClosing(false)
    }, CLOSE_MS)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open && !mounted) return null
  const shown = open ? { title, children } : last.current
  return createPortal(
    <div className={`sheet-back${small ? ' small' : ''}${closing ? ' closing' : ''}`} onClick={closing ? undefined : onClose}>
      <div ref={ref} className="sheet" role="dialog" aria-modal="true" aria-label={shown.title} onClick={(e) => e.stopPropagation()}>
        <div className="grab" />
        {shown.title && (
          <div style={{ marginBottom: 14 }}>
            {/* Balanced lines, so a long title splits evenly instead of leaving one word alone.
                A title can also say exactly where it breaks, with a new line in its text. */}
            <Hand size={34} lineHeight={36} style={{ textWrap: 'balance', whiteSpace: 'pre-line' }}>
              {shown.title}
            </Hand>
          </div>
        )}
        {shown.children}
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

// ---------------------------------------------------------------------------
// Undo, like Figma: after deleting something, a floating "Undo" for 5 seconds.
// ---------------------------------------------------------------------------

type UndoState = { id: number; text: string; undoLabel: string; undo: () => void }
let undoSetter: ((u: UndoState | null) => void) | null = null
let undoTimer: number | undefined
let undoSeq = 0
export const UNDO_MS = 5000

export function showUndo(text: string, undoLabel: string, undo: () => void) {
  undoSeq += 1
  undoSetter?.({ id: undoSeq, text, undoLabel, undo })
  window.clearTimeout(undoTimer)
  undoTimer = window.setTimeout(() => undoSetter?.(null), UNDO_MS)
}

export function UndoHost() {
  const [state, setState] = useState<UndoState | null>(null)
  useEffect(() => {
    undoSetter = setState
    return () => {
      undoSetter = null
    }
  }, [])
  if (!state) return null
  return createPortal(
    <div className="undo" role="status" key={state.id}>
      <span>{state.text}</span>
      <button
        type="button"
        onClick={() => {
          state.undo()
          window.clearTimeout(undoTimer)
          setState(null)
        }}
      >
        {state.undoLabel}
      </button>
      {/* Shrinks over the 5 seconds the undo is there. */}
      <span className="undo-time" aria-hidden />
    </div>,
    document.body,
  )
}
