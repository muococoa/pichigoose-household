import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMe } from '../auth'
import { useComments, useHousehold, useItemsIn, useLists, useNotes, useProfiles, useTodos } from '../data/hooks'
import { Screen } from '../components/Shell'
import { Avatar } from '../components/Avatar'
import { Hand } from '../components/Scrapbook'
import { BackIcon, MessagesIcon, PencilIcon } from '../components/Icons'
import { useBackInApp } from '../lib/back'

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
  const back = useBackInApp()
  const person = useProfiles().rows.find((p) => p.id === id)
  const { household, people } = useHousehold()
  const hid = household?.id ?? null
  const lists = useLists(hid)
  const items = useItemsIn(lists.rows.map((l) => l.id))
  const todos = useTodos(hid)
  const notes = useNotes(hid)
  const comments = useComments(hid)

  // What they've done in this household, counted from what's on the lists.
  const count = <T,>(rows: T[], test: (r: T) => boolean) => rows.filter(test).length
  const stats = [
    { key: 'todosAdded', n: count(todos.rows, (x) => x.created_by === id), note: 'n-blush' },
    { key: 'todosDone', n: count(todos.rows, (x) => x.done_by === id), note: 'n-sage' },
    { key: 'itemsAdded', n: count(items.rows, (x) => x.added_by === id), note: 'n-butter' },
    { key: 'itemsBought', n: count(items.rows, (x) => x.checked_by === id), note: 'n-mist' },
    { key: 'notesWritten', n: count(notes.rows, (x) => x.created_by === id), note: 'n-lilac' },
    { key: 'comments', n: count(comments.rows, (x) => x.author_id === id), note: 'n-peach' },
  ]

  // Just the two of you: the household chat is your chat. More people: a private chat with them.
  const messageTo = people.length <= 2 ? '/messages' : `/messages/${id}`

  return (
    <Screen center>
      <div style={{ padding: 'calc(var(--top) + 8px) 22px 32px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div className="row" style={{ alignSelf: 'stretch', marginLeft: -10 }}>
          <button type="button" aria-label={t('common.back')} onClick={back} style={{ display: 'flex', color: '#1E1A30' }}>
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
            {id !== me && (
              <Link to={messageTo} className="stk violet" style={{ marginTop: 18, transform: 'rotate(-1.5deg)' }}>
                <MessagesIcon size={22} />
                {t('person.message')}
              </Link>
            )}
            <div className="person-stats">
              {stats.map((x, i) => (
                <div key={x.key} className={`note ${x.note}`} style={{ transform: `rotate(${[-1.5, 1.2, 1, -1, -0.8, 1.4][i]}deg)` }}>
                  <Hand size={40} lineHeight={42}>
                    {String(x.n)}
                  </Hand>
                  <div className="cap" style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>
                    {t(`person.${x.key}`)}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </Screen>
  )
}
