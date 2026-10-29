import { useEffect, useMemo, useRef, useState, type FormEvent, type PointerEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMe } from '../auth'
import { db } from '../data/store'
import { useHousehold, useItemsIn, useLists, usePantry, type Container, type PantryItem, type Place } from '../data/hooks'
import { setPantryLevel } from '../data/actions'
import { Floating, Screen } from '../components/Shell'
import { EmptyState, Hand, Sheet, showUndo } from '../components/Scrapbook'
import { BackIcon, BroomIcon, PlusIcon } from '../components/Icons'
import { CONTAINERS_FOR, ContainerDrawing, guessContainer, insideSpan } from '../components/Containers'
import { GroupDrawing, ShelfRows, groupKey, groupThings, useShelfWidth, type Group } from '../components/Shelves'
import { useDesktop } from '../lib/desktop'
import { Chip } from './Todos'
import { useBack } from '../lib/back'
import { autoFocusField } from '../lib/keyboard'

const PLACES: Place[] = ['pantry', 'bathroom']
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

/** The pantry and the bathroom cabinet: drawn shelves, each thing showing how full it is. */
export function PantryScreen() {
  const { t } = useTranslation()
  const me = useMe()
  const back = useBack()
  const desktop = useDesktop()
  const [params, setParams] = useSearchParams()
  const place: Place = params.get('place') === 'bathroom' ? 'bathroom' : 'pantry'
  const { household } = useHousehold()
  const hid = household?.id ?? null
  const pantry = usePantry(hid)
  const setLevel = usePantryLevel()
  const { ref, width } = useShelfWidth()
  const [open, setOpen] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [cleaning, setCleaning] = useState(false)

  const things = useMemo(
    () => pantry.rows.filter((p) => p.place === place).sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at)),
    [pantry.rows, place],
  )
  const groups = useMemo(() => groupThings(things), [things])
  const height = desktop ? 96 : 80

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
            {t(`pantry.${place}`)}
          </Hand>
          <span style={{ flex: 1 }} />
          {/* The deep clean: empties this place in one go, after asking. */}
          {things.length > 0 && (
            <button type="button" className="stk sec sm" aria-label={t(`pantry.clean.${place}.title`)} title={t(`pantry.clean.${place}.title`)} style={{ width: desktop ? 42 : 38, padding: 0, transform: `rotate(${desktop ? 3 : 2}deg)` }} onClick={() => setCleaning(true)}>
              <BroomIcon />
            </button>
          )}
        </div>
        {/* The two places as washi-tape tabs, like the shopping lists. */}
        <div style={{ display: 'flex', gap: 10 }}>
          {PLACES.map((p, i) => (
            <button
              key={p}
              type="button"
              className={i ? 'tb' : 'ty'}
              aria-pressed={p === place}
              onClick={() => setParams(p === 'pantry' ? {} : { place: p }, { replace: true })}
              style={{
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                height: 30,
                padding: '0 14px',
                fontSize: 14,
                color: p === place ? '#1E1A30' : '#63586B',
                fontWeight: p === place ? 800 : 700,
                transform: `rotate(${i % 2 ? 1.5 : -2}deg)`,
                boxShadow: p === place ? '1px 2px 0 rgba(30,26,48,.12)' : undefined,
                opacity: p === place ? 1 : 0.75,
              }}
            >
              {t(`pantry.${p}`)}
            </button>
          ))}
        </div>
      </div>

      <div ref={ref} style={{ padding: desktop ? '34px 22px 32px 40px' : '30px 26px 0 44px', maxWidth: desktop ? 900 : undefined }}>
        <ShelfRows groups={groups} width={width} height={height} onOpen={(g) => setOpen(g.key)} />
        {pantry.loaded && !things.length && (
          <EmptyState pose="walk" color="#E9E1D6" zoom={0.95}>
            {t(place === 'pantry' ? 'pantry.empty' : 'pantry.emptyBathroom')}
          </EmptyState>
        )}
        {desktop && (
          <button type="button" className="stk prim" style={{ transform: 'rotate(-1.5deg)', marginTop: 10 }} onClick={() => setAdding(true)}>
            {t('pantry.add')}
          </button>
        )}
      </div>

      {!desktop && (
        <Floating>
          <button
            type="button"
            className="stk prim round fab"
            aria-label={t('pantry.add')}
            onClick={() => setAdding(true)}
            style={{ position: 'fixed', right: 'max(20px, calc(50vw - 195px))', bottom: 'calc(var(--tabbar) + 20px)', zIndex: 6, transform: 'rotate(-4deg)' }}
          >
            <PlusIcon />
          </button>
        </Floating>
      )}

      <GroupSheet groupId={open} onClose={() => setOpen(null)} />
      <Sheet small open={cleaning} onClose={() => setCleaning(false)} title={t(`pantry.clean.${place}.title`)}>
        <p className="body" style={{ margin: '0 0 18px' }}>
          {t(`pantry.clean.${place}.text`)}
          <br />
          {t('pantry.clean.undo')}
        </p>
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
      <AddThingSheet
        open={adding}
        place={place}
        groups={groups}
        onClose={() => setAdding(false)}
        onAdd={(name, container, level) => {
          if (!hid) return
          // Already on the shelf (any capitals)? It joins that group, looking the same.
          const same = groups.find((g) => g.key === groupKey({ place, name }))
          const like = same?.rows[0]
          const row = db.insert('pantry_items', {
            household_id: hid,
            place,
            name: like ? like.name : name,
            container: like ? like.container : container,
            level,
            low_at: like ? like.low_at : 20,
            list_id: like ? like.list_id : null,
            position: like ? like.position : things.length ? Math.max(...things.map((x) => x.position)) + 1 : 0,
            created_by: me,
            created_at: new Date().toISOString(),
            updated_by: me,
            updated_at: new Date().toISOString(),
          }) as PantryItem
          // Put on the shelf already almost out, with nothing else like it? Pichi adds it to the list straight away.
          if (!same && level <= row.low_at) setLevel({ ...row, level: 100 }, level)
        }}
      />
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
  const setLevelOf = usePantryLevel()
  const group: Group | null = useMemo(() => (groupId ? groupThings(pantry.rows).find((g) => g.key === groupId) ?? null : null), [groupId, pantry.rows])
  // Which one you're changing: the one you tapped, or else the open one (the least full).
  const [picked, setPicked] = useState<string | null>(null)
  const rows = group?.rows ?? []
  const p = rows.find((r) => r.id === picked) ?? [...rows].sort((a, b) => a.level - b.level)[0] ?? null
  const setLevel = (thing: PantryItem, n: number) => setLevelOf(thing, n, rows)
  // Keep showing the group name while the sheet closes, even after it changes.
  const lastName = useRef('')
  if (group) lastName.current = group.name
  const [name, setName] = useState('')
  // While dragging, the drawing follows the finger; letting go saves.
  const [dragLevel, setDragLevel] = useState<number | null>(null)
  const dragRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (group) setName(group.name)
    setPicked(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId])

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

  return (
    <Sheet open={Boolean(p)} onClose={() => { commitName(); onClose() }} title={lastName.current}>
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
            <ContainerPicker place={p.place} value={p.container} level={p.level} lowAt={p.low_at} onPick={(container) => save({ container })} />
          </div>

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

function ContainerPicker({ place, value, level, lowAt, onPick }: { place: Place; value: Container; level: number; lowAt: number; onPick: (c: Container) => void }) {
  // Only what makes sense in this place, plus whatever this thing already is.
  const choices = CONTAINERS_FOR[place].includes(value) ? CONTAINERS_FOR[place] : [value, ...CONTAINERS_FOR[place]]
  const { t } = useTranslation()
  return (
    <div className="thing-pick">
      {choices.map((c) => (
        <button key={c} type="button" aria-pressed={c === value} onClick={() => onPick(c)}>
          <ContainerDrawing kind={c} level={level} lowAt={lowAt} height={44} />
          {t(`pantry.containers.${c}`)}
        </button>
      ))}
    </div>
  )
}

/** Putting something new on the shelf: what it is, what it looks like (guessed from the name), how full. */
function AddThingSheet({ open, place, groups, onClose, onAdd }: { open: boolean; place: Place; groups: Group[]; onClose: () => void; onAdd: (name: string, container: Container, level: number) => void }) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [picked, setPicked] = useState<Container | null>(null)
  const [level, setLevel] = useState(100)

  useEffect(() => {
    if (!open) return
    setName('')
    setPicked(null)
    setLevel(100)
  }, [open])

  // Until someone picks one, the drawing follows the name: "oil" is a bottle, "rice" a bag.
  const guess = guessContainer(name, CONTAINERS_FOR[place])
  const container = picked ?? guess ?? (place === 'bathroom' ? 'pump' : 'jar')
  // Typed something that's already on the shelf? It joins that group.
  const same = name.trim() ? groups.find((g) => g.key === groupKey({ place, name })) : undefined

  function add(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    onAdd(name.trim(), container, level)
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title={t('pantry.add')}>
      <form onSubmit={add} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <label className="label" htmlFor="new-thing">
            {t('pantry.name')}
          </label>
          <input id="new-thing" className="input" ref={autoFocusField} placeholder={t(place === 'pantry' ? 'pantry.namePlaceholder' : 'pantry.namePlaceholderBathroom')} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        {same ? (
          <p className="body" role="status" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 14 }}>
            <GroupDrawing g={same} height={48} />
            <span>{t('pantry.joinsGroup', { name: same.name, count: same.rows.length })}</span>
          </p>
        ) : (
          <div>
            <span className="label">{t('pantry.looksLike')}</span>
            <ContainerPicker place={place} value={container} level={level} lowAt={20} onPick={setPicked} />
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
