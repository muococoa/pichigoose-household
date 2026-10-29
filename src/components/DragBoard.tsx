import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { DndContext, DragOverlay, PointerSensor, KeyboardSensor, closestCenter, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Hand } from './Scrapbook'

/** wide: takes two columns, like a wide iPhone widget. */
type Item<K extends string> = { key: K; node: ReactNode; wide?: boolean }

/**
 * A board of notes that can be moved around right where they are (desktop Home), using dnd-kit.
 * Grab a note and move it a little: it lifts and tilts and follows the pointer smoothly, the other
 * notes slide out of the way, and a dashed "drop it here" shows where it will land. Letting go saves.
 * A plain click (on a checkbox, a link) still works, because a drag only starts after a few pixels.
 */
export function DragBoard<K extends string>({ items, onReorder, dropLabel }: { items: Item<K>[]; onReorder: (keys: K[]) => void; dropLabel: string }) {
  const keysOf = items.map((i) => i.key).join('|')
  const [order, setOrder] = useState<K[]>(() => items.map((i) => i.key))
  const [active, setActive] = useState<K | null>(null)
  // Letting go of a dragged note shouldn't also count as a click that opens it.
  const lastDrop = useRef(0)

  // Follow changes from elsewhere (another device, Arrange), but not in the middle of a drag.
  useEffect(() => {
    if (!active) setOrder(items.map((i) => i.key))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keysOf])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function start(e: DragStartEvent) {
    setActive(e.active.id as K)
  }

  function end(e: DragEndEvent) {
    setActive(null)
    lastDrop.current = Date.now()
    const from = order.indexOf(e.active.id as K)
    const to = e.over ? order.indexOf(e.over.id as K) : from
    if (from === to || to < 0) return
    const next = arrayMove(order, from, to)
    setOrder(next)
    onReorder(next)
  }

  const byKey = new Map(items.map((i) => [i.key, i.node]))
  const wideOf = new Map(items.map((i) => [i.key, Boolean(i.wide)]))
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={start} onDragEnd={end} onDragCancel={() => { setActive(null); lastDrop.current = Date.now() }}>
      <SortableContext items={order} strategy={rectSortingStrategy}>
        {/* As many columns as fit, three on a big screen. Like iPhone widgets (Nora, 29 Oct): each note slides up
            under the one above it, so there are no gaps; the grid's rows are 1 px and each note spans its own height. */}
        <div className="board-grid packed">
          {order.map((key) => (
            <Slot key={key} id={key} wide={wideOf.get(key)} dropLabel={dropLabel} justDropped={() => Date.now() - lastDrop.current < 400}>
              {byKey.get(key)}
            </Slot>
          ))}
        </div>
      </SortableContext>
      {/* The note being carried: lifted, tilted, with a deep soft shadow. */}
      <DragOverlay dropAnimation={{ duration: 260, easing: 'cubic-bezier(.16, 1, .3, 1)' }}>
        {active ? <div className="drag-lifted">{byKey.get(active)}</div> : null}
      </DragOverlay>
    </DndContext>
  )
}

// The space between notes, up and down (the same as across, in desktop.css .board-grid).
const GAP = 30

function Slot({ id, wide, dropLabel, justDropped, children }: { id: string; wide?: boolean; dropLabel: string; justDropped: () => boolean; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  // How many 1 px rows this note takes: its height plus the gap under it. Follows the note as it grows or shrinks.
  const inner = useRef<HTMLDivElement>(null)
  const [rows, setRows] = useState<number>()
  useLayoutEffect(() => {
    const el = inner.current
    if (!el) return
    const measure = () => setRows(Math.ceil(el.getBoundingClientRect().height) + GAP)
    measure()
    const watch = new ResizeObserver(measure)
    watch.observe(el)
    return () => watch.disconnect()
  }, [])
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`drag-slot${wide ? ' wide' : ''}`}
      onClickCapture={(e) => {
        if (justDropped()) {
          e.stopPropagation()
          e.preventDefault()
        }
      }}
      style={{ transform: CSS.Translate.toString(transform), transition, position: 'relative', gridRowEnd: rows ? `span ${rows}` : undefined }}
    >
      {/* Keeps its size while the note is being carried, and shows where it will land. */}
      <div ref={inner} style={{ visibility: isDragging ? 'hidden' : undefined }}>{children}</div>
      {isDragging && (
        <div className="drop-here" aria-hidden>
          <Hand size={26} lineHeight={28} color="#857A8C">
            {dropLabel}
          </Hand>
        </div>
      )}
    </div>
  )
}
