import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMe } from '../auth'
import { db } from '../data/store'
import { DEFAULT_LAYOUT, completeLayout, useHousehold, useRooms, type LayoutEntry, type Room, type Section } from '../data/hooks'
import { roomLook } from './Home'
import { Screen } from '../components/Shell'
import { Box, Hand, Tape, type TapeKind } from '../components/Scrapbook'
import { GripIcon } from '../components/Icons'
import { useDesktop } from '../lib/desktop'
import { CleanHouseholdButton } from './HouseholdClean'

type ALook = { note: string; tape: TapeKind; rotate: number; label: string }
const LOOK: Record<string, ALook> = {
  news: { note: 'n-lilac', tape: 'ttri', rotate: -0.8, label: 'home.news' },
  todos: { note: 'n-blush', tape: 'tdots', rotate: -0.4, label: 'home.todos' },
  shopping: { note: 'n-butter', tape: 'tm', rotate: 0.8, label: 'home.toBuy' },
  pantry: { note: 'n-sand', tape: 'ty', rotate: -0.6, label: 'home.shelf.pantry' },
  bathroom: { note: 'n-mint', tape: 'tb', rotate: 0.5, label: 'home.shelf.bathroom' },
  money: { note: 'n-mist', tape: 'tblocks', rotate: -0.5, label: 'home.money' },
  notes: { note: 'n-sage', tape: 'tcheck', rotate: 0.6, label: 'home.notes' },
}

// Picking up a note: it lifts, rotates about -3 degrees, moves a few px, and its shadow goes soft and deep.
const LIFT = 'rotate(-3deg) translate(8px,-2px)'

/** A section's note: its pastel, tape, tilt and name. Rooms use their own name. */
function useLookOf(rooms: Room[]) {
  const { t } = useTranslation()
  return (section: Section): ALook => {
    if (section.startsWith('room:')) {
      const room = rooms.find((r) => `room:${r.id}` === section)
      const look = roomLook(room, rooms)
      return { note: look.note, tape: look.tape, rotate: look.rotate, label: (room?.name ?? '').toLocaleLowerCase() }
    }
    const look = LOOK[section] ?? LOOK.pantry
    return { ...look, label: t(look.label) }
  }
}

export function ArrangeHomeScreen() {
  const { t } = useTranslation()
  const me = useMe()
  const navigate = useNavigate()
  const { household, membership, people } = useHousehold()
  const rooms = useRooms(household?.id ?? null)
  const lookOf = useLookOf(rooms.rows)
  const [order, setOrder] = useState<LayoutEntry[]>(() => completeLayout(membership?.home_layout, rooms.rows))
  // Rooms load a moment later: give each its own note in the order.
  const roomKey = rooms.rows.map((r) => r.id).join(',')
  useEffect(() => {
    if (rooms.rows.length) setOrder((o) => completeLayout(o, rooms.rows))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomKey])
  const [dragging, setDragging] = useState<Section | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const refs = useRef<Partial<Record<Section, HTMLDivElement | null>>>({})
  const drag = useRef({ grab: 0, top: 0 })
  const desktop = useDesktop()

  // Money arrives in phase 3, so its note isn't shown here yet. It keeps its place in the saved order.
  const shown = order.filter((s) => s.section !== 'money')
  const others = people.filter((p) => p.id !== me)

  function place(section: Section) {
    const el = refs.current[section]
    if (el) el.style.transform = `translateY(${drag.current.top - el.offsetTop}px) ${LIFT}`
  }

  useLayoutEffect(() => {
    if (dragging) place(dragging)
  })

  function down(e: PointerEvent<HTMLDivElement>, section: Section) {
    if ((e.target as HTMLElement).closest('button')) return
    const el = refs.current[section]
    const list = listRef.current
    if (!el || !list) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const y = e.clientY - list.getBoundingClientRect().top
    drag.current = { grab: y - el.offsetTop, top: el.offsetTop }
    setDragging(section)
  }

  function move(e: PointerEvent<HTMLDivElement>) {
    if (!dragging || !listRef.current) return
    const el = refs.current[dragging]
    if (!el) return
    const y = e.clientY - listRef.current.getBoundingClientRect().top
    drag.current.top = y - drag.current.grab
    const middle = drag.current.top + el.offsetHeight / 2
    const rest = shown.filter((s) => s.section !== dragging)
    const index = rest.filter((s) => {
      const other = refs.current[s.section]
      return other ? other.offsetTop + other.offsetHeight / 2 < middle : false
    }).length
    const current = shown.findIndex((s) => s.section === dragging)
    if (index !== current) {
      const moved = shown[current]
      const nextShown = [...rest.slice(0, index), moved, ...rest.slice(index)]
      // Put money back where it was among the others.
      const moneyAt = order.findIndex((s) => s.section === 'money')
      const next = [...nextShown]
      if (moneyAt >= 0) next.splice(Math.min(moneyAt, next.length), 0, order[moneyAt])
      setOrder(next)
    } else {
      place(dragging)
    }
  }

  function up() {
    if (!dragging) return
    const el = refs.current[dragging]
    if (el) el.style.transform = ''
    setDragging(null)
  }

  function toggle(section: Section) {
    setOrder((o) => o.map((s) => (s.section === section ? { ...s, visible: !s.visible } : s)))
  }

  function done() {
    if (household) db.update('household_members', { household_id: household.id, user_id: me }, { home_layout: order })
    navigate('/')
  }

  if (desktop) {
    return (
      <Screen wide>
        <ArrangeBoard
          lookOf={lookOf}
          order={order}
          setOrder={setOrder}
          toggle={toggle}
          intro={others.length === 1 ? t('arrange.intro', { name: others[0].display_name }) : t('arrange.introAlone')}
          onReset={() => setOrder(completeLayout(DEFAULT_LAYOUT, rooms.rows))}
          onDone={done}
        />
      </Screen>
    )
  }

  return (
    <Screen
      footer={
        <div style={{ position: 'relative', zIndex: 3, display: 'flex', gap: 12, padding: '12px 22px calc(var(--bottom) + 44px) 40px' }}>
          <button type="button" className="stk sec" style={{ flex: 1, transform: 'rotate(-1deg)' }} onClick={() => setOrder(completeLayout(DEFAULT_LAYOUT, rooms.rows))}>
            {t('arrange.reset')}
          </button>
          <button type="button" className="stk prim" style={{ flex: 1.6, transform: 'rotate(1deg)' }} onClick={done}>
            {t('arrange.done')}
          </button>
        </div>
      }
    >
      <div style={{ padding: 'calc(var(--top) + 10px) 22px 0 40px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          {/* The broom: a fresh start for the household, top right. */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <Hand as="h1" style={{ margin: 0, flex: 1 }}>
              {t('arrange.title')}
            </Hand>
            <span style={{ marginTop: 6 }}>
              <CleanHouseholdButton />
            </span>
          </div>
          <div style={{ fontSize: 15, lineHeight: '22px', fontWeight: 600, marginTop: 6, maxWidth: 300 }}>
            {others.length === 1 ? t('arrange.intro', { name: others[0].display_name }) : t('arrange.introAlone')}
          </div>
        </div>
        <div ref={listRef} data-nobounce style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 6, position: 'relative' }}>
          {shown.map((s) => {
            const look = lookOf(s.section)
            const lifted = dragging === s.section
            const label = look.label
            return (
              <div
                key={s.section}
                ref={(el) => {
                  refs.current[s.section] = el
                }}
                className={`note ${look.note}`}
                onPointerDown={(e) => down(e, s.section)}
                onPointerMove={move}
                onPointerUp={up}
                onPointerCancel={up}
                aria-label={t('arrange.drag', { name: label })}
                style={{
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  touchAction: 'none',
                  cursor: lifted ? 'grabbing' : 'grab',
                  userSelect: 'none',
                  boxShadow: lifted ? '4px 10px 14px rgba(30,26,48,.22)' : '2px 3px 0 rgba(30,26,48,.12)',
                  opacity: s.visible ? 1 : 0.55,
                  transform: lifted ? undefined : `rotate(${look.rotate}deg)`,
                  zIndex: lifted ? 3 : undefined,
                  transition: lifted ? 'box-shadow .15s' : 'transform .15s, box-shadow .15s',
                }}
              >
                <Tape kind={look.tape} style={{ top: -9, left: 22, width: 56, height: 18, transform: 'rotate(-4deg)' }} />
                <GripIcon />
                <Hand size={28} lineHeight={30} style={{ flex: 1 }}>
                  {label}
                </Hand>
                <button
                  type="button"
                  role="switch"
                  aria-checked={s.visible}
                  aria-label={label}
                  onClick={() => toggle(s.section)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: '#63586B', padding: '8px 0', margin: '-8px 0' }}
                >
                  {s.visible ? t('arrange.shown') : t('arrange.hidden')}
                  <Box checked={s.visible} rotate={2} />
                </button>
              </div>
            )
          })}
        </div>
        <div className="cap" style={{ marginTop: 2 }}>
          {t('arrange.hiddenNote')}
        </div>
      </div>
    </Screen>
  )
}

type BoardProps = {
  lookOf: (section: Section) => ALook
  order: LayoutEntry[]
  setOrder: (next: LayoutEntry[]) => void
  toggle: (section: Section) => void
  intro: string
  onReset: () => void
  onDone: () => void
}

/** Desktop (D4): arranging happens in place. The board's notes, three across, are dragged around;
 *  the picked-up note lifts and tilts, and a dashed "drop it here" shows where it will land. */
function ArrangeBoard({ lookOf, order, setOrder, toggle, intro, onReset, onDone }: BoardProps) {
  const { t } = useTranslation()
  const [dragging, setDragging] = useState<Section | null>(null)
  const refs = useRef<Partial<Record<Section, HTMLDivElement | null>>>({})
  const drag = useRef({ x: 0, y: 0 })
  const [slot, setSlot] = useState<{ left: number; top: number; width: number; height: number } | null>(null)
  const shown = order.filter((s) => s.section !== 'money')

  // Keep the lifted note under the pointer, wherever its slot is now.
  function place() {
    if (!dragging) return
    const el = refs.current[dragging]
    if (!el) return
    el.style.transform = `translate(${drag.current.x - el.offsetLeft}px, ${drag.current.y - el.offsetTop}px) rotate(-3deg)`
    setSlot((old) =>
      old && old.left === el.offsetLeft && old.top === el.offsetTop ? old : { left: el.offsetLeft, top: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight },
    )
  }

  useLayoutEffect(() => {
    place()
  })

  const grab = useRef({ dx: 0, dy: 0 })

  function down(e: PointerEvent<HTMLDivElement>, section: Section) {
    if ((e.target as HTMLElement).closest('button')) return
    const el = refs.current[section]
    const board = el?.offsetParent as HTMLElement | null
    if (!el || !board) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const r = board.getBoundingClientRect()
    grab.current = { dx: e.clientX - r.left - el.offsetLeft, dy: e.clientY - r.top - el.offsetTop }
    drag.current = { x: el.offsetLeft, y: el.offsetTop }
    setDragging(section)
  }

  function move(e: PointerEvent<HTMLDivElement>) {
    if (!dragging) return
    const el = refs.current[dragging]
    const board = el?.offsetParent as HTMLElement | null
    if (!el || !board) return
    const r = board.getBoundingClientRect()
    drag.current = { x: e.clientX - r.left - grab.current.dx, y: e.clientY - r.top - grab.current.dy }
    // The note goes before every note whose middle it has passed, reading left to right, then down.
    const cx = drag.current.x + el.offsetWidth / 2
    const cy = drag.current.y + el.offsetHeight / 2
    const rest = shown.filter((s) => s.section !== dragging)
    const index = rest.filter((s) => {
      const o = refs.current[s.section]
      if (!o) return false
      const ox = o.offsetLeft + o.offsetWidth / 2
      const oy = o.offsetTop + o.offsetHeight / 2
      if (oy < cy - o.offsetHeight / 2) return true
      if (oy > cy + o.offsetHeight / 2) return false
      return ox < cx
    }).length
    const current = shown.findIndex((s) => s.section === dragging)
    if (index !== current) {
      const nextShown = [...rest.slice(0, index), shown[current], ...rest.slice(index)]
      const moneyAt = order.findIndex((s) => s.section === 'money')
      if (moneyAt >= 0) nextShown.splice(Math.min(moneyAt, nextShown.length), 0, order[moneyAt])
      setOrder(nextShown)
    } else {
      place()
    }
  }

  function up() {
    if (!dragging) return
    const el = refs.current[dragging]
    if (el) el.style.transform = ''
    setDragging(null)
    setSlot(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 26, padding: 'var(--top) 22px 0 40px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <Hand as="h1" size={52} lineHeight={56} style={{ margin: 0 }}>
            {t('arrange.title')}
          </Hand>
          <div style={{ fontSize: 17, lineHeight: '24px', fontWeight: 600, marginTop: 8 }}>{intro}</div>
        </div>
        <span style={{ marginTop: 10 }}>
          <CleanHouseholdButton size={42} />
        </span>
        <button type="button" className="stk sec" style={{ transform: 'rotate(-1deg)', marginTop: 8 }} onClick={onReset}>
          {t('arrange.reset')}
        </button>
        <button type="button" className="stk prim" style={{ transform: 'rotate(1.5deg)', marginTop: 8, padding: '0 34px' }} onClick={onDone}>
          {t('arrange.done')}
        </button>
      </div>
      <div className="board-grid" style={{ marginTop: 6, position: 'relative', alignItems: 'stretch' }}>
        {slot && (
          <div
            aria-hidden
            style={{ position: 'absolute', left: slot.left, top: slot.top, width: slot.width, height: slot.height, border: '2.5px dashed #C9C0CF', borderRadius: 4, display: 'grid', placeItems: 'center' }}
          >
            <Hand size={26} lineHeight={28} color="#857A8C">
              {t('arrange.dropHere')}
            </Hand>
          </div>
        )}
        {shown.map((s) => {
          const look = lookOf(s.section)
          const lifted = dragging === s.section
          const label = look.label
          return (
            <div
              key={s.section}
              ref={(el) => {
                refs.current[s.section] = el
              }}
              className={`note ${look.note}`}
              onPointerDown={(e) => down(e, s.section)}
              onPointerMove={move}
              onPointerUp={up}
              onPointerCancel={up}
              aria-label={t('arrange.drag', { name: label })}
              style={{
                minHeight: 150,
                padding: 22,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                touchAction: 'none',
                cursor: lifted ? 'grabbing' : 'grab',
                userSelect: 'none',
                boxShadow: lifted ? '6px 14px 18px rgba(30,26,48,.22)' : '2px 3px 0 rgba(30,26,48,.12)',
                opacity: s.visible ? 1 : 0.55,
                transform: lifted ? undefined : `rotate(${look.rotate}deg)`,
                zIndex: lifted ? 3 : undefined,
                transition: lifted ? 'box-shadow .15s' : 'transform .2s var(--ease-out), box-shadow .15s',
              }}
            >
              <Tape kind={look.tape} style={{ top: -10, left: 30, width: 70, height: 20, transform: 'rotate(-4deg)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <GripIcon />
                <Hand size={34} lineHeight={36} style={{ flex: 1 }}>
                  {label}
                </Hand>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={s.visible}
                aria-label={label}
                onClick={() => toggle(s.section)}
                style={{ alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 700, color: '#63586B', padding: '8px 0', margin: '-8px 0' }}
              >
                {s.visible ? t('arrange.shown') : t('arrange.hidden')}
                <Box checked={s.visible} rotate={2} />
              </button>
            </div>
          )
        })}
      </div>
      <div className="cap" style={{ fontSize: 14 }}>
        {t('arrange.hiddenNoteDesktop')}
      </div>
    </div>
  )
}
