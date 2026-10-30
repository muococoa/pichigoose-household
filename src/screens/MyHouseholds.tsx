import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMe } from '../auth'
import { db } from '../data/store'
import { setCurrentHousehold, useHousehold, useRooms, type Household } from '../data/hooks'
import { Avatar } from '../components/Avatar'
import { Hand, Menu, Sheet, Tape, type TapeKind } from '../components/Scrapbook'
import { DotsIcon, PencilIcon, PersonAddIcon, SmallCheck } from '../components/Icons'
import { DeleteHouseholdSheet } from './HouseholdClean'
import { copyText, joinLink } from '../lib/share'
import { InviteSheet } from './Invite'
import { autoFocusField } from '../lib/keyboard'

const TILES: { note: string; tape: TapeKind }[] = [
  { note: 'n-sage', tape: 'tcheck' },
  { note: 'n-peach', tape: 'tp' },
  { note: 'n-sand', tape: 'ty' },
  { note: 'n-mint', tape: 'tb' },
  { note: 'n-mist', tape: 'tdots' },
  { note: 'n-blush', tape: 'tm' },
]

/** The "Our home" hub: the sheet that opens from the household name (on the phone, and as a side panel on desktop). */
export function MyHouseholds({ open, onClose, page }: { open: boolean; onClose: () => void; page?: boolean }) {
  const { t } = useTranslation()
  const me = useMe()
  const navigate = useNavigate()
  const { households, household: current, name, peopleIn } = useHousehold()
  const [renaming, setRenaming] = useState<Household | null>(null)
  const [deleting, setDeleting] = useState<Household | null>(null)
  const [label, setLabel] = useState('')
  const [leaving, setLeaving] = useState<Household | null>(null)
  const [inviting, setInviting] = useState<Household | null>(null)
  const [secretFor, setSecretFor] = useState<Household | null>(null)
  const [secretText, setSecretText] = useState('')

  // The hub's top part: this home's people, and tiles for what isn't in the menu (Notes, Projects, the rooms).
  const here = current ? peopleIn(current.id) : []
  const rooms = useRooms(current?.id ?? null)
  const tiles = [
    { to: '/notes', label: t('home.notes') },
    { to: '/projects', label: t('home.projects') },
    { to: '/trophies', label: t('trophies.tile') },
    ...[...rooms.rows].sort((a, b) => a.position - b.position).map((r) => ({ to: `/pantry?room=${r.id}`, label: r.name.toLocaleLowerCase() })),
  ]
  function go(to: string) {
    onClose()
    navigate(to)
  }

  function pick(h: Household) {
    setCurrentHousehold(h.id)
    onClose()
    if (page) navigate('/')
  }

  function rename() {
    if (!renaming) return
    db.update('household_members', { household_id: renaming.id, user_id: me }, { label: label.trim() || null })
    setRenaming(null)
  }

  function leave() {
    if (!leaving) return
    db.remove('household_members', { household_id: leaving.id, user_id: me })
    const rest = households.filter((h) => h.id !== leaving.id)
    setLeaving(null)
    if (rest.length) setCurrentHousehold(rest[0].id)
    else {
      onClose()
      navigate('/welcome', { replace: true })
    }
  }

  const leavingAlone = leaving ? peopleIn(leaving.id).length <= 1 : false

  const sheets = (
    <>

      <InviteSheet household={inviting} onClose={() => setInviting(null)} />

      <DeleteHouseholdSheet
        household={deleting}
        onClose={() => setDeleting(null)}
        onDeleted={(id) => {
          const rest = households.filter((h) => h.id !== id)
          setDeleting(null)
          if (rest.length) setCurrentHousehold(rest[0].id)
          else {
            onClose()
            navigate('/welcome', { replace: true })
          }
        }}
      />

      {/* The household's secret password: everyone in it can see and change it. */}
      <Sheet small open={Boolean(secretFor)} onClose={() => setSecretFor(null)} title={t('households.secret')}>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (secretFor && secretText.trim()) db.update('households', secretFor.id, { secret: secretText.trim() })
            setSecretFor(null)
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          <div>
            <input
              className="input"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={secretText}
              aria-label={t('households.secret')}
              onChange={(e) => setSecretText(e.target.value)}
            />
            <p className="cap" style={{ margin: '8px 0 0' }}>
              {t('join.secretCreateHelp')}
            </p>
          </div>
          <button type="submit" className="stk prim" style={{ width: '100%' }}>
            {t('common.save')}
          </button>
        </form>
      </Sheet>

      <Sheet small open={Boolean(renaming)} onClose={() => setRenaming(null)} title={t('households.renameTitle')}>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            rename()
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          <input className="input" ref={autoFocusField} value={label} onChange={(e) => setLabel(e.target.value)} aria-label={t('households.renameTitle')} />
          <button type="submit" className="stk prim" style={{ width: '100%' }}>
            {t('common.save')}
          </button>
        </form>
      </Sheet>

      <Sheet small open={Boolean(leaving)} onClose={() => setLeaving(null)} title={leaving ? t('households.leaveTitle', { name: name(leaving) }) : ''}>
        <p className="body" style={{ margin: '0 0 20px' }}>
          {leavingAlone ? t('households.leaveLast') : t('households.leaveText')}
        </p>
        <div className="row" style={{ gap: 12 }}>
          <button type="button" className="stk sec" style={{ flex: 1 }} onClick={() => setLeaving(null)}>
            {t('households.stay')}
          </button>
          <button type="button" className="stk prim" style={{ flex: 1 }} onClick={leave}>
            {t('households.leave')}
          </button>
        </div>
      </Sheet>
    </>
  )

  if (page) {
    // Desktop (D8): the households as cards in a grid, with Join and Create new at the top.
    return (
      <>
        <div style={{ padding: 'var(--top) 22px 32px 40px' }}>
          <div className="row" style={{ gap: 12 }}>
            <Hand as="h1" style={{ margin: 0, flex: 'none' }}>
              {t('households.title')}
            </Hand>
            <span style={{ flex: 1 }} />
            <button type="button" className="stk sec" style={{ transform: 'rotate(-1deg)' }} onClick={() => navigate('/welcome')}>
              {t('households.join')}
            </button>
            <button type="button" className="stk prim" style={{ transform: 'rotate(1deg)' }} onClick={() => navigate('/welcome?mode=create')}>
              {t('households.createNew')}
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 26, marginTop: 30, alignItems: 'start' }}>
            {households.map((h, i) => {
              const people = peopleIn(h.id)
              const isCurrent = h.id === current?.id
              return (
                <div
                  key={h.id}
                  style={{
                    position: 'relative',
                    background: '#FFFFFF',
                    borderRadius: '10px 16px 12px 14px',
                    padding: '18px 18px 16px',
                    transform: `rotate(${i % 2 ? 0.8 : -0.8}deg)`,
                    boxShadow: isCurrent ? 'inset 0 0 0 2px #1E1A30, 2px 3px 0 rgba(30,26,48,.10)' : '0 0 0 1px rgba(30,26,48,.08), 2px 3px 0 rgba(30,26,48,.08)',
                  }}
                >
                  <div className="row" style={{ gap: 8, alignItems: 'flex-start' }}>
                    <button type="button" className="grow" onClick={() => pick(h)} style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 20, lineHeight: '26px', fontWeight: 800, color: '#1E1A30' }}>{name(h)}</div>
                      <div className="cap" style={{ fontSize: 14, marginTop: 2 }}>
                        {people.map((p) => p.display_name).join(', ')}
                      </div>
                    </button>
                    {isCurrent && (
                      <span style={{ color: '#1E1A30', display: 'flex' }} aria-label="✓">
                        <SmallCheck />
                      </span>
                    )}
                        <Menu
                          label={t('common.more')}
                          items={[
                            {
                              label: t('households.rename'),
                              onClick: () => {
                                setLabel(name(h))
                                setRenaming(h)
                              },
                            },
                            { label: t('households.invite'), onClick: () => setInviting(h) },
                            {
                      label: t('households.secret'),
                      onClick: () => {
                        setSecretText(h.secret ?? '')
                        setSecretFor(h)
                      },
                    },
                    { label: t('households.copyAddress'), onClick: () => copyText(joinLink(h), t('common.copied')) },
                            // The danger zone: whoever created the household deletes it (and can't leave); everyone else can leave.
                    h.created_by === me
                      ? { label: t('household.delete.menu'), onClick: () => setDeleting(h), danger: true, zone: true }
                      : { label: t('households.leave'), onClick: () => setLeaving(h), danger: true, zone: true },
                          ]}
                        >
                          <DotsIcon />
                        </Menu>
                  </div>
                  <button type="button" onClick={() => pick(h)} className="row" style={{ marginTop: 14 }} aria-hidden tabIndex={-1}>
                    {people.slice(0, 5).map((p, k) => (
                      <Avatar key={p.id} avatar={p.avatar} size={30} style={{ marginLeft: k ? -8 : 0 }} />
                    ))}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
        {sheets}
      </>
    )
  }

  return (
    <>
      {/* The "Our home" hub (Nora, 29 Oct): everything about this home first (its people, the notes and rooms
          that aren't in the menu, Arrange), then your other homes. Settings and About live elsewhere. */}
      <Sheet open={open && !renaming && !leaving && !inviting && !secretFor && !deleting} onClose={onClose} title={current ? name(current) : t('households.title')}>
        {current && (
          <>
            <div className="cap" style={{ marginTop: -8 }}>
              {current.address} · {t('common.people', { count: here.length })}
            </div>
            <div className="row" style={{ gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              {here.map((p) => (
                <button key={p.id} type="button" onClick={() => go(`/people/${p.id}`)} aria-label={p.display_name} style={{ display: 'flex', borderRadius: '50%' }}>
                  <Avatar avatar={p.avatar} label={p.display_name} size={40} />
                </button>
              ))}
              <button type="button" className="stk violet sm" style={{ transform: 'rotate(-1.5deg)', marginLeft: 4 }} onClick={() => setInviting(current)}>
                <PersonAddIcon />
                {t('home.addSomeone')}
              </button>
            </div>

            <div className="label" style={{ marginTop: 22 }}>{t('hub.inThisHome')}</div>
            <div className="hub-tiles">
              {tiles.map((x, i) => (
                <button key={x.to} type="button" className={`note ${TILES[i % TILES.length].note}`} onClick={() => go(x.to)} style={{ transform: `rotate(${[-1.5, 1, -0.5, 1.5, -1, 0.8][i % 6]}deg)` }}>
                  <Tape kind={TILES[i % TILES.length].tape} style={{ top: -8, left: '30%', width: 44, height: 16, transform: 'rotate(-3deg)' }} />
                  <Hand size={24} lineHeight={26}>
                    {x.label}
                  </Hand>
                </button>
              ))}
            </div>

            <button type="button" className="stk sec" style={{ marginTop: 22, width: '100%', transform: 'rotate(-.6deg)' }} onClick={() => go('/arrange')}>
              <PencilIcon />
              {t('arrange.title')}
            </button>

            <div className="label" style={{ marginTop: 24 }}>{t('households.title')}</div>
          </>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {households.map((h) => {
            const people = peopleIn(h.id)
            const isCurrent = h.id === current?.id
            return (
              <div
                key={h.id}
                className="row"
                style={{
                  gap: 12,
                  background: '#FFFFFF',
                  borderRadius: '10px 16px 12px 14px',
                  padding: '14px 16px',
                  boxShadow: isCurrent ? 'inset 0 0 0 2px #1E1A30, 2px 3px 0 rgba(30,26,48,.10)' : '0 0 0 1px rgba(30,26,48,.08), 2px 3px 0 rgba(30,26,48,.08)',
                }}
              >
                <button type="button" className="grow" onClick={() => pick(h)} style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 18, lineHeight: '24px', fontWeight: 800, color: '#1E1A30' }}>{name(h)}</div>
                  <div className="cap" style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {people.map((p) => p.display_name).join(', ')}
                  </div>
                </button>
                <div className="row" style={{ flex: 'none' }}>
                  {people.slice(0, 3).map((p, i) => (
                    <Avatar key={p.id} avatar={p.avatar} size={28} style={{ marginLeft: i ? -8 : 0 }} />
                  ))}
                </div>
                {isCurrent && (
                  <span style={{ color: '#1E1A30', display: 'flex' }} aria-label="✓">
                    <SmallCheck />
                  </span>
                )}
                <Menu
                  label={t('common.more')}
                  items={[
                    {
                      label: t('households.rename'),
                      onClick: () => {
                        setLabel(name(h))
                        setRenaming(h)
                      },
                    },
                    { label: t('households.invite'), onClick: () => setInviting(h) },
                    {
                      label: t('households.secret'),
                      onClick: () => {
                        setSecretText(h.secret ?? '')
                        setSecretFor(h)
                      },
                    },
                    { label: t('households.copyAddress'), onClick: () => copyText(joinLink(h), t('common.copied')) },
                    // The danger zone: whoever created the household deletes it (and can't leave); everyone else can leave.
                    h.created_by === me
                      ? { label: t('household.delete.menu'), onClick: () => setDeleting(h), danger: true, zone: true }
                      : { label: t('households.leave'), onClick: () => setLeaving(h), danger: true, zone: true },
                  ]}
                >
                  <DotsIcon />
                </Menu>
              </div>
            )
          })}
        </div>
        <div className="row" style={{ gap: 12, marginTop: 22 }}>
          <button
            type="button"
            className="stk sec"
            style={{ flex: 1, transform: 'rotate(-1deg)' }}
            onClick={() => {
              onClose()
              navigate('/welcome')
            }}
          >
            {t('households.join')}
          </button>
          <button
            type="button"
            className="stk prim"
            style={{ flex: 1, transform: 'rotate(1deg)' }}
            onClick={() => {
              onClose()
              navigate('/welcome?mode=create')
            }}
          >
            {t('households.createNew')}
          </button>
        </div>
      </Sheet>
      {sheets}
    </>
  )
}
