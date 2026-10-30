import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMe } from '../auth'
import { db } from '../data/store'
import { useHousehold, useProjects, useTodos, type Profile, type Todo } from '../data/hooks'
import { byTodoOrder, isNewTodo, recentlyDone, toggleTodo } from '../data/actions'
import { ArchiveLink } from '../components/Archive'
import { Floating, Screen } from '../components/Shell'
import { Avatar, NobodyAvatar } from '../components/Avatar'
import { Check, DeleteLink, Hand, NewTag, Struck, Tick, useArrivals, EmptyState, Sheet, Stamp, STAMP_COLORS, showUndo, tilt } from '../components/Scrapbook'
import { ChevronDown, PlusIcon, TrashIcon } from '../components/Icons'
import { SwipeRow } from '../components/SwipeRow'
import { MyHouseholds } from './MyHouseholds'
import { SimilarTodo } from './SimilarTodo'
import { findSimilar, type Similar } from '../lib/similar'
import { useDesktop } from '../lib/desktop'
import { forget, useKept } from '../lib/kept'
import { PersonLink } from './Person'
import { CommentCount, Comments, useCommentCounts } from '../components/Comments'
import { addDays, capitalize, daysFromToday, dueLabel, fromDateString, toDateString, weekdayName } from '../lib/time'

// On phones the keyboard would cover half the form the moment it opens, so the title field waits for a tap.
const touchScreen = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

type Group = 'today' | 'thisWeek' | 'later' | 'noDate' | 'done'
const ORDER: Group[] = ['today', 'thisWeek', 'later', 'noDate', 'done']
const GROUP_COLOR: Record<Group, string> = {
  today: STAMP_COLORS.nora,
  thisWeek: STAMP_COLORS.open,
  later: STAMP_COLORS.draft,
  noDate: STAMP_COLORS.claude,
  done: STAMP_COLORS.locked,
}

function groupOf(todo: Todo): Group {
  if (todo.done_at) return 'done'
  if (!todo.due_date) return 'noDate'
  const days = daysFromToday(fromDateString(todo.due_date))
  if (days <= 0) return 'today'
  if (days < 7) return 'thisWeek'
  return 'later'
}

/** Small chip stickers for picking one option. */
/** Bring a done to-do back for today instead of adding a copy (Nora, 30 Oct). It comes back as a fresh to-do with
 *  the same title and person, so the old one stays in "Done earlier" and still counts for trophies. */
export function bringTodoBack(from: Todo, repeat: Todo['repeat'], householdId: string, me: string, due: string | null, assignee: string | null = from.assignee_id, title = from.title) {
  return db.insert('todos', {
    // The spelling just typed wins: "Raširiti veš" brings back "Rasiriti ves" with the proper letters (Nora, 30 Oct).
    title: title.trim() || from.title,
    assignee_id: assignee,
    due_date: due,
    repeat,
    household_id: householdId,
    created_by: me,
    created_at: new Date().toISOString(),
    done_at: null,
    done_by: null,
  })
}

export function Chip({ on, children, onClick }: { on: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" className={`stk sm ${on ? 'prim' : 'sec'}`} aria-pressed={on} onClick={onClick} style={{ transform: `rotate(${on ? -1.5 : 1}deg)` }}>
      {children}
    </button>
  )
}

export function TodosScreen() {
  const { t, i18n } = useTranslation()
  const me = useMe()
  const [params, setParams] = useSearchParams()
  const { household, people, name } = useHousehold()
  const hid = household?.id ?? null
  const todos = useTodos(hid)
  const projects = useProjects(hid)
  const [filter, setFilter] = useState<string>('all')
  const desktop = useDesktop()
  const [quick, setQuick] = useState('')
  // Switching the filter: the list fades out quickly, then the new one fades in and its labels
  // are stamped down. The chip changes right away; the list follows.
  const [shown, setShown] = useState<string>('all')
  const [phase, setPhase] = useState<'in' | 'out' | 'idle'>('idle')
  const switchTimer = useRef<number | undefined>(undefined)
  function pickFilter(next: string) {
    if (next === filter) return
    setFilter(next)
    setPhase('out')
    window.clearTimeout(switchTimer.current)
    switchTimer.current = window.setTimeout(() => {
      setShown(next)
      setPhase('in')
      switchTimer.current = window.setTimeout(() => setPhase('idle'), 450)
    }, 170)
  }
  useEffect(() => () => window.clearTimeout(switchTimer.current), [])
  const [switching, setSwitching] = useState(false)
  // The to-do pop-up (and what you typed in it) stays open if you step away and come back.
  const [editing, setEditing] = useKept<Todo | 'new' | null>(`todos:${hid}:editing`, null)

  useEffect(() => {
    if (params.get('add')) {
      setEditing('new')
      setParams({}, { replace: true })
    }
    // "Go check" from a tag on Home opens the to-do it was on.
    const open = params.get('open')
    const found = open && todos.rows.find((x) => x.id === open)
    if (found) {
      setEditing(found)
      setParams({}, { replace: true })
    }
  }, [params, setParams, todos.rows])

  const others = people.filter((p) => p.id !== me)
  const visible = useMemo(() => {
    const rows = todos.rows.filter((x) => !x.done_at || recentlyDone(x))
    if (shown === 'all') return rows
    if (shown === 'mine') return rows.filter((x) => x.assignee_id === me)
    return rows.filter((x) => x.assignee_id === shown)
  }, [todos.rows, shown, me])

  const groups = useMemo(() => {
    return ORDER
      .map((g) => ({
        g,
        rows: visible
          .filter((x) => groupOf(x) === g)
          .sort(byTodoOrder),
      }))
      .filter((x) => x.rows.length)
  }, [visible])

  const { arrived, leaving } = useArrivals(groups.map((x) => x.g))

  const person = (id: string | null) => people.find((p) => p.id === id)
  const commentsOn = useCommentCounts()

  const [quickSimilar, setQuickSimilar] = useState<Similar | null>(null)
  function quickAdd(e: FormEvent) {
    e.preventDefault()
    if (!quick.trim() || !hid) return
    const found = findSimilar(quick, todos.rows)
    if (found) setQuickSimilar(found)
    else quickInsert()
  }
  function quickInsert() {
    if (!quick.trim() || !hid) return
    setQuickSimilar(null)
    db.insert('todos', {
      title: quick.trim(),
      assignee_id: me,
      due_date: toDateString(new Date()),
      repeat: null,
      household_id: hid,
      created_by: me,
      created_at: new Date().toISOString(),
      done_at: null,
      done_by: null,
    })
    setQuick('')
  }

  function detail(x: Todo) {
    const parts: string[] = []
    if (x.due_date) {
      const days = daysFromToday(fromDateString(x.due_date))
      parts.push(days < 0 && !x.done_at ? `${dueLabel(x.due_date, i18n.language)}, ${t('todos.late')}` : dueLabel(x.due_date, i18n.language))
    }
    if (x.repeat) parts.push(t('todos.repeats'))
    // A step of a project carries the project's name.
    const project = x.project_id ? projects.rows.find((p) => p.id === x.project_id) : undefined
    if (project) parts.unshift(project.name)
    if (!x.assignee_id) parts.push(t('todos.nobody'))
    return parts.join(' · ')
  }

  return (
    <Screen tabbar className="has-fab" doodle={groups.length ? 'walk' : undefined}>
      <div style={{ padding: 'calc(var(--top) + 10px) 22px 0 40px' }}>
        <div className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
          <Hand as="h1" style={{ margin: 0 }}>
            {t('todos.title')}
          </Hand>
          <button type="button" className="row cap phone-only" onClick={() => setSwitching(true)} style={{ fontSize: 14, fontWeight: 700, gap: 2, minWidth: 0 }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name(household)}</span>
            {/* A hair lower, so it sits in the middle of the letters by eye (Nora, 30 Oct). */}
            <span style={{ display: 'flex', transform: 'translateY(1.5px)' }}>
              <ChevronDown />
            </span>
          </button>
        </div>
        {others.length > 0 && (
          <div className="row" style={{ gap: 8, flexWrap: 'wrap', margin: '16px 0 0' }}>
            <Chip on={filter === 'all'} onClick={() => pickFilter('all')}>
              {t('todos.all')}
            </Chip>
            <Chip on={filter === 'mine'} onClick={() => pickFilter('mine')}>
              {t('todos.mine')}
            </Chip>
            {others.slice(0, 3).map((p) => (
              <Chip key={p.id} on={filter === p.id} onClick={() => pickFilter(p.id)}>
                {t('todos.persons', { name: p.display_name })}
              </Chip>
            ))}
          </div>
        )}

        {/* Desktop: the add field on top of the list, like Shopping. Enter adds it (yours, for today, like
            a new to-do on the phone) and keeps the field ready for the next one; tap it to change the rest. */}
        {desktop && (
          <form onSubmit={quickAdd} style={{ display: 'flex', gap: 14, alignItems: 'center', margin: '22px 0 0', maxWidth: 640 }}>
            <input
              className="input"
              placeholder={t('todos.whatPlaceholder')}
              aria-label={t('todos.new')}
              value={quick}
              onChange={(e) => setQuick(e.target.value)}
              style={{ flex: 1, fontSize: 17 }}
            />
            <button type="submit" className="stk prim" style={{ transform: 'rotate(-1.5deg)' }}>
              {t('todos.add')}
            </button>
          </form>
        )}

        <div key={shown} className={phase === 'out' ? 'swap-out' : phase === 'in' ? 'swap-in' : undefined}>
        {ORDER.filter((g) => leaving.includes(g) || groups.some((x) => x.g === g)).map((g) => {
          const rows = groups.find((x) => x.g === g)?.rows ?? []
          if (!rows.length) {
            // A label that just emptied fades out in place, taking no room, so the label stamped
            // in after it lands on the same spot and nothing jumps.
            return (
              <div key={g} style={{ position: 'relative', height: 0 }} aria-hidden>
                <div style={{ position: 'absolute', top: 22, left: 0 }}>
                  <Stamp color={GROUP_COLOR[g]} rotate={g === 'today' ? -3 : 2} motion="out">
                    {t(`todos.${g}`)}
                  </Stamp>
                </div>
              </div>
            )
          }
          return (
          <section key={g} style={{ marginTop: 22 }}>
            <div style={{ marginBottom: 4 }}>
              <Stamp color={GROUP_COLOR[g]} rotate={g === 'today' ? -3 : 2} motion={arrived.includes(g) || phase === 'in' ? 'in' : undefined}>
                {t(`todos.${g}`)}
              </Stamp>
            </div>
            {rows.map((x) => {
              const who = person(x.assignee_id)
              const done = Boolean(x.done_at)
              return (
                <Tick key={x.id} checked={done} onCommit={() => toggleTodo(x, me)}>
                  {(on, toggle) => (
                    // Swipe left for Delete, like WhatsApp (Nora, 30 Oct). Undo stays possible for a few seconds.
                    <SwipeRow
                      right={[
                        {
                          key: 'delete',
                          label: t('common.delete'),
                          icon: <TrashIcon />,
                          color: 'var(--error-dark)',
                          fill: 'var(--hero)',
                          onClick: () => showUndo(t('todos.deleted'), t('common.undo'), db.removeWithUndo('todos', x.id)),
                        },
                      ]}
                    >
                    <div className={`ln${on ? ' row-done' : ''}${detail(x) ? ' top' : ''}`} style={{ minHeight: 64, ['--title-top' as string]: '8px' }}>
                      <Check checked={on} onToggle={toggle} label={x.title} rotate={tilt(x.id)} />
                      <button type="button" onClick={() => setEditing(x)} style={{ flex: 1, minWidth: 0, fontSize: 17, padding: '8px 0' }}>
                        <Struck on={on}>{x.title}</Struck>
                        {isNewTodo(x) && <NewTag />}
                        <CommentCount n={commentsOn(x.id)} />
                        {detail(x) && <div className="cap">{detail(x)}</div>}
                      </button>
                      <span className={`av-fade${on ? ' done' : ''}`}>
                        {who ? <PersonLink id={who.id}><Avatar avatar={who.avatar} label={who.display_name} /></PersonLink> : <NobodyAvatar />}
                      </span>
                    </div>
                    </SwipeRow>
                  )}
                </Tick>
              )
            })}
          </section>
          )
        })}
        {/* Done before today: archived, one tap away, with "Again" for the things you do over and over (Nora, 30 Oct).
            It follows the All / Mine / someone's filter above, like the list does. */}
        <ArchiveLink
          title={t('archive.todosTitle')}
          people={people}
          rows={todos.rows.filter((x) => x.done_at && !recentlyDone(x) && !x.project_id && (shown === 'all' || x.assignee_id === (shown === 'mine' ? me : shown))).map((x) => ({ id: x.id, name: x.title, at: x.done_at as string, by: x.done_by }))}
          onAgain={(r) => {
            const was = todos.rows.find((x) => x.id === r.id)
            if (!hid || !was) return
            db.insert('todos', {
              title: was.title,
              assignee_id: was.assignee_id,
              due_date: toDateString(new Date()),
              repeat: null,
              household_id: hid,
              created_by: me,
              created_at: new Date().toISOString(),
              done_at: null,
              done_by: null,
            })
          }}
        />
        {todos.loaded && !groups.length && (
          // Pichi honks: nothing to do!
          <EmptyState pose="honk" color="#F2C1C4" zoom={1.05} rotate={3}>
            {t('todos.empty')}
          </EmptyState>
        )}
        </div>
      </div>

      <Floating>
      <button
        type="button"
        className="stk prim round fab"
        aria-label={t('todos.new')}
        onClick={() => setEditing('new')}
        style={{ transform: 'rotate(-4deg)' }}
      >
        <PlusIcon />
      </button>
      </Floating>

      <MyHouseholds open={switching} onClose={() => setSwitching(false)} />
      <SimilarTodo
        similar={quickSimilar}
        onClose={() => setQuickSimilar(null)}
        onAddAnyway={quickInsert}
        onBringBack={(from, repeatAs) => {
          if (hid) bringTodoBack(from, repeatAs, hid, me, toDateString(new Date()), me, quick)
          setQuickSimilar(null)
          setQuick('')
        }}
      />
      {editing && hid && <TodoSheet key={editing === 'new' ? 'new' : editing.id} todo={editing === 'new' ? null : editing} householdId={hid} people={people} onClose={() => { forget('todo:'); setEditing(null) }} />}
    </Screen>
  )
}

export function TodoSheet({ todo, householdId, people, onClose }: { todo: Todo | null; householdId: string; people: Profile[]; onClose: () => void }) {
  const { t, i18n } = useTranslation()
  const me = useMe()
  const today = new Date()
  const keep = `todo:${todo?.id ?? 'new'}`
  const [title, setTitle] = useKept(`${keep}:title`, todo?.title ?? '')
  const [assignee, setAssignee] = useKept<string | null>(`${keep}:assignee`, todo ? todo.assignee_id : me)
  const [due, setDue] = useKept<string | null>(`${keep}:due`, todo ? todo.due_date : toDateString(today))
  const [repeat, setRepeat] = useKept<Todo['repeat']>(`${keep}:repeat`, todo?.repeat ?? null)
  const [picking, setPicking] = useState(false)

  const quick = [
    { label: t('todos.whenToday'), value: toDateString(today) },
    { label: t('todos.whenTomorrow'), value: toDateString(addDays(today, 1)) },
    { label: capitalize(weekdayName(addDays(today, 2), i18n.language)), value: toDateString(addDays(today, 2)) },
  ]
  const isQuick = quick.some((q) => q.value === due)

  // A new to-do is created with its button. An existing one saves itself as you change it (no Save button,
  // Nora, 29 Oct): right away for the chips, a moment after the last key for the text, and on closing.
  const fields = { title: title.trim(), assignee_id: assignee, due_date: due, repeat }
  const changed = Boolean(todo && fields.title && (fields.title !== todo.title || fields.assignee_id !== todo.assignee_id || fields.due_date !== todo.due_date || fields.repeat !== todo.repeat))
  const latest = useRef({ fields, changed })
  latest.current = { fields, changed }
  function commit() {
    if (todo && latest.current.changed) db.update('todos', todo.id, latest.current.fields)
  }
  useEffect(() => {
    if (!changed) return
    const timer = window.setTimeout(commit, title.trim() !== todo?.title ? 500 : 0)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, assignee, due, repeat])
  const close = () => {
    commit()
    onClose()
  }

  // Before a copy lands on the list, Pichi checks for the same to-do (Nora, 30 Oct).
  const all = useTodos(householdId)
  const [similar, setSimilar] = useState<Similar | null>(null)
  const [firstComment, setFirstComment] = useKept(`${keep}:comment`, '')
  function postFirstComment(todoId: string) {
    if (!firstComment.trim()) return
    db.insert('comments', { household_id: householdId, item_id: null, todo_id: todoId, note_id: null, author_id: me, body: firstComment.trim(), sticker: null, reply_to: null, created_at: new Date().toISOString() })
    setFirstComment('')
  }
  function insert() {
    const row = db.insert('todos', {
      ...fields,
      household_id: householdId,
      created_by: me,
      created_at: new Date().toISOString(),
      done_at: null,
      done_by: null,
    })
    postFirstComment(row.id as string)
    setSimilar(null)
    onClose()
  }
  function add(e: FormEvent) {
    e.preventDefault()
    if (todo || !title.trim()) return
    const found = findSimilar(title, all.rows)
    if (found) setSimilar(found)
    else insert()
  }
  function bringBack(from: Todo, repeatAs: Todo['repeat']) {
    const row = bringTodoBack(from, repeatAs, householdId, me, fields.due_date, fields.assignee_id, fields.title)
    postFirstComment(row.id as string)
    setSimilar(null)
    onClose()
  }

  function remove() {
    if (!todo) return
    const undo = db.removeWithUndo('todos', todo.id)
    onClose()
    showUndo(t('todos.deleted'), t('common.undo'), undo)
  }

  return (
    <>
    <Sheet
      open
      onClose={close}
      title={todo ? t('todos.edit') : t('todos.new')}
    >
      <form id="todo-form" onSubmit={add} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <label className="label" htmlFor="todo-title">
            {t('todos.what')}
          </label>
          <input id="todo-title" className="input" autoFocus={!todo && !touchScreen} placeholder={t('todos.whatPlaceholder')} value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <span className="label">{t('todos.who')}</span>
          <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
            {people.map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={assignee === p.id}
                aria-label={p.display_name}
                onClick={() => setAssignee(p.id)}
                className="pick-av"
              >
                <Avatar avatar={p.avatar} size={40} />
              </button>
            ))}
            <button
              type="button"
              aria-pressed={assignee === null}
              onClick={() => setAssignee(null)}
              className="row"
              style={{ gap: 8, borderRadius: 24, padding: '3px 10px 3px 3px', boxShadow: assignee === null ? 'inset 0 0 0 2px #1E1A30' : undefined }}
            >
              <NobodyAvatar size={40} />
              <span className="cap" style={{ fontSize: 14 }}>
                {t('todos.anyone')}
              </span>
            </button>
          </div>
        </div>
        <div>
          <span className="label">{t('todos.when')}</span>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            {quick.map((q) => (
              <Chip key={q.value} on={due === q.value} onClick={() => setDue(q.value)}>
                {q.label}
              </Chip>
            ))}
            <Chip on={Boolean(due) && !isQuick} onClick={() => setPicking(true)}>
              {due && !isQuick ? dueLabel(due, i18n.language) : t('todos.pickDate')}
            </Chip>
            <Chip on={due === null} onClick={() => setDue(null)}>
              {t('todos.noDate')}
            </Chip>
          </div>
          {picking && (
            <input
              type="date"
              className="input"
              style={{ marginTop: 10 }}
              autoFocus
              aria-label={t('todos.pickDate')}
              value={due ?? ''}
              onChange={(e) => {
                setDue(e.target.value || null)
                setPicking(false)
              }}
            />
          )}
        </div>
        <div>
          <span className="label">{t('todos.repeat')}</span>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            {(
              [
                [null, 'todos.repeatNo'],
                ['daily', 'todos.repeatDaily'],
                ['weekly', 'todos.repeatWeekly'],
                ['monthly', 'todos.repeatMonthly'],
              ] as const
            ).map(([value, label]) => (
              <Chip key={label} on={repeat === value} onClick={() => setRepeat(value)}>
                {t(label)}
              </Chip>
            ))}
          </div>
        </div>
      </form>
      {todo ? (
        <div style={{ marginTop: 20 }}>
          <DeleteLink label={t('todos.delete')} onClick={remove} />
          <Comments target={{ todo_id: todo.id }} />
        </div>
      ) : (
        // A new to-do can carry its first comment right away (Nora, 30 Oct): it's posted when the to-do is added.
        <div style={{ marginTop: 20 }}>
          <label className="label" htmlFor="todo-first-comment">
            {t('comments.title')}
          </label>
          <textarea id="todo-first-comment" className="input" rows={2} placeholder={t('comments.placeholder')} value={firstComment} onChange={(e) => setFirstComment(e.target.value)} />
        </div>
      )}
      {/* Only a new to-do has a button: it creates it. */}
      {!todo && (
        <div className="row sheet-actions" style={{ marginTop: 20 }}>
          <button type="submit" form="todo-form" className="stk prim" style={{ flex: 1, transform: 'rotate(-.6deg)' }} disabled={!title.trim()}>
            {t('todos.add')}
          </button>
        </div>
      )}
    </Sheet>
    <SimilarTodo similar={similar} onClose={() => setSimilar(null)} onAddAnyway={insert} onBringBack={bringBack} />
    </>
  )
}
