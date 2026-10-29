import { useEffect, useMemo, useRef, useState, type FormEvent, type PointerEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMe } from '../auth'
import { db } from '../data/store'
import { useHousehold, useItemsIn, useLists, usePantry, useRooms, useSpots, type Container, type PantryItem, type Room, type RoomKind, type Spot } from '../data/hooks'
import { setPantryLevel } from '../data/actions'
import { Floating, Screen } from '../components/Shell'
import { EmptyState, Hand, PeekingPichi, Sheet, showToast, showUndo, type TapeKind } from '../components/Scrapbook'
import { BackIcon, BroomIcon, PlusIcon } from '../components/Icons'
import { CONTAINERS, ContainerDrawing, containersFor, guessContainer, insideSpan } from '../components/Containers'
import { GroupDrawing, ShelfRows, groupKey, groupThings, useShelfWidth, type Group } from '../components/Shelves'
import { useDesktop } from '../lib/desktop'
import { forget, useKept } from '../lib/kept'
import { useSlideDirection, useSwipeBetween, useTapeBounce } from '../components/Slide'
import { Chip } from './Todos'
import { useBack } from '../lib/back'
import { autoFocusField } from '../lib/keyboard'

const STEPS = [
  { key: 'full', level: 100 },
  { key: 'pct', level: 75 },
  { key: 'half', level: 50 },
  { key: 'pct', level: 25 },
  { key: 'low', level: 10 },
  { key: 'empty', level: 0 },
] as const

/** How full something is: quick steps, plus a little field to type your own number. */
function LevelPicker({ value, onPick, live }: { value: number; onPick: (n: number) => void; live?: boolean }) {
  const { t } = useTranslation()
  const isStep = STEPS.some((s) => s.level === value)
  const [own, setOwn] = useState(isStep ? '' : String(value))
  useEffect(() => setOwn(isStep ? '' : String(value)), [value, isStep])
  function commit(text = own) {
    const n = Math.max(0, Math.min(100, parseInt(text, 10)))
    if (!Number.isNaN(n) && n !== value) onPick(n)
  }
  return (
    <div className="chips">
      {STEPS.map((s) => (
        <Chip key={s.level} on={value === s.level} onClick={() => onPick(s.level)}>
          {s.key === 'pct' ? t('pantry.percent', { n: s.level }) : t(`pantry.steps.${s.key}`)}
        </Chip>
      ))}
      <label className={`own-pct${!isStep ? ' on' : ''}`}>
        <input
          className="input"
          inputMode="numeric"
          enterKeyHint="done"
          maxLength={3}
          placeholder={t('pantry.own')}
          aria-label={t('pantry.ownLabel')}
          value={own}
          onChange={(e) => {
            const text = e.target.value.replace(/\D/g, '')
            setOwn(text)
            if (live) commit(text)
          }}
          onBlur={() => commit()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commit()
              e.currentTarget.blur()
            }
          }}
        />
        %
      </label>
    </div>
  )
}
const LOW_MARKS = [10, 20, 30, 50]

/** Hooks up everything Pichi needs to put a low thing on the list, and says what happened with Undo:
 *  Pichi adding it to the list, or an empty bottle tossed from its group. */
export function usePantryLevel() {
  const { t } = useTranslation()
  const me = useMe()
  const { household } = useHousehold()
  const lists = useLists(household?.id ?? null)
  const items = useItemsIn(lists.rows.map((l) => l.id))
  return (p: PantryItem, level: number, group?: PantryItem[]) => {
    const { added, tossed } = setPantryLevel(p, level, me, lists.rows, items.rows, group)
    const putBack = () => {
      if (added) db.remove('list_items', added.row.id)
      if (tossed) db.insert('pantry_items', { ...tossed, level: p.level })
    }
    if (added) showUndo(t('pantry.pichiAdded', { item: added.row.name as string, list: added.list.name }), t('common.undo'), putBack)
    else if (tossed) showUndo(t('pantry.tossed', { name: (group?.find((r) => r.id !== tossed.id) ?? tossed).name.trim() }), t('common.undo'), putBack)
  }
}

/** Where a thing lives: its spot, or (made offline before rooms) the first spot of a room like its place. */
export function spotOf(p: PantryItem, rooms: Room[], spots: Spot[]) {
  if (p.spot_id) return p.spot_id
  const room = rooms.find((r) => r.kind === (p.place === 'bathroom' ? 'bathroom' : 'kitchen'))
  return spots.find((s) => s.room_id === room?.id)?.id ?? null
}

const ROOM_KINDS: RoomKind[] = ['kitchen', 'bathroom', 'other']
const ROOM_TAPES: TapeKind[] = ['ty', 'tb', 'tp', 'tm', 'tdots', 'tblocks', 'ttri', 'tcheck']

/** The home's rooms, each with its storage spots: drawn shelves, each thing showing how full it is. */
export function PantryScreen() {
  const { t } = useTranslation()
  const me = useMe()
  const back = useBack()
  const desktop = useDesktop()
  const [params, setParams] = useSearchParams()
  const { household } = useHousehold()
  const hid = household?.id ?? null
  const pantry = usePantry(hid)
  const rooms = useRooms(hid)
  const spots = useSpots(hid)
  const setLevel = usePantryLevel()
  const { ref, width } = useShelfWidth()
  // Pop-ups stay open (with whatever you typed) if you step away and come back.
  const [open, setOpen] = useKept<string | null>(`pantry:${hid}:open`, null)
  const [adding, setAdding] = useKept<string | null>(`pantry:${hid}:adding`, null)
  const [cleaning, setCleaning] = useState(false)
  // Rooms and spots: adding (a blank one) or changing one.
  const [roomEdit, setRoomEdit] = useKept<{ id: string | null; name: string; kind: RoomKind } | null>(`pantry:${hid}:room`, null)
  const [spotEdit, setSpotEdit] = useKept<{ id: string | null; name: string } | null>(`pantry:${hid}:spot`, null)

  // The room on screen: from the link (?room=, or ?place=bathroom from before rooms), else the first.
  const wanted = params.get('room')
  const room =
    rooms.rows.find((r) => r.id === wanted) ??
    (params.get('place') === 'bathroom' ? rooms.rows.find((r) => r.kind === 'bathroom') : undefined) ??
    rooms.rows[0] ??
    null
  const roomSpots = useMemo(() => spots.rows.filter((x) => x.room_id === room?.id), [spots.rows, room?.id])
  const where = (p: PantryItem) => spotOf(p, rooms.rows, spots.rows)
  const things = useMemo(
    () => pantry.rows.filter((p) => roomSpots.some((x) => x.id === where(p))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pantry.rows, roomSpots, rooms.rows, spots.rows],
  )
  const height = desktop ? 96 : 80
  const pickRoom = (id: string) => setParams({ room: id }, { replace: true })
  // Swipe the page left or right for the next or previous room (phone).
  const roomsRow = useRef<HTMLDivElement>(null)
  const roomIndex = room ? rooms.rows.findIndex((r) => r.id === room.id) : -1
  const slide = useSlideDirection(roomIndex)
  useTapeBounce(roomsRow, room?.id ?? null)
  useSwipeBetween(
    desktop || roomIndex <= 0 ? null : () => pickRoom(rooms.rows[roomIndex - 1].id),
    desktop || roomIndex < 0 || roomIndex >= rooms.rows.length - 1 ? null : () => pickRoom(rooms.rows[roomIndex + 1].id),
  )

  function saveRoom() {
    if (!roomEdit || !hid || !roomEdit.name.trim()) return
    if (roomEdit.id) db.update('rooms', roomEdit.id, { name: roomEdit.name.trim(), kind: roomEdit.kind })
    else {
      const now = new Date().toISOString()
      const r = db.insert('rooms', { household_id: hid, name: roomEdit.name.trim(), kind: roomEdit.kind, position: rooms.rows.length ? Math.max(...rooms.rows.map((x) => x.position)) + 1 : 0, created_at: now })
      // A new room starts with one spot, so things can go in right away.
      db.insert('storage_spots', { household_id: hid, room_id: r.id, name: t('pantry.rooms.firstSpot'), position: 0, created_at: now })
      pickRoom(r.id)
    }
    setRoomEdit(null)
  }

  function saveSpot() {
    if (!spotEdit || !hid || !room || !spotEdit.name.trim()) return
    if (spotEdit.id) db.update('storage_spots', spotEdit.id, { name: spotEdit.name.trim() })
    else db.insert('storage_spots', { household_id: hid, room_id: room.id, name: spotEdit.name.trim(), position: roomSpots.length ? Math.max(...roomSpots.map((x) => x.position)) + 1 : 0, created_at: new Date().toISOString() })
    setSpotEdit(null)
  }

  return (
    <Screen tabbar wide className="has-fab" doodle={things.length ? 'walk' : undefined}>
      <div style={{ padding: 'calc(var(--top) + 8px) 22px 0 40px', display: 'flex', flexDirection: 'column', gap: desktop ? 18 : 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: desktop ? 0 : -10 }}>
          {!desktop && (
            <button type="button" aria-label={t('common.back')} onClick={back} style={{ color: '#1E1A30', display: 'flex' }}>
              <BackIcon />
            </button>
          )}
          <Hand as="h1" size={desktop ? 52 : 42} lineHeight={desktop ? 56 : 44} style={{ margin: 0 }}>
            {room?.name ?? t('pantry.title')}
          </Hand>
          <span style={{ flex: 1 }} />
          {/* The deep clean: empties this room in one go, after asking. */}
          {things.length > 0 && room && (
            <button type="button" className="stk sec sm" aria-label={t('pantry.clean.room.title', { name: room.name })} title={t('pantry.clean.room.title', { name: room.name })} style={{ width: desktop ? 42 : 38, padding: 0, transform: `rotate(${desktop ? 3 : 2}deg)` }} onClick={() => setCleaning(true)}>
              <BroomIcon />
            </button>
          )}
        </div>
        {/* The rooms as washi-tape tabs, like the shopping lists. Tap the open one to rename it. */}
        <div ref={roomsRow} style={{ position: 'relative', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', rowGap: 12 }}>
          {rooms.rows.map((r, i) => {
            const on = r.id === room?.id
            return (
              <button
                key={r.id}
                type="button"
                className={ROOM_TAPES[i % ROOM_TAPES.length]}
                aria-pressed={on}
                onClick={() => (on ? setRoomEdit({ id: r.id, name: r.name, kind: r.kind }) : pickRoom(r.id))}
                style={{
                  position: 'relative',
                  display: 'inline-flex',
                  alignItems: 'center',
                  height: 30,
                  padding: '0 14px',
                  fontSize: 14,
                  color: on ? '#1E1A30' : '#63586B',
                  fontWeight: on ? 800 : 700,
                  transform: `rotate(${i % 2 ? 1.5 : -2}deg)`,
                  boxShadow: on ? '1px 2px 0 rgba(30,26,48,.12)' : undefined,
                  opacity: on ? 1 : 0.75,
                }}
              >
                {r.name}
              </button>
            )
          })}
          <button
            type="button"
            onClick={() => setRoomEdit({ id: null, name: '', kind: 'other' })}
            style={{ display: 'inline-flex', alignItems: 'center', height: 28, padding: '0 12px', fontSize: 14, fontWeight: 700, color: '#63586B', border: '2px dashed #B6ABBE', borderRadius: 4 }}
          >
            {t('pantry.rooms.add')}
          </button>
        </div>
      </div>

      <div ref={ref} key={room?.id} className={slide} style={{ padding: desktop ? '30px 22px 32px 40px' : '26px 26px 0 44px', maxWidth: desktop ? 900 : undefined }}>
        {/* Each storage spot in the room: its handwritten name, then its own shelves. */}
        {roomSpots.map((spot) => {
          const here = groupThings(things.filter((p) => where(p) === spot.id))
          return (
            <section key={spot.id} style={{ marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
                <button type="button" onClick={() => setSpotEdit({ id: spot.id, name: spot.name })} aria-label={t('pantry.spots.rename', { name: spot.name })}>
                  <Hand size={desktop ? 30 : 27} lineHeight={desktop ? 32 : 29}>
                    {spot.name}
                  </Hand>
                </button>
                <span className="cap">{here.length ? t('common.items', { count: here.reduce((n, g) => n + g.rows.length, 0) }) : ''}</span>
                <span style={{ flex: 1 }} />
                <button type="button" className="cap" style={{ color: 'var(--hero-dark)', fontWeight: 800 }} onClick={() => setAdding(spot.id)}>
                  {t('pantry.spots.addHere')}
                </button>
              </div>
              {here.length ? (
                <ShelfRows groups={here} width={width} height={height} onOpen={(g) => setOpen(g.key)} />
              ) : things.length ? (
                <div className="cap" style={{ fontSize: 14, padding: '4px 0 6px' }}>{t('pantry.spots.empty')}</div>
              ) : null}
            </section>
          )
        })}
        {room && (
          <button
            type="button"
            onClick={() => setSpotEdit({ id: null, name: '' })}
            style={{ display: 'inline-flex', alignItems: 'center', height: 30, padding: '0 14px', fontSize: 14, fontWeight: 700, color: '#63586B', border: '2px dashed #B6ABBE', borderRadius: 4, marginTop: 4 }}
          >
            {t('pantry.spots.add')}
          </button>
        )}
        {pantry.loaded && room && !things.length && (
          <EmptyState pose="walk" color="#E9E1D6" zoom={0.95}>
            {t(room.kind === 'bathroom' ? 'pantry.emptyBathroom' : room.kind === 'kitchen' ? 'pantry.empty' : 'pantry.emptyRoom')}
          </EmptyState>
        )}
        {desktop && roomSpots[0] && (
          <div>
            <button type="button" className="stk prim" style={{ transform: 'rotate(-1.5deg)', marginTop: 16 }} onClick={() => setAdding(roomSpots[0].id)}>
              {t('pantry.add')}
            </button>
          </div>
        )}
      </div>

      {!desktop && roomSpots[0] && (
        <Floating>
          <button
            type="button"
            className="stk prim round fab"
            aria-label={t('pantry.add')}
            onClick={() => setAdding(roomSpots[0].id)}
            style={{ transform: 'rotate(-4deg)' }}
          >
            <PlusIcon />
          </button>
        </Floating>
      )}

      <GroupSheet groupId={open} onClose={() => setOpen(null)} />

      {/* A room: its name, and what kind of room it is (that decides the drawings). */}
      <Sheet small open={Boolean(roomEdit)} onClose={() => setRoomEdit(null)} title={roomEdit?.id ? t('pantry.rooms.edit') : t('pantry.rooms.new')}>
        {roomEdit && (
          <form onSubmit={(e) => { e.preventDefault(); saveRoom() }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <input className="input" ref={roomEdit.id ? undefined : autoFocusField} placeholder={t('pantry.rooms.placeholder')} aria-label={t('pantry.rooms.name')} value={roomEdit.name} onChange={(e) => setRoomEdit({ ...roomEdit, name: e.target.value })} />
            <div>
              <span className="label">{t('pantry.rooms.kind')}</span>
              <div className="chips">
                {ROOM_KINDS.map((k) => (
                  <Chip key={k} on={roomEdit.kind === k} onClick={() => setRoomEdit({ ...roomEdit, kind: k })}>
                    {t(`pantry.rooms.kinds.${k}`)}
                  </Chip>
                ))}
              </div>
            </div>
            <button type="submit" className="stk prim" style={{ width: '100%' }} disabled={!roomEdit.name.trim()}>
              {roomEdit.id ? t('common.save') : t('pantry.rooms.addButton')}
            </button>
            {roomEdit.id && rooms.rows.length > 1 && (
              <button
                type="button"
                className="stk sec"
                style={{ width: '100%', color: '#A8335A' }}
                onClick={() => {
                  if (roomEdit.id && window.confirm(t('pantry.rooms.deleteText', { name: roomEdit.name }))) {
                    db.remove('rooms', roomEdit.id)
                    setParams({}, { replace: true })
                  }
                  setRoomEdit(null)
                }}
              >
                {t('pantry.rooms.delete')}
              </button>
            )}
          </form>
        )}
      </Sheet>

      {/* A storage spot in the room: the pantry, a cabinet, the shelf by the bathtub. */}
      <Sheet small open={Boolean(spotEdit)} onClose={() => setSpotEdit(null)} title={spotEdit?.id ? t('pantry.spots.edit') : t('pantry.spots.new', { room: room?.name ?? '' })}>
        {spotEdit && (
          <form onSubmit={(e) => { e.preventDefault(); saveSpot() }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <input className="input" ref={spotEdit.id ? undefined : autoFocusField} placeholder={t(room?.kind === 'bathroom' ? 'pantry.spots.placeholderBathroom' : 'pantry.spots.placeholder')} aria-label={t('pantry.spots.name')} value={spotEdit.name} onChange={(e) => setSpotEdit({ ...spotEdit, name: e.target.value })} />
            <button type="submit" className="stk prim" style={{ width: '100%' }} disabled={!spotEdit.name.trim()}>
              {spotEdit.id ? t('common.save') : t('pantry.spots.addButton')}
            </button>
            {spotEdit.id && roomSpots.length > 1 && (
              <button
                type="button"
                className="stk sec"
                style={{ width: '100%', color: '#A8335A' }}
                onClick={() => {
                  const count = things.filter((p) => where(p) === spotEdit.id).length
                  if (spotEdit.id && window.confirm(t('pantry.spots.deleteText', { name: spotEdit.name, count }))) db.remove('storage_spots', spotEdit.id)
                  setSpotEdit(null)
                }}
              >
                {t('pantry.spots.delete')}
              </button>
            )}
          </form>
        )}
      </Sheet>

      <Sheet small open={cleaning} onClose={() => setCleaning(false)} title={t('pantry.clean.room.title', { name: room?.name ?? '' })}>
        {/* Pichi peeks in from the right edge, looking at you: are you sure? */}
        <div style={{ position: 'relative' }}>
          <p className="body" style={{ margin: '0 0 18px', paddingRight: 44 }}>
            {t('pantry.clean.room.text', { name: room?.name ?? '' })}
            <br />
            {t('pantry.clean.undo')}
          </p>
          <PeekingPichi style={{ right: -30, top: -26, height: 80 }} />
        </div>
        <div className="row" style={{ gap: 12 }}>
          <button type="button" className="stk sec" style={{ flex: 1, transform: 'rotate(-1deg)' }} onClick={() => setCleaning(false)}>
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className="stk prim"
            style={{ flex: 1.4, transform: 'rotate(1deg)' }}
            onClick={() => {
              for (const r of things) db.remove('pantry_items', r.id)
              setCleaning(false)
            }}
          >
            {t('pantry.clean.button')}
          </button>
        </div>
      </Sheet>
      {room && (
        <AddThingSheet
          open={Boolean(adding)}
          kind={room.kind}
          spots={roomSpots}
          spot={adding}
          groupsIn={(spotId) => groupThings(things.filter((p) => where(p) === spotId))}
          onClose={() => setAdding(null)}
          onAdd={(spotId, name, container, level) => {
            if (!hid) return
            const inSpot = things.filter((p) => where(p) === spotId)
            // Already in this spot (any capitals)? It joins that group, looking the same.
            const same = groupThings(inSpot).find((g) => g.key === groupKey({ place: 'pantry', name, spot_id: spotId }))
            const like = same?.rows[0]
            const now = new Date().toISOString()
            const row = db.insert('pantry_items', {
              household_id: hid,
              spot_id: spotId,
              place: room.kind === 'bathroom' ? 'bathroom' : 'pantry',
              name: like ? like.name : name,
              container: like ? like.container : container,
              level,
              low_at: like ? like.low_at : 20,
              list_id: like ? like.list_id : null,
              position: like ? like.position : inSpot.length ? Math.max(...inSpot.map((x) => x.position)) + 1 : 0,
              created_by: me,
              created_at: now,
              updated_by: me,
              updated_at: now,
            }) as PantryItem
            // Put on the shelf already almost out, with nothing else like it? Pichi adds it to the list straight away.
            if (!same && level <= row.low_at) setLevel({ ...row, level: 100 }, level)
          }}
        />
      )}
    </Screen>
  )
}

/**
 * One thing from the shelf, big: drag it (or tap a step) to say how full it is. For a group (three
 * bottles of wine) all of them stand at the top; tap one to change it, and it gets circled.
 * Changes save right away. Name, drawing, low mark and list are shared by the whole group.
 */
function GroupSheet({ groupId, onClose }: { groupId: string | null; onClose: () => void }) {
  const { t } = useTranslation()
  const me = useMe()
  const { household } = useHousehold()
  const hid = household?.id ?? null
  const pantry = usePantry(hid)
  const lists = useLists(hid)
  const rooms = useRooms(hid)
  const spots = useSpots(hid)
  const setLevelOf = usePantryLevel()
  const group: Group | null = useMemo(() => (groupId ? groupThings(pantry.rows).find((g) => g.key === groupId) ?? null : null), [groupId, pantry.rows])
  // Which one you're changing: the one you tapped, or else the open one (the least full).
  const [picked, setPicked] = useKept<string | null>(groupId ? `pantry-group:${groupId}:picked` : null, null)
  const rows = group?.rows ?? []
  const p = rows.find((r) => r.id === picked) ?? [...rows].sort((a, b) => a.level - b.level)[0] ?? null
  const setLevel = (thing: PantryItem, n: number) => setLevelOf(thing, n, rows)
  // Keep showing the group name while the sheet closes, even after it changes.
  const lastName = useRef('')
  if (group) lastName.current = group.name
  // The name as you type it (kept while you're away), saved when you leave the field or close.
  const [name, setName] = useKept(groupId ? `pantry-group:${groupId}:name` : null, group?.name ?? '')
  // While dragging, the drawing follows the finger; letting go saves.
  const [dragLevel, setDragLevel] = useState<number | null>(null)
  const dragRef = useRef<HTMLDivElement>(null)

  // Shared by the whole group.
  function save(patch: Partial<PantryItem>) {
    for (const r of rows) db.update('pantry_items', r.id, { ...patch, updated_by: me, updated_at: new Date().toISOString() })
  }

  function oneMore() {
    if (!p) return
    const { id: _id, ...like } = p
    void _id
    const now = new Date().toISOString()
    const row = db.insert('pantry_items', { ...like, level: 100, created_by: me, created_at: now, updated_by: me, updated_at: now })
    setPicked(row.id)
  }

  function levelAt(e: PointerEvent<HTMLDivElement>) {
    const el = dragRef.current?.querySelector('svg')
    if (!el || !p) return 0
    const r = el.getBoundingClientRect()
    const span = insideSpan(p.container)
    const top = r.top + r.height * span.top
    const bottom = r.top + r.height * span.bottom
    const share = (bottom - e.clientY) / (bottom - top)
    // Snaps to 5 so it doesn't feel fiddly.
    return Math.max(0, Math.min(100, Math.round((share * 100) / 5) * 5))
  }

  function commitName() {
    if (group && name.trim() && name.trim() !== group.name) save({ name: name.trim() })
  }

  const sortedLists = [...lists.rows].sort((a, b) => a.position - b.position)
  const level = dragLevel ?? p?.level ?? 0
  const here = p ? spotOf(p, rooms.rows, spots.rows) : null
  const hereRoom = rooms.rows.find((r) => r.id === spots.rows.find((x) => x.id === here)?.room_id)

  // Moving the whole group to another spot, even in another room.
  function moveTo(spotId: string) {
    if (!group || spotId === here) return
    const target = spots.rows.find((x) => x.id === spotId)
    save({ spot_id: spotId })
    showToast(t('pantry.spots.moved', { item: group.name, spot: target?.name ?? '' }))
    onClose()
  }

  return (
    <Sheet open={Boolean(p)} onClose={() => { commitName(); forget('pantry-group:'); onClose() }} title={lastName.current}>
      {p && group && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {rows.length > 1 && (
            <div className="group-pick" role="group" aria-label={t('pantry.count', { count: rows.length })}>
              {rows.map((r, i) => (
                <button key={r.id} type="button" aria-pressed={r.id === p.id} aria-label={`${i + 1}: ${t('pantry.percent', { n: r.level })}`} onClick={() => setPicked(r.id)}>
                  <GroupDrawing g={{ key: r.id, name: group.name, rows: [r] }} height={72} selected={p.id} />
                </button>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 22 }}>
            <div
              ref={dragRef}
              className="level-drag"
              role="slider"
              aria-label={t('pantry.drag')}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={level}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'ArrowUp') setLevel(p, Math.min(100, p.level + 5))
                if (e.key === 'ArrowDown') setLevel(p, Math.max(0, p.level - 5))
              }}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId)
                setDragLevel(levelAt(e))
              }}
              onPointerMove={(e) => {
                if (dragLevel !== null) setDragLevel(levelAt(e))
              }}
              onPointerUp={(e) => {
                const next = levelAt(e)
                setDragLevel(null)
                if (next !== p.level) setLevel(p, next)
              }}
              onPointerCancel={() => setDragLevel(null)}
            >
              <ContainerDrawing kind={p.container} level={level} lowAt={p.low_at} height={170} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 96 }}>
              <Hand size={48} lineHeight={50} color={level <= p.low_at ? 'var(--hero-dark)' : '#1E1A30'}>
                {t('pantry.percent', { n: level })}
              </Hand>
              <span className="cap">{level <= p.low_at ? t('pantry.almostOut') : t('pantry.dragHint')}</span>
            </div>
          </div>
          <LevelPicker value={p.level} onPick={(n) => setLevel(p, n)} />
          {/* Finishing one is one tap; bought more, add them here. */}
          <div className="row" style={{ gap: 12 }}>
            <button type="button" className="stk sec sm" style={{ flex: 1, transform: 'rotate(-1deg)' }} onClick={() => setLevel(p, 0)}>
              {t('pantry.finishedOne')}
            </button>
            <button type="button" className="stk sec sm" style={{ flex: 1, transform: 'rotate(1deg)' }} onClick={oneMore}>
              {t('pantry.oneMore')}
            </button>
          </div>

          <div>
            <label className="label" htmlFor="thing-name">
              {t('pantry.name')}
            </label>
            <input id="thing-name" className="input" value={name} onChange={(e) => setName(e.target.value)} onBlur={commitName} />
          </div>

          <div>
            <span className="label">{t('pantry.looksLike')}</span>
            <ContainerPicker kind={hereRoom?.kind ?? (p.place === 'bathroom' ? 'bathroom' : 'kitchen')} name={p.name} value={p.container} level={p.level} lowAt={p.low_at} onPick={(container) => save({ container })} />
          </div>

          {/* Where it lives: every storage spot in the home. Tap one to move it there. */}
          {spots.rows.length > 1 && (
            <div>
              <span className="label">{t('pantry.spots.livesIn')}</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {rooms.rows.map((r) => {
                  const inRoom = spots.rows.filter((x) => x.room_id === r.id)
                  if (!inRoom.length) return null
                  return (
                    <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', rowGap: 8 }}>
                      {rooms.rows.length > 1 && <span className="cap" style={{ minWidth: 64, fontWeight: 800 }}>{r.name}</span>}
                      <div className="chips">
                        {inRoom.map((x) => (
                          <Chip key={x.id} on={x.id === here} onClick={() => moveTo(x.id)}>
                            {x.name}
                          </Chip>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div>
            <span className="label">{t('pantry.lowAt')}</span>
            <div className="chips">
              {LOW_MARKS.map((n) => (
                <Chip key={n} on={p.low_at === n} onClick={() => save({ low_at: n })}>
                  {t('pantry.percent', { n })}
                </Chip>
              ))}
            </div>
          </div>

          {sortedLists.length > 1 && (
            <div>
              <span className="label">{t('pantry.goesOn')}</span>
              <div className="chips">
                {sortedLists.map((l, i) => (
                  <Chip key={l.id} on={p.list_id ? p.list_id === l.id : i === 0} onClick={() => save({ list_id: l.id })}>
                    {l.name}
                  </Chip>
                ))}
              </div>
            </div>
          )}

          <div className="row sheet-actions" style={{ gap: 12 }}>
            <button
              type="button"
              className="stk sec"
              style={{ flex: 1, color: '#A8335A' }}
              onClick={() => {
                // The whole group comes off the shelf; Undo puts every one of them back.
                const gone = [...rows]
                for (const r of gone) db.remove('pantry_items', r.id)
                showUndo(t('pantry.removed', { name: group.name }), t('common.undo'), () => gone.forEach((r) => db.insert('pantry_items', { ...r })))
                onClose()
              }}
            >
              {t('common.delete')}
            </button>
            <button type="button" className="stk prim" style={{ flex: 1.4 }} onClick={() => { commitName(); onClose() }}>
              {t('common.done')}
            </button>
          </div>
        </div>
      )}
    </Sheet>
  )
}

/**
 * What it looks like (Nora, 29 Oct): one row of recommended drawings (a guess from the name, then this room's usual ones),
 * and "All" at the end, which opens a big drawer with the recommended ones on top, a thin line, and every drawing under
 * it. More drawings can keep coming without the pop-up growing.
 */
function ContainerPicker({ kind, name, value, level, lowAt, onPick }: { kind: RoomKind; name: string; value: Container; level: number; lowAt: number; onPick: (c: Container) => void }) {
  const { t } = useTranslation()
  const [all, setAll] = useState(false)
  const guess = guessContainer(name)
  const recommended = [...new Set([value, ...(guess ? [guess] : []), ...containersFor(kind)])].slice(0, 8)
  const tile = (c: Container, onClick = () => onPick(c)) => (
    <button key={c} type="button" aria-pressed={c === value} onClick={onClick}>
      <ContainerDrawing kind={c} level={level} lowAt={lowAt} height={44} />
      {t(`pantry.containers.${c}`)}
    </button>
  )
  return (
    <>
      <div className="thing-pick-row">
        {/* One row only: whatever doesn't fit the width stays tucked away. */}
        <div className="thing-pick one-row">{recommended.map((c) => tile(c))}</div>
        <button type="button" className="thing-pick-all" onClick={() => setAll(true)}>
          <span aria-hidden>···</span>
          {t('pantry.allContainers')}
        </button>
      </div>
      <Sheet open={all} onClose={() => setAll(false)} title={t('pantry.looksLike')}>
        <span className="label">{t('pantry.recommended')}</span>
        <div className="thing-pick">
          {recommended.slice(0, 5).map((c) =>
            tile(c, () => {
              onPick(c)
              setAll(false)
            }),
          )}
        </div>
        <div className="pick-divider" aria-hidden />
        <span className="label">{t('pantry.allContainers')}</span>
        <div className="thing-pick">
          {CONTAINERS.map((c) =>
            tile(c, () => {
              onPick(c)
              setAll(false)
            }),
          )}
        </div>
      </Sheet>
    </>
  )
}

/** Putting something new on the shelf: what it is, what it looks like (guessed from the name), how full. */
function AddThingSheet({
  open,
  kind,
  spots,
  spot,
  groupsIn,
  onClose,
  onAdd,
}: {
  open: boolean
  kind: RoomKind
  spots: Spot[]
  spot: string | null
  groupsIn: (spotId: string) => Group[]
  onClose: () => void
  onAdd: (spotId: string, name: string, container: Container, level: number) => void
}) {
  const { t } = useTranslation()
  // What you've filled in so far is kept while you're away; it starts fresh each time you open it yourself.
  const [name, setName] = useKept('pantry-add:name', '')
  const [picked, setPicked] = useKept<Container | null>('pantry-add:picked', null)
  const [level, setLevel] = useKept('pantry-add:level', 100)
  const [goesIn, setGoesIn] = useKept<string | null>('pantry-add:goesIn', spot)
  const wasOpen = useRef(open)
  useEffect(() => {
    if (open && !wasOpen.current) {
      setName('')
      setPicked(null)
      setLevel(100)
      setGoesIn(spot)
    }
    if (!open && wasOpen.current) forget('pantry-add:')
    wasOpen.current = open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, spot])

  const target = goesIn ?? spots[0]?.id ?? null
  // Until someone picks one, the drawing follows the name: "oil" is a bottle, "rice" a bag.
  const guess = guessContainer(name, containersFor(kind))
  const container = picked ?? guess ?? (kind === 'bathroom' ? 'pump' : 'jar')
  // Typed something that's already in this spot? It joins that group.
  const same = name.trim() && target ? groupsIn(target).find((g) => g.key === groupKey({ place: 'pantry', name, spot_id: target })) : undefined

  function add(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || !target) return
    onAdd(target, name.trim(), container, level)
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title={t('pantry.add')}>
      <form onSubmit={add} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <label className="label" htmlFor="new-thing">
            {t('pantry.name')}
          </label>
          <input id="new-thing" className="input" ref={autoFocusField} placeholder={t(kind === 'bathroom' ? 'pantry.namePlaceholderBathroom' : 'pantry.namePlaceholder')} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        {spots.length > 1 && (
          <div>
            <span className="label">{t('pantry.spots.goesIn')}</span>
            <div className="chips">
              {spots.map((x) => (
                <Chip key={x.id} on={x.id === target} onClick={() => setGoesIn(x.id)}>
                  {x.name}
                </Chip>
              ))}
            </div>
          </div>
        )}
        {same ? (
          <p className="body" role="status" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 14 }}>
            <GroupDrawing g={same} height={48} />
            <span>{t('pantry.joinsGroup', { name: same.name, count: same.rows.length })}</span>
          </p>
        ) : (
          <div>
            <span className="label">{t('pantry.looksLike')}</span>
            <ContainerPicker kind={kind} name={name} value={container} level={level} lowAt={20} onPick={setPicked} />
          </div>
        )}
        <div>
          <span className="label">{t('pantry.howFull')}</span>
          <LevelPicker value={level} onPick={setLevel} live />
        </div>
        <div className="sheet-actions">
          <button type="submit" className="stk prim" style={{ width: '100%', transform: 'rotate(-1deg)' }} disabled={!name.trim()}>
            {t('pantry.addButton')}
          </button>
        </div>
      </form>
    </Sheet>
  )
}
