import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useMe } from '../auth'
import { db } from '../data/store'
import { useHousehold, useItemsIn, useLists, useProjects, useTodos, type Item, type List, type Project, type Todo } from '../data/hooks'
import { toggleItem, toggleTodo } from '../data/actions'
import { Floating, Screen } from '../components/Shell'
import { Avatar, NobodyAvatar } from '../components/Avatar'
import { Check, EmptyState, Hand, Menu, Sheet, showUndo, Stamp, STAMP_COLORS, Struck, Tick, Tape, tilt } from '../components/Scrapbook'
import { BackIcon, DotsIcon, GripIcon, PlusIcon, TrashIcon } from '../components/Icons'
import { CommentCount, Comments, useCommentCounts } from '../components/Comments'
import { TypingBar } from '../components/TypingBar'
import { autoFocusField } from '../lib/keyboard'
import { useKept } from '../lib/kept'
import { useBackInApp } from '../lib/back'
import { ago } from '../lib/time'
import { PersonLink } from './Person'
import { TodoSheet } from './Todos'

// Projects (Nora, 29 Oct): bigger house goals, like "Kitchen renewal", made of steps to do and things to buy.
// Steps to do are to-dos with the project (they show in the To-dos tab too, with the project's name); things to buy
// are on the project's own shopping list, a washi tab in Shopping. Both keep the order you drag them into.

const byOrder = <T extends { position?: number; created_at: string }>(a: T, b: T) => (a.position ?? 0) - (b.position ?? 0) || a.created_at.localeCompare(b.created_at)
const NOTE_COLORS = ['n-peach', 'n-mist', 'n-sage', 'n-lilac', 'n-butter', 'n-mint']

/** Everything the projects screens need: the projects, their steps, their lists and what's on them. */
function useProjectData() {
  const { household } = useHousehold()
  const hid = household?.id ?? null
  const projects = useProjects(hid)
  const todos = useTodos(hid)
  const lists = useLists(hid)
  const projectLists = lists.rows.filter((l) => l.project_id)
  const items = useItemsIn(projectLists.map((l) => l.id))
  return useMemo(() => {
    const listOf = (p: Project) => projectLists.find((l) => l.project_id === p.id) ?? null
    const stepsOf = (p: Project) => todos.rows.filter((x) => x.project_id === p.id).sort(byOrder)
    const buysOf = (p: Project) => {
      const l = listOf(p)
      return l ? items.rows.filter((x) => x.list_id === l.id).sort(byOrder) : []
    }
    const progress = (p: Project) => {
      const all = [...stepsOf(p).map((x) => Boolean(x.done_at)), ...buysOf(p).map((x) => Boolean(x.checked_at))]
      return { done: all.filter(Boolean).length, count: all.length }
    }
    return { hid, projects, lists, listOf, stepsOf, buysOf, progress }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hid, projects.rows, todos.rows, lists.rows, items.rows])
}

/** A thin pencil line showing how far along a project is. */
export function ProgressLine({ done, count }: { done: number; count: number }) {
  return (
    <span className="progress-line" aria-hidden>
      <span style={{ width: count ? `${(done / count) * 100}%` : 0 }} />
    </span>
  )
}

/** Start a project: the project and its own shopping list, named after it. */
function startProject(hid: string, name: string, projects: Project[], lists: List[], me: string) {
  const now = new Date().toISOString()
  const p = db.insert('projects', { household_id: hid, name, position: projects.length ? Math.max(...projects.map((x) => x.position)) + 1 : 0, created_by: me, created_at: now, done_at: null })
  db.insert('lists', { household_id: hid, name, position: lists.length ? Math.max(...lists.map((x) => x.position)) + 1 : 1, created_by: me, created_at: now, project_id: p.id })
  return p.id as string
}

export function ProjectsScreen() {
  const { t, i18n } = useTranslation()
  const me = useMe()
  const navigate = useNavigate()
  const { hid, projects, lists, progress } = useProjectData()
  const [naming, setNaming] = useKept<string | null>(`projects:${hid}:new`, null)
  // "A project" in Add something lands here with ?new=1 and opens the name pop-up.
  const [params, setParams] = useSearchParams()
  useEffect(() => {
    if (params.get('new') !== '1') return
    setNaming('')
    setParams({}, { replace: true })
  }, [params, setParams, setNaming])
  const active = projects.rows.filter((p) => !p.done_at).sort(byOrder)
  const finished = projects.rows.filter((p) => p.done_at).sort((a, b) => (b.done_at ?? '').localeCompare(a.done_at ?? ''))

  function create(e: FormEvent) {
    e.preventDefault()
    if (!hid || !naming?.trim()) return
    const id = startProject(hid, naming.trim(), projects.rows, lists.rows, me)
    setNaming(null)
    navigate(`/projects/${id}`)
  }

  return (
    // A tab in the menu now (Nora, 29 Oct), so no back arrow.
    <Screen tabbar className="has-fab" doodle={active.length ? 'walk' : undefined}>
      <div style={{ padding: 'calc(var(--top) + 8px) 22px 0 40px' }}>
        <div className="row" style={{ gap: 6 }}>
          <Hand as="h1" style={{ margin: 0 }}>
            {t('projects.title')}
          </Hand>
          {/* Desktop has no round + button, so the header gets one. */}
          <button type="button" className="stk prim desktop-only" onClick={() => setNaming('')} style={{ marginLeft: 'auto', transform: 'rotate(-1deg)' }}>
            <PlusIcon />
            {t('projects.new')}
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 22, marginTop: 24 }}>
          {active.map((p, i) => {
            const { done, count } = progress(p)
            return (
              <button
                key={p.id}
                type="button"
                className={`note ${NOTE_COLORS[i % NOTE_COLORS.length]}`}
                onClick={() => navigate(`/projects/${p.id}`)}
                style={{ display: 'block', width: '100%', textAlign: 'left', transform: `rotate(${i % 2 ? 0.7 : -0.8}deg)` }}
              >
                <Tape kind={i % 2 ? 'tm' : 'ty'} style={{ top: -10, left: i % 2 ? '55%' : 30, transform: `rotate(${i % 2 ? 4 : -3}deg)` }} />
                <Hand size={28} lineHeight={30}>
                  {p.name}
                </Hand>
                <div className="cap" style={{ marginTop: 6 }}>{t('projects.progress', { done, count })}</div>
                <ProgressLine done={done} count={count} />
              </button>
            )
          })}
          {projects.loaded && !active.length && (
            <EmptyState pose="walk" color="#F6CFA0" zoom={1} rotate={3}>
              {t('projects.empty')}
            </EmptyState>
          )}
        </div>

        {finished.length > 0 && (
          <section style={{ marginTop: 30, paddingBottom: 12 }}>
            <Stamp color={STAMP_COLORS.locked} rotate={-2}>
              {t('projects.finished')}
            </Stamp>
            {finished.map((p) => (
              <button key={p.id} type="button" className="ln" onClick={() => navigate(`/projects/${p.id}`)} style={{ width: '100%', textAlign: 'left', padding: '12px 0' }}>
                <span style={{ flex: 1 }}>
                  <Struck on>{p.name}</Struck>
                  <div className="cap">{t('projects.finishedOn', { when: ago(p.done_at as string, i18n.language) })}</div>
                </span>
              </button>
            ))}
          </section>
        )}
      </div>

      <Floating>
        <button type="button" className="stk prim round fab" aria-label={t('projects.new')} onClick={() => setNaming('')} style={{ transform: 'rotate(-4deg)' }}>
          <PlusIcon />
        </button>
      </Floating>

      <Sheet small open={naming !== null} onClose={() => setNaming(null)} title={t('projects.new')}>
        <form onSubmit={create} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <input className="input" ref={autoFocusField} placeholder={t('projects.namePlaceholder')} aria-label={t('projects.name')} value={naming ?? ''} onChange={(e) => setNaming(e.target.value)} />
          <button type="submit" className="stk prim" disabled={!naming?.trim()} style={{ transform: 'rotate(-.6deg)' }}>
            {t('projects.create')}
          </button>
        </form>
      </Sheet>
    </Screen>
  )
}

/** A thing to buy in a project, like Edit item in Shopping: the name saves as you type, the trash can sits in the
 *  title row, and comments underneath (where "from IKEA" and a link go). */
function BuySheet({ item, onClose }: { item: Item; onClose: () => void }) {
  const { t } = useTranslation()
  const [name, setName] = useState(item.name)
  function save() {
    if (name.trim() && name.trim() !== item.name) db.update('list_items', item.id, { name: name.trim() })
  }
  useEffect(() => {
    const timer = window.setTimeout(save, 500)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name])
  function close() {
    save()
    onClose()
  }
  function remove() {
    const { id, ...rest } = item
    db.remove('list_items', id)
    onClose()
    showUndo(t('shopping.itemDeleted'), t('common.undo'), () => db.insert('list_items', { ...rest, id }))
  }
  return (
    <Sheet
      open
      onClose={close}
      title={t('shopping.editItem')}
      action={
        <button type="button" className="sheet-trash" aria-label={t('common.delete')} title={t('common.delete')} onClick={remove}>
          <TrashIcon />
        </button>
      }
    >
      <label className="label" htmlFor="buy-name">
        {t('shopping.itemName')}
      </label>
      <input id="buy-name" className="input" value={name} enterKeyHint="done" onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()} />
      <div style={{ marginTop: 18 }}>
        <Comments target={{ item_id: item.id }} />
      </div>
    </Sheet>
  )
}

/** A finished row: no dragging, but lined up with the rows above (an empty space where the six dots would be). */
function FinishedRow({ children }: { children: ReactNode }) {
  return (
    <div className="project-row">
      <span className="grip" aria-hidden style={{ visibility: 'hidden', cursor: 'default' }} />
      {children}
    </div>
  )
}

/** A row you can drag into place by its six dots. */
function SortableRow({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  const { t } = useTranslation()
  const { setNodeRef, setActivatorNodeRef, listeners, attributes, transform, transition, isDragging } = useSortable({ id })
  return (
    <div
      ref={setNodeRef}
      className={`project-row${isDragging ? ' lifted' : ''}`}
      style={{ transform: CSS.Translate.toString(transform), transition }}
    >
      <button type="button" ref={setActivatorNodeRef} className="grip" aria-label={t('projects.drag', { name: label })} {...attributes} {...listeners}>
        <GripIcon />
      </button>
      {children}
    </div>
  )
}

/** A list you can reorder by dragging; saves each row's new place. */
function Sortable<T extends { id: string }>({ rows, table, children }: { rows: T[]; table: 'todos' | 'list_items'; children: (row: T) => ReactNode }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))
  function end(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return
    const ids = rows.map((r) => r.id)
    const next = arrayMove(ids, ids.indexOf(e.active.id as string), ids.indexOf(e.over.id as string))
    next.forEach((id, position) => {
      const row = rows.find((r) => r.id === id) as T & { position?: number }
      if (row.position !== position) db.update(table, id, { position })
    })
  }
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={end}>
      <SortableContext items={rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
        {rows.map((r) => children(r))}
      </SortableContext>
    </DndContext>
  )
}

export function ProjectScreen() {
  const { t } = useTranslation()
  const me = useMe()
  const { id } = useParams()
  const navigate = useNavigate()
  const goBack = useBackInApp('/projects')
  const { people } = useHousehold()
  const { hid, projects, listOf, stepsOf, buysOf, progress } = useProjectData()
  const commentsOn = useCommentCounts()
  const project = projects.rows.find((p) => p.id === id)
  const [step, setStep] = useKept(`project:${id}:step`, '')
  const [buy, setBuy] = useKept(`project:${id}:buy`, '')
  const [editing, setEditing] = useState<Todo | null>(null)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  if (!project || !hid) {
    return <Screen>{null}</Screen>
  }
  const steps = stepsOf(project)
  const buys = buysOf(project)
  const list = listOf(project)
  const { done, count } = progress(project)
  const person = (pid: string | null) => people.find((p) => p.id === pid)
  const [buying, setBuying] = useState<Item | null>(null)
  // Like Shopping and To-dos (Nora, 29 Oct): ticked steps move under a Done stamp, bought things under Bought.
  const openSteps = steps.filter((x) => !x.done_at)
  const doneSteps = steps.filter((x) => x.done_at)
  const openBuys = buys.filter((x) => !x.checked_at)
  const boughtBuys = buys.filter((x) => x.checked_at)
  const stepRow = (x: Todo) => {
    const who = person(x.assignee_id)
    return (
      <Tick checked={Boolean(x.done_at)} onCommit={() => toggleTodo(x, me)}>
        {(on, toggle) => (
          <div className={`ln${on ? ' row-done' : ''}`} style={{ flex: 1, minWidth: 0, minHeight: 56 }}>
            <Check checked={on} onToggle={toggle} label={x.title} rotate={tilt(x.id)} />
            <button type="button" onClick={() => setEditing(x)} style={{ flex: 1, minWidth: 0, fontSize: 17, padding: '8px 0', textAlign: 'left' }}>
              <Struck on={on}>{x.title}</Struck>
              <CommentCount n={commentsOn(x.id)} />
            </button>
            <span className={`av-fade${on ? ' done' : ''}`}>
              {who ? <PersonLink id={who.id}><Avatar avatar={who.avatar} label={who.display_name} /></PersonLink> : <NobodyAvatar />}
            </span>
          </div>
        )}
      </Tick>
    )
  }
  const buyRow = (x: Item) => (
    <Tick checked={Boolean(x.checked_at)} onCommit={() => toggleItem(x, me)}>
      {(on, toggle) => (
        <div className={`ln${on ? ' row-done' : ''}`} style={{ flex: 1, minWidth: 0, minHeight: 52 }}>
          <Check checked={on} onToggle={toggle} label={x.name} rotate={tilt(x.id)} />
          {/* Tap the name for its pop-up: rename it, delete it, or add a comment like "from IKEA" with a link. */}
          <button type="button" onClick={() => setBuying(x)} style={{ flex: 1, minWidth: 0, fontSize: 17, padding: '8px 0', textAlign: 'left' }}>
            <Struck on={on}>{x.name}</Struck>
            <CommentCount n={commentsOn(x.id)} />
          </button>
        </div>
      )}
    </Tick>
  )

  function addStep(title: string) {
    if (!project) return
    db.insert('todos', {
      household_id: hid,
      project_id: project.id,
      title,
      assignee_id: null,
      due_date: null,
      repeat: null,
      position: steps.length ? Math.max(...steps.map((x) => x.position ?? 0)) + 1 : 0,
      created_by: me,
      created_at: new Date().toISOString(),
      done_at: null,
      done_by: null,
    })
    setStep('')
  }

  function addBuy(name: string) {
    if (!list) return
    db.insert('list_items', {
      list_id: list.id,
      name,
      note: null,
      added_by: me,
      created_at: new Date().toISOString(),
      checked_at: null,
      checked_by: null,
      position: buys.length ? Math.max(...buys.map((x) => x.position ?? 0)) + 1 : 0,
    })
    setBuy('')
  }

  function rename(e: FormEvent) {
    e.preventDefault()
    if (!project || !renaming?.trim()) return
    db.update('projects', project.id, { name: renaming.trim() })
    if (list) db.update('lists', list.id, { name: renaming.trim() })
    setRenaming(null)
  }

  function remove() {
    if (!project) return
    // The database takes the steps and the list with it; take them off this phone too, right away.
    for (const s of steps) db.remove('todos', s.id)
    for (const b of buys) db.remove('list_items', b.id)
    if (list) db.remove('lists', list.id)
    db.remove('projects', project.id)
    setDeleting(false)
    navigate('/projects', { replace: true })
  }

  const finished = Boolean(project.done_at)
  return (
    <Screen>
      <div style={{ padding: 'calc(var(--top) + 8px) 22px 24px 40px' }}>
        <div className="row" style={{ gap: 6, marginLeft: -10 }}>
          <button type="button" aria-label={t('common.back')} onClick={goBack} style={{ display: 'flex', color: '#1E1A30' }}>
            <BackIcon />
          </button>
          <Hand as="h1" size={38} lineHeight={42} style={{ margin: 0, flex: 1, minWidth: 0 }}>
            {project.name}
          </Hand>
          {/* Start another project from inside one (Nora, 29 Oct): opens the name pop-up on the Projects page. */}
          <button type="button" className="stk prim desktop-only" onClick={() => navigate('/projects?new=1')} style={{ marginLeft: 'auto', transform: 'rotate(-1deg)' }}>
            <PlusIcon />
            {t('projects.new')}
          </button>
          <Menu
            label={t('common.more')}
            items={[
              { label: t('projects.new'), onClick: () => navigate('/projects?new=1') },
              { label: t('projects.rename'), onClick: () => setRenaming(project.name) },
              { label: finished ? t('projects.reopen') : t('projects.finish'), onClick: () => db.update('projects', project.id, { done_at: finished ? null : new Date().toISOString() }) },
              { label: t('projects.delete'), onClick: () => setDeleting(true), danger: true, zone: true },
            ]}
          >
            <DotsIcon />
          </Menu>
        </div>
        <div style={{ marginTop: 6 }}>
          <span className="cap">{t('projects.progress', { done, count })}</span>
          <ProgressLine done={done} count={count} />
        </div>

        {/* Steps to do, in their order. */}
        <section style={{ marginTop: 24 }}>
          <Stamp color={STAMP_COLORS.nora} rotate={-3}>
            {t('projects.toDo')}
          </Stamp>
          <div style={{ marginTop: 8 }}>
            <Sortable rows={openSteps} table="todos">
              {(x) => (
                <SortableRow key={x.id} id={x.id} label={x.title}>
                  {stepRow(x)}
                </SortableRow>
              )}
            </Sortable>
            {!steps.length && <div className="cap" style={{ fontSize: 14, padding: '4px 0 10px' }}>{t('projects.emptyTodo')}</div>}
          </div>
          <div className="typing-slot" style={{ marginTop: 8 }}>
            <TypingBar value={step} onChange={setStep} onSend={addStep} placeholder={t('projects.addTodo')} />
          </div>
          {doneSteps.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <Stamp color={STAMP_COLORS.locked} rotate={-2}>
                {t('todos.done')}
              </Stamp>
              <div style={{ marginTop: 6 }}>
                {doneSteps.map((x) => (
                  <FinishedRow key={x.id}>{stepRow(x)}</FinishedRow>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Things to buy: the project's own list, also a tab in Shopping. */}
        <section style={{ marginTop: 30 }}>
          <Stamp color={STAMP_COLORS.open} rotate={2}>
            {t('projects.toBuy')}
          </Stamp>
          {list && !finished && <div className="cap" style={{ marginTop: 6 }}>{t('projects.onList', { name: list.name })}</div>}
          <div style={{ marginTop: 8 }}>
            <Sortable rows={openBuys} table="list_items">
              {(x: Item) => (
                <SortableRow key={x.id} id={x.id} label={x.name}>
                  {buyRow(x)}
                </SortableRow>
              )}
            </Sortable>
            {!buys.length && <div className="cap" style={{ fontSize: 14, padding: '4px 0 10px' }}>{t('projects.emptyBuy')}</div>}
          </div>
          <div className="typing-slot" style={{ marginTop: 8 }}>
            <TypingBar value={buy} onChange={setBuy} onSend={addBuy} placeholder={t('projects.addBuy')} />
          </div>
          {boughtBuys.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <Stamp color={STAMP_COLORS.locked} rotate={2}>
                {t('shopping.bought')}
              </Stamp>
              <div style={{ marginTop: 6 }}>
                {boughtBuys.map((x) => (
                  <FinishedRow key={x.id}>{buyRow(x)}</FinishedRow>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {editing && <TodoSheet key={editing.id} todo={editing} householdId={hid} people={people} onClose={() => setEditing(null)} />}
      {buying && <BuySheet key={buying.id} item={buying} onClose={() => setBuying(null)} />}

      <Sheet small open={renaming !== null} onClose={() => setRenaming(null)} title={t('projects.rename')}>
        <form onSubmit={rename} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <input className="input" aria-label={t('projects.name')} value={renaming ?? ''} onChange={(e) => setRenaming(e.target.value)} />
          <button type="submit" className="stk prim" disabled={!renaming?.trim()}>
            {t('common.save')}
          </button>
        </form>
      </Sheet>

      <Sheet small open={deleting} onClose={() => setDeleting(false)} title={t('projects.deleteTitle', { name: project.name })}>
        <p className="body" style={{ margin: '0 0 18px' }}>
          {t('projects.deleteText')}
          <br />
          {t('pantry.clean.undo')}
        </p>
        <div className="row" style={{ gap: 12 }}>
          <button type="button" className="stk sec" style={{ flex: 1, transform: 'rotate(-1deg)' }} onClick={() => setDeleting(false)}>
            {t('common.cancel')}
          </button>
          <button type="button" className="stk prim danger" style={{ flex: 1.4, transform: 'rotate(1deg)' }} onClick={remove}>
            {t('projects.delete')}
          </button>
        </div>
      </Sheet>
    </Screen>
  )
}
