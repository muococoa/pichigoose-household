import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMe } from '../auth'
import { db } from '../data/store'
import { useHousehold, useNotes, type Note } from '../data/hooks'
import { Screen } from '../components/Shell'
import { Avatar } from '../components/Avatar'
import { Hand, Menu, Sheet, Stamp, STAMP_COLORS, Tape, tilt, type TapeKind } from '../components/Scrapbook'
import { BackIcon, ChevronDown, DotsIcon, PlusIcon, SearchIcon } from '../components/Icons'
import { MyHouseholds } from './MyHouseholds'
import { ago } from '../lib/time'

const NOTE_COLORS = ['n-sage', 'n-butter', 'n-mist', 'n-blush', 'n-peach', 'n-lilac']
const PIN_TAPES: TapeKind[] = ['tm', 'tp', 'tdots', 'ty', 'tblocks', 'tcheck']

function colorOf(id: string) {
  return NOTE_COLORS[Math.abs(Math.round(tilt(id, 50) + 50)) % NOTE_COLORS.length]
}

export function newNote(householdId: string, me: string) {
  return db.insert('notes', {
    household_id: householdId,
    title: '',
    body: '',
    pinned: false,
    created_by: me,
    updated_by: me,
    updated_at: new Date().toISOString(),
  })
}

export function NotesScreen() {
  const { t, i18n } = useTranslation()
  const me = useMe()
  const navigate = useNavigate()
  const { household, people, name } = useHousehold()
  const hid = household?.id ?? null
  const notes = useNotes(hid)
  const [query, setQuery] = useState('')
  const [switching, setSwitching] = useState(false)

  const found = useMemo(() => {
    const q = query.trim().toLowerCase()
    return [...notes.rows]
      .filter((n) => !q || n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q))
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  }, [notes.rows, query])
  const pinned = found.filter((n) => n.pinned)
  const others = found.filter((n) => !n.pinned)

  const person = (id: string | null) => people.find((p) => p.id === id)

  function card(n: Note, i: number) {
    const who = person(n.updated_by ?? n.created_by)
    return (
      <Link
        key={n.id}
        to={`/notes/${n.id}`}
        className={`note ${colorOf(n.id)}`}
        style={{ display: 'block', padding: '16px 14px 12px', transform: `rotate(${tilt(n.id, 1.5)}deg)`, minHeight: 120 }}
      >
        {n.pinned && <Tape kind={PIN_TAPES[i % PIN_TAPES.length]} style={{ top: -10, left: '50%', marginLeft: -30, width: 60, height: 18, transform: `rotate(${tilt(n.id, 5)}deg)` }} />}
        <div style={{ fontSize: 17, lineHeight: '22px', fontWeight: 800, color: '#1E1A30', overflowWrap: 'anywhere' }}>{n.title || t('notes.untitled')}</div>
        <div
          style={{
            fontSize: 14,
            lineHeight: '20px',
            fontWeight: 600,
            color: '#463D50',
            marginTop: 4,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            whiteSpace: 'pre-line',
          }}
        >
          {n.body}
        </div>
        <div className="cap" style={{ marginTop: 6 }}>
          {who?.display_name ?? ''} · {ago(n.updated_at, i18n.language)}
        </div>
      </Link>
    )
  }

  return (
    <Screen tabbar>
      <div style={{ padding: 'calc(var(--top) + 10px) 22px 0 40px' }}>
        <div className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
          <Hand as="h1" style={{ margin: 0 }}>
            {t('notes.title')}
          </Hand>
          <button type="button" className="row cap phone-only" onClick={() => setSwitching(true)} style={{ fontSize: 14, fontWeight: 700, gap: 2, minWidth: 0 }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name(household)}</span>
            <ChevronDown />
          </button>
        </div>
        <div style={{ position: 'relative', marginTop: 16 }}>
          <span style={{ position: 'absolute', left: 14, top: 16, color: '#857A8C', display: 'flex' }}>
            <SearchIcon />
          </span>
          <input className="input" type="search" style={{ paddingLeft: 42 }} placeholder={t('notes.search')} aria-label={t('notes.search')} value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>

        {pinned.length > 0 && (
          <section style={{ marginTop: 24 }}>
            <Stamp color={STAMP_COLORS.nora}>{t('notes.pinned')}</Stamp>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginTop: 18 }}>{pinned.map(card)}</div>
          </section>
        )}
        {others.length > 0 && (
          <section style={{ marginTop: 26 }}>
            <Stamp color={STAMP_COLORS.claude} rotate={2}>
              {t('notes.others')}
            </Stamp>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginTop: 14 }}>{others.map(card)}</div>
          </section>
        )}
        {notes.loaded && !found.length && (
          <p className="body" style={{ marginTop: 28 }}>
            {query ? t('notes.noMatch') : t('notes.empty')}
          </p>
        )}
      </div>

      <button
        type="button"
        className="stk prim round fab"
        aria-label={t('home.addNote')}
        onClick={() => {
          if (!hid) return
          const n = newNote(hid, me)
          navigate(`/notes/${n.id}`)
        }}
        style={{ position: 'fixed', right: 'max(20px, calc(50vw - 195px))', bottom: 'calc(var(--tabbar) + 20px)', zIndex: 6, transform: 'rotate(-4deg)' }}
      >
        <PlusIcon />
      </button>
      <MyHouseholds open={switching} onClose={() => setSwitching(false)} />
    </Screen>
  )
}

export function NoteScreen() {
  const { t, i18n } = useTranslation()
  const me = useMe()
  const navigate = useNavigate()
  const { id } = useParams()
  const { household, households, people, name } = useHousehold()
  const hid = household?.id ?? null
  const notes = useNotes(hid)
  const created = useRef(false)

  // "/notes/new" creates a note and opens it.
  useEffect(() => {
    if (id === 'new' && hid && !created.current) {
      created.current = true
      const n = newNote(hid, me)
      navigate(`/notes/${n.id}`, { replace: true })
    }
  }, [id, hid, me, navigate])

  const note = notes.rows.find((n) => n.id === id)
  const [title, setTitle] = useState(note?.title ?? '')
  const [body, setBody] = useState(note?.body ?? '')
  const [moving, setMoving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const lastId = useRef<string | undefined>(undefined)

  // Load the text when the note first arrives (or a different note opens).
  useEffect(() => {
    if (note && lastId.current !== note.id) {
      lastId.current = note.id
      setTitle(note.title)
      setBody(note.body)
    }
  }, [note])

  // Save while typing, a moment after the last key.
  useEffect(() => {
    if (!note || (title === note.title && body === note.body)) return
    const timer = window.setTimeout(() => db.update('notes', note.id, { title, body, updated_by: me, updated_at: new Date().toISOString() }), 500)
    return () => window.clearTimeout(timer)
  }, [title, body, note, me])

  function leave() {
    // A note left empty isn't worth keeping.
    if (note && !title.trim() && !body.trim()) db.remove('notes', note.id)
    navigate('/notes')
  }

  const author = people.find((p) => p.id === note?.created_by)
  const editor = people.find((p) => p.id === note?.updated_by)

  return (
    <Screen>
      <div style={{ padding: 'calc(var(--top) + 8px) 22px 24px 40px', display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
        <div className="row" style={{ gap: 10 }}>
          <button type="button" onClick={leave} className="row" style={{ marginLeft: -10, color: '#463D50', fontWeight: 700, fontSize: 16, gap: 2 }}>
            <BackIcon />
            {t('notes.title')}
          </button>
          <span style={{ flex: 1 }} />
          {note && (
            <button
              type="button"
              className={`stk sm ${note.pinned ? 'prim' : 'sec'}`}
              aria-pressed={note.pinned}
              style={{ transform: 'rotate(2deg)' }}
              onClick={() => db.update('notes', note.id, { pinned: !note.pinned })}
            >
              {note.pinned ? t('notes.isPinned') : t('notes.pin')}
            </button>
          )}
          {note && (
            <Menu
              label={t('common.more')}
              items={[
                ...(households.length > 1 ? [{ label: t('notes.move'), onClick: () => setMoving(true) }] : []),
                { label: t('notes.deleteNote'), onClick: () => setConfirmDelete(true), danger: true },
              ]}
            >
              <DotsIcon />
            </Menu>
          )}
        </div>

        <div className={`note ${note ? colorOf(note.id) : 'n-sage'}`} style={{ marginTop: 22, flex: 1, display: 'flex', flexDirection: 'column', transform: 'rotate(-.5deg)', padding: '22px 20px 16px' }}>
          <Tape kind="tm" style={{ top: -10, left: 30, transform: 'rotate(-4deg)' }} />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('notes.titlePlaceholder')}
            aria-label={t('notes.titlePlaceholder')}
            style={{ position: 'relative', zIndex: 1, background: 'transparent', border: 0, outline: 'none', font: '800 24px/32px Nunito, sans-serif', color: '#1E1A30', padding: 0, width: '100%' }}
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t('notes.bodyPlaceholder')}
            aria-label={t('notes.bodyPlaceholder')}
            style={{
              position: 'relative',
              zIndex: 1,
              flex: 1,
              minHeight: 260,
              marginTop: 10,
              background: 'transparent',
              border: 0,
              outline: 'none',
              resize: 'none',
              font: '600 17px/26px Nunito, sans-serif',
              color: '#2E2638',
              padding: 0,
            }}
          />
          {note && author && (
            <div className="row cap" style={{ gap: 8, marginTop: 12, position: 'relative', zIndex: 1 }}>
              <Avatar avatar={author.avatar} size={28} />
              <span>
                {t('notes.wrote', { name: author.display_name })}
                {editor && ` · ${t('notes.changed', { name: editor.display_name, when: ago(note.updated_at, i18n.language) })}`}
              </span>
            </div>
          )}
        </div>
      </div>

      <Sheet small open={moving} onClose={() => setMoving(false)} title={t('notes.moveTitle')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {households
            .filter((h) => h.id !== hid)
            .map((h, i) => (
              <button
                key={h.id}
                type="button"
                className="stk sec"
                style={{ transform: `rotate(${i % 2 ? 1 : -1}deg)` }}
                onClick={() => {
                  if (note) db.update('notes', note.id, { household_id: h.id })
                  setMoving(false)
                  navigate('/notes')
                }}
              >
                {name(h)}
              </button>
            ))}
        </div>
      </Sheet>

      <Sheet small open={confirmDelete} onClose={() => setConfirmDelete(false)} title={t('notes.deleteNote')}>
        <p className="body" style={{ margin: '0 0 20px' }}>
          {t('notes.deleteText')}
        </p>
        <div className="row" style={{ gap: 12 }}>
          <button type="button" className="stk sec" style={{ flex: 1 }} onClick={() => setConfirmDelete(false)}>
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className="stk prim"
            style={{ flex: 1 }}
            onClick={() => {
              if (note) db.remove('notes', note.id)
              navigate('/notes')
            }}
          >
            {t('common.delete')}
          </button>
        </div>
      </Sheet>
    </Screen>
  )
}
