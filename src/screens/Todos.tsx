import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMe } from '../auth'
import { db } from '../data/store'
import { useHousehold, useTodos, type Profile, type Todo } from '../data/hooks'
import { recentlyDone, toggleTodo } from '../data/actions'
import { Screen } from '../components/Shell'
import { Avatar, NobodyAvatar } from '../components/Avatar'
import { Check, Hand, Struck, useArrivals, Sheet, Stamp, STAMP_COLORS, tilt } from '../components/Scrapbook'
import { ChevronDown, PlusIcon } from '../components/Icons'
import { MyHouseholds } from './MyHouseholds'
import { addDays, capitalize, daysFromToday, dueLabel, fromDateString, toDateString, weekdayName } from '../lib/time'

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
  const [filter, setFilter] = useState<string>('all')
  const [switching, setSwitching] = useState(false)
  const [editing, setEditing] = useState<Todo | 'new' | null>(null)

  useEffect(() => {
    if (params.get('add')) {
      setEditing('new')
      setParams({}, { replace: true })
    }
  }, [params, setParams])

  const others = people.filter((p) => p.id !== me)
  const visible = useMemo(() => {
    const rows = todos.rows.filter((x) => !x.done_at || recentlyDone(x))
    if (filter === 'all') return rows
    if (filter === 'mine') return rows.filter((x) => x.assignee_id === me)
    return rows.filter((x) => x.assignee_id === filter)
  }, [todos.rows, filter, me])

  const groups = useMemo(() => {
    return ORDER
      .map((g) => ({
        g,
        rows: visible
          .filter((x) => groupOf(x) === g)
          .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? '') || a.created_at.localeCompare(b.created_at)),
      }))
      .filter((x) => x.rows.length)
  }, [visible])

  const { arrived, leaving } = useArrivals(groups.map((x) => x.g))

  const person = (id: string | null) => people.find((p) => p.id === id)

  function detail(x: Todo) {
    const parts: string[] = []
    if (x.due_date) {
      const days = daysFromToday(fromDateString(x.due_date))
      parts.push(days < 0 && !x.done_at ? `${dueLabel(x.due_date, i18n.language)}, ${t('todos.late')}` : dueLabel(x.due_date, i18n.language))
    }
    if (x.repeat) parts.push(t('todos.repeats'))
    if (!x.assignee_id) parts.push(t('todos.nobody'))
    return parts.join(' · ')
  }

  return (
    <Screen tabbar>
      <div style={{ padding: 'calc(var(--top) + 10px) 22px 0 40px' }}>
        <div className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
          <Hand as="h1" style={{ margin: 0 }}>
            {t('todos.title')}
          </Hand>
          <button type="button" className="row cap" onClick={() => setSwitching(true)} style={{ fontSize: 14, fontWeight: 700, gap: 2, minWidth: 0 }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name(household)}</span>
            <ChevronDown />
          </button>
        </div>
        {others.length > 0 && (
          <div className="row" style={{ gap: 8, flexWrap: 'wrap', margin: '16px 0 0' }}>
            <Chip on={filter === 'all'} onClick={() => setFilter('all')}>
              {t('todos.all')}
            </Chip>
            <Chip on={filter === 'mine'} onClick={() => setFilter('mine')}>
              {t('todos.mine')}
            </Chip>
            {others.slice(0, 3).map((p) => (
              <Chip key={p.id} on={filter === p.id} onClick={() => setFilter(p.id)}>
                {t('todos.persons', { name: p.display_name })}
              </Chip>
            ))}
          </div>
        )}

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
              <Stamp color={GROUP_COLOR[g]} rotate={g === 'today' ? -3 : 2} motion={arrived.includes(g) ? 'in' : undefined}>
                {t(`todos.${g}`)}
              </Stamp>
            </div>
            {rows.map((x) => {
              const who = person(x.assignee_id)
              const done = Boolean(x.done_at)
              return (
                <div key={x.id} className={`ln${done ? ' row-done' : ''}`} style={{ minHeight: 64 }}>
                  <Check checked={done} onChange={() => toggleTodo(x, me)} label={x.title} rotate={tilt(x.id)} />
                  <button type="button" onClick={() => setEditing(x)} style={{ flex: 1, minWidth: 0, fontSize: 17, padding: '8px 0' }}>
                    <Struck on={done}>{x.title}</Struck>
                    {detail(x) && <div className="cap">{detail(x)}</div>}
                  </button>
                  <span className={done ? 'av-done' : undefined} style={{ display: 'flex' }}>
                    {who ? <Avatar avatar={who.avatar} label={who.display_name} /> : <NobodyAvatar />}
                  </span>
                </div>
              )
            })}
          </section>
          )
        })}
        {todos.loaded && !groups.length && (
          <p className="body" style={{ marginTop: 28 }}>
            {t('todos.empty')}
          </p>
        )}
      </div>

      <button
        type="button"
        className="stk prim round"
        aria-label={t('todos.new')}
        onClick={() => setEditing('new')}
        style={{ position: 'fixed', right: 'max(20px, calc(50vw - 195px))', bottom: 'calc(var(--tabbar) + 20px)', zIndex: 6, transform: 'rotate(-4deg)' }}
      >
        <PlusIcon />
      </button>

      <MyHouseholds open={switching} onClose={() => setSwitching(false)} />
      {editing && hid && <TodoSheet key={editing === 'new' ? 'new' : editing.id} todo={editing === 'new' ? null : editing} householdId={hid} people={people} onClose={() => setEditing(null)} />}
    </Screen>
  )
}

function TodoSheet({ todo, householdId, people, onClose }: { todo: Todo | null; householdId: string; people: Profile[]; onClose: () => void }) {
  const { t, i18n } = useTranslation()
  const me = useMe()
  const today = new Date()
  const [title, setTitle] = useState(todo?.title ?? '')
  const [assignee, setAssignee] = useState<string | null>(todo ? todo.assignee_id : me)
  const [due, setDue] = useState<string | null>(todo ? todo.due_date : toDateString(today))
  const [repeat, setRepeat] = useState<Todo['repeat']>(todo?.repeat ?? null)
  const [picking, setPicking] = useState(false)

  const quick = [
    { label: t('todos.whenToday'), value: toDateString(today) },
    { label: t('todos.whenTomorrow'), value: toDateString(addDays(today, 1)) },
    { label: capitalize(weekdayName(addDays(today, 2), i18n.language)), value: toDateString(addDays(today, 2)) },
  ]
  const isQuick = quick.some((q) => q.value === due)

  function save(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    const fields = { title: title.trim(), assignee_id: assignee, due_date: due, repeat }
    if (todo) db.update('todos', todo.id, fields)
    else
      db.insert('todos', {
        ...fields,
        household_id: householdId,
        created_by: me,
        created_at: new Date().toISOString(),
        done_at: null,
        done_by: null,
      })
    onClose()
  }

  return (
    <Sheet open onClose={onClose} title={todo ? t('todos.edit') : t('todos.new')}>
      <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <label className="label" htmlFor="todo-title">
            {t('todos.what')}
          </label>
          <input id="todo-title" className="input" autoFocus={!todo} placeholder={t('todos.whatPlaceholder')} value={title} onChange={(e) => setTitle(e.target.value)} />
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
                style={{ borderRadius: '50%', padding: 3, boxShadow: assignee === p.id ? 'inset 0 0 0 2px #1E1A30' : undefined }}
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
        <div className="row" style={{ gap: 12, marginTop: 4 }}>
          {todo && (
            <button
              type="button"
              className="stk sec"
              style={{ flex: 1, color: '#A8335A' }}
              onClick={() => {
                db.remove('todos', todo.id)
                onClose()
              }}
            >
              {t('common.delete')}
            </button>
          )}
          <button type="submit" className="stk prim" style={{ flex: 1.6, transform: 'rotate(-.6deg)' }} disabled={!title.trim()}>
            {todo ? t('common.save') : t('todos.add')}
          </button>
        </div>
      </form>
    </Sheet>
  )
}
