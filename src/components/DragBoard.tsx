import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { Hand } from './Scrapbook'

type Item<K extends string> = { key: K; node: ReactNode }

/**
 * A board of notes that can be moved around right where they are (desktop Home).
 * Grab a note anywhere that isn't a button, link or checkbox and drag it: it lifts and tilts,
 * a dashed "drop it here" shows where it will land, and letting go saves the new order.
 */
export function DragBoard<K extends string>({ items, onReorder, dropLabel, columns = 3 }: { items: Item<K>[]; onReorder: (keys: K[]) => void; dropLabel: string; columns?: number }) {
  const keysOf = items.map((i) => i.key).join('|')
  const [order, setOrder] = useState<K[]>(() => items.map((i) => i.key))
  const [dragging, setDragging] = useState<K | null>(null)
  const [slot, setSlot] = useState<{ left: number; top: number; width: number; height: number } | null>(null)
  const refs = useRef<Partial<Record<K, HTMLDivElement | null>>>({})
  const press = useRef<{ key: K; x: number; y: number } | null>(null)
  const grab = useRef({ dx: 0, dy: 0 })
  const at = useRef({ x: 0, y: 0 })
  // The latest values, for the window listeners that follow the pointer during a drag.
  const live = useRef({ dragging: null as K | null, order: [] as K[], keysOf: '' })
  live.current = { dragging, order, keysOf }

  // Follow changes from elsewhere (another device, Arrange), but not in the middle of a drag.
  useEffect(() => {
    if (!dragging) setOrder(items.map((i) => i.key))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keysOf])

  function place() {
    if (!dragging) return
    const el = refs.current[dragging]
    if (!el) return
    el.style.transform = `translate(${at.current.x - el.offsetLeft}px, ${at.current.y - el.offsetTop}px) rotate(-3deg)`
    setSlot((old) => (old && old.left === el.offsetLeft && old.top === el.offsetTop ? old : { left: el.offsetLeft, top: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight }))
  }
  useLayoutEffect(() => {
    place()
  })

  function down(e: PointerEvent<HTMLDivElement>, key: K) {
    if (e.button !== 0) return
    // Buttons, links and checkboxes inside a note keep working as usual.
    if ((e.target as HTMLElement).closest('button, a, input, textarea, label')) return
    press.current = { key, x: e.clientX, y: e.clientY }
    // Follow the pointer anywhere on the page until it's let go.
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }

  function move(e: globalThis.PointerEvent) {
    const p = press.current
    if (!p) return
    const el = refs.current[p.key]
    const board = el?.offsetParent as HTMLElement | null
    if (!el || !board) return
    const r = board.getBoundingClientRect()
    const { dragging, order } = live.current
    if (!dragging) {
      // A small wobble isn't a drag.
      if (Math.hypot(e.clientX - p.x, e.clientY - p.y) < 6) return
      e.preventDefault()
      grab.current = { dx: p.x - r.left - el.offsetLeft, dy: p.y - r.top - el.offsetTop }
      live.current.dragging = p.key
      setDragging(p.key)
    }
    at.current = { x: e.clientX - r.left - grab.current.dx, y: e.clientY - r.top - grab.current.dy }
    const cx = at.current.x + el.offsetWidth / 2
    const cy = at.current.y + el.offsetHeight / 2
    const rest = order.filter((k) => k !== p.key)
    const index = rest.filter((k) => {
      const o = refs.current[k]
      if (!o) return false
      const ox = o.offsetLeft + o.offsetWidth / 2
      const oy = o.offsetTop + o.offsetHeight / 2
      if (oy < cy - o.offsetHeight / 2) return true
      if (oy > cy + o.offsetHeight / 2) return false
      return ox < cx
    }).length
    if (index !== order.indexOf(p.key)) {
      const next = [...rest.slice(0, index), p.key, ...rest.slice(index)]
      live.current.order = next
      setOrder(next)
    } else place()
  }

  function up() {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
    window.removeEventListener('pointercancel', up)
    const p = press.current
    press.current = null
    const { dragging, order, keysOf } = live.current
    if (!p || !dragging) return
    const el = refs.current[dragging]
    if (el) el.style.transform = ''
    setDragging(null)
    setSlot(null)
    if (order.join('|') !== keysOf) onReorder(order)
  }

  const byKey = new Map(items.map((i) => [i.key, i.node]))
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: 30, alignItems: 'start', position: 'relative' }}>
      {slot && (
        <div
          aria-hidden
          style={{ position: 'absolute', left: slot.left, top: slot.top, width: slot.width, height: slot.height, border: '2.5px dashed #C9C0CF', borderRadius: 4, display: 'grid', placeItems: 'center' }}
        >
          <Hand size={26} lineHeight={28} color="#857A8C">
            {dropLabel}
          </Hand>
        </div>
      )}
      {order.map((key) => {
        const lifted = dragging === key
        return (
          <div
            key={key}
            ref={(el) => {
              refs.current[key] = el
            }}
            onPointerDown={(e) => down(e, key)}
            style={{
              cursor: lifted ? 'grabbing' : 'grab',
              userSelect: lifted ? 'none' : undefined,
              zIndex: lifted ? 3 : undefined,
              position: 'relative',
              filter: lifted ? 'drop-shadow(6px 14px 14px rgba(30,26,48,.22))' : undefined,
              transition: lifted ? 'filter .15s' : 'transform .2s var(--ease-out), filter .15s',
            }}
          >
            {byKey.get(key)}
          </div>
        )
      })}
    </div>
  )
}
