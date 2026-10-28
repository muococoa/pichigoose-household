import { useEffect, useRef, useState, type ReactNode } from 'react'
import { DndContext, DragOverlay, PointerSensor, KeyboardSensor, closestCenter, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Hand } from './Scrapbook'

type Item<K extends string> = { key: K; node: ReactNode }

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
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={start} onDragEnd={end} onDragCancel={() => { setActive(null); lastDrop.current = Date.now() }}>
      <SortableContext items={order} strategy={rectSortingStrategy}>
        {/* As many columns as fit, at least 280 px each: three on a big screen, fewer in a narrow window. */}
        <div className="board-grid">
          {order.map((key) => (
            <Slot key={key} id={key} dropLabel={dropLabel} justDropped={() => Date.now() - lastDrop.current < 400}>
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

function Slot({ id, dropLabel, justDropped, children }: { id: string; dropLabel: string; justDropped: () => boolean; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className="drag-slot"
      onClickCapture={(e) => {
        if (justDropped()) {
          e.stopPropagation()
          e.preventDefault()
        }
      }}
      style={{ transform: CSS.Translate.toString(transform), transition, position: 'relative' }}
    >
      {/* Keeps its size while the note is being carried, and shows where it will land. */}
      <div style={{ visibility: isDragging ? 'hidden' : undefined }}>{children}</div>
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
