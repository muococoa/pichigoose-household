import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMe } from '../auth'
import { db } from '../data/store'
import { setCurrentHousehold, useHousehold, type Household } from '../data/hooks'
import { Avatar } from '../components/Avatar'
import { Menu, Sheet } from '../components/Scrapbook'
import { DotsIcon, SmallCheck } from '../components/Icons'
import { copyText, joinLink } from './HouseholdCreated'
import { InviteSheet } from './Invite'

/** The sheet that opens from the household name on Home. */
export function MyHouseholds({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const me = useMe()
  const navigate = useNavigate()
  const { households, household: current, name, peopleIn } = useHousehold()
  const [renaming, setRenaming] = useState<Household | null>(null)
  const [label, setLabel] = useState('')
  const [leaving, setLeaving] = useState<Household | null>(null)
  const [inviting, setInviting] = useState<Household | null>(null)

  function pick(h: Household) {
    setCurrentHousehold(h.id)
    onClose()
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

  return (
    <>
      <Sheet open={open && !renaming && !leaving && !inviting} onClose={onClose} title={t('households.title')}>
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
                    { label: t('households.copyAddress'), onClick: () => copyText(joinLink(h.address), t('common.copied')) },
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

      <InviteSheet household={inviting} onClose={() => setInviting(null)} />

      <Sheet open={Boolean(renaming)} onClose={() => setRenaming(null)} title={t('households.renameTitle')}>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            rename()
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          <input className="input" autoFocus value={label} onChange={(e) => setLabel(e.target.value)} aria-label={t('households.renameTitle')} />
          <button type="submit" className="stk prim" style={{ width: '100%' }}>
            {t('common.save')}
          </button>
        </form>
      </Sheet>

      <Sheet open={Boolean(leaving)} onClose={() => setLeaving(null)} title={leaving ? t('households.leaveTitle', { name: name(leaving) }) : ''}>
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
}
