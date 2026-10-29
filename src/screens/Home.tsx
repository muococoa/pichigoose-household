import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth, useMe } from '../auth'
import {
  completeLayout,
  useHousehold,
  useItemsIn,
  useLists,
  useComments,
  useMyProfile,
  useNotes,
  usePantry,
  useRooms,
  useSpots,
  type Room,
  useTodos,
  type Section,
} from '../data/hooks'
import { recentlyDone, toggleItem, toggleTodo } from '../data/actions'
import { Floating, Screen } from '../components/Shell'
import { Avatar, NobodyAvatar } from '../components/Avatar'
import { Check, Hand, PaperClip, PichiAvatar, Struck, Tick, PichiStamp, Tape, tilt, type TapeKind } from '../components/Scrapbook'
import { InkChevron, PencilIcon, PlusIcon } from '../components/Icons'
import { MyHouseholds } from './MyHouseholds'
import { PendingInvites } from './Invite'
import { AddSheet } from './AddSheet'
import { PersonLink } from './Person'
import { NotePanel, colorOf } from './Notes'
import { AskName, madeFromEmail } from './AskName'
import { ago, daysFromToday, dueLabel, fromDateString } from '../lib/time'
import { useDesktop } from '../lib/desktop'
import { DragBoard } from '../components/DragBoard'
import { CommentCount, useCommentCounts } from '../components/Comments'
import { db } from '../data/store'
import { ShelfRows, groupLow, groupThings, useShelfWidth, type Group } from '../components/Shelves'
import { spotOf } from './Pantry'
import { useSwipeBetween } from '../components/Slide'

// Desktop: the small notes inside the notes section, each a little tilted and held with a paper clip on the left edge
// (the bottom right corner is for the comment bubble).
const MINI_TILT = [-2, 2, 1, -1.5]

// Each section is a sticky note in its own pastel, held by its own tape.
type Look = { note: string; tape: TapeKind; tapeStyle: React.CSSProperties; rotate: number }
const LOOK: Record<string, Look> = {
  news: { note: 'n-lilac', tape: 'ttri', tapeStyle: {}, rotate: 0 },
  todos: { note: 'n-blush', tape: 'tdots', tapeStyle: { top: -10, left: 28, transform: 'rotate(-4deg)' }, rotate: -1 },
  shopping: { note: 'n-butter', tape: 'tm', tapeStyle: { top: -10, right: 34, transform: 'rotate(5deg)' }, rotate: 1 },
  pantry: { note: 'n-sand', tape: 'ty', tapeStyle: { top: -10, left: 36, transform: 'rotate(-3deg)' }, rotate: -0.8 },
  bathroom: { note: 'n-mint', tape: 'tb', tapeStyle: { top: -10, right: 40, transform: 'rotate(4deg)' }, rotate: 0.7 },
  money: { note: 'n-mist', tape: 'tblocks', tapeStyle: { top: -10, left: '40%', transform: 'rotate(-2deg)' }, rotate: -0.6 },
  notes: { note: 'n-sage', tape: 'tcheck', tapeStyle: { top: -10, left: '30%', transform: 'rotate(3deg)' }, rotate: 0.6 },
}

// Rooms beyond the kitchen and bathroom get their own pastels in turn.
const ROOM_LOOKS: Look[] = [
  { note: 'n-peach', tape: 'tp', tapeStyle: { top: -10, left: 30, transform: 'rotate(-3deg)' }, rotate: 0.8 },
  { note: 'n-lilac', tape: 'tcheck', tapeStyle: { top: -10, right: 36, transform: 'rotate(4deg)' }, rotate: -0.7 },
  { note: 'n-mist', tape: 'tdots', tapeStyle: { top: -10, left: '35%', transform: 'rotate(-2deg)' }, rotate: 0.6 },
  { note: 'n-sage', tape: 'tblocks', tapeStyle: { top: -10, left: 40, transform: 'rotate(3deg)' }, rotate: -0.5 },
]
export function roomLook(room: Room | undefined, rooms: Room[]): Look {
  if (room?.kind === 'kitchen' && rooms.find((r) => r.kind === 'kitchen') === room) return LOOK.pantry
  if (room?.kind === 'bathroom' && rooms.find((r) => r.kind === 'bathroom') === room) return LOOK.bathroom
  const others = rooms.filter((r) => r !== rooms.find((x) => x.kind === 'kitchen') && r !== rooms.find((x) => x.kind === 'bathroom'))
  return ROOM_LOOKS[Math.max(0, others.indexOf(room as Room)) % ROOM_LOOKS.length]
}

function NoteHead({ title, right, to }: { title: string; right: string; to: string }) {
  const desktop = useDesktop()
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
      <Hand size={desktop ? 34 : 30} lineHeight={desktop ? 36 : 32}>
        {title}
      </Hand>
      <Link to={to} className="cap" style={{ color: 'var(--hero-dark)', fontWeight: 800 }}>
        {right}
      </Link>
    </div>
  )
}

function Empty({ children }: { children: string }) {
  return <div className="cap" style={{ fontSize: 14, padding: '2px 0 4px' }}>{children}</div>
}

/** A room's sticky note on Home: its name and one shelf of what's running out first. */
function RoomNote({ room, groups, look, onOpen }: { room: Room; groups: Group[]; look: Look; onOpen: (path: string) => (e: React.MouseEvent) => void }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const box = useShelfWidth()
  const to = `/pantry?room=${room.id}`
  const low = groups.filter((g) => groupLow(g.rows)).length
  return (
    <div className={`note ${look.note} note-link`} onClick={onOpen(to)} style={{ transform: `rotate(${look.rotate}deg)` }}>
      <Tape kind={look.tape} style={look.tapeStyle} />
      <NoteHead title={room.name.toLocaleLowerCase()} to={to} right={low ? `${t('home.pantryLow', { count: low })} · ${t('common.seeAll')}` : t('common.seeAll')} />
      {groups.length ? (
        <div ref={box.ref} style={{ padding: '10px 6px 0' }}>
          <ShelfRows groups={groups} width={box.width} height={56} maxRows={1} compact onOpen={() => navigate(to)} />
        </div>
      ) : (
        <Empty>{t('home.noPantry')}</Empty>
      )}
    </div>
  )
}

export function HomeScreen() {
  const { t, i18n } = useTranslation()
  const me = useMe()
  const profile = useMyProfile()
  const { household, membership, people, name } = useHousehold()
  const hid = household?.id ?? null
  const lists = useLists(hid)
  // "to buy" shows what's left on every list in the household, not just the first one.
  const items = useItemsIn(lists.rows.map((l) => l.id))
  const listName = (id: string) => lists.rows.find((l) => l.id === id)?.name ?? ''
  const manyLists = lists.rows.length > 1
  const todos = useTodos(hid)
  const notes = useNotes(hid)
  const pantry = usePantry(hid)
  const desktop = useDesktop()
  // Only on Home: swipe from right to left to open Messages, like Instagram's direct messages.
  const toMessages = useNavigate()
  useSwipeBetween(null, desktop ? null : () => toMessages('/messages'))
  const [switching, setSwitching] = useState(false)
  // Desktop: a note opened from the board, in the side panel.
  const [openNote, setOpenNote] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  // Still called by the name made from the email? Ask once, the same way joining does now.
  const email = useAuth().session?.user.email ?? ''
  const [askedName, setAskedName] = useState(false)
  const needsName = Boolean(profile && email && madeFromEmail(profile.display_name, email))

  const person = (id: string | null) => people.find((p) => p.id === id)
  const commentsOn = useCommentCounts()
  const comments = useComments(hid)

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
  // In the lists' own order (Groceries first, then the rest as arranged), newest first within a list.
  const listPos = (id: string) => lists.rows.find((l) => l.id === id)?.position ?? 99
  const toBuy = useMemo(
    () => items.rows.filter((x) => !x.checked_at).sort((a, b) => listPos(a.list_id) - listPos(b.list_id) || b.created_at.localeCompare(a.created_at)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items.rows, lists.rows],
  )
  // The pantry note shows what's running out first, from the pantry and the bathroom cabinet.
  // Grouped like on the shelves (three bottles of wine are one), what's running out first.
  const shelf = useMemo(() => {
    const room = (g: ReturnType<typeof groupThings>[number]) => (groupLow(g.rows) ? -1 : g.rows.length > 1 ? 2 : (g.rows[0].level - g.rows[0].low_at) / 100)
    return groupThings(pantry.rows).sort((a, b) => room(a) - room(b) || a.name.localeCompare(b.name))
  }, [pantry.rows])
  // Every room has its own note.
  const rooms = useRooms(hid)
  const spots = useSpots(hid)
  const pinnedNotes = useMemo(
    () => [...notes.rows].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updated_at.localeCompare(a.updated_at)),
    [notes.rows],
  )

  // Pichi's news. Real notifications arrive in phase 4. Until then she tells you what's new on the list.
  const news = useMemo(() => {
    const fresh = (iso: string) => Date.now() - new Date(iso).getTime() < 2 * 86400000
    const recent = toBuy.find((x) => x.added_by && x.added_by !== me && !x.added_by_pichi && fresh(x.created_at))
    // Someone commented on something: "Danko commented on šipka za kuhinju."
    const comment = [...comments.rows].reverse().find((c) => c.author_id && c.author_id !== me && fresh(c.created_at))
    if (comment && (!recent || comment.created_at > recent.created_at)) {
      const thing =
        items.rows.find((x) => x.id === comment.item_id)?.name ??
        todos.rows.find((x) => x.id === comment.todo_id)?.title ??
        notes.rows.find((x) => x.id === comment.note_id)?.title
      if (thing) return t('home.newsCommented', { name: person(comment.author_id)?.display_name ?? t('common.someone'), item: thing })
    }
    // Pichi put something on the list herself: she tells you about it.
    const pichi = toBuy.find((x) => x.added_by_pichi && fresh(x.created_at))
    if (pichi && (!recent || pichi.created_at > recent.created_at)) return t('home.newsPichi', { item: pichi.name })
    if (recent) return t('home.newsAdded', { name: person(recent.added_by)?.display_name ?? t('common.someone'), item: recent.name })
    const mineToday = openTodos.filter((x) => x.assignee_id === me && x.due_date && daysFromToday(fromDateString(x.due_date)) <= 0).length
    if (mineToday) return t('home.newsTodos', { count: mineToday })
    return t('home.newsCalm')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toBuy, openTodos, me, people, i18n.language, comments.rows])

  const fullLayout = useMemo(() => {
    return completeLayout(membership?.home_layout, rooms.rows)
  }, [membership, rooms.rows])
  const layout = useMemo(() => fullLayout.filter((s) => s.visible && s.section !== 'money'), [fullLayout])

  // Desktop: notes moved on the board keep their new order. Hidden sections, money and Pichi's news
  // keep their places; only the board's own slots are reshuffled.
  function saveBoard(keys: Section[]) {
    if (!household) return
    const slots = fullLayout.map((e, i) => (keys.includes(e.section) ? i : -1)).filter((i) => i >= 0)
    const next = [...fullLayout]
    keys.forEach((k, j) => {
      next[slots[j]] = fullLayout.find((e) => e.section === k)!
    })
    db.update('household_members', { household_id: household.id, user_id: me }, { home_layout: next })
  }

  // Clicking the note itself (not a checkbox, an item or a link on it) opens its page.
  const navigate = useNavigate()
  const open = (path: string) => (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, a, input, label, textarea')) return
    navigate(path)
  }

  function section(s: Section) {
    const look = LOOK[s] ?? LOOK.pantry
    if (s === 'news') {
      return (
        <div key="news" style={{ display: 'flex', gap: desktop ? 16 : 12, alignItems: 'flex-start', marginTop: desktop ? 0 : -4 }}>
          <PichiStamp />
          <div
            style={{
              position: 'relative',
              flex: desktop ? 'none' : 1,
              minWidth: desktop ? 300 : undefined,
              // Pichi's speech bubble in the theme color (Nora, 29 Oct), so each theme shows up on Home too.
              background: 'var(--hero)',
              borderRadius: '14px 16px 14px 4px',
              padding: desktop ? '14px 18px' : '12px 14px',
              boxShadow: '2px 3px 0 rgba(30,26,48,.10)',
              marginTop: desktop ? 10 : 6,
            }}
          >
            {/* The greeting leads; the news sits a step smaller under it. */}
            <Hand size={desktop ? 31 : 27} lineHeight={desktop ? 34 : 30} color="#FFFFFF">
              {t('home.hi', { name: profile?.display_name ?? '' })}
            </Hand>
            <div style={{ fontSize: desktop ? 16 : 14, lineHeight: desktop ? '22px' : '20px', fontWeight: 600, marginTop: 2, color: 'rgba(255, 255, 255, .82)' }}>{news}</div>
          </div>
        </div>
      )
    }
    if (s === 'todos') {
      return (
        <div key="todos" className={`note ${look.note} note-link`} onClick={open('/todos')} style={{ transform: `rotate(${look.rotate}deg)` }}>
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
                        <CommentCount n={commentsOn(x.id)} />
                        {x.due_date && <div className="cap">{dueLabel(x.due_date, i18n.language)}</div>}
                      </span>
                      <span className={`av-fade${on ? ' done' : ''}`}>{who ? <PersonLink id={who.id}><Avatar avatar={who.avatar} label={who.display_name} /></PersonLink> : <NobodyAvatar />}</span>
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
                        <CommentCount n={commentsOn(x.id)} />
                        {x.due_date && <div className="cap">{dueLabel(x.due_date, i18n.language)}</div>}
                      </span>
                      <span className={`av-fade${on ? ' done' : ''}`}>{who ? <PersonLink id={who.id}><Avatar avatar={who.avatar} label={who.display_name} /></PersonLink> : <NobodyAvatar />}</span>
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
        <div key="shopping" className={`note ${look.note} note-link`} onClick={open('/shopping')} style={{ transform: `rotate(${look.rotate}deg)` }}>
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
                        <CommentCount n={commentsOn(x.id)} />
                        {/* Which list it's on, when there's more than one. */}
                        {manyLists && <div className="cap">{listName(x.list_id)}</div>}
                      </span>
                      {x.added_by_pichi ? (
                        <span className={`av-fade${on ? ' done' : ''}`}>
                          <PichiAvatar />
                        </span>
                      ) : who && (
                        <span className={`av-fade${on ? ' done' : ''}`}>
                          <PersonLink id={who.id}><Avatar avatar={who.avatar} label={who.display_name} /></PersonLink>
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
    if (s.startsWith('room:')) {
      // A room's note: one shelf of what's running out first in that room.
      const room = rooms.rows.find((r) => `room:${r.id}` === s)
      if (!room) return null
      const inRoom = new Set(spots.rows.filter((x) => x.room_id === room.id).map((x) => x.id))
      const here = shelf.filter((g) => inRoom.has(spotOf(g.rows[0], rooms.rows, spots.rows) ?? ''))
      return <RoomNote key={s} room={room} groups={here} look={roomLook(room, rooms.rows)} onOpen={open} />
    }
    if (s === 'pantry' || s === 'bathroom') return null
    return (
      <div key="notes" className={`note ${look.note} note-link`} onClick={open('/notes')} style={{ transform: `rotate(${look.rotate}deg)` }}>
        <Tape kind={look.tape} style={look.tapeStyle} />
        <NoteHead title={t('home.notes')} to="/notes" right={t('common.seeAll')} />
        {desktop ? (
          // Desktop: the notes as small sticky notes, two across.
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 22, paddingTop: 6 }}>
            {pinnedNotes.slice(0, 4).map((n, i) => {
              const by = person(n.updated_by)
              return (
                <button
                  type="button"
                  key={n.id}
                  onClick={() => setOpenNote(n.id)}
                  className={`note ${colorOf(n.id)}`}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '16px 18px 30px', minHeight: 104, transform: `rotate(${MINI_TILT[i % MINI_TILT.length]}deg)`, boxShadow: '1px 2px 0 rgba(30,26,48,.14)', minWidth: 0 }}
                >
                  <PaperClip side="left" />
                  <div style={{ fontSize: 17, lineHeight: '22px', fontWeight: 800, color: '#1E1A30', overflowWrap: 'break-word', hyphens: 'auto' }}>{n.title || t('notes.untitled')}</div>
                  <div className="cap" style={{ marginTop: 4 }}>
                    {n.pinned ? t('notes.pinned') : `${by?.display_name ?? ''} · ${ago(n.updated_at, i18n.language)}`}
                  </div>
                  {/* The comment bubble sits in the bottom right corner. */}
                  <span style={{ position: 'absolute', right: 12, bottom: 8 }}>
                    <CommentCount n={commentsOn(n.id)} />
                  </span>
                </button>
              )
            })}
            {!pinnedNotes.length && <Empty>{t('home.noNotes')}</Empty>}
          </div>
        ) : (
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
        )}
      </div>
    )
  }

  if (desktop) {
    // Desktop (D3): Pichi and the greeting on top with "Arrange your home" on the right,
    // then the sections as sticky notes on a board, three across, in this person's own order.
    const board = layout.filter((s) => s.section !== 'news')
    return (
      <Screen wide doodle="run">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 26, paddingTop: 'var(--top)', paddingRight: 22, paddingLeft: 40 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24 }}>
            {layout.some((s) => s.section === 'news') && section('news')}
            <span style={{ flex: 1 }} />
            <Link to="/arrange" className="stk sec sm" aria-label={t('home.arrange')} title={t('home.arrange')} style={{ width: 42, padding: 0, transform: 'rotate(3deg)', marginTop: 18 }}>
              <PencilIcon />
            </Link>
          </div>
          <PendingInvites style={{ maxWidth: 620 }} />
          <div style={{ marginTop: 10 }}>
            <DragBoard items={board.map((s) => ({ key: s.section, node: section(s.section) }))} onReorder={saveBoard} dropLabel={t('arrange.dropHere')} />
          </div>
        </div>
        <AskName save open={needsName && !askedName} onClose={() => setAskedName(true)} onJoin={() => {}} />
        {openNote && <NotePanel id={openNote} onClose={() => setOpenNote(null)} />}
      </Screen>
    )
  }

  return (
    <Screen tabbar className="has-fab" doodle="honk">
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
        <PendingInvites />
        {layout.map((s) => section(s.section))}
      </div>

      <Floating>
      <button
        type="button"
        className="stk prim round fab"
        aria-label={t('home.add')}
        onClick={() => setAdding(true)}
        style={{ transform: 'rotate(-4deg)' }}
      >
        <PlusIcon />
      </button>
      </Floating>

      <MyHouseholds open={switching} onClose={() => setSwitching(false)} />
      <AddSheet open={adding} onClose={() => setAdding(false)} />
      <AskName save open={needsName && !askedName} onClose={() => setAskedName(true)} onJoin={() => {}} />
    </Screen>
  )
}

