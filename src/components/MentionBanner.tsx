import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useComments, useHousehold, useItemsIn, useLists, useMessages, useMyProfile, useNotes, useTodos } from '../data/hooks'
import { Avatar } from './Avatar'
import { CloseIcon } from './Icons'
import { markMentionSeen, mentions, seenMentions } from '../lib/mentions'

const TWO_WEEKS = 14 * 24 * 60 * 60 * 1000

/**
 * "Danko tagged you" (Nora, 30 Oct): when someone tags you with @ in a comment or the chat, a small card waits for
 * you on Home, with where it was. Go check opens it; × closes it. Push notifications come later; this is the
 * in-app version. Closed cards stay closed on this device.
 */
export function MentionBanner() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const profile = useMyProfile()
  const { household, people } = useHousehold()
  const hid = household?.id ?? null
  const comments = useComments(hid)
  const messages = useMessages(hid)
  const todos = useTodos(hid)
  const notes = useNotes(hid)
  const lists = useLists(hid)
  const items = useItemsIn(lists.rows.map((l) => l.id))
  const [closed, setClosed] = useState<string[]>([])

  const latest = useMemo(() => {
    const me = profile?.id
    const name = profile?.display_name ?? ''
    if (!me || !name) return null
    const seen = new Set([...seenMentions(), ...closed])
    const fresh = (iso: string) => Date.now() - new Date(iso).getTime() < TWO_WEEKS
    type Found = { id: string; by: string | null; body: string; at: string; where: string; to: string }
    const found: Found[] = []
    for (const c of comments.rows) {
      if (c.author_id === me || seen.has(c.id) || !fresh(c.created_at) || !mentions(c.body, name)) continue
      const todo = c.todo_id ? todos.rows.find((x) => x.id === c.todo_id) : undefined
      const item = c.item_id ? items.rows.find((x) => x.id === c.item_id) : undefined
      const note = c.note_id ? notes.rows.find((x) => x.id === c.note_id) : undefined
      const title = todo?.title ?? item?.name ?? note?.title ?? ''
      const to = todo ? `/todos?open=${todo.id}` : item ? '/shopping' : note ? `/notes/${note.id}` : '/'
      found.push({ id: c.id, by: c.author_id, body: c.body, at: c.created_at, where: title ? t('mentions.on', { title }) : '', to })
    }
    for (const m of messages.rows) {
      if (m.author_id === me || seen.has(m.id) || !fresh(m.created_at) || !mentions(m.body, name)) continue
      found.push({ id: m.id, by: m.author_id, body: m.body, at: m.created_at, where: t('mentions.inMessages'), to: m.to_user ? `/messages/${m.author_id}` : '/messages' })
    }
    return found.sort((a, b) => b.at.localeCompare(a.at))[0] ?? null
  }, [profile, comments.rows, messages.rows, todos.rows, items.rows, notes.rows, closed, t])

  if (!latest) return null
  const who = people.find((p) => p.id === latest.by)
  const close = () => {
    markMentionSeen(latest.id)
    setClosed((c) => [...c, latest.id])
  }
  return createPortal(
    <div className="mention-card" role="status" key={latest.id}>
      {who && <Avatar avatar={who.avatar} label={who.display_name} size={40} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 15 }}>
          {t('mentions.tagged', { name: who?.display_name ?? t('common.someone') })}
          {latest.where && <span style={{ fontWeight: 600, color: '#63586B' }}> · {latest.where}</span>}
        </div>
        <div className="cap" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {latest.body}
        </div>
      </div>
      <button
        type="button"
        className="stk prim sm"
        style={{ flex: 'none', transform: 'rotate(-1.5deg)' }}
        onClick={() => {
          close()
          navigate(latest.to)
        }}
      >
        {t('mentions.go')}
      </button>
      <button type="button" aria-label={t('common.close')} onClick={close} style={{ flex: 'none', display: 'flex', padding: 4, color: '#857A8C' }}>
        <CloseIcon />
      </button>
    </div>,
    document.body,
  )
}
