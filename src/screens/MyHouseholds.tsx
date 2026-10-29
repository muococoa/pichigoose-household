import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMe } from '../auth'
import { db } from '../data/store'
import { setCurrentHousehold, useHousehold, type Household } from '../data/hooks'
import { Avatar } from '../components/Avatar'
import { Hand, Menu, Sheet } from '../components/Scrapbook'
import { DotsIcon, SmallCheck } from '../components/Icons'
import { copyText, joinLink } from '../lib/share'
import { InviteSheet } from './Invite'
import { autoFocusField } from '../lib/keyboard'

/** The sheet that opens from the household name on Home. */
export function MyHouseholds({ open, onClose, page }: { open: boolean; onClose: () => void; page?: boolean }) {
  const { t } = useTranslation()
  const me = useMe()
  const navigate = useNavigate()
  const { households, household: current, name, peopleIn } = useHousehold()
  const [renaming, setRenaming] = useState<Household | null>(null)
  const [label, setLabel] = useState('')
  const [leaving, setLeaving] = useState<Household | null>(null)
  const [inviting, setInviting] = useState<Household | null>(null)
  const [secretFor, setSecretFor] = useState<Household | null>(null)
  const [secretText, setSecretText] = useState('')

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
                            { label: t('households.leave'), onClick: () => setLeaving(h), danger: true },
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
      <Sheet open={open && !renaming && !leaving && !inviting && !secretFor} onClose={onClose} title={t('households.title')}>
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
                    { label: t('households.leave'), onClick: () => setLeaving(h), danger: true },
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
