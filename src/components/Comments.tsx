import { useMemo, useRef, type FormEvent } from 'react'
import { useKept } from '../lib/kept'
import { useTranslation } from 'react-i18next'
import { useMe } from '../auth'
import { db } from '../data/store'
import { useComments, useHousehold, type Comment, type Heart } from '../data/hooks'
import { ago } from '../lib/time'
import { Avatar } from './Avatar'
import { StickerButton, StickerImage } from './Stickers'
import { HeartBurst, HeartButton, HeartedBy, useDoubleTap, useHeartActions, useHeartsOn } from './Hearts'
import { CloseIcon } from './Icons'
import { showUndo } from './Scrapbook'
import { PersonLink } from '../screens/Person'

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
  const { household, people } = useHousehold()
  const comments = useComments(household?.id ?? null)
  const keep = `comments:${Object.values(target)[0]}`
  const [text, setText] = useKept(`${keep}:text`, '')
  // The comment you're answering, by its id.
  const [replyTo, setReplyTo] = useKept<string | null>(`${keep}:reply`, null)
  const heartsOn = useHeartsOn()
  const fieldRef = useRef<HTMLInputElement>(null)

  // Like Instagram: replies sit under the comment they answer, one level deep (a reply to a reply joins the
  // same group). If that comment is gone, the reply stands on its own.
  const thread = useMemo(() => {
    const all = comments.rows.filter((c) => about(c, target)).sort((a, b) => a.created_at.localeCompare(b.created_at))
    const byId = new Map(all.map((c) => [c.id, c]))
    const rootOf = (c: Comment): Comment => {
      let r = c
      for (let i = 0; i < 20 && r.reply_to && byId.has(r.reply_to); i++) r = byId.get(r.reply_to)!
      return r
    }
    const out: { c: Comment; reply: boolean }[] = []
    for (const c of all) {
      if (rootOf(c) !== c) continue
      out.push({ c, reply: false })
      for (const r of all) if (r !== c && rootOf(r) === c) out.push({ c: r, reply: true })
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comments.rows, JSON.stringify(target)])
  const replying = replyTo ? thread.find((x) => x.c.id === replyTo)?.c : undefined
  const replyingWho = people.find((p) => p.id === replying?.author_id)

  function send(e?: FormEvent, sticker?: string) {
    e?.preventDefault()
    const body = sticker ? '' : text.trim()
    if ((!body && !sticker) || !household) return
    db.insert('comments', {
      household_id: household.id,
      item_id: null,
      todo_id: null,
      note_id: null,
      ...target,
      author_id: me,
      body,
      sticker: sticker ?? null,
      reply_to: replying ? replying.id : null,
      created_at: new Date().toISOString(),
    })
    if (!sticker) setText('')
    setReplyTo(null)
  }

  return (
    <section className="comments" aria-label={t('comments.title')}>
      <span className="label">{t('comments.title')}</span>
      {thread.map(({ c, reply }) => (
        <CommentRow
          key={c.id}
          c={c}
          reply={reply}
          hearts={heartsOn({ comment_id: c.id })}
          onReply={() => {
            setReplyTo(c.id)
            fieldRef.current?.focus()
          }}
        />
      ))}
      {replying && (
        <div className="composer-quote" style={{ marginTop: 4 }}>
          <span style={{ flex: 1, minWidth: 0 }}>
            <b>{replying.author_id === me ? t('replies.replyingToSelf') : t('replies.replyingTo', { name: replyingWho?.display_name ?? t('common.someone') })}</b>
            {replying.sticker ? <StickerImage name={replying.sticker} size={32} /> : <span className="composer-quote-text">{replying.body}</span>}
          </span>
          <button type="button" aria-label={t('common.cancel')} onPointerDown={(e) => e.preventDefault()} onClick={() => setReplyTo(null)}>
            <CloseIcon size={18} />
          </button>
        </div>
      )}
      <form onSubmit={send} className="row" style={{ gap: 10, marginTop: thread.length && !replying ? 4 : 0, position: 'relative' }}>
        <input
          ref={fieldRef}
          className="input"
          style={{ flex: 1 }}
          placeholder={t('comments.placeholder')}
          aria-label={t('comments.placeholder')}
          value={text}
          enterKeyHint="send"
          onChange={(e) => setText(e.target.value)}
        />
        <StickerButton onSend={(name) => send(undefined, name)} />
        {/* People get the violet sticker. */}
        <button type="submit" className="stk violet sm" style={{ height: 44, transform: 'rotate(-2deg)' }} disabled={!text.trim()}>
          {t('comments.send')}
        </button>
      </form>
    </section>
  )
}

/** One comment. Double-tap it, or tap the small heart, to heart it; who hearted it shows under the text.
 *  Reply, next to the time, answers it (like Instagram); replies sit indented under it. */
function CommentRow({ c, hearts, reply, onReply }: { c: Comment; hearts: Heart[]; reply: boolean; onReply: () => void }) {
  const { t, i18n } = useTranslation()
  const me = useMe()
  const { people } = useHousehold()
  const { add } = useHeartActions()
  const target = { comment_id: c.id }
  const tap = useDoubleTap(() => add(target, hearts))
  const who = people.find((p) => p.id === c.author_id)
  return (
    <div className={`comment${reply ? ' comment-reply' : ''}`} onClick={tap.onClick}>
      <PersonLink id={who?.id}>
        <Avatar avatar={who?.avatar} size={28} />
      </PersonLink>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="cap" style={{ fontSize: 13 }}>
          <b style={{ color: '#1E1A30', fontWeight: 800 }}>{who?.display_name ?? t('common.someone')}</b> · {ago(c.created_at, i18n.language)} ·{' '}
          <button type="button" className="comment-reply-btn" onClick={onReply}>
            {t('replies.reply')}
          </button>
        </div>
        {c.sticker ? <StickerImage name={c.sticker} size={96} /> : <div className="comment-body">{c.body}</div>}
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
