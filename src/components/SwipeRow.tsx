import { useEffect, useId, useRef, useState, type ReactNode } from 'react'

/**
 * Swipe a row sideways to show its buttons, like WhatsApp's chat list (Nora, 30 Oct). Swipe left for the buttons on
 * the right (Delete), swipe right for the ones on the left (Pin). Let go past halfway and they stay open; tap one,
 * or tap the row or swipe it back to close. One row is open at a time. The left edge still goes back, and scrolling
 * up and down works as before.
 */
/** color: the edge, icon and words; fill: the pencil scribble inside, soft like an empty send button. */
export type SwipeAction = { key: string; label: string; icon: ReactNode; color: string; fill: string; onClick: () => void }

const W = 78
const OPEN_EVENT = 'swiperow-open'

export function SwipeRow({ left = [], right = [], children }: { left?: SwipeAction[]; right?: SwipeAction[]; children: ReactNode }) {
  const id = useId()
  const [x, setX] = useState(0)
  const [dragging, setDragging] = useState(false)
  // While it moves or is open, the row disappears right at the paper's red margin line (Nora, 30 Oct), and nothing
  // is cut off the rest of the time. The number is how far left of the row that line is.
  const [clipped, setClipped] = useState<number | null>(null)
  const rowRef = useRef<HTMLDivElement>(null)
  function marginGap() {
    const row = rowRef.current
    const line = row?.closest('.screen')?.querySelector('.margin')
    if (!row || !line) return 0
    return Math.max(0, row.getBoundingClientRect().left - line.getBoundingClientRect().right)
  }
  const drag = useRef<{ x: number; y: number; from: number; on: boolean } | null>(null)
  const justDragged = useRef(false)
  const maxL = left.length * W
  const maxR = right.length * W

  // Another row opening closes this one.
  useEffect(() => {
    const close = (e: Event) => (e as CustomEvent<string>).detail !== id && setX(0)
    window.addEventListener(OPEN_EVENT, close)
    return () => window.removeEventListener(OPEN_EVENT, close)
  }, [id])

  function settle(to: number) {
    setX(to)
    if (to) window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: id }))
  }

  const handlers = {
    onTouchStart(e: React.TouchEvent) {
      const t = e.touches[0]
      drag.current = e.touches.length === 1 && t.clientX > 40 ? { x: t.clientX, y: t.clientY, from: x, on: false } : null
    },
    onTouchMove(e: React.TouchEvent) {
      const d = drag.current
      if (!d) return
      const t = e.touches[0]
      const dx = t.clientX - d.x
      const dy = Math.abs(t.clientY - d.y)
      if (!d.on) {
        if (dy > 10 && dy > Math.abs(dx)) drag.current = null
        else if (Math.abs(dx) > 10 && Math.abs(dx) > dy * 1.5) {
          d.on = true
          setDragging(true)
          setClipped(marginGap())
        }
        return
      }
      // Follows the finger; past the buttons it stretches like a rubber band.
      let next = d.from + dx
      if (next > maxL) next = maxL + (next - maxL) * 0.25
      if (next < -maxR) next = -maxR - (-maxR - next) * 0.25
      if (!maxL && next > 0) next = 0
      if (!maxR && next < 0) next = 0
      setX(next)
    },
    onTouchEnd() {
      const d = drag.current
      drag.current = null
      if (!d?.on) return
      setDragging(false)
      justDragged.current = true
      window.setTimeout(() => (justDragged.current = false), 350)
      if (x > maxL / 2 && maxL) settle(maxL)
      else if (x < -maxR / 2 && maxR) settle(-maxR)
      else settle(0)
    },
  }

  const run = (a: SwipeAction) => {
    setX(0)
    a.onClick()
  }

  return (
    <div ref={rowRef} className="swipe-row" style={clipped !== null ? { clipPath: `inset(-40px -40px -40px ${-clipped}px)` } : undefined} {...handlers} onTouchCancel={handlers.onTouchEnd}>
      {left.length > 0 && (
        <div className="swipe-actions" style={{ left: 0, width: Math.max(0, x), transition: dragging ? 'none' : undefined }} aria-hidden={x <= 0}>
          {left.map((a) => (
            <SwipeButton key={a.key} action={a} onClick={() => run(a)} />
          ))}
        </div>
      )}
      {right.length > 0 && (
        <div className="swipe-actions" style={{ right: 0, width: Math.max(0, -x), transition: dragging ? 'none' : undefined }} aria-hidden={x >= 0}>
          {right.map((a) => (
            <SwipeButton key={a.key} action={a} onClick={() => run(a)} />
          ))}
        </div>
      )}
      <div
        className="swipe-front"
        style={{ transform: x ? `translateX(${x}px)` : undefined, transition: dragging ? 'none' : undefined }}
        onTransitionEnd={() => !x && setClipped(null)}
        // While it's open (or was just dragged), a tap on the row only closes it.
        onClickCapture={(e) => {
          if (x || justDragged.current) {
            e.preventDefault()
            e.stopPropagation()
            if (x) settle(0)
          }
        }}
      >
        {children}
      </div>
    </div>
  )
}

function SwipeButton({ action, onClick }: { action: SwipeAction; onClick: () => void }) {
  const id = useId().replace(/:/g, '')
  return (
    <button type="button" className="swipe-btn" style={{ color: action.color, borderColor: action.color }} onClick={onClick}>
      {/* The same pencil scribble as the jars on the shelves (Containers.tsx), soft and see-through. */}
      <svg className="swipe-fill" aria-hidden preserveAspectRatio="none">
        <defs>
          <filter id={`sw-${id}`} x="0" y="0" width="1" height="1" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="1.6 .28" numOctaves="3" seed="7" result="grain" />
            <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.2 1.9" result="grainMask" />
            <feTurbulence type="fractalNoise" baseFrequency=".05" numOctaves="2" seed="3" result="wash" />
            <feColorMatrix in="wash" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1.6 .05" result="washMask" />
            <feComposite in="grainMask" in2="washMask" operator="arithmetic" k1="1" result="mask" />
            <feComposite in="SourceGraphic" in2="mask" operator="in" />
          </filter>
        </defs>
        <rect width="100%" height="100%" style={{ fill: action.fill }} opacity=".18" />
        <g transform="rotate(-28 40 40)">
          <rect x="-80" y="-80" width="260" height="260" style={{ fill: action.fill }} opacity=".45" filter={`url(#sw-${id})`} />
        </g>
      </svg>
      {action.icon}
      <span>{action.label}</span>
    </button>
  )
}
