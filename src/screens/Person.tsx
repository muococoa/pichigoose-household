import type { ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMe } from '../auth'
import { useProfiles } from '../data/hooks'
import { Screen } from '../components/Shell'
import { Avatar } from '../components/Avatar'
import { Hand } from '../components/Scrapbook'
import { BackIcon, PencilIcon } from '../components/Icons'

/** Wraps an avatar so tapping it opens that person's profile. */
export function PersonLink({ id, children }: { id: string | null | undefined; children: ReactNode }) {
  if (!id) return <>{children}</>
  return (
    <Link to={`/people/${id}`} style={{ display: 'flex', borderRadius: '50%' }} onClick={(e) => e.stopPropagation()}>
      {children}
    </Link>
  )
}

/** Someone's profile: their character big, with their name. Read only. What else people share comes later. */
export function PersonScreen() {
  const { t } = useTranslation()
  const { id } = useParams()
  const me = useMe()
  const navigate = useNavigate()
  const person = useProfiles().rows.find((p) => p.id === id)

  return (
    <Screen center>
      <div style={{ padding: 'calc(var(--top) + 8px) 22px 32px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div className="row" style={{ alignSelf: 'stretch', marginLeft: -10 }}>
          <button type="button" aria-label={t('common.back')} onClick={() => navigate(-1)} style={{ display: 'flex', color: '#1E1A30' }}>
            <BackIcon />
          </button>
          <span style={{ flex: 1 }} />
          {/* Your own profile: change your character, or go to Settings. */}
          {id === me && (
            <div className="row" style={{ gap: 10 }}>
              <Link to="/settings" className="stk sec sm" style={{ transform: 'rotate(-2deg)' }}>
                {t('settings.title')}
              </Link>
              <Link to="/profile" className="stk sec sm" aria-label={t('settings.changeCharacter')} title={t('settings.changeCharacter')} style={{ width: 38, padding: 0, transform: 'rotate(3deg)' }}>
                <PencilIcon />
              </Link>
            </div>
          )}
        </div>
        {person && (
          <>
            <Avatar avatar={person.avatar} size={220} label={person.display_name} className="" style={{ marginTop: 18, filter: 'drop-shadow(2px 4px 0 rgba(30,26,48,.12))' }} />
            <Hand as="h1" size={48} lineHeight={52} style={{ margin: '22px 0 0', textAlign: 'center' }}>
              {person.display_name}
            </Hand>
          </>
        )}
      </div>
    </Screen>
  )
}
