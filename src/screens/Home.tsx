import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMe } from '../auth'
import {
  DEFAULT_LAYOUT,
  useHousehold,
  useItems,
  useLists,
  useMyProfile,
  useNotes,
  useTodos,
  type Section,
} from '../data/hooks'
import { recentlyDone, toggleItem, toggleTodo } from '../data/actions'
import { Screen } from '../components/Shell'
import { Avatar, NobodyAvatar } from '../components/Avatar'
import { Check, Hand, Struck, Tick, PichiStamp, Sheet, Tape, tilt, type TapeKind } from '../components/Scrapbook'
import { InkChevron, PencilIcon, PlusIcon } from '../components/Icons'
import { MyHouseholds } from './MyHouseholds'
import { daysFromToday, dueLabel, fromDateString } from '../lib/time'

// Each section is a sticky note in its own pastel, held by its own tape.
const LOOK: Record<Section, { note: string; tape: TapeKind; tapeStyle: React.CSSProperties; rotate: number }> = {
  news: { note: 'n-lilac', tape: 'ttri', tapeStyle: {}, rotate: 0 },
  todos: { note: 'n-blush', tape: 'tdots', tapeStyle: { top: -10, left: 28, transform: 'rotate(-4deg)' }, rotate: -1 },
  shopping: { note: 'n-butter', tape: 'tm', tapeStyle: { top: -10, right: 34, transform: 'rotate(5deg)' }, rotate: 1 },
  money: { note: 'n-mist', tape: 'tblocks', tapeStyle: { top: -10, left: '40%', transform: 'rotate(-2deg)' }, rotate: -0.6 },
  notes: { note: 'n-sage', tape: 'tcheck', tapeStyle: { top: -10, left: '30%', transform: 'rotate(3deg)' }, rotate: 0.6 },
}

function NoteHead({ title, right, to }: { title: string; right: string; to: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
      <Hand size={30} lineHeight={32}>
        {title}
      </Hand>
      <Link to={to} className="cap" style={{ color: '#A8335A', fontWeight: 800 }}>
        {right}
      </Link>
    </div>
  )
}

function Empty({ children }: { children: string }) {
  return <div className="cap" style={{ fontSize: 14, padding: '2px 0 4px' }}>{children}</div>
}

export function HomeScreen() {
  const { t, i18n } = useTranslation()
  const me = useMe()
  const navigate = useNavigate()
  const profile = useMyProfile()
  const { household, membership, people, name } = useHousehold()
  const hid = household?.id ?? null
  const lists = useLists(hid)
  const firstList = [...lists.rows].sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at))[0]
  const items = useItems(firstList?.id ?? null)
  const todos = useTodos(hid)
  const notes = useNotes(hid)
  const [switching, setSwitching] = useState(false)
  const [adding, setAdding] = useState(false)

  const person = (id: string | null) => people.find((p) => p.id === id)

  const openTodos = useMemo(
    () =>
      todos.rows
        .filter((x) => !x.done_at)
        .sort((a, b) => (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999') || a.created_at.localeCompare(b.created_at)),
    [todos.rows],
  )
  // Done today stays on the note, crossed out at the bottom, until the day passes.
  const doneTodos = useMemo(
    () => todos.rows.filter((x) => recentlyDone(x)).sort((a, b) => (b.done_at ?? '').localeCompare(a.done_at ?? '')),
    [todos.rows],
  )
  const todayCount = openTodos.filter((x) => x.due_date && daysFromToday(fromDateString(x.due_date)) <= 0).length
  const toBuy = useMemo(() => items.rows.filter((x) => !x.checked_at).sort((a, b) => b.created_at.localeCompare(a.created_at)), [items.rows])
  const pinnedNotes = useMemo(
    () => [...notes.rows].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updated_at.localeCompare(a.updated_at)),
    [notes.rows],
  )

  // Pichi's news. Real notifications arrive in phase 4. Until then she tells you what's new on the list.
  const news = useMemo(() => {
    const recent = toBuy.find((x) => x.added_by && x.added_by !== me && Date.now() - new Date(x.created_at).getTime() < 2 * 86400000)
    if (recent) return t('home.newsAdded', { name: person(recent.added_by)?.display_name ?? t('common.someone'), item: recent.name })
    const mineToday = openTodos.filter((x) => x.assignee_id === me && x.due_date && daysFromToday(fromDateString(x.due_date)) <= 0).length
    if (mineToday) return t('home.newsTodos', { count: mineToday })
    return t('home.newsCalm')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toBuy, openTodos, me, people, i18n.language])

  const layout = useMemo(() => {
    const saved = membership?.home_layout?.length ? membership.home_layout : DEFAULT_LAYOUT
    const all = [...saved, ...DEFAULT_LAYOUT.filter((d) => !saved.some((s) => s.section === d.section))]
    return all.filter((s) => s.visible && s.section !== 'money')
  }, [membership])

  function section(s: Section) {
    const look = LOOK[s]
    if (s === 'news') {
      return (
        <div key="news" style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginTop: -4 }}>
          <PichiStamp />
          <div style={{ position: 'relative', flex: 1, background: '#FFFFFF', borderRadius: '14px 16px 14px 4px', padding: '12px 14px', boxShadow: '2px 3px 0 rgba(30,26,48,.10)', marginTop: 6 }}>
            <Hand size={22} lineHeight={24} color="#A8335A">
              {t('home.hi', { name: profile?.display_name ?? '' })}
            </Hand>
            <div style={{ fontSize: 15, lineHeight: '21px', fontWeight: 600, marginTop: 2 }}>{news}</div>
          </div>
        </div>
      )
    }
    if (s === 'todos') {
      return (
        <div key="todos" className={`note ${look.note}`} style={{ transform: `rotate(${look.rotate}deg)` }}>
          <Tape kind={look.tape} style={look.tapeStyle} />
          <NoteHead
            title={t('home.todos')}
            to="/todos"
            right={todayCount ? `${t('home.todosToday', { count: todayCount })} · ${t('common.seeAll')}` : t('common.seeAll')}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {openTodos.slice(0, 3).map((x) => {
              const who = person(x.assignee_id)
              return (
                <Tick key={x.id} checked={false} onCommit={() => toggleTodo(x, me)}>
                  {(on, toggle) => (
                    <div className={`ln${on ? ' row-done' : ''}`}>
                      <Check checked={on} onToggle={toggle} label={x.title} rotate={tilt(x.id)} />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <Struck on={on}>{x.title}</Struck>
                        {x.due_date && <div className="cap">{dueLabel(x.due_date, i18n.language)}</div>}
                      </span>
                      <span className={`av-fade${on ? ' done' : ''}`}>{who ? <Avatar avatar={who.avatar} label={who.display_name} /> : <NobodyAvatar />}</span>
                    </div>
                  )}
                </Tick>
              )
            })}
            {doneTodos.slice(0, 2).map((x) => {
              const who = person(x.done_by ?? x.assignee_id)
              return (
                <Tick key={`done-${x.id}`} checked onCommit={() => toggleTodo(x, me)}>
                  {(on, toggle) => (
                    <div className={`ln${on ? ' row-done' : ''}`}>
                      <Check checked={on} onToggle={toggle} label={x.title} rotate={tilt(x.id)} />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <Struck on={on}>{x.title}</Struck>
                        {x.due_date && <div className="cap">{dueLabel(x.due_date, i18n.language)}</div>}
                      </span>
                      <span className={`av-fade${on ? ' done' : ''}`}>{who ? <Avatar avatar={who.avatar} label={who.display_name} /> : <NobodyAvatar />}</span>
                    </div>
                  )}
                </Tick>
              )
            })}
            {!openTodos.length && !doneTodos.length && <Empty>{t('home.noTodos')}</Empty>}
          </div>
        </div>
      )
    }
    if (s === 'shopping') {
      return (
        <div key="shopping" className={`note ${look.note}`} style={{ transform: `rotate(${look.rotate}deg)` }}>
          <Tape kind={look.tape} style={look.tapeStyle} />
          <NoteHead
            title={t('home.toBuy')}
            to="/shopping"
            right={toBuy.length ? `${t('common.items', { count: toBuy.length })} · ${t('common.seeAll')}` : t('common.seeAll')}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {toBuy.slice(0, 3).map((x) => {
              const who = person(x.added_by)
              return (
                <Tick key={x.id} checked={false} onCommit={() => toggleItem(x, me)}>
                  {(on, toggle) => (
                    <div className={`ln${on ? ' row-done' : ''}`}>
                      <Check checked={on} onToggle={toggle} label={x.name} rotate={tilt(x.id)} />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <Struck on={on}>{x.name}</Struck>
                      </span>
                      {who && (
                        <span className={`av-fade${on ? ' done' : ''}`}>
                          <Avatar avatar={who.avatar} label={who.display_name} />
                        </span>
                      )}
                    </div>
                  )}
                </Tick>
              )
            })}
            {!toBuy.length && <Empty>{t('home.noItems')}</Empty>}
          </div>
        </div>
      )
    }
    return (
      <div key="notes" className={`note ${look.note}`} style={{ transform: `rotate(${look.rotate}deg)` }}>
        <Tape kind={look.tape} style={look.tapeStyle} />
        <NoteHead title={t('home.notes')} to="/notes" right={t('common.seeAll')} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {pinnedNotes.slice(0, 3).map((n) => (
            <Link key={n.id} to={`/notes/${n.id}`} className="ln" style={{ display: 'block' }}>
              {n.title || t('notes.untitled')}
              <div className="cap" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {n.body.split('\n')[0]}
              </div>
            </Link>
          ))}
          {!pinnedNotes.length && <Empty>{t('home.noNotes')}</Empty>}
        </div>
      </div>
    )
  }

  return (
    <Screen tabbar>
      <div style={{ padding: '10px 22px 0 40px', paddingTop: 'calc(var(--top) + 10px)', display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ minWidth: 0 }}>
            <button type="button" onClick={() => setSwitching(true)} aria-label={t('home.switch')} style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#1E1A30' }}>
              <Hand size={42} lineHeight={44}>
                {name(household)}
              </Hand>
              {/* Sits low, by the bottom of the letters. */}
              <span style={{ display: 'flex', alignSelf: 'flex-end', marginBottom: 4, marginLeft: 2 }}>
                <InkChevron />
              </span>
            </button>
            <div className="cap" style={{ marginTop: 2 }}>
              {household?.address} · {t('common.people', { count: people.length })}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 'none' }}>
            <Link to="/arrange" className="stk sec sm" style={{ width: 38, padding: 0 }} aria-label={t('home.arrange')}>
              <PencilIcon />
            </Link>
            <Link to="/settings" aria-label={t('home.profile')} style={{ display: 'block' }}>
              <Avatar avatar={profile?.avatar} size={40} className="" />
            </Link>
          </div>
        </div>
        {layout.map((s) => section(s.section))}
      </div>

      <button
        type="button"
        className="stk prim round"
        aria-label={t('home.add')}
        onClick={() => setAdding(true)}
        style={{ position: 'fixed', right: 'max(20px, calc(50vw - 195px))', bottom: 'calc(var(--tabbar) + 20px)', zIndex: 6, transform: 'rotate(-4deg)' }}
      >
        <PlusIcon />
      </button>

      <MyHouseholds open={switching} onClose={() => setSwitching(false)} />
      <Sheet open={adding} onClose={() => setAdding(false)} title={t('home.addWhat')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <button type="button" className="stk sec" style={{ transform: 'rotate(-1deg)' }} onClick={() => navigate('/shopping?add=1')}>
            {t('home.addItem')}
          </button>
          <button type="button" className="stk sec" style={{ transform: 'rotate(1deg)' }} onClick={() => navigate('/todos?add=1')}>
            {t('home.addTodo')}
          </button>
          <button type="button" className="stk sec" style={{ transform: 'rotate(-.5deg)' }} onClick={() => navigate('/notes/new')}>
            {t('home.addNote')}
          </button>
        </div>
      </Sheet>
    </Screen>
  )
}

