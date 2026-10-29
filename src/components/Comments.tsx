import { useMemo } from 'react'
import { useKept } from '../lib/kept'
import { useTranslation } from 'react-i18next'
import { useMe } from '../auth'
import { db } from '../data/store'
import { useComments, useHousehold, type Comment, type Heart } from '../data/hooks'
import { ago } from '../lib/time'
import { Avatar } from './Avatar'
import { StickerImage } from './Stickers'
import { TypingBar } from './TypingBar'
import { HeartBurst, HeartButton, HeartedBy, useDoubleTap, useHeartActions, useHeartsOn } from './Hearts'
import { CloseIcon } from './Icons'
import { showUndo } from './Scrapbook'
import { PersonLink } from '../screens/Person'
import { Linkify } from './Linkify'

/** What a comment is about: one shopping item, to-do or note. */
export type CommentTarget = { item_id: string } | { todo_id: string } | { note_id: string }

function about(c: Comment, target: CommentTarget) {
  if ('item_id' in target) return c.item_id === target.item_id
  if ('todo_id' in target) return c.todo_id === target.todo_id
  return c.note_id === target.note_id
}

/** How many comments each item, to-do and note has, for the little speech bubbles on the lists. */
export function useCommentCounts() {
  const { household } = useHousehold()
  const comments = useComments(household?.id ?? null)
  return useMemo(() => {
    const counts = new Map<string, number>()
    for (const c of comments.rows) {
      const id = c.item_id ?? c.todo_id ?? c.note_id
      if (id) counts.set(id, (counts.get(id) ?? 0) + 1)
    }
    return (id: string) => counts.get(id) ?? 0
  }, [comments.rows])
}

/** A small speech bubble with the number of comments, next to an item's name. */
export function CommentCount({ n }: { n: number }) {
  const { t } = useTranslation()
  if (!n) return null
  return (
    <span className="comment-count" aria-label={t('comments.count', { count: n })} title={t('comments.count', { count: n })}>
      {/* A round, chubby bubble. Drawn on the menu icons' 26 px grid; at 18 px the thicker stroke
          comes out at the same 2 px line as the menu. */}
      <svg viewBox="0 0 26 26" width="18" height="18" aria-hidden>
        <path
          d="M13.4 4.6c5 0 8.6 3.4 8.6 7.7s-3.6 7.6-8.6 7.6c-1.3 0-2.5-.2-3.6-.6L5.2 21.4l1.3-4.3C5 15.8 4.4 14.1 4.4 12.3c0-4.3 3.9-7.7 9-7.7Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.9"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      {n}
    </span>
  )
}

/** The conversation under an item, to-do or note: flat, like a chat. Everyone in the household
 *  can write; you can delete your own. Works offline and sends when there's signal. */
export function Comments({ target }: { target: CommentTarget }) {
  const { t } = useTranslation()
  const me = useMe()
  const { household } = useHousehold()
  const comments = useComments(household?.id ?? null)
  // What you're typing stays if you step away and come back.
  const [text, setText] = useKept(`comments:${Object.values(target)[0]}:text`, '')
  const heartsOn = useHeartsOn()

  const thread = useMemo(
    () => comments.rows.filter((c) => about(c, target)).sort((a, b) => a.created_at.localeCompare(b.created_at)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [comments.rows, JSON.stringify(target)],
  )

  function send(body: string, sticker?: string) {
    if (!household) return
    db.insert('comments', {
      household_id: household.id,
      item_id: null,
      todo_id: null,
      note_id: null,
      ...target,
      author_id: me,
      body,
      sticker: sticker ?? null,
      reply_to: null,
      created_at: new Date().toISOString(),
    })
    if (!sticker) setText('')
  }

  return (
    <section className="comments" aria-label={t('comments.title')}>
      <span className="label">{t('comments.title')}</span>
      {thread.map((c) => (
        <CommentRow key={c.id} c={c} hearts={heartsOn({ comment_id: c.id })} />
      ))}
      {/* The typing bar sits here, and floats up above the keyboard while you type. */}
      <div className="typing-slot" style={{ marginTop: thread.length ? 4 : 0 }}>
        <TypingBar value={text} onChange={setText} onSend={(body) => send(body)} onSticker={(name) => send('', name)} placeholder={t('comments.placeholder')} />
      </div>
    </section>
  )
}

/** One comment. Double-tap it, or tap the small heart, to heart it; who hearted it shows under the text. */
function CommentRow({ c, hearts }: { c: Comment; hearts: Heart[] }) {
  const { t, i18n } = useTranslation()
  const me = useMe()
  const { people } = useHousehold()
  const { add } = useHeartActions()
  const target = { comment_id: c.id }
  const tap = useDoubleTap(() => add(target, hearts))
  const who = people.find((p) => p.id === c.author_id)
  return (
    <div className="comment" onClick={tap.onClick}>
      <PersonLink id={who?.id}>
        <Avatar avatar={who?.avatar} size={28} />
      </PersonLink>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="cap" style={{ fontSize: 13 }}>
          <b style={{ color: '#1E1A30', fontWeight: 800 }}>{who?.display_name ?? t('common.someone')}</b> · {ago(c.created_at, i18n.language)}
        </div>
        {c.sticker ? <StickerImage name={c.sticker} size={96} /> : <div className="comment-body"><Linkify text={c.body} /></div>}
        <HeartedBy hearts={hearts} className="under-comment" />
      </div>
      <HeartButton target={target} hearts={hearts} />
      {c.author_id === me && (
        <button type="button" className="comment-delete" aria-label={t('common.delete')} onClick={() => {
            // Gone right away, with a floating Undo for 5 seconds that puts it back exactly as it was.
            const { id, ...rest } = c
            db.remove('comments', id)
            showUndo(t('comments.deleted'), t('common.undo'), () => db.insert('comments', { ...rest, id }))
          }}>
          <CloseIcon size={16} />
        </button>
      )}
      <HeartBurst burst={tap.burst} />
    </div>
  )
}
